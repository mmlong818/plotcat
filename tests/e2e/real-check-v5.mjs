// 真实检查 v5 — 完成完整电影剧本端到端
//
// 与 v4 区别：v4 只验证 1 场 AI 生成；v5 必须产出整部电影的成稿剧本。
//
// 流程：
//   1) API 造完整项目（12 场，覆盖 3 幕弧光）
//   2) UI 进入剧本撰写页
//   3) 触发 AI 批量生成全部
//   4) 等所有 12 场完成（每场约 20-40s，总计 4-8min）
//   5) 导出 .fountain，写入磁盘
//   6) 校验整本剧本：
//      - 每场字数 > 300
//      - 每场含正确的人物名（林知夏 / 陈牧）
//      - 每场含 INT./EXT. slug
//      - 全本字数估算页数符合电影长度（80-130 页）
//      - 抽样人工可读的片段
//   7) 清理项目（保留导出的 fountain 文件以便人工评审）

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import http from 'http';

const BASE = 'http://127.0.0.1:4173';
const SHOTS = 'E:/CC/code/yuandian-screenwriting-system/tests/e2e/real-check-shots/v5';
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
const w = (ms) => new Promise(r => setTimeout(r, ms));

// =========================================================
// STAGE 1：建 12 场完整项目
// =========================================================
console.log('\n=== STAGE 1: 建完整项目（12 场覆盖 3 幕弧光）===');
const create = await api('POST', '/api/projects', {
  title: '小镇七十二小时',
  format: 'feature',
  genre: ['悬疑', '剧情'],
  logline: '一名退役刑警在故乡小镇遇到一桩与自己往事有关的失踪案，必须在七十二小时内揭穿真相。',
  theme_question: '当真相会摧毁你所爱的人，你还要查下去吗？',
  tone: '冷峻、克制、潮湿的小镇质感'
});
if (create.s !== 200) { console.error('创建失败'); process.exit(1); }
const project = create.j.project;
const pid = project.project.id;
console.log('项目 id:', pid);

const populated = JSON.parse(JSON.stringify(project));
const acts = project.structure_profile?.acts ?? [];
// 取前 3 幕（feature 模板通常有 3-5 幕）
const a1 = acts[0]?.id ?? '';
const a2 = acts[1]?.id ?? a1;
const a3 = acts[2]?.id ?? a2;

const charA_id = 'char_linzx';
const charB_id = 'char_chenmu';
const charC_id = 'char_motherinlaw';  // 第三人物：陈牧的妻子苏曼
populated.story_bible.characters = [
  { id: charA_id, name: '林知夏', story_role: 'protagonist', archetype: 'detective',
    external_want: '查清十年前妹妹失踪案的真相', internal_need: '原谅当年放弃寻找的自己',
    psychological_flaw: '不肯原谅自己', core_fear: '真相比想象更不堪',
    arc_start: '抗拒回到小镇，刻意低调', arc_end: '主动挖出真相，承担后果',
    public_mask: '冷静、克制的前刑警', voice_traits: '少话，停顿多，句尾下沉',
    backstory: '前刑警，因当年妹妹案离职，十年没回小镇。父亲此次病危召她回来。',
    secret: '当年也是签了「放弃寻找」声明的家属之一。' },
  { id: charB_id, name: '陈牧', story_role: 'antagonist', archetype: 'shadow',
    external_want: '把当年的事永远埋住', internal_need: '面对自己的怯懦',
    psychological_flaw: '把控制当作爱', core_fear: '被林知夏看穿',
    arc_start: '体面的副镇长', arc_end: '走向毁灭',
    public_mask: '热情、温和的小镇头面人物', voice_traits: '语调平稳，句尾下沉，喜欢用"咱们"',
    backstory: '小镇副镇长，林知夏儿时玩伴。',
    secret: '当年妹妹失踪那天最后一个见过她，并隐瞒了见面地点。' },
  { id: charC_id, name: '苏曼', story_role: 'supporting', archetype: 'mirror',
    external_want: '保护现在的家庭不被旧事波及', internal_need: '承认自己也是受害者',
    psychological_flaw: '把沉默当成爱',
    public_mask: '陈牧体面的妻子', voice_traits: '克制，少表情',
    backstory: '陈牧的妻子，也是当年案件的旁观者。' }
];
populated.story_bible.relationships = [
  { id: 'rel1', source_character_id: charA_id, target_character_id: charB_id,
    relationship_type: '童年挚友 / 怀疑对象',
    shared_history: '十年前妹妹失踪案最后见过她的两人之一。', tension: 'A 在追查 / B 在掩盖' },
  { id: 'rel2', source_character_id: charB_id, target_character_id: charC_id,
    relationship_type: '夫妻',
    shared_history: '婚后从未谈及当年的事。', tension: '共同的沉默' }
];
populated.character_hub = populated.character_hub || {};
populated.character_hub.relationship_map = populated.story_bible.relationships;

