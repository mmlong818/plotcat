import { cloneDefaultProject } from "./data/defaultProject.js";
import { ensurePlotDrivenProject } from "./shared/plotDrivenProject.js";

export const STORAGE_KEY = "yuandian-plot-driven-workspace";
export const AUTOSAVE_DELAY = 800;

export const workflowSteps = [
  { id: "structure",     label: "结构骨架", description: "选定结构模板，划出各幕比例，标记必要的叙事节点。" },
  { id: "characters",    label: "人物核心", description: "建立主配角档案，确认各自的目标、缺口和弧光方向。" },
  { id: "relationships", label: "关系张力", description: "梳理人物之间的权力差、情感债和共同过去，找到冲突来源。" },
  { id: "plots",         label: "剧情开发", description: "把故事事件写成剧情卡，挂入对应的幕与节点，排出主次线。" },
  { id: "locks",         label: "沉淀锁定", description: "把确认的事实沉淀为时间线、世界规则、伏笔回收和类型约束。" },
  { id: "scenes",        label: "场景拆解", description: "把锁定后的剧情卡拆成逐场可写的场景序列。" }
];

export const projectCreateStepsCurrent = [
  {
    id: "basics",
    eyebrow: "步骤 1 / 4",
    title: "定义形态",
    description: "先确定作品形态、类型方向和结构模板。"
  },
  {
    id: "logline",
    eyebrow: "步骤 2 / 4",
    title: "概念候选",
    description: "先从多组一句话概念和核心冲突里选方向，再继续往下。"
  },
  {
    id: "title",
    eyebrow: "步骤 3 / 4",
    title: "起名",
    description: "方向确定后，再给这个故事起一个能立住的名字。"
  },
  {
    id: "blueprint",
    eyebrow: "步骤 4 / 4",
    title: "蓝图确认",
    description: "把主题、主角、弧光和世界起点锁成创作起点。"
  }
];

export const formatLabels = {
  feature_or_pilot: "电影 / 试播集",
  feature: "电影",
  feature_film: "电影长片",
  pilot: "试播集",
  pilot_episode: "试播集",
  series: "连续剧",
  series_season: "连续剧季",
  short: "短片",
  short_form: "短片",
  micro_drama: "微短剧",
  micro_drama_serial: "微短剧"
};

export const projectFormatChoices = ["feature", "pilot", "series", "short", "micro_drama"];

export const structureTemplateLabels = {
  feature_film: "电影长片模式",
  pilot_episode: "试播集模式",
  series_season: "连续剧季结构",
  short_form: "短片模式",
  micro_drama_serial: "微短剧模式",
  three_act: "三幕剧",
  four_act: "四幕剧",
  custom: "自定义"
};

export const projectDraftFieldLabels = {
  genre: "类型方向",
  tone: "风格方向",
  title: "项目名称",
  logline: "一句话概念",
  core_conflict: "核心冲突",
  theme_question: "主题问题",
  theme: "主题陈述",
  protagonist: "主角",
  motif: "视觉母题",
  arc_start: "弧光起点",
  arc_end: "弧光终点",
  external_goal: "外部目标",
  internal_need: "内部需要",
  setting: "世界起点",
  audience_promise: "观众承诺"
};

export const formatDefaultTemplates = {
  feature_or_pilot: "feature_film",
  feature: "feature_film",
  pilot: "pilot_episode",
  series: "series_season",
  short: "short_form",
  micro_drama: "micro_drama_serial"
};

export const formatStructureOptions = {
  feature: ["feature_film", "three_act", "four_act", "custom"],
  feature_or_pilot: ["feature_film", "pilot_episode", "three_act", "four_act", "custom"],
  pilot: ["pilot_episode", "three_act", "four_act", "custom"],
  series: ["series_season", "custom"],
  short: ["short_form", "custom"],
  micro_drama: ["micro_drama_serial", "custom"]
};

export const projectStatusLabels = {
  development: "开发中",
  active: "进行中",
  paused: "暂停中"
};

export const storyRoleLabels = {
  protagonist: "主角",
  deuteragonist: "次主角",
  antagonist: "对手",
  ally: "盟友",
  opponent_ally: "复杂盟友",
  supporting: "配角",
  mentor: "导师",
  love_interest: "情感对象"
};

// ── 叙事风格选项 ──────────────────────────────────────────────
export const TONE_OPTIONS = ["碎片叙事", "高雅幽默", "通俗幽默", "金句频出", "滑稽闹剧"];

