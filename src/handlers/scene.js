import { ctx } from "./context.js";
import { appState } from "../state.js";
import { getPlotCard, getScene } from "../logic/getters.js";
import { list } from "../utils.js";
import { createId } from "../shared/projectFactory.js";

export function handleSceneClick(action, target, id, nodeId) {
  if (action === "select-scene-dialogue-style") {
    const scene = getScene();
    if (scene) { scene.dialogue_style = scene.dialogue_style === id ? "" : id; ctx.markDirty(); ctx.render(); }
    return true;
  }
  if (action === "select-scene-subtext") {
    const scene = getScene();
    if (scene) { scene.subtext_type = scene.subtext_type === id ? "" : id; ctx.markDirty(); ctx.render(); }
    return true;
  }
  if (action === "select-scene-power") {
    const scene = getScene();
    if (scene) { scene.dialogue_power = scene.dialogue_power === id ? "" : id; ctx.markDirty(); ctx.render(); }
    return true;
  }
  if (action === "select-scene-pace") {
    const scene = getScene();
    if (scene) { scene.dialogue_pace = scene.dialogue_pace === id ? "" : id; ctx.markDirty(); ctx.render(); }
    return true;
  }
  if (action === "select-scene-desc-density") {
    const scene = getScene();
    if (scene) { scene.desc_density = scene.desc_density === id ? "" : id; ctx.markDirty(); ctx.render(); }
    return true;
  }
  if (action === "select-scene-writing-style") {
    const scene = getScene();
    if (scene) { scene.writing_style = scene.writing_style === id ? "" : id; ctx.markDirty(); ctx.render(); }
    return true;
  }
  if (action === "ai-breakdown-scene") {
    ctx.aiBreakdownScene(id);
    return true;
  }
  if (action === "ai-rate-scene") {
    ctx.aiRateScene(id);
    return true;
  }
  if (action === "ai-expand-scenes") {
    ctx.aiExpandScenes();
    return true;
  }
  if (action === "jump-to-scene") { appState.selection.sceneId = id; ctx.setCurrentStep("scenes"); return true; }
  if (action === "scene-from-plot") {
    const card = getPlotCard(id);
    if (card && card.status !== "locked") {
      if (!confirm("该剧情卡尚未锁定，确认生成场景？\n建议先在「剧情开发」将卡片状态设为「锁定」再拆场景。")) return true;
    }
    ctx.insertSceneFromPlotCard(id);
    return true;
  }
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
    ctx.normalizeProject(); ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "select-scene") { appState.selection.sceneId = id; ctx.render(); return true; }
  if (action === "delete-scene") {
    const sceneToDelete = getScene(id);
    if (sceneToDelete) {
      const scriptLen = (sceneToDelete.script_full || "").trim().length;
      const scriptNote = scriptLen > 0 ? `\n本场已有 ${scriptLen} 字剧本成稿，会一并删除。` : "";
      if (!confirm(`删除场景「${sceneToDelete.title || "未命名场景"}」？此操作不可恢复。${scriptNote}`)) return true;
    }
    appState.project.scene_workbench.scenes = list(appState.project.scene_workbench?.scenes).filter((item) => item.id !== id);
    if (appState.project.story_bible) {
      appState.project.story_bible.scene_cards = list(appState.project.story_bible.scene_cards).filter((item) => item.id !== id);
    }
    if (appState.selection.sceneId === id) appState.selection.sceneId = null;
    if (appState.selection.screenplaySceneId === id) appState.selection.screenplaySceneId = null;
    ctx.normalizeProject(); ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "select-screenplay-scene") { appState.selection.screenplaySceneId = id; ctx.render(); return true; }
  if (action === "insert-scene-script-template") {
    const scene = list(appState.project.scene_workbench?.scenes).find((s) => s.id === id);
    if (!scene) return true;
    if (scene.script_full && scene.script_full.trim().length > 0) {
      if (!confirm("本场已有内容，插入模板会附加在末尾。继续？")) return true;
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
    ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "ai-write-scene-script") {
    ctx.aiWriteSceneScript(id);
    return true;
  }
  return false;
}
