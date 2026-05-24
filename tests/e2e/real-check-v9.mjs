// 真实检查 v9 — 修 v7 的 6 个观感问题：
//   1) 结构骨架页：填 ending_direction + 每幕 act-field title + 每节点 note
//   2) 人物核心：删 starter + 添 6 个真实人物，填**全部**字段（含 notes）
//   3) 关系张力：补 status / power_balance / hidden_information
//   4) 剧情开发：用 plot-position-field 把卡分到 3 个幕，不再堆第一幕
//   5) 场景拆解：填 pov_character_id / linked_plot_card_ids / beat_summary / status
//   6) 剧本撰写：删除 starter 「主角」避免 AI 用替代名

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import http from 'http';

const BASE = 'http://127.0.0.1:4173';
const SHOTS = 'E:/CC/code/yuandian-screenwriting-system/tests/e2e/real-check-shots/v9';
fs.mkdirSync(SHOTS, { recursive: true });

const OBS = [];
const note = (sev, who, where, msg) => {
  OBS.push({ sev, who, where, msg });
  console.log(`[${sev}] [${who}] [${where}] ${msg}`);
};
function api(m, p, b) {
  return new Promise((res) => {
    const d = b ? JSON.stringify(b) : null;
    const req = http.request(BASE + p, { method: m, headers: { 'content-type': 'application/json', ...(d ? { 'content-length': Buffer.byteLength(d) } : {}) } }, r => {
      let buf=''; r.on('data',c=>buf+=c); r.on('end',()=>{try{res({s:r.statusCode,j:JSON.parse(buf)})}catch(e){res({s:r.statusCode,raw:buf.slice(0,200)})}});
    });
    if (d) req.write(d); req.end();
  });
}
const w = (ms) => new Promise(r => setTimeout(r, ms));

async function fillField(page, action, fieldName, value) {
  const sel = `[data-action="${action}"][data-field="${fieldName}"]`;
  const found = await page.evaluate((args) => {
    const [s, v] = args;
    const el = document.querySelector(s);
    if (!el) return false;
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, [sel, value]);
  if (!found) note('MEDIUM', 'PD', '字段缺失', `${action}/${fieldName}`);
  return found;
}

// 通过 data-id 定位特定行的字段（例如 act-field/title 对应某幕）
async function fillFieldWithId(page, action, fieldName, dataId, value) {
  const sel = `[data-action="${action}"][data-field="${fieldName}"][data-id="${dataId}"]`;
  return await page.evaluate((args) => {
    const [s, v] = args;
    const el = document.querySelector(s);
    if (!el) return false;
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, [sel, value]);
}

async function clickById(page, action, id = null) {
  const sel = id ? `[data-action="${action}"][data-id="${id}"]` : `[data-action="${action}"]`;
  return await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    el.click();
    return true;
  }, sel);
}

// ===== 启动 =====
const created = await api('POST', '/api/projects', {
  title: '小镇七十二小时（v9 UI 真填）',
  format: 'feature',
  genre: ['悬疑', '剧情'],
  logline: '一名退役刑警在故乡小镇遇到一桩与自己往事有关的失踪案，必须在七十二小时内揭穿真相。',
  theme_question: '当真相会摧毁你所爱的人，你还要查下去吗？',
  tone: '冷峻、克制、潮湿的小镇质感'
});
const projectId = created.j.project.project.id;
console.log('项目:', projectId);

const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on('pageerror', e => note('HIGH', 'PD', 'browser', e.message));
page.on('dialog', async d => { await d.accept(); });

await page.goto(BASE); await w(2000);
await page.locator(`[data-action="open-project"][data-id="${projectId}"]`).first().click();
await w(1500);

// =========================================================
// STAGE 1：结构骨架 — 填 ending_direction + 每幕 title + 每节点 note
// =========================================================
console.log('\n=== STAGE 1: 结构骨架 ===');
await page.locator('#stepper-nav .step-button[data-id="structure"]').click(); await w(800);

await fillField(page, 'story-core-field', 'ending_direction', 'tragic_redemption');

const project1 = (await api('GET', `/api/projects/${projectId}`)).j.project;
const acts = project1.structure_profile?.acts ?? [];
const nodes = project1.structure_profile?.nodes ?? [];
console.log(`默认结构：${acts.length} 幕 / ${nodes.length} 节点`);

// 5 幕都有标题
const actTitles = ['幕一 · 召唤与入局', '幕二上 · 调查推进', '幕二下 · 黑暗时刻', '幕三 · 真相浮出', '尾声 · 离开'];
for (let i = 0; i < acts.length && i < actTitles.length; i++) {
  await fillFieldWithId(page, 'act-field', 'title', acts[i].id, actTitles[i]);
  await w(80);
}

// 全部 11 个节点都填 note（按 node_type / key）
const nodeNotes = {
  opening_image: '黄昏渡口，林知夏戴口罩低头登岸。船尾褪色的红绳。',
  setup: '小镇是个所有人互相认识的地方。林父弥留中、阿珍闪躲、陈牧高调相迎。',
  catalyst: '父亲弥留时让她回家找箱子最底的东西 — 一支老式录音笔。',
  lock_in: '录音笔最后一段录音里有陈牧的声音。她决定查下去。',
  promise: '阿珍崩溃说出当年在小卖部窗口看到陈牧带妹妹去水坝。',
  midpoint: '水坝雨夜对峙。陈牧第一次承认见过妹妹但拒说去向。',
  reversal: '林知夏翻出当年自己签的"放弃寻找"声明 — 她也是共谋。',
  collapse: '苏曼主动上门请求 A 给所有人一个交代；老周交出未上报的尸检备忘。',
  final_choice: '镇政府台阶正午，A 当众放出录音 + 备忘。陈牧崩溃。',
  finale: '陈牧在派出所门口承认意外细节；A 不原谅但放下愤怒。',
  aftershock: '渡口清晨，与开场对位。她独自上船离开。'
};
for (const node of nodes) {
  const note_ = nodeNotes[node.node_type] || nodeNotes[node.key];
  if (note_) {
    await fillFieldWithId(page, 'node-field', 'note', node.id, note_);
    await w(80);
  }
}
await w(2000);  // autosave
await page.screenshot({ path: path.join(SHOTS, '01-structure.png'), fullPage: true });