// ── 角色原型 ──────────────────────────────────────────────────
export const CHARACTER_ARCHETYPES = [
  { key: "时势英雄",    group: "主角", desc: "平平无奇的人被稀里糊涂地卷入一系列事件，成为英雄。" },
  { key: "隐退传奇",    group: "主角", desc: "因种种原因隐退的杰出专业人士，退休生活能持续到永远吗？" },
  { key: "勇猛战士",    group: "主角", desc: "荣誉与信念凌驾于命令之上，率直而敢于挑战权威。" },
  { key: "叛逆小姐",    group: "主角", desc: "出身名门贵族，有自由梦想与反叛之心，打破传统与刻板印象。" },
  { key: "细心侦探",    group: "主角", desc: "即使最微不足道的线索，也难逃这位侦探的慧眼。" },
  { key: "无畏行客",    group: "主角", desc: "无所畏惧的探险家，没有暗藏秘密的冒险与危险旅程人生将平淡无味。" },
  { key: "雄心女人",    group: "主角", desc: "在保守的父权世界里竭尽全力为自己开辟通往成功的道路。" },
  { key: "绿林好汉",    group: "主角", desc: "魅力与自由的象征，嗤之以鼻规则，但在千钧一发之际总站在正义一方。" },
  { key: "沙场老兵",    group: "主角", desc: "曾经的战士，如今只想过上与普通人一样平凡的生活。" },
  { key: "迷途游魂",    group: "主角", desc: "初心良善，却在人生道路上迷失方向，走上了一条黑暗之路。" },
  { key: "游荡弃儿",    group: "主角", desc: "被逐出家族或团体，孤身游荡，正寻找自己的归途。" },
  { key: "最后幸存者",  group: "主角", desc: "凭借天赋或运气，在邪恶降临时成为唯一幸存者。" },
  { key: "魅力罪犯",    group: "主角", desc: "目标明确、行事果敢且独具魅力，但站在法律的对立面。" },
  { key: "幻灭的理想主义者", group: "主角", desc: "曾无条件相信爱与善良，直到不幸命运迫使他以灰暗色调审视世界。" },
  { key: "铁石心肠的愤世嫉俗者", group: "主角", desc: "阴郁冷漠无情，但或许内心深处隐藏着一个更真实明亮的灵魂。" },
  { key: "傻福小子",    group: "主角", desc: "时常陷入令人哭笑不得的境地，却总能弄拙成巧化险为夷。" },
  { key: "赏金猎人",    group: "主角", desc: "为维持生计千方百计完成雇主委托，不管是抓捕目标还是高危任务。" },
  { key: "正义警探",    group: "主角", desc: "二十四小时全天候就位，全身心与罪恶作斗争。" },
  { key: "邪恶首脑",    group: "反派", desc: "位于黑社会顶端的掌权者，恶贯满盈。" },
  { key: "暴君",        group: "反派", desc: "依靠武力和恐惧进行统治的残酷君主。" },
  { key: "腐败官员",    group: "反派", desc: "滥用职权的蛀虫。" },
  { key: "疯狂学者",    group: "反派", desc: "视伦理道德为废纸的天赋奇才，借助惊世发明实现自身野心。" },
  { key: "恶毒女巫",    group: "反派", desc: "为达不可告人的目的，随心所欲施展黑魔法。" },
  { key: "淡漠权要",    group: "反派", desc: "国家或组织中顽固不化的要员。" },
  { key: "归来宿敌",    group: "反派", desc: "曾在主角过往留下烙印的危险对手，突然从阴影中现身。" },
  { key: "反目旧友",    group: "反派", desc: "主角和反派曾经是一边的，时过境迁或观点分歧使他们站到了壁垒两端。" },
  { key: "规矩化身",    group: "反派", desc: "法律站在他这边的好人，但其刻板僵化无视体制缺陷让人难以对他心生好感。" },
  { key: "最佳拍档",    group: "配角", desc: "主角肝胆相照的伙伴，密友、第二把手或风趣同伴。" },
  { key: "永生恩师",    group: "配角", desc: "主角的明灯与教师，为主角指引人生方向或传授技艺。" },
  { key: "神秘指引者",  group: "配角", desc: "能稍微揭露隐藏世界阴暗面的人物，言语暗藏机锋，知道的比说出来的多。" },
  { key: "心上情人",    group: "配角", desc: "主角所倾心的梦中情人。" },
  { key: "暴躁上司",    group: "配角", desc: "主角的上司，似乎没有一天不板着个脸，处处刁难主角。" },
  { key: "蛇蝎美人",    group: "配角", desc: "神秘莫测、气质清冷的女性，目的似乎相当可疑。" },
  { key: "关键证人",    group: "配角", desc: "机缘巧合掌握了某种关键信息的人物，因此成了反派的目标。" },
  { key: "左膀右臂",    group: "配角", desc: "反派的副手，通常负责执行其主子的邪恶计划。" },
  { key: "强力对手",    group: "配角", desc: "与主角之间并非敌对但在互相竞争的角色，如福尔摩斯与雷斯垂德。" },
];

