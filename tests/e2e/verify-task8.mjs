import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
const favRes = [];
page.on('response', r => { if (r.url().includes('favicon')) favRes.push(r.status()); });
await page.goto('http://127.0.0.1:4173');
await page.waitForTimeout(800);
await page.locator('[data-action="open-project"]').first().click();
await page.waitForTimeout(1000);
// 场景名后缀清理
await page.click('[data-action="go-step"][data-id="scenes"]');
await page.waitForTimeout(500);
const titles = await page.evaluate(() => [...document.querySelectorAll('.scene-row__title')].map(e=>e.textContent.trim()));
console.log('场景名（应无「 场景」后缀）:', titles.slice(0,5));
// 剧本页状态口径
await page.click('[data-action="go-step"][data-id="screenplay"]');
await page.waitForTimeout(600);
const metrics = await page.evaluate(() => [...document.querySelectorAll('.metric-card')].map(e=>e.textContent.replace(/\s+/g,' ').trim()));
console.log('剧本页指标:', metrics);
const tags = await page.evaluate(() => [...document.querySelectorAll('.screenplay-page [class*="is-review"],.screenplay-page [class*="is-done"],.screenplay-page [class*="is-empty"],.screenplay-page [class*="is-draft"]')].slice(0,12).map(e=>e.textContent.trim()).filter(t=>t.length<6));
console.log('侧栏标签样本:', [...new Set(tags)]);
console.log('favicon 状态:', favRes);
console.log('pageerrors:', errors.length ? errors : '无');
await browser.close();
