process.env.NO_PROXY='*';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, bypassCSP: true });
const page = await ctx.newPage();
// Ensure no cache
await ctx.clearCookies();
await page.goto('http://127.0.0.1:4173/?nocache=' + Date.now(), { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.evaluate(()=>document.querySelector('button[data-action="open-create-mode-picker"]')?.click());
await page.waitForTimeout(400);
await page.screenshot({ path: 'tests/e2e/realcheck-shots/fix-3-mode-picker.png', fullPage: true });
await page.evaluate(()=>document.querySelector('[data-action="open-quick-creation"]')?.click());
await page.waitForTimeout(1200);
await page.screenshot({ path: 'tests/e2e/realcheck-shots/fix-1-creation-step1.png', fullPage: true });
console.log('done');
await browser.close();