// ── 人物性格特质 ──────────────────────────────────────────────
export const CHARACTER_TRAITS = [
  "炮仗脾气", "泰然自若", "完美主义", "乐天人士", "郁郁寡欢",
  "天生领导", "团队精神", "自命不凡", "低调行事", "平易近人",
  "业精于勤", "无所用心", "恪守成规", "肆意妄为", "公事公办",
  "嗜酒如命", "狂热赌徒", "吸毒成瘾", "秉节持重", "不偏不倚"
];

// ── 关系类型选项 ──────────────────────────────────────────────
export const RELATIONSHIP_TYPE_OPTIONS = [
  "三角恋情", "假面情侣", "强制婚约", "博得芳心", "单向爱意",
  "手足战友", "师徒传承", "强力对手", "左膀右臂", "暴躁上司",
  "反目旧友", "归来宿敌", "大家长式"
];

// ── 情节套路选项 ──────────────────────────────────────────────
export const PLOT_TROPE_OPTIONS = [
  "营救任务", "终极对决", "背信弃义", "走入埋伏", "惊险追逐",
  "金蝉脱壳", "逃离囚禁", "不幸被俘", "宏伟大战", "保护证人",
  "至亲亡故", "漫漫旅途", "重出江湖", "最后一票", "薪火相传",
  "为爱寻仇", "拯救挚爱", "公开示爱", "三角恋情", "世代冲突",
  "厄运变身", "诅咒契约", "帮派战争", "发奋图强", "夺宝奇兵"
];

// ── 结局方向选项 ──────────────────────────────────────────────
export const ENDING_DIRECTION_OPTIONS = [
  "罪有应得", "相濡以沫", "生活美满", "实现自我", "劳燕分飞",
  "天网恢恢", "结为夫妻", "寻得真爱", "家人团聚", "逍遥法外",
  "公诸于世", "同归于尽", "成长蜕变", "终得归家",
  "主角得到救赎", "主角彻底隐退", "皆有所悟", "主角梦碎",
  "旗开得胜邪恶犹存", "主人公重拾理想信念", "宝藏永失"
];

export const plotTypeLabels = {
  mainline: "主线",
  enhancement: "强化",
  alternate: "备选"
};

export const plotStatusLabels = {
  draft: "草拟",
  exploring: "推演中",
  review: "待确认",
  locked: "已锁定",
  discarded: "已废弃"
};

export const sceneStatusLabels = {
  draft: "草稿",
  outline: "大纲",
  locked: "已锁定",
  scripted: "已写成稿"
};

export const relationshipStatusLabels = {
  active: "使用中",
  locked: "已锁定",
  retired: "停用"
};

export const setupStatusLabels = {
  open: "未回收",
  partial: "部分回收",
  closed: "已回收"
};

