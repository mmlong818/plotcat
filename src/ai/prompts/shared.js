import { buildGenreBlendContract } from "../../shared/genreContract.js";

// 从任意 ctx 形状提取类型标签数组。
// 兼容三种形状：完整项目文档（有 genre_profile/scene_workbench 顶层键）、
// { project: 完整文档 } 信封、以及裸元数据 { genre: [...] }
export function genreTagsOf(ctx, extra = "") {
  const doc = (ctx?.genre_profile || ctx?.scene_workbench || ctx?.plot_board) ? ctx
    : (ctx?.project?.genre_profile || ctx?.project?.scene_workbench) ? ctx.project
    : ctx;
  const raw = doc?.project?.genre ?? doc?.genre ?? doc?.genre_profile?.primary_genre ?? [];
  const tags = Array.isArray(raw) ? [...raw] : [raw];
  if (extra) tags.push(extra);
  // 微短剧是作品形态不是题材：按 format 自动附加形态契约标签（黄金三秒/每集钩子等纪律）
  const fmt = doc?.project?.format ?? doc?.format ?? "";
  if (String(fmt).startsWith("micro_drama")) tags.push("微短剧");
  return tags.filter(Boolean);
}

// 系列库（挂载的世界观资产）→ prompt 注入块。来源标注 [系列]，项目级条目排在其后（优先级更高）
export function seriesBlocksOf(ctx) {
  const sb = ctx?.series_bible ?? ctx?.project?.series_bible;
  if (!sb) return { rules: "", timeline: "", regulars: "", regularNames: [] };
  const rules = (sb.world_rules ?? [])
    .map((r) => `- [系列] ${r.rule_statement ?? ""}${r.scope ? `（${r.scope}）` : ""}`)
    .filter((l) => l.length > 8).join("\n");
  const timeline = (sb.timeline_events ?? [])
    .map((e) => `- [系列·第 ${e.story_day ?? "?"} 天] ${e.summary ?? ""}`)
    .filter((l) => l.length > 12).join("\n");
  const regulars = (sb.regulars ?? [])
    .filter((c) => (c.name ?? "").trim())
    .map((c) => `【系列常驻·${c.name}】${c.role ? `（${c.role}）` : ""}${c.bio ?? ""}${c.voice ? `｜声音规则：${c.voice}` : ""}`)
    .join("\n");
  return { rules, timeline, regulars, regularNames: (sb.regulars ?? []).map((c) => (c.name ?? "").trim()).filter(Boolean) };
}

// 把任意 ctx 形状解析为【完整项目文档】。兼容三形态：完整文档（顶层有域键）、{project: 完整文档} 信封、裸 meta。
// 关键陷阱：完整文档自身有一个名为 `project` 的 meta 子键（id/title/logline/genre…），
// 所以决不能用 `ctx?.project ?? ctx` 粗暴解包——当 ctx 本身就是完整文档时会误塌成 meta，
// 导致 logline/premise/已有人物等全部读成 undefined（feature AI 全步骤失明、micro 上游锚定失效的真凶）。
export function resolveProjectDoc(ctx) {
  if (!ctx || typeof ctx !== "object") return ctx ?? {};
  const hasDomain = (o) => !!o && typeof o === "object" && (
    o.story_bible || o.scene_workbench || o.plot_board || o.structure_profile ||
    o.character_hub || o.intent_anchor || o.story_core || o.genre_profile ||
    o.theme_anchor || o.world_forge || o.char_smith || o.plot_frame
  );
  if (hasDomain(ctx)) return ctx;
  if (hasDomain(ctx.project)) return ctx.project;
  return ctx;
}

// 完整系列注入块（规则+时间线+常驻人物）——供 beat_sheet/characters/relationships/scene_outline
// 等核心 builder 统一拼接，确保挂载了系列的项目在「结构/人物/关系/大纲」各环节都看得到系列圣经。
export function seriesInjectionBlock(ctx) {
  const s = seriesBlocksOf(ctx);
  const parts = [];
  if (s.rules) parts.push(`系列世界规则（不得违反）：\n${s.rules}`);
  if (s.timeline) parts.push(`系列时间线（已发生，须自洽）：\n${s.timeline}`);
  if (s.regulars) parts.push(`系列常驻人物（沿用其设定，不得改写/改名）：\n${s.regulars}`);
  return parts.length ? `\n【系列圣经·跨作品共享，最高约束优先级】\n${parts.join("\n\n")}\n` : "";
}

