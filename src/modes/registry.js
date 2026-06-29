// 三形态模式注册表：电影 / 连续剧 / 微短剧各一份显式定义。
// 组件"问模式要"步骤/落地/标准，不再散落 isSeries/isMicro 条件、靠默认值兜底（"套用"是历次形态串味 bug 的根源）。
// 只共享与形态无关的底座(AI 客户端/存储/通用控件)；形态专属的一切由此处声明。
import { formatDefaultTemplates } from "../state.js";

// 每集字段标准：连续剧用剧集口径，微短剧用短剧口径。
const SERIES_EP = {
  hook: "开场钩子（冷开场 / 抓人开场）", hookPh: "本集如何开场、迅速抓住观众",
  payoff: "本集主线推进（核心事件）", payoffPh: "本集主线发生了什么、推进到哪",
  cliff: "集尾钩子（引向下一集）", cliffPh: "结尾留什么悬念勾住下一集"
};
const MICRO_EP = {
  hook: "黄金三秒钩子（开场抓人）", hookPh: "前3秒用什么钩住观众",
  payoff: "本集爽点", payoffPh: "本集要兑付的爽/虐点",
  cliff: "集尾 cliffhanger", cliffPh: "结尾留什么钩子逼观众追下一集"
};

// steps：该形态在工作台步骤条里的有序步骤(id 对应 workflowSteps 定义)。
// landing：建项目/打开项目后的落点。episode：分集标准(null=该形态无分集)。
export const MODES = {
  feature: {
    label: "电影",
    steps: ["structure", "characters", "relationships", "plots", "scenes", "screenplay"],
    landing: { page: "workflow", step: "structure" },
    episode: null,
    structure: { numbering: "act", unitWord: "幕" }      // 第N幕 + 占比
  },
  series: {
    label: "连续剧",
    steps: ["overview", "characters", "relationships", "structure", "episodes", "plots", "scenes", "screenplay"],
    landing: { page: "workflow", step: "overview" },
    episode: { paywall: false, labels: SERIES_EP },
    structure: { numbering: "phase", unitWord: "阶段" }  // 季阶段(①②③ + 阶段名)，无电影"幕"语言
  },
  micro_drama: {
    label: "微短剧",
    steps: [],                       // 独立创作区(MICRO_STEPS)，不走工作台步骤条
    landing: { page: "micro" },
    episode: { paywall: true, labels: MICRO_EP },
    structure: { numbering: "act", unitWord: "幕" }      // 微短剧不走此结构步，占位
  }
};

export function getMode(format) {
  return MODES[format] ?? MODES.feature;          // 未登记形态(short/pilot)按电影处理
}

// 分集标准：无显式 episode 配置的形态兜底用短剧口径(保持历史默认)。
export function getEpisodeConfig(format) {
  return getMode(format).episode ?? { paywall: true, labels: MICRO_EP };
}

export function defaultTemplateFor(format) {
  return formatDefaultTemplates[format] ?? "three_act";
}

// 形态插件注册表：各形态(src/formats/*)把自己的页面渲染器 / 点击处理器注册进来，
// orchestrator(app.js) 遍历分发——core 不再静态 import 任何形态文件，从根上断「改A坏B」。
// plugin 形状：{ pages?: [(dom, appState) => void], clickHandlers?: [(action, target, id, nodeId) => boolean] }
const formatPlugins = [];
export function registerFormatPlugin(plugin) {
  formatPlugins.push(plugin);
}
export function getFormatPlugins() {
  return formatPlugins;
}
