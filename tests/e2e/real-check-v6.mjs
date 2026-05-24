// 真实检查 v6 — 90 分钟电影体量 + UI 排序实操
//
// 与 v5 区别：
//   · v5 只 12 场（~36 页），远短于电影长度。v6 扩到 25 场，目标 ~90 页
//   · v5 直接给 order_index 灌数据，没走 UI 排序。v6 故意打乱 order，
//     在 UI 中点「前移/后移」恢复顺序，证明排序真的生效。

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import http from 'http';

const BASE = 'http://127.0.0.1:4173';
const SHOTS = 'E:/CC/code/yuandian-screenwriting-system/tests/e2e/real-check-shots/v6';
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
// STAGE 1：建 25 场项目（覆盖完整 3 幕 + 子节拍）
// =========================================================
console.log('\n=== STAGE 1: 建 25 场完整项目 ===');
const create = await api('POST', '/api/projects', {
  title: '小镇七十二小时',
  format: 'feature',
  genre: ['悬疑', '剧情'],
  logline: '一名退役刑警在故乡小镇遇到一桩与自己往事有关的失踪案，必须在七十二小时内揭穿真相。',
  theme_question: '当真相会摧毁你所爱的人，你还要查下去吗？',
  tone: '冷峻、克制、潮湿的小镇质感'
});
const project = create.j.project;
const pid = project.project.id;
console.log('项目 id:', pid);

const populated = JSON.parse(JSON.stringify(project));
const acts = project.structure_profile?.acts ?? [];
const a1 = acts[0]?.id ?? '';
const a2 = acts[1]?.id ?? a1;
const a3 = acts[2]?.id ?? a2;

const stamp = Date.now().toString(36);
const charA_id = `char_linzx_${stamp}`;
const charB_id = `char_chenmu_${stamp}`;
const charC_id = `char_suman_${stamp}`;
const charD_id = `char_father_${stamp}`;
const charE_id = `char_classmate_${stamp}`;
const charF_id = `char_medic_${stamp}`;

populated.story_bible.characters = [
  { id: charA_id, name: '林知夏', story_role: 'protagonist', archetype: 'detective',
    external_want: '查清十年前妹妹失踪案的真相', internal_need: '原谅当年放弃寻找的自己',
    psychological_flaw: '不肯原谅自己', core_fear: '真相比想象更不堪',
    arc_start: '抗拒回到小镇，刻意低调', arc_end: '主动挖出真相，承担后果',
    public_mask: '冷静、克制的前刑警', voice_traits: '少话，停顿多，句尾下沉',
    backstory: '前刑警，十年没回小镇。父亲此次病危召她回来。',
    secret: '当年也是签了「放弃寻找」声明的家属之一。' },
  { id: charB_id, name: '陈牧', story_role: 'antagonist', archetype: 'shadow',
    external_want: '把当年的事永远埋住', internal_need: '面对自己的怯懦',
    psychological_flaw: '把控制当作爱', core_fear: '被林知夏看穿',
    arc_start: '体面的副镇长', arc_end: '走向毁灭',
    public_mask: '热情、温和的小镇头面人物', voice_traits: '语调平稳，喜欢用"咱们"',
    backstory: '小镇副镇长，林知夏儿时玩伴。',
    secret: '当年妹妹失踪那天最后一个见过她，意外把她推下水坝后慌乱离开。' },
  { id: charC_id, name: '苏曼', story_role: 'supporting', archetype: 'mirror',
    external_want: '保护现在的家庭', internal_need: '承认自己也是受害者',
    psychological_flaw: '把沉默当成爱', public_mask: '陈牧体面的妻子', voice_traits: '克制、少表情',
    backstory: '陈牧妻子，当年案件旁观者。' },
  { id: charD_id, name: '林父', story_role: 'supporting', archetype: 'mentor',
    external_want: '把真相托付给女儿', internal_need: '请求女儿原谅自己当年的妥协',
    public_mask: '退休的老警察', voice_traits: '低沉，气息短',
    backstory: '林知夏父亲，前县刑警队长，妹妹失踪时签字「放弃寻找」的执笔人。', secret: '私下保留了一份未上报的尸检备忘。' },
  { id: charE_id, name: '阿珍', story_role: 'supporting', archetype: 'herald',
    external_want: '把心里压着的事讲出来', internal_need: '不再做共谋',
    public_mask: '小镇理发店老板娘', voice_traits: '语速快，断句多',
    backstory: '林知夏童年同学，妹妹失踪案的关键目击者之一。' },
  { id: charF_id, name: '老周', story_role: 'supporting', archetype: 'guardian',
    external_want: '保住饭碗', internal_need: '把当年保留的真相交出去',
    public_mask: '退休法医', voice_traits: '冷淡，专业',
    backstory: '当年的乡镇法医，知道尸检备忘的存在。' }
];
populated.story_bible.relationships = [
  { id: `rel1_${stamp}`, source_character_id: charA_id, target_character_id: charB_id, relationship_type: '童年挚友 / 怀疑对象', shared_history: '十年前妹妹失踪案最后见过她的两人之一。', tension: 'A 在追查 / B 在掩盖' },
  { id: `rel2_${stamp}`, source_character_id: charB_id, target_character_id: charC_id, relationship_type: '夫妻', shared_history: '婚后从未谈及当年的事。', tension: '共同的沉默' },
  { id: `rel3_${stamp}`, source_character_id: charA_id, target_character_id: charD_id, relationship_type: '父女', shared_history: '父亲当年签字放弃寻找妹妹。', tension: '埋怨与依恋' },
  { id: `rel4_${stamp}`, source_character_id: charA_id, target_character_id: charE_id, relationship_type: '童年同学', shared_history: '阿珍当年看到了陈牧带妹妹去水坝。', tension: '记忆 vs 害怕' }
];
// 不手动写 character_hub.characters；让 ensurePlotDrivenProject 从 story_bible.characters 派生
populated.character_hub = { ...(populated.character_hub || {}), relationship_map: populated.story_bible.relationships };

