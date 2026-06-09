// 好莱坞 showrunner 全自动创作流程
// 走完结构 → 人物 → 关系 → 剧情卡 → 场景 → 剧本
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:4173';
const OUT = 'tests/e2e/realcheck-shots/auto-create-2026-05-30';
const VIEWPORT = { width: 1920, height: 1080 };

const log = (m) => console.log(`[${new Date().toISOString().slice(11,19)}] ${m}`);

async function shot(page, name) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  log(`  shot ${name}`);
}

async function waitNotBusy(page, indicatorText, timeoutMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const stillBusy = await page.locator(`text=/${indicatorText}/`).count() > 0;
    if (!stillBusy) return true;
    await page.waitForTimeout(800);
  }
  return false;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') log(`[console error] ${m.text()}`); });
  page.on('pageerror', e => log(`[pageerror] ${e.message}`));

  log('=== STEP 0：打开默认项目「潮汐尽头」 ===');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await shot(page, '00-project-center');
  await page.locator('[data-action="open-project"]').first().click();
  await page.waitForTimeout(800);
  await shot(page, '01-project-opened');

  log('=== STEP 1：进入结构骨架 ===');
  await page.locator('text=结构骨架').first().click();
  await page.waitForTimeout(700);
  await shot(page, '02-structure-before');
  // AI 填写情节点
  const aiFillBtn = page.locator('[data-action="ai-gen-structure-notes"]').first();
  if (await aiFillBtn.count()) {
    log('  点击「✦ AI 填写情节点」…');
    await aiFillBtn.click();
    log('  等待结构 AI 完成（最多 3 分钟）');
    await waitNotBusy(page, '生成中', 180000);
    await shot(page, '03-structure-after-ai');
  }

  log('=== STEP 2：进入人物核心 ===');
  await page.locator('text=人物核心').first().click();
  await page.waitForTimeout(700);
  await shot(page, '04-characters-before');
  // 选第一个角色 + AI 辅助修正
  const firstChar = page.locator('.char-rail-item').first();
  if (await firstChar.count()) {
    await firstChar.click();
    await page.waitForTimeout(300);
    const refineBtn = page.locator('[data-action="ai-refine-character"]').first();
    if (await refineBtn.count()) {
      log('  AI 辅助修正主角…');
      await refineBtn.click();
      await waitNotBusy(page, 'AI 修正中', 120000);
      await shot(page, '05-character-refined');
    }
  }

  log('=== STEP 3：关系张力 — 跳过自动生成（无 batch AI 入口），仅截图 ===');
  await page.locator('text=关系张力').first().click();
  await page.waitForTimeout(700);
  await shot(page, '06-relationships');

  log('=== STEP 4：剧情开发 — 截图当前状态 ===');
  await page.locator('text=剧情开发').first().click();
  await page.waitForTimeout(800);
  await shot(page, '07-plots');

  log('=== STEP 5：场景拆解 — AI 拆第一场 ===');
  await page.locator('text=场景拆解').first().click();
  await page.waitForTimeout(800);
  await shot(page, '08-scenes-before');
  const breakdownBtn = page.locator('[data-action="ai-breakdown-scene"]').first();
  if (await breakdownBtn.count()) {
    log('  ✦ AI 拆这场（第一场）…');
    await breakdownBtn.click();
    await waitNotBusy(page, '拆解中', 90000);
    await shot(page, '09-scene-broken-down');
  }

  log('=== STEP 6：剧本撰写 — AI 写本场（第一场） ===');
  await page.locator('text=剧本撰写').first().click();
  await page.waitForTimeout(900);
  await shot(page, '10-script-before');
  const writeBtn = page.locator('[data-action="ai-write-scene-script"]').first();
  if (await writeBtn.count()) {
    log('  AI 写本场（第一场）…');
    await writeBtn.click();
    await waitNotBusy(page, '生成中|批量中', 180000);
    await shot(page, '11-script-after');
  }

  await browser.close();
  log('AUTO CREATE DONE');
})();
