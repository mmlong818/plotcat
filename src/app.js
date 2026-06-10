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

const RELATIONSHIP_TYPE_KIND_VALUES = new Set(RELATIONSHIP_TYPE_OPTIONS);

import { escapeHtml, list, unique, splitTags, isBrokenPlaceholderText, formatTime } from "./utils.js";

import { renderStructurePage } from "./render/structure.js";
import { renderCharactersPage } from "./render/characters.js";
import { renderRelationshipsPage } from "./render/relationships.js";
import { renderScenesPage } from "./render/scenes.js";
import { renderScreenplayPage, buildFountainText } from "./render/screenplay.js";
import { openFountainPreview } from "./render/fountainViewer.js";
import { renderLocksPage } from "./render/locks.js";
import { renderSeriesLibraryPage } from "./render/seriesLibrary.js";
import { renderPlotsPage } from "./render/plots.js";
import { renderProjectList, renderProjectCreateForm, renderAiSettingsDialog } from "./render/project.js";
import { renderStructureLibraryDialog } from "./render/structureLibrary.js";
import { STORY_STRUCTURE_LIBRARY } from "./data/storyStructureLibrary.js";
import { renderCreationFlowPage } from "./render/creationFlow.js";
import { renderProCreationPage } from "./render/proCreationFlow.js";