// =========================================================
// STAGE 2：人物 — 删 starter，添 6 个，填完整字段
// =========================================================
console.log('\n=== STAGE 2: 人物核心 ===');
await page.locator('#stepper-nav .step-button[data-id="characters"]').click(); await w(800);

// 删除 starter「主角」
const starterCharId = (await api('GET', `/api/projects/${projectId}`)).j.project.character_hub.characters[0]?.id;
if (starterCharId) {
  await clickById(page, 'select-character', starterCharId); await w(200);
  await clickById(page, 'delete-character', starterCharId); await w(400);
  console.log('  删除 starter 角色');
}

const characters = [
  { name: '林知夏', story_role: 'protagonist', mbti: 'INTJ', drive: '安全感',
    external_goal: '查清十年前妹妹失踪案的真相',
    dramatic_need: '原谅当年放弃寻找的自己，承担揭穿真相的代价',
    contradiction: '一边痛恨陈牧的体面，一边发现自己当年也签了「放弃寻找」声明 — 共谋的羞耻让她每一步都要先过自己这关',
    pressure_point: '当真相会摧毁父亲的名声 + 整个小镇对她家的同情时，她会不会停下？',
    starting_mask: '冷静、克制、不主动牵扯任何人的前刑警',
    arc_start: '抗拒回到小镇，刻意保持距离',
    arc_end: '主动承担挖出真相的全部代价 — 包括承认自己',
    secret: '当年妹妹失踪满六个月时，是她亲手在「放弃寻找」声明上签的字。',
    notes: '语言节奏：少话，停顿多，句尾下沉。极少用感叹号。'
  },
  { name: '陈牧', story_role: 'antagonist', mbti: 'ESTJ', drive: '权力',
    external_goal: '把当年的事永远埋住，顺利当选镇长',
    dramatic_need: '面对自己当年的怯懦与失手 — 那不是意外，是恐惧',
    contradiction: '把控制当作爱 — 把所有人安排得体面，但自己午夜酗酒；越是被林知夏靠近，越用力维持温和',
    pressure_point: '被林知夏看穿，被苏曼看穿，被自己看穿',
    starting_mask: '热情、温和、人人称道的小镇副镇长',
    arc_start: '体面的副镇长，刚拿到镇长候选提名',
    arc_end: '在派出所门口承认意外伤害，走向毁灭',
    secret: '当年妹妹失踪那天，他和妹妹在水坝玩闹，妹妹滑入水中他没下去救而是慌乱离开。',
    notes: '语言节奏：语调平稳，句尾下沉，喜欢用"咱们"。'
  },
  { name: '苏曼', story_role: 'supporting', mbti: 'ISFJ', drive: '归属感',
    external_goal: '保护现在的家庭和女儿不被旧事波及',
    dramatic_need: '承认自己也是受害者，不再做沉默的同谋',
    contradiction: '把沉默当成对女儿的爱 — 但她知道沉默正在把女儿变成另一个共谋',
    pressure_point: '女儿长大后听到当年的事',
    starting_mask: '陈牧体面的妻子，社区里温柔的形象',
    arc_start: '维持表面的平静',
    arc_end: '主动去找林知夏，请求她给所有人一个交代',
    secret: '婚后她从来没有问过陈牧那天到底发生了什么 — 她不敢问。',
    notes: '克制，少表情，习惯做家务时停顿。'
  },
  { name: '林父', story_role: 'supporting', mbti: 'ISTJ', drive: '成就感',
    external_goal: '把当年保留的尸检备忘和真相托付给女儿',
    dramatic_need: '在弥留前请求女儿原谅自己当年的妥协',
    contradiction: '一辈子的刑警，最关键的一案选择了妥协 — 那是他至死的羞耻',
    pressure_point: '带着秘密死去',
    starting_mask: '退休的老刑警，沉默寡言',
    arc_start: '愧疚地活着',
    arc_end: '把"老周"的名字和遗物里的录音笔交给女儿',
    secret: '当年的尸检备忘他私下保留了一份，藏在五斗柜第二格抽屉下面。',
    notes: '弥留中说话气息短，断句多。'
  },
  { name: '阿珍', story_role: 'supporting', mbti: 'ENFP', drive: '生理需求',
    external_goal: '把心里压着的事讲出来',
    dramatic_need: '不再做共谋，承认当年看见的事',
    contradiction: '想说但怕被报复 — 理发店开在镇中心，每天都见到陈牧的人',
    pressure_point: '家人被牵连 / 店被砸',
    starting_mask: '小镇理发店老板娘，语速快爱聊天',
    arc_start: '欲言又止',
    arc_end: '在第二次深谈中崩溃说出当年看到陈牧带妹妹去水坝',
    secret: '当年那天她在小卖部窗口看见陈牧拉着妹妹的手往水坝方向走。',
    notes: '语速快，断句多，话题跳。'
  },
  { name: '老周', story_role: 'supporting', mbti: 'ISTP', drive: '安全感',
    external_goal: '保住退休金 + 不被翻旧账',
    dramatic_need: '把当年那份未上报的备忘交出去',
    contradiction: '冷漠的自保 — 但他知道再不交，这事就真的烂在棺材里了',
    pressure_point: '被翻旧账',
    starting_mask: '退休法医，冷淡专业',
    arc_start: '关门拒访',
    arc_end: '深夜交出当年的尸检备忘',
    secret: '当年的尸检他做了两份记录，一份按陈家施压的内容报上去，另一份藏起来。',
    notes: '语气冷淡，专业术语少而准。'
  }
];

