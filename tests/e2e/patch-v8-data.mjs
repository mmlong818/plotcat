// 给 v8 项目补：5幕标题、节点 note、人物 MBTI/drive、剧情卡分散到各节点
// 直接走 API 修，不重生 AI 剧本。
import http from 'http';

const BASE = 'http://127.0.0.1:4173';
const pid = 'project_mpk2zl96_hc6vr6';
function api(m, p, b) {
  return new Promise((res) => {
    const d = b ? JSON.stringify(b) : null;
    const req = http.request(BASE + p, { method: m, headers: { 'content-type': 'application/json', ...(d ? { 'content-length': Buffer.byteLength(d) } : {}) } }, r => {
      let buf=''; r.on('data',c=>buf+=c); r.on('end',()=>{try{res({s:r.statusCode,j:JSON.parse(buf)})}catch(e){res({s:r.statusCode,raw:buf.slice(0,200)})}});
    });
    if (d) req.write(d); req.end();
  });
}

const proj = (await api('GET', `/api/projects/${pid}`)).j.project;

// 1. 第五幕标题
const acts = proj.structure_profile.acts;
const actTitles = ['幕一 · 召唤与入局', '幕二上 · 调查推进', '幕二下 · 黑暗时刻', '幕三 · 真相浮出', '尾声 · 离开'];
acts.forEach((a, i) => { a.title = actTitles[i] || a.title; });

// 2. 节点 note — 按 node_type 填
const noteByKey = {
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
proj.structure_profile.nodes.forEach(n => {
  if (noteByKey[n.node_type]) n.note = noteByKey[n.node_type];
});

// 3. 人物 MBTI + drive（character_hub）
const charPsych = {
  '林知夏': { mbti: 'INTJ', drive: '安全感' },
  '陈牧':   { mbti: 'ESTJ', drive: '权力' },
  '苏曼':   { mbti: 'ISFJ', drive: '归属感' },
  '林父':   { mbti: 'ISTJ', drive: '成就感' },
  '阿珍':   { mbti: 'ENFP', drive: '生理需求' },
  '老周':   { mbti: 'ISTP', drive: '安全感' }
};
proj.character_hub.characters.forEach(c => {
  const p = charPsych[c.name];
  if (p) { c.mbti = p.mbti; c.drive = p.drive; }
});

// 4. 剧情卡分散到各节点（按节点顺序）
const nodes = proj.structure_profile.nodes;
const cards = proj.plot_board.cards.filter(c => c.title !== '开场场景' && c.title !== '新剧情卡');
// 按 act 分组
const cardsByAct = {};
cards.forEach(c => {
  if (!cardsByAct[c.act_id]) cardsByAct[c.act_id] = [];
  cardsByAct[c.act_id].push(c);
});
// 每幕的节点
acts.forEach(a => {
  const aCards = cardsByAct[a.id] || [];
  const aNodes = nodes.filter(n => n.act_id === a.id);
  if (aNodes.length === 0 || aCards.length === 0) return;
  aCards.forEach((c, i) => {
    c.node_id = aNodes[i % aNodes.length].id;  // 循环分配到节点
  });
});

const put = await api('PUT', `/api/projects/${pid}`, { project: proj });
console.log('PUT:', put.s);

// 验证
const after = (await api('GET', `/api/projects/${pid}`)).j.project;
console.log('幕标题:', after.structure_profile.acts.map(a => a.title));
console.log('节点 note 填充数:', after.structure_profile.nodes.filter(n => n.note).length, '/', after.structure_profile.nodes.length);
console.log('人物 MBTI:', after.character_hub.characters.map(c => c.name + ':' + (c.mbti || '-')));
const nodeDist = {};
after.plot_board.cards.forEach(c => { if (c.node_id) nodeDist[c.node_id] = (nodeDist[c.node_id] || 0) + 1; });
console.log('剧情卡分布到节点数:', Object.keys(nodeDist).length);