export const HOLLYWOOD_SHOWRUNNER_PERSONA = `
你的身份：好莱坞 A 级 showrunner，10+ 年实战，参与过艾美/金球级别项目，深度师承 Save the Cat（Snyder）、Story（McKee）、Into the Woods（Yorke）、The Anatomy of Story（Truby）四大体系。

核心创作信条（必须严格执行）：
1. 主角弧光优先于剧情——任何场景不推进主角内在变化即视为废戏
2. 冲突必须三层成立：表层目标 / 真实需要 / 隐藏恐惧
3. 反派也必须是其自身故事的主角——任何反派的动机必须自洽、有可解释的过去
4. 节拍卡必须服务整部弧光，不允许"为节拍而节拍"
5. 对白原则：每句台词必带潜台词（说 X 要 Y），禁止人物嘴替剧本说明
6. 场景判定标准：状态差（entry≠exit）、戏剧主张（谁要什么/谁挡着/赌注）、潜台词锚点三者必备
7. 拒绝 AI 八股：避免"光从某方向打过来""指腹蹭杯沿"这类无信息含量的氛围堆砌
8. 节制：每场只解一个戏剧问题，留一个新问题；不要在一场戏里塞两个反转
9. 类型契约：选定的类型（悬疑/家庭/科幻/古装）有观众预期，必须兑现 80%、颠覆 20%
10. 不写说明性对白：观众通过冲突看到信息，不通过角色嘴说出"我现在很愤怒"
`;

export const DRAMA_PRINCIPLES = HOLLYWOOD_SHOWRUNNER_PERSONA + `
戏剧决策原则：
1. 角色行动必须来自其核心欲望/恐惧，而非剧情需要
2. 每场戏至少改变一个角色的情感或认知状态
3. 对白要有潜台词：表面说A，实际要B
4. 每场戏末尾留一个问题或张力，而非提供答案
5. 进场状态 ≠ 出场状态——没有差值的场景必须重写
6. 反同质化：每场必须有独特视觉/听觉/动作记忆点，禁止句式骨架复用
`;

export function projectSummary(ctx) {
  const p = resolveProjectDoc(ctx);
  const title = p?.project?.title ?? "未命名项目";
  const format = p?.project?.format ?? "";
  const genre = (p?.project?.genre ?? []).join("、") || "待定";
  const logline = p?.project?.logline ?? p?.story_core?.premise ?? "";
  const theme = p?.intent_anchor?.theme ?? p?.story_core?.theme_statement ?? "";
  const protagonist = p?.intent_anchor?.protagonist ?? "";
  const arc = p?.intent_anchor?.arc ?? "";
  const tone = p?.project?.tone ?? "";
  const coreConflict = p?.story_bible?.core_conflict ?? p?.story_core?.core_conflict ?? "";

  return `
项目：${title}
形态：${format}
类型：${genre}
一句话概念：${logline || "待定"}
核心冲突：${coreConflict || "待定"}
主题：${theme || "待定"}
主角：${protagonist || "待定"}
弧光：${arc || "待定"}
风格基调：${tone || "待定"}
`.trim();
}

export function charactersSummary(ctx) {
  const p = resolveProjectDoc(ctx);
  const characters = p?.character_hub?.characters ?? p?.story_bible?.characters ?? [];
  if (characters.length === 0) return "（暂无角色数据）";
  return characters.slice(0, 5).map((c) => {
    return `- ${c.name}（${c.story_role ?? ""}）：外部目标=${c.external_goal ?? c.external_want ?? ""}；内部需求=${c.dramatic_need ?? c.internal_need ?? ""}`;
  }).join("\n");
}

export function structureSummary(ctx) {
  const p = resolveProjectDoc(ctx);
  const nodes = p?.structure_profile?.nodes ?? [];
  const cards = p?.plot_board?.cards ?? [];
  if (nodes.length === 0) return "（暂无结构数据）";
  return nodes.slice(0, 8).map((node) => {
    const card = cards.find((c) => (c.node_id === node.id) || (node.card_ids ?? []).includes(c.id));
    return `- ${node.title}：${card?.summary || card?.title || "待填写"}`;
  }).join("\n");
}

// 针对单个场景 id 生成完整剧本格式文本（用于「剧本撰写」步骤）
// 把单个角色所有非空字段拼成 AI 可读的画像，确保用户填什么 AI 用什么
export function buildCharacterPortrait(c) {
  if (!c) return "";
  const lines = [];
  if (c.name) lines.push(`姓名：${c.name}`);
  if (c.story_role) lines.push(`角色定位：${c.story_role}`);
  if (c.external_goal) lines.push(`外部目标：${c.external_goal}`);
  if (c.dramatic_need) lines.push(`内部需要：${c.dramatic_need}`);
  if (c.contradiction) lines.push(`核心矛盾：${c.contradiction}`);
  if (c.pressure_point) lines.push(`压力点：${c.pressure_point}`);
  if (c.secret) lines.push(`秘密：${c.secret}`);
  if (c.starting_mask) lines.push(`开场面具：${c.starting_mask}`);
  if (c.arc_start) lines.push(`弧光起点：${c.arc_start}`);
  if (c.arc_end) lines.push(`弧光终点：${c.arc_end}`);
  if (Array.isArray(c.traits) && c.traits.length) lines.push(`性格特质：${c.traits.join("、")}`);
  if (c.mbti) lines.push(`MBTI：${c.mbti}`);
  if (c.core_drive) lines.push(`核心驱动：${typeof c.core_drive === "string" ? c.core_drive : (Array.isArray(c.core_drive) ? c.core_drive.join("、") : "")}`);
  if (c.notes) lines.push(`备注：${c.notes}`);
  return lines.join("\n");
}

