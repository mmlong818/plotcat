import { cloneDefaultProject } from "../data/defaultProject.js";
import { computeIssues, summarizeIssues } from "../logic/rules.js";
import {
  buildProjectSummary,
  buildVersionSummary,
  createEmptyProject,
  createId,
  createProjectFromSample
} from "../shared/projectFactory.js";
import { ensurePlotDrivenProject } from "../shared/plotDrivenProject.js";
import { getDb, withTransaction } from "./db.js";

const sampleProjectId = cloneDefaultProject().project.id;

function parseJson(value, fallback = []) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function stringify(value) {
  return JSON.stringify(value ?? []);
}

function parseDocument(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function replaceChildren(db, table, projectKey, projectId, callback) {
  db.prepare(`DELETE FROM ${table} WHERE ${projectKey} = ?`).run(projectId);
  callback();
}

function mapProjectSummaryRow(row) {
  return {
    id: row.id,
    title: row.title,
    format: row.format,
    language: row.language,
    status: row.status,
    genre: parseJson(row.genre_json, []),
    logline: row.logline,
    character_count: row.character_count,
    scene_count: row.scene_count,
    setup_count: row.setup_count,
    version_count: row.version_count,
    last_opened_at: row.last_opened_at,
    updated_at: row.updated_at,
    last_version_at: row.last_version_at
  };
}

function mapVersionRow(row) {
  return {
    id: row.id,
    project_id: row.project_id,
    label: row.label,
    note: row.note,
    created_at: row.created_at,
    summary: parseJson(row.summary_json, {})
  };
}

function getProjectRow(projectId) {
  const db = getDb();
  return db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
}

function mergeProjectDocuments(baseProject, documentProject) {
  if (!documentProject) {
    return ensurePlotDrivenProject(baseProject);
  }

  return ensurePlotDrivenProject({
    ...baseProject,
    ...documentProject,
    project: {
      ...baseProject.project,
      ...(documentProject.project ?? {})
    },
    intent_anchor: {
      ...baseProject.intent_anchor,
      ...(documentProject.intent_anchor ?? {})
    },
    story_bible: {
      ...baseProject.story_bible,
      ...(documentProject.story_bible ?? {})
    }
  });
}

function ensureProjectExists(projectId) {
  const row = getProjectRow(projectId);
  if (!row) {
    throw new Error("项目不存在");
  }
  return row;
}

export function ensureProjectSeeded() {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) AS count FROM projects").get();
  if (!row || row.count === 0) {
    saveProject(cloneDefaultProject());
  }
}

export function listProjects() {
  ensureProjectSeeded();
  const db = getDb();
  return db
    .prepare(
      `
      SELECT
        p.*,
        (SELECT COUNT(*) FROM characters c WHERE c.project_id = p.id) AS character_count,
        (SELECT COUNT(*) FROM scene_cards s WHERE s.project_id = p.id) AS scene_count,
        (SELECT COUNT(*) FROM setup_payoffs sp WHERE sp.project_id = p.id) AS setup_count,
        (SELECT COUNT(*) FROM project_versions pv WHERE pv.project_id = p.id) AS version_count,
        (SELECT MAX(created_at) FROM project_versions pv WHERE pv.project_id = p.id) AS last_version_at
      FROM projects p
      ORDER BY COALESCE(p.last_opened_at, p.updated_at, p.created_at) DESC, p.updated_at DESC, p.created_at DESC
    `
    )
    .all()
    .map(mapProjectSummaryRow);
}

export function touchProject(projectId) {
  ensureProjectSeeded();
  ensureProjectExists(projectId);
  const db = getDb();
  db.prepare("UPDATE projects SET last_opened_at = CURRENT_TIMESTAMP WHERE id = ?").run(projectId);
}

function getFallbackProjectId() {
  const projects = listProjects();
  return projects[0]?.id ?? sampleProjectId;
}

