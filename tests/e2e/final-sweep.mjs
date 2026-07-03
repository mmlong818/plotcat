import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
const bad = [];
page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });

for (const theme of ['light','dark']) {
  await page.goto('http://127.0.0.1:4173');
  await page.waitForTimeout(600);
  await page.evaluate((t) => { localStorage.setItem('theme', t); document.documentElement.dataset.theme = t; }, theme);
  await page.locator('[data-action="open-project"]').first().click();
  await page.waitForTimeout(900);
  for (const step of ['structure','characters','relationships','plots','scenes','screenplay']) {
    await page.click(`[data-action="go-step"][data-id="${step}"]`);
    await page.waitForTimeout(350);
  }
  // 资料库往返
  await page.click('#page-library-button'); await page.waitForTimeout(300);
  await page.click('[data-action="library-back"]'); await page.waitForTimeout(300);
  console.log(`[${theme}] 六步+资料库走查 OK`);
}
// 新建向导入口
await page.goto('http://127.0.0.1:4173');
await page.waitForTimeout(600);
const newBtn = page.locator('[data-action="start-creation"], [data-action="open-create-dialog"], [data-action="new-project"]').first();
if (await newBtn.count()) { await newBtn.click(); await page.waitForTimeout(600); console.log('新建入口可打开'); await page.keyboard.press('Escape'); }
console.log('HTTP>=400:', bad.length ? bad : '无');
console.log('pageerrors:', errors.length ? errors : '无');
await browser.close();
