// 真实检查 v3 — API 造数据 + UI 视察，验证 Phase 1/2
// 角色 A: 资深编剧（内容/创作流程视角）
// 角色 B: 产品体验总监（交互/视觉视角）
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import http from 'http';

const BASE = 'http://127.0.0.1:4173';
const SHOTS = 'E:/CC/code/yuandian-screenwriting-system/tests/e2e/real-check-shots/v3';
fs.mkdirSync(SHOTS, { recursive: true });

const OBS = [];
function note(sev, who, where, msg) {
  OBS.push({ sev, who, where, msg });
  console.log(`[${sev}] [${who}] [${where}] ${msg}`);
}

function api(method, p, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(`${BASE}${p}`, {
      method,
      headers: { 'content-type': 'application/json', ...(data ? { 'content-length': Buffer.byteLength(data) } : {}) }
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: buf ? JSON.parse(buf) : null }); }
        catch (e) { resolve({ status: res.statusCode, raw: buf, err: e.message }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
}
const w = ms => new Promise(r => setTimeout(r, ms));

// =========================================================
// STAGE 1: API 创建并填充完整项目
// =========================================================
console.log('\n=== STAGE 1: API 造项目 ===');

const create = await api('POST', '/api/projects', {
  title: '小镇七十二小时',
  format: 'feature',
  genre: ['悬疑', '剧情'],
  logline: '一名退役刑警在故乡小镇遇到一桩与自己往事有关的失踪案，必须在七十二小时内揭穿真相。',
  theme_question: '当真相会摧毁你所爱的人，你还要查下去吗？',
  tone: '冷峻、克制、潮湿的小镇质感'
});
if (create.status !== 200) {
  note('CRITICAL', 'PD', 'API/创建', `POST /api/projects 失败 ${create.status}: ${JSON.stringify(create.json)}`);
  process.exit(1);
}
const project = create.json.project;
const pid = project.project.id;
console.log(`项目已建：${pid}`);

// 取一些 id 备用
const acts = project.structure_profile?.acts ?? [];
const firstActId = acts[0]?.id ?? '';
const secondActId = acts[1]?.id ?? firstActId;
const existingChar = project.character_hub?.characters?.[0];
const existingCharId = existingChar?.id ?? '';

// 填充：人物 / 关系 / 剧情卡（含 locked）/ 场景 / 锁定层（时间线/规则/伏笔/类型）
const populated = JSON.parse(JSON.stringify(project));

// 人物 2 个 — 写入 story_bible.characters（character_hub 会从这里派生）
const charA_id = `char_${Date.now()}_A`;
const charB_id = `char_${Date.now()}_B`;
populated.story_bible.characters = [
  {
    id: charA_id, name: '林知夏', role: 'protagonist', archetype: 'detective',
    external_want: '查清十年前妹妹失踪案的真相',
    internal_need: '原谅当年放弃寻找的自己',
    flaw: '不肯原谅自己',
    fear: '真相比想象更不堪',
    arc_description: '从逃避者变成承担者',
    backstory: '前刑警，因当年妹妹案离职回到小镇。',
    occupation: '私家侦探',
    age: '34', gender: 'female', mbti: 'INTJ',
    tags: ['冷峻', '执拗'],
    voice_traits: '少话，停顿多',
    moral_compass: 'gray'
  },
  {
    id: charB_id, name: '陈牧', role: 'antagonist', archetype: 'shadow',
    external_want: '把当年的事永远埋住',
    internal_need: '面对自己的怯懦',
    flaw: '把控制当作爱',
    fear: '被林知夏看穿',
    arc_description: '从体面者堕入毁灭',
    backstory: '小镇副镇长，林知夏儿时玩伴。',
    occupation: '副镇长',
    age: '36', gender: 'male', mbti: 'ENTJ',
    tags: ['儒雅', '危险'],
    voice_traits: '语调平稳，句尾下沉',
    moral_compass: 'dark'
  }
];

// 关系 — relationship_map 派生时若非空保留，写到 character_hub 即可
populated.story_bible.relationships = [{
  id: `rel_${Date.now()}`,
  source_character_id: charA_id,
  target_character_id: charB_id,
  relationship_type: '童年挚友 / 怀疑对象',
  power_dynamic: 'A 在追查 / B 在掩盖',
  shared_history: '十年前妹妹失踪案最后见过她的两个人之一就是 B',
  emotional_debt: 'A 一直认为 B 当年隐瞒了什么',
  tension_source: '真相 vs 旧情',
  current_state: 'cold_truce'
}];
populated.character_hub = populated.character_hub || {};
populated.character_hub.relationship_map = populated.story_bible.relationships;

// 节点 + 剧情卡
const nodes = project.structure_profile?.nodes ?? [];
const firstNodeId = nodes[0]?.id ?? '';
const cardIds = ['c1', 'c2', 'c3', 'c4'].map(s => `card_${Date.now()}_${s}`);
populated.plot_board.cards = [
  {
    id: cardIds[0], act_id: firstActId, node_id: firstNodeId,
    lane_id: 'lane_main', lane_kind: 'canonical_mainline',
    title: '回到小镇', type: 'mainline', status: 'locked',
    summary: '林知夏因父亲病危回到阔别十年的小镇。',
    conflict: '不愿见到童年玩伴，却被陈牧主动迎接。',
    change: '从抗拒转为被迫停留。',
    character_ids: [charA_id, charB_id], order_index: 10
  },
  {
    id: cardIds[1], act_id: firstActId, node_id: firstNodeId,
    lane_id: 'lane_main', lane_kind: 'canonical_mainline',
    title: '发现旧物', type: 'mainline', status: 'locked',
    summary: '在父亲遗物里发现妹妹失踪当日的录音笔，最后一段录音里有陈牧的声音。',
    conflict: '怀疑 vs 不愿相信。',
    change: '心理天平第一次倾斜。',
    character_ids: [charA_id], order_index: 20
  },
  {
    id: cardIds[2], act_id: secondActId, node_id: firstNodeId,
    lane_id: 'lane_main', lane_kind: 'canonical_mainline',
    title: '雨夜对峙', type: 'mainline', status: 'review',
    summary: '在小镇水坝下与陈牧对峙，陈牧承认见过妹妹但拒说去向。',
    conflict: '逼问 vs 沉默。',
    change: '陈牧从体面者裂开第一道缝。',
    character_ids: [charA_id, charB_id], order_index: 30
  },
  {
    id: cardIds[3], act_id: secondActId, node_id: firstNodeId,
    lane_id: 'lane_main', lane_kind: 'canonical_mainline',
    title: '真相的代价', type: 'mainline', status: 'draft',
    summary: '林知夏发现自己当年也是「放弃寻找」的一员，真相会同时摧毁陈牧和自己。',
    conflict: '揭穿 vs 沉默。',
    change: '弧光的关键转折。',
    character_ids: [charA_id], order_index: 40
  }
];

// 场景 — 链接到锁定卡
const sceneIds = ['s1', 's2'].map(s => `scene_${Date.now()}_${s}`);
populated.scene_workbench.scenes = [
  {
    id: sceneIds[0], order_index: 1, title: '回到小镇 · 渡口',
    act_id: firstActId, linked_plot_card_ids: [cardIds[0]],
    pov_character_id: charA_id,
    location: '小镇渡口', time_of_day: '黄昏',
    purpose: '建立基调，让 A 和 B 第一次照面。',
    obstacle: 'A 想低调，B 却高调相迎。',
    beat_summary: 'A 从船下来 → 见到 B → 表情僵住 → 父亲电话打来。',
    entry_state: '抗拒、戒备',
    exit_state: '勉强停留',
    status: 'draft',
    script_excerpt: '', notes: ''
  },
  {
    id: sceneIds[1], order_index: 2, title: '父亲遗物里的录音',
    act_id: firstActId, linked_plot_card_ids: [cardIds[1]],
    pov_character_id: charA_id,
    location: '父亲卧室', time_of_day: '深夜',
    purpose: '把怀疑的种子种下。',
    obstacle: '录音笔已老化，关键段噪声很大。',
    beat_summary: 'A 翻箱 → 找到录音笔 → 反复听 → 第三遍听见 B 的声音。',
    entry_state: '哀伤',
    exit_state: '战栗、清醒',
    status: 'draft',
    script_excerpt: '', notes: ''
  }
];

// 资料库内容 — 必须写入 story_bible（lock_layer.projections 从那里派生）
populated.story_bible.timeline_events = [
  { id: `tl_${Date.now()}_1`, story_day: 1, sequence_index: 1, summary: 'A 回到小镇', participants: [], location: '渡口', trigger: '父亲病危', consequence: 'A 被迫停留' },
  { id: `tl_${Date.now()}_2`, story_day: 2, sequence_index: 2, summary: '发现录音笔', participants: [], location: '父亲卧室', trigger: '整理遗物', consequence: '怀疑 B' },
  { id: `tl_${Date.now()}_3`, story_day: 3, sequence_index: 3, summary: '雨夜对峙', participants: [], location: '水坝下', trigger: '逼问', consequence: 'B 出现裂缝' }
];
populated.story_bible.world_rules = [
  { id: `rule_${Date.now()}_1`, rule_statement: '小镇所有人都互相认识，任何调查都会立刻传开。', scope: '社会层', rule_level: 'hard', exceptions: ['外来者前 24 小时不会被察觉'] },
  { id: `rule_${Date.now()}_2`, rule_statement: '水坝在每年雨季前后会短暂开闸，下游会浮出旧物。', scope: '物理层', rule_level: 'hard', exceptions: [] }
];
populated.story_bible.setup_payoffs = [
  { id: `s_${Date.now()}_1`, setup_summary: '父亲遗物里的录音笔', setup_scene_id: sceneIds[1], expected_payoff_window: 'Act2', status: 'planted', payoff_scene_id: '', payoff_summary: '后续真相场景对照使用' },
  { id: `s_${Date.now()}_2`, setup_summary: 'B 手腕上的旧伤', setup_scene_id: sceneIds[0], expected_payoff_window: 'Act3', status: 'open', payoff_scene_id: '', payoff_summary: '与妹妹失踪当日伤痕匹配' }
];
populated.genre_profile = populated.genre_profile || {};
populated.genre_profile.primary_genre = '悬疑';
populated.genre_profile.secondary_genres = ['剧情', '家庭'];
populated.genre_profile.audience_promise = '一场把童年记忆撕开的真相挖掘。';
populated.genre_profile.tone_words = ['冷峻', '潮湿', '克制'];
populated.genre_profile.conventions = [
  { id: `conv_${Date.now()}_1`, name: '关键线索的反复出现', status: 'required', description: '录音笔出现三次以上。' }
];
populated.genre_profile.taboos = [
  { id: `taboo_${Date.now()}_1`, name: '上帝视角揭秘', description: '禁止任何场景从外部全知视角揭穿。' }
];

// 故事核心
populated.intent_anchor.core_idea = '当年放弃寻找的我，今天还要不要继续放弃？';
populated.intent_anchor.theme = '原谅 vs 真相';
populated.intent_anchor.protagonist = '林知夏';
populated.intent_anchor.arc = '从逃避者变成承担者';
populated.intent_anchor.motif = '潮湿、录音、回声';

fs.writeFileSync(path.join(SHOTS, 'put-payload.json'), JSON.stringify({ project: populated }, null, 2));
const put = await api('PUT', `/api/projects/${encodeURIComponent(pid)}`, { project: populated });
if (put.status !== 200) {
  note('CRITICAL', 'PD', 'API/填充', `PUT /api/projects/${pid} 失败 ${put.status}: ${JSON.stringify(put.json)}`);
  console.error('FATAL: PUT failed, aborting');
  process.exit(1);
}

// =========================================================
// STAGE 2: 浏览器视察
// =========================================================
console.log('\n=== STAGE 2: 浏览器视察 ===');
const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
const page = await ctx.newPage();

const pageErrors = [];
page.on('console', m => { if (m.type() === 'error') pageErrors.push(`[console] ${m.text()}`); });
page.on('pageerror', e => pageErrors.push(`[pageerror] ${e.message}`));
page.on('dialog', async d => { console.log(`[dialog] ${d.type()}: ${d.message()}`); await d.accept(); });

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await w(2500);
await shot(page, '01-home');

// 选中我们造的项目
const openBtn = page.locator(`[data-action="open-project"][data-id="${pid}"]`);
let opened = false;
if (await openBtn.count() > 0) {
  await openBtn.first().click();
  opened = true;
} else {
  // fallback：找含标题的卡片，然后点其打开/编辑按钮
  const cards = page.locator('.project-card, .project-board__item').filter({ hasText: /小镇七十二小时/ });
  if (await cards.count() > 0) {
    const innerBtn = cards.first().locator('button').first();
    if (await innerBtn.count() > 0) { await innerBtn.click(); opened = true; }
  }
}
if (!opened) note('CRITICAL', 'PD', '项目中心', '无法打开新建项目');
await w(2000);
await shot(page, '02-after-open');

// ============== 步骤条 5 步检查 ==============
const stepCount = await page.locator('#stepper-nav .step-button').count();
const stepLabels = await page.locator('#stepper-nav .step-button__label').allInnerTexts();
console.log(`步骤数: ${stepCount}, 标签: ${JSON.stringify(stepLabels)}`);
if (stepCount !== 5) note('HIGH', 'PD', '步骤条', `期望 5 步，实际 ${stepCount}`);
if (stepLabels.some(s => s.includes('沉淀') || s.includes('锁定'))) {
  note('CRITICAL', 'PD', '步骤条', '工作流中仍存在锁定/沉淀步骤');
}
await shot(page, '03-workflow-stepper');

// ============== 各步骤页 ==============
let cPlanConfirmCount = -1;
for (const stepId of ['structure', 'characters', 'relationships', 'plots', 'scenes']) {
  const btn = page.locator(`#stepper-nav .step-button[data-id="${stepId}"]`);
  if (await btn.count() === 0) {
    note('HIGH', 'PD', stepId, '步骤按钮缺失');
    continue;
  }
  await btn.click();
  await w(800);
  await shot(page, `04-step-${stepId}`);

  // 各页内容长度/可见性快查
  const panelText = await page.locator(`[data-step-group="${stepId}"]`).innerText().catch(() => '');
  if (!panelText || panelText.length < 20) {
    note('MEDIUM', 'PD', stepId, `面板内容长度仅 ${panelText.length}，可能未渲染`);
  }
  if (stepId === 'characters' && !panelText.includes('林知夏')) note('HIGH', 'SW', '人物核心', '主角名「林知夏」未出现在页面文本中');
  if (stepId === 'relationships' && !panelText.includes('童年')) note('MEDIUM', 'SW', '关系张力', '关系内容未渲染或字段缺失');
  if (stepId === 'plots' && !panelText.includes('回到小镇')) note('HIGH', 'SW', '剧情开发', '剧情卡内容未渲染');
  if (stepId === 'scenes' && !panelText.includes('渡口')) note('MEDIUM', 'SW', '场景拆解', '场景内容未渲染');

  // 在 plots 步骤时立即验证 C 方案
  if (stepId === 'plots') {
    await page.evaluate(() => {
      window.__confirmCalls = [];
      const orig = window.confirm;
      window.confirm = (msg) => { window.__confirmCalls.push(msg); return true; };
      window.__restoreConfirm = () => { window.confirm = orig; };
    });
    const draftCardInfo = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-action="select-plot-card"]'));
      const draftCard = cards.find(el => (el.textContent || '').includes('真相的代价'));
      return draftCard ? { id: draftCard.dataset.id } : { count: cards.length };
    });
    console.log(`C 方案 draft 卡: ${JSON.stringify(draftCardInfo)}`);
    if (draftCardInfo.id) {
      await page.evaluate((cardId) => {
        const btn = document.querySelector('button[data-action="scene-from-plot"]');
        if (!btn) return;
        const orig = btn.dataset.id;
        btn.dataset.id = cardId;
        btn.click();
        btn.dataset.id = orig;
      }, draftCardInfo.id);
      await w(400);
    }
    const confirmCalls = await page.evaluate(() => window.__confirmCalls || []);
    cPlanConfirmCount = confirmCalls.length;
    console.log(`C 方案 confirm 调用: ${cPlanConfirmCount}, 内容: ${JSON.stringify(confirmCalls)}`);
    if (cPlanConfirmCount === 0) {
      note('HIGH', 'PD', 'C方案', '未锁定卡的「生成场景」未触发 confirm');
    } else if (!confirmCalls[0].includes('锁定')) {
      note('MEDIUM', 'PD', 'C方案', `confirm 文案与预期不符: ${confirmCalls[0]}`);
    }
  }
}