export const NODE_TOOLTIPS = {
  opening_image:    "【开场印象】前60秒建立故事情感基调。成功标准：观众知道「这是什么感受的故事」。常见失误：堆砌信息，忘记放情感。结尾印象必须与此镜像呼应。",
  setup:            "【世界与缺口】展示主角「普通世界」里的内在缺口——他缺少什么，不知道自己缺少什么。成功标准：观众感受到主角的不完整。常见失误：把铺陈做成说明书。",
  catalyst:         "【诱发事件】打破主角平衡的外力事件，主角不得不做出反应。McKee：价值从+翻-（或-翻+）。成功标准：故事世界的规则发生不可逆改变。",
  lock_in:          "【主线锁定】主角主动选择踏入「冒险世界」，退路关闭。Field：第一幕转折点。成功标准：主角从被动反应变为主动行动。常见失误：主角被事件推着走，没有做出选择。",
  promise:          "【故事承诺兑现】给观众他们「买票」期待的内容——类型该有的场景在此段落集中出现。成功标准：观众获得满足感并愿意投入。",
  midpoint:         "【中点翻转】主角行动性质从被动转主动，故事重心不可逆移位。Snyder：假胜利或假失败。成功标准：观众感受到「之后无法回头」。常见失误：把高潮提前放在中点导致后劲不足。",
  reversal:         "【局势反扑】反派/命运的最强反击，主角陷入最深困境，全部看似失去。成功标准：观众认为主角已无路可走。",
  collapse:         "【崩塌时刻】主角灵魂的黑暗时刻——所有外部支撑消失，必须直面内心缺口。McKee：此处必须做出真实选择，而非依赖运气。",
  final_choice:     "【最终选择】主角用行动（而非语言）证明自己真正改变了。成功标准：观众看到角色弧光完成。常见失误：主角靠外部帮助解决，而非内在转变。",
  finale:           "【终局行动】执行最终选择，高潮戏剧冲突解决。成功标准：所有伏线回收，冲突有明确结果。",
  aftershock:       "【余波落点】展示「新世界」状态，与开场印象形成镜像对比，印证主角的蜕变。",
  break_into_two:   "【进入第二幕】主角越过「普通世界」边界，进入「冒险世界」，规则已变。成功标准：画面或场景能看出世界已变。",
  b_story:          "【副线启动】副线角色往往是主线主题的镜子，负责输送主题信息。常见失误：副线与主线无主题联系。",
  pressure_wave:    "【压力推进】持续累积压力，让主角没有喘息空间，选项越来越少。成功标准：每场戏结束时代价比上一场更高。",
  crisis:           "【危机时刻】所有选项都不好时，主角被迫做出最痛的选择。成功标准：观众能感受到选择的真实代价。",
  break_into_three: "【进入第三幕】主角完成内在转变，做好最终行动的准备。成功标准：观众能感受到主角「准备好了」。",
  final_image:      "【结尾印象】与开场印象对称呼应，展示故事对主角造成的真实改变。",
  cold_open:        "【冷开场钩子】前90秒必须建立剧集气质并抛出无法忽视的悬念。成功标准：观众决定继续看。",
  series_premise:   "【剧集前提建立】建立剧集「引擎」——驱动整季叙事的持续冲突或问题。成功标准：观众明白「这部剧是关于什么的持续问题」。",
  protagonist_problem: "【主角问题抛出】本集主角的具体问题，同时暗示季长线。成功标准：问题既能在本集推进，又留有更大伏笔。",
  world_expansion:  "【世界扩张】把剧集世界的规则、人物关系网和长期冲突源推出来。成功标准：观众看到「可以持续追看的世界」。",
  midpoint_hook:    "【中段钩子】强化追看动力，引入新变量或反转，阻止观众在中途放弃。",
  escalation:       "【关系与危机升级】人物关系发生不可逆变化，危机升级到本集高潮前的最高点。",
  episode_climax:   "【本集高潮】本集核心冲突的最高点，必须有明确的结果（暂时性解决或失败）。",
  season_hook:      "【尾钩与续看承诺】本集/本季结尾的钩子，让观众无法不看下一集/下一季。",
  season_engine:    "【季引擎建立】确立整季的核心驱动冲突（人物关系、外部压力或世界难题）。",
  cast_network:     "【人物群关系网】建立所有主要人物的关系拓扑和初始站位，以便后续碰撞重组。",
  line_split:       "【多线展开】把季引擎分裂为多条并行推进的故事线，彼此之间有主题联系。",
  midseason_shift:  "【季中转向】半季时发生不可逆的格局重组，让剩余各集有新的驱动力。",
  line_collision:   "【线索碰撞】各条故事线开始交叉碰撞，推向季终的收束。",
  endgame_push:     "【终局推进】把所有主要人物推到最高风险位置，为季终高潮做最后准备。",
  season_climax:    "【季终高潮】季度核心冲突的最高点，多条线在此汇聚并分出胜负。",
  next_season_hook: "【下一季钩子】在季终兑现后留下新问题或新威胁，保证观众期待下一季。",
  hook:             "【起手钩子】短片必须在前15秒抓住观众注意力。成功标准：观众有「这是什么」的好奇。",
  core_turn:        "【核心转折】短片的唯一关键转折，所有铺垫都指向这一刻。成功标准：转折既在意料之外又在情理之中。",
  payoff:           "【落点回收】回收开场的意象、问题或情感，给短片一个完整的感受闭环。",
  episode_hook:     "【前几集起钩】用前三集快速建立爽点、主角魅力和追更钩子，锁定观众。",
  identity_flip:    "【身份/关系反转】主角身份或核心关系发生翻转，制造最强烈的戏剧冲击。",
  cliff_loop:       "【追更钩子循环】每集结尾必须有让人无法停止的钩子——悬念、反转或情感高峰。",
  stage_peak:       "【阶段爆点】全剧中的几次大型爆点，重置人物关系和阵营站位。",
  final_payoff:     "【大结局回收】回收所有主线伏笔，给观众最终的情感和戏剧满足。",
  reaction:         "【反应段】主角在第一转折后的反应期——被动应对，摸索规则，代价持续累积。",
  attack:           "【主动进攻】主角主动出击，看似接近目标，但实际在走向崩塌。",
  setup_nodes:      "【基础铺陈】建立主角的「普通世界」和内在缺口，为转变埋下根基。",
  midpoint_turn:    "【中点翻转】主角从被动转主动，故事不可逆转。",
  segment_1:        "【开端段落】快速建立故事世界、主角和核心问题。",
  segment_2:        "【中间段落】推进冲突，让主角面对越来越高的代价。",
  segment_3:        "【收束段落】完成最终选择并落点。"
};

