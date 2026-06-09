import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://127.0.0.1:4173');
await page.waitForTimeout(800);
await page.locator('[data-action="open-project"]').first().click();
await page.waitForTimeout(1000);
await page.click('[data-action="go-step"][data-id="plots"]');
await page.waitForTimeout(500);
// 打开第一张卡的编辑抽屉，再删除
await page.locator('[data-action="open-plot-editor"]').first().click();
await page.waitForTimeout(400);
await page.locator('[data-action="delete-plot-card"]').first().click();
await page.waitForTimeout(500);
const mainAfterDel = await page.evaluate(() => document.body.innerText.match(/正式主线\s*(\d+)\s*卡/)?.[1]);
console.log('删除后主线卡数:', mainAfterDel);
// 场景页：被删卡不应再出现在 chips
await page.click('[data-action="go-step"][data-id="scenes"]');
await page.waitForTimeout(500);
const chips = await page.evaluate(() => [...document.querySelectorAll('.scene-plot-chip span')].map(e=>e.textContent.trim()));
console.log('场景页 chips 数:', chips.length, '| 含被删卡?', chips.includes('母亲解剖台前咳血'));
// 回去恢复
await page.click('[data-action="go-step"][data-id="plots"]');
await page.waitForTimeout(400);
await page.click('[data-action="toggle-plot-trash-view"]');
await page.waitForTimeout(400);
await page.locator('[data-action="restore-plot-card"]').first().click();
await page.waitForTimeout(500);
const mainAfterRestore = await page.evaluate(() => document.body.innerText.match(/正式主线\s*(\d+)\s*卡/)?.[1]);
console.log('恢复后主线卡数:', mainAfterRestore);
console.log('pageerrors:', errors.length ? errors : '无');
await browser.close();
