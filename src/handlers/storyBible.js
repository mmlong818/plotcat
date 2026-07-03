import { ctx } from "./context.js";
import { appState } from "../state.js";
import { getTimelineEvent, getWorldRule, getSetup } from "../logic/getters.js";
import { list } from "../utils.js";
import { createId } from "../shared/projectFactory.js";

export function handleStoryBibleClick(action, target, id, nodeId) {
  if (action === "ai-extract-continuity") {
    ctx.aiExtractContinuity();
    return true;
  }
  if (action === "add-convention") {
    appState.project.genre_profile.conventions.push({ id: createId("conv"), name: "", status: "required", description: "" });
    ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "add-taboo") {
    appState.project.genre_profile.taboos.push({ id: createId("taboo"), name: "", description: "" });
    ctx.markDirty(); ctx.render();
    return true;
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
    ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "select-timeline") { appState.selection.timelineId = id; ctx.render(); return true; }
  if (action === "delete-timeline") {
    const item = getTimelineEvent(id);
    if (item?.summary && !confirm(`删除时间节点「${item.summary}」？此操作不可恢复。`)) return true;
    appState.project.lock_layer.projections.timeline_events =
      list(appState.project.lock_layer?.projections?.timeline_events).filter((e) => e.id !== id);
    appState.project.story_bible.timeline_events =
      list(appState.project.story_bible?.timeline_events).filter((e) => e.id !== id);
    appState.selection.timelineId = null;
    ctx.normalizeProject(); ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "delete-world-rule") {
    const item = getWorldRule(id);
    if (item?.rule_statement && !confirm(`删除世界规则「${item.rule_statement.slice(0, 20)}」？此操作不可恢复。`)) return true;
    appState.project.lock_layer.projections.world_rules =
      list(appState.project.lock_layer?.projections?.world_rules).filter((e) => e.id !== id);
    appState.project.story_bible.world_rules =
      list(appState.project.story_bible?.world_rules).filter((e) => e.id !== id);
    appState.selection.worldRuleId = null;
    ctx.normalizeProject(); ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "delete-setup") {
    const item = getSetup(id);
    if (item?.setup_summary && !confirm(`删除伏笔「${item.setup_summary.slice(0, 20)}」？此操作不可恢复。`)) return true;
    appState.project.lock_layer.projections.setup_payoffs =
      list(appState.project.lock_layer?.projections?.setup_payoffs).filter((e) => e.id !== id);
    appState.project.story_bible.setup_payoffs =
      list(appState.project.story_bible?.setup_payoffs).filter((e) => e.id !== id);
    appState.selection.setupId = null;
    ctx.normalizeProject(); ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "add-world-rule") {
    const item = { id: createId("rule"), rule_statement: "", rule_level: "hard", scope: "", exceptions: [], evidence: [] };
    appState.project.lock_layer.projections.world_rules.push(item);
    appState.project.story_bible = appState.project.story_bible || {};
    appState.project.story_bible.world_rules = list(appState.project.story_bible.world_rules);
    appState.project.story_bible.world_rules.push(item);
    appState.selection.worldRuleId = item.id;
    ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "select-world-rule") { appState.selection.worldRuleId = id; ctx.render(); return true; }
  if (action === "add-setup") {
    const item = { id: createId("setup"), setup_summary: "", setup_scene_id: "", expected_payoff_window: "", status: "open", payoff_scene_id: "", payoff_summary: "" };
    appState.project.lock_layer.projections.setup_payoffs.push(item);
    appState.project.story_bible = appState.project.story_bible || {};
    appState.project.story_bible.setup_payoffs = list(appState.project.story_bible.setup_payoffs);
    appState.project.story_bible.setup_payoffs.push(item);
    appState.selection.setupId = item.id;
    ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "select-setup") { appState.selection.setupId = id; ctx.render(); return true; }
  return false;
}