// 25 场 + 25 对应剧情卡（按经典三幕分布）
const beats = [
  // Act 1 (1-7): 建立世界 / 唤起 / 拒绝召唤 / 入局
  { i: 1,  act: a1, title: '回到小镇',     loc: '小镇渡口',     time: '黄昏', chars: [charA_id, charB_id], purpose: '建立基调，A 与 B 在十年后第一次照面。', obstacle: 'A 想低调，B 高调相迎。', entry: '抗拒、戒备', exit: '勉强停留' },
  { i: 2,  act: a1, title: '医院走廊',     loc: '县医院走廊',   time: '夜',   chars: [charA_id, charD_id], purpose: 'A 见弥留中的父亲，父亲让她回家找箱子最底下的东西。', obstacle: '父亲气息短，话说不清。', entry: '强装平静', exit: '心生疑惑' },
  { i: 3,  act: a1, title: '父亲卧室',     loc: '父亲卧室',     time: '深夜', chars: [charA_id],            purpose: '发现录音笔（伏笔种下）。', obstacle: '录音笔老化，关键段噪声大。', entry: '哀伤', exit: '战栗、清醒' },
  { i: 4,  act: a1, title: '理发店听传言', loc: '镇上理发店',   time: '上午', chars: [charA_id, charE_id], purpose: '从阿珍口里听到陈牧近年的体面 + 一丝异样。', obstacle: '阿珍欲言又止。', entry: '冷峻', exit: '决心调查' },
  { i: 5,  act: a1, title: '父亲家的访客', loc: '父亲家门口',   time: '黄昏', chars: [charA_id, charB_id], purpose: 'B 主动送花登门，邀 A 去家里吃饭，A 接受。', obstacle: '表面寒暄，桌下试探。', entry: '冷淡', exit: '答应赴约' },
  { i: 6,  act: a1, title: '陈牧家晚饭',   loc: '陈牧家餐厅',   time: '晚饭', chars: [charA_id, charB_id, charC_id], purpose: '三人桌下暗战 + 苏曼第一次起疑。', obstacle: '所有话都不能直说。', entry: '装作平常', exit: '心照不宣' },
  { i: 7,  act: a1, title: '医院告别',     loc: '县医院病房',   time: '凌晨', chars: [charA_id, charD_id], purpose: '父亲临终把"老周"的名字交给她。', obstacle: '父亲只剩最后一口气。', entry: '不眠', exit: '父亲去世' },
  // Act 2A (8-14): 调查推进，证据一点点出现
  { i: 8,  act: a2, title: '理发店深谈',   loc: '镇上理发店',   time: '下午', chars: [charA_id, charE_id], purpose: 'A 逼问阿珍，阿珍崩溃说看到陈牧当天带妹妹去水坝。', obstacle: '阿珍害怕被报复。', entry: '逼问', exit: '失望但确信' },
  { i: 9,  act: a2, title: '水边踩点',     loc: '水坝下方',     time: '清晨', chars: [charA_id],            purpose: 'A 独自勘查当年现场，发现一处被冲刷出的旧物。', obstacle: '现场十年未动，线索模糊。', entry: '冷静', exit: '心底动摇' },
  { i: 10, act: a2, title: '镇政府远观',   loc: '镇政府台阶',   time: '上午', chars: [charA_id, charB_id], purpose: '远远看到陈牧风光发表演讲。', obstacle: '她不能正面挑衅。', entry: '克制', exit: '愤怒压不住' },
  { i: 11, act: a2, title: '找老周',       loc: '老法医家',     time: '黄昏', chars: [charA_id, charF_id], purpose: '老周不愿见，A 在门口等了 3 小时。', obstacle: '老周关门。', entry: '坚持', exit: '撬开一条缝' },
  { i: 12, act: a2, title: '老周交备忘',   loc: '老法医家',     time: '深夜', chars: [charA_id, charF_id], purpose: '老周交出当年未上报的尸检备忘。', obstacle: '老周要求 A 别提自己。', entry: '决断', exit: '握有铁证' },
  { i: 13, act: a2, title: '夜里复印',     loc: '父亲书房',     time: '深夜', chars: [charA_id],            purpose: 'A 复印备忘并把原件藏起。', obstacle: '没人能帮她保管。', entry: '冷静', exit: '战术明确' },
  { i: 14, act: a2, title: '水坝雨夜对峙', loc: '水坝下方',     time: '雨夜', chars: [charA_id, charB_id], purpose: 'A 雨夜把 B 约到现场，直接出录音笔。', obstacle: 'B 不肯承认去向。', entry: '硬碰硬', exit: '陈牧承认见过' },
  // Act 2B (15-19): 黑暗时刻 / 自我审判
  { i: 15, act: a2, title: '父亲遗物里的旧抽屉', loc: '父亲卧室', time: '凌晨', chars: [charA_id],         purpose: 'A 翻出当年自己签的"放弃寻找"声明 → 自我审判。', obstacle: '她意识到自己也是共谋。', entry: '愤怒', exit: '羞耻、动摇' },
  { i: 16, act: a2, title: '雨中独行',     loc: '小镇巷口',     time: '凌晨', chars: [charA_id],            purpose: '蒙太奇式的失神时刻：她想过放弃。', obstacle: '内心的引诱。', entry: '崩溃', exit: '重新站起' },
  { i: 17, act: a2, title: '苏曼来访',     loc: '父亲家门口',   time: '深夜', chars: [charA_id, charC_id], purpose: '苏曼悄悄上门，请求 A 给所有人一个交代。', obstacle: '苏曼也怕，但更怕女儿长大后听到。', entry: '戒备', exit: '同盟' },
  { i: 18, act: a2, title: '陈牧的恐惧',   loc: '陈牧家书房',   time: '深夜', chars: [charB_id, charC_id], purpose: 'B 视角：他在房里酗酒，被苏曼撞见。', obstacle: 'B 不愿承认自己崩溃。', entry: '逞强', exit: '裂痕清晰' },
  { i: 19, act: a2, title: '回看录音笔',   loc: '父亲卧室',     time: '深夜', chars: [charA_id],            purpose: 'A 终于听清父亲录音里压着声音说的下半句：备忘藏在哪。', obstacle: '电流声反复。', entry: '专注', exit: '一锤定音' },
  // Act 3 (20-25): 高潮 / 结局 / 弧光收尾
  { i: 20, act: a3, title: '镇政府台阶',   loc: '镇政府台阶',   time: '正午', chars: [charA_id, charB_id, charC_id], purpose: 'A 在公开场合放出录音 + 备忘片段。', obstacle: 'B 的拥护者阻拦。', entry: '决心', exit: '颜面碎裂' },
  { i: 21, act: a3, title: '警车前的五分钟', loc: '镇派出所门口', time: '黄昏', chars: [charA_id, charB_id], purpose: 'B 被带走前请求和 A 单独说话，承认意外细节。', obstacle: '原谅 vs 愤怒。', entry: '冷', exit: '不原谅但放下愤怒' },
  { i: 22, act: a3, title: '苏曼独自',     loc: '陈牧家客厅',   time: '深夜', chars: [charC_id],            purpose: 'B 走后，苏曼一个人坐在空房子里。', obstacle: '空房子里的回响。', entry: '空', exit: '决定重新开始' },
  { i: 23, act: a3, title: '父亲下葬',     loc: '小镇墓园',     time: '清晨', chars: [charA_id],            purpose: '送父亲最后一程。', obstacle: '原谅父亲 vs 怨他。', entry: '克制', exit: '原谅' },
  { i: 24, act: a3, title: '妹妹衣冠冢',   loc: '小镇墓园',     time: '清晨', chars: [charA_id],            purpose: '她在妹妹衣冠冢前坐了很久。', obstacle: '十年的愧疚。', entry: '空', exit: '可以离开' },
  { i: 25, act: a3, title: '离开小镇',     loc: '小镇渡口',     time: '黄昏', chars: [charA_id],            purpose: '弧光收尾：与开场对位，她独自上船。', obstacle: '没有人来送。', entry: '宁静', exit: '前路开阔' }
];

