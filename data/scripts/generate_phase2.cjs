// Phase 2 only: reads scene_outlines.json, generates scene_weave for each scene
// Uses fixed JSON parser that handles real newlines inside string values
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const PROJECT_ID = 'project_mnyhwhzo_5veqx5';
const OUT_DIR = 'E:/CC/code/yuandian-screenwriting-system/data/scripts';
const CLAUDE_TIMEOUT_MS = 600_000; // 10 minutes

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
    const timer = setTimeout(() => { proc.kill(); reject(new Error('Claude timeout')); }, CLAUDE_TIMEOUT_MS);

    proc.stdout.on('data', d => { stdout += d; process.stdout.write('.'); });
    proc.stderr.on('data', d => { stderr += d; });
    proc.stdin.write(fullPrompt, 'utf8');
    proc.stdin.end();

    proc.on('close', code => {
      clearTimeout(timer);
      process.stdout.write('\n');
      // Accept output even if exit code is non-zero (SessionEnd hooks may cause non-zero)
      if (stdout.length > 50) resolve(stdout);
      else if (code !== 0) reject(new Error(`Claude exit ${code}: ${stderr.slice(0, 200)}`));
      else resolve(stdout);
    });
    proc.on('error', err => { clearTimeout(timer); reject(err); });
  });
}

// Fixed JSON parser: handles real newlines inside string values
function fixJsonNewlines(text) {
  let result = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      result += ch;
      escape = false;
    } else if (ch === '\\') {
      result += ch;
      escape = true;
    } else if (ch === '"') {
      inString = !inString;
      result += ch;
    } else if (inString && ch === '\n') {
      result += '\\n';
    } else if (inString && ch === '\r') {
      // skip carriage returns
    } else {
      result += ch;
    }
  }
  return result;
}

// Walk the JSON string value starting after the opening quote, handling escapes and real newlines
function extractStringValue(src, startIdx) {
  let result = '';
  let i = startIdx;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') {
      const next = src[i + 1];
      if (next === 'n') { result += '\n'; i += 2; }
      else if (next === 'r') { i += 2; } // skip CR
      else if (next === '"') { result += '"'; i += 2; }
      else if (next === '\\') { result += '\\'; i += 2; }
      else if (next === 't') { result += '\t'; i += 2; }
      else { result += next; i += 2; }
    } else if (ch === '"') {
      // Closing quote
      return { value: result, endIdx: i };
    } else if (ch === '\n' || ch === '\r') {
      // Real newline inside string — treat as \n
      result += '\n';
      i++;
    } else {
      result += ch;
      i++;
    }
  }
  return { value: result, endIdx: i };
}

function extractScriptField(text) {
  // Find "script" key
  const keyIdx = text.indexOf('"script"');
  if (keyIdx === -1) return null;
  const afterKey = text.slice(keyIdx + 8);
  const colonIdx = afterKey.indexOf(':');
  if (colonIdx === -1) return null;
  const afterColon = afterKey.slice(colonIdx + 1);
  const quoteIdx = afterColon.indexOf('"');
  if (quoteIdx === -1) return null;
  const { value } = extractStringValue(afterColon, quoteIdx + 1);
  return value.length > 10 ? value : null;
}

function parseJsonFromText(text) {
  // Try to find ```json block first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  let raw;
  if (codeBlockMatch) {
    raw = codeBlockMatch[1];
  } else {
    const lastBrace = text.lastIndexOf('{');
    raw = lastBrace !== -1 ? text.slice(lastBrace) : text;
    const lastEnd = raw.lastIndexOf('}');
    raw = lastEnd !== -1 ? raw.slice(0, lastEnd + 1) : raw;
  }
  const trimmed = raw.trim();

  // Try 1: direct parse
  try { return JSON.parse(trimmed); } catch {}

  // Try 2: fix real newlines in strings then parse
  try { return JSON.parse(fixJsonNewlines(trimmed)); } catch {}

  // Try 3: character-level extraction of script field from raw JSON block
  const scriptFromBlock = extractScriptField(trimmed);
  if (scriptFromBlock) return { script: scriptFromBlock };

  // Try 4: character-level extraction from full text (in case regex missed the block)
  const scriptFromFull = extractScriptField(text);
  if (scriptFromFull) return { script: scriptFromFull };

  return { raw: text };
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function buildDirectScenePrompt(fullResp, scene) {
  const ctx = fullResp?.project ?? fullResp;
  const proj = ctx?.project ?? ctx;
  const title = proj?.title ?? '未命名项目';
  const logline = proj?.logline ?? '';
  const coreConflict = proj?.core_conflict ?? '';
  const theme = proj?.theme ?? '';
  const protagonist = proj?.protagonist ?? '';

  const emotionBeat = scene.emotion_beat || '';
  const parts = emotionBeat.split('→');
  const emotionStart = parts[0]?.trim() || '';
  const emotionEnd = parts[parts.length - 1]?.trim() || '';

  const system = `你是一位专业剧本执笔作家，擅长创作有潜台词、有画面感、有情感张力的场景。

戏剧决策原则：
1. 角色行动必须来自其核心欲望/恐惧，而非剧情需要
2. 每场戏至少改变一个角色的情感或认知状态
3. 对白要有潜台词：表面说A，实际要B
4. 每场戏末尾留一个问题或张力，而非提供答案`;

  const user = `项目：${title}
一句话概念：${logline}
核心冲突：${coreConflict}
主题：${theme}
主角：${protagonist}

要写的场景：
- 标题：${scene.title || scene.scene_goal || ''}
- 场景目标：${scene.scene_goal || ''}
- 冲突：${scene.conflict || ''}
- 转折：${scene.turn || ''}
- 情感弧：${emotionStart} → ${emotionEnd}
- 信息增量：${scene.information_gain || ''}
- 结尾问题：${scene.end_question || ''}

对白风格：自然主义（贴近生活）
潜台词类型：压制型（说A要B，真正需要的在对白之下）

重要要求：
- 对白不能解释性（不要说"我担心你是因为……"）
- 动作描述要精准，每行不超过3行
- 场景结尾必须有一个悬而未决的东西
- 这是正剧长片，不是微短剧

直接写完整的剧本格式场景正文。不要用JSON，不要用代码块，直接输出剧本文字。
在第一行写 ===SCRIPT=== 然后写剧本内容，最后写 ===END===`;

  return { system, user };
}

function extractScriptFromMarkers(text) {
  const startMarker = '===SCRIPT===';
  const endMarker = '===END===';
  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) {
    // Try to use parseJsonFromText as fallback
    return null;
  }
  const contentStart = startIdx + startMarker.length;
  const endIdx = text.indexOf(endMarker, contentStart);
  const content = endIdx === -1
    ? text.slice(contentStart)
    : text.slice(contentStart, endIdx);
  return content.trim();
}