for (let i = 0; i < characters.length; i++) {
  const c = characters[i];
  console.log(`  [${i + 1}/6] ${c.name}`);
  await clickById(page, 'add-character'); await w(400);
  // 普通文本字段（排除 mbti / drive，那两个是 chip click）
  for (const [field, value] of Object.entries(c)) {
    if (field === 'mbti' || field === 'drive') continue;
    await fillField(page, 'character-field', field, value);
    await w(70);
  }
  // 点击 MBTI chip
  if (c.mbti) {
    await page.evaluate((v) => document.querySelector(`[data-action="select-char-mbti"][data-id="${v}"]`)?.click(), c.mbti);
    await w(120);
  }
  // 点击马斯洛 drive chip
  if (c.drive) {
    await page.evaluate((v) => document.querySelector(`[data-action="select-char-drive"][data-id="${v}"]`)?.click(), c.drive);
    await w(120);
  }
  await w(200);
}
await w(2500);
await page.screenshot({ path: path.join(SHOTS, '02-characters.png'), fullPage: true });

// =========================================================
// STAGE 3：关系 — 4 条，含全字段
// =========================================================
console.log('\n=== STAGE 3: 关系张力 ===');
await page.locator('#stepper-nav .step-button[data-id="relationships"]').click(); await w(800);

const fresh = (await api('GET', `/api/projects/${projectId}`)).j.project;
const findChar = (n) => fresh.character_hub.characters.find(c => c.name === n);
const rels = [
  { src: findChar('林知夏'), tgt: findChar('陈牧'),
    type: '童年挚友 / 怀疑对象', status: 'cold_truce',
    tension: '一边是追查真相，一边是十年前的共同童年',
    power_balance: '陈牧在小镇有政治资源 / 林知夏有刑警背景 + 一手证据',
    shared_history: '小学到中学同班，妹妹失踪当晚陈牧是最后一个见过她的人之一。',
    hidden_information: '陈牧不知道林知夏已经拿到了父亲保留的尸检备忘；林知夏不知道陈牧近年酗酒到失眠。' },
  { src: findChar('陈牧'), tgt: findChar('苏曼'),
    type: '夫妻', status: 'cold_truce',
    tension: '婚后两人共同维持的沉默，正在把这个家变成另一个秘密',
    power_balance: '表面平等，但陈牧掌控家庭对外形象 + 经济决策',
    shared_history: '相亲认识，婚后未再谈过当年的事。',
    hidden_information: '苏曼其实知道当年大致经过 — 她假装不知道。' },
  { src: findChar('林知夏'), tgt: findChar('林父'),
    type: '父女', status: 'reconciling',
    tension: '父亲当年签字放弃寻找 — 这是她离开小镇十年的真正原因',
    power_balance: '父亲弥留期反而把主动权递给了女儿',
    shared_history: '童年她崇拜父亲，妹妹失踪那年她跟父亲大吵 — 十年没回家。',
    hidden_information: '林知夏直到看到录音笔，才知道父亲一直在偷偷追查。' },
  { src: findChar('林知夏'), tgt: findChar('阿珍'),
    type: '童年同学', status: 'reconnecting',
    tension: '阿珍知道一件十年没说的事；说了会被陈牧的人盯上',
    power_balance: '阿珍占有信息，林知夏占有保护承诺',
    shared_history: '小学同班，妹妹失踪那天阿珍在小卖部柜台。',
    hidden_information: '阿珍那天看到的角度，正好对着水坝方向。' }
];

for (let i = 0; i < rels.length; i++) {
  const r = rels[i];
  console.log(`  [${i + 1}/4] ${r.type}`);
  await clickById(page, 'add-relationship'); await w(400);
  if (r.src) await fillField(page, 'relationship-field', 'source_character_id', r.src.id);
  if (r.tgt) await fillField(page, 'relationship-field', 'target_character_id', r.tgt.id);
  await fillField(page, 'relationship-field', 'relationship_type', r.type);
  await fillField(page, 'relationship-field', 'tension', r.tension);
  await fillField(page, 'relationship-field', 'power_balance', r.power_balance);
  await fillField(page, 'relationship-field', 'shared_history', r.shared_history);
  await fillField(page, 'relationship-field', 'hidden_information', r.hidden_information);
  await w(200);
}
await w(2500);
await page.screenshot({ path: path.join(SHOTS, '03-relationships.png'), fullPage: true });

// =========================================================
// STAGE 4：剧情卡 — 用 plot-position-field 按幕分配
// =========================================================
console.log('\n=== STAGE 4: 剧情开发 ===');
await page.locator('#stepper-nav .step-button[data-id="plots"]').click(); await w(800);

// 按节点类型查询 node_id（每个 node 由 node_type 标识）
const actIds = acts.map(a => a.id);
const nodeByType = {};
nodes.forEach(n => { nodeByType[n.node_type] = n.id; });

// 取最新 character 数据，便于把 chars name → id 转换
const charsForPlot = (await api('GET', `/api/projects/${projectId}`)).j.project.character_hub.characters;
const charIdByName = (n) => charsForPlot.find(c => c.name === n)?.id;

