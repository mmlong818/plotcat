import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(moduleDir, "../..");
const dataDir = path.join(rootDir, "data");
const dbPath = path.join(dataDir, "yuandian.db");

let database;

function migrate(db) {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      format TEXT NOT NULL,
      language TEXT NOT NULL,
      genre_json TEXT NOT NULL,
      logline TEXT NOT NULL,
      theme_question TEXT NOT NULL,
      tone TEXT NOT NULL,
      status TEXT NOT NULL,
      last_opened_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS project_story_meta (
      project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      premise TEXT NOT NULL,
      core_conflict TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS intent_anchors (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
      core_idea TEXT NOT NULL,
      theme TEXT NOT NULL,
      protagonist TEXT NOT NULL,
      arc TEXT NOT NULL,
      motif TEXT NOT NULL,
      genre_json TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS anchor_revisions (
      id TEXT PRIMARY KEY,
      anchor_id TEXT NOT NULL REFERENCES intent_anchors(id) ON DELETE CASCADE,
      changed_fields_json TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      story_role TEXT NOT NULL,
      external_want TEXT NOT NULL,
      internal_need TEXT NOT NULL,
      psychological_flaw TEXT NOT NULL,
      moral_flaw TEXT NOT NULL,
      public_mask TEXT NOT NULL,
      core_fear TEXT NOT NULL,
      wound TEXT NOT NULL,
      arc_start TEXT NOT NULL,
      arc_end TEXT NOT NULL,
      voice_rules_json TEXT NOT NULL,
      secret TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      PRIMARY KEY (project_id, id)
    );

    CREATE TABLE IF NOT EXISTS relationships (
      id TEXT NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      source_character_id TEXT NOT NULL,
      target_character_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      tension TEXT NOT NULL,
      power_balance TEXT NOT NULL,
      shared_history TEXT NOT NULL,
      hidden_information TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      PRIMARY KEY (project_id, id)
    );

    CREATE TABLE IF NOT EXISTS world_rules (
      id TEXT NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      rule_statement TEXT NOT NULL,
      rule_level TEXT NOT NULL,
      scope TEXT NOT NULL,
      exceptions_json TEXT NOT NULL,
      evidence_json TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      PRIMARY KEY (project_id, id)
    );

    CREATE TABLE IF NOT EXISTS timeline_events (
      id TEXT NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      story_day INTEGER NOT NULL,
      sequence_index INTEGER NOT NULL,
      summary TEXT NOT NULL,
      participants_json TEXT NOT NULL,
      location TEXT NOT NULL,
      trigger TEXT NOT NULL,
      consequence TEXT NOT NULL,
      PRIMARY KEY (project_id, id)
    );

    CREATE TABLE IF NOT EXISTS beats (
      id TEXT NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      framework TEXT NOT NULL,
      slot TEXT NOT NULL,
      purpose TEXT NOT NULL,
      linked_scene_ids_json TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      PRIMARY KEY (project_id, id)
    );

    CREATE TABLE IF NOT EXISTS scene_cards (
      id TEXT NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL,
      title TEXT NOT NULL,
      pov_character_id TEXT NOT NULL,
      location TEXT NOT NULL,
      time_of_day TEXT NOT NULL,
      goal TEXT NOT NULL,
      obstacle TEXT NOT NULL,
      tactic TEXT NOT NULL,
      turn TEXT NOT NULL,
      value_shift TEXT NOT NULL,
      new_information_json TEXT NOT NULL,
      input_state TEXT NOT NULL,
      output_state TEXT NOT NULL,
      production_tags_json TEXT NOT NULL,
      dialogue_seed TEXT NOT NULL,
      emotion_stage TEXT NOT NULL,
      script_full TEXT NOT NULL DEFAULT '',
      screenplay_notes TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (project_id, id)
    );

    CREATE TABLE IF NOT EXISTS setup_payoffs (
      id TEXT NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      setup_summary TEXT NOT NULL,
      setup_scene_id TEXT NOT NULL,
      expected_payoff_window TEXT NOT NULL,
      status TEXT NOT NULL,
      payoff_scene_id TEXT NOT NULL,
      payoff_summary TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      PRIMARY KEY (project_id, id)
    );

    CREATE TABLE IF NOT EXISTS project_versions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      note TEXT NOT NULL,
      summary_json TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS project_documents (
      project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      model_version TEXT NOT NULL,
      document_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const projectColumns = db.prepare("PRAGMA table_info(projects)").all();
  if (!projectColumns.some((column) => column.name === "last_opened_at")) {
    db.exec("ALTER TABLE projects ADD COLUMN last_opened_at TEXT");
  }
  db.exec("UPDATE projects SET last_opened_at = COALESCE(last_opened_at, updated_at)");

  const sceneColumns = db.prepare("PRAGMA table_info(scene_cards)").all();
  if (!sceneColumns.some((column) => column.name === "script_full")) {
    db.exec("ALTER TABLE scene_cards ADD COLUMN script_full TEXT NOT NULL DEFAULT ''");
  }
  if (!sceneColumns.some((column) => column.name === "screenplay_notes")) {
    db.exec("ALTER TABLE scene_cards ADD COLUMN screenplay_notes TEXT NOT NULL DEFAULT ''");
  }

  // 把单列 PK (id) 迁移为复合 PK (project_id, id)，让同结构项目可共存。
  migrateToCompositePk(db, "characters");
  migrateToCompositePk(db, "relationships");
  migrateToCompositePk(db, "world_rules");
  migrateToCompositePk(db, "timeline_events");
  migrateToCompositePk(db, "beats");
  migrateToCompositePk(db, "scene_cards");
  migrateToCompositePk(db, "setup_payoffs");
}

function migrateToCompositePk(db, table) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  // 复合 PK 的判断：pk 列里 id 和 project_id 都标记为 PK 成员（pk > 0）
  const pkCols = cols.filter((c) => c.pk > 0).map((c) => c.name).sort();
  const isCompositePk = pkCols.length === 2 && pkCols.includes("id") && pkCols.includes("project_id");
  if (isCompositePk) return;

  // 取 CREATE 语句中的列定义（去掉旧的 `id TEXT PRIMARY KEY` 改为 `id TEXT NOT NULL`）
  const colNames = cols.map((c) => c.name);
  const colDefs = cols.map((c) => {
    const notNull = c.notnull ? "NOT NULL" : "";
    const dflt = c.dflt_value !== null && c.dflt_value !== undefined ? `DEFAULT ${c.dflt_value}` : "";
    const refClause = c.name === "project_id" ? "REFERENCES projects(id) ON DELETE CASCADE" : "";
    return `${c.name} ${c.type} ${notNull} ${dflt} ${refClause}`.replace(/\s+/g, " ").trim();
  });
  const newTable = `__new_${table}`;
  db.exec(`DROP TABLE IF EXISTS ${newTable}`);
  db.exec(`
    CREATE TABLE ${newTable} (
      ${colDefs.join(",\n      ")},
      PRIMARY KEY (project_id, id)
    );
  `);
  db.exec(`INSERT INTO ${newTable} (${colNames.join(", ")}) SELECT ${colNames.join(", ")} FROM ${table}`);
  db.exec(`DROP TABLE ${table}`);
  db.exec(`ALTER TABLE ${newTable} RENAME TO ${table}`);
  console.log(`[migrate] ${table}: single PK → 复合 PK (project_id, id)`);
}

export function getDb() {
  if (database) {
    return database;
  }

  fs.mkdirSync(dataDir, { recursive: true });
  database = new DatabaseSync(dbPath);
  migrate(database);
  return database;
}

export function withTransaction(callback) {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = callback(db);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getDbInfo() {
  return {
    path: dbPath,
    experimental: true
  };
}
