// 乔布斯陪着走「精品创作」全流程 — 古装权谋故事
// 每个 stage 让乔布斯审视，发现 critical 立即停 + 报告

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { jobsReview } from './jobs-reviewer.mjs';

const BASE = 'http://127.0.0.1:4173';
const SHOTS = 'E:/CC/code/yuandian-screenwriting-system/tests/e2e/real-check-shots/jobs-pro';
fs.mkdirSync(SHOTS, { recursive: true });

const ALL_FINDINGS = [];
const w = (ms) => new Promise(r => setTimeout(r, ms));

async function review(page, ctx) {
  console.log(`\n🍎 乔布斯审视：${ctx.stage} ...`);
  const r = await jobsReview(page, ctx);
  const findings = r.findings || [];
  if (findings.length === 0 && r.parseError) {
    console.log(`  [parse error] ${r.parseError}`);
    console.log(`  raw: ${(r.raw || '').slice(0, 300)}`);
  }
  for (const f of findings) {
    console.log(`  [${f.severity}] ${f.where}: ${f.issue.slice(0, 100)}`);
    if (f.fix_hint) console.log(`    → ${f.fix_hint.slice(0, 120)}`);
  }
  ALL_FINDINGS.push({ stage: ctx.stage, findings });
  await page.screenshot({ path: path.join(SHOTS, `${ctx.stage.replace(/[^a-z0-9]/gi, '-')}.png`), fullPage: true }).catch(() => {});
  return findings;
}

// ===== 启动 =====
const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' })).newPage();
page.on('dialog', async d => { await d.accept(); });

await page.goto(BASE);
await w(2500);

// ===== STAGE A：首页 =====
await review(page, { story: '古装权谋', mode: '精品创作', stage: 'A-首页', justDid: '刚打开应用，第一眼看到首页项目中心' });

// ===== STAGE B：打开模式选择器 =====
await page.locator('button').filter({ hasText: /新建项目/ }).first().click();
await w(800);
await review(page, { story: '古装权谋', mode: '精品创作', stage: 'B-模式选择弹窗', justDid: '刚点了「新建项目」，看到模式选择弹窗' });

// ===== STAGE C：进入精品创作 anchor 步 =====
await page.locator('[data-action="open-pro-creation"]').click();
await w(1200);
await review(page, { story: '古装权谋', mode: '精品创作', stage: 'C-anchor-空', justDid: '刚进入精品创作的起点页面，还没填任何东西' });

// 选类型 + 填 anchor
await page.evaluate(() => {
  const chips = Array.from(document.querySelectorAll('[data-action="pro-toggle-genre"]'));
  ['古装', '剧情', '悬疑'].forEach(g => {
    const btn = chips.find(b => b.textContent.trim() === g);
    if (btn) btn.click();
  });
});
await w(300);
await page.evaluate(() => {
  const t = document.querySelector('[data-action="pro-anchor-input"]');
  if (t) {
    t.value = '一位深宫女官在册封大典前夜，发现先帝遗诏被人调换。她有三个时辰决定：揭穿这个秘密，等于撕开权力斗争的口子，让她追随的太后失势；隐瞒它，等于亲手把假诏书送上龙座，让自己一辈子背着这个秘密活下去。她想问自己一个问题——忠诚于人，还是忠诚于真相？';
    t.dispatchEvent(new Event('input', { bubbles: true }));
  }
});
await w(400);
await review(page, { story: '古装权谋', mode: '精品创作', stage: 'C-anchor-已填', justDid: '选了「古装/剧情/悬疑」三个类型 + 填了 150 字的 anchor 文本' });

// ===== STAGE D：点开始创作（AI 分析 anchor） =====
console.log('\n点「开始创作」让 AI 分析 anchor（约 30-60s）...');
await page.locator('[data-action="pro-analyze-anchor"]').click();
const start = Date.now();
let onWorkbenches = false;
while (Date.now() - start < 120000) {
  await w(5000);
  onWorkbenches = await page.evaluate(() => document.querySelector('.pro-creation--workbenches') !== null);
  if (onWorkbenches) break;
}
if (!onWorkbenches) {
  console.log('AI 分析超时');
} else {
  console.log(`AI 分析用时 ${Math.round((Date.now() - start) / 1000)}s`);
  await review(page, { story: '古装权谋', mode: '精品创作', stage: 'D-workbenches-进入', justDid: 'AI 完成 anchor 分析，进入「深度开发」工作台（3 个 tab：主题/人物/场景）' });
}

