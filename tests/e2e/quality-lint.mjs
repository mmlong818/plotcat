// 剧本质量 linter：对每个项目跑客观检查，输出可机读的违规清单。
// 用法：node tests/e2e/realcheck-10-runs/quality-lint.mjs [projectId|all]
// 退出码：0 = 全部合格；1 = 至少一个项目有 CRITICAL；2 = 仅有 WARN

import { DatabaseSync } from "node:sqlite";

const DB_PATH = "./data/yuandian.db";

// 不同 format 下限
const TARGETS = {
  feature_film:    { minScenes: 30, minSceneChars: 500, minTotalChars: 18000 },
  feature_or_pilot: { minScenes: 24, minSceneChars: 500, minTotalChars: 15000 },
  tv_pilot:        { minScenes: 24, minSceneChars: 500, minTotalChars: 15000 },
  microdrama:      { minScenes: 60, minSceneChars: 300, minTotalChars: 20000 },
  default:         { minScenes: 24, minSceneChars: 500, minTotalChars: 15000 }
};

const TITLE_FORMAT = {
  "破壁人": "feature_film", "母亲的最后一通电话": "feature_film",
  "白桦树下": "feature_film", "晨星 2049": "feature_film",
  "凤栖梧": "tv_pilot", "雾港谜局": "tv_pilot",
  "九重霜": "tv_pilot", "南门外的录像厅": "tv_pilot",
  "闪婚豪门": "microdrama", "重生 1999": "microdrama"
};

const db = new DatabaseSync(DB_PATH);

function lintScene(script, idx, title) {
  const issues = [];
  if (!script || !script.trim()) {
    issues.push({ level: "CRITICAL", code: "EMPTY", msg: `第 ${idx + 1} 场为空` });
    return issues;
  }
  const lines = script.split(/\r?\n/);

  // 1. 必须有场景头
  const hasSlug = lines.some((l) => /^(INT\.?|EXT\.?|EST\.?|内景|外景)/i.test(l.trim()));
  if (!hasSlug) issues.push({ level: "CRITICAL", code: "NO_SLUG", msg: `第 ${idx + 1} 场缺场景头` });
  // 1b. 场景头不得是占位定位（成片第一页出现「待定地点」是 coverage 减分项）
  const slugLine = lines.find((l) => /^(INT\.?|EXT\.?|EST\.?|内景|外景)/i.test(l.trim())) ?? "";
  if (/待定|未定地点|未定 -/.test(slugLine)) {
    issues.push({ level: "CRITICAL", code: "PLACEHOLDER_SLUG", msg: `第 ${idx + 1} 场场景头是占位定位：${slugLine.trim().slice(0, 40)}` });
  }

  // 2. 单字垂直分行检测：连续 N 个 ≤4 字 + em-dash 结尾的行
  let run = 0; let maxRun = 0; let runStart = -1; let worstRunStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const tooShort = /^[^。.!?]{1,4}—{1,2}\s*$/.test(t) || /^[一-龥]{1,3}。?$/.test(t) && i + 1 < lines.length && /^[一-龥]{1,4}—/.test(lines[i + 1].trim());
    if (tooShort) {
      if (run === 0) runStart = i;
      run++;
      if (run > maxRun) { maxRun = run; worstRunStart = runStart; }
    } else {
      run = 0;
    }
  }
  if (maxRun >= 6) {
    issues.push({ level: "CRITICAL", code: "STACCATO_RUN", msg: `第 ${idx + 1} 场出现 ${maxRun} 行连续单字垂直分行（从第 ${worstRunStart + 1} 行起）— 风格机械化，无法成片` });
  } else if (maxRun >= 4) {
    issues.push({ level: "WARN", code: "STACCATO_RUN", msg: `第 ${idx + 1} 场出现 ${maxRun} 行连续短分行` });
  }

  // 3. em-dash 密度（每 100 字最多 8 个 ——）
  const emCount = (script.match(/——/g) || []).length;
  const charCount = script.length;
  const emDensity = (emCount * 100) / charCount;
  if (emDensity > 12) {
    issues.push({ level: "CRITICAL", code: "EMDASH_OVERUSE", msg: `第 ${idx + 1} 场 em-dash 密度 ${emDensity.toFixed(1)}/100 字（>12 阈值）— 留白滥用` });
  } else if (emDensity > 8) {
    issues.push({ level: "WARN", code: "EMDASH_HIGH", msg: `第 ${idx + 1} 场 em-dash 密度 ${emDensity.toFixed(1)}/100 字` });
  }

  // 4. 平均行长（<10 字平均说明拆得太碎）
  const nonBlank = lines.map((l) => l.trim()).filter(Boolean);
  const avgLen = nonBlank.reduce((s, l) => s + l.length, 0) / Math.max(nonBlank.length, 1);
  if (avgLen < 8) {
    issues.push({ level: "CRITICAL", code: "AVG_LINE_TOO_SHORT", msg: `第 ${idx + 1} 场平均行长 ${avgLen.toFixed(1)} 字（<8）— 拆得过碎` });
  } else if (avgLen < 12) {
    issues.push({ level: "WARN", code: "AVG_LINE_SHORT", msg: `第 ${idx + 1} 场平均行长 ${avgLen.toFixed(1)} 字` });
  }

  return issues;
}

