import { genreTagsOf, seriesBlocksOf, projectSummary, charactersSummary, structureSummary, DRAMA_PRINCIPLES } from "./shared.js";
import { buildGenreBlendContract } from "../../shared/genreContract.js";

export function buildBeatSheetPrompt(projectContext, options, _genreData, beatData) {
  const { template = "save_the_cat", genre = "" } = options ?? {};
  const frameworkInfo = beatData ? Object.entries(beatData).map(([key, beat]) => {
    return `- ${beat.name ?? key}（${beat.percentage ?? ""}）：${beat.ai_instruction ?? beat.description ?? ""}`;
  }).join("\n") : "（使用经典节拍框架）";
  const blendContract = buildGenreBlendContract(genreTagsOf(projectContext, genre), "full");

  const system = `你是一位结构大师，专注于将Treatment精确映射到节拍框架，让每个节拍都有情感驱动力。
${DRAMA_PRINCIPLES}`;

  const user = `${projectSummary(projectContext)}
${blendContract ? `\n${blendContract}\n（节拍映射必须覆盖主导类型的全部必备场景——每个必备场景至少对应一个节拍）\n` : ""}
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

  const blendContract = buildGenreBlendContract(genreTagsOf(projectCtx, Array.isArray(meta?.genre) ? meta.genre.join("、") : meta?.genre), "full");
  const actSeries = seriesBlocksOf(projectCtx);
  const actWorldRules = [actSeries.rules, (projectCtx?.lock_layer?.projections?.world_rules ?? projectCtx?.story_bible?.world_rules ?? [])
    .map((r) => `- ${r.rule_statement ?? ""}`).filter((l) => l.length > 2).join("\n")].filter(Boolean).join("\n");

  const system = `你是一位好莱坞专业编剧顾问，擅长根据故事具体信息为每个叙事节点提炼实际发生的情节。
严格要求：
- story_title：不超过12字，必须用本故事的真实人物名+具体行动命名，禁止任何框架术语（如"开场""诱因""转折""建立""危机"等）
- summary：80-120字，写本故事这个情节点中真实发生的核心事件——具体人物做了什么、发生了什么冲突、造成了什么后果
- value_shift：本故事在这个节点的具体价值转变（McKee原则）
- 人物名纪律：若下方提供了主要角色名单，story_title 和 summary 中出现的人物必须严格使用名单中的名字，禁止另造新名字（一次性路人除外）
如果没有足够的故事信息，宁可根据logline和核心冲突合理推演，也不要使用通用模板描述。`;

  const user = `故事信息：
标题：${title}
一句话概念：${logline || "待定"}
核心冲突：${coreConflict || "待定"}
主角：${protagonist || "待定"}
主题：${theme || "待定"}
${charLines ? `\n主要角色：\n${charLines}` : ""}
${blendContract ? `\n${blendContract}\n（本幕节点的情节提炼必须落在主导类型的必备场景轨道上；调味类型用于给情节加肌理，不改骨架）\n` : ""}${actWorldRules ? `\n世界规则（情节不得违反）：\n${actWorldRules}\n` : ""}
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
