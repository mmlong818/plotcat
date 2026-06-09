import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://127.0.0.1:4173');
await page.waitForTimeout(800);
// 打开第一个项目
const open = page.locator('[data-action="open-project"]').first();
if (await open.count()) { await open.click(); await page.waitForTimeout(800); }
const before = await page.evaluate(() => ({
  activeStep: document.body.dataset.activeStep,
  panels: [...document.querySelectorAll('.panel')].filter(p=>!p.hidden).map(p=>p.id)
}));
console.log('before:', JSON.stringify(before));
await page.click('#page-library-button');
await page.waitForTimeout(600);
const after = await page.evaluate(() => ({
  activeStep: document.body.dataset.activeStep,
  panels: [...document.querySelectorAll('.panel')].filter(p=>!p.hidden).map(p=>p.id),
  libHidden: document.querySelector('#panel-library')?.hidden,
  libHtmlLen: document.querySelector('#panel-library')?.innerHTML.length,
  libRect: document.querySelector('#panel-library')?.getBoundingClientRect().height,
  eyebrow: document.querySelector('.hero__eyebrow')?.textContent
}));
console.log('after:', JSON.stringify(after));
console.log('pageerrors:', errors);
await page.screenshot({ path: 'tests/e2e/audit-2026-06-10/repro-library.png', fullPage: false });
await browser.close();
