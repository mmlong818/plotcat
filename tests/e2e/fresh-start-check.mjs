import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: 'tests/e2e/realcheck-shots/fresh-start.png', fullPage: false });
// 打开创建向导
const createBtn = page.locator('.project-create-btn, button:has-text("新建项目"), button:has-text("开始你的第一个故事")').first();
if (await createBtn.count()) {
  await createBtn.click().catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/e2e/realcheck-shots/fresh-create-modal.png', fullPage: false });
}
await browser.close();
console.log('done');
