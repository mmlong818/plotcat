// 第 1 轮：把破壁人 + 母亲的最后一通电话 两部长片 30 场剧本写回服务器。
// 流程：GET 项目 → 用生成器替换 story_bible.scene_cards + scene_workbench.scenes → PUT。

process.env.NO_PROXY = '*';
process.env.no_proxy = '*';

import { POBI_SCENES } from './generators/05-pobi.mjs';
import { MUQIN_SCENES } from './generators/06-muqin.mjs';

const BASE = 'http://127.0.0.1:4173';

const TARGETS = [
  { idx: 5, label: '破壁人', slug: '05-zhichang-shangzhan', projectId: 'project_mpo788n5_4ktshx', scenes: POBI_SCENES, format: 'long_feature' },
  { idx: 6, label: '母亲的最后一通电话', slug: '06-jiating-daiji', projectId: 'project_mpo78g1s_irubgm', scenes: MUQIN_SCENES, format: 'long_feature' },
];

async function fetchJson(method, path, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`${method} ${path} -> ${r.status}: ${text.slice(0, 300)}`);
  }
  return r.json();
}

function countZh(s) { return (s || '').replace(/\s/g, '').length; }

function buildScenesForProject(target, project) {
  // 取 act_id 列表（按 order）；plot_card_id 按 cardIdx 取 plot_board.cards
  const acts = project.structure_profile.acts;
  const cards = project.plot_board.cards;
  const charIds = project.story_bible.characters.map(c => c.id);

  const out = target.scenes.map((s, idx) => {
    const actId = acts[s.act]?.id || acts[0].id;
    const cardId = cards[s.cardIdx]?.id || '';
    const povId = charIds[s.pov] ?? charIds[0];
    const sceneId = `scene_${target.slug}_v2_${String(idx).padStart(2, '0')}`;
    return {
      bible: {
        id: sceneId,
        order_index: idx + 1,
        act_id: actId,
        title: s.title,
        pov_character_id: povId,
        location: s.location,
        time_of_day: s.time || '',
        goal: s.goal,
        obstacle: s.obstacle,
        tactic: '',
        turn: s.outcome,
        value_shift: '',
        new_information: [],
        input_state: '',
        output_state: '',
        production_tags: [],
        dialogue_seed: '',
        emotion_stage: '',
        script_full: s.script,
        screenplay_notes: '',
      },
      workbench: {
        id: sceneId,
        order_index: idx + 1,
        title: s.title,
        act_id: actId,
        linked_plot_card_ids: cardId ? [cardId] : [],
        pov_character_id: povId,
        location: s.location,
        time_of_day: s.time || '',
        purpose: s.goal,
        obstacle: s.obstacle,
        beat_summary: s.outcome,
        entry_state: '',
        exit_state: '',
        status: 'draft',
        script_excerpt: '',
        script_full: s.script,
        screenplay_notes: '',
        notes: '',
      },
    };
  });
  return out;
}

async function pushOne(target) {
  console.log(`\n=== [${target.idx}/10] ${target.label} ===`);
  const { project } = await fetchJson('GET', `/api/projects/${target.projectId}`);

  const built = buildScenesForProject(target, project);
  project.story_bible.scene_cards = built.map(b => b.bible);
  project.scene_workbench = project.scene_workbench || {};
  project.scene_workbench.scenes = built.map(b => b.workbench);

  // 把 project.format 同时更新成 long_feature（如 schema 允许的话）— 看 GET 已知 format 字段就是 project.format
  if (target.format && project.project) project.project.format = target.format;

  await fetchJson('PUT', `/api/projects/${target.projectId}`, { project });

  // 验证
  const { project: re } = await fetchJson('GET', `/api/projects/${target.projectId}`);
  const sceneCount = re.story_bible.scene_cards.length;
  let total = 0, min = Infinity, minTitle = '';
  re.story_bible.scene_cards.forEach(sc => {
    const n = countZh(sc.script_full);
    total += n;
    if (n < min) { min = n; minTitle = sc.title; }
  });
  console.log(`[${target.idx}/10] ${target.label} | 长片 | ${sceneCount} 场 | ${total} 字 | 单场最低 ${min} (${minTitle})`);
  return { ...target, sceneCount, total, min, minTitle, projectId: target.projectId };
}

async function main() {
  const results = [];
  for (const t of TARGETS) {
    results.push(await pushOne(t));
  }
  console.log('\n--- 总结 ---');
  for (const r of results) {
    console.log(`[${r.idx}/10] ${r.label} | 长片 | ${r.sceneCount} 场 | ${r.total} 字 | 单场最低 ${r.min}`);
  }
}

main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
