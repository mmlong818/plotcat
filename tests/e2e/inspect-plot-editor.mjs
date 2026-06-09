import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const proj = page.locator('[data-action="open-project"]').first();
if (await proj.count()) await proj.click();
await page.waitForTimeout(400);
const navBtn = page.locator('text=剧情开发').first();
if (await navBtn.count()) await navBtn.click();
await page.waitForTimeout(800);
// Click first plot card to select
const firstCard = page.locator('.pgrid-card').first();
await firstCard.click();
await page.waitForTimeout(300);
// Open editor
await page.locator('[data-action="open-plot-editor"]').first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'tests/e2e/realcheck-shots/_plot-editor-before.png', clip: { x: 480, y: 0, width: 1120, height: 1000 } });
const m = await page.evaluate(() => {
  const drawer = document.querySelector('.plot-editor-drawer__panel');
  return { drawerW: drawer?.getBoundingClientRect().width, drawerH: drawer?.getBoundingClientRect().height };
});
console.log(JSON.stringify(m));
await browser.close();
