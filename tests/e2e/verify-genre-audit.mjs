import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('dialog', async d => { console.log('[dialog]', d.message().slice(0,80)); await d.accept(); });
await page.goto('http://127.0.0.1:4173');
await page.waitForTimeout(900);
// 可能被快照拉进创作页，先退出
const back = page.locator('text=← 项目列表');
if (await back.count()) { await back.click(); await page.waitForTimeout(500); }
await page.locator('[data-action="open-project"]').first().click({ force: true });
await page.waitForTimeout(900);
await page.click('#page-library-button');
await page.waitForTimeout(400);
await page.click('[data-action="locks-tab"][data-id="genres"]');
await page.waitForTimeout(400);
console.log(new Date().toISOString(), '触发契约审计');
await page.click('[data-action="ai-genre-audit"]');
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(5000);
  const loading = await page.evaluate(() => document.body.innerText.includes('审计中'));
  if (!loading) break;
}
await page.waitForTimeout(800);
const result = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.genre-contract-row')].map(r => r.innerText.replace(/\n+/g,' | ').slice(0,110));
  const t = document.body.innerText;
  return { rows, taboo: t.includes('踩中禁忌'), balance: t.match(/混合配比：([^\n]+)/)?.[1] };
});
for (const r of result.rows) console.log(' ', r);
console.log('禁忌提示:', result.taboo, '| 配比:', result.balance);
await page.screenshot({ path: 'tests/e2e/audit-2026-06-10/genre-audit-result.png', fullPage: false });
await page.waitForTimeout(3000);
console.log('pageerrors:', errors.length ? errors : '无');
await browser.close();
