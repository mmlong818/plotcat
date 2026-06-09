import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:4173');
await page.waitForTimeout(600);
await page.evaluate(() => { localStorage.setItem('theme','light'); document.documentElement.dataset.theme='light'; });
await page.locator('[data-action="open-project"]').first().click();
await page.waitForTimeout(900);
for (const step of ['structure','scenes']) {
  await page.click(`[data-action="go-step"][data-id="${step}"]`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `tests/e2e/audit-2026-06-10/light-${step}-check.png` });
}
await browser.close();