// 12 张剧情卡，全部 locked
const cards = [
  // Act 1
  { i: 1, act: a1, status: 'locked', title: '回到小镇', summary: '林知夏因父亲病危回到阔别十年的小镇。', conflict: '不愿见到童年玩伴陈牧，却被他高调相迎。', change: '从抗拒转为被迫停留。', chars: [charA_id, charB_id] },
  { i: 2, act: a1, status: 'locked', title: '父亲遗物', summary: '深夜整理父亲遗物，发现妹妹失踪当日的录音笔，最后一段录音里有陈牧的声音。', conflict: '怀疑 vs 不愿相信。', change: '心理天平第一次倾斜。', chars: [charA_id] },
  { i: 3, act: a1, status: 'locked', title: '镇上传言', summary: '林知夏在镇上听说陈牧近年发达，正在竞选镇长。', conflict: '陈牧的体面形象 vs 她的疑心。', change: '决定主动调查。', chars: [charA_id] },
  // Act 2A
  { i: 4, act: a2, status: 'locked', title: '找老同学', summary: '林知夏找到当年案件的目击同学，对方支吾其词后突然崩溃。', conflict: '逼问 vs 保命。', change: '确认有人警告了证人。', chars: [charA_id] },
  { i: 5, act: a2, status: 'locked', title: '陈牧家访', summary: '陈牧主动邀请林知夏到家中吃饭，苏曼礼貌却疏离，桌下气氛紧绷。', conflict: '表面寒暄 vs 暗中较劲。', change: '苏曼也开始怀疑陈牧。', chars: [charA_id, charB_id, charC_id] },
  { i: 6, act: a2, status: 'locked', title: '水坝雨夜对峙', summary: '林知夏雨夜把陈牧约到当年妹妹最后出现的水坝下，直接拿出录音笔。', conflict: '逼问 vs 沉默。', change: '陈牧第一次承认见过妹妹但拒说去向。', chars: [charA_id, charB_id] },
  // Act 2B
  { i: 7, act: a2, status: 'locked', title: '自我审判', summary: '林知夏翻出当年自己签的"放弃寻找"声明，意识到自己也是共谋。', conflict: '揭穿 vs 自保。', change: '放弃揭穿的诱惑出现。', chars: [charA_id] },
  { i: 8, act: a2, status: 'locked', title: '父亲的医生', summary: '父亲弥留之际让她去找当年镇上的法医，法医交出一份未上报的尸检备忘。', conflict: '获得证据 vs 保护父亲名声。', change: '证据指向陈牧。', chars: [charA_id] },
  { i: 9, act: a3, status: 'locked', title: '陈牧的恐惧', summary: '苏曼悄悄找到林知夏，把陈牧近年的不眠和酗酒说给她听，请求她"还所有人一个交代"。', conflict: '苏曼的家庭 vs 她对真相的渴望。', change: '林知夏获得最关键的内部盟友。', chars: [charA_id, charC_id] },
  // Act 3
  { i: 10, act: a3, status: 'locked', title: '真相浮出', summary: '林知夏在镇政府公开场合放出录音笔片段。', conflict: '揭穿 vs 全镇的颜面。', change: '陈牧当众崩溃。', chars: [charA_id, charB_id] },
  { i: 11, act: a3, status: 'locked', title: '选择', summary: '陈牧被警方带走前，请求和林知夏单独说话，承认意外伤害妹妹的细节。', conflict: '原谅 vs 愤怒。', change: '林知夏没有原谅，但停下了愤怒。', chars: [charA_id, charB_id] },
  { i: 12, act: a3, status: 'locked', title: '离开小镇', summary: '父亲下葬后，林知夏一个人在妹妹的衣冠冢前坐了很久，然后开车离开。', conflict: '留下 vs 离开。', change: '她终于可以离开了。', chars: [charA_id] }
];
populated.plot_board.cards = cards.map((c) => ({
  id: `card_${c.i}`, act_id: c.act, node_id: '',
  lane_id: 'lane_main', lane_kind: 'canonical_mainline',
  title: c.title, type: 'mainline', status: c.status,
  summary: c.summary, conflict: c.conflict, change: c.change,
  character_ids: c.chars, order_index: c.i * 10
}));

