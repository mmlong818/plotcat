import { buildExpertOutput } from "../logic/experts.js";
import { spawnClaude } from "./spawnClaude.js";

const CLAUDE_TIMEOUT_MS = 300_000;

function callClaudeSubprocessOnce(prompt) {
  return new Promise((resolve, reject) => {
    const proc = spawnClaude(["-p", "--output-format", "text"]);
    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");
    proc.stdin.setDefaultEncoding("utf8");

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => { proc.kill(); reject(new Error("claude CLI 超时")); }, CLAUDE_TIMEOUT_MS);

    proc.stdout.on("data", (d) => { stdout += d; });
    proc.stderr.on("data", (d) => { stderr += d; });
    proc.stdin.write(prompt, "utf8");
    proc.stdin.end();

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`claude CLI 退出码 ${code}: ${stderr.slice(0, 300)}`));
      else resolve(stdout);
    });
    proc.on("error", (err) => { clearTimeout(timer); reject(err); });
  });
}

// 带重试的封装：遇到非零退出 / 超时时短暂等待后重试，避免限流瞬时失败导致整轮 bulk 报废
async function callClaudeSubprocess(prompt, { retries = 2, retryDelayMs = 4000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callClaudeSubprocessOnce(prompt);
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        console.warn(`[claude] attempt ${attempt + 1}/${retries + 1} failed: ${err.message.slice(0, 120)}, retrying in ${retryDelayMs}ms...`);
        await new Promise((r) => setTimeout(r, retryDelayMs));
      }
    }
  }
  throw lastError;
}

