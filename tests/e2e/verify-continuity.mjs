import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
let alertMsg = '';
page.on('pageerror', e => errors.push(String(e)));
page.on('dialog', async d => { alertMsg = d.message(); await d.accept(); });
await page.goto('http://127.0.0.1:4173');
await page.waitForTimeout(900);
await page.locator('[data-action="open-project"]').first().click();
await page.waitForTimeout(900);
await page.click('#page-library-button');
await page.waitForTimeout(500);
console.log(new Date().toISOString(), '触发提炼');
await page.click('[data-action="ai-extract-continuity"]');
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(5000);
  const loading = await page.evaluate(() => document.body.innerText.includes('提炼中'));
  if (!loading) break;
}
console.log('alert:', alertMsg);
await page.waitForTimeout(500);
const counts = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    timeline: t.match(/时间节点\s*(\d+)/)?.[1],
    setups: t.match(/伏笔\s*(\d+)/)?.[1]
  };
});
console.log('资料库计数:', JSON.stringify(counts));
// 等 autosave
await page.waitForTimeout(3500);
await page.screenshot({ path: 'tests/e2e/audit-2026-06-10/continuity-after.png' });
console.log('pageerrors:', errors.length ? errors : '无');
await browser.close();
// API 复核
const proj = (await (await fetch('http://127.0.0.1:4173/api/projects/project_mptv97q3_xyh2ju')).json()).project;
const tl = proj.lock_layer.projections.timeline_events;
const sp = proj.lock_layer.projections.setup_payoffs;
console.log('落库时间线:', tl.length, '| 伏笔:', sp.length);
for (const s of sp.slice(0,5)) console.log('  [伏笔]', s.setup_summary, '| 状态:', s.status, '| 埋设场:', s.setup_scene_id ? '已挂' : '无');
for (const e of tl.slice(0,5)) console.log('  [时间线] 第', e.story_day, '天:', e.summary, '| 参与者:', e.participants.length);
