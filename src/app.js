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
import { renderScreenplayPage, buildFountainText } from "./render/screenplay.js";
import { openFountainPreview } from "./render/fountainViewer.js";
import { initContext } from "./handlers/context.js";
import { handleCharacterClick } from "./handlers/character.js";
import { handlePlotClick } from "./handlers/plot.js";
import { handleSceneClick } from "./handlers/scene.js";
import { handleStructureClick } from "./handlers/structure.js";
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

function updateProjectField(action, fieldName, value) {
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

// 把与入口纠缠的控制器核心注入晚绑定 ctx，供外提的 handler 模块在点击时调用
initContext({
  render, markDirty, normalizeProject, renderCreateForm: _renderProjectCreateForm,
  fetchJson, scheduleAutosave, saveProjectToServer, loadProjectFromServer,
  loadProjectsFromServer, setCurrentPage, setCurrentStep, renderRuntimeStatus,
  saveLocalSnapshot, loadLocalSnapshot,
  getNode, shiftPlotCardWithinLane, insertSceneFromPlotCard, openStructureLibrary,
  applyLibraryStructure, handleGenStructureNotes, handleGenNodeNote,
  updateDraftField, saveAiConfigDraftCurrentV2, requestCreateStepSuggestionCurrent,
  requestCreateFieldSuggestionCurrent, fetchAiModelOptionsCurrentV2,
  disconnectAiConfigDraftCurrentV2, defaultModelForProvider, applyConceptOptionCurrent,
  PROVIDER_LABELS,
  dom,
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
  if (action === "fetch-ai-models") { fetchAiModelOptionsCurrentV2(); return; }
  if (action === "save-ai-config") { saveAiConfigDraftCurrentV2(); return; }
  if (action === "disconnect-ai-config") { disconnectAiConfigDraftCurrentV2(); return; }
  if (action === "toggle-draft-tone") {
    const val = target.dataset.value ?? "";
    appState.projectDraft.tone = appState.projectDraft.tone === val ? "" : val;
    appState.createConceptOptions = [];
    appState.createAssistant.error = "";
    _renderProjectCreateForm();
    return;
  }
  if (handleCharacterClick(action, target, id, nodeId)) return;
  if (handlePlotClick(action, target, id, nodeId)) return;
  if (handleSceneClick(action, target, id, nodeId)) return;
  if (handleStructureClick(action, target, id, nodeId)) return;
  // ── 角色心理剖面事件处理 ──────────────────────────────────────
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
    patchCreationCardFields();
    return;
  }
  if (action === "audit-speakers") {
    auditScriptSpeakers();
    return;
  }
  if (action && action.startsWith("series-") && handleSeriesAction(action, id, target)) return;
  // ── 情节元件事件处理 ──────────────────────────────────────────
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
  if (action === "go-step") return setCurrentStep(id);
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

// 渲染创作流程页（快速版 or 精品版）
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
      setCurrentPage("workflow");
      setCurrentStep("structure");
      // 精品创作组装产出较薄（人物少/节点空/无关系/无场景表）——
      // 进工作台后后台续跑补全链
      autoEnrichNewProject({ withRelationships: true, withNodes: true }).catch(() => {});
    }
  } catch (err) {
    pc.step = "workbenches";
    pc.loading = false;
    pc.error = `组装失败：${err.message}`;
    renderCreationPage();
  }
}


// ── 系列库（跨项目世界观）数据流 ──────────────────────────────────────────────
const { loadSeriesLibrary, patchCreationCardFields, handleSeriesAction } =
  createSeriesLibrary({ fetchJson, render, saveLocalSnapshot, renderCreationPage });

// ── 剧本批量编辑工具：全局查找替换、人名巡检 ──────────────────────────────────
const { globalFindReplace, auditScriptSpeakers } = createScriptTools({ render, markDirty });


// ── AI 场景生成簇（扩场/拆解/写本/批量 + /api/generate 调用）外提至 ai/sceneGeneration.js ──
const {
  applySceneExpansion,
  aiExpandScenes,
  aiBreakdownScene,
  aiWriteSceneScript,
  aiWriteScreenplayBulk,
  callGenerateAPI,
  callGenerateAPIStream
} = createSceneGeneration({ render, markDirty, normalizeProject });

