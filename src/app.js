import { cloneDefaultProject } from "./data/defaultProject.js";
import { createEmptyProject, createId } from "./shared/projectFactory.js";
import { ensurePlotDrivenProject } from "./shared/plotDrivenProject.js";

const STORAGE_KEY = "yuandian-plot-driven-workspace";
const AUTOSAVE_DELAY = 800;

const workflowSteps = [
  { id: "structure", label: "结构页", description: "先定模板、幕和必要节点，再把故事主问题与节奏卡位。" },
  { id: "plots", label: "剧情板", description: "所有创作先进入剧情卡，再拖到对应的幕和节点下。" },
  { id: "characters", label: "角色台", description: "让人物与关系成为一级对象，并反向影响剧情主线。" },
  { id: "genres", label: "类型约束", description: "把类型承诺、节拍期待和禁区收成一套约束层。" },
  { id: "locks", label: "锁定层", description: "把确认过的剧情沉淀成时间线、规则和伏笔等长期事实。" },
  { id: "scenes", label: "场景页", description: "把锁定后的剧情卡拆到场，形成真正可写的场景序列。" }
];

const projectCreateSteps = [
  {
    id: "basics",
    eyebrow: "步骤 1 / 4",
    title: "定义形态",
    description: "先确定这次创作属于什么形态，再给它一个大致的类型方向。"
  },
  {
    id: "title",
    eyebrow: "步骤 2 / 4",
    title: "命名",
    description: "给这个尚未成形的故事一个能立住的名字。"
  },
  {
    id: "logline",
    eyebrow: "步骤 3 / 4",
    title: "核心梗概",
    description: "用一句话抓住故事的主冲突和吸引力。"
  },
  {
    id: "blueprint",
    eyebrow: "步骤 4 / 4",
    title: "蓝图确认",
    description: "把主题、主角、弧光、母题和世界起点先锁成创作起点。"
  }
];

const projectCreateStepsV2 = [
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
    title: "命名",
    description: "方向确定后，再给这个故事起一个能立住的名字。"
  },
  {
    id: "blueprint",
    eyebrow: "步骤 4 / 4",
    title: "蓝图确认",
    description: "把主题、主角、弧光和世界起点锁成创作起点。"
  }
];

const formatLabels = {
  feature_or_pilot: "电影 / 试播集",
  feature: "电影",
  pilot: "试播集",
  series: "连续剧",
  short: "短片",
  micro_drama: "微短剧"
};

const projectFormatChoices = ["feature", "pilot", "series", "short", "micro_drama"];