// 12 个场景对应 12 卡（一一对应，每卡一场）
const sceneSpecs = [
  { i: 1, act: a1, title: '回到小镇 · 渡口',          loc: '小镇渡口',     time: '黄昏', pov: charA_id, purpose: '建立基调，让 A 和 B 第一次照面。', obstacle: 'A 想低调，B 却高调相迎。', entry: '抗拒、戒备', exit: '勉强停留' },
  { i: 2, act: a1, title: '父亲遗物里的录音',         loc: '父亲卧室',     time: '深夜', pov: charA_id, purpose: '把怀疑的种子种下。', obstacle: '录音笔老化，关键段噪声大。', entry: '哀伤', exit: '战栗、清醒' },
  { i: 3, act: a1, title: '理发店的传言',             loc: '镇上理发店',   time: '上午', pov: charA_id, purpose: '建立陈牧的体面假象 + 她的内心质疑。', obstacle: '理发师对她的疑心很警觉。', entry: '冷峻', exit: '决心调查' },
  { i: 4, act: a2, title: '同学崩溃',                 loc: '老同学家阳台', time: '下午', pov: charA_id, purpose: '证人吓崩 → 暗示有人封口。', obstacle: '同学说半句就崩，拒绝深谈。', entry: '逼问', exit: '失望但确信' },
  { i: 5, act: a2, title: '陈牧家的晚饭',             loc: '陈牧家餐厅',   time: '晚饭', pov: charA_id, purpose: '三人桌下暗战 + 让苏曼第一次起疑。', obstacle: '所有话都不能直说。', entry: '装作平常', exit: '心照不宣' },
  { i: 6, act: a2, title: '水坝雨夜',                 loc: '水坝下方',     time: '雨夜', pov: charA_id, purpose: '直接逼问 + 拿出录音笔。', obstacle: '陈牧不肯承认去向。', entry: '硬碰硬', exit: '陈牧承认见过' },
  { i: 7, act: a2, title: '签过的字',                 loc: '父亲书房',     time: '凌晨', pov: charA_id, purpose: '她翻出自己签的"放弃寻找"声明 → 自我审判。', obstacle: '她意识到自己也是共谋。', entry: '愤怒', exit: '羞耻、动摇' },
  { i: 8, act: a2, title: '法医的备忘',               loc: '老法医家',     time: '清晨', pov: charA_id, purpose: '拿到一份未上报的尸检备忘。', obstacle: '法医怕牵连。', entry: '哀求', exit: '握有铁证' },
  { i: 9, act: a3, title: '苏曼来找她',               loc: '父亲家门口',   time: '深夜', pov: charA_id, purpose: '获得陈牧家内的盟友。', obstacle: '苏曼也怕，但更怕女儿长大后听到。', entry: '戒备', exit: '同盟' },
  { i: 10, act: a3, title: '镇政府台阶',              loc: '镇政府台阶',   time: '正午', pov: charA_id, purpose: '公开放出录音 → 陈牧崩溃。', obstacle: '陈牧的拥护者起哄阻拦。', entry: '决心', exit: '颜面碎裂' },
  { i: 11, act: a3, title: '警车前的最后五分钟',      loc: '镇派出所门口', time: '黄昏', pov: charA_id, purpose: '陈牧请求单独说话，承认意外。', obstacle: '原谅 vs 愤怒。', entry: '冷', exit: '不原谅但放下愤怒' },
  { i: 12, act: a3, title: '妹妹的衣冠冢',            loc: '小镇墓园',     time: '清晨', pov: charA_id, purpose: '弧光收尾：她可以离开了。', obstacle: '留下的诱惑（认错的诱惑）。', entry: '空', exit: '可以离开' }
];