export function loadProject(projectId = null) {
  ensureProjectSeeded();
  const targetProjectId = projectId ?? getFallbackProjectId();
  const db = getDb();
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(targetProjectId);
  if (!project) {
    throw new Error("项目不存在");
  }

  const storyMeta = db
    .prepare("SELECT premise, core_conflict FROM project_story_meta WHERE project_id = ?")
    .get(targetProjectId) ?? { premise: "", core_conflict: "" };
  const anchor =
    db.prepare("SELECT * FROM intent_anchors WHERE project_id = ?").get(targetProjectId) ?? {
      id: createId("anchor"),
      core_idea: "",
      theme: "",
      protagonist: "",
      arc: "",
      motif: "",
      genre_json: "[]",
      status: "active"
    };

  const baseProject = {
    project: {
      id: project.id,
      title: project.title,
      format: project.format,
      language: project.language,
      genre: parseJson(project.genre_json, []),
      logline: project.logline,
      theme_question: project.theme_question,
      tone: project.tone,
      status: project.status
    },
    intent_anchor: {
      id: anchor.id,
      core_idea: anchor.core_idea,
      theme: anchor.theme,
      protagonist: anchor.protagonist,
      arc: anchor.arc,
      motif: anchor.motif,
      genre: parseJson(anchor.genre_json, []),
      status: anchor.status,
      revisions: db
        .prepare("SELECT * FROM anchor_revisions WHERE anchor_id = ? ORDER BY created_at DESC")
        .all(anchor.id)
        .map((item) => ({
          id: item.id,
          changed_fields: parseJson(item.changed_fields_json, []),
          reason: item.reason,
          created_at: item.created_at
        }))
    },
    story_bible: {
      premise: storyMeta.premise,
      core_conflict: storyMeta.core_conflict,
      characters: db
        .prepare("SELECT * FROM characters WHERE project_id = ? ORDER BY sort_order ASC")
        .all(targetProjectId)
        .map((item) => ({
          id: item.id,
          name: item.name,
          story_role: item.story_role,
          external_want: item.external_want,
          internal_need: item.internal_need,
          psychological_flaw: item.psychological_flaw,
          moral_flaw: item.moral_flaw,
          public_mask: item.public_mask,
          core_fear: item.core_fear,
          wound: item.wound,
          arc_start: item.arc_start,
          arc_end: item.arc_end,
          voice_rules: parseJson(item.voice_rules_json, []),
          secret: item.secret
        })),
      relationships: db
        .prepare("SELECT * FROM relationships WHERE project_id = ? ORDER BY sort_order ASC")
        .all(targetProjectId)
        .map((item) => ({
          id: item.id,
          source_character_id: item.source_character_id,
          target_character_id: item.target_character_id,
          relationship_type: item.relationship_type,
          tension: item.tension,
          power_balance: item.power_balance,
          shared_history: item.shared_history,
          hidden_information: item.hidden_information
        })),
      world_rules: db
        .prepare("SELECT * FROM world_rules WHERE project_id = ? ORDER BY sort_order ASC")
        .all(targetProjectId)
        .map((item) => ({
          id: item.id,
          rule_statement: item.rule_statement,
          rule_level: item.rule_level,
          scope: item.scope,
          exceptions: parseJson(item.exceptions_json, []),
          evidence: parseJson(item.evidence_json, [])
        })),
      timeline_events: db
        .prepare("SELECT * FROM timeline_events WHERE project_id = ? ORDER BY sequence_index ASC")
        .all(targetProjectId)
        .map((item) => ({
          id: item.id,
          story_day: item.story_day,
          sequence_index: item.sequence_index,
          summary: item.summary,
          participants: parseJson(item.participants_json, []),
          location: item.location,
          trigger: item.trigger,
          consequence: item.consequence
        })),
      beats: db
        .prepare("SELECT * FROM beats WHERE project_id = ? ORDER BY sort_order ASC")
        .all(targetProjectId)
        .map((item) => ({
          id: item.id,
          framework: item.framework,
          slot: item.slot,
          purpose: item.purpose,
          linked_scene_ids: parseJson(item.linked_scene_ids_json, [])
        })),
      scene_cards: db
        .prepare("SELECT * FROM scene_cards WHERE project_id = ? ORDER BY order_index ASC")
        .all(targetProjectId)
        .map((item) => ({
          id: item.id,
          order_index: item.order_index,
          title: item.title,
          pov_character_id: item.pov_character_id,
          location: item.location,
          time_of_day: item.time_of_day,
          goal: item.goal,
          obstacle: item.obstacle,
          tactic: item.tactic,
          turn: item.turn,
          value_shift: item.value_shift,
          new_information: parseJson(item.new_information_json, []),
          input_state: item.input_state,
          output_state: item.output_state,
          production_tags: parseJson(item.production_tags_json, []),
          dialogue_seed: item.dialogue_seed,
          emotion_stage: item.emotion_stage
        })),
      setup_payoffs: db
        .prepare("SELECT * FROM setup_payoffs WHERE project_id = ? ORDER BY sort_order ASC")
        .all(targetProjectId)
        .map((item) => ({
          id: item.id,
          setup_summary: item.setup_summary,
          setup_scene_id: item.setup_scene_id,
          expected_payoff_window: item.expected_payoff_window,
          status: item.status,
          payoff_scene_id: item.payoff_scene_id,
          payoff_summary: item.payoff_summary
        }))
    }
  };
  const documentRow = db
    .prepare("SELECT document_json FROM project_documents WHERE project_id = ?")
    .get(targetProjectId);

  return mergeProjectDocuments(
    baseProject,
    documentRow?.document_json ? parseDocument(documentRow.document_json) : null
  );
}

