import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:4173';
const OUT = 'tests/e2e/audit-2026-06-10';
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/nd851/AppData/Local/ms-playwright/chromium-1155/chrome-win/chrome.exe' });
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.locator('button:has-text("新建项目")').first().click();
  await page.waitForTimeout(600);
  // 一句话概念
  await page.locator('text=快速生成框架').first().click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/x-wizard-logline.png` });
  console.log('WIZARD TEXT >>>');
  console.log(await page.evaluate(() => document.body.innerText.slice(0, 2500)));
  await browser.close();
})();
