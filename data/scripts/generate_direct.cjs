// Direct generation: imports prompt builders + calls claude spawn directly
// Bypasses HTTP server timeout issues entirely
// Usage: node data/scripts/generate_direct.cjs
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const PROJECT_ID = 'project_mnyhwhzo_5veqx5';
const OUT_DIR = 'E:/CC/code/yuandian-screenwriting-system/data/scripts';
const CLAUDE_TIMEOUT_MS = 600_000; // 10 minutes per call

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: 4173, path, method: 'GET' }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject); req.end();
  });
}

function apiPut(path, body) {
  return new Promise((resolve, reject) => {
    const b = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1', port: 4173, path, method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) }
    }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode }));
    });
    req.on('error', reject); req.write(b); req.end();
  });
}

function callClaude(system, user) {
  return new Promise((resolve, reject) => {
    const fullPrompt = `<system>\n${system}\n</system>\n\n${user}`;
    const proc = spawn('claude', ['-p', '--output-format', 'text'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    proc.stdout.setEncoding('utf8');
    proc.stderr.setEncoding('utf8');

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('Claude timeout after 10 minutes'));
    }, CLAUDE_TIMEOUT_MS);

    proc.stdout.on('data', d => { stdout += d; process.stdout.write('.'); });
    proc.stderr.on('data', d => { stderr += d; });
    proc.stdin.write(fullPrompt, 'utf8');
    proc.stdin.end();

    proc.on('close', code => {
      clearTimeout(timer);
      process.stdout.write('\n');
      if (code !== 0) reject(new Error(`Claude exit ${code}: ${stderr.slice(0, 200)}`));
      else resolve(stdout);
    });
    proc.on('error', err => { clearTimeout(timer); reject(err); });
  });
}

function parseJsonFromText(text) {
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
  let raw;
  if (codeBlockMatch) {
    raw = codeBlockMatch[1];
  } else {
    const lastBrace = text.lastIndexOf('{');
    raw = lastBrace !== -1 ? text.slice(lastBrace) : text;
    const lastEnd = raw.lastIndexOf('}');
    raw = lastEnd !== -1 ? raw.slice(0, lastEnd + 1) : raw;
  }
  try { return JSON.parse(raw.trim()); }
  catch { return { raw: text }; }
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('=== 复调 直接生成（无服务器超时限制）===\n');

  // Load prompt builders
  const { buildSceneOutlinePrompt, buildSceneWeavePrompt } = await import(
    'file:///E:/CC/code/yuandian-screenwriting-system/src/ai/prompts.js'
  );

  const fullResp = await apiGet('/api/projects/' + PROJECT_ID);
  const proj = fullResp.project;
  const nodes = proj.structure_profile.nodes;

  const allSceneOutlines = [];
  const allScripts = [];

  // ── Phase 1: scene outlines ──────────────────────────────────────────────
  console.log('--- 阶段1：生成场景卡 ---');
  for (const node of nodes) {
    const act = proj.structure_profile.acts.find(a => a.id === node.act_id);
    const actTitle = act ? act.title : '';
    console.log(`\n[${node.node_type}] ${node.title} (${actTitle})`);

    try {
      const { system, user } = buildSceneOutlinePrompt(fullResp, { nodeId: node.id, actId: node.act_id });
      console.log('  调用 Claude...');
      const rawText = await callClaude(system, user);
      const parsed = parseJsonFromText(rawText);

      const scenes = parsed.scenes ?? [];
      if (scenes.length === 0) {
        console.log('  => 0 个场景卡 (parsed keys: ' + Object.keys(parsed).join(',') + ')');
        if (parsed.raw) console.log('  raw preview:', parsed.raw.slice(0, 100));
      } else {
        console.log('  => ' + scenes.length + ' 个场景卡');
        scenes.forEach((s, i) => {
          console.log('     ' + (i+1) + '. ' + (s.title || s.scene_goal || '(无标题)'));
          allSceneOutlines.push({
            node_type: node.node_type, node_title: node.title, act_title: actTitle, ...s
          });
        });
      }
    } catch (err) {
      console.log('  ERROR: ' + err.message);
    }

    // Small delay between calls to avoid rate limits
    await delay(3000);
  }

  console.log('\n场景卡合计: ' + allSceneOutlines.length);
  fs.writeFileSync(OUT_DIR + '/scene_outlines.json', JSON.stringify(allSceneOutlines, null, 2), 'utf8');
  console.log('已保存 scene_outlines.json');

  if (allSceneOutlines.length === 0) {
    console.log('\n警告：无场景卡，跳过 Phase 2');
    return;
  }

  // Refresh context for Phase 2
  const fullResp2 = await apiGet('/api/projects/' + PROJECT_ID);

  // ── Phase 2: scene weave ─────────────────────────────────────────────────
  console.log('\n--- 阶段2：写场景正文 ---');
  for (const scene of allSceneOutlines) {
    const sceneTitle = scene.title || scene.scene_goal || '(无标题)';
    console.log('\n写: ' + sceneTitle);

    try {
      const emotionBeat = scene.emotion_beat || '';
      const parts = emotionBeat.split('→');
      const emotionStart = parts[0]?.trim() || '';
      const emotionEnd = parts[parts.length - 1]?.trim() || '';

      const { system, user } = buildSceneWeavePrompt(fullResp2, {
        sceneGoal: scene.scene_goal || '',
        emotionStart,
        emotionEnd,
        dialogueStyle: 'naturalism',
        subtextType: '压制型（说A要B，真正需要的在对白之下）'
      });

      console.log('  调用 Claude...');
      const rawText = await callClaude(system, user);
      const parsed = parseJsonFromText(rawText);

      if (parsed.script) {
        console.log('  => ' + parsed.script.length + ' chars');
        allScripts.push({
          node_type: scene.node_type,
          node_title: scene.node_title,
          scene_title: sceneTitle,
          script: parsed.script,
          subtext_map: parsed.subtext_map || [],
          notes: parsed.director_notes || parsed.notes || ''
        });
      } else {
        console.log('  => 无脚本 (keys: ' + Object.keys(parsed).join(',') + ')');
        if (parsed.raw) console.log('  raw preview:', parsed.raw.slice(0, 150));
      }
    } catch (err) {
      console.log('  ERROR: ' + err.message);
    }

    await delay(3000);
  }

  console.log('\n场景正文合计: ' + allScripts.length);
  fs.writeFileSync(OUT_DIR + '/scene_scripts.json', JSON.stringify(allScripts, null, 2), 'utf8');

  // Compile screenplay
  let fullScript = '# 复调 POLYPHONY\n## 完整剧本（系统生成版）\n\n---\n\n';
  let currentNode = '';
  for (const s of allScripts) {
    if (s.node_title !== currentNode) {
      currentNode = s.node_title;
      fullScript += `\n### [${s.node_title} / ${s.node_type}]\n\n`;
    }
    fullScript += s.script + '\n\n---\n\n';
  }
  fs.writeFileSync(OUT_DIR + '/screenplay_generated.md', fullScript, 'utf8');
  console.log('已保存 screenplay_generated.md');

  // PUT back to project
  const updatedResp = await apiGet('/api/projects/' + PROJECT_ID);
  const updatedProj = updatedResp.project;
  updatedProj.scene_workbench = updatedProj.scene_workbench || {};
  updatedProj.scene_workbench.generated_outlines = allSceneOutlines;
  updatedProj.scene_workbench.generated_scripts = allScripts;

  const putR = await apiPut('/api/projects/' + PROJECT_ID, { project: updatedProj });
  console.log('\nPUT to project:', putR.status);
  console.log('\n=== 完成 ===');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
