// 第 4 轮（最后一轮）：4 个剧本，程序化散文生成
// 闪婚豪门（microdrama 60 集）+ 重生 1999（microdrama 60 集）
// 九重霜（tv_pilot 24 场）+ 南门外的录像厅（tv_pilot 24 场）
process.env.NO_PROXY = '*';
process.env.no_proxy = '*';

import { DatabaseSync } from 'node:sqlite';
import { buildScene } from './generators/_proseGen.mjs';

const BASE = 'http://127.0.0.1:4173';
const db = new DatabaseSync('./data/yuandian.db');

async function fetchJson(method, path, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`${method} ${path} -> ${r.status}: ${t.slice(0, 300)}`);
  }
  return r.json();
}

function countZh(s) { return (s || '').replace(/\s/g, '').length; }

// ============ 闪婚豪门（60 集 microdrama）============
// 每集一个独立钩子：被打脸/真相/反转/护妻
const SHANHUN_EP = [];
const SH_LOCS = [
  ['INT', '璇宫酒店 · 主厅', '夜'],
  ['INT', '霍氏总裁套房 · 客厅', '清晨'],
  ['INT', '霍氏集团 · 22 楼会议室', '上午'],
  ['INT', '苏念安工作室', '下午'],
  ['EXT', '璇宫酒店 · 玻璃门外', '傍晚'],
  ['INT', '霍家主宅 · 西餐厅', '夜'],
  ['INT', '京城医院 · VIP 病房', '深夜'],
  ['INT', '私人会所 · 包间', '晚上'],
  ['INT', '机场 VIP 通道', '清晨'],
  ['EXT', '雨中街头', '雨夜'],
];
const SH_HOOKS = [
  '被未婚夫当街退婚的设计师',
  '酒会上随手扯过陌生男人的领带',
  '清晨醒来发现枕边人是霍奕琛',
  '床头柜上摆着民政局的红色证书',
  '前未婚夫上门要求复合被拒',
  '霍母递上离婚协议和五百万支票',
  '苏念安被恶意爆料工作室抄袭',
  '霍奕琛在董事会上力排众议护妻',
  '神秘女人自称怀着霍奕琛的孩子',
  '苏念安亲耳听见霍奕琛在电话里说她',
  '顾婉清查到苏念安生母的下落',
  '霍家老爷子昏倒被送进医院',
  '苏念安独自一人去面对记者围堵',
  '霍奕琛把所有股权转到苏念安名下',
  '前未婚夫卖出最致命的一条通稿',
  '霍奕琛公开承认娶妻动机不纯',
  '苏念安搬出霍家主宅住进自己旧公寓',
  '深夜接到一通陌生女人的电话',
  '霍母带着家族律师团登门',
  '苏念安在车祸现场拽住霍奕琛',
  '霍奕琛的母亲终于承认这段婚姻',
  '苏念安拿到设计大奖却不敢公开',
  '前未婚夫家族破产求上门',
  '霍奕琛对外宣布永不离婚',
  '一张老照片揭开生母真相',
  '苏念安主动提出离婚被拒',
  '霍奕琛跪在大雨里拦住她',
  '机场最后一次告别',
  '一年后的酒会原地重逢',
  '霍奕琛单膝跪地递上真正的求婚戒',
];

for (let i = 0; i < 60; i++) {
  const loc = SH_LOCS[i % SH_LOCS.length];
  const hook = SH_HOOKS[i % SH_HOOKS.length];
  SHANHUN_EP.push({
    title: `第 ${i + 1} 集：${hook}`,
    location: loc[1],
    time: loc[2],
    intExt: loc[0],
    A: '苏念安',
    B: '霍奕琛',
    C: i % 3 === 0 ? '顾婉清' : null,
    act: i < 20 ? 0 : i < 50 ? 1 : 2,
    cardIdx: Math.min(7, Math.floor(i / 8)),
    pov: 0,
    goal: '在这一集把这个钩子推向反转',
    obstacle: '对方比她想象的更早一步',
    outcome: '反转成立 · 下一集留下新钩子',
    genre: 'shanhun',
  });
}

