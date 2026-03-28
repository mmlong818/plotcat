import { cloneDefaultProject } from "./data/defaultProject.js";
import { createEmptyProject, createId } from "./shared/projectFactory.js";
import { ensurePlotDrivenProject } from "./shared/plotDrivenProject.js";

import {
  STORAGE_KEY, AUTOSAVE_DELAY, workflowSteps, projectCreateStepsCurrent,
  formatLabels, projectFormatChoices,
  structureTemplateLabels, formatStructureOptions, formatDefaultTemplates,
  structurePresets, buildCustomStructurePreset,
  appState, createDefaultProjectDraft
} from "./state.js";

import { escapeHtml, list, unique, splitTags, isBrokenPlaceholderText, formatTime } from "./utils.js";

import { renderStructurePage } from "./render/structure.js";
import { renderCharactersPage } from "./render/characters.js";
import { renderRelationshipsPage } from "./render/relationships.js";
import { renderScenesPage } from "./render/scenes.js";
import { renderLocksPage } from "./render/locks.js";
import { renderPlotsPage } from "./render/plots.js";
import { renderProjectList, renderProjectCreateForm, renderAiSettingsDialog } from "./render/project.js";
import { renderStructureLibraryDialog } from "./render/structureLibrary.js";
import { STORY_STRUCTURE_LIBRARY } from "./data/storyStructureLibrary.js";
import { renderCreationFlowPage } from "./render/creationFlow.js";

workflowSteps.splice(0, workflowSteps.length, ...[
  { id: "structure",     label: "结构骨架", description: "选定结构模板，划出各幕比例，标记必要的叙事节点。" },
  { id: "characters",    label: "人物核心", description: "建立主配角档案，确认各自的目标、缺口和弧光方向。" },
  { id: "relationships", label: "关系张力", description: "梳理人物之间的权力差、情感债和共同过去，找到冲突来源。" },
  { id: "plots",         label: "剧情开发", description: "把故事事件写成剧情卡，挂入对应的幕与节点，排出主次线。" },
  { id: "locks",         label: "沉淀锁定", description: "把确认的事实沉淀为时间线、世界规则、伏笔回收和类型约束。" },
  { id: "scenes",        label: "场景拆解", description: "把锁定后的剧情卡拆成逐场可写的场景序列。" }
]);

const dom = {
  hero: document.querySelector(".hero"),
  heroEyebrow: document.querySelector("#hero-eyebrow"),
  heroTitle: document.querySelector("#hero-title"),
  heroSide: document.querySelector(".hero__side"),
  saveButton: document.querySelector("#save-button"),
  resetButton: document.querySelector("#reset-button"),
  resetConfirmArea: document.querySelector("#reset-confirm-area"),
  pageProjectButton: document.querySelector("#page-project-button"),
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
  pagePanels: Array.from(document.querySelectorAll("main [data-page]")),
  stepPanels: Array.from(document.querySelectorAll("[data-step-group]")),
  structureLibraryDialog: document.querySelector("#structure-library-dialog"),
  structureLibraryContent: document.querySelector("#structure-library-content"),
  closeLibraryButton: document.querySelector("#close-library-button")
};

// ── Structure helpers ────────────────────────────────────────────────────────

function getStructureOptionsForFormat(format, currentTemplate = null) {
  const values = [...(formatStructureOptions[format] ?? ["feature_film", "pilot_episode", "three_act", "four_act", "custom"])];
  if (currentTemplate && !values.includes(currentTemplate)) {
    values.unshift(currentTemplate);
  }
  return values.map((value) => [value, structureTemplateLabels[value] ?? value]);
}

