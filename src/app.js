import { cloneDefaultProject } from "./data/defaultProject.js";
import { createEmptyProject, createId } from "./shared/projectFactory.js";
import { ensurePlotDrivenProject } from "./shared/plotDrivenProject.js";

import {
  STORAGE_KEY, AUTOSAVE_DELAY, workflowSteps, projectCreateStepsCurrent,
  formatLabels, projectFormatChoices,
  structureTemplateLabels, formatStructureOptions, formatDefaultTemplates,
  structurePresets, buildCustomStructurePreset,
  appState, createDefaultProjectDraft,
  RELATIONSHIP_TYPE_OPTIONS
} from "./state.js";
if (typeof window !== "undefined") window.appState = appState; // 调试/E2E 验证用

const RELATIONSHIP_TYPE_KIND_VALUES = new Set(RELATIONSHIP_TYPE_OPTIONS);

import {
  escapeHtml,
  list,
  unique,
  splitTags,
  isBrokenPlaceholderText
} from "./utils.js";

import { renderStructurePage } from "./render/structure.js";
import { renderCharactersPage } from "./render/characters.js";
import { renderRelationshipsPage } from "./render/relationships.js";
import { renderScenesPage } from "./render/scenes.js";
import { renderEpisodesPage } from "./render/episodes.js";
import { renderMicroPage } from "./render/micro.js";
import { renderScreenplayPage } from "./render/screenplay.js";
import { initContext } from "./handlers/context.js";
import { handleCharacterClick } from "./handlers/character.js";
import { handlePlotClick } from "./handlers/plot.js";
import { handleSceneClick } from "./handlers/scene.js";
import { handleStructureClick } from "./handlers/structure.js";
import { handleRelationshipClick } from "./handlers/relationship.js";
import { handleStoryBibleClick } from "./handlers/storyBible.js";
import { handleKnowledgeClick } from "./handlers/knowledge.js";
import { handleRaterClick } from "./handlers/rater.js";
import { handleScreenplayClick } from "./handlers/screenplay.js";
import { handleProjectNavClick } from "./handlers/projectNav.js";
import { handleAiConfigClick } from "./handlers/aiConfig.js";
import { handleProjectDraftClick } from "./handlers/projectDraft.js";
import { handleEpisodeClick } from "./handlers/episode.js";
import { handleMicroClick } from "./handlers/micro.js";
import { renderLocksPage } from "./render/locks.js";
import { renderSeriesLibraryPage } from "./render/seriesLibrary.js";
import { renderPlotsPage } from "./render/plots.js";
import { renderProjectList, renderProjectCreateForm, renderAiSettingsDialog } from "./render/project.js";
import { renderStructureLibraryDialog } from "./render/structureLibrary.js";
import { STORY_STRUCTURE_LIBRARY } from "./data/storyStructureLibrary.js";
import { renderCreationFlowPage, renderFormatFieldInner, renderGenreFieldInner } from "./render/creationFlow.js";
import { renderProCreationPage } from "./render/proCreationFlow.js";
import { createSeriesLibrary } from "./series/seriesLibrary.js";
import { createScriptTools } from "./editing/scriptTools.js";
import { createSceneGeneration, SCENE_TARGETS_BY_FORMAT } from "./ai/sceneGeneration.js";
import { createCreationWorkbench } from "./ai/creationWorkbench.js";
import { createCreationFlow } from "./creation/flow.js";

workflowSteps.splice(0, workflowSteps.length, ...[
  { id: "structure",     label: "结构骨架", description: "选定结构模板，划出各幕比例，标记必要的叙事节点。" },
  { id: "episodes",      label: "分集脚本", description: "连续剧按季-集创作：分季管理，每集黄金三秒钩子、爽点、集尾 cliffhanger、贯穿线，挂载场景。", seriesOnly: true },
  { id: "characters",    label: "人物核心", description: "建立主配角档案，确认各自的目标、缺口和弧光方向。" },
  { id: "relationships", label: "关系张力", description: "梳理人物之间的权力差、情感债和共同过去，找到冲突来源。" },
  { id: "plots",         label: "剧情开发", description: "把故事事件写成剧情卡，挂入对应的幕与节点，排出主次线。" },
  { id: "scenes",        label: "场景拆解", description: "把锁定后的剧情卡拆成逐场可写的场景序列；时间线/世界规则/伏笔/类型约束已移至顶部「资料库」。" },
  { id: "screenplay",    label: "剧本撰写", description: "按场景顺序撰写完整剧本，支持逐场 AI 生成与 fountain 导出。" }
]);

const dom = {
  hero: document.querySelector(".hero"),
  heroEyebrow: document.querySelector("#hero-eyebrow"),
  heroTitle: document.querySelector("#hero-title"),
  heroSide: document.querySelector(".hero__side"),
  saveButton: document.querySelector("#save-button"),
  runtimeStatus: document.querySelector("#runtime-status"),
  resetButton: document.querySelector("#reset-button"),
  resetConfirmArea: document.querySelector("#reset-confirm-area"),
  pageProjectButton: document.querySelector("#page-project-button"),
  pageLibraryButton: document.querySelector("#page-library-button"),
  seriesContent: document.querySelector("#series-content"),
  openSettingsButton: document.querySelector("#open-settings-button"),
  stepperNav: document.querySelector("#stepper-nav"),
  projectList: document.querySelector("#project-list"),
  projectCreateDialog: document.querySelector("#project-create-dialog"),
  projectCreateEyebrow: document.querySelector("#project-create-eyebrow"),
  projectCreateTitle: document.querySelector("#project-create-title"),
  projectCreateDescription: document.querySelector("#project-create-description"),
  projectCreateProgress: document.querySelector("#project-create-progress"),
  projectCreateForm: document.querySelector("#project-create-form"),
  cancelCreateProjectButton: document.querySelector("#cancel-create-project-button"),
  prevCreateProjectButton: document.querySelector("#prev-create-project-button"),
  confirmCreateProjectButton: document.querySelector("#confirm-create-project-button"),
  settingsDialog: document.querySelector("#settings-dialog"),
  settingsForm: document.querySelector("#settings-form"),
  closeSettingsButton: document.querySelector("#close-settings-button"),
  structureContent: document.querySelector("#structure-content"),
  plotsContent: document.querySelector("#plots-content"),
  charactersContent: document.querySelector("#characters-content"),
  relationshipsContent: document.querySelector("#relationships-content"),
  locksContent: document.querySelector("#locks-content"),
  scenesContent: document.querySelector("#scenes-content"),
  episodesContent: document.querySelector("#episodes-content"),
  microNav: document.querySelector("#micro-nav"),
  microContent: document.querySelector("#micro-content"),
  screenplayContent: document.querySelector("#screenplay-content"),
  pagePanels: Array.from(document.querySelectorAll("main [data-page]")),
  stepPanels: Array.from(document.querySelectorAll("[data-step-group]")),
  structureLibraryDialog: document.querySelector("#structure-library-dialog"),
  structureLibraryContent: document.querySelector("#structure-library-content"),
  closeLibraryButton: document.querySelector("#close-library-button")
};

// ── Structure helpers ────────────────────────────────────────────────────────

function getStructureOptionsForFormat(format, currentTemplate = null) {
  const values = [...(formatStructureOptions[format] ?? ["three_act", "four_act", "feature_film", "pilot_episode", "custom"])];
  if (currentTemplate && !values.includes(currentTemplate)) {
    values.unshift(currentTemplate);
  }
  return values.map((value) => [value, structureTemplateLabels[value] ?? value]);
}

function getDefaultTemplateForFormat(format) {
  return formatDefaultTemplates[format] ?? "three_act";
}

function currentStepIndex() {
  return workflowSteps.findIndex((item) => item.id === appState.currentStepId);
}

function getStep(stepId = appState.currentStepId) {
  return workflowSteps.find((item) => item.id === stepId) ?? workflowSteps[0];
}

function getActTitle(actId) {
  return list(appState.project.structure_profile?.acts).find((act) => act.id === actId)?.title ?? "未分幕";
}

function getNode(nodeId) {
  return list(appState.project.structure_profile?.nodes).find((node) => node.id === nodeId) ?? null;
}

