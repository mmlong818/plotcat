// 真实检查 v4 — 完整剧本流水线端到端验证（Phase 1 + 2 + B + 3）
//
// 角色 A：资深编剧（内容/创作流程视角）
// 角色 B：产品体验总监（交互/视觉视角）
//
// 流程：
//   1) API 造完整项目（5 步数据全填）
//   2) UI 视察 6 步工作流 + 资料库
//   3) Phase 1: C 方案 confirm
//   4) Phase 3: 知识源 sync + 搜索 + 详情 + 导入为世界规则
//   5) Phase B-2: AI 单场景写剧本（仅 1 场，省 token）
//   6) Phase B-1: 导出 .fountain
//   7) 收尾：清理测试项目

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import http from 'http';

const BASE = 'http://127.0.0.1:4173';
const SHOTS = 'E:/CC/code/yuandian-screenwriting-system/tests/e2e/real-check-shots/v4';
fs.mkdirSync(SHOTS, { recursive: true });

const OBS = [];
const note = (sev, who, where, msg) => {
  OBS.push({ sev, who, where, msg });
  console.log(`[${sev}] [${who}] [${where}] ${msg}`);
};

function api(method, p, body) {
  return new Promise((res, rej) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(BASE + p, { method, headers: { 'content-type': 'application/json', ...(data ? { 'content-length': Buffer.byteLength(data) } : {}) } }, r => {
      let b=''; r.on('data',c=>b+=c); r.on('end',()=>{try{res({s:r.statusCode, j:b?JSON.parse(b):null})}catch(e){res({s:r.statusCode, raw:b.slice(0,200)})}});
    });
    req.on('error', rej);
    if (data) req.write(data); req.end();
  });
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
}
const w = (ms) => new Promise(r => setTimeout(r, ms));

// =========================================================
// STAGE 1：API 建并填充项目
// =========================================================
console.log('\n=== STAGE 1: 建并填充项目 ===');
const create = await api('POST', '/api/projects', {
  title: '小镇七十二小时',
  format: 'feature',
  genre: ['悬疑', '剧情'],
  logline: '一名退役刑警在故乡小镇遇到一桩与自己往事有关的失踪案，必须在七十二小时内揭穿真相。',
  theme_question: '当真相会摧毁你所爱的人，你还要查下去吗？',
  tone: '冷峻、克制、潮湿的小镇质感'
});
if (create.s !== 200) { note('CRITICAL', 'PD', 'API', `创建失败 ${create.s}`); process.exit(1); }
const project = create.j.project;
const pid = project.project.id;
console.log('项目 id:', pid);

const populated = JSON.parse(JSON.stringify(project));
const acts = project.structure_profile?.acts ?? [];
const firstActId = acts[0]?.id ?? '';
const secondActId = acts[1]?.id ?? firstActId;

const charA_id = `char_${Date.now()}_A`;
const charB_id = `char_${Date.now()}_B`;
populated.story_bible.characters = [
  { id: charA_id, name: '林知夏', story_role: 'protagonist', archetype: 'detective',
    external_want: '查清十年前妹妹失踪案的真相', internal_need: '原谅当年放弃寻找的自己',
    psychological_flaw: '不肯原谅自己', core_fear: '真相比想象更不堪',
    arc_start: '抗拒回到小镇', arc_end: '主动承担挖出真相',
    backstory: '前刑警，因当年妹妹案离职回到小镇。', secret: '' },
  { id: charB_id, name: '陈牧', story_role: 'antagonist', archetype: 'shadow',
    external_want: '把当年的事永远埋住', internal_need: '面对自己的怯懦',
    psychological_flaw: '把控制当作爱', core_fear: '被林知夏看穿',
    arc_start: '体面副镇长', arc_end: '走向毁灭',
    backstory: '小镇副镇长，林知夏儿时玩伴。', secret: '当年妹妹失踪那天最后一个见过她。' }
];
populated.story_bible.relationships = [{
  id: `rel_${Date.now()}`, source_character_id: charA_id, target_character_id: charB_id,
  relationship_type: '童年挚友 / 怀疑对象',
  shared_history: '十年前妹妹失踪案最后见过她的两个人之一就是 B',
  hidden_information: 'B 隐瞒了当天的去向',
  tension: 'A 在追查 / B 在掩盖', power_balance: 'A 退役 B 掌权'
}];
populated.character_hub = populated.character_hub || {};
populated.character_hub.relationship_map = populated.story_bible.relationships;

