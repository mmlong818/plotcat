// 真实使用模式：前端跑「幕评师全片」，验证类型契约+伏笔已进入评分
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:4173';
const OUT = 'tests/e2e/realuse-shots';

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
p.on('pageerror', e => console.log('  [pageerror]:', e.message));

await p.goto(URL, { waitUntil: 'networkidle' });
await p.locator('[data-action="open-project"]').first().click();
await p.waitForTimeout(700);

// 进剧本撰写
await p.locator('text=剧本撰写').first().click();
await p.waitForTimeout(900);

// 捕获评分请求/响应
const respPromise = p.waitForResponse(
  r => /rate|rater|score|evaluat/i.test(r.url()) && r.request().method() === 'POST',
  { timeout: 180000 }
).catch(() => null);

// 点幕评师全片
const fullBtn = p.locator('[data-action="ai-rate-screenplay-full"]');
await fullBtn.scrollIntoViewIfNeeded();
await fullBtn.click();
console.log('  clicked 幕评师全片，等待 AI 评分...');
await p.screenshot({ path: `${OUT}/r00-rating-start.png`, fullPage: true });

const resp = await respPromise;
if (resp) {
  console.log('  rate endpoint:', resp.url(), '->', resp.status());
} else {
  console.log('  [WARN] 未捕获到评分响应（可能 URL 不匹配）');
}

// 等面板出现
await p.locator('.rater-panel').first().waitFor({ timeout: 30000 }).catch(() => console.log('  [WARN] 面板未出现'));
await p.waitForTimeout(800);
await p.screenshot({ path: `${OUT}/r01-rater-panel.png`, fullPage: true });

// 提取面板文本，检查是否提到类型契约/伏笔相关
const panelText = await p.locator('.rater-panel').first().innerText().catch(() => '');
console.log('=== RATER PANEL TEXT ===');
console.log(panelText.slice(0, 2500));

await b.close();
console.log('RATE DONE');