function getOrderedActs() {
  return list(appState.project.structure_profile?.acts)
    .slice()
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

function getOrderedNodes(actId = null) {
  return list(appState.project.structure_profile?.nodes)
    .filter((node) => !actId || node.act_id === actId)
    .slice()
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

import {
  getLivePlotCards,
  getPlotCard,
  getCharacter,
  getRelationship,
  getScene,
  getTimelineEvent,
  getWorldRule,
  getSetup,
  getCharacterNameById,
  getCharacterLinkedPlotCards,
  getCharacterRelationships,
  getRelationshipLinkedPlotCards,
  getSceneLinkedPlotCards,
  getSceneLinkedCharacters,
  getSceneLinkedRelationships,
  getSceneLinkedTimelineEvents,
  getRelationshipLinkedScenes,
  getRelationshipLinkedTimelineEvents,
  getCharacterLinkedScenes,
  getPlotLinkedRelationships,
  getPlotLinkedScenes,
  getPlotLinkedTimelineEvents
} from "./logic/getters.js";

import {
  getScenarioGroups,
  getPlotLane,
  getActiveScenarioGroup,
  getVisibleLanes,
  getCardsInLaneAct,
  ensurePlotBoardModel,
  applyPlotCardPlacement
} from "./logic/plotBoard.js";

function movePlotCardToLaneAct(cardId, laneId, actId, nodeId = "") {
  const card = getPlotCard(cardId);
  if (!card) return;
  applyPlotCardPlacement(card, { laneId, actId, nodeId });
  normalizeProject();
  markDirty();
  render();
}

function shiftPlotCardWithinLane(cardId, direction) {
  const card = getPlotCard(cardId);
  if (!card || !direction) return;
  const peers = getCardsInLaneAct(card.lane_id, card.act_id);
  const index = peers.findIndex((item) => item.id === card.id);
  if (index < 0) return;
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= peers.length) return;
  const other = peers[targetIndex];
  const currentOrder = card.order_index ?? 0;
  card.order_index = other.order_index ?? currentOrder;
  other.order_index = currentOrder;
  markDirty();
  render();
}

// ── Project state ────────────────────────────────────────────────────────────

function normalizeProject() {
  appState.project = ensurePlotBoardModel(ensurePlotDrivenProject(appState.project));
  const plotCards = list(appState.project.plot_board?.cards);
  const structureNodes = new Map(list(appState.project.structure_profile?.nodes).map((node) => [node.id, node]));
  const characters = list(appState.project.character_hub?.characters);
  const relationships = list(appState.project.character_hub?.relationship_map);
  const scenes = list(appState.project.scene_workbench?.scenes);
  const timeline = list(appState.project.lock_layer?.projections?.timeline_events);
  const rules = list(appState.project.lock_layer?.projections?.world_rules);
  const setups = list(appState.project.lock_layer?.projections?.setup_payoffs);
  if (isBrokenPlaceholderText(appState.project.project?.title)) {
    appState.project.project.title = "未命名项目";
  }
  plotCards.forEach((card) => {
    if (!isBrokenPlaceholderText(card.title)) return;
    card.title = card.summary?.trim() || card.change?.trim() || structureNodes.get(card.node_id)?.title || "未命名剧情卡";
  });
  // 伏笔状态自动同步：回收场已成稿且能找到回收痕迹 → closed；
  // 回收场被删/未写 → 回退 open。顺带迁移历史非法状态 resolved。
  const sceneById = new Map(scenes.map((s) => [s.id, s]));
  for (const arr of [list(appState.project.lock_layer?.projections?.setup_payoffs), list(appState.project.story_bible?.setup_payoffs)]) {
    for (const sp of arr) {
      if (sp.status === "resolved") sp.status = "closed";
      if (!sp.payoff_scene_id) continue;
      const payScene = sceneById.get(sp.payoff_scene_id);
      if (!payScene) { sp.status = "open"; sp.payoff_scene_id = ""; continue; }
      const script = (payScene.script_full || "");
      if (script.trim().length < 200) { if (sp.status === "closed") sp.status = "open"; continue; }
      const tokens = String(sp.payoff_summary || sp.setup_summary || "").match(/[一-龥]{2,6}/g) ?? [];
      const hit = tokens.some((t) => script.includes(t));
      if (hit && sp.status === "open") sp.status = "closed";
      if (!hit && sp.status === "closed" && sp.payoff_summary) sp.status = "partial";
    }
  }

  // 关系字段单一真相：kind=预设类型槽，type=显示名。
  // 旧数据只有 type（值恰为预设之一）时一次性补全 kind，渲染层从此只读 kind
  relationships.forEach((rel) => {
    if (!rel.relationship_kind && RELATIONSHIP_TYPE_KIND_VALUES.has(rel.relationship_type)) {
      rel.relationship_kind = rel.relationship_type;
    }
  });

  // 自动补齐场景 act_id：1) 通过关联剧情卡反查 2) 通过 structure node 反查 3) 兜底到第一幕
  const acts = list(appState.project.structure_profile?.acts);
  const validActIds = new Set(acts.map((a) => a.id));
  const cardById = new Map(plotCards.map((c) => [c.id, c]));
  const firstActId = acts[0]?.id ?? "";
  scenes.forEach((scene) => {
    // 清理指向已不存在卡片的死链（结构重建遗留的孤儿 ID）
    scene.linked_plot_card_ids = list(scene.linked_plot_card_ids).filter((id) => cardById.has(id));
    // 清理旧版机械拼接的「xx 场景」后缀（仅当确认是由关联卡片名拼出来的）
    const suffixSource = scene.linked_plot_card_ids
      .map((id) => cardById.get(id))
      .find((card) => card && scene.title === `${card.title} 场景`);
    if (suffixSource) scene.title = suffixSource.title;
    // 状态口径自愈：已有可观成稿但工作流状态还停在草稿/大纲的，升级为已写成稿
    // （AI 成稿现在会实时回写 status，这里只兜旧数据）
    if ((scene.status === "draft" || scene.status === "outline") && (scene.script_full || "").trim().length >= 200) {
      scene.status = "scripted";
    }
    // 迁移旧版注入到 notes 的幕评师修稿指令 → 专用 rater_directives 字段
    const legacyTag = "【上轮幕评师修稿指令】";
    if (scene.notes && scene.notes.includes(legacyTag)) {
      const idx = scene.notes.indexOf(legacyTag);
      const block = scene.notes.slice(idx + legacyTag.length).trim();
      if (!scene.rater_directives && block) scene.rater_directives = block;
      scene.notes = scene.notes.slice(0, idx).trim();
    }
    // 1) 关联剧情卡的幕是真源：卡片挂在结构节点上，场景跟随卡片，
    //    修复「场景创建时卡片 act 为空 → 全部兜底进第一幕」的历史数据
    const linkedCardActId = scene.linked_plot_card_ids
      .map((id) => cardById.get(id))
      .filter((card) => card && !card.deleted_at)
      .map((card) => card.act_id)
      .find((aid) => aid && validActIds.has(aid));
    if (linkedCardActId) {
      scene.act_id = linkedCardActId;
      return;
    }
    if (scene.act_id && validActIds.has(scene.act_id)) return;
    // 2) 兜底到第一幕（若有）
    if (firstActId) scene.act_id = firstActId;
  });
  const livePlotCards = plotCards.filter((card) => !card.deleted_at);
  appState.selection.plotCardId = livePlotCards.some((item) => item.id === appState.selection.plotCardId)
    ? appState.selection.plotCardId : livePlotCards[0]?.id ?? null;
  if (!appState.selection.plotCardId) appState.plotEditorOpen = false;
  appState.selection.characterId = characters.some((item) => item.id === appState.selection.characterId)
    ? appState.selection.characterId : characters[0]?.id ?? null;
  appState.selection.relationshipId = relationships.some((item) => item.id === appState.selection.relationshipId)
    ? appState.selection.relationshipId : relationships[0]?.id ?? null;
  appState.selection.sceneId = scenes.some((item) => item.id === appState.selection.sceneId)
    ? appState.selection.sceneId : scenes[0]?.id ?? null;
  appState.selection.timelineId = timeline.some((item) => item.id === appState.selection.timelineId)
    ? appState.selection.timelineId : timeline[0]?.id ?? null;
  appState.selection.worldRuleId = rules.some((item) => item.id === appState.selection.worldRuleId)
    ? appState.selection.worldRuleId : rules[0]?.id ?? null;
  appState.selection.setupId = setups.some((item) => item.id === appState.selection.setupId)
    ? appState.selection.setupId : setups[0]?.id ?? null;
  if (!getScenarioGroups().some((group) => group.id === appState.activeScenarioGroupId)) {
    appState.activeScenarioGroupId = getScenarioGroups()[0]?.id ?? null;
  }
}

function serializeCreation(creation) {
  if (!creation) return null;
  return {
    ...creation,
    selectedSceneIds: [...(creation.selectedSceneIds ?? new Set())],
    autoGen: null
  };
}

function deserializeCreation(raw) {
  if (!raw) return null;
  return {
    ...raw,
    selectedSceneIds: new Set(raw.selectedSceneIds ?? [])
  };
}

function saveLocalSnapshot() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      project: appState.project,
      projectList: appState.projectList,
      creation: serializeCreation(appState.creation),
      // 精品创作的问答是用户手打的——刷新丢失等于白答一轮
      proCreation: appState.proCreation?.active ? appState.proCreation : null,
      currentPage: appState.currentPage,
    })
  );
}

function loadLocalSnapshot() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `请求失败：${response.status}`);
  }
  return response.json();
}

async function loadProjectsFromServer() {
  const payload = await fetchJson("/api/projects");
  appState.projectList = payload.projects ?? [];
}

async function loadProjectFromServer(projectId) {
  const payload = await fetchJson(`/api/projects/${encodeURIComponent(projectId)}`);
  appState.project = ensurePlotDrivenProject(payload.project);
  appState.projectList = payload.projects ?? appState.projectList;
  normalizeProject();
  const firstChar = list(appState.project.character_hub?.characters)[0];
  if (firstChar && !appState.selection.characterId) {
    appState.selection.characterId = firstChar.id;
  }
}

async function saveProjectToServer() {
  appState.runtime.saving = true;
  // 标记 PUT 期间用户是否新增了改动；若有则 PUT 返回后不可覆盖本地最新状态
  appState.runtime.dirty = false;
  renderRuntimeStatus();
  const payload = await fetchJson(`/api/projects/${encodeURIComponent(appState.project.project.id)}`, {
    method: "PUT",
    body: JSON.stringify({ project: appState.project })
  });
  // 关键：PUT 完成时若 dirty 已被新编辑置 true，说明本地有 PUT 之外的新数据，
  // 不要用 server 返回值覆盖 appState.project，否则会丢失这段时间内用户的输入。
  if (!appState.runtime.dirty) {
    appState.project = ensurePlotDrivenProject(payload.project);
  }
  appState.projectList = payload.projects ?? appState.projectList;
  appState.runtime.serverAvailable = true;
  appState.runtime.saving = false;
  appState.runtime.lastSavedAt = new Date().toISOString();
  normalizeProject();
  saveLocalSnapshot();
  render();
  // 若期间有 dirty，再排一次 autosave 把最新状态推上去
  if (appState.runtime.dirty) scheduleAutosave();
}

function scheduleAutosave() {
  window.clearTimeout(appState.saveTimer);
  appState.saveTimer = window.setTimeout(async () => {
    if (!appState.runtime.dirty) return;
    saveLocalSnapshot();
    if (!appState.runtime.serverAvailable) {
      appState.runtime.lastSavedAt = "仅本地保存";
      renderRuntimeStatus();
      return;
    }
    try {
      await saveProjectToServer();
    } catch (error) {
      appState.runtime.serverAvailable = false;
      appState.runtime.saving = false;
      appState.runtime.lastSavedAt = "仅本地保存";
      renderRuntimeStatus();
    }
  }, AUTOSAVE_DELAY);
}

function markDirty() {
  appState.runtime.dirty = true;
  saveLocalSnapshot();
  renderRuntimeStatus();
  scheduleAutosave();
}

function setCurrentPage(pageId) {
  appState.currentPage = pageId;
  if (pageId !== "project") appState.createDialogOpen = false;
  saveLocalSnapshot();
  render();
}

function setCurrentStep(stepId) {
  const nextStepId = workflowSteps.some((item) => item.id === stepId) ? stepId : workflowSteps[0].id;
  const hasPanel = dom.stepPanels.some((panel) => panel.dataset.stepGroup === nextStepId);
  appState.currentStepId = hasPanel
    ? nextStepId
    : workflowSteps.find((item) => dom.stepPanels.some((panel) => panel.dataset.stepGroup === item.id))?.id ?? workflowSteps[0].id;
  // 记录用户已访问的步骤 — 仅访问过的才会被判定为「已完成」。
  // 持久化在项目文档上（而非会话态），避免重开项目后 ✓ 标记凭空消失。
  if (appState.project) {
    if (!appState.project.workflow_meta) {
      // 旧项目迁移：把已有实际内容的步骤一次性记为「已访问」，避免历史 ✓ 凭空消失
      appState.project.workflow_meta = {
        visited_steps: workflowSteps.map((item) => item.id).filter((id) => stepHasContent(id))
      };
    }
    const visited = list(appState.project.workflow_meta.visited_steps);
    if (!visited.includes(appState.currentStepId)) {
      appState.project.workflow_meta.visited_steps = [...visited, appState.currentStepId];
      markDirty();
    }
  }
  render();
}

// ── Structure template ───────────────────────────────────────────────────────

