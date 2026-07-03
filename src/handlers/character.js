import { ctx } from "./context.js";
import { appState } from "../state.js";
import { getCharacter } from "../logic/getters.js";
import { list } from "../utils.js";
import { createId } from "../shared/projectFactory.js";

export function handleCharacterClick(action, target, id, nodeId) {
  if (action === "toggle-character-field-lock") {
    const char = getCharacter();
    if (char && id) {
      const locked = list(char.locked_fields);
      char.locked_fields = locked.includes(id) ? locked.filter((f) => f !== id) : [...locked, id];
      ctx.markDirty(); ctx.render();
    }
    return true;
  }
  if (action === "select-char-mbti") {
    const char = getCharacter();
    if (char) { char.mbti = char.mbti === id ? "" : id; ctx.markDirty(); ctx.render(); }
    return true;
  }
  if (action === "select-char-drive") {
    const char = getCharacter();
    if (!char) return true;
    // 统一字符串：表示角色追求的需求上限（再次点击同一层清空）
    const current = Array.isArray(char.core_drive)
      ? (char.core_drive[char.core_drive.length - 1] ?? "")
      : (char.core_drive ?? "");
    char.core_drive = current === id ? "" : id;
    ctx.markDirty();
    ctx.render();
    return true;
  }
  if (action === "ai-character-audit") {
    ctx.aiCharacterAudit();
    return true;
  }
  if (action === "toggle-character-trait") {
    const char = getCharacter();
    if (!char) return true;
    const traits = list(char.traits);
    char.traits = traits.includes(id)
      ? traits.filter((t) => t !== id)
      : [...traits, id];
    ctx.markDirty();
    ctx.render();
    return true;
  }
  if (action === "jump-to-character") { appState.selection.characterId = id; ctx.setCurrentStep("characters"); return true; }
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
    ctx.normalizeProject(); ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "select-character") {
    if (id && id === appState.characterCompareId) appState.characterCompareId = null;
    appState.selection.characterId = id;
    ctx.render();
    return true;
  }
  if (action === "edit-character") {
    appState.selection.characterId = id;
    appState.characterDesign = { loading: false, error: "" };
    ctx.render();
    return true;
  }
  if (action === "clear-character-compare") {
    appState.characterCompareId = null;
    ctx.render();
    return true;
  }
  if (action === "ai-refine-character") {
    ctx.handleRefineCharacter(id);
    return true;
  }
  if (action === "delete-character") {
    const charToDelete = getCharacter(id);
    const cascadeRels = list(appState.project.character_hub?.relationship_map)
      .filter((r) => r.source_character_id === id || r.target_character_id === id);
    const cascadeNote = cascadeRels.length ? `\n该人物关联的 ${cascadeRels.length} 条关系会一并删除。` : "";
    if (!confirm(`删除人物「${charToDelete?.name || "未命名"}」？此操作不可恢复。${cascadeNote}`)) return true;
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
    ctx.normalizeProject(); ctx.markDirty(); ctx.render();
    return true;
  }
  return false;
}