const cardId = (i) => `card_${stamp}_${String(i).padStart(2, '0')}`;
const sceneId = (i) => `scene_${stamp}_${String(i).padStart(2, '0')}`;
populated.plot_board.cards = beats.map((b) => ({
  id: cardId(b.i),
  act_id: b.act, node_id: '',
  lane_id: 'lane_main', lane_kind: 'canonical_mainline',
  title: b.title, type: 'mainline', status: 'locked',
  summary: b.purpose, conflict: b.obstacle, change: '',
  character_ids: b.chars,
  order_index: b.i * 10
}));

populated.scene_workbench.scenes = beats.map((b) => ({
  id: sceneId(b.i),
  order_index: b.i,
  title: b.title, act_id: b.act,
  linked_plot_card_ids: [cardId(b.i)],
  pov_character_id: b.chars[0],
  location: b.loc, time_of_day: b.time,
  purpose: b.purpose, obstacle: b.obstacle,
  beat_summary: '', entry_state: b.entry, exit_state: b.exit,
  status: 'draft', script_excerpt: '', script_full: '', screenplay_notes: '', notes: ''
}));

// 故意打乱 act 1 内最后两卡的 order，让 UI 排序来纠正
const a1Cards = populated.plot_board.cards.filter(c => c.act_id === a1);
if (a1Cards.length >= 2) {
  const last = a1Cards[a1Cards.length - 1];
  const secondLast = a1Cards[a1Cards.length - 2];
  // 交换
  const tmp = last.order_index;
  last.order_index = secondLast.order_index;
  secondLast.order_index = tmp;
  console.log(`[排序故意打乱] 卡 ${last.id}(${last.title}) 与 ${secondLast.id}(${secondLast.title}) 顺序对调`);
}