function createStructureProfile(template, rhythmOverlay, customActCount = 2) {
  const definition =
    template === "custom"
      ? buildCustomStructurePreset(customActCount)
      : structurePresets[template] ?? structurePresets.three_act;
  const actIds = new Map();
  const acts = definition.acts.map((act, index) => {
    const id = createId("act");
    actIds.set(act.key, id);
    return { id, ...act, order_index: index + 1 };
  });
  const nodes = definition.nodes.map(([key, actKey, title, required], index) => ({
    id: createId("node"),
    key,
    act_id: actIds.get(actKey) ?? acts[0]?.id ?? "",
    title,
    node_type: key,
    required,
    order_index: index + 1,
    note: "",
    card_ids: []
  }));
  return {
    template,
    rhythm_overlay: rhythmOverlay,
    custom_act_count: template === "custom" ? Number(definition.custom_act_count ?? customActCount) : acts.length,
    acts,
    nodes
  };
}

function applyStructureTemplate(template, customActCount = null) {
  const currentCards = list(appState.project.plot_board?.cards);
  const currentNodes = list(appState.project.structure_profile?.nodes);
  const currentNodeMap = new Map(currentNodes.map((node) => [node.id, node]));
  const nextStructure = createStructureProfile(
    template,
    appState.project.structure_profile?.rhythm_overlay ?? "save_the_cat",
    customActCount ?? appState.project.structure_profile?.custom_act_count ?? list(appState.project.structure_profile?.acts).length ?? 2
  );
  const nextNodesByType = new Map(nextStructure.nodes.map((node) => [node.node_type, node]));
  appState.project.structure_profile = nextStructure;
  appState.project.plot_board.cards = currentCards.map((card, index) => {
    const oldNode = currentNodeMap.get(card.node_id);
    const targetNode =
      (oldNode && nextNodesByType.get(oldNode.node_type)) ||
      nextStructure.nodes[Math.min(index, nextStructure.nodes.length - 1)] ||
      nextStructure.nodes[0];
    return { ...card, node_id: targetNode?.id ?? "", act_id: targetNode?.act_id ?? nextStructure.acts[0]?.id ?? "" };
  });
  normalizeProject();
  markDirty();
  render();
}

let libraryFilterTag = "all";

function openStructureLibrary() {
  dom.structureLibraryContent.innerHTML = renderStructureLibraryDialog(libraryFilterTag);
  dom.structureLibraryDialog.hidden = false;
}

function closeStructureLibrary() {
  dom.structureLibraryDialog.hidden = true;
}

function applyLibraryStructure(structureId) {
  const struct = STORY_STRUCTURE_LIBRARY.find((s) => s.id === structureId);
  if (!struct) return;
  if (struct.builtInKey) {
    applyStructureTemplate(struct.builtInKey);
    appState.project.structure_profile.library_id = struct.id;
    appState.project.structure_profile.library_name = struct.name;
    markDirty();
    closeStructureLibrary();
    return;
  }
  const currentCards = list(appState.project.plot_board?.cards);
  const currentNodes = list(appState.project.structure_profile?.nodes);
  const currentNodeMap = new Map(currentNodes.map((node) => [node.id, node]));
  const actIds = new Map();
  const acts = struct.acts.map((act, index) => {
    const id = createId("act");
    actIds.set(act.key, id);
    return { id, key: act.key, title: act.title, purpose: act.purpose, range_label: act.range_label, order_index: index + 1 };
  });
  const nodes = struct.nodes.map(([key, actKey, title, required], index) => ({
    id: createId("node"),
    key,
    act_id: actIds.get(actKey) ?? acts[0]?.id ?? "",
    title,
    node_type: key,
    required,
    order_index: index + 1,
    note: "",
    card_ids: []
  }));
  const nextStructure = {
    template: "custom",
    library_id: struct.id,
    library_name: struct.name,
    rhythm_overlay: appState.project.structure_profile?.rhythm_overlay ?? "none",
    custom_act_count: acts.length,
    acts,
    nodes
  };
  const nextNodesByType = new Map(nodes.map((node) => [node.node_type, node]));
  appState.project.structure_profile = nextStructure;
  appState.project.plot_board.cards = currentCards.map((card, index) => {
    const oldNode = currentNodeMap.get(card.node_id);
    const targetNode =
      (oldNode && nextNodesByType.get(oldNode.node_type)) ||
      nextStructure.nodes[Math.min(index, nextStructure.nodes.length - 1)] ||
      nextStructure.nodes[0];
    return { ...card, node_id: targetNode?.id ?? "", act_id: targetNode?.act_id ?? nextStructure.acts[0]?.id ?? "" };
  });
  normalizeProject();
  markDirty();
  closeStructureLibrary();
  render();
}

function insertSceneFromPlotCard(cardId) {
  const card = getPlotCard(cardId);
  if (!card) return;
  const scene = {
    id: createId("scene"),
    order_index: list(appState.project.scene_workbench?.scenes).length + 1,
    title: card.title || "未命名场景",
    act_id: card.act_id,
    linked_plot_card_ids: [card.id],
    pov_character_id: list(card.character_ids)[0] ?? "",
    location: "",
    time_of_day: "",
    purpose: card.summary ?? "",
    obstacle: card.conflict ?? "",
    beat_summary: card.change ?? "",
    entry_state: "",
    exit_state: "",
    status: "draft",
    script_excerpt: "",
    notes: ""
  };
  appState.project.scene_workbench.scenes.push(scene);
  appState.selection.sceneId = scene.id;
  normalizeProject();
  markDirty();
  render();
}

function summarizeProjectListItem(project) {
  return {
    id: project.project.id,
    title: project.project.title,
    format: project.project.format,
    status: project.project.status,
    genre: project.project.genre,
    logline: project.project.logline,
    character_count: list(project.character_hub?.characters).length,
    scene_count: list(project.scene_workbench?.scenes).length,
    version_count: 0,
    last_opened_at: new Date().toISOString()
  };
}

function applyProjectDraftPatch(patch = {}) {
  const nextDraft = { ...appState.projectDraft };
  Object.entries(patch ?? {}).forEach(([key, value]) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      nextDraft[key] = value;
      return;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return;
      nextDraft[key] = trimmed;
      return;
    }
    nextDraft[key] = String(value);
  });
  const nextFormat = projectFormatChoices.includes(nextDraft.format) ? nextDraft.format : "feature";
  nextDraft.format = nextFormat;
  const validTemplates = getStructureOptionsForFormat(nextFormat, nextDraft.structure_template).map(([v]) => v);
  if (!validTemplates.includes(nextDraft.structure_template)) {
    nextDraft.structure_template = getDefaultTemplateForFormat(nextFormat);
  }
  if (nextDraft.structure_template === "custom") {
    nextDraft.custom_act_count = String(Math.max(1, Math.min(6, Number(nextDraft.custom_act_count) || 2)));
  } else if (!nextDraft.custom_act_count) {
    nextDraft.custom_act_count = "2";
  }
  appState.projectDraft = nextDraft;
}

function applyProjectDraftToProject(sourceProject) {
  const project = ensurePlotDrivenProject(sourceProject);
  const genreTags = splitTags(appState.projectDraft.genre);
  project.project.title = appState.projectDraft.title.trim() || project.project.title;
  project.project.format = appState.projectDraft.format;
  project.project.genre = genreTags;
  project.project.logline = appState.projectDraft.logline.trim();
  project.project.theme_question = appState.projectDraft.theme_question.trim();
  project.project.tone = appState.projectDraft.tone.trim();
  project.intent_anchor.core_idea = appState.projectDraft.logline.trim();
  project.intent_anchor.theme = appState.projectDraft.theme.trim();
  project.intent_anchor.protagonist = appState.projectDraft.protagonist.trim();
  project.intent_anchor.arc = unique([appState.projectDraft.arc_start, appState.projectDraft.arc_end]).join(" -> ");
  project.intent_anchor.motif = appState.projectDraft.motif.trim();
  project.intent_anchor.genre = genreTags;
  project.story_core.premise = appState.projectDraft.logline.trim();
  project.story_core.core_conflict = appState.projectDraft.core_conflict.trim();
  project.story_core.central_question = appState.projectDraft.theme_question.trim();
  project.story_core.theme_statement = appState.projectDraft.theme.trim();
  project.story_core.emotional_promise = appState.projectDraft.tone.trim();
  project.story_core.setting_overview = appState.projectDraft.setting.trim();
  project.genre_profile.primary_genre = genreTags[0] ?? "";
  project.genre_profile.secondary_genres = genreTags.slice(1);
  project.genre_profile.audience_promise = appState.projectDraft.audience_promise.trim();
  project.genre_profile.tone_words = splitTags(appState.projectDraft.tone);
  project.structure_profile = createStructureProfile(
    appState.projectDraft.structure_template,
    project.structure_profile?.rhythm_overlay ?? "save_the_cat",
    Number(appState.projectDraft.custom_act_count) || 2
  );
  const orderedNodes = list(project.structure_profile?.nodes);
  list(project.plot_board?.cards).forEach((card, index) => {
    const targetNode =
      orderedNodes.find((node) => node.node_type === (index === 0 ? "catalyst" : "setup")) ??
      orderedNodes[Math.min(index, Math.max(orderedNodes.length - 1, 0))] ??
      orderedNodes[0];
    card.node_id = targetNode?.id ?? "";
    card.act_id = targetNode?.act_id ?? "";
  });
  const protagonist = list(project.character_hub?.characters)[0];
  if (protagonist) {
    protagonist.name = appState.projectDraft.protagonist.trim() || protagonist.name || "主角";
    protagonist.story_role = "protagonist";
    protagonist.external_goal = appState.projectDraft.external_goal.trim();
    protagonist.dramatic_need = appState.projectDraft.internal_need.trim();
    protagonist.arc_start = appState.projectDraft.arc_start.trim();
    protagonist.arc_end = appState.projectDraft.arc_end.trim();
    protagonist.notes = appState.projectDraft.setting.trim();
  }
  const firstScene = list(project.scene_workbench?.scenes)[0];
  if (firstScene) {
    firstScene.title = firstScene.title || "开场场景";
    firstScene.purpose = appState.projectDraft.logline.trim();
    firstScene.act_id = list(project.plot_board?.cards).find((card) => !card.deleted_at)?.act_id ?? firstScene.act_id;
    firstScene.pov_character_id = protagonist?.id ?? firstScene.pov_character_id;
  }
  return ensurePlotDrivenProject(project);
}

// ── Create wizard ────────────────────────────────────────────────────────────

function getProjectCreateStep() {
  return projectCreateStepsCurrent[appState.projectCreateStepIndex] ?? projectCreateStepsCurrent[0];
}

function canAdvanceProjectCreate() {
  const step = getProjectCreateStep();
  if (step.id === "basics") return Boolean(appState.projectDraft.format);
  if (step.id === "logline") return Boolean(appState.projectDraft.logline.trim() && appState.projectDraft.core_conflict.trim());
  if (step.id === "title") return Boolean(appState.projectDraft.title.trim());
  return Boolean(appState.projectDraft.title.trim() && appState.projectDraft.logline.trim());
}

