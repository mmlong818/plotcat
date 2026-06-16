import { genreTagsOf, projectSummary, charactersSummary, DRAMA_PRINCIPLES, ROLE_LABEL_MAP, REFINE_FIELD_LABELS } from "./shared.js";
import { buildGenreBlendContract } from "../../shared/genreContract.js";

export function buildCharactersPrompt(projectContext, options) {
  const { count = 3, focusRole = "", theme = "" } = options ?? {};
  const ctx = projectContext?.project ?? projectContext;
  const treatment = ctx?.story_core?.premise ?? ctx?.project?.logline ?? "";
  const existingChars = charactersSummary(projectContext);
  const blendContract = buildGenreBlendContract(genreTagsOf(projectContext), "full");

  const system = `你是一位专业人物设计师，擅长创造有欲望、需求、创伤和内置弧光的立体角色。
${DRAMA_PRINCIPLES}`;

  const user = `${projectSummary(projectContext)}
${blendContract ? `\n${blendContract}\n（人物设计必须服务主导类型的观众承诺；若有调味类型，至少一个主要角色要成为它的载体）\n` : ""}
【独立命题纪律】每个主要角色（尤其主角与情感对象）的 external_want 必须包含一个与对方无关的人生命题——事业、信念、未竟之事、自我证明。两个人除了彼此没有别的人生，是审片人一票否决的角色空心化；关系是两条完整人生的相交，不是两个半人的拼合。

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
    "archetype": "角色原型",
    "external_want": "表层欲望（外部目标，具体可见）",
    "internal_need": "深层需求（内在成长）",
    "wound": "核心创伤（具体事件）",
    "arc_start": "故事开始时的状态",
    "arc_end": "故事结束时的状态"
  }
}
\`\`\``;

  return { system, user };
}

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

  const userSelectedTraits = Array.isArray(character?.traits)
    ? character.traits.filter((t) => t && String(t).trim())
    : [];
  const hasTraitDirection = userSelectedTraits.length > 0 && !lockedSet.has("traits");
  const traitDirectionBlock = hasTraitDirection
    ? `\n【用户给定的性格方向（重要锚点）】
用户已经选定了以下性格特质，作为本次修正的方向：${userSelectedTraits.join("、")}
- 必须保留这些特质（输出 traits 数组时包含全部）；可以补充 1-2 个与之兼容的新特质，但不要替换或删除已选项。
- 其他字段（动机/秘密/弧光/MBTI/核心驱动等）必须呼应这些特质——例如「炮仗脾气」应在压力点 / 矛盾中体现，「业精于勤」应反映在外部目标 / 弧光起点的能力基线上。
- 不要写出与已选特质矛盾的内容。`
    : `\n【性格方向】
用户未指定性格特质方向。请根据角色定位与现有字段自由判断 3-6 个最契合的特质。`;

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
${traitDirectionBlock}

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

export function buildEvaluateCharactersPrompt(characters, context) {
  const genres = (context.genres ?? []).join('、');
  const synopsis = context.synopsis?.summary?.slice(0, 150) ?? '';
  const list = characters.map((c, i) =>
    `[${i + 1}] ${c.name ?? ''}（${c.story_role ?? ''}）欲望：${c.external_want ?? c.desire ?? ''} | 创伤：${c.wound ?? ''} | 弧光：${c.arc_start ?? ''}→${c.arc_end ?? ''}`
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