function getDefaultTemplateForFormat(format) {
  return formatDefaultTemplates[format] ?? "feature_film";
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

// ── Data getters ─────────────────────────────────────────────────────────────

function getPlotCard(cardId = appState.selection.plotCardId) {
  return list(appState.project.plot_board?.cards).find((card) => card.id === cardId) ?? null;
}

function getCharacter(characterId = appState.selection.characterId) {
  return list(appState.project.character_hub?.characters).find((item) => item.id === characterId) ?? null;
}

function getRelationship(relationshipId = appState.selection.relationshipId) {
  return list(appState.project.character_hub?.relationship_map).find((item) => item.id === relationshipId) ?? null;
}

function getScene(sceneId = appState.selection.sceneId) {
  return list(appState.project.scene_workbench?.scenes).find((item) => item.id === sceneId) ?? null;
}

function getTimelineEvent(eventId = appState.selection.timelineId) {
  return list(appState.project.lock_layer?.projections?.timeline_events).find((item) => item.id === eventId) ?? null;
}

function getWorldRule(ruleId = appState.selection.worldRuleId) {
  return list(appState.project.lock_layer?.projections?.world_rules).find((item) => item.id === ruleId) ?? null;
}

function getSetup(setupId = appState.selection.setupId) {
  return list(appState.project.lock_layer?.projections?.setup_payoffs).find((item) => item.id === setupId) ?? null;
}

function getCharacterNameById(characterId = "") {
  return list(appState.project.character_hub?.characters).find((item) => item.id === characterId)?.name ?? "未定人物";
}

function getCharacterLinkedPlotCards(characterId) {
  return list(appState.project.plot_board?.cards)
    .filter((card) => list(card.character_ids).includes(characterId))
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

function getCharacterRelationships(characterId) {
  return list(appState.project.character_hub?.relationship_map).filter(
    (relationship) =>
      relationship.source_character_id === characterId || relationship.target_character_id === characterId
  );
}

function getRelationshipLinkedPlotCards(relationship) {
  if (!relationship) return [];
  const pairIds = [relationship.source_character_id, relationship.target_character_id].filter(Boolean);
  return list(appState.project.plot_board?.cards)
    .filter((card) => pairIds.every((characterId) => list(card.character_ids).includes(characterId)))
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

function getSceneLinkedPlotCards(scene) {
  if (!scene) return [];
  const linkedIds = new Set(list(scene.linked_plot_card_ids));
  return list(appState.project.plot_board?.cards)
    .filter((card) => linkedIds.has(card.id))
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

function getSceneLinkedCharacterIds(scene) {
  if (!scene) return [];
  const ids = new Set();
  if (scene.pov_character_id) ids.add(scene.pov_character_id);
  getSceneLinkedPlotCards(scene).forEach((card) => {
    list(card.character_ids).forEach((characterId) => { if (characterId) ids.add(characterId); });
  });
  return Array.from(ids);
}

function getSceneLinkedCharacters(scene) {
  const ids = new Set(getSceneLinkedCharacterIds(scene));
  return list(appState.project.character_hub?.characters).filter((character) => ids.has(character.id));
}

function getSceneLinkedRelationships(scene) {
  const characterIds = new Set(getSceneLinkedCharacterIds(scene));
  if (characterIds.size < 2) return [];
  return list(appState.project.character_hub?.relationship_map).filter(
    (relationship) =>
      characterIds.has(relationship.source_character_id) &&
      characterIds.has(relationship.target_character_id)
  );
}

function getSceneLinkedTimelineEvents(scene) {
  const characterIds = new Set(getSceneLinkedCharacterIds(scene));
  if (characterIds.size === 0) return [];
  return list(appState.project.lock_layer?.projections?.timeline_events)
    .filter((event) => list(event.participants).some((characterId) => characterIds.has(characterId)))
    .sort((left, right) => {
      const leftDay = Number(left.story_day) || 9999;
      const rightDay = Number(right.story_day) || 9999;
      if (leftDay !== rightDay) return leftDay - rightDay;
      return (Number(left.sequence_index) || 9999) - (Number(right.sequence_index) || 9999);
    });
}

function getRelationshipLinkedScenes(relationship) {
  if (!relationship) return [];
  const pairIds = [relationship.source_character_id, relationship.target_character_id].filter(Boolean);
  if (pairIds.length < 2) return [];
  return list(appState.project.scene_workbench?.scenes)
    .filter((scene) => pairIds.every((characterId) => getSceneLinkedCharacterIds(scene).includes(characterId)))
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

function getRelationshipLinkedTimelineEvents(relationship) {
  if (!relationship) return [];
  const pairIds = [relationship.source_character_id, relationship.target_character_id].filter(Boolean);
  if (pairIds.length < 2) return [];
  return list(appState.project.lock_layer?.projections?.timeline_events)
    .filter((event) => pairIds.every((characterId) => list(event.participants).includes(characterId)))
    .sort((left, right) => {
      const leftDay = Number(left.story_day) || 9999;
      const rightDay = Number(right.story_day) || 9999;
      if (leftDay !== rightDay) return leftDay - rightDay;
      return (Number(left.sequence_index) || 9999) - (Number(right.sequence_index) || 9999);
    });
}

function getCharacterLinkedScenes(characterId) {
  if (!characterId) return [];
  const linkedCardIds = new Set(getCharacterLinkedPlotCards(characterId).map((card) => card.id));
  return list(appState.project.scene_workbench?.scenes)
    .filter(
      (scene) =>
        scene.pov_character_id === characterId ||
        list(scene.linked_plot_card_ids).some((plotCardId) => linkedCardIds.has(plotCardId))
    )
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

function getPlotLinkedRelationships(card) {
  if (!card) return [];
  const characterIds = list(card.character_ids);
  if (characterIds.length < 2) return [];
  return list(appState.project.character_hub?.relationship_map).filter(
    (relationship) =>
      characterIds.includes(relationship.source_character_id) &&
      characterIds.includes(relationship.target_character_id)
  );
}

function getPlotLinkedScenes(card) {
  if (!card) return [];
  return list(appState.project.scene_workbench?.scenes)
    .filter((scene) => list(scene.linked_plot_card_ids).includes(card.id))
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

function getPlotLinkedTimelineEvents(card) {
  if (!card) return [];
  const characterIds = new Set(list(card.character_ids));
  return list(appState.project.lock_layer?.projections?.timeline_events)
    .filter((event) => list(event.participants).some((characterId) => characterIds.has(characterId)))
    .sort((left, right) => {
      const leftDay = Number(left.story_day) || 9999;
      const rightDay = Number(right.story_day) || 9999;
      if (leftDay !== rightDay) return leftDay - rightDay;
      return (Number(left.sequence_index) || 9999) - (Number(right.sequence_index) || 9999);
    });
}

// ── Plot board model ─────────────────────────────────────────────────────────

appState.plotBoardView = appState.plotBoardView || "structure";
appState.activeScenarioGroupId = appState.activeScenarioGroupId || null;

const PLOT_BOARD_LANE_PRESETS = [
  { id: "lane_main", title: "正式主线", kind: "canonical_mainline", sort_order: 10, color_slot: "main", is_canonical: true, scenario_group_id: null, notes: "" },
  { id: "lane_subplot", title: "支线", kind: "subplot", sort_order: 20, color_slot: "subplot", is_canonical: true, scenario_group_id: null, notes: "" },
  { id: "lane_undefined", title: "未定义", kind: "undefined", sort_order: 90, color_slot: "undefined", is_canonical: false, scenario_group_id: null, notes: "" },
  { id: "lane_scenario_a", title: "方案轨 A", kind: "scenario", sort_order: 110, color_slot: "scenario-a", is_canonical: false, scenario_group_id: "scenario_core", notes: "" },
  { id: "lane_scenario_b", title: "方案轨 B", kind: "scenario", sort_order: 120, color_slot: "scenario-b", is_canonical: false, scenario_group_id: "scenario_core", notes: "" }
];

const PLOT_SCENARIO_GROUP_PRESETS = [
  { id: "scenario_core", title: "方案对照", question: "当前主问题有哪些不同解法", status: "exploring", promoted_lane_id: null, notes: "" }
];

function createPlotBoardLanes() {
  return PLOT_BOARD_LANE_PRESETS.map((lane) => ({ ...lane }));
}

function createPlotScenarioGroups() {
  return PLOT_SCENARIO_GROUP_PRESETS.map((group) => ({ ...group }));
}

function getDefaultLaneIdForType(type = "") {
  if (type === "mainline") return "lane_main";
  if (type === "enhancement") return "lane_subplot";
  return "lane_undefined";
}

function getDefaultLaneKindForType(type = "") {
  if (type === "mainline") return "canonical_mainline";
  if (type === "enhancement") return "subplot";
  return "undefined";
}

function getPlotLanes() {
  return list(appState.project.plot_board?.lanes).sort((left, right) => (left.sort_order ?? 999) - (right.sort_order ?? 999));
}

function getScenarioGroups() {
  return list(appState.project.plot_board?.scenario_groups);
}

function getPlotLane(laneId = "") {
  return getPlotLanes().find((lane) => lane.id === laneId) ?? null;
}

function getActiveScenarioGroup() {
  const groups = getScenarioGroups();
  if (groups.length === 0) return null;
  return groups.find((group) => group.id === appState.activeScenarioGroupId) ?? groups[0];
}

function getVisibleLanes() {
  const activeScenarioGroupId = getActiveScenarioGroup()?.id ?? null;
  return getPlotLanes().filter((lane) => lane.kind !== "scenario" || !activeScenarioGroupId || lane.scenario_group_id === activeScenarioGroupId);
}

function getDefaultNodeForAct(actId = "", preferredNodeId = "") {
  const nodes = list(appState.project.structure_profile?.nodes);
  const preferred = nodes.find((node) => node.id === preferredNodeId && node.act_id === actId);
  if (preferred) return preferred;
  return nodes.find((node) => node.act_id === actId) ?? nodes[0] ?? null;
}

function getCardsInLaneAct(laneId = "", actId = "") {
  return list(appState.project.plot_board?.cards)
    .filter((card) => card.lane_id === laneId && card.act_id === actId)
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

function nextLaneActOrder(laneId = "", actId = "") {
  const cards = getCardsInLaneAct(laneId, actId);
  return (cards[cards.length - 1]?.order_index ?? 0) + 10;
}

function ensurePlotBoardModel(project) {
  if (!project.plot_board) project.plot_board = { cards: [] };
  if (!Array.isArray(project.plot_board.lanes) || project.plot_board.lanes.length === 0) {
    project.plot_board.lanes = createPlotBoardLanes();
  }
  if (!Array.isArray(project.plot_board.scenario_groups) || project.plot_board.scenario_groups.length === 0) {
    project.plot_board.scenario_groups = createPlotScenarioGroups();
  }
  project.plot_board.view_mode = project.plot_board.view_mode === "rehearsal" ? "rehearsal" : "structure";
  const lanesById = new Map(list(project.plot_board.lanes).map((lane) => [lane.id, lane]));
  const counters = new Map();
  project.plot_board.cards = list(project.plot_board.cards).map((card) => {
    const laneId = lanesById.has(card.lane_id) ? card.lane_id : getDefaultLaneIdForType(card.type);
    const lane = lanesById.get(laneId);
    const key = `${laneId}:${card.act_id || ""}`;
    const nextOrder = (counters.get(key) ?? 0) + 10;
    const order = Number(card.order_index) || nextOrder;
    counters.set(key, Math.max(nextOrder, order));
    return {
      ...card,
      lane_id: laneId,
      lane_kind: lane?.kind ?? getDefaultLaneKindForType(card.type),
      order_index: order,
      scenario_group_id: lane?.kind === "scenario" ? card.scenario_group_id || lane.scenario_group_id || project.plot_board.scenario_groups[0]?.id || null : null,
      is_canonical: card.is_canonical != null ? card.is_canonical : lane?.kind === "canonical_mainline" || lane?.kind === "subplot"
    };
  });
  appState.plotBoardView = project.plot_board.view_mode;
  const groups = list(project.plot_board.scenario_groups);
  const activeScenarioGroup = groups.find((group) => group.id === appState.activeScenarioGroupId);
  if (!activeScenarioGroup) {
    appState.activeScenarioGroupId = groups[0]?.id ?? null;
  }
  return project;
}

function updatePlotCardLane(card, laneId) {
  const lane = getPlotLane(laneId);
  if (!card || !lane) return;
  card.lane_id = lane.id;
  card.lane_kind = lane.kind;
  card.is_canonical = lane.kind === "canonical_mainline" || lane.kind === "subplot";
  card.scenario_group_id = lane.kind === "scenario" ? lane.scenario_group_id || appState.activeScenarioGroupId || getScenarioGroups()[0]?.id || null : null;
}

function getAutoPlotStatusForPlacement(card) {
  if (!card) return "draft";
  if (card.lane_kind === "undefined") return "draft";
  if (card.lane_kind === "scenario") return "exploring";
  return "review";
}

function applyPlotCardPlacement(card, options = {}) {
  if (!card) return;
  appState.selection.plotCardId = card.id;
  const laneId = options.laneId || card.lane_id;
  const actId = options.actId || card.act_id;
  updatePlotCardLane(card, laneId);
  const targetNode = getDefaultNodeForAct(actId, options.nodeId || card.node_id);
  card.act_id = actId;
  card.node_id = targetNode?.id ?? card.node_id;
  card.order_index = options.keepOrder ? card.order_index : nextLaneActOrder(card.lane_id, card.act_id);
  card.status = getAutoPlotStatusForPlacement(card);
}

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
  appState.selection.plotCardId = plotCards.some((item) => item.id === appState.selection.plotCardId)
    ? appState.selection.plotCardId : plotCards[0]?.id ?? null;
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

function saveLocalSnapshot() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ project: appState.project, projectList: appState.projectList })
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
}

async function saveProjectToServer() {
  appState.runtime.saving = true;
  renderRuntimeStatus();
  const payload = await fetchJson(`/api/projects/${encodeURIComponent(appState.project.project.id)}`, {
    method: "PUT",
    body: JSON.stringify({ project: appState.project })
  });
  appState.project = ensurePlotDrivenProject(payload.project);
  appState.projectList = payload.projects ?? appState.projectList;
  appState.runtime.serverAvailable = true;
  appState.runtime.saving = false;
  appState.runtime.dirty = false;
  appState.runtime.lastSavedAt = new Date().toISOString();
  normalizeProject();
  saveLocalSnapshot();
  render();
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
  render();
}

function setCurrentStep(stepId) {
  const nextStepId = workflowSteps.some((item) => item.id === stepId) ? stepId : workflowSteps[0].id;
  const hasPanel = dom.stepPanels.some((panel) => panel.dataset.stepGroup === nextStepId);
  appState.currentStepId = hasPanel
    ? nextStepId
    : workflowSteps.find((item) => dom.stepPanels.some((panel) => panel.dataset.stepGroup === item.id))?.id ?? workflowSteps[0].id;
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
    title: `${card.title} 场景`,
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
    firstScene.act_id = list(project.plot_board?.cards)[0]?.act_id ?? firstScene.act_id;
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

function providerChoiceLabel(value) {
  return value === "gemini" ? "Gemini" : "OpenAI";
}

function defaultModelForProvider(value) {
  return value === "gemini" ? "gemini-2.0-flash" : "gpt-5";
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
  return value === "gemini" ? "Gemini" : value === "openai" ? "OpenAI" : "本地建议";
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
  const hasStoredConnection = appState.ai.configured && appState.ai.provider === provider;
  if (!apiKey && !hasStoredConnection) {
    appState.createAssistant.error = "先填入 API Key，或保留当前连接。";
    _renderProjectCreateForm();
    return;
  }
  if (!model) {
    appState.createAssistant.error = "先获取模型列表并选一个模型。";
    _renderProjectCreateForm();
    return;
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
      body: JSON.stringify(apiKey ? { provider, apiKey, model } : { provider, model })
    });
    appState.ai = payload.ai ?? appState.ai;
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
  if (action === "plot-field" && selectedPlot) selectedPlot[fieldName] = value;
  if (action === "character-field" && selectedCharacter) selectedCharacter[fieldName] = value;
  if (action === "relationship-field" && selectedRelationship) selectedRelationship[fieldName] = value;
  if (action === "genre-field") {
    if (fieldName === "secondary_genres_text") appState.project.genre_profile.secondary_genres = splitTags(value);
    else if (fieldName === "tone_words_text") appState.project.genre_profile.tone_words = splitTags(value);
    else appState.project.genre_profile[fieldName] = value;
  }
  if (action === "timeline-field" && selectedTimeline) {
    selectedTimeline[fieldName] = fieldName === "story_day" ? Number(value) || 1 : value;
  }
  if (action === "world-rule-field" && selectedRule) {
    if (fieldName === "exceptions_text") selectedRule.exceptions = splitTags(value);
    else selectedRule[fieldName] = value;
  }
  if (action === "setup-field" && selectedSetup) selectedSetup[fieldName] = value;
  if (action === "scene-field" && selectedScene) {
    selectedScene[fieldName] = fieldName === "order_index" ? Number(value) || 1 : value;
  }
  markDirty();
}

// ── Render ───────────────────────────────────────────────────────────────────

function renderRuntimeStatus() {
  if (!dom.runtimeStatus) return;
  const mode = appState.runtime.serverAvailable ? "本地服务" : "本地草稿";
  const saving = appState.runtime.saving ? "保存中" : appState.runtime.dirty ? "待保存" : "已同步";
  dom.runtimeStatus.innerHTML = `
    <span class="chip chip--soft">${escapeHtml(mode)}</span>
    <span class="chip chip--soft">${escapeHtml(saving)}</span>
  `;
}

function renderStepperNav() {
  const stepButtons = workflowSteps
    .map(
      (item, index) => `
        <button
          class="step-button step-button--${escapeHtml(item.id)} ${item.id === appState.currentStepId ? "is-active" : ""}"
          type="button"
          data-action="go-step"
          data-id="${escapeHtml(item.id)}"
          ${item.id === appState.currentStepId ? 'aria-current="step"' : ""}
        >
          <span class="step-button__count">${index + 1}</span>
          <span class="step-button__label">${escapeHtml(item.label)}</span>
          <span class="step-button__hint">${escapeHtml(item.description)}</span>
        </button>
      `
    )
    .join("");
  dom.stepperNav.innerHTML = stepButtons;
  dom.stepperNav.hidden = appState.currentPage !== "workflow";
}

function renderHero() {
  const step = getStep();
  dom.hero.hidden = false;
  if (appState.currentPage === "project") {
    dom.hero.classList.remove("is-compact", "is-topbar");
    dom.heroSide.hidden = true;
    dom.heroEyebrow.textContent = "原点编剧系统";
    dom.heroTitle.textContent = "项目中心";
    dom.saveButton.hidden = true;
    dom.resetButton.hidden = true;
    return;
  }
  dom.hero.classList.add("is-topbar", "is-compact");
  dom.heroSide.hidden = false;
  const projectTitle = appState.project.project.title || "未命名项目";
  dom.heroEyebrow.textContent = `《${projectTitle}》`;
  dom.heroEyebrow.title = projectTitle;
  dom.heroTitle.textContent = "";
  dom.saveButton.hidden = false;
  dom.resetButton.hidden = true;
}

function renderPageVisibility() {
  dom.pageProjectButton.classList.toggle("is-active", appState.currentPage === "project");
  dom.pagePanels.forEach((panel) => {
    panel.hidden = panel.dataset.page !== appState.currentPage;
  });
  dom.stepPanels.forEach((panel) => {
    panel.hidden = appState.currentPage !== "workflow" || panel.dataset.stepGroup !== appState.currentStepId;
  });
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
  renderScenesPage(dom, appState, sceneGetters);
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
  if (action === "ai-provider-choice") {
    const provider = target.dataset.value === "gemini" ? "gemini" : "openai";
    appState.aiConfigDraft.provider = provider;
    appState.aiConfigDraft.model = "";
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
  if (action === "select-character-archetype") {
    const char = getCharacter();
    if (char) { char.archetype = char.archetype === id ? "" : id; markDirty(); render(); }
    return;
  }
  if (action === "toggle-character-trait") {
    const char = getCharacter();
    if (char) {
      const traits = list(char.traits);
      char.traits = traits.includes(id) ? traits.filter((t) => t !== id) : [...traits, id];
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
  if (action === "select-char-enneagram") {
    const char = getCharacter();
    if (char) { char.enneagram = char.enneagram === id ? "" : id; markDirty(); render(); }
    return;
  }
  if (action === "select-char-alignment") {
    const char = getCharacter();
    if (char) { char.moral_alignment = char.moral_alignment === id ? "" : id; markDirty(); render(); }
    return;
  }
  if (action === "select-char-drive") {
    const char = getCharacter();
    if (char) { char.core_drive = char.core_drive === id ? "" : id; markDirty(); render(); }
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
    if (rel) { rel.relationship_type = rel.relationship_type === id ? "" : id; markDirty(); render(); }
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
  if (action === "open-structure-library") { openStructureLibrary(); return; }
  if (action === "close-library") { closeStructureLibrary(); return; }
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
    const targetNode = getNode(nodeId) ?? list(appState.project.structure_profile?.nodes)[0];
    const newCard = {
      id: createId("plot"),
      title: "新剧情卡",
      act_id: targetNode?.act_id ?? appState.project.structure_profile.acts[0]?.id ?? "",
      node_id: targetNode?.id ?? "",
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
  if (action === "toggle-plot-lock") {
    const card = getPlotCard(id);
    if (card) { card.status = card.status === "locked" ? "review" : "locked"; normalizeProject(); markDirty(); render(); }
    return;
  }
  if (action === "scene-from-plot") return insertSceneFromPlotCard(id);
  if (action === "delete-plot-card") {
    appState.project.plot_board.cards = list(appState.project.plot_board?.cards).filter((item) => item.id !== id);
    appState.plotEditorOpen = false;
    normalizeProject(); markDirty(); render();
    return;
  }
  if (action === "add-character") {
    const character = {
      id: createId("char"),
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
      status: "active",
      linked_plot_ids: []
    };
    appState.project.character_hub.characters.push(character);
    appState.selection.characterId = character.id;
    normalizeProject(); markDirty(); render();
    return;
  }
  if (action === "select-character") { appState.selection.characterId = id; render(); return; }
  if (action === "delete-character") {
    appState.project.character_hub.characters = list(appState.project.character_hub?.characters).filter((item) => item.id !== id);
    appState.project.character_hub.relationship_map = list(appState.project.character_hub?.relationship_map).filter((item) => item.source_character_id !== id && item.target_character_id !== id);
    list(appState.project.plot_board?.cards).forEach((card) => { card.character_ids = list(card.character_ids).filter((characterId) => characterId !== id); });
    list(appState.project.scene_workbench?.scenes).forEach((scene) => { if (scene.pov_character_id === id) scene.pov_character_id = ""; });
    normalizeProject(); markDirty(); render();
    return;
  }
  if (action === "add-relationship") {
    const characters = list(appState.project.character_hub?.characters);
    const relationship = {
      id: createId("rel"),
      source_character_id: characters[0]?.id ?? "",
      target_character_id: characters[1]?.id ?? characters[0]?.id ?? "",
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
    appState.project.character_hub.relationship_map = list(appState.project.character_hub?.relationship_map).filter((item) => item.id !== id);
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
  if (action === "delete-convention") {
    appState.project.genre_profile.conventions = list(appState.project.genre_profile?.conventions).filter((item) => item.id !== id);
    markDirty(); render();
    return;
  }
  if (action === "delete-taboo") {
    appState.project.genre_profile.taboos = list(appState.project.genre_profile?.taboos).filter((item) => item.id !== id);
    markDirty(); render();
    return;
  }
  if (action === "add-timeline") {
    const item = { id: createId("event"), story_day: list(appState.project.lock_layer?.projections?.timeline_events).length + 1, sequence_index: 1, summary: "", participants: [], location: "", trigger: "", consequence: "" };
    appState.project.lock_layer.projections.timeline_events.push(item);
    appState.selection.timelineId = item.id;
    markDirty(); render();
    return;
  }
  if (action === "locks-tab") { appState.locksActiveTab = id; render(); return; }
  if (action === "select-timeline") { appState.selection.timelineId = id; render(); return; }
  if (action === "add-world-rule") {
    const item = { id: createId("rule"), rule_statement: "", rule_level: "hard", scope: "", exceptions: [], evidence: [] };
    appState.project.lock_layer.projections.world_rules.push(item);
    appState.selection.worldRuleId = item.id;
    markDirty(); render();
    return;
  }
  if (action === "select-world-rule") { appState.selection.worldRuleId = id; render(); return; }
  if (action === "add-setup") {
    const item = { id: createId("setup"), setup_summary: "", setup_scene_id: "", expected_payoff_window: "", status: "open", payoff_scene_id: "", payoff_summary: "" };
    appState.project.lock_layer.projections.setup_payoffs.push(item);
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
    appState.project.scene_workbench.scenes = list(appState.project.scene_workbench?.scenes).filter((item) => item.id !== id);
    normalizeProject(); markDirty(); render();
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
    const item = list(appState.project.genre_profile?.conventions).find((entry) => entry.id === event.target.dataset.id);
    if (item) item[fieldName] = event.target.value;
    markDirty();
    return;
  }
  if (action === "taboo-field") {
    const item = list(appState.project.genre_profile?.taboos).find((entry) => entry.id === event.target.dataset.id);
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
  handleInput(event);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap() {
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
    const snapshot = loadLocalSnapshot();
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

// ── Event listener registration ───────────────────────────────────────────────

dom.pageProjectButton.addEventListener("click", () => setCurrentPage("project"));
dom.openSettingsButton.addEventListener("click", () => {
  appState.createAssistant.message = "";
  appState.createAssistant.warning = "";
  appState.createAssistant.error = "";
  appState.settingsDialogOpen = true;
  render();
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

// 初始化 appState.creation
if (!appState.creation) {
  appState.creation = {
    currentStep: 1,
    genre: "",
    styleKeywords: "",
    taboos: "",
    loglineChoices: [],
    selectedLoglineIdx: -1,
    selectedLogline: null,
    endingTone: "",
    moods: [],
    treatment: null,
    treatmentLocked: false,
    characterCount: 3,
    characterDrafts: [],
    characters: [],
    beatFramework: "save_the_cat",
    beatSheet: [],
    sceneCards: [],
    lastReasoning: "",
    reasoningPanelOpen: false,
    loadingStep: 0,
    loadingSceneIdx: null,
    aiError: ""
  };
}

// DOM ref for creation panel
dom.creationContent = document.querySelector("#creationContent");

// 渲染创作流程页
function renderCreationPage() {
  if (!dom.creationContent) return;
  renderCreationFlowPage(dom, appState);
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

function getMockLoglines() {
  return [
    {
      title: "无声的债",
      hook: "一名聋哑翻译意外发现委托人正在策划一场谋杀，而受害者是她的亲生父亲。",
      core_conflict: "揭露真相意味着亲情的终结，沉默则意味着道德的崩塌。"
    },
    {
      title: "最后一班地铁",
      hook: "深夜地铁司机发现每晚11:47上车的乘客其实在三十年前已经失踪。",
      core_conflict: "调查真相还是保住饭碗——两者都可能让他失去一切。"
    },
    {
      title: "替补人生",
      hook: "职业替身演员被雇主要求永久代替其活下去，而她开始爱上了这个不属于自己的人生。",
      core_conflict: "身份的错位与真实欲望之间的致命拉锯。"
    }
  ];
}

function getMockTreatment(creation) {
  return `基于「${creation.genre || "未知类型"}」方向，故事围绕${creation.selectedLogline?.hook ?? "核心钩子"}展开。

第一幕：建立世界与主角的日常状态，埋下触发事件的引线。主角处于一种表面稳定实则脆弱的平衡之中。

第二幕A：触发事件打破平衡，主角被迫做出选择并进入陌生领域。盟友与敌对力量开始浮现，核心冲突逐渐清晰。

第二幕B：中点反转后压力持续升级，主角的最大弱点暴露，最低谷出现。一切希望看似破灭。

第三幕：主角在内外压力的极限下完成蜕变，以全新的方式直面最终对抗，结局呼应开篇的核心问题。`;
}

function getMockCharacters(count) {
  const pool = [
    { name: "林木棠", role: "主角", desire: "找回失落的家庭记忆", fear: "成为父亲那样的人", wound: "幼年目睹家庭暴力后被迫噤声", arc: "从逃避到直面，学会区分爱与控制" },
    { name: "顾秋实", role: "对手/镜像", desire: "维持体面的社会秩序", fear: "秘密曝光后的身份崩塌", wound: "被视为「完美范本」而从未被真正看见", arc: "从操控者到被拆穿，被迫承认自身的脆弱" },
    { name: "莫云生", role: "导师/阻力", desire: "在余生弥补一个错误", fear: "救赎已无可能", wound: "关键时刻的沉默造成了无法挽回的后果", arc: "从旁观者到共谋者再到告解者" },
    { name: "江照", role: "盟友", desire: "帮助林木棠，同时寻找自我认同", fear: "忠诚迟早会被辜负", wound: "永远处于「备选」位置的友情创伤", arc: "学会为自己的需求发声" },
    { name: "陈念薇", role: "催化剂", desire: "让某件事的真相大白于天下", fear: "死后被遗忘", wound: "生前的证词无人相信", arc: "从缺席到在场（通过遗留线索）" }
  ];
  return pool.slice(0, count).map((c) => ({ ...c, _status: "pending" }));
}

function getMockBeatSheet(framework) {
  if (framework === "heros_journey") {
    return [
      { name: "平凡世界", description: "展示主角的日常与潜在缺陷" },
      { name: "冒险召唤", description: "触发事件打破平衡" },
      { name: "拒绝召唤", description: "主角犹豫，恐惧揭示" },
      { name: "遇见导师", description: "获得工具或方向" },
      { name: "跨越门槛", description: "进入陌生世界" },
      { name: "考验与盟友", description: "积累资源，暴露弱点" },
      { name: "深渊", description: "最大危机，旧我死亡" },
      { name: "磨难", description: "转变发生的核心时刻" },
      { name: "奖励", description: "获得关键信息或力量" },
      { name: "归途", description: "回到现实世界的代价" },
      { name: "复活", description: "终极考验，彻底蜕变" },
      { name: "携宝归还", description: "带着改变重回世界" }
    ];
  }
  if (framework === "cn_24_ep") {
    return [
      { name: "开篇钩子（1-2集）", description: "悬念先行，人物强势登场" },
      { name: "建立格局（3-6集）", description: "世界规则、关系阵营清晰化" },
      { name: "第一个大反转（7-8集）", description: "颠覆观众对某角色的预判" },
      { name: "情感升温（9-12集）", description: "核心关系进入危险区" },
      { name: "中点危机（12-13集）", description: "全局压力最高点，分水岭" },
      { name: "阵营重组（14-16集）", description: "盟友与对手角色互换" },
      { name: "连环暴雷（17-20集）", description: "秘密逐一揭开，加速崩局" },
      { name: "终极对决（21-23集）", description: "最终冲突爆发，情感总账" },
      { name: "结局与余韵（24集）", description: "呼应开篇，给出结局情绪" }
    ];
  }
  // save_the_cat default
  return [
    { name: "开场画面", description: "用一个画面定义故事的主题情绪" },
    { name: "主题陈述", description: "有人说出这个故事的核心问题" },
    { name: "铺垫", description: "展示主角的日常与缺陷" },
    { name: "催化剂", description: "触发事件出现" },
    { name: "挣扎", description: "主角权衡是否要改变" },
    { name: "第二幕转折点", description: "主角进入新世界，不可回头" },
    { name: "B故事", description: "爱情线或副线启动，携带主题" },
    { name: "游戏", description: "核心玩法展开，有趣但表面化" },
    { name: "中点", description: "一个假胜利或假失败，压力倍增" },
    { name: "坏人逼近", description: "各方压力聚焦，危机升级" },
    { name: "一切丧失", description: "主角最低谷，旧信念崩塌" },
    { name: "灵魂暗夜", description: "主角内心独处，真正的蜕变" },
    { name: "第三幕转折点", description: "主角找到新方法，决定反击" },
    { name: "结局", description: "用全新姿态赢得最终对抗" },
    { name: "终幕画面", description: "与开场画面对比，证明改变" }
  ];
}

// ── Creation action handlers ──────────────────────────────────────────────────

function handleCreationClick(action, target) {
  const c = appState.creation;

  if (action === "creation-set-genre") {
    c.genre = target.dataset.value ?? "";
    c.aiError = "";
    renderCreationPage();
    return true;
  }
  if (action === "creation-set-ending") {
    c.endingTone = target.dataset.value ?? "";
    renderCreationPage();
    return true;
  }
  if (action === "creation-toggle-mood") {
    const val = target.dataset.value ?? "";
    const moods = c.moods ?? [];
    c.moods = moods.includes(val) ? moods.filter((m) => m !== val) : [...moods, val];
    renderCreationPage();
    return true;
  }
  if (action === "creation-set-char-count") {
    c.characterCount = Number(target.dataset.value ?? 3);
    renderCreationPage();
    return true;
  }
  if (action === "creation-set-beat-framework") {
    c.beatFramework = target.dataset.value ?? "save_the_cat";
    renderCreationPage();
    return true;
  }
  if (action === "goto-creation-step") {
    const step = Number(target.dataset.step ?? 1);
    if (step < c.currentStep) { c.currentStep = step; renderCreationPage(); }
    return true;
  }
  if (action === "next-creation-step") {
    if (c.currentStep < 5) { c.currentStep += 1; c.aiError = ""; renderCreationPage(); }
    return true;
  }
  if (action === "select-ai-choice") {
    const idx = Number(target.dataset.idx ?? -1);
    if (idx >= 0 && idx < (c.loglineChoices ?? []).length) {
      c.selectedLoglineIdx = idx;
      c.selectedLogline = c.loglineChoices[idx];
    }
    renderCreationPage();
    return true;
  }
  if (action === "lock-treatment") {
    c.treatmentLocked = true;
    renderCreationPage();
    return true;
  }
  if (action === "unlock-treatment") {
    c.treatmentLocked = false;
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
  if (action === "accept-character") {
    const idx = Number(target.dataset.idx ?? -1);
    if (idx >= 0 && c.characterDrafts[idx]) c.characterDrafts[idx]._status = "accepted";
    renderCreationPage();
    return true;
  }
  if (action === "discard-character") {
    const idx = Number(target.dataset.idx ?? -1);
    if (idx >= 0 && c.characterDrafts[idx]) c.characterDrafts[idx]._status = "discarded";
    renderCreationPage();
    return true;
  }
  if (action === "modify-character") {
    // For now just show the character is editable (placeholder)
    renderCreationPage();
    return true;
  }
  if (action === "add-scene-card") {
    const act = Number(target.dataset.act ?? 0);
    const id = `scene_${Date.now()}`;
    c.sceneCards.push({ id, act, generated: false });
    renderCreationPage();
    return true;
  }
  if (action === "ai-generate-logline") {
    handleGenerateLogline();
    return true;
  }
  if (action === "ai-generate-treatment") {
    handleGenerateTreatment();
    return true;
  }
  if (action === "ai-generate-characters") {
    handleGenerateCharacters();
    return true;
  }
  if (action === "ai-generate-beat-sheet") {
    handleGenerateBeatSheet();
    return true;
  }
  if (action === "ai-generate-scene") {
    handleGenerateScene(target.dataset.sceneId ?? "");
    return true;
  }
  return false;
}

// ── Async AI handlers ─────────────────────────────────────────────────────────

async function handleGenerateLogline() {
  const c = appState.creation;
  c.loadingStep = 1;
  c.aiError = "";
  renderCreationPage();

  const ctx = { genre: c.genre, styleKeywords: c.styleKeywords, taboos: c.taboos };
  const result = await callGenerateAPI("logline", ctx, {});

  c.loadingStep = 0;
  if (result.error) {
    // Fall back to mock data so the UI is usable without a backend
    c.loglineChoices = getMockLoglines();
    c.lastReasoning = "（使用示例数据，请配置 AI 后端以获得真实生成结果）";
  } else {
    c.loglineChoices = result.choices ?? getMockLoglines();
    c.lastReasoning = result.reasoning ?? "";
  }
  c.selectedLoglineIdx = -1;
  c.selectedLogline = null;
  renderCreationPage();
}

async function handleGenerateTreatment() {
  const c = appState.creation;
  c.loadingStep = 2;
  c.aiError = "";
  renderCreationPage();

  const ctx = { selectedLogline: c.selectedLogline, endingTone: c.endingTone, moods: c.moods };
  const result = await callGenerateAPI("treatment", ctx, {});

  c.loadingStep = 0;
  if (result.error) {
    c.treatment = getMockTreatment(c);
    c.lastReasoning = "（使用示例数据，请配置 AI 后端以获得真实生成结果）";
  } else {
    c.treatment = result.choices?.[0]?.text ?? getMockTreatment(c);
    c.lastReasoning = result.reasoning ?? "";
  }
  c.treatmentLocked = false;
  renderCreationPage();
}

async function handleGenerateCharacters() {
  const c = appState.creation;
  c.loadingStep = 3;
  c.aiError = "";
  renderCreationPage();

  const ctx = { treatment: c.treatment, characterCount: c.characterCount };
  const result = await callGenerateAPI("characters", ctx, {});

  c.loadingStep = 0;
  if (result.error) {
    c.characterDrafts = getMockCharacters(c.characterCount ?? 3);
    c.lastReasoning = "（使用示例数据，请配置 AI 后端以获得真实生成结果）";
  } else {
    c.characterDrafts = (result.choices ?? getMockCharacters(c.characterCount ?? 3)).map((ch) => ({ ...ch, _status: "pending" }));
    c.lastReasoning = result.reasoning ?? "";
  }
  renderCreationPage();
}

async function handleGenerateBeatSheet() {
  const c = appState.creation;
  c.loadingStep = 4;
  c.aiError = "";
  renderCreationPage();

  const ctx = { treatment: c.treatment, characters: c.characters, beatFramework: c.beatFramework };
  const result = await callGenerateAPI("beat_sheet", ctx, {});

  c.loadingStep = 0;
  if (result.error) {
    c.beatSheet = getMockBeatSheet(c.beatFramework);
    c.lastReasoning = "（使用示例数据，请配置 AI 后端以获得真实生成结果）";
  } else {
    c.beatSheet = result.choices ?? getMockBeatSheet(c.beatFramework);
    c.lastReasoning = result.reasoning ?? "";
  }
  renderCreationPage();
}

async function handleGenerateScene(sceneId) {
  const c = appState.creation;
  c.loadingSceneIdx = sceneId;
  c.aiError = "";
  renderCreationPage();

  const ctx = { treatment: c.treatment, beatSheet: c.beatSheet, sceneId };
  const result = await callGenerateAPI("scene", ctx, {});

  c.loadingSceneIdx = null;
  const card = c.sceneCards.find((s) => s.id === sceneId);
  if (card) {
    const generated = result.error ? {
      location: "未知地点",
      goal: "主角需要做出关键决定",
      conflict: "内外压力同时爆发",
      twist: "意外出现打破预期",
      info_delta: "观众获得重要信息"
    } : (result.choices?.[0] ?? {});
    Object.assign(card, generated, { generated: true });
    if (!result.error) c.lastReasoning = result.reasoning ?? "";
  }
  renderCreationPage();
}

// ── Creation input handler ────────────────────────────────────────────────────

function handleCreationInput(action, target) {
  const c = appState.creation;
  if (action === "creation-set-style-keywords") {
    c.styleKeywords = target.value;
    return true;
  }
  if (action === "creation-set-taboos") {
    c.taboos = target.value;
    return true;
  }
  if (action === "creation-set-treatment") {
    c.treatment = target.value;
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