workflowSteps.splice(0, workflowSteps.length, ...[
  { id: "structure",     label: "结构骨架", description: "选定结构模板，划出各幕比例，标记必要的叙事节点。" },
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
  stepPrevButton: document.querySelector("#step-prev-button"),
  stepNextButton: document.querySelector("#step-next-button"),
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
  genresContent: document.querySelector("#genres-content"),
  locksContent: document.querySelector("#locks-content"),
  scenesContent: document.querySelector("#scenes-content"),
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
  getSceneLinkedCharacterIds,
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
  createPlotBoardLanes,
  createPlotScenarioGroups,
  getDefaultLaneIdForType,
  getDefaultLaneKindForType,
  getPlotLanes,
  getScenarioGroups,
  getPlotLane,
  getActiveScenarioGroup,
  getVisibleLanes,
  getDefaultNodeForAct,
  getCardsInLaneAct,
  nextLaneActOrder,
  ensurePlotBoardModel,
  updatePlotCardLane,
  getAutoPlotStatusForPlacement,
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

function setPlotBoardView(mode = "structure") {
  appState.plotBoardView = mode === "rehearsal" ? "rehearsal" : "structure";
  appState.project.plot_board.view_mode = appState.plotBoardView;
  render();
}

function setPlotContextVisible(visible = true) {
  appState.plotContextVisible = Boolean(visible);
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
      currentPage: appState.currentPage,
      evalRules: appState.evalRules
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

function goToAdjacentStep(direction) {
  const nextIndex = Math.max(0, Math.min(workflowSteps.length - 1, currentStepIndex() + direction));
  setCurrentStep(workflowSteps[nextIndex].id);
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

function updateProjectField(action, fieldName, value) {
  const selectedPlot = getPlotCard();
  const selectedCharacter = getCharacter();
  const selectedRelationship = getRelationship();
  const selectedScene = getScene();
  const selectedTimeline = getTimelineEvent();
  const selectedRule = getWorldRule();
  const selectedSetup = getSetup();

  if (action === "story-core-field") appState.project.story_core[fieldName] = value;
  if (action === "structure-meta-field") {
    if (fieldName === "template" && value !== appState.project.structure_profile.template) {
      applyStructureTemplate(
        value,
        value === "custom"
          ? appState.project.structure_profile?.custom_act_count ?? list(appState.project.structure_profile?.acts).length ?? 2
          : null
      );
      return;
    }
    if (fieldName === "custom_act_count" && appState.project.structure_profile.template === "custom") {
      applyStructureTemplate("custom", Number(value) || 2);
      return;
    }
    appState.project.structure_profile[fieldName] = value;
  }
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
  if (action === "genre-field") {
    if (fieldName === "secondary_genres_text") appState.project.genre_profile.secondary_genres = splitTags(value);
    else if (fieldName === "tone_words_text") appState.project.genre_profile.tone_words = splitTags(value);
    else appState.project.genre_profile[fieldName] = value;
    // 类型契约引擎以 project.genre 为真源：主/副类型编辑后同步回写
    if (fieldName === "primary_genre" || fieldName === "secondary_genres_text") {
      const gp = appState.project.genre_profile;
      appState.project.project.genre = [gp.primary_genre, ...list(gp.secondary_genres)].filter(Boolean);
    }
  }
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
  dom.runtimeStatus.innerHTML = `
    <span class="chip chip--soft">${escapeHtml(mode)}</span>
    <span class="chip chip--save chip--save-${savingState}">${escapeHtml(savingLabel)}</span>
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
  const activeIdx = workflowSteps.findIndex((s) => s.id === appState.currentStepId);
  const nextStep = workflowSteps[activeIdx + 1];
  const stepButtons = workflowSteps
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
  renderScreenplayPage(dom, appState);
  if (appState.creation) renderCreationPage();
  renderPageVisibility();
  schedulePlotInspectorLeadSync();
}

// ── Event handlers ────────────────────────────────────────────────────────────

function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const id = target.dataset.id ?? "";
  const nodeId = target.dataset.nodeId ?? "";

  if (action === "create-ai-step") { requestCreateStepSuggestionCurrent(target.dataset.step ?? getProjectCreateStep().id); return; }
  if (action === "create-ai-field") { requestCreateFieldSuggestionCurrent(target.dataset.field ?? ""); return; }
  if (action === "apply-concept-option") { applyConceptOptionCurrent(target.dataset.id ?? ""); return; }
  if (action === "activate-llm-profile") {
    fetchJson(`/api/ai/profiles/${encodeURIComponent(id)}/activate`, { method: "POST" })
      .then((payload) => {
        appState.ai = payload.ai ?? appState.ai;
        appState.llmProfiles = payload.profiles ?? appState.llmProfiles;
        appState.aiConfigDraft.provider = appState.ai.provider || appState.aiConfigDraft.provider;
        appState.aiConfigDraft.model = appState.ai.model || "";
        appState.createAssistant.message = `已切换到 ${appState.ai.model || appState.ai.provider}`;
        _renderProjectCreateForm();
      })
      .catch((error) => { appState.createAssistant.error = error.message; _renderProjectCreateForm(); });
    return;
  }
  if (action === "delete-llm-profile") {
    fetchJson(`/api/ai/profiles/${encodeURIComponent(id)}`, { method: "DELETE" })
      .then((payload) => { appState.llmProfiles = payload.profiles ?? []; _renderProjectCreateForm(); })
      .catch(() => {});
    return;
  }
  if (action === "ai-provider-choice") {
    const provider = PROVIDER_LABELS[target.dataset.value] ? target.dataset.value : "openai";
    appState.aiConfigDraft.provider = provider;
    appState.aiConfigDraft.model = defaultModelForProvider(provider);
    appState.aiConfigDraft.baseUrl = provider === "custom" ? (appState.aiConfigDraft.baseUrl || "https://api.deepseek.com/v1") : "";
    appState.aiModelCatalog.provider = "";
    appState.aiModelCatalog.options = [];
    appState.createAssistant.error = "";
    _renderProjectCreateForm();
    return;
  }
  if (action === "toggle-ai-config") { appState.aiConfigOpen = !appState.aiConfigOpen; _renderProjectCreateForm(); return; }
  if (action === "fetch-ai-models") { fetchAiModelOptionsCurrentV2(); return; }
  if (action === "save-ai-config") { saveAiConfigDraftCurrentV2(); return; }
  if (action === "disconnect-ai-config") { disconnectAiConfigDraftCurrentV2(); return; }
  if (action === "open-creation-flow") {
    appState.currentPage = "creation";
    appState.createDialogOpen = false;
    if (!appState.creation) {
      appState.creation = {
        currentStep: 1,
        genres: [],
        era: "",
        conceptHint: "",
        conceptChoices: [],
        selectedConceptIdx: -1,
        selectedConcept: null,
        conceptCustom: "",
        conceptCustomOpen: false,
        synopsisChoices: [],
        selectedSynopsisIdx: -1,
        selectedSynopsis: null,
        synopsisCustom: "",
        synopsisCustomOpen: false,
        characterProposals: [],
        confirmedCharacters: [],
        sceneProposals: [],
        selectedSceneIds: new Set(),
        selectedStructure: { primary: null, devices: [], lens: [] },
        actStructure: null,
        actStructureChoice: null,
        loadingStep: -1,
        aiError: "",
        lastReasoning: "",
        reasoningPanelOpen: false,
        autoGen: null
      };
    }
    saveLocalSnapshot();
    render();
    renderCreationPage();
    return;
  }
  if (action === "new-creation-flow") {
    appState.currentPage = "creation";
    appState.createDialogOpen = false;
    appState.creation = {
      currentStep: 1,
      genres: [],
      era: "",
      conceptHint: "",
      conceptChoices: [],
      selectedConceptIdx: -1,
      selectedConcept: null,
      conceptCustom: "",
      conceptCustomOpen: false,
      synopsisChoices: [],
      selectedSynopsisIdx: -1,
      selectedSynopsis: null,
      synopsisCustom: "",
      synopsisCustomOpen: false,
      characterProposals: [],
      confirmedCharacters: [],
      sceneProposals: [],
      selectedSceneIds: new Set(),
      selectedStructureId: null,
      actStructure: null,
      actStructureChoice: null,
      loadingStep: -1,
      aiError: "",
      lastReasoning: "",
      reasoningPanelOpen: false
    };
    saveLocalSnapshot();
    render();
    renderCreationPage();
    return;
  }
  if (action === "open-create-dialog") {
    resetProjectCreateWizard();
    appState.createDialogOpen = true;
    render();
    return;
  }
  if (action === "toggle-draft-tone") {
    const val = target.dataset.value ?? "";
    appState.projectDraft.tone = appState.projectDraft.tone === val ? "" : val;
    appState.createConceptOptions = [];
    appState.createAssistant.error = "";
    _renderProjectCreateForm();
    return;
  }
  if (action === "toggle-character-field-lock") {
    const char = getCharacter();
    if (char && id) {
      const locked = list(char.locked_fields);
      char.locked_fields = locked.includes(id) ? locked.filter((f) => f !== id) : [...locked, id];
      markDirty(); render();
    }
    return;
  }
  if (action === "toggle-plot-trope") {
    const card = getPlotCard();
    if (card) {
      const tags = list(card.trope_tags);
      card.trope_tags = tags.includes(id) ? tags.filter((t) => t !== id) : [...tags, id];
      markDirty(); render();
    }
    return;
  }
  // ── 场景编织事件处理 ──────────────────────────────────────────
  if (action === "select-scene-goal") {
    const scene = getScene();
    if (scene) { scene.scene_goal_template = scene.scene_goal_template === id ? "" : id; markDirty(); render(); }
    return;
  }
  if (action === "select-scene-outcome") {
    const scene = getScene();
    if (scene) { scene.scene_outcome = scene.scene_outcome === id ? "" : id; markDirty(); render(); }
    return;
  }
  if (action === "select-scene-emotion") {
    const scene = getScene();
    const fieldName = target.dataset.field;
    if (scene && fieldName) { scene[fieldName] = scene[fieldName] === id ? "" : id; markDirty(); render(); }
    return;
  }
  if (action === "select-scene-dialogue-style") {
    const scene = getScene();
    if (scene) { scene.dialogue_style = scene.dialogue_style === id ? "" : id; markDirty(); render(); }
    return;
  }
  if (action === "select-scene-subtext") {
    const scene = getScene();
    if (scene) { scene.subtext_type = scene.subtext_type === id ? "" : id; markDirty(); render(); }
    return;
  }
  if (action === "select-scene-power") {
    const scene = getScene();
    if (scene) { scene.dialogue_power = scene.dialogue_power === id ? "" : id; markDirty(); render(); }
    return;
  }
  if (action === "select-scene-pace") {
    const scene = getScene();
    if (scene) { scene.dialogue_pace = scene.dialogue_pace === id ? "" : id; markDirty(); render(); }
    return;
  }
  if (action === "select-scene-desc-density") {
    const scene = getScene();
    if (scene) { scene.desc_density = scene.desc_density === id ? "" : id; markDirty(); render(); }
    return;
  }
  if (action === "select-scene-writing-style") {
    const scene = getScene();
    if (scene) { scene.writing_style = scene.writing_style === id ? "" : id; markDirty(); render(); }
    return;
  }
  // ── 角色心理剖面事件处理 ──────────────────────────────────────
  if (action === "select-char-mbti") {
    const char = getCharacter();
    if (char) { char.mbti = char.mbti === id ? "" : id; markDirty(); render(); }
    return;
  }
  if (action === "select-char-drive") {
    const char = getCharacter();
    if (!char) return;
    // 统一字符串：表示角色追求的需求上限（再次点击同一层清空）
    const current = Array.isArray(char.core_drive)
      ? (char.core_drive[char.core_drive.length - 1] ?? "")
      : (char.core_drive ?? "");
    char.core_drive = current === id ? "" : id;
    markDirty();
    render();
    return;
  }
  if (action === "ai-breakdown-scene") {
    aiBreakdownScene(id);
    return;
  }
  if (action === "ai-rate-scene") {
    aiRateScene(id);
    return;
  }
  if (action === "ai-rate-screenplay-full") {
    aiRateScreenplayFull();
    return;
  }
  if (action === "close-rater") {
    appState.raterResult = null;
    render();
    return;
  }
  if (action === "apply-rater-revision") {
    aiReviseSceneWithRater(id);
    return;
  }
  if (action === "apply-rater-revision-full") {
    aiReviseFullScreenplayWithRater();
    return;
  }
  if (action === "ai-expand-scenes") {
    aiExpandScenes();
    return;
  }
  if (action === "ai-extract-continuity") {
    aiExtractContinuity();
    return;
  }
  if (action === "global-find-replace") {
    globalFindReplace();
    return;
  }
  if (action === "ai-genre-audit") {
    aiGenreAudit();
    return;
  }
  if (action === "ai-genre-remedy") {
    aiGenreRemedy();
    return;
  }
  if (action === "cf-toggle-genre") {
    const c = appState.creation;
    if (!c) return;
    c.genres = Array.isArray(c.genres) ? c.genres : [];
    if (c.genres.includes(id)) {
      c.genres = c.genres.filter((g) => g !== id);
    } else if (c.genres.length < 3) {
      c.genres = [...c.genres, id];
    } else {
      alert("最多选 1 个主导 + 2 个调味类型。先取消一个再选。");
      return;
    }
    renderCreationPage();
    return;
  }
  if (action === "audit-speakers") {
    auditScriptSpeakers();
    return;
  }
  if (action && action.startsWith("series-") && handleSeriesAction(action, id, target)) return;
  if (action === "library-back") {
    setCurrentPage(appState.libraryReturnPage ?? "project");
    return;
  }
  if (action === "toggle-character-trait") {
    const char = getCharacter();
    if (!char) return;
    const traits = list(char.traits);
    char.traits = traits.includes(id)
      ? traits.filter((t) => t !== id)
      : [...traits, id];
    markDirty();
    render();
    return;
  }
  // ── 情节元件事件处理 ──────────────────────────────────────────
  if (action === "select-plot-macguffin") {
    const card = getPlotCard();
    if (card) { card.macguffin = card.macguffin === id ? "" : id; markDirty(); render(); }
    return;
  }
  if (action === "select-plot-catalyst") {
    const card = getPlotCard();
    if (card) { card.catalyst_type = card.catalyst_type === id ? "" : id; markDirty(); render(); }
    return;
  }
  if (action === "toggle-plot-conflict") {
    const card = getPlotCard();
    if (card) {
      const types = list(card.conflict_types);
      card.conflict_types = types.includes(id) ? types.filter((t) => t !== id) : [...types, id];
      markDirty(); render();
    }
    return;
  }
  if (action === "toggle-plot-twist") {
    const card = getPlotCard();
    if (card) {
      const types = list(card.twist_types);
      card.twist_types = types.includes(id) ? types.filter((t) => t !== id) : [...types, id];
      markDirty(); render();
    }
    return;
  }
  if (action === "select-rel-type-chip") {
    const rel = getRelationship();
    if (rel) {
      // 类型槽（relationship_kind）独立于自定义名（relationship_type）。
      // 切换 chip 只影响 kind；用户填的 type 名称保留不变。
      rel.relationship_kind = rel.relationship_kind === id ? "" : id;
      // 若用户从未填过自定义名，把 kind 作为默认显示名以保持显示能用
      if (!rel.relationship_type || RELATIONSHIP_TYPE_KIND_VALUES.has(rel.relationship_type)) {
        rel.relationship_type = rel.relationship_kind;
      }
      markDirty(); render();
    }
    return;
  }
  if (action === "select-ending-direction") {
    const current = appState.project.story_core.ending_direction ?? "";
    appState.project.story_core.ending_direction = current === id ? "" : id;
    markDirty(); render();
    return;
  }
  if (action === "toggle-draft-genre") {
    const val = target.dataset.value ?? "";
    const current = Array.isArray(appState.projectDraft.genre) ? appState.projectDraft.genre : [];
    appState.projectDraft.genre = current.includes(val) ? current.filter((g) => g !== val) : [...current, val];
    appState.createConceptOptions = [];
    appState.createAssistant.error = "";
    _renderProjectCreateForm();
    return;
  }
  if (action === "draft-choice") { updateDraftField(target.dataset.field, target.dataset.value ?? ""); return; }
  if (action === "open-project") {
    loadProjectFromServer(id)
      .then(() => { setCurrentPage("workflow"); setCurrentStep("structure"); })
      .catch(() => {
        const snapshot = loadLocalSnapshot();
        if (snapshot?.project?.project?.id === id) {
          appState.project = ensurePlotDrivenProject(snapshot.project);
          normalizeProject();
          setCurrentPage("workflow");
          setCurrentStep("structure");
        }
      });
    return;
  }
  if (action === "open-project-menu") {
    appState.projectMenuId = id;
    appState.projectDeleteConfirmId = null;
    render();
    return;
  }
  if (action === "close-project-menu") {
    appState.projectMenuId = null;
    render();
    return;
  }
  if (action === "rename-project") {
    const current = list(appState.projectList).find((p) => p.id === id);
    const nextTitle = window.prompt("项目新名称：", current?.title ?? "")?.trim();
    appState.projectMenuId = null;
    if (!nextTitle || nextTitle === current?.title) { render(); return; }
    fetchJson(`/api/projects/${encodeURIComponent(id)}`)
      .then((payload) => {
        const doc = payload.project;
        doc.project.title = nextTitle;
        return fetchJson(`/api/projects/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project: doc })
        });
      })
      .then((payload) => {
        appState.projectList = payload.projects ?? appState.projectList;
        if (appState.project?.project?.id === id) appState.project.project.title = nextTitle;
        render();
      })
      .catch((error) => { window.alert(`重命名失败：${error.message}`); render(); });
    return;
  }
  if (action === "request-delete-project") {
    appState.projectDeleteConfirmId = id;
    appState.projectMenuId = null;
    render();
    return;
  }
  if (action === "cancel-delete-project") {
    appState.projectDeleteConfirmId = null;
    render();
    return;
  }
  if (action === "confirm-delete-project") {
    const deletingId = id;
    fetchJson(`/api/projects/${encodeURIComponent(deletingId)}`, { method: "DELETE" })
      .then((payload) => {
        appState.projectList = payload.projects ?? [];
        appState.projectDeleteConfirmId = null;
        if (appState.project?.project?.id === deletingId) {
          window.clearTimeout(appState.saveTimer);
          appState.runtime.dirty = false;
          appState.project = null;
        }
        render();
      })
      .catch((error) => {
        appState.projectDeleteConfirmId = null;
        window.alert(`删除失败：${error.message}`);
        render();
      });
    return;
  }
  if (action === "open-structure-library") { openStructureLibrary(); return; }
  if (action === "open-structure-config") { openStructureLibrary(); return; }
  if (action === "select-node") {
    const nid = target.dataset.nodeId ?? "";
    appState.selection.nodeId = appState.selection.nodeId === nid ? null : nid;
    render();
    return;
  }
  // 点击节点 card 内的 title input 时也展开 drawer（之前点击只让 input 聚焦，看起来「无反应」）
  if (action === "node-field" && target.dataset.field === "title") {
    const nodeCard = target.closest("[data-action='select-node']");
    if (nodeCard && appState.selection.nodeId !== nodeCard.dataset.nodeId) {
      appState.selection.nodeId = nodeCard.dataset.nodeId;
      render();
    }
    return;
  }
  if (action === "close-node-drawer") {
    appState.selection.nodeId = null;
    render();
    return;
  }
  if (action === "ai-gen-structure-notes") { handleGenStructureNotes(); return; }
  if (action === "ai-gen-node-note") { handleGenNodeNote(id); return; }
  if (action === "filter-library") {
    libraryFilterTag = target.dataset.tag ?? "all";
    dom.structureLibraryContent.innerHTML = renderStructureLibraryDialog(libraryFilterTag);
    return;
  }
  if (action === "apply-library-structure") {
    const structId = target.dataset.id;
    if (structId) applyLibraryStructure(structId);
    return;
  }
  if (action === "trigger-poster-upload") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        appState.project.story_core.poster_base64 = e.target.result;
        markDirty();
        render();
      };
      reader.readAsDataURL(file);
    };
    input.click();
    return;
  }
  if (action === "remove-poster") {
    event.stopPropagation();
    appState.project.story_core.poster_base64 = "";
    markDirty();
    render();
    return;
  }
  if (action === "go-step") return setCurrentStep(id);
  if (action === "jump-to-plot-card") { appState.selection.plotCardId = id; appState.plotFilter = "all"; setCurrentStep("plots"); return; }
  if (action === "jump-to-character") { appState.selection.characterId = id; setCurrentStep("characters"); return; }
  if (action === "jump-to-relationship") { appState.selection.relationshipId = id; setCurrentStep("relationships"); return; }
  if (action === "jump-to-scene") { appState.selection.sceneId = id; setCurrentStep("scenes"); return; }
  if (action === "set-plot-filter") { appState.plotFilter = id; render(); return; }
  if (action === "select-plot-card") { appState.selection.plotCardId = id; render(); return; }
  if (action === "open-plot-editor") { appState.plotEditorOpen = true; render(); return; }
  if (action === "close-plot-editor") { appState.plotEditorOpen = false; render(); return; }
  if (action === "add-plot-card") {
    const laneId = target.dataset.laneId ?? "";
    const actId = target.dataset.actId ?? "";
    const targetNode = getNode(nodeId) ?? list(appState.project.structure_profile?.nodes)[0];
    const defaultLane = getVisibleLanes()[0];
    const newCard = {
      id: createId("plot"),
      title: "新剧情卡",
      act_id: (actId || targetNode?.act_id) ?? list(appState.project.structure_profile?.acts)[0]?.id ?? "",
      node_id: (nodeId || targetNode?.id) ?? "",
      lane_id: (laneId || defaultLane?.id) ?? "",
      lane_kind: defaultLane?.kind ?? "canonical_mainline",
      type: "mainline",
      status: "draft",
      summary: "",
      dramatic_question: "",
      conflict: "",
      change: "",
      notes: "",
      character_ids: [],
      impact_tags: [],
      depends_on: [],
      next_ids: [],
      scene_seed_ids: []
    };
    appState.project.plot_board.cards.push(newCard);
    appState.selection.plotCardId = newCard.id;
    appState.plotEditorOpen = true;
    normalizeProject();
    markDirty();
    render();
    return;
  }
  if (action === "delete-plot-node-col") {
    const delNodeId = target.dataset.nodeId ?? "";
    if (!delNodeId) return;
    if (!confirm("删除此节点列？该列内的剧情卡不会删除，但将解除挂载。")) return;
    const acts = list(appState.project.structure_profile?.acts);
    for (const act of acts) {
      act.nodes = list(act.nodes).filter((n) => n.id !== delNodeId);
    }
    list(appState.project.plot_board?.cards).forEach((c) => {
      if (c.node_id === delNodeId) c.node_id = "";
    });
    normalizeProject(); markDirty(); render();
    return;
  }
  if (action === "add-plot-node-col") {
    const acts = list(appState.project.structure_profile?.acts);
    if (acts.length === 0) return;
    const lastAct = acts[acts.length - 1];
    const newNode = {
      id: createId("node"),
      act_id: lastAct.id,
      title: "新节点",
      node_type: "custom",
      required: false,
      note: "",
      order_index: (list(lastAct.nodes).length + 1) * 10,
    };
    if (!lastAct.nodes) lastAct.nodes = [];
    lastAct.nodes.push(newNode);
    normalizeProject(); markDirty(); render();
    return;
  }
  if (action === "toggle-plot-lock") {
    const card = getPlotCard(id);
    if (card) { card.status = card.status === "locked" ? "review" : "locked"; normalizeProject(); markDirty(); render(); }
    return;
  }
  if (action === "scene-from-plot") {
    const card = getPlotCard(id);
    if (card && card.status !== "locked") {
      if (!confirm("该剧情卡尚未锁定，确认生成场景？\n建议先在「剧情开发」将卡片状态设为「锁定」再拆场景。")) return;
    }
    return insertSceneFromPlotCard(id);
  }
  if (action === "delete-plot-card") {
    // 软删除：移到废纸篓
    appState.project.plot_board.cards = list(appState.project.plot_board?.cards).map((item) =>
      item.id === id ? { ...item, deleted_at: new Date().toISOString() } : item
    );
    appState.plotEditorOpen = false;
    normalizeProject(); markDirty(); render();
    return;
  }
  if (action === "restore-plot-card") {
    appState.project.plot_board.cards = list(appState.project.plot_board?.cards).map((item) =>
      item.id === id ? { ...item, deleted_at: null } : item
    );
    normalizeProject(); markDirty(); render();
    return;
  }
  if (action === "purge-plot-card") {
    appState.project.plot_board.cards = list(appState.project.plot_board?.cards).filter((item) => item.id !== id);
    normalizeProject(); markDirty(); render();
    return;
  }
  if (action === "toggle-plot-trash-view") {
    appState.plotTrashOpen = !appState.plotTrashOpen;
    render();
    return;
  }
  if (action === "add-character") {
    const newId = createId("char");
    const character = {
      id: newId,
      name: "新人物",
      story_role: "supporting",
      external_goal: "",
      dramatic_need: "",
      contradiction: "",
      starting_mask: "",
      pressure_point: "",
      arc_start: "",
      arc_end: "",
      secret: "",
      notes: "",
      archetype: "",
      traits: [],
      locked_fields: [],
      status: "active",
      linked_plot_ids: []
    };
    appState.project.character_hub.characters.push(character);
    // 同步写入 story_bible.characters，否则 normalizeProject → deriveCharacterHub 会用 story_bible 派生覆盖回来
    appState.project.story_bible = appState.project.story_bible || {};
    appState.project.story_bible.characters = list(appState.project.story_bible.characters);
    appState.project.story_bible.characters.push({
      id: newId,
      name: "新人物",
      story_role: "supporting",
      external_want: "", internal_need: "", psychological_flaw: "", moral_flaw: "",
      public_mask: "", core_fear: "", wound: "", arc_start: "", arc_end: "",
      voice_rules: [], secret: ""
    });
    appState.selection.characterId = newId;
    appState.characterDesign = { loading: false, error: "" };
    normalizeProject(); markDirty(); render();
    return;
  }
  if (action === "select-character") {
    if (id && id === appState.characterCompareId) appState.characterCompareId = null;
    appState.selection.characterId = id;
    render();
    return;
  }
  if (action === "edit-character") {
    appState.selection.characterId = id;
    appState.characterDesign = { loading: false, error: "" };
    render();
    return;
  }
  if (action === "clear-character-compare") {
    appState.characterCompareId = null;
    render();
    return;
  }
  if (action === "ai-refine-character") {
    handleRefineCharacter(id);
    return;
  }
  if (action === "delete-character") {
    const charToDelete = getCharacter(id);
    const cascadeRels = list(appState.project.character_hub?.relationship_map)
      .filter((r) => r.source_character_id === id || r.target_character_id === id);
    const cascadeNote = cascadeRels.length ? `\n该人物关联的 ${cascadeRels.length} 条关系会一并删除。` : "";
    if (!confirm(`删除人物「${charToDelete?.name || "未命名"}」？此操作不可恢复。${cascadeNote}`)) return;
    appState.project.character_hub.characters = list(appState.project.character_hub?.characters).filter((item) => item.id !== id);
    appState.project.character_hub.relationship_map = list(appState.project.character_hub?.relationship_map).filter((item) => item.source_character_id !== id && item.target_character_id !== id);
    // 同步从 story_bible.characters 删除，否则 normalize 时 deriveCharacterHub 会从 story_bible 把人物加回来
    if (appState.project.story_bible) {
      appState.project.story_bible.characters = list(appState.project.story_bible.characters).filter((item) => item.id !== id);
      appState.project.story_bible.relationships = list(appState.project.story_bible.relationships).filter((item) => item.source_character_id !== id && item.target_character_id !== id);
    }
    list(appState.project.plot_board?.cards).forEach((card) => { card.character_ids = list(card.character_ids).filter((characterId) => characterId !== id); });
    list(appState.project.scene_workbench?.scenes).forEach((scene) => { if (scene.pov_character_id === id) scene.pov_character_id = ""; });
    if (appState.selection.characterId === id) appState.selection.characterId = null;
    normalizeProject(); markDirty(); render();
    return;
  }
  if (action === "add-relationship") {
    // 决议 4：关系 1 条对称 — (a,b) 与 (b,a) 视为同一对。
    // 新增时自动选第一对「还没有关系」的角色组合，否则固定取前两人会静默无效
    const characters = list(appState.project.character_hub?.characters);
    if (characters.length < 2) {
      alert("至少需要两个人物才能建立关系");
      return;
    }
    const rels = list(appState.project.character_hub?.relationship_map);
    const hasPair = (a, b) => rels.some((r) =>
      (r.source_character_id === a && r.target_character_id === b) ||
      (r.source_character_id === b && r.target_character_id === a)
    );
    let src = "", tgt = "";
    outer: for (let i = 0; i < characters.length; i++) {
      for (let j = i + 1; j < characters.length; j++) {
        if (!hasPair(characters[i].id, characters[j].id)) {
          src = characters[i].id; tgt = characters[j].id;
          break outer;
        }
      }
    }
    if (!src) {
      alert("所有角色两两之间都已有关系。可在已有关系上修改角色组合。");
      return;
    }
    const relationship = {
      id: createId("rel"),
      source_character_id: src,
      target_character_id: tgt,
      relationship_type: "",
      tension: "",
      power_balance: "",
      shared_history: "",
      hidden_information: "",
      status: "active",
      related_plot_ids: []
    };
    appState.project.character_hub.relationship_map.push(relationship);
    appState.selection.relationshipId = relationship.id;
    normalizeProject(); markDirty(); render();
    return;
  }
  if (action === "select-relationship") { appState.selection.relationshipId = id; render(); return; }
  if (action === "delete-relationship") {
    const relToDelete = getRelationship(id);
    if (relToDelete) {
      const relName = relToDelete.relationship_type || relToDelete.relationship_kind || "未命名关系";
      const pair = `${getCharacterNameById(relToDelete.source_character_id)} ↔ ${getCharacterNameById(relToDelete.target_character_id)}`;
      if (!confirm(`删除关系「${pair}（${relName}）」？此操作不可恢复。`)) return;
    }
    appState.project.character_hub.relationship_map = list(appState.project.character_hub?.relationship_map).filter((item) => item.id !== id);
    if (appState.project.story_bible) {
      appState.project.story_bible.relationships = list(appState.project.story_bible.relationships).filter((item) => item.id !== id);
    }
    if (appState.selection.relationshipId === id) appState.selection.relationshipId = null;
    normalizeProject(); markDirty(); render();
    return;
  }
  if (action === "add-convention") {
    appState.project.genre_profile.conventions.push({ id: createId("conv"), name: "", status: "required", description: "" });
    markDirty(); render();
    return;
  }
  if (action === "add-taboo") {
    appState.project.genre_profile.taboos.push({ id: createId("taboo"), name: "", description: "" });
    markDirty(); render();
    return;
  }
  if (action === "add-timeline") {
    const item = { id: createId("event"), story_day: list(appState.project.lock_layer?.projections?.timeline_events).length + 1, sequence_index: 1, summary: "", participants: [], location: "", trigger: "", consequence: "" };
    appState.project.lock_layer.projections.timeline_events.push(item);
    // 双写 story_bible — ensurePlotDrivenProject 从 story_bible 派生 lock_layer.projections，
    // 不写就会被擦回
    appState.project.story_bible = appState.project.story_bible || {};
    appState.project.story_bible.timeline_events = list(appState.project.story_bible.timeline_events);
    appState.project.story_bible.timeline_events.push(item);
    appState.selection.timelineId = item.id;
    markDirty(); render();
    return;
  }
  if (action === "locks-tab") {
    appState.locksActiveTab = id;
    if (id === "kb" && appState.knowledge.sources.length === 0) {
      kbFetchSources().then(() => { if (appState.knowledge.selectedSourceId) kbSearch(); });
    } else if (id === "kb" && appState.knowledge.items.length === 0) {
      kbSearch();
    }
    render();
    return;
  }
  if (action === "kb-init") { kbFetchSources().then(() => kbSearch()); return; }
  if (action === "kb-sync") { kbSync(); return; }
  if (action === "kb-open-entry") { kbOpenEntry(id); return; }
  if (action === "kb-import") { kbImport(target.dataset.target); return; }
  if (action === "select-timeline") { appState.selection.timelineId = id; render(); return; }
  if (action === "delete-timeline") {
    const item = getTimelineEvent(id);
    if (item?.summary && !confirm(`删除时间节点「${item.summary}」？此操作不可恢复。`)) return;
    appState.project.lock_layer.projections.timeline_events =
      list(appState.project.lock_layer?.projections?.timeline_events).filter((e) => e.id !== id);
    appState.project.story_bible.timeline_events =
      list(appState.project.story_bible?.timeline_events).filter((e) => e.id !== id);
    appState.selection.timelineId = null;
    normalizeProject(); markDirty(); render();
    return;
  }
  if (action === "delete-world-rule") {
    const item = getWorldRule(id);
    if (item?.rule_statement && !confirm(`删除世界规则「${item.rule_statement.slice(0, 20)}」？此操作不可恢复。`)) return;
    appState.project.lock_layer.projections.world_rules =
      list(appState.project.lock_layer?.projections?.world_rules).filter((e) => e.id !== id);
    appState.project.story_bible.world_rules =
      list(appState.project.story_bible?.world_rules).filter((e) => e.id !== id);
    appState.selection.worldRuleId = null;
    normalizeProject(); markDirty(); render();
    return;
  }
  if (action === "delete-setup") {
    const item = getSetup(id);
    if (item?.setup_summary && !confirm(`删除伏笔「${item.setup_summary.slice(0, 20)}」？此操作不可恢复。`)) return;
    appState.project.lock_layer.projections.setup_payoffs =
      list(appState.project.lock_layer?.projections?.setup_payoffs).filter((e) => e.id !== id);
    appState.project.story_bible.setup_payoffs =
      list(appState.project.story_bible?.setup_payoffs).filter((e) => e.id !== id);
    appState.selection.setupId = null;
    normalizeProject(); markDirty(); render();
    return;
  }
  if (action === "add-world-rule") {
    const item = { id: createId("rule"), rule_statement: "", rule_level: "hard", scope: "", exceptions: [], evidence: [] };
    appState.project.lock_layer.projections.world_rules.push(item);
    appState.project.story_bible = appState.project.story_bible || {};
    appState.project.story_bible.world_rules = list(appState.project.story_bible.world_rules);
    appState.project.story_bible.world_rules.push(item);
    appState.selection.worldRuleId = item.id;
    markDirty(); render();
    return;
  }
  if (action === "select-world-rule") { appState.selection.worldRuleId = id; render(); return; }
  if (action === "add-setup") {
    const item = { id: createId("setup"), setup_summary: "", setup_scene_id: "", expected_payoff_window: "", status: "open", payoff_scene_id: "", payoff_summary: "" };
    appState.project.lock_layer.projections.setup_payoffs.push(item);
    appState.project.story_bible = appState.project.story_bible || {};
    appState.project.story_bible.setup_payoffs = list(appState.project.story_bible.setup_payoffs);
    appState.project.story_bible.setup_payoffs.push(item);
    appState.selection.setupId = item.id;
    markDirty(); render();
    return;
  }
  if (action === "select-setup") { appState.selection.setupId = id; render(); return; }
  if (action === "add-scene") {
    const scene = {
      id: createId("scene"),
      order_index: list(appState.project.scene_workbench?.scenes).length + 1,
      title: "新场景",
      act_id: list(appState.project.structure_profile?.acts)[0]?.id ?? "",
      linked_plot_card_ids: [],
      pov_character_id: "",
      location: "",
      time_of_day: "",
      purpose: "",
      obstacle: "",
      beat_summary: "",
      entry_state: "",
      exit_state: "",
      status: "draft",
      script_excerpt: "",
      notes: ""
    };
    appState.project.scene_workbench.scenes.push(scene);
    appState.selection.sceneId = scene.id;
    normalizeProject(); markDirty(); render();
    return;
  }
  if (action === "select-scene") { appState.selection.sceneId = id; render(); return; }
  if (action === "delete-scene") {
    const sceneToDelete = getScene(id);
    if (sceneToDelete) {
      const scriptLen = (sceneToDelete.script_full || "").trim().length;
      const scriptNote = scriptLen > 0 ? `\n本场已有 ${scriptLen} 字剧本成稿，会一并删除。` : "";
      if (!confirm(`删除场景「${sceneToDelete.title || "未命名场景"}」？此操作不可恢复。${scriptNote}`)) return;
    }
    appState.project.scene_workbench.scenes = list(appState.project.scene_workbench?.scenes).filter((item) => item.id !== id);
    if (appState.project.story_bible) {
      appState.project.story_bible.scene_cards = list(appState.project.story_bible.scene_cards).filter((item) => item.id !== id);
    }
    if (appState.selection.sceneId === id) appState.selection.sceneId = null;
    if (appState.selection.screenplaySceneId === id) appState.selection.screenplaySceneId = null;
    normalizeProject(); markDirty(); render();
    return;
  }
  if (action === "select-screenplay-scene") { appState.selection.screenplaySceneId = id; render(); return; }
  if (action === "insert-scene-script-template") {
    const scene = list(appState.project.scene_workbench?.scenes).find((s) => s.id === id);
    if (!scene) return;
    if (scene.script_full && scene.script_full.trim().length > 0) {
      if (!confirm("本场已有内容，插入模板会附加在末尾。继续？")) return;
    }
    const intExt = (scene.location || "").trim().startsWith("内") ? "INT." : "EXT.";
    const where = (scene.location || "未定地点").toUpperCase();
    const when = (scene.time_of_day || "").toUpperCase();
    const pov = list(appState.project.character_hub?.characters).find((c) => c.id === scene.pov_character_id)?.name ?? "人物名";
    const tmpl = [
      `${intExt} ${where}${when ? " - " + when : ""}`,
      "",
      `（${scene.purpose || "本场目标"}。${scene.obstacle || "本场障碍"}。）`,
      "",
      pov.toUpperCase(),
      "（情绪/动作提示）",
      "（对白...）",
      ""
    ].join("\n");
    scene.script_full = (scene.script_full ? scene.script_full + "\n\n" : "") + tmpl;
    markDirty(); render();
    return;
  }
  if (action === "ai-write-scene-script") {
    aiWriteSceneScript(id);
    return;
  }
  if (action === "ai-write-screenplay-bulk") {
    aiWriteScreenplayBulk();
    return;
  }
  if (action === "ai-rewrite-all-screenplay") {
    const scenes = list(appState.project.scene_workbench?.scenes);
    const written = scenes.filter((s) => s.script_full && s.script_full.trim().length > 0);
    if (written.length === 0) {
      alert("没有已写的剧本可以重写。");
      return;
    }
    if (!confirm(`将清空全部 ${written.length} 个场景的剧本并重新生成（应用最新反同质化 prompt）。\n\n这会消耗较多 token 且不可撤销。继续？`)) return;
    written.forEach((s) => { s.script_full = ""; });
    markDirty();
    render();
    aiWriteScreenplayBulk();
    return;
  }
  if (action === "export-screenplay-fountain") {
    const text = buildFountainText(appState);
    const title = (appState.project.project?.title || "screenplay").replace(/[\\/:*?"<>|]/g, "_");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.fountain`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }
  if (action === "preview-screenplay-full") {
    const text = buildFountainText(appState);
    const title = appState.project.project?.title || "剧本预览";
    const w = openFountainPreview(text, title);
    if (!w) alert("浏览器拦截了弹窗，请允许后重试。");
    return;
  }
  if (action === "set-plot-view") { setPlotBoardView(target.dataset.id ?? "structure"); return; }
  if (action === "toggle-plot-context") { setPlotContextVisible(!appState.plotContextVisible); return; }
  if (action === "set-scenario-group") { appState.activeScenarioGroupId = target.dataset.id ?? null; render(); return; }
  if (action === "move-plot-card-position") { shiftPlotCardWithinLane(target.dataset.id ?? "", Number(target.dataset.direction) || 0); }
  if (action === "cancel-reset") { appState.resetConfirmPending = false; renderAiSettingsDialog(dom, appState, aiGetters); return; }
  if (action === "confirm-reset") {
    appState.resetConfirmPending = false;
    (async () => {
      if (!appState.runtime.serverAvailable) {
        appState.project = ensurePlotDrivenProject(cloneDefaultProject());
        normalizeProject();
        render();
        return;
      }
      const payload = await fetchJson(`/api/projects/${encodeURIComponent(appState.project.project.id)}/reset`, { method: "POST" });
      appState.project = ensurePlotDrivenProject(payload.project);
      appState.projectList = payload.projects ?? appState.projectList;
      normalizeProject();
      render();
    })();
    return;
  }
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
  if (action === "convention-field") {
    const item = list(appState.project.genre_profile?.conventions).find((c) => c.id === event.target.dataset.id);
    if (item) item[fieldName] = event.target.value;
    markDirty();
    return;
  }
  if (action === "taboo-field") {
    const item = list(appState.project.genre_profile?.taboos).find((t) => t.id === event.target.dataset.id);
    if (item) item[fieldName] = event.target.value;
    markDirty();
    return;
  }
  updateProjectField(action, fieldName, event.target.value);
}

function handleChange(event) {
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
  if (localSnapshot?.evalRules) {
    appState.evalRules = { ...appState.evalRules, ...localSnapshot.evalRules };
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
if (dom.stepPrevButton) dom.stepPrevButton.addEventListener("click", () => goToAdjacentStep(-1));
if (dom.stepNextButton) dom.stepNextButton.addEventListener("click", () => goToAdjacentStep(1));
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

// 渲染创作流程页（快速版 or 精品版）
function renderCreationPage() {
  if (!dom.creationContent) return;
  saveLocalSnapshot();
  if (appState.proCreation?.active) {
    renderProCreationPage(dom, appState);
  } else {
    renderCreationFlowPage(dom, appState);
  }
}

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
        theme: { questions: pc.workbenches.theme.questions },
        character: { questions: pc.workbenches.character.questions },
        scene: { questions: pc.workbenches.scene.questions }
      })
    });
    const data = await res.json();
    if (data.projectId) {
      appState.proCreation.active = false;
      await loadProjectFromServer(data.projectId);
      setCurrentPage("workflow");
      setCurrentStep("structure");
    }
  } catch (err) {
    pc.step = "workbenches";
    pc.loading = false;
    pc.error = `组装失败：${err.message}`;
    renderCreationPage();
  }
}

