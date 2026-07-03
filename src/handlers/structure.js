import { ctx } from "./context.js";
import { appState } from "../state.js";
import { list } from "../utils.js";
import { createId } from "../shared/projectFactory.js";
import { renderStructureLibraryDialog } from "../render/structureLibrary.js";

export function handleStructureClick(action, target, id, nodeId) {
  if (action === "open-structure-library") { ctx.openStructureLibrary(); return true; }
  if (action === "open-structure-config") { ctx.openStructureLibrary(); return true; }
  if (action === "select-node") {
    const nid = target.dataset.nodeId ?? "";
    appState.selection.nodeId = appState.selection.nodeId === nid ? null : nid;
    ctx.render();
    return true;
  }
  // 点击节点 card 内的 title input 时也展开 drawer（之前点击只让 input 聚焦，看起来「无反应」）
  if (action === "node-field" && target.dataset.field === "title") {
    const nodeCard = target.closest("[data-action='select-node']");
    if (nodeCard && appState.selection.nodeId !== nodeCard.dataset.nodeId) {
      appState.selection.nodeId = nodeCard.dataset.nodeId;
      ctx.render();
    }
    return true;
  }
  if (action === "close-node-drawer") {
    appState.selection.nodeId = null;
    ctx.render();
    return true;
  }
  if (action === "ai-gen-structure-notes") { ctx.handleGenStructureNotes(); return true; }
  if (action === "ai-gen-node-note") { ctx.handleGenNodeNote(id); return true; }
  if (action === "filter-library") {
    ctx.setLibraryFilterTag(target.dataset.tag ?? "all");
    ctx.dom.structureLibraryContent.innerHTML = renderStructureLibraryDialog(ctx.getLibraryFilterTag());
    return true;
  }
  if (action === "apply-library-structure") {
    const structId = target.dataset.id;
    if (structId) ctx.applyLibraryStructure(structId);
    return true;
  }
  if (action === "delete-plot-node-col") {
    const delNodeId = target.dataset.nodeId ?? "";
    if (!delNodeId) return true;
    if (!confirm("删除此节点列？该列内的剧情卡不会删除，但将解除挂载。")) return true;
    const acts = list(appState.project.structure_profile?.acts);
    for (const act of acts) {
      act.nodes = list(act.nodes).filter((n) => n.id !== delNodeId);
    }
    list(appState.project.plot_board?.cards).forEach((c) => {
      if (c.node_id === delNodeId) c.node_id = "";
    });
    ctx.normalizeProject(); ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "add-plot-node-col") {
    const acts = list(appState.project.structure_profile?.acts);
    if (acts.length === 0) return true;
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
    ctx.normalizeProject(); ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "library-back") {
    ctx.setCurrentPage(appState.libraryReturnPage ?? "project");
    return true;
  }
  return false;
}
