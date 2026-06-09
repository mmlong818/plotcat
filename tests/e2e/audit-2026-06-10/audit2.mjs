import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = 'http://127.0.0.1:4173';
const OUT = 'tests/e2e/audit-2026-06-10';
const errors = [];
const texts = {};

async function shot(page, name, wait = 600) {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  console.log('shot:', name);
}

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/nd851/AppData/Local/ms-playwright/chromium-1155/chrome-win/chrome.exe' });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('requestfailed', r => errors.push('REQFAIL ' + r.url()));
  page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.locator('[data-action="open-project"], button:has-text("继续创作")').first().click();
  await page.waitForTimeout(1200);

  const steps = [
    ['结构骨架', 'v-structure'],
    ['人物核心', 'v-characters'],
    ['关系张力', 'v-relationships'],
    ['剧情开发', 'v-plots'],
    ['场景拆解', 'v-scenes'],
    ['剧本撰写', 'v-screenplay']
  ];
  for (const [label, name] of steps) {
    await page.locator(`text=${label}`).first().click().catch(e => console.log('navfail', label));
    await page.waitForTimeout(900);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, name + '-top');
    texts[name] = await page.evaluate(() => document.body.innerText);
    // scroll mid + bottom
    const h = await page.evaluate(() => document.body.scrollHeight);
    if (h > 1100) {
      await page.evaluate(() => window.scrollTo(0, Math.floor(document.body.scrollHeight / 2)));
      await shot(page, name + '-mid', 300);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await shot(page, name + '-bottom', 300);
    }
  }

  // 顶部其他入口：资料库 / 设置
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('button:has-text("资料库")').first().click().catch(() => {});
  await shot(page, 'v-library', 800);
  texts['library'] = await page.evaluate(() => document.body.innerText);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  fs.writeFileSync(`${OUT}/page-texts.json`, JSON.stringify(texts, null, 1));
  fs.writeFileSync(`${OUT}/console-errors.txt`, errors.join('\n'));
  console.log('ERRORS:', errors.length);
  errors.forEach(e => console.log(' -', e.slice(0, 200)));
  await browser.close();
})();