function resetProjectCreateWizard() {
  appState.projectDraft = createDefaultProjectDraft();
  appState.createConceptOptions = [];
  appState.projectCreateStepIndex = 0;
  appState.aiConfigOpen = !appState.ai.configured;
  appState.createAssistant.loading = false;
  appState.createAssistant.target = "";
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
}

function updateDraftField(fieldName, value) {
  if (["format", "genre", "tone", "structure_template", "custom_act_count"].includes(fieldName)) {
    appState.createConceptOptions = [];
    if (fieldName === "format") {
      appState.projectDraft.title = "";
      appState.projectDraft.logline = "";
      appState.projectDraft.core_conflict = "";
    }
  }
  applyProjectDraftPatch({ [fieldName]: value });
  appState.createAssistant.error = "";
  if (appState.createDialogOpen) {
    _renderProjectCreateForm();
  }
}

// ── AI config ────────────────────────────────────────────────────────────────

const PROVIDER_LABELS = {
  claude_cli: "Claude CLI（订阅）",
  anthropic: "Anthropic API",
  openai: "OpenAI",
  gemini: "Gemini",
  custom: "兼容端点"
};

function providerChoiceLabel(value) {
  return PROVIDER_LABELS[value] ?? "OpenAI";
}

function defaultModelForProvider(value) {
  return {
    claude_cli: "",
    anthropic: "claude-sonnet-4-6",
    openai: "gpt-5.4-mini",
    gemini: "gemini-2.5-flash",
    custom: "deepseek-v4-flash"
  }[value] ?? "gpt-5.4-mini";
}

function isAiConfigBusy() {
  return appState.createAssistant.loading && appState.createAssistant.target === "ai-config";
}

function getCurrentAiModelOptions(provider) {
  if (appState.aiModelCatalog.provider === provider && appState.aiModelCatalog.options.length) {
    return appState.aiModelCatalog.options;
  }
  if (appState.ai.configured && appState.ai.provider === provider && appState.ai.model) {
    return [{ id: appState.ai.model, label: appState.ai.model }];
  }
  return [];
}

function formatCreateAssistantErrorCurrent(error) {
  const message = error?.message || "";
  if (/fetch|network/i.test(message)) {
    return "AI 辅助需要本地服务支持，请通过本地服务打开当前页面。";
  }
  return message || "AI 辅助暂时不可用。";
}

function aiProviderLabel(value) {
  if (value === "gemini") return "Gemini";
  if (value === "openai") return "OpenAI";
  if (value === "claude") return "Claude";
  return "本地建议";
}

