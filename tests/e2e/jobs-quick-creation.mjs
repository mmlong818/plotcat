// 乔布斯陪走「快速创作」全流程 — 科幻软故事
// 5 步：故事核心/结构/人物/情节大纲/确认
// 每步触发 AI 生成 + Jobs 审视

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { jobsReview } from './jobs-reviewer.mjs';

const BASE = 'http://127.0.0.1:4173';
const SHOTS = 'E:/CC/code/yuandian-screenwriting-system/tests/e2e/real-check-shots/jobs-quick';
fs.mkdirSync(SHOTS, { recursive: true });

const ALL = [];
const w = (ms) => new Promise(r => setTimeout(r, ms));
async function review(page, ctx) {
  console.log(`\n🍎 ${ctx.stage} ...`);
  const r = await jobsReview(page, ctx);
  for (const f of (r.findings || [])) {
    console.log(`  [${f.severity}] ${f.where}: ${f.issue.slice(0, 100)}`);
  }
  ALL.push({ stage: ctx.stage, findings: r.findings || [] });
  await page.screenshot({ path: path.join(SHOTS, `${ctx.stage.replace(/[^a-z0-9-]/gi, '-')}.png`), fullPage: true }).catch(() => {});
}

const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' })).newPage();
page.on('dialog', async d => { await d.accept(); });

await page.goto(BASE); await w(2500);

// STAGE A：模式选择弹窗
await page.locator('button').filter({ hasText: /新建项目/ }).first().click();
await w(800);
await review(page, { story: '科幻软', mode: '快速创作', stage: 'A-模式选择', justDid: '刚点了「新建项目」，看到模式选择弹窗' });

// STAGE B：点快速创作进入
await page.locator('[data-action="open-quick-creation"]').click();
await w(1500);
await review(page, { story: '科幻软', mode: '快速创作', stage: 'B-step1-空', justDid: '刚进入快速创作 step1「故事核心」，还没填' });

// 填类型 + logline
await page.evaluate(() => {
  // 找类型 chip — 科幻
  const chips = Array.from(document.querySelectorAll('[data-action="cf-toggle-genre"], [data-action="select-pulse-genre"]'));
  ['科幻'].forEach(g => {
    const btn = chips.find(b => b.textContent?.trim() === g);
    if (btn) btn.click();
  });
});
await w(400);

// 输入概念提示
const promptInput = await page.evaluate(() => {
  const ta = document.querySelector('textarea, input[type="text"]');
  return !!ta;
});
console.log('概念输入存在:', promptInput);
await page.evaluate(() => {
  const ta = document.querySelector('textarea[placeholder], input[type="text"][placeholder]');
  if (ta) {
    ta.value = '一个深空科考站的女工程师，被困在维生系统正在缓慢失效的舱段。她的 AI 助手是她唯一的伙伴 —— 直到她发现这个 AI 在过去 30 天里每天悄悄删掉了一个真实记录。';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
});
await w(500);
await review(page, { story: '科幻软', mode: '快速创作', stage: 'B-step1-已填', justDid: '选了「科幻」类型 + 填了一段概念种子文本' });

// 点继续，让 AI 生成 concept choices
console.log('\n触发 AI 生成 concept choices（30-60s）...');
const continueBtn = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button')).filter(b => /继续|下一步|生成|提交|AI/.test(b.textContent || ''));
  if (btns[0]) { btns[0].click(); return btns[0].textContent.trim(); }
  return null;
});
console.log('点击按钮:', continueBtn);
const start = Date.now();
let conceptOptionsLoaded = false;
while (Date.now() - start < 120000) {
  await w(5000);
  conceptOptionsLoaded = await page.evaluate(() => {
    return document.querySelectorAll('[data-action*="concept"], .cf-concept-card, .cf-option-card').length > 0;
  });
  if (conceptOptionsLoaded) break;
}
console.log(`等待用时 ${Math.round((Date.now() - start) / 1000)}s, options loaded=${conceptOptionsLoaded}`);
await review(page, { story: '科幻软', mode: '快速创作', stage: 'C-step1-AI生成完', justDid: `AI 生成完 concept 候选，加载用时 ${Math.round((Date.now()-start)/1000)}s` });

// 选第一个候选 + 继续
await page.evaluate(() => {
  const sel = document.querySelector('[data-action="cf-select-concept"], [data-action="select-concept"]');
  if (sel) sel.click();
});
await w(800);
const goNext = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button')).filter(b => /继续|下一步/.test(b.textContent || '') && !b.disabled);
  if (btns[0]) { btns[0].click(); return true; }
  return false;
});
console.log('继续到 step 2:', goNext);
const s2 = Date.now();
let onStep2 = false;
while (Date.now() - s2 < 90000) {
  await w(5000);
  onStep2 = await page.evaluate(() => {
    const cur = document.querySelector('.cf-step.is-active')?.textContent || '';
    return /结构|step.*2/i.test(cur);
  });
  if (onStep2) break;
}
await review(page, { story: '科幻软', mode: '快速创作', stage: 'D-step2-结构', justDid: `选完概念进入 step2「结构」，用时 ${Math.round((Date.now()-s2)/1000)}s` });

// ===== 总报告 =====
console.log('\n========== 乔布斯快速创作之旅 ==========');
const bySev = { critical: 0, high: 0, medium: 0 };
for (const stage of ALL) {
  console.log(`\n【${stage.stage}】`);
  for (const f of stage.findings) {
    bySev[f.severity] = (bySev[f.severity] || 0) + 1;
    console.log(`  [${f.severity}] ${f.where}: ${f.issue.slice(0, 90)}`);
  }
}
console.log(`\n总计: critical ${bySev.critical} · high ${bySev.high} · medium ${bySev.medium}`);
fs.writeFileSync(path.join(SHOTS, 'all-findings.json'), JSON.stringify(ALL, null, 2));

await browser.close();