// ── Knowledge sources ─────────────────────────────────────────────────────────

async function kbFetchSources() {
  try {
    const r = await fetch("/api/knowledge/sources");
    const j = await r.json();
    appState.knowledge.sources = j.sources ?? [];
    if (!appState.knowledge.selectedSourceId && appState.knowledge.sources[0]) {
      appState.knowledge.selectedSourceId = appState.knowledge.sources[0].id;
    }
  } catch (e) {
    appState.knowledge.lastError = `加载知识源列表失败：${e.message}`;
  }
  render();
}

async function kbSearch() {
  const k = appState.knowledge;
  if (!k.selectedSourceId) return;
  k.loading = true;
  k.lastError = "";
  render();
  try {
    const params = new URLSearchParams({ q: k.query || "", limit: "30" });
    const r = await fetch(`/api/knowledge/${encodeURIComponent(k.selectedSourceId)}/search?${params}`);
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    k.items = j.items ?? [];
    k.total = j.total ?? 0;
    if (j.needsSync) k.lastError = "该源尚未同步本地数据，请先点「同步」。";
  } catch (e) {
    k.lastError = `搜索失败：${e.message}`;
    k.items = [];
    k.total = 0;
  } finally {
    k.loading = false;
    render();
  }
}

async function kbOpenEntry(externalId) {
  const k = appState.knowledge;
  if (!k.selectedSourceId) return;
  k.entryLoading = true;
  k.selectedEntry = { external_id: externalId, title: "...", body: "", tags: [], related: [] };
  render();
  try {
    const r = await fetch(`/api/knowledge/${encodeURIComponent(k.selectedSourceId)}/entry/${encodeURIComponent(externalId)}`);
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    k.selectedEntry = j.entry;
  } catch (e) {
    k.lastError = `加载详情失败：${e.message}`;
    k.selectedEntry = null;
  } finally {
    k.entryLoading = false;
    render();
  }
}

