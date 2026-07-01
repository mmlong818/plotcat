import { json, readJsonBody } from "../httpUtils.js";
import { createId, structureProfileFromPreset } from "../../shared/projectFactory.js";
import { structurePresets } from "../../state.js";
import { createProject, saveProject } from "../repository.js";
import { buildAnalyzeAnchorPrompt, buildWorkbenchQuestionsPrompt, buildAssemblePrompt } from "../../ai/proPrompts.js";
import { parseJsonFromText } from "../../ai/generator.js";
import { completeText } from "../llm.js";
import { generateActNodes } from "../ai.js";

export async function handleCreationFlowApi(request, response, pathname) {
  if (pathname === "/api/creation-flow/finalize" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const { genres, concept, synopsis, characters, scenes, structure,
              format = "feature",
              relationships: relList, world_rules: worldRules,
              timeline_events: timelineEvents, setup_payoffs: setupPayoffs } = body;
      const title = concept?.title ?? synopsis?.version_label ?? "新长片项目";
      const logline = concept?.hook ?? synopsis?.summary ?? "";
      const genreList = Array.isArray(genres) ? genres : [];

      // 从幕数推断结构模板（act_structure 不返回 primary 字段时的 fallback）
      const actCount = Array.isArray(structure?.acts) ? structure.acts.length : 0;
      const primaryStructure = structure?.primary
        ?? (actCount === 4 ? "four_act" : actCount === 5 ? "feature_film" : "three_act");

      // 1. 创建基础项目
      const projectData = createProject({ title, format, genre: genreList, logline });

      // 2. 填充故事核心（central_question / emotional_promise 不复用 hook）
      projectData.story_core = {
        ...(projectData.story_core ?? {}),
        premise:           synopsis?.summary ?? concept?.hook ?? "",
        core_conflict:     concept?.core_conflict ?? "",
        central_question:  "",
        emotional_promise: concept?.unique_angle ?? "",
        theme_statement:   ""
      };

      // 3. 填充角色 — 兼容新旧 prompt 字段名，缺失时从相邻字段 fallback
      if (Array.isArray(characters) && characters.length > 0) {
        projectData.story_bible.characters = characters.map((c) => {
          const fallbackPsych = c.psychological_flaw || c.belief || ""; // 错误信念 ≈ 心理弱点
          const fallbackPublic = c.public_mask || c.archetype || "";    // 角色原型 ≈ 公开面具
          const fallbackVoice = Array.isArray(c.voice_rules) && c.voice_rules.length > 0
            ? c.voice_rules
            : (c.voice_signature ? [c.voice_signature] : []);
          return {
            id: createId("char"),
            name: c.name ?? "角色",
            story_role: c.story_role ?? "supporting",
            external_want: c.external_want ?? c.desire ?? "",
            internal_need: c.internal_need ?? c.need ?? "",
            psychological_flaw: fallbackPsych,
            moral_flaw: c.moral_flaw ?? "",
            public_mask: fallbackPublic,
            core_fear: c.core_fear ?? "",
            wound: c.wound ?? "",
            arc_start: c.arc_start ?? "",
            arc_end: c.arc_end ?? "",
            voice_rules: fallbackVoice,
            secret: c.secret ?? ""
          };
        });
      }

      // 4. 填充关键剧情点 → scene_cards + beats — AI 必须返回 location/time_of_day/goal/obstacle/turn
      if (Array.isArray(scenes) && scenes.length > 0) {
        const firstCharId = projectData.story_bible.characters[0]?.id ?? "";
        const sceneCards = scenes.map((s, i) => ({
          id: createId("scene"),
          order_index: i + 1,
          title: s.title ?? `场景 ${i + 1}`,
          pov_character_id: firstCharId,
          location: s.location || "待定",
          time_of_day: s.time_of_day || "待定",
          goal: s.goal ?? s.scene_goal ?? s.core_event ?? "",
          obstacle: s.obstacle ?? s.conflict ?? "",
          tactic: "",
          turn: s.turn ?? s.character_change ?? "",
          value_shift: "",
          new_information: [],
          input_state: "",
          output_state: "",
          production_tags: [],
          dialogue_seed: "",
          emotion_stage: ""
        }));
        projectData.story_bible.scene_cards = sceneCards;
        projectData.story_bible.beats = scenes.map((s, i) => ({
          id: createId("beat"),
          framework: primaryStructure,
          slot: s.act_position ?? "setup",
          purpose: s.dramatic_function || s.title || s.core_event || `剧情点 ${i + 1}`,
          linked_scene_ids: [sceneCards[i].id]
        }));
      }

      // 5. 填充意图锚点
      projectData.intent_anchor = {
        ...projectData.intent_anchor,
        core_idea: synopsis?.summary ?? concept?.hook ?? "",
        theme: concept?.title ?? "",
        protagonist: Array.isArray(characters) && characters.length > 0 ? (characters[0]?.name ?? "") : ""
      };

      // 6. 填充 structure_profile（acts + nodes）— 把 scenes 按 act_position/序号分配给节点的 note
      const _preset1 = structurePresets[primaryStructure];
      if (_preset1) {
        const profile = structureProfileFromPreset(_preset1, primaryStructure);
        // 按 scenes 顺序均匀分布到 nodes（最稳）：12 个 scenes / 11 个 nodes ≈ 每节点 1 个
        const sceneList = Array.isArray(scenes) ? scenes : [];
        if (sceneList.length > 0 && profile.nodes.length > 0) {
          for (let idx = 0; idx < profile.nodes.length; idx++) {
            const sceneIdx = Math.min(Math.floor(idx * sceneList.length / profile.nodes.length), sceneList.length - 1);
            const s = sceneList[sceneIdx];
            if (!s) continue;
            const noteParts = [];
            if (s.title) noteParts.push(s.title);
            if (s.core_event) noteParts.push(`核心：${s.core_event}`);
            if (s.character_change) noteParts.push(`变化：${s.character_change}`);
            if (s.dramatic_function) noteParts.push(`功能：${s.dramatic_function}`);
            profile.nodes[idx].note = noteParts.join("\n");
          }
        }
        projectData.structure_profile = profile;
      } else {
        projectData.structure_profile = { template: primaryStructure };
      }
      projectData.character_hub = Array.isArray(characters) && characters.length > 0 ? {
        characters: projectData.story_bible.characters ?? []
      } : { characters: [] };
      projectData.plot_board = null;
      projectData.scene_workbench = null;

      // 7. 写入 relationships（按 source/target_character_name 解析为 id）
      if (Array.isArray(relList) && relList.length > 0) {
        const charByName = new Map((projectData.story_bible.characters ?? []).map(c => [c.name, c.id]));
        projectData.story_bible.relationships = relList.map((r, i) => ({
          id: createId("rel"),
          source_character_id: charByName.get(r.source_character_name) ?? "",
          target_character_id: charByName.get(r.target_character_name) ?? "",
          relationship_type: r.relationship_type ?? "ally",
          tension: r.tension ?? "",
          power_balance: r.power_balance ?? "",
          shared_history: r.shared_history ?? "",
          hidden_information: r.hidden_information ?? ""
        })).filter(r => r.source_character_id && r.target_character_id);
      }

      // 8. 世界规则 / 时间线 / 伏笔
      if (Array.isArray(worldRules) && worldRules.length > 0) {
        projectData.story_bible.world_rules = worldRules.map((w, i) => ({
          id: createId("rule"),
          rule_statement: w.rule_statement ?? "",
          rule_level: w.rule_level ?? "social",
          scope: w.scope ?? "",
          exceptions: Array.isArray(w.exceptions) ? w.exceptions : [],
          evidence: Array.isArray(w.evidence) ? w.evidence : []
        }));
      }
      if (Array.isArray(timelineEvents) && timelineEvents.length > 0) {
        projectData.story_bible.timeline_events = timelineEvents.map((t, i) => ({
          id: createId("event"),
          story_day: Number(t.story_day) || (i + 1),
          sequence_index: t.sequence_index ?? i + 1,
          summary: t.summary ?? "",
          participants: Array.isArray(t.participants) ? t.participants : [],
          location: t.location ?? "",
          trigger: t.trigger ?? "",
          consequence: t.consequence ?? ""
        }));
      }
      if (Array.isArray(setupPayoffs) && setupPayoffs.length > 0) {
        projectData.story_bible.setup_payoffs = setupPayoffs.map((p, i) => ({
          id: createId("setup"),
          setup_summary: p.setup_summary ?? "",
          setup_scene_id: "",
          expected_payoff_window: p.expected_payoff_window ?? "",
          status: p.status ?? "planned",
          payoff_scene_id: "",
          payoff_summary: p.payoff_summary ?? ""
        }));
      }

      const saved = saveProject(projectData);
      const projectId = saved.project?.id ?? saved.id;
      json(response, 200, { projectId, success: true });
    } catch (error) {
      json(response, 500, { error: error.message });
    }
    return true;
  }

  if (pathname === "/api/ai/generate-act-nodes" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const { projectCtx, actTitle, actPurpose, nodes } = body;
      const data = await generateActNodes({ projectCtx, actTitle, actPurpose, nodes });
      json(response, 200, { ok: true, data });
    } catch (error) {
      json(response, 500, { ok: false, error: error.message });
    }
    return true;
  }

  if (pathname === "/api/pro/analyze" && request.method === "POST") {
    let body;
    try { body = await readJsonBody(request); } catch { body = {}; }
    const { anchor, genres = [] } = body;
    if (!anchor) { json(response, 400, { error: "缺少 anchor 参数" }); return true; }

    try {
      const { system, user } = buildAnalyzeAnchorPrompt(anchor, genres);
      const fullPrompt = `${system}\n\n---\n\n${user}`;
      const result = await completeText(fullPrompt, { effort: "low" });
      const parsed = parseJsonFromText(result);
      json(response, 200, parsed);
    } catch (err) {
      json(response, 500, { error: err.message });
    }
    return true;
  }

  if (pathname === "/api/pro/questions" && request.method === "POST") {
    let body;
    try { body = await readJsonBody(request); } catch { body = {}; }
    const { wb, context = {}, anchor = "", genres = [] } = body;
    if (!wb) { json(response, 400, { error: "缺少 wb 参数" }); return true; }

    try {
      const { system, user } = buildWorkbenchQuestionsPrompt(wb, context, anchor, genres);
      const fullPrompt = `${system}\n\n---\n\n${user}`;
      const result = await completeText(fullPrompt, { effort: "low" });
      const parsed = parseJsonFromText(result);
      json(response, 200, parsed);
    } catch (err) {
      json(response, 500, { error: err.message });
    }
    return true;
  }

  if (pathname === "/api/pro/assemble" && request.method === "POST") {
    let body;
    try { body = await readJsonBody(request); } catch { body = {}; }
    const { anchor = "", genres = [], format = "feature", theme = {}, character = {}, scene = {} } = body;

    try {
      const { system, user } = buildAssemblePrompt(
        anchor, genres,
        theme.questions ?? [],
        character.questions ?? [],
        scene.questions ?? []
      );
      const fullPrompt = `${system}\n\n---\n\n${user}`;
      const result = await completeText(fullPrompt, { effort: "low" });

      const assembled = parseJsonFromText(result);
      const logline = assembled.story_core?.premise ?? "";
      // title 不能用 logline 截断 — 那会是「册封大典前夜深宫女官发现先帝…」这样的破句。
      // 优先用 AI 显式产出的 title 字段，否则用项目占位标题让用户进去后自己起名。
      const aiTitle = (assembled.story_core?.title || assembled.title || "").trim();
      const stamp = new Date().toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
      const title = aiTitle || `未命名项目（${stamp}）`;
      const genreList = Array.isArray(genres) ? genres : [];

      const projectData = createProject({ title, format, genre: genreList, logline });
      projectData.story_core = { ...assembled.story_core };
      projectData.intent_anchor = {
        ...projectData.intent_anchor,
        core_idea: assembled.story_core?.premise ?? "",
        theme: assembled.story_core?.theme_statement ?? ""
      };

      if (Array.isArray(assembled.characters) && assembled.characters.length > 0) {
        projectData.story_bible.characters = assembled.characters.map((c) => ({
          id: createId("char"),
          name: c.name ?? "角色",
          story_role: c.story_role ?? "protagonist",
          external_want: c.desire ?? "",
          internal_need: c.need ?? "",
          wound: c.wound ?? "",
          arc_start: c.arc_start ?? "",
          arc_end: c.arc_end ?? "",
          psychological_flaw: c.contradiction ?? "",
          notes: c.notes ?? "",
          public_mask: "",
          core_fear: "",
          moral_flaw: "",
          voice_rules: [],
          secret: ""
        }));
      }

      if (Array.isArray(assembled.scenes) && assembled.scenes.length > 0) {
        const firstCharId = projectData.story_bible.characters[0]?.id ?? "";
        const sceneCards = assembled.scenes.map((s, i) => ({
          id: createId("scene"),
          order_index: i + 1,
          title: s.title ?? `场景 ${i + 1}`,
          pov_character_id: firstCharId,
          location: "待定",
          time_of_day: "待定",
          goal: s.goal ?? "",
          obstacle: s.conflict ?? "",
          tactic: "",
          turn: s.turn ?? "",
          value_shift: "",
          new_information: [],
          input_state: "",
          output_state: "",
          production_tags: [],
          dialogue_seed: "",
          emotion_stage: ""
        }));
        projectData.story_bible.scene_cards = sceneCards;
        projectData.story_bible.beats = assembled.scenes.map((s, i) => ({
          id: createId("beat"),
          framework: "three_act",
          slot: s.act_position ?? "setup",
          purpose: s.title ?? "",
          linked_scene_ids: [sceneCards[i].id]
        }));
      }

      // 填充 structure_profile（acts + nodes）和 character_hub
      const _preset2 = structurePresets["three_act"];
      if (_preset2) {
        projectData.structure_profile = structureProfileFromPreset(_preset2, "three_act");
      } else {
        projectData.structure_profile = { template: "three_act" };
      }
      projectData.character_hub = Array.isArray(assembled.characters) && assembled.characters.length > 0 ? {
        characters: projectData.story_bible.characters ?? []
      } : { characters: [] };
      projectData.plot_board = null;
      projectData.scene_workbench = null;

      const saved = saveProject(projectData);
      const projectId = saved.project?.id ?? saved.id;
      json(response, 200, { projectId, success: true });
    } catch (err) {
      json(response, 500, { error: err.message });
    }
    return true;
  }

  return false;
}