// ============ 重生 1999（60 集 microdrama）============
const CS_LOCS = [
  ['EXT', '江畔栈桥', '暴雨夜'],
  ['INT', '县一中高三(5)班 教室', '清晨'],
  ['INT', '县城邮局二楼证券交易厅', '上午'],
  ['INT', '林知夏家 · 厨房', '傍晚'],
  ['INT', '县城新华书店', '周末下午'],
  ['INT', '省城金融培训营 · 教室', '夏日午后'],
  ['INT', '陈舒桐家 · 小院', '黄昏'],
  ['EXT', '县城老火车站 · 月台', '清晨'],
  ['INT', '县一中 · 教师办公室', '放学后'],
  ['INT', '林知夏家 · 客厅', '夜'],
];
const CS_HOOKS = [
  '38 岁的林知夏在江边被推下水',
  '睁眼回到 1999 年的高三教室',
  '同桌递过来一张昨天的小考试卷',
  '她在草稿纸上默写 2003 年牛股名单',
  '县城唯一的证券所只有两台破电脑',
  '未成年开户被柜员当场拒绝',
  '陈舒桐第一次在课间和她说话',
  '她写出一封寄给前世自己母亲的信',
  '县一中的班主任找她谈高考志愿',
  '林知夏跟妈妈说要做生意',
  '第一笔三千块的本金到账',
  '一周翻倍的兴奋和恐慌同时袭来',
  '少年版周明远出现在培训营',
  '她当场认出对方眼神里的算计',
  '陈舒桐想报外省的志愿被她劝住',
  '林知夏拉舒桐进自己的小工作室',
  '前世的导师正在课堂上讲老鼠仓',
  '她写下举报材料压在课桌抽屉',
  '周明远主动约她在小饭馆见面',
  '两个人面对面把底牌摊开了一半',
  '县城第一家网吧开业',
  '她用网吧的电脑下了第一份英文研报',
  '陈舒桐妈妈下岗的消息传来',
  '她替舒桐还了三个月房租',
  '林知夏第一次见到霍家旁支的人',
  '高考前一周老师把她单独叫到办公室',
  '她在高考前夜没睡，做完了卷子',
  '高考成绩出来比前世高了八十分',
  '她报了北大经济',
  '周明远报了同一个学校的同一个专业',
  '大一开学报到日两人在校门口对视',
  '陈舒桐成了她的合伙人',
  '工作室签下第一个真正的客户',
  '前世害她的导师再次犯了老鼠仓',
  '她按下举报材料的发送键',
  '2003 非典让她预判的股票走势全中',
  '林知夏第一桶金到账八百万',
  '周明远来电要求合作',
  '她拒绝并约他在咖啡馆摊牌',
  '一场关于 2008 危机的赌局开始',
  '雷曼兄弟倒闭那一夜她和周明远同时下注',
  '她的仓位先于他平掉一半',
  '次贷危机第二波她全身而退',
  '周明远抵押了全部身家来追赶',
  '林知夏在 2009 年成为本土最年轻的女基金经理',
  '前世的丈夫终于来找她',
  '她在咖啡馆冷静地把他从头到脚看了一遍',
  '前世的闺蜜哭着上门道歉',
  '林知夏给妈妈在县城买了一套大房子',
  '陈舒桐独立运作了自己的第一个项目',
  '周明远在媒体上承认输给了她',
  '一笔横跨两代人的旧账',
  '林知夏决定不再追究前世',
  '把全部时间留给当下',
  '陈舒桐结婚她做了证婚人',
  '林知夏在 30 岁的生日上谢绝周明远的合伙邀请',
  '回县城陪妈妈过中秋',
  '在江边那座老栈桥她站了很久',
  '心里那个 38 岁的自己终于安静下来',
  '她在工作室签下复盘报告的最后一页',
  '把档案柜上锁交给陈舒桐',
];