// 每张卡指定它对应的剧作 nodeKey（按 5-act / Save the Cat 的节点功能匹配）
const plotSpecs = [
  // 幕一
  { nodeKey: 'opening_image', title: '回到小镇',     chars: ['林知夏','陈牧'],         summary: '林知夏因父亲病危回到阔别十年的小镇。',                                  conflict: '不愿见陈牧，被高调相迎。',         change: '从抗拒转为被迫停留。' },
  { nodeKey: 'setup',         title: '医院走廊',     chars: ['林知夏','林父'],         summary: '林知夏见弥留的父亲，父亲示意她回家找箱子最底的东西。',                  conflict: '父亲气息短话不清，旁边护士在场。', change: '心生疑惑。' },
  { nodeKey: 'setup',         title: '理发店传言',   chars: ['林知夏','阿珍'],         summary: '阿珍口中陈牧近年的体面 + 一丝异样。',                                  conflict: '阿珍欲言又止。',                   change: '决心调查。' },
  { nodeKey: 'setup',         title: '父亲家访客',   chars: ['林知夏','陈牧'],         summary: '陈牧主动送白菊登门邀晚饭。',                                          conflict: '表面寒暄，桌下试探。',             change: '答应赴约。' },
  { nodeKey: 'catalyst',      title: '父亲卧室',     chars: ['林知夏'],                 summary: '深夜整理遗物，发现妹妹失踪当日的录音笔，最后一段录音里有陈牧的声音。', conflict: '录音笔老化，关键段噪声大。',       change: '怀疑陈牧。' },
  { nodeKey: 'lock_in',       title: '陈牧家晚饭',   chars: ['林知夏','陈牧','苏曼'],   summary: '三人桌下暗战，苏曼第一次起疑。',                                      conflict: '所有话不能直说。',                 change: '心照不宣。' },
  { nodeKey: 'lock_in',       title: '医院告别',     chars: ['林知夏','林父'],         summary: '父亲临终把"老周"的名字交给她。',                                       conflict: '父亲只剩最后一口气。',             change: '父亲去世。' },
  // 幕二上
  { nodeKey: 'promise',       title: '理发店深谈',   chars: ['林知夏','阿珍'],         summary: '阿珍崩溃说看到陈牧带妹妹去水坝。',                                    conflict: '阿珍害怕被报复。',                 change: '确信。' },
  { nodeKey: 'promise',       title: '水边踩点',     chars: ['林知夏'],                 summary: 'A 独自勘查当年现场。',                                                conflict: '线索模糊。',                       change: '心底动摇。' },
  // 中点
  { nodeKey: 'midpoint',      title: '镇政府远观',   chars: ['林知夏','陈牧'],         summary: '远远看到陈牧风光发表演讲。',                                          conflict: '不能正面挑衅。',                   change: '愤怒压不住。' },
  { nodeKey: 'midpoint',      title: '找老周',       chars: ['林知夏','老周'],         summary: 'A 在老周门口等了 3 小时。',                                          conflict: '老周关门。',                       change: '撬开一条缝。' },
  { nodeKey: 'midpoint',      title: '老周交备忘',   chars: ['林知夏','老周'],         summary: '老周交出当年未上报的尸检备忘。',                                      conflict: '老周要求不提自己。',               change: '握有铁证。' },
  { nodeKey: 'midpoint',      title: '夜里复印',     chars: ['林知夏'],                 summary: 'A 复印备忘并把原件藏起。',                                            conflict: '没人能帮她保管。',                 change: '战术明确。' },
  // 幕二下
  { nodeKey: 'reversal',      title: '水坝雨夜对峙', chars: ['林知夏','陈牧'],         summary: '雨夜把陈牧约到现场出录音笔。',                                        conflict: '陈牧不肯承认去向。',               change: '陈牧承认见过。' },
  { nodeKey: 'reversal',      title: '父亲遗物抽屉', chars: ['林知夏'],                 summary: 'A 翻出当年自己签的"放弃寻找"声明 — 自我审判。',                       conflict: '她意识到自己也是共谋。',           change: '羞耻、动摇。' },
  { nodeKey: 'collapse',      title: '雨中独行',     chars: ['林知夏'],                 summary: '失神时刻，她想过放弃。',                                              conflict: '内心的引诱。',                     change: '重新站起。' },
  { nodeKey: 'collapse',      title: '苏曼来访',     chars: ['林知夏','苏曼'],         summary: '苏曼悄悄上门请求 A 给所有人一个交代。',                              conflict: '苏曼也怕，但更怕女儿长大听到。',   change: '获得同盟。' },
  { nodeKey: 'collapse',      title: '陈牧的恐惧',   chars: ['陈牧','苏曼'],           summary: '陈牧家书房，他酗酒被苏曼撞见。',                                      conflict: 'B 不愿承认自己崩溃。',             change: '裂痕清晰。' },
  // 幕三
  { nodeKey: 'final_choice',  title: '镇政府台阶',   chars: ['林知夏','陈牧','苏曼'],   summary: 'A 公开放出录音 + 备忘片段，陈牧当众崩溃。',                          conflict: '陈牧拥护者阻拦。',                 change: '颜面碎裂。' },
  { nodeKey: 'finale',        title: '警车前五分钟', chars: ['林知夏','陈牧'],         summary: '陈牧被带走前承认意外细节。',                                          conflict: '原谅 vs 愤怒。',                   change: '放下愤怒。' },
  { nodeKey: 'aftershock',    title: '渡口离开',     chars: ['林知夏'],                 summary: '与开场对位，她独自上船。',                                            conflict: '没有人来送。',                     change: '可以离开。' }
];

