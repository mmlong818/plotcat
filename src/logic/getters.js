// 数据 getter 层：从 appState 读取派生数据的纯查询函数（从 app.js 提取）。
// 只读不写；任何 mutation 仍留在 app.js 的 action 处理器里。
import { appState } from "../state.js";
import { list } from "../utils.js";

// 未被软删除的剧情卡（废纸篓恢复/清除走原始数组，不经过这里）
export function getLivePlotCards() {
  return list(appState.project.plot_board?.cards).filter((card) => !card.deleted_at);
}

export function getPlotCard(cardId = appState.selection.plotCardId) {
  return getLivePlotCards().find((card) => card.id === cardId) ?? null;
}

export function getCharacter(characterId = appState.selection.characterId) {
  return list(appState.project.character_hub?.characters).find((item) => item.id === characterId) ?? null;
}

export function getRelationship(relationshipId = appState.selection.relationshipId) {
  return list(appState.project.character_hub?.relationship_map).find((item) => item.id === relationshipId) ?? null;
}

export function getScene(sceneId = appState.selection.sceneId) {
  return list(appState.project.scene_workbench?.scenes).find((item) => item.id === sceneId) ?? null;
}

export function getTimelineEvent(eventId = appState.selection.timelineId) {
  return list(appState.project.lock_layer?.projections?.timeline_events).find((item) => item.id === eventId) ?? null;
}

export function getWorldRule(ruleId = appState.selection.worldRuleId) {
  return list(appState.project.lock_layer?.projections?.world_rules).find((item) => item.id === ruleId) ?? null;
}

export function getSetup(setupId = appState.selection.setupId) {
  return list(appState.project.lock_layer?.projections?.setup_payoffs).find((item) => item.id === setupId) ?? null;
}

export function getCharacterNameById(characterId = "") {
  return list(appState.project.character_hub?.characters).find((item) => item.id === characterId)?.name ?? "未定人物";
}

export function getCharacterLinkedPlotCards(characterId) {
  return getLivePlotCards()
    .filter((card) => list(card.character_ids).includes(characterId))
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

export function getCharacterRelationships(characterId) {
  return list(appState.project.character_hub?.relationship_map).filter(
    (relationship) =>
      relationship.source_character_id === characterId || relationship.target_character_id === characterId
  );
}

export function getRelationshipLinkedPlotCards(relationship) {
  if (!relationship) return [];
  const pairIds = [relationship.source_character_id, relationship.target_character_id].filter(Boolean);
  return getLivePlotCards()
    .filter((card) => pairIds.every((characterId) => list(card.character_ids).includes(characterId)))
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

export function getSceneLinkedPlotCards(scene) {
  if (!scene) return [];
  const linkedIds = new Set(list(scene.linked_plot_card_ids));
  return getLivePlotCards()
    .filter((card) => linkedIds.has(card.id))
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

export function getSceneLinkedCharacterIds(scene) {
  if (!scene) return [];
  const ids = new Set();
  if (scene.pov_character_id) ids.add(scene.pov_character_id);
  getSceneLinkedPlotCards(scene).forEach((card) => {
    list(card.character_ids).forEach((characterId) => { if (characterId) ids.add(characterId); });
  });
  return Array.from(ids);
}

export function getSceneLinkedCharacters(scene) {
  const ids = new Set(getSceneLinkedCharacterIds(scene));
  return list(appState.project.character_hub?.characters).filter((character) => ids.has(character.id));
}

export function getSceneLinkedRelationships(scene) {
  const characterIds = new Set(getSceneLinkedCharacterIds(scene));
  if (characterIds.size < 2) return [];
  return list(appState.project.character_hub?.relationship_map).filter(
    (relationship) =>
      characterIds.has(relationship.source_character_id) &&
      characterIds.has(relationship.target_character_id)
  );
}

export function getSceneLinkedTimelineEvents(scene) {
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

export function getRelationshipLinkedScenes(relationship) {
  if (!relationship) return [];
  const pairIds = [relationship.source_character_id, relationship.target_character_id].filter(Boolean);
  if (pairIds.length < 2) return [];
  return list(appState.project.scene_workbench?.scenes)
    .filter((scene) => pairIds.every((characterId) => getSceneLinkedCharacterIds(scene).includes(characterId)))
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

export function getRelationshipLinkedTimelineEvents(relationship) {
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

export function getCharacterLinkedScenes(characterId) {
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

export function getPlotLinkedRelationships(card) {
  if (!card) return [];
  const characterIds = list(card.character_ids);
  if (characterIds.length < 2) return [];
  return list(appState.project.character_hub?.relationship_map).filter(
    (relationship) =>
      characterIds.includes(relationship.source_character_id) &&
      characterIds.includes(relationship.target_character_id)
  );
}

export function getPlotLinkedScenes(card) {
  if (!card) return [];
  return list(appState.project.scene_workbench?.scenes)
    .filter((scene) => list(scene.linked_plot_card_ids).includes(card.id))
    .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
}

export function getPlotLinkedTimelineEvents(card) {
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

