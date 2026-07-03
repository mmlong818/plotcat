import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
p.on('dialog', async d => { await d.accept(); });
p.on('pageerror', e => console.log('[pageerror]', e.message));
p.on('console', m => { if (m.text().includes('debug-finalize')) console.log('[browser]', m.text()); });

// Mock：characters 流式生成
await p.route('**/api/generate/stream', async route => {
  const chars = [
    { name: "陆沉", story_role: "protagonist", archetype: "测试", external_want: "x", internal_need: "y", psychological_flaw: "z", moral_flaw: "m", public_mask: "p", core_fear: "f", wound: "w", belief: "b", arc_start: "a", arc_end: "e", voice_rules: ["r"], secret: "s" },
    { name: "苏晚", story_role: "ally", archetype: "测试", external_want: "x", internal_need: "y", psychological_flaw: "z", moral_flaw: "m", public_mask: "p", core_fear: "f", wound: "w", belief: "b", arc_start: "a", arc_end: "e", voice_rules: ["r"], secret: "s" }
  ];
  const body = `data: ${JSON.stringify({ type: "done", choices: [{ id: "c1", label: "方案A", content: "", data: { characters: chars } }], reasoning: "", warnings: [] })}\n\n`;
  await route.fulfill({ status: 200, contentType: 'text/event-stream', body });
});
// Mock：act nodes
await p.route('**/api/ai/generate-act-nodes', async route => {
  const req = JSON.parse(route.request().postData());
  const nodes = {};
  for (const n of req.nodes) nodes[n[0]] = { story_title: "测试" + n[0], summary: "测试摘要".repeat(10), value_shift: "从A到B" };
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: { nodes } }) });
});

const snapGenres = () => p.evaluate(() => {
  const v = localStorage.getItem('yuandian-plot-driven-workspace');
  const j = v ? JSON.parse(v) : null;
  return { step: j?.creation?.currentStep, genres: j?.creation?.genres };
});

await p.goto('http://127.0.0.1:4173');
await p.waitForTimeout(700);
const back = p.locator('text=← 项目列表');
if (await back.count()) { await back.click(); await p.waitForTimeout(300); }
await p.click('[data-action="open-create-mode-picker"]');
await p.waitForTimeout(300);
await p.click('[data-action="open-quick-creation"]');
await p.waitForTimeout(500);
await p.click('[data-action="cf-toggle-genre"][data-id="科幻"]');
await p.click('[data-action="cf-toggle-genre"][data-id="爱情/都市情感"]');
const ta = p.locator('[data-action="cf-set-draft-field"][data-field="logline"]').first();
await ta.fill('记忆删除工程师发现待删的恋爱记忆属于自己，必须入侵自己设计的记忆监狱。');
await ta.dispatchEvent('input');
await p.waitForTimeout(300);
console.log('step1:', JSON.stringify(await snapGenres()));
await p.click('[data-action="cf-step1-next"]');
await p.waitForTimeout(500);
console.log('step2:', JSON.stringify(await snapGenres()));
await p.click('[data-action="cf-step2-next"]');
await p.waitForTimeout(1500);
console.log('step3:', JSON.stringify(await snapGenres()));
let safety = 0;
while (await p.locator('[data-action="confirm-character"]').count() > 0 && safety++ < 6) {
  await p.locator('[data-action="confirm-character"]').first().click();
  await p.waitForTimeout(200);
}
await p.click('[data-action="cf-step3-next"]');
await p.waitForTimeout(1200);
console.log('step4:', JSON.stringify(await snapGenres()));
for (let g = 0; g < 15; g++) {
  await p.waitForTimeout(1200);
  if (await p.locator('[data-action="cf-step4-finish"]').count()) { await p.click('[data-action="cf-step4-finish"]'); console.log('  完成节点'); break; }
  if (await p.locator('[data-action="cf-advance-act"]').count()) { await p.click('[data-action="cf-advance-act"]'); console.log('  下一幕'); continue; }
  const gen = p.locator('[data-action="cf-generate-act"]:not([disabled])');
  if (await gen.count()) { await gen.first().click(); console.log('  生成本幕'); }
}
await p.waitForTimeout(800);
console.log('step5:', JSON.stringify(await snapGenres()));
let putN = 0;
p.on('request', r => {
  if (r.method() === 'PUT' && r.url().includes('/api/projects/')) {
    const doc = JSON.parse(r.postData()).project;
    console.log(`PUT#${++putN} genre:`, JSON.stringify(doc.project?.genre));
  }
});
p.on('response', async r => {
  if (r.request().method() === 'PUT' && r.url().includes('/api/projects/')) {
    const j = await r.json().catch(() => null);
    console.log('  PUT 响应 genre:', JSON.stringify(j?.project?.project?.genre));
  }
});
await p.click('[data-action="cf-finalize-new"]');
await p.waitForTimeout(6000);
// 清理测试项目
const list = (await (await fetch('http://127.0.0.1:4173/api/projects')).json()).projects;
const test = list.find(x => x.title?.includes('记忆删除') || x.logline?.includes('记忆监狱'));
if (test) { await fetch(`http://127.0.0.1:4173/api/projects/${test.id}`, { method: 'DELETE' }); console.log('已清理测试项目', test.id); }
await b.close();
