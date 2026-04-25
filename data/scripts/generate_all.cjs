// Full screenplay generation via system API
// Uses correct projectContext format (full GET response wrapper)
const http = require('http');
const fs = require('fs');

const PROJECT_ID = 'project_mnyhwhzo_5veqx5';
const OUT_DIR = 'E:/CC/code/yuandian-screenwriting-system/data/scripts';

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: 4173, path, method: 'GET' }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject); req.end();
  });
}

function apiPost(path, body, timeout = 180000) {
  return new Promise((resolve, reject) => {
    const b = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1', port: 4173, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) }
    }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: { error: 'parse fail', raw: d } }); }
      });
    });
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('HTTP timeout')); });
    req.on('error', reject);
    req.write(b); req.end();
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

async function generateSceneOutline(fullResp, nodeId, actId) {
  const r = await apiPost('/api/generate', {
    step: 'scene_outline',
    projectContext: fullResp,  // MUST be the full response wrapper
    options: { nodeId, actId }
  }, 180000);

  if (r.status !== 200) throw new Error('HTTP ' + r.status);
  const choices = r.body.choices || [];
  // scene_outline: each choice.data is a scene object
  return choices.map(c => c.data).filter(d => d && (d.title || d.scene_goal));
}

async function generateSceneWeave(fullResp, sceneData) {
  const r = await apiPost('/api/generate', {
    step: 'scene_weave',
    projectContext: fullResp,
    options: {
      sceneGoal: sceneData.scene_goal || '',
      emotionStart: (sceneData.emotion_beat || '').split('→')[0]?.trim() || '',
      emotionEnd: (sceneData.emotion_beat || '').split('→').pop()?.trim() || '',
      dialogueStyle: 'naturalism',
      subtextType: '压制型（说A要B，真正需要的在对白之下）'
    }
  }, 180000);

  if (r.status !== 200) throw new Error('HTTP ' + r.status);
  const choices = r.body.choices || [];
  if (choices.length === 0) return null;
  // scene_weave: choices[0].data has 'script'
  return choices[0].data;
}

async function main() {
  console.log('=== 复调 场景生成 ===\n');

  // Get fresh full response (correct format for projectContext)
  const fullResp = await apiGet('/api/projects/' + PROJECT_ID);
  const proj = fullResp.project;
  const nodes = proj.structure_profile.nodes;

  const allSceneOutlines = [];
  const allScripts = [];

  // PHASE 1: Generate scene outlines for all 11 nodes
  console.log('--- 阶段1：生成场景卡 ---');
  for (const node of nodes) {
    const act = proj.structure_profile.acts.find(a => a.id === node.act_id);
    console.log('\n[' + node.node_type + '] ' + node.title + ' (' + (act ? act.title : '') + ')');

    try {
      const scenes = await generateSceneOutline(fullResp, node.id, node.act_id);
      console.log('  => ' + scenes.length + ' 个场景卡');
      scenes.forEach((s, i) => {
        console.log('     ' + (i+1) + '. ' + (s.title || '(无标题)'));
        allSceneOutlines.push({ node_type: node.node_type, node_title: node.title, act_title: act ? act.title : '', ...s });
      });
    } catch (err) {
      console.log('  ERROR: ' + err.message);
    }
  }

  console.log('\n场景卡合计: ' + allSceneOutlines.length);
  fs.writeFileSync(OUT_DIR + '/scene_outlines.json', JSON.stringify(allSceneOutlines, null, 2), 'utf8');
  console.log('已保存 scene_outlines.json');

  // PHASE 2: Generate actual scene scripts for each scene card
  console.log('\n--- 阶段2：写场景正文 ---');

  // Refresh context after phase 1
  const fullResp2 = await apiGet('/api/projects/' + PROJECT_ID);

  for (const scene of allSceneOutlines) {
    console.log('\n写: ' + (scene.title || '(无标题)'));
    try {
      const result = await generateSceneWeave(fullResp2, scene);
      if (result && result.script) {
        console.log('  => ' + result.script.length + ' chars');
        allScripts.push({
          node_type: scene.node_type,
          node_title: scene.node_title,
          scene_title: scene.title,
          script: result.script,
          subtext_map: result.subtext_map || [],
          notes: result.director_notes || result.notes || ''
        });
      } else {
        console.log('  => 无脚本内容 (data keys: ' + Object.keys(result || {}).join(',') + ')');
      }
    } catch (err) {
      console.log('  ERROR: ' + err.message);
    }
  }

  console.log('\n场景正文合计: ' + allScripts.length);
  fs.writeFileSync(OUT_DIR + '/scene_scripts.json', JSON.stringify(allScripts, null, 2), 'utf8');

  // Compile full screenplay from scripts
  let fullScript = '# 复调 POLYPHONY\n## 完整剧本（系统生成版）\n\n---\n\n';
  let currentAct = '';
  for (const s of allScripts) {
    if (s.node_title !== currentAct) {
      currentAct = s.node_title;
      fullScript += '\n### [' + s.node_title + ' / ' + s.node_type + ']\n\n';
    }
    fullScript += s.script + '\n\n---\n\n';
  }
  fs.writeFileSync(OUT_DIR + '/screenplay_generated.md', fullScript, 'utf8');
  console.log('已保存 screenplay_generated.md');

  // Save back to project
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
