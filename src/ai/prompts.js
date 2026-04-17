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

输出JSON格式：
\`\`\`json
{
  "scenes": [
    {
      "id": "plot_1",
      "title": "剧情节点名称（一句话概括这个转折）",
      "dramatic_function": "叙事功能（如：诱发事件、锁定点、中点翻转、最低谷、高潮决战）",
      "core_event": "核心事件：发生了什么，造成了什么不可逆的改变",
      "character_change": "角色状态变化：谁从什么状态变成了什么状态"
    }
  ],
  "reasoning": "剧情点选取策略说明"
}
\`\`\``;

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
  const charLines = allChars.slice(0, 4).map((c) => {
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