populated.story_bible.world_rules = [
  { id: `r1_${stamp}`, rule_statement: '小镇所有人都互相认识，任何调查都会立刻传开。', scope: '社会层', rule_level: 'hard', exceptions: ['外来者前 24 小时不会被察觉'] },
  { id: `r2_${stamp}`, rule_statement: '陈牧在小镇有相当政治资源，公开对抗他需要不可反驳的证据。', scope: '政治层', rule_level: 'hard', exceptions: [] }
];
populated.story_bible.timeline_events = [
  { id: `tl1_${stamp}`, story_day: 1, sequence_index: 1, summary: '林知夏回到小镇', participants: [charA_id], location: '渡口', trigger: '父亲病危', consequence: '与陈牧重逢' },
  { id: `tl2_${stamp}`, story_day: 1, sequence_index: 2, summary: '发现录音笔', participants: [charA_id], location: '父亲卧室', trigger: '整理遗物', consequence: '怀疑陈牧' },
  { id: `tl3_${stamp}`, story_day: 2, sequence_index: 3, summary: '阿珍说出当年看见的事', participants: [charA_id, charE_id], location: '理发店', trigger: '逼问', consequence: '获得关键证人' },
  { id: `tl4_${stamp}`, story_day: 2, sequence_index: 4, summary: '老周交出尸检备忘', participants: [charA_id, charF_id], location: '老法医家', trigger: '坚持', consequence: '握有铁证' },
  { id: `tl5_${stamp}`, story_day: 2, sequence_index: 5, summary: '水坝雨夜对峙', participants: [charA_id, charB_id], location: '水坝下', trigger: '逼问', consequence: '陈牧承认见过妹妹' },
  { id: `tl6_${stamp}`, story_day: 3, sequence_index: 6, summary: '镇政府台阶公开揭穿', participants: [charA_id, charB_id], location: '镇政府', trigger: '放录音 + 备忘', consequence: '陈牧被带走' }
];
populated.story_bible.setup_payoffs = [
  { id: `sp1_${stamp}`, setup_summary: '父亲遗物里的录音笔', setup_scene_id: sceneId(3), expected_payoff_window: 'Act3', status: 'planted', payoff_scene_id: sceneId(20), payoff_summary: '在镇政府台阶公开播放' },
  { id: `sp2_${stamp}`, setup_summary: '林知夏当年签的「放弃寻找」声明', setup_scene_id: sceneId(15), expected_payoff_window: 'Act3', status: 'planted', payoff_scene_id: sceneId(21), payoff_summary: '与陈牧最后对话中提到' },
  { id: `sp3_${stamp}`, setup_summary: '老周保留的尸检备忘', setup_scene_id: sceneId(12), expected_payoff_window: 'Act3', status: 'planted', payoff_scene_id: sceneId(20), payoff_summary: '台阶上播放片段' }
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
console.log('✓ 项目已填充：25 场 + 25 卡 + 6 人 + 6 时间线 + 2 规则 + 3 伏笔');

// =========================================================
// STAGE 2：UI 中真的排序（前移/后移）
// =========================================================
console.log('\n=== STAGE 2: UI 排序实操 ===');
const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
const page = await ctx.newPage();
page.on('pageerror', e => note('HIGH', 'PD', 'browser', e.message));

await page.goto(BASE); await w(2000);
await page.locator(`[data-action="open-project"][data-id="${pid}"]`).first().click(); await w(1500);
await page.locator(`#stepper-nav .step-button[data-id="plots"]`).click(); await w(800);
await page.screenshot({ path: path.join(SHOTS, '01-plots-disordered.png'), fullPage: true });

// 选最后被对调的卡（在 a1 里排错位置的那张）
const a1MisorderedCardId = populated.plot_board.cards.filter(c => c.act_id === a1).slice(-1)[0].id;
console.log(`排错位置的卡 id: ${a1MisorderedCardId}`);
const beforeSort = await page.evaluate((cardId) => {
  // 找该卡的 DOM 顺序（在 act 1 内的位置）
  const cards = Array.from(document.querySelectorAll('[data-action="select-plot-card"]'));
  return cards.map(c => c.dataset.id || '');
}, a1MisorderedCardId);
console.log('UI 排序（前 8 张）:', beforeSort.slice(0, 8));

// 点击该卡 → 然后点「前移」按钮把它移回正确位置
await page.evaluate((cardId) => {
  const card = document.querySelector(`[data-action="select-plot-card"][data-id="${cardId}"]`);
  if (card) card.click();
}, a1MisorderedCardId);
await w(400);

const clicked = await page.evaluate((cardId) => {
  const btn = document.querySelector(`button[data-action="move-plot-card-position"][data-id="${cardId}"][data-direction="-1"]`);
  if (!btn) return false;
  btn.click();
  return true;
}, a1MisorderedCardId);
if (!clicked) {
  note('HIGH', 'PD', '排序', '找不到「前移」按钮');
} else {
  await w(500);
  await page.screenshot({ path: path.join(SHOTS, '02-plots-after-move.png'), fullPage: true });
  // 验证 DOM 顺序变了
  const afterSort = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[data-action="select-plot-card"]'));
    return cards.map(c => c.dataset.id || '');
  });
  console.log('UI 排序（前 8 张, 操作后）:', afterSort.slice(0, 8));
  if (JSON.stringify(beforeSort.slice(0, 8)) === JSON.stringify(afterSort.slice(0, 8))) {
    note('HIGH', 'PD', '排序', 'UI「前移」按钮未改变实际显示顺序');
  } else {
    console.log('✓ UI 排序生效（前移按钮改变了显示顺序）');
  }
}