// 单条关系的所有非空字段
export function buildRelationshipPortrait(r, charMap) {
  if (!r) return "";
  const aName = charMap.get?.(r.source_character_id)?.name ?? "?";
  const bName = charMap.get?.(r.target_character_id)?.name ?? "?";
  const lines = [`${aName} ↔ ${bName}`];
  const kind = r.relationship_kind || (r.relationship_type || "");
  if (kind) lines.push(`类型：${kind}`);
  if (r.relationship_type && r.relationship_type !== kind) lines.push(`自定义名：${r.relationship_type}`);
  if (r.tension) lines.push(`张力：${r.tension}`);
  if (r.power_balance) lines.push(`权力关系：${r.power_balance}`);
  if (r.shared_history) lines.push(`共同过去：${r.shared_history}`);
  if (r.hidden_truth) lines.push(`隐情：${r.hidden_truth}`);
  if (r.notes) lines.push(`备注：${r.notes}`);
  return lines.join(" / ");
}

export const SETUP_STATUS_TEXT = { open: "未回收", partial: "部分回收", closed: "已回收" };

// 全片伏笔追踪清单——喂给写本场/幕评师，治"物证细节各写各的、前后矛盾"硬伤
export function buildSetupTrackingBlock(ctx) {
  const setups = ctx?.lock_layer?.projections?.setup_payoffs ?? ctx?.story_bible?.setup_payoffs ?? [];
  const active = setups.filter((s) => (s.setup_summary || "").trim());
  if (!active.length) return "";
  const lines = active.map((s) => {
    const status = SETUP_STATUS_TEXT[s.status] ?? "未回收";
    const win = s.expected_payoff_window ? `，预期回收：${s.expected_payoff_window}` : "";
    const pay = s.payoff_summary ? `；回收设定：${s.payoff_summary}` : "";
    return `- 【${status}】${s.setup_summary}${win}${pay}`;
  }).join("\n");
  return lines;
}

// 类型契约——必备常规 + 禁区 + 观众承诺，喂给写本场/幕评师
export function buildGenreContractBlock(ctx) {
  const gp = ctx?.genre_profile;
  const list_ = (v) => (Array.isArray(v) ? v : []);
  const conventions = list_(gp?.conventions).filter((c) => (c.name || "").trim());
  const taboos = list_(gp?.taboos).filter((t) => (t.name || "").trim());
  const parts = [];
  // 知识库混合契约（主导类型禁忌全集 + 调味肌理提醒）
  const blendContract = buildGenreBlendContract(genreTagsOf(ctx), "scene");
  if (blendContract) parts.push(blendContract);
  if (gp?.audience_promise) parts.push(`观众承诺：${gp.audience_promise}`);
  if (conventions.length) {
    parts.push("类型必备（兑现下列期待，缺失即失约）：\n" + conventions.map((c) =>
      `- ${c.name}${c.status === "required" ? "（必备）" : ""}${c.description ? "：" + c.description : ""}`).join("\n"));
  }
  if (taboos.length) {
    parts.push("类型禁区（严禁踩中）：\n" + taboos.map((t) =>
      `- ${t.name}${t.description ? "：" + t.description : ""}`).join("\n"));
  }
  return parts.join("\n");
}

export function list_or(v) { return Array.isArray(v) ? v : []; }

export const ROLE_LABEL_MAP = { protagonist: "主角", antagonist: "对手", ally: "盟友", opponent_ally: "复杂盟友", supporting: "配角" };

export const REFINE_FIELD_LABELS = {
  name: "姓名",
  story_role: "故事角色",
  external_goal: "外部目标",
  dramatic_need: "内部需要",
  contradiction: "核心矛盾",
  pressure_point: "压力点",
  secret: "秘密",
  notes: "备注",
  starting_mask: "人物表层",
  arc_start: "弧光起点",
  arc_end: "弧光终点",
  traits: "性格特质",
  mbti: "MBTI 人格类型",
  core_drive: "核心驱动力"
};