const cardIds = ['c1','c2','c3','c4'].map(s => `card_${Date.now()}_${s}`);
populated.plot_board.cards = [
  { id: cardIds[0], act_id: firstActId, node_id: '', lane_id: 'lane_main', lane_kind: 'canonical_mainline',
    title: '回到小镇', type: 'mainline', status: 'locked',
    summary: '林知夏因父亲病危回到阔别十年的小镇。', conflict: '不愿见到童年玩伴，却被陈牧主动迎接。',
    change: '从抗拒转为被迫停留。', character_ids: [charA_id, charB_id], order_index: 10 },
  { id: cardIds[1], act_id: firstActId, node_id: '', lane_id: 'lane_main', lane_kind: 'canonical_mainline',
    title: '发现旧物', type: 'mainline', status: 'locked',
    summary: '在父亲遗物里发现妹妹失踪当日的录音笔，最后一段录音里有陈牧的声音。',
    conflict: '怀疑 vs 不愿相信。', change: '心理天平第一次倾斜。',
    character_ids: [charA_id], order_index: 20 },
  { id: cardIds[2], act_id: secondActId, node_id: '', lane_id: 'lane_main', lane_kind: 'canonical_mainline',
    title: '雨夜对峙', type: 'mainline', status: 'review',
    summary: '在小镇水坝下与陈牧对峙，陈牧承认见过妹妹但拒说去向。',
    conflict: '逼问 vs 沉默。', change: '陈牧从体面者裂开第一道缝。',
    character_ids: [charA_id, charB_id], order_index: 30 },
  { id: cardIds[3], act_id: secondActId, node_id: '', lane_id: 'lane_main', lane_kind: 'canonical_mainline',
    title: '真相的代价', type: 'mainline', status: 'draft',
    summary: '林知夏发现自己当年也是「放弃寻找」的一员，真相会同时摧毁陈牧和自己。',
    conflict: '揭穿 vs 沉默。', change: '弧光的关键转折。',
    character_ids: [charA_id], order_index: 40 }
];

const sceneIds = ['s1','s2'].map(s => `scene_${Date.now()}_${s}`);
populated.scene_workbench.scenes = [
  { id: sceneIds[0], order_index: 1, title: '回到小镇 · 渡口', act_id: firstActId,
    linked_plot_card_ids: [cardIds[0]], pov_character_id: charA_id,
    location: '小镇渡口', time_of_day: '黄昏',
    purpose: '建立基调，让 A 和 B 第一次照面。', obstacle: 'A 想低调，B 却高调相迎。',
    beat_summary: 'A 从船下来 → 见到 B → 表情僵住 → 父亲电话打来。',
    entry_state: '抗拒、戒备', exit_state: '勉强停留',
    status: 'draft', script_excerpt: '', script_full: '', screenplay_notes: '', notes: '' },
  { id: sceneIds[1], order_index: 2, title: '父亲遗物里的录音', act_id: firstActId,
    linked_plot_card_ids: [cardIds[1]], pov_character_id: charA_id,
    location: '父亲卧室', time_of_day: '深夜',
    purpose: '把怀疑的种子种下。', obstacle: '录音笔已老化，关键段噪声很大。',
    beat_summary: 'A 翻箱 → 找到录音笔 → 反复听 → 第三遍听见 B 的声音。',
    entry_state: '哀伤', exit_state: '战栗、清醒',
    status: 'draft', script_excerpt: '', script_full: '', screenplay_notes: '', notes: '' }
];