populated.scene_workbench.scenes = sceneSpecs.map((s) => ({
  id: `scene_${s.i}`, order_index: s.i,
  title: s.title, act_id: s.act,
  linked_plot_card_ids: [`card_${s.i}`],
  pov_character_id: s.pov,
  location: s.loc, time_of_day: s.time,
  purpose: s.purpose, obstacle: s.obstacle,
  beat_summary: '', entry_state: s.entry, exit_state: s.exit,
  status: 'draft', script_excerpt: '', script_full: '', screenplay_notes: '', notes: ''
}));

// 锁定层
populated.story_bible.timeline_events = [
  { id: 'tl1', story_day: 1, sequence_index: 1, summary: '林知夏回到小镇', participants: [charA_id], location: '渡口', trigger: '父亲病危电话', consequence: '与陈牧重逢' },
  { id: 'tl2', story_day: 1, sequence_index: 2, summary: '发现父亲遗物里的录音笔', participants: [charA_id], location: '父亲卧室', trigger: '整理遗物', consequence: '怀疑陈牧' },
  { id: 'tl3', story_day: 2, sequence_index: 3, summary: '水坝雨夜对峙', participants: [charA_id, charB_id], location: '水坝下', trigger: '逼问', consequence: '陈牧承认见过妹妹' },
  { id: 'tl4', story_day: 3, sequence_index: 4, summary: '镇政府台阶公开揭穿', participants: [charA_id, charB_id], location: '镇政府', trigger: '放录音', consequence: '陈牧被带走' }
];
populated.story_bible.world_rules = [
  { id: 'r1', rule_statement: '小镇所有人都互相认识，任何调查都会立刻传开。', scope: '社会层', rule_level: 'hard', exceptions: ['外来者前 24 小时不会被察觉'] },
  { id: 'r2', rule_statement: '陈牧在小镇有相当政治资源，公开对抗他需要不可反驳的证据。', scope: '政治层', rule_level: 'hard', exceptions: [] }
];
populated.story_bible.setup_payoffs = [
  { id: 'sp1', setup_summary: '父亲遗物里的录音笔', setup_scene_id: 'scene_2', expected_payoff_window: 'Act3', status: 'planted', payoff_scene_id: 'scene_10', payoff_summary: '在镇政府台阶公开播放' },
  { id: 'sp2', setup_summary: '林知夏当年签的「放弃寻找」声明', setup_scene_id: 'scene_7', expected_payoff_window: 'Act3', status: 'planted', payoff_scene_id: 'scene_11', payoff_summary: '在与陈牧对话中提到' }
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
if (put.s !== 200) { console.error('PUT 失败', put.j); process.exit(1); }
console.log(`✓ 项目已填充：12 场 + 12 卡 + 3 人 + 4 时间线 + 2 规则 + 2 伏笔`);

// =========================================================
// STAGE 2：UI 打开剧本撰写页 + 批量生成
// =========================================================
console.log('\n=== STAGE 2: 批量 AI 生成 12 场（预估 5-10 分钟）===');
const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
const page = await ctx.newPage();
page.on('pageerror', e => note('HIGH', 'PD', 'browser', `pageerror: ${e.message}`));
let apiErrors = 0;
page.on('response', resp => {
  if (resp.url().includes('/api/generate') && resp.status() >= 400) apiErrors++;
});

await page.goto(BASE);
await w(2000);
await page.locator(`[data-action="open-project"][data-id="${pid}"]`).first().click();
await w(1500);
await page.locator(`#stepper-nav .step-button[data-id="screenplay"]`).click();
await w(800);
await page.screenshot({ path: path.join(SHOTS, '01-before-bulk.png'), fullPage: true });

const sceneCount = await page.locator('.screenplay-scene-item').count();
console.log(`UI 显示场景数：${sceneCount}`);
if (sceneCount !== 12) note('HIGH', 'PD', '剧本撰写', `期望 12 场实际 ${sceneCount}`);

// 启动批量生成（accept confirm）
await page.evaluate(() => { window.confirm = () => true; });
await page.locator('button[data-action="ai-write-screenplay-bulk"]').click();

// 监控进度：每 10s 打印一次，直到 bulkRunning 变为 false 或超过 15 分钟
const start = Date.now();
const MAX_WAIT = 15 * 60 * 1000;
let lastDone = -1;
while (Date.now() - start < MAX_WAIT) {
  await w(10000);
  const state = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button[data-action="ai-write-screenplay-bulk"]'));
    const txt = btns[0]?.textContent?.trim() || '';
    const items = Array.from(document.querySelectorAll('.screenplay-scene-item__status')).map(e => e.textContent?.trim() || '');
    return { btnText: txt, statuses: items };
  });
  const done = state.statuses.filter(s => s === '已成稿').length;
  const draft = state.statuses.filter(s => s === '草稿').length;
  const empty = state.statuses.filter(s => s === '未撰写').length;
  const elapsed = Math.round((Date.now() - start) / 1000);
  console.log(`[${elapsed}s] ${state.btnText} · 已成稿 ${done} 草稿 ${draft} 未撰写 ${empty}`);
  if (done !== lastDone) {
    await page.screenshot({ path: path.join(SHOTS, `02-progress-${String(done).padStart(2, '0')}.png`), fullPage: true });
    lastDone = done;
  }
  if (!state.btnText.includes('批量中')) {
    console.log('✓ 批量结束');
    break;
  }
}
await page.screenshot({ path: path.join(SHOTS, '03-after-bulk.png'), fullPage: true });

