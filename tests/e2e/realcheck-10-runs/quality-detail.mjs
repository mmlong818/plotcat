// 详细输出每个项目的所有 CRITICAL 场及对应代码
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("./data/yuandian.db");
const pid = process.argv[2];

function lintScene(script, idx) {
  const issues = [];
  if (!script || !script.trim()) { issues.push("EMPTY"); return issues; }
  const lines = script.split(/\r?\n/);
  let run = 0; let maxRun = 0; let runStart = -1; let worstRunStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const tooShort = /^[^。.!?]{1,4}—{1,2}\s*$/.test(t) || (/^[一-龥]{1,3}。?$/.test(t) && i + 1 < lines.length && /^[一-龥]{1,4}—/.test(lines[i + 1].trim()));
    if (tooShort) { if (run === 0) runStart = i; run++; if (run > maxRun) { maxRun = run; worstRunStart = runStart; } }
    else run = 0;
  }
  if (maxRun >= 6) issues.push(`STACCATO_RUN(${maxRun}@${worstRunStart+1})`);
  const emCount = (script.match(/——/g) || []).length;
  const emDensity = (emCount * 100) / script.length;
  if (emDensity > 12) issues.push(`EMDASH_OVERUSE(${emDensity.toFixed(1)})`);
  const nonBlank = lines.map((l) => l.trim()).filter(Boolean);
  const avgLen = nonBlank.reduce((s, l) => s + l.length, 0) / Math.max(nonBlank.length, 1);
  if (avgLen < 8) issues.push(`AVG_LINE_TOO_SHORT(${avgLen.toFixed(1)})`);
  return issues;
}

const scenes = db.prepare("SELECT order_index, title, script_full FROM scene_cards WHERE project_id=? ORDER BY order_index").all(pid);
const badScenes = [];
for (const sc of scenes) {
  const issues = lintScene(sc.script_full || "", sc.order_index - 1);
  if (issues.length > 0) {
    badScenes.push({ idx: sc.order_index, title: sc.title, issues, chars: (sc.script_full || "").length });
    console.log(`#${sc.order_index} ${sc.title} (${(sc.script_full || "").length}字): ${issues.join(", ")}`);
  }
}
console.log(`\n总坏场: ${badScenes.length}/${scenes.length}`);