const createdCardIds = [];
for (let i = 0; i < plotSpecs.length; i++) {
  const c = plotSpecs[i];
  if (i % 5 === 0) console.log(`  [${i + 1}/${plotSpecs.length}] ${c.title} → ${c.nodeKey}`);
  // 点对应节点的「+」按钮（pgrid-add-stub 自带 data-node-id / data-act-id）
  const targetNodeId = nodeByType[c.nodeKey];
  const clicked = await page.evaluate((nid) => {
    const btn = document.querySelector(`[data-action="add-plot-card"][data-node-id="${nid}"]`);
    if (btn) { btn.click(); return true; }
    // 兜底：通用按钮
    const fallback = document.querySelector('[data-action="add-plot-card"]:not([data-node-id])') ||
                     document.querySelector('[data-action="add-plot-card"]');
    if (fallback) { fallback.click(); return 'fallback'; }
    return false;
  }, targetNodeId);
  if (clicked === false) { note('HIGH', 'PD', '剧情卡', `${c.title}: 找不到对应节点 ${c.nodeKey} 的 + 按钮`); continue; }
  await w(280);
  const newId = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[data-action="select-plot-card"]'));
    return cards.length > 0 ? cards[cards.length - 1].dataset.id : null;
  });
  if (newId) createdCardIds.push(newId);
  await fillField(page, 'plot-field', 'title', c.title);
  await fillField(page, 'plot-field', 'summary', c.summary);
  await fillField(page, 'plot-field', 'conflict', c.conflict);
  await fillField(page, 'plot-field', 'change', c.change);
  // 勾选影响角色（plot-character-toggle）
  for (const charName of c.chars) {
    const cid = charIdByName(charName);
    if (!cid) continue;
    await page.evaluate((charId) => {
      const cb = document.querySelector(`[data-action="plot-character-toggle"][data-id="${charId}"]`);
      if (cb && !cb.checked) cb.click();
    }, cid);
    await w(60);
  }
  // 锁定状态
  await page.evaluate(() => document.querySelector('[data-action="toggle-plot-lock"]')?.click());
  await w(100);
}
await w(2500);
await page.screenshot({ path: path.join(SHOTS, '04-plots.png'), fullPage: true });

// =========================================================
// STAGE 5：场景 — 删 starter，填全字段 + 关联卡片
// =========================================================
console.log('\n=== STAGE 5: 场景拆解 ===');
await page.locator('#stepper-nav .step-button[data-id="scenes"]').click(); await w(800);

// 删 starter 场景
const starterScene = (await api('GET', `/api/projects/${projectId}`)).j.project.scene_workbench.scenes[0];
if (starterScene) {
  await clickById(page, 'select-scene', starterScene.id); await w(200);
  await clickById(page, 'delete-scene', starterScene.id); await w(400);
  console.log('  删除 starter 场景');
}

const charsAfter = (await api('GET', `/api/projects/${projectId}`)).j.project.character_hub.characters;
const findCharId = (n) => charsAfter.find(c => c.name === n)?.id;
const sceneSpecs = [
  { title: '渡口黄昏',          actIdx: 0, location: '小镇渡口',     time_of_day: '黄昏', pov: '林知夏', card: 0,  beat: 'A 从船下来 → 见到 B → 表情僵住 → 父亲电话打来。', entry_state: '抗拒、戒备', exit_state: '勉强停留' },
  { title: '医院走廊',          actIdx: 0, location: '县医院走廊',   time_of_day: '夜',   pov: '林知夏', card: 1,  beat: '父亲做手势让她回家 → 她明白要找箱子底的东西。', entry_state: '强装平静', exit_state: '心生疑惑' },
  { title: '父亲卧室深夜',      actIdx: 0, location: '父亲卧室',     time_of_day: '深夜', pov: '林知夏', card: 2,  beat: 'A 翻箱 → 找到录音笔 → 反复听 → 第三遍听见 B 的声音。', entry_state: '哀伤', exit_state: '战栗、清醒' },
  { title: '理发店上午',        actIdx: 0, location: '镇上理发店',   time_of_day: '上午', pov: '林知夏', card: 3,  beat: '阿珍洗发时漏一句 → A 抬眼 → 阿珍噤声。', entry_state: '冷峻', exit_state: '决心调查' },
  { title: '父亲家黄昏',        actIdx: 0, location: '父亲家门口',   time_of_day: '黄昏', pov: '林知夏', card: 4,  beat: 'B 送白菊 → A 接花 → B 邀晚饭 → A 沉默后答应。', entry_state: '冷淡', exit_state: '答应赴约' },
  { title: '陈牧家晚饭',        actIdx: 0, location: '陈牧家餐厅',   time_of_day: '晚饭', pov: '林知夏', card: 5,  beat: '三人对话 → 苏曼一句话之后桌下气氛变 → A 走时苏曼追到门口。', entry_state: '装作平常', exit_state: '心照不宣' },
  { title: '医院告别',          actIdx: 0, location: '县医院病房',   time_of_day: '凌晨', pov: '林知夏', card: 6,  beat: '父亲气息几乎听不见 → 嘴形说"老周" → 心电监护变直线。', entry_state: '不眠', exit_state: '父亲去世' },
  { title: '理发店深谈',        actIdx: 1, location: '镇上理发店',   time_of_day: '下午', pov: '林知夏', card: 7,  beat: 'A 锁门 → 阿珍崩溃说出当年看见的事 → A 承诺保护她。', entry_state: '逼问', exit_state: '失望但确信' },
  { title: '水边踩点',          actIdx: 1, location: '水坝下方',     time_of_day: '清晨', pov: '林知夏', card: 8,  beat: 'A 沿着水坝走 → 发现一块被冲刷出的牌位边角 → 拍照。', entry_state: '冷静', exit_state: '心底动摇' },
  { title: '镇政府远观',        actIdx: 1, location: '镇政府台阶',   time_of_day: '上午', pov: '林知夏', card: 9,  beat: 'B 演讲 → 人群鼓掌 → A 远远站着 → 摄影记者镜头扫过她。', entry_state: '克制', exit_state: '愤怒压不住' },
  { title: '找老周',            actIdx: 1, location: '老法医家',     time_of_day: '黄昏', pov: '林知夏', card: 10, beat: 'A 敲门三小时 → 老周从门缝看了一眼 → 关门。', entry_state: '坚持', exit_state: '撬开一条缝' },
  { title: '老周交备忘',        actIdx: 1, location: '老法医家',     time_of_day: '深夜', pov: '林知夏', card: 11, beat: '老周从柜子最深处拿出牛皮纸袋 → 交给 A → 要求她别提自己。', entry_state: '决断', exit_state: '握有铁证' },
  { title: '夜里复印',          actIdx: 1, location: '父亲书房',     time_of_day: '深夜', pov: '林知夏', card: 12, beat: 'A 复印 → 原件藏回五斗柜第二格下层 → 给录音笔换电池。', entry_state: '冷静', exit_state: '战术明确' },
  { title: '水坝雨夜',          actIdx: 2, location: '水坝下方',     time_of_day: '雨夜', pov: '林知夏', card: 13, beat: 'A 在雨里等 → B 来 → A 出录音笔 → B 第一次说"我见过她"。', entry_state: '硬碰硬', exit_state: '陈牧承认' },
  { title: '父亲卧室凌晨',      actIdx: 2, location: '父亲卧室',     time_of_day: '凌晨', pov: '林知夏', card: 14, beat: 'A 翻出当年自己签的声明 → 蹲在地上很久 → 站起来。', entry_state: '愤怒', exit_state: '羞耻、动摇' },
  { title: '雨中独行',          actIdx: 2, location: '小镇巷口',     time_of_day: '凌晨', pov: '林知夏', card: 15, beat: 'A 在雨里走 → 经过当年她跟父亲吵架的路口 → 停下。', entry_state: '崩溃', exit_state: '重新站起' },
  { title: '苏曼来访',          actIdx: 2, location: '父亲家门口',   time_of_day: '深夜', pov: '林知夏', card: 16, beat: '苏曼站在门外 → A 开门 → 苏曼说一句话就走 → A 第一次相信她。', entry_state: '戒备', exit_state: '同盟' },
  { title: '陈牧的恐惧',        actIdx: 2, location: '陈牧家书房',   time_of_day: '深夜', pov: '陈牧',  card: 17, beat: 'B 独自喝酒 → 苏曼推门进来 → B 不抬头 → 苏曼把杯子拿走。', entry_state: '逞强', exit_state: '裂痕清晰' },
  { title: '镇政府台阶正午',    actIdx: 3, location: '镇政府台阶',   time_of_day: '正午', pov: '林知夏', card: 18, beat: 'A 接上音箱 → 按播放键 → 人群从掌声到死寂 → B 当众僵在原地。', entry_state: '决心', exit_state: '颜面碎裂' },
  { title: '警车前的五分钟',    actIdx: 3, location: '镇派出所门口', time_of_day: '黄昏', pov: '林知夏', card: 19, beat: 'B 隔着警车窗 → 说出当年的细节 → A 不原谅但放下愤怒。', entry_state: '冷', exit_state: '放下愤怒' },
  { title: '渡口清晨',          actIdx: 3, location: '小镇渡口',     time_of_day: '清晨', pov: '林知夏', card: 20, beat: '与开场对位 → A 一个人提着行李箱上船 → 红绳从船尾飘过。', entry_state: '宁静', exit_state: '前路开阔' }
];