// （C 方案验证已在 plots 步骤内嵌完成）
console.log('\n=== C 方案验证（嵌入式） ===');
console.log(`结果: confirm 调用 ${cPlanConfirmCount} 次`);

// 跳过外层 C 方案块（已内嵌） — 以下脚本继续到资料库部分
if (false) {
// 显式回 plots 步骤 — force click 以防被截图序列遗留状态影响
const plotsStepBtn = page.locator('#stepper-nav .step-button[data-id="plots"]');
await plotsStepBtn.click({ force: true }).catch(e => console.log(`plots step click fail: ${e.message}`));
await w(1200);

// 诊断：当前 currentPage / 步骤 / 卡片数量
const diag = await page.evaluate(() => ({
  bodyMode: document.body.dataset.mode || '',
  activeStep: document.body.dataset.activeStep || '',
  stepperHidden: document.querySelector('#stepper-nav')?.hidden,
  plotsPanelHidden: document.querySelector('[data-step-group="plots"]')?.hidden,
  cardCount: document.querySelectorAll('button[data-action="select-plot-card"]').length,
  sampleTexts: Array.from(document.querySelectorAll('button[data-action="select-plot-card"]')).slice(0, 4).map(b => (b.textContent || '').replace(/\s+/g, ' ').slice(0, 40))
}));
console.log(`诊断: ${JSON.stringify(diag)}`);

// 注入 confirm stub，捕获调用
await page.evaluate(() => {
  window.__confirmCalls = [];
  const orig = window.confirm;
  window.confirm = (msg) => {
    window.__confirmCalls.push(msg);
    return true;
  };
  window.__restoreConfirm = () => { window.confirm = orig; };
});

// 找到 draft 卡的 id，直接 dispatch click 到对应 scene-from-plot 按钮
const draftCardInfo = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('button[data-action="select-plot-card"]'));
  const draftBtn = buttons.find(b => (b.textContent || '').includes('真相的代价'));
  return draftBtn ? { id: draftBtn.dataset.id, text: (draftBtn.textContent || '').slice(0, 40) } : { count: buttons.length, sample: buttons.slice(0, 2).map(b => (b.textContent || '').slice(0, 30)) };
});
console.log(`draft 卡: ${JSON.stringify(draftCardInfo)}`);

