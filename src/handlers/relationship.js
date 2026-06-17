import { ctx } from "./context.js";
import { appState, RELATIONSHIP_TYPE_OPTIONS } from "../state.js";
import { getRelationship, getCharacterNameById } from "../logic/getters.js";
import { list } from "../utils.js";
import { createId } from "../shared/projectFactory.js";

const RELATIONSHIP_TYPE_KIND_VALUES = new Set(RELATIONSHIP_TYPE_OPTIONS);

export function handleRelationshipClick(action, target, id, nodeId) {
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
      ctx.markDirty(); ctx.render();
    }
    return true;
  }
  if (action === "add-relationship") {
    // 决议 4：关系 1 条对称 — (a,b) 与 (b,a) 视为同一对。
    // 新增时自动选第一对「还没有关系」的角色组合，否则固定取前两人会静默无效
    const characters = list(appState.project.character_hub?.characters);
    if (characters.length < 2) {
      alert("至少需要两个人物才能建立关系");
      return true;
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
      return true;
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
    ctx.normalizeProject(); ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "select-relationship") { appState.selection.relationshipId = id; ctx.render(); return true; }
  if (action === "delete-relationship") {
    const relToDelete = getRelationship(id);
    if (relToDelete) {
      const relName = relToDelete.relationship_type || relToDelete.relationship_kind || "未命名关系";
      const pair = `${getCharacterNameById(relToDelete.source_character_id)} ↔ ${getCharacterNameById(relToDelete.target_character_id)}`;
      if (!confirm(`删除关系「${pair}（${relName}）」？此操作不可恢复。`)) return true;
    }
    appState.project.character_hub.relationship_map = list(appState.project.character_hub?.relationship_map).filter((item) => item.id !== id);
    if (appState.project.story_bible) {
      appState.project.story_bible.relationships = list(appState.project.story_bible.relationships).filter((item) => item.id !== id);
    }
    if (appState.selection.relationshipId === id) appState.selection.relationshipId = null;
    ctx.normalizeProject(); ctx.markDirty(); ctx.render();
    return true;
  }
  return false;
}