async function kbSync() {
  const k = appState.knowledge;
  if (!k.selectedSourceId) return;
  k.syncing = true;
  k.lastError = "";
  render();
  try {
    const r = await fetch(`/api/knowledge/${encodeURIComponent(k.selectedSourceId)}/sync`, { method: "POST" });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    // 刷新 sources status
    await kbFetchSources();
    k.lastImportMessage = `同步完成：${j.total} 条条目`;
    setTimeout(() => { k.lastImportMessage = ""; render(); }, 4000);
  } catch (e) {
    k.lastError = `同步失败：${e.message}`;
  } finally {
    k.syncing = false;
    render();
  }
}

async function kbImport(target) {
  const k = appState.knowledge;
  const detail = k.selectedEntry;
  if (!detail || !detail.body) return;
  k.importing = true;
  render();
  try {
    const { buildImportPatch } = await import("./knowledge/importer.js");
    const { field, item } = buildImportPatch(detail, target);
    if (!appState.project.story_bible[field]) appState.project.story_bible[field] = [];
    appState.project.story_bible[field].push(item);
    normalizeProject();
    markDirty();
    k.lastImportMessage = `已导入到本地「${field === "world_rules" ? "世界规则" : field === "setup_payoffs" ? "伏笔追踪" : "时间线"}」。可切到对应 tab 查看。`;
    setTimeout(() => { k.lastImportMessage = ""; render(); }, 4000);
  } catch (e) {
    k.lastError = `导入失败：${e.message}`;
  } finally {
    k.importing = false;
    render();
  }
}

// ── Screenplay AI ─────────────────────────────────────────────────────────────

async function aiRateScene(sceneId) {
  const scene = list(appState.project.scene_workbench?.scenes).find((s) => s.id === sceneId);
  if (!scene) return;
  if (!scene.script_full || scene.script_full.trim().length < 80) {
    alert("本场还没写剧本，无法评分");
    return;
  }
  if (!appState.raterLoading) appState.raterLoading = {};
  appState.raterLoading[sceneId] = true;
  render();
  try {
    const result = await callGenerateAPI("act_rater", appState.project, {
      sceneId,
      scriptText: scene.script_full,
      genres: list(appState.project.project?.genre),
      tones: appState.project.project?.tone ? [appState.project.project.tone] : [],
      focuses: [],
      audience: ""
    });
    if (result.error) throw new Error(result.error);
    const data = result.choices?.[0]?.data ?? {};
    appState.raterResult = { sceneId, data };
  } catch (err) {
    alert("幕评师评分失败：" + err.message);
  } finally {
    delete appState.raterLoading[sceneId];
    render();
  }
}

async function aiRateScreenplayFull() {
  const scenes = list(appState.project.scene_workbench?.scenes);
  const writtenScenes = scenes.filter((s) => s.script_full && s.script_full.trim().length > 50);
  if (writtenScenes.length === 0) {
    alert("还没有任何已写场，无法进行全片评分");
    return;
  }
  appState.raterFullLoading = true;
  render();
  try {
    const result = await callGenerateAPI("act_rater", appState.project, {
      mode: "full",
      genres: list(appState.project.project?.genre),
      tones: appState.project.project?.tone ? [appState.project.project.tone] : [],
      focuses: [],
      audience: ""
    });
    if (result.error) throw new Error(result.error);
    const data = result.choices?.[0]?.data ?? {};
    appState.raterResult = { mode: "full", data };
  } catch (err) {
    alert("全片幕评师评分失败：" + err.message);
  } finally {
    appState.raterFullLoading = false;
    render();
  }
}

async function aiReviseFullScreenplayWithRater() {
  const rater = appState.raterResult;
  if (!rater || rater.mode !== "full") {
    alert("请先用全片幕评师评分");
    return;
  }
  const directives = rater.data.revision_directives || [];
  if (directives.length === 0) {
    alert("评分中未给出修稿指令");
    return;
  }
  // 按 sceneId 分组，每场注入对应 directives 进 notes
  const bySceneId = new Map();
  for (const d of directives) {
    const sid = d.scene_id;
    if (!sid) continue;
    if (!bySceneId.has(sid)) bySceneId.set(sid, []);
    bySceneId.get(sid).push(d);
  }
  if (bySceneId.size === 0) {
    alert("修稿指令未标注 scene_id，无法定向应用");
    return;
  }
  if (!confirm(`将按全片评审指令重写 ${bySceneId.size} 场剧本，可能耗时较长。继续？`)) return;

  for (const [sceneId, dirs] of bySceneId) {
    const scene = list(appState.project.scene_workbench?.scenes).find((s) => s.id === sceneId);
    if (!scene) continue;
    // 修稿指令存专用字段，不污染用户可见的创作笔记（notes）；写本成功后一次性消费清空
    scene.rater_directives = dirs.map((d, i) =>
      `${i + 1}. [${d.severity}] ${d.issue}\n   定位：${d.location_hint || "（未给定位）"}\n   要求：${d.directive}`
    ).join("\n");
  }
  markDirty();
  appState.raterResult = null;
  render();

  // 按 order_index 顺序依次重写每场
  const sceneIds = Array.from(bySceneId.keys());
  const sortedScenes = list(appState.project.scene_workbench?.scenes)
    .filter((s) => sceneIds.includes(s.id))
    .sort((a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999));
  appState.screenplayAi.bulkRunning = true;
  appState.screenplayAi.bulkProgress = { done: 0, total: sortedScenes.length };
  render();
  for (const s of sortedScenes) {
    await aiWriteSceneScript(s.id, { silent: true });
    appState.screenplayAi.bulkProgress.done += 1;
    render();
  }
  appState.screenplayAi.bulkRunning = false;
  render();
}

async function aiReviseSceneWithRater(sceneId) {
  const rater = appState.raterResult;
  if (!rater || rater.sceneId !== sceneId) {
    alert("请先用幕评师评分");
    return;
  }
  const scene = list(appState.project.scene_workbench?.scenes).find((s) => s.id === sceneId);
  if (!scene) return;
  const directives = (rater.data.revision_directives || []).map((d, i) =>
    `${i + 1}. [${d.severity}] ${d.issue}\n   定位：${d.location_hint}\n   要求：${d.directive}`
  ).join("\n");
  // 修稿指令存专用字段（buildSceneScriptPrompt 单独消费），不污染用户可见的创作笔记
  scene.rater_directives = directives;
  markDirty();
  appState.raterResult = null;
  render();
  await aiWriteSceneScript(sceneId, { silent: true });
}

// 通用称谓（路人/职务），不算「名单外人名」
// 设备音/画外音类 cue：以这些词结尾的说话人不算「名单外人名」（科幻/现代题材常见）
const GENERIC_SUFFIX_RE = /(的?声音|提示音|广播|系统|电台|喇叭|控制台|对讲机?|铃声|录音|男声|女声)$/;
const GENERIC_SPEAKER_RE = /^(路人|店员|老板娘?|服务员|护士长?|医生|主治医生|警察|警员|司机|保安|旁白|画外音|众人|群众|记者|主持人|播音员|法医|助理|秘书|售货员|收银员|清洁工|门卫|邻居|乘客|售票员|司仪|副手|登记员|值班同事|取信员|工作人员|男声|女声|童声|电视新闻|电视(里|机)?|广播|出租车广播|电话(里|那头)?|对讲机)[甲乙丙丁ABC]?$/;

