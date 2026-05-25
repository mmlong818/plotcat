import { cloneDefaultProject } from "./data/defaultProject.js";
import { ensurePlotDrivenProject } from "./shared/plotDrivenProject.js";

export const STORAGE_KEY = "yuandian-plot-driven-workspace";
export const AUTOSAVE_DELAY = 800;

export const workflowSteps = [
  { id: "structure",     label: "结构骨架", description: "选定结构模板，划出各幕比例，标记必要的叙事节点。" },
  { id: "characters",    label: "人物核心", description: "建立主配角档案，确认各自的目标、缺口和弧光方向。" },
  { id: "relationships", label: "关系张力", description: "梳理人物之间的权力差、情感债和共同过去，找到冲突来源。" },
  { id: "plots",         label: "剧情开发", description: "把故事事件写成剧情卡，挂入对应的幕与节点，排出主次线。" },
  { id: "scenes",        label: "场景拆解", description: "把锁定后的剧情卡拆成逐场可写的场景序列；时间线/世界规则/伏笔/类型约束已移至顶部「资料库」。" },
  { id: "screenplay",    label: "剧本撰写", description: "按场景顺序撰写完整剧本，支持逐场 AI 生成与 fountain 导出。" }
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
  three_act: "三幕（好莱坞标准）",
  four_act: "四幕（电视试播常用）",
  feature_film: "五幕长片（救猫咪节拍）",
  pilot_episode: "试播集模板",
  series_season: "连续剧季结构",
  short_form: "短片模板",
  micro_drama_serial: "微短剧模板",
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

// 好莱坞常规：三幕（Three-Act Structure）是行业默认，四幕（Four-Act Television）多用于电视试播
export const formatDefaultTemplates = {
  feature_or_pilot: "three_act",
  feature: "three_act",
  pilot: "four_act",
  series: "four_act",
  short: "three_act",
  micro_drama: "three_act"
};

export const formatStructureOptions = {
  feature: ["three_act", "four_act", "feature_film", "custom"],
  feature_or_pilot: ["three_act", "four_act", "feature_film", "pilot_episode", "custom"],
  pilot: ["four_act", "three_act", "pilot_episode", "custom"],
  series: ["four_act", "series_season", "custom"],
  short: ["three_act", "short_form", "custom"],
  micro_drama: ["three_act", "micro_drama_serial", "custom"]
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
      { key: "act_1", title: "第一幕 · 建置", purpose: "建立世界、人物、激励事件", range_label: "0% - 25%" },
      { key: "act_2", title: "第二幕 · 对抗", purpose: "主角面对障碍，矛盾持续升级", range_label: "25% - 75%" },
      { key: "act_3", title: "第三幕 · 解决", purpose: "高潮决战与角色弧光收束", range_label: "75% - 100%" }
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
      { key: "act_1", title: "第一幕 · 钩子", purpose: "建立世界 + 强冷开场，前 10 分钟抓住观众", range_label: "0% - 20%" },
      { key: "act_2", title: "第二幕 · 升级", purpose: "诱发事件后，主角先反应再试探", range_label: "20% - 45%" },
      { key: "act_3", title: "第三幕 · 重击", purpose: "中点翻转，主角主动推进再被打回原形", range_label: "45% - 75%" },
      { key: "act_4", title: "第四幕 · 收束", purpose: "最终决断 + 余波 + 季终钩子", range_label: "75% - 100%" }
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
    structure_template: "three_act",
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
    sceneId: null,
    screenplaySceneId: null,
    nodeId: null
  },
  visitedSteps: [],
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
  characterDesign: { loading: false, error: "" },
  screenplayAi: { busySceneIds: [], bulkRunning: false, bulkProgress: { done: 0, total: 0 }, lastError: "" },
  knowledge: {
    sources: [],
    selectedSourceId: "",
    query: "",
    typeFilter: "",
    items: [],
    total: 0,
    loading: false,
    selectedEntry: null,
    entryLoading: false,
    importing: false,
    lastError: "",
    lastImportMessage: "",
    syncing: false
  },
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
