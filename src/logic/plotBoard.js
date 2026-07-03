// 剧情板模型层：泳道/方案组预设、卡片归位与自愈逻辑（从 app.js 提取）。
// 这里只做数据计算与就地修改，不触发 render —— 渲染时机由 app.js 的 action 层控制。
import { appState } from "../state.js";
import { list } from "../utils.js";

appState.plotBoardView = appState.plotBoardView || "structure";
appState.activeScenarioGroupId = appState.activeScenarioGroupId || null;

const PLOT_BOARD_LANE_PRESETS = [
  { id: "lane_main", title: "正式主线", kind: "canonical_mainline", sort_order: 10, color_slot: "orange", is_canonical: true, scenario_group_id: null, notes: "" },
  { id: "lane_subplot", title: "支线", kind: "subplot", sort_order: 20, color_slot: "blue", is_canonical: true, scenario_group_id: null, notes: "" },
  { id: "lane_undefined", title: "未定义", kind: "undefined", sort_order: 90, color_slot: "gray", is_canonical: false, scenario_group_id: null, notes: "" },
  { id: "lane_scenario_a", title: "方案轨", kind: "scenario", sort_order: 110, color_slot: "purple", is_canonical: false, scenario_group_id: "scenario_core", notes: "" }
];

const PLOT_SCENARIO_GROUP_PRESETS = [
  { id: "scenario_core", title: "方案对照", question: "当前主问题有哪些不同解法", status: "exploring", promoted_lane_id: null, notes: "" }
];

export function createPlotBoardLanes() {
  return PLOT_BOARD_LANE_PRESETS.map((lane) => ({ ...lane }));
}

export function createPlotScenarioGroups() {
  return PLOT_SCENARIO_GROUP_PRESETS.map((group) => ({ ...group }));
}

export function getDefaultLaneIdForType(type = "") {
  if (type === "mainline") return "lane_main";
  if (type === "enhancement") return "lane_subplot";
  return "lane_undefined";
}

export function getDefaultLaneKindForType(type = "") {
  if (type === "mainline") return "canonical_mainline";
  if (type === "enhancement") return "subplot";
  return "undefined";
}

export function getPlotLanes() {
  return list(appState.project.plot_board?.lanes).sort((left, right) => (left.sort_order ?? 999) - (right.sort_order ?? 999));
}

export function getScenarioGroups() {
  return list(appState.project.plot_board?.scenario_groups);
}

export function getPlotLane(laneId = "") {
  return getPlotLanes().find((lane) => lane.id === laneId) ?? null;
}

export function getActiveScenarioGroup() {
  const groups = getScenarioGroups();
  if (groups.length === 0) return null;
  return groups.find((group) => group.id === appState.activeScenarioGroupId) ?? groups[0];
}

export function getVisibleLanes() {
  const activeScenarioGroupId = getActiveScenarioGroup()?.id ?? null;
  return getPlotLanes()
    .filter((lane) => lane.kind !== "scenario" || !activeScenarioGroupId || lane.scenario_group_id === activeScenarioGroupId)
    // "未定义"和"方案轨 B"轨道始终不显示在主网格；落在其中的卡片仍可通过底部卡片库访问
    .filter((lane) => lane.kind !== "undefined")
    .filter((lane) => lane.id !== "lane_scenario_b");
}

export function getDefaultNodeForAct(actId = "", preferredNodeId = "") {
  const nodes = list(appState.project.structure_profile?.nodes);
  const preferred = nodes.find((node) => node.id === preferredNodeId && node.act_id === actId);
  if (preferred) return preferred;
  return nodes.find((node) => node.act_id === actId) ?? nodes[0] ?? null;
}

export function getCardsInLaneAct(laneId = "", actId = "") {
  return list(appState.project.plot_board?.cards)
    .filter((card) => card.lane_id === laneId && card.act_id === actId)
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

export function nextLaneActOrder(laneId = "", actId = "") {
  const cards = getCardsInLaneAct(laneId, actId);
  return (cards[cards.length - 1]?.order_index ?? 0) + 10;
}

export function ensurePlotBoardModel(project) {
  if (!project.plot_board) project.plot_board = { cards: [] };
  if (!Array.isArray(project.plot_board.lanes) || project.plot_board.lanes.length === 0) {
    project.plot_board.lanes = createPlotBoardLanes();
  }
  // 迁移旧版语义色名 → 颜色名（CSS 只保留颜色名一套选择器）
  const LEGACY_COLOR_SLOTS = { main: "orange", subplot: "blue", "scenario-a": "purple", "scenario-b": "purple", undefined: "gray" };
  project.plot_board.lanes = project.plot_board.lanes.map((lane) =>
    LEGACY_COLOR_SLOTS[lane.color_slot] ? { ...lane, color_slot: LEGACY_COLOR_SLOTS[lane.color_slot] } : lane
  );
  if (!Array.isArray(project.plot_board.scenario_groups) || project.plot_board.scenario_groups.length === 0) {
    project.plot_board.scenario_groups = createPlotScenarioGroups();
  }
  project.plot_board.view_mode = project.plot_board.view_mode === "rehearsal" ? "rehearsal" : "structure";
  const lanesById = new Map(list(project.plot_board.lanes).map((lane) => [lane.id, lane]));
  const nodesById = new Map(list(project.structure_profile?.nodes).map((node) => [node.id, node]));
  const counters = new Map();
  project.plot_board.cards = list(project.plot_board.cards).map((card) => {
    const node = nodesById.get(card.node_id);
    // 结构节点是幕归属的真源：卡片挂在节点上，act_id 一律从节点派生，
    // 修复结构重建后 act_id 变成孤儿 ID / 空值的历史数据
    if (node?.act_id) card = { ...card, act_id: node.act_id };
    // 旧版创作流程生成的卡片缺 type/lane_id，被兜底进「未定义」轨导致空板：
    // 凡是挂在有效结构节点上、又从未被指定类型的卡片，自愈归位到正式主线
    if (card.lane_id === "lane_undefined" && !card.type && node) {
      card = { ...card, type: "mainline", lane_id: "lane_main" };
    }
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

export function updatePlotCardLane(card, laneId) {
  const lane = getPlotLane(laneId);
  if (!card || !lane) return;
  card.lane_id = lane.id;
  card.lane_kind = lane.kind;
  card.is_canonical = lane.kind === "canonical_mainline" || lane.kind === "subplot";
  card.scenario_group_id = lane.kind === "scenario" ? lane.scenario_group_id || appState.activeScenarioGroupId || getScenarioGroups()[0]?.id || null : null;
}

export function getAutoPlotStatusForPlacement(card) {
  if (!card) return "draft";
  if (card.lane_kind === "undefined") return "draft";
  if (card.lane_kind === "scenario") return "exploring";
  return "review";
}

export function applyPlotCardPlacement(card, options = {}) {
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
