import { genreTagsOf, projectSummary } from "./shared.js";
import { buildGenreBlendContract } from "../../shared/genreContract.js";

// ── 类型契约兑现审计：逐条核验主导类型的必备场景是否在场景表中有真实落点 ──────
export function buildGenreAuditPrompt(projectContext) {
  const ctx = (projectContext?.scene_workbench || projectContext?.story_bible) ? projectContext : (projectContext?.project ?? projectContext);
  const tags = genreTagsOf(ctx);
  const scenes = (ctx?.scene_workbench?.scenes ?? []).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const sceneLines = scenes.map((s) =>
    `第 ${s.order_index} 场《${s.title}》｜${s.purpose || ""}${s.beat_summary ? `｜转折：${s.beat_summary}` : ""}`
  ).join("\n");
  const blendContract = buildGenreBlendContract(tags, "full");

  const system = `你是类型片剧本监理。任务：逐条核验「主导类型必备场景」在场景表中是否有真实落点，并检查是否踩中类型禁忌。
判定标准从严：必备场景要求的戏剧功能必须真的由某场戏承担（不是擦边沾到关键词），否则判 missing。`;

  const user = `${projectSummary(projectContext)}

${blendContract}

全片场景表：
${sceneLines || "（还没有场景）"}

JSON 输出（requirement_index 从 0 起，对应主导类型必备场景的列出顺序）：
{
  "fulfillment": [
    {
      "requirement_index": 0,
      "requirement": "必备场景名（照抄冒号前短语）",
      "status": "fulfilled | partial | missing",
      "scene_orders": [承担该功能的场次号],
      "note": "一句话判定理由（fulfilled 说哪场怎么兑现的；missing 说缺什么）"
    }
  ],
  "taboo_violations": [
    { "taboo": "踩中的禁忌（照抄开头短语）", "scene_orders": [场次号], "note": "一句话证据" }
  ],
  "blend_balance": "若是混合类型：一句话评估调味类型的存在感（不足/适中/喧宾夺主）；单类型填空字符串",
  "reasoning": "简短"
}
严格按 JSON 输出。`;

  return { system, user };
}

// ── 人物档案兑现审计：档案承诺（弧光/秘密/声音/欲望）对照全片正文逐项核验 ──────
// 治第八轮终审定性的「档案→正文无兑现回查」：档案写下的承诺被场景生成静默改写，
// 而类型审计只看结构义务、看不见人物层的漂移。
export function buildCharacterAuditPrompt(projectContext) {
  const ctx = (projectContext?.scene_workbench || projectContext?.story_bible) ? projectContext : (projectContext?.project ?? projectContext);
  const characters = (ctx?.character_hub?.characters ?? []).filter((c) => (c.name ?? "").trim()).slice(0, 6);
  const scenes = (ctx?.scene_workbench?.scenes ?? []).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  const charBlocks = characters.map((c) => [
    `【${c.name}】（${c.story_role ?? ""}）`,
    c.external_goal || c.external_want ? `- 外部目标：${c.external_goal ?? c.external_want}` : "",
    c.dramatic_need || c.internal_need ? `- 内部需求：${c.dramatic_need ?? c.internal_need}` : "",
    c.arc_start ? `- 弧光起点：${c.arc_start}` : "",
    c.arc_end ? `- 弧光终点：${c.arc_end}` : "",
    c.secret ? `- 秘密：${c.secret}` : "",
    Array.isArray(c.voice_rules) && c.voice_rules.length ? `- 声音规则：${c.voice_rules.join("；")}` : ""
  ].filter(Boolean).join("\n")).join("\n\n");

  // 每场裁剪到 1200 字：保留 slug/对白主体，足够核验弧光与声音
  const sceneDigest = scenes
    .filter((s) => (s.script_full || "").trim().length > 50)
    .map((s) => `—— 第 ${s.order_index} 场《${s.title}》——\n${String(s.script_full).slice(0, 1200)}`)
    .join("\n\n");

  const system = `你是剧本人物监理。任务：把每个角色档案里写下的「承诺」与全片正文逐项对照，揪出被静默改写或蒸发的部分。
判定从严：档案承诺必须在正文里有具体场次的可见兑现，"大体符合"不算 fulfilled。`;

  const user = `${projectSummary(projectContext)}

人物档案（待核验的承诺清单）：
${charBlocks}

全片正文（每场截取前 1200 字）：
${sceneDigest || "（还没有成稿）"}

逐角色核验四项，JSON 输出：
{
  "characters": [
    {
      "name": "角色名（照抄档案）",
      "arc": { "status": "fulfilled | partial | missing", "evidence": "起点见第X场…终点见第Y场…（或缺什么）" },
      "secret": { "status": "fulfilled | partial | missing", "evidence": "在第X场埋设、第Y场揭示（或从未触及/提前泄露）" },
      "voice": { "status": "fulfilled | partial | missing", "evidence": "声音规则是否贯穿；若有违规给一句原文示例与场次" },
      "drift": ["档案承诺被正文改写的具体点（如：档案写由他执行的关键动作被移交他人；没有则空数组）"]
    }
  ],
  "reasoning": "简短"
}
严格按 JSON 输出。`;

  return { system, user };
}

