import { test, describe } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

// db.js 的 dbPath 在模块加载时解析一次；同进程内重复 import 会拿到缓存的单例连接，
// 测不出"迁移函数本身是否幂等"。这里用子进程（每次全新模块状态，等价于真实服务重启）
// 反复对同一个临时库文件跑 getDb()，贴近生产里"每次启动都跑一遍迁移"的真实路径。
// db.js 已支持 YUANDIAN_DB_PATH 覆盖（本任务新增，见 src/server/db.js）。

const projectRoot = path.resolve(import.meta.dirname, "../..");

function tempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "yd-dbmigrate-"));
  return path.join(dir, "test.db");
}

function runGetDbInChildProcess(dbPath, extraSnippet = "") {
  const snippet = `
    const { getDb } = await import('./src/server/db.js');
    const db = getDb();
    ${extraSnippet}
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", snippet], {
    cwd: projectRoot,
    env: { ...process.env, YUANDIAN_DB_PATH: dbPath },
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(`child process failed: ${result.stderr}`);
  }
  return result;
}

const EXPECTED_TABLES = [
  "projects", "project_story_meta", "intent_anchors", "anchor_revisions",
  "characters", "relationships", "world_rules", "timeline_events", "beats",
  "scene_cards", "episodes", "setup_payoffs", "project_versions",
  "project_documents", "series_bibles", "app_meta"
];

describe("db.js 迁移：全新库", () => {
  test("跑一次迁移后，表结构齐全", () => {
    const dbPath = tempDbPath();
    runGetDbInChildProcess(dbPath);

    assert.equal(fs.existsSync(dbPath), true);
    const db = new DatabaseSync(dbPath);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
    for (const t of EXPECTED_TABLES) {
      assert.ok(tables.includes(t), `缺少表: ${t}`);
    }

    // 复合 PK 迁移应已生效
    const sceneCols = db.prepare("PRAGMA table_info(scene_cards)").all();
    const pkCols = sceneCols.filter((c) => c.pk > 0).map((c) => c.name).sort();
    assert.deepEqual(pkCols, ["id", "project_id"]);

    // 增量列应已存在
    const projectCols = db.prepare("PRAGMA table_info(projects)").all().map((c) => c.name);
    assert.ok(projectCols.includes("last_opened_at"));
    assert.ok(sceneCols.some((c) => c.name === "script_full"));
    assert.ok(sceneCols.some((c) => c.name === "screenplay_notes"));
    assert.ok(sceneCols.some((c) => c.name === "episode_id"));

    db.close();
  });
});

describe("db.js 迁移：幂等性", () => {
  test("同一个库连续跑两遍迁移（两次独立进程）不报错，结构不变", () => {
    const dbPath = tempDbPath();

    runGetDbInChildProcess(dbPath);
    const db1 = new DatabaseSync(dbPath);
    const tablesAfterFirst = db1.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name).sort();
    const sceneColsAfterFirst = db1.prepare("PRAGMA table_info(scene_cards)").all().map((c) => c.name).sort();
    db1.close();

    // 第二次：全新进程/全新模块状态，对同一个库文件再跑一次 getDb() → migrate()
    runGetDbInChildProcess(dbPath);
    const db2 = new DatabaseSync(dbPath);
    const tablesAfterSecond = db2.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name).sort();
    const sceneColsAfterSecond = db2.prepare("PRAGMA table_info(scene_cards)").all().map((c) => c.name).sort();
    db2.close();

    assert.deepEqual(tablesAfterSecond, tablesAfterFirst);
    assert.deepEqual(sceneColsAfterSecond, sceneColsAfterFirst);
  });

  test("三次连续迁移仍不报错（进一步确认幂等，不只是跑两次凑巧）", () => {
    const dbPath = tempDbPath();
    runGetDbInChildProcess(dbPath);
    runGetDbInChildProcess(dbPath);
    assert.doesNotThrow(() => runGetDbInChildProcess(dbPath));
  });
});

describe("db.js 迁移：老 schema 补列", () => {
  test("手工建一个缺新列的 projects/scene_cards 表，迁移后列被补上且数据保留", () => {
    const dbPath = tempDbPath();
    const db = new DatabaseSync(dbPath);
    // 模拟迁移前的老 schema：projects 没有 last_opened_at；scene_cards 是单列 PK 且缺三个新列
    db.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        format TEXT NOT NULL,
        language TEXT NOT NULL,
        genre_json TEXT NOT NULL,
        logline TEXT NOT NULL,
        theme_question TEXT NOT NULL,
        tone TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE scene_cards (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
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
        emotion_stage TEXT NOT NULL
      );
    `);
    db.prepare(`INSERT INTO projects (id, title, format, language, genre_json, logline, theme_question, tone, status)
      VALUES ('p1','老项目','feature','zh','[]','logline','q','tone','draft')`).run();
    db.prepare(`INSERT INTO scene_cards (id, project_id, order_index, title, pov_character_id, location, time_of_day,
      goal, obstacle, tactic, turn, value_shift, new_information_json, input_state, output_state,
      production_tags_json, dialogue_seed, emotion_stage)
      VALUES ('s1','p1',0,'场1','c1','loc','day','goal','obs','tac','turn','shift','[]','in','out','[]','seed','stage')`).run();
    db.close();

    runGetDbInChildProcess(dbPath);

    const db2 = new DatabaseSync(dbPath);
    const projectCols = db2.prepare("PRAGMA table_info(projects)").all().map((c) => c.name);
    assert.ok(projectCols.includes("last_opened_at"), "projects.last_opened_at 应被补上");

    const sceneCols = db2.prepare("PRAGMA table_info(scene_cards)").all();
    const sceneColNames = sceneCols.map((c) => c.name);
    assert.ok(sceneColNames.includes("script_full"));
    assert.ok(sceneColNames.includes("screenplay_notes"));
    assert.ok(sceneColNames.includes("episode_id"));

    const pkCols = sceneCols.filter((c) => c.pk > 0).map((c) => c.name).sort();
    assert.deepEqual(pkCols, ["id", "project_id"], "scene_cards 应被迁移为复合 PK");

    // 原有数据应保留
    const project = db2.prepare("SELECT * FROM projects WHERE id = 'p1'").get();
    assert.equal(project.title, "老项目");
    const scene = db2.prepare("SELECT * FROM scene_cards WHERE project_id = 'p1' AND id = 's1'").get();
    assert.equal(scene.title, "场1");
    assert.equal(scene.script_full, "");

    db2.close();
  });
});
