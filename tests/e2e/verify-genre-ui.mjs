import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('dialog', async d => { await d.accept(); });
await page.goto('http://127.0.0.1:4173');
await page.waitForTimeout(900);

// 1. 创作流程类型卡片
const newBtn = page.locator('[data-action="open-create-mode-picker"]').first();
await newBtn.click();
await page.waitForTimeout(500);
await page.click('[data-action="open-quick-creation"]');
await page.waitForTimeout(800);
const cards = await page.locator('.cf-genre-card').count();
console.log('类型卡片数（应12）:', cards);
if (cards) {
  await page.locator('.cf-genre-card', { hasText: '悬疑犯罪' }).click();
  await page.waitForTimeout(300);
  await page.locator('.cf-genre-card', { hasText: '爱情' }).click();
  await page.waitForTimeout(300);
  const badges = await page.evaluate(() => [...document.querySelectorAll('.cf-genre-card.is-active')].map(b => ({
    name: b.querySelector('.cf-genre-card__name')?.textContent.trim(),
    badge: b.querySelector('.cf-genre-card__badge')?.textContent.trim()
  })));
  console.log('选中状态:', JSON.stringify(badges));
  const promise = await page.evaluate(() => [...document.querySelectorAll('.cf-step-sub')].map(e=>e.textContent).find(t=>t.includes('📜'))?.slice(0,60));
  console.log('观众承诺提示:', promise);
  await page.screenshot({ path: 'tests/e2e/audit-2026-06-10/genre-cards.png' });
}
// 退出创作流程
await page.goto('http://127.0.0.1:4173');
await page.waitForTimeout(800);

// 2. 资料库类型契约面板
await page.locator('[data-action="open-project"]').first().click();
await page.waitForTimeout(900);
await page.click('#page-library-button');
await page.waitForTimeout(500);
await page.click('[data-action="locks-tab"][data-id="genres"]');
await page.waitForTimeout(500);
const panel = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    hasContract: t.includes('类型契约 · 兑现追踪'),
    primary: t.match(/(\S+)（主导）/)?.[1],
    secondary: t.match(/(\S+)（调味）/)?.[1],
    rows: document.querySelectorAll('.genre-contract-row').length,
    auditBtn: !!document.querySelector('[data-action="ai-genre-audit"]')
  };
});
console.log('契约面板:', JSON.stringify(panel));
await page.screenshot({ path: 'tests/e2e/audit-2026-06-10/genre-contract-panel.png' });
console.log('pageerrors:', errors.length ? errors : '无');
await browser.close();
