import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('dialog', async d => { console.log('[dialog]', d.message().split('\n')[0]); await d.accept(); });
await page.goto('http://127.0.0.1:4173');
await page.waitForTimeout(800);
await page.locator('[data-action="open-project"]').first().click();
await page.waitForTimeout(1000);
await page.click('[data-action="go-step"][data-id="scenes"]');
await page.waitForTimeout(500);
const before = await page.evaluate(() => document.querySelectorAll('.scene-row').length);
console.log('扩场前场数:', before);
await page.click('[data-action="ai-expand-scenes"]');
// 等 AI（最长 6 分钟）
for (let i = 0; i < 72; i++) {
  await page.waitForTimeout(5000);
  const loading = await page.evaluate(() => document.body.innerText.includes('规划中'));
  if (!loading) break;
}
await page.waitForTimeout(1000);
const after = await page.evaluate(() => document.querySelectorAll('.scene-row').length);
console.log('扩场后场数:', after);
const sample = await page.evaluate(() => [...document.querySelectorAll('.scene-row')].slice(0,8).map(el => ({
  t: el.querySelector('.scene-row__title')?.textContent.trim(),
  m: el.querySelector('.scene-row__meta')?.textContent.trim().split('·')[0].trim()
})));
console.log('顺序样本:', JSON.stringify(sample, null, 0).slice(0, 400));
// 等 autosave
await page.waitForTimeout(3500);
console.log('pageerrors:', errors.length ? errors : '无');
await browser.close();
// API 复核落库
const proj = (await (await fetch('http://127.0.0.1:4173/api/projects/project_mptv97q3_xyh2ju')).json()).project;
const scenes = proj.scene_workbench.scenes;
console.log('落库场数:', scenes.length, '| 有成稿的场保留:', scenes.filter(s => (s.script_full||'').length > 200).length);
const orphan = scenes.filter(s => !(s.linked_plot_card_ids||[]).length).length;
console.log('无挂卡场数:', orphan);