// =========================================================
// STAGE 3：进入剧本撰写 + 批量生成 25 场
// =========================================================
console.log('\n=== STAGE 3: AI 批量生成 25 场（预估 12-20 分钟）===');
await page.locator(`#stepper-nav .step-button[data-id="screenplay"]`).click(); await w(800);
await page.screenshot({ path: path.join(SHOTS, '03-before-bulk.png'), fullPage: true });

const sceneCountUI = await page.locator('.screenplay-scene-item').count();
console.log(`UI 显示场景数：${sceneCountUI}`);
if (sceneCountUI !== 25) note('HIGH', 'PD', '剧本撰写', `期望 25 场实际 ${sceneCountUI}`);

let apiErrors = 0;
page.on('response', resp => {
  if (resp.url().includes('/api/generate') && resp.status() >= 400) apiErrors++;
});

await page.evaluate(() => { window.confirm = () => true; });
await page.locator('button[data-action="ai-write-screenplay-bulk"]').click();

const start = Date.now();
const MAX_WAIT = 30 * 60 * 1000;  // 30 分钟
let lastDone = -1;
while (Date.now() - start < MAX_WAIT) {
  await w(15000);
  const state = await page.evaluate(() => {
    const btn = document.querySelector('button[data-action="ai-write-screenplay-bulk"]');
    const items = Array.from(document.querySelectorAll('.screenplay-scene-item__status')).map(e => e.textContent?.trim() || '');
    return { btnText: btn?.textContent?.trim() || '', statuses: items };
  });
  const done = state.statuses.filter(s => s === '已成稿').length;
  const draft = state.statuses.filter(s => s === '草稿').length;
  const empty = state.statuses.filter(s => s === '未撰写').length;
  const elapsed = Math.round((Date.now() - start) / 1000);
  console.log(`[${elapsed}s] ${state.btnText} · 成稿 ${done} 草稿 ${draft} 未撰 ${empty}`);
  if (done !== lastDone) {
    await page.screenshot({ path: path.join(SHOTS, `04-progress-${String(done).padStart(2, '0')}.png`), fullPage: true });
    lastDone = done;
  }
  if (!state.btnText.includes('批量中')) { console.log('✓ 批量结束'); break; }
}
await page.screenshot({ path: path.join(SHOTS, '05-after-bulk.png'), fullPage: true });
if (apiErrors > 0) note('HIGH', 'PD', 'API', `批量过程出现 ${apiErrors} 次错误`);

