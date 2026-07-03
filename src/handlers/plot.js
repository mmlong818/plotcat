import { ctx } from "./context.js";
import { appState } from "../state.js";
import { getPlotCard } from "../logic/getters.js";
import { getVisibleLanes } from "../logic/plotBoard.js";
import { list } from "../utils.js";
import { createId } from "../shared/projectFactory.js";

export function handlePlotClick(action, target, id, nodeId) {
  if (action === "toggle-plot-trope") {
    const card = getPlotCard();
    if (card) {
      const tags = list(card.trope_tags);
      card.trope_tags = tags.includes(id) ? tags.filter((t) => t !== id) : [...tags, id];
      ctx.markDirty(); ctx.render();
    }
    return true;
  }
  if (action === "select-plot-macguffin") {
    const card = getPlotCard();
    if (card) { card.macguffin = card.macguffin === id ? "" : id; ctx.markDirty(); ctx.render(); }
    return true;
  }
  if (action === "select-plot-catalyst") {
    const card = getPlotCard();
    if (card) { card.catalyst_type = card.catalyst_type === id ? "" : id; ctx.markDirty(); ctx.render(); }
    return true;
  }
  if (action === "toggle-plot-conflict") {
    const card = getPlotCard();
    if (card) {
      const types = list(card.conflict_types);
      card.conflict_types = types.includes(id) ? types.filter((t) => t !== id) : [...types, id];
      ctx.markDirty(); ctx.render();
    }
    return true;
  }
  if (action === "toggle-plot-twist") {
    const card = getPlotCard();
    if (card) {
      const types = list(card.twist_types);
      card.twist_types = types.includes(id) ? types.filter((t) => t !== id) : [...types, id];
      ctx.markDirty(); ctx.render();
    }
    return true;
  }
  if (action === "jump-to-plot-card") { appState.selection.plotCardId = id; appState.plotFilter = "all"; ctx.setCurrentStep("plots"); return true; }
  if (action === "select-plot-card") { appState.selection.plotCardId = id; ctx.render(); return true; }
  if (action === "open-plot-editor") { appState.plotEditorOpen = true; ctx.render(); return true; }
  if (action === "close-plot-editor") { appState.plotEditorOpen = false; ctx.render(); return true; }
  if (action === "add-plot-card") {
    const laneId = target.dataset.laneId ?? "";
    const actId = target.dataset.actId ?? "";
    // 连续剧支线板：格子按集定位（episode_id），不挂结构节点
    const episodeId = target.dataset.episodeId ?? "";
    const targetNode = episodeId ? null : (ctx.getNode(nodeId) ?? list(appState.project.structure_profile?.nodes)[0]);
    const defaultLane = getVisibleLanes()[0];
    const newCard = {
      id: createId("plot"),
      title: "新剧情卡",
      episode_id: episodeId,
      act_id: episodeId ? "" : ((actId || targetNode?.act_id) ?? list(appState.project.structure_profile?.acts)[0]?.id ?? ""),
      node_id: episodeId ? "" : ((nodeId || targetNode?.id) ?? ""),
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
    ctx.normalizeProject();
    ctx.markDirty();
    ctx.render();
    return true;
  }
  if (action === "toggle-plot-lock") {
    const card = getPlotCard(id);
    if (card) { card.status = card.status === "locked" ? "review" : "locked"; ctx.normalizeProject(); ctx.markDirty(); ctx.render(); }
    return true;
  }
  if (action === "delete-plot-card") {
    // 软删除：移到废纸篓
    appState.project.plot_board.cards = list(appState.project.plot_board?.cards).map((item) =>
      item.id === id ? { ...item, deleted_at: new Date().toISOString() } : item
    );
    appState.plotEditorOpen = false;
    ctx.normalizeProject(); ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "restore-plot-card") {
    appState.project.plot_board.cards = list(appState.project.plot_board?.cards).map((item) =>
      item.id === id ? { ...item, deleted_at: null } : item
    );
    ctx.normalizeProject(); ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "purge-plot-card") {
    appState.project.plot_board.cards = list(appState.project.plot_board?.cards).filter((item) => item.id !== id);
    ctx.normalizeProject(); ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "toggle-plot-trash-view") {
    appState.plotTrashOpen = !appState.plotTrashOpen;
    ctx.render();
    return true;
  }
  if (action === "move-plot-card-position") { ctx.shiftPlotCardWithinLane(target.dataset.id ?? "", Number(target.dataset.direction) || 0); return true; }
  return false;
}
