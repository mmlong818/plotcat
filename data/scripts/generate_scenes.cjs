const http = require('http');

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: 4173, path, method: 'GET' }, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
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
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject); req.write(b); req.end();
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

async function main() {
  const resp = await apiGet('/api/projects/project_mnyhwhzo_5veqx5');
  const proj = resp.project;
  const nodes = proj.structure_profile.nodes;

  const allScenes = [];

  for (const node of nodes) {
    const act = proj.structure_profile.acts.find(a => a.id === node.act_id);
    console.log('\n--- Generating scene_outline for:', node.node_type, '|', node.title, '---');

    try {
      const result = await apiPost('/api/generate', {
        step: 'scene_outline',
        projectContext: proj,
        options: { nodeId: node.id, actId: node.act_id }
      }, 180000);

      if (result.status === 200 && result.body.choices && result.body.choices.length > 0) {
        const scenes = result.body.choices
          .map(c => c.data)
          .filter(Boolean);
        console.log('  Generated', scenes.length, 'scene(s):');
        scenes.forEach((s, i) => {
          console.log('   ', i+1, ':', s.title || s.scene_goal || '(untitled)');
          allScenes.push({
            node_type: node.node_type,
            node_id: node.id,
            act_id: node.act_id,
            act_title: act ? act.title : '',
            ...s
          });
        });
      } else if (result.body.mock) {
        console.log('  [MOCK] AI call failed, mock data returned');
        if (result.body.choices) {
          result.body.choices.forEach(c => {
            if (c.data) allScenes.push({ node_type: node.node_type, node_id: node.id, act_id: node.act_id, ...c.data });
          });
        }
      } else {
        console.log('  No choices, status:', result.status, JSON.stringify(result.body).slice(0, 100));
      }
    } catch (err) {
      console.log('  ERROR:', err.message);
    }
  }

  console.log('\n=== Total scenes generated:', allScenes.length, '===');

  // Save scenes back to project scene_workbench
  const updatedResp = await apiGet('/api/projects/project_mnyhwhzo_5veqx5');
  const updatedProj = updatedResp.project;
  updatedProj.scene_workbench = updatedProj.scene_workbench || {};
  updatedProj.scene_workbench.generated_scenes = allScenes;

  const putResp = await apiPut('/api/projects/project_mnyhwhzo_5veqx5', { project: updatedProj });
  console.log('Saved to project:', putResp.status);

  // Write to file for reference
  const fs = require('fs');
  fs.writeFileSync('E:/CC/code/yuandian-screenwriting-system/data/scripts/generated_scenes.json',
    JSON.stringify(allScenes, null, 2), 'utf8');
  console.log('Written to generated_scenes.json');
}

main().catch(console.error);
