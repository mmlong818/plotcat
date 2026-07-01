// 项目草稿簇：项目列表摘要 + 草稿字段补丁 + 草稿写入正式项目文档。从 app.js 外提。
import { appState, projectFormatChoices } from "../state.js";
import { ensurePlotDrivenProject } from "./plotDrivenProject.js";
import { list, unique, splitTags } from "../utils.js";
import { createStructureProfile } from "../logic/structureTemplate.js";

export function summarizeProjectListItem(project) {
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

export function applyProjectDraftPatch(patch = {}, { getStructureOptionsForFormat, getDefaultTemplateForFormat }) {
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

export function applyProjectDraftToProject(sourceProject) {
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
    firstScene.act_id = list(project.plot_board?.cards).find((card) => !card.deleted_at)?.act_id ?? firstScene.act_id;
    firstScene.pov_character_id = protagonist?.id ?? firstScene.pov_character_id;
  }
  return ensurePlotDrivenProject(project);
}
