// ── 连续性提炼：从剧情卡与场景表中提炼伏笔追踪与时间线，回填资料库 ──────────
export function buildContinuityExtractionPrompt(projectContext) {
  const ctx = (projectContext?.scene_workbench || projectContext?.story_bible) ? projectContext : (projectContext?.project ?? projectContext);
  const cards = (ctx?.plot_board?.cards ?? []).filter((c) => !c.deleted_at);
  const scenes = (ctx?.scene_workbench?.scenes ?? []).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const characters = ctx?.character_hub?.characters ?? [];

  const cardLines = cards.map((c, i) => `[卡 ${i + 1}] ${c.title}：${c.summary || ""}`).join("\n");
  const ID_HINT_RE = /[A-Za-z]{1,4}[-—]?\d{2,}|\d{3,}号|编号|工号|警号|案号|档案号/;
  const sceneLines = scenes.map((s) => {
    const meta = `第 ${s.order_index} 场《${s.title}》｜${s.location || "?"}·${s.time_of_day || "?"}｜${s.purpose || ""}${s.beat_summary ? `｜转折：${s.beat_summary}` : ""}`;
    // 编号/专名几乎只活在正文里：抽出含编号特征的行供专名连戏表提炼
    const idLines = String(s.script_full || "").split(/\r?\n/)
      .filter((l) => ID_HINT_RE.test(l))
      .slice(0, 4)
      .map((l) => l.trim().slice(0, 60));
    return idLines.length ? `${meta}\n  [编号线索] ${idLines.join("；")}` : meta;
  }).join("\n");
  const charLines = characters.slice(0, 8).map((c) => `- ${c.name}`).join("\n");

  const system = `你是剧本连续性管理（script supervisor）专家。任务：通读全片剧情卡与场景表，提炼出
1) 伏笔追踪表：在前文埋设、需要在后文回收的具体物件/信息/行为（如一枚纽扣、一段录音、一句承诺）
2) 故事内时间线：按故事内时间（第 N 天）排列的关键事件
3) 专名连戏表：全片必须一字不差保持一致的专有名词与编号——人物工号/警号、案件/档案编号、关键物件型号、机构与地名全称。同一事物若已出现多个版本，选最早出现的版本为正典，并在 note 里指出冲突场次
只提炼文本中真实存在的内容，禁止虚构；人物名严格使用角色名单。`;

  const user = `项目：${ctx?.project?.title ?? ""}（${ctx?.project?.logline ?? ""}）

角色名单：
${charLines}

剧情卡：
${cardLines}

场景表（放映顺序）：
${sceneLines}

JSON 输出（伏笔 3-8 组、时间线 5-12 条）：
{
  "setup_payoffs": [
    {
      "setup_summary": "埋了什么（具体物件/信息，≤30 字）",
      "setup_scene_order": 埋设场次序号(数字),
      "expected_payoff_window": "预期回收位置（如：第三幕对峙）",
      "payoff_scene_order": 回收场次序号(数字，未回收填 0),
      "payoff_summary": "如何回收（≤30 字，未回收留空）"
    }
  ],
  "timeline_events": [
    {
      "story_day": 故事内第几天(数字，从 1 起),
      "summary": "事件（≤30 字）",
      "location": "地点",
      "participants_names": ["人物名"]
    }
  ],
  "proper_nouns": [
    { "term": "正典写法（如：陆沉工号 LU-0417）", "kind": "工号/档案号/物件编号/地名/机构名", "note": "归属与冲突说明（如：第 8 场曾误写 7734，需统一）" }
  ],
  "reasoning": "提炼思路（简短）"
}
严格按 JSON 输出。`;

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
