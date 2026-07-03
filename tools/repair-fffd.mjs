// 一次性修复：剥离历史 UTF-8 截断产生的 U+FFFD（�）。
// 根因（readJsonBody 按 chunk 解码）已修，此脚本只清存量。运行前自动确认备份存在。
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
if (!existsSync('data/yuandian.db.bak-2026-06-10')) {
  console.error('缺少备份 data/yuandian.db.bak-2026-06-10，先备份再跑');
  process.exit(1);
}
const db = new DatabaseSync('data/yuandian.db');
const strip = (s) => s.replace(/�+/g, '');
let fixed = 0;
for (const r of db.prepare('SELECT project_id, document_json FROM project_documents').all()) {
  if (r.document_json.includes('�')) {
    db.prepare('UPDATE project_documents SET document_json = ? WHERE project_id = ?')
      .run(strip(r.document_json), r.project_id);
    fixed++;
  }
}
const tables = ['scene_cards','beats','characters','relationships','world_rules','timeline_events','setup_payoffs','projects','intent_anchors','project_story_meta','anchor_revisions'];
for (const t of tables) {
  const info = db.prepare(`PRAGMA table_info(${t})`).all();
  const cols = info.filter(c => /TEXT/i.test(c.type)).map(c => c.name);
  const pk = info.filter(c => c.pk > 0).map(c => c.name);
  if (!cols.length || !pk.length) continue;
  for (const row of db.prepare(`SELECT * FROM ${t}`).all()) {
    const dirty = cols.filter(c => typeof row[c] === 'string' && row[c].includes('�'));
    if (!dirty.length) continue;
    const setClause = dirty.map(c => `${c} = ?`).join(', ');
    const where = pk.map(c => `${c} = ?`).join(' AND ');
    db.prepare(`UPDATE ${t} SET ${setClause} WHERE ${where}`)
      .run(...dirty.map(c => strip(row[c])), ...pk.map(c => row[c]));
    fixed++;
  }
}
console.log('已修复行/文档数:', fixed);
let remain = 0;
for (const r of db.prepare('SELECT document_json FROM project_documents').all()) remain += (r.document_json.match(/�/g)||[]).length;
console.log('document_json 剩余 FFFD:', remain);
