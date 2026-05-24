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
import { renderScreenplayPage, buildFountainText } from "./render/screenplay.js";
import { renderLocksPage } from "./render/locks.js";
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
  saveLocalSnapshot();
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
  // 暗色模式切换：创作流程页使用暗色背景
  document.body.dataset.mode = appState.currentPage === "creation" ? "creation" : "";

  dom.hero.hidden = false;
  if (appState.currentPage === "project") {
    dom.hero.classList.remove("is-compact", "is-topbar");
    dom.heroSide.hidden = false;
    dom.heroSide.querySelector(".hero__actions").hidden = true;
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
    dom.pageLibraryButton.classList.toggle("is-active", appState.currentPage === "library");
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
  if (action === "request-delete-project") {
    appState.projectDeleteConfirmId = id;
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
  if (action === "close-node-drawer") {
    appState.selection.nodeId = null;
    render();
    return;
  }
  if (action === "ai-gen-structure-notes") { return; }
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
      locked_fields: [],
      status: "active",
      linked_plot_ids: []
    };
    appState.project.character_hub.characters.push(character);
    appState.selection.characterId = character.id;
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
  if (action === "ai-write-scene-script" || action === "ai-write-screenplay-bulk") {
    alert("AI 生成功能将在下一阶段接入（Phase B-2）。当前可使用「插入剧本模板」手写。");
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
    const w = window.open("", "_blank", "width=900,height=900");
    if (!w) { alert("浏览器拦截了弹窗，请允许后重试。"); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>剧本预览</title>
      <style>body{font-family:Courier New,monospace;padding:48px 64px;line-height:1.6;white-space:pre-wrap;max-width:780px;margin:0 auto;color:#1f1d18;background:#fbf8f1}</style>
      </head><body>${text.replace(/[<>&]/g, (c) => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;" })[c])}</body></html>`);
    w.document.close();
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
    setCurrentPage("library");
  });
}
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
  try {
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
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        let evt;
        try { evt = JSON.parse(line.slice(6)); } catch { continue; }
        if (evt.type === "chunk") onChunk?.(evt.text);
        if (evt.type === "done") return evt;
        if (evt.type === "error") return { choices: [], reasoning: "", warnings: [], error: evt.message };
      }
    }
    return { choices: [], reasoning: "", warnings: [], error: "流式响应未正常结束" };
  } catch (error) {
    if (error.name === "AbortError") return { choices: [], reasoning: "", warnings: [], cancelled: true };
    return { choices: [], reasoning: "", warnings: [], error: error.message };
  }
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
      const recs = { feature: "feature_film", pilot: "pilot_episode", series: "series_season", short: "short_form", micro_drama: "micro_drama_serial" };
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
    const template = c.draft?.structure_template ?? "feature_film";
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
    character.traits = refined.traits.map((t) => String(t));
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
          project: { project: c.draft, logline: c.draft?.logline },
          story_core: { premise: c.draft?.logline, core_conflict: c.draft?.core_conflict },
          intent_anchor: { protagonist: c.draft?.protagonist }
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

async function handleFinalizeNewCreation() {
  const c = appState.creation;
  const draft = c.draft ?? {};
  const template = draft.structure_template ?? "feature_film";
  const preset = structurePresets[template] ?? buildCustomStructurePreset(2);

  const proj = createEmptyProject();
  proj.project.title = draft.title || "未命名项目";
  proj.project.format = draft.format ?? "feature";
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
      cards.push({ id: cardId, node_id: node.id, title: nodeData.story_title ?? nodeData.key_event ?? "", summary: nodeData.summary ?? "", value_shift: nodeData.value_shift ?? "", status: "draft" });
      node.card_ids = [cardId];
    }
  }
  proj.plot_board = { cards };

  const chars = (c.characterProposals ?? []).filter(p => p._status !== "skipped").map(ch => ({
    id: createId("char"), name: ch.name ?? "", story_role: ch.story_role ?? "supporting",
    desire: ch.desire ?? "", wound: ch.wound ?? "", arc_start: ch.arc_start ?? "", arc_end: ch.arc_end ?? ""
  }));
  proj.character_hub = { characters: chars };

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
    c.draft[field] = value;
    if (field === "format") {
      const recs = { feature: "feature_film", pilot: "pilot_episode", series: "series_season", short: "short_form", micro_drama: "micro_drama_serial" };
      c.draft.structure_template = recs[value] ?? "feature_film";
    }
    // Re-render only to update button state (canProceed changes with logline length)
    renderCreationPage();
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