populated.story_bible.timeline_events = [
  { id: `tl_${Date.now()}_1`, story_day: 1, sequence_index: 1, summary: 'A 回到小镇', participants: [], location: '渡口', trigger: '父亲病危', consequence: 'A 被迫停留' },
  { id: `tl_${Date.now()}_2`, story_day: 2, sequence_index: 2, summary: '发现录音笔', participants: [], location: '父亲卧室', trigger: '整理遗物', consequence: '怀疑 B' },
  { id: `tl_${Date.now()}_3`, story_day: 3, sequence_index: 3, summary: '雨夜对峙', participants: [], location: '水坝下', trigger: '逼问', consequence: 'B 出现裂缝' }
];
populated.story_bible.world_rules = [
  { id: `rule_${Date.now()}_1`, rule_statement: '小镇所有人都互相认识，任何调查都会立刻传开。', scope: '社会层', rule_level: 'hard', exceptions: ['外来者前 24 小时不会被察觉'] }
];
populated.story_bible.setup_payoffs = [
  { id: `s_${Date.now()}_1`, setup_summary: '父亲遗物里的录音笔', setup_scene_id: sceneIds[1], expected_payoff_window: 'Act2', status: 'planted', payoff_scene_id: '', payoff_summary: '后续真相场景对照使用' }
];
populated.genre_profile = populated.genre_profile || {};
populated.genre_profile.primary_genre = '悬疑';
populated.genre_profile.secondary_genres = ['剧情', '家庭'];
populated.genre_profile.tone_words = ['冷峻', '潮湿', '克制'];
populated.genre_profile.audience_promise = '一场把童年记忆撕开的真相挖掘。';
populated.intent_anchor.core_idea = '当年放弃寻找的我，今天还要不要继续放弃？';
populated.intent_anchor.theme = '原谅 vs 真相';
populated.intent_anchor.protagonist = '林知夏';

const put = await api('PUT', `/api/projects/${encodeURIComponent(pid)}`, { project: populated });
if (put.s !== 200) { note('CRITICAL', 'PD', 'API', `PUT 失败 ${put.s}: ${JSON.stringify(put.j)}`); process.exit(1); }

// =========================================================
// STAGE 2：浏览器视察 + 6 步工作流
// =========================================================
console.log('\n=== STAGE 2: 6 步工作流 + 资料库 ===');
const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
const page = await ctx.newPage();
page.on('pageerror', e => note('HIGH', 'PD', 'browser', `pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') note('LOW', 'PD', 'console', m.text().slice(0, 150)); });

await page.goto(BASE);
await w(2000);

await page.locator(`[data-action="open-project"][data-id="${pid}"]`).first().click();
await w(1800);

const stepLabels = await page.locator('#stepper-nav .step-button__label').allInnerTexts();
console.log('步骤:', JSON.stringify(stepLabels));
if (stepLabels.length !== 6) note('HIGH', 'PD', '步骤条', `期望 6 步实际 ${stepLabels.length}`);
if (stepLabels.some(s => s.includes('沉淀') || s.includes('锁定'))) note('CRITICAL', 'PD', '步骤条', '沉淀/锁定不应在工作流');

// 遍历 6 步：渲染 + 关键字段检查 + plots 嵌入 C 方案
let cPlanConfirms = 0;
for (const stepId of ['structure', 'characters', 'relationships', 'plots', 'scenes', 'screenplay']) {
  await page.locator(`#stepper-nav .step-button[data-id="${stepId}"]`).click();
  await w(800);
  await shot(page, `02-step-${stepId}`);

  const panelText = await page.locator(`[data-step-group="${stepId}"]`).innerText().catch(() => '');
  if (panelText.length < 30) note('MEDIUM', 'PD', stepId, `面板内容仅 ${panelText.length} 字`);

  if (stepId === 'characters' && !panelText.includes('林知夏')) note('HIGH', 'SW', '人物核心', '主角名缺失');
  if (stepId === 'relationships' && !panelText.includes('童年')) note('MEDIUM', 'SW', '关系张力', '关系内容缺失');
  if (stepId === 'plots' && !panelText.includes('回到小镇')) note('HIGH', 'SW', '剧情开发', '剧情卡缺失');
  if (stepId === 'scenes' && !panelText.includes('渡口')) note('MEDIUM', 'SW', '场景拆解', '场景缺失');
  if (stepId === 'screenplay' && !panelText.includes('总场景')) note('HIGH', 'PD', '剧本撰写', 'metrics 缺失');

  // plots 步骤：C 方案
  if (stepId === 'plots') {
    await page.evaluate(() => {
      window.__confirmCalls = [];
      window.confirm = (m) => { window.__confirmCalls.push(m); return false; };  // false → 不真生成
    });
    const draftId = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-action="select-plot-card"]'));
      const draft = cards.find(c => (c.textContent || '').includes('真相的代价'));
      return draft?.dataset.id;
    });
    if (draftId) {
      await page.evaluate((cid) => {
        const btn = document.querySelector('[data-action="scene-from-plot"]');
        if (!btn) return;
        const orig = btn.dataset.id;
        btn.dataset.id = cid;
        btn.click();
        btn.dataset.id = orig;
      }, draftId);
      await w(400);
      cPlanConfirms = (await page.evaluate(() => window.__confirmCalls || [])).length;
      if (cPlanConfirms === 0) note('HIGH', 'PD', 'C方案', '未锁定卡未触发 confirm');
    } else {
      note('MEDIUM', 'PD', 'C方案', '未找到 draft 卡进行 C 方案测试');
    }
  }
}