async function requestCreateStepSuggestionCurrent(stepId = getProjectCreateStep().id) {
  if (stepId === "logline") {
    await requestCreateConceptOptionsCurrent();
    return;
  }
  appState.createAssistant.loading = true;
  appState.createAssistant.target = `step:${stepId}`;
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  _renderProjectCreateForm();
  try {
    const payload = await fetchJson("/api/create-wizard/step", {
      method: "POST",
      body: JSON.stringify({ stepId, draft: appState.projectDraft })
    });
    applyProjectDraftPatch(payload.fields);
    appState.ai = payload.ai ?? appState.ai;
    appState.aiConfigDraft.provider = appState.ai.provider || appState.aiConfigDraft.provider;
    appState.aiConfigDraft.model = appState.ai.model || appState.aiConfigDraft.model;
    appState.runtime.serverAvailable = true;
    appState.createAssistant.message =
      payload.provider === "local"
        ? "当前未连接模型服务，已先给出本地建议。"
        : `已用 ${aiProviderLabel(payload.provider)} · ${payload.model || "默认模型"} 补全这一步。`;
    appState.createAssistant.warning = payload.warning || "";
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorCurrent(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    _renderProjectCreateForm();
  }
}

async function requestCreateConceptOptionsCurrent() {
  appState.createAssistant.loading = true;
  appState.createAssistant.target = "step:logline";
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  _renderProjectCreateForm();
  try {
    const payload = await fetchJson("/api/create-wizard/concepts", {
      method: "POST",
      body: JSON.stringify({ draft: appState.projectDraft })
    });
    appState.createConceptOptions = Array.isArray(payload.options) ? payload.options : [];
    appState.ai = payload.ai ?? appState.ai;
    appState.aiConfigDraft.provider = appState.ai.provider || appState.aiConfigDraft.provider;
    appState.aiConfigDraft.model = appState.ai.model || appState.aiConfigDraft.model;
    appState.runtime.serverAvailable = true;
    appState.createAssistant.message =
      payload.provider === "local"
        ? "当前未连接模型服务，已先给出 3 组本地概念候选。"
        : `已用 ${aiProviderLabel(payload.provider)} · ${payload.model || "默认模型"} 生成 3 组概念候选。`;
    appState.createAssistant.warning = payload.warning || "";
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorCurrent(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    _renderProjectCreateForm();
  }
}

function applyConceptOptionCurrent(optionId) {
  const option = appState.createConceptOptions.find((item) => item.id === optionId);
  if (!option) return;
  applyProjectDraftPatch({ logline: option.logline, core_conflict: option.core_conflict });
  appState.createAssistant.message = `已采用"${option.label || "概念候选"}"。`;
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  _renderProjectCreateForm();
}

async function requestCreateFieldSuggestionCurrent(fieldName) {
  appState.createAssistant.loading = true;
  appState.createAssistant.target = `field:${fieldName}`;
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  _renderProjectCreateForm();
  try {
    const payload = await fetchJson("/api/create-wizard/field", {
      method: "POST",
      body: JSON.stringify({ field: fieldName, draft: appState.projectDraft })
    });
    applyProjectDraftPatch({ [fieldName]: payload.value });
    appState.ai = payload.ai ?? appState.ai;
    appState.aiConfigDraft.provider = appState.ai.provider || appState.aiConfigDraft.provider;
    appState.aiConfigDraft.model = appState.ai.model || appState.aiConfigDraft.model;
    appState.runtime.serverAvailable = true;
    appState.createAssistant.message =
      payload.provider === "local"
        ? "当前未连接模型服务，已先给出本地建议。"
        : `已用 ${aiProviderLabel(payload.provider)} · ${payload.model || "默认模型"} 重写"${fieldName}"。`;
    appState.createAssistant.warning = payload.warning || "";
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorCurrent(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    _renderProjectCreateForm();
  }
}

async function saveAiConfigDraftCurrentV2() {
  const provider = appState.aiConfigDraft.provider || "openai";
  const apiKey = appState.aiConfigDraft.apiKey.trim();
  const model = appState.aiConfigDraft.model.trim();
  const baseUrl = (appState.aiConfigDraft.baseUrl || "").trim();
  const hasStoredConnection = appState.ai.configured && appState.ai.provider === provider;
  if (provider !== "claude_cli") {
    if (!apiKey && !hasStoredConnection) {
      appState.createAssistant.error = "先填入 API Key，或保留当前连接。";
      _renderProjectCreateForm();
      return;
    }
    if (!model) {
      appState.createAssistant.error = "先填写或选择一个模型。";
      _renderProjectCreateForm();
      return;
    }
  }
  appState.createAssistant.loading = true;
  appState.createAssistant.target = "ai-config";
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  _renderProjectCreateForm();
  try {
    const payload = await fetchJson("/api/ai/config", {
      method: "POST",
      body: JSON.stringify({ provider, model, ...(apiKey ? { apiKey } : {}), ...(baseUrl ? { baseUrl } : {}) })
    });
    appState.ai = payload.ai ?? appState.ai;
    appState.llmProfiles = payload.profiles ?? appState.llmProfiles;
    appState.aiConfigDraft.provider = appState.ai.provider || provider;
    appState.aiConfigDraft.apiKey = "";
    appState.aiConfigDraft.model = appState.ai.model || model;
    if (!appState.aiModelCatalog.options.some((item) => item.id === appState.aiConfigDraft.model)) {
      appState.aiModelCatalog.provider = provider;
      appState.aiModelCatalog.options = [{ id: appState.aiConfigDraft.model, label: appState.aiConfigDraft.model }];
    }
    appState.aiConfigOpen = false;
    appState.runtime.serverAvailable = true;
    appState.createAssistant.message = `已连接 ${providerChoiceLabel(appState.ai.provider || provider)} · ${appState.ai.model || model}，现在可以测试真实生成。`;
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorCurrent(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    _renderProjectCreateForm();
  }
}

async function disconnectAiConfigDraftCurrentV2() {
  const provider = appState.aiConfigDraft.provider || appState.ai.provider || "openai";
  appState.createAssistant.loading = true;
  appState.createAssistant.target = "ai-config";
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  _renderProjectCreateForm();
  try {
    const payload = await fetchJson("/api/ai/config", {
      method: "POST",
      body: JSON.stringify({
        provider,
        apiKey: "",
        model: appState.aiConfigDraft.model || appState.ai.model || defaultModelForProvider(provider)
      })
    });
    appState.ai = payload.ai ?? appState.ai;
    appState.aiConfigDraft.provider = provider;
    appState.aiConfigOpen = true;
    appState.createAssistant.message = "已断开模型服务，当前会退回本地建议。";
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorCurrent(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    _renderProjectCreateForm();
  }
}

async function fetchAiModelOptionsCurrentV2() {
  const provider = appState.aiConfigDraft.provider || appState.ai.provider || "openai";
  const apiKey = appState.aiConfigDraft.apiKey.trim();
  const hasStoredConnection = appState.ai.configured && appState.ai.provider === provider;
  if (!apiKey && !hasStoredConnection) {
    appState.createAssistant.error = "先填入 API Key，再获取模型列表。";
    _renderProjectCreateForm();
    return;
  }
  appState.createAssistant.loading = true;
  appState.createAssistant.target = "ai-models";
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  _renderProjectCreateForm();
  try {
    const payload = await fetchJson("/api/ai/models", {
      method: "POST",
      body: JSON.stringify({ provider, apiKey: apiKey || undefined })
    });
    appState.aiModelCatalog.provider = provider;
    appState.aiModelCatalog.options = Array.isArray(payload.models) ? payload.models : [];
    const preferredModel =
      appState.aiModelCatalog.options.find((item) => item.id === appState.aiConfigDraft.model)?.id ||
      payload.defaultModel ||
      appState.aiModelCatalog.options[0]?.id ||
      "";
    appState.aiConfigDraft.model = preferredModel;
    appState.runtime.serverAvailable = true;
    appState.createAssistant.message = `已获取 ${appState.aiModelCatalog.options.length} 个模型，请选择后再连接。`;
  } catch (error) {
    appState.createAssistant.error = formatCreateAssistantErrorCurrent(error);
  } finally {
    appState.createAssistant.loading = false;
    appState.createAssistant.target = "";
    _renderProjectCreateForm();
  }
}

// ── Update handlers ──────────────────────────────────────────────────────────

function updateProjectField(action, fieldName, value, target) {
  const selectedPlot = getPlotCard();
  const selectedCharacter = getCharacter();
  const selectedRelationship = getRelationship();
  const selectedScene = getScene();
  const selectedTimeline = getTimelineEvent();
  const selectedRule = getWorldRule();
  const selectedSetup = getSetup();

  if (action === "story-core-field") appState.project.story_core[fieldName] = value;
  if (action === "series-field" && appState.seriesLibrary?.selected) {
    appState.seriesLibrary.selected[fieldName] = value;
    return;
  }
  if (action === "series-item-field" && appState.seriesLibrary?.selected) {
    const section = target.dataset.section;
    const idx = Number(target.dataset.idx);
    const item = appState.seriesLibrary.selected?.[section]?.[idx];
    if (item) item[fieldName] = fieldName === "story_day" ? Number(value) || 1 : value;
    return;
  }
  if (action === "series-mount") {
    appState.project.project.series_id = value;
    if (value) {
      fetchJson(`/api/series/${encodeURIComponent(value)}`)
        .then((p) => { appState.project.series_bible = p.series; markDirty(); render(); })
        .catch(() => { markDirty(); render(); });
    } else {
      delete appState.project.series_bible;
      markDirty(); render();
    }
    return;
  }
  if (action === "plot-field" && selectedPlot) selectedPlot[fieldName] = value;
  if (action === "character-field" && selectedCharacter) selectedCharacter[fieldName] = value;
  if (action === "relationship-field" && selectedRelationship) selectedRelationship[fieldName] = value;
  if (action === "timeline-field" && selectedTimeline) {
    const v = fieldName === "story_day" ? Number(value) || 1 : value;
    selectedTimeline[fieldName] = v;
    // 双写 story_bible：ensurePlotDrivenProject 从 story_bible 派生 lock_layer，否则会擦回
    const sb = list(appState.project.story_bible?.timeline_events).find((e) => e.id === selectedTimeline.id);
    if (sb) sb[fieldName] = v;
  }
  if (action === "world-rule-field" && selectedRule) {
    if (fieldName === "exceptions_text") selectedRule.exceptions = splitTags(value);
    else selectedRule[fieldName] = value;
    const sb = list(appState.project.story_bible?.world_rules).find((r) => r.id === selectedRule.id);
    if (sb) {
      if (fieldName === "exceptions_text") sb.exceptions = splitTags(value);
      else sb[fieldName] = value;
    }
  }
  if (action === "setup-field" && selectedSetup) {
    selectedSetup[fieldName] = value;
    const sb = list(appState.project.story_bible?.setup_payoffs).find((s) => s.id === selectedSetup.id);
    if (sb) sb[fieldName] = value;
  }
  if (action === "scene-field" && selectedScene) {
    selectedScene[fieldName] = fieldName === "order_index" ? Number(value) || 1 : value;
  }
  if (action === "screenplay-field") {
    const targetId = appState.selection.screenplaySceneId;
    const scene = list(appState.project.scene_workbench?.scenes).find((s) => s.id === targetId);
    if (scene) scene[fieldName] = value;
  }
  markDirty();
}

// ── Render ───────────────────────────────────────────────────────────────────

function renderRuntimeStatus() {
  if (!dom.runtimeStatus) return;
  const mode = appState.runtime.serverAvailable ? "本地服务" : "本地草稿";
  const savingState = appState.runtime.saving ? "saving" : appState.runtime.dirty ? "dirty" : "synced";
  const savingLabel = { saving: "保存中", dirty: "待保存", synced: "已同步" }[savingState];
  // 生效模型常显：避免配置静默回落（如 claude_cli）而用户毫无感知
  const ai = appState.ai ?? {};
  const aiLabel = !ai.configured && ai.provider !== "claude_cli"
    ? "AI 未配置"
    : ai.provider === "claude_cli" ? "Claude CLI" : (ai.model || ai.provider || "");
  dom.runtimeStatus.innerHTML = `
    <span class="chip chip--soft">${escapeHtml(mode)}</span>
    <span class="chip chip--save chip--save-${savingState}">${escapeHtml(savingLabel)}</span>
    ${aiLabel ? `<span class="chip chip--soft chip--ai-model" title="当前生效的 AI 模型（点 ⚙ 可切换）">${escapeHtml(aiLabel)}</span>` : ""}
  `;
  if (dom.saveButton) {
    dom.saveButton.classList.toggle("is-dirty", savingState === "dirty");
    dom.saveButton.classList.toggle("is-saving", savingState === "saving");
  }
}

function isStepCompleted(stepId) {
  const p = appState.project;
  if (!p) return false;
  // 用户未访问过的步骤永远不算「已完成」，避免 AI 预填导致全勾的错觉。
  // 访问记录持久化在项目文档（workflow_meta.visited_steps），跨会话稳定。
  // 旧项目（无 workflow_meta）按数据判断，首次切步骤时在 setCurrentStep 里完成迁移。
  if (p.workflow_meta && !list(p.workflow_meta.visited_steps).includes(stepId)) return false;
  return stepHasContent(stepId);
}

function stepHasContent(stepId) {
  const p = appState.project;
  if (!p) return false;
  switch (stepId) {
    case "structure":
      return list(p.structure_profile?.nodes).some((n) => n.note && n.note.trim().length > 0);
    case "characters":
      return list(p.character_hub?.characters).length > 1 ||
        list(p.character_hub?.characters).some((c) => c.external_goal || c.dramatic_need);
    case "relationships":
      return list(p.character_hub?.relationship_map).length > 0;
    case "plots":
      return list(p.plot_board?.cards).some((c) => (c.summary || c.title !== "新剧情卡") && c.title !== "开场场景");
    case "scenes":
      return list(p.scene_workbench?.scenes).some((s) => s.purpose || s.beat_summary);
    case "screenplay":
      return list(p.scene_workbench?.scenes).some((s) => (s.script_full || "").length > 200);
    default: return false;
  }
}

function renderStepperNav() {
  // 形态感知：seriesOnly 步骤（分集脚本·季-集）仅连续剧 series 显示
  // （micro_drama 走独立创作区，分集在其 ⑤分集 节点，不经此工作台）
  const isSeries = appState.project.project?.format === "series";
  const steps = workflowSteps.filter((s) => !s.seriesOnly || isSeries);
  const activeIdx = steps.findIndex((s) => s.id === appState.currentStepId);
  const nextStep = steps[activeIdx + 1];
  const stepButtons = steps
    .map(
      (item, index) => {
        const completed = isStepCompleted(item.id);
        const isActive = item.id === appState.currentStepId;
        const cls = [
          "step-button",
          `step-button--${item.id}`,
          isActive ? "is-active" : "",
          completed && !isActive ? "is-completed" : ""
        ].filter(Boolean).join(" ");
        return `
        <button
          class="${cls}"
          type="button"
          data-action="go-step"
          data-id="${escapeHtml(item.id)}"
          ${isActive ? 'aria-current="step"' : ""}
        >
          <span class="step-button__count">${completed && !isActive ? "✓" : index + 1}</span>
          <span class="step-button__label">${escapeHtml(item.label)}</span>
          <span class="step-button__hint">${escapeHtml(item.description)}</span>
        </button>
      `;
      }
    )
    .join("");
  // 末尾「下一步」CTA（最后一步则不显示）
  const nextCta = nextStep
    ? `<button class="step-next-cta" type="button" data-action="go-step" data-id="${escapeHtml(nextStep.id)}">进入「${escapeHtml(nextStep.label)}」 →</button>`
    : "";
  dom.stepperNav.innerHTML = stepButtons + nextCta;
  dom.stepperNav.hidden = appState.currentPage !== "workflow";
}

function renderHero() {
  const step = getStep();
  // 暗色模式切换：创作流程页使用暗色背景
  document.body.dataset.mode = appState.currentPage === "creation" ? "creation" : "";

  dom.hero.hidden = false;
  if (appState.currentPage === "project") {
    dom.hero.classList.remove("is-compact", "is-topbar");
    dom.heroSide.hidden = false;
    // 设置/主题按钮在项目中心也要可用（配置 AI 模型不应先进入某个项目）
    dom.heroSide.querySelector(".hero__actions").hidden = false;
    dom.heroEyebrow.textContent = "原点编剧系统";
    dom.heroTitle.textContent = "项目中心";
    dom.saveButton.hidden = true;
    dom.resetButton.hidden = true;
    return;
  }
  dom.heroSide.querySelector(".hero__actions").hidden = false;
  if (appState.currentPage === "creation") {
    dom.hero.classList.add("is-topbar", "is-compact");
    dom.heroSide.hidden = false;
    dom.heroEyebrow.textContent = "";
    dom.heroTitle.textContent = "";
    dom.saveButton.hidden = true;
    dom.resetButton.hidden = true;
    return;
  }
  dom.hero.classList.add("is-topbar", "is-compact");
  dom.heroSide.hidden = false;
  if (appState.currentPage === "series") {
    dom.heroEyebrow.textContent = "系列库";
    dom.heroEyebrow.title = "系列库 · 跨项目世界观";
    dom.heroTitle.textContent = "";
    dom.saveButton.hidden = true;
    dom.resetButton.hidden = true;
    return;
  }
  if (appState.currentPage === "library") {
    dom.heroEyebrow.textContent = "资料库";
    dom.heroEyebrow.title = "资料库";
    dom.heroTitle.textContent = "";
    dom.saveButton.hidden = false;
    dom.resetButton.hidden = true;
    return;
  }
  const projectTitle = appState.project.project.title || "未命名项目";
  dom.heroEyebrow.textContent = `《${projectTitle}》`;
  dom.heroEyebrow.title = projectTitle;
  dom.heroTitle.textContent = "";
  dom.saveButton.hidden = false;
  dom.resetButton.hidden = true;
}

function renderPageVisibility() {
  dom.pageProjectButton.classList.toggle("is-active", appState.currentPage === "project");
  if (dom.pageLibraryButton) {
    dom.pageLibraryButton.classList.toggle("is-active", appState.currentPage === "library" || appState.currentPage === "series");
    dom.pageLibraryButton.hidden = appState.currentPage === "creation";
  }
  dom.pagePanels.forEach((panel) => {
    panel.hidden = panel.dataset.page !== appState.currentPage;
  });
  dom.stepPanels.forEach((panel) => {
    panel.hidden = appState.currentPage !== "workflow" || panel.dataset.stepGroup !== appState.currentStepId;
  });
  document.body.dataset.activeStep = appState.currentPage === "workflow" ? appState.currentStepId : "";
  dom.projectCreateDialog.hidden = !appState.createDialogOpen;
  dom.settingsDialog.hidden = !appState.settingsDialogOpen;
}

const structureGetters = {
  getOrderedActs, getOrderedNodes, getActTitle
};

const characterGetters = {
  getCharacter, getCharacterLinkedPlotCards, getCharacterRelationships,
  getCharacterLinkedScenes, getActTitle, getNode, getCharacterNameById
};

const relationshipGetters = {
  getRelationship, getRelationshipLinkedPlotCards, getRelationshipLinkedScenes,
  getRelationshipLinkedTimelineEvents, getActTitle, getNode, getCharacterNameById
};

const sceneGetters = {
  getScene, getSceneLinkedPlotCards, getSceneLinkedCharacters,
  getSceneLinkedRelationships, getSceneLinkedTimelineEvents,
  getActTitle, getNode, getCharacterNameById
};

const lockGetters = { getTimelineEvent, getWorldRule, getSetup };

const plotGetters = {
  getPlotCard, getPlotLane, getVisibleLanes, getScenarioGroups, getActiveScenarioGroup,
  getPlotLinkedRelationships, getPlotLinkedScenes, getPlotLinkedTimelineEvents,
  getOrderedActs, getOrderedNodes, getActTitle, getNode, getCharacterNameById
};

const projectGetters = {
  isBrokenPlaceholderText,
  getStructureOptionsForFormat
};

const aiGetters = {
  providerChoiceLabel,
  isAiConfigBusy,
  getCurrentAiModelOptions
};

const projectCreateHelpers = {
  getProjectCreateStep,
  getStructureOptionsForFormat,
  formatLabels
};

function _renderProjectCreateForm() {
  renderProjectCreateForm(dom, appState, projectCreateHelpers);
  // 设置弹窗与创建表单共用 AI 配置 action；弹窗打开时同步刷新，否则 provider 切换等操作视觉上不生效
  if (appState.settingsDialogOpen) renderAiSettingsDialog(dom, appState, aiGetters);
}

// ── Drag / scroll infrastructure ─────────────────────────────────────────────

const dragAutoScrollState = { rafId: 0, deltaX: 0, deltaY: 0 };
const plotInspectorFollowState = { rafId: 0 };

function getRehearsalBoardElement() {
  return document.querySelector("#plots-content .plot-rehearsal-board");
}

function getPlotInspectorPaneElement() {
  return document.querySelector("#plots-content .workbench-pane--context");
}

function getPlotInspectorLeadElement() {
  return document.querySelector("#plots-content .plot-inspector__lead");
}

function getSelectedPlotBoardCardElement() {
  return Array.from(document.querySelectorAll("#plots-content .plot-board-panel [data-action='select-plot-card'][data-id]")).find(
    (element) => element.dataset.id === appState.selection.plotCardId
  ) ?? null;
}

function syncPlotInspectorLeadPosition() {
  const lead = getPlotInspectorLeadElement();
  const pane = getPlotInspectorPaneElement();
  if (!lead || !pane) return;
  lead.style.removeProperty("--plot-inspector-offset");
  if (appState.currentPage !== "workflow" || appState.currentStepId !== "plots" || !appState.plotContextVisible) return;
  const card = getSelectedPlotBoardCardElement();
  if (!card) return;
  const paneRect = pane.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const rawOffset = cardRect.top - paneRect.top - 6;
  const maxOffset = Math.max(0, Math.min(260, pane.clientHeight - lead.offsetHeight - 24));
  const offset = Math.max(0, Math.min(rawOffset, maxOffset));
  lead.style.setProperty("--plot-inspector-offset", `${Math.round(offset)}px`);
}

function schedulePlotInspectorLeadSync() {
  if (plotInspectorFollowState.rafId) return;
  plotInspectorFollowState.rafId = requestAnimationFrame(() => {
    plotInspectorFollowState.rafId = 0;
    syncPlotInspectorLeadPosition();
  });
}

function stopDragAutoScroll() {
  if (dragAutoScrollState.rafId) {
    cancelAnimationFrame(dragAutoScrollState.rafId);
    dragAutoScrollState.rafId = 0;
  }
  dragAutoScrollState.deltaX = 0;
  dragAutoScrollState.deltaY = 0;
}

function runDragAutoScroll() {
  if (!appState.draggedPlotCardId) { stopDragAutoScroll(); return; }
  const pageScroller = document.scrollingElement || document.documentElement;
  if (dragAutoScrollState.deltaY) pageScroller.scrollBy(0, dragAutoScrollState.deltaY);
  const rehearsalBoard = getRehearsalBoardElement();
  if (rehearsalBoard && dragAutoScrollState.deltaX) rehearsalBoard.scrollLeft += dragAutoScrollState.deltaX;
  if (!dragAutoScrollState.deltaX && !dragAutoScrollState.deltaY) { dragAutoScrollState.rafId = 0; return; }
  dragAutoScrollState.rafId = requestAnimationFrame(runDragAutoScroll);
}

function updateDragAutoScroll(clientX = 0, clientY = 0) {
  const viewportMarginY = 120;
  const viewportMarginX = 120;
  let deltaY = 0;
  let deltaX = 0;
  if (clientY < viewportMarginY) {
    deltaY = -Math.max(10, Math.round((viewportMarginY - clientY) / 4));
  } else if (window.innerHeight - clientY < viewportMarginY) {
    deltaY = Math.max(10, Math.round((viewportMarginY - (window.innerHeight - clientY)) / 4));
  }
  const rehearsalBoard = getRehearsalBoardElement();
  if (rehearsalBoard && appState.plotBoardView === "rehearsal") {
    const rect = rehearsalBoard.getBoundingClientRect();
    const insideHorizontalBand = clientY >= rect.top && clientY <= rect.bottom;
    if (insideHorizontalBand && clientX >= rect.left && clientX <= rect.right) {
      if (clientX - rect.left < viewportMarginX) {
        deltaX = -Math.max(10, Math.round((viewportMarginX - (clientX - rect.left)) / 4));
      } else if (rect.right - clientX < viewportMarginX) {
        deltaX = Math.max(10, Math.round((viewportMarginX - (rect.right - clientX)) / 4));
      }
    }
  }
  dragAutoScrollState.deltaX = deltaX;
  dragAutoScrollState.deltaY = deltaY;
  if ((deltaX || deltaY) && !dragAutoScrollState.rafId) {
    dragAutoScrollState.rafId = requestAnimationFrame(runDragAutoScroll);
    return;
  }
  if (!deltaX && !deltaY) stopDragAutoScroll();
}

// ── render() ─────────────────────────────────────────────────────────────────

function render() {
  normalizeProject();
  renderHero();
  renderStepperNav();
  renderRuntimeStatus();
  renderProjectList(dom, appState, projectGetters);
  _renderProjectCreateForm();
  renderAiSettingsDialog(dom, appState, aiGetters);
  renderStructurePage(dom, appState, structureGetters);
  renderPlotsPage(dom, appState, plotGetters);
  renderCharactersPage(dom, appState, characterGetters);
  renderRelationshipsPage(dom, appState, relationshipGetters);
  renderLocksPage(dom, appState, lockGetters);
  renderSeriesLibraryPage(dom, appState);
  renderScenesPage(dom, appState, sceneGetters);
  renderEpisodesPage(dom, appState);
  renderMicroPage(dom, appState);
  renderScreenplayPage(dom, appState);
  if (appState.creation) renderCreationPage();
  renderPageVisibility();
  schedulePlotInspectorLeadSync();
}

// 把与入口纠缠的控制器核心注入晚绑定 ctx，供外提的 handler 模块在点击时调用
initContext({
  render, markDirty, normalizeProject, renderCreateForm: _renderProjectCreateForm,
  fetchJson, scheduleAutosave, saveProjectToServer, loadProjectFromServer,
  loadProjectsFromServer, setCurrentPage, setCurrentStep, renderRuntimeStatus,
  saveLocalSnapshot, loadLocalSnapshot,
  getNode, shiftPlotCardWithinLane, insertSceneFromPlotCard, openStructureLibrary,
  applyLibraryStructure,
  updateDraftField, saveAiConfigDraftCurrentV2, requestCreateStepSuggestionCurrent,
  requestCreateFieldSuggestionCurrent, fetchAiModelOptionsCurrentV2,
  disconnectAiConfigDraftCurrentV2, defaultModelForProvider, applyConceptOptionCurrent,
  PROVIDER_LABELS, getProjectCreateStep,
  dom, aiGetters,
  setLibraryFilterTag: (tag) => { libraryFilterTag = tag; },
  getLibraryFilterTag: () => libraryFilterTag
});

// ── Event handlers ────────────────────────────────────────────────────────────

function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const id = target.dataset.id ?? "";
  const nodeId = target.dataset.nodeId ?? "";

  if (handleAiConfigClick(action, target, id, nodeId)) return;
  if (handleProjectDraftClick(action, target, id, nodeId)) return;
  if (handleCharacterClick(action, target, id, nodeId)) return;
  if (handlePlotClick(action, target, id, nodeId)) return;
  if (handleSceneClick(action, target, id, nodeId)) return;
  if (handleEpisodeClick(action, target, id, nodeId)) return;
  if (handleMicroClick(action, target, id, nodeId)) return;
  if (handleStructureClick(action, target, id, nodeId)) return;
  if (handleRelationshipClick(action, target, id, nodeId)) return;
  if (handleStoryBibleClick(action, target, id, nodeId)) return;
  if (handleKnowledgeClick(action, target, id, nodeId)) return;
  if (handleRaterClick(action, target, id, nodeId)) return;
  if (handleScreenplayClick(action, target, id, nodeId)) return;
  if (handleProjectNavClick(action, target, id, nodeId)) return;
  if (action && action.startsWith("series-") && handleSeriesAction(action, id, target)) return;
}

function handleInput(event) {
  const action = event.target.dataset.action;
  const fieldName = event.target.dataset.field;
  // KB tab：搜索输入 / 源切换不需要 fieldName
  if (action === "kb-search-input") {
    appState.knowledge.query = event.target.value;
    clearTimeout(appState.knowledge._searchTimer);
    appState.knowledge._searchTimer = setTimeout(() => kbSearch(), 280);
    return;
  }
  if (action === "kb-select-source") {
    appState.knowledge.selectedSourceId = event.target.value;
    appState.knowledge.selectedEntry = null;
    appState.knowledge.items = [];
    kbSearch();
    return;
  }
  if (!action || !fieldName) return;
  if (action === "ai-config-field") {
    appState.aiConfigDraft[fieldName] = event.target.value;
    if (fieldName === "apiKey") {
      appState.aiModelCatalog.provider = "";
      appState.aiModelCatalog.options = [];
      if (appState.aiConfigDraft.apiKey.trim()) appState.aiConfigDraft.model = "";
    }
    appState.createAssistant.error = "";
    return;
  }
  if (action === "draft-field") { updateDraftField(fieldName, event.target.value); return; }
  if (action === "act-field") {
    const act = list(appState.project.structure_profile?.acts).find((item) => item.id === event.target.dataset.id);
    if (act) act[fieldName] = event.target.value;
    markDirty();
    return;
  }
  if (action === "node-field") {
    const node = list(appState.project.structure_profile?.nodes).find((item) => item.id === event.target.dataset.id);
    if (node) node[fieldName] = event.target.value;
    markDirty();
    return;
  }
  if (action === "episode-field") {
    const ep = list(appState.project.episode_board?.episodes).find((item) => item.id === event.target.dataset.id);
    if (ep) ep[fieldName] = event.target.value;
    markDirty();
    return;
  }
  if (action === "project-meta-field") {
    const meta = appState.project.project;
    const val = event.target.value;
    if (fieldName === "genre") meta.genre = val.split(/[、,，]/).map((g) => g.trim()).filter(Boolean);
    else meta[fieldName] = val;
    markDirty();
    return;
  }
  if (action === "season-field") {
    const board = appState.project.episode_board;
    const num = appState.selection.seasonNumber ?? 1;
    const season = list(board?.seasons).find((s) => s.number === num);
    if (season) season[fieldName] = event.target.value;
    markDirty();
    return;
  }
  if (action === "theme-field") {
    if (!appState.project.theme_anchor) appState.project.theme_anchor = {};
    appState.project.theme_anchor[fieldName] = event.target.value;
    markDirty();
    return;
  }
  if (action === "world-field") {
    if (!appState.project.world_forge) appState.project.world_forge = {};
    if (fieldName.startsWith("rules.")) {
      const k = fieldName.slice(6);
      if (!appState.project.world_forge.rules) appState.project.world_forge.rules = {};
      appState.project.world_forge.rules[k] = event.target.value;
    } else {
      appState.project.world_forge[fieldName] = event.target.value;
    }
    markDirty();
    return;
  }
  if (action === "micro-field") {  // 通用：data-key=节点对象，data-field=点路径，data-array=按行拆数组
    const key = event.target.dataset.key;
    if (!key) return;
    const obj = appState.project[key] ?? (appState.project[key] = {});
    const path = fieldName.split(".");
    let cur = obj;
    for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]] ?? (cur[path[i]] = {});
    const last = path[path.length - 1];
    cur[last] = event.target.dataset.array ? event.target.value.split("\n").map((s) => s.trim()).filter(Boolean) : event.target.value;
    markDirty();
    return;
  }
  if (action === "plotframe-field") {
    const f = appState.project.plot_frame ?? (appState.project.plot_frame = {});
    const val = event.target.value;
    if (fieldName === "event_chain" || fieldName === "suspense") {
      f[fieldName] = val.split("\n").map((s) => s.trim()).filter(Boolean);
    } else if (fieldName.startsWith("acts.")) { (f.acts ?? (f.acts = {}))[fieldName.slice(5)] = val; }
    else if (fieldName.startsWith("turns.")) { (f.turns ?? (f.turns = {}))[fieldName.slice(6)] = val; }
    else { f[fieldName] = val; }
    markDirty();
    return;
  }
  if (action === "chars-field") {
    const cs = appState.project.char_smith ?? (appState.project.char_smith = {});
    const val = event.target.value;
    if (fieldName.startsWith("protagonist.")) { (cs.protagonist ?? (cs.protagonist = {}))[fieldName.slice(12)] = val; }
    else if (fieldName.startsWith("antagonist.")) { (cs.antagonist ?? (cs.antagonist = {}))[fieldName.slice(11)] = val; }
    else if (fieldName.startsWith("supporting.")) {
      const idx = Number(event.target.dataset.idx ?? -1);
      const sub = fieldName.slice(11);
      if (Array.isArray(cs.supporting) && cs.supporting[idx]) cs.supporting[idx][sub] = val;
    } else { cs[fieldName] = val; }
    markDirty();
    return;
  }
  updateProjectField(action, fieldName, event.target.value, event.target);
}

// 改名联动：故事圣经把结构化外键(id)同步了，但 AI 生成的自由文本仍用旧名 → 数据割裂。
// 确认式一键替换：仅在用户确认后，把项目自由文本里的旧名整体替换为新名（字面替换，避开正则陷阱）。
function collectRenameTextHolders() {
  const p = appState.project;
  const holders = [];
  const push = (obj, keys) => { if (obj) for (const k of keys) if (typeof obj[k] === "string" && obj[k]) holders.push([obj, k]); };
  const REL = ["relationship_type", "tension", "power_balance", "shared_history", "hidden_information", "hidden_truth", "notes"];
  list(p.character_hub?.relationship_map).forEach((r) => push(r, REL));
  list(p.story_bible?.relationships).forEach((r) => push(r, REL));
  list(p.plot_board?.cards).forEach((c) => push(c, ["title", "summary", "description"]));
  list(p.scene_workbench?.scenes).forEach((s) => push(s, ["title", "summary", "purpose", "beat_summary", "synopsis"]));
  list(p.structure_profile?.nodes).forEach((n) => push(n, ["note", "story_title", "summary"]));
  push(p.story_core, ["premise", "core_conflict", "central_question", "emotional_promise", "theme_statement"]);
  return holders;
}

function maybePropagateRename(oldName, newName) {
  const holders = collectRenameTextHolders();
  let occurrences = 0;
  for (const [obj, k] of holders) occurrences += obj[k].split(oldName).length - 1;
  if (occurrences === 0) return;
  if (!confirm(`「${oldName}」已改名为「${newName}」。\n项目中有 ${occurrences} 处 AI 生成文本仍引用旧名（关系/剧情/场景/结构等），是否全部替换为新名？`)) return;
  for (const [obj, k] of holders) if (obj[k].includes(oldName)) obj[k] = obj[k].split(oldName).join(newName);
  markDirty(); render();
}

function handleChange(event) {
  if (event.target.dataset.action === "character-field" && event.target.dataset.field === "name") {
    const oldName = (event.target.dataset.origName || "").trim();
    const newName = (event.target.value || "").trim();
    if (oldName && newName && oldName !== newName) maybePropagateRename(oldName, newName);
    return;
  }
  if (event.target.dataset.action === "plot-character-toggle") {
    const card = getPlotCard();
    if (!card) return;
    const checked = event.target.checked;
    const characterId = event.target.dataset.id;
    card.character_ids = checked
      ? unique([...list(card.character_ids), characterId])
      : list(card.character_ids).filter((item) => item !== characterId);
    normalizeProject(); markDirty();
    return;
  }
  if (event.target.dataset.action === "scene-plot-toggle") {
    const scene = getScene();
    if (!scene) return;
    const checked = event.target.checked;
    const plotCardId = event.target.dataset.id;
    scene.linked_plot_card_ids = checked
      ? unique([...list(scene.linked_plot_card_ids), plotCardId])
      : list(scene.linked_plot_card_ids).filter((item) => item !== plotCardId);
    normalizeProject(); markDirty();
    return;
  }
  if (event.target.dataset.action === "plot-lane-field") {
    const card = getPlotCard();
    if (!card) return;
    applyPlotCardPlacement(card, { laneId: event.target.value, actId: card.act_id, nodeId: card.node_id });
    normalizeProject(); markDirty(); render();
    return;
  }
  if (event.target.dataset.action === "plot-position-field") {
    const card = getPlotCard();
    if (!card) return;
    applyPlotCardPlacement(card, { laneId: card.lane_id, actId: event.target.value, nodeId: card.node_id });
    normalizeProject(); markDirty(); render();
    return;
  }
  if (event.target.dataset.action === "plot-scenario-field") {
    const card = getPlotCard();
    if (!card) return;
    card.scenario_group_id = event.target.value || null;
    appState.activeScenarioGroupId = card.scenario_group_id || appState.activeScenarioGroupId;
    markDirty(); render();
    return;
  }
  if (event.target.dataset.action === "set-character-compare") {
    appState.characterCompareId = event.target.value || null;
    render();
    return;
  }
  handleInput(event);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap() {
  // 无论服务器是否可用，先从本地恢复 creation 状态和页面
  const localSnapshot = loadLocalSnapshot();
  if (localSnapshot?.creation) {
    appState.creation = deserializeCreation(localSnapshot.creation);
    if (localSnapshot.currentPage === "creation") {
      appState.currentPage = "creation";
    }
  }
  if (localSnapshot?.proCreation?.active) {
    appState.proCreation = { ...appState.proCreation, ...localSnapshot.proCreation, loading: false };
    if (localSnapshot.currentPage === "creation") appState.currentPage = "creation";
  }

  try {
    const status = await fetchJson("/api/status");
    appState.runtime.serverAvailable = status.server === "ok";
    appState.ai = status.ai ?? appState.ai;
    appState.aiConfigDraft.provider = appState.ai.provider || appState.aiConfigDraft.provider;
    appState.aiConfigDraft.model = appState.ai.configured ? appState.ai.model || appState.aiConfigDraft.model : "";
    appState.aiModelCatalog.provider = appState.ai.configured ? appState.ai.provider || appState.aiModelCatalog.provider : "";
    appState.aiModelCatalog.options = appState.ai.configured && appState.ai.model ? [{ id: appState.ai.model, label: appState.ai.model }] : [];
    appState.aiConfigOpen = !appState.ai.configured;
    await loadProjectsFromServer();
    if (appState.projectList[0]?.id) await loadProjectFromServer(appState.projectList[0].id);
  } catch (error) {
    const snapshot = localSnapshot;
    if (snapshot?.project) {
      appState.project = ensurePlotDrivenProject(snapshot.project);
      appState.projectList = list(snapshot.projectList);
    } else {
      appState.project = ensurePlotDrivenProject(cloneDefaultProject());
      appState.projectList = [{
        id: appState.project.project.id,
        title: appState.project.project.title,
        format: appState.project.project.format,
        status: appState.project.project.status,
        genre: appState.project.project.genre,
        logline: appState.project.project.logline,
        character_count: list(appState.project.character_hub?.characters).length,
        scene_count: list(appState.project.scene_workbench?.scenes).length,
        version_count: 0
      }];
    }
  }
  normalizeProject();
  render();
}

// ── Theme toggle ──────────────────────────────────────────────────────────────

(function initTheme() {
  const saved = localStorage.getItem("theme") || "light";
  document.documentElement.dataset.theme = saved;
  const btn = document.querySelector("#theme-toggle-button");
  if (btn) btn.textContent = saved === "dark" ? "☀" : "🌙";
})();

document.querySelector("#theme-toggle-button")?.addEventListener("click", () => {
  const isDark = document.documentElement.dataset.theme === "dark";
  const next = isDark ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("theme", next);
  const btn = document.querySelector("#theme-toggle-button");
  if (btn) btn.textContent = next === "dark" ? "☀" : "🌙";
});

// ── Event listener registration ───────────────────────────────────────────────

dom.pageProjectButton.addEventListener("click", () => {
  if (appState.currentPage === "creation") appState.creation = null;
  setCurrentPage("project");
});
if (dom.pageLibraryButton) {
  dom.pageLibraryButton.addEventListener("click", () => {
    if (appState.currentPage === "creation") appState.creation = null;
    if (appState.currentPage === "library" || appState.currentPage === "series") {
      setCurrentPage(appState.libraryReturnPage ?? "project");
      return;
    }
    appState.libraryReturnPage = appState.currentPage === "workflow" ? "workflow" : "project";
    // 项目中心 → 系列库（跨项目世界观）；项目内 → 该项目的资料库
    if (appState.currentPage === "project") {
      loadSeriesLibrary();
      setCurrentPage("series");
    } else {
      // 项目资料库的系列挂载选择器需要系列清单
      fetchJson("/api/series")
        .then((p) => { appState.seriesLibrary = { ...(appState.seriesLibrary ?? { selected: null, loading: false }), list: p.series ?? [] }; render(); })
        .catch(() => {});
      setCurrentPage("library");
    }
  });
}
dom.openSettingsButton.addEventListener("click", () => {
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  appState.settingsDialogOpen = true;
  render();
  fetchJson("/api/ai/profiles")
    .then((payload) => { appState.llmProfiles = payload.profiles ?? []; if (appState.settingsDialogOpen) render(); })
    .catch(() => {});
});
dom.closeSettingsButton.addEventListener("click", () => { appState.settingsDialogOpen = false; render(); });
dom.closeLibraryButton.addEventListener("click", closeStructureLibrary);
dom.structureLibraryDialog.addEventListener("click", (event) => {
  if (event.target === dom.structureLibraryDialog) closeStructureLibrary();
});
dom.cancelCreateProjectButton.addEventListener("click", () => {
  appState.createDialogOpen = false;
  render();
});
dom.prevCreateProjectButton.addEventListener("click", () => {
  if (appState.projectCreateStepIndex > 0) {
    appState.projectCreateStepIndex -= 1;
    _renderProjectCreateForm();
  }
});
dom.confirmCreateProjectButton.addEventListener("click", async () => {
  if (appState.projectCreateStepIndex < projectCreateStepsCurrent.length - 1) {
    if (!canAdvanceProjectCreate()) return;
    appState.projectCreateStepIndex += 1;
    _renderProjectCreateForm();
    if (getProjectCreateStep().id === "logline" && appState.createConceptOptions.length === 0) {
      await requestCreateConceptOptionsCurrent();
    }
    return;
  }
  const payload = {
    title: appState.projectDraft.title,
    format: appState.projectDraft.format,
    language: "zh-CN",
    genre: splitTags(appState.projectDraft.genre),
    logline: appState.projectDraft.logline,
    theme_question: appState.projectDraft.theme_question,
    tone: appState.projectDraft.tone
  };
  try {
    const response = await fetchJson("/api/projects", { method: "POST", body: JSON.stringify(payload) });
    const enrichedProject = applyProjectDraftToProject(response.project);
    const saved = await fetchJson(`/api/projects/${encodeURIComponent(enrichedProject.project.id)}`, {
      method: "PUT",
      body: JSON.stringify({ project: enrichedProject })
    });
    appState.project = ensurePlotDrivenProject(saved.project);
    appState.projectList = saved.projects ?? response.projects ?? appState.projectList;
    appState.runtime.serverAvailable = true;
    appState.createDialogOpen = false;
    resetProjectCreateWizard();
    setCurrentPage("workflow");
    setCurrentStep("structure");
  } catch (error) {
    appState.project = applyProjectDraftToProject(createEmptyProject(payload));
    appState.projectList = [summarizeProjectListItem(appState.project), ...appState.projectList];
    appState.createDialogOpen = false;
    resetProjectCreateWizard();
    setCurrentPage("workflow");
    setCurrentStep("structure");
  }
});
dom.saveButton.addEventListener("click", async () => {
  saveLocalSnapshot();
  if (!appState.runtime.serverAvailable) {
    appState.runtime.lastSavedAt = "仅本地保存";
    renderRuntimeStatus();
    return;
  }
  await saveProjectToServer();
});
dom.resetButton.addEventListener("click", () => {
  appState.resetConfirmPending = true;
  renderAiSettingsDialog(dom, appState, aiGetters);
});
document.addEventListener("click", handleClick);
document.addEventListener("input", handleInput);
document.addEventListener("change", handleChange);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (appState.createModePickerOpen) { appState.createModePickerOpen = false; render(); return; }
    if (appState.createDialogOpen) { appState.createDialogOpen = false; render(); return; }
    if (appState.settingsDialogOpen) { appState.settingsDialogOpen = false; render(); return; }
    if (appState.selection.nodeId) { appState.selection.nodeId = null; render(); return; }
  }
});
document.addEventListener("dragstart", (event) => {
  const target = event.target.closest("[data-drag-plot-id]");
  if (!target) return;
  appState.draggedPlotCardId = target.dataset.dragPlotId;
  appState.selection.plotCardId = target.dataset.dragPlotId;
});
document.addEventListener("dragend", () => {
  appState.draggedPlotCardId = null;
  stopDragAutoScroll();
});
document.addEventListener("dragover", (event) => {
  if (appState.draggedPlotCardId) updateDragAutoScroll(event.clientX, event.clientY);
  if (event.target.closest("[data-plot-dropzone]")) event.preventDefault();
});
document.addEventListener("drop", (event) => {
  const dropzone = event.target.closest("[data-plot-dropzone]");
  if (!dropzone || !appState.draggedPlotCardId) return;
  event.preventDefault();
  movePlotCardToLaneAct(
    appState.draggedPlotCardId,
    dropzone.dataset.laneId ?? getPlotCard(appState.draggedPlotCardId)?.lane_id ?? "lane_main",
    dropzone.dataset.actId ?? getPlotCard(appState.draggedPlotCardId)?.act_id ?? list(appState.project.structure_profile?.acts)[0]?.id ?? "",
    dropzone.dataset.nodeId ?? ""
  );
  appState.draggedPlotCardId = null;
  stopDragAutoScroll();
});
window.addEventListener("scroll", schedulePlotInspectorLeadSync, { passive: true, capture: true });
window.addEventListener("resize", schedulePlotInspectorLeadSync, { passive: true });
dom.projectCreateDialog.addEventListener("click", (event) => {
  if (event.target === dom.projectCreateDialog) { appState.createDialogOpen = false; render(); }
});
dom.settingsDialog.addEventListener("click", (event) => {
  if (event.target === dom.settingsDialog) { appState.settingsDialogOpen = false; render(); }
});