// ── 创作工作台 AI 簇（知识库/幕评师/契约审计修复/连续性提炼）外提至 ai/creationWorkbench.js ──
// 依赖 A 簇的 callGenerateAPI / aiWriteSceneScript，故须在其后创建
const {
  kbFetchSources, kbSearch, kbOpenEntry, kbSync, kbImport,
  aiRateScene, aiRateScreenplayFull, aiReviseFullScreenplayWithRater, aiReviseSceneWithRater,
  aiGenreAudit, aiCharacterAudit, aiGenreRemedy, aiExtractContinuity
} = createCreationWorkbench({ render, markDirty, normalizeProject, callGenerateAPI, aiWriteSceneScript });

// 第二段 ctx 注入：两个工厂簇的 AI 特性函数 + 异步处理器在此处才完成定义/解构，
// 须在其后注入，供外提的事件 handler 模块经 ctx 调用。
initContext({
  aiExpandScenes, aiBreakdownScene, aiWriteSceneScript, aiWriteScreenplayBulk,
  callGenerateAPI, callGenerateAPIStream,
  kbFetchSources, kbSearch, kbOpenEntry, kbSync, kbImport,
  aiRateScene, aiRateScreenplayFull, aiReviseFullScreenplayWithRater, aiReviseSceneWithRater,
  aiGenreAudit, aiCharacterAudit, aiGenreRemedy, aiExtractContinuity,
  handleRefineCharacter, globalFindReplace, auditScriptSpeakers, patchCreationCardFields
});

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
  return false;
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

  // 人物确认后自动生成关系网（≥2 人才有关系可言）；失败不阻塞创建
  if (chars.length >= 2) {
    c.loadingStep = 5;
    c.streamPreview = "";
    renderCreationPage();
    const relResult = await callGenerateAPIStream("relationships", {
      characters: chars,
      concept: { title: proj.project.title, hook: draft.logline ?? "" },
      synopsis: { summary: draft.logline ?? "" }
    }, {}, (text) => streamingOnChunk(c, text));
    c.loadingStep = -1;
    c.streamPreview = "";
    if (!relResult.cancelled && !relResult.error) {
      const nameToId = new Map(chars.map(ch => [ch.name, ch.id]));
      const rels = (relResult.choices?.[0]?.data?.relationships ?? [])
        .map(rel => ({
          id: createId("rel"),
          source_character_id: nameToId.get(rel.source_character_name) ?? "",
          target_character_id: nameToId.get(rel.target_character_name) ?? "",
          relationship_type: rel.relationship_type ?? "",
          tension: rel.tension ?? "",
          power_balance: rel.power_balance ?? "",
          shared_history: rel.shared_history ?? "",
          hidden_information: rel.hidden_information ?? ""
        }))
        .filter(rel => rel.source_character_id && rel.target_character_id);
      if (rels.length > 0) proj.story_bible.relationships = rels;
    }
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
  // 兑现 step1「一气呵成产出场景全套」的承诺：进入工作台后后台续跑
  // 故事核心反推 + 场景规划，每步完成即保存，失败不打扰
  autoEnrichNewProject().catch(() => {});
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
      const res = await callGenerateAPI("relationships", {
        characters: chars,
        concept: { title: appState.project.project.title, hook: appState.project.project.logline ?? "" },
        synopsis: { summary: appState.project.story_core?.premise ?? "" }
      }, {});
      const nameToId = new Map(chars.map((ch) => [ch.name, ch.id]));
      const rels = list(res.choices?.[0]?.data?.relationships).map((rel) => ({
        id: createId("rel"),
        source_character_id: nameToId.get(rel.source_character_name) ?? "",
        target_character_id: nameToId.get(rel.target_character_name) ?? "",
        relationship_type: rel.relationship_type ?? "",
        tension: rel.tension ?? "",
        power_balance: rel.power_balance ?? "",
        shared_history: rel.shared_history ?? "",
        hidden_information: rel.hidden_information ?? ""
      })).filter((rel) => rel.source_character_id && rel.target_character_id);
      if (!res.error && rels.length > 0 && stillSame()) {
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
