// Debug: check what prompt is built and what claude returns
const http = require('http');
const { spawn } = require('child_process');

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: 4173, path, method: 'GET' }, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject); req.end();
  });
}

async function main() {
  // Import the prompt builder
  const { buildSceneOutlinePrompt } = await import('file:///E:/CC/code/yuandian-screenwriting-system/src/ai/prompts.js');

  const fullResp = await apiGet('/api/projects/project_mnyhwhzo_5veqx5');
  const node = fullResp.project.structure_profile.nodes[2]; // catalyst node

  const { system, user } = buildSceneOutlinePrompt(fullResp, { nodeId: node.id, actId: node.act_id });

  console.log('=== SYSTEM PROMPT (first 500) ===');
  console.log(system.slice(0, 500));
  console.log('\n=== USER PROMPT (first 1000) ===');
  console.log(user.slice(0, 1000));

  console.log('\n=== CALLING CLAUDE ===');
  const fullPrompt = `<system>\n${system}\n</system>\n\n${user}`;

  const proc = spawn('claude', ['-p', '--output-format', 'text'], { stdio: ['pipe', 'pipe', 'pipe'] });
  proc.stdout.setEncoding('utf8');
  proc.stderr.setEncoding('utf8');

  let stdout = '';
  let stderr = '';
  proc.stdout.on('data', d => { stdout += d; process.stdout.write(d); });
  proc.stderr.on('data', d => { stderr += d; });
  proc.stdin.write(fullPrompt, 'utf8');
  proc.stdin.end();

  proc.on('close', code => {
    console.log('\n\n=== CLAUDE EXIT CODE:', code, '===');
    if (stderr) console.log('STDERR:', stderr.slice(0, 200));
  });
}

main().catch(console.error);
