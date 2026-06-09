// 一次跑完一个剧本的完整工作流：mode picker → 三幕节拍 → 人物 → 关系 → 剧情卡 → 场景 → 正文
// 依赖 window.__yuandian (app.js 末尾挂的 dev hook)
// 用法：node tests/e2e/realcheck-10-runs/run-one.mjs <projectIndex 1-10>

process.env.NO_PROXY = '*';
process.env.no_proxy = '*';

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PROJECTS } from './projects.mjs';

const BASE = 'http://127.0.0.1:4173';

async function shot(page, dir, name) {
  await page.screenshot({ path: path.join(dir, name), fullPage: true });
}

export async function runOneProject(projectIdx, opts = {}) {
  const p = PROJECTS[projectIdx];
  if (!p) throw new Error(`No project at index ${projectIdx}`);
  const dir = `E:/CC/code/yuandian-screenwriting-system/tests/e2e/realcheck-shots/run-${String(projectIdx + 1).padStart(2, '0')}-${p.slug.replace(/^\d+-/, '')}`;
  await mkdir(dir, { recursive: true });

  const fixCount = { value: 0 };
  const log = (...a) => console.log(`[${p.slug}]`, ...a);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => log('[pageerror]', e.message));
  page.on('console', m => { if (m.type() === 'error') log('[console.error]', m.text().slice(0, 200)); });

  await page.goto(BASE + '/?nocache=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await shot(page, dir, 'A1-home.png');

  // ===== 1. 通过 mode picker 走"完整故事要重组"通道，直接进 structure
  log('mode picker → open-from-structure');
  await page.evaluate(() => document.querySelector('[data-action="open-create-mode-picker"]').click());
  await page.waitForTimeout(300);
  await shot(page, dir, 'A2-mode-picker.png');
  await page.evaluate(() => document.querySelector('[data-action="open-from-structure"]').click());
  // 等待空项目创建 + 路由到 structure
  await page.waitForFunction(() => {
    const w = window.__yuandian;
    return w?.appState?.project?.project?.id && w.appState.currentPage === 'workflow';
  }, { timeout: 12000 });
  await page.waitForTimeout(500);
  await shot(page, dir, 'A3-structure-empty.png');

  // ===== 2. 直接灌数据到 appState （最快）
  // 关键：写入 story_bible（真源），让 ensurePlotDrivenProject 派生 character_hub / scene_workbench
  log('inject all data via __yuandian.appState');
  const ok = await page.evaluate((projData) => {
    const w = window.__yuandian;
    const proj = w.appState.project;

    // ─ 项目标题 + 题材（写 genre_profile，让 syncLegacyStoryBible 反向同步 project.genre）
    proj.project.title = projData.title;
    proj.project.genre = [projData.genre];
    proj.project.logline = projData.logline;
    proj.genre_profile = proj.genre_profile || {};
    proj.genre_profile.primary_genre = projData.genre;
    proj.genre_profile.secondary_genres = [];
    proj.story_core = proj.story_core || {};
    proj.story_core.premise = projData.logline;

    // ─ 三幕节点 ID 取出
    const acts = proj.structure_profile.acts;
    const nodes = proj.structure_profile.nodes;
    const nodesByAct = acts.map(a => nodes.filter(n => n.act_id === a.id).sort((x, y) => x.order_index - y.order_index));

    const roleMap = { '主角': 'protagonist', '对手': 'antagonist', '盟友': 'ally', '复杂盟友': 'complicated_ally' };
    const charIds = projData.characters.map((_, idx) => `char_${projData.slug}_${idx}`);

    // ─ 写 story_bible.characters（真源）
    proj.story_bible = proj.story_bible || {};
    proj.story_bible.premise = projData.logline;
    proj.story_bible.characters = projData.characters.map((c, idx) => ({
      id: charIds[idx],
      name: c.name,
      story_role: roleMap[c.role] || 'supporting',
      archetype: c.role,
      external_want: c.desire,
      internal_need: c.wound,
      psychological_flaw: '',
      moral_flaw: '',
      public_mask: '',
      core_fear: '',
      wound: c.wound,
      arc_start: (c.arc?.split('→')[0] ?? '').trim(),
      arc_end: (c.arc?.split('→')[1] ?? '').trim(),
      voice_rules: [],
      secret: '',
    }));

    // ─ 关系（对称，去重）
    proj.story_bible.relationships = projData.relationships.map((r, idx) => ({
      id: `rel_${projData.slug}_${idx}`,
      source_character_id: charIds[r.a],
      target_character_id: charIds[r.b],
      relationship_type: r.type,
      tension: r.tension,
      power_balance: r.power,
      shared_history: r.history,
      hidden_information: r.hidden,
    }));

    // ─ 剧情卡：按 actIdx + nodeIdx 定位 node，注入 plot_board.cards
    proj.plot_board = proj.plot_board || { cards: [], lanes: [] };
    const cards = [];
    projData.plotCards.forEach((c, idx) => {
      const targetAct = acts[c.actIdx];
      if (!targetAct) return;
      const actNodes = nodesByAct[c.actIdx];
      const targetNode = actNodes[Math.min(c.nodeIdx, actNodes.length - 1)];
      if (!targetNode) return;
      const cardId = `plot_${projData.slug}_${idx}`;
      cards.push({
        id: cardId,
        title: c.title,
        summary: c.summary,
        change: c.change,
        act_id: targetAct.id,
        node_id: targetNode.id,
        lane_id: proj.plot_board.lanes?.[0]?.id || '',
        status: 'draft',
        order_index: idx,
        catalyst_type: '',
        macguffin: '',
        narrative_layer: 'main',
        beat_question: '',
        character_ids: [charIds[0]],
      });
      if (!targetNode.note) targetNode.note = c.summary;
      targetNode.card_ids = Array.from(new Set([...(targetNode.card_ids || []), cardId]));
    });
    proj.plot_board.cards = cards;

    // ─ 场景同时写 story_bible.scene_cards (server 持久化用) 和 scene_workbench.scenes (UI 渲染用)
    const sceneEntries = projData.scenes.map((s, idx) => {
      const targetAct = acts[s.act] || acts[0];
      return {
        bible: {
          id: `scene_${projData.slug}_${idx}`,
          order_index: idx + 1,
          act_id: targetAct.id,
          title: s.title,
          location: s.location,
          time_of_day: '',
          pov_character_id: charIds[s.pov] || '',
          goal: s.goal,
          obstacle: s.obstacle,
          turn: s.outcome,
          value_shift: '',
          input_state: '',
          output_state: '',
          dialogue_seed: '',
          emotion_stage: '',
          script_full: idx === 0 ? projData.firstSceneScript : '',
          screenplay_notes: '',
        },
        workbench: {
          id: `scene_${projData.slug}_${idx}`,
          order_index: idx + 1,
          title: s.title,
          act_id: targetAct.id,
          linked_plot_card_ids: [],
          pov_character_id: charIds[s.pov] || '',
          location: s.location,
          time_of_day: '',
          purpose: s.goal,
          obstacle: s.obstacle,
          beat_summary: s.outcome,
          entry_state: '',
          exit_state: '',
          status: 'outline',
          script_excerpt: '',
          script_full: idx === 0 ? projData.firstSceneScript : '',
          screenplay_notes: '',
          notes: '',
        }
      };
    });
    proj.story_bible.scene_cards = sceneEntries.map(s => s.bible);
    proj.scene_workbench = { scenes: sceneEntries.map(s => s.workbench) };

    // 不调 normalizeProject 以免 syncLegacyStoryBible 从空的 scene_workbench 倒写覆盖 bible。
    // 直接 markDirty，让 saveProjectToServer 把 story_bible 整体 PUT 上去。
    w.markDirty();
    return {
      ok: true,
      projectId: proj.project.id,
      acts: acts.length,
      sbChars: proj.story_bible.characters.length,
      sbScenes: proj.story_bible.scene_cards.length,
      cardsCount: proj.plot_board.cards.length,
    };
  }, p);
  log('injected', ok);

  // 触发持久化（saveProjectToServer 异步）
  const saveRes = await page.evaluate(async () => {
    await window.__yuandian.saveProjectToServer();
    return { dirty: window.__yuandian.appState.runtime.dirty, savedAt: window.__yuandian.appState.runtime.lastSavedAt };
  });
  log('saved', saveRes);

  // ===== 3. 逐页截图验证（不依赖 AI，直接看主工作台是否吃下了数据）
  await page.evaluate(() => document.querySelector('button[data-id="structure"]').click());
  await page.waitForTimeout(900);
  await shot(page, dir, 'B1-structure.png');

  await page.evaluate(() => document.querySelector('button[data-id="characters"]').click());
  await page.waitForTimeout(900);
  await shot(page, dir, 'B2-characters.png');

  await page.evaluate(() => document.querySelector('button[data-id="relationships"]').click());
  await page.waitForTimeout(900);
  await shot(page, dir, 'B3-relationships.png');

  await page.evaluate(() => document.querySelector('button[data-id="plots"]').click());
  await page.waitForTimeout(900);
  await shot(page, dir, 'B4-plots.png');

  await page.evaluate(() => document.querySelector('button[data-id="scenes"]').click());
  await page.waitForTimeout(900);
  await shot(page, dir, 'B5-scenes.png');

  await page.evaluate(() => document.querySelector('button[data-id="screenplay"]').click());
  await page.waitForTimeout(900);
  await shot(page, dir, 'B6-screenplay.png');

  // ===== 4. 数据快照（用于断言）
  const summary = await page.evaluate(() => {
    const p = window.__yuandian.appState.project;
    return {
      projectId: p.project.id,
      title: p.project.title,
      genre: p.project.genre,
      logline: p.project.logline,
      acts: p.structure_profile.acts.length,
      nodes: p.structure_profile.nodes.length,
      characters: p.character_hub.characters.length,
      relationships: p.character_hub.relationship_map.length,
      plotCards: p.plot_board.cards.length,
      scenes: p.scene_workbench.scenes.length,
      firstSceneScriptLen: (p.scene_workbench.scenes[0]?.script_full || '').length,
    };
  });
  log('summary', summary);

  // ===== 5. 写报告
  await writeFile(path.join(dir, 'summary.json'), JSON.stringify({ project: p.title, slug: p.slug, summary, fixCount: fixCount.value }, null, 2), 'utf8');

  await browser.close();
  return { project: p, summary, dir };
}

// CLI 入口
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const idx = Number(process.argv[2] ?? 0) - 1;
  runOneProject(idx).then((r) => {
    console.log(JSON.stringify(r.summary, null, 2));
  }).catch(e => { console.error(e.stack || e.message); process.exit(1); });
}