// 从剧本文本中找出不在项目人物名单里的对白说话人
function findUnknownSpeakers(script) {
  const roster = new Set([
    ...list(appState.project.character_hub?.characters).map((c) => (c.name || "").trim()),
    ...list(appState.project.series_bible?.regulars).map((c) => (c.name || "").trim())
  ].filter(Boolean));
  const unknown = new Set();
  const lines = String(script).split(/\r?\n/).map((l) => l.trim());
  for (let i = 0; i < lines.length; i++) {
    // 对白说话人行：2-6 个汉字独立成行（允许带括注），且下一行紧跟对白文本
    const m = lines[i].match(/^([一-龥]{2,6})(（[^）]*）)?$/);
    if (!m) continue;
    let j = i + 1;
    while (j < lines.length && !lines[j]) j++;
    const next = lines[j] ?? "";
    // 下一行必须像对白（有内容且本身不是另一个独立人名行），否则当作短动作行跳过
    if (!next || /^([一-龥]{2,6})(（[^）]*）)?$/.test(next)) continue;
    const name = m[1];
    if (roster.has(name) || GENERIC_SPEAKER_RE.test(name) || GENERIC_SUFFIX_RE.test(name)) continue;
    if (/^(清晨|上午|正午|午后|黄昏|夜晚|深夜|黎明|同时|稍后|片刻|内景|外景)$/.test(name)) continue;
    unknown.add(name);
  }
  return Array.from(unknown);
}

// ── 类型契约审计：AI 逐条核验必备场景兑现 + 禁忌检查，结果存 genre_profile ────
async function aiGenreAudit() {
  const scenes = list(appState.project.scene_workbench?.scenes);
  if (scenes.length === 0) {
    alert("还没有场景，无法检查契约兑现。");
    return;
  }
  appState.genreAuditLoading = true;
  render();
  try {
    const result = await callGenerateAPI("genre_audit", appState.project, {});
    if (result.error) throw new Error(result.error);
    const data = result.choices?.[0]?.data ?? {};
    if (!Array.isArray(data.fulfillment)) throw new Error("AI 未返回审计结果");
    appState.project.genre_profile.fulfillment_audit = {
      fulfillment: data.fulfillment,
      taboo_violations: list(data.taboo_violations),
      blend_balance: data.blend_balance ?? "",
      audited_at: new Date().toISOString()
    };
    markDirty();
  } catch (error) {
    alert(`契约审计失败：${error.message}`);
  } finally {
    appState.genreAuditLoading = false;
    render();
  }
}

// ── 契约修复闭环：审计问题 → 修稿指令/新增场景 → 可选定向重生成 ──────────────
async function aiGenreRemedy() {
  const audit = appState.project.genre_profile?.fulfillment_audit;
  const hasProblems = list(audit?.fulfillment).some((f) => f.status !== "fulfilled") || list(audit?.taboo_violations).length > 0;
  if (!audit || !hasProblems) {
    alert("没有待修复的契约问题。先点「检查契约兑现」做一次审计。");
    return;
  }
  appState.genreRemedyLoading = true;
  render();
  try {
    const result = await callGenerateAPI("genre_remedy", appState.project, {});
    if (result.error) throw new Error(result.error);
    const data = result.choices?.[0]?.data ?? {};
    const directives = list(data.scene_directives);
    const newScenes = list(data.new_scenes);
    if (directives.length === 0 && newScenes.length === 0) throw new Error("AI 未给出手术方案");

    const scenes = list(appState.project.scene_workbench?.scenes);
    const byOrder = new Map(scenes.map((s) => [Number(s.order_index), s]));
    const charByName = new Map(list(appState.project.character_hub?.characters).map((c) => [c.name, c.id]));
    const cardById = new Map(getLivePlotCards().map((c) => [c.id, c]));

    // 1. 修稿指令写入既有场次（叠加，不覆盖已有指令）。
    // 用 scene.id 追踪重生成目标——插入新场后 order_index 会整体重排，按场次号会错位漏场
    const directiveOrders = [];
    const targetSceneIds = new Set();
    for (const d of directives) {
      const scene = byOrder.get(Number(d.scene_order));
      if (!scene || !d.directive) continue;
      scene.rater_directives = [scene.rater_directives, d.directive].filter(Boolean).join("\n\n");
      directiveOrders.push(Number(d.scene_order));
      targetSceneIds.add(scene.id);
    }
    // 2. 新增场景插入指定位置
    const insertedTitles = [];
    for (const ns of newScenes) {
      const card = cardById.get(ns.card_id) ?? null;
      const scene = {
        id: createId("scene"),
        order_index: 0,
        title: ns.title || "未命名场景",
        act_id: card?.act_id ?? "",
        linked_plot_card_ids: card ? [card.id] : [],
        pov_character_id: charByName.get((ns.pov_name || "").trim()) ?? "",
        location: ns.location ?? "",
        time_of_day: ns.time_of_day ?? "",
        purpose: ns.purpose ?? "",
        obstacle: ns.obstacle ?? "",
        beat_summary: ns.beat_summary ?? "",
        entry_state: "",
        exit_state: "",
        status: "draft",
        script_excerpt: "",
        notes: ns.fulfills ? `兑现类型必备场景：${ns.fulfills}` : ""
      };
      const after = Number(ns.insert_after_order) || scenes.length;
      const sorted = list(appState.project.scene_workbench.scenes).sort((a, b) => a.order_index - b.order_index);
      const pos = sorted.findIndex((s) => Number(s.order_index) === after);
      sorted.splice(pos >= 0 ? pos + 1 : sorted.length, 0, scene);
      sorted.forEach((s, i) => { s.order_index = i + 1; });
      appState.project.scene_workbench.scenes = sorted;
      insertedTitles.push(`《${scene.title}》（第 ${scene.order_index} 场）`);
      targetSceneIds.add(scene.id);
    }
    normalizeProject();
    markDirty();
    render();

    const summary = [
      directives.length ? `已为 ${directiveOrders.length} 个场次写入修稿指令（第 ${directiveOrders.join("、")} 场）` : "",
      insertedTitles.length ? `已新增 ${insertedTitles.length} 场：${insertedTitles.join("、")}` : "",
      data.reasoning ? `\n手术思路：${data.reasoning}` : ""
    ].filter(Boolean).join("\n");

    // 3. 可选：立即串行重生成受影响场次（带指令的重写 + 新增场写稿）
    const regenTargets = list(appState.project.scene_workbench?.scenes)
      .filter((s) => targetSceneIds.has(s.id))
      .sort((a, b) => a.order_index - b.order_index);
    if (regenTargets.length > 0 && confirm(`${summary}\n\n是否立即按指令重生成这 ${regenTargets.length} 场？（每场约 2 分钟，可稍后在剧本页逐场手动生成）`)) {
      for (const target of regenTargets) {
        const r = await aiWriteSceneScript(target.id, { silent: true });
        if (!r.ok) {
          alert(`第 ${target.order_index} 场生成失败：${r.reason}。剩余场次已停止，可稍后手动生成。`);
          break;
        }
      }
      alert("契约修复重生成完成。建议重新点「检查契约兑现」复核。");
    } else if (regenTargets.length === 0) {
      alert(summary);
    }
  } catch (error) {
    alert(`契约修复失败：${error.message}`);
  } finally {
    appState.genreRemedyLoading = false;
    normalizeProject();
    render();
  }
}

// ── 系列库（跨项目世界观）数据流 ──────────────────────────────────────────────
async function loadSeriesLibrary(selectId = null) {
  appState.seriesLibrary = appState.seriesLibrary ?? { list: [], selected: null, loading: false };
  try {
    const payload = await fetchJson("/api/series");
    appState.seriesLibrary.list = payload.series ?? [];
    const targetId = selectId ?? appState.seriesLibrary.selected?.id ?? appState.seriesLibrary.list[0]?.id;
    if (targetId) {
      const detail = await fetchJson(`/api/series/${encodeURIComponent(targetId)}`);
      appState.seriesLibrary.selected = detail.series;
    } else {
      appState.seriesLibrary.selected = null;
    }
  } catch (error) {
    appState.seriesLibrary.list = [];
  }
  render();
}

async function saveSelectedSeries() {
  const s = appState.seriesLibrary;
  if (!s?.selected) return;
  s.loading = true; render();
  try {
    const payload = s.selected.id
      ? await fetchJson(`/api/series/${encodeURIComponent(s.selected.id)}`, { method: "PUT", body: JSON.stringify(s.selected) })
      : await fetchJson("/api/series", { method: "POST", body: JSON.stringify(s.selected) });
    s.selected = payload.series;
    const listPayload = await fetchJson("/api/series");
    s.list = listPayload.series ?? s.list;
    // 当前项目若挂载了这个系列，刷新只读视图
    if (appState.project?.project?.series_id === s.selected.id) {
      appState.project.series_bible = s.selected;
    }
  } catch (error) {
    alert(`保存失败：${error.message}`);
  } finally {
    s.loading = false; render();
  }
}

function handleSeriesAction(action, id, target) {
  const s = appState.seriesLibrary = appState.seriesLibrary ?? { list: [], selected: null, loading: false };
  const sel = s.selected;
  switch (action) {
    case "series-create":
      s.selected = { id: "", name: "新系列", description: "", world_rules: [], timeline_events: [], regulars: [] };
      render();
      return true;
    case "series-select":
      loadSeriesLibrary(id);
      return true;
    case "series-save":
      saveSelectedSeries();
      return true;
    case "series-delete":
      if (!sel) return true;
      if (!confirm(`删除系列「${sel.name}」？挂载它的项目会失去系列注入（项目自身数据不受影响）。`)) return true;
      fetchJson(`/api/series/${encodeURIComponent(sel.id)}`, { method: "DELETE" })
        .then(() => { s.selected = null; loadSeriesLibrary(); })
        .catch((e) => alert(e.message));
      return true;
    case "series-add-rule":
      if (sel) { sel.world_rules = list(sel.world_rules); sel.world_rules.push({ rule_statement: "", scope: "" }); render(); }
      return true;
    case "series-del-rule":
      if (sel) { sel.world_rules.splice(Number(id), 1); render(); }
      return true;
    case "series-add-event":
      if (sel) { sel.timeline_events = list(sel.timeline_events); sel.timeline_events.push({ story_day: sel.timeline_events.length + 1, summary: "" }); render(); }
      return true;
    case "series-del-event":
      if (sel) { sel.timeline_events.splice(Number(id), 1); render(); }
      return true;
    case "series-add-regular":
      if (sel) { sel.regulars = list(sel.regulars); sel.regulars.push({ name: "", role: "", bio: "", voice: "" }); render(); }
      return true;
    case "series-del-regular":
      if (sel) { sel.regulars.splice(Number(id), 1); render(); }
      return true;
    default:
      return false;
  }
}

// ── 全局查找替换：跨所有场次的剧本与字段（人名统一等批量修订）────────────────
const SCENE_TEXT_FIELDS = ["title", "purpose", "obstacle", "beat_summary", "entry_state", "exit_state", "notes", "script_full", "screenplay_notes", "location"];

function globalFindReplace() {
  const find = window.prompt("全局查找（将扫描所有场次的剧本正文与字段）：")?.trim();
  if (!find) return;
  const scenes = list(appState.project.scene_workbench?.scenes);
  let hits = 0;
  const hitScenes = [];
  for (const scene of scenes) {
    let sceneHits = 0;
    for (const field of SCENE_TEXT_FIELDS) {
      const value = scene[field];
      if (typeof value === "string" && value.includes(find)) {
        sceneHits += value.split(find).length - 1;
      }
    }
    if (sceneHits > 0) { hits += sceneHits; hitScenes.push(`第 ${scene.order_index} 场（${sceneHits} 处）`); }
  }
  if (hits === 0) {
    alert(`没有找到「${find}」。`);
    return;
  }
  const replace = window.prompt(`「${find}」共 ${hits} 处，分布：${hitScenes.slice(0, 8).join("、")}${hitScenes.length > 8 ? " …" : ""}\n\n替换为（留空=取消）：`)?.trim();
  if (!replace) return;
  if (!confirm(`确认把全部 ${hits} 处「${find}」替换为「${replace}」？此操作影响所有场次。`)) return;
  for (const scene of scenes) {
    for (const field of SCENE_TEXT_FIELDS) {
      if (typeof scene[field] === "string" && scene[field].includes(find)) {
        scene[field] = scene[field].split(find).join(replace);
      }
    }
  }
  markDirty();
  render();
  alert(`已替换 ${hits} 处。`);
}

// ── 人名巡检：全量回扫所有已写场次，列出名单外说话人 ─────────────────────────
function auditScriptSpeakers() {
  const scenes = list(appState.project.scene_workbench?.scenes)
    .filter((s) => (s.script_full || "").trim().length > 50)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const findings = [];
  for (const scene of scenes) {
    const unknown = findUnknownSpeakers(scene.script_full);
    if (unknown.length > 0) findings.push(`第 ${scene.order_index} 场《${scene.title}》：${unknown.join("、")}`);
  }
  if (findings.length === 0) {
    alert(`人名巡检通过：${scenes.length} 个已写场次的说话人全部在人物名单内。`);
    return;
  }
  alert(`人名巡检发现 ${findings.length} 个场次存在名单外说话人：\n\n${findings.join("\n")}\n\n可用「查找替换」统一改名，或重新生成这些场次。`);
}

