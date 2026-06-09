// 诊断：结构骨架「一键生成故事点」note 是否落库
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:4173';
const PID = process.argv[2] || 'project_mptt7xj8_cy2w2m';

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
p.on('dialog', async d => { await d.accept(); });

let actResponses = 0;
p.on('response', r => {
  if (/generate-act-nodes/.test(r.url())) { actResponses++; console.log(`  [resp #${actResponses}] generate-act-nodes -> ${r.status()}`); }
});

await p.goto(URL, { waitUntil: 'networkidle' });
// 打开指定项目
const opened = await p.locator(`[data-action="open-project"][data-id="${PID}"]`).first()
  .click().then(() => true).catch(() => false);
console.log('打开项目', PID, opened ? '✓' : '✗(尝试列表第一个)');
await p.waitForTimeout(2000);

// 去结构骨架
await p.locator('[data-action="go-step"][data-id="structure"]').first().click().catch(() => {});
await p.waitForTimeout(1000);

// 一键生成
const genBtn = p.locator('[data-action="ai-gen-structure-notes"]').first();
await genBtn.scrollIntoViewIfNeeded();
await genBtn.click();
console.log('✓ 点击一键生成，等待全部幕完成...');

// 等按钮恢复可用（全部幕 loading 清除）
await p.locator('[data-action="ai-gen-structure-notes"]:not([disabled])')
  .first().waitFor({ state: 'visible', timeout: 300000 }).catch(() => console.log('  按钮恢复超时'));
console.log(`  共收到 ${actResponses} 次 generate-act-nodes 响应`);
await p.waitForTimeout(1500);

// 保存
await p.locator('#save-button').first().click().catch(() => {});
console.log('✓ 已点保存');
await p.waitForTimeout(2500);

await b.close();
console.log('DIAG DONE');