bootstrap();

// ── AI 创作流程（追加，不改已有代码）────────────────────────────────────────

// DOM ref for creation panel
dom.creationContent = document.querySelector("#creationContent");

// ── 创作流程簇外提：场景生成 / 创作工作台 / 创作流程 三层工厂 + 二段 ctx 注入 ──

// AI 场景生成簇（扩场/拆解/写本/批量 + /api/generate 调用）外提至 ai/sceneGeneration.js
const {
  applySceneExpansion,
  aiExpandScenes,
  aiBreakdownScene,
  aiWriteSceneScript,
  aiWriteScreenplayBulk,
  callGenerateAPI,
  callGenerateAPIStream,
  cancelGeneration
} = createSceneGeneration({ render, markDirty, normalizeProject });

// 创作工作台 AI 簇（知识库/幕评师/契约审计修复/连续性提炼）外提至 ai/creationWorkbench.js
// 依赖 A 簇的 callGenerateAPI / aiWriteSceneScript，故须在其后创建
const {
  kbFetchSources, kbSearch, kbOpenEntry, kbSync, kbImport,
  aiRateScene, aiRateScreenplayFull, aiReviseFullScreenplayWithRater, aiReviseSceneWithRater,
  aiGenreAudit, aiCharacterAudit, aiGenreRemedy, aiExtractContinuity
} = createCreationWorkbench({ render, markDirty, normalizeProject, callGenerateAPI, aiWriteSceneScript });

