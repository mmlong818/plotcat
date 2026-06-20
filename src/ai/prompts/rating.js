import {
  HOLLYWOOD_SHOWRUNNER_PERSONA,
  DRAMA_PRINCIPLES,
  resolveProjectDoc,
  projectSummary,
  charactersSummary,
  structureSummary,
  buildGenreContractBlock,
  buildSetupTrackingBlock
} from "./shared.js";

// ── 幕评师 ActRater ──
// 单场模式：mode='scene' — 评单场剧本
// 全片模式：mode='full' — 评所有已写场拼接后的整部
export function buildActRaterPrompt(projectContext, options) {
  const { mode = "scene", scriptText = "", sceneId = "", genres = [], tones = [], focuses = [], audience = "" } = options ?? {};
  const ctx = (projectContext?.scene_workbench || projectContext?.story_bible) ? projectContext : (projectContext?.project ?? projectContext);
  const scenes = (ctx?.scene_workbench?.scenes ?? []).slice().sort((a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999));
  const characters = ctx?.character_hub?.characters ?? [];
  const charById = new Map(characters.map((c) => [c.id, c]));
  const target = scenes.find((s) => s.id === sceneId);

  const isFullMode = mode === "full";

  const system = `${HOLLYWOOD_SHOWRUNNER_PERSONA}
你的本次身份：幕评师 (ActRater)——专业剧本评分分析系统。
你不创作，你只评估、打分、给出可执行的修稿建议。
你的建议必须具体到"哪一段、哪句台词、改成什么"。
分数从严，0 分=灾难，5 分=合格，7 分=可拍，8 分=精彩，9+ 仅给真正杰出。
${isFullMode ? "\n本次为【全片评估】：你需要看跨场叙事节奏、弧光推进、角色串戏、对白重复、整体类型契约兑现——任何单场问题如果会影响全片，必须升级到全片层面提出。" : ""}
`;

  const configBlock = [
    genres.length ? `流派设定：${genres.join("、")}` : "（未指定流派，按通用叙事分析）",
    tones.length ? `基调设定：${tones.join("、")}` : "（未指定基调，按整体氛围实现度评估）",
    focuses.length ? `分析重点：${focuses.join("、")}` : "（无重点，默认评估「故事张力」与「角色塑造」）",
    audience ? `目标受众：${audience}` : "（未指定，按泛观众群体评估）"
  ].join("\n");

  const raterGenreContract = buildGenreContractBlock(ctx);
  const raterSetupBlock = buildSetupTrackingBlock(ctx);
  const contractBlock = [
    raterGenreContract ? `\n【类型契约（评 genre_fit 时以此为准，缺失必备项要扣分并在问题里点名）】\n${raterGenreContract}` : "",
    raterSetupBlock ? `\n【全片伏笔追踪（检查剧本是否真的埋下/回收，以及物件细节是否前后矛盾）】\n${raterSetupBlock}` : ""
  ].filter(Boolean).join("\n");

  // 全片模式：拼接所有已写场剧本 + 提供项目骨架上下文
  let fullScriptBlock = "";
  let fullCtxBlock = "";
  if (isFullMode) {
    const writtenScenes = scenes.filter((s) => s.script_full && s.script_full.trim().length > 50);
    fullScriptBlock = writtenScenes.map((s, i) => {
      const povName = charById.get(s.pov_character_id)?.name ?? "?";
      return `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n【第 ${s.order_index ?? i+1} 场 · ${s.title || "未命名"}】 (sceneId=${s.id}, POV=${povName})\n场目的：${s.purpose ?? ""}\n转折：${s.beat_summary ?? ""}\n${s.script_full}\n`;
    }).join("\n");

    const storyCore = ctx?.story_core ?? {};
    const charLines = characters.slice(0, 6).map((c) => `- ${c.name}（${c.story_role}）：${c.dramatic_need || c.external_goal || ""}`).join("\n");
    fullCtxBlock = `
项目元信息：
- 标题：${ctx?.project?.title ?? ""}
- 类型：${(ctx?.project?.genre ?? []).join("、")}
- 一句话概念：${storyCore.premise ?? ""}
- 核心冲突：${storyCore.core_conflict ?? ""}
- 主题陈述：${storyCore.theme_statement ?? ""}
- 情绪承诺：${storyCore.emotional_promise ?? ""}

主要角色（评估弧光连续性）：
${charLines}

已写场次总览：${writtenScenes.length} 场 / ${writtenScenes.reduce((sum, s) => sum + s.script_full.length, 0)} 字
`;
  }

  const sceneCtx = (!isFullMode && target) ? `
本场场景元信息（用于校验剧本是否服务于这些设计）：
- 标题：${target.title}
- POV：${charById.get(target.pov_character_id)?.name ?? "未指定"}
- 场景目的：${target.purpose ?? ""}
- 阻力：${target.obstacle ?? ""}
- 转折：${target.beat_summary ?? ""}
- 进场状态：${target.entry_state ?? ""}
- 出场状态：${target.exit_state ?? ""}
${target.conflict_proposition ? `- 冲突主张：${target.conflict_proposition}` : ""}
${target.subtext_goal ? `- 潜台词目标：${target.subtext_goal}` : ""}
${target.arc_beat ? `- 弧光位置：${target.arc_beat}` : ""}
` : "";

  const user = `${configBlock}
${contractBlock}
${isFullMode ? fullCtxBlock : sceneCtx}

${isFullMode ? "待评估全片剧本（每场用 ━ 分隔，已标注 sceneId）：" : "待评估剧本："}
${isFullMode ? fullScriptBlock : `\`\`\`\n${scriptText}\n\`\`\``}