const projectCreateStepsCurrent = [
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

const structureTemplateLabels = {
  feature_film: "电影长片模式",
  pilot_episode: "试播集模式",
  series_season: "连续剧季结构",
  short_form: "短片模式",
  micro_drama_serial: "微短剧模式",
  three_act: "三幕剧",
  four_act: "四幕剧",
  custom: "自定义"
};

const projectDraftFieldLabels = {
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

const formatDefaultTemplates = {
  feature_or_pilot: "feature_film",
  feature: "feature_film",
  pilot: "pilot_episode",
  series: "series_season",
  short: "short_form",
  micro_drama: "micro_drama_serial"
};

const formatStructureOptions = {
  feature: ["feature_film", "three_act", "four_act", "custom"],
  feature_or_pilot: ["feature_film", "pilot_episode", "three_act", "four_act", "custom"],
  pilot: ["pilot_episode", "three_act", "four_act", "custom"],
  series: ["series_season", "custom"],
  short: ["short_form", "custom"],
  micro_drama: ["micro_drama_serial", "custom"]
};

const projectStatusLabels = {
  development: "开发中",
  active: "进行中",
  paused: "暂停中"
};

const storyRoleLabels = {
  protagonist: "主角",
  supporting: "配角",
  ally: "盟友",
  opponent_ally: "复杂盟友",
  antagonist: "对手"
};

const plotTypeLabels = {
  mainline: "主线",
  enhancement: "强化",
  alternate: "备选"
};

const plotStatusLabels = {
  draft: "草拟",
  exploring: "推演中",
  review: "待确认",
  locked: "已锁定",
  discarded: "已废弃"
};

const sceneStatusLabels = {
  draft: "草稿",
  outline: "大纲",
  locked: "已锁定",
  scripted: "已写成稿"
};

const relationshipStatusLabels = {
  active: "使用中",
  locked: "已锁定",
  retired: "停用"
};

const setupStatusLabels = {
  open: "未回收",
  partial: "部分回收",
  closed: "已回收"
};

const structurePresets = {
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

function buildCustomStructurePreset(rawActCount = 2) {
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

function getDefaultTemplateForFormat(format) {
  return formatDefaultTemplates[format] ?? "feature_film";
}

function getStructureOptionsForFormat(format, currentTemplate = null) {
  const values = [...(formatStructureOptions[format] ?? ["feature_film", "pilot_episode", "three_act", "four_act", "custom"])];
  if (currentTemplate && !values.includes(currentTemplate)) {
    values.unshift(currentTemplate);
  }
  return values.map((value) => [value, structureTemplateLabels[value] ?? value]);
}

const appState = {
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
  saveTimer: null
};

const dom = {
  hero: document.querySelector(".hero"),
  heroEyebrow: document.querySelector("#hero-eyebrow"),
  heroTitle: document.querySelector("#hero-title"),
  heroDescription: document.querySelector("#hero-description"),
  heroStepperNav: document.querySelector("#hero-stepper-nav"),
  heroSide: document.querySelector(".hero__side"),
  runtimeStatus: document.querySelector("#runtime-status"),
  saveButton: document.querySelector("#save-button"),
  toolbarModeGroup: document.querySelector("#toolbar-mode-group"),
  toolbarDensityButton: document.querySelector("#toolbar-density-button"),
  toolbarHideButton: document.querySelector("#toolbar-hide-button"),
  toolbarRevealButton: document.querySelector("#toolbar-reveal-button"),
  resetButton: document.querySelector("#reset-button"),
  pageProjectButton: document.querySelector("#page-project-button"),
  pageWorkflowButton: document.querySelector("#page-workflow-button"),
  openSettingsButton: document.querySelector("#open-settings-button"),
  wizardShell: document.querySelector("#wizard-shell"),
  stepTitle: document.querySelector("#step-title"),
  stepDescription: document.querySelector("#step-description"),
  stepCountChip: document.querySelector("#step-count-chip"),
  stepperNav: document.querySelector("#stepper-nav"),
  stepPrevButton: document.querySelector("#step-prev-button"),
  stepNextButton: document.querySelector("#step-next-button"),
  projectList: document.querySelector("#project-list"),
  projectCreateDialog: document.querySelector("#project-create-dialog"),
  projectCreateEyebrow: document.querySelector("#project-create-eyebrow"),
  projectCreateTitle: document.querySelector("#project-create-title"),
  projectCreateDescription: document.querySelector("#project-create-description"),
  projectCreateProgress: document.querySelector("#project-create-progress"),
  projectCreateForm: document.querySelector("#project-create-form"),
  cancelCreateProjectButton: document.querySelector("#cancel-create-project-button"),
  confirmCreateProjectButton: document.querySelector("#confirm-create-project-button"),
  settingsDialog: document.querySelector("#settings-dialog"),
  settingsForm: document.querySelector("#settings-form"),
  closeSettingsButton: document.querySelector("#close-settings-button"),
  structureContent: document.querySelector("#structure-content"),
  plotsContent: document.querySelector("#plots-content"),
  charactersContent: document.querySelector("#characters-content"),
  relationshipsContent: document.querySelector("#relationships-content"),
  genresContent: document.querySelector("#genres-content"),
  locksContent: document.querySelector("#locks-content"),
  scenesContent: document.querySelector("#scenes-content"),
  pagePanels: Array.from(document.querySelectorAll("main [data-page]")),
  stepPanels: Array.from(document.querySelectorAll("[data-step-group]"))
};

let renderPlotsPage;
let renderCharactersPage;
let renderScenesPage;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values = []) {
  return [...new Set(list(values).map((item) => String(item ?? "").trim()).filter(Boolean))];
}

function splitTags(value = "") {
  return unique(String(value ?? "").split(/[銆?锛?锝渱]/).map((item) => item.trim()));
}

function renderEmptyState(message) {
  return `<div class="empty-state"><p>${escapeHtml(message)}</p></div>`;
}

function field(label, control, full = false) {
  return `<div class="field ${full ? "field--full" : ""}"><label>${escapeHtml(label)}</label>${control}</div>`;
}

function inputField(label, action, fieldName, value, options = {}) {
  const type = options.type ?? "text";
  return field(
    label,
    `<input type="${type}" data-action="${action}" data-field="${fieldName}" value="${escapeHtml(value)}" />`,
    options.full
  );
}

function textareaField(label, action, fieldName, value, options = {}) {
  return field(
    label,
    `<textarea data-action="${action}" data-field="${fieldName}" rows="${options.rows ?? 4}">${escapeHtml(value)}</textarea>`,
    options.full ?? true
  );
}

function selectField(label, action, fieldName, value, choices, options = {}) {
  const items = choices
    .map(
      ([optionValue, optionLabel]) =>
        `<option value="${escapeHtml(optionValue)}" ${optionValue === value ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`
    )
    .join("");
  return field(
    label,
    `<select data-action="${action}" data-field="${fieldName}">${items}</select>`,
    options.full
  );
}

function isCreateAssistantBusy(target) {
  return appState.createAssistant.loading && appState.createAssistant.target === target;
}

function createDraftField(label, control, options = {}) {
  const busy = options.aiField ? isCreateAssistantBusy(`field:${options.aiField}`) : false;
  const actionButton = options.aiField
    ? `
      <button
        class="button button--ghost button--tiny ${busy ? "is-busy" : ""}"
        type="button"
        data-action="create-ai-field"
        data-field="${escapeHtml(options.aiField)}"
        ${appState.createAssistant.loading ? "disabled" : ""}
      >
        ${busy ? "生成中..." : "AI 重写"}
      </button>
    `
    : "";

  return `
    <div class="field ${options.full ? "field--full" : ""} create-field">
      <div class="create-field__head">
        <label>${escapeHtml(label)}</label>
        ${actionButton}
      </div>
      ${control}
    </div>
  `;
}

function createDraftInputField(label, fieldName, value, options = {}) {
  const type = options.type ?? "text";
  return createDraftField(
    label,
    `<input type="${type}" data-action="draft-field" data-field="${fieldName}" value="${escapeHtml(value)}" />`,
    options
  );
}

function createDraftTextareaField(label, fieldName, value, options = {}) {
  return createDraftField(
    label,
    `<textarea data-action="draft-field" data-field="${fieldName}" rows="${options.rows ?? 4}">${escapeHtml(value)}</textarea>`,
    { ...options, full: options.full ?? true }
  );
}

function createDraftSelectField(label, fieldName, value, choices, options = {}) {
  const items = choices
    .map(
      ([optionValue, optionLabel]) =>
        `<option value="${escapeHtml(optionValue)}" ${optionValue === value ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`
    )
    .join("");
  return createDraftField(
    label,
    `<select data-action="draft-field" data-field="${fieldName}">${items}</select>`,
    options
  );
}

function createDefaultProjectDraft() {
  return {
    title: "",
    format: "feature",
    language: "zh-CN",
    genre: "",
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

function getProjectCreateStep() {
  return projectCreateStepsCurrent[appState.projectCreateStepIndex] ?? projectCreateStepsCurrent[0];
}

function resetProjectCreateWizard() {
  appState.projectDraft = createDefaultProjectDraft();
  appState.createConceptOptions = [];
  appState.projectCreateStepIndex = 0;
  appState.aiConfigOpen = !appState.ai.configured;
  appState.createAssistant.loading = false;
  appState.createAssistant.target = "";
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
}

function canAdvanceProjectCreate() {
  const step = getProjectCreateStep();
  if (step.id === "basics") {
    return Boolean(appState.projectDraft.format);
  }
  if (step.id === "logline") {
    return Boolean(appState.projectDraft.logline.trim() && appState.projectDraft.core_conflict.trim());
  }
  if (step.id === "title") {
    return Boolean(appState.projectDraft.title.trim());
  }
  return Boolean(appState.projectDraft.title.trim() && appState.projectDraft.logline.trim());
}

function createAssistantStatusText() {
  if (appState.ai.configured) {
    return `当前使用 ${appState.ai.model || "OpenAI"}，可以直接生成建议。`;
  }
  return "当前未连接 OpenAI，会先使用本地建议生成草稿。";
}

function createAssistantStepLabel(stepId) {
  if (stepId === "basics") return "AI 推荐这一步";
  if (stepId === "title") return "AI 生成片名";
  if (stepId === "logline") return "AI 生成概念";
  return "AI 补全蓝图";
}

function renderCreateAssistantFeedback() {
  const type = appState.createAssistant.error
    ? "error"
    : appState.createAssistant.warning
      ? "warning"
      : appState.createAssistant.message
        ? "info"
        : "";
  const text =
    appState.createAssistant.error ||
    appState.createAssistant.warning ||
    appState.createAssistant.message;
  if (!text) {
    return "";
  }
  return `<div class="create-ai-feedback ${type ? `is-${type}` : ""}">${escapeHtml(text)}</div>`;
}

function renderCreateAssistantToolbar(step) {
  const target = `step:${step.id}`;
  const busy = isCreateAssistantBusy(target);
  return `
    <div class="create-step-tools">
      <div class="create-step-tools__meta">
        <span class="chip chip--soft">AI 杈呭姪</span>
        <p>${escapeHtml(createAssistantStatusText())}</p>
      </div>
      <div class="create-step-tools__actions">
        <button
          class="button button--ghost button--tiny ${busy ? "is-busy" : ""}"
          type="button"
          data-action="create-ai-step"
          data-step="${escapeHtml(step.id)}"
          ${appState.createAssistant.loading ? "disabled" : ""}
        >
          ${busy ? "鐢熸垚涓?.." : escapeHtml(createAssistantStepLabel(step.id))}
        </button>
      </div>
    </div>
    ${renderCreateAssistantFeedback()}
  `;
}

function formatCreateAssistantError(error) {
  const message = error?.message || "";
  if (/fetch|network/i.test(message)) {
    return "AI 杈呭姪闇€瑕佹湰鍦版湇鍔℃敮鎸侊紝璇烽€氳繃鏈湴鏈嶅姟鎵撳紑褰撳墠椤甸潰銆?";
  }
  return message || "AI 杈呭姪鏆傛椂涓嶅彲鐢?";
}

function createAssistantStatusTextLegacy() {
  if (appState.ai.configured) {
    return `当前使用 ${appState.ai.model || "OpenAI"}，可以直接生成建议。`;
  }
  return "当前未连接 OpenAI，会先使用本地建议生成草稿。";
}

function createAssistantStepLabelLegacy(stepId) {
  if (stepId === "basics") return "AI 推荐这一步";
  if (stepId === "title") return "AI 生成片名";
  if (stepId === "logline") return "AI 生成概念";
  return "AI 补全蓝图";
}

function isAiConfigBusyLegacy() {
  return appState.createAssistant.loading && appState.createAssistant.target === "ai-config";
}

function renderCreateAssistantToolbarLegacy(step) {
  const target = `step:${step.id}`;
  const busy = isCreateAssistantBusy(target);
  const configBusy = isAiConfigBusy();
  const showConfig = !appState.ai.configured || appState.aiConfigOpen;
  return `
    <div class="create-step-tools">
      <div class="create-step-tools__meta">
        <span class="chip chip--soft">AI 杈呭姪</span>
        <p>${escapeHtml(createAssistantStatusTextV2())}</p>
      </div>
      <div class="create-step-tools__actions">
        <button class="button button--ghost button--tiny" type="button" data-action="toggle-ai-config">
          ${showConfig ? "鏀惰捣杩炴帴" : appState.ai.configured ? "鏇存崲杩炴帴" : "杩炴帴 OpenAI"}
        </button>
        <button
          class="button button--ghost button--tiny ${busy ? "is-busy" : ""}"
          type="button"
          data-action="create-ai-step"
          data-step="${escapeHtml(step.id)}"
          ${appState.createAssistant.loading || !appState.ai.configured ? "disabled" : ""}
        >
          ${busy ? "鐢熸垚涓?.." : escapeHtml(createAssistantStepLabelV2(step.id))}
        </button>
      </div>
    </div>
    ${
      showConfig
        ? `
          <div class="create-ai-config">
            <div class="form-grid form-grid--ai">
              <div class="field field--full">
                <label>OpenAI Key</label>
                <input type="password" data-action="ai-config-field" data-field="apiKey" value="${escapeHtml(appState.aiConfigDraft.apiKey)}" placeholder="绮樿创浣犵殑 OpenAI API Key" />
              </div>
              <div class="field">
                <label>妯″瀷</label>
                <input type="text" data-action="ai-config-field" data-field="model" value="${escapeHtml(appState.aiConfigDraft.model || appState.ai.model || "gpt-5")}" placeholder="渚嬪 gpt-5" />
              </div>
            </div>
            <div class="create-ai-config__actions">
              <button
                class="button button--primary button--tiny ${configBusy ? "is-busy" : ""}"
                type="button"
                data-action="save-ai-config"
                ${appState.createAssistant.loading ? "disabled" : ""}
              >
                ${configBusy ? "杩炴帴涓?.." : "杩炴帴 OpenAI"}
              </button>
              ${
                appState.ai.configured
                  ? `<button class="button button--ghost button--tiny" type="button" data-action="disconnect-ai-config" ${appState.createAssistant.loading ? "disabled" : ""}>鏂紑</button>`
                  : ""
              }
            </div>
          </div>
        `
        : ""
    }
    ${renderCreateAssistantFeedback()}
  `;
}

function formatCreateAssistantErrorLegacy(error) {
  const message = error?.message || "";
  if (/fetch|network/i.test(message)) {
    return "AI 杈呭姪闇€瑕佹湰鍦版湇鍔℃敮鎸侊紝璇烽€氳繃鏈湴鏈嶅姟鎵撳紑褰撳墠椤甸潰銆?";
  }
  return message || "AI 杈呭姪鏆傛椂涓嶅彲鐢?";
}

function createAssistantStatusTextV2() {
  if (appState.ai.configured) {
    const provider = appState.ai.provider === "gemini" ? "Gemini" : "OpenAI";
    return `当前使用 ${provider} · ${appState.ai.model || "默认模型"}，可以直接生成建议。`;
  }
  return "褰撳墠鏈繛鎺ユā鍨嬫湇鍔★紝浼氬厛浣跨敤鏈湴寤鸿鐢熸垚鑽夌";
}

function createAssistantStepLabelV2(stepId) {
  if (stepId === "basics") return "AI 推荐这一步";
  if (stepId === "title") return "AI 生成片名";
  if (stepId === "logline") return "AI 生成概念";
  return "AI 补全蓝图";
}

function isAiConfigBusy() {
  return appState.createAssistant.loading && appState.createAssistant.target === "ai-config";
}

function providerChoiceLabel(value) {
  return value === "gemini" ? "Gemini" : "OpenAI";
}

function defaultModelForProvider(value) {
  return value === "gemini" ? "gemini-2.0-flash" : "gpt-5";
}

function renderCreateAssistantToolbarV2(step) {
  const target = `step:${step.id}`;
  const busy = isCreateAssistantBusy(target);
  const configBusy = isAiConfigBusy();
  const showConfig = !appState.ai.configured || appState.aiConfigOpen;
  const provider = appState.aiConfigDraft.provider || appState.ai.provider || "openai";
  return `
    <div class="create-step-tools">
      <div class="create-step-tools__meta">
        <span class="chip chip--soft">AI 杈呭姪</span>
        <p>${escapeHtml(createAssistantStatusTextV2())}</p>
      </div>
      <div class="create-step-tools__actions">
        <button class="button button--ghost button--tiny" type="button" data-action="toggle-ai-config">
          ${showConfig ? "鏀惰捣杩炴帴" : appState.ai.configured ? "鏇存崲杩炴帴" : "杩炴帴妯″瀷"}
        </button>
        <button
          class="button button--ghost button--tiny ${busy ? "is-busy" : ""}"
          type="button"
          data-action="create-ai-step"
          data-step="${escapeHtml(step.id)}"
          ${appState.createAssistant.loading || !appState.ai.configured ? "disabled" : ""}
        >
          ${busy ? "鐢熸垚涓?.." : escapeHtml(createAssistantStepLabelV2(step.id))}
        </button>
      </div>
    </div>
    ${
      showConfig
        ? `
          <div class="create-ai-config">
            <div class="create-wizard__choices create-wizard__choices--providers">
              ${["gemini", "openai"]
                .map(
                  (value) => `
                    <button
                      class="choice-chip choice-chip--panel ${provider === value ? "is-active" : ""}"
                      type="button"
                      data-action="ai-provider-choice"
                      data-value="${escapeHtml(value)}"
                    >
                      ${providerChoiceLabel(value)}
                    </button>
                  `
                )
                .join("")}
            </div>
            <div class="form-grid form-grid--ai">
              <div class="field field--full">
                <label>${escapeHtml(providerChoiceLabel(provider))} Key</label>
                <input
                  type="password"
                  data-action="ai-config-field"
                  data-field="apiKey"
                  value="${escapeHtml(appState.aiConfigDraft.apiKey)}"
                  placeholder="绮樿创浣犵殑 API Key"
                />
              </div>
              <div class="field">
                <label>妯″瀷</label>
                <input
                  type="text"
                  data-action="ai-config-field"
                  data-field="model"
                  value="${escapeHtml(appState.aiConfigDraft.model || appState.ai.model || defaultModelForProvider(provider))}"
                  placeholder="${escapeHtml(defaultModelForProvider(provider))}"
                />
              </div>
            </div>
            <div class="create-ai-config__actions">
              <button
                class="button button--primary button--tiny ${configBusy ? "is-busy" : ""}"
                type="button"
                data-action="save-ai-config"
                ${appState.createAssistant.loading ? "disabled" : ""}
              >
                ${configBusy ? "杩炴帴涓?.." : `杩炴帴 ${providerChoiceLabel(provider)}`}
              </button>
              ${
                appState.ai.configured
                  ? `<button class="button button--ghost button--tiny" type="button" data-action="disconnect-ai-config" ${appState.createAssistant.loading ? "disabled" : ""}>鏂紑</button>`
                  : ""
              }
            </div>
          </div>
        `
        : ""
    }
    ${renderCreateAssistantFeedback()}
  `;
}

function formatCreateAssistantErrorV2(error) {
  const message = error?.message || "";
  if (/fetch|network/i.test(message)) {
    return "AI 杈呭姪闇€瑕佹湰鍦版湇鍔℃敮鎸侊紝璇烽€氳繃鏈湴鏈嶅姟鎵撳紑褰撳墠椤甸潰銆?";
  }
  return message || "AI 杈呭姪鏆傛椂涓嶅彲鐢?";
}

function formatTime(value) {
  if (!value) {
    return "未保存";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "未保存" : date.toLocaleString("zh-CN");
}

function isBrokenPlaceholderText(value = "") {
  return /^\?+$/.test(String(value || "").trim());
}

function currentStepIndex() {
  return workflowSteps.findIndex((item) => item.id === appState.currentStepId);
}

function getStep(stepId = appState.currentStepId) {
  return workflowSteps.find((item) => item.id === stepId) ?? workflowSteps[0];
}

function getActTitle(actId) {
  return list(appState.project.structure_profile?.acts).find((act) => act.id === actId)?.title ?? "未分幕";
}

function getNode(nodeId) {
  return list(appState.project.structure_profile?.nodes).find((node) => node.id === nodeId) ?? null;
}

function getOrderedActs() {
  return list(appState.project.structure_profile?.acts)
    .slice()
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

function getOrderedNodes(actId = null) {
  return list(appState.project.structure_profile?.nodes)
    .filter((node) => !actId || node.act_id === actId)
    .slice()
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

function getPlotCard(cardId = appState.selection.plotCardId) {
  return list(appState.project.plot_board?.cards).find((card) => card.id === cardId) ?? null;
}

function getCharacter(characterId = appState.selection.characterId) {
  return list(appState.project.character_hub?.characters).find((item) => item.id === characterId) ?? null;
}

function getRelationship(relationshipId = appState.selection.relationshipId) {
  return list(appState.project.character_hub?.relationship_map).find((item) => item.id === relationshipId) ?? null;
}

function getScene(sceneId = appState.selection.sceneId) {
  return list(appState.project.scene_workbench?.scenes).find((item) => item.id === sceneId) ?? null;
}

function getTimelineEvent(eventId = appState.selection.timelineId) {
  return list(appState.project.lock_layer?.projections?.timeline_events).find((item) => item.id === eventId) ?? null;
}

function getWorldRule(ruleId = appState.selection.worldRuleId) {
  return list(appState.project.lock_layer?.projections?.world_rules).find((item) => item.id === ruleId) ?? null;
}

function getSetup(setupId = appState.selection.setupId) {
  return list(appState.project.lock_layer?.projections?.setup_payoffs).find((item) => item.id === setupId) ?? null;
}

function getCharacterLinkedPlotCards(characterId) {
  return list(appState.project.plot_board?.cards)
    .filter((card) => list(card.character_ids).includes(characterId))
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

function getCharacterRelationships(characterId) {
  return list(appState.project.character_hub?.relationship_map).filter(
    (relationship) =>
      relationship.source_character_id === characterId || relationship.target_character_id === characterId
  );
}

function getRelationshipLinkedPlotCards(relationship) {
  if (!relationship) {
    return [];
  }
  const pairIds = [relationship.source_character_id, relationship.target_character_id].filter(Boolean);
  return list(appState.project.plot_board?.cards)
    .filter((card) => pairIds.every((characterId) => list(card.character_ids).includes(characterId)))
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

function getCharacterNameById(characterId = "") {
  return list(appState.project.character_hub?.characters).find((item) => item.id === characterId)?.name ?? "未定人物";
}

function getPlotLinkedRelationships(card) {
  if (!card) {
    return [];
  }
  const characterIds = list(card.character_ids);
  if (characterIds.length < 2) {
    return [];
  }
  return list(appState.project.character_hub?.relationship_map).filter(
    (relationship) =>
      characterIds.includes(relationship.source_character_id) &&
      characterIds.includes(relationship.target_character_id)
  );
}

function getPlotLinkedScenes(card) {
  if (!card) {
    return [];
  }
  return list(appState.project.scene_workbench?.scenes)
    .filter((scene) => list(scene.linked_plot_card_ids).includes(card.id))
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

function getPlotLinkedTimelineEvents(card) {
  if (!card) {
    return [];
  }
  const characterIds = new Set(list(card.character_ids));
  return list(appState.project.lock_layer?.projections?.timeline_events)
    .filter((event) => list(event.participants).some((characterId) => characterIds.has(characterId)))
    .sort((left, right) => {
      const leftDay = Number(left.story_day) || 9999;
      const rightDay = Number(right.story_day) || 9999;
      if (leftDay !== rightDay) return leftDay - rightDay;
      return (Number(left.sequence_index) || 9999) - (Number(right.sequence_index) || 9999);
    });
}

function getCharacterLinkedScenes(characterId) {
  if (!characterId) {
    return [];
  }
  const linkedCardIds = new Set(getCharacterLinkedPlotCards(characterId).map((card) => card.id));
  return list(appState.project.scene_workbench?.scenes)
    .filter(
      (scene) =>
        scene.pov_character_id === characterId ||
        list(scene.linked_plot_card_ids).some((plotCardId) => linkedCardIds.has(plotCardId))
    )
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

function getSceneLinkedPlotCards(scene) {
  if (!scene) {
    return [];
  }
  const linkedIds = new Set(list(scene.linked_plot_card_ids));
  return list(appState.project.plot_board?.cards)
    .filter((card) => linkedIds.has(card.id))
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

function getSceneLinkedCharacterIds(scene) {
  if (!scene) {
    return [];
  }
  const ids = new Set();
  if (scene.pov_character_id) {
    ids.add(scene.pov_character_id);
  }
  getSceneLinkedPlotCards(scene).forEach((card) => {
    list(card.character_ids).forEach((characterId) => {
      if (characterId) {
        ids.add(characterId);
      }
    });
  });
  return Array.from(ids);
}

function getSceneLinkedCharacters(scene) {
  const ids = new Set(getSceneLinkedCharacterIds(scene));
  return list(appState.project.character_hub?.characters).filter((character) => ids.has(character.id));
}

function getRelationshipLinkedScenes(relationship) {
  if (!relationship) {
    return [];
  }
  const pairIds = [relationship.source_character_id, relationship.target_character_id].filter(Boolean);
  if (pairIds.length < 2) {
    return [];
  }
  return list(appState.project.scene_workbench?.scenes)
    .filter((scene) => pairIds.every((characterId) => getSceneLinkedCharacterIds(scene).includes(characterId)))
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

function getRelationshipLinkedTimelineEvents(relationship) {
  if (!relationship) {
    return [];
  }
  const pairIds = [relationship.source_character_id, relationship.target_character_id].filter(Boolean);
  if (pairIds.length < 2) {
    return [];
  }
  return list(appState.project.lock_layer?.projections?.timeline_events)
    .filter((event) => pairIds.every((characterId) => list(event.participants).includes(characterId)))
    .sort((left, right) => {
      const leftDay = Number(left.story_day) || 9999;
      const rightDay = Number(right.story_day) || 9999;
      if (leftDay !== rightDay) return leftDay - rightDay;
      return (Number(left.sequence_index) || 9999) - (Number(right.sequence_index) || 9999);
    });
}

function getSceneLinkedRelationships(scene) {
  const characterIds = new Set(getSceneLinkedCharacterIds(scene));
  if (characterIds.size < 2) {
    return [];
  }
  return list(appState.project.character_hub?.relationship_map).filter(
    (relationship) =>
      characterIds.has(relationship.source_character_id) &&
      characterIds.has(relationship.target_character_id)
  );
}

function getSceneLinkedTimelineEvents(scene) {
  const characterIds = new Set(getSceneLinkedCharacterIds(scene));
  if (characterIds.size === 0) {
    return [];
  }
  return list(appState.project.lock_layer?.projections?.timeline_events)
    .filter((event) => list(event.participants).some((characterId) => characterIds.has(characterId)))
    .sort((left, right) => {
      const leftDay = Number(left.story_day) || 9999;
      const rightDay = Number(right.story_day) || 9999;
      if (leftDay !== rightDay) return leftDay - rightDay;
      return (Number(left.sequence_index) || 9999) - (Number(right.sequence_index) || 9999);
    });
}

function createStructureProfile(template, rhythmOverlay, customActCount = 2) {
  const definition =
    template === "custom"
      ? buildCustomStructurePreset(customActCount)
      : structurePresets[template] ?? structurePresets.three_act;
  const actIds = new Map();
  const acts = definition.acts.map((act, index) => {
    const id = createId("act");
    actIds.set(act.key, id);
    return { id, ...act, order_index: index + 1 };
  });
  const nodes = definition.nodes.map(([key, actKey, title, required], index) => ({
    id: createId("node"),
    key,
    act_id: actIds.get(actKey) ?? acts[0]?.id ?? "",
    title,
    node_type: key,
    required,
    order_index: index + 1,
    note: "",
    card_ids: []
  }));
  return {
    template,
    rhythm_overlay: rhythmOverlay,
    custom_act_count: template === "custom" ? Number(definition.custom_act_count ?? customActCount) : acts.length,
    acts,
    nodes
  };
}

function normalizeProject() {
  appState.project = ensurePlotDrivenProject(appState.project);
  const plotCards = list(appState.project.plot_board?.cards);
  const characters = list(appState.project.character_hub?.characters);
  const relationships = list(appState.project.character_hub?.relationship_map);
  const scenes = list(appState.project.scene_workbench?.scenes);
  const timeline = list(appState.project.lock_layer?.projections?.timeline_events);
  const rules = list(appState.project.lock_layer?.projections?.world_rules);
  const setups = list(appState.project.lock_layer?.projections?.setup_payoffs);
  appState.selection.plotCardId = plotCards.some((item) => item.id === appState.selection.plotCardId)
    ? appState.selection.plotCardId
    : plotCards[0]?.id ?? null;
  appState.selection.characterId = characters.some((item) => item.id === appState.selection.characterId)
    ? appState.selection.characterId
    : characters[0]?.id ?? null;
  appState.selection.relationshipId = relationships.some((item) => item.id === appState.selection.relationshipId)
    ? appState.selection.relationshipId
    : relationships[0]?.id ?? null;
  appState.selection.sceneId = scenes.some((item) => item.id === appState.selection.sceneId)
    ? appState.selection.sceneId
    : scenes[0]?.id ?? null;
  appState.selection.timelineId = timeline.some((item) => item.id === appState.selection.timelineId)
    ? appState.selection.timelineId
    : timeline[0]?.id ?? null;
  appState.selection.worldRuleId = rules.some((item) => item.id === appState.selection.worldRuleId)
    ? appState.selection.worldRuleId
    : rules[0]?.id ?? null;
  appState.selection.setupId = setups.some((item) => item.id === appState.selection.setupId)
    ? appState.selection.setupId
    : setups[0]?.id ?? null;
}

function saveLocalSnapshot() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      project: appState.project,
      projectList: appState.projectList
    })
  );
}

function loadLocalSnapshot() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `璇锋眰澶辫触锛?{response.status}`);
  }
  return response.json();
}

async function loadProjectsFromServer() {
  const payload = await fetchJson("/api/projects");
  appState.projectList = payload.projects ?? [];
}

async function loadProjectFromServer(projectId) {
  const payload = await fetchJson(`/api/projects/${encodeURIComponent(projectId)}`);
  appState.project = ensurePlotDrivenProject(payload.project);
  appState.projectList = payload.projects ?? appState.projectList;
  normalizeProject();
}

async function saveProjectToServer() {
  appState.runtime.saving = true;
  renderRuntimeStatus();
  const payload = await fetchJson(`/api/projects/${encodeURIComponent(appState.project.project.id)}`, {
    method: "PUT",
    body: JSON.stringify({ project: appState.project })
  });
  appState.project = ensurePlotDrivenProject(payload.project);
  appState.projectList = payload.projects ?? appState.projectList;
  appState.runtime.serverAvailable = true;
  appState.runtime.saving = false;
  appState.runtime.dirty = false;
  appState.runtime.lastSavedAt = new Date().toISOString();
  normalizeProject();
  saveLocalSnapshot();
  render();
}

function scheduleAutosave() {
  window.clearTimeout(appState.saveTimer);
  appState.saveTimer = window.setTimeout(async () => {
    if (!appState.runtime.dirty) {
      return;
    }
    saveLocalSnapshot();
    if (!appState.runtime.serverAvailable) {
      appState.runtime.lastSavedAt = "浠呮湰鍦颁繚瀛?";
      renderRuntimeStatus();
      return;
    }
    try {
      await saveProjectToServer();
    } catch (error) {
      appState.runtime.serverAvailable = false;
      appState.runtime.saving = false;
      appState.runtime.lastSavedAt = "浠呮湰鍦颁繚瀛?";
      renderRuntimeStatus();
    }
  }, AUTOSAVE_DELAY);
}

function markDirty() {
  appState.runtime.dirty = true;
  saveLocalSnapshot();
  renderRuntimeStatus();
  scheduleAutosave();
}

function setCurrentPage(pageId) {
  appState.currentPage = pageId;
  if (pageId !== "project") {
    appState.createDialogOpen = false;
  }
  render();
}

function setCurrentStep(stepId) {
  const nextStepId = workflowSteps.some((item) => item.id === stepId) ? stepId : workflowSteps[0].id;
  const hasPanel = dom.stepPanels.some((panel) => panel.dataset.stepGroup === nextStepId);
  appState.currentStepId = hasPanel
    ? nextStepId
    : workflowSteps.find((item) => dom.stepPanels.some((panel) => panel.dataset.stepGroup === item.id))?.id ?? workflowSteps[0].id;
  render();
}

function applyProjectDraftPatch(patch = {}) {
  const nextDraft = { ...appState.projectDraft };
  Object.entries(patch ?? {}).forEach(([key, value]) => {
    if (value == null) {
      return;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }
      nextDraft[key] = trimmed;
      return;
    }
    nextDraft[key] = String(value);
  });

  const nextFormat = projectFormatChoices.includes(nextDraft.format) ? nextDraft.format : "feature";
  nextDraft.format = nextFormat;

  const validTemplates = getStructureOptionsForFormat(nextFormat, nextDraft.structure_template).map(
    ([templateValue]) => templateValue
  );
  if (!validTemplates.includes(nextDraft.structure_template)) {
    nextDraft.structure_template = getDefaultTemplateForFormat(nextFormat);
  }

  if (nextDraft.structure_template === "custom") {
    nextDraft.custom_act_count = String(Math.max(1, Math.min(6, Number(nextDraft.custom_act_count) || 2)));
  } else if (!nextDraft.custom_act_count) {
    nextDraft.custom_act_count = "2";
  }

  appState.projectDraft = nextDraft;
}

function updateDraftField(fieldName, value) {
  if (["format", "genre", "tone", "structure_template", "custom_act_count"].includes(fieldName)) {
    appState.createConceptOptions = [];
    if (fieldName === "format") {
      appState.projectDraft.title = "";
      appState.projectDraft.logline = "";
      appState.projectDraft.core_conflict = "";
    }
  }
  applyProjectDraftPatch({ [fieldName]: value });
  appState.createAssistant.error = "";
  if (appState.createDialogOpen) {
    renderProjectCreateForm();
  }
}

function updateProjectField(action, fieldName, value) {
  const selectedPlot = getPlotCard();
  const selectedCharacter = getCharacter();
  const selectedRelationship = getRelationship();
  const selectedScene = getScene();
  const selectedTimeline = getTimelineEvent();
  const selectedRule = getWorldRule();
  const selectedSetup = getSetup();

  if (action === "story-core-field") {
    appState.project.story_core[fieldName] = value;
  }
  if (action === "structure-meta-field") {
    if (fieldName === "template" && value !== appState.project.structure_profile.template) {
      applyStructureTemplate(
        value,
        value === "custom"
          ? appState.project.structure_profile?.custom_act_count ?? list(appState.project.structure_profile?.acts).length ?? 2
          : null
      );
      return;
    }
    if (fieldName === "custom_act_count" && appState.project.structure_profile.template === "custom") {
      applyStructureTemplate("custom", Number(value) || 2);
      return;
    }
    appState.project.structure_profile[fieldName] = value;
  }
  if (action === "plot-field" && selectedPlot) {
    selectedPlot[fieldName] = value;
  }
  if (action === "character-field" && selectedCharacter) {
    selectedCharacter[fieldName] = value;
  }
  if (action === "relationship-field" && selectedRelationship) {
    selectedRelationship[fieldName] = value;
  }
  if (action === "genre-field") {
    if (fieldName === "secondary_genres_text") {
      appState.project.genre_profile.secondary_genres = splitTags(value);
    } else if (fieldName === "tone_words_text") {
      appState.project.genre_profile.tone_words = splitTags(value);
    } else {
      appState.project.genre_profile[fieldName] = value;
    }
  }
  if (action === "timeline-field" && selectedTimeline) {
    selectedTimeline[fieldName] = fieldName === "story_day" ? Number(value) || 1 : value;
  }
  if (action === "world-rule-field" && selectedRule) {
    if (fieldName === "exceptions_text") {
      selectedRule.exceptions = splitTags(value);
    } else {
      selectedRule[fieldName] = value;
    }
  }
  if (action === "setup-field" && selectedSetup) {
    selectedSetup[fieldName] = value;
  }
  if (action === "scene-field" && selectedScene) {
    selectedScene[fieldName] = fieldName === "order_index" ? Number(value) || 1 : value;
  }
  markDirty();
}

function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }
  const action = target.dataset.action;
  const id = target.dataset.id ?? "";
  const nodeId = target.dataset.nodeId ?? "";

  if (action === "toggle-toolbar-density") {
    appState.toolbarMode = appState.toolbarMode === "expanded" ? "compact" : "expanded";
    render();
    return;
  }
  if (action === "hide-toolbar") {
    appState.toolbarMode = "hidden";
    render();
    return;
  }
  if (action === "show-toolbar") {
    appState.toolbarMode = "compact";
    render();
    return;
  }
  if (action === "create-ai-step") {
    requestCreateStepSuggestionCurrent(target.dataset.step ?? getProjectCreateStep().id);
    return;
  }
  if (action === "create-ai-field") {
    requestCreateFieldSuggestionCurrent(target.dataset.field ?? "");
    return;
  }
  if (action === "apply-concept-option") {
    applyConceptOptionCurrent(target.dataset.id ?? "");
    return;
  }
  if (action === "ai-provider-choice") {
    const provider = target.dataset.value === "gemini" ? "gemini" : "openai";
    appState.aiConfigDraft.provider = provider;
    appState.aiConfigDraft.model = "";
    appState.aiModelCatalog.provider = "";
    appState.aiModelCatalog.options = [];
    appState.createAssistant.error = "";
    renderProjectCreateForm();
    return;
  }
  if (action === "toggle-ai-config") {
    appState.aiConfigOpen = !appState.aiConfigOpen;
    renderProjectCreateForm();
    return;
  }
  if (action === "fetch-ai-models") {
    fetchAiModelOptionsCurrentV2();
    return;
  }
  if (action === "save-ai-config") {
    saveAiConfigDraftCurrentV2();
    return;
  }
  if (action === "disconnect-ai-config") {
    disconnectAiConfigDraftCurrentV2();
    return;
  }
  if (action === "open-create-dialog") {
    resetProjectCreateWizard();
    appState.createDialogOpen = true;
    render();
    return;
  }
  if (action === "draft-choice") {
    updateDraftField(target.dataset.field, target.dataset.value ?? "");
    return;
  }
  if (action === "open-project") {
    loadProjectFromServer(id)
      .then(() => {
        setCurrentPage("workflow");
        setCurrentStep("structure");
      })
      .catch(() => {
        const snapshot = loadLocalSnapshot();
        if (snapshot?.project?.project?.id === id) {
          appState.project = ensurePlotDrivenProject(snapshot.project);
          normalizeProject();
          setCurrentPage("workflow");
          setCurrentStep("structure");
        }
      });
    return;
  }
  if (action === "go-step") return setCurrentStep(id);
  if (action === "jump-to-plot-card") {
    appState.selection.plotCardId = id;
    appState.plotFilter = "all";
    setCurrentStep("plots");
    return;
  }
  if (action === "jump-to-character") {
    appState.selection.characterId = id;
    setCurrentStep("characters");
    return;
  }
  if (action === "jump-to-relationship") {
    appState.selection.relationshipId = id;
    setCurrentStep("relationships");
    return;
  }
  if (action === "jump-to-scene") {
    appState.selection.sceneId = id;
    setCurrentStep("scenes");
    return;
  }
  if (action === "set-plot-filter") {
    appState.plotFilter = id;
    render();
    return;
  }
  if (action === "select-plot-card") {
    appState.selection.plotCardId = id;
    render();
    return;
  }
  if (action === "open-plot-editor") {
    appState.plotEditorOpen = true;
    render();
    return;
  }
  if (action === "close-plot-editor") {
    appState.plotEditorOpen = false;
    render();
    return;
  }
  if (action === "add-plot-card") {
    const targetNode = getNode(nodeId) ?? list(appState.project.structure_profile?.nodes)[0];
    const newCard = {
      id: createId("plot"),
      title: "新剧情卡",
      act_id: targetNode?.act_id ?? appState.project.structure_profile.acts[0]?.id ?? "",
      node_id: targetNode?.id ?? "",
      type: "mainline",
      status: "draft",
      summary: "",
      dramatic_question: "",
      conflict: "",
      change: "",
      notes: "",
      character_ids: [],
      impact_tags: [],
      depends_on: [],
      next_ids: [],
      scene_seed_ids: []
    };
    appState.project.plot_board.cards.push(newCard);
    appState.selection.plotCardId = newCard.id;
    appState.plotEditorOpen = true;
    normalizeProject();
    markDirty();
    render();
    return;
  }
  if (action === "toggle-plot-lock") {
    const card = getPlotCard(id);
    if (card) {
      card.status = card.status === "locked" ? "review" : "locked";
      normalizeProject();
      markDirty();
      render();
    }
    return;
  }
  if (action === "scene-from-plot") return insertSceneFromPlotCard(id);
  if (action === "delete-plot-card") {
    appState.project.plot_board.cards = list(appState.project.plot_board?.cards).filter((item) => item.id !== id);
    appState.plotEditorOpen = false;
    normalizeProject();
    markDirty();
    render();
    return;
  }
  if (action === "add-character") {
    const character = {
      id: createId("char"),
      name: "新人物",
      story_role: "supporting",
      external_goal: "",
      dramatic_need: "",
      contradiction: "",
      starting_mask: "",
      pressure_point: "",
      arc_start: "",
      arc_end: "",
      secret: "",
      notes: "",
      status: "active",
      linked_plot_ids: []
    };
    appState.project.character_hub.characters.push(character);
    appState.selection.characterId = character.id;
    normalizeProject();
    markDirty();
    render();
    return;
  }
  if (action === "select-character") {
    appState.selection.characterId = id;
    render();
    return;
  }
  if (action === "delete-character") {
    appState.project.character_hub.characters = list(appState.project.character_hub?.characters).filter((item) => item.id !== id);
    appState.project.character_hub.relationship_map = list(appState.project.character_hub?.relationship_map).filter((item) => item.source_character_id !== id && item.target_character_id !== id);
    list(appState.project.plot_board?.cards).forEach((card) => {
      card.character_ids = list(card.character_ids).filter((characterId) => characterId !== id);
    });
    list(appState.project.scene_workbench?.scenes).forEach((scene) => {
      if (scene.pov_character_id === id) scene.pov_character_id = "";
    });
    normalizeProject();
    markDirty();
    render();
    return;
  }
  if (action === "add-relationship") {
    const characters = list(appState.project.character_hub?.characters);
    const relationship = {
      id: createId("rel"),
      source_character_id: characters[0]?.id ?? "",
      target_character_id: characters[1]?.id ?? characters[0]?.id ?? "",
      relationship_type: "",
      tension: "",
      power_balance: "",
      shared_history: "",
      hidden_information: "",
      status: "active",
      related_plot_ids: []
    };
    appState.project.character_hub.relationship_map.push(relationship);
    appState.selection.relationshipId = relationship.id;
    normalizeProject();
    markDirty();
    render();
    return;
  }
  if (action === "select-relationship") {
    appState.selection.relationshipId = id;
    render();
    return;
  }
  if (action === "delete-relationship") {
    appState.project.character_hub.relationship_map = list(appState.project.character_hub?.relationship_map).filter((item) => item.id !== id);
    normalizeProject();
    markDirty();
    render();
    return;
  }
  if (action === "add-convention") {
    appState.project.genre_profile.conventions.push({ id: createId("conv"), name: "", status: "required", description: "" });
    markDirty();
    render();
    return;
  }
  if (action === "add-taboo") {
    appState.project.genre_profile.taboos.push({ id: createId("taboo"), name: "", description: "" });
    markDirty();
    render();
    return;
  }
  if (action === "delete-convention") {
    appState.project.genre_profile.conventions = list(appState.project.genre_profile?.conventions).filter((item) => item.id !== id);
    markDirty();
    render();
    return;
  }
  if (action === "delete-taboo") {
    appState.project.genre_profile.taboos = list(appState.project.genre_profile?.taboos).filter((item) => item.id !== id);
    markDirty();
    render();
    return;
  }
  if (action === "add-timeline") {
    const item = { id: createId("event"), story_day: list(appState.project.lock_layer?.projections?.timeline_events).length + 1, sequence_index: 1, summary: "", participants: [], location: "", trigger: "", consequence: "" };
    appState.project.lock_layer.projections.timeline_events.push(item);
    appState.selection.timelineId = item.id;
    markDirty();
    render();
    return;
  }
  if (action === "select-timeline") {
    appState.selection.timelineId = id;
    render();
    return;
  }
  if (action === "add-world-rule") {
    const item = { id: createId("rule"), rule_statement: "", rule_level: "hard", scope: "", exceptions: [], evidence: [] };
    appState.project.lock_layer.projections.world_rules.push(item);
    appState.selection.worldRuleId = item.id;
    markDirty();
    render();
    return;
  }
  if (action === "select-world-rule") {
    appState.selection.worldRuleId = id;
    render();
    return;
  }
  if (action === "add-setup") {
    const item = { id: createId("setup"), setup_summary: "", setup_scene_id: "", expected_payoff_window: "", status: "open", payoff_scene_id: "", payoff_summary: "" };
    appState.project.lock_layer.projections.setup_payoffs.push(item);
    appState.selection.setupId = item.id;
    markDirty();
    render();
    return;
  }
  if (action === "select-setup") {
    appState.selection.setupId = id;
    render();
    return;
  }
  if (action === "add-scene") {
    const scene = {
      id: createId("scene"),
      order_index: list(appState.project.scene_workbench?.scenes).length + 1,
      title: "新场景",
      act_id: list(appState.project.structure_profile?.acts)[0]?.id ?? "",
      linked_plot_card_ids: [],
      pov_character_id: "",
      location: "",
      time_of_day: "",
      purpose: "",
      obstacle: "",
      beat_summary: "",
      entry_state: "",
      exit_state: "",
      status: "draft",
      script_excerpt: "",
      notes: ""
    };
    appState.project.scene_workbench.scenes.push(scene);
    appState.selection.sceneId = scene.id;
    normalizeProject();
    markDirty();
    render();
    return;
  }
  if (action === "select-scene") {
    appState.selection.sceneId = id;
    render();
    return;
  }
  if (action === "delete-scene") {
    appState.project.scene_workbench.scenes = list(appState.project.scene_workbench?.scenes).filter((item) => item.id !== id);
    normalizeProject();
    markDirty();
    render();
  }
}

function handleInput(event) {
  const action = event.target.dataset.action;
  const fieldName = event.target.dataset.field;
  if (!action || !fieldName) {
    return;
  }
  if (action === "ai-config-field") {
    appState.aiConfigDraft[fieldName] = event.target.value;
    if (fieldName === "apiKey") {
      appState.aiModelCatalog.provider = "";
      appState.aiModelCatalog.options = [];
      if (appState.aiConfigDraft.apiKey.trim()) {
        appState.aiConfigDraft.model = "";
      }
    }
    appState.createAssistant.error = "";
    return;
  }
  if (action === "draft-field") {
    updateDraftField(fieldName, event.target.value);
    return;
  }
  if (action === "act-field") {
    const act = list(appState.project.structure_profile?.acts).find((item) => item.id === event.target.dataset.id);
    if (act) act[fieldName] = event.target.value;
    markDirty();
    return;
  }
  if (action === "node-field") {
    const node = list(appState.project.structure_profile?.nodes).find((item) => item.id === event.target.dataset.id);
    if (node) node[fieldName] = event.target.value;
    markDirty();
    return;
  }
  if (action === "convention-field") {
    const item = list(appState.project.genre_profile?.conventions).find((entry) => entry.id === event.target.dataset.id);
    if (item) item[fieldName] = event.target.value;
    markDirty();
    return;
  }
  if (action === "taboo-field") {
    const item = list(appState.project.genre_profile?.taboos).find((entry) => entry.id === event.target.dataset.id);
    if (item) item[fieldName] = event.target.value;
    markDirty();
    return;
  }
  updateProjectField(action, fieldName, event.target.value);
}

function handleChange(event) {
  if (event.target.dataset.action === "plot-character-toggle") {
    const card = getPlotCard();
    if (!card) return;
    const checked = event.target.checked;
    const characterId = event.target.dataset.id;
    card.character_ids = checked
      ? unique([...list(card.character_ids), characterId])
      : list(card.character_ids).filter((item) => item !== characterId);
    normalizeProject();
    markDirty();
    return;
  }
  if (event.target.dataset.action === "scene-plot-toggle") {
    const scene = getScene();
    if (!scene) return;
    const checked = event.target.checked;
    const plotCardId = event.target.dataset.id;
    scene.linked_plot_card_ids = checked
      ? unique([...list(scene.linked_plot_card_ids), plotCardId])
      : list(scene.linked_plot_card_ids).filter((item) => item !== plotCardId);
    normalizeProject();
    markDirty();
    return;
  }
  handleInput(event);
}

async function requestCreateStepSuggestionLegacy(stepId = getProjectCreateStep().id) {
  appState.createAssistant.loading = true;
  appState.createAssistant.target = `step:${stepId}`;
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  renderProjectCreateForm();

  try {
    const payload = await fetchJson("/api/create-wizard/step", {
      method: "POST",
      body: JSON.stringify({
        stepId,
        draft: appState.projectDraft
      })
    });
    applyProjectDraftPatch(payload.fields);
    appState.ai = payload.ai ?? appState.ai;
    appState.runtime.serverAvailable = true;
    appState.createAssistant.message =
      payload.provider === "openai"
        ? `已用 ${payload.model || "OpenAI"} 补全这一步。`
        : "当前未连接 OpenAI，已先给出本地建议。";
    appState.createAssistant.warning = payload.warning || "";
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorV2(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    renderProjectCreateForm();
  }
}

async function requestCreateFieldSuggestionLegacy(fieldName) {
  appState.createAssistant.loading = true;
  appState.createAssistant.target = `field:${fieldName}`;
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  renderProjectCreateForm();

  try {
    const payload = await fetchJson("/api/create-wizard/field", {
      method: "POST",
      body: JSON.stringify({
        field: fieldName,
        draft: appState.projectDraft
      })
    });
    applyProjectDraftPatch({ [fieldName]: payload.value });
    appState.ai = payload.ai ?? appState.ai;
    appState.runtime.serverAvailable = true;
    appState.createAssistant.message =
      payload.provider === "openai"
        ? `已用 ${payload.model || "OpenAI"} 重写“${projectDraftFieldLabels[fieldName] ?? fieldName}”。`
        : "当前未连接 OpenAI，已先给出本地建议。";
    appState.createAssistant.warning = payload.warning || "";
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorV2(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    renderProjectCreateForm();
  }
}

async function saveAiConfigDraftLegacy() {
  const apiKey = appState.aiConfigDraft.apiKey.trim();
  const model = appState.aiConfigDraft.model.trim() || "gpt-5";
  if (!apiKey) {
    appState.createAssistant.error = "鍏堝～鍏?OpenAI Key 鍐嶈繛鎺ャ€?";
    renderProjectCreateForm();
    return;
  }

  appState.createAssistant.loading = true;
  appState.createAssistant.target = "ai-config";
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  renderProjectCreateForm();

  try {
    const payload = await fetchJson("/api/ai/config", {
      method: "POST",
      body: JSON.stringify({ apiKey, model })
    });
    appState.ai = payload.ai ?? appState.ai;
    appState.aiConfigDraft.apiKey = "";
    appState.aiConfigDraft.model = appState.ai.model || model;
    appState.aiConfigOpen = false;
    appState.runtime.serverAvailable = true;
    appState.createAssistant.message = `已连接 ${appState.ai.model || model}，现在可以测试真实生成。`;
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorV2(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    renderProjectCreateForm();
  }
}

async function disconnectAiConfigDraftLegacy() {
  appState.createAssistant.loading = true;
  appState.createAssistant.target = "ai-config";
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  renderProjectCreateForm();

  try {
    const payload = await fetchJson("/api/ai/config", {
      method: "POST",
      body: JSON.stringify({ apiKey: "", model: appState.aiConfigDraft.model || appState.ai.model || "gpt-5" })
    });
    appState.ai = payload.ai ?? appState.ai;
    appState.aiConfigOpen = true;
    appState.createAssistant.message = "宸叉柇寮€ OpenAI锛屽綋鍓嶄細閫€鍥炴湰鍦板缓璁€?";
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorV2(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    renderProjectCreateForm();
  }
}

async function requestCreateStepSuggestion(stepId = getProjectCreateStep().id) {
  if (stepId === "logline") {
    await requestCreateConceptOptions();
    return;
  }
  appState.createAssistant.loading = true;
  appState.createAssistant.target = `step:${stepId}`;
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  renderProjectCreateForm();

  try {
    const payload = await fetchJson("/api/create-wizard/step", {
      method: "POST",
      body: JSON.stringify({
        stepId,
        draft: appState.projectDraft
      })
    });
    applyProjectDraftPatch(payload.fields);
    appState.ai = payload.ai ?? appState.ai;
    appState.aiConfigDraft.provider = appState.ai.provider || appState.aiConfigDraft.provider;
    appState.aiConfigDraft.model = appState.ai.model || appState.aiConfigDraft.model;
    appState.runtime.serverAvailable = true;
    const providerLabel = payload.provider === "gemini" ? "Gemini" : payload.provider === "openai" ? "OpenAI" : "鏈湴寤鸿";
    appState.createAssistant.message =
      payload.provider === "local"
        ? "当前未连接模型服务，已先给出本地建议。"
        : `已用 ${providerLabel} · ${payload.model || "默认模型"} 补全这一步。`;
    appState.createAssistant.warning = payload.warning || "";
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorV2(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    renderProjectCreateForm();
  }
}

async function requestCreateConceptOptions() {
  appState.createAssistant.loading = true;
  appState.createAssistant.target = "step:logline";
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  renderProjectCreateForm();

  try {
    const payload = await fetchJson("/api/create-wizard/concepts", {
      method: "POST",
      body: JSON.stringify({
        draft: appState.projectDraft
      })
    });
    appState.createConceptOptions = Array.isArray(payload.options) ? payload.options : [];
    appState.ai = payload.ai ?? appState.ai;
    appState.aiConfigDraft.provider = appState.ai.provider || appState.aiConfigDraft.provider;
    appState.aiConfigDraft.model = appState.ai.model || appState.aiConfigDraft.model;
    appState.runtime.serverAvailable = true;
    const providerLabel = payload.provider === "gemini" ? "Gemini" : payload.provider === "openai" ? "OpenAI" : "鏈湴寤鸿";
    appState.createAssistant.message =
      payload.provider === "local"
        ? "当前未连接模型服务，已先给出 3 组本地概念候选。"
        : `已用 ${providerLabel} · ${payload.model || "默认模型"} 生成 3 组概念候选。`;
    appState.createAssistant.warning = payload.warning || "";
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorV2(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    renderProjectCreateForm();
  }
}

function applyConceptOption(optionId) {
  const option = appState.createConceptOptions.find((item) => item.id === optionId);
  if (!option) {
    return;
  }
  applyProjectDraftPatch({
    logline: option.logline,
    core_conflict: option.core_conflict
  });
  appState.createAssistant.message = `已采用“${option.label || "概念候选"}”。`;
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  renderProjectCreateForm();
}

async function requestCreateFieldSuggestion(fieldName) {
  appState.createAssistant.loading = true;
  appState.createAssistant.target = `field:${fieldName}`;
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  renderProjectCreateForm();

  try {
    const payload = await fetchJson("/api/create-wizard/field", {
      method: "POST",
      body: JSON.stringify({
        field: fieldName,
        draft: appState.projectDraft
      })
    });
    applyProjectDraftPatch({ [fieldName]: payload.value });
    appState.ai = payload.ai ?? appState.ai;
    appState.aiConfigDraft.provider = appState.ai.provider || appState.aiConfigDraft.provider;
    appState.aiConfigDraft.model = appState.ai.model || appState.aiConfigDraft.model;
    appState.runtime.serverAvailable = true;
    const providerLabel = payload.provider === "gemini" ? "Gemini" : payload.provider === "openai" ? "OpenAI" : "鏈湴寤鸿";
    appState.createAssistant.message =
      payload.provider === "local"
        ? "当前未连接模型服务，已先给出本地建议。"
        : `已用 ${providerLabel} · ${payload.model || "默认模型"} 重写“${projectDraftFieldLabels[fieldName] ?? fieldName}”。`;
    appState.createAssistant.warning = payload.warning || "";
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorV2(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    renderProjectCreateForm();
  }
}

async function saveAiConfigDraft() {
  const provider = appState.aiConfigDraft.provider || "openai";
  const apiKey = appState.aiConfigDraft.apiKey.trim();
  const model = appState.aiConfigDraft.model.trim() || defaultModelForProvider(provider);
  if (!apiKey) {
    appState.createAssistant.error = "鍏堝～鍏?API Key 鍐嶈繛鎺ャ€?";
    renderProjectCreateForm();
    return;
  }

  appState.createAssistant.loading = true;
  appState.createAssistant.target = "ai-config";
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  renderProjectCreateForm();

  try {
    const payload = await fetchJson("/api/ai/config", {
      method: "POST",
      body: JSON.stringify({ provider, apiKey, model })
    });
    appState.ai = payload.ai ?? appState.ai;
    appState.aiConfigDraft.provider = appState.ai.provider || provider;
    appState.aiConfigDraft.apiKey = "";
    appState.aiConfigDraft.model = appState.ai.model || model;
    appState.aiConfigOpen = false;
    appState.runtime.serverAvailable = true;
    appState.createAssistant.message = `已连接 ${providerChoiceLabel(appState.ai.provider || provider)} · ${appState.ai.model || model}，现在可以测试真实生成。`;
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorV2(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    renderProjectCreateForm();
  }
}

async function disconnectAiConfigDraft() {
  const provider = appState.aiConfigDraft.provider || appState.ai.provider || "openai";
  appState.createAssistant.loading = true;
  appState.createAssistant.target = "ai-config";
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  renderProjectCreateForm();

  try {
    const payload = await fetchJson("/api/ai/config", {
      method: "POST",
      body: JSON.stringify({
        provider,
        apiKey: "",
        model: appState.aiConfigDraft.model || appState.ai.model || defaultModelForProvider(provider)
      })
    });
    appState.ai = payload.ai ?? appState.ai;
    appState.aiConfigDraft.provider = provider;
    appState.aiConfigOpen = true;
    appState.createAssistant.message = "宸叉柇寮€妯″瀷鏈嶅姟锛屽綋鍓嶄細閫€鍥炴湰鍦板缓璁€?";
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorV2(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    renderProjectCreateForm();
  }
}

function goToAdjacentStep(direction) {
  const nextIndex = Math.max(0, Math.min(workflowSteps.length - 1, currentStepIndex() + direction));
  setCurrentStep(workflowSteps[nextIndex].id);
}

function applyStructureTemplate(template, customActCount = null) {
  const currentCards = list(appState.project.plot_board?.cards);
  const currentNodes = list(appState.project.structure_profile?.nodes);
  const currentNodeMap = new Map(currentNodes.map((node) => [node.id, node]));
  const nextStructure = createStructureProfile(
    template,
    appState.project.structure_profile?.rhythm_overlay ?? "save_the_cat",
    customActCount ??
      appState.project.structure_profile?.custom_act_count ??
      list(appState.project.structure_profile?.acts).length ??
      2
  );
  const nextNodesByType = new Map(nextStructure.nodes.map((node) => [node.node_type, node]));
  appState.project.structure_profile = nextStructure;
  appState.project.plot_board.cards = currentCards.map((card, index) => {
    const oldNode = currentNodeMap.get(card.node_id);
    const targetNode =
      (oldNode && nextNodesByType.get(oldNode.node_type)) ||
      nextStructure.nodes[Math.min(index, nextStructure.nodes.length - 1)] ||
      nextStructure.nodes[0];
    return {
      ...card,
      node_id: targetNode?.id ?? "",
      act_id: targetNode?.act_id ?? nextStructure.acts[0]?.id ?? ""
    };
  });
  normalizeProject();
  markDirty();
  render();
}

function insertSceneFromPlotCard(cardId) {
  const card = getPlotCard(cardId);
  if (!card) {
    return;
  }
  const scene = {
    id: createId("scene"),
    order_index: list(appState.project.scene_workbench?.scenes).length + 1,
    title: `${card.title} 鍦篳`,
    act_id: card.act_id,
    linked_plot_card_ids: [card.id],
    pov_character_id: list(card.character_ids)[0] ?? "",
    location: "",
    time_of_day: "",
    purpose: card.summary ?? "",
    obstacle: card.conflict ?? "",
    beat_summary: card.change ?? "",
    entry_state: "",
    exit_state: "",
    status: "draft",
    script_excerpt: "",
    notes: ""
  };
  appState.project.scene_workbench.scenes.push(scene);
  appState.selection.sceneId = scene.id;
  normalizeProject();
  markDirty();
  render();
}

function summarizeProjectListItem(project) {
  return {
    id: project.project.id,
    title: project.project.title,
    format: project.project.format,
    status: project.project.status,
    genre: project.project.genre,
    logline: project.project.logline,
    character_count: list(project.character_hub?.characters).length,
    scene_count: list(project.scene_workbench?.scenes).length,
    version_count: 0,
    last_opened_at: new Date().toISOString()
  };
}

function applyProjectDraftToProject(sourceProject) {
  const project = ensurePlotDrivenProject(sourceProject);
  const genreTags = splitTags(appState.projectDraft.genre);
  project.project.title = appState.projectDraft.title.trim() || project.project.title;
  project.project.format = appState.projectDraft.format;
  project.project.genre = genreTags;
  project.project.logline = appState.projectDraft.logline.trim();
  project.project.theme_question = appState.projectDraft.theme_question.trim();
  project.project.tone = appState.projectDraft.tone.trim();
  project.intent_anchor.core_idea = appState.projectDraft.logline.trim();
  project.intent_anchor.theme = appState.projectDraft.theme.trim();
  project.intent_anchor.protagonist = appState.projectDraft.protagonist.trim();
  project.intent_anchor.arc = unique([appState.projectDraft.arc_start, appState.projectDraft.arc_end]).join(" -> ");
  project.intent_anchor.motif = appState.projectDraft.motif.trim();
  project.intent_anchor.genre = genreTags;
  project.story_core.premise = appState.projectDraft.logline.trim();
  project.story_core.core_conflict = appState.projectDraft.core_conflict.trim();
  project.story_core.central_question = appState.projectDraft.theme_question.trim();
  project.story_core.theme_statement = appState.projectDraft.theme.trim();
  project.story_core.emotional_promise = appState.projectDraft.tone.trim();
  project.story_core.setting_overview = appState.projectDraft.setting.trim();
  project.genre_profile.primary_genre = genreTags[0] ?? "";
  project.genre_profile.secondary_genres = genreTags.slice(1);
  project.genre_profile.audience_promise = appState.projectDraft.audience_promise.trim();
  project.genre_profile.tone_words = splitTags(appState.projectDraft.tone);
  project.structure_profile = createStructureProfile(
    appState.projectDraft.structure_template,
    project.structure_profile?.rhythm_overlay ?? "save_the_cat",
    Number(appState.projectDraft.custom_act_count) || 2
  );
  const orderedNodes = list(project.structure_profile?.nodes);
  list(project.plot_board?.cards).forEach((card, index) => {
    const targetNode =
      orderedNodes.find((node) => node.node_type === (index === 0 ? "catalyst" : "setup")) ??
      orderedNodes[Math.min(index, Math.max(orderedNodes.length - 1, 0))] ??
      orderedNodes[0];
    card.node_id = targetNode?.id ?? "";
    card.act_id = targetNode?.act_id ?? "";
  });
  const protagonist = list(project.character_hub?.characters)[0];
  if (protagonist) {
    protagonist.name = appState.projectDraft.protagonist.trim() || protagonist.name || "涓昏";
    protagonist.story_role = "protagonist";
    protagonist.external_goal = appState.projectDraft.external_goal.trim();
    protagonist.dramatic_need = appState.projectDraft.internal_need.trim();
    protagonist.arc_start = appState.projectDraft.arc_start.trim();
    protagonist.arc_end = appState.projectDraft.arc_end.trim();
    protagonist.notes = appState.projectDraft.setting.trim();
  }
  const firstScene = list(project.scene_workbench?.scenes)[0];
  if (firstScene) {
    firstScene.title = firstScene.title || "寮€鍦哄満鏅?";
    firstScene.purpose = appState.projectDraft.logline.trim();
    firstScene.act_id = list(project.plot_board?.cards)[0]?.act_id ?? firstScene.act_id;
    firstScene.pov_character_id = protagonist?.id ?? firstScene.pov_character_id;
  }
  return ensurePlotDrivenProject(project);
}

function renderProjectList() {
  const sortedProjects = [...appState.projectList].sort((left, right) => {
    const leftValue = Date.parse(left.last_opened_at || left.updated_at || 0);
    const rightValue = Date.parse(right.last_opened_at || right.updated_at || 0);
    return rightValue - leftValue;
  });
  const recentProjects = sortedProjects.slice(0, 3);
  const oldProjects = sortedProjects.slice(3);
  const renderProjectCard = (item) => {
    const active = item.id === appState.project.project.id;
    const safeTitle = isBrokenPlaceholderText(item.title) ? "未命名项目" : item.title;
    return `
      <article class="summary-card project-card ${active ? "is-active" : ""}">
        <div class="project-card__top">
          <div>
            <h3>${escapeHtml(safeTitle)}</h3>
            <p>${escapeHtml(formatLabels[item.format] ?? item.format)} 路 ${escapeHtml(projectStatusLabels[item.status] ?? item.status)}</p>
          </div>
          <button class="button button--ghost button--tiny" type="button" data-action="open-project" data-id="${escapeHtml(item.id)}">
            进入创作
          </button>
        </div>
        <p class="project-card__logline">${escapeHtml(item.logline || "还没有一句话概念。")}</p>
        <div class="tag-row">
          ${list(item.genre).map((genre) => `<span class="tag">${escapeHtml(genre)}</span>`).join("")}
        </div>
        <div class="summary-strip">
          <span class="chip chip--soft">${item.character_count ?? 0} 人物</span>
          <span class="chip chip--soft">${item.scene_count ?? 0} 场景</span>
          <span class="chip chip--soft">${item.version_count ?? 0} 版本</span>
          <span class="chip chip--soft">最近打开 ${escapeHtml(formatTime(item.last_opened_at || item.updated_at))}</span>
        </div>
      </article>
    `;
  };
  const createCard = `
    <button class="summary-card project-card project-card--create" type="button" data-action="open-create-dialog">
      <span class="project-card__plus">+</span>
      <strong>新增项目</strong>
      <span>创建后再进入创作</span>
    </button>
  `;

  dom.projectList.innerHTML = `
    <section class="project-group">
      <div class="project-group__head">
        <h3>最近项目</h3>
        <p>这里只保留最近打开的三个项目。</p>
      </div>
      <div class="project-list project-list--wide">
        ${createCard}
        ${recentProjects.map(renderProjectCard).join("")}
      </div>
    </section>
    ${
      oldProjects.length === 0
        ? ""
        : `
          <section class="project-group">
            <div class="project-group__head">
              <h3>旧项目</h3>
              <p>其余项目按最后打开时间继续排列。</p>
            </div>
            <div class="project-list project-list--wide">
              ${oldProjects.map(renderProjectCard).join("")}
            </div>
          </section>
        `
    }
  `;
}

function createAssistantStatusTextCurrent() {
  if (appState.ai.configured) {
    const provider = appState.ai.provider === "gemini" ? "Gemini" : "OpenAI";
    return `当前使用 ${provider} · ${appState.ai.model || "默认模型"}，可以直接生成建议。`;
  }
  return "当前未连接模型服务，会先使用本地建议生成草稿。";
}

function createAssistantStepLabelCurrent(stepId) {
  if (stepId === "basics") return "AI 推荐这一步";
  if (stepId === "logline") return "AI 生成 3 组概念";
  if (stepId === "title") return "AI 生成片名";
  return "AI 补全蓝图";
}

function renderCreateAssistantToolbarCurrent(step) {
  const target = `step:${step.id}`;
  const busy = isCreateAssistantBusy(target);
  const configBusy = isAiConfigBusy();
  const showConfig = !appState.ai.configured || appState.aiConfigOpen;
  const provider = appState.aiConfigDraft.provider || appState.ai.provider || "openai";
  return `
    <div class="create-step-tools">
      <div class="create-step-tools__meta">
        <span class="chip chip--soft">AI 杈呭姪</span>
        <p>${escapeHtml(createAssistantStatusTextCurrent())}</p>
      </div>
      <div class="create-step-tools__actions">
        <button class="button button--ghost button--tiny" type="button" data-action="toggle-ai-config">
          ${showConfig ? "鏀惰捣杩炴帴" : appState.ai.configured ? "鏇存崲杩炴帴" : "杩炴帴妯″瀷"}
        </button>
        <button
          class="button button--ghost button--tiny ${busy ? "is-busy" : ""}"
          type="button"
          data-action="create-ai-step"
          data-step="${escapeHtml(step.id)}"
          ${appState.createAssistant.loading ? "disabled" : ""}
        >
          ${busy ? "鐢熸垚涓?.." : escapeHtml(createAssistantStepLabelCurrent(step.id))}
        </button>
      </div>
    </div>
    ${
      showConfig
        ? `
          <div class="create-ai-config">
            <div class="create-wizard__choices create-wizard__choices--providers">
              ${["gemini", "openai"]
                .map(
                  (value) => `
                    <button
                      class="choice-chip choice-chip--panel ${provider === value ? "is-active" : ""}"
                      type="button"
                      data-action="ai-provider-choice"
                      data-value="${escapeHtml(value)}"
                    >
                      ${providerChoiceLabel(value)}
                    </button>
                  `
                )
                .join("")}
            </div>
            <div class="form-grid form-grid--ai">
              <div class="field field--full">
                <label>${escapeHtml(providerChoiceLabel(provider))} Key</label>
                <input
                  type="password"
                  data-action="ai-config-field"
                  data-field="apiKey"
                  value="${escapeHtml(appState.aiConfigDraft.apiKey)}"
                  placeholder="绮樿创浣犵殑 API Key"
                />
              </div>
              <div class="field">
                <label>妯″瀷</label>
                <input
                  type="text"
                  data-action="ai-config-field"
                  data-field="model"
                  value="${escapeHtml(appState.aiConfigDraft.model || appState.ai.model || defaultModelForProvider(provider))}"
                  placeholder="${escapeHtml(defaultModelForProvider(provider))}"
                />
              </div>
            </div>
            <div class="create-ai-config__actions">
              <button
                class="button button--primary button--tiny ${configBusy ? "is-busy" : ""}"
                type="button"
                data-action="save-ai-config"
                ${appState.createAssistant.loading ? "disabled" : ""}
              >
                ${configBusy ? "杩炴帴涓?.." : `杩炴帴 ${providerChoiceLabel(provider)}`}
              </button>
              ${
                appState.ai.configured
                  ? `<button class="button button--ghost button--tiny" type="button" data-action="disconnect-ai-config" ${appState.createAssistant.loading ? "disabled" : ""}>鏂紑</button>`
                  : ""
              }
            </div>
          </div>
        `
        : ""
    }
    ${renderCreateAssistantFeedback()}
  `;
}

function aiProviderLabel(value) {
  return value === "gemini" ? "Gemini" : value === "openai" ? "OpenAI" : "鏈湴寤鸿";
}

function getCurrentAiModelOptions(provider) {
  if (appState.aiModelCatalog.provider === provider && appState.aiModelCatalog.options.length) {
    return appState.aiModelCatalog.options;
  }
  if (appState.ai.configured && appState.ai.provider === provider && appState.ai.model) {
    return [{ id: appState.ai.model, label: appState.ai.model }];
  }
  return [];
}

function renderCreateAssistantToolbarCurrentV2(step) {
  const target = `step:${step.id}`;
  const busy = isCreateAssistantBusy(target);
  const configBusy = isAiConfigBusy();
  const modelBusy = appState.createAssistant.loading && appState.createAssistant.target === "ai-models";
  const showConfig = !appState.ai.configured || appState.aiConfigOpen;
  const provider = appState.aiConfigDraft.provider || appState.ai.provider || "openai";
  const modelOptions = getCurrentAiModelOptions(provider);
  const hasStoredConnection = appState.ai.configured && appState.ai.provider === provider;
  const canFetchModels = Boolean(appState.aiConfigDraft.apiKey.trim() || hasStoredConnection);
  const canConnect = Boolean((appState.aiConfigDraft.apiKey.trim() || hasStoredConnection) && appState.aiConfigDraft.model.trim());

  return `
    <div class="create-step-tools">
      <div class="create-step-tools__meta">
        <span class="chip chip--soft">AI 杈呭姪</span>
        <p>${escapeHtml(createAssistantStatusTextCurrent())}</p>
      </div>
      <div class="create-step-tools__actions">
        <button class="button button--ghost button--tiny" type="button" data-action="toggle-ai-config">
          ${showConfig ? "鏀惰捣杩炴帴" : appState.ai.configured ? "鏇存崲杩炴帴" : "杩炴帴妯″瀷"}
        </button>
        <button
          class="button button--ghost button--tiny ${busy ? "is-busy" : ""}"
          type="button"
          data-action="create-ai-step"
          data-step="${escapeHtml(step.id)}"
          ${appState.createAssistant.loading ? "disabled" : ""}
        >
          ${busy ? "鐢熸垚涓?.." : escapeHtml(createAssistantStepLabelCurrent(step.id))}
        </button>
      </div>
    </div>
    ${
      showConfig
        ? `
          <div class="create-ai-config">
            <div class="create-wizard__choices create-wizard__choices--providers">
              ${["gemini", "openai"]
                .map(
                  (value) => `
                    <button
                      class="choice-chip choice-chip--panel ${provider === value ? "is-active" : ""}"
                      type="button"
                      data-action="ai-provider-choice"
                      data-value="${escapeHtml(value)}"
                    >
                      ${providerChoiceLabel(value)}
                    </button>
                  `
                )
                .join("")}
            </div>
            ${
              hasStoredConnection
                ? `<div class="create-ai-feedback">褰撳墠宸茶繛鎺?${escapeHtml(providerChoiceLabel(provider))}锛屽彲浠ョ洿鎺ヨ幏鍙栨ā鍨嬪垪琛ㄦ垨鍒囨崲妯″瀷銆?/div>`
                : ""
            }
            <div class="form-grid form-grid--ai-connect">
              <div class="field field--full">
                <label>${escapeHtml(providerChoiceLabel(provider))} Key</label>
                <input
                  type="password"
                  data-action="ai-config-field"
                  data-field="apiKey"
                  value="${escapeHtml(appState.aiConfigDraft.apiKey)}"
                  placeholder="${hasStoredConnection ? "已连接时可留空；更换 key 后重新获取模型" : "粘贴你的 API Key"}"
                />
              </div>
            </div>
            <div class="form-grid form-grid--ai">
              <div class="field field--full">
                <label>妯″瀷</label>
                <select data-action="ai-config-field" data-field="model" ${modelOptions.length ? "" : "disabled"}>
                  <option value="">${modelOptions.length ? "选择一个模型" : "先获取模型列表"}</option>
                  ${modelOptions
                    .map(
                      (item) => `
                        <option value="${escapeHtml(item.id)}" ${item.id === appState.aiConfigDraft.model ? "selected" : ""}>
                          ${escapeHtml(item.label || item.id)}
                        </option>
                      `
                    )
                    .join("")}
                </select>
              </div>
            </div>
            <div class="create-ai-config__actions">
              <button
                class="button button--ghost button--tiny ${modelBusy ? "is-busy" : ""}"
                type="button"
                data-action="fetch-ai-models"
                ${appState.createAssistant.loading || !canFetchModels ? "disabled" : ""}
              >
                ${modelBusy ? "读取中..." : modelOptions.length ? "重新获取模型" : "获取模型列表"}
              </button>
              <button
                class="button button--primary button--tiny ${configBusy ? "is-busy" : ""}"
                type="button"
                data-action="save-ai-config"
                ${appState.createAssistant.loading || !canConnect ? "disabled" : ""}
              >
                ${configBusy ? "杩炴帴涓?.." : `杩炴帴 ${providerChoiceLabel(provider)}`}
              </button>
              ${
                appState.ai.configured
                  ? `<button class="button button--ghost button--tiny" type="button" data-action="disconnect-ai-config" ${appState.createAssistant.loading ? "disabled" : ""}>鏂紑</button>`
                  : ""
              }
            </div>
          </div>
        `
        : ""
    }
    ${renderCreateAssistantFeedback()}
  `;
}

function renderCreateAssistantToolbarForCreate(step) {
  const target = `step:${step.id}`;
  const busy = isCreateAssistantBusy(target);
  return `
    <div class="create-step-tools">
      <div class="create-step-tools__meta">
        <span class="chip chip--soft">AI 辅助</span>
        <p>${escapeHtml(createAssistantStatusTextCurrent())}</p>
      </div>
      <div class="create-step-tools__actions">
        <button
          class="button button--ghost button--tiny ${busy ? "is-busy" : ""}"
          type="button"
          data-action="create-ai-step"
          data-step="${escapeHtml(step.id)}"
          ${appState.createAssistant.loading ? "disabled" : ""}
        >
          ${busy ? "生成中..." : escapeHtml(createAssistantStepLabelCurrent(step.id))}
        </button>
      </div>
    </div>
    ${renderCreateAssistantFeedback()}
  `;
}

function renderAiSettingsDialog() {
  const provider = appState.aiConfigDraft.provider || appState.ai.provider || "openai";
  const modelOptions = getCurrentAiModelOptions(provider);
  const hasStoredConnection = appState.ai.configured && appState.ai.provider === provider;
  const configBusy = isAiConfigBusy();
  const modelBusy = appState.createAssistant.loading && appState.createAssistant.target === "ai-models";
  const canFetchModels = Boolean(appState.aiConfigDraft.apiKey.trim() || hasStoredConnection);
  const canConnect = Boolean((appState.aiConfigDraft.apiKey.trim() || hasStoredConnection) && appState.aiConfigDraft.model.trim());

  dom.settingsForm.innerHTML = `
    <div class="create-ai-config create-ai-config--settings">
      <div class="create-wizard__choices create-wizard__choices--providers">
        ${["gemini", "openai"]
          .map(
            (value) => `
              <button
                class="choice-chip choice-chip--panel ${provider === value ? "is-active" : ""}"
                type="button"
                data-action="ai-provider-choice"
                data-value="${escapeHtml(value)}"
              >
                ${providerChoiceLabel(value)}
              </button>
            `
          )
          .join("")}
      </div>
      <div class="create-ai-feedback">
        ${
          hasStoredConnection
            ? `当前已连接 ${escapeHtml(providerChoiceLabel(provider))} · ${escapeHtml(appState.ai.model || "未选择模型")}`
            : "当前未连接模型服务。先填入 Key，再获取模型列表。"
        }
      </div>
      <div class="form-grid form-grid--ai-connect">
        <div class="field field--full">
          <label>${escapeHtml(providerChoiceLabel(provider))} Key</label>
          <input
            type="password"
            data-action="ai-config-field"
            data-field="apiKey"
            value="${escapeHtml(appState.aiConfigDraft.apiKey)}"
            placeholder="${hasStoredConnection ? "已连接时可留空；更换 key 后重新获取模型" : "粘贴你的 API Key"}"
          />
        </div>
      </div>
      <div class="form-grid form-grid--ai">
        <div class="field field--full">
          <label>模型</label>
          <select data-action="ai-config-field" data-field="model" ${modelOptions.length ? "" : "disabled"}>
            <option value="">${modelOptions.length ? "选择一个模型" : "先获取模型列表"}</option>
            ${modelOptions
              .map(
                (item) => `
                  <option value="${escapeHtml(item.id)}" ${item.id === appState.aiConfigDraft.model ? "selected" : ""}>
                    ${escapeHtml(item.label || item.id)}
                  </option>
                `
              )
              .join("")}
          </select>
        </div>
      </div>
      <div class="create-ai-config__actions">
        <button
          class="button button--ghost button--tiny ${modelBusy ? "is-busy" : ""}"
          type="button"
          data-action="fetch-ai-models"
          ${appState.createAssistant.loading || !canFetchModels ? "disabled" : ""}
        >
          ${modelBusy ? "读取中..." : modelOptions.length ? "重新获取模型" : "获取模型列表"}
        </button>
        <button
          class="button button--primary button--tiny ${configBusy ? "is-busy" : ""}"
          type="button"
          data-action="save-ai-config"
          ${appState.createAssistant.loading || !canConnect ? "disabled" : ""}
        >
          ${configBusy ? "连接中..." : `连接 ${providerChoiceLabel(provider)}`}
        </button>
        ${
          appState.ai.configured
            ? `<button class="button button--ghost button--tiny" type="button" data-action="disconnect-ai-config" ${appState.createAssistant.loading ? "disabled" : ""}>断开</button>`
            : ""
        }
      </div>
      ${renderCreateAssistantFeedback()}
    </div>
  `;
}

function formatCreateAssistantErrorCurrent(error) {
  const message = error?.message || "";
  if (/fetch|network/i.test(message)) {
    return "AI 辅助需要本地服务支持，请通过本地服务打开当前页面。";
  }
  return message || "AI 辅助暂时不可用。";
}

async function requestCreateStepSuggestionCurrent(stepId = getProjectCreateStep().id) {
  if (stepId === "logline") {
    await requestCreateConceptOptionsCurrent();
    return;
  }
  appState.createAssistant.loading = true;
  appState.createAssistant.target = `step:${stepId}`;
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  renderProjectCreateForm();

  try {
    const payload = await fetchJson("/api/create-wizard/step", {
      method: "POST",
      body: JSON.stringify({
        stepId,
        draft: appState.projectDraft
      })
    });
    applyProjectDraftPatch(payload.fields);
    appState.ai = payload.ai ?? appState.ai;
    appState.aiConfigDraft.provider = appState.ai.provider || appState.aiConfigDraft.provider;
    appState.aiConfigDraft.model = appState.ai.model || appState.aiConfigDraft.model;
    appState.runtime.serverAvailable = true;
    appState.createAssistant.message =
      payload.provider === "local"
        ? "当前未连接模型服务，已先给出本地建议。"
        : `已用 ${aiProviderLabel(payload.provider)} · ${payload.model || "默认模型"} 补全这一步。`;
    appState.createAssistant.warning = payload.warning || "";
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorCurrent(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    renderProjectCreateForm();
  }
}

async function requestCreateConceptOptionsCurrent() {
  appState.createAssistant.loading = true;
  appState.createAssistant.target = "step:logline";
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  renderProjectCreateForm();

  try {
    const payload = await fetchJson("/api/create-wizard/concepts", {
      method: "POST",
      body: JSON.stringify({
        draft: appState.projectDraft
      })
    });
    appState.createConceptOptions = Array.isArray(payload.options) ? payload.options : [];
    appState.ai = payload.ai ?? appState.ai;
    appState.aiConfigDraft.provider = appState.ai.provider || appState.aiConfigDraft.provider;
    appState.aiConfigDraft.model = appState.ai.model || appState.aiConfigDraft.model;
    appState.runtime.serverAvailable = true;
    appState.createAssistant.message =
      payload.provider === "local"
        ? "当前未连接模型服务，已先给出 3 组本地概念候选。"
        : `已用 ${aiProviderLabel(payload.provider)} · ${payload.model || "默认模型"} 生成 3 组概念候选。`;
    appState.createAssistant.warning = payload.warning || "";
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorCurrent(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    renderProjectCreateForm();
  }
}

function applyConceptOptionCurrent(optionId) {
  const option = appState.createConceptOptions.find((item) => item.id === optionId);
  if (!option) {
    return;
  }
  applyProjectDraftPatch({
    logline: option.logline,
    core_conflict: option.core_conflict
  });
  appState.createAssistant.message = `已采用“${option.label || "概念候选"}”。`;
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  renderProjectCreateForm();
}

async function requestCreateFieldSuggestionCurrent(fieldName) {
  appState.createAssistant.loading = true;
  appState.createAssistant.target = `field:${fieldName}`;
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  renderProjectCreateForm();

  try {
    const payload = await fetchJson("/api/create-wizard/field", {
      method: "POST",
      body: JSON.stringify({
        field: fieldName,
        draft: appState.projectDraft
      })
    });
    applyProjectDraftPatch({ [fieldName]: payload.value });
    appState.ai = payload.ai ?? appState.ai;
    appState.aiConfigDraft.provider = appState.ai.provider || appState.aiConfigDraft.provider;
    appState.aiConfigDraft.model = appState.ai.model || appState.aiConfigDraft.model;
    appState.runtime.serverAvailable = true;
    appState.createAssistant.message =
      payload.provider === "local"
        ? "当前未连接模型服务，已先给出本地建议。"
        : `已用 ${aiProviderLabel(payload.provider)} · ${payload.model || "默认模型"} 重写“${projectDraftFieldLabels[fieldName] ?? fieldName}”。`;
    appState.createAssistant.warning = payload.warning || "";
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorCurrent(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    renderProjectCreateForm();
  }
}

async function saveAiConfigDraftCurrent() {
  const provider = appState.aiConfigDraft.provider || "openai";
  const apiKey = appState.aiConfigDraft.apiKey.trim();
  const model = appState.aiConfigDraft.model.trim() || defaultModelForProvider(provider);
  if (!apiKey) {
    appState.createAssistant.error = "鍏堝～鍏?API Key 鍐嶈繛鎺ャ€?";
    renderProjectCreateForm();
    return;
  }

  appState.createAssistant.loading = true;
  appState.createAssistant.target = "ai-config";
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  renderProjectCreateForm();

  try {
    const payload = await fetchJson("/api/ai/config", {
      method: "POST",
      body: JSON.stringify({ provider, apiKey, model })
    });
    appState.ai = payload.ai ?? appState.ai;
    appState.aiConfigDraft.provider = appState.ai.provider || provider;
    appState.aiConfigDraft.apiKey = "";
    appState.aiConfigDraft.model = appState.ai.model || model;
    appState.aiConfigOpen = false;
    appState.runtime.serverAvailable = true;
    appState.createAssistant.message = `已连接 ${providerChoiceLabel(appState.ai.provider || provider)} · ${appState.ai.model || model}，现在可以测试真实生成。`;
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorCurrent(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    renderProjectCreateForm();
  }
}

async function disconnectAiConfigDraftCurrent() {
  const provider = appState.aiConfigDraft.provider || appState.ai.provider || "openai";
  appState.createAssistant.loading = true;
  appState.createAssistant.target = "ai-config";
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  renderProjectCreateForm();

  try {
    const payload = await fetchJson("/api/ai/config", {
      method: "POST",
      body: JSON.stringify({
        provider,
        apiKey: "",
        model: appState.aiConfigDraft.model || appState.ai.model || defaultModelForProvider(provider)
      })
    });
    appState.ai = payload.ai ?? appState.ai;
    appState.aiConfigDraft.provider = provider;
    appState.aiConfigOpen = true;
    appState.createAssistant.message = "宸叉柇寮€妯″瀷鏈嶅姟锛屽綋鍓嶄細閫€鍥炴湰鍦板缓璁€?";
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorCurrent(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    renderProjectCreateForm();
  }
}

async function fetchAiModelOptionsCurrentV2() {
  const provider = appState.aiConfigDraft.provider || appState.ai.provider || "openai";
  const apiKey = appState.aiConfigDraft.apiKey.trim();
  const hasStoredConnection = appState.ai.configured && appState.ai.provider === provider;
  if (!apiKey && !hasStoredConnection) {
    appState.createAssistant.error = "鍏堝～鍏?API Key锛屽啀鑾峰彇妯″瀷鍒楄〃銆?";
    renderProjectCreateForm();
    return;
  }

  appState.createAssistant.loading = true;
  appState.createAssistant.target = "ai-models";
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  renderProjectCreateForm();

  try {
    const payload = await fetchJson("/api/ai/models", {
      method: "POST",
      body: JSON.stringify({
        provider,
        apiKey: apiKey || undefined
      })
    });
    appState.aiModelCatalog.provider = provider;
    appState.aiModelCatalog.options = Array.isArray(payload.models) ? payload.models : [];
    const preferredModel =
      appState.aiModelCatalog.options.find((item) => item.id === appState.aiConfigDraft.model)?.id ||
      payload.defaultModel ||
      appState.aiModelCatalog.options[0]?.id ||
      "";
    appState.aiConfigDraft.model = preferredModel;
    appState.runtime.serverAvailable = true;
    appState.createAssistant.message = `已获取 ${appState.aiModelCatalog.options.length} 个模型，请选择后再连接。`;
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorCurrent(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    renderProjectCreateForm();
  }
}

async function saveAiConfigDraftCurrentV2() {
  const provider = appState.aiConfigDraft.provider || "openai";
  const apiKey = appState.aiConfigDraft.apiKey.trim();
  const model = appState.aiConfigDraft.model.trim();
  const hasStoredConnection = appState.ai.configured && appState.ai.provider === provider;
  if (!apiKey && !hasStoredConnection) {
    appState.createAssistant.error = "鍏堝～鍏?API Key锛屾垨淇濈暀褰撳墠杩炴帴銆?";
    renderProjectCreateForm();
    return;
  }
  if (!model) {
    appState.createAssistant.error = "鍏堣幏鍙栨ā鍨嬪垪琛ㄥ苟閫変竴涓ā鍨嬨€?";
    renderProjectCreateForm();
    return;
  }

  appState.createAssistant.loading = true;
  appState.createAssistant.target = "ai-config";
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  renderProjectCreateForm();

  try {
    const payload = await fetchJson("/api/ai/config", {
      method: "POST",
      body: JSON.stringify(apiKey ? { provider, apiKey, model } : { provider, model })
    });
    appState.ai = payload.ai ?? appState.ai;
    appState.aiConfigDraft.provider = appState.ai.provider || provider;
    appState.aiConfigDraft.apiKey = "";
    appState.aiConfigDraft.model = appState.ai.model || model;
    if (!appState.aiModelCatalog.options.some((item) => item.id === appState.aiConfigDraft.model)) {
      appState.aiModelCatalog.provider = provider;
      appState.aiModelCatalog.options = [{ id: appState.aiConfigDraft.model, label: appState.aiConfigDraft.model }];
    }
    appState.aiConfigOpen = false;
    appState.runtime.serverAvailable = true;
    appState.createAssistant.message = `已连接 ${providerChoiceLabel(appState.ai.provider || provider)} · ${appState.ai.model || model}，现在可以测试真实生成。`;
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorCurrent(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    renderProjectCreateForm();
  }
}

async function disconnectAiConfigDraftCurrentV2() {
  const provider = appState.aiConfigDraft.provider || appState.ai.provider || "openai";
  appState.createAssistant.loading = true;
  appState.createAssistant.target = "ai-config";
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  renderProjectCreateForm();

  try {
    const payload = await fetchJson("/api/ai/config", {
      method: "POST",
      body: JSON.stringify({
        provider,
        apiKey: "",
        model: appState.aiConfigDraft.model || appState.ai.model || defaultModelForProvider(provider)
      })
    });
    appState.ai = payload.ai ?? appState.ai;
    appState.aiConfigDraft.provider = provider;
    appState.aiConfigOpen = true;
    appState.createAssistant.message = "宸叉柇寮€妯″瀷鏈嶅姟锛屽綋鍓嶄細閫€鍥炴湰鍦板缓璁€?";
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorCurrent(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    renderProjectCreateForm();
  }
}

function renderProjectCreateFormV3() {
  const step = getProjectCreateStep();
  const nextStep = projectCreateStepsCurrent[appState.projectCreateStepIndex + 1];
  const selectedConceptId = appState.createConceptOptions.find(
    (item) => item.logline === appState.projectDraft.logline && item.core_conflict === appState.projectDraft.core_conflict
  )?.id;

  dom.projectCreateEyebrow.textContent = step.eyebrow;
  dom.projectCreateTitle.textContent = step.title;
  dom.projectCreateDescription.textContent = step.description;
  dom.projectCreateProgress.style.width = `${((appState.projectCreateStepIndex + 1) / projectCreateStepsCurrent.length) * 100}%`;
  dom.cancelCreateProjectButton.textContent = appState.projectCreateStepIndex === 0 ? "取消" : "上一步";
  dom.confirmCreateProjectButton.textContent = step.id === "blueprint" ? "创建并进入创作" : `进入${nextStep?.title || "下一步"}`;
  dom.confirmCreateProjectButton.disabled = !canAdvanceProjectCreate() || appState.createAssistant.loading;

  if (step.id === "basics") {
    dom.projectCreateForm.className = "create-wizard";
    dom.projectCreateForm.innerHTML = `
      ${renderCreateAssistantToolbarForCreate(step)}
      <div class="create-wizard__choices">
        ${projectFormatChoices
          .map(
            (value) => `
              <button
                class="choice-chip choice-chip--panel ${appState.projectDraft.format === value ? "is-active" : ""}"
                type="button"
                data-action="draft-choice"
                data-field="format"
                data-value="${escapeHtml(value)}"
              >
                ${escapeHtml(formatLabels[value] ?? value)}
              </button>
            `
          )
          .join("")}
      </div>
      <div class="form-grid">
        ${createDraftInputField("类型方向", "genre", appState.projectDraft.genre, { full: true, aiField: "genre" })}
        ${createDraftSelectField(
          "叙事结构",
          "structure_template",
          appState.projectDraft.structure_template,
          getStructureOptionsForFormat(appState.projectDraft.format, appState.projectDraft.structure_template)
        )}
        ${
          appState.projectDraft.structure_template === "custom"
            ? createDraftSelectField(
                "自定义幕数",
                "custom_act_count",
                appState.projectDraft.custom_act_count,
                [
                  ["1", "1 幕"],
                  ["2", "2 幕"],
                  ["3", "3 幕"],
                  ["4", "4 幕"],
                  ["5", "5 幕"],
                  ["6", "6 幕"]
                ]
              )
            : ""
        }
        ${createDraftInputField("风格方向", "tone", appState.projectDraft.tone, { aiField: "tone" })}
      </div>
    `;
    return;
  }

  if (step.id === "logline") {
    dom.projectCreateForm.className = "create-wizard";
    dom.projectCreateForm.innerHTML = `
      ${renderCreateAssistantToolbarForCreate(step)}
      <div class="create-wizard__stage">
        <section class="summary-card concept-stage">
          <div class="list-card__head">
            <div>
              <h3>概念候选</h3>
              <p class="mini-copy">先选方向，再进入起名。</p>
            </div>
            <button
              class="button button--ghost button--tiny ${isCreateAssistantBusy("step:logline") ? "is-busy" : ""}"
              type="button"
              data-action="create-ai-step"
              data-step="logline"
              ${appState.createAssistant.loading ? "disabled" : ""}
            >
              ${isCreateAssistantBusy("step:logline") ? "生成中..." : "重新生成 3 组"}
            </button>
          </div>
          ${
            appState.createConceptOptions.length
              ? `
                <div class="concept-option-grid">
                  ${appState.createConceptOptions
                    .map(
                      (option) => `
                        <article class="concept-option ${option.id === selectedConceptId ? "is-active" : ""}">
                          <div class="concept-option__head">
                            <strong>${escapeHtml(option.label || "候选方案")}</strong>
                            <button
                              class="button button--ghost button--tiny"
                              type="button"
                              data-action="apply-concept-option"
                              data-id="${escapeHtml(option.id)}"
                            >
                              ${option.id === selectedConceptId ? "已采用" : "采用这组"}
                            </button>
                          </div>
                          <div class="concept-option__body">
                            <p><span>一句话概念</span>${escapeHtml(option.logline || "待生成")}</p>
                            <p><span>核心冲突</span>${escapeHtml(option.core_conflict || "待生成")}</p>
                          </div>
                        </article>
                      `
                    )
                    .join("")}
                </div>
              `
              : `
                <div class="empty-state empty-state--compact">
                  <p>先生成 3 组候选，再选一组进入下一步。</p>
                </div>
              `
          }
        </section>
        <section class="summary-card concept-stage">
          <div class="list-card__head">
            <div>
              <h3>当前采用</h3>
              <p class="mini-copy">采用后仍然可以继续微调。</p>
            </div>
          </div>
          <div class="create-wizard__stage">
            ${createDraftTextareaField("一句话概念", "logline", appState.projectDraft.logline, { rows: 4, aiField: "logline" })}
            ${createDraftTextareaField("核心冲突", "core_conflict", appState.projectDraft.core_conflict, { rows: 4, aiField: "core_conflict" })}
          </div>
        </section>
      </div>
    `;
    return;
  }

  if (step.id === "title") {
    dom.projectCreateForm.className = "create-wizard";
    dom.projectCreateForm.innerHTML = `
      ${renderCreateAssistantToolbarForCreate(step)}
      <div class="create-wizard__stage">
        <section class="summary-card concept-stage">
          <div class="list-card__head">
            <div>
              <h3>项目命名</h3>
              <p class="mini-copy">名称应服务于已经选定的概念方向。</p>
            </div>
          </div>
          ${createDraftTextareaField("项目名称", "title", appState.projectDraft.title, { rows: 2, aiField: "title" })}
        </section>
      </div>
    `;
    return;
  }

  dom.projectCreateForm.className = "create-review";
  dom.projectCreateForm.innerHTML = `
    ${renderCreateAssistantToolbarForCreate(step)}
    <section class="summary-card">
      <p class="section-label">基础信息</p>
      <div class="form-grid">
        ${createDraftInputField("项目名称", "title", appState.projectDraft.title, { aiField: "title" })}
        ${createDraftInputField("类型方向", "genre", appState.projectDraft.genre, { aiField: "genre" })}
        ${createDraftInputField("风格方向", "tone", appState.projectDraft.tone, { aiField: "tone" })}
        ${createDraftSelectField(
          "叙事结构",
          "structure_template",
          appState.projectDraft.structure_template,
          getStructureOptionsForFormat(appState.projectDraft.format, appState.projectDraft.structure_template)
        )}
        ${
          appState.projectDraft.structure_template === "custom"
            ? createDraftSelectField(
                "自定义幕数",
                "custom_act_count",
                appState.projectDraft.custom_act_count,
                [
                  ["1", "1 幕"],
                  ["2", "2 幕"],
                  ["3", "3 幕"],
                  ["4", "4 幕"],
                  ["5", "5 幕"],
                  ["6", "6 幕"]
                ]
              )
            : ""
        }
        ${createDraftTextareaField("一句话概念", "logline", appState.projectDraft.logline, { rows: 4, aiField: "logline" })}
        ${createDraftTextareaField("核心冲突", "core_conflict", appState.projectDraft.core_conflict, { rows: 4, aiField: "core_conflict" })}
      </div>
    </section>
    <section class="summary-card">
      <p class="section-label">蓝图确认</p>
      <div class="form-grid">
        ${createDraftTextareaField("主题问题", "theme_question", appState.projectDraft.theme_question, { rows: 3, aiField: "theme_question" })}
        ${createDraftTextareaField("主题陈述", "theme", appState.projectDraft.theme, { rows: 3, aiField: "theme" })}
        ${createDraftInputField("主角", "protagonist", appState.projectDraft.protagonist, { aiField: "protagonist" })}
        ${createDraftInputField("视觉母题", "motif", appState.projectDraft.motif, { aiField: "motif" })}
        ${createDraftInputField("弧光起点", "arc_start", appState.projectDraft.arc_start, { aiField: "arc_start" })}
        ${createDraftInputField("弧光终点", "arc_end", appState.projectDraft.arc_end, { aiField: "arc_end" })}
        ${createDraftInputField("外部目标", "external_goal", appState.projectDraft.external_goal, { aiField: "external_goal" })}
        ${createDraftInputField("内部需要", "internal_need", appState.projectDraft.internal_need, { aiField: "internal_need" })}
        ${createDraftTextareaField("世界起点", "setting", appState.projectDraft.setting, { rows: 3, aiField: "setting" })}
        ${createDraftTextareaField("观众承诺", "audience_promise", appState.projectDraft.audience_promise, { rows: 3, aiField: "audience_promise" })}
      </div>
    </section>
  `;
}

function renderProjectCreateForm() {
  renderProjectCreateFormV3();
}

workflowSteps.splice(0, workflowSteps.length, ...[
  { id: "structure", label: "结构页", description: "先确定结构模板、幕和必要节点。" },
  { id: "plots", label: "剧情板", description: "把主线、强化和备选剧情放进对应幕与节点。" },
  { id: "characters", label: "角色台", description: "先把人物本身收稳，再看他们如何牵动剧情。" },
  { id: "relationships", label: "关系台账", description: "专门处理人物之间的张力、权力和共同过去。" },
  { id: "genres", label: "类型约束", description: "把类型承诺、禁区和节奏预期收成一层。" },
  { id: "locks", label: "锁定层", description: "把已确认内容沉淀成长期事实和追踪项。" },
  { id: "scenes", label: "场景页", description: "把锁定后的剧情卡拆成可写的场景序列。" }
]);

function renderRuntimeStatus() {
  const mode = appState.runtime.serverAvailable ? "本地服务" : "本地草稿";
  const saving = appState.runtime.saving ? "保存中" : appState.runtime.dirty ? "待保存" : "已同步";
  dom.runtimeStatus.innerHTML = `
    <span class="chip chip--soft">${escapeHtml(mode)}</span>
    <span class="chip chip--soft">${escapeHtml(saving)}</span>
  `;
}

function renderWorkflowShell() {
  const step = getStep();
  dom.wizardShell.classList.add("is-compact");
  dom.stepTitle.textContent = step.label;
  dom.stepDescription.textContent = step.description;
  dom.stepCountChip.textContent = `${currentStepIndex() + 1} / ${workflowSteps.length}`;
  const stepButtons = workflowSteps
    .map(
      (item, index) => `
        <button
          class="step-button step-button--${escapeHtml(item.id)} ${item.id === appState.currentStepId ? "is-active" : ""}"
          type="button"
          data-action="go-step"
          data-id="${escapeHtml(item.id)}"
          aria-current="${item.id === appState.currentStepId ? "step" : "false"}"
        >
          <span class="step-button__count">${index + 1}</span>
          <span class="step-button__label">${escapeHtml(item.label)}</span>
        </button>
      `
    )
    .join("");
  dom.stepperNav.innerHTML = stepButtons;
  dom.heroStepperNav.innerHTML = stepButtons;
  if (dom.stepPrevButton) {
    dom.stepPrevButton.disabled = currentStepIndex() === 0;
  }
  if (dom.stepNextButton) {
    dom.stepNextButton.disabled = currentStepIndex() === workflowSteps.length - 1;
  }
}

function renderHero() {
  const step = getStep();
  const toolbarMode = appState.toolbarMode || "compact";
  dom.hero.hidden = false;
  dom.toolbarRevealButton.hidden = true;
  if (appState.currentPage === "project") {
    dom.hero.classList.remove("is-compact", "is-topbar", "is-toolbar-expanded", "is-toolbar-hidden");
    dom.heroSide.hidden = true;
    dom.heroStepperNav.hidden = true;
    dom.toolbarModeGroup.hidden = true;
    dom.heroEyebrow.textContent = "项目中心";
    dom.heroTitle.textContent = "项目中心";
    dom.heroDescription.textContent = "这里只显示项目列表。";
    dom.saveButton.hidden = true;
    dom.resetButton.hidden = true;
    dom.runtimeStatus.hidden = true;
    return;
  }
  dom.hero.classList.add("is-topbar");
  dom.hero.classList.toggle("is-compact", toolbarMode !== "expanded");
  dom.hero.classList.toggle("is-toolbar-expanded", toolbarMode === "expanded");
  dom.hero.classList.toggle("is-toolbar-hidden", toolbarMode === "hidden");
  dom.heroSide.hidden = false;
  dom.heroStepperNav.hidden = toolbarMode === "hidden";
  dom.toolbarModeGroup.hidden = toolbarMode === "hidden";
  dom.heroEyebrow.textContent = "创作页";
  dom.heroTitle.textContent = appState.project.project.title || "未命名项目";
  dom.heroDescription.textContent = step.description;
  dom.saveButton.hidden = false;
  dom.resetButton.hidden = true;
  dom.runtimeStatus.hidden = toolbarMode !== "expanded";
  dom.toolbarDensityButton.textContent = toolbarMode === "expanded" ? "收窄" : "展开";
  if (toolbarMode === "hidden") {
    dom.hero.hidden = true;
    dom.toolbarRevealButton.hidden = false;
  }
}

function renderStructurePage() {
  const structure = appState.project.structure_profile;
  const storyCore = appState.project.story_core;
  const orderedActs = getOrderedActs();
  const orderedNodes = getOrderedNodes();
  const nodeCards = new Map(list(appState.project.plot_board?.cards).map((card) => [card.id, card]));
  dom.structureContent.innerHTML = `
    <section class="workbench workbench--structure">
      <div class="workbench__main">
        <div class="summary-card">
          <p class="section-label">故事核心</p>
          <div class="form-grid">
            ${textareaField("故事前提", "story-core-field", "premise", storyCore.premise, { rows: 4 })}
            ${textareaField("核心冲突", "story-core-field", "core_conflict", storyCore.core_conflict, { rows: 4 })}
            ${textareaField("中心问题", "story-core-field", "central_question", storyCore.central_question, { rows: 3 })}
            ${inputField("情绪承诺", "story-core-field", "emotional_promise", storyCore.emotional_promise)}
            ${textareaField("主题陈述", "story-core-field", "theme_statement", storyCore.theme_statement, { rows: 3 })}
          </div>
        </div>
        <div class="summary-card">
          <p class="section-label">结构模板</p>
          <div class="form-grid">
            ${selectField(
              "结构模板",
              "structure-meta-field",
              "template",
              structure.template,
              getStructureOptionsForFormat(appState.project.project.format, structure.template)
            )}
            ${
              structure.template === "custom"
                ? selectField(
                    "自定义幕数",
                    "structure-meta-field",
                    "custom_act_count",
                    String(structure.custom_act_count ?? list(structure.acts).length ?? 2),
                    [
                      ["1", "1 幕"],
                      ["2", "2 幕"],
                      ["3", "3 幕"],
                      ["4", "4 幕"],
                      ["5", "5 幕"],
                      ["6", "6 幕"]
                    ]
                  )
                : ""
            }
            ${selectField("节奏覆层", "structure-meta-field", "rhythm_overlay", structure.rhythm_overlay, [["save_the_cat", "旧猫咪节拍表"], ["hero_journey", "英雄之旅"], ["story_circle", "故事圆环"], ["none", "不套节拍表"]])}
          </div>
        </div>
        <div class="structure-acts">
          ${orderedActs
            .map(
              (act) => `
                <article class="list-card">
                  <div class="list-card__head">
                    <div>
                        <h3>${escapeHtml(act.title)}</h3>
                        <p>${escapeHtml(act.range_label)}</p>
                      </div>
                    <span class="chip chip--soft">${getOrderedNodes(act.id).length} 节点</span>
                  </div>
                  <div class="form-grid form-grid--compact">
                    ${field("幕标题", `<input data-action="act-field" data-id="${escapeHtml(act.id)}" data-field="title" value="${escapeHtml(act.title)}" />`)}
                    ${field("幕功能", `<input data-action="act-field" data-id="${escapeHtml(act.id)}" data-field="purpose" value="${escapeHtml(act.purpose)}" />`, true)}
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </div>
      <aside class="workbench__side">
        <div class="summary-card">
          <p class="section-label">必要节点</p>
          <div class="stack">
            ${orderedNodes
              .map((node, index) => {
                const cards = list(node.card_ids).map((id) => nodeCards.get(id)).filter(Boolean);
                return `
                  <article class="node-card ${node.required ? "is-required" : ""}">
                    <div class="node-card__top">
                      <div>
                        <h3>${index + 1}. ${escapeHtml(node.title)}</h3>
                        <p>${escapeHtml(getActTitle(node.act_id))}</p>
                      </div>
                      <span class="chip chip--soft">${cards.length} 张卡</span>
                    </div>
                    <textarea data-action="node-field" data-id="${escapeHtml(node.id)}" data-field="note" rows="2">${escapeHtml(node.note || "")}</textarea>
                  </article>
                `;
              })
              .join("")}
          </div>
        </div>
      </aside>
    </section>
  `;
}

function renderCharacterEditorFields(character) {
  return `
    <div class="stack">
      <section>
        <p class="section-label">基础定位</p>
        <div class="form-grid form-grid--compact">
          ${inputField("人物名", "character-field", "name", character.name)}
          ${selectField("人物位置", "character-field", "story_role", character.story_role, Object.entries(storyRoleLabels))}
          ${textareaField("备注", "character-field", "notes", character.notes, { rows: 3, full: true })}
        </div>
      </section>
      <section>
        <p class="section-label">动机与秘密</p>
        <div class="form-grid form-grid--compact">
          ${inputField("外部目标", "character-field", "external_goal", character.external_goal, { full: true })}
          ${inputField("内部需要", "character-field", "dramatic_need", character.dramatic_need, { full: true })}
          ${textareaField("核心矛盾", "character-field", "contradiction", character.contradiction, { rows: 3 })}
          ${inputField("压力点", "character-field", "pressure_point", character.pressure_point)}
          ${textareaField("秘密", "character-field", "secret", character.secret, { rows: 4, full: true })}
        </div>
      </section>
      <section>
        <p class="section-label">弧光变化</p>
        <div class="form-grid form-grid--compact">
          ${inputField("人物表层", "character-field", "starting_mask", character.starting_mask, { full: true })}
          ${inputField("弧光起点", "character-field", "arc_start", character.arc_start, { full: true })}
          ${inputField("弧光终点", "character-field", "arc_end", character.arc_end, { full: true })}
        </div>
      </section>
    </div>
  `;
}

function renderCharacterChecklist(selectedIds = []) {
  const selected = new Set(list(selectedIds));
  return `
    <div class="check-list">
      ${list(appState.project.character_hub?.characters)
        .map(
          (character) => `
            <label class="check-list__item">
              <input
                type="checkbox"
                data-action="plot-character-toggle"
                data-id="${escapeHtml(character.id)}"
                ${selected.has(character.id) ? "checked" : ""}
              />
              <span>${escapeHtml(character.name)}</span>
            </label>
          `
        )
        .join("")}
    </div>
  `;
}

function renderPlotChecklist(selectedIds = []) {
  const selected = new Set(list(selectedIds));
  return `
    <div class="check-list">
      ${list(appState.project.plot_board?.cards)
        .map(
          (card) => `
            <label class="check-list__item">
              <input
                type="checkbox"
                data-action="scene-plot-toggle"
                data-id="${escapeHtml(card.id)}"
                ${selected.has(card.id) ? "checked" : ""}
              />
              <span>${escapeHtml(card.title || "未命名剧情卡")}</span>
            </label>
          `
        )
        .join("")}
    </div>
  `;
}

renderCharactersPage = function renderCharactersPageLatest() {
  if (!dom.charactersContent) {
    return;
  }
  const selectedCharacter = getCharacter();
  const characters = list(appState.project.character_hub?.characters);
  const linkedCards = selectedCharacter ? getCharacterLinkedPlotCards(selectedCharacter.id) : [];
  const relationships = selectedCharacter ? getCharacterRelationships(selectedCharacter.id) : [];
  const linkedScenes = selectedCharacter ? getCharacterLinkedScenes(selectedCharacter.id) : [];
  dom.charactersContent.innerHTML = `
    <section class="character-workbench character-workbench--triple">
      <aside class="workbench-pane workbench-pane--rail">
        <div class="summary-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">角色导航</p>
              <h3>人物名单</h3>
            </div>
            <button class="button button--ghost button--tiny" type="button" data-action="add-character">新增人物</button>
          </div>
          <div class="stack workbench-scroll-list">
            ${characters
              .map(
                (character) => `
                  <button class="list-select ${character.id === appState.selection.characterId ? "is-active" : ""}" type="button" data-action="select-character" data-id="${escapeHtml(character.id)}">
                    <strong>${escapeHtml(character.name || "未命名人物")}</strong>
                    <span>${escapeHtml(storyRoleLabels[character.story_role] ?? character.story_role)}</span>
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
        <div class="summary-card summary-card--compact">
          <div class="list-card__head">
            <h3>当前人物</h3>
            <span class="chip chip--soft">${characters.length} 人</span>
          </div>
          ${
            !selectedCharacter
              ? renderEmptyState("先创建一个人物。")
              : `
                <div class="summary-strip">
                  <span class="chip chip--soft">${escapeHtml(storyRoleLabels[selectedCharacter.story_role] ?? selectedCharacter.story_role)}</span>
                  <span class="chip chip--soft">${linkedCards.length} 张剧情卡</span>
                  <span class="chip chip--soft">${relationships.length} 条关系</span>
                  <span class="chip chip--soft">${linkedScenes.length} 个场景</span>
                </div>
                <div class="stack workbench-mini-stack">
                  <div class="list-select list-select--static">
                    <strong>外部目标</strong>
                    <span>${escapeHtml(selectedCharacter.external_goal || "还没有确定。")}</span>
                  </div>
                  <div class="list-select list-select--static">
                    <strong>弧光落点</strong>
                    <span>${escapeHtml(selectedCharacter.arc_end || "还没有确定。")}</span>
                  </div>
                </div>
                <div class="inline-actions">
                  <button class="button button--ghost button--tiny" type="button" data-action="go-step" data-id="relationships">查看关系台账</button>
                </div>
              `
          }
        </div>
      </aside>
      <div class="workbench-pane workbench-pane--main">
        <div class="summary-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">主编辑区</p>
              <h3>${escapeHtml(selectedCharacter?.name || "未命名人物")}</h3>
            </div>
            ${
              selectedCharacter
                ? `<button class="button button--ghost button--tiny" type="button" data-action="delete-character" data-id="${escapeHtml(selectedCharacter.id)}">删除人物</button>`
                : ""
            }
          </div>
          ${
            !selectedCharacter
              ? renderEmptyState("先创建一个人物。")
              : `
                ${renderCharacterEditorFields(selectedCharacter)}
              `
          }
        </div>
      </div>
      <aside class="workbench-pane workbench-pane--context">
        <div class="summary-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">速查区</p>
              <h3>牵动剧情</h3>
            </div>
            <span class="chip chip--soft">${linkedCards.length} 张</span>
          </div>
          ${
            linkedCards.length === 0
              ? renderEmptyState("这个人物还没有牵动到剧情卡。")
              : `
                <div class="stack workbench-scroll-list">
                  ${linkedCards
                    .map(
                      (card) => `
                        <button class="list-select" type="button" data-action="jump-to-plot-card" data-id="${escapeHtml(card.id)}">
                          <strong>${escapeHtml(card.title || "未命名剧情卡")}</strong>
                          <span>${escapeHtml(getActTitle(card.act_id))} 路 ${escapeHtml(getNode(card.node_id)?.title ?? "未挂节点")}</span>
                        </button>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>相关关系</h3>
            <span class="chip chip--soft">${relationships.length} 条</span>
          </div>
          ${
            relationships.length === 0
              ? renderEmptyState("这个人物还没有建立关系。")
              : `
                <div class="stack workbench-scroll-list">
                  ${relationships
                    .map(
                      (relationship) => `
                        <button class="list-select" type="button" data-action="jump-to-relationship" data-id="${escapeHtml(relationship.id)}">
                          <strong>${escapeHtml(getCharacterNameById(relationship.source_character_id))} 路 ${escapeHtml(getCharacterNameById(relationship.target_character_id))}</strong>
                          <span>${escapeHtml(relationship.relationship_type || "未命名关系")}</span>
                        </button>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>出场场景</h3>
            <span class="chip chip--soft">${linkedScenes.length} 个</span>
          </div>
          ${
            linkedScenes.length === 0
              ? renderEmptyState("这个人物还没有进入场景。")
              : `
                <div class="stack workbench-scroll-list">
                  ${linkedScenes
                    .map(
                      (scene) => `
                        <button class="list-select" type="button" data-action="jump-to-scene" data-id="${escapeHtml(scene.id)}">
                          <strong>${escapeHtml(scene.order_index)} 路 ${escapeHtml(scene.title || "未命名场景")}</strong>
                          <span>${escapeHtml(scene.location || "未定地点")} 路 ${escapeHtml(scene.time_of_day || "未定时段")}</span>
                        </button>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
      </aside>
    </section>
  `;
};

function renderRelationshipsPage() {
  if (!dom.relationshipsContent) {
    return;
  }
  const selectedRelationship = getRelationship();
  const characters = list(appState.project.character_hub?.characters);
  const relatedCards = getRelationshipLinkedPlotCards(selectedRelationship);
  dom.relationshipsContent.innerHTML = `
    <section class="relationship-workbench">
      <div class="relationship-workbench__column">
        <div class="summary-card">
          <div class="list-card__head">
            <h3>鍏崇郴娓呭崟</h3>
            <button class="button button--ghost button--tiny" type="button" data-action="add-relationship">鏂板鍏崇郴</button>
          </div>
          <div class="stack">
            ${list(appState.project.character_hub?.relationship_map)
              .map((relationship) => {
                const source = characters.find((item) => item.id === relationship.source_character_id)?.name ?? "鏈畾";
                const target = characters.find((item) => item.id === relationship.target_character_id)?.name ?? "鏈畾";
                return `
                  <button class="list-select ${relationship.id === appState.selection.relationshipId ? "is-active" : ""}" type="button" data-action="select-relationship" data-id="${escapeHtml(relationship.id)}">
                    <strong>${escapeHtml(source)} 鈫?${escapeHtml(target)}</strong>
                    <span>${escapeHtml(relationship.relationship_type || "鏈懡鍚嶅叧绯?")}</span>
                  </button>
                `;
              })
              .join("")}
          </div>
        </div>
        <div class="summary-card summary-card--compact relationship-summary-card">
          <p class="section-label">鍏崇郴姒傝</p>
          ${
            !selectedRelationship
              ? renderEmptyState("鍏堝垱寤轰竴鏉″叧绯汇€?")
              : `
                <div class="summary-strip">
                  <span class="chip chip--soft">${relatedCards.length} 寮犲叡鍚屽墽鎯呭崱</span>
                  <span class="chip chip--soft">${escapeHtml(relationshipStatusLabels[selectedRelationship.status] ?? selectedRelationship.status)}</span>
                </div>
                <div class="inline-actions">
                  <button class="button button--ghost button--tiny" type="button" data-action="go-step" data-id="characters">鍥炲埌瑙掕壊鍙?/button>
                </div>
              `
          }
        </div>
      </div>
      <div class="relationship-workbench__column relationship-workbench__column--wide">
        <div class="summary-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">鍏崇郴缂栬緫</p>
              <h3>${escapeHtml(selectedRelationship?.relationship_type || "鏈懡鍚嶅叧绯?")}</h3>
            </div>
            ${
              selectedRelationship
                ? `<button class="button button--ghost button--tiny" type="button" data-action="delete-relationship" data-id="${escapeHtml(selectedRelationship.id)}">鍒犻櫎鍏崇郴</button>`
                : ""
            }
          </div>
          ${
            !selectedRelationship
              ? renderEmptyState("鍏堝垱寤轰竴鏉″叧绯汇€?")
              : `
                <div class="form-grid">
                  ${field(
                    "鍏崇郴璧风偣",
                    `<select data-action="relationship-field" data-field="source_character_id">${characters
                      .map((character) => `<option value="${escapeHtml(character.id)}" ${character.id === selectedRelationship.source_character_id ? "selected" : ""}>${escapeHtml(character.name || "鏈懡鍚嶄汉鐗?")}</option>`)
                      .join("")}</select>`
                  )}
                  ${field(
                    "鍏崇郴缁堢偣",
                    `<select data-action="relationship-field" data-field="target_character_id">${characters
                      .map((character) => `<option value="${escapeHtml(character.id)}" ${character.id === selectedRelationship.target_character_id ? "selected" : ""}>${escapeHtml(character.name || "鏈懡鍚嶄汉鐗?")}</option>`)
                      .join("")}</select>`
                  )}
                  ${inputField("鍏崇郴鍚嶇О", "relationship-field", "relationship_type", selectedRelationship.relationship_type)}
                  ${inputField("寮犲姏", "relationship-field", "tension", selectedRelationship.tension)}
                  ${inputField("鏉冨姏鍏崇郴", "relationship-field", "power_balance", selectedRelationship.power_balance)}
                  ${textareaField("鍏卞悓杩囧幓", "relationship-field", "shared_history", selectedRelationship.shared_history, { rows: 3 })}
                  ${textareaField("闅愭儏", "relationship-field", "hidden_information", selectedRelationship.hidden_information, { rows: 3 })}
                  ${selectField("鐘舵€?", "relationship-field", "status", selectedRelationship.status, Object.entries(relationshipStatusLabels))}
                </div>
              `
          }
        </div>
        <div class="summary-card summary-card--compact">
          <div class="list-card__head">
            <h3>鍏卞悓鐗靛姩鐨勫墽鎯呭崱</h3>
            <span class="chip chip--soft">${relatedCards.length} 寮?/span>
          </div>
          ${
            relatedCards.length === 0
              ? renderEmptyState("杩欑粍浜虹墿鏆傛椂杩樻病鏈夊叡鍚屽嚭鐜扮殑鍓ф儏鍗°€?")
              : `
                <div class="stack">
                  ${relatedCards
                    .map(
                      (card) => `
                        <button class="list-select" type="button" data-action="jump-to-plot-card" data-id="${escapeHtml(card.id)}">
                          <strong>${escapeHtml(card.title || "鏈懡鍚嶅墽鎯呭崱")}</strong>
                          <span>${escapeHtml(getActTitle(card.act_id))} 路 ${escapeHtml(getNode(card.node_id)?.title ?? "鏈寕鑺傜偣")}</span>
                        </button>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
      </div>
    </section>
  `;
}

renderRelationshipsPage = function renderRelationshipsPageLatest() {
  if (!dom.relationshipsContent) {
    return;
  }
  const selectedRelationship = getRelationship();
  const characters = list(appState.project.character_hub?.characters);
  const relationships = list(appState.project.character_hub?.relationship_map);
  const relatedCards = getRelationshipLinkedPlotCards(selectedRelationship);
  const relatedScenes = getRelationshipLinkedScenes(selectedRelationship);
  const relatedTimeline = getRelationshipLinkedTimelineEvents(selectedRelationship);
  dom.relationshipsContent.innerHTML = `
    <section class="relationship-workbench relationship-workbench--triple">
      <aside class="workbench-pane workbench-pane--rail">
        <div class="summary-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">关系导航</p>
              <h3>关系清单</h3>
            </div>
            <button class="button button--ghost button--tiny" type="button" data-action="add-relationship">新增关系</button>
          </div>
          <div class="stack workbench-scroll-list">
            ${relationships
              .map((relationship) => {
                const source = characters.find((item) => item.id === relationship.source_character_id)?.name ?? "未定";
                const target = characters.find((item) => item.id === relationship.target_character_id)?.name ?? "未定";
                return `
                  <button class="list-select ${relationship.id === appState.selection.relationshipId ? "is-active" : ""}" type="button" data-action="select-relationship" data-id="${escapeHtml(relationship.id)}">
                    <strong>${escapeHtml(source)} 路 ${escapeHtml(target)}</strong>
                    <span>${escapeHtml(relationship.relationship_type || "未命名关系")}</span>
                  </button>
                `;
              })
              .join("")}
          </div>
        </div>
        <div class="summary-card summary-card--compact">
          <div class="list-card__head">
            <h3>当前关系</h3>
            <span class="chip chip--soft">${relationships.length} 条</span>
          </div>
          ${
            !selectedRelationship
              ? renderEmptyState("先创建一条关系。")
              : `
                <div class="summary-strip">
                  <span class="chip chip--soft">${escapeHtml(relationshipStatusLabels[selectedRelationship.status] ?? selectedRelationship.status)}</span>
                  <span class="chip chip--soft">${relatedCards.length} 张剧情卡</span>
                  <span class="chip chip--soft">${relatedScenes.length} 个场景</span>
                </div>
                <div class="stack workbench-mini-stack">
                  <div class="list-select list-select--static">
                    <strong>双方</strong>
                    <span>${escapeHtml(getCharacterNameById(selectedRelationship.source_character_id))} 路 ${escapeHtml(getCharacterNameById(selectedRelationship.target_character_id))}</span>
                  </div>
                  <div class="inline-actions">
                    <button class="button button--ghost button--tiny" type="button" data-action="go-step" data-id="characters">回到角色台</button>
                  </div>
                </div>
              `
          }
        </div>
      </aside>
      <div class="workbench-pane workbench-pane--main">
        <div class="summary-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">主编辑区</p>
              <h3>${escapeHtml(selectedRelationship?.relationship_type || "未命名关系")}</h3>
            </div>
            ${
              selectedRelationship
                ? `<button class="button button--ghost button--tiny" type="button" data-action="delete-relationship" data-id="${escapeHtml(selectedRelationship.id)}">删除关系</button>`
                : ""
            }
          </div>
          ${
            !selectedRelationship
              ? renderEmptyState("先创建一条关系。")
              : `
                <div class="form-grid">
                  ${field(
                    "关系起点",
                    `<select data-action="relationship-field" data-field="source_character_id">${characters
                      .map((character) => `<option value="${escapeHtml(character.id)}" ${character.id === selectedRelationship.source_character_id ? "selected" : ""}>${escapeHtml(character.name || "未命名人物")}</option>`)
                      .join("")}</select>`
                  )}
                  ${field(
                    "关系终点",
                    `<select data-action="relationship-field" data-field="target_character_id">${characters
                      .map((character) => `<option value="${escapeHtml(character.id)}" ${character.id === selectedRelationship.target_character_id ? "selected" : ""}>${escapeHtml(character.name || "未命名人物")}</option>`)
                      .join("")}</select>`
                  )}
                  ${inputField("关系名称", "relationship-field", "relationship_type", selectedRelationship.relationship_type)}
                  ${selectField("状态", "relationship-field", "status", selectedRelationship.status, Object.entries(relationshipStatusLabels))}
                  ${inputField("张力", "relationship-field", "tension", selectedRelationship.tension)}
                  ${inputField("权力关系", "relationship-field", "power_balance", selectedRelationship.power_balance)}
                  ${textareaField("共同过去", "relationship-field", "shared_history", selectedRelationship.shared_history, { rows: 3 })}
                  ${textareaField("隐情", "relationship-field", "hidden_information", selectedRelationship.hidden_information, { rows: 3 })}
                </div>
              `
          }
        </div>
      </div>
      <aside class="workbench-pane workbench-pane--context">
        <div class="summary-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">速查区</p>
              <h3>共同剧情卡</h3>
            </div>
            <span class="chip chip--soft">${relatedCards.length} 张</span>
          </div>
          ${
            relatedCards.length === 0
              ? renderEmptyState("这组人物暂时还没有共同剧情卡。")
              : `
                <div class="stack workbench-scroll-list">
                  ${relatedCards
                    .map(
                      (card) => `
                        <button class="list-select" type="button" data-action="jump-to-plot-card" data-id="${escapeHtml(card.id)}">
                          <strong>${escapeHtml(card.title || "未命名剧情卡")}</strong>
                          <span>${escapeHtml(getActTitle(card.act_id))} 路 ${escapeHtml(getNode(card.node_id)?.title ?? "未挂节点")}</span>
                        </button>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>共现场景</h3>
            <span class="chip chip--soft">${relatedScenes.length} 个</span>
          </div>
          ${
            relatedScenes.length === 0
              ? renderEmptyState("这组人物还没有进入同一个场景。")
              : `
                <div class="stack workbench-scroll-list">
                  ${relatedScenes
                    .map(
                      (scene) => `
                        <button class="list-select" type="button" data-action="jump-to-scene" data-id="${escapeHtml(scene.id)}">
                          <strong>${escapeHtml(scene.order_index)} 路 ${escapeHtml(scene.title || "未命名场景")}</strong>
                          <span>${escapeHtml(scene.location || "未定地点")} 路 ${escapeHtml(scene.time_of_day || "未定时段")}</span>
                        </button>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>时间线线索</h3>
            <span class="chip chip--soft">${relatedTimeline.length} 条</span>
          </div>
          ${
            relatedTimeline.length === 0
              ? renderEmptyState("这组人物还没有可引用的共同事件。")
              : `
                <div class="stack workbench-scroll-list">
                  ${relatedTimeline
                    .map(
                      (event) => `
                        <div class="list-select list-select--static">
                          <strong>第 ${escapeHtml(event.story_day || "?")} 天 路 ${escapeHtml(event.summary || "未命名事件")}</strong>
                          <span>${escapeHtml(event.location || "未定地点")} 路 ${escapeHtml(event.trigger || "未定触发")}</span>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
      </aside>
    </section>
  `;
};

renderScenesPage = function renderScenesPageLatest() {
  if (!dom.scenesContent) {
    return;
  }
  const selectedScene = getScene();
  const scenes = list(appState.project.scene_workbench?.scenes)
    .slice()
    .sort((left, right) => (left.order_index ?? 0) - (right.order_index ?? 0));
  const linkedPlotCards = getSceneLinkedPlotCards(selectedScene);
  const linkedCharacters = getSceneLinkedCharacters(selectedScene);
  const linkedRelationships = getSceneLinkedRelationships(selectedScene);
  const linkedTimeline = getSceneLinkedTimelineEvents(selectedScene);
  dom.scenesContent.innerHTML = `
    <section class="scene-workbench scene-workbench--triple">
      <aside class="workbench-pane workbench-pane--rail">
        <div class="summary-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">场景导航</p>
              <h3>场景列表</h3>
            </div>
            <button class="button button--ghost button--tiny" type="button" data-action="add-scene">新增场景</button>
          </div>
          <div class="stack workbench-scroll-list">
            ${scenes
              .map(
                (scene) => `
                  <button class="list-select ${scene.id === appState.selection.sceneId ? "is-active" : ""}" type="button" data-action="select-scene" data-id="${escapeHtml(scene.id)}">
                    <strong>${escapeHtml(scene.order_index)} 路 ${escapeHtml(scene.title || "未命名场景")}</strong>
                    <span>${escapeHtml(getActTitle(scene.act_id))} 路 ${escapeHtml(sceneStatusLabels[scene.status] ?? scene.status)}</span>
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
        <div class="summary-card summary-card--compact">
          <div class="list-card__head">
            <h3>当前场景</h3>
            <span class="chip chip--soft">${scenes.length} 场</span>
          </div>
          ${
            !selectedScene
              ? renderEmptyState("先创建一个场景。")
              : `
                <div class="summary-strip">
                  <span class="chip chip--soft">${escapeHtml(getActTitle(selectedScene.act_id))}</span>
                  <span class="chip chip--soft">${linkedPlotCards.length} 张剧情卡</span>
                  <span class="chip chip--soft">${linkedCharacters.length} 位人物</span>
                </div>
                <div class="stack workbench-mini-stack">
                  <div class="list-select list-select--static">
                    <strong>地点</strong>
                    <span>${escapeHtml(selectedScene.location || "还没确定")}</span>
                  </div>
                  <div class="list-select list-select--static">
                    <strong>场景目的</strong>
                    <span>${escapeHtml(selectedScene.purpose || "还没确定")}</span>
                  </div>
                </div>
              `
          }
        </div>
      </aside>
      <div class="workbench-pane workbench-pane--main">
        <div class="summary-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">主编辑区</p>
              <h3>${escapeHtml(selectedScene?.title || "未命名场景")}</h3>
            </div>
            ${
              selectedScene
                ? `<button class="button button--ghost button--tiny" type="button" data-action="delete-scene" data-id="${escapeHtml(selectedScene.id)}">删除场景</button>`
                : ""
            }
          </div>
          ${
            !selectedScene
              ? renderEmptyState("先创建一个场景。")
              : `
                <div class="form-grid">
                  ${inputField("场名", "scene-field", "title", selectedScene.title)}
                  ${field("顺序", `<input type="number" data-action="scene-field" data-field="order_index" value="${escapeHtml(selectedScene.order_index)}" />`)}
                  ${field(
                    "所属幕",
                    `<select data-action="scene-field" data-field="act_id">${list(appState.project.structure_profile?.acts)
                      .map((act) => `<option value="${escapeHtml(act.id)}" ${act.id === selectedScene.act_id ? "selected" : ""}>${escapeHtml(act.title)}</option>`)
                      .join("")}</select>`
                  )}
                  ${field(
                    "视角人物",
                    `<select data-action="scene-field" data-field="pov_character_id">${[
                      `<option value="">未指定</option>`,
                      ...list(appState.project.character_hub?.characters).map((character) => `<option value="${escapeHtml(character.id)}" ${character.id === selectedScene.pov_character_id ? "selected" : ""}>${escapeHtml(character.name)}</option>`)
                    ].join("")}</select>`
                  )}
                  ${inputField("地点", "scene-field", "location", selectedScene.location)}
                  ${inputField("时段", "scene-field", "time_of_day", selectedScene.time_of_day)}
                  ${selectField("状态", "scene-field", "status", selectedScene.status, Object.entries(sceneStatusLabels))}
                  ${field("关联剧情卡", renderPlotChecklist(selectedScene.linked_plot_card_ids), true)}
                  ${textareaField("场景目的", "scene-field", "purpose", selectedScene.purpose, { rows: 3 })}
                  ${textareaField("阻力", "scene-field", "obstacle", selectedScene.obstacle, { rows: 3 })}
                  ${textareaField("转折 / 变化", "scene-field", "beat_summary", selectedScene.beat_summary, { rows: 3 })}
                  ${inputField("进入状态", "scene-field", "entry_state", selectedScene.entry_state)}
                  ${inputField("离开状态", "scene-field", "exit_state", selectedScene.exit_state)}
                  ${textareaField("台词或片段种子", "scene-field", "script_excerpt", selectedScene.script_excerpt, { rows: 4 })}
                  ${textareaField("备注", "scene-field", "notes", selectedScene.notes, { rows: 3 })}
                </div>
              `
          }
        </div>
      </div>
      <aside class="workbench-pane workbench-pane--context">
        <div class="summary-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">速查区</p>
              <h3>关联剧情卡</h3>
            </div>
            <span class="chip chip--soft">${linkedPlotCards.length} 张</span>
          </div>
          ${
            linkedPlotCards.length === 0
              ? renderEmptyState("当前场景还没挂到剧情卡。")
              : `
                <div class="stack workbench-scroll-list">
                  ${linkedPlotCards
                    .map(
                      (card) => `
                        <button class="list-select" type="button" data-action="jump-to-plot-card" data-id="${escapeHtml(card.id)}">
                          <strong>${escapeHtml(card.title || "未命名剧情卡")}</strong>
                          <span>${escapeHtml(getActTitle(card.act_id))} 路 ${escapeHtml(getNode(card.node_id)?.title ?? "未挂节点")}</span>
                        </button>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>出场人物</h3>
            <span class="chip chip--soft">${linkedCharacters.length} 位</span>
          </div>
          ${
            linkedCharacters.length === 0
              ? renderEmptyState("当前场景还没牵动人物。")
              : `
                <div class="stack workbench-scroll-list">
                  ${linkedCharacters
                    .map(
                      (character) => `
                        <button class="list-select" type="button" data-action="jump-to-character" data-id="${escapeHtml(character.id)}">
                          <strong>${escapeHtml(character.name || "未命名人物")}</strong>
                          <span>${escapeHtml(storyRoleLabels[character.story_role] ?? character.story_role)}</span>
                        </button>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>共现场关系</h3>
            <span class="chip chip--soft">${linkedRelationships.length} 条</span>
          </div>
          ${
            linkedRelationships.length === 0
              ? renderEmptyState("当前场景里还没有可用的关系。")
              : `
                <div class="stack workbench-scroll-list">
                  ${linkedRelationships
                    .map(
                      (relationship) => `
                        <button class="list-select" type="button" data-action="jump-to-relationship" data-id="${escapeHtml(relationship.id)}">
                          <strong>${escapeHtml(getCharacterNameById(relationship.source_character_id))} 路 ${escapeHtml(getCharacterNameById(relationship.target_character_id))}</strong>
                          <span>${escapeHtml(relationship.relationship_type || "未命名关系")}</span>
                        </button>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>时间线线索</h3>
            <span class="chip chip--soft">${linkedTimeline.length} 条</span>
          </div>
          ${
            linkedTimeline.length === 0
              ? renderEmptyState("当前场景还没有可引用的时间线。")
              : `
                <div class="stack workbench-scroll-list">
                  ${linkedTimeline
                    .map(
                      (event) => `
                        <div class="list-select list-select--static">
                          <strong>第 ${escapeHtml(event.story_day || "?")} 天 路 ${escapeHtml(event.summary || "未命名事件")}</strong>
                          <span>${escapeHtml(event.location || "未定地点")} 路 ${escapeHtml(event.trigger || "未定触发")}</span>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
      </aside>
    </section>
  `;
};

function renderGenreItems(items = [], actionPrefix = "convention", emptyMessage = "还没有内容。") {
  if (items.length === 0) {
    return renderEmptyState(emptyMessage);
  }
  return `
    <div class="stack">
      ${items
        .map(
          (item) => `
            <article class="list-select list-select--static">
              <strong>${escapeHtml(item.name || "未命名条目")}</strong>
              <span>${escapeHtml(item.status || item.description || "")}</span>
              <div class="form-grid form-grid--compact">
                ${inputField("名称", `${actionPrefix}-field`, "name", item.name)}
                ${
                  actionPrefix === "convention"
                    ? selectField("状态", `${actionPrefix}-field`, "status", item.status, [
                        ["required", "必备"],
                        ["optional", "可选"]
                      ])
                    : ""
                }
                ${textareaField("说明", `${actionPrefix}-field`, "description", item.description, { rows: 3 })}
              </div>
              <div class="inline-actions">
                <button class="button button--ghost button--tiny" type="button" data-action="delete-${escapeHtml(actionPrefix)}" data-id="${escapeHtml(item.id)}">删除</button>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderGenresPage() {
  const profile = appState.project.genre_profile;
  dom.genresContent.innerHTML = `
    <section class="genre-workbench">
      <div class="summary-card">
        <p class="section-label">类型定位</p>
        <div class="form-grid">
          ${inputField("主类型", "genre-field", "primary_genre", profile.primary_genre)}
          ${inputField("副类型", "genre-field", "secondary_genres_text", list(profile.secondary_genres).join("、"))}
          ${textareaField("观众承诺", "genre-field", "audience_promise", profile.audience_promise, { rows: 3 })}
          ${inputField("气质词", "genre-field", "tone_words_text", list(profile.tone_words).join("、"), { full: true })}
        </div>
      </div>
      <div class="genre-workbench__grid">
        <div class="summary-card">
          <div class="list-card__head">
            <h3>类型常规</h3>
            <button class="button button--ghost button--tiny" type="button" data-action="add-convention">新增常规</button>
          </div>
          ${renderGenreItems(list(profile.conventions), "convention", "先写下这一类作品必须兑现的期待。")}
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>类型禁区</h3>
            <button class="button button--ghost button--tiny" type="button" data-action="add-taboo">新增禁区</button>
          </div>
          ${renderGenreItems(list(profile.taboos), "taboo", "先写下不该踩的类型雷区。")}
        </div>
      </div>
    </section>
  `;
}

function renderLocksPage() {
  const lockedCards = list(appState.project.plot_board?.cards).filter((card) => card.status === "locked");
  const timeline = list(appState.project.lock_layer?.projections?.timeline_events);
  const rules = list(appState.project.lock_layer?.projections?.world_rules);
  const setups = list(appState.project.lock_layer?.projections?.setup_payoffs);
  dom.locksContent.innerHTML = `
    <section class="lock-workbench">
      <div class="bible-overview-grid">
        <article class="metric-card"><span class="metric-card__label">已锁定剧情</span><strong class="metric-card__value">${lockedCards.length}</strong></article>
        <article class="metric-card"><span class="metric-card__label">时间节点</span><strong class="metric-card__value">${timeline.length}</strong></article>
        <article class="metric-card"><span class="metric-card__label">世界规则</span><strong class="metric-card__value">${rules.length}</strong></article>
        <article class="metric-card"><span class="metric-card__label">伏笔</span><strong class="metric-card__value">${setups.length}</strong></article>
      </div>
      <div class="lock-workbench__lead summary-card">
        <p class="section-label">已锁定剧情卡</p>
        <div class="tag-row">
          ${lockedCards.length === 0 ? `<span class="tag">还没有锁定剧情卡</span>` : lockedCards.map((card) => `<span class="tag">${escapeHtml(card.title)}</span>`).join("")}
        </div>
      </div>
      <div class="lock-workbench__grid">
        <div class="summary-card">
          <div class="list-card__head">
            <h3>时间线</h3>
            <button class="button button--ghost button--tiny" type="button" data-action="add-timeline">新增节点</button>
          </div>
          <div class="stack">
            ${timeline
              .map(
                (item) => `
                  <button class="list-select ${item.id === appState.selection.timelineId ? "is-active" : ""}" type="button" data-action="select-timeline" data-id="${escapeHtml(item.id)}">
                    <strong>第 ${escapeHtml(item.story_day)} 天 · ${escapeHtml(item.summary || "未命名节点")}</strong>
                    <span>${escapeHtml(item.location || "未定地点")}</span>
                  </button>
                `
              )
              .join("")}
          </div>
          ${
            getTimelineEvent()
              ? `
                <div class="form-grid form-grid--compact">
                  ${field("故事日", `<input type="number" data-action="timeline-field" data-field="story_day" value="${escapeHtml(getTimelineEvent().story_day)}" />`)}
                  ${inputField("事件摘要", "timeline-field", "summary", getTimelineEvent().summary, { full: true })}
                  ${inputField("地点", "timeline-field", "location", getTimelineEvent().location)}
                  ${inputField("触发", "timeline-field", "trigger", getTimelineEvent().trigger)}
                  ${textareaField("结果", "timeline-field", "consequence", getTimelineEvent().consequence, { rows: 3 })}
                </div>
              `
              : ""
          }
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>世界规则</h3>
            <button class="button button--ghost button--tiny" type="button" data-action="add-world-rule">新增规则</button>
          </div>
          <div class="stack">
            ${rules
              .map(
                (item) => `
                  <button class="list-select ${item.id === appState.selection.worldRuleId ? "is-active" : ""}" type="button" data-action="select-world-rule" data-id="${escapeHtml(item.id)}">
                    <strong>${escapeHtml(item.rule_statement || "未命名规则")}</strong>
                    <span>${escapeHtml(item.scope || "未定范围")}</span>
                  </button>
                `
              )
              .join("")}
          </div>
          ${
            getWorldRule()
              ? `
                <div class="form-grid form-grid--compact">
                  ${textareaField("规则本体", "world-rule-field", "rule_statement", getWorldRule().rule_statement, { rows: 3 })}
                  ${inputField("作用范围", "world-rule-field", "scope", getWorldRule().scope)}
                  ${selectField("强度", "world-rule-field", "rule_level", getWorldRule().rule_level, [["hard", "硬规则"], ["soft", "软规则"]])}
                  ${textareaField("例外", "world-rule-field", "exceptions_text", list(getWorldRule().exceptions).join("、"), { rows: 2 })}
                </div>
              `
              : ""
          }
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>伏笔追踪</h3>
            <button class="button button--ghost button--tiny" type="button" data-action="add-setup">新增伏笔</button>
          </div>
          <div class="stack">
            ${setups
              .map(
                (item) => `
                  <button class="list-select ${item.id === appState.selection.setupId ? "is-active" : ""}" type="button" data-action="select-setup" data-id="${escapeHtml(item.id)}">
                    <strong>${escapeHtml(item.setup_summary || "未命名伏笔")}</strong>
                    <span>${escapeHtml(setupStatusLabels[item.status] ?? item.status)}</span>
                  </button>
                `
              )
              .join("")}
          </div>
          ${
            getSetup()
              ? `
                <div class="form-grid form-grid--compact">
                  ${textareaField("埋设内容", "setup-field", "setup_summary", getSetup().setup_summary, { rows: 3 })}
                  ${inputField("预期回收窗口", "setup-field", "expected_payoff_window", getSetup().expected_payoff_window)}
                  ${selectField("状态", "setup-field", "status", getSetup().status, Object.entries(setupStatusLabels))}
                  ${textareaField("回收说明", "setup-field", "payoff_summary", getSetup().payoff_summary, { rows: 3 })}
                </div>
              `
              : ""
          }
        </div>
      </div>
    </section>
  `;
}

function renderPageVisibility() {
  dom.pageProjectButton.classList.toggle("is-active", appState.currentPage === "project");
  dom.pageWorkflowButton.classList.toggle("is-active", appState.currentPage === "workflow");
  dom.pagePanels.forEach((panel) => {
    panel.hidden = panel.dataset.page !== appState.currentPage;
  });
  dom.wizardShell.hidden = true;
  dom.stepPanels.forEach((panel) => {
    panel.hidden = appState.currentPage !== "workflow" || panel.dataset.stepGroup !== appState.currentStepId;
  });
  dom.projectCreateDialog.hidden = !appState.createDialogOpen;
  dom.settingsDialog.hidden = !appState.settingsDialogOpen;
}

function render() {
  normalizeProject();
  renderHero();
  renderRuntimeStatus();
  renderProjectList();
  renderProjectCreateForm();
  renderAiSettingsDialog();
  renderWorkflowShell();
  renderStructurePage();
  renderPlotsPage();
  renderCharactersPage();
  renderRelationshipsPage();
  renderGenresPage();
  renderLocksPage();
  renderScenesPage();
  renderPageVisibility();
  schedulePlotInspectorLeadSync();
}

appState.plotBoardView = appState.plotBoardView || "structure";
appState.activeScenarioGroupId = appState.activeScenarioGroupId || null;

const PLOT_BOARD_LANE_PRESETS = [
  {
    id: "lane_main",
    title: "正式主线",
    kind: "canonical_mainline",
    sort_order: 10,
    color_slot: "main",
    is_canonical: true,
    scenario_group_id: null,
    notes: ""
  },
  {
    id: "lane_subplot",
    title: "支线",
    kind: "subplot",
    sort_order: 20,
    color_slot: "subplot",
    is_canonical: true,
    scenario_group_id: null,
    notes: ""
  },
  {
    id: "lane_undefined",
    title: "未定义",
    kind: "undefined",
    sort_order: 90,
    color_slot: "undefined",
    is_canonical: false,
    scenario_group_id: null,
    notes: ""
  },
  {
    id: "lane_scenario_a",
    title: "方案轨 A",
    kind: "scenario",
    sort_order: 110,
    color_slot: "scenario-a",
    is_canonical: false,
    scenario_group_id: "scenario_core",
    notes: ""
  },
  {
    id: "lane_scenario_b",
    title: "方案轨 B",
    kind: "scenario",
    sort_order: 120,
    color_slot: "scenario-b",
    is_canonical: false,
    scenario_group_id: "scenario_core",
    notes: ""
  }
];

const PLOT_SCENARIO_GROUP_PRESETS = [
  {
    id: "scenario_core",
    title: "方案对照",
    question: "当前主问题有哪些不同解法",
    status: "exploring",
    promoted_lane_id: null,
    notes: ""
  }
];

function createPlotBoardLanes() {
  return PLOT_BOARD_LANE_PRESETS.map((lane) => ({ ...lane }));
}

function createPlotScenarioGroups() {
  return PLOT_SCENARIO_GROUP_PRESETS.map((group) => ({ ...group }));
}

function getDefaultLaneIdForType(type = "") {
  if (type === "mainline") return "lane_main";
  if (type === "enhancement") return "lane_subplot";
  return "lane_undefined";
}

function getDefaultLaneKindForType(type = "") {
  if (type === "mainline") return "canonical_mainline";
  if (type === "enhancement") return "subplot";
  return "undefined";
}

function getPlotLanes() {
  return list(appState.project.plot_board?.lanes).sort((left, right) => (left.sort_order ?? 999) - (right.sort_order ?? 999));
}

function getScenarioGroups() {
  return list(appState.project.plot_board?.scenario_groups);
}

function getPlotLane(laneId = "") {
  return getPlotLanes().find((lane) => lane.id === laneId) ?? null;
}

function getActiveScenarioGroup() {
  const groups = getScenarioGroups();
  if (groups.length === 0) {
    return null;
  }
  return groups.find((group) => group.id === appState.activeScenarioGroupId) ?? groups[0];
}

function getVisibleLanes() {
  const activeScenarioGroupId = getActiveScenarioGroup()?.id ?? null;
  return getPlotLanes().filter((lane) => lane.kind !== "scenario" || !activeScenarioGroupId || lane.scenario_group_id === activeScenarioGroupId);
}

function getLaneChoices() {
  return getPlotLanes().map((lane) => [lane.id, lane.title]);
}

function getScenarioGroupChoices() {
  return getScenarioGroups().map((group) => [group.id, group.title]);
}

function getDefaultNodeForAct(actId = "", preferredNodeId = "") {
  const nodes = list(appState.project.structure_profile?.nodes);
  const preferred = nodes.find((node) => node.id === preferredNodeId && node.act_id === actId);
  if (preferred) {
    return preferred;
  }
  return nodes.find((node) => node.act_id === actId) ?? nodes[0] ?? null;
}

function getCardsInLaneAct(laneId = "", actId = "") {
  return list(appState.project.plot_board?.cards)
    .filter((card) => card.lane_id === laneId && card.act_id === actId)
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

function nextLaneActOrder(laneId = "", actId = "") {
  const cards = getCardsInLaneAct(laneId, actId);
  return (cards[cards.length - 1]?.order_index ?? 0) + 10;
}

function ensurePlotBoardModel(project) {
  if (!project.plot_board) {
    project.plot_board = { cards: [] };
  }
  if (!Array.isArray(project.plot_board.lanes) || project.plot_board.lanes.length === 0) {
    project.plot_board.lanes = createPlotBoardLanes();
  }
  if (!Array.isArray(project.plot_board.scenario_groups) || project.plot_board.scenario_groups.length === 0) {
    project.plot_board.scenario_groups = createPlotScenarioGroups();
  }
  project.plot_board.view_mode = project.plot_board.view_mode === "rehearsal" ? "rehearsal" : "structure";

  const lanesById = new Map(list(project.plot_board.lanes).map((lane) => [lane.id, lane]));
  const counters = new Map();
  project.plot_board.cards = list(project.plot_board.cards).map((card) => {
    const laneId = lanesById.has(card.lane_id) ? card.lane_id : getDefaultLaneIdForType(card.type);
    const lane = lanesById.get(laneId);
    const key = `${laneId}:${card.act_id || ""}`;
    const nextOrder = (counters.get(key) ?? 0) + 10;
    const order = Number(card.order_index) || nextOrder;
    counters.set(key, Math.max(nextOrder, order));
    return {
      ...card,
      lane_id: laneId,
      lane_kind: lane?.kind ?? getDefaultLaneKindForType(card.type),
      order_index: order,
      scenario_group_id:
        lane?.kind === "scenario" ? card.scenario_group_id || lane.scenario_group_id || project.plot_board.scenario_groups[0]?.id || null : null,
      is_canonical:
        card.is_canonical != null ? card.is_canonical : lane?.kind === "canonical_mainline" || lane?.kind === "subplot"
    };
  });

  appState.plotBoardView = project.plot_board.view_mode;
  const groups = list(project.plot_board.scenario_groups);
  const activeScenarioGroup = groups.find((group) => group.id === appState.activeScenarioGroupId);
  if (!activeScenarioGroup) {
    appState.activeScenarioGroupId = groups[0]?.id ?? null;
  }
  return project;
}

function updatePlotCardLane(card, laneId) {
  const lane = getPlotLane(laneId);
  if (!card || !lane) {
    return;
  }
  card.lane_id = lane.id;
  card.lane_kind = lane.kind;
  card.is_canonical = lane.kind === "canonical_mainline" || lane.kind === "subplot";
  card.scenario_group_id = lane.kind === "scenario" ? lane.scenario_group_id || appState.activeScenarioGroupId || getScenarioGroups()[0]?.id || null : null;
}

function getAutoPlotStatusForPlacement(card) {
  if (!card) {
    return "draft";
  }
  if (card.lane_kind === "undefined") {
    return "draft";
  }
  if (card.lane_kind === "scenario") {
    return "exploring";
  }
  return "review";
}

function applyPlotCardPlacement(card, options = {}) {
  if (!card) {
    return;
  }
  appState.selection.plotCardId = card.id;
  const laneId = options.laneId || card.lane_id;
  const actId = options.actId || card.act_id;
  updatePlotCardLane(card, laneId);
  const targetNode = getDefaultNodeForAct(actId, options.nodeId || card.node_id);
  card.act_id = actId;
  card.node_id = targetNode?.id ?? card.node_id;
  card.order_index = options.keepOrder ? card.order_index : nextLaneActOrder(card.lane_id, card.act_id);
  card.status = getAutoPlotStatusForPlacement(card);
}

function movePlotCardToLaneAct(cardId, laneId, actId, nodeId = "") {
  const card = getPlotCard(cardId);
  if (!card) {
    return;
  }
  applyPlotCardPlacement(card, { laneId, actId, nodeId });
  normalizeProject();
  markDirty();
  render();
}

function shiftPlotCardWithinLane(cardId, direction) {
  const card = getPlotCard(cardId);
  if (!card || !direction) {
    return;
  }
  const peers = getCardsInLaneAct(card.lane_id, card.act_id);
  const index = peers.findIndex((item) => item.id === card.id);
  if (index < 0) {
    return;
  }
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= peers.length) {
    return;
  }
  const other = peers[targetIndex];
  const currentOrder = card.order_index ?? 0;
  card.order_index = other.order_index ?? currentOrder;
  other.order_index = currentOrder;
  markDirty();
  render();
}

function setPlotBoardView(mode = "structure") {
  appState.plotBoardView = mode === "rehearsal" ? "rehearsal" : "structure";
  appState.project.plot_board.view_mode = appState.plotBoardView;
  render();
}

function setPlotContextVisible(visible = true) {
  appState.plotContextVisible = Boolean(visible);
  render();
}

const dragAutoScrollState = {
  rafId: 0,
  deltaX: 0,
  deltaY: 0
};

const plotInspectorFollowState = {
  rafId: 0
};

function getRehearsalBoardElement() {
  return document.querySelector("#plots-content .plot-rehearsal-board");
}

function getPlotInspectorPaneElement() {
  return document.querySelector("#plots-content .workbench-pane--context");
}

function getPlotInspectorLeadElement() {
  return document.querySelector("#plots-content .plot-inspector__lead");
}

function getSelectedPlotBoardCardElement() {
  return Array.from(document.querySelectorAll("#plots-content .plot-board-panel [data-action='select-plot-card'][data-id]")).find(
    (element) => element.dataset.id === appState.selection.plotCardId
  ) ?? null;
}

function syncPlotInspectorLeadPosition() {
  const lead = getPlotInspectorLeadElement();
  const pane = getPlotInspectorPaneElement();
  if (!lead || !pane) {
    return;
  }

  lead.style.removeProperty("--plot-inspector-offset");

  if (appState.currentPage !== "workflow" || appState.currentStepId !== "plots" || !appState.plotContextVisible) {
    return;
  }

  const card = getSelectedPlotBoardCardElement();
  if (!card) {
    return;
  }

  const paneRect = pane.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const rawOffset = cardRect.top - paneRect.top - 6;
  const maxOffset = Math.max(0, Math.min(260, pane.clientHeight - lead.offsetHeight - 24));
  const offset = Math.max(0, Math.min(rawOffset, maxOffset));
  lead.style.setProperty("--plot-inspector-offset", `${Math.round(offset)}px`);
}

function schedulePlotInspectorLeadSync() {
  if (plotInspectorFollowState.rafId) {
    return;
  }
  plotInspectorFollowState.rafId = requestAnimationFrame(() => {
    plotInspectorFollowState.rafId = 0;
    syncPlotInspectorLeadPosition();
  });
}

function stopDragAutoScroll() {
  if (dragAutoScrollState.rafId) {
    cancelAnimationFrame(dragAutoScrollState.rafId);
    dragAutoScrollState.rafId = 0;
  }
  dragAutoScrollState.deltaX = 0;
  dragAutoScrollState.deltaY = 0;
}

function runDragAutoScroll() {
  if (!appState.draggedPlotCardId) {
    stopDragAutoScroll();
    return;
  }
  const pageScroller = document.scrollingElement || document.documentElement;
  if (dragAutoScrollState.deltaY) {
    pageScroller.scrollBy(0, dragAutoScrollState.deltaY);
  }
  const rehearsalBoard = getRehearsalBoardElement();
  if (rehearsalBoard && dragAutoScrollState.deltaX) {
    rehearsalBoard.scrollLeft += dragAutoScrollState.deltaX;
  }
  if (!dragAutoScrollState.deltaX && !dragAutoScrollState.deltaY) {
    dragAutoScrollState.rafId = 0;
    return;
  }
  dragAutoScrollState.rafId = requestAnimationFrame(runDragAutoScroll);
}

function updateDragAutoScroll(clientX = 0, clientY = 0) {
  const viewportMarginY = 120;
  const viewportMarginX = 120;
  let deltaY = 0;
  let deltaX = 0;

  if (clientY < viewportMarginY) {
    deltaY = -Math.max(10, Math.round((viewportMarginY - clientY) / 4));
  } else if (window.innerHeight - clientY < viewportMarginY) {
    deltaY = Math.max(10, Math.round((viewportMarginY - (window.innerHeight - clientY)) / 4));
  }

  const rehearsalBoard = getRehearsalBoardElement();
  if (rehearsalBoard && appState.plotBoardView === "rehearsal") {
    const rect = rehearsalBoard.getBoundingClientRect();
    const insideHorizontalBand = clientY >= rect.top && clientY <= rect.bottom;
    if (insideHorizontalBand && clientX >= rect.left && clientX <= rect.right) {
      if (clientX - rect.left < viewportMarginX) {
        deltaX = -Math.max(10, Math.round((viewportMarginX - (clientX - rect.left)) / 4));
      } else if (rect.right - clientX < viewportMarginX) {
        deltaX = Math.max(10, Math.round((viewportMarginX - (rect.right - clientX)) / 4));
      }
    }
  }

  dragAutoScrollState.deltaX = deltaX;
  dragAutoScrollState.deltaY = deltaY;

  if ((deltaX || deltaY) && !dragAutoScrollState.rafId) {
    dragAutoScrollState.rafId = requestAnimationFrame(runDragAutoScroll);
    return;
  }

  if (!deltaX && !deltaY) {
    stopDragAutoScroll();
  }
}

function renderPlotCardChip(card, options = {}) {
  const lane = getPlotLane(card.lane_id);
  const showAct = options.showAct ?? false;
  const showNode = options.showNode ?? false;
  return `
    <button
      class="plot-note plot-note--v2 ${card.id === appState.selection.plotCardId ? "is-active" : ""}"
      type="button"
      draggable="true"
      data-action="select-plot-card"
      data-id="${escapeHtml(card.id)}"
      data-drag-plot-id="${escapeHtml(card.id)}"
    >
      <div class="plot-note__head">
        <span class="plot-lane-tag plot-lane-tag--${escapeHtml(lane?.color_slot ?? "main")}">${escapeHtml(lane?.title ?? "轨道")}</span>
        <span class="plot-note__type">${escapeHtml(plotTypeLabels[card.type] ?? card.type)}</span>
      </div>
      <strong>${escapeHtml(card.title || "未命名剧情卡")}</strong>
      <div class="plot-note__meta-group">
        <span class="plot-note__meta">
          ${showAct ? escapeHtml(getActTitle(card.act_id)) : ""}
          ${showAct && showNode ? " 路 " : ""}
          ${showNode ? escapeHtml(getNode(card.node_id)?.title || "未挂节点") : ""}
        </span>
        <span class="plot-note__status">${escapeHtml(plotStatusLabels[card.status] ?? card.status)}</span>
      </div>
    </button>
  `;
}

function renderStructureViewBoard(cards, lanes) {
  const acts = getOrderedActs();
  return `
    <section class="plot-structure-board">
      ${acts
        .map((act) => {
          const actNodes = getOrderedNodes(act.id);
          return `
            <article class="plot-act-column">
              <div class="plot-act-column__head">
                <div>
                  <h3>${escapeHtml(act.title)}</h3>
                  <p>${escapeHtml(act.purpose)}</p>
                </div>
                <span class="chip chip--soft">${escapeHtml(act.range_label)}</span>
              </div>
              <div class="plot-node-stack">
                ${actNodes
                  .map((node, nodeIndex) => `
                    <section class="plot-node-block">
                      <div class="plot-node-block__head">
                        <div>
                          <h4>${nodeIndex + 1}. ${escapeHtml(node.title)}</h4>
                          <p>${node.required ? "必要节点" : "可选节点"}</p>
                        </div>
                        <button class="button button--ghost button--tiny" type="button" data-action="add-plot-card" data-node-id="${escapeHtml(node.id)}">新增卡片</button>
                      </div>
                      <div class="plot-node-lanes">
                        ${lanes
                          .map((lane) => {
                            const laneCards = cards
                              .filter((card) => card.node_id === node.id && card.lane_id === lane.id)
                              .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
                            return `
                              <div class="plot-lane-strip plot-lane-strip--${escapeHtml(lane.color_slot)}" data-plot-dropzone="node" data-node-id="${escapeHtml(node.id)}" data-act-id="${escapeHtml(act.id)}" data-lane-id="${escapeHtml(lane.id)}">
                                <div class="plot-lane-strip__label">
                                  <span class="plot-lane-dot plot-lane-dot--${escapeHtml(lane.color_slot)}"></span>
                                  <span>${escapeHtml(lane.title)}</span>
                                </div>
                                <div class="plot-lane-strip__cards">
                                  ${laneCards.length === 0 ? `<div class="plot-drop-hint">拖到这里</div>` : laneCards.map((card) => renderPlotCardChip(card, { showAct: false, showNode: false })).join("")}
                                </div>
                              </div>
                            `;
                          })
                          .join("")}
                      </div>
                    </section>
                  `)
                  .join("")}
              </div>
            </article>
          `;
        })
        .join("")}
    </section>
  `;
}

function renderRehearsalViewBoard(cards, lanes) {
  const acts = getOrderedActs();
  return `
    <section class="plot-rehearsal-board">
      <div class="plot-rehearsal-head">
        <div class="plot-rehearsal-head__corner">轨道</div>
        <div class="plot-rehearsal-head__acts">
          ${acts.map((act) => `<div class="plot-act-chip">${escapeHtml(act.title)}</div>`).join("")}
        </div>
      </div>
      <div class="plot-track-list">
        ${lanes
          .map((lane) => `
            <section class="plot-track plot-track--${escapeHtml(lane.color_slot)}">
              <div class="plot-track__label">
                <div>
                  <h3>${escapeHtml(lane.title)}</h3>
                  <p>${lane.kind === "scenario" ? "方案比较轨" : lane.kind === "undefined" ? "临时归档区" : "正式叙事轨"}</p>
                </div>
              </div>
              <div class="plot-track__acts">
                ${acts
                  .map((act) => {
                    const laneCards = cards
                      .filter((card) => card.lane_id === lane.id && card.act_id === act.id)
                      .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
                    return `
                      <div class="plot-track__cell" data-plot-dropzone="lane" data-lane-id="${escapeHtml(lane.id)}" data-act-id="${escapeHtml(act.id)}">
                        ${laneCards.length === 0 ? `<div class="plot-drop-hint">拖到这里</div>` : laneCards.map((card) => renderPlotCardChip(card, { showAct: false, showNode: true })).join("")}
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            </section>
          `)
          .join("")}
      </div>
    </section>
  `;
}

function renderScenarioGroupToolbar(groups) {
  if (groups.length <= 1) {
    return "";
  }
  return `
    <div class="plot-toolbar__row plot-toolbar__row--scenario">
      <span class="section-label">方案分组</span>
      <div class="choice-chip-row">
        ${groups
          .map(
            (group) => `
              <button
                class="choice-chip ${group.id === appState.activeScenarioGroupId ? "is-active" : ""}"
                type="button"
                data-action="set-scenario-group"
                data-id="${escapeHtml(group.id)}"
              >
                ${escapeHtml(group.title)}
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

renderPlotsPage = function renderPlotsPageLatest() {
  if (!dom.plotsContent) {
    return;
  }
  const selectedCard = getPlotCard();
  const isRehearsalView = appState.plotBoardView === "rehearsal";
  const contextVisible = !isRehearsalView || appState.plotContextVisible;
  const allCards = list(appState.project.plot_board?.cards);
  const cards = allCards;
  const lanes = getVisibleLanes();
  const scenarioGroups = getScenarioGroups();
  const activeScenarioGroup = getActiveScenarioGroup();
  const relatedCharacters = selectedCard
    ? list(appState.project.character_hub?.characters).filter((character) => list(selectedCard.character_ids).includes(character.id))
    : [];
  const relatedRelationships = getPlotLinkedRelationships(selectedCard);
  const relatedScenes = getPlotLinkedScenes(selectedCard);
  const relatedTimeline = getPlotLinkedTimelineEvents(selectedCard);
  const orderedActs = getOrderedActs();
  const actOrder = new Map(orderedActs.map((act, index) => [act.id, act.order_index ?? index + 1]));
  const cardsForRail = cards
    .filter((card) => appState.plotFilter === "all" || card.lane_kind === appState.plotFilter)
    .slice()
    .sort((left, right) => {
      const leftAct = actOrder.get(left.act_id) ?? 9999;
      const rightAct = actOrder.get(right.act_id) ?? 9999;
      if (leftAct !== rightAct) return leftAct - rightAct;
      return (left.order_index ?? 9999) - (right.order_index ?? 9999);
    });
  const libraryTitle =
    appState.plotFilter === "canonical_mainline"
      ? "主线卡"
      : appState.plotFilter === "subplot"
        ? "支线卡"
        : appState.plotFilter === "scenario"
          ? "方案卡"
          : appState.plotFilter === "undefined"
            ? "未定义卡"
            : "全部剧情卡";
  const editorDrawer = !selectedCard
    ? ""
    : `
      <div class="plot-editor-drawer ${appState.plotEditorOpen ? "is-open" : ""}" ${appState.plotEditorOpen ? "" : "hidden"}>
        <button class="plot-editor-drawer__scrim" type="button" data-action="close-plot-editor" aria-label="关闭剧情卡编辑"></button>
        <section class="plot-editor-drawer__panel">
          <div class="list-card__head">
            <div>
              <p class="section-label">完整编辑</p>
              <h3>${escapeHtml(selectedCard.title || "未命名剧情卡")}</h3>
            </div>
            <button class="button button--ghost button--tiny" type="button" data-action="close-plot-editor">收起</button>
          </div>
          <div class="plot-editor-drawer__body">
            <div class="summary-strip">
              <span class="chip chip--soft">${escapeHtml(getPlotLane(selectedCard.lane_id)?.title ?? "未归类")}</span>
              <span class="chip chip--soft">${escapeHtml(getActTitle(selectedCard.act_id))}</span>
              <span class="chip chip--soft">${escapeHtml(getNode(selectedCard.node_id)?.title ?? "未挂节点")}</span>
              <span class="chip chip--soft">${escapeHtml(plotStatusLabels[selectedCard.status] ?? selectedCard.status)}</span>
            </div>
            ${
              selectedCard.lane_kind === "scenario" && activeScenarioGroup
                ? `<div class="issue__hint">当前方案组：${escapeHtml(activeScenarioGroup.title)}</div>`
                : ""
            }
            <div class="inline-actions">
              <button class="button button--ghost button--tiny" type="button" data-action="move-plot-card-position" data-id="${escapeHtml(selectedCard.id)}" data-direction="-1">前移</button>
              <button class="button button--ghost button--tiny" type="button" data-action="move-plot-card-position" data-id="${escapeHtml(selectedCard.id)}" data-direction="1">后移</button>
              <button class="button button--ghost button--tiny" type="button" data-action="toggle-plot-lock" data-id="${escapeHtml(selectedCard.id)}">${selectedCard.status === "locked" ? "解除锁定" : "锁定这张卡"}</button>
              <button class="button button--ghost button--tiny" type="button" data-action="scene-from-plot" data-id="${escapeHtml(selectedCard.id)}">生成一场</button>
              <button class="button button--ghost button--tiny" type="button" data-action="delete-plot-card" data-id="${escapeHtml(selectedCard.id)}">删除</button>
            </div>
            <div class="form-grid">
              ${inputField("标题", "plot-field", "title", selectedCard.title)}
              ${field(
                "所在轨道",
                `<select data-action="plot-lane-field" data-field="lane_id">${getLaneChoices()
                  .map(([laneId, laneLabel]) => `<option value="${escapeHtml(laneId)}" ${laneId === selectedCard.lane_id ? "selected" : ""}>${escapeHtml(laneLabel)}</option>`)
                  .join("")}</select>`
              )}
              ${field(
                "所在幕",
                `<select data-action="plot-position-field" data-field="act_id">${orderedActs
                  .map((act) => `<option value="${escapeHtml(act.id)}" ${act.id === selectedCard.act_id ? "selected" : ""}>${escapeHtml(act.title)}</option>`)
                  .join("")}</select>`
              )}
              ${selectField("叙事层级", "plot-field", "type", selectedCard.type, Object.entries(plotTypeLabels))}
              ${selectField("当前状态", "plot-field", "status", selectedCard.status, Object.entries(plotStatusLabels))}
              ${
                selectedCard.lane_kind === "scenario"
                  ? field(
                      "方案组",
                      `<select data-action="plot-scenario-field" data-field="scenario_group_id">${getScenarioGroupChoices()
                        .map(([groupId, groupLabel]) => `<option value="${escapeHtml(groupId)}" ${groupId === selectedCard.scenario_group_id ? "selected" : ""}>${escapeHtml(groupLabel)}</option>`)
                        .join("")}</select>`
                    )
                  : ""
              }
              ${textareaField("这张卡讲什么", "plot-field", "summary", selectedCard.summary, { rows: 4 })}
              ${textareaField("戏剧问题", "plot-field", "dramatic_question", selectedCard.dramatic_question, { rows: 3 })}
              ${textareaField("核心冲突", "plot-field", "conflict", selectedCard.conflict, { rows: 3 })}
              ${textareaField("发生了什么变化", "plot-field", "change", selectedCard.change, { rows: 3 })}
              ${textareaField("备注", "plot-field", "notes", selectedCard.notes, { rows: 3 })}
              ${field("影响角色", renderCharacterChecklist(selectedCard.character_ids), true)}
            </div>
          </div>
        </section>
      </div>
    `;
  dom.plotsContent.innerHTML = `
    <section class="plot-workbench plot-workbench--triple plot-workbench--studio ${contextVisible ? "" : "plot-workbench--context-hidden"}">
      <aside class="workbench-pane workbench-pane--rail workbench-pane--rail-nav">
        <div class="summary-card plot-nav-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">剧情导航</p>
              <h3>卡池分类</h3>
            </div>
            <button class="button button--ghost button--tiny" type="button" data-action="add-plot-card">新增剧情卡</button>
          </div>
          <div class="plot-nav-list">
            ${[
              ["all", "全部剧情卡", allCards.length],
              ["canonical_mainline", "主线卡", allCards.filter((card) => card.lane_kind === "canonical_mainline").length],
              ["subplot", "支线卡", allCards.filter((card) => card.lane_kind === "subplot").length],
              ["scenario", "方案卡", allCards.filter((card) => card.lane_kind === "scenario").length],
              ["undefined", "未定义卡", allCards.filter((card) => card.lane_kind === "undefined").length]
            ]
              .map((type) => {
                const value = type[0];
                const label = type[1];
                const count = type[2];
                return `
                  <button
                    class="choice-chip choice-chip--nav ${appState.plotFilter === value ? "is-active" : ""}"
                    type="button"
                    data-action="set-plot-filter"
                    data-id="${escapeHtml(value)}"
                  >
                    <span>${escapeHtml(label)}</span>
                    <strong>${count}</strong>
                  </button>
                `;
              })
              .join("")}
          </div>
        </div>
        <div class="summary-card plot-stat-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">卡池统计</p>
              <h3>剧情卡分布</h3>
            </div>
          </div>
          <div class="plot-stat-list">
            <div class="plot-stat-row"><span>主线卡</span><strong>${allCards.filter((card) => card.lane_kind === "canonical_mainline").length}</strong></div>
            <div class="plot-stat-row"><span>支线卡</span><strong>${allCards.filter((card) => card.lane_kind === "subplot").length}</strong></div>
            <div class="plot-stat-row"><span>方案卡</span><strong>${allCards.filter((card) => card.lane_kind === "scenario").length}</strong></div>
            <div class="plot-stat-row"><span>未定义卡</span><strong>${allCards.filter((card) => card.lane_kind === "undefined").length}</strong></div>
          </div>
        </div>
      </aside>
      <aside class="workbench-pane workbench-pane--library">
        <div class="summary-card plot-library-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">剧情卡池</p>
              <h3>${libraryTitle}</h3>
            </div>
            <span class="chip chip--soft">${cardsForRail.length} 张</span>
          </div>
          ${
            cardsForRail.length === 0
              ? renderEmptyState("当前分类下还没有剧情卡。")
              : `
                <div class="plot-rail-card-list plot-library-list">
                  ${cardsForRail
                    .map((card) => renderPlotCardChip(card, { showAct: true, showNode: true }))
                    .join("")}
                </div>
              `
          }
        </div>
      </aside>
      <div class="workbench-pane workbench-pane--main">
        <div class="summary-card plot-workbench__toolbar">
          <div class="list-card__head">
            <div>
              <p class="section-label">主编辑区</p>
              <h3>剧情排布</h3>
            </div>
            <div class="plot-workbench__head-tools">
              <div class="choice-chip-row">
                <button class="choice-chip ${appState.plotBoardView === "structure" ? "is-active" : ""}" type="button" data-action="set-plot-view" data-id="structure">结构视图</button>
                <button class="choice-chip ${appState.plotBoardView === "rehearsal" ? "is-active" : ""}" type="button" data-action="set-plot-view" data-id="rehearsal">排演视图</button>
              </div>
              ${isRehearsalView ? renderScenarioGroupToolbar(scenarioGroups) : ""}
              ${
                isRehearsalView
                  ? `
                    <button class="button button--ghost button--tiny" type="button" data-action="toggle-plot-context">
                      ${contextVisible ? "隐藏速查区" : "显示速查区"}
                    </button>
                  `
                  : ""
              }
              ${
                selectedCard
                  ? `<span class="chip chip--soft">${escapeHtml(selectedCard.title || "未命名剧情卡")}</span>`
                  : `<span class="chip chip--soft">先选中一张剧情卡</span>`
              }
            </div>
          </div>
        </div>
        <div class="plot-board-panel">
          ${
            appState.plotBoardView === "structure"
              ? renderStructureViewBoard(cards, lanes)
              : renderRehearsalViewBoard(cards, lanes)
          }
        </div>
      </div>
      <aside class="workbench-pane workbench-pane--context">
        <div class="summary-card plot-inspector__lead">
          <div class="list-card__head">
            <div>
              <p class="section-label">当前检视</p>
              <h3>${selectedCard ? escapeHtml(selectedCard.title || "未命名剧情卡") : "未选中剧情卡"}</h3>
            </div>
            ${
              selectedCard
                ? `<span class="chip chip--soft">${escapeHtml(plotStatusLabels[selectedCard.status] ?? selectedCard.status)}</span>`
                : ""
            }
          </div>
          ${
            !selectedCard
              ? renderEmptyState("先选中一张剧情卡。")
              : `
                <div class="summary-strip">
                  <span class="chip chip--soft">${escapeHtml(getPlotLane(selectedCard.lane_id)?.title ?? "未归类")}</span>
                  <span class="chip chip--soft">${escapeHtml(getActTitle(selectedCard.act_id))}</span>
                  <span class="chip chip--soft">${escapeHtml(getNode(selectedCard.node_id)?.title ?? "未挂节点")}</span>
                </div>
                ${
                  selectedCard.lane_kind === "scenario" && activeScenarioGroup
                    ? `<div class="issue__hint">当前方案组：${escapeHtml(activeScenarioGroup.title)}</div>`
                    : ""
                }
                <div class="plot-inspector__summary">
                  <p>${escapeHtml(selectedCard.summary || "这张剧情卡还没有摘要。")}</p>
                </div>
                <div class="inline-actions">
                  <button class="button button--ghost button--tiny" type="button" data-action="open-plot-editor">打开完整编辑</button>
                  <button class="button button--ghost button--tiny" type="button" data-action="toggle-plot-lock" data-id="${escapeHtml(selectedCard.id)}">${selectedCard.status === "locked" ? "解除锁定" : "锁定这张卡"}</button>
                  <button class="button button--ghost button--tiny" type="button" data-action="scene-from-plot" data-id="${escapeHtml(selectedCard.id)}">生成一场</button>
                </div>
              `
          }
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>关联角色</h3>
            <span class="chip chip--soft">${relatedCharacters.length} 人</span>
          </div>
          ${
            relatedCharacters.length === 0
              ? renderEmptyState("这张剧情卡还没有关联角色。")
              : `
                <div class="stack plot-inspector__list">
                  ${relatedCharacters
                    .map(
                      (character) => `
                        <button class="list-select" type="button" data-action="jump-to-character" data-id="${escapeHtml(character.id)}">
                          <strong>${escapeHtml(character.name || "未命名人物")}</strong>
                          <span>${escapeHtml(storyRoleLabels[character.story_role] ?? character.story_role)}</span>
                        </button>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>共现关系</h3>
            <span class="chip chip--soft">${relatedRelationships.length} 条</span>
          </div>
          ${
            relatedRelationships.length === 0
              ? renderEmptyState("这张剧情卡暂时还没有形成明确关系。")
              : `
                <div class="stack plot-inspector__list">
                  ${relatedRelationships
                    .map(
                      (relationship) => `
                        <button class="list-select" type="button" data-action="jump-to-relationship" data-id="${escapeHtml(relationship.id)}">
                          <strong>${escapeHtml(getCharacterNameById(relationship.source_character_id))} 路 ${escapeHtml(getCharacterNameById(relationship.target_character_id))}</strong>
                          <span>${escapeHtml(relationship.relationship_type || "未命名关系")}</span>
                        </button>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>已拆场景</h3>
            <span class="chip chip--soft">${relatedScenes.length} 场</span>
          </div>
          ${
            relatedScenes.length === 0
              ? renderEmptyState("这张剧情卡还没有拆成场景。")
              : `
                <div class="stack plot-inspector__list">
                  ${relatedScenes
                    .map(
                      (scene) => `
                        <button class="list-select" type="button" data-action="jump-to-scene" data-id="${escapeHtml(scene.id)}">
                          <strong>${escapeHtml(scene.order_index)} 路 ${escapeHtml(scene.title || "未命名场景")}</strong>
                          <span>${escapeHtml(scene.location || "未定地点")} 路 ${escapeHtml(scene.time_of_day || "未定时段")}</span>
                        </button>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>时间线线索</h3>
            <span class="chip chip--soft">${relatedTimeline.length} 条</span>
          </div>
          ${
            relatedTimeline.length === 0
              ? renderEmptyState("当前还没有可引用的时间线线索。")
              : `
                <div class="stack plot-inspector__list">
                  ${relatedTimeline
                    .map(
                      (event) => `
                        <div class="list-select list-select--static">
                          <strong>第 ${escapeHtml(event.story_day || "?")} 天 路 ${escapeHtml(event.summary || "未命名事件")}</strong>
                          <span>${escapeHtml(event.location || "未定地点")} 路 ${escapeHtml(event.trigger || "未定触发")}</span>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
      </aside>
      ${editorDrawer}
    </section>
  `;
};

normalizeProject = function normalizeProjectCurrentV2() {
  appState.project = ensurePlotBoardModel(ensurePlotDrivenProject(appState.project));
  const plotCards = list(appState.project.plot_board?.cards);
  const structureNodes = new Map(list(appState.project.structure_profile?.nodes).map((node) => [node.id, node]));
  const characters = list(appState.project.character_hub?.characters);
  const relationships = list(appState.project.character_hub?.relationship_map);
  const scenes = list(appState.project.scene_workbench?.scenes);
  const timeline = list(appState.project.lock_layer?.projections?.timeline_events);
  const rules = list(appState.project.lock_layer?.projections?.world_rules);
  const setups = list(appState.project.lock_layer?.projections?.setup_payoffs);
  if (isBrokenPlaceholderText(appState.project.project?.title)) {
    appState.project.project.title = "未命名项目";
  }
  plotCards.forEach((card) => {
    if (!isBrokenPlaceholderText(card.title)) {
      return;
    }
    card.title = card.summary?.trim() || card.change?.trim() || structureNodes.get(card.node_id)?.title || "未命名剧情卡";
  });
  appState.selection.plotCardId = plotCards.some((item) => item.id === appState.selection.plotCardId)
    ? appState.selection.plotCardId
    : plotCards[0]?.id ?? null;
  if (!appState.selection.plotCardId) {
    appState.plotEditorOpen = false;
  }
  appState.selection.characterId = characters.some((item) => item.id === appState.selection.characterId)
    ? appState.selection.characterId
    : characters[0]?.id ?? null;
  appState.selection.relationshipId = relationships.some((item) => item.id === appState.selection.relationshipId)
    ? appState.selection.relationshipId
    : relationships[0]?.id ?? null;
  appState.selection.sceneId = scenes.some((item) => item.id === appState.selection.sceneId)
    ? appState.selection.sceneId
    : scenes[0]?.id ?? null;
  appState.selection.timelineId = timeline.some((item) => item.id === appState.selection.timelineId)
    ? appState.selection.timelineId
    : timeline[0]?.id ?? null;
  appState.selection.worldRuleId = rules.some((item) => item.id === appState.selection.worldRuleId)
    ? appState.selection.worldRuleId
    : rules[0]?.id ?? null;
  appState.selection.setupId = setups.some((item) => item.id === appState.selection.setupId)
    ? appState.selection.setupId
    : setups[0]?.id ?? null;
  if (!getScenarioGroups().some((group) => group.id === appState.activeScenarioGroupId)) {
    appState.activeScenarioGroupId = getScenarioGroups()[0]?.id ?? null;
  }
};

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }
  const action = target.dataset.action;
  if (action === "set-plot-view") {
    setPlotBoardView(target.dataset.id ?? "structure");
    return;
  }
  if (action === "toggle-plot-context") {
    setPlotContextVisible(!appState.plotContextVisible);
    return;
  }
  if (action === "set-scenario-group") {
    appState.activeScenarioGroupId = target.dataset.id ?? null;
    render();
    return;
  }
  if (action === "move-plot-card-position") {
    shiftPlotCardWithinLane(target.dataset.id ?? "", Number(target.dataset.direction) || 0);
  }
});

document.addEventListener("change", (event) => {
  const action = event.target.dataset.action;
  if (action === "plot-lane-field") {
    const card = getPlotCard();
    if (!card) {
      return;
    }
    applyPlotCardPlacement(card, { laneId: event.target.value, actId: card.act_id, nodeId: card.node_id });
    normalizeProject();
    markDirty();
    render();
    return;
  }
  if (action === "plot-position-field") {
    const card = getPlotCard();
    if (!card) {
      return;
    }
    const actId = event.target.value;
    applyPlotCardPlacement(card, { laneId: card.lane_id, actId, nodeId: card.node_id });
    normalizeProject();
    markDirty();
    render();
    return;
  }
  if (action === "plot-scenario-field") {
    const card = getPlotCard();
    if (!card) {
      return;
    }
    card.scenario_group_id = event.target.value || null;
    appState.activeScenarioGroupId = card.scenario_group_id || appState.activeScenarioGroupId;
    markDirty();
    render();
  }
});

document.addEventListener("dragover", (event) => {
  if (appState.draggedPlotCardId) {
    updateDragAutoScroll(event.clientX, event.clientY);
  }
  if (event.target.closest("[data-plot-dropzone]")) {
    event.preventDefault();
  }
});

document.addEventListener("drop", (event) => {
  const dropzone = event.target.closest("[data-plot-dropzone]");
  if (!dropzone || !appState.draggedPlotCardId) {
    return;
  }
  event.preventDefault();
  movePlotCardToLaneAct(
    appState.draggedPlotCardId,
    dropzone.dataset.laneId ?? getPlotCard(appState.draggedPlotCardId)?.lane_id ?? "lane_main",
    dropzone.dataset.actId ?? getPlotCard(appState.draggedPlotCardId)?.act_id ?? list(appState.project.structure_profile?.acts)[0]?.id ?? "",
    dropzone.dataset.nodeId ?? ""
  );
  appState.draggedPlotCardId = null;
  stopDragAutoScroll();
});

async function bootstrap() {
  try {
    const status = await fetchJson("/api/status");
    appState.runtime.serverAvailable = status.server === "ok";
    appState.ai = status.ai ?? appState.ai;
    appState.aiConfigDraft.provider = appState.ai.provider || appState.aiConfigDraft.provider;
    appState.aiConfigDraft.model = appState.ai.configured ? appState.ai.model || appState.aiConfigDraft.model : "";
    appState.aiModelCatalog.provider = appState.ai.configured ? appState.ai.provider || appState.aiModelCatalog.provider : "";
    appState.aiModelCatalog.options = appState.ai.configured && appState.ai.model ? [{ id: appState.ai.model, label: appState.ai.model }] : [];
    appState.aiConfigOpen = !appState.ai.configured;
    await loadProjectsFromServer();
    if (appState.projectList[0]?.id) {
      await loadProjectFromServer(appState.projectList[0].id);
    }
  } catch (error) {
    const snapshot = loadLocalSnapshot();
    if (snapshot?.project) {
      appState.project = ensurePlotDrivenProject(snapshot.project);
      appState.projectList = list(snapshot.projectList);
    } else {
      appState.project = ensurePlotDrivenProject(cloneDefaultProject());
      appState.projectList = [
        {
          id: appState.project.project.id,
          title: appState.project.project.title,
          format: appState.project.project.format,
          status: appState.project.project.status,
          genre: appState.project.project.genre,
          logline: appState.project.project.logline,
          character_count: list(appState.project.character_hub?.characters).length,
          scene_count: list(appState.project.scene_workbench?.scenes).length,
          version_count: 0
        }
      ];
    }
  }

  normalizeProject();
  render();
}

dom.pageProjectButton.addEventListener("click", () => setCurrentPage("project"));
dom.pageWorkflowButton.addEventListener("click", () => setCurrentPage("workflow"));
dom.openSettingsButton.addEventListener("click", () => {
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  appState.settingsDialogOpen = true;
  render();
});
dom.stepPrevButton.addEventListener("click", () => goToAdjacentStep(-1));
dom.stepNextButton.addEventListener("click", () => goToAdjacentStep(1));
dom.closeSettingsButton.addEventListener("click", () => {
  appState.settingsDialogOpen = false;
  render();
});
dom.cancelCreateProjectButton.addEventListener("click", () => {
  if (appState.projectCreateStepIndex > 0) {
    appState.projectCreateStepIndex -= 1;
    renderProjectCreateForm();
    return;
  }
  appState.createDialogOpen = false;
  render();
});
dom.confirmCreateProjectButton.addEventListener("click", async () => {
  if (appState.projectCreateStepIndex < projectCreateStepsCurrent.length - 1) {
    if (!canAdvanceProjectCreate()) {
      return;
    }
    appState.projectCreateStepIndex += 1;
    renderProjectCreateForm();
    if (getProjectCreateStep().id === "logline" && appState.createConceptOptions.length === 0) {
      await requestCreateConceptOptionsCurrent();
    }
    return;
  }
  const payload = {
    title: appState.projectDraft.title,
    format: appState.projectDraft.format,
    language: "zh-CN",
    genre: splitTags(appState.projectDraft.genre),
    logline: appState.projectDraft.logline,
    theme_question: appState.projectDraft.theme_question,
    tone: appState.projectDraft.tone
  };
  try {
    const response = await fetchJson("/api/projects", { method: "POST", body: JSON.stringify(payload) });
    const enrichedProject = applyProjectDraftToProject(response.project);
    const saved = await fetchJson(`/api/projects/${encodeURIComponent(enrichedProject.project.id)}`, {
      method: "PUT",
      body: JSON.stringify({ project: enrichedProject })
    });
    appState.project = ensurePlotDrivenProject(saved.project);
    appState.projectList = saved.projects ?? response.projects ?? appState.projectList;
    appState.runtime.serverAvailable = true;
    appState.createDialogOpen = false;
    resetProjectCreateWizard();
    setCurrentPage("workflow");
    setCurrentStep("structure");
  } catch (error) {
    appState.project = applyProjectDraftToProject(createEmptyProject(payload));
    appState.projectList = [
      summarizeProjectListItem(appState.project),
      ...appState.projectList
    ];
    appState.createDialogOpen = false;
    resetProjectCreateWizard();
    setCurrentPage("workflow");
    setCurrentStep("structure");
  }
});
dom.saveButton.addEventListener("click", async () => {
  saveLocalSnapshot();
  if (!appState.runtime.serverAvailable) {
    appState.runtime.lastSavedAt = "浠呮湰鍦颁繚瀛?";
    renderRuntimeStatus();
    return;
  }
  await saveProjectToServer();
});
dom.resetButton.addEventListener("click", async () => {
  if (!appState.runtime.serverAvailable) {
    appState.project = ensurePlotDrivenProject(cloneDefaultProject());
    normalizeProject();
    render();
    return;
  }
  const payload = await fetchJson(`/api/projects/${encodeURIComponent(appState.project.project.id)}/reset`, { method: "POST" });
  appState.project = ensurePlotDrivenProject(payload.project);
  appState.projectList = payload.projects ?? appState.projectList;
  normalizeProject();
  render();
});
document.addEventListener("click", handleClick);
document.addEventListener("input", handleInput);
document.addEventListener("change", handleChange);
document.addEventListener("dragstart", (event) => {
  const target = event.target.closest("[data-drag-plot-id]");
  if (!target) return;
  appState.draggedPlotCardId = target.dataset.dragPlotId;
  appState.selection.plotCardId = target.dataset.dragPlotId;
});
document.addEventListener("dragend", () => {
  appState.draggedPlotCardId = null;
  stopDragAutoScroll();
});
window.addEventListener("scroll", schedulePlotInspectorLeadSync, { passive: true, capture: true });
window.addEventListener("resize", schedulePlotInspectorLeadSync, { passive: true });
dom.projectCreateDialog.addEventListener("click", (event) => {
  if (event.target === dom.projectCreateDialog) {
    appState.createDialogOpen = false;
    render();
  }
});
dom.settingsDialog.addEventListener("click", (event) => {
  if (event.target === dom.settingsDialog) {
    appState.settingsDialogOpen = false;
    render();
  }
});

bootstrap();