// 创作流程簇（创作页重绘 + 点击/输入分发 + 微短剧/精品/5步 AI 处理器）外提至 creation/flow.js
// 依赖 callGenerateAPI/callGenerateAPIStream/cancelGeneration/applySceneExpansion，故在场景簇之后创建
const creationFlow = createCreationFlow({
  dom, render, markDirty, normalizeProject, saveLocalSnapshot, saveProjectToServer,
  loadProjectFromServer, fetchJson, setCurrentPage, setCurrentStep,
  callGenerateAPI, callGenerateAPIStream, cancelGeneration, applySceneExpansion,
  characterGetters, applyProjectDraftToProject, summarizeProjectListItem
});
const {
  renderCreationPage, handleCreationClick, handleCreationInput,
  handleRefineCharacter, handleGenStructureNotes, handleGenNodeNote,
  aiGenTheme, aiGenWorld, aiGenChars, aiGenPlotFrame,
  aiGenThrill, aiGenPacePay, aiGenDialogue, aiGenThemeLift, aiGenGender
} = creationFlow;

// 系列库（跨项目世界观）数据流——依赖 renderCreationPage，故在创作流程簇之后创建
const { loadSeriesLibrary, patchCreationCardFields, handleSeriesAction } =
  createSeriesLibrary({ fetchJson, render, saveLocalSnapshot, renderCreationPage });