请按以下结构返回 JSON（不要 markdown，纯 JSON）：

{
  "genre_fit": [
    {"label": "流派名或'通用叙事'", "score": 8, "analysis": "..."}
  ],
  "tone_fit": [
    {"label": "基调名或'整体氛围'", "score": 8, "analysis": "..."}
  ],
  "audience_fit": {
    "appeal": 8,
    "appropriateness": 8,
    "comprehension": 8
  },
  "focus_depth": [
    {"label": "重点名或'故事张力'或'角色塑造'", "score": 8, "analysis": "..."}
  ],
  "scorecard": {
    "story": { "concept": 8, "plot": 8, "originality": 7 },
    "character": {
      "characters": 8, "character_changes": 8,
      "internal_goal": "用一句话描述本场主角内在目标",
      "external_goal": "用一句话描述本场主角外在目标"
    },
    "scene": {
      "conflict_level": 8, "opposition": 8, "high_stakes": 7,
      "story_forward": 8, "unpredictability": 7,
      "philosophical_conflict": "本场的哲学冲突一句话"
    },
    "engagement": {
      "emotional_impact": 8, "dialogue": 8,
      "engagement": 8, "pacing": 8
    },
    "technical": { "formatting": 8, "structure": 8 }
  },
  "overall": {
    "score": 7.8,
    "summary": "整体评价：3-5 句，先优后短板"
  },
  "revision_directives": [
    {
      ${isFullMode ? '"scene_id": "（必填）目标场 sceneId（从上面 ━ 标注里取，跨场问题填影响最严重的那场）",\n      ' : ""}"issue": "具体问题（如'第 3 段独白工具化解说'）",
      "location_hint": "原文定位（前 30 字）",
      "directive": "明确的修改方向（一句话告诉编剧改成什么）",
      "severity": "P0|P1|P2"
    }
  ]${isFullMode ? `,
  "scene_scores": [
    {"scene_id": "...", "order": 1, "title": "...", "score": 7.5}
  ],
  "cross_scene_issues": [
    "跨场问题 1（如：场 1 与场 3 用了同样的"门把手特写"开场视觉，重复）",
    "跨场问题 2（如：主角弧光在场 2 推进到 0.6 但场 3 倒退到 0.4，弧光断裂）"
  ]` : ""}
}

重要：
- revision_directives 必须 ${isFullMode ? '5-12' : '3-8'} 条，每条必须可执行（不要说"加深情感"这种空话）
- location_hint 必须能在原文中定位到具体段落
- severity P0 = 必须改否则废戏；P1 = 该改否则掉分；P2 = 抛光建议
${isFullMode ? '- 全片模式：每条 directive 必须标明 scene_id（必填）\n- scene_scores 数组要给每场单独打分\n- cross_scene_issues 列出跨场问题（重复/弧光断裂/类型契约缺口等）' : ""}
`;

  return { system, user };
}

export function buildDiagnosisPrompt(projectContext) {
  const ctx = resolveProjectDoc(projectContext);
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
