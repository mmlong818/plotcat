// 创作流程的 AI 异步处理簇：精品创作（起点分析/问题生成/组装）、角色细化、结构骨架节点生成、
// 新建项目最终化与创建后自动补全、5 步快速创作流程的概念/角色生成。
// 从 app.js 外提；运行期依赖经工厂注入，renderCreationPage 由 flow.js 定义后传入。
import { appState, structurePresets, buildCustomStructurePreset } from "../state.js";
import { list } from "../utils.js";
import { createId, createEmptyProject } from "../shared/projectFactory.js";
import { ensurePlotDrivenProject } from "../shared/plotDrivenProject.js";
import { renderCharactersPage } from "../render/characters.js";
import { SCENE_TARGETS_BY_FORMAT } from "../ai/sceneGeneration.js";
import { getLivePlotCards } from "../logic/getters.js";

export function createCreationAI(deps) {
  const {
    dom, render, markDirty, normalizeProject, saveProjectToServer,
    setCurrentPage, setCurrentStep, loadProjectFromServer,
    callGenerateAPI, callGenerateAPIStream, applySceneExpansion,
    characterGetters, renderCreationPage
  } = deps;

  // ── 精品创作 API calls ──────────────────────────────────────────────────────

  async function handleProAnalyzeAnchor() {
    const pc = appState.proCreation;
    if (!pc.anchor.trim()) {
      pc.error = "请先输入你的创作起点";
      renderCreationPage();
      return;
    }
    pc.loading = true;
    pc.error = null;
    renderCreationPage();
    try {
      const res = await fetch("/api/pro/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anchor: pc.anchor, genres: pc.genres })
      });
      const data = await res.json();
      pc.anchorAnalysis = data;
      pc.activeWb = data.first_wb ?? "theme";
      pc.step = "workbenches";
      pc.loading = false;
      renderCreationPage();
      handleProGenQuestions(pc.activeWb);
    } catch (err) {
      pc.loading = false;
      pc.error = `分析失败：${err.message}`;
      renderCreationPage();
    }
  }

  async function handleProGenQuestions(wb) {
    const pc = appState.proCreation;
    const wbState = pc.workbenches[wb];
    wbState.loading = true;
    renderCreationPage();
    try {
      const res = await fetch("/api/pro/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wb, context: pc.anchorAnalysis?.context ?? {}, anchor: pc.anchor, genres: pc.genres })
      });
      const data = await res.json();
      wbState.questions = data.questions ?? [];
      wbState.loading = false;
      renderCreationPage();
    } catch (err) {
      wbState.loading = false;
      wbState.questions = [];
      renderCreationPage();
    }
  }

  async function handleProAssemble() {
    const pc = appState.proCreation;
    pc.step = "assembling";
    pc.loading = true;
    renderCreationPage();
    try {
      const res = await fetch("/api/pro/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anchor: pc.anchor,
          genres: pc.genres,
          format: pc.format ?? "feature",
          theme: { questions: pc.workbenches.theme.questions },
          character: { questions: pc.workbenches.character.questions },
          scene: { questions: pc.workbenches.scene.questions }
        })
      });
      const data = await res.json();
      if (data.projectId) {
        appState.proCreation.active = false;
        await loadProjectFromServer(data.projectId);
        // 形态分流：微短剧进独立创作区(不跑电影式补全链)；其它进电影工作台
        if (appState.project?.project?.format === "micro_drama") {
          setCurrentPage("micro");
        } else {
          setCurrentPage("workflow");
          setCurrentStep("structure");
          // 精品创作组装产出较薄（人物少/节点空/无关系/无场景表）——进工作台后后台续跑补全链
          autoEnrichNewProject({ withRelationships: true, withNodes: true }).catch(() => {});
        }
      }
    } catch (err) {
      pc.step = "workbenches";
      pc.loading = false;
      pc.error = `组装失败：${err.message}`;
      renderCreationPage();
    }
  }

  // ── Async AI handlers ─────────────────────────────────────────────────────────

  async function handleRefineCharacter(characterId) {
    const character = list(appState.project.character_hub?.characters).find((c) => c.id === characterId);
    if (!character) return;

    appState.characterDesign = { loading: true, error: "" };
    renderCharactersPage(dom, appState, characterGetters);

    const projectCtx = {
      project: appState.project.project,
      story_core: appState.project.story_core,
      intent_anchor: appState.project.intent_anchor,
      character_hub: appState.project.character_hub,
      story_bible: appState.project.story_bible
    };

    const result = await callGenerateAPI("refine_character", projectCtx, {
      character,
      lockedFields: list(character.locked_fields)
    });

    const refined = result.character
      ?? result.choices?.[0]?.data?.character
      ?? result.choices?.[0]?.data;

    if (result.error || !refined || typeof refined !== "object") {
      appState.characterDesign = {
        loading: false,
        error: result.error || "AI 返回内容无法解析"
      };
      renderCharactersPage(dom, appState, characterGetters);
      return;
    }

    const locked = new Set(list(character.locked_fields));
    const writableKeys = [
      "name", "story_role",
      "external_goal", "dramatic_need", "contradiction", "pressure_point", "secret",
      "notes", "starting_mask", "arc_start", "arc_end",
      "mbti", "core_drive"
    ];
    for (const key of writableKeys) {
      if (locked.has(key)) continue;
      if (refined[key] == null) continue;
      const value = String(refined[key] ?? "");
      if (value) character[key] = value;
    }
    if (!locked.has("traits") && Array.isArray(refined.traits) && refined.traits.length) {
      // 用户已选的特质作为方向锚点：合并 AI 输出 + 用户原选，去重保留全部
      const existing = list(character.traits).filter((t) => t && String(t).trim());
      const refinedStr = refined.traits.map((t) => String(t)).filter(Boolean);
      if (existing.length > 0) {
        const merged = [...existing];
        for (const t of refinedStr) {
          if (!merged.includes(t)) merged.push(t);
        }
        character.traits = merged;
      } else {
        character.traits = refinedStr;
      }
    }

    appState.characterDesign = { loading: false, error: "" };
    markDirty();
    renderCharactersPage(dom, appState, characterGetters);
  }

  // ── Long-film creation flow async handlers ────────────────────────────────────

  function streamingOnChunk(c, text) {
    c.streamPreview = (c.streamPreview ?? "") + text;
    // 流式期间只更新预览元素的文本，不重建整页——否则每来一个 chunk 就 renderCreationPage
    // 会让整页(所有面板 innerHTML)反复重建，表现为"AI 生成时一直闪"。
    const preview = c.streamPreview;
    const overlayEl = document.querySelector(".cf-ai-overlay-stream"); // 加载遮罩里的流式行
    const streamEl = document.querySelector(".cf-stream-text");        // step3 内联预览
    if (overlayEl) overlayEl.textContent = preview.length > 200 ? "…" + preview.slice(-200) : preview;
    if (streamEl) streamEl.textContent = preview.length > 300 ? "…" + preview.slice(-300) : preview;
    // 首个 chunk 时预览容器尚未渲染(页面以空 preview 渲染)，渲染一次把它建出来；后续只走上面的文本更新
    if (!overlayEl && !streamEl) renderCreationPage();
  }

  async function handleGenerateAct(actKey) {
    const c = appState.creation;
    const preset = c._structurePreset;
    if (!preset) return;

    const act = (preset.acts ?? []).find(a => a.key === actKey);
    if (!act) return;

    const nodes = (preset.nodes ?? []).filter(n => n[1] === actKey);
    if (nodes.length === 0) return;

    c.loadingStep = 4;
    c.aiError = "";
    renderCreationPage();

    try {
      const res = await fetch("/api/ai/generate-act-nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectCtx: {
            project: { project: { ...c.draft, genre: c.genres ?? [] }, logline: c.draft?.logline },
            story_core: { premise: c.draft?.logline, core_conflict: c.draft?.core_conflict },
            intent_anchor: { protagonist: c.draft?.protagonist },
            // 把已确认的人物提案传给故事点生成，否则 AI 会为同一个故事另造一套人名，
            // 导致结构骨架与剧情卡/剧本的人物名整套分裂
            character_hub: { characters: (c.characterProposals ?? []).filter((p) => p._status !== "skipped") }
          },
          actTitle: act.title,
          actPurpose: act.purpose,
          nodes
        })
      });
      const json = await res.json();
      if (json.ok && json.data?.nodes) {
        if (!c.actResults) c.actResults = {};
        c.actResults[actKey] = { nodes: json.data.nodes };
      } else {
        c.aiError = json.error ?? "生成失败，请重试";
      }
    } catch (err) {
      c.aiError = err.message;
    }

    c.loadingStep = -1;
    renderCreationPage();
  }

  // 工作台「结构骨架」步骤：为所有叙事节点 AI 填写情节（story_title→title，summary→note）。
  // 复用向导同一个 /api/ai/generate-act-nodes 端点，逐幕生成。
  function buildStructureGenCtx() {
    const proj = appState.project;
    return {
      project: { project: proj.project, logline: proj.project?.logline },
      story_core: proj.story_core,
      intent_anchor: proj.intent_anchor,
      character_hub: proj.character_hub,
      story_bible: proj.story_bible
    };
  }

  async function genNodesForAct(act, actNodes) {
    // actNodes: 项目节点对象数组；端点要求 [nodeType, actKey, title, required] 元组
    const tuples = actNodes.map((n) => [n.node_type, act.key, n.title, n.required ?? false]);
    const res = await fetch("/api/ai/generate-act-nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectCtx: buildStructureGenCtx(),
        actTitle: act.title,
        actPurpose: act.purpose,
        nodes: tuples
      })
    });
    const json = await res.json();
    if (!json.ok || !json.data?.nodes) throw new Error(json.error ?? "生成失败");
    return json.data.nodes;
  }

  function applyNodeData(node, nodeData) {
    if (!nodeData) return;
    if (nodeData.story_title) node.title = String(nodeData.story_title).trim();
    const parts = [];
    if (nodeData.summary) parts.push(String(nodeData.summary).trim());
    if (nodeData.value_shift) parts.push(`价值转变：${String(nodeData.value_shift).trim()}`);
    if (parts.length) node.note = parts.join("\n\n");
  }

  async function handleGenStructureNotes() {
    const structure = appState.project.structure_profile;
    const acts = list(structure?.acts);
    const allNodes = list(structure?.nodes);
    if (acts.length === 0 || allNodes.length === 0) return;
    if (appState.structureNodeGen?.loading) return;

    appState.structureNodeGen = { loading: true, progress: "" };
    render();
    // 先收集所有幕的生成结果。render() 会经 ensurePlotDrivenProject 重建 nodes 数组，
    // 循环内持有的旧引用会变成孤儿对象，写入丢失。故聚合后统一写回当前 live 节点。
    const generated = {};
    try {
      for (let i = 0; i < acts.length; i++) {
        const act = acts[i];
        const actNodes = allNodes.filter((n) => n.act_id === act.id);
        if (actNodes.length === 0) continue;
        appState.structureNodeGen.progress = `${i + 1}/${acts.length} 幕`;
        render();
        const nodes = await genNodesForAct(act, actNodes);
        Object.assign(generated, nodes);
      }
    } catch (err) {
      appState.structureNodeGen = { loading: false, progress: "", error: err.message };
      render();
      return;
    }
    list(appState.project.structure_profile?.nodes).forEach((node) => applyNodeData(node, generated[node.node_type]));
    appState.structureNodeGen = { loading: false, progress: "" };
    normalizeProject();
    markDirty();
    render();
  }

  async function handleGenNodeNote(nodeId) {
    const structure = appState.project.structure_profile;
    const node = list(structure?.nodes).find((n) => n.id === nodeId);
    if (!node) return;
    const act = list(structure?.acts).find((a) => a.id === node.act_id);
    if (!act) return;
    if (appState.structureNodeGen?.loading) return;

    appState.structureNodeGen = { loading: true, progress: "本节点" };
    render();
    try {
      const nodes = await genNodesForAct(act, [node]);
      // render() 后 nodes 数组已被 ensurePlotDrivenProject 重建，需按 id 取回 live 节点再写入。
      const liveNode = list(appState.project.structure_profile?.nodes).find((n) => n.id === nodeId);
      applyNodeData(liveNode ?? node, nodes[node.node_type]);
    } catch (err) {
      appState.structureNodeGen = { loading: false, progress: "", error: err.message };
      render();
      return;
    }
    appState.structureNodeGen = { loading: false, progress: "" };
    markDirty();
    render();
  }

  // 标题派生：优先用所选 AI 概念的标题，否则从 logline 截取首个分句作为可编辑工作标题
  function deriveWorkingTitle(selectedConcept, logline) {
    const conceptTitle = (selectedConcept?.data?.title ?? selectedConcept?.title ?? "").trim().replace(/^[《「]|[》」]$/g, "");
    if (conceptTitle) return conceptTitle;
    const line = String(logline ?? "").trim();
    if (!line) return "未命名项目";
    const firstClause = line.split(/[，。；,.;\n]/)[0].trim();
    const base = firstClause || line;
    return base.length > 16 ? base.slice(0, 16) : base;
  }

  async function handleFinalizeNewCreation() {
    const c = appState.creation;
    const draft = c.draft ?? {};
    const template = draft.structure_template ?? "three_act";
    const preset = structurePresets[template] ?? buildCustomStructurePreset(2);

    const proj = createEmptyProject();
    proj.project.title = draft.title?.trim() || deriveWorkingTitle(c.selectedConcept, draft.logline);
    // 手写 logline 没起名时，标题会是 logline 破句（「破产千金白天在前夫的公司里当保洁」）——
    // 让 AI 起个片名，失败就保留破句兜底
    const titleIsClause = !draft.title?.trim() && !(c.selectedConcept?.data?.title ?? c.selectedConcept?.title ?? "").trim();
    if (titleIsClause && (draft.logline ?? "").trim()) {
      const tRes = await callGenerateAPI("title", {
        genres: c.genres ?? [], logline: draft.logline, format: draft.format ?? "feature"
      }, {});
      const aiTitle = (tRes.choices?.[0]?.data?.title ?? "").trim().replace(/^[《「]|[》」]$/g, "");
      if (!tRes.error && aiTitle && aiTitle.length <= 12) proj.project.title = aiTitle;
    }
    proj.project.format = draft.format ?? "feature";
    // 类型标签必须落到项目上，否则类型契约引擎（genreContract）全程拿不到类型
    proj.project.genre = Array.isArray(c.genres) ? [...c.genres] : [];
    proj.project.logline = draft.logline ?? "";
    proj.story_core.premise = draft.logline ?? "";
    proj.story_core.core_conflict = draft.core_conflict ?? "";
    proj.intent_anchor = proj.intent_anchor ?? {};
    proj.intent_anchor.protagonist = draft.protagonist ?? "";

    const acts = (preset.acts ?? []).map((a, i) => ({
      id: createId("act"), key: a.key, title: a.title, purpose: a.purpose,
      range_label: a.range_label, order_index: i
    }));
    const actMap = new Map(acts.map(a => [a.key, a.id]));
    const nodes = (preset.nodes ?? []).map(([nodeType, actKey, nodeTitle, required], i) => ({
      id: createId("node"), node_type: nodeType, title: nodeTitle, required,
      act_id: actMap.get(actKey) ?? null, order_index: i, card_ids: [], note: ""
    }));
    proj.structure_profile = { template, acts, nodes };

    const actResults = c.actResults ?? {};
    const actIdToKey = new Map(acts.map(a => [a.id, a.key]));
    const cards = [];
    for (const node of nodes) {
      const actKey = actIdToKey.get(node.act_id);
      const result = actKey ? actResults[actKey] : null;
      const nodeData = result?.nodes?.[node.node_type];
      if (nodeData) {
        const cardId = createId("card");
        // 创作流程生成的故事点是正式主线：直接归位到主线轨并挂上幕，
        // 否则会全部落进「未定义」轨，剧情开发板呈现为空板
        cards.push({
          id: cardId,
          node_id: node.id,
          act_id: node.act_id ?? "",
          type: "mainline",
          lane_id: "lane_main",
          title: nodeData.story_title ?? nodeData.key_event ?? "",
          summary: nodeData.summary ?? "",
          value_shift: nodeData.value_shift ?? "",
          status: "draft"
        });
        node.card_ids = [cardId];
        // 结构骨架页的节点「待填写」判定看 node.note——不回填的话，
        // 生成内容只在剧情卡里，结构页永远显示待填写
        node.note = [
          nodeData.summary ?? nodeData.key_event ?? "",
          nodeData.value_shift ? `价值转变：${nodeData.value_shift}` : ""
        ].filter(Boolean).join("\n");
      }
    }
    proj.plot_board = { cards };

    // AI 角色用 story_bible 方言（external_want/internal_need/...），写进 story_bible.characters，
    // 并清空 character_hub，让 ensurePlotDrivenProject 的 deriveCharacterHub 重新派生出完整 hub 字段。
    // 旧实现误用 desire/wound 写 character_hub，导致深层字段全丢、归一化又冲回空骨架。
    const chars = (c.characterProposals ?? []).filter(p => p._status !== "skipped").map(ch => ({
      id: createId("char"),
      name: ch.name ?? "",
      story_role: ch.story_role ?? "supporting",
      archetype: ch.archetype ?? "",
      external_want: ch.external_want ?? "",
      internal_need: ch.internal_need ?? "",
      psychological_flaw: ch.psychological_flaw ?? "",
      moral_flaw: ch.moral_flaw ?? "",
      public_mask: ch.public_mask ?? "",
      core_fear: ch.core_fear ?? "",
      wound: ch.wound ?? "",
      belief: ch.belief ?? "",
      arc_start: ch.arc_start ?? "",
      arc_end: ch.arc_end ?? "",
      voice_rules: Array.isArray(ch.voice_rules) ? ch.voice_rules : [],
      secret: ch.secret ?? ""
    }));
    if (chars.length > 0) {
      proj.story_bible.characters = chars;
      proj.character_hub = { characters: [], relationship_map: [] };
    }

    // 关系网（≥2 人）不在此处阻塞生成——否则点「完成创建」后会先在创建页闪一屏
    // 「生成关系网中」再跳工作台。改为导航后由 autoEnrichNewProject 后台生成（见下方分流）。

    // Set as current project and save to server
    appState.project = ensurePlotDrivenProject(proj);
    normalizeProject();
    appState.creation = null;

    try {
      await saveProjectToServer();
    } catch (err) {
      // Save failed - still navigate but warn
      console.warn("项目保存失败:", err.message);
    }

    // 形态分流：微短剧进独立创作区；连续剧走季-集模式直接进分集板；其它进电影工作台并后台补全
    const fmt = appState.project?.project?.format;
    if (fmt === "micro_drama") {
      setCurrentPage("micro");
    } else if (fmt === "series") {
      // 连续剧落在第一步「人物核心」：顺导航往右走(人物→关系→季弧→分集→…)即正确开发流程
      setCurrentPage("workflow");
      setCurrentStep("characters");
      // 关系网后台生成（连续剧无剧情卡，autoEnrich 的场景规划会自动跳过）
      autoEnrichNewProject({ withRelationships: true }).catch(() => {});
    } else {
      setCurrentPage("workflow");
      setCurrentStep("structure");
      // 兑现 step1「一气呵成产出场景全套」的承诺：进入工作台后后台续跑
      // 关系网 + 故事核心反推 + 场景规划，每步完成即保存，失败不打扰
      autoEnrichNewProject({ withRelationships: true }).catch(() => {});
    }
  }

  // ── 创建后自动补全：故事核心四件套 / 关系网 / 节点填写 / 场景规划 ──────────
  // 在已进入工作台后串行后台执行；快速创建只缺 核心+场景，精品创作组装
  // 产出更薄（1 人物 / 节点全空），额外补 关系网+节点填写。
  async function autoEnrichNewProject({ withRelationships = false, withNodes = false } = {}) {
    const projectId = appState.project?.project?.id;
    const stillSame = () => appState.project?.project?.id === projectId;

    if (withRelationships && stillSame()) {
      const chars = list(appState.project.story_bible?.characters);
      if (chars.length >= 2 && list(appState.project.character_hub?.relationship_map).length === 0) {
        const nameToId = new Map(chars.map((ch) => [ch.name, ch.id]));
        // 静默链失败用户无从知晓（精品创作组装期 AI 负载高易抖动）——多给一次机会，独立容错不连累后续补全
        let rels = [];
        for (let attempt = 0; attempt < 2 && rels.length === 0 && stillSame(); attempt++) {
          try {
            const res = await callGenerateAPI("relationships", {
              characters: chars,
              concept: { title: appState.project.project.title, hook: appState.project.project.logline ?? "" },
              synopsis: { summary: appState.project.story_core?.premise ?? "" }
            }, {});
            if (res.error) continue;
            rels = list(res.choices?.[0]?.data?.relationships).map((rel) => ({
              id: createId("rel"),
              source_character_id: nameToId.get(rel.source_character_name) ?? "",
              target_character_id: nameToId.get(rel.target_character_name) ?? "",
              relationship_type: rel.relationship_type ?? "",
              tension: rel.tension ?? "",
              power_balance: rel.power_balance ?? "",
              shared_history: rel.shared_history ?? "",
              hidden_information: rel.hidden_information ?? ""
            })).filter((rel) => rel.source_character_id && rel.target_character_id);
          } catch { /* 网络抖动，下一轮重试 */ }
        }
        if (rels.length > 0 && stillSame()) {
          appState.project.story_bible.relationships = rels;
          normalizeProject(); markDirty(); render();
          await saveProjectToServer().catch(() => {});
        }
      }
    }

    if (withNodes && stillSame() && list(appState.project.structure_profile?.nodes).every((n) => !(n.note ?? "").trim())) {
      try { await handleGenStructureNotes(); } catch { /* 节点填写失败不阻塞后续 */ }
      if (stillSame()) await saveProjectToServer().catch(() => {});
    }

    if (stillSame()) {
      const core = appState.project.story_core ?? {};
      const CORE_KEYS = ["core_conflict", "central_question", "emotional_promise", "theme_statement"];
      if (CORE_KEYS.filter((k) => !(core[k] ?? "").trim()).length >= 3) {
        const res = await callGenerateAPI("story_core", appState.project, {});
        const d = res.choices?.[0]?.data ?? {};
        if (!res.error && stillSame()) {
          let touched = false;
          for (const k of CORE_KEYS) {
            if (!(core[k] ?? "").trim() && (d[k] ?? "").trim()) { core[k] = String(d[k]).trim(); touched = true; }
          }
          if (touched) { markDirty(); render(); await saveProjectToServer().catch(() => {}); }
        }
      }
    }

    if (stillSame() && !appState.sceneExpandLoading) {
      const scenes = list(appState.project.scene_workbench?.scenes);
      const hasRealScene = scenes.some((s) => (s.script_full || s.script_excerpt || "").trim() || ((s.location || "").trim() && s.location !== "待定地点"));
      if (!hasRealScene && getLivePlotCards().length > 0) {
        appState.sceneExpandLoading = true;
        render();
        try {
          const format = appState.project.project.format ?? "feature";
          const target = SCENE_TARGETS_BY_FORMAT[format] ?? 28;
          // 静默链失败用户无从知晓——网络抖动时多给一次机会
          let planned = [];
          for (let attempt = 0; attempt < 2 && planned.length === 0; attempt++) {
            const result = await callGenerateAPI("scene_expansion", appState.project, { targetSceneCount: target });
            if (!result.error) planned = list(result.choices?.[0]?.data?.scenes);
          }
          if (planned.length > 0 && stillSame()) {
            applySceneExpansion(planned);
            markDirty();
          }
        } finally {
          appState.sceneExpandLoading = false;
          if (stillSame()) {
            normalizeProject(); render();
            await saveProjectToServer().catch(() => {});
          }
        }
      }
    }
  }

  async function handleGenerateConceptCF() {
    const c = appState.creation;
    c.loadingStep = 1;
    c.aiError = "";
    c.streamPreview = "";
    c.conceptChoices = [];
    renderCreationPage();

    const draft = c.draft ?? {};
    const conceptHint = (draft.logline || draft.title || "").trim();
    const result = await callGenerateAPIStream(
      "concept",
      {},
      { genres: c.genres ?? [], conceptHint, era: "", count: 3 },
      (text) => streamingOnChunk(c, text)
    );

    if (result.cancelled) return;
    c.loadingStep = -1;
    c.streamPreview = "";
    if (result.error) {
      c.aiError = result.error;
    } else {
      const choices = result.choices ?? [];
      if (choices.length === 0) {
        c.aiError = "AI 未返回故事概念，请重试";
      } else {
        c.conceptChoices = choices;
        c.lastReasoning = result.reasoning ?? "";
      }
    }
    renderCreationPage();
  }

  async function handleGenerateCharactersCF() {
    const c = appState.creation;
    c.loadingStep = 3;
    c.aiError = "";
    c.streamPreview = "";
    c.characterProposals = [];
    renderCreationPage();

    // 新5步流程用 draft 数据；旧流程用 selectedSynopsis
    const draft = c.draft ?? {};
    const synopsis = c.selectedSynopsis ?? {};
    const logline = draft.logline || synopsis.summary || "";
    const protagonist = draft.protagonist || "";
    const ctx = {
      project: {
        project: { genre: c.genres ?? [], logline },
        story_core: { premise: logline },
        intent_anchor: { protagonist }
      }
    };
    const result = await callGenerateAPIStream("characters", ctx, { count: 4 },
      (text) => streamingOnChunk(c, text));

    if (result.cancelled) { return; }
    c.loadingStep = -1;
    c.streamPreview = "";
    if (result.error) {
      c.aiError = result.error;
    } else {
      const chars = result.choices?.[0]?.data?.characters ?? [];
      if (chars.length === 0) {
        c.aiError = "AI 未返回角色数据，请重试";
      } else {
        c.characterProposals = chars.map((ch) => ({ ...ch, _status: "pending" }));
        c.lastReasoning = result.reasoning ?? "";
      }
    }
    renderCreationPage();
  }

  async function handleRegenSingleCharacter(idx) {
    const c = appState.creation;
    const char = c.characterProposals?.[idx];
    if (!char) return;
    const storyRole = char.story_role ?? char.role ?? "supporting";
    const others = (c.characterProposals ?? []).filter((_, i) => i !== idx);
    const ctx = { genres: c.genres ?? [], concept: c.selectedConcept ?? {}, synopsis: c.selectedSynopsis ?? {} };

    c.regenCharIdx = idx;
    c.aiError = "";
    renderCreationPage();

    const result = await callGenerateAPIStream("single_character", ctx,
      { storyRole, existingChars: others },
      (text) => { c.streamPreview = text; });

    c.regenCharIdx = -1;
    c.streamPreview = "";
    if (result.error) {
      c.aiError = result.error;
    } else {
      const newChar = result.choices?.[0]?.data?.character ?? null;
      if (newChar) {
        c.characterProposals[idx] = { ...newChar, _status: "pending" };
      }
    }
    renderCreationPage();
  }

  return {
    handleProAnalyzeAnchor, handleProGenQuestions, handleProAssemble,
    handleRefineCharacter, handleGenerateAct,
    handleGenStructureNotes, handleGenNodeNote,
    handleFinalizeNewCreation, autoEnrichNewProject,
    handleGenerateConceptCF, handleGenerateCharactersCF, handleRegenSingleCharacter
  };
}
