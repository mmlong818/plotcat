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

用JSON格式输出：
{
  "characters": [
    {
      "name": "角色名",
      "story_role": "protagonist/antagonist/supporting/ally",
      "archetype": "角色原型",
      "desire": "表层欲望（外部目标，具体可见）",
      "need": "深层需求（内部成长，自己未必意识到）",
      "wound": "核心创伤（是什么让他变成这样）",
      "belief": "错误信念（他以为什么是真的，其实是枷锁）",
      "arc_start": "弧光起点（开始时的状态）",
      "arc_end": "弧光终点（结束时的改变）",
      "relationship_hook": "与其他角色的关系动力（什么让他们必然碰撞）",
      "voice_signature": "说话方式特征（一句话描述他的对白风格）"
    }
  ],
  "relationship_tensions": ["角色间的核心张力点"],
  "reasoning": "角色设计思路",
  "warnings": []
}`;

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
