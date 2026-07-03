import {
  genreTagsOf,
  seriesBlocksOf,
  seriesInjectionBlock,
  resolveProjectDoc,
  projectSummary,
  structureSummary,
  buildCharacterPortrait,
  buildRelationshipPortrait,
  buildSetupTrackingBlock,
  buildGenreContractBlock,
  list_or,
  DRAMA_PRINCIPLES
} from "./shared.js";
import { buildGenreBlendContract } from "../../shared/genreContract.js";

export function buildSceneOutlinePrompt(projectContext, options) {
  const { actId = "", nodeId = "" } = options ?? {};
  const ctx = resolveProjectDoc(projectContext);
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
${seriesInjectionBlock(projectContext)}
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

  const ctx = resolveProjectDoc(projectContext);
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

// ── 全片场景表规划：把剧情卡拆成 1:N 场景，使总场数达到作品形态标准 ──────────
export function buildSceneExpansionPrompt(projectContext, options) {
  const { targetSceneCount = 30 } = options ?? {};
  const ctx = (projectContext?.scene_workbench || projectContext?.story_bible) ? projectContext : (projectContext?.project ?? projectContext);
  const cards = (ctx?.plot_board?.cards ?? []).filter((c) => !c.deleted_at);
  const acts = ctx?.structure_profile?.acts ?? [];
  const nodes = ctx?.structure_profile?.nodes ?? [];
  const actById = new Map(acts.map((a) => [a.id, a]));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const characters = ctx?.character_hub?.characters ?? [];
  const existingScenes = ctx?.scene_workbench?.scenes ?? [];

  const cardLines = cards.map((c, i) => {
    const act = actById.get(c.act_id) ?? actById.get(nodeById.get(c.node_id)?.act_id);
    const node = nodeById.get(c.node_id);
    return `[卡 ${i + 1}] id=${c.id}｜${c.title || "未命名"}（${act?.title ?? "?"}·${node?.title ?? node?.node_type ?? "?"}）\n  摘要：${c.summary || "（空）"}`;
  }).join("\n");
  const charLines = characters.slice(0, 8).map((c) => `- ${c.name}（${c.story_role ?? ""}）`).join("\n");
  const existingLines = existingScenes.map((s, i) =>
    `[场 ${i + 1}] id=${s.id}｜${s.title || "未命名"}｜挂卡=${(s.linked_plot_card_ids ?? []).join(",") || "无"}｜${s.purpose || ""}${(s.script_full || "").trim().length > 50 ? "｜已有成稿，不可删改" : "｜未写稿"}`
  ).join("\n") || "（还没有场景）";
  // 资料库三件套驱动扩场：时间线定顺序、世界规则定边界、伏笔定埋设/回收位（含系列库）
  const expSeries = seriesBlocksOf(ctx);
  const expTimeline = (ctx?.lock_layer?.projections?.timeline_events ?? [])
    .slice().sort((a, b) => (a.story_day ?? 0) - (b.story_day ?? 0))
    .map((e) => `- 第 ${e.story_day ?? "?"} 天：${e.summary ?? ""}`).join("\n");
  const expRules = (ctx?.lock_layer?.projections?.world_rules ?? [])
    .map((r) => `- ${r.rule_statement ?? ""}`).join("\n");
  const expSetups = (ctx?.lock_layer?.projections?.setup_payoffs ?? [])
    .filter((s) => (s.setup_summary || "").trim())
    .map((s) => `- 【${s.status === "closed" ? "已回收" : "待回收"}】${s.setup_summary}${s.expected_payoff_window ? `（预期回收：${s.expected_payoff_window}）` : ""}`).join("\n");
  const libraryBlock = [
    expSeries.rules ? `系列世界规则（本系列所有作品共守）：\n${expSeries.rules}` : "",
    expSeries.timeline ? `系列时间线（本片必须落在此因果序内）：\n${expSeries.timeline}` : "",
    expSeries.regulars ? `系列常驻人物（可在场景中出场）：\n${expSeries.regulars}` : "",
    expTimeline ? `故事内时间线（场景顺序不得违反此因果序）：\n${expTimeline}` : "",
    expRules ? `世界规则（每场都必须遵守）：\n${expRules}` : "",
    expSetups ? `伏笔清单（规划时必须给每条「待回收」伏笔安排明确的埋设场与回收场——在对应新场的 purpose 里写明）：\n${expSetups}` : ""
  ].filter(Boolean).join("\n\n");

  const expansionBlend = buildGenreBlendContract(genreTagsOf(ctx), "full");
  const system = `你是一位好莱坞资深剧本统筹，擅长把结构节拍拆解成完整的拍摄场景序列。
一个剧情节拍（剧情卡）在成片中通常需要 2-4 场戏来完成：铺垫场、执行场、余波场。
${expansionBlend ? `\n${expansionBlend}\n拆场时检查：主导类型的每个必备场景都必须在场景表中有明确落点；混合类型时按「主导给骨架、调味给肌理」分配每场的能量。\n` : ""}
拆场原则：
- 每场必须有独立的戏剧任务（谁要什么/谁挡着/赌注），不是把一场掰成两半
- 地点与时段变化即是分场；同一节拍可以跨多个地点推进
- 场与场之间要有呼吸节奏：高张力场之后接缓冲场
- 人物名必须严格使用主要角色名单中的名字`;

  const user = `项目：${ctx?.project?.title ?? "未命名"}（logline：${ctx?.project?.logline ?? ""}）
目标总场数：${targetSceneCount} 场左右（当前只有 ${existingScenes.length} 场，需要拆细）

主要角色：
${charLines || "（无）"}

剧情卡（按结构顺序）：
${cardLines}

已有场景（id 必须原样保留在规划里；标注「已有成稿」的场景禁止删除或改写其定位）：
${existingLines}
${libraryBlock ? `\n${libraryBlock}\n` : ""}

请输出全片完整场景表（含已有场景的位置 + 新增场景），按最终放映顺序排列：
- 每张剧情卡拆成 2-4 场（按其戏剧重量决定），整体凑到目标场数 ±4
- 已有场景用 existing_scene_id 引用并安排进顺序；新场景给 card_id + 完整字段
- 反重复硬约束：新场景的事件**禁止复述任何已有场景已经演过的内容**（看上面每场的目的描述）。
  同一节拍的多场必须是「铺垫→执行→余波」的不同阶段，不是同一事件换个地点再来一遍。
  若你判断某个已有场景与规划的新场在事件上撞车、应当废弃或重写，把它列进 overlap_warnings，不要静默并存
- 人名硬约束：title/purpose/obstacle/beat_summary 里出现的人名只能来自上方主要角色名单。
  需要主角团之外的人物（同事、见习生、门卫）时一律用职能称呼，禁止给他们起名字

JSON 输出：
{
  "scenes": [
    { "existing_scene_id": "（已有场景的 id，此时其余字段可省略）" },
    {
      "card_id": "所属剧情卡 id",
      "title": "场名（人物+具体动作，≤14 字，不要带「场景」后缀）",
      "purpose": "本场谁要做什么，赌的是什么（≤40 字）",
      "obstacle": "具体阻力（≤40 字）",
      "beat_summary": "本场转折点（≤40 字）",
      "location": "具体地点",
      "time_of_day": "黎明/清晨/上午/正午/午后/黄昏/夜晚/深夜 之一",
      "pov_name": "本场视点人物名（必须在主要角色名单内）",
      "fulfills_setup": "若本场承担某条伏笔的埋设或回收，照抄该伏笔摘要并以 plant:/pay: 前缀标明（如 pay:校服第三颗纽扣…）；否则省略此字段"
    }
  ],
  "overlap_warnings": ["与新规划撞车、建议废弃或重写的已有场景：场次 id + 一句话原因"],
  "reasoning": "拆场思路（简短）"
}
严格按 JSON 输出，不要其他内容。`;

  return { system, user };
}

export function buildSceneBreakdownPrompt(projectContext, options) {
  const { sceneId = "" } = options ?? {};
  const ctx = (projectContext?.scene_workbench || projectContext?.story_bible) ? projectContext : (projectContext?.project ?? projectContext);
  const scenes = ctx?.scene_workbench?.scenes ?? [];
  const characters = ctx?.character_hub?.characters ?? [];
  const charById = new Map(characters.map((c) => [c.id, c]));
  const target = scenes.find((s) => s.id === sceneId);
  if (!target) {
    return { system: "你是一位资深剧本顾问。", user: '未找到场景，请返回 {"entry_state":"","exit_state":"","obstacle":"","beat_summary":"","warnings":["scene not found"]}' };
  }
  const plotCards = ctx?.plot_board?.cards ?? [];
  const linkedCards = list_or(target.linked_plot_card_ids).map((id) => plotCards.find((c) => c.id === id)).filter(Boolean);
  const cardsBlock = linkedCards.length === 0
    ? "（本场未关联任何剧情卡——按场名/POV 推测合理拆解）"
    : linkedCards.map((c, i) => [
        `[卡 ${i+1}] ${c.title || "未命名剧情卡"}`,
        c.summary ? `  摘要：${c.summary}` : "",
        c.dramatic_question ? `  戏剧问题：${c.dramatic_question}` : "",
        c.conflict ? `  核心冲突：${c.conflict}` : "",
        c.change ? `  发生变化：${c.change}` : "",
        c.macguffin ? `  麦高芬：${c.macguffin}` : "",
        c.catalyst_type ? `  催化剂：${c.catalyst_type}` : "",
        Array.isArray(c.conflict_types) && c.conflict_types.length ? `  冲突类型：${c.conflict_types.join("、")}` : "",
        Array.isArray(c.twist_types) && c.twist_types.length ? `  转折类型：${c.twist_types.join("、")}` : ""
      ].filter(Boolean).join("\n")).join("\n\n");

  const povName = charById.get(target.pov_character_id)?.name ?? "未指定";
  const povPortrait = buildCharacterPortrait(charById.get(target.pov_character_id));

  const system = `你是一位资深场景顾问。任务：把一张已经写好的"剧情卡"在某场具体场景里"落地拆解"——明确进入与离开的人物状态差、本场具体的阻力形态、以及本场转折点。
${DRAMA_PRINCIPLES}
关键原则：进场状态 ≠ 出场状态。每场场景必须制造可见的人物或关系变化。`;

  const user = `本场场景信息：
- 场名：${target.title || "未命名"}
- 顺序：第 ${target.order_index ?? "?"} 场
- 地点：${target.location ?? ""}
- 时段：${target.time_of_day ?? ""}
- POV：${povName}

POV 角色画像：
${povPortrait || "（POV 资料较空）"}

本场已关联的剧情卡（要把这些抽象戏剧节点落地到这一场的具体动作）：
${cardsBlock}

请为本场生成「拆解四件套」+「落地场景定位」：
1. entry_state：开场时 POV 处境（具体到一个动作或状态，不超过 30 字）
2. exit_state：收场时 POV 处境（必须与 entry_state 有可见差值，不超过 30 字）
3. obstacle：本场的具体阻力（不是空话；是"谁在做什么挡路"）
4. beat_summary：本场的转折点（哪一拍让 entry_state 变成 exit_state）
5. location：本场具体发生地点（如：市局解剖室、林家旧居客厅、雨夜天台。禁止"待定/未定"）
6. time_of_day：时段（黎明/清晨/上午/正午/午后/黄昏/夜晚/深夜 之一）

要求：
- 四件套必须呼应剧情卡，但要落到本场具体可拍的动作或对话
- 输出文本中必须用具体人物名指称人物，禁止出现「POV」「主角」「他/她」开头这类占位称谓——这些文字会直接展示给编剧
- 人名只能使用本项目人物名单：${characters.map((c) => c.name).filter(Boolean).join("、") || "（无）"}；名单外的人物用职能称呼（如「见习法医」），禁止起新名字
- entry_state 和 exit_state 必须不同——如果剧情卡本身没有变化，请在 warnings 里指出
- location/time_of_day 必须填实，作为本场拍摄定位；若已有定位（见上）则沿用或合理细化
- 控制简洁，每项不超过 50 字

JSON 输出：
{
  "entry_state": "...",
  "exit_state": "...",
  "obstacle": "...",
  "beat_summary": "...",
  "location": "...",
  "time_of_day": "...",
  "warnings": []
}`;
  return { system, user };
}

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
  // 场景没挂任何人物时，退回全项目人物名单兜底——
  // 否则「严禁创造新人物名」防线失效，AI 会为整部剧本另造一套人名
  if (sceneCharIds.size === 0) {
    characters.slice(0, 6).forEach((c) => { if (c?.id) sceneCharIds.add(c.id); });
  }
  // 输出完整人物画像——用户填什么字段，AI 就消费什么，不再丢失 traits/mbti/secret 等
  const sceneCharLines = Array.from(sceneCharIds).map((cid) => {
    const c = charById.get(cid);
    if (!c) return null;
    const isPov = cid === target.pov_character_id;
    const portrait = buildCharacterPortrait(c);
    return `【${c.name}${isPov ? "（POV）" : ""}】\n${portrait}`;
  }).filter(Boolean).join("\n\n") || `- ${pov}（仅 POV 已知）`;

  // 本场出场人物两两之间的关系画像
  const relationships = ctx?.character_hub?.relationship_map ?? [];
  const sceneCharIdsArr = Array.from(sceneCharIds);
  const sceneRels = relationships.filter((r) =>
    sceneCharIds.has(r.source_character_id) && sceneCharIds.has(r.target_character_id)
  );
  const sceneRelLines = sceneRels.length
    ? "\n\n本场出场角色之间的关系（必须在台词/动作中体现这些张力）：\n" +
      sceneRels.map((r) => "- " + buildRelationshipPortrait(r, charById)).join("\n")
    : "";

  const seriesBlocks = seriesBlocksOf(ctx);
  const projectRules = (ctx?.lock_layer?.projections?.world_rules ?? ctx?.story_bible?.world_rules ?? [])
    .map((r) => `- ${r.rule_statement ?? r.statement ?? ""}（${r.scope ?? ""}）`).join("\n");
  const lockedRules = [seriesBlocks.rules, projectRules].filter(Boolean).join("\n") || "（无）";
  const projectTimeline = (ctx?.lock_layer?.projections?.timeline_events ?? ctx?.story_bible?.timeline_events ?? [])
    .slice(0, 6)
    .map((e) => `- 第 ${e.story_day ?? "?"} 天：${e.summary ?? ""}`).join("\n");
  const lockedTimeline = [seriesBlocks.timeline, projectTimeline].filter(Boolean).join("\n") || "（无）";
  const setupBlock = buildSetupTrackingBlock(ctx);
  // 本场定向伏笔任务：资料库里把埋设/回收锚定到本场的伏笔，是硬性任务而非参考
  const allSetups = ctx?.lock_layer?.projections?.setup_payoffs ?? ctx?.story_bible?.setup_payoffs ?? [];
  const mustPlant = allSetups.filter((s) => s.setup_scene_id === target.id && (s.setup_summary || "").trim());
  const mustPay = allSetups.filter((s) => s.payoff_scene_id === target.id && (s.setup_summary || "").trim());
  const setupTaskBlock = (mustPlant.length || mustPay.length) ? [
    "【本场伏笔任务（硬性，缺一即废稿）】",
    ...mustPlant.map((s) => `- 必须在本场埋设：${s.setup_summary}——埋得不显山露水，观众此刻不应意识到它的分量${s.expected_payoff_window ? `（将在「${s.expected_payoff_window}」回收）` : ""}`),
    ...mustPay.map((s) => `- 必须在本场回收：${s.setup_summary}${s.payoff_summary ? `——回收方式：${s.payoff_summary}` : ""}。细节（编号/外观/措辞）必须与埋设场完全一致`)
  ].join("\n") : "";
  const genreContract = buildGenreContractBlock(ctx);

  const allowedNames = [...Array.from(sceneCharIds).map((cid) => charById.get(cid)?.name).filter(Boolean), ...seriesBlocks.regularNames];
  const namesGuard = allowedNames.length > 0
    ? `\n严禁创造新人物名。本场允许出现的人物名仅有：${allowedNames.join("、")}。若需要主角团之外的群演，直接用其职能称呼（如「护士」「刑警」「店员」），不要起新名字，也不要写成「路人护士」这类叠床架屋的说法。此约束同样覆盖动作行、道具、字条、照片、回忆、对白中**提及**的一切人名——比如物证上写的名字、角色口中说起的旧人，都只能用名单内的名字，一个字都不能改。`
    : "";

  // ── 反同质化上下文：邻场剧本片段 + 全片已用过的开场动作/比喻 ──
  const sortedScenes = scenes.slice().sort((a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999));
  const targetIdx = sortedScenes.findIndex((s) => s.id === target.id);
  const prevScene = targetIdx > 0 ? sortedScenes[targetIdx - 1] : null;
  const nextScene = targetIdx >= 0 && targetIdx < sortedScenes.length - 1 ? sortedScenes[targetIdx + 1] : null;

  const tailOf = (text, n = 600) => {
    const s = String(text || "").trim();
    return s.length > n ? "…" + s.slice(-n) : s;
  };
  const prevTail = prevScene?.script_full
    ? `\n【上一场（第 ${prevScene.order_index ?? "?"} 场《${prevScene.title || "未命名"}》）剧本末尾，本场必须承接其离场状态、不重复其结尾画面】\n${tailOf(prevScene.script_full, 500)}\n`
    : "";
  const nextHint = nextScene
    ? `\n【下一场预告（仅作衔接参考，不要在本场写出下一场内容）】\n- 标题：${nextScene.title || "未命名"}\n- 目标：${nextScene.purpose || ""}\n- 转折：${nextScene.beat_summary || ""}\n`
    : "";

  // 收集已写剧本里"动作描述行首 30 字"指纹，作为反复用清单
  const writtenScripts = sortedScenes
    .filter((s) => s.id !== target.id && s.script_full && s.script_full.trim().length > 80)
    .slice(-6); // 最多看最近 6 场，避免 prompt 过长
  const usedOpeners = writtenScripts.map((s) => {
    const lines = String(s.script_full).split("\n").filter((l) => l.trim() && !/^(INT\.|EXT\.|[A-Z一-鿿]+\s*$)/.test(l.trim()));
    return lines[0] ? `- 第 ${s.order_index ?? "?"} 场：${lines[0].slice(0, 40)}` : "";
  }).filter(Boolean).join("\n");
  const antiRepeatBlock = usedOpeners
    ? `\n【全片已用过的开场动作首段（禁止套用以下句式/比喻/视觉锚点）】\n${usedOpeners}\n本场必须找到一个语气、画面、节奏都和上面任何一行都不同的开场。`
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
${target.rater_directives ? `\n【上轮幕评师修稿指令（最高优先级，必须逐条执行后再满足其他要求）】\n${target.rater_directives}\n` : ""}
${target.conflict_proposition ? `\n【戏剧主张（最重要，必须由这条统领整场对白与动作）】\n冲突主张：${target.conflict_proposition}\n` : ""}${target.subtext_goal ? `\n【潜台词锚点（每个有意义的对白都要服务这条）】\n${target.subtext_goal}\n` : ""}${target.arc_beat ? `\n【弧光位置（本场结束时主角必须比进场更靠近 B）】\n${target.arc_beat}\n` : ""}

【动作归属纪律】上方场景卡与关联剧情卡里写明由某人执行的关键动作（尤其是主角的 plot-resolving action），
必须由那个人亲手执行，不得移交给配角代劳——主角的高潮动作被别人代做是结构性失格。

本场出场人物（必须使用这些名字，不得替换；每个角色的所有字段都是 AI 必须消费的方向锚点——填了什么就用什么，不要忽略）：
${sceneCharLines}${seriesBlocks.regulars ? `\n\n系列常驻人物（如剧情需要可出场，人设与声音必须与档案一致）：\n${seriesBlocks.regulars}` : ""}${namesGuard}${sceneRelLines}
${prevTail}${nextHint}${antiRepeatBlock}

已锁定世界规则（须遵守）：
${lockedRules}

时间线参考（最近事件）：
${lockedTimeline}
${setupTaskBlock ? `\n${setupTaskBlock}\n` : ""}${setupBlock ? `\n全片伏笔追踪（防矛盾参考：本场涉及下列任何物件/信息/人物时，细节必须与此处设定完全一致，不得自造与之矛盾的编号、日期、数量）：\n${setupBlock}\n` : ""}${genreContract ? `\n类型契约（本场要主动兑现下列期待、避开禁区）：\n${genreContract}\n` : ""}
对白风格：${dialogueStyle}（自然主义=贴近生活；戏剧化=高张力；幽默=诙谐；诗意=抒情）
潜台词类型：${subtextType || "根据场景情感选择"}

【可表演性铁律（剧本第一原则，违反即废稿）】
- 动作行只能写镜头拍得到、话筒收得到的：可见的动作、表情、环境、可闻的声音。严禁写人物的内心活动——「知道 / 意识到 / 记起 / 明白 / 想起 / 仿佛 / 似乎 / 心想」等不可拍摄的心理叙述一律禁止。
- 内心状态必须外化为可表演的东西：用动作、表情、停顿、或说出口的台词呈现。例：不写「她知道没人听过那条语音」，改为让她环顾空无一人的天台、或盯着通讯录里「顾时」的名字不动。
- 禁止小说式写法：不用破折号拖出人物没说完的内心思绪（如「只有她和——」是小说，不是剧本）；要么写成她说出口的台词，要么删掉。
- 不靠旁白/画外内心独白交代信息，除非本剧本已明确设定 V.O. 旁白体。

请写本场完整的剧本格式文本，严格遵守：
- 第一行必须是场景头（slug line）：${slug}
- 动作描述左对齐段落，每段不超过 3 行，只写镜头看得见、话筒听得到的（画面/动作/表情/声音），绝不写感受或心理
- 人物名单独成行${allowedNames.length > 0 ? `（只能从 ${allowedNames.join("、")} 中选）` : "（建议大写名字）"}，提示如「（停顿）」用括号
- 对白下一行接说话内容，不超过 3 行
- 对白不能解释性、说教式
- 潜台词：角色说 X 实际要 Y
- 场景结尾留一个悬而未决的张力点

【反同质化硬约束（必须遵守）】
- 开场策略轮换：不要默认用「一件物的特写/一声响」冷开场——全片连用会暴露机器节奏。按本场顺序号 % 4 选择开场策略：0=人物动作进行时（已在动作中段）、1=对白先行（画面前先有人声）、2=空间纵深（从大环境推到人）、3=物件/声音特写。结尾同理：不要每场都以「定格悬念意象」收，允许以对白、动作中断、声音延续收场
- 不得复用上文「已用过的开场动作首段」里出现过的句式骨架（如反复用「X 推门进来」「X 站在窗前」「雨/风/光 + 名词」做开场）
- 不得用与上一场剧本末尾相同的视觉锚点（如上场结尾在「钥匙」上，本场不要再开场就写钥匙）
- 不得用与上一场相同的对白节奏（如上场多用短句对峙，本场就改用长台词独白；上场是沉默+动作，本场就先开口说话）
- 每场至少要有一个独特的"画面记忆点"——一个其他场景里没出现过的具体物件、动作或声音，让本场可以被记住

篇幅要求（按场景在剧本中的功能分配）：
- 关键节点（转折点 / 揭示 / 高潮 / 弧光关键时刻）：800-1500 字，约 3-6 页，给足戏剧空间
- 推进场景（建立 / 调查 / 取证 / 关系演变）：500-1000 字，约 2-4 页
- 桥接 / 蒙太奇 / 短转场：250-500 字，约 1-2 页
请根据本场的目标 / 障碍 / 节拍判断它属于哪一类，**不要写得过短**。
对白要写够，让角色的语气与潜台词真正立起来，而不是只交代信息。

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