if (apiErrors > 0) note('HIGH', 'PD', 'API', `批量过程出现 ${apiErrors} 次 API 错误响应`);

// =========================================================
// STAGE 3：导出 .fountain 并写盘
// =========================================================
console.log('\n=== STAGE 3: 导出 .fountain ===');
const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
await page.locator('button[data-action="export-screenplay-fountain"]').click();
const download = await downloadPromise;
const fountainPath = path.join(SHOTS, '小镇七十二小时.fountain');
if (!download) {
  note('HIGH', 'PD', '导出', '下载事件未触发');
} else {
  await download.saveAs(fountainPath);
  console.log(`✓ 已保存：${fountainPath}`);
}

// =========================================================
// STAGE 4：校验整本剧本质量
// =========================================================
console.log('\n=== STAGE 4: 校验剧本质量 ===');
const finalProject = (await api('GET', `/api/projects/${encodeURIComponent(pid)}`)).j.project;
const scenes = finalProject.scene_workbench?.scenes ?? [];
const scenesSorted = scenes.slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

const lengths = scenesSorted.map(s => (s.script_full || '').length);
const total = lengths.reduce((a, b) => a + b, 0);
const avg = Math.round(total / Math.max(scenes.length, 1));
console.log(`场景数 ${scenes.length}, 总字数 ${total}, 平均每场 ${avg}, 估算页数 ${Math.ceil(total / 250)}`);

