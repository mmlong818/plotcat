// 创作流程编排层：创作页重绘入口 renderCreationPage + 点击/输入事件分发器，
// 组合微短剧生成簇（microGen）与创作 AI 异步簇（creationAI）。
// 从 app.js 外提；运行期依赖经 createCreationFlow 注入。
import { appState, structurePresets } from "../state.js";
import { createEmptyProject } from "../shared/projectFactory.js";
import { ensurePlotDrivenProject } from "../shared/plotDrivenProject.js";
import { renderProCreationPage } from "../render/proCreationFlow.js";
import { renderCreationFlowPage } from "../render/creationFlow.js";
import { createMicroGen } from "./microGen.js";
import { createCreationAI } from "./creationAI.js";

export function createCreationFlow(deps) {
  const {
    dom, render, markDirty, saveLocalSnapshot, fetchJson,
    setCurrentPage, setCurrentStep, cancelGeneration,
    applyProjectDraftToProject, summarizeProjectListItem
  } = deps;

  function renderCreationPage() {
    if (!dom.creationContent) return;
    saveLocalSnapshot();
    // 整页 innerHTML 重绘会让长页面（人物确认/情节大纲）瞬时塌缩回顶，
    // 用户每点一次「确认」就被甩回页首——重绘后恢复滚动位置
    const scrollY = window.scrollY;
    if (appState.proCreation?.active) {
      renderProCreationPage(dom, appState);
    } else {
      renderCreationFlowPage(dom, appState);
    }
    if (scrollY > 0) window.scrollTo(0, scrollY);
  }

  const micro = createMicroGen({ render, markDirty });
  const ai = createCreationAI({ ...deps, renderCreationPage });
  const {
    handleProAnalyzeAnchor, handleProGenQuestions, handleProAssemble,
    handleGenerateAct, handleFinalizeNewCreation,
    handleGenerateConceptCF, handleGenerateCharactersCF, handleRegenSingleCharacter
  } = ai;

  // 决议 3：直接创建空项目并跳到「结构骨架」（跳过 AI 入口）
  async function handleCreateBlankProjectThenStructure() {
    const payload = {
      title: "未命名故事",
      format: appState.createModeFormat ?? "feature",
      language: "zh-CN",
      genre: [],
      logline: "",
      theme_question: "",
      tone: ""
    };
    try {
      const response = await fetchJson("/api/projects", { method: "POST", body: JSON.stringify(payload) });
      appState.project = ensurePlotDrivenProject(response.project);
      appState.projectList = response.projects ?? appState.projectList;
      appState.runtime.serverAvailable = true;
    } catch {
      appState.project = applyProjectDraftToProject(createEmptyProject(payload));
      appState.projectList = [summarizeProjectListItem(appState.project), ...appState.projectList];
    }
    setCurrentPage("workflow");
    setCurrentStep("structure");
  }

  // ── Creation action handlers ──────────────────────────────────────────────────

  function handleCreationClick(action, target) {
    // ── 模式选择 & 精品创作 ──────────────────────────────────────
    if (action === "open-create-mode-picker") {
      appState.createModePickerOpen = true;
      render();
      return true;
    }
    if (action === "close-create-mode-picker") {
      appState.createModePickerOpen = false;
      render();
      return true;
    }
    if (action === "pick-create-format") {
      appState.createModeFormat = target?.dataset?.id || "feature";
      render();
      return true;
    }
    if (action === "open-quick-creation") {
      const pickedFormat = appState.createModeFormat ?? "feature";
      appState.createModePickerOpen = false;
      appState.proCreation.active = false;
      appState.currentPage = "creation";
      appState.createDialogOpen = false;
      if (!appState.creation) {
        appState.creation = {
          draft: { format: pickedFormat, structure_template: "three_act" },
          currentStep: 1, genres: [], era: "", conceptHint: "",
          conceptChoices: [], selectedConceptIdx: -1, selectedConcept: null,
          conceptCustom: "", conceptCustomOpen: false,
          synopsisChoices: [], selectedSynopsisIdx: -1, selectedSynopsis: null,
          synopsisCustom: "", synopsisCustomOpen: false,
          characterProposals: [], confirmedCharacters: [],
          sceneProposals: [], selectedSceneIds: new Set(),
          selectedStructure: { primary: null, devices: [], lens: [] },
          actStructure: null, actStructureChoice: null,
          loadingStep: -1, aiError: "", lastReasoning: "",
          reasoningPanelOpen: false, autoGen: null
        };
      } else {
        // 续用未完成草稿时，以本次入口选的形态为准
        appState.creation.draft = appState.creation.draft ?? {};
        appState.creation.draft.format = pickedFormat;
      }
      saveLocalSnapshot();
      render();
      renderCreationPage();
      return true;
    }
    if (action === "open-pro-creation") {
      appState.createModePickerOpen = false;
      appState.proCreation = {
        active: true, step: "anchor", anchor: "",
        format: appState.createModeFormat ?? "feature",
        anchorAnalysis: null, activeWb: "theme", genres: [],
        workbenches: {
          theme:     { questions: [], loading: false, done: false },
          character: { questions: [], loading: false, done: false },
          scene:     { questions: [], loading: false, done: false }
        },
        loading: false, error: null
      };
      appState.currentPage = "creation";
      appState.createDialogOpen = false;
      saveLocalSnapshot();
      render();
      renderCreationPage();
      return true;
    }
    if (action === "open-from-structure") {
      // 决议 3：用户已有完整故事 → 直接进结构骨架页，跳过 AI 入口
      appState.createModePickerOpen = false;
      appState.proCreation.active = false;
      appState.creation = null;
      handleCreateBlankProjectThenStructure().catch((err) => {
        console.error("[open-from-structure] failed:", err);
      });
      return true;
    }
    if (action === "back-to-projects") {
      appState.currentPage = "project";
      appState.proCreation.active = false;
      render();
      return true;
    }
    if (action === "pro-back-to-anchor") {
      appState.proCreation.step = "anchor";
      renderCreationPage();
      return true;
    }
    if (action === "pro-analyze-anchor") {
      handleProAnalyzeAnchor();
      return true;
    }
    if (action === "pro-gen-questions") {
      handleProGenQuestions(target.dataset.wb);
      return true;
    }
    if (action === "pro-switch-wb") {
      const wb = target.dataset.wb;
      appState.proCreation.activeWb = wb;
      if (appState.proCreation.workbenches[wb].questions.length === 0 && !appState.proCreation.workbenches[wb].loading) {
        handleProGenQuestions(wb);
      } else {
        renderCreationPage();
      }
      return true;
    }
    if (action === "pro-mark-wb-done") {
      const wb = target.dataset.wb;
      appState.proCreation.workbenches[wb].done = !appState.proCreation.workbenches[wb].done;
      renderCreationPage();
      return true;
    }
    if (action === "pro-assemble") {
      handleProAssemble();
      return true;
    }
    if (action === "pro-toggle-genre") {
      const g = target.dataset.value;
      const genres = appState.proCreation.genres;
      const idx = genres.indexOf(g);
      if (idx >= 0) genres.splice(idx, 1); else genres.push(g);
      renderCreationPage();
      return true;
    }

    const c = appState.creation;

    if (action === "proceed-from-pulse") {
      const seed = (c.pulseSeeds ?? [])[c.selectedPulseSeedIdx];
      if (seed) {
        c.genre = c.pulseGenre || "";
        c.styleKeywords = seed.hook ?? "";
        c.pulseSeedContext = seed;
      }
      c.currentStep = 1;
      c.aiError = "";
      renderCreationPage();
      return true;
    }
    if (action === "goto-creation-step") {
      const step = Number(target.dataset.step ?? 1);
      c.currentStep = step;
      c.aiError = "";
      renderCreationPage();
      return true;
    }
    if (action === "show-ai-reasoning") {
      c.reasoningPanelOpen = true;
      renderCreationPage();
      return true;
    }
    if (action === "close-reasoning-panel") {
      c.reasoningPanelOpen = false;
      renderCreationPage();
      return true;
    }
    // ── New 5-step creation flow actions ────────────────────────────────────

    if (action === "cf-set-draft-field") {
      const field = target.dataset.field ?? "";
      const value = target.value ?? "";
      if (!c.draft) c.draft = {};
      const prev = c.draft[field] ?? "";
      c.draft[field] = value;
      // logline 临界点（≥10 字）只局部更新「下一步」按钮禁用态——
      // 整页重绘会在打字中途重建 DOM：丢焦点、吞后续字符、视觉闪烁
      if (field === "logline") {
        const wasValid = prev.trim().length >= 10;
        const nowValid = value.trim().length >= 10;
        if (wasValid !== nowValid) {
          const nextBtn = document.querySelector('[data-action="cf-step1-next"]');
          if (nextBtn) nextBtn.disabled = !nowValid;
        }
      }
      return true;
    }

    if (action === "cf-step1-next") {
      // 类型软引导：未选题材时提示(不硬拦)。类型契约(观众承诺/必备场景/禁忌)会注入后续所有 AI 生成,
      // 空类型则失去护栏——给一次确认机会让用户回头补选。
      if ((c.genres ?? []).length === 0) {
        const proceed = window.confirm(
          "还没选择题材类型。\n\n题材类型的「观众承诺 / 必备场景 / 禁忌」会作为契约注入后续所有 AI 生成——不选则失去这层护栏，生成更易跑偏。\n\n建议至少选 1 个主导类型。仍要继续？");
        if (!proceed) return true; // 留在 step1 让用户补选
      }
      c.currentStep = 2;
      c.aiError = "";
      renderCreationPage();
      return true;
    }

    if (action === "cf-step1-ai-suggest") {
      handleGenerateConceptCF();
      return true;
    }

    if (action === "cf-step1-pick-concept") {
      const idx = parseInt(target.dataset.idx ?? "0", 10);
      const choice = (c.conceptChoices ?? [])[idx];
      if (!choice) return true;
      const d = choice.data ?? {};
      if (!c.draft) c.draft = {};
      if (d.title && !c.draft.title) c.draft.title = String(d.title).replace(/^[《「]|[》」]$/g, "");
      if (d.hook) c.draft.logline = d.hook;
      // 核心冲突跟着方向一起带走，否则 finalize 后故事核心的「核心冲突」恒空
      if (d.core_conflict) c.draft.core_conflict = d.core_conflict;
      c.selectedConceptIdx = idx;
      c.aiError = "";
      renderCreationPage();
      return true;
    }

    if (action === "cf-step2-next") {
      const template = c.draft?.structure_template ?? "three_act";
      c._structurePreset = structurePresets[template] ?? null;
      c.currentStep = 3;
      c.aiError = "";
      if ((c.characterProposals ?? []).length === 0) handleGenerateCharactersCF();
      renderCreationPage();
      return true;
    }

    if (action === "cf-step3-next") {
      c.currentStep = 4;
      c.currentActIdx = 0;
      c.actResults = c.actResults ?? {};
      c.aiError = "";
      renderCreationPage();
      return true;
    }

    if (action === "cf-generate-act") {
      const actKey = target.dataset.actKey ?? "";
      handleGenerateAct(actKey);
      return true;
    }

    if (action === "cf-advance-act") {
      c.currentActIdx = (c.currentActIdx ?? 0) + 1;
      c.aiError = "";
      renderCreationPage();
      return true;
    }

    if (action === "cf-step4-finish") {
      c.currentStep = 5;
      c.aiError = "";
      renderCreationPage();
      return true;
    }

    if (action === "cf-finalize-new") {
      handleFinalizeNewCreation();
      return true;
    }

    if (action === "confirm-character") {
      const idx = Number(target.dataset.idx ?? -1);
      if (idx >= 0 && (c.characterProposals ?? [])[idx]) c.characterProposals[idx]._status = "confirmed";
      renderCreationPage();
      return true;
    }
    if (action === "cf-add-blank-character") {
      // 决议 2：始终允许手动新增（不依赖 AI）
      c.characterProposals = c.characterProposals ?? [];
      c.characterProposals.push({
        name: "", story_role: "protagonist", archetype: "",
        desire: "", wound: "", arc_start: "", arc_end: "",
        _status: "pending", _manual: true
      });
      c.editingCharIdx = c.characterProposals.length - 1;
      c.aiError = "";
      renderCreationPage();
      return true;
    }
    if (action === "cf-use-fallback-characters") {
      // 决议 2：AI 失败时基于 logline 给默认 3 主角骨架，不阻塞
      const logline = (c.draft?.logline ?? c.selectedSynopsis?.summary ?? "").trim();
      const protagonist = (c.draft?.protagonist ?? "").trim();
      c.characterProposals = [
        {
          name: protagonist || "主角",
          story_role: "protagonist", archetype: "",
          desire: logline ? `推动核心动作：${logline.slice(0, 40)}…` : "",
          wound: "", arc_start: "", arc_end: "",
          _status: "pending", _fallback: true
        },
        { name: "盟友", story_role: "ally", archetype: "", desire: "", wound: "", arc_start: "", arc_end: "", _status: "pending", _fallback: true },
        { name: "对手", story_role: "antagonist", archetype: "", desire: "", wound: "", arc_start: "", arc_end: "", _status: "pending", _fallback: true }
      ];
      c.aiError = "";
      renderCreationPage();
      return true;
    }
    if (action === "skip-character") {
      const idx = Number(target.dataset.idx ?? -1);
      if (idx >= 0 && (c.characterProposals ?? [])[idx]) c.characterProposals[idx]._status = "skipped";
      renderCreationPage();
      return true;
    }
    if (action === "edit-character") {
      c.editingCharIdx = Number(target.dataset.idx ?? -1);
      renderCreationPage();
      return true;
    }
    if (action === "cancel-edit-character") {
      c.editingCharIdx = -1;
      renderCreationPage();
      return true;
    }
    if (action === "save-character-edit") {
      const idx = Number(target.dataset.idx ?? -1);
      if (idx >= 0 && (c.characterProposals ?? [])[idx]) {
        const card = target.closest(".cf-char-card");
        if (card) {
          card.querySelectorAll("[data-char-field]").forEach((input) => {
            const field = input.dataset.charField;
            if (field) c.characterProposals[idx][field] = input.value;
          });
          c.characterProposals[idx]._status = "pending";
        }
      }
      c.editingCharIdx = -1;
      renderCreationPage();
      return true;
    }
    if (action === "regen-single-character") {
      const idx = Number(target.dataset.idx ?? -1);
      if (idx >= 0) handleRegenSingleCharacter(idx);
      return true;
    }
    if (action === "ai-generate-characters-cf") {
      handleGenerateCharactersCF();
      return true;
    }
    if (action === "cancel-cf-ai") {
      cancelGeneration();
      appState.creation.loadingStep = -1;
      appState.creation.streamPreview = "";
      renderCreationPage();
      return true;
    }
    if (action === "go-to-project") {
      appState.creation = null;
      setCurrentPage("project");
      return true;
    }
    return false;
  }

  // ── Creation input handler ────────────────────────────────────────────────────

  function handleCreationInput(action, target) {
    if (action === "cf-set-draft-field") {
      const c = appState.creation;
      if (!c) return true;
      const field = target.dataset.field ?? "";
      const value = target.value ?? "";
      if (!c.draft) c.draft = {};
      const prev = c.draft[field] ?? "";
      c.draft[field] = value;
      // 同上：临界点只动按钮，不整页重绘
      if (field === "logline") {
        const wasValid = prev.trim().length >= 10;
        const nowValid = value.trim().length >= 10;
        if (wasValid !== nowValid) {
          const nextBtn = document.querySelector('[data-action="cf-step1-next"]');
          if (nextBtn) nextBtn.disabled = !nowValid;
        }
      }
      return true;
    }
    if (action === "pro-anchor-input") {
      appState.proCreation.anchor = target.value;
      return true;
    }
    if (action === "pro-set-answer") {
      const wb = target.dataset.wb;
      const qid = target.dataset.qid;
      const q = appState.proCreation.workbenches[wb]?.questions.find((item) => item.id === qid);
      if (q) q.answer = target.value;
      return true;
    }

    const c = appState.creation;
    if (action === "pulse-set-target") {
      c.pulseTarget = target.value;
      return true;
    }
    return false;
  }

  return {
    renderCreationPage, handleCreationClick, handleCreationInput,
    ...micro, ...ai
  };
}