// =========================================================
// STAGE 4：导出 + 校验体量
// =========================================================
console.log('\n=== STAGE 4: 导出 + 体量校验 ===');
const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
await page.locator('button[data-action="export-screenplay-fountain"]').click();
const download = await downloadPromise;
const fountainPath = path.join(SHOTS, '小镇七十二小时-v6.fountain');
if (!download) {
  note('HIGH', 'PD', '导出', '下载未触发');
} else {
  await download.saveAs(fountainPath);
}

const finalProject = (await api('GET', `/api/projects/${encodeURIComponent(pid)}`)).j.project;
const scenes = (finalProject.scene_workbench?.scenes ?? [])
  .slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
const lengths = scenes.map(s => (s.script_full || '').length);
const total = lengths.reduce((a, b) => a + b, 0);
const pages = Math.ceil(total / 250);
const written = scenes.filter(s => (s.script_full || '').length > 300).length;

console.log(`\n--- 体量统计 ---`);
console.log(`场景数：${scenes.length}`);
console.log(`成稿率：${written}/${scenes.length}`);
console.log(`总字数：${total}`);
console.log(`估算页数：${pages}（电影标准 90-120 页）`);
console.log(`场景长度分布：`);
const buckets = { short: 0, normal: 0, big: 0 };
lengths.forEach(l => {
  if (l < 500) buckets.short++;
  else if (l < 1000) buckets.normal++;
  else buckets.big++;
});
console.log(`  · 短 (<500): ${buckets.short}`);
console.log(`  · 中 (500-1000): ${buckets.normal}`);
console.log(`  · 长 (≥1000): ${buckets.big}`);

