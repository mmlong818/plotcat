import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://127.0.0.1:4173');
await page.waitForTimeout(800);
await page.locator('[data-action="open-project"]').first().click();
await page.waitForTimeout(800);
const stepBefore = await page.evaluate(() => document.body.dataset.activeStep);
await page.click('#page-library-button');
await page.waitForTimeout(400);
const onLib = await page.evaluate(() => ({
  panels: [...document.querySelectorAll('.panel')].filter(p=>!p.hidden).map(p=>p.id),
  backBtn: document.querySelector('[data-action="library-back"]')?.textContent.trim()
}));
console.log('on library:', JSON.stringify(onLib));
await page.click('[data-action="library-back"]');
await page.waitForTimeout(400);
const afterBack = await page.evaluate(() => ({
  activeStep: document.body.dataset.activeStep,
  panels: [...document.querySelectorAll('.panel')].filter(p=>!p.hidden).map(p=>p.id)
}));
console.log('step before:', stepBefore, '| after back:', JSON.stringify(afterBack));
// 再测顶栏按钮 toggle
await page.click('#page-library-button');
await page.waitForTimeout(300);
await page.click('#page-library-button');
await page.waitForTimeout(300);
const afterToggle = await page.evaluate(() => document.body.dataset.activeStep);
console.log('after toggle back:', afterToggle);
console.log('pageerrors:', errors);
await browser.close();