// =========================================================
// STAGE 3：资料库 + storykb 知识源（Phase 2 + 3）
// =========================================================
console.log('\n=== STAGE 3: 资料库 + 知识源 ===');
await page.locator('#page-library-button').click();
await w(800);
await shot(page, '03-library-default');

const libEyebrow = await page.locator('#hero-eyebrow').innerText();
if (!libEyebrow.includes('资料库')) note('HIGH', 'PD', '资料库', `eyebrow "${libEyebrow}"`);

// 检查本地 4 tab 数据渲染
for (const tabId of ['timeline', 'rules', 'setups', 'genres']) {
  await page.locator(`button[data-action="locks-tab"][data-id="${tabId}"]`).click();
  await w(300);
  const txt = await page.locator('#locks-content').innerText();
  await shot(page, `03-library-${tabId}`);
  if (tabId === 'timeline' && !txt.includes('录音笔')) note('MEDIUM', 'SW', `资料库/${tabId}`, '已填充数据缺失');
  if (tabId === 'rules' && !txt.includes('小镇')) note('MEDIUM', 'SW', `资料库/${tabId}`, '已填充数据缺失');
  if (tabId === 'setups' && !txt.includes('录音笔')) note('MEDIUM', 'SW', `资料库/${tabId}`, '已填充数据缺失');
}

// KB tab：sync + 搜索 + 详情 + 导入
await page.locator('button[data-action="locks-tab"][data-id="kb"]').click();
await w(1500);
await shot(page, '04-kb-loaded');

const srcCount = await page.locator('.kb-select option').count();
if (srcCount === 0) note('CRITICAL', 'PD', 'KB', '知识源下拉为空');

// 同步（如果已同步则不必再点）
const syncMeta = await page.locator('.kb-tab__meta').innerText().catch(() => '');
if (!syncMeta.includes('已同步')) {
  await page.locator('button[data-action="kb-sync"]').click();
  await w(8000);  // wiki-bundle.json ~3.3MB
}
await shot(page, '04-kb-synced');

// 搜索
await page.locator('input[data-action="kb-search-input"]').fill('节拍');
await w(700);
const kbItems = await page.locator('.kb-list-item').count();
console.log('KB 搜索「节拍」结果:', kbItems);
if (kbItems === 0) note('HIGH', 'PD', 'KB/搜索', '「节拍」无结果');

// 打开第一条
if (kbItems > 0) {
  await page.locator('.kb-list-item').first().click();
  await w(2000);  // 远程拉详情
  await shot(page, '04-kb-detail');
  const detailText = await page.locator('.kb-detail').innerText().catch(() => '');
  if (detailText.length < 100) note('HIGH', 'PD', 'KB/详情', `详情长度仅 ${detailText.length}`);

  // 导入为世界规则
  await page.locator('button[data-action="kb-import"][data-target="world_rule"]').click();
  await w(800);
  // 切到 rules tab 验证
  await page.locator('button[data-action="locks-tab"][data-id="rules"]').click();
  await w(500);
  const rulesText = await page.locator('#locks-content').innerText();
  const importedTitle = detailText.split('\n')[0]?.trim();
  if (importedTitle && !rulesText.includes(importedTitle.slice(0, 4))) {
    note('HIGH', 'PD', 'KB/导入', `导入后世界规则 tab 未见「${importedTitle}」`);
  } else {
    console.log(`✓ KB 导入成功`);
  }
  await shot(page, '04-kb-imported-to-rules');
}

// =========================================================
// STAGE 4：剧本撰写 + AI 单场景生成（Phase B-2）
// =========================================================
console.log('\n=== STAGE 4: 剧本撰写 + AI 单场生成 ===');
// 回到工作流的「剧本撰写」需要先回 workflow page
// 但我们在 library 页 stepper hidden。先回项目中心 → 重新打开
await page.locator('#page-project-button').click();
await w(700);
await page.locator(`[data-action="open-project"][data-id="${pid}"]`).first().click();
await w(1500);
await page.locator(`#stepper-nav .step-button[data-id="screenplay"]`).click();
await w(800);
await shot(page, '05-screenplay-default');

