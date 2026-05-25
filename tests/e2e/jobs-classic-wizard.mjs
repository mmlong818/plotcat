// 乔布斯陪走「经典向导」全流程 — 古装权谋故事（独立于 pro-creation 的另一种古装题材）
// 4 步：基础信息 / 概念候选 / 起名 / 蓝图确认

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { jobsReview } from './jobs-reviewer.mjs';

const BASE = 'http://127.0.0.1:4173';
const SHOTS = 'E:/CC/code/yuandian-screenwriting-system/tests/e2e/real-check-shots/jobs-classic';
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

// STAGE A：首页
await review(page, { story: '古装权谋', mode: '经典向导', stage: 'A-首页', justDid: '刚打开应用看到项目中心' });

// STAGE B：点新建项目（模式弹窗）
await page.locator('button').filter({ hasText: /新建项目/ }).first().click();
await w(800);

// 经典向导入口似乎在 mode picker 之外，或者要走快速/精品的兜底逻辑。看 project.js
// 实际上 mode picker 只有 quick / pro 两个，经典向导是另一条路径触发的（project-create-dialog）
// 关闭 mode picker 后看是否能直接走经典
await page.evaluate(() => document.querySelector('[data-action="close-create-mode-picker"]')?.click());
await w(400);
// 再点「新建项目」按钮再次打开 — 看是否有第三入口或者 mode picker 默认就有「经典」
// 实际上经典向导走 createDialogOpen，不在 mode picker 里。让我直接打开 create-dialog：
await page.evaluate(() => {
  // 找有没有「经典向导」按钮，没的话用快速创作模式
  const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean);
  console.log('当前按钮：', btns.slice(0, 20));
});

// 重新进 mode picker 并选快速创作（最接近的「经典向导」体验，因为目前没有独立经典入口）
await page.locator('button').filter({ hasText: /新建项目/ }).first().click();
await w(800);
await review(page, { story: '古装权谋', mode: '经典向导', stage: 'B-模式弹窗-修复后', justDid: '本轮修了关闭按钮 + Esc 之后，再看模式弹窗有没有改进' });

// 选快速创作（项目向导路径）
await page.locator('[data-action="open-quick-creation"]').click();
await w(1500);
await review(page, { story: '古装权谋', mode: '经典向导（实际走快速）', stage: 'C-step1-空', justDid: '进入创作流程 step1，看修复后的进度条和必填错误提示' });

// 填类型 + 古装权谋题材
await page.evaluate(() => {
  const chips = Array.from(document.querySelectorAll('[data-action="cf-toggle-genre"], [data-action="select-pulse-genre"]'));
  ['古装', '剧情', '悬疑'].forEach(g => {
    const btn = chips.find(b => b.textContent?.trim() === g);
    if (btn) btn.click();
  });
});
await w(400);

// 输入古装故事 logline
await page.evaluate(() => {
  const ta = document.querySelector('textarea[placeholder]');
  if (ta) {
    ta.value = '元和五年，宫中尚仪女官沈砚之在册封大典前夜，发现先帝遗诏被人调换。三个时辰，揭穿这个秘密会让她跟随的太后失势；隐瞒，将让自己一辈子背负伪诏入档的罪。';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
});
await w(500);
await review(page, { story: '古装权谋', mode: '经典向导（实际走快速）', stage: 'D-step1-已填', justDid: '选 3 个类型 + 填了 120 字 logline，看「还需 N 字」提示是否合理' });

// 等同步保存
await w(2000);

// 触发下一步
const nextClicked = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('[data-action="cf-step1-next"]'));
  if (btns[0] && !btns[0].disabled) { btns[0].click(); return true; }
  return false;
});
console.log('下一步按钮：', nextClicked ? '已点' : '不可点（disabled）');

if (nextClicked) {
  // 等 step 2 渲染或者 AI 生成 concept
  await w(3000);
  await review(page, { story: '古装权谋', mode: '经典向导', stage: 'E-step2-结构', justDid: '进入 step2 结构选择，看修复后顶部 chip + AI 按钮主次' });
}

// ===== 总报告 =====
console.log('\n========== 乔布斯经典/古装之旅总报告 ==========');
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
