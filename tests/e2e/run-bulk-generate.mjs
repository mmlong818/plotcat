import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('dialog', async d => { console.log('[dialog]', d.message().split('\n')[0]); await d.accept(); });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://127.0.0.1:4173');
await page.waitForTimeout(800);
await page.locator('[data-action="open-project"]').first().click();
await page.waitForTimeout(1000);
await page.click('[data-action="go-step"][data-id="screenplay"]');
await page.waitForTimeout(600);
console.log(new Date().toISOString(), '启动批量生成');
await page.click('[data-action="ai-write-screenplay-bulk"]');
// 轮询直到完成（上限 150 分钟）
let last = '';
for (let i = 0; i < 180; i++) {
  await page.waitForTimeout(50000);
  const state = await page.evaluate(() => {
    const t = document.body.innerText;
    return {
      bulk: t.match(/批量中\s*(\d+)\/(\d+)/)?.[0] ?? null,
      done: t.match(/已成稿\s*(\d+)/)?.[1],
      err: t.match(/AI 错误：([^\n]+)/)?.[1] ?? ''
    };
  });
  const line = JSON.stringify(state);
  if (line !== last) { console.log(new Date().toISOString(), line); last = line; }
  if (!state.bulk) break;
}
await page.waitForTimeout(5000);
const final = await page.evaluate(() => document.body.innerText.match(/总字数\s*(\d+)/)?.[1]);
console.log('最终总字数:', final, '| pageerrors:', errors.length ? errors.slice(0,3) : '无');
await browser.close();
