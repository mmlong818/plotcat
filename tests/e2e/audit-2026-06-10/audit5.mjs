import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:4173';
const OUT = 'tests/e2e/audit-2026-06-10';
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/nd851/AppData/Local/ms-playwright/chromium-1155/chrome-win/chrome.exe' });
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.locator('button:has-text("继续创作")').first().click();
  await page.waitForTimeout(1000);

  // case A: 在结构页点资料库
  console.log('--- A: structure -> library');
  await page.locator('button:has-text("资料库")').first().click();
  await page.waitForTimeout(800);
  console.log('open dialogs:', await page.evaluate(() => Array.from(document.querySelectorAll('dialog[open]')).map(d => d.className)));
  await page.screenshot({ path: `${OUT}/x-lib-from-structure.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // case B: 在剧本撰写页点资料库
  console.log('--- B: screenplay -> library');
  await page.locator('text=剧本撰写').first().click();
  await page.waitForTimeout(800);
  const activeBefore = await page.evaluate(() => document.querySelector('.step-tab.is-active, [class*=step][class*=active]')?.textContent?.trim());
  console.log('active before:', activeBefore);
  await page.locator('button:has-text("资料库")').first().click();
  await page.waitForTimeout(800);
  console.log('open dialogs:', await page.evaluate(() => Array.from(document.querySelectorAll('dialog[open]')).map(d => d.className)));
  const activeAfter = await page.evaluate(() => document.querySelector('.step-tab.is-active, [class*=step][class*=active]')?.textContent?.trim());
  console.log('active after:', activeAfter);
  await page.screenshot({ path: `${OUT}/x-lib-from-screenplay.png` });
  await browser.close();
})();