// 剧本批量编辑工具：全局查找替换、人名巡检
const { globalFindReplace, auditScriptSpeakers } = createScriptTools({ render, markDirty });

// 第二段 ctx 注入：上述工厂簇的 AI 特性函数 + 异步处理器在此处才完成定义，
// 须在其后注入，供外提的事件 handler 模块经 ctx 调用。
initContext({
  aiExpandScenes, aiBreakdownScene, aiWriteSceneScript, aiWriteScreenplayBulk,
  callGenerateAPI, callGenerateAPIStream,
  kbFetchSources, kbSearch, kbOpenEntry, kbSync, kbImport,
  aiRateScene, aiRateScreenplayFull, aiReviseFullScreenplayWithRater, aiReviseSceneWithRater,
  aiGenreAudit, aiCharacterAudit, aiGenreRemedy, aiExtractContinuity,
  handleRefineCharacter, globalFindReplace, auditScriptSpeakers, patchCreationCardFields,
  handleGenStructureNotes, handleGenNodeNote,
  aiGenTheme, aiGenWorld, aiGenChars, aiGenPlotFrame,
  aiGenThrill, aiGenPacePay, aiGenDialogue, aiGenThemeLift, aiGenGender
});

// ── Patch event delegation to include creation actions ────────────────────────

// We inject by re-registering a capture-phase listener that intercepts
// creation-specific actions before they fall through.
document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  handleCreationClick(target.dataset.action, target);
}, true);

document.addEventListener("input", (event) => {
  const action = event.target.dataset.action;
  if (!action) return;
  handleCreationInput(action, event.target);
}, true);

// Wire up the "AI 创作流程" nav button

// Initial render of creation page if it's visible
renderCreationPage();

// 自治测试用：把核心引用挂到 window，方便 e2e 脚本批量操作（仅 dev）
if (typeof window !== "undefined") {
  window.__yuandian = {
    appState,
    render,
    renderCreationPage,
    markDirty,
    normalizeProject,
    saveLocalSnapshot,
    saveProjectToServer,
    createId,
  };
}