// ── 连续性提炼：AI 通读剧情卡+场景表，回填伏笔追踪与时间线到资料库 ────────────
async function aiExtractContinuity() {
  const scenes = list(appState.project.scene_workbench?.scenes);
  if (scenes.length === 0) {
    alert("还没有场景。请先完成场景拆解，再提炼连续性资料。");
    return;
  }
  appState.continuityExtractLoading = true;
  render();
  try {
    const result = await callGenerateAPI("continuity_extraction", appState.project, {});
    if (result.error) throw new Error(result.error);
    const data = result.choices?.[0]?.data ?? {};
    const sceneByOrder = new Map(scenes.map((s) => [Number(s.order_index), s]));
    const charByName = new Map(list(appState.project.character_hub?.characters).map((c) => [c.name, c.id]));
    const proj = appState.project;
    proj.story_bible = proj.story_bible || {};

    // 伏笔：按 setup_summary 去重合并
    const existingSetups = new Set(list(proj.lock_layer?.projections?.setup_payoffs).map((s) => s.setup_summary));
    let addedSetups = 0;
    for (const item of list(data.setup_payoffs)) {
      if (!item.setup_summary || existingSetups.has(item.setup_summary)) continue;
      // 防假 resolved：AI 声称的回收必须在该场正文里有实际痕迹
      // （payoff_summary 的关键词片段能在 script_full 中找到），否则降级为 open
      const payoffScene = sceneByOrder.get(Number(item.payoff_scene_order));
      const payoffVerified = (() => {
        if (!payoffScene || !item.payoff_summary) return false;
        const script = payoffScene.script_full || "";
        if (script.trim().length < 50) return false;
        // 取 payoff 摘要里的 2-6 字中文词组做存在性抽查，命中任意一个即认可
        const tokens = String(item.payoff_summary).match(/[一-龥]{2,6}/g) ?? [];
        return tokens.some((t) => script.includes(t));
      })();
      const setup = {
        id: createId("setup"),
        setup_summary: item.setup_summary,
        setup_scene_id: sceneByOrder.get(Number(item.setup_scene_order))?.id ?? "",
        expected_payoff_window: item.expected_payoff_window ?? "",
        status: payoffVerified ? "closed" : "open",
        payoff_scene_id: payoffVerified ? payoffScene.id : "",
        payoff_summary: payoffVerified ? (item.payoff_summary ?? "") : ""
      };
      proj.lock_layer.projections.setup_payoffs.push(setup);
      proj.story_bible.setup_payoffs = list(proj.story_bible.setup_payoffs);
      proj.story_bible.setup_payoffs.push(setup);
      addedSetups++;
    }
    // 时间线：按 summary 去重合并
    const existingEvents = new Set(list(proj.lock_layer?.projections?.timeline_events).map((e) => e.summary));
    let addedEvents = 0;
    for (const item of list(data.timeline_events)) {
      if (!item.summary || existingEvents.has(item.summary)) continue;
      const event = {
        id: createId("event"),
        story_day: Number(item.story_day) || 1,
        sequence_index: 1,
        summary: item.summary,
        participants: list(item.participants_names).map((n) => charByName.get(String(n).trim())).filter(Boolean),
        location: item.location ?? "",
        trigger: "",
        consequence: ""
      };
      proj.lock_layer.projections.timeline_events.push(event);
      proj.story_bible.timeline_events = list(proj.story_bible.timeline_events);
      proj.story_bible.timeline_events.push(event);
      addedEvents++;
    }
    // 专名连戏表 → 硬性世界规则（scope=专名连戏）。
    // buildSceneScriptPrompt 注入「已锁定世界规则」，后续所有写本自动遵守，闭合编号漂移
    const existingRules = new Set(list(proj.lock_layer?.projections?.world_rules).map((r) => r.rule_statement));
    let addedNouns = 0;
    for (const item of list(data.proper_nouns)) {
      if (!item.term) continue;
      const statement = `专名一律写作「${item.term}」（${item.kind ?? "专名"}）${item.note ? `——${item.note}` : ""}`;
      if (existingRules.has(statement)) continue;
      const rule = {
        id: createId("rule"),
        rule_statement: statement,
        rule_level: "hard",
        scope: "专名连戏",
        exceptions: [],
        evidence: []
      };
      proj.lock_layer.projections.world_rules.push(rule);
      proj.story_bible.world_rules = list(proj.story_bible.world_rules);
      proj.story_bible.world_rules.push(rule);
      addedNouns++;
    }
    markDirty();
    alert(`提炼完成：新增 ${addedSetups} 组伏笔、${addedEvents} 条时间线事件、${addedNouns} 条专名连戏规则。`);
  } catch (error) {
    alert(`提炼失败：${error.message}`);
  } finally {
    appState.continuityExtractLoading = false;
    normalizeProject();
    render();
  }
}

// ── AI 全片场景表规划：剧情卡 1:N 拆场，凑齐作品形态的标准场数 ────────────────
const SCENE_TARGETS_BY_FORMAT = {
  feature: 32, feature_film: 32, feature_or_pilot: 28,
  tv_pilot: 26, pilot: 26, series: 26,
  short: 12, micro_drama: 60, microdrama: 60
};

function applySceneExpansion(planned) {
  const live = list(appState.project.scene_workbench?.scenes);
  const byId = new Map(live.map((s) => [s.id, s]));
  const charByName = new Map(list(appState.project.character_hub?.characters).map((c) => [c.name, c.id]));
  const cardById = new Map(getLivePlotCards().map((c) => [c.id, c]));
  const used = new Set();
  const nextScenes = [];
  for (const item of planned) {
    if (item.existing_scene_id && byId.has(item.existing_scene_id)) {
      if (used.has(item.existing_scene_id)) continue;
      used.add(item.existing_scene_id);
      nextScenes.push(byId.get(item.existing_scene_id));
      continue;
    }
    const card = cardById.get(item.card_id);
    if (!card) continue;
    nextScenes.push({
      id: createId("scene"),
      order_index: 0,
      title: item.title || card.title || "未命名场景",
      act_id: card.act_id,
      linked_plot_card_ids: [card.id],
      pov_character_id: charByName.get((item.pov_name || "").trim()) ?? "",
      location: item.location ?? "",
      time_of_day: item.time_of_day ?? "",
      purpose: item.purpose ?? "",
      obstacle: item.obstacle ?? "",
      beat_summary: item.beat_summary ?? "",
      entry_state: "",
      exit_state: "",
      status: "draft",
      script_excerpt: "",
      notes: ""
    });
  }
  // 安全网：规划漏掉的已有场景（尤其有成稿的）一律保留，追加到末尾，绝不丢场
  for (const scene of live) {
    if (!used.has(scene.id)) nextScenes.push(scene);
  }
  nextScenes.forEach((scene, index) => { scene.order_index = index + 1; });
  appState.project.scene_workbench.scenes = nextScenes;
}

async function aiExpandScenes() {
  const cards = getLivePlotCards();
  if (cards.length === 0) {
    alert("还没有剧情卡。请先在「剧情开发」生成剧情卡，再规划全片场景表。");
    return;
  }
  const format = appState.project.project.format ?? "feature";
  const target = SCENE_TARGETS_BY_FORMAT[format] ?? 28;
  const existing = list(appState.project.scene_workbench?.scenes);
  if (!confirm(`AI 将把 ${cards.length} 张剧情卡拆成约 ${target} 场的全片场景表（一个节拍通常需要 2-4 场戏）。\n已有 ${existing.length} 场全部保留（含成稿），新场景按放映顺序插入。继续？`)) return;
  appState.sceneExpandLoading = true;
  render();
  try {
    const result = await callGenerateAPI("scene_expansion", appState.project, { targetSceneCount: target });
    if (result.error) throw new Error(result.error);
    const planned = list(result.choices?.[0]?.data?.scenes);
    if (planned.length === 0) throw new Error("AI 未返回场景表");
    applySceneExpansion(planned);
    markDirty();
    const overlaps = list(result.choices?.[0]?.data?.overlap_warnings);
    if (overlaps.length > 0) {
      alert(`扩场完成，但 AI 提示以下已有场景与新规划撞车，建议重写或删除：\n\n${overlaps.join("\n")}`);
    }
  } catch (error) {
    alert(`扩场失败：${error.message}`);
  } finally {
    appState.sceneExpandLoading = false;
    normalizeProject();
    render();
  }
}

async function aiBreakdownScene(sceneId) {
  if (!appState.sceneBreakdownLoading) appState.sceneBreakdownLoading = {};
  if (appState.sceneBreakdownLoading[sceneId]) return;
  appState.sceneBreakdownLoading[sceneId] = true;
  render();
  try {
    const result = await callGenerateAPI("scene_breakdown", appState.project, { sceneId });
    if (result.error) throw new Error(result.error);
    const data = result.choices?.[0]?.data ?? {};
    const scene = list(appState.project.scene_workbench?.scenes).find((s) => s.id === sceneId);
    if (!scene) throw new Error("场景已被移除");
    if (data.entry_state) scene.entry_state = String(data.entry_state).trim();
    if (data.exit_state)  scene.exit_state  = String(data.exit_state).trim();
    if (data.obstacle)    scene.obstacle    = String(data.obstacle).trim();
    if (data.beat_summary) scene.beat_summary = String(data.beat_summary).trim();
    // 落地拍摄定位：无效占位（待定/未定/空）才用 AI 结果覆盖，避免抹掉用户已填的地点
    const badLoc = (v) => !v || /待定|未定/.test(v);
    if (data.location && badLoc(scene.location)) scene.location = String(data.location).trim();
    if (data.time_of_day && badLoc(scene.time_of_day)) scene.time_of_day = String(data.time_of_day).trim();
    markDirty();
  } catch (err) {
    alert("AI 拆这场失败：" + err.message);
  } finally {
    delete appState.sceneBreakdownLoading[sceneId];
    render();
  }
}

async function aiWriteSceneScript(sceneId, { silent = false } = {}) {
  // 先确认场景存在 + 取标题（不要持有引用 — render() 调用 normalizeProject 会替换 project 对象）
  const peekScene = list(appState.project.scene_workbench?.scenes).find((s) => s.id === sceneId);
  if (!peekScene) return { ok: false, reason: "scene not found" };
  const sceneTitle = peekScene.title;
  if (peekScene.script_full && peekScene.script_full.trim().length > 50 && !silent) {
    if (!confirm("本场已有剧本内容，AI 生成将覆盖。继续？")) return { ok: false, reason: "user cancel" };
  }
  appState.screenplayAi.busySceneIds = unique([...appState.screenplayAi.busySceneIds, sceneId]);
  appState.screenplayAi.lastError = "";
  render();
  try {
    const result = await callGenerateAPI("scene_script", appState.project, { sceneId });
    if (result.error) throw new Error(result.error);
    const data = result.choices?.[0]?.data ?? {};
    const script = (data.script ?? "").trim();
    if (!script) throw new Error("AI 返回了空剧本");
    // 关键：重新查找而非用 captured 引用，因为 render() 期间 normalizeProject 会替换 appState.project
    const liveScene = list(appState.project.scene_workbench?.scenes).find((s) => s.id === sceneId);
    if (!liveScene) throw new Error("场景在生成期间被移除");
    liveScene.script_full = script;
    // AI 成稿后回写场景工作流状态，避免场景页一直停留在手填「草稿」与剧本页口径打架
    liveScene.status = "scripted";
    // 人名白名单事后校验：抓对白说话人行，比对项目人物名单，发现名单外人名立即提示
    const unknownNames = findUnknownSpeakers(script);
    if (unknownNames.length > 0) {
      const warn = `⚠ 名单外人物名：${unknownNames.join("、")}（请检查是否应为已有角色，或在人物页补建）`;
      liveScene.screenplay_notes = [liveScene.screenplay_notes, warn].filter(Boolean).join("\n");
    }
    // 幕评师修稿指令是一次性的：本轮重写已消费，清空避免影响后续无关生成
    if (liveScene.rater_directives) liveScene.rater_directives = "";
    if (data.end_hook || data.emotion_arc) {
      const notesParts = [
        liveScene.screenplay_notes,
        data.emotion_arc ? `情感弧：${data.emotion_arc}` : "",
        data.end_hook ? `结尾钩子：${data.end_hook}` : "",
        data.reasoning ? `AI 思路：${data.reasoning}` : ""
      ].filter(Boolean);
      liveScene.screenplay_notes = notesParts.join("\n");
    }
    markDirty();
    return { ok: true };
  } catch (error) {
    appState.screenplayAi.lastError = `场景「${sceneTitle || sceneId}」生成失败：${error.message}`;
    return { ok: false, reason: error.message };
  } finally {
    appState.screenplayAi.busySceneIds = appState.screenplayAi.busySceneIds.filter((id) => id !== sceneId);
    render();
  }
}