// ===== STAGE E：主题台 — 生成问题 =====
console.log('\n点「生成问题」主题台...');
await page.evaluate(() => {
  const btn = document.querySelector('[data-action="pro-gen-questions"][data-wb="theme"]');
  if (btn) btn.click();
});
// 等问题列表出现
let questionsLoaded = false;
const qStart = Date.now();
while (Date.now() - qStart < 90000) {
  await w(5000);
  questionsLoaded = await page.evaluate(() => document.querySelectorAll('.pro-qa-question').length > 0);
  if (questionsLoaded) break;
}
console.log(`主题台问题加载用时 ${Math.round((Date.now() - qStart) / 1000)}s, loaded=${questionsLoaded}`);
await review(page, { story: '古装权谋', mode: '精品创作', stage: 'E-主题台-问题已生成', justDid: 'AI 生成了主题台的多个问题，现在等用户答' });

// 答前 3 个问题（如果有）
const qCount = await page.locator('.pro-qa-question').count();
console.log(`主题台问题数: ${qCount}`);
const sampleAnswers = [
  '在乾元七年的宫廷，秩序由层级和礼制维持，但所有人都明白——真正决定生死的是太后手里那枚先帝玉玺',
  '主角是先帝亲选的女官，跟随太后已 12 年。她相信「礼」，因为礼是这宫里唯一能让小人物活下来的盔甲',
  '当她发现真假遗诏并存时，所有的层级和忠诚都倒塌了——她意识到「忠诚」从来不是单向的，是要选立场的'
];
for (let i = 0; i < Math.min(qCount, 3); i++) {
  const ans = sampleAnswers[i] || `深思之后的答案 ${i+1}`;
  await page.evaluate((args) => {
    const [idx, value] = args;
    const tas = document.querySelectorAll('.pro-qa-answer');
    if (tas[idx]) {
      tas[idx].value = value;
      tas[idx].dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, [i, ans]);
  await w(200);
}
await w(2500);
await review(page, { story: '古装权谋', mode: '精品创作', stage: 'F-主题台-答完前3题', justDid: '答了 3 个主题问题，准备标记完成切换到人物台' });

// 标记主题台完成
await page.evaluate(() => {
  const btn = document.querySelector('[data-action="pro-mark-wb-done"][data-wb="theme"]');
  if (btn) btn.click();
});
await w(500);

// 切到人物台
await page.evaluate(() => document.querySelector('[data-action="pro-switch-wb"][data-wb="character"]')?.click());
await w(800);
await review(page, { story: '古装权谋', mode: '精品创作', stage: 'G-人物台-切到', justDid: '刚切到人物台 tab，还没生成问题' });

// ===== STAGE H：跳过其他工作台直接组装 =====
console.log('\n直接尝试 pro-assemble 跳过 character + scene 工作台...');
await page.evaluate(() => document.querySelector('[data-action="pro-assemble"]')?.click());
const assembleStart = Date.now();
let onWorkflow = false;
while (Date.now() - assembleStart < 180000) {
  await w(8000);
  onWorkflow = await page.evaluate(() => !document.querySelector('#stepper-nav')?.hidden);
  if (onWorkflow) break;
}
console.log(`组装用时 ${Math.round((Date.now() - assembleStart) / 1000)}s, onWorkflow=${onWorkflow}`);
if (onWorkflow) {
  await review(page, { story: '古装权谋', mode: '精品创作', stage: 'H-组装完成-工作流首页', justDid: 'AI 完成 pro-assemble，跳到了工作流页面（默认结构骨架）' });
}

// ===== 总报告 =====
console.log('\n========== 乔布斯精品创作之旅总报告 ==========');
const bySev = { critical: 0, high: 0, medium: 0 };
for (const stage of ALL_FINDINGS) {
  console.log(`\n【${stage.stage}】 ${stage.findings.length} 条`);
  for (const f of stage.findings) {
    bySev[f.severity] = (bySev[f.severity] || 0) + 1;
    console.log(`  [${f.severity}] ${f.where}: ${f.issue.slice(0, 80)}`);
  }
}
console.log(`\n总计: critical ${bySev.critical} · high ${bySev.high} · medium ${bySev.medium}`);
fs.writeFileSync(path.join(SHOTS, 'all-findings.json'), JSON.stringify(ALL_FINDINGS, null, 2));
console.log(`所有 findings 已写入 ${SHOTS}/all-findings.json`);

await browser.close();
