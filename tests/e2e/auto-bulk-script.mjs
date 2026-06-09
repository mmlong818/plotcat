import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'http://127.0.0.1:4173';
const OUT = 'tests/e2e/realcheck-shots/auto-create-2026-05-30';
const DUMP = `${OUT}/dump.json`;

const log = (m) => console.log(`[${new Date().toISOString().slice(11,19)}] ${m}`);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept().catch(() => {}));
  page.on('console', m => { if (m.type() === 'error') log(`[err] ${m.text()}`); });
  page.on('pageerror', e => log(`[perr] ${e.message}`));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.locator('[data-action="open-project"]').first().click();
  await page.waitForTimeout(700);

  log('进入剧本撰写页');
  await page.locator('text=剧本撰写').first().click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/30-before-bulk.png` });

  log('点击 AI 批量生成全部');
  await page.locator('[data-action="ai-write-screenplay-bulk"]').first().click();
  log('等待对话确认完成 + 批量结束（最长 12 分钟）');

  // 轮询：等到 button 不再 disabled 且没有"批量中"字样
  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-action="ai-write-screenplay-bulk"]');
    if (!btn) return true;
    if (btn.hasAttribute('disabled')) return false;
    if (btn.textContent.includes('批量中')) return false;
    return true;
  }, null, { timeout: 720000 });

  log('批量完成');
  await page.screenshot({ path: `${OUT}/31-after-bulk.png`, fullPage: false });

  // 切第一场看剧本
  await page.locator('[data-action="select-screenplay-scene"], .screenplay-list-item, [class*="scene-row"]').first().click().catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/32-script-scene1.png`, fullPage: false });

  log('Dump 产物');
  const dump = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('yuandian-plot-driven-workspace') || '{}');
    const proj = data.project;
    return {
      project_title: proj?.project?.title,
      story_core: proj?.story_core,
      characters: (proj?.character_hub?.characters || []).map(c => ({
        name: c.name, story_role: c.story_role,
        external_goal: c.external_goal, dramatic_need: c.dramatic_need,
        contradiction: c.contradiction, pressure_point: c.pressure_point,
        secret: c.secret, starting_mask: c.starting_mask,
        arc_start: c.arc_start, arc_end: c.arc_end,
        traits: c.traits, mbti: c.mbti, core_drive: c.core_drive
      })),
      relationships: (proj?.character_hub?.relationship_map || []).map(r => {
        const chars = proj?.character_hub?.characters || [];
        const src = chars.find(c => c.id === r.source_character_id)?.name;
        const tgt = chars.find(c => c.id === r.target_character_id)?.name;
        return {
          source: src, target: tgt,
          kind: r.relationship_kind, type: r.relationship_type,
          tension: r.tension, power_balance: r.power_balance,
          shared_history: r.shared_history, hidden_truth: r.hidden_truth
        };
      }),
      structure_nodes: (proj?.structure_profile?.nodes || []).map(n => ({
        act: n.act_id, type: n.node_type, title: n.title, note: n.note
      })),
      scenes: (proj?.scene_workbench?.scenes || []).map(s => {
        const chars = proj?.character_hub?.characters || [];
        const pov = chars.find(c => c.id === s.pov_character_id)?.name;
        return {
          order: s.order_index, title: s.title,
          act: s.act_id, pov,
          location: s.location, time_of_day: s.time_of_day,
          purpose: s.purpose, obstacle: s.obstacle, beat_summary: s.beat_summary,
          entry_state: s.entry_state, exit_state: s.exit_state,
          conflict_proposition: s.conflict_proposition,
          subtext_goal: s.subtext_goal, arc_beat: s.arc_beat,
          script_full: s.script_full || "(未撰写)"
        };
      })
    };
  });
  fs.writeFileSync(DUMP, JSON.stringify(dump, null, 2), 'utf8');
  log(`Dumped ${dump.scenes?.length} scenes, ${dump.characters?.length} chars to ${DUMP}`);
  log(`Total script chars: ${dump.scenes.reduce((s, sc) => s + (sc.script_full?.length || 0), 0)}`);

  await browser.close();
  log('DONE');
})();