export function saveProject(project) {
  const nextProject = ensurePlotDrivenProject(project);
  const projectId = nextProject.project.id;

  withTransaction((db) => {
    db.prepare(
      `
      INSERT INTO projects (id, title, format, language, genre_json, logline, theme_question, tone, status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        format = excluded.format,
        language = excluded.language,
        genre_json = excluded.genre_json,
        logline = excluded.logline,
        theme_question = excluded.theme_question,
        tone = excluded.tone,
        status = excluded.status,
        updated_at = CURRENT_TIMESTAMP
    `
    ).run(
      projectId,
      nextProject.project.title,
      nextProject.project.format,
      nextProject.project.language,
      stringify(nextProject.project.genre),
      nextProject.project.logline,
      nextProject.project.theme_question,
      nextProject.project.tone,
      nextProject.project.status
    );

    db.prepare(
      `
      INSERT INTO project_story_meta (project_id, premise, core_conflict)
      VALUES (?, ?, ?)
      ON CONFLICT(project_id) DO UPDATE SET
        premise = excluded.premise,
        core_conflict = excluded.core_conflict
    `
    ).run(projectId, nextProject.story_bible.premise, nextProject.story_bible.core_conflict);

    db.prepare("DELETE FROM intent_anchors WHERE project_id = ? AND id <> ?").run(
      projectId,
      nextProject.intent_anchor.id
    );

    db.prepare(
      `
      INSERT INTO intent_anchors (id, project_id, core_idea, theme, protagonist, arc, motif, genre_json, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        project_id = excluded.project_id,
        core_idea = excluded.core_idea,
        theme = excluded.theme,
        protagonist = excluded.protagonist,
        arc = excluded.arc,
        motif = excluded.motif,
        genre_json = excluded.genre_json,
        status = excluded.status
    `
    ).run(
      nextProject.intent_anchor.id,
      projectId,
      nextProject.intent_anchor.core_idea,
      nextProject.intent_anchor.theme,
      nextProject.intent_anchor.protagonist,
      nextProject.intent_anchor.arc,
      nextProject.intent_anchor.motif,
      stringify(nextProject.intent_anchor.genre),
      nextProject.intent_anchor.status
    );

    db.prepare("DELETE FROM anchor_revisions WHERE anchor_id = ?").run(nextProject.intent_anchor.id);
    for (const revision of nextProject.intent_anchor.revisions) {
      db.prepare(
        `
        INSERT INTO anchor_revisions (id, anchor_id, changed_fields_json, reason, created_at)
        VALUES (?, ?, ?, ?, ?)
      `
      ).run(
        revision.id,
        nextProject.intent_anchor.id,
        stringify(revision.changed_fields),
        revision.reason,
        revision.created_at
      );
    }

    replaceChildren(db, "characters", "project_id", projectId, () => {
      const statement = db.prepare(
        `
        INSERT INTO characters (
          id, project_id, name, story_role, external_want, internal_need, psychological_flaw,
          moral_flaw, public_mask, core_fear, wound, arc_start, arc_end, voice_rules_json, secret, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      );
      nextProject.story_bible.characters.forEach((item, index) => {
        statement.run(
          item.id,
          projectId,
          item.name,
          item.story_role,
          item.external_want,
          item.internal_need,
          item.psychological_flaw,
          item.moral_flaw,
          item.public_mask,
          item.core_fear,
          item.wound,
          item.arc_start,
          item.arc_end,
          stringify(item.voice_rules),
          item.secret,
          index
        );
      });
    });

    replaceChildren(db, "relationships", "project_id", projectId, () => {
      const statement = db.prepare(
        `
        INSERT INTO relationships (
          id, project_id, source_character_id, target_character_id, relationship_type, tension,
          power_balance, shared_history, hidden_information, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      );
      nextProject.story_bible.relationships.forEach((item, index) => {
        statement.run(
          item.id,
          projectId,
          item.source_character_id,
          item.target_character_id,
          item.relationship_type,
          item.tension,
          item.power_balance,
          item.shared_history,
          item.hidden_information,
          index
        );
      });
    });

    replaceChildren(db, "world_rules", "project_id", projectId, () => {
      const statement = db.prepare(
        `
        INSERT INTO world_rules (
          id, project_id, rule_statement, rule_level, scope, exceptions_json, evidence_json, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      );
      nextProject.story_bible.world_rules.forEach((item, index) => {
        statement.run(
          item.id,
          projectId,
          item.rule_statement,
          item.rule_level,
          item.scope,
          stringify(item.exceptions),
          stringify(item.evidence),
          index
        );
      });
    });

    replaceChildren(db, "timeline_events", "project_id", projectId, () => {
      const statement = db.prepare(
        `
        INSERT INTO timeline_events (
          id, project_id, story_day, sequence_index, summary, participants_json, location, trigger, consequence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      );
      nextProject.story_bible.timeline_events.forEach((item) => {
        statement.run(
          item.id,
          projectId,
          item.story_day,
          item.sequence_index,
          item.summary,
          stringify(item.participants),
          item.location,
          item.trigger,
          item.consequence
        );
      });
    });

    replaceChildren(db, "beats", "project_id", projectId, () => {
      const statement = db.prepare(
        `
        INSERT INTO beats (id, project_id, framework, slot, purpose, linked_scene_ids_json, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      );
      nextProject.story_bible.beats.forEach((item, index) => {
        statement.run(
          item.id,
          projectId,
          item.framework,
          item.slot,
          item.purpose,
          stringify(item.linked_scene_ids),
          index
        );
      });
    });

    replaceChildren(db, "scene_cards", "project_id", projectId, () => {
      const statement = db.prepare(
        `
        INSERT INTO scene_cards (
          id, project_id, order_index, title, pov_character_id, location, time_of_day, goal,
          obstacle, tactic, turn, value_shift, new_information_json, input_state, output_state,
          production_tags_json, dialogue_seed, emotion_stage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      );
      nextProject.story_bible.scene_cards.forEach((item) => {
        statement.run(
          item.id,
          projectId,
          item.order_index,
          item.title,
          item.pov_character_id,
          item.location,
          item.time_of_day,
          item.goal,
          item.obstacle,
          item.tactic,
          item.turn,
          item.value_shift,
          stringify(item.new_information),
          item.input_state,
          item.output_state,
          stringify(item.production_tags),
          item.dialogue_seed ?? "",
          item.emotion_stage ?? ""
        );
      });
    });

    replaceChildren(db, "setup_payoffs", "project_id", projectId, () => {
      const statement = db.prepare(
        `
        INSERT INTO setup_payoffs (
          id, project_id, setup_summary, setup_scene_id, expected_payoff_window, status,
          payoff_scene_id, payoff_summary, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      );
      nextProject.story_bible.setup_payoffs.forEach((item, index) => {
        statement.run(
          item.id,
          projectId,
          item.setup_summary,
          item.setup_scene_id,
          item.expected_payoff_window,
          item.status,
          item.payoff_scene_id ?? "",
          item.payoff_summary ?? "",
          index
        );
      });
    });

    db.prepare(
      `
      INSERT INTO project_documents (project_id, model_version, document_json, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(project_id) DO UPDATE SET
        model_version = excluded.model_version,
        document_json = excluded.document_json,
        updated_at = CURRENT_TIMESTAMP
    `
    ).run(projectId, "plot_driven_v1", JSON.stringify(nextProject));
  });

  return loadProject(projectId);
}

export function createProject(options = {}) {
  const title = options.title?.trim();
  const nextProject = createEmptyProject({
    title: title || undefined,
    format: options.format,
    language: options.language,
    genre: Array.isArray(options.genre) ? options.genre : [],
    logline: options.logline ?? "",
    theme_question: options.theme_question ?? "",
    tone: options.tone ?? "",
    status: options.status
  });
  const savedProject = saveProject(nextProject);
  touchProject(savedProject.project.id);
  return loadProject(savedProject.project.id);
}

export function resetProject(projectId = null) {
  ensureProjectSeeded();
  const targetProjectId = projectId ?? getFallbackProjectId();
  const current = loadProject(targetProjectId);

  const nextProject =
    targetProjectId === sampleProjectId
      ? createProjectFromSample({ projectId: targetProjectId })
      : createEmptyProject({
          projectId: targetProjectId,
          title: current.project.title,
          format: current.project.format,
          language: current.project.language,
          status: current.project.status
        });

  return saveProject(nextProject);
}

export function listProjectVersions(projectId) {
  ensureProjectSeeded();
  ensureProjectExists(projectId);
  const db = getDb();
  return db
    .prepare(
      `
      SELECT id, project_id, label, note, summary_json, created_at
      FROM project_versions
      WHERE project_id = ?
      ORDER BY created_at DESC, id DESC
    `
    )
    .all(projectId)
    .map(mapVersionRow);
}

export function createProjectVersion(projectId, options = {}) {
  ensureProjectSeeded();
  ensureProjectExists(projectId);
  const project = loadProject(projectId);
  const issueSummary = summarizeIssues(computeIssues(project));
  const versionId = createId("version");
  const label = options.label?.trim() || `快照 ${new Date().toLocaleString("zh-CN")}`;
  const note = options.note?.trim() || "";
  const summary = buildVersionSummary(project, issueSummary);
  const db = getDb();

  db.prepare(
    `
    INSERT INTO project_versions (id, project_id, label, note, summary_json, snapshot_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `
  ).run(versionId, projectId, label, note, stringify(summary), JSON.stringify(project));

  return listProjectVersions(projectId);
}

function loadProjectVersionSnapshot(projectId, versionId) {
  const db = getDb();
  const row = db
    .prepare("SELECT snapshot_json FROM project_versions WHERE id = ? AND project_id = ?")
    .get(versionId, projectId);

  if (!row) {
    throw new Error("版本不存在");
  }

  return JSON.parse(row.snapshot_json);
}

export function restoreProjectVersion(projectId, versionId) {
  ensureProjectSeeded();
  ensureProjectExists(projectId);
  const snapshot = loadProjectVersionSnapshot(projectId, versionId);
  snapshot.project.id = projectId;
  return saveProject(snapshot);
}

export function getProjectWorkspace(projectId = null) {
  const targetProjectId = projectId ?? getFallbackProjectId();
  return {
    project: loadProject(targetProjectId),
    projects: listProjects(),
    versions: listProjectVersions(targetProjectId)
  };
}

export function summarizeProjectForClient(projectId) {
  const project = loadProject(projectId);
  return buildProjectSummary(project, {
    version_count: listProjectVersions(projectId).length
  });
}