async function aiWriteScreenplayBulk() {
  if (appState.screenplayAi.bulkRunning) return;
  const allScenes = () => list(appState.project.scene_workbench?.scenes)
    .slice()
    .sort((a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999));
  const pickUnwritten = () => allScenes().filter((s) => !s.script_full || s.script_full.trim().length < 50);

  const initialTargets = pickUnwritten();
  if (initialTargets.length === 0) {
    alert("所有场景都已有剧本内容。若需要重写，请逐场使用「AI 写本场」。");
    return;
  }
  if (!confirm(`将依次为 ${initialTargets.length} 个未撰写场景生成剧本，可能耗时较长。继续？`)) return;

  appState.screenplayAi.bulkRunning = true;
  appState.screenplayAi.bulkProgress = { done: 0, total: initialTargets.length };
  appState.screenplayAi.lastError = "";
  render();

  // 第一轮：顺序生成所有未撰写场景
  for (const scene of initialTargets) {
    await aiWriteSceneScript(scene.id, { silent: true });
    appState.screenplayAi.bulkProgress.done += 1;
    render();
  }

  // 第二轮：重试本轮仍为空的场景（瞬时 API 失败常在长队列尾端集中出现）
  const stillEmpty = pickUnwritten();
  if (stillEmpty.length > 0) {
    appState.screenplayAi.bulkProgress = { done: 0, total: stillEmpty.length };
    appState.screenplayAi.lastError = `第一轮 ${stillEmpty.length} 场失败，自动重试中...`;
    render();
    for (const scene of stillEmpty) {
      await aiWriteSceneScript(scene.id, { silent: true });
      appState.screenplayAi.bulkProgress.done += 1;
      render();
    }
  }

  appState.screenplayAi.bulkRunning = false;
  const finalEmpty = pickUnwritten();
  if (finalEmpty.length > 0) {
    appState.screenplayAi.lastError = `仍有 ${finalEmpty.length} 场生成失败：${finalEmpty.slice(0, 3).map((s) => s.title).join("、")}${finalEmpty.length > 3 ? "..." : ""}。可逐场点「AI 写本场」单独重试。`;
  } else {
    appState.screenplayAi.lastError = "";
  }
  render();
}

// ── Creation API call ─────────────────────────────────────────────────────────

async function callGenerateAPI(step, projectContext, options) {
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step, projectContext, options })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    return { choices: [], reasoning: "", warnings: [], error: error.message };
  }
}

// 流式调用：边生成边展示，onChunk(text) 实时回调，resolve 最终 result
let _cfAbortController = null;

async function callGenerateAPIStream(step, projectContext, options, onChunk) {
  _cfAbortController?.abort();
  const controller = new AbortController();
  _cfAbortController = controller;
  // 静默超时：区分「首字节」与「字节间」两段。重推理步骤（如 characters 的多字段心理档案）
  // 首 token 前模型会长时间思考，故首字节给更长宽限；流开始后用较短的 idle 超时兜底卡死。
  const FIRST_BYTE_TIMEOUT_MS = 120000;
  const IDLE_TIMEOUT_MS = 60000;
  let idleTimer = null;
  let timedOut = false;
  let started = false;
  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    const ms = started ? IDLE_TIMEOUT_MS : FIRST_BYTE_TIMEOUT_MS;
    idleTimer = setTimeout(() => { timedOut = true; controller.abort(); }, ms);
  };
  try {
    resetIdleTimer();
    const response = await fetch("/api/generate/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step, projectContext, options }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      started = true;
      resetIdleTimer();
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        let evt;
        try { evt = JSON.parse(line.slice(6)); } catch { continue; }
        if (evt.type === "chunk") onChunk?.(evt.text);
        if (evt.type === "done") { if (idleTimer) clearTimeout(idleTimer); return evt; }
        if (evt.type === "error") { if (idleTimer) clearTimeout(idleTimer); return { choices: [], reasoning: "", warnings: [], error: evt.message }; }
      }
    }
    return { choices: [], reasoning: "", warnings: [], error: "流式响应未正常结束（模型可能未返回有效内容，检查设置里的模型连接）" };
  } catch (error) {
    if (error.name === "AbortError") {
      if (timedOut) return { choices: [], reasoning: "", warnings: [], error: "AI 响应超时（长时间无数据）。请检查设置 → 模型连接，确认所选模型可用。" };
      return { choices: [], reasoning: "", warnings: [], cancelled: true };
    }
    return { choices: [], reasoning: "", warnings: [], error: error.message };
  } finally {
    if (idleTimer) clearTimeout(idleTimer);
  }
}