export const structurePresets = {
  feature_film: {
    acts: [
      { key: "act_1", title: "第一幕", purpose: "立人物缺口与世界压力", range_label: "0% - 12%" },
      { key: "act_2", title: "第二幕", purpose: "诱发事件后锁定主线", range_label: "12% - 30%" },
      { key: "act_3", title: "第三幕", purpose: "在中段持续兑现故事承诺", range_label: "30% - 55%" },
      { key: "act_4", title: "第四幕", purpose: "连续反扑并逼近崩塌", range_label: "55% - 80%" },
      { key: "act_5", title: "第五幕", purpose: "决断、终局与余波", range_label: "80% - 100%" }
    ],
    nodes: [
      ["opening_image", "act_1", "开场印象", true],
      ["setup", "act_1", "世界与缺口", true],
      ["catalyst", "act_2", "诱发事件", true],
      ["lock_in", "act_2", "主线锁定", true],
      ["promise", "act_3", "故事承诺兑现", true],
      ["midpoint", "act_3", "中点翻转", true],
      ["reversal", "act_4", "局势反扑", true],
      ["collapse", "act_4", "崩塌时刻", true],
      ["final_choice", "act_5", "最终选择", true],
      ["finale", "act_5", "终局行动", true],
      ["aftershock", "act_5", "余波落点", false]
    ]
  },
  pilot_episode: {
    acts: [
      { key: "teaser", title: "冷开场", purpose: "先抛出剧集气质和悬念钩子", range_label: "0% - 10%" },
      { key: "act_1", title: "第一段", purpose: "立主角、立世界、立本集问题", range_label: "10% - 30%" },
      { key: "act_2", title: "第二段", purpose: "把人物关系和剧集引擎推出来", range_label: "30% - 55%" },
      { key: "act_3", title: "第三段", purpose: "放大冲突并建立持续观看动力", range_label: "55% - 85%" },
      { key: "tag", title: "尾钩", purpose: "用尾钩把观众送进下一集", range_label: "85% - 100%" }
    ],
    nodes: [
      ["cold_open", "teaser", "冷开场钩子", true],
      ["series_premise", "act_1", "剧集前提建立", true],
      ["protagonist_problem", "act_1", "主角问题抛出", true],
      ["episode_break_1", "act_2", "第一段落钩子", false],
      ["world_expansion", "act_2", "世界扩张", true],
      ["midpoint_hook", "act_2", "中段钩子", true],
      ["escalation", "act_3", "关系与危机升级", true],
      ["episode_climax", "act_3", "本集高潮", true],
      ["season_hook", "tag", "尾钩与续看承诺", true]
    ]
  },
  series_season: {
    acts: [
      { key: "act_1", title: "开季段", purpose: "建立季目标、主冲突和人物群", range_label: "0% - 20%" },
      { key: "act_2", title: "前中段", purpose: "推进多线并持续扩张世界", range_label: "20% - 45%" },
      { key: "act_3", title: "中后段", purpose: "让各线开始碰撞与重组", range_label: "45% - 70%" },
      { key: "act_4", title: "冲刺段", purpose: "把关键线推到失控边缘", range_label: "70% - 90%" },
      { key: "act_5", title: "季终段", purpose: "季终兑现并留下下一季钩子", range_label: "90% - 100%" }
    ],
    nodes: [
      ["season_engine", "act_1", "季引擎建立", true],
      ["cast_network", "act_1", "人物群关系网", true],
      ["line_split", "act_2", "多线展开", true],
      ["midseason_shift", "act_3", "季中转向", true],
      ["line_collision", "act_3", "线索碰撞", true],
      ["endgame_push", "act_4", "终局推进", true],
      ["season_climax", "act_5", "季终高潮", true],
      ["next_season_hook", "act_5", "下一季钩子", false]
    ]
  },
  short_form: {
    acts: [
      { key: "act_1", title: "起", purpose: "快速立人立题", range_label: "0% - 40%" },
      { key: "act_2", title: "转合", purpose: "完成转折并迅速落点", range_label: "40% - 100%" }
    ],
    nodes: [
      ["hook", "act_1", "起手钩子", true],
      ["core_turn", "act_2", "核心转折", true],
      ["payoff", "act_2", "落点回收", true]
    ]
  },
  micro_drama_serial: {
    acts: [
      { key: "act_1", title: "起钩集群", purpose: "用前几集快速起钩并锁定爽点", range_label: "0% - 20%" },
      { key: "act_2", title: "连续反转", purpose: "保持每集结尾的追更钩子", range_label: "20% - 55%" },
      { key: "act_3", title: "阶段爆点", purpose: "用几次大爆点重置关系和站位", range_label: "55% - 85%" },
      { key: "act_4", title: "大结局", purpose: "完成总回收并给终极爽点", range_label: "85% - 100%" }
    ],
    nodes: [
      ["episode_hook", "act_1", "前几集起钩", true],
      ["identity_flip", "act_2", "身份/关系反转", true],
      ["cliff_loop", "act_2", "追更钩子循环", true],
      ["stage_peak", "act_3", "阶段爆点", true],
      ["final_payoff", "act_4", "大结局回收", true]
    ]
  },
  three_act: {
    acts: [
      { key: "act_1", title: "第一幕", purpose: "建立世界与问题", range_label: "0% - 25%" },
      { key: "act_2", title: "第二幕", purpose: "持续升级冲突", range_label: "25% - 75%" },
      { key: "act_3", title: "第三幕", purpose: "完成最终选择", range_label: "75% - 100%" }
    ],
    nodes: [
      ["opening_image", "act_1", "开场印象", true],
      ["setup", "act_1", "基础铺陈", true],
      ["catalyst", "act_1", "诱发事件", true],
      ["break_into_two", "act_1", "进入第二幕", true],
      ["b_story", "act_2", "副线启动", false],
      ["midpoint", "act_2", "中点翻转", true],
      ["pressure_wave", "act_2", "压力推进", true],
      ["crisis", "act_2", "危机时刻", true],
      ["break_into_three", "act_2", "进入第三幕", true],
      ["finale", "act_3", "终局行动", true],
      ["final_image", "act_3", "结尾印象", false]
    ]
  },
  four_act: {
    acts: [
      { key: "act_1", title: "第一幕", purpose: "立人物与问题", range_label: "0% - 20%" },
      { key: "act_2", title: "第二幕", purpose: "先反应，后试探", range_label: "20% - 45%" },
      { key: "act_3", title: "第三幕", purpose: "主动推进再崩塌", range_label: "45% - 75%" },
      { key: "act_4", title: "第四幕", purpose: "决断与收束", range_label: "75% - 100%" }
    ],
    nodes: [
      ["setup", "act_1", "基础铺陈", true],
      ["catalyst", "act_1", "诱发事件", true],
      ["break_into_two", "act_1", "第一转折", true],
      ["reaction", "act_2", "反应段", true],
      ["midpoint", "act_2", "中点翻转", true],
      ["attack", "act_3", "主动进攻", true],
      ["crisis", "act_3", "局势崩塌", true],
      ["finale", "act_4", "高潮对决", true],
      ["final_image", "act_4", "结尾收束", true]
    ]
  }
};