function extractJsonCandidate(text) {
  // Case 1: complete ```json ... ``` block
  const completeBlock = text.match(/```json\s*([\s\S]*?)```/);
  if (completeBlock) return completeBlock[1];

  // Case 2: incomplete ```json block (truncated — no closing ```)
  const incompleteBlock = text.match(/```json\s*([\s\S]*)/);
  if (incompleteBlock) {
    const inner = incompleteBlock[1];
    const firstBrace = inner.indexOf('{');
    const candidate = firstBrace !== -1 ? inner.slice(firstBrace) : inner;
    const lastEnd = candidate.lastIndexOf('}');
    return lastEnd !== -1 ? candidate.slice(0, lastEnd + 1) : candidate;
  }

  // Case 3: bare JSON without code fence
  const lastBrace = text.lastIndexOf('{');
  const candidate = lastBrace !== -1 ? text.slice(lastBrace) : text;
  const lastEnd = candidate.lastIndexOf('}');
  return lastEnd !== -1 ? candidate.slice(0, lastEnd + 1) : candidate;
}

/**
 * Repair JSON with unescaped double-quotes inside string values (common in Chinese text).
 * Uses a state-machine approach: tracks whether we're inside a JSON string value
 * and escapes any " that appears where a structural " is not expected.
 */
function repairUnescapedQuotes(text) {
  let result = '';
  let inString = false;
  let isValue = false;  // true when the current string is a value (not a key)
  let prevChar = '';
  let depth = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const escaped = prevChar === '\\';

    if (inString) {
      if (ch === '"' && !escaped) {
        // Closing quote candidate — peek ahead to decide if this is structural
        // A structural closing quote is followed by: whitespace, :, ,, }, ]
        let j = i + 1;
        while (j < text.length && (text[j] === ' ' || text[j] === '\t' || text[j] === '\n' || text[j] === '\r')) j++;
        const next = text[j] ?? '';
        const isStructural = next === ':' || next === ',' || next === '}' || next === ']' || j >= text.length;
        if (isStructural) {
          inString = false;
          result += '"';
        } else {
          // This " is INSIDE a string value — escape it
          result += '\\"';
        }
      } else if (ch === '\\' && !escaped) {
        result += ch;
      } else {
        result += ch;
      }
    } else {
      if (ch === '"') {
        inString = true;
        result += '"';
      } else if (ch === '{' || ch === '[') {
        depth++;
        result += ch;
      } else if (ch === '}' || ch === ']') {
        depth--;
        result += ch;
      } else {
        result += ch;
      }
    }

    prevChar = ch;
  }

  return result;
}

function parseJsonFromClaude(text) {
  const raw = extractJsonCandidate(text).trim();
  try {
    return JSON.parse(raw);
  } catch {
    // 修复：字符串值内的未转义双引号（常见于中文内容）
    try {
      const fixed = repairUnescapedQuotes(raw);
      return JSON.parse(fixed);
    } catch {
      throw new Error(`JSON parse failed: ${text.slice(0, 300)}`);
    }
  }
}

const defaultProvider = process.env.OPENAI_API_KEY
  ? "openai"
  : process.env.GEMINI_API_KEY
    ? "gemini"
    : "openai";

const defaultModels = {
  openai: process.env.OPENAI_MODEL || "gpt-5",
  gemini: process.env.GEMINI_MODEL || "gemini-2.0-flash"
};

const runtimeConfig = {
  provider: defaultProvider,
  apiKey: process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || "",
  model: defaultModels[defaultProvider],
  source: process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY ? "env" : "none"
};

const wizardFormatLabels = {
  feature: "电影",
  pilot: "试播集",
  series: "连续剧",
  short: "短片",
  micro_drama: "微短剧"
};

const wizardTemplateLabels = {
  feature_film: "电影长片模式",
  pilot_episode: "试播集模式",
  series_season: "连续剧季结构",
  short_form: "短片模式",
  micro_drama_serial: "微短剧模式",
  three_act: "三幕剧",
  four_act: "四幕剧",
  custom: "自定义"
};

const wizardTemplateOptions = {
  feature: ["feature_film", "three_act", "four_act", "custom"],
  pilot: ["pilot_episode", "three_act", "four_act", "custom"],
  series: ["series_season", "custom"],
  short: ["short_form", "custom"],
  micro_drama: ["micro_drama_serial", "custom"]
};

const wizardFieldLabels = {
  format: "作品形态",
  genre: "类型方向",
  tone: "风格方向",
  structure_template: "叙事结构",
  custom_act_count: "幕数",
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

const wizardStepFieldMap = {
  basics: ["format", "genre", "tone", "structure_template", "custom_act_count"],
  title: ["title"],
  logline: ["logline", "core_conflict"],
  blueprint: [
    "title",
    "genre",
    "tone",
    "structure_template",
    "custom_act_count",
    "logline",
    "core_conflict",
    "theme_question",
    "theme",
    "protagonist",
    "motif",
    "arc_start",
    "arc_end",
    "external_goal",
    "internal_need",
    "setting",
    "audience_promise"
  ]
};

const fallbackProfiles = {
  feature: {
    genre: "悬疑、情感",
    tone: "克制、渐进、带余味",
    protagonist: "一个被现实挤压到角落、必须重新选择立场的人",
    external_goal: "解决眼前危机并守住最重要的人或事",
    internal_need: "承认自己真正害怕失去的东西",
    setting: "一个表面稳定、内部压力持续累积的现实世界",
    audience_promise: "故事会持续升级人物代价，并把选择推向不可回避的终局"
  },
  pilot: {
    genre: "悬疑、群像",
    tone: "鲜明、推进快、带钩子",
    protagonist: "一个刚被抛进陌生局势、却仍想掌控一切的人",
    external_goal: "先解决当集危机，再摸清更大的长期引擎",
    internal_need: "放下自以为是的控制感，学会真正看见他人",
    setting: "一个规则复杂、人物关系彼此牵制的剧集世界",
    audience_promise: "每一轮推进都会带出更大的世界和下一集必须追看的钩子"
  },
  series: {
    genre: "群像、类型",
    tone: "持续推进、多线交织",
    protagonist: "一个被长期博弈卷入中心、命运和众人绑定的人",
    external_goal: "在多方势力夹击下守住自身目标并稳住局面",
    internal_need: "学会在长期压力中建立真正可持续的关系与判断",
    setting: "一个能承载多线长期碰撞、关系不断重组的连续叙事空间",
    audience_promise: "主线会持续外扩，人物关系和长期悬念会不断重组升级"
  },
  short: {
    genre: "情绪、反转",
    tone: "简洁、集中、快速落点",
    protagonist: "一个必须在很短时间内做出关键选择的人",
    external_goal: "完成眼前唯一必须解决的问题",
    internal_need: "在短促压力下承认自己的真实需要",
    setting: "一个信息密度高、能迅速形成情境张力的场域",
    audience_promise: "故事会迅速起势、完成转折，并把落点打在最该回收的位置"
  },
  micro_drama: {
    genre: "情感、反转",
    tone: "高钩子、高反转、强爽点",
    protagonist: "一个带着秘密回到旧关系网、不断掀翻局面的人",
    external_goal: "一边追求眼前胜利，一边持续制造下一集的追看钩子",
    internal_need: "停止只靠情绪和报复行动，真正看清自己要的是什么",
    setting: "一个关系纠葛密集、每集都能迅速起冲突的高压环境",
    audience_promise: "每一轮推进都会带来新的反转、身份翻面和连续追更动力"
  }
};

function list(value) {
  return Array.isArray(value) ? value : [];
}

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function compactText(value) {
  return trimText(value)
    .replace(/\s+/g, "")
    .replace(/[，。！？；：“”"'（）()【】《》、,.!?;:]/g, "");
}

function splitTags(value = "") {
  return [...new Set(trimText(value).split(/[、，,/|·\s]+/).map((item) => item.trim()).filter(Boolean))];
}

function clampActCount(value) {
  const numeric = Math.max(1, Math.min(6, Number(value) || 2));
  return String(numeric);
}

function normalizeProvider(value) {
  return value === "gemini" ? "gemini" : "openai";
}

function normalizeWizardFormat(value) {
  return Object.prototype.hasOwnProperty.call(wizardFormatLabels, value) ? value : "feature";
}

function getAllowedTemplates(format) {
  return wizardTemplateOptions[normalizeWizardFormat(format)] ?? wizardTemplateOptions.feature;
}

function getDefaultTemplateForFormat(format) {
  return getAllowedTemplates(format)[0];
}

function normalizeWizardTemplate(value, format) {
  const allowed = getAllowedTemplates(format);
  return allowed.includes(value) ? value : getDefaultTemplateForFormat(format);
}

function sanitizeWizardDraft(draft = {}) {
  const format = normalizeWizardFormat(trimText(draft.format));
  const structureTemplate = normalizeWizardTemplate(trimText(draft.structure_template), format);
  return {
    format,
    genre: trimText(draft.genre),
    tone: trimText(draft.tone),
    structure_template: structureTemplate,
    custom_act_count: clampActCount(draft.custom_act_count),
    title: trimText(draft.title),
    logline: trimText(draft.logline),
    core_conflict: trimText(draft.core_conflict),
    theme_question: trimText(draft.theme_question),
    theme: trimText(draft.theme),
    protagonist: trimText(draft.protagonist),
    motif: trimText(draft.motif),
    arc_start: trimText(draft.arc_start),
    arc_end: trimText(draft.arc_end),
    external_goal: trimText(draft.external_goal),
    internal_need: trimText(draft.internal_need),
    setting: trimText(draft.setting),
    audience_promise: trimText(draft.audience_promise)
  };
}

function keywordFromText(value) {
  const compact = compactText(value);
  if (!compact) return "";
  return compact.length <= 4 ? compact : compact.slice(0, 4);
}

function chooseBySeed(options, seed) {
  const items = list(options);
  if (!items.length) return "";
  const text = String(seed || "seed");
  let score = 0;
  for (const char of text) {
    score += char.charCodeAt(0);
  }
  return items[score % items.length];
}

function suggestMotif(draft) {
  if (draft.motif) return draft.motif;
  const setting = draft.setting;
  if (/[海潮浪湾港]/.test(setting)) return "潮汐";
  if (/[城街夜霓虹楼]/.test(setting)) return "霓虹";
  if (/[门家宅屋]/.test(setting)) return "门槛";
  if (/[校院廊室]/.test(setting)) return "走廊";
  if (/[镜像反射玻璃]/.test(setting)) return "镜面";
  if (draft.format === "micro_drama") return "裂缝";
  if (draft.format === "short") return "回声";
  return "余波";
}

function suggestTitle(draft, motif) {
  if (draft.title) return draft.title;
  const seed =
    keywordFromText(draft.motif) ||
    keywordFromText(draft.setting) ||
    keywordFromText(draft.logline) ||
    keywordFromText(draft.genre) ||
    keywordFromText(motif) ||
    chooseBySeed(["回声", "余烬", "潮痕", "暗面"], draft.format);
  const tags = splitTags(draft.genre);
  const suffix =
    tags.some((item) => item.includes("悬疑") || item.includes("犯罪"))
      ? chooseBySeed(["迷局", "证言", "暗潮", "回声"], `${seed}|suspense`)
      : tags.some((item) => item.includes("爱情") || item.includes("情感"))
        ? chooseBySeed(["归途", "潮声", "相逢", "余温"], `${seed}|emotion`)
        : chooseBySeed(["计划", "回声", "边界", "余波"], `${seed}|default`);
  return seed.endsWith(suffix) ? seed : `${seed}${suffix}`;
}

function suggestProtagonist(draft) {
  return draft.protagonist || fallbackProfiles[draft.format].protagonist;
}

function suggestExternalGoal(draft) {
  return draft.external_goal || fallbackProfiles[draft.format].external_goal;
}

function suggestInternalNeed(draft) {
  return draft.internal_need || fallbackProfiles[draft.format].internal_need;
}

function suggestSetting(draft) {
  return draft.setting || fallbackProfiles[draft.format].setting;
}

function suggestGenre(draft) {
  return draft.genre || fallbackProfiles[draft.format].genre;
}

function suggestTone(draft) {
  return draft.tone || fallbackProfiles[draft.format].tone;
}

function conciseSubject(protagonist) {
  const text = trimText(protagonist);
  if (!text) return "主角";
  if (text.length > 16 || text.startsWith("一个")) {
    return "主角";
  }
  return text;
}

function suggestCoreConflict(draft, protagonist, externalGoal, internalNeed) {
  if (draft.core_conflict) return draft.core_conflict;
  const subject = conciseSubject(protagonist);
  return `${subject}为了${externalGoal}不断向前，却总在关键处被“${internalNeed}”拖住，外部局势和内心缺口因此同时逼近失控。`;
}

function suggestLogline(draft, protagonist, externalGoal, setting) {
  if (draft.logline) return draft.logline;
  const subject = conciseSubject(protagonist);
  return `在${setting}中，${subject}为了${externalGoal}，被迫卷入一场同时撕开外部危机和内心缺口的困局。`;
}

function suggestThemeQuestion(draft, externalGoal, internalNeed) {
  if (draft.theme_question) return draft.theme_question;
  return `当一个人必须${externalGoal}，却只有先${internalNeed}才能真正赢下局面时，他会怎么选？`;
}

function suggestTheme(draft, internalNeed) {
  if (draft.theme) return draft.theme;
  return `人只有愿意${internalNeed}，才可能真正完成改变，而不是继续用旧方法自保。`;
}

function suggestArcStart(draft) {
  return draft.arc_start || "习惯自保，不愿承认真正的恐惧";
}

function suggestArcEnd(draft, internalNeed) {
  return draft.arc_end || `愿意承担代价，并主动${internalNeed}`;
}

function suggestAudiencePromise(draft) {
  return draft.audience_promise || fallbackProfiles[draft.format].audience_promise;
}

function buildWizardFallback(draftInput = {}) {
  const draft = sanitizeWizardDraft(draftInput);
  const format = draft.format;
  const structureTemplate = normalizeWizardTemplate(draft.structure_template, format);
  const motif = suggestMotif(draft);
  const protagonist = suggestProtagonist(draft);
  const externalGoal = suggestExternalGoal(draft);
  const internalNeed = suggestInternalNeed(draft);
  const setting = suggestSetting(draft);
  const genre = suggestGenre(draft);
  const tone = suggestTone(draft);
  return {
    format,
    genre,
    tone,
    structure_template: structureTemplate,
    custom_act_count: clampActCount(draft.custom_act_count),
    title: suggestTitle({ ...draft, genre, setting }, motif),
    logline: suggestLogline(draft, protagonist, externalGoal, setting),
    core_conflict: suggestCoreConflict(draft, protagonist, externalGoal, internalNeed),
    theme_question: suggestThemeQuestion(draft, externalGoal, internalNeed),
    theme: suggestTheme(draft, internalNeed),
    protagonist,
    motif,
    arc_start: suggestArcStart(draft),
    arc_end: suggestArcEnd(draft, internalNeed),
    external_goal: externalGoal,
    internal_need: internalNeed,
    setting,
    audience_promise: suggestAudiencePromise(draft)
  };
}

function normalizeWizardPatch(patchInput = {}, draftInput = {}) {
  const patch = patchInput && typeof patchInput === "object" ? patchInput : {};
  const draft = sanitizeWizardDraft(draftInput);
  const nextFormat = normalizeWizardFormat(trimText(patch.format) || draft.format);
  const nextTemplate = normalizeWizardTemplate(
    trimText(patch.structure_template) || draft.structure_template,
    nextFormat
  );
  const result = {};

  Object.entries(patch).forEach(([key, value]) => {
    if (key === "format") {
      result.format = nextFormat;
      return;
    }
    if (key === "structure_template") {
      result.structure_template = nextTemplate;
      return;
    }
    if (key === "custom_act_count") {
      result.custom_act_count = clampActCount(value);
      return;
    }
    if (typeof value === "string" && value.trim()) {
      result[key] = value.trim();
      return;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      result[key] = String(value);
    }
  });

  if (patch.format != null && result.format == null) {
    result.format = nextFormat;
  }
  if (patch.structure_template != null && result.structure_template == null) {
    result.structure_template = nextTemplate;
  }
  if (nextTemplate === "custom") {
    result.custom_act_count = clampActCount(patch.custom_act_count || draft.custom_act_count);
  }

  return result;
}

function pickWizardStepFields(stepId, patch) {
  const allowedFields = wizardStepFieldMap[stepId] ?? wizardStepFieldMap.blueprint;
  return Object.fromEntries(
    Object.entries(patch).filter(([key, value]) => allowedFields.includes(key) && trimText(value))
  );
}

function getWizardStepSchema(stepId, draft) {
  const allowedTemplates = getAllowedTemplates(draft.format);
  if (stepId === "basics") {
    return {
      type: "object",
      additionalProperties: false,
      properties: {
        format: { type: "string", enum: Object.keys(wizardFormatLabels) },
        genre: { type: "string" },
        tone: { type: "string" },
        structure_template: { type: "string", enum: allowedTemplates },
        custom_act_count: { type: "string" }
      },
      required: ["format", "genre", "tone", "structure_template", "custom_act_count"]
    };
  }

  if (stepId === "title") {
    return {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" }
      },
      required: ["title"]
    };
  }

  if (stepId === "logline") {
    return {
      type: "object",
      additionalProperties: false,
      properties: {
        logline: { type: "string" },
        core_conflict: { type: "string" }
      },
      required: ["logline", "core_conflict"]
    };
  }

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      genre: { type: "string" },
      tone: { type: "string" },
      structure_template: { type: "string", enum: allowedTemplates },
      custom_act_count: { type: "string" },
      logline: { type: "string" },
      core_conflict: { type: "string" },
      theme_question: { type: "string" },
      theme: { type: "string" },
      protagonist: { type: "string" },
      motif: { type: "string" },
      arc_start: { type: "string" },
      arc_end: { type: "string" },
      external_goal: { type: "string" },
      internal_need: { type: "string" },
      setting: { type: "string" },
      audience_promise: { type: "string" }
    },
    required: [
      "title",
      "genre",
      "tone",
      "structure_template",
      "custom_act_count",
      "logline",
      "core_conflict",
      "theme_question",
      "theme",
      "protagonist",
      "motif",
      "arc_start",
      "arc_end",
      "external_goal",
      "internal_need",
      "setting",
      "audience_promise"
    ]
  };
}

function buildWizardStepPrompt(stepId, draftInput) {
  const draft = sanitizeWizardDraft(draftInput);
  const allowedTemplates = getAllowedTemplates(draft.format)
    .map((value) => `${wizardTemplateLabels[value]}(${value})`)
    .join("、");

  const stepGuide = {
    basics: "请补全作品形态、类型方向、风格方向和合适的结构模板。",
    title: "请只生成一个能立住的项目名称，要能承接现有方向，不要空泛。",
    logline: "请补全一句话概念，并顺手明确核心冲突。",
    blueprint: "请补全完整蓝图，让主题、人物、冲突、弧光和观众承诺互相咬合。"
  };

  return `
你是“原点编剧系统”的新建项目顾问，现在要帮助编剧完成“${stepId}”步骤。

要求：
1. 全部用中文输出。
2. 严格返回 JSON，不要写解释。
3. 尽量延续用户已经写下的方向，不要无故换题。
4. 每个字段都要可直接继续修改，不要写空话和术语堆砌。
5. 当前作品形态只能从这些值里选：${Object.entries(wizardFormatLabels)
    .map(([value, label]) => `${label}(${value})`)
    .join("、")}。
6. 当前形态“${wizardFormatLabels[draft.format]}”可用的结构模板只有：${allowedTemplates}。
7. 如果选择 custom，自定义幕数 custom_act_count 返回 1 到 6；否则返回沿用当前幕数即可。

本步目标：
${stepGuide[stepId] ?? stepGuide.blueprint}

当前草稿：
${JSON.stringify(draft, null, 2)}
  `.trim();
}

function buildWizardFieldPrompt(field, draftInput) {
  const draft = sanitizeWizardDraft(draftInput);
  return `
你是“原点编剧系统”的新建项目顾问。
现在只需要重写字段“${wizardFieldLabels[field] ?? field}”。

要求：
1. 全部用中文输出。
2. 只返回 JSON。
3. 必须延续当前草稿，不要改动故事题材和核心方向。
4. 新内容要比原内容更聚焦、更可用，避免空泛。
5. 只输出一个字段 value。

当前草稿：
${JSON.stringify(draft, null, 2)}
  `.trim();
}

function getAiStatus() {
  return {
    configured: true,
    provider: "claude",
    model: "claude (订阅)",
    source: "subscription"
  };
}

function updateAiConfig({ provider, apiKey, model }) {
  if (provider != null) {
    runtimeConfig.provider = normalizeProvider(trimText(provider));
    if (!model && !runtimeConfig.apiKey) {
      runtimeConfig.model = defaultModels[runtimeConfig.provider];
    }
  }

  if (typeof apiKey === "string") {
    runtimeConfig.apiKey = apiKey.trim();
    runtimeConfig.source = runtimeConfig.apiKey ? "session" : "none";
  }

  if (typeof model === "string" && model.trim()) {
    runtimeConfig.model = model.trim();
  } else if (!runtimeConfig.model) {
    runtimeConfig.model = defaultModels[runtimeConfig.provider];
  }

  return getAiStatus();
}

function sortByPreferredOrder(items, priorities = []) {
  const scoreMap = new Map(priorities.map((value, index) => [value, index]));
  return [...items].sort((left, right) => {
    const leftScore = scoreMap.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightScore = scoreMap.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }
    return left.id.localeCompare(right.id);
  });
}

function isOpenAiSelectableModel(id) {
  const value = trimText(id).toLowerCase();
  if (!value) return false;
  if (!/^(gpt|o\d|o[1-9]|chatgpt-)/.test(value)) {
    return false;
  }
  if (/(audio|realtime|transcribe|tts|image|vision|search|deep-research|moderation|embedding|whisper|dall-e|sora|omni)/.test(value)) {
    return false;
  }
  if (/\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  return true;
}

async function listOpenAiModels(apiKey) {
  const response = await fetch("https://api.openai.com/v1/models", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI 模型列表获取失败：${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const options = list(payload.data)
    .map((item) => trimText(item?.id))
    .filter(isOpenAiSelectableModel)
    .map((id) => ({ id, label: id }));

  const deduped = [...new Map(options.map((item) => [item.id, item])).values()];
  return sortByPreferredOrder(deduped, [
    "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "gpt-4o",
    "gpt-4o-mini",
    "o4-mini",
    "o3"
  ]);
}

function isGeminiSelectableModel(model) {
  const name = trimText(model?.name);
  const id = name.replace(/^models\//, "");
  const actions = list(model?.supportedGenerationMethods ?? model?.supported_actions).map((item) => trimText(item));
  if (!id.startsWith("gemini")) {
    return false;
  }
  if (!actions.includes("generateContent")) {
    return false;
  }
  if (/(embedding|image|tts|audio|realtime)/i.test(id)) {
    return false;
  }
  return true;
}

async function listGeminiModels(apiKey) {
  let pageToken = "";
  const collected = [];

  do {
    const query = new URLSearchParams({ key: apiKey, pageSize: "1000" });
    if (pageToken) {
      query.set("pageToken", pageToken);
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?${query.toString()}`, {
      method: "GET"
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini 模型列表获取失败：${response.status} ${errorText}`);
    }

    const payload = await response.json();
    collected.push(...list(payload.models));
    pageToken = trimText(payload.nextPageToken);
  } while (pageToken);

  const options = collected
    .filter(isGeminiSelectableModel)
    .map((model) => {
      const id = trimText(model.name).replace(/^models\//, "");
      return {
        id,
        label: trimText(model.displayName) || id
      };
    });

  const deduped = [...new Map(options.map((item) => [item.id, item])).values()];
  return sortByPreferredOrder(deduped, ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"]);
}

function resolveApiKey(provider, apiKey) {
  const key = trimText(apiKey);
  if (key) {
    return key;
  }
  if (runtimeConfig.provider === provider && runtimeConfig.apiKey) {
    return runtimeConfig.apiKey;
  }
  return "";
}

function resolvePreferredModel(provider, models = []) {
  const currentModel = runtimeConfig.provider === provider ? trimText(runtimeConfig.model) : "";
  if (currentModel && models.some((item) => item.id === currentModel)) {
    return currentModel;
  }
  const defaultModel = defaultModels[provider];
  if (defaultModel && models.some((item) => item.id === defaultModel)) {
    return defaultModel;
  }
  return models[0]?.id ?? defaultModel;
}

async function listAvailableModels({ provider, apiKey }) {
  const safeProvider = normalizeProvider(trimText(provider));
  const safeApiKey = resolveApiKey(safeProvider, apiKey);
  if (!safeApiKey) {
    throw new Error("请先提供有效的 API Key。");
  }

  const models =
    safeProvider === "gemini" ? await listGeminiModels(safeApiKey) : await listOpenAiModels(safeApiKey);

  return {
    provider: safeProvider,
    models,
    defaultModel: resolvePreferredModel(safeProvider, models)
  };
}

function extractOpenAiText(payload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const segments = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") {
        segments.push(content.text);
      }
    }
  }

  return segments.join("\n").trim();
}

function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("\n")
    .trim();
}

async function callOpenAiStructured({ prompt, schema, name }) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${runtimeConfig.apiKey}`
    },
    body: JSON.stringify({
      model: runtimeConfig.model,
      store: false,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name,
          strict: true,
          schema
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI 请求失败：${response.status} ${errorText}`);
  }

  const payload = await response.json();
  return JSON.parse(extractOpenAiText(payload));
}

async function callGeminiStructured({ prompt, schema }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    runtimeConfig.model
  )}:generateContent?key=${encodeURIComponent(runtimeConfig.apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: schema
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini 请求失败：${response.status} ${errorText}`);
  }

  const payload = await response.json();
  return JSON.parse(extractGeminiText(payload));
}

async function requestStructuredOutput({ prompt, schema, name }) {
  if (runtimeConfig.provider === "gemini") {
    return callGeminiStructured({ prompt, schema });
  }
  return callOpenAiStructured({ prompt, schema, name });
}

function providerLabel(provider) {
  return provider === "gemini" ? "Gemini" : "OpenAI";
}

function expertRoleName(expertId) {
  const map = {
    core_idea_excavator: "故事核挖掘者",
    structure_genius: "结构天才",
    scene_crafter: "场景工坊",
    dialogue_doctor: "对白医生",
    subtext_specialist: "潜台词专家",
    visual_hammer: "视觉锤",
    emotion_resonator: "情感共振器",
    pacing_doctor: "节奏调控师",
    character_psychologist: "角色心理学家",
    continuity_editor: "一致性监察"
  };
  return map[expertId] || "专家顾问";
}

function buildExpertPrompt(expertId, project, selectedScene, issues) {
  const topIssues = issues.slice(0, 6).map((issue, index) => ({
    index: index + 1,
    severity: issue.severity,
    title: issue.title,
    summary: issue.summary,
    next: issue.suggestedNextStep
  }));

  return `
你正在扮演“原点编剧系统”里的${expertRoleName(expertId)}。

工作原则：
1. 全部使用中文。
2. 不替编剧拍板，先给可比较、可执行的方案。
3. 所有建议必须服从当前意图锚点。
4. 只围绕当前项目与当前场景发言，不要泛泛而谈。
5. 输出要具体，避免空话。

项目标题：${project.project.title}
一句话概念：${project.project.logline}

意图锚点：
- 故事核：${project.intent_anchor.core_idea}
- 主题：${project.intent_anchor.theme}
- 主角：${project.intent_anchor.protagonist}
- 弧光：${project.intent_anchor.arc}
- 母题：${project.intent_anchor.motif}
- 类型：${list(project.intent_anchor.genre).join(" / ")}

当前场景：
${selectedScene ? JSON.stringify(selectedScene, null, 2) : "当前没有选中场景"}

最重要的问题：
${JSON.stringify(topIssues, null, 2)}

请输出一个 JSON 对象，字段必须严格如下：
{
  "title": "字符串",
  "intro": "字符串",
  "sections": [
    {
      "title": "字符串",
      "bullets": ["字符串"]
    }
  ],
  "next_actions": ["字符串"]
}
  `.trim();
}

function fallbackExpertResponse(expertId, project, selectedScene, issues, warning = "") {
  const local = buildExpertOutput(expertId, project, selectedScene, issues);
  return {
    mode: "fallback",
    provider: "local",
    model: null,
    warning,
    output: {
      title: local.title,
      intro: `${local.intro} 当前未检测到可用的 API Key，先给出本地建议版。`,
      sections: local.sections,
      next_actions: issues.slice(0, 3).map((issue) => issue.suggestedNextStep)
    }
  };
}

function fallbackWizardStep(stepId, draftInput, warning = "") {
  const fallback = pickWizardStepFields(stepId, buildWizardFallback(draftInput));
  return {
    mode: "fallback",
    provider: "local",
    model: null,
    warning,
    fields: fallback
  };
}

function fallbackWizardField(field, draftInput, warning = "") {
  const fallback = buildWizardFallback(draftInput);
  return {
    mode: "fallback",
    provider: "local",
    model: null,
    warning,
    field,
    value: fallback[field] || ""
  };
}

function buildConceptOptionsFallback(draftInput = {}) {
  const base = buildWizardFallback(draftInput);
  const protagonist = conciseSubject(base.protagonist);
  const conflict = base.core_conflict;
  const setting = base.setting;
  const goal = base.external_goal;
  const need = base.internal_need;

  return [
    {
      id: "concept_a",
      label: "人物切口",
      logline: `在${setting}中，${protagonist}为了${goal}，被迫面对一场会同时撕开外部危机与内心缺口的困局。`,
      core_conflict: conflict
    },
    {
      id: "concept_b",
      label: "局势切口",
      logline: `${protagonist}原本只想${goal}，却因为一次突发变故，被拖进一个越来越失控的局面。`,
      core_conflict: `${protagonist}想用旧方法尽快稳住局势，却每走一步都更暴露出“${need}”才是他真正绕不过去的问题。`
    },
    {
      id: "concept_c",
      label: "关系切口",
      logline: `当${protagonist}试图${goal}时，一段关键关系被重新点燃，使整个故事从事件冲突升级成情感对撞。`,
      core_conflict: `${protagonist}既要处理眼前危机，又不得不直面那段关系背后的旧伤和秘密，否则他永远无法真正${need}。`
    }
  ];
}

function buildConceptOptionsPrompt(draftInput) {
  const draft = sanitizeWizardDraft(draftInput);
  return `
你是“原点编剧系统”的概念顾问。
现在请基于以下草稿，生成 3 组不同方向的概念候选。

要求：
1. 全部用中文。
2. 严格返回 JSON。
3. 每组都必须包含 label、logline、core_conflict。
4. 3 组候选必须明显不同，分别更偏人物切口、局势切口、关系切口。
5. logline 要简洁有吸引力，core_conflict 要更具体地说明主角卡在什么地方。
6. 不要起片名，不要扩展蓝图，只做概念候选。

当前草稿：
${JSON.stringify(draft, null, 2)}
  `.trim();
}

function fallbackConceptOptions(draftInput, warning = "") {
  return {
    mode: "fallback",
    provider: "local",
    model: null,
    warning,
    options: buildConceptOptionsFallback(draftInput)
  };
}

async function generateExpertResponse({ expertId, project, selectedScene, issues }) {
  try {
    const text = await callClaudeSubprocess(buildExpertPrompt(expertId, project, selectedScene, issues));
    const output = parseJsonFromClaude(text);
    return { mode: "ai", provider: "claude", model: "claude", output };
  } catch (error) {
    return fallbackExpertResponse(expertId, project, selectedScene, issues, error.message);
  }
}

async function generateCreateWizardConceptOptions({ draft }) {
  try {
    const safeDraft = sanitizeWizardDraft(draft);
    const text = await callClaudeSubprocess(buildConceptOptionsPrompt(safeDraft));
    const output = parseJsonFromClaude(text);
    return {
      mode: "ai",
      provider: "claude",
      model: "claude",
      options: list(output.options).slice(0, 3).map((option, index) => ({
        id: `concept_${index + 1}`,
        label: trimText(option.label) || `方向 ${index + 1}`,
        logline: trimText(option.logline),
        core_conflict: trimText(option.core_conflict)
      }))
    };
  } catch (error) {
    return fallbackConceptOptions(draft, error.message);
  }
}

async function generateCreateWizardStep({ stepId, draft }) {
  const safeStepId = Object.prototype.hasOwnProperty.call(wizardStepFieldMap, stepId) ? stepId : "blueprint";
  try {
    const safeDraft = sanitizeWizardDraft(draft);
    const text = await callClaudeSubprocess(buildWizardStepPrompt(safeStepId, safeDraft));
    const output = parseJsonFromClaude(text);
    return {
      mode: "ai",
      provider: "claude",
      model: "claude",
      fields: pickWizardStepFields(safeStepId, normalizeWizardPatch(output, safeDraft))
    };
  } catch (error) {
    return fallbackWizardStep(safeStepId, draft, error.message);
  }
}

async function regenerateCreateWizardField({ field, draft }) {
  const safeField = Object.prototype.hasOwnProperty.call(wizardFieldLabels, field) ? field : "logline";
  try {
    const safeDraft = sanitizeWizardDraft(draft);
    const text = await callClaudeSubprocess(buildWizardFieldPrompt(safeField, safeDraft));
    const output = parseJsonFromClaude(text);
    return {
      mode: "ai",
      provider: "claude",
      model: "claude",
      field: safeField,
      value: trimText(output.value)
    };
  } catch (error) {
    return fallbackWizardField(safeField, draft, error.message);
  }
}

async function generateActNodes({ projectCtx, actTitle, actPurpose, nodes }) {
  const { buildActNodesPrompt } = await import("../ai/prompts.js");
  const { system, user } = buildActNodesPrompt(projectCtx, actTitle, actPurpose, nodes);
  const fullPrompt = `<system>\n${system}\n</system>\n\n${user}`;
  const raw = await callClaudeSubprocess(fullPrompt);
  return parseJsonFromClaude(raw);
}

export {
  generateActNodes,
  generateCreateWizardConceptOptions,
  generateCreateWizardStep,
  generateExpertResponse,
  getAiStatus,
  listAvailableModels,
  providerLabel,
  regenerateCreateWizardField,
  updateAiConfig
};
