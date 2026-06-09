import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:4173');
await page.waitForTimeout(500);
// Click first project
const proj = page.locator('[data-action="open-project"]').first();
if (await proj.count()) await proj.click();
await page.waitForTimeout(400);
// Go to characters page
const navBtn = page.locator('text=人物核心').first();
if (await navBtn.count()) await navBtn.click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'tests/e2e/realcheck-shots/_chars-before.png', fullPage: true });
// Measure
const metrics = await page.evaluate(() => {
  const rail = document.querySelector('.char-rail-pane');
  const main = document.querySelector('.char-editor-pane');
  const wb = document.querySelector('.character-workbench');
  const editor = document.querySelector('.char-editor-card');
  return {
    railW: rail?.getBoundingClientRect().width,
    mainW: main?.getBoundingClientRect().width,
    wbW: wb?.getBoundingClientRect().width,
    editorW: editor?.getBoundingClientRect().width,
    editorH: editor?.getBoundingClientRect().height,
    vw: window.innerWidth,
    vh: window.innerHeight,
  };
});
console.log(JSON.stringify(metrics, null, 2));
await browser.close();