export function buildCustomStructurePreset(rawActCount = 2) {
  const actCount = Math.max(1, Math.min(6, Number(rawActCount) || 2));
  const acts = Array.from({ length: actCount }, (_, index) => {
    const start = Math.round((index / actCount) * 100);
    const end = Math.round(((index + 1) / actCount) * 100);
    return {
      key: `act_${index + 1}`,
      title: `第 ${index + 1} 幕`,
      purpose:
        index === 0 ? "建立起点" : index === actCount - 1 ? "收束与落点" : "推进变化与转折",
      range_label: `${start}% - ${end}%`
    };
  });
  const nodes = [];
  for (let index = 0; index < actCount; index += 1) {
    const actKey = `act_${index + 1}`;
    const seq = index + 1;
    nodes.push([
      `segment_${seq}`,
      actKey,
      seq === 1 ? "开端段落" : seq === actCount ? "收束段落" : `第 ${seq} 幕段落`,
      true
    ]);
    if (seq < actCount) {
      nodes.push([`turn_${seq}`, actKey, `第 ${seq} 幕转折`, false]);
    }
  }
  return { acts, nodes, custom_act_count: actCount };
}

export function getDefaultTemplateForFormat(format) {
  return formatDefaultTemplates[format] ?? "feature_film";
}