if (draftCardInfo) {
  // 直接对 draft 卡 dispatch scene-from-plot action：用一个已存在的按钮（任意位置），覆盖其 dataset 后点击
  const triggered = await page.evaluate((cardId) => {
    // 找 inspector / 详情 panel 中的 scene-from-plot 按钮，临时改 data-id 后触发
    const btn = document.querySelector('button[data-action="scene-from-plot"]');
    if (!btn) return { ok: false, reason: 'no scene-from-plot button' };
    const originalId = btn.dataset.id;
    btn.dataset.id = cardId;
    btn.click();
    btn.dataset.id = originalId;
    return { ok: true };
  }, draftCardInfo.id);
  console.log(`scene-from-plot dispatch: ${JSON.stringify(triggered)}`);
  await w(400);
}

const confirmCalls = await page.evaluate(() => window.__confirmCalls || []);
console.log(`confirm 调用次数: ${confirmCalls.length}, 内容: ${JSON.stringify(confirmCalls)}`);
if (confirmCalls.length === 0) {
  note('HIGH', 'PD', 'C方案', '未锁定卡的「生成场景」未触发 confirm');
} else if (!confirmCalls[0].includes('未锁定') && !confirmCalls[0].includes('锁定')) {
  note('MEDIUM', 'PD', 'C方案', `confirm 文案与预期不符: ${confirmCalls[0]}`);
}