async function main() {
  console.log('=== 复调 Phase 2：写场景正文（分隔符格式，无JSON解析问题）===\n');

  // Read saved scene outlines
  const outlines = JSON.parse(fs.readFileSync(OUT_DIR + '/scene_outlines.json', 'utf8'));
  console.log('读取场景卡: ' + outlines.length + ' 个\n');

  const fullResp = await apiGet('/api/projects/' + PROJECT_ID);
  const allScripts = [];

  for (let i = 0; i < outlines.length; i++) {
    const scene = outlines[i];
    const sceneTitle = scene.title || scene.scene_goal || '(无标题)';
    console.log(`[${i+1}/${outlines.length}] ${sceneTitle}`);

    try {
      const { system, user } = buildDirectScenePrompt(fullResp, scene);

      process.stdout.write('  调用 Claude');
      const rawText = await callClaude(system, user);

      // Try marker-based extraction first
      let scriptContent = extractScriptFromMarkers(rawText);

      // Fall back to JSON parsing if markers not found
      if (!scriptContent) {
        const parsed = parseJsonFromText(rawText);
        scriptContent = parsed.script || null;
      }

      // Last resort: just use the full response if it looks like a script
      if (!scriptContent && rawText.length > 200) {
        // Strip any leading explanation lines
        const lines = rawText.split('\n');
        const scriptLines = lines.filter((_, idx) => idx > 0 || !lines[0].includes('微短剧'));
        scriptContent = scriptLines.join('\n').trim();
      }

      if (scriptContent && scriptContent.length > 100) {
        console.log('  => ' + scriptContent.length + ' chars ✓');
        allScripts.push({
          node_type: scene.node_type,
          node_title: scene.node_title,
          scene_title: sceneTitle,
          script: scriptContent,
          subtext_map: [],
          notes: ''
        });
      } else {
        console.log('  => 内容太短或为空，跳过');
      }
    } catch (err) {
      console.log('  ERROR: ' + err.message);
    }

    // Small delay between calls
    if (i < outlines.length - 1) await delay(3000);
  }

  console.log('\n场景正文合计: ' + allScripts.length + '/' + outlines.length);

  // Save scripts
  fs.writeFileSync(OUT_DIR + '/scene_scripts.json', JSON.stringify(allScripts, null, 2), 'utf8');

  // Compile screenplay
  let fullScript = '# 复调 POLYPHONY\n## 完整剧本（系统生成版）\n\n---\n\n';
  let currentNode = '';
  for (const s of allScripts) {
    if (s.node_title !== currentNode) {
      currentNode = s.node_title;
      fullScript += `\n## [${s.node_title} / ${s.node_type}]\n\n`;
    }
    fullScript += `### ${s.scene_title}\n\n` + s.script + '\n\n---\n\n';
  }
  fs.writeFileSync(OUT_DIR + '/screenplay_generated.md', fullScript, 'utf8');
  console.log('已保存 screenplay_generated.md');

  // PUT back to project
  const updatedResp = await apiGet('/api/projects/' + PROJECT_ID);
  const updatedProj = updatedResp.project;
  updatedProj.scene_workbench = updatedProj.scene_workbench || {};
  updatedProj.scene_workbench.generated_outlines = outlines;
  updatedProj.scene_workbench.generated_scripts = allScripts;

  const putR = await apiPut('/api/projects/' + PROJECT_ID, { project: updatedProj });
  console.log('PUT to project:', putR.status);
  console.log('\n=== 完成 ===');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
