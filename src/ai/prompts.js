const DRAMA_PRINCIPLES = `
戏剧决策原则：
1. 角色行动必须来自其核心欲望/恐惧，而非剧情需要
2. 每场戏至少改变一个角色的情感或认知状态
3. 对白要有潜台词：表面说A，实际要B
4. 每场戏末尾留一个问题或张力，而非提供答案
`;

function projectSummary(ctx) {
  const p = ctx?.project ?? ctx;
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

function charactersSummary(ctx) {
  const p = ctx?.project ?? ctx;
  const characters = p?.character_hub?.characters ?? p?.story_bible?.characters ?? [];
  if (characters.length === 0) return "（暂无角色数据）";
  return characters.slice(0, 5).map((c) => {
    return `- ${c.name}（${c.story_role ?? ""}）：外部目标=${c.external_goal ?? c.external_want ?? ""}；内部需求=${c.dramatic_need ?? c.internal_need ?? ""}`;
  }).join("\n");
}

function structureSummary(ctx) {
  const p = ctx?.project ?? ctx;
  const nodes = p?.structure_profile?.nodes ?? [];
  const cards = p?.plot_board?.cards ?? [];
  if (nodes.length === 0) return "（暂无结构数据）";
  return nodes.slice(0, 8).map((node) => {
    const card = cards.find((c) => (c.node_id === node.id) || (node.card_ids ?? []).includes(c.id));
    return `- ${node.title}：${card?.summary || card?.title || "待填写"}`;
  }).join("\n");
}

export function buildLoglinePrompt(projectContext, options, genreData) {
  const { keywords = "", genre = "", style = [], avoid = [], count = 3 } = options ?? {};
  const genreInfo = genreData ? `
类型规范（${genreData.name ?? genre}）：
必要场景：${(genreData.obligatory_scenes ?? []).join("、") || "无"}
禁忌模式：${(genreData.forbidden_patterns ?? []).join("、") || "无"}
观众承诺：${genreData.audience_promise ?? ""}
` : "";

  const system = `你是一位专业的故事创意引擎，擅长创作有强钩子、反常设定、高冲突前提和内置反转潜力的Logline。
${DRAMA_PRINCIPLES}`;

  const user = `${projectSummary(projectContext)}

${genreInfo}
创作要求：
- 关键词方向：${keywords || "自由发挥"}
- 类型：${genre || "根据项目类型"}
- 风格偏好：${style.join("、") || "无特殊要求"}
- 避免：${avoid.join("、") || "无"}

请生成${count}个不同方向的Logline候选，每个必须包含：
1. 建议标题（有画面感、可记忆）
2. 一句话钩子（≤30字，包含：主角+处境+核心冲突+问题）
3. 核心冲突拆解：
   - 外部冲突：看得见的障碍和对手
   - 内部冲突：主角心里必须面对的真实问题
4. 内置反转潜力（这个故事最让人意外的那一面）
5. 差异化对标（与哪类经典作品相似，但差异在哪里）

用JSON格式输出，结构如下：
{
  "loglines": [
    {
      "title": "...",
      "hook": "...",
      "external_conflict": "...",
      "internal_conflict": "...",
      "twist_potential": "...",
      "comparable": "..."
    }
  ],
  "reasoning": "创作思路说明",
  "warnings": ["潜在问题1"]
}`;

  return { system, user };
}

export function buildTreatmentPrompt(projectContext, options) {
  const { selectedLogline = "", endingType = "", mood = [] } = options ?? {};

  const system = `你是一位资深剧本开发编辑，专注于将故事概念发展为扎实的创作锚点。
${DRAMA_PRINCIPLES}`;

  const user = `${projectSummary(projectContext)}

选定的Logline方向：
${selectedLogline || "（请基于项目概念）"}

结局方向：${endingType || "开放"}
情感基调：${mood.join("、") || "根据类型决定"}

请创作一份Treatment（故事梗概），必须包含以下段落，总字数不超过1000字：

【开端】世界现状与主角缺口——主角在哪里，缺少什么，为什么这一刻会改变
【激励事件】那个打破平衡的具体事件——发生了什么，为什么无法回避
【中段复杂化】主角如何行动，遭遇什么阻力，代价是什么
【黑暗时刻】最低点——主角以为输了什么，实际上失去了什么
【终局抉择】主角必须做出的那个真正选择——关于价值观，而非策略
【余韵】结束后世界变了什么——给观众带走什么

同时明确：
- 主角核心欲望与隐藏需求的区别
- 主题陈述（这个故事关于什么的真正问题）

用JSON格式输出：
{
  "treatment": {
    "opening": "...",
    "catalyst": "...",
    "midpoint_complication": "...",
    "dark_moment": "...",
    "final_choice": "...",
    "aftermath": "..."
  },
  "protagonist_desire": "表层欲望",
  "protagonist_need": "深层需求",
  "theme_statement": "主题陈述",
  "reasoning": "创作思路",
  "warnings": []
}`;

  return { system, user };
}

export function buildCharactersPrompt(projectContext, options, genreData) {
  const { count = 3, focusRole = "", theme = "" } = options ?? {};
  const ctx = projectContext?.project ?? projectContext;
  const treatment = ctx?.story_core?.premise ?? ctx?.project?.logline ?? "";
  const existingChars = charactersSummary(projectContext);

  const system = `你是一位专业人物设计师，擅长创造有欲望、需求、创伤和内置弧光的立体角色。
${DRAMA_PRINCIPLES}`;

  const user = `${projectSummary(projectContext)}

Treatment摘要：${treatment || "参见项目概念"}
已有角色：
${existingChars}

设计要求：
- 需要新增/完善角色数量：${count}
- 重点角色类型：${focusRole || "主角+主要配角"}
- 主题关联：${theme || "与项目主题一致"}

为每个角色提供完整的心理档案：

用JSON格式输出（字段必须齐全，全部填实，不能空字符串）：
{
  "characters": [
    {
      "name": "角色名",
      "story_role": "protagonist/antagonist/supporting/ally",
      "archetype": "角色原型（如：受伤的理想主义者、堕落的圣人）",
      "external_want": "表层欲望（外部目标，具体可见，剧情驱动力）",
      "internal_need": "深层需求（内在成长，自己未必意识到）",
      "psychological_flaw": "心理弱点（妨碍他成长的内在缺陷，如自欺、傲慢、执念）",
      "moral_flaw": "道德弱点（他对他人造成伤害的方式，如操控、冷漠、背叛）",
      "public_mask": "公开面具（外人看到的形象 vs 私下的他）",
      "core_fear": "核心恐惧（最深处害怕被揭穿/失去/面对的事）",
      "wound": "核心创伤（具体事件，是什么让他变成这样）",
      "belief": "错误信念（他以为什么是真的，其实是枷锁）",
      "arc_start": "弧光起点（开始时的状态）",
      "arc_end": "弧光终点（结束时的改变）",
      "voice_rules": ["对白风格规则1", "对白风格规则2", "对白风格规则3"],
      "secret": "他不愿被人知道的秘密（推动张力）",
      "relationship_hook": "与其他角色的关系动力（什么让他们必然碰撞）"
    }
  ],
  "relationship_tensions": ["角色间的核心张力点"],
  "reasoning": "角色设计思路",
  "warnings": []
}

每个字段都要填实，禁止空字符串和省略号。`;

  return { system, user };
}

export function buildBeatSheetPrompt(projectContext, options, genreData, beatData) {
  const { template = "save_the_cat", genre = "" } = options ?? {};
  const frameworkInfo = beatData ? Object.entries(beatData).map(([key, beat]) => {
    return `- ${beat.name ?? key}（${beat.percentage ?? ""}）：${beat.ai_instruction ?? beat.description ?? ""}`;
  }).join("\n") : "（使用经典节拍框架）";

  const system = `你是一位结构大师，专注于将Treatment精确映射到节拍框架，让每个节拍都有情感驱动力。
${DRAMA_PRINCIPLES}`;

  const user = `${projectSummary(projectContext)}

角色情况：
${charactersSummary(projectContext)}

结构情况：
${structureSummary(projectContext)}

选用框架：${template}
类型修正：${genre || "参见项目类型"}

节拍框架指引：
${frameworkInfo}

请将项目内容映射到节拍框架，为每个节拍提供：
- 具体发生什么事（可拍摄的画面和动作）
- 主角的情感状态变化
- 这个节拍如何推进主题

用JSON格式输出：
{
  "beat_sheet": [
    {
      "beat_name": "节拍名称",
      "beat_key": "节拍key",
      "percentage": "故事进度%",
      "what_happens": "具体事件",
      "protagonist_state": "主角状态",
      "theme_connection": "主题关联",
      "scene_suggestion": "场景建议"
    }
  ],
  "character_arc_map": {
    "角色名": ["各节拍的状态变化"]
  },
  "reasoning": "结构思路",
  "warnings": []
}`;

  return { system, user };
}

export function buildSceneOutlinePrompt(projectContext, options) {
  const { actId = "", nodeId = "" } = options ?? {};
  const ctx = projectContext?.project ?? projectContext;
  const nodes = ctx?.structure_profile?.nodes ?? [];
  const acts = ctx?.structure_profile?.acts ?? [];
  const cards = ctx?.plot_board?.cards ?? [];

  const targetNode = nodes.find((n) => n.id === nodeId);
  const targetAct = acts.find((a) => a.id === (actId || targetNode?.act_id));
  const relatedCards = cards.filter((c) => c.node_id === nodeId || (targetNode?.card_ids ?? []).includes(c.id));

  const nodeContext = targetNode ? `
所在节拍：${targetNode.title}（${targetNode.node_type}）
幕目：${targetAct?.title ?? ""} - ${targetAct?.purpose ?? ""}
相关剧情卡：${relatedCards.map((c) => c.summary || c.title).join("；") || "待定"}
` : "（未指定节拍，根据整体结构推断）";

  const system = `你是一位场景设计师，专注于将节拍内容拆解为可拍摄的具体场景卡。
${DRAMA_PRINCIPLES}`;

  const user = `${projectSummary(projectContext)}

${nodeContext}

前序场景上下文：
${structureSummary(projectContext)}

请为这个位置设计场景卡（可输出1-3个相邻场景），每个场景必须包含：

用JSON格式输出：
{
  "scenes": [
    {
      "title": "场景标题（INT/EXT 地点 时间）",
      "position": "在幕中的位置说明",
      "scene_goal": "本场戏的叙事目标",
      "conflict": "场景内部冲突",
      "turn": "场景转折点（进来时A，出去时B）",
      "information_gain": "观众获得了什么新信息",
      "emotion_beat": "情感节拍（角色情感的变化弧）",
      "pov_character": "视角角色",
      "end_question": "场景结束时留给观众的问题"
    }
  ],
  "reasoning": "场景设计思路",
  "warnings": []
}`;

  return { system, user };
}

export function buildSceneWeavePrompt(projectContext, options) {
  const {
    sceneGoal = "",
    emotionStart = "",
    emotionEnd = "",
    dialogueStyle = "naturalism",
    subtextType = ""
  } = options ?? {};

  const ctx = projectContext?.project ?? projectContext;
  const scenes = ctx?.scene_workbench?.scenes ?? ctx?.story_bible?.scene_cards ?? [];
  const latestScene = scenes[scenes.length - 1];

  const sceneCard = latestScene ? `
场景卡数据：
- 标题：${latestScene.title ?? ""}
- 目标：${latestScene.purpose ?? latestScene.goal ?? sceneGoal}
- 障碍：${latestScene.obstacle ?? ""}
- 节拍：${latestScene.beat_summary ?? ""}
- 进场状态：${latestScene.entry_state ?? latestScene.input_state ?? emotionStart}
- 出场状态：${latestScene.exit_state ?? latestScene.output_state ?? emotionEnd}
` : `
场景目标：${sceneGoal}
进场情感：${emotionStart}
出场情感：${emotionEnd}
`;

  const system = `你是一位专业剧本执笔作家，擅长创作有潜台词、有画面感、有情感张力的场景。
${DRAMA_PRINCIPLES}`;

  const user = `${projectSummary(projectContext)}

${sceneCard}

对白风格：${dialogueStyle}（自然主义=贴近生活；戏剧化=高张力；幽默=诙谐；诗意=抒情）
潜台词类型：${subtextType || "根据场景情感选择"}

重要要求：
- 对白不能解释性（不要说"我担心你是因为……"）
- 动作描述要精准，每行不超过3行
- 潜台词：角色说X但实际要Y
- 场景结尾必须有一个悬而未决的东西

请写完整的剧本格式场景：

用JSON格式输出：
{
  "script": "完整剧本文本（包含场景标题、动作描述、对白，标准剧本格式）",
  "subtext_map": [
    {"character": "角色名", "says": "表面说的", "means": "实际要的"}
  ],
  "emotion_arc": "情感弧描述",
  "end_hook": "结尾留下的问题/张力",
  "reasoning": "创作思路",
  "warnings": []
}`;

  return { system, user };
}

// 针对单个场景 id 生成完整剧本格式文本（用于「剧本撰写」步骤）
export function buildSceneScriptPrompt(projectContext, options) {
  const { sceneId = "", dialogueStyle = "naturalism", subtextType = "" } = options ?? {};
  // projectContext 可能是：完整的 appState.project（含 scene_workbench 等同级键），
  // 或 { project: {...} } 包装。统一兼容两种。
  const ctx = (projectContext?.scene_workbench || projectContext?.story_bible)
    ? projectContext
    : (projectContext?.project ?? projectContext);
  const scenes = ctx?.scene_workbench?.scenes ?? ctx?.story_bible?.scene_cards ?? [];
  const characters = ctx?.character_hub?.characters ?? ctx?.story_bible?.characters ?? [];
  const charById = new Map(characters.map((c) => [c.id, c]));
  const target = scenes.find((s) => s.id === sceneId) ?? scenes[0];
  if (!target) {
    return {
      system: "你是一位专业剧本执笔作家。",
      user: "未找到场景。请返回 {\"script\":\"\",\"warnings\":[\"未找到目标场景\"]}"
    };
  }

  const pov = charById.get(target.pov_character_id)?.name ?? "未指定 POV";

  // 收集本场所有出场人物（POV + 关联剧情卡里的人物），并整理画像供 AI 使用
  const plotCards = ctx?.plot_board?.cards ?? [];
  const linkedPlotIds = Array.isArray(target.linked_plot_card_ids) ? target.linked_plot_card_ids : [];
  const sceneCharIds = new Set([target.pov_character_id, ...linkedPlotIds.flatMap((pid) => {
    const card = plotCards.find((c) => c.id === pid);
    return Array.isArray(card?.character_ids) ? card.character_ids : [];
  })].filter(Boolean));
  const sceneCharLines = Array.from(sceneCharIds).map((cid) => {
    const c = charById.get(cid);
    if (!c) return null;
    const traits = [
      c.story_role && `角色定位 ${c.story_role}`,
      c.external_goal || c.external_want,
      c.starting_mask || c.public_mask,
      c.voice_traits
    ].filter(Boolean).join(" / ");
    return `- ${c.name}${cid === target.pov_character_id ? "（POV）" : ""}${traits ? "：" + traits : ""}`;
  }).filter(Boolean).join("\n") || `- ${pov}（仅 POV 已知）`;

  const lockedRules = (ctx?.lock_layer?.projections?.world_rules ?? ctx?.story_bible?.world_rules ?? [])
    .map((r) => `- ${r.rule_statement ?? r.statement ?? ""}（${r.scope ?? ""}）`).join("\n") || "（无）";
  const lockedTimeline = (ctx?.lock_layer?.projections?.timeline_events ?? ctx?.story_bible?.timeline_events ?? [])
    .slice(0, 6)
    .map((e) => `- 第 ${e.story_day ?? "?"} 天：${e.summary ?? ""}`).join("\n") || "（无）";

  const allowedNames = Array.from(sceneCharIds).map((cid) => charById.get(cid)?.name).filter(Boolean);
  const namesGuard = allowedNames.length > 0
    ? `\n严禁创造新人物名。本场允许出现的人物名仅有：${allowedNames.join("、")}。若需要群众/路人，统一写「路人」「店员」等通名，不要起新名字。`
    : "";

  const OUTDOOR_HINTS_PROMPT = [
    "门口", "门外", "街", "路", "巷", "桥", "湖", "海", "山", "林", "田", "野",
    "坝", "墓园", "广场", "公园", "渡口", "码头", "操场", "院子", "草坪",
    "天台", "屋顶", "阳台"
  ];
  const INDOOR_HINTS_PROMPT = [
    "卧室", "客厅", "厨房", "餐厅", "书房", "办公", "教室", "医院", "派出所",
    "车里", "车内", "车上", "船舱", "机舱", "电梯", "走廊",
    "家", "店", "馆", "厅", "室", "屋", "房"
  ];
  const locTrim = String(target.location || "").trim();
  const isIndoor =
    locTrim.startsWith("内") || locTrim.startsWith("内景") ? true :
    locTrim.startsWith("外") || locTrim.startsWith("外景") ? false :
    OUTDOOR_HINTS_PROMPT.some((k) => locTrim.includes(k)) ? false :
    INDOOR_HINTS_PROMPT.some((k) => locTrim.includes(k));
  const intExt = isIndoor ? "INT." : "EXT.";
  const slug = `${intExt} ${(target.location || "未定地点").toUpperCase()}${target.time_of_day ? " - " + (target.time_of_day || "").toUpperCase() : ""}`;

  const system = `你是一位专业剧本执笔作家，擅长创作有潜台词、有画面感、有情感张力的场景。
${DRAMA_PRINCIPLES}`;

  const user = `${projectSummary(projectContext)}

本场场景卡：
- 标题：${target.title || "未命名"}
- 顺序：第 ${target.order_index ?? "?"} 场
- 场景头（slug line）：${slug}
- POV 角色：${pov}
- 目标：${target.purpose ?? target.goal ?? ""}
- 障碍：${target.obstacle ?? ""}
- 节拍/转折：${target.beat_summary ?? target.turn ?? ""}
- 进场状态：${target.entry_state ?? target.input_state ?? ""}
- 出场状态：${target.exit_state ?? target.output_state ?? ""}
- 创作笔记：${target.notes ?? target.emotion_stage ?? ""}

本场出场人物（必须使用这些名字，不得替换）：
${sceneCharLines}${namesGuard}

已锁定世界规则（须遵守）：
${lockedRules}

时间线参考（最近事件）：
${lockedTimeline}

对白风格：${dialogueStyle}（自然主义=贴近生活；戏剧化=高张力；幽默=诙谐；诗意=抒情）
潜台词类型：${subtextType || "根据场景情感选择"}

请写本场完整的剧本格式文本，严格遵守：
- 第一行必须是场景头（slug line）：${slug}
- 动作描述左对齐段落，每段不超过 3 行，写画面而非感受
- 人物名单独成行${allowedNames.length > 0 ? `（只能从 ${allowedNames.join("、")} 中选）` : "（建议大写名字）"}，提示如「（停顿）」用括号
- 对白下一行接说话内容，不超过 3 行
- 对白不能解释性、说教式
- 潜台词：角色说 X 实际要 Y
- 场景结尾留一个悬而未决的张力点

用 JSON 格式输出：
{
  "script": "完整剧本文本（多行字符串，保留换行）",
  "subtext_map": [
    {"character": "角色名", "says": "表面说的", "means": "实际要的"}
  ],
  "emotion_arc": "情感弧描述",
  "end_hook": "结尾留下的问题/张力",
  "reasoning": "创作思路（简短）",
  "warnings": []
}`;

  return { system, user };
}

export function buildDiagnosisPrompt(projectContext) {
  const ctx = projectContext?.project ?? projectContext;
  const scenes = ctx?.scene_workbench?.scenes ?? ctx?.story_bible?.scene_cards ?? [];
  const characters = ctx?.character_hub?.characters ?? ctx?.story_bible?.characters ?? [];
  const cards = ctx?.plot_board?.cards ?? [];

  const system = `你是一位资深幕评师，专注于从整体视角诊断剧本结构、角色、场景和类型适配度。
${DRAMA_PRINCIPLES}`;

  const user = `${projectSummary(projectContext)}

项目数据摘要：
- 角色数量：${characters.length}
- 场景卡数量：${scenes.length}
- 剧情卡数量：${cards.length}

角色情况：
${charactersSummary(projectContext)}

结构情况：
${structureSummary(projectContext)}

请从以下5个维度进行专业诊断，每个维度给出1-10分和具体说明：

用JSON格式输出：
{
  "scores": {
    "story_structure": {"score": 0, "comment": ""},
    "character_development": {"score": 0, "comment": ""},
    "scene_tension": {"score": 0, "comment": ""},
    "dialogue_quality": {"score": 0, "comment": ""},
    "genre_fit": {"score": 0, "comment": ""}
  },
  "overall_score": 0,
  "critical_issues": [
    {"issue": "问题描述", "location": "出现在哪里", "fix": "修复建议"}
  ],
  "strengths": ["项目优势点"],
  "next_steps": ["优先改进建议"],
  "reasoning": "整体诊断思路",
  "warnings": []
}`;

  return { system, user };
}

// ── 长片新建流程 prompts ───────────────────────────────────────────────────

export function buildConceptPrompt(options) {
  const { genres = [], conceptHint = "", era = "", count = 3 } = options ?? {};
  const genreStr = genres.join("、") || "不限";

  const system = `你是一位专业故事开发顾问，擅长为长片项目提炼高概念、高差异化的故事点子。
字符串内部禁止使用英文双引号，用书名号《》代替。`;

  const user = `类型：${genreStr}
年代/背景：${era || "不限"}
创意方向：${conceptHint || "（开放，AI自由发挥）"}

请生成${count}个差异明显的故事概念，每个必须有独特的切入角度。

重要：JSON字符串内部禁止使用英文双引号，用《》代替。

输出JSON格式：
\`\`\`json
{
  "concepts": [
    {
      "title": "故事标题（4-10字，有画面感）",
      "hook": "一句话钩子（不超过35字，包含主角+处境+核心张力）",
      "core_conflict": "核心冲突（主角卡在什么两难困境中，内外双层）",
      "unique_angle": "独特视角（这个故事与同类型作品最不同的地方）"
    }
  ],
  "reasoning": "三个概念的差异化策略说明"
}
\`\`\``;

  return { system, user };
}

export function buildSynopsisPrompt(context, options) {
  const { genres = [], concept = {} } = context ?? {};
  const { count = 3 } = options ?? {};
  const genreStr = genres.join("、") || "不限";

  const system = `你是一位资深剧本开发编辑，擅长将故事概念扩展为多角度的故事梗概。
字符串内部禁止使用英文双引号，用书名号《》代替。`;

  const user = `类型：${genreStr}
故事概念：
  标题：${concept.title ?? ""}
  钩子：${concept.hook ?? ""}
  核心冲突：${concept.core_conflict ?? ""}
  独特视角：${concept.unique_angle ?? ""}

请生成${count}个不同叙事角度的故事梗概，每个150-250字。每个版本在叙事重点、切入角度或情感基调上要有明显差异。

重要：JSON字符串内部禁止使用英文双引号，用《》代替。

输出JSON格式：
\`\`\`json
{
  "synopses": [
    {
      "version_label": "版本标签（如《情感驱动版》《悬疑优先版》）",
      "narrative_angle": "叙事角度说明（一句话）",
      "summary": "故事梗概正文（150-250字，包含开端、发展、转折、结局方向）"
    }
  ],
  "reasoning": "各版本叙事策略差异说明"
}
\`\`\``;

  return { system, user };
}

export function buildSingleCharacterPrompt(context, existingChars, storyRole) {
  const { genres = [], concept = {}, synopsis = {} } = context ?? {};
  const genreStr = genres.join("、") || "不限";
  const roleLabels = { protagonist: "主角", antagonist: "对手", ally: "盟友", opponent_ally: "复杂盟友", supporting: "配角" };
  const roleLabel = roleLabels[storyRole] ?? storyRole;
  const existing = existingChars.map((c) => `${c.name}（${roleLabels[c.story_role] ?? c.story_role ?? ""}）`).join("、");

  const system = `你是一位人物设计师，为特定叙事位置创作完整的人物档案。
字符串内部禁止使用英文双引号，用书名号《》代替。`;

  const user = `类型：${genreStr}
概念：${concept.title ?? ""} — ${concept.hook ?? ""}
梗概：${synopsis.summary ?? ""}
已有角色（请勿重复）：${existing || "无"}
需要重新设计的角色位置：${roleLabel}

请为该位置设计一个全新的角色，性格与已有角色有明显区分。

重要：JSON字符串内部禁止使用英文双引号，用《》代替。

输出JSON格式：
\`\`\`json
{
  "character": {
    "name": "角色姓名",
    "story_role": "${storyRole}",
    "desire": "外部欲望",
    "need": "内在需求",
    "wound": "创伤或缺口",
    "arc_start": "故事开始时的状态",
    "arc_end": "故事结束时的状态"
  }
}
\`\`\``;

  return { system, user };
}

const ROLE_LABEL_MAP = { protagonist: "主角", antagonist: "对手", ally: "盟友", opponent_ally: "复杂盟友", supporting: "配角" };

const REFINE_FIELD_LABELS = {
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

export function buildRefineCharacterPrompt(context, character, lockedFields = []) {
  const { genres = [], concept = {}, synopsis = {} } = context ?? {};
  const genreStr = genres.join("、") || "不限";
  const roleLabel = ROLE_LABEL_MAP[character?.story_role] ?? character?.story_role ?? "";
  const lockedSet = new Set(Array.isArray(lockedFields) ? lockedFields : []);

  const renderValue = (key) => {
    const value = character?.[key];
    if (Array.isArray(value)) return value.join("、") || "（空）";
    return (value ?? "") === "" ? "（空）" : String(value);
  };

  const lockedSummary = [...lockedSet]
    .filter((key) => REFINE_FIELD_LABELS[key])
    .map((key) => `- ${REFINE_FIELD_LABELS[key]}：${renderValue(key)}`)
    .join("\n") || "（无锁定项，所有字段均可修正）";

  const editableKeys = Object.keys(REFINE_FIELD_LABELS).filter((key) => !lockedSet.has(key));
  const editableSummary = editableKeys
    .map((key) => `- ${REFINE_FIELD_LABELS[key]}：${renderValue(key)}`)
    .join("\n") || "（无可修正字段）";

  const system = `你是一位资深人物设计师，负责优化现有角色档案。
必须严格遵守"锁定字段"的原值：绝对不能改写锁定字段。
仅允许修改未锁定字段，同时保持人物整体一致性与戏剧逻辑。
字符串内部禁止使用英文双引号，用书名号《》代替。`;

  const user = `类型：${genreStr}
概念：${concept.title ?? ""} — ${concept.hook ?? ""}
梗概：${synopsis.summary ?? ""}
角色定位：${roleLabel}

【锁定字段（必须保持原值，禁止改动）】
${lockedSummary}

【可修正字段（请重新设计或优化这些字段，使人物更立体、冲突更鲜明、弧光更清晰）】
${editableSummary}

要求：
1. 锁定字段的值在输出中必须与上文完全一致。
2. 可修正字段应整体连贯：动机、矛盾、弧光与锁定部分保持一致性。
3. 若锁定字段已经暗示了某些设定，请让未锁定字段服务于这个设定。
4. 避免空洞套话，优先写出具体、可拍的细节。

重要：JSON字符串内部禁止使用英文双引号，用《》代替。

输出JSON格式：
\`\`\`json
{
  "character": {
    "name": "${character?.name ?? ""}",
    "story_role": "${character?.story_role ?? "supporting"}",
    "external_goal": "外部目标",
    "dramatic_need": "内部需要",
    "contradiction": "核心矛盾",
    "pressure_point": "压力点",
    "secret": "秘密",
    "notes": "备注",
    "starting_mask": "人物表层",
    "arc_start": "弧光起点",
    "arc_end": "弧光终点",
    "traits": ["特质1", "特质2"],
    "mbti": "MBTI 类型（格式：CODE-中文名，如 INTJ-建筑师）",
    "core_drive": "需求上限（如：尊重需求（成就/地位）——表示此角色追求的最高层需求，该层及以下都驱动其行为）"
  },
  "reasoning": "改动说明：解释未锁定字段为何这样设计"
}
\`\`\``;

  return { system, user };
}

export function buildKeyScenesPrompt(context) {
  const { genres = [], concept = {}, synopsis = {}, characters = [] } = context ?? {};
  const genreStr = genres.join("、") || "不限";
  const charNames = characters.map((c) => `${c.name}（${c.story_role ?? c.role ?? ""}）`).join("、");

  const system = `你是一位专业故事结构师，擅长从故事梗概中提炼推动叙事的关键戏剧节点。
关键剧情点是结构锚点，不是具体场景，关注的是"发生了什么重大改变"而非"在哪里如何拍"。
字符串内部禁止使用英文双引号，用书名号《》代替。`;

  const user = `类型：${genreStr}
故事概念：${concept.title ?? ""} — ${concept.hook ?? ""}
梗概：${synopsis.summary ?? ""}
主要角色：${charNames || "待定"}

请提炼8-12个对故事至关重要的关键剧情点，覆盖三幕结构的各阶段（开端/激励事件/中点/黑暗时刻/高潮/尾声等）。

重要：JSON字符串内部禁止使用英文双引号，用《》代替。

输出JSON格式（字段必须齐全，全部填实，不能空字符串）：
\`\`\`json
{
  "scenes": [
    {
      "id": "plot_1",
      "title": "剧情节点名称（一句话概括这个转折）",
      "act_position": "act_1 / act_2a / act_2b / act_3 之一",
      "dramatic_function": "叙事功能（如：诱发事件、锁定点、中点翻转、最低谷、高潮决战）",
      "location": "具体场景地点（如：刑警队办公室、陆沉公寓厨房、雨夜废弃码头）",
      "time_of_day": "时段（黎明/清晨/上午/正午/午后/黄昏/夜晚/深夜）",
      "goal": "本场主角想达成的目的",
      "obstacle": "阻碍：人/事/内心冲突",
      "turn": "戏剧转折：发生了什么不可逆的改变",
      "core_event": "核心事件：可拍摄的具体动作",
      "character_change": "角色状态变化：从什么状态变成什么状态"
    }
  ],
  "reasoning": "剧情点选取策略说明"
}
\`\`\`

每个字段都要填实，location 不能写《待定》，time_of_day 不能写《不限》。`;

  return { system, user };
}

export function buildActStructurePrompt(context) {
  const { genres = [], concept = {}, synopsis = {}, characters = [], scenes = [] } = context ?? {};
  const genreStr = genres.join("、") || "不限";
  const sceneList = scenes.map((s, i) => `${i + 1}. [${s.act_position ?? ""}] ${s.title ?? ""}`).join("\n");

  const system = `你是一位结构大师，擅长将故事素材整合为清晰的三幕结构。
字符串内部禁止使用英文双引号，用书名号《》代替。`;

  const user = `类型：${genreStr}
故事概念：${concept.title ?? ""} — ${concept.hook ?? ""}
梗概：${synopsis.summary ?? ""}
已选关键场景：
${sceneList || "（待定）"}

请生成三幕结构，每幕包含3-5个主要节拍。

重要：JSON字符串内部禁止使用英文双引号，用《》代替。

输出JSON格式：
\`\`\`json
{
  "acts": [
    {
      "act_name": "第一幕：建置",
      "percentage_range": "0%-25%",
      "beats": [
        {
          "name": "节拍名称",
          "description": "具体发生什么（可拍摄的画面和动作）",
          "timing": "约10%"
        }
      ]
    }
  ],
  "reasoning": "结构设计思路"
}
\`\`\``;

  return { system, user };
}

export function buildPulsePrompt(options) {
  const { creativeTarget = "", mode = "经典", genre = "" } = options ?? {};

  const modeGuide = {
    "经典": "严格遵循类型片逻辑。因果明确，情感共鸣强，结构扎实。创新体现在微调上，不打破类型契约。",
    "离谱": "允许高熵碰撞。引入1个意外变量（错位时空、颠覆身份、反常道具），打破预期，制造独特卖点。",
    "混沌": "彻底实验性创作。放弃线性逻辑，追求极致视角冲击。允许非常规叙事结构和颠覆性主题立场。"
  };

  const system = `你是"脉动"剧情创意系统，由四个专家模块组成的智囊团。
你的任务是产出高差异化的创意种子，供编剧选择后进入结构化开发。

四个专家模块：
- 类型守望者：确保创意符合所选类型的核心价值，提供核心冲突点
- 钩子设计师：设计极具吸引力的一句话卖点或高概念设定
- 变量干扰员：针对平庸点子置换一个核心变量（时间/身份/关键道具/关系）
- 困境模拟器：模拟观众视角，指出创意中可能的逻辑疲态或情感空洞

运行规则：
- 每个种子必须≤150字
- 禁止生成套路化开场（"某人某天突然…"类型）
- 即便在经典模式，也必须有1个新鲜视角`;

  const user = `创意目标：${creativeTarget || "（开放式，由AI自由发挥）"}
类型方向：${genre || "不限"}
运行模式：${mode} — ${modeGuide[mode] ?? modeGuide["经典"]}

请用四个专家模块协同，产出3个差异明显的创意种子。

重要：JSON字符串内部禁止使用英文双引号，用书名号《》或中文引号「」代替。

输出格式为JSON：
\`\`\`json
{
  "seeds": [
    {
      "title": "种子标题（4-8字，有画面感）",
      "hook": "一句话卖点（不超过30字，钩子设计师出品，内部引用用《》）",
      "core_conflict": "核心冲突点（类型守望者：主角卡在什么两难处境）",
      "twist": "变量置换建议（变量干扰员：把哪个变量换成什么）",
      "weakness": "潜在风险提示（困境模拟器：哪里容易让观众出戏）"
    }
  ],
  "reasoning": "三个种子的差异化策略说明"
}
\`\`\``;

  return { system, user };
}

// ── Linda Seger 评分系统 ─────────────────────────────────────────────────────

// 评估提示词说明：
// - 用示例数值代替中文描述，确保 Claude 输出可解析的 JSON
// - 明确要求"只输出 JSON"，防止 Claude 加前缀说明文字
// - 评分参考：普通 AI 输出约 60-75 分，优秀约 80-90 分

export function buildEvaluateConceptsPrompt(concepts, context) {
  const genres = (context.genres ?? []).join('、');
  const hint = context.conceptHint ?? '';
  const list = concepts.map((c, i) =>
    `[${i}] 《${c.title ?? ''}》\n  钩子：${c.hook ?? ''}\n  冲突：${c.core_conflict ?? ''}\n  独特性：${c.unique_angle ?? ''}`
  ).join('\n\n');

  const system = `你是专业剧本顾问，负责从多个概念方案中选出最具商业潜力的一个，并给出100分制的客观评分。你只输出JSON，不输出任何其他内容。`;

  const user = `从以下${concepts.length}个故事概念中选出最佳方案，给出评分。

类型：${genres || '不限'}${hint ? '\n创意方向：' + hint : ''}

${list}

评分维度（各25分）：
① 独特性——角度是否新鲜、与同类型区隔是否明显
② 冲突清晰度——内外冲突是否同时成立、戏剧张力是否充足
③ 主角动机——情感驱动力是否真实可信
④ 钩子力度——能否让观众产生"非看不可"的迫切感

评分参考：50=平庸、65=还行、75=不错、85=很好、90+=优秀

只输出下面这个JSON格式（将数字替换为实际评分，best_idx为0-based索引）：
{"best_idx":0,"score":75,"d1":18,"d2":19,"d3":18,"d4":20,"feedback":"评价一句话"}`;

  return { system, user };
}

export function buildEvaluateSynopsisPrompt(synopses, context) {
  const genres = (context.genres ?? []).join('、');
  const concept = context.concept ?? {};
  const list = synopses.map((s, i) =>
    `[${i}] ${s.version_label ?? `版本${i + 1}`}：${s.summary ?? ''}`
  ).join('\n\n');

  const system = `你是专业剧本顾问，负责评估故事梗概的叙事质量，选出最佳版本并给出100分制客观评分。你只输出JSON，不输出任何其他内容。`;

  const user = `从以下${synopses.length}个梗概版本中选出最佳，给出评分。

类型：${genres || '不限'}
概念：《${concept.title ?? ''}》——${concept.hook ?? ''}

${list}

评分维度（各25分）：
① 三幕结构——激励事件/中点/最低谷/高潮是否清晰
② 角色弧光——主角转变轨迹是否可信
③ 戏剧张力——升级感是否清晰、情感驱动是否充足
④ 主题深度——核心问题是否超越表面情节

评分参考：50=平庸、65=还行、75=不错、85=很好、90+=优秀

只输出下面这个JSON格式：
{"best_idx":0,"score":75,"d1":18,"d2":19,"d3":18,"d4":20,"feedback":"评价一句话"}`;

  return { system, user };
}

export function buildEvaluateCharactersPrompt(characters, context) {
  const genres = (context.genres ?? []).join('、');
  const synopsis = context.synopsis?.summary?.slice(0, 150) ?? '';
  const list = characters.map((c, i) =>
    `[${i + 1}] ${c.name ?? ''}（${c.story_role ?? ''}）欲望：${c.desire ?? ''} | 创伤：${c.wound ?? ''} | 弧光：${c.arc_start ?? ''}→${c.arc_end ?? ''}`
  ).join('\n');

  const system = `你是专业剧本顾问，负责评估角色设计的心理深度与戏剧功能，给出100分制客观评分。你只输出JSON，不输出任何其他内容。`;

  const user = `评估以下角色设计的整体质量。

类型：${genres || '不限'}${synopsis ? '\n梗概：' + synopsis : ''}

${list}

评分维度（各25分）：
① 欲望与需求的张力——表层目标与深层成长需求是否形成内在冲突
② 创伤真实性——创伤是否真正解释角色行为、是否具有情感说服力
③ 弧光完整性——成长轨迹是否清晰、转变是否有内在逻辑
④ 角色间张力——主要角色之间是否有内置碰撞关系

评分参考：50=平庸、65=还行、75=不错、85=很好、90+=优秀

只输出下面这个JSON格式：
{"score":75,"d1":18,"d2":19,"d3":18,"d4":20,"feedback":"评价一句话"}`;

  return { system, user };
}

export function buildEvaluateKeyScenesPrompt(scenes, context) {
  const synopsis = context.synopsis?.summary?.slice(0, 100) ?? '';
  const topScenes = Array.isArray(scenes) ? scenes.slice(0, 6) : [];
  const list = topScenes.map((s, i) =>
    `[${i + 1}] ${(s.title ?? '').slice(0, 20)}（${s.act_position ?? ''}）目标：${(s.goal ?? s.scene_goal ?? '').slice(0, 30)} | 冲突：${(s.conflict ?? '').slice(0, 30)}`
  ).join('\n');

  const system = `你是专业剧本顾问，负责评估关键剧情节点的戏剧质量与结构完整性，给出100分制客观评分。你只输出JSON，不输出任何其他内容。`;

  const user = `评估以下关键场景设计的整体质量。
${synopsis ? '\n梗概：' + synopsis : ''}

${list}

评分维度（各25分）：
① 场景结构——每场目标-冲突-转折是否清晰
② 三幕覆盖——激励事件/中点/最低谷/高潮是否都有对应场景
③ 情感升级——每场是否让处境更难、观众更紧张
④ 转折力度——场景转折是否真正改变故事走向

评分参考：50=平庸、65=还行、75=不错、85=很好、90+=优秀

只输出下面这个JSON格式：
{"score":75,"d1":18,"d2":19,"d3":18,"d4":20,"feedback":"评价一句话"}`;

  return { system, user };
}

export function buildEvaluateActStructurePrompt(actStructure, context) {
  const acts = actStructure.acts ?? [];
  const list = acts.map(a =>
    `${a.act_name ?? ''}（${a.percentage_range ?? ''}）：${(a.beats ?? []).map(b => `${b.name ?? ''}[${b.timing ?? ''}]`).join('、')}`
  ).join('\n');

  const system = `你是专业剧本顾问，负责评估幕结构设计的专业质量，给出100分制客观评分。你只输出JSON，不输出任何其他内容。`;

  const user = `评估以下幕结构设计。

概念：《${context.concept?.title ?? ''}》${context.synopsis?.summary ? '\n梗概：' + context.synopsis.summary.slice(0, 120) : ''}

${list || '（无幕结构数据）'}

评分维度（各25分）：
① 三幕比例——第一幕≤25%、第二幕≈50%、第三幕≥20%
② 转折点完整性——激励事件/中点/第二转折/高潮是否齐全
③ 节拍分布——各幕节拍密度是否合理、有无结构漏洞
④ 主题收束——高潮结局是否有力呼应第一幕的核心问题

评分参考：50=平庸、65=还行、75=不错、85=很好、90+=优秀

只输出下面这个JSON格式：
{"score":75,"d1":18,"d2":19,"d3":18,"d4":20,"feedback":"评价一句话"}`;

  return { system, user };
}

export function buildActNodesPrompt(projectCtx, actTitle, actPurpose, nodes) {
  // 兼容两种调用格式：
  //   创建流程: projectCtx.project = { project: draft, ... }
  //   工作台:   projectCtx.project = { title, logline, ... } (直接元数据)
  const meta = projectCtx?.project?.project ?? projectCtx?.project ?? {};
  const sc   = projectCtx?.story_core ?? projectCtx?.project?.story_core ?? {};
  const ia   = projectCtx?.intent_anchor ?? projectCtx?.project?.intent_anchor ?? {};
  const sb   = projectCtx?.story_bible ?? projectCtx?.project?.story_bible ?? {};

  const title        = meta?.title ?? "未命名项目";
  const logline      = meta?.logline ?? sc?.premise ?? "";
  const coreConflict = sb?.core_conflict ?? sc?.core_conflict ?? "";
  const protagonist  = ia?.protagonist ?? "";
  const theme        = ia?.theme ?? sc?.theme_statement ?? "";

  // 提取角色信息
  const charHub = projectCtx?.character_hub ?? projectCtx?.project?.character_hub ?? {};
  const bibChars = sb?.characters ?? [];
  const hubChars = charHub?.characters ?? [];
  const allChars = hubChars.length > 0 ? hubChars : bibChars;
  const charLines = allChars.filter((c) => c && c.name).slice(0, 4).map((c) => {
    const goal = c.external_goal ?? c.external_want ?? c.desire ?? "";
    const need = c.dramatic_need ?? c.internal_need ?? c.need ?? "";
    return `- ${c.name}（${c.story_role ?? ""}）：目标=${goal}；需求=${need}`;
  }).join("\n");

  const nodeList = nodes.map(([nodeType, , nodeTitle]) =>
    `- ${nodeTitle}（${nodeType}）`
  ).join("\n");

  const system = `你是一位好莱坞专业编剧顾问，擅长根据故事具体信息为每个叙事节点提炼实际发生的情节。
严格要求：
- story_title：不超过12字，必须用本故事的真实人物名+具体行动命名，禁止任何框架术语（如"开场""诱因""转折""建立""危机"等）
- summary：80-120字，写本故事这个情节点中真实发生的核心事件——具体人物做了什么、发生了什么冲突、造成了什么后果
- value_shift：本故事在这个节点的具体价值转变（McKee原则）
如果没有足够的故事信息，宁可根据logline和核心冲突合理推演，也不要使用通用模板描述。`;

  const user = `故事信息：
标题：${title}
一句话概念：${logline || "待定"}
核心冲突：${coreConflict || "待定"}
主角：${protagonist || "待定"}
主题：${theme || "待定"}
${charLines ? `\n主要角色：\n${charLines}` : ""}

当前幕：${actTitle}
此幕叙事目的：${actPurpose}

需要生成的节点（括号内是结构框架类型，仅供定位参考，story_title 和 summary 必须写本故事的具体情节，不能照抄框架术语）：
${nodeList}

请为每个节点生成内容，以 JSON 格式返回：

\`\`\`json
{
  "nodes": {
    "节点type": {
      "story_title": "本故事角色+具体行动（≤12字）",
      "summary": "80-120字，本故事在此节点真实发生的事件",
      "value_shift": "从X→到Y（本故事具体的价值转变）"
    }
  }
}
\`\`\`

节点type即括号内的英文id。严格按JSON格式输出，不要其他内容。`;

  return { system, user };
}

// ── 关系网（含权力/历史/隐情） ────────────────────────────────────────
export function buildRelationshipsPrompt(context, options) {
  const { characters = [], concept = {}, synopsis = {} } = context ?? {};
  const charList = characters.map((c, i) => `${i+1}. ${c.name}（${c.story_role ?? "supporting"}）— ${c.archetype ?? c.public_mask ?? ""}`).join("\n");

  const system = `你是关系网设计师，擅长为剧本设计富有戏剧张力的人物关系。
字符串内部禁止使用英文双引号，用书名号《》代替。`;

  const user = `项目概念：${concept.title ?? ""} — ${concept.hook ?? ""}
${synopsis.summary ? `梗概：${synopsis.summary}\n` : ""}
角色名单：
${charList}

请为这些角色之间设计 3-6 条关键关系（不一定每两人都要有，挑最有戏剧张力的）。

输出JSON格式（每个字段都要填实）：
\`\`\`json
{
  "relationships": [
    {
      "source_character_name": "源角色名（必须用上方名单中的名字）",
      "target_character_name": "目标角色名",
      "relationship_type": "从以下选项选择最贴切的一项：三角恋情 / 假面情侣 / 强制婚约 / 博得芳心 / 单向爱意 / 手足战友 / 师徒传承 / 强力对手 / 左膀右臂 / 暴躁上司 / 反目旧友 / 归来宿敌 / 大家长式 （或自定义中文名称）",
      "tension": "核心张力：他们之间最戏剧性的矛盾点（一句话）",
      "power_balance": "权力关系：谁掌握主动权，为什么；权力会如何在故事中翻转",
      "shared_history": "共同过去：他们以前发生过什么，留下了什么羁绊或心结",
      "hidden_information": "隐情：一方对另一方隐瞒的关键事实（推动悬念）"
    }
  ],
  "reasoning": "关系设计思路"
}
\`\`\`

每个字段都要填实，禁止空字符串。`;

  return { system, user };
}

// ── 世界规则（5-8 条） ────────────────────────────────────────────
export function buildWorldRulesPrompt(context) {
  const { genres = [], concept = {}, synopsis = {} } = context ?? {};

  const system = `你是世界观架构师，擅长提炼独特、可被打破的世界规则。
字符串内部禁止使用英文双引号，用书名号《》代替。`;

  const user = `类型：${genres.join("、") || "不限"}
概念：${concept.title ?? ""} — ${concept.hook ?? ""}
${synopsis.summary ? `梗概：${synopsis.summary}\n` : ""}

请为这个故事提炼 5-8 条「世界规则」——这部作品独有的运行法则、社会规范、超自然约束或行业潜规则。
好的世界规则应当：① 可被打破（违反时产生戏剧）② 影响主角决策 ③ 区别于普通现实

输出JSON格式（每个字段都要填实）：
\`\`\`json
{
  "world_rules": [
    {
      "rule_statement": "规则陈述：一句话说清楚这条规则是什么",
      "rule_level": "natural / social / supernatural / institutional 之一",
      "scope": "适用范围：什么人、什么场合受这条规则约束",
      "exceptions": ["例外情形 1", "例外情形 2"],
      "evidence": ["故事中能体现这条规则的具体场景或对白线索"]
    }
  ],
  "reasoning": "为什么这些规则能驱动这个故事的戏剧张力"
}
\`\`\`

每条规则都要填实 exceptions 和 evidence 数组（至少 1 项）。`;

  return { system, user };
}

// ── 时间线事件（剧情前 + 剧情中关键时间锚点） ────────────────────
export function buildTimelineEventsPrompt(context) {
  const { concept = {}, synopsis = {}, characters = [] } = context ?? {};
  const protagonist = characters[0]?.name ?? "主角";

  const system = `你是剧本时间线设计师，擅长梳理故事中的关键时间事件。
字符串内部禁止使用英文双引号，用书名号《》代替。`;

  const user = `概念：${concept.title ?? ""} — ${concept.hook ?? ""}
${synopsis.summary ? `梗概：${synopsis.summary}\n` : ""}
主角：${protagonist}

请为这个故事整理 6-10 条关键时间线事件，覆盖：
- 剧情开始前的「前史事件」（造就主角现状的过去）
- 剧情中的关键时间锚点（主线推进的节点）

输出JSON格式（每个字段都要填实）：
\`\`\`json
{
  "timeline_events": [
    {
      "story_day": "时间标签（如：剧情前 12 年 / 第 1 天 / 第 7 天 / 剧情后 1 月 等）",
      "sequence_index": 1,
      "summary": "事件梗概：发生了什么",
      "participants": ["参与角色名 1", "参与角色名 2"],
      "location": "发生地点",
      "trigger": "诱因：什么促成了这件事",
      "consequence": "后果：这件事改变了什么，为后续埋下了什么"
    }
  ],
  "reasoning": "时间线整体逻辑说明"
}
\`\`\`

sequence_index 从 1 起按时间顺序递增。每个字段都要填实。`;

  return { system, user };
}

// ── 伏笔/回收（setup-payoff 对） ────────────────────────────────
export function buildSetupPayoffsPrompt(context) {
  const { concept = {}, synopsis = {}, scenes = [] } = context ?? {};
  const sceneTitles = scenes.slice(0, 12).map((s, i) => `${i+1}. ${s.title ?? ""}`).join("\n");

  const system = `你是叙事密度专家，擅长设计前后呼应的伏笔与回收。
字符串内部禁止使用英文双引号，用书名号《》代替。`;

  const user = `概念：${concept.title ?? ""} — ${concept.hook ?? ""}
${synopsis.summary ? `梗概：${synopsis.summary}\n` : ""}
${sceneTitles ? `已有关键场景：\n${sceneTitles}\n` : ""}

请为这个故事设计 4-6 组「伏笔—回收」（setup-payoff）。每组都要：
- setup 在故事前段不动声色地埋下（看似无关、容易被忽略）
- payoff 在中后段以惊喜方式回收（让观众恍然大悟）

输出JSON格式（每个字段都要填实）：
\`\`\`json
{
  "setup_payoffs": [
    {
      "setup_summary": "伏笔：早期某一刻发生/出现的细节（必须具体可拍摄）",
      "expected_payoff_window": "回收时机（如：中点附近 / 第三幕 / 高潮 等）",
      "status": "planned",
      "payoff_summary": "回收：这个伏笔最终在哪一刻、以什么方式被激活，让观众恍然大悟"
    }
  ],
  "reasoning": "伏笔/回收整体策略说明"
}
\`\`\`

每个字段都要填实。`;

  return { system, user };
}