function lintProject(pid) {
  const meta = db.prepare("SELECT id, title, format FROM projects WHERE id=?").get(pid);
  if (!meta) return { ok: false, missing: true };
  const scenes = db.prepare("SELECT order_index, script_full FROM scene_cards WHERE project_id=? ORDER BY order_index").all(pid);
  const target = TARGETS[TITLE_FORMAT[meta.title]] || TARGETS.default;

  const report = { title: meta.title, id: pid, target: TITLE_FORMAT[meta.title] || "default", issues: [], stats: {} };
  const totalChars = scenes.reduce((s, r) => s + (r.script_full || "").length, 0);
  const minSceneChars = Math.min(...scenes.map((s) => (s.script_full || "").length));

  report.stats = { scenes: scenes.length, totalChars, minSceneChars };

  // 量级检查
  if (scenes.length < target.minScenes) report.issues.push({ level: "CRITICAL", code: "SCENES_BELOW_MIN", msg: `场数 ${scenes.length} < ${target.minScenes}` });
  if (totalChars < target.minTotalChars) report.issues.push({ level: "CRITICAL", code: "TOTAL_BELOW_MIN", msg: `总字数 ${totalChars} < ${target.minTotalChars}` });
  if (minSceneChars < target.minSceneChars) report.issues.push({ level: "CRITICAL", code: "SCENE_BELOW_MIN", msg: `最短场 ${minSceneChars} 字 < ${target.minSceneChars}` });

  // 逐场检查
  for (let i = 0; i < scenes.length; i++) {
    const sceneIssues = lintScene(scenes[i].script_full || "", i, meta.title);
    report.issues.push(...sceneIssues);
  }

  report.criticalCount = report.issues.filter((x) => x.level === "CRITICAL").length;
  report.warnCount = report.issues.filter((x) => x.level === "WARN").length;
  return report;
}

const arg = process.argv[2] || "all";
const projects = arg === "all"
  ? db.prepare("SELECT id FROM projects").all().map((r) => r.id)
  : [arg];

let anyCritical = false;
let anyWarn = false;
for (const pid of projects) {
  const r = lintProject(pid);
  if (r.missing) { console.log(`${pid} MISSING`); continue; }
  const status = r.criticalCount > 0 ? "FAIL" : r.warnCount > 0 ? "WARN" : "OK";
  console.log(`\n=== [${status}] ${r.title} (${r.target}) ===`);
  console.log(`  场数=${r.stats.scenes} 总字=${r.stats.totalChars} 最短场=${r.stats.minSceneChars}`);
  console.log(`  CRITICAL=${r.criticalCount}  WARN=${r.warnCount}`);
  const critPreview = r.issues.filter((x) => x.level === "CRITICAL").slice(0, 8);
  for (const x of critPreview) console.log(`  ✗ [${x.code}] ${x.msg}`);
  if (r.criticalCount > critPreview.length) console.log(`  ... (+${r.criticalCount - critPreview.length} more CRITICAL)`);
  const warnPreview = r.issues.filter((x) => x.level === "WARN").slice(0, 4);
  for (const x of warnPreview) console.log(`  ! [${x.code}] ${x.msg}`);
  if (r.criticalCount > 0) anyCritical = true;
  if (r.warnCount > 0) anyWarn = true;
}

process.exit(anyCritical ? 1 : anyWarn ? 2 : 0);