export function getStructureOptionsForFormat(format, currentTemplate = null) {
  const values = [...(formatStructureOptions[format] ?? ["feature_film", "pilot_episode", "three_act", "four_act", "custom"])];
  if (currentTemplate && !values.includes(currentTemplate)) {
    values.unshift(currentTemplate);
  }
  return values.map((value) => [value, structureTemplateLabels[value] ?? value]);
}

export function createDefaultProjectDraft() {
  return {
    title: "",
    format: "feature",
    language: "zh-CN",
    genre: [],
    logline: "",
    theme_question: "",
    tone: "",
    theme: "",
    protagonist: "",
    arc_start: "",
    arc_end: "",
    motif: "",
    setting: "",
    audience_promise: "",
    structure_template: "feature_film",
    custom_act_count: "2",
    core_conflict: "",
    external_goal: "",
    internal_need: ""
  };
}

// ── 场景编织：场景目标模板 ──────────────────────────────────
export const SCENE_GOAL_OPTIONS = ["说服对方", "逃离此地", "获取物品", "揭露真相", "保护某人", "赢得比赛", "完成仪式", "传递信息", "赢得信任", "摆脱追踪"];

// ── 场景编织：场景结局 ──────────────────────────────────────
export const SCENE_OUTCOME_OPTIONS = ["目标达成", "目标失败", "达成但有意外后果", "虽败但有意外收获"];

// ── 场景编织：情感节拍 ──────────────────────────────────────
export const EMOTION_OPTIONS = [
  "喜悦", "信任", "恐惧", "惊讶", "悲伤", "厌恶", "愤怒", "期待",
  "兴奋", "满足", "敬畏", "惊恐", "悔恨", "轻蔑", "恼怒", "希望",
  "焦虑", "沮丧", "怀疑", "内疚", "自豪", "同情", "羞耻", "平静",
  "释然", "困惑", "警惕", "乐观", "压抑", "绝望", "愉快", "紧张"
];

// ── 场景编织：对白与潜台词 ──────────────────────────────────
export const DIALOGUE_STYLE_OPTIONS = [
  { key: "naturalism", label: "自然主义", desc: "贴近生活的真实对话" },
  { key: "dramatic",   label: "戏剧化",   desc: "富有张力的戏剧对话" },
  { key: "humorous",   label: "幽默风趣", desc: "轻松诙谐的对话风格" },
  { key: "poetic",     label: "诗意抒情", desc: "富有诗意的文艺对话" }
];

export const SUBTEXT_OPTIONS = [
  "威胁（包装成关心）", "试探（包装成闲聊）", "爱意（包装成抱怨）",
  "嫉妒（包装成祝福）", "恐惧（包装成愤怒）", "不信任（包装成赞美）",
  "厌恶（包装成礼貌）", "怀念（包装成指责）", "自卑（包装成自大）", "愧疚（包装成指责）"
];

export const DIALOGUE_POWER_OPTIONS = ["平等", "主导", "被动", "审问"];
export const DIALOGUE_PACE_OPTIONS  = ["快速交锋", "缓慢推进", "对峙沉默"];

// ── 场景编织：行为与描述风格 ────────────────────────────────
export const DESC_DENSITY_OPTIONS  = ["极简", "标准", "丰富"];
export const WRITING_STYLE_OPTIONS = [
  "冷静客观", "感官沉浸", "快节奏冲击", "诗意渲染",
  "黑色幽默", "纪实风格", "超现实", "意识流", "极简主义", "巴洛克式"
];

