// 完成剧本 + dump 全部产物给专家审核
import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'http://127.0.0.1:4173';
const OUT = 'tests/e2e/realcheck-shots/auto-create-2026-05-30';
const DUMP = 'tests/e2e/realcheck-shots/auto-create-2026-05-30/dump.json';

const log = (m) => console.log(`[${new Date().toISOString().slice(11,19)}] ${m}`);

async function shot(page, name) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  log(`  shot ${name}`);
}

// 等按钮经历 enabled→disabled→enabled 一轮（说明 AI 调用真完成）
async function clickAndWaitAi(page, selector, timeoutMs = 300000) {
  const btn = page.locator(selector).first();
  if (!await btn.count()) { log(`  selector ${selector} not found`); return false; }
  await btn.click();
  log(`  clicked ${selector}, waiting AI…`);
  // 等 disabled 出现
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return el && (el.hasAttribute('disabled') || el.classList.contains('is-busy') || el.textContent.includes('生成中') || el.textContent.includes('拆解中') || el.textContent.includes('AI 修正中') || el.textContent.includes('批量中') || el.textContent.includes('AI 写作中'));
    },
    selector,
    { timeout: 5000 }
  ).catch(() => log(`  no busy state detected (button might transition quickly)`));
  // 等 disabled 消失
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      if (!el) return true;
      return !(el.hasAttribute('disabled') || el.classList.contains('is-busy') || el.textContent.includes('生成中') || el.textContent.includes('拆解中') || el.textContent.includes('AI 修正中') || el.textContent.includes('批量中') || el.textContent.includes('AI 写作中'));
    },
    selector,
    { timeout: timeoutMs }
  );
  log(`  AI completed`);
  return true;
}

async function dumpProject(page) {
  return await page.evaluate(async () => {
    const data = JSON.parse(localStorage.getItem('yuandian-plot-driven-workspace') || '{}');
    const proj = data.project;
    return {
      project_title: proj?.project?.title,
      story_core: proj?.story_core,
      characters: (proj?.character_hub?.characters || []).map(c => ({
        name: c.name, story_role: c.story_role,
        external_goal: c.external_goal, dramatic_need: c.dramatic_need,
        contradiction: c.contradiction, pressure_point: c.pressure_point,
        secret: c.secret, arc_start: c.arc_start, arc_end: c.arc_end,
        traits: c.traits, mbti: c.mbti, core_drive: c.core_drive
      })),
      relationships: (proj?.character_hub?.relationship_map || []).map(r => ({
        source: r.source_character_id, target: r.target_character_id,
        kind: r.relationship_kind, type: r.relationship_type,
        tension: r.tension, power_balance: r.power_balance,
        shared_history: r.shared_history, hidden_truth: r.hidden_truth
      })),
      plot_cards: (proj?.plot_board?.cards || []).filter(c => !c.deleted_at).map(c => ({
        title: c.title, lane_id: c.lane_id, act_id: c.act_id, node_id: c.node_id,
        summary: c.summary, dramatic_question: c.dramatic_question,
        conflict: c.conflict, change: c.change
      })),
      scenes: (proj?.scene_workbench?.scenes || []).map(s => ({
        title: s.title, act_id: s.act_id, pov: s.pov_character_id,
        location: s.location, time_of_day: s.time_of_day,
        purpose: s.purpose, obstacle: s.obstacle, beat_summary: s.beat_summary,
        entry_state: s.entry_state, exit_state: s.exit_state,
        conflict_proposition: s.conflict_proposition,
        subtext_goal: s.subtext_goal, arc_beat: s.arc_beat,
        script_full: s.script_full || "(未撰写)"
      }))
    };
  });
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') log(`[err] ${m.text()}`); });
  page.on('pageerror', e => log(`[perr] ${e.message}`));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.locator('[data-action="open-project"]').first().click();
  await page.waitForTimeout(700);

  // ── 结构 AI ──
  log('STEP A: 结构 AI 填情节点');
  await page.locator('text=结构骨架').first().click();
  await page.waitForTimeout(500);
  await clickAndWaitAi(page, '[data-action="ai-gen-structure-notes"]', 180000);
  await shot(page, '20-structure-real-ai');

  // ── 场景拆解 2/3 ──
  log('STEP B: 拆解所有场景');
  await page.locator('text=场景拆解').first().click();
  await page.waitForTimeout(500);
  // 选每个场景 click "AI 拆这场"
  const sceneCount = await page.locator('.scene-row').count();
  log(`  scenes detected: ${sceneCount}`);
  for (let i = 0; i < sceneCount; i++) {
    await page.locator('.scene-row').nth(i).click();
    await page.waitForTimeout(400);
    await clickAndWaitAi(page, '[data-action="ai-breakdown-scene"]', 90000);
  }
  await shot(page, '21-scenes-all-broken');

  // ── 剧本撰写：全片批量 ──
  log('STEP C: 剧本 AI 批量生成');
  await page.locator('text=剧本撰写').first().click();
  await page.waitForTimeout(700);
  // 用全片重写按钮触发（清空+批量）
  page.once('dialog', d => d.accept());
  page.on('dialog', d => d.accept());
  await clickAndWaitAi(page, '[data-action="ai-write-screenplay-bulk"]', 600000);
  await shot(page, '22-script-bulk-done');

  // ── dump 所有产物 ──
  log('STEP D: Dump 全部产物');
  const dump = await dumpProject(page);
  fs.writeFileSync(DUMP, JSON.stringify(dump, null, 2), 'utf8');
  log(`  dumped ${dump.scenes?.length} scenes, ${dump.characters?.length} chars`);

  await browser.close();
  log('FINISH AUTO-CREATE DONE');
})();