for (let i = 0; i < sceneSpecs.length; i++) {
  const s = sceneSpecs[i];
  if (i % 5 === 0) console.log(`  [${i + 1}/${sceneSpecs.length}] ${s.title}`);
  await clickById(page, 'add-scene'); await w(280);
  await fillField(page, 'scene-field', 'title', s.title);
  if (actIds[s.actIdx]) await fillField(page, 'scene-field', 'act_id', actIds[s.actIdx]);
  const povId = findCharId(s.pov);
  if (povId) await fillField(page, 'scene-field', 'pov_character_id', povId);
  await fillField(page, 'scene-field', 'location', s.location);
  await fillField(page, 'scene-field', 'time_of_day', s.time_of_day);
  await fillField(page, 'scene-field', 'beat_summary', s.beat);
  await fillField(page, 'scene-field', 'entry_state', s.entry_state);
  await fillField(page, 'scene-field', 'exit_state', s.exit_state);
  // 关联剧情卡（用 scene-plot-toggle）
  if (createdCardIds[s.card]) {
    await page.evaluate((cid) => {
      const cb = document.querySelector(`[data-action="scene-plot-toggle"][data-id="${cid}"]`);
      if (cb && !cb.checked) cb.click();
    }, createdCardIds[s.card]);
  }
  await w(150);
}
await w(2500);
await page.screenshot({ path: path.join(SHOTS, '05-scenes.png'), fullPage: true });

// =========================================================
// STAGE 5.5：资料库 — 时间线 / 世界规则 / 伏笔 / 类型 + 外部知识源
// =========================================================
console.log('\n=== STAGE 5.5: 资料库（顶部独立入口）===');
await page.locator('#page-library-button').click(); await w(800);

// 5.5.1 时间线 — 加 4 个事件
await page.locator('button[data-action="locks-tab"][data-id="timeline"]').click(); await w(300);
const timelineEvents = [
  { day: 1, summary: '林知夏回到小镇', location: '渡口',     trigger: '父亲病危电话',   consequence: '与陈牧重逢' },
  { day: 1, summary: '发现录音笔',     location: '父亲卧室', trigger: '整理遗物',       consequence: '怀疑陈牧' },
  { day: 2, summary: '老周交备忘',     location: '老法医家', trigger: 'A 坚持',         consequence: '握有铁证' },
  { day: 3, summary: '镇政府台阶揭穿', location: '镇政府',   trigger: '放录音 + 备忘',  consequence: '陈牧被带走' }
];
for (const e of timelineEvents) {
  await clickById(page, 'add-timeline'); await w(300);
  // story_day 是 number input，summary/location/trigger/consequence 是 text
  await fillField(page, 'timeline-field', 'story_day', String(e.day));
  await fillField(page, 'timeline-field', 'summary', e.summary);
  await fillField(page, 'timeline-field', 'location', e.location);
  await fillField(page, 'timeline-field', 'trigger', e.trigger);
  await fillField(page, 'timeline-field', 'consequence', e.consequence);
  await w(150);
}
await w(1500);
await page.screenshot({ path: path.join(SHOTS, '06-library-timeline.png'), fullPage: true });

