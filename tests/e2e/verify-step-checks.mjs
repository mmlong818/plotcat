import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://127.0.0.1:4173');
await page.waitForTimeout(800);
await page.locator('[data-action="open-project"]').first().click();
await page.waitForTimeout(1000);
const dumpChecks = () => page.evaluate(() =>
  [...document.querySelectorAll('.step-button')].map(b => ({
    label: b.querySelector('.step-button__label')?.textContent.trim(),
    mark: b.querySelector('.step-button__count')?.textContent.trim(),
    active: b.classList.contains('is-active')
  }))
);
console.log('打开项目（默认步骤）:', JSON.stringify(await dumpChecks()));
// 走到剧本撰写
await page.click('[data-action="go-step"][data-id="screenplay"]');
await page.waitForTimeout(500);
console.log('剧本撰写页:', JSON.stringify(await dumpChecks()));
// 走到场景拆解
await page.click('[data-action="go-step"][data-id="scenes"]');
await page.waitForTimeout(500);
console.log('场景拆解页:', JSON.stringify(await dumpChecks()));
// 等 autosave 落库后整页刷新再开项目，验证跨会话稳定
await page.waitForTimeout(2500);
await page.reload();
await page.waitForTimeout(1000);
const onWorkflow = await page.evaluate(() => document.body.dataset.activeStep);
if (!onWorkflow) {
  await page.locator('[data-action="open-project"]').first().click();
  await page.waitForTimeout(1000);
}
console.log('刷新重开后:', JSON.stringify(await dumpChecks()));
console.log('pageerrors:', errors);
await browser.close();
