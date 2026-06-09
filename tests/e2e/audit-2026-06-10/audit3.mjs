import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:4173';
const OUT = 'tests/e2e/audit-2026-06-10';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/nd851/AppData/Local/ms-playwright/chromium-1155/chrome-win/chrome.exe' });
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  page.on('response', r => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.locator('button:has-text("继续创作")').first().click();
  await page.waitForTimeout(1000);

  // 剧本撰写页顶部
  await page.locator('text=剧本撰写').first().click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/x-screenplay-header.png`, clip: { x: 0, y: 0, width: 1600, height: 420 } });

  // 点资料库，看发生什么
  await page.locator('button:has-text("资料库")').first().click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/x-after-library-click.png` });
  console.log('after library click, active nav:', await page.evaluate(() => {
    const a = document.querySelector('.step-nav .is-active, [aria-current], .active');
    return a ? a.textContent.trim() : document.querySelector('header')?.innerText.slice(0, 200);
  }));
  console.log('URL now:', page.url());
  // 是否有弹层
  console.log('dialog count:', await page.locator('dialog[open], .modal, .drawer, [class*=library]').count());
  const libCls = await page.evaluate(() => Array.from(document.querySelectorAll('[class*=library], [class*=kb-]')).slice(0,5).map(e => e.className));
  console.log('lib-ish elements:', JSON.stringify(libCls));

  // 设置弹窗 ⚙
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.locator('header button:has-text("⚙"), button[title*=设置], .icon-btn:has-text("⚙")').first().click().catch(e => console.log('settings click fail'));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/x-settings.png` });

  // 暗色模式
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.locator('button:has-text("🌙")').first().click().catch(() => console.log('moon fail'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/x-darkmode.png` });

  await browser.close();
})();
