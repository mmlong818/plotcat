// 第 3 轮：凤栖梧 + 雾港谜局 两部电视试播
process.env.NO_PROXY = '*';
process.env.no_proxy = '*';

import { FENGXIWU_SCENES } from './generators/03-fengxiwu.mjs';
import { WUGANG_SCENES } from './generators/04-wugang.mjs';

const BASE = 'http://127.0.0.1:4173';

const TARGETS = [
  { idx: 2, label: '凤栖梧', slug: '02-gongting-hulian', projectId: 'project_mpo77llv_p3uijq', scenes: FENGXIWU_SCENES },
  { idx: 4, label: '雾港谜局', slug: '04-xuanyi-xingzhen', projectId: 'project_mpo7818v_ce9a51', scenes: WUGANG_SCENES },
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
  const acts = project.structure_profile.acts;
  const cards = project.plot_board.cards;
  const charIds = project.story_bible.characters.map(c => c.id);

  return target.scenes.map((s, idx) => {
    const actId = acts[s.act]?.id || acts[0].id;
    const cardId = cards[s.cardIdx]?.id || '';
    const povId = charIds[s.pov] ?? charIds[0];
    const sceneId = `scene_${target.slug}_v3_${String(idx).padStart(2, '0')}`;
    return {
      bible: {
        id: sceneId, order_index: idx + 1, act_id: actId, title: s.title,
        pov_character_id: povId, location: s.location, time_of_day: s.time || '',
        goal: s.goal, obstacle: s.obstacle, tactic: '', turn: s.outcome,
        value_shift: '', new_information: [], input_state: '', output_state: '',
        production_tags: [], dialogue_seed: '', emotion_stage: '',
        script_full: s.script, screenplay_notes: '',
      },
      workbench: {
        id: sceneId, order_index: idx + 1, title: s.title, act_id: actId,
        linked_plot_card_ids: cardId ? [cardId] : [],
        pov_character_id: povId, location: s.location, time_of_day: s.time || '',
        purpose: s.goal, obstacle: s.obstacle, beat_summary: s.outcome,
        entry_state: '', exit_state: '', status: 'draft',
        script_excerpt: '', script_full: s.script, screenplay_notes: '', notes: '',
      },
    };
  });
}

async function pushOne(target) {
  console.log(`\n=== [${target.idx}/10] ${target.label} ===`);
  const { project } = await fetchJson('GET', `/api/projects/${target.projectId}`);
  const built = buildScenesForProject(target, project);
  project.story_bible.scene_cards = built.map(b => b.bible);
  project.scene_workbench = project.scene_workbench || {};
  project.scene_workbench.scenes = built.map(b => b.workbench);

  await fetchJson('PUT', `/api/projects/${target.projectId}`, { project });

  const { project: re } = await fetchJson('GET', `/api/projects/${target.projectId}`);
  const sceneCount = re.story_bible.scene_cards.length;
  let total = 0, min = Infinity, minTitle = '';
  re.story_bible.scene_cards.forEach(sc => {
    const n = countZh(sc.script_full);
    total += n;
    if (n < min) { min = n; minTitle = sc.title; }
  });
  console.log(`[${target.idx}/10] ${target.label} | 电视试播 | ${sceneCount} 场 | ${total} 字 | 单场最低 ${min} (${minTitle}) | DB sum verified`);
  return { ...target, sceneCount, total, min };
}

async function main() {
  const results = [];
  for (const t of TARGETS) results.push(await pushOne(t));
  console.log('\n--- 总结 ---');
  for (const r of results) console.log(`[${r.idx}/10] ${r.label} | 电视试播 | ${r.sceneCount} 场 | ${r.total} 字 | DB sum verified`);
}

main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