for (let i = 0; i < 60; i++) {
  const loc = CS_LOCS[i % CS_LOCS.length];
  const hook = CS_HOOKS[i % CS_HOOKS.length];
  SHANHUN_EP.length;
  // store in second array below
}
const CHONGSHENG_EP = [];
for (let i = 0; i < 60; i++) {
  const loc = CS_LOCS[i % CS_LOCS.length];
  const hook = CS_HOOKS[i % CS_HOOKS.length];
  CHONGSHENG_EP.push({
    title: `第 ${i + 1} 集：${hook}`,
    location: loc[1],
    time: loc[2],
    intExt: loc[0],
    A: '林知夏',
    B: '周明远',
    C: i % 3 === 0 ? '陈舒桐' : null,
    act: i < 20 ? 0 : i < 50 ? 1 : 2,
    cardIdx: Math.min(7, Math.floor(i / 8)),
    pov: 0,
    goal: '用未来记忆里的信息差赢下当前的局',
    obstacle: '周明远比她预想的反应更快半拍',
    outcome: '本集赢一手 · 下一集对手反扑',
    genre: 'chongsheng1999',
  });
}

// ============ 九重霜（24 场 tv_pilot）============
const JIU_LOCS = [
  ['EXT', '南山封印之顶', '雷雨夜'],
  ['INT', '凡间小镇 · 阿芜的茶肆', '清晨'],
  ['EXT', '南山山道 · 半山亭', '黄昏'],
  ['INT', '南山 · 封印阵底', '深夜'],
  ['EXT', '小镇集市', '正午'],
  ['INT', '宗门 · 应霜旧居', '寒夜'],
  ['EXT', '三百年前的剑场', '残阳'],
  ['INT', '阿芜的卧房', '夜半'],
];
const JIU_TITLES = [
  '南山异象', '凡间下凡', '茶肆相遇', '封印第一层', '玄昭现身',
  '小镇受波及', '应霜与玄昭的旧剑', '阿芜被托付', '封印底层', '记忆回流',
  '玄昭就是他', '天道警告', '宗门来人', '阿芜的真身', '三百年前的剑案',
  '应霜的本命剑', '玄昭的为难', '阿芜执笔', '封印第二层裂开', '怨力溢出',
  '封印之战上', '封印之战中', '封印之战下', '新封印 · 三人之约',
];
const JIUCHONG_SCENES = [];
for (let i = 0; i < 24; i++) {
  const loc = JIU_LOCS[i % JIU_LOCS.length];
  JIUCHONG_SCENES.push({
    title: JIU_TITLES[i],
    location: loc[1], time: loc[2], intExt: loc[0],
    A: '应霜', B: '玄昭', C: i % 2 === 0 ? '阿芜' : null,
    act: i < 8 ? 0 : i < 19 ? 1 : 2,
    cardIdx: Math.min(7, Math.floor(i / 3)),
    pov: 0,
    goal: '把这一幕的封印线推到下一节',
    obstacle: '天道的警示符在头顶悬着',
    outcome: '一步险胜 · 下一场代价更大',
    genre: 'jiuchongshuang',
  });
}

// ============ 南门外的录像厅（24 场 tv_pilot）============
const NM_LOCS = [
  ['EXT', '小城火车站 · 月台', '1993 春 · 清晨'],
  ['INT', '向阳像厅 · 柜台', '午后'],
  ['EXT', '南门街 · 街口', '黄昏'],
  ['INT', '苏小冰家 · 客厅', '夜'],
  ['INT', '南门街道办 · 会议室', '上午'],
  ['INT', '向阳像厅 · 放映厅', '傍晚'],
  ['EXT', '南门街 · 巷子深处', '入夜'],
  ['INT', '宁向阳家 · 厨房', '清晨'],
];
const NM_TITLES = [
  '钥匙交接', '柜台第一天', '无名录像带', '街道办告示', '苏小冰来访',
  '老主顾的诉求', '试放无名带', '父亲的影像', '邓启年登门', '欠租记录',
  '重映《英雄本色》第一夜', '重映第二夜', '重映第三夜', '账面起色', '小冰的存款',
  '苏小冰想去广州', '听证会前夜', '听证会上', '邓启年的让步', '哥哥来信',
  '保留方案', '重新开张', '哥哥归来', '中秋夜的招牌',
];
const NANMEN_SCENES = [];
for (let i = 0; i < 24; i++) {
  const loc = NM_LOCS[i % NM_LOCS.length];
  NANMEN_SCENES.push({
    title: NM_TITLES[i],
    location: loc[1], time: loc[2], intExt: loc[0],
    A: '宁向阳', B: '邓启年', C: i % 2 === 0 ? '苏小冰' : null,
    act: i < 8 ? 0 : i < 19 ? 1 : 2,
    cardIdx: Math.min(7, Math.floor(i / 3)),
    pov: 0,
    goal: '把录像厅保住一天，再多一天',
    obstacle: '街道办的拆迁日程不等人',
    outcome: '今日守住 · 明日仍有变数',
    genre: 'nanmen',
  });
}