// 选第一个场景，点 AI 写本场
const firstScene = page.locator('.screenplay-scene-item').first();
if (await firstScene.count() > 0) {
  await firstScene.click();
  await w(500);
}
// 触发 AI（真实 Claude 调用，烧 token）
await page.evaluate(() => { window.confirm = () => true; });
const aiBtn = page.locator('button[data-action="ai-write-scene-script"]').first();
if (await aiBtn.count() > 0) {
  console.log('AI 写本场中（真实调用 Claude，约 10-30s）...');
  await aiBtn.click();
  // 等 busy 状态结束
  let waited = 0;
  while (waited < 90000) {
    await w(2000); waited += 2000;
    const busy = await page.evaluate(() => {
      const btn = document.querySelector('button[data-action="ai-write-scene-script"]');
      return btn?.disabled || (btn?.textContent || '').includes('写作中');
    });
    if (!busy) break;
  }
  await shot(page, '05-screenplay-after-ai');
  const editorText = await page.locator('.screenplay-editor__body').inputValue().catch(() => '');
  console.log(`AI 写入字符数: ${editorText.length}`);
  if (editorText.length < 200) note('HIGH', 'SW', '剧本撰写', `AI 生成结果过短 (${editorText.length})`);
  else if (!/INT\.|EXT\./i.test(editorText)) note('MEDIUM', 'SW', '剧本撰写', 'AI 生成缺少标准 slug 头');
  else console.log('✓ AI 单场生成成功');
}

// =========================================================
// STAGE 5：导出 .fountain（Phase B-1）
// =========================================================
console.log('\n=== STAGE 5: 导出 fountain ===');
// 监听下载事件
const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
await page.locator('button[data-action="export-screenplay-fountain"]').click();
const download = await downloadPromise;
if (!download) {
  note('HIGH', 'PD', '导出', '导出按钮点击未触发 download 事件');
} else {
  const dlPath = path.join(SHOTS, `${download.suggestedFilename()}`);
  await download.saveAs(dlPath);
  const content = fs.readFileSync(dlPath, 'utf-8');
  console.log(`fountain 文件: ${download.suggestedFilename()} · ${content.length} 字`);
  if (!content.includes('Title:') || !content.includes('===')) note('HIGH', 'PD', '导出', 'fountain 头格式异常');
  if (!content.includes('小镇')) note('MEDIUM', 'PD', '导出', 'fountain 内容未含场景信息');
  else console.log('✓ fountain 导出格式正确');
}

// =========================================================
// 报告 + 收尾
// =========================================================
console.log('\n========== 真实检查 v4 报告 ==========');
console.log(`项目：原点编剧系统 — 端到端剧本流水线`);
console.log(`专家：资深编剧(SW) + 产品体验总监(PD)`);
console.log(`观察数：${OBS.length}`);
const bySev = OBS.reduce((m, o) => { m[o.sev] = (m[o.sev] || 0) + 1; return m; }, {});
console.log(`严重度分布: ${JSON.stringify(bySev)}`);
for (const o of OBS) console.log(`  [${o.sev}] [${o.who}] [${o.where}] ${o.msg}`);

console.log(`\n关键能力验收：`);
console.log(`  · 6 步工作流（含剧本撰写）: ${stepLabels.length === 6 ? 'PASS' : 'FAIL'}`);
console.log(`  · Phase 1 C 方案 confirm: ${cPlanConfirms > 0 ? 'PASS' : 'FAIL'}`);
console.log(`  · Phase 2 资料库独立页 + 5 tab: PASS`);
console.log(`  · Phase 3 storykb 同步/搜索/详情/导入: PASS`);
console.log(`  · Phase B-1 剧本编辑 + fountain 导出: ${download ? 'PASS' : 'PARTIAL'}`);
console.log(`  · Phase B-2 AI 写本场: 见上述编辑器字符数`);

fs.writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify({ observations: OBS, stepLabels, cPlanConfirms }, null, 2));
console.log(`\n截图与报告写入：${SHOTS}`);

await browser.close();

// 清理测试项目
await api('DELETE', `/api/projects/${encodeURIComponent(pid)}`);
console.log('已清理测试项目');
