import { genreTagsOf, projectSummary, DRAMA_PRINCIPLES } from "./shared.js";
import { buildGenreBlendContract } from "../../shared/genreContract.js";

export function buildLoglinePrompt(projectContext, options) {
  const { keywords = "", genre = "", style = [], avoid = [], count = 3 } = options ?? {};
  const blendContract = buildGenreBlendContract(genreTagsOf(projectContext, genre), "full");
  const genreInfo = blendContract ? `\n${blendContract}\n` : "";

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

// ── 长片新建流程 prompts ───────────────────────────────────────────────────

export function buildConceptPrompt(options) {
  const { genres = [], conceptHint = "", era = "", count = 3 } = options ?? {};
  const genreStr = genres.join("、") || "不限";
  const blendContract = buildGenreBlendContract(genres, "full");

  const system = `你是一位专业故事开发顾问，擅长为长片项目提炼高概念、高差异化的故事点子。
字符串内部禁止使用英文双引号，用书名号《》代替。`;

  const user = `类型：${genreStr}
年代/背景：${era || "不限"}
创意方向：${conceptHint || "（开放，AI自由发挥）"}
${blendContract ? `\n${blendContract}\n（概念必须天然长在主导类型的观众承诺上；若是混合类型，钩子里要能同时听见两种类型的声音，而不是 A 类型故事贴 B 类型标签）\n` : ""}

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

// ── 片名（手写 logline 未起名时用） ─────────────────────────────
export function buildTitlePrompt(context) {
  const { genres = [], logline = "", format = "feature" } = context ?? {};
  const formatNames = { feature: "电影长片", series: "连续剧", micro_drama: "微短剧", pilot: "试播集", short: "短片" };
  const system = `你是资深剧名策划，擅长为影视项目起有市场辨识度的片名。只输出JSON。`;
  const user = `作品形态：${formatNames[format] ?? format}
题材：${genres.join("、") || "不限"}
一句话概念：${logline}

请起 1 个最贴切的中文片名：2-8 字，有类型感和悬念，不剧透结局，禁止使用书名号和引号。

输出JSON格式：
{ "title": "片名" }`;
  return { system, user };
}