if (pages < 80) note('HIGH', 'SW', '体量', `仅 ${pages} 页，未达 90 分钟电影最低 80 页`);
else if (pages > 130) note('MEDIUM', 'SW', '体量', `${pages} 页超出标准电影长度`);
else console.log('✓ 体量符合 90 分钟电影标准');

// 人物名一致性 + slug 检查
let okNames = 0, okSlug = 0;
scenes.forEach(s => {
  const card = (finalProject.plot_board?.cards ?? []).find(c => (s.linked_plot_card_ids || []).includes(c.id));
  const expected = (card?.character_ids ?? []).map(cid => (finalProject.character_hub?.characters ?? []).find(c => c.id === cid)?.name).filter(Boolean);
  const allFound = expected.every(name => (s.script_full || '').includes(name));
  if (allFound) okNames++;
  if (/^(INT\.|EXT\.)/m.test(s.script_full || '')) okSlug++;
});
console.log(`人物一致性: ${okNames}/${scenes.length}`);
console.log(`slug 合规: ${okSlug}/${scenes.length}`);
if (okNames < scenes.length) note('HIGH', 'SW', '人物', `仅 ${okNames}/${scenes.length} 场含全部出场人物名`);

// fountain 校验
if (download && fs.existsSync(fountainPath)) {
  const fountain = fs.readFileSync(fountainPath, 'utf-8');
  const slugs = (fountain.match(/^(INT\.|EXT\.)[^\n]*/gm) || []);
  console.log(`\n.fountain ${fountain.length} 字 · ${fountain.split('\n').length} 行 · slug ${slugs.length} 条`);
}

// =========================================================
// 报告
// =========================================================
console.log('\n========== 真实检查 v6 最终报告 ==========');
console.log(`观察数：${OBS.length}`);
const bySev = OBS.reduce((m, o) => { m[o.sev] = (m[o.sev] || 0) + 1; return m; }, {});
console.log(`严重度: ${JSON.stringify(bySev)}`);
for (const o of OBS) console.log(`  [${o.sev}] [${o.who}] [${o.where}] ${o.msg}`);

console.log(`\n剧本产出：`);
console.log(`  · 场景数：${scenes.length}`);
console.log(`  · 总字数：${total}`);
console.log(`  · 估算页数：${pages}`);
console.log(`  · 成稿率：${written}/${scenes.length}`);
console.log(`  · 人物一致：${okNames}/${scenes.length}`);
console.log(`  · slug 合规：${okSlug}/${scenes.length}`);
console.log(`\n产出：${fountainPath}`);

fs.writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify({
  observations: OBS, total, pages, written, okNames, okSlug,
  scenes: scenes.map(s => ({ order: s.order_index, title: s.title, length: (s.script_full || '').length }))
}, null, 2));

await browser.close();
console.log(`\n[未清理] 项目 ${pid} 已保留供人工评审。`);
