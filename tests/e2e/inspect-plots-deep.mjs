import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const proj = page.locator('[data-action="open-project"]').first();
if (await proj.count()) await proj.click();
await page.waitForTimeout(400);
const navBtn = page.locator('text=剧情开发').first();
if (await navBtn.count()) await navBtn.click();
await page.waitForTimeout(800);

// Measure key sticky elements and navbar
const m = await page.evaluate(() => {
  const nav = document.querySelector('header, .app-topbar, [data-app-topbar]');
  const navRect = nav?.getBoundingClientRect();
  const navZ = nav ? getComputedStyle(nav).zIndex : null;
  const navPos = nav ? getComputedStyle(nav).position : null;
  const acts = document.querySelector('.pgrid-hrow--acts .pgrid-hcell');
  const nodes = document.querySelector('.pgrid-hrow--nodes .pgrid-hcell');
  return {
    navTop: navRect?.top, navBottom: navRect?.bottom, navZ, navPos,
    actsRect: acts?.getBoundingClientRect(),
    nodesRect: nodes?.getBoundingClientRect(),
  };
});
console.log('BEFORE SCROLL:', JSON.stringify(m, null, 2));

await page.evaluate(() => window.scrollTo(0, 250));
await page.waitForTimeout(300);

const m2 = await page.evaluate(() => {
  const acts = document.querySelector('.pgrid-hrow--acts .pgrid-hcell');
  const nodes = document.querySelector('.pgrid-hrow--nodes .pgrid-hcell');
  const firstCard = document.querySelector('.pgrid-card');
  return {
    actsRect: acts?.getBoundingClientRect(),
    nodesRect: nodes?.getBoundingClientRect(),
    cardRect: firstCard?.getBoundingClientRect(),
  };
});
console.log('AFTER SCROLL 250:', JSON.stringify(m2, null, 2));

await page.screenshot({ path: 'tests/e2e/realcheck-shots/_plots-deep.png', clip: { x: 0, y: 0, width: 900, height: 400 } });
await browser.close();
