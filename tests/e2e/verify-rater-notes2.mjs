import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4173';
const pid = 'project_mptv97q3_xyh2ju';
let proj = (await (await fetch(`${BASE}/api/projects/${pid}`)).json()).project;
const scene = proj.scene_workbench.scenes[1];
scene.notes = "我的真实创作笔记\n\n【上轮幕评师修稿指令】\n1. [high] 对白太直白\n   定位：开头\n   要求：加潜台词";
await fetch(`${BASE}/api/projects/${pid}`, { method:'PUT', headers:{'content-type':'application/json'}, body: JSON.stringify({project: proj}) });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE);
await page.waitForTimeout(800);
await page.locator('[data-action="open-project"]').first().click();
await page.waitForTimeout(1000);
await page.click('[data-action="go-step"][data-id="scenes"]');
await page.waitForTimeout(500);
// 选中第 2 场，读创作笔记 textarea
await page.locator('[data-action="select-scene"]').nth(1).click();
await page.waitForTimeout(500);
const notesVal = await page.evaluate(() => {
  const ta = [...document.querySelectorAll('textarea')].find(t => t.dataset.field === 'notes' || t.closest('[class*=notes]'));
  return ta ? ta.value : '(没找到 notes 输入框)';
});
console.log('UI 中的创作笔记:', JSON.stringify(notesVal));
// 改动触发保存，验证落库
await page.evaluate(() => {
  const ta = [...document.querySelectorAll('textarea')].find(t => t.dataset.field === 'notes');
  if (ta) { ta.value = ta.value + ' '; ta.dispatchEvent(new Event('input', {bubbles:true})); ta.dispatchEvent(new Event('change', {bubbles:true})); }
});
await page.waitForTimeout(3500);
await browser.close();
proj = (await (await fetch(`${BASE}/api/projects/${pid}`)).json()).project;
const s = proj.scene_workbench.scenes[1];
console.log('落库 notes:', JSON.stringify((s.notes||'').slice(0,40)));
console.log('落库 rater_directives:', JSON.stringify((s.rater_directives||'').slice(0,40)));
// 还原
s.notes = ""; s.rater_directives = "";
await fetch(`${BASE}/api/projects/${pid}`, { method:'PUT', headers:{'content-type':'application/json'}, body: JSON.stringify({project: proj}) });
console.log('已还原');