// 决议 3：直接创建空项目并跳到「结构骨架」（跳过 AI 入口）
async function handleCreateBlankProjectThenStructure() {
  const payload = {
    title: "未命名故事",
    format: "feature_or_pilot",
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
  if (action === "open-quick-creation") {
    appState.createModePickerOpen = false;
    appState.proCreation.active = false;
    appState.currentPage = "creation";
    appState.createDialogOpen = false;
    if (!appState.creation) {
      appState.creation = {
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

  if (action === "pulse-set-mode") {
    c.pulseMode = target.dataset.value ?? "经典";
    renderCreationPage();
    return true;
  }
  if (action === "pulse-set-genre") {
    c.pulseGenre = c.pulseGenre === (target.dataset.value ?? "") ? "" : (target.dataset.value ?? "");
    renderCreationPage();
    return true;
  }
  if (action === "select-pulse-seed") {
    const idx = Number(target.dataset.idx ?? -1);
    if (idx >= 0 && idx < (c.pulseSeeds ?? []).length) {
      c.selectedPulseSeedIdx = idx;
    }
    renderCreationPage();
    return true;
  }
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
    if (field === "format") {
      const recs = { feature: "three_act", pilot: "three_act", series: "three_act", short: "three_act", micro_drama: "three_act" };
      c.draft.structure_template = recs[value] ?? "feature_film";
      renderCreationPage();
      return true;
    }
    // logline：仅在「能否进入下一步」临界点切换时重渲，其他 keystroke 不重建 DOM（避免光标闪烁）
    if (field === "logline") {
      const wasValid = prev.trim().length >= 10;
      const nowValid = value.trim().length >= 10;
      if (wasValid !== nowValid) renderCreationPage();
    }
    return true;
  }

  if (action === "cf-step1-next") {
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
    if (d.title && !c.draft.title) c.draft.title = d.title;
    if (d.hook) c.draft.logline = d.hook;
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

  if (action === "use-concept-custom") {
    const text = (c.conceptCustom ?? "").trim();
    if (text) {
      c.selectedConcept = { title: "自定义点子", hook: text, core_conflict: "", unique_angle: "" };
      c.selectedConceptIdx = -1;
    }
    renderCreationPage();
    return true;
  }
  if (action === "select-synopsis") {
    const idx = Number(target.dataset.idx ?? -1);
    if (idx >= 0 && idx < (c.synopsisChoices ?? []).length) {
      c.selectedSynopsisIdx = idx;
      c.selectedSynopsis = c.synopsisChoices[idx];
    }
    renderCreationPage();
    return true;
  }
  if (action === "use-synopsis-custom") {
    const text = (c.synopsisCustom ?? "").trim();
    if (text) {
      c.selectedSynopsis = { version_label: "自定义梗概", summary: text, narrative_angle: "" };
      c.selectedSynopsisIdx = -1;
    }
    renderCreationPage();
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
  if (action === "toggle-scene") {
    const sid = target.dataset.sceneId ?? "";
    if (!sid) return true;
    const ids = c.selectedSceneIds ?? new Set();
    if (ids.has(sid)) { ids.delete(sid); } else { ids.add(sid); }
    c.selectedSceneIds = ids;
    renderCreationPage();
    return true;
  }
  if (action === "select-structure") {
    const zone = target.dataset.structZone ?? "primary";
    const id = target.dataset.structId ?? null;
    if (!id) return true;
    c.selectedStructure = c.selectedStructure ?? { primary: null, devices: [], lens: [] };
    const sel = c.selectedStructure;
    if (zone === "primary") {
      sel.primary = sel.primary === id ? null : id;
    } else if (zone === "device") {
      const idx = (sel.devices ?? []).indexOf(id);
      if (idx >= 0) { sel.devices = sel.devices.filter((d) => d !== id); }
      else if ((sel.devices ?? []).length < 2) { sel.devices = [...(sel.devices ?? []), id]; }
    } else if (zone === "lens") {
      const idx = (sel.lens ?? []).indexOf(id);
      if (idx >= 0) { sel.lens = sel.lens.filter((l) => l !== id); }
      else { sel.lens = [...(sel.lens ?? []), id]; }
    }
    saveLocalSnapshot();
    renderCreationPage();
    return true;
  }
  if (action === "confirm-act-structure") {
    c.actStructure = c.actStructureChoice;
    renderCreationPage();
    return true;
  }
  if (action === "finalize-creation") {
    callCreationFinalizeAPI();
    return true;
  }
  if (action === "ai-generate-characters-cf") {
    handleGenerateCharactersCF();
    return true;
  }
  if (action === "ai-generate-key-scenes") {
    handleGenerateKeyScenes();
    return true;
  }
  if (action === "ai-generate-act-structure") {
    handleGenerateActStructure();
    return true;
  }
  if (action === "cancel-cf-ai") {
    _cfAbortController?.abort();
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
  if (action === "one-click-generate") {
    handleOneClickGenerate();
    return true;
  }
  if (action === "cancel-auto-gen") {
    _autoGenCancelled = true;
    _cfAbortController?.abort();
    if (appState.creation) {
      appState.creation.autoGen = null;
      renderCreationPage();
    }
    return true;
  }
  if (action === "open-eval-rules") {
    appState.evalRulesModalOpen = true;
    renderCreationPage();
    return true;
  }
  if (action === "close-eval-rules") {
    appState.evalRulesModalOpen = false;
    renderCreationPage();
    return true;
  }
  return false;
}

// ── Async AI handlers ─────────────────────────────────────────────────────────

async function handleGenerateWorkbenchCharacters() {
  appState.characterGen = { loading: true, progress: "分析项目信息…", error: "" };
  renderCharactersPage(dom, appState, characterGetters);

  const existingChars = list(appState.project.character_hub?.characters);
  const mainRoles = ["protagonist", "antagonist", "ally"];
  const missingRoles = mainRoles.filter(
    (role) => !existingChars.some((c) => c.story_role === role)
  );
  const needsGeneration = missingRoles.length > 0 || existingChars.some((c) => !c.external_goal && !c.dramatic_need);

  if (!needsGeneration) {
    appState.characterGen = { loading: false, progress: "", error: "" };
    renderCharactersPage(dom, appState, characterGetters);
    return;
  }

  appState.characterGen.progress = "生成主要角色…";
  renderCharactersPage(dom, appState, characterGetters);

  const projectCtx = {
    project: appState.project.project,
    story_core: appState.project.story_core,
    intent_anchor: appState.project.intent_anchor,
    character_hub: appState.project.character_hub,
    story_bible: appState.project.story_bible
  };

  const count = Math.max(missingRoles.length, 1) + (existingChars.length === 0 ? 2 : 0);
  const result = await callGenerateAPI("characters", projectCtx, {
    count: Math.min(count + existingChars.filter((c) => !c.external_goal).length, 4),
    focusRole: missingRoles.length > 0 ? missingRoles.join("+") : "主角+对手"
  });

  if (result.error && !result.characters && !(result.choices?.[0]?.data?.characters)) {
    appState.characterGen = { loading: false, progress: "", error: result.error };
    renderCharactersPage(dom, appState, characterGetters);
    return;
  }

  const generated = result.characters ?? result.choices?.[0]?.data?.characters ?? [];
  const roleLabels = { protagonist: "主角", antagonist: "对手", ally: "盟友", opponent_ally: "复杂盟友", supporting: "配角" };

  for (const gen of generated) {
    const role = gen.story_role ?? "supporting";
    const existing = list(appState.project.character_hub?.characters).find((c) => c.story_role === role);

    if (existing) {
      // 只补空字段
      if (!existing.external_goal) existing.external_goal = gen.desire ?? "";
      if (!existing.dramatic_need) existing.dramatic_need = gen.need ?? "";
      if (!existing.contradiction) existing.contradiction = gen.wound ?? gen.belief ?? "";
      if (!existing.arc_start) existing.arc_start = gen.arc_start ?? "";
      if (!existing.arc_end) existing.arc_end = gen.arc_end ?? "";
      if (!existing.archetype && gen.archetype) existing.archetype = gen.archetype;
      if (!existing.name || existing.name === "主角" || existing.name === "未命名人物") {
        existing.name = gen.name || existing.name;
      }
    } else {
      // 新建角色
      const newChar = {
        id: createId("char"),
        name: gen.name || roleLabels[role] || "新人物",
        story_role: role,
        external_goal: gen.desire ?? "",
        dramatic_need: gen.need ?? "",
        contradiction: gen.wound ?? gen.belief ?? "",
        starting_mask: "",
        pressure_point: "",
        arc_start: gen.arc_start ?? "",
        arc_end: gen.arc_end ?? "",
        secret: "",
        notes: gen.relationship_hook ?? "",
        archetype: gen.archetype ?? "",
        traits: [],
        locked_fields: [],
        mbti: "",
        core_drive: "",
        linked_plot_ids: []
      };
      list(appState.project.character_hub?.characters).push(newChar);
    }
  }

  // 默认选中主角
  const protagonist = list(appState.project.character_hub?.characters).find((c) => c.story_role === "protagonist");
  if (protagonist) appState.selection.characterId = protagonist.id;

  appState.characterGen = { loading: false, progress: "", error: "" };
  markDirty();
  renderCharactersPage(dom, appState, characterGetters);
}

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
  renderCreationPage();
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
  const conceptTitle = (selectedConcept?.data?.title ?? selectedConcept?.title ?? "").trim();
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

  setCurrentPage("workflow");
  setCurrentStep("structure");
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

async function handleGenerateKeyScenes() {
  const c = appState.creation;
  c.loadingStep = 5;
  c.aiError = "";
  c.streamPreview = "";
  c.sceneProposals = [];
  c.selectedSceneIds = new Set();
  renderCreationPage();

  const confirmedChars = (c.characterProposals ?? []).filter((p) => p._status === "confirmed");
  const result = await callGenerateAPIStream("key_scenes", {
    genres: c.genres ?? [],
    concept: c.selectedConcept ?? {},
    synopsis: c.selectedSynopsis ?? {},
    characters: confirmedChars
  }, {}, (text) => streamingOnChunk(c, text));

  if (result.cancelled) { return; }
  c.loadingStep = -1;
  c.streamPreview = "";
  if (result.error) {
    c.aiError = result.error;
  } else {
    c.sceneProposals = (result.choices ?? []).map((ch) => ch.data ?? ch);
    c.lastReasoning = result.reasoning ?? "";
  }
  renderCreationPage();
}

async function handleGenerateActStructure() {
  const c = appState.creation;
  c.loadingStep = 6;
  c.aiError = "";
  c.streamPreview = "";
  c.actStructureChoice = null;
  c.actStructure = null;
  renderCreationPage();

  const confirmedChars = (c.characterProposals ?? []).filter((p) => p._status === "confirmed");
  const selectedScenes = (c.sceneProposals ?? []).filter((s) => {
    const sid = s.id ?? s.title ?? "";
    return (c.selectedSceneIds ?? new Set()).has(sid);
  });
  const result = await callGenerateAPIStream("act_structure", {
    genres: c.genres ?? [],
    concept: c.selectedConcept ?? {},
    synopsis: c.selectedSynopsis ?? {},
    characters: confirmedChars,
    scenes: selectedScenes
  }, {}, (text) => streamingOnChunk(c, text));

  if (result.cancelled) { return; }
  c.loadingStep = -1;
  c.streamPreview = "";
  if (result.error) {
    c.aiError = result.error;
  } else {
    const choice = result.choices?.[0];
    c.actStructureChoice = choice?.data ?? choice ?? null;
    c.lastReasoning = result.reasoning ?? "";
  }
  renderCreationPage();
}

async function callCreationFinalizeAPI() {
  const c = appState.creation;
  c.loadingStep = 99;
  c.aiError = "";
  renderCreationPage();

  const confirmedChars = (c.characterProposals ?? []).filter((p) => p._status === "confirmed");
  const selectedScenes = (c.sceneProposals ?? []).filter((s) => {
    const sid = s.id ?? s.title ?? "";
    return (c.selectedSceneIds ?? new Set()).has(sid);
  });

  try {
    const response = await fetch("/api/creation-flow/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        genres: c.genres ?? [],
        concept: c.selectedConcept ?? {},
        synopsis: c.selectedSynopsis ?? {},
        characters: confirmedChars,
        scenes: selectedScenes,
        structure: c.selectedStructure ?? { primary: null, devices: [], lens: [] }
      })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    c.loadingStep = -1;
    if (data.projectId) {
      await loadProjectFromServer(data.projectId);
      appState.creation = null;
      saveLocalSnapshot();
      setCurrentPage("workflow");
      setCurrentStep("structure");
      render();
    } else {
      c.aiError = data.error ?? "创建失败";
      renderCreationPage();
    }
  } catch (err) {
    c.loadingStep = -1;
    c.aiError = err.message;
    renderCreationPage();
  }
}

// ── 一键生成 ──────────────────────────────────────────────────────────────────

async function callEvaluateAPI(step, content, context) {
  try {
    const response = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step, content, context })
    });
    if (!response.ok) return { score: 0, error: `HTTP ${response.status}` };
    const data = await response.json();
    // 如果服务器返回 raw_output 说明 Claude 输出无法解析，在控制台记录
    if (data.raw_output) {
      console.warn(`[evaluate] ${step} Claude 输出解析失败，原始：`, data.raw_output.slice(0, 200));
    }
    return { score: 0, ...data };
  } catch (err) {
    return { score: 0, error: err.message };
  }
}

let _autoGenCancelled = false;

async function handleOneClickGenerate() {
  const c = appState.creation;
  _autoGenCancelled = false;

  c.autoGen = { active: true, phase: "generating", stepIdx: 0, stepName: "概念", retry: 0, log: [], score: null, preview: "", error: "" };
  c.loadingStep = -1;
  renderCreationPage();

  const check = () => !_autoGenCancelled && !!c.autoGen?.active;

  const setPhase = (phase, extra = {}) => {
    if (!c.autoGen) return;
    Object.assign(c.autoGen, { phase, ...extra });
    renderCreationPage();
  };

  const addLog = (msg) => {
    if (!c.autoGen) return;
    c.autoGen.log.push(msg);
    renderCreationPage();
  };

  async function runStep(stepIdx, stepName, generate, evaluate, select, passScore = 80, maxRetry = 2) {
    if (!check()) return false;
    Object.assign(c.autoGen, { stepIdx, stepName, retry: 0, score: null });

    let bestResult = null;
    let bestScore = -1;
    let bestEval = null;

    for (let attempt = 0; attempt <= maxRetry; attempt++) {
      if (!check()) return false;
      setPhase("generating", { retry: attempt, score: null, preview: "" });

      const genResult = await generate();
      if (!check()) return false;
      if (genResult.cancelled) return false;
      if (genResult.error) {
        if (attempt < maxRetry) { addLog(`${stepName}生成出错，重试…`); continue; }
        break;
      }

      setPhase("evaluating", { score: null });
      const evalResult = await evaluate(genResult);
      if (!check()) return false;

      const score = typeof evalResult.score === "number" ? evalResult.score : 0;
      const fb = evalResult.feedback ? `「${evalResult.feedback}」` : "";
      const evalFailed = evalResult.raw_output || (score === 0 && evalResult.error);
      setPhase("evaluating", { score: evalFailed ? "?" : score });

      if (score > bestScore) { bestScore = score; bestResult = genResult; bestEval = evalResult; }

      if (evalFailed) {
        addLog(`⚠ ${stepName}评分失败（${evalResult.error ?? "解析异常"}），跳过此次评估`);
        // 评估失败时跳过不计入重试，直接选用本次结果
        select(genResult, evalResult);
        addLog(`✓ ${stepName}完成（评估跳过）`);
        return true;
      }

      if (score >= passScore) {
        select(genResult, evalResult);
        addLog(`✓ ${stepName}完成（${score}分${fb}）${attempt > 0 ? `，第${attempt + 1}次` : ''}`);
        return true;
      }
      if (attempt < maxRetry) addLog(`${stepName}${score}分${fb}（需${passScore}+），重新生成…`);
    }

    if (bestResult) {
      select(bestResult, bestEval);
      addLog(`✓ ${stepName}完成（${bestScore}分，已取最佳）`);
      return true;
    }
    return false;
  }

  const chunkHandler = (text) => { if (c.autoGen) c.autoGen.preview = ((c.autoGen.preview ?? "").slice(-600)) + text; };

  const rules = appState.evalRules;

  // ── 概念 ──────────────────────────────────────────────────────────
  const ok0 = await runStep(0, "概念",
    () => callGenerateAPIStream("concept", {}, { genres: c.genres ?? [], conceptHint: c.conceptHint ?? "", era: c.era ?? "", count: 6 }, chunkHandler),
    (result) => callEvaluateAPI("concepts", (result.choices ?? []).map(ch => ch.data ?? ch), { genres: c.genres ?? [], conceptHint: c.conceptHint ?? "" }),
    (result, evalResult) => {
      const concepts = (result.choices ?? []).map(ch => ch.data ?? ch);
      const idx = Math.min(evalResult?.best_idx ?? 0, concepts.length - 1);
      c.conceptChoices = concepts;
      c.selectedConceptIdx = idx;
      c.selectedConcept = concepts[idx] ?? concepts[0];
    },
    rules.concept.passScore, rules.concept.maxRetry
  );
  if (!ok0) { setPhase("error", { error: "概念步骤失败" }); return; }

  // ── 梗概 ──────────────────────────────────────────────────────────
  const ok1 = await runStep(1, "梗概",
    () => callGenerateAPIStream("synopsis", { genres: c.genres ?? [], concept: c.selectedConcept ?? {} }, { count: 6 }, chunkHandler),
    (result) => callEvaluateAPI("synopsis", (result.choices ?? []).map(ch => ch.data ?? ch), { genres: c.genres ?? [], concept: c.selectedConcept ?? {} }),
    (result, evalResult) => {
      const synopses = (result.choices ?? []).map(ch => ch.data ?? ch);
      const idx = Math.min(evalResult?.best_idx ?? 0, synopses.length - 1);
      c.synopsisChoices = synopses;
      c.selectedSynopsisIdx = idx;
      c.selectedSynopsis = synopses[idx] ?? synopses[0];
    },
    rules.synopsis.passScore, rules.synopsis.maxRetry
  );
  if (!ok1) { setPhase("error", { error: "梗概步骤失败" }); return; }

  // ── 角色 ──────────────────────────────────────────────────────────
  const synopsis = c.selectedSynopsis ?? {};
  const charCtx = { project: { project: { genre: c.genres ?? [], logline: synopsis.summary ?? "" }, story_core: { premise: synopsis.summary ?? "" } } };
  const ok2 = await runStep(2, "角色",
    () => callGenerateAPIStream("characters", charCtx, { count: 4 }, chunkHandler),
    (result) => callEvaluateAPI("characters", result.choices?.[0]?.data?.characters ?? [], { genres: c.genres ?? [], synopsis }),
    (result) => { c.characterProposals = (result.choices?.[0]?.data?.characters ?? []).map(ch => ({ ...ch, _status: "confirmed" })); },
    rules.characters.passScore, rules.characters.maxRetry
  );
  if (!ok2) { setPhase("error", { error: "角色步骤失败" }); return; }

  // ── 剧情点 ────────────────────────────────────────────────────────
  const ok3 = await runStep(3, "剧情点",
    () => callGenerateAPIStream("key_scenes", { genres: c.genres ?? [], concept: c.selectedConcept ?? {}, synopsis: c.selectedSynopsis ?? {}, characters: c.characterProposals ?? [] }, {}, chunkHandler),
    (result) => callEvaluateAPI("key_scenes", (result.choices ?? []).map(ch => ch.data ?? ch), { synopsis: c.selectedSynopsis ?? {} }),
    (result) => {
      const scenes = (result.choices ?? []).map(ch => ch.data ?? ch);
      c.sceneProposals = scenes;
      c.selectedSceneIds = new Set(scenes.map((s, i) => s.id ?? s.title ?? String(i)));
    },
    rules.key_scenes.passScore, rules.key_scenes.maxRetry
  );
  if (!ok3) { setPhase("error", { error: "剧情点步骤失败" }); return; }

  // ── 幕结构 ────────────────────────────────────────────────────────
  const ok4 = await runStep(4, "幕结构",
    () => callGenerateAPIStream("act_structure", { genres: c.genres ?? [], concept: c.selectedConcept ?? {}, synopsis: c.selectedSynopsis ?? {}, characters: c.characterProposals ?? [], scenes: c.sceneProposals ?? [] }, {}, chunkHandler),
    (result) => callEvaluateAPI("act_structure", result.choices?.[0]?.data ?? result.choices?.[0] ?? {}, { concept: c.selectedConcept ?? {}, synopsis: c.selectedSynopsis ?? {} }),
    (result) => { c.actStructureChoice = result.choices?.[0]?.data ?? result.choices?.[0] ?? null; },
    rules.act_structure.passScore, rules.act_structure.maxRetry
  );
  if (!ok4) { setPhase("error", { error: "幕结构步骤失败" }); return; }

  // ── 创建项目 ──────────────────────────────────────────────────────
  if (!check()) return;
  setPhase("finalizing", { stepIdx: 5, stepName: "创建项目" });
  await callCreationFinalizeAPI();
  // Success navigates away; if still here, finalize failed
  if (c.autoGen) {
    setPhase("error", { error: c.aiError || "创建项目失败" });
  }
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
    if (field === "format") {
      const recs = { feature: "three_act", pilot: "three_act", series: "three_act", short: "three_act", micro_drama: "three_act" };
      c.draft.structure_template = recs[value] ?? "feature_film";
      renderCreationPage();
      return true;
    }
    // logline：仅在「能否进入下一步」临界点切换时重渲，避免每键重建 DOM 丢焦点/丢字符
    if (field === "logline") {
      const wasValid = prev.trim().length >= 10;
      const nowValid = value.trim().length >= 10;
      if (wasValid !== nowValid) renderCreationPage();
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
  if (action === "update-eval-rule") {
    const step = target.dataset.step;
    const field = target.dataset.field;
    const value = Number(target.value);
    if (step && field && appState.evalRules[step] && !isNaN(value)) {
      appState.evalRules[step][field] = value;
      saveLocalSnapshot();
    }
    return true;
  }
  return false;
}

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
const pageCreationButton = document.querySelector("#page-creation-button");
if (pageCreationButton) {
  pageCreationButton.addEventListener("click", () => {
    appState.currentPage = "creation";
    appState.createDialogOpen = false;
    render();
    renderCreationPage();
  });
}

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
