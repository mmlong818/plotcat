// audit-round5 run2: 每步 viewport 截图 + innerText dump
import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'http://127.0.0.1:4173';
const OUT = 'tests/e2e/audit-round5';
const PROJECT_ID = 'project_mptv97q3_xyh2ju';
const consoleLog = [];
let ctxName = 'init';

async function shot(page, name) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot:', name);
}
async function dump(page, name) {
  fs.writeFileSync(`${OUT}/text-${name}.txt`, await page.locator('.layout, main, body').first().innerText());
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  page.on('console', m => { if (m.type() === 'error') consoleLog.push(`[${ctxName}] ${m.text()}`); });
  page.on('pageerror', e => consoleLog.push(`[${ctxName}][pageerror] ${e.message}`));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.locator(`[data-id="${PROJECT_ID}"]`).first().click();
  await page.waitForTimeout(900);

  const steps = [['structure', '结构骨架'], ['characters', '人物核心'], ['relationships', '关系张力'], ['plots', '剧情开发'], ['scenes', '场景拆解'], ['screenplay', '剧本撰写']];
  for (const [id, label] of steps) {
    ctxName = id;
    await page.locator(`text=${label}`).first().click();
    await page.waitForTimeout(800);
    await shot(page, `v-${id}-top`);
    await dump(page, id);
    // 滚动一屏
    await page.evaluate(() => window.scrollBy(0, 950));
    await shot(page, `v-${id}-scroll1`);
    await page.evaluate(() => window.scrollBy(0, 950));
    await shot(page, `v-${id}-scroll2`);
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  // 剧本撰写：全本预览 viewport 截图
  ctxName = 'preview';
  await page.locator('[data-action="preview-screenplay-full"]').click();
  await page.waitForTimeout(1000);
  await shot(page, 'v-preview-top');
  fs.writeFileSync(`${OUT}/text-preview.txt`, await page.locator('body').innerText());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await shot(page, 'v-preview-after-escape');

  // 资料库各 tab 文本
  ctxName = 'library';
  await page.locator('#page-library-button').click();
  await page.waitForTimeout(700);
  await shot(page, 'v-library-timeline');
  await dump(page, 'library-timeline');
  const tabBtns = page.locator('[data-action="locks-tab"]');
  const tabs = await tabBtns.allInnerTexts();
  for (let i = 1; i < tabs.length; i++) {
    await tabBtns.nth(i).click(); await page.waitForTimeout(450);
    await shot(page, `v-library-${i}`);
    await dump(page, `library-${i}-${tabs[i].trim()}`);
  }
  await page.locator('[data-action="library-back"]').click();
  await page.waitForTimeout(500);

  fs.writeFileSync(`${OUT}/console-run2.log`, consoleLog.join('\n') || '(none)');
  console.log('console issues:', consoleLog.length); consoleLog.forEach(l => console.log(l));
  await browser.close();
  console.log('RUN2 DONE');
})();
