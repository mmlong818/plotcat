import { cloneDefaultProject } from "../data/defaultProject.js";
import {
  ensurePlotDrivenProject,
  rekeyPlotDrivenProject,
  summarizeProjectCounts
} from "./plotDrivenProject.js";

const DEFAULT_PROJECT_TITLE = "新项目";

function randomSegment() {
  return Math.random().toString(36).slice(2, 8);
}

export function createId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${randomSegment()}`;
}

function buildStarterCharacter(id, name = "主角") {
  return {
    id,
    name,
    story_role: "protagonist",
    external_want: "",
    internal_need: "",
    psychological_flaw: "",
    moral_flaw: "",
    public_mask: "",
    core_fear: "",
    wound: "",
    arc_start: "待定义",
    arc_end: "待定义",
    voice_rules: [],
    secret: ""
  };
}

function buildStarterScene(id, characterId) {
  return {
    id,
    order_index: 1,
    title: "开场场景",
    pov_character_id: characterId,
    location: "待定地点",
    time_of_day: "待定",
    goal: "",
    obstacle: "",
    tactic: "",
    turn: "",
    value_shift: "",
    new_information: [],
    input_state: "",
    output_state: "",
    production_tags: [],
    dialogue_seed: "",
    emotion_stage: ""
  };
}

export function createEmptyProject(options = {}) {
  const projectId = options.projectId ?? createId("project");
  const protagonistId = createId("char");
  const firstSceneId = createId("scene");

  return ensurePlotDrivenProject({
    project: {
      id: projectId,
      title: options.title?.trim() || DEFAULT_PROJECT_TITLE,
      format: options.format ?? "feature",
      language: options.language ?? "zh-CN",
      genre: options.genre ?? [],
      logline: options.logline ?? "",
      theme_question: options.theme_question ?? "",
      tone: options.tone ?? "",
      status: options.status ?? "development"
    },
    intent_anchor: {
      id: createId("anchor"),
      core_idea: "",
      theme: "",
      protagonist: "",
      arc: "",
      motif: "",
      genre: options.genre ?? [],
      status: "active",
      revisions: []
    },
    story_bible: {
      premise: "",
      core_conflict: "",
      characters: [buildStarterCharacter(protagonistId)],
      relationships: [],
      world_rules: [],
      timeline_events: [],
      beats: [],
      scene_cards: [buildStarterScene(firstSceneId, protagonistId)],
      setup_payoffs: []
    }
  });
}

export function rekeyProject(sourceProject, options = {}) {
  const project = ensurePlotDrivenProject(sourceProject);
  const nextProjectId = options.projectId ?? createId("project");
  const characterIdMap = new Map();
  const sceneIdMap = new Map();

  project.project = {
    ...project.project,
    id: nextProjectId,
    title: options.title ?? project.project.title,
    format: options.format ?? project.project.format,
    language: options.language ?? project.project.language,
    status: options.status ?? project.project.status
  };

  project.intent_anchor = {
    ...project.intent_anchor,
    id: createId("anchor"),
    revisions: (project.intent_anchor.revisions ?? []).map((revision) => ({
      ...revision,
      id: createId("anchor_rev")
    }))
  };

  project.story_bible.characters = (project.story_bible.characters ?? []).map((character) => {
    const nextId = createId("char");
    characterIdMap.set(character.id, nextId);
    return {
      ...character,
      id: nextId
    };
  });

  project.story_bible.relationships = (project.story_bible.relationships ?? []).map((relationship) => ({
    ...relationship,
    id: createId("rel"),
    source_character_id: characterIdMap.get(relationship.source_character_id) ?? "",
    target_character_id: characterIdMap.get(relationship.target_character_id) ?? ""
  }));

  project.story_bible.world_rules = (project.story_bible.world_rules ?? []).map((rule) => ({
    ...rule,
    id: createId("rule")
  }));

  project.story_bible.timeline_events = (project.story_bible.timeline_events ?? []).map((event) => ({
    ...event,
    id: createId("event"),
    participants: (event.participants ?? []).map((participantId) => characterIdMap.get(participantId) ?? participantId)
  }));

  project.story_bible.scene_cards = (project.story_bible.scene_cards ?? []).map((scene, index) => {
    const nextId = createId("scene");
    sceneIdMap.set(scene.id, nextId);
    return {
      ...scene,
      id: nextId,
      order_index: index + 1,
      pov_character_id: characterIdMap.get(scene.pov_character_id) ?? ""
    };
  });

  project.story_bible.beats = (project.story_bible.beats ?? []).map((beat) => ({
    ...beat,
    id: createId("beat"),
    linked_scene_ids: (beat.linked_scene_ids ?? []).map((sceneId) => sceneIdMap.get(sceneId) ?? sceneId)
  }));

  project.story_bible.setup_payoffs = (project.story_bible.setup_payoffs ?? []).map((item) => ({
    ...item,
    id: createId("setup"),
    setup_scene_id: sceneIdMap.get(item.setup_scene_id) ?? "",
    payoff_scene_id: sceneIdMap.get(item.payoff_scene_id) ?? ""
  }));

  return ensurePlotDrivenProject(
    rekeyPlotDrivenProject(project, {
      projectId: nextProjectId,
      characterIdMap,
      sceneIdMap
    })
  );
}

export function createProjectFromSample(options = {}) {
  return rekeyProject(cloneDefaultProject(), options);
}

export function buildProjectSummary(project, extras = {}) {
  const counts = summarizeProjectCounts(project);
  return {
    id: project.project.id,
    title: project.project.title,
    format: project.project.format,
    language: project.project.language,
    status: project.project.status,
    genre: Array.isArray(project.project.genre) ? project.project.genre : [],
    logline: project.project.logline,
    character_count: counts.character_count,
    scene_count: counts.scene_count,
    setup_count: counts.setup_count,
    version_count: extras.version_count ?? extras.versionCount ?? 0,
    updated_at: extras.updated_at ?? extras.updatedAt ?? null,
    last_version_at: extras.last_version_at ?? extras.lastVersionAt ?? null
  };
}

export function buildVersionSummary(project, issueSummary = null) {
  const counts = summarizeProjectCounts(project);
  return {
    title: project.project.title,
    status: project.project.status,
    genre: Array.isArray(project.project.genre) ? project.project.genre : [],
    character_count: counts.character_count,
    scene_count: counts.scene_count,
    setup_count: counts.setup_count,
    issue_summary: issueSummary
  };
}
