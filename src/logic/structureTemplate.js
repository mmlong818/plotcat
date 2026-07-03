// 结构模板簇：结构档案生成/应用 + 结构库弹窗开关/应用。从 app.js 外提。
import { appState, structurePresets, buildCustomStructurePreset } from "../state.js";
import { createId } from "../shared/projectFactory.js";
import { list } from "../utils.js";
import { renderStructureLibraryDialog } from "../render/structureLibrary.js";
import { STORY_STRUCTURE_LIBRARY } from "../data/storyStructureLibrary.js";

export function createStructureProfile(template, rhythmOverlay, customActCount = 2) {
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

export function createStructureTemplate({ normalizeProject, markDirty, render, dom }) {
  let libraryFilterTag = "all";

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
    const hasExistingNotes = list(appState.project.structure_profile?.nodes).some((n) => (n.note || "").trim());
    if (hasExistingNotes && !confirm("切换结构模板会清空当前所有节点笔记（剧情卡会尽量保留并重新挂载，但节点文字内容不可恢复）。\n\n确定要套用「" + struct.name + "」吗？")) {
      return;
    }
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

  return {
    applyStructureTemplate,
    openStructureLibrary,
    closeStructureLibrary,
    applyLibraryStructure,
    setLibraryFilterTag: (tag) => { libraryFilterTag = tag; },
    getLibraryFilterTag: () => libraryFilterTag
  };
}