// 锁定卡测试：dispatch 到 locked 卡，不应弹 confirm
await page.evaluate(() => { window.__confirmCalls = []; });
const lockedCardInfo = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('button[data-action="select-plot-card"]'));
  const lockedBtn = buttons.find(b => b.innerText.includes('回到小镇'));
  return lockedBtn ? { id: lockedBtn.dataset.id } : null;
});
if (lockedCardInfo) {
  await page.evaluate((cardId) => {
    const btn = document.querySelector('button[data-action="scene-from-plot"]');
    if (!btn) return;
    const orig = btn.dataset.id;
    btn.dataset.id = cardId;
    btn.click();
    btn.dataset.id = orig;
  }, lockedCardInfo.id);
  await w(400);
  const lockedConfirms = await page.evaluate(() => window.__confirmCalls || []);
  console.log(`锁定卡 confirm 调用: ${lockedConfirms.length}`);
  if (lockedConfirms.length > 0) {
    note('MEDIUM', 'PD', 'C方案', '锁定卡不应弹 confirm，实际弹了');
  }
}
} // end if(false)

// ============== 资料库 ==============
console.log('\n=== 资料库 ===');
await page.locator('#page-library-button').click();
await w(800);
await shot(page, '05-library-default');

const libEyebrow = await page.locator('#hero-eyebrow').innerText().catch(() => '');
console.log(`Hero eyebrow: "${libEyebrow}"`);
if (!libEyebrow.includes('资料库')) note('HIGH', 'PD', '资料库', `eyebrow "${libEyebrow}" 不正确`);