// ── 类型契约修复方案：把审计发现的缺失/部分兑现/禁忌转化为可执行手术方案 ──────
export function buildGenreRemedyPrompt(projectContext) {
  const ctx = (projectContext?.scene_workbench || projectContext?.story_bible) ? projectContext : (projectContext?.project ?? projectContext);
  const audit = ctx?.genre_profile?.fulfillment_audit;
  const scenes = (ctx?.scene_workbench?.scenes ?? []).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const characters = ctx?.character_hub?.characters ?? [];
  const cards = (ctx?.plot_board?.cards ?? []).filter((c) => !c.deleted_at);
  const blendContract = buildGenreBlendContract(genreTagsOf(ctx), "full");

  const problems = [];
  for (const f of (audit?.fulfillment ?? [])) {
    if (f.status === "missing") problems.push(`[缺失] ${f.requirement}：${f.note || ""}`);
    else if (f.status === "partial") problems.push(`[部分兑现，涉及第 ${(f.scene_orders ?? []).join("、")} 场] ${f.requirement}：${f.note || ""}`);
  }
  for (const t of (audit?.taboo_violations ?? [])) {
    problems.push(`[踩禁忌，第 ${(t.scene_orders ?? []).join("、")} 场] ${t.taboo}：${t.note || ""}`);
  }

  const sceneLines = scenes.map((s) =>
    `第 ${s.order_index} 场《${s.title}》｜${s.purpose || ""}${(s.script_full || "").trim().length > 50 ? "｜已成稿" : "｜未写稿"}`
  ).join("\n");
  const charLines = characters.slice(0, 8).map((c) => `- ${c.name}（${c.story_role ?? ""}）`).join("\n");
  const cardLines = cards.map((c) => `id=${c.id}｜${c.title}`).join("\n");

  const system = `你是类型片剧本医生。任务：针对契约审计发现的问题，给出**最小侵入**的手术方案——
能通过重写既有场次解决的，写成该场的修稿指令；确实需要新增场次的（如缺失的结构节点），给出完整的新场方案。
原则：尊重已成稿场次的既有内容（指令应是"在保留本场现有节拍的基础上叠加/调整"，不是推倒重来）；新增场次越少越好。`;

  const user = `${projectSummary(projectContext)}

${blendContract}

待修复问题清单（来自契约审计）：
${problems.join("\n") || "（无）"}

角色名单（人物名必须严格使用）：
${charLines}

剧情卡（新场挂卡用）：
${cardLines}

全片场景表：
${sceneLines}

JSON 输出：
{
  "scene_directives": [
    {
      "scene_order": 场次号(数字),
      "directive": "该场修稿指令：1.[severity] 问题\\n   定位：…\\n   要求：…（保留现有节拍的前提下如何叠加类型义务，具体到动作/信息/台词方向）"
    }
  ],
  "new_scenes": [
    {
      "insert_after_order": 插入在第几场之后(数字),
      "card_id": "挂靠的剧情卡 id",
      "title": "场名（人物+动作，≤14 字）",
      "purpose": "本场谁要做什么，赌什么（≤40 字）",
      "obstacle": "具体阻力（≤40 字）",
      "beat_summary": "本场转折（≤40 字）",
      "location": "具体地点",
      "time_of_day": "黎明/清晨/上午/正午/午后/黄昏/夜晚/深夜 之一",
      "pov_name": "视点人物名（名单内）",
      "fulfills": "兑现哪条必备场景"
    }
  ],
  "reasoning": "手术思路（哪些靠重写、哪些必须新增、为什么）"
}
严格按 JSON 输出。`;

  return { system, user };
}