// 5.5.2 世界规则 — 加 2 条
await page.locator('button[data-action="locks-tab"][data-id="rules"]').click(); await w(300);
const worldRules = [
  { statement: '小镇所有人都互相认识，任何调查都会立刻传开。', scope: '社会层' },
  { statement: '陈牧在小镇有相当政治资源，公开对抗他需要不可反驳的证据。', scope: '政治层' }
];
for (const r of worldRules) {
  await clickById(page, 'add-world-rule'); await w(300);
  await fillField(page, 'world-rule-field', 'rule_statement', r.statement);
  await fillField(page, 'world-rule-field', 'scope', r.scope);
  await w(150);
}
await w(1500);
await page.screenshot({ path: path.join(SHOTS, '06-library-rules.png'), fullPage: true });

// 5.5.3 伏笔追踪 — 加 3 个
await page.locator('button[data-action="locks-tab"][data-id="setups"]').click(); await w(300);
const setups = [
  { summary: '父亲遗物里的录音笔', window: 'Act3', payoff: '在镇政府台阶公开播放' },
  { summary: '林知夏当年签的「放弃寻找」声明', window: 'Act3', payoff: '与陈牧最后对话中提到' },
  { summary: '老周保留的尸检备忘', window: 'Act3', payoff: '台阶上播放片段' }
];
for (const s of setups) {
  await clickById(page, 'add-setup'); await w(300);
  await fillField(page, 'setup-field', 'setup_summary', s.summary);
  await fillField(page, 'setup-field', 'expected_payoff_window', s.window);
  await fillField(page, 'setup-field', 'payoff_summary', s.payoff);
  await w(150);
}
await w(1500);
await page.screenshot({ path: path.join(SHOTS, '06-library-setups.png'), fullPage: true });

// 5.5.4 类型约束 — 填类型字段 + 常规 + 禁区
await page.locator('button[data-action="locks-tab"][data-id="genres"]').click(); await w(300);
await fillField(page, 'genre-field', 'primary_genre', '悬疑');
await fillField(page, 'genre-field', 'secondary_genres_text', '剧情、家庭');
await fillField(page, 'genre-field', 'audience_promise', '一场把童年记忆撕开的真相挖掘。');
await fillField(page, 'genre-field', 'tone_words_text', '冷峻、潮湿、克制');
// 加 1 条常规 + 1 条禁区
await clickById(page, 'add-convention'); await w(300);
// 新加的 convention 用 convention-field name 字段
const convs = await page.locator('[data-action="convention-field"][data-field="name"]').count();
if (convs > 0) {
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('[data-action="convention-field"][data-field="name"]');
    const last = inputs[inputs.length - 1];
    if (last) { last.value = '关键线索的反复出现'; last.dispatchEvent(new Event('input', { bubbles: true })); }
    const descs = document.querySelectorAll('[data-action="convention-field"][data-field="description"]');
    const lastDesc = descs[descs.length - 1];
    if (lastDesc) { lastDesc.value = '录音笔出现至少三次。'; lastDesc.dispatchEvent(new Event('input', { bubbles: true })); }
  });
}
await w(200);
await clickById(page, 'add-taboo'); await w(300);
await page.evaluate(() => {
  const inputs = document.querySelectorAll('[data-action="taboo-field"][data-field="name"]');
  const last = inputs[inputs.length - 1];
  if (last) { last.value = '上帝视角揭秘'; last.dispatchEvent(new Event('input', { bubbles: true })); }
  const descs = document.querySelectorAll('[data-action="taboo-field"][data-field="description"]');
  const lastDesc = descs[descs.length - 1];
  if (lastDesc) { lastDesc.value = '禁止任何场景从外部全知视角揭穿。'; lastDesc.dispatchEvent(new Event('input', { bubbles: true })); }
});
await w(1500);
await page.screenshot({ path: path.join(SHOTS, '06-library-genres.png'), fullPage: true });

// 5.5.5 外部知识源（storykb）— 同步 + 搜「场景节拍」 + 导入一条作为参考世界规则
await page.locator('button[data-action="locks-tab"][data-id="kb"]').click(); await w(800);
// 若未同步则同步
const synced = await page.evaluate(() => document.querySelector('.kb-tab__meta')?.textContent?.includes('已同步'));
if (!synced) {
  await page.evaluate(() => document.querySelector('[data-action="kb-sync"]')?.click());
  await w(6000);  // wiki-bundle.json 3.3MB
}
await page.locator('input[data-action="kb-search-input"]').fill('节拍'); await w(800);
const kbItems = await page.locator('.kb-list-item').count();
console.log(`KB 搜「节拍」结果: ${kbItems}`);
if (kbItems > 0) {
  await page.locator('.kb-list-item').first().click();
  await w(2000); // 远程拉详情
  // 导入为世界规则
  await page.locator('button[data-action="kb-import"][data-target="world_rule"]').click();
  await w(800);
}
await page.screenshot({ path: path.join(SHOTS, '06-library-kb.png'), fullPage: true });

// 回项目（kb 在 library 页，需要回到工作流的剧本撰写步骤；
// stepper 在 library 页 hidden，需先重新进项目）
await page.locator('#page-project-button').click(); await w(800);
await page.locator(`[data-action="open-project"][data-id="${projectId}"]`).first().click(); await w(1500);

// =========================================================
// STAGE 6：剧本撰写 — 单场模板 + AI 单场重写演示 + 批量
// =========================================================
console.log('\n=== STAGE 6: 剧本撰写 ===');
await page.locator('#stepper-nav .step-button[data-id="screenplay"]').click(); await w(1000);

const sceneN = await page.locator('.screenplay-scene-item').count();
console.log(`UI 显示场景数: ${sceneN}`);
await page.screenshot({ path: path.join(SHOTS, '06-screenplay-before.png'), fullPage: true });