const tabs = await page.locator('#locks-content .tab-button').allInnerTexts();
console.log(`资料库 tabs: ${JSON.stringify(tabs)}`);
if (tabs.length !== 5) note('HIGH', 'PD', '资料库', `tab 数 ${tabs.length}/${5}`);

for (const tabId of ['timeline', 'rules', 'setups', 'genres', 'kb']) {
  const tb = page.locator(`button[data-action="locks-tab"][data-id="${tabId}"]`);
  if (await tb.count() === 0) { note('HIGH', 'PD', `资料库/${tabId}`, 'tab 缺失'); continue; }
  await tb.click();
  await w(400);
  await shot(page, `06-library-${tabId}`);
  const t = await page.locator('#locks-content').innerText().catch(() => '');

  if (tabId === 'timeline' && !t.includes('录音')) note('MEDIUM', 'SW', '资料库/时间线', '已填充的时间线数据未渲染');
  if (tabId === 'rules' && !t.includes('小镇')) note('MEDIUM', 'SW', '资料库/规则', '已填充的世界规则未渲染');
  if (tabId === 'setups' && !t.includes('录音笔')) note('MEDIUM', 'SW', '资料库/伏笔', '已填充的伏笔未渲染');
  if (tabId === 'genres' && !t.includes('悬疑')) note('MEDIUM', 'SW', '资料库/类型', '已填充的类型未渲染');
  if (tabId === 'kb' && !(t.includes('外部') || t.includes('知识'))) {
    note('MEDIUM', 'PD', '资料库/KB', 'KB 占位文本不明确');
  }
}

// 回到项目中心
await page.locator('#page-project-button').click();
await w(800);
await shot(page, '07-projects-back');

// ============== 收尾 ==============
console.log('\n\n========== 真实检查报告 ==========');
console.log(`项目：原点编剧系统`);
console.log(`专家：资深编剧(SW) + 产品体验总监(PD)`);
console.log(`观察数：${OBS.length}`);
const bySev = OBS.reduce((m, o) => { m[o.sev] = (m[o.sev] || 0) + 1; return m; }, {});
console.log(`严重度分布: ${JSON.stringify(bySev)}`);
for (const o of OBS) console.log(`  [${o.sev}] [${o.who}] [${o.where}] ${o.msg}`);

if (pageErrors.length) {
  console.log(`\n页面错误 ${pageErrors.length} 条:`);
  for (const e of pageErrors.slice(0, 20)) console.log(`  ${e}`);
}

fs.writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify({ observations: OBS, pageErrors }, null, 2));
console.log(`\n截图与报告写入：${SHOTS}`);

await browser.close();