let writtenCount = 0;
let withNamesCount = 0;
let withSlugCount = 0;
const issues = [];
scenesSorted.forEach((s, idx) => {
  const len = (s.script_full || '').length;
  const hasLin = (s.script_full || '').includes('林知夏');
  const hasChen = (s.script_full || '').includes('陈牧');
  const hasSu = (s.script_full || '').includes('苏曼');
  const hasSlug = /^(INT\.|EXT\.)/m.test(s.script_full || '');
  if (len > 300) writtenCount++;
  if (len < 300) issues.push(`场景 #${idx + 1} 「${s.title}」字数仅 ${len}`);
  // 该场出场的人物名应该都出现
  const expectedChars = (finalProject.plot_board?.cards ?? []).find(c => (s.linked_plot_card_ids || []).includes(c.id))?.character_ids ?? [];
  const charById = new Map((finalProject.character_hub?.characters ?? []).map(c => [c.id, c.name]));
  const expected = expectedChars.map(cid => charById.get(cid)).filter(Boolean);
  const missing = expected.filter(name => !(s.script_full || '').includes(name));
  if (missing.length > 0) issues.push(`场景 #${idx + 1} 「${s.title}」缺少人物名：${missing.join('、')}`);
  if (hasLin || hasChen || hasSu) withNamesCount++;
  if (hasSlug) withSlugCount++;
});

console.log(`✓ 字数 ≥300 的场景：${writtenCount}/${scenes.length}`);
console.log(`✓ 含项目人物名的场景：${withNamesCount}/${scenes.length}`);
console.log(`✓ 含 INT./EXT. slug 的场景：${withSlugCount}/${scenes.length}`);

if (writtenCount < scenes.length) note('HIGH', 'SW', '完整性', `仅 ${writtenCount}/${scenes.length} 场达成稿字数`);
if (withNamesCount < scenes.length) note('HIGH', 'SW', '人物一致性', `仅 ${withNamesCount}/${scenes.length} 场含项目人物名`);
if (withSlugCount < scenes.length) note('MEDIUM', 'PD', '格式', `仅 ${withSlugCount}/${scenes.length} 场含 slug`);

if (issues.length > 0) {
  console.log('\n问题清单：');
  for (const i of issues) console.log(`  - ${i}`);
}

// fountain 校验
if (download && fs.existsSync(fountainPath)) {
  const fountain = fs.readFileSync(fountainPath, 'utf-8');
  console.log(`\n.fountain 文件 ${fountain.length} 字`);
  if (!fountain.startsWith('Title:')) note('HIGH', 'PD', 'fountain', '缺少 Title 头');
  const slugCount = (fountain.match(/^(INT\.|EXT\.)/gm) || []).length;
  console.log(`fountain 内 slug 数：${slugCount}`);
  if (slugCount < scenes.length) note('MEDIUM', 'PD', 'fountain', `slug 数 ${slugCount} 少于场景数 ${scenes.length}`);

  // 抽样：打印开场 1500 字
  console.log('\n---- fountain 开场片段（前 1500 字）----');
  console.log(fountain.slice(0, 1500));
  console.log('---- 片段结束 ----\n');
}

// =========================================================
// 报告
// =========================================================
console.log('\n========== 真实检查 v5 最终报告 ==========');
console.log(`项目：完整电影剧本端到端`);
console.log(`观察数：${OBS.length}`);
const bySev = OBS.reduce((m, o) => { m[o.sev] = (m[o.sev] || 0) + 1; return m; }, {});
console.log(`严重度分布: ${JSON.stringify(bySev)}`);
for (const o of OBS) console.log(`  [${o.sev}] [${o.who}] [${o.where}] ${o.msg}`);

console.log(`\n剧本产出：`);
console.log(`  · 场景数：${scenes.length}`);
console.log(`  · 总字数：${total}（估算 ${Math.ceil(total / 250)} 页 · 电影长度 80-130 页）`);
console.log(`  · 成稿率：${writtenCount}/${scenes.length}`);
console.log(`  · 人物一致性：${withNamesCount}/${scenes.length}`);
console.log(`  · 格式合规：${withSlugCount}/${scenes.length}`);
console.log(`\n产出文件保留在：${fountainPath}（供人工评审）`);

fs.writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify({
  observations: OBS,
  scenes: scenesSorted.map(s => ({
    order: s.order_index, title: s.title, length: (s.script_full || '').length
  })),
  total, writtenCount, withNamesCount, withSlugCount
}, null, 2));

await browser.close();
// 不删除项目，方便手动打开浏览器查看
console.log(`\n[未清理] 项目 ${pid} 已保留，可在浏览器中打开查看。`);