// 6.1 在第一场点「插入剧本模板」演示手写起手
await page.locator('.screenplay-scene-item').first().click(); await w(400);
await page.evaluate(() => { window.confirm = () => true; });
await clickById(page, 'insert-scene-script-template');
await w(800);
await page.screenshot({ path: path.join(SHOTS, '06-screenplay-template.png'), fullPage: true });

// 6.2 启动批量 AI（这一轮会覆盖刚插入的模板，因为我们要 AI 来写第一场）
await page.evaluate(() => { window.confirm = () => true; });
await page.locator('button[data-action="ai-write-screenplay-bulk"]').click();
const start = Date.now();
const MAX = 30 * 60 * 1000;
while (Date.now() - start < MAX) {
  await w(15000);
  const st = await page.evaluate(() => {
    const btn = document.querySelector('button[data-action="ai-write-screenplay-bulk"]');
    const statuses = Array.from(document.querySelectorAll('.screenplay-scene-item__status')).map(e => e.textContent?.trim() || '');
    return { btnText: btn?.textContent?.trim() || '', 成稿: statuses.filter(s => s === '已成稿').length, 未撰: statuses.filter(s => s === '未撰写').length };
  });
  const t = Math.round((Date.now() - start) / 1000);
  console.log(`[${t}s] ${st.btnText} · 成稿 ${st.成稿} · 未撰 ${st.未撰}`);
  if (!st.btnText.includes('批量中')) break;
}
await page.screenshot({ path: path.join(SHOTS, '07-screenplay-after.png'), fullPage: true });

// 6.3 验证「全本预览」按钮可点（不打开新窗口阻塞，只检查 click 有 popup 触发）
const popupListener = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
await clickById(page, 'preview-screenplay-full');
const popup = await popupListener;
if (popup) {
  console.log('✓ 全本预览弹出新窗口');
  await popup.close().catch(() => {});
} else {
  note('MEDIUM', 'PD', '全本预览', '点击未触发新窗口');
}

// 6.4 演示单场 AI 重写（选第 5 场）
const overwriteTarget = await page.evaluate(() => {
  const items = Array.from(document.querySelectorAll('.screenplay-scene-item'));
  return items.length >= 5 ? items[4].getAttribute('data-id') : null;
});
if (overwriteTarget) {
  await page.evaluate((id) => document.querySelector(`[data-action="select-screenplay-scene"][data-id="${id}"]`)?.click(), overwriteTarget);
  await w(400);
  // 已成稿场景 AI 重写会弹 confirm，window.confirm 已 mock 为 true
  const lenBefore = await page.evaluate(() => document.querySelector('[data-action="screenplay-field"][data-field="script_full"]')?.value?.length ?? 0);
  console.log(`第 5 场重写前字数: ${lenBefore}`);
  await clickById(page, 'ai-write-scene-script', overwriteTarget);
  // 等单场完成（约 30-90s）
  let waited = 0;
  while (waited < 120000) {
    await w(3000); waited += 3000;
    const busy = await page.evaluate((id) => {
      const btn = document.querySelector(`[data-action="ai-write-scene-script"][data-id="${id}"]`);
      return btn?.disabled || (btn?.textContent || '').includes('写作中');
    }, overwriteTarget);
    if (!busy) break;
  }
  const lenAfter = await page.evaluate(() => document.querySelector('[data-action="screenplay-field"][data-field="script_full"]')?.value?.length ?? 0);
  console.log(`第 5 场重写后字数: ${lenAfter} (Δ${lenAfter - lenBefore})`);
}
await page.screenshot({ path: path.join(SHOTS, '07b-screenplay-after-rewrite.png'), fullPage: true });

// 6.5 导出
const dp = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
await page.locator('button[data-action="export-screenplay-fountain"]').click();
const dl = await dp;
const fp = path.join(SHOTS, '小镇七十二小时-v9.fountain');
if (dl) await dl.saveAs(fp);

// ===== 校验 =====
const final = (await api('GET', `/api/projects/${projectId}`)).j.project;
const fScenes = final.scene_workbench.scenes;
const total = fScenes.reduce((s, sc) => s + (sc.script_full?.length || 0), 0);
const pages = Math.ceil(total / 250);
const written = fScenes.filter(s => (s.script_full || '').length > 300).length;
const cardsByAct = {};
final.plot_board.cards.forEach(c => { cardsByAct[c.act_id] = (cardsByAct[c.act_id] || 0) + 1; });

console.log(`\n=== 最终统计 ===`);
console.log(`人物 ${final.character_hub.characters.length} · 关系 ${final.character_hub.relationship_map.length}`);
console.log(`剧情卡 ${final.plot_board.cards.length}，分布到 ${Object.keys(cardsByAct).length} 个幕：`, cardsByAct);
console.log(`场景 ${fScenes.length} · 成稿 ${written} · 总字数 ${total} · ≈${pages} 页`);

// 校验 fountain 是否还有"主角"等替代名
if (fs.existsSync(fp)) {
  const text = fs.readFileSync(fp, 'utf-8');
  const placeholderHits = (text.match(/主角|来人|陌生人|男人(?!们)|女人(?!们)|路人[甲乙丙]/g) || []).length;
  console.log(`fountain 替代名出现次数: ${placeholderHits}`);
  if (placeholderHits > 5) note('HIGH', 'SW', '人名', `剧本里 ${placeholderHits} 处替代名（主角/来人/陌生人/路人甲）`);
}

console.log(`\n观察数: ${OBS.length}`);
for (const o of OBS) console.log(`  [${o.sev}] [${o.who}] [${o.where}] ${o.msg}`);
fs.writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify({ projectId, pages, written, cardsByAct, observations: OBS }, null, 2));

await browser.close();
console.log(`\n项目 ${projectId} 已保留供浏览器评审。`);
