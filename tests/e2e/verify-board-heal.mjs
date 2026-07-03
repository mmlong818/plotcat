import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://127.0.0.1:4173');
await page.waitForTimeout(800);
await page.locator('[data-action="open-project"]').first().click();
await page.waitForTimeout(1000);
const state = await page.evaluate(() => {
  // 从全局拿不到 appState（module scope），改从 DOM 验证
  return null;
});
// 剧情开发板
await page.click('[data-action="go-step"][data-id="plots"]');
await page.waitForTimeout(600);
const board = await page.evaluate(() => {
  const lanes = [...document.querySelectorAll('.pgrid-row, [class*="lane"]')].length;
  const text = document.body.innerText;
  const m = text.match(/正式主线\s*(\d+)\s*卡/);
  const unplaced = text.match(/未归位\s*(\d+)/);
  return { mainCount: m?.[1], unplaced: unplaced?.[1] };
});
console.log('剧情板:', JSON.stringify(board));
await page.screenshot({ path: 'tests/e2e/audit-2026-06-10/board-healed.png' });
// 场景页：检查每场的幕
await page.click('[data-action="go-step"][data-id="scenes"]');
await page.waitForTimeout(600);
const sceneActs = await page.evaluate(() =>
  [...document.querySelectorAll('.scene-row__meta')].map(el => el.textContent.trim().split('·')[0].trim() + '·' + (el.textContent.includes('二')?'二':el.textContent.includes('三')?'三':'一'))
);
const actsRaw = await page.evaluate(() =>
  [...document.querySelectorAll('.scene-row')].map(el => ({
    t: el.querySelector('.scene-row__title')?.textContent.trim().slice(0,12),
    m: el.querySelector('.scene-row__meta')?.textContent.trim()
  }))
);
console.log('场景幕分布:');
for (const s of actsRaw) console.log(' ', s.t, '|', s.m);
console.log('pageerrors:', errors);
await browser.close();