// ── 角色心理剖面 ─────────────────────────────────────────────
// MBTI 16 种人格类型（按四个集群分组）
export const CHARACTER_MBTI_TYPES = [
  // 分析家 NT
  { code: "INTJ", name: "建筑师", group: "analyst" },
  { code: "INTP", name: "逻辑学家", group: "analyst" },
  { code: "ENTJ", name: "指挥官", group: "analyst" },
  { code: "ENTP", name: "辩论家", group: "analyst" },
  // 外交官 NF
  { code: "INFJ", name: "提倡者", group: "diplomat" },
  { code: "INFP", name: "调停者", group: "diplomat" },
  { code: "ENFJ", name: "主人公", group: "diplomat" },
  { code: "ENFP", name: "竞选者", group: "diplomat" },
  // 哨兵 SJ
  { code: "ISTJ", name: "物流师", group: "sentinel" },
  { code: "ISFJ", name: "守卫者", group: "sentinel" },
  { code: "ESTJ", name: "总经理", group: "sentinel" },
  { code: "ESFJ", name: "执政官", group: "sentinel" },
  // 探险家 SP
  { code: "ISTP", name: "鉴赏家", group: "explorer" },
  { code: "ISFP", name: "探险家", group: "explorer" },
  { code: "ESTP", name: "企业家", group: "explorer" },
  { code: "ESFP", name: "表演者", group: "explorer" },
];

// ── 情节元件库 ───────────────────────────────────────────────
export const PLOT_MACGUFFIN_OPTIONS  = ["神器", "失落的宝藏", "秘密公式", "致命武器", "关键证人", "神秘地图", "末日装置"];
export const PLOT_CATALYST_OPTIONS   = ["陌生人来访", "接到任务", "失去亲人", "发现秘密", "被诬陷", "世界异变", "最后通牒", "一个无法拒绝的提议"];
export const PLOT_CONFLICT_TYPE_OPTIONS = ["人与自然", "人与社会", "人与人", "人与自身"];
export const PLOT_TWIST_OPTIONS      = ["身份揭示", "真相揭示", "背叛", "情景反转"];

export const appState = {
  project: ensurePlotDrivenProject(cloneDefaultProject()),
  projectList: [],
  currentPage: "project",
  currentStepId: workflowSteps[0].id,
  toolbarMode: "compact",
  createDialogOpen: false,
  settingsDialogOpen: false,
  projectCreateStepIndex: 0,
  plotFilter: "all",
  plotContextVisible: true,
  plotEditorOpen: false,
  projectDraft: createDefaultProjectDraft(),
  createConceptOptions: [],
  selection: {
    plotCardId: null,
    characterId: null,
    relationshipId: null,
    timelineId: null,
    worldRuleId: null,
    setupId: null,
    sceneId: null
  },
  runtime: {
    serverAvailable: false,
    dirty: false,
    saving: false,
    lastSavedAt: "未保存"
  },
  ai: {
    configured: false,
    provider: "openai",
    model: "",
    source: "none"
  },
  aiConfigDraft: {
    provider: "openai",
    apiKey: "",
    model: ""
  },
  aiModelCatalog: {
    options: [],
    provider: ""
  },
  aiConfigOpen: true,
  createAssistant: {
    loading: false,
    target: "",
    message: "",
    warning: "",
    error: ""
  },
  draggedPlotCardId: null,
  saveTimer: null,
  resetConfirmPending: false,
  creation: null,
  createModePickerOpen: false,
  projectDeleteConfirmId: null,
  characterEditorOpen: false,
  characterDesign: { loading: false, error: "" },
  proCreation: {
    step: "anchor",
    anchor: "",
    anchorAnalysis: null,
    activeWb: "theme",
    genres: [],
    workbenches: {
      theme:     { questions: [], loading: false, done: false },
      character: { questions: [], loading: false, done: false },
      scene:     { questions: [], loading: false, done: false }
    },
    loading: false,
    error: null
  },
  evalRulesModalOpen: false,
  evalRules: {
    concept:       { passScore: 80, maxRetry: 2 },
    synopsis:      { passScore: 80, maxRetry: 2 },
    characters:    { passScore: 70, maxRetry: 1 },
    key_scenes:    { passScore: 70, maxRetry: 1 },
    act_structure: { passScore: 70, maxRetry: 1 },
  }
};