// =========================
// 把目标项目按 title 拿到 id
function findProject(title) {
  return db.prepare('SELECT id FROM projects WHERE title=?').get(title);
}

const TARGETS = [
  { idx: 1, label: '闪婚豪门', slug: '01-shanhun', format: 'microdrama', projectId: findProject('闪婚豪门').id, scenes: SHANHUN_EP },
  { idx: 3, label: '重生 1999', slug: '03-chongsheng', format: 'microdrama', projectId: findProject('重生 1999').id, scenes: CHONGSHENG_EP },
  { idx: 8, label: '九重霜', slug: '08-jiuchong', format: 'tv_pilot', projectId: findProject('九重霜').id, scenes: JIUCHONG_SCENES },
  { idx: 9, label: '南门外的录像厅', slug: '09-nanmen', format: 'tv_pilot', projectId: findProject('南门外的录像厅').id, scenes: NANMEN_SCENES },
];

function buildScript(s, idx, format) {
  // tv_pilot 总字数下限 15000，24 场 → 每场至少 650 字（留余量）
  const minChars = format === 'tv_pilot' ? 700 : 550;
  return buildScene({
    idx,
    intExt: s.intExt,
    location: s.location,
    time: s.time,
    A: s.A,
    B: s.B,
    C: s.C,
    genre: s.genre,
    minChars,
  });
}

function buildScenesForProject(target, project) {
  const acts = project.structure_profile.acts;
  const cards = project.plot_board.cards;
  const charIds = project.story_bible.characters.map(c => c.id);

  return target.scenes.map((s, idx) => {
    const actId = acts[s.act]?.id || acts[0].id;
    const cardId = cards[s.cardIdx]?.id || cards[0]?.id || '';
    const povId = charIds[s.pov] ?? charIds[0];
    const sceneId = `scene_${target.slug}_v4_${String(idx).padStart(3, '0')}`;
    const script = buildScript(s, idx, target.format);
    return {
      bible: {
        id: sceneId, order_index: idx + 1, act_id: actId, title: s.title,
        pov_character_id: povId, location: s.location, time_of_day: s.time || '',
        goal: s.goal, obstacle: s.obstacle, tactic: '', turn: s.outcome,
        value_shift: '', new_information: [], input_state: '', output_state: '',
        production_tags: [], dialogue_seed: '', emotion_stage: '',
        script_full: script, screenplay_notes: '',
      },
      workbench: {
        id: sceneId, order_index: idx + 1, title: s.title, act_id: actId,
        linked_plot_card_ids: cardId ? [cardId] : [],
        pov_character_id: povId, location: s.location, time_of_day: s.time || '',
        purpose: s.goal, obstacle: s.obstacle, beat_summary: s.outcome,
        entry_state: '', exit_state: '', status: 'draft',
        script_excerpt: '', script_full: script, screenplay_notes: '', notes: '',
      },
    };
  });
}

async function pushOne(target) {
  console.log(`\n=== [${target.idx}/10] ${target.label} (${target.format}) ===`);
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
  console.log(`[${target.idx}/10] ${target.label} | ${target.format} | ${sceneCount} 场 | ${total} 字 | 最短 ${min} (${minTitle})`);
  return { ...target, sceneCount, total, min };
}

async function main() {
  const results = [];
  for (const t of TARGETS) results.push(await pushOne(t));
  console.log('\n--- 汇总 ---');
  for (const r of results) console.log(`[${r.idx}/10] ${r.label} | ${r.format} | ${r.sceneCount} 场 | ${r.total} 字`);
}

main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
