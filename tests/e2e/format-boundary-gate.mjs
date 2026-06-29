// 形态边界门禁：锁死「改A坏B」的拆分成果。遍历 src/，断言两条边界：
//   规则A：core(src/ 下、formats/ 外) 不得 import 形态内部文件——
//          只允许唯一加载入口 app.js → ./formats/index.js（插件注册总线）。
//   规则B：某形态(src/formats/<name>/) 不得 import 另一形态(src/formats/<other>/)。
// 形态对 core 的单向依赖合法（不拦）；formats/index.js 作为加载器可 import 各形态入口。
// 用途：拆分后每次提交前跑，防止 core 重新点名形态 / 形态互相串味回潮。
import fs from "node:fs";
import path from "node:path";

const SRC = "src";
const FORMATS = path.join(SRC, "formats");
const LOADER = path.join(SRC, "formats", "index.js"); // 插件加载总线，非某个形态

function walk(dir) {
  let files = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files = files.concat(walk(p));
    else if (e.name.endsWith(".js")) files.push(p);
  }
  return files;
}

// 返回文件所属形态名（src/formats/<name>/...），core 返回 null，加载器返回 "__loader__"
function formatOf(file) {
  const norm = file.split(path.sep).join("/");
  if (norm === LOADER.split(path.sep).join("/")) return "__loader__";
  const m = norm.match(/^src\/formats\/([^/]+)\//);
  return m ? m[1] : null;
}

// 抽取一个文件里的相对 import/export-from/dynamic import 目标（仅相对路径）
function relImports(src) {
  const specs = [];
  const re = /(?:import|export)[^"'`]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src))) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (spec && spec.startsWith(".")) specs.push(spec);
  }
  return specs;
}

const violations = [];
for (const file of walk(SRC)) {
  const srcFmt = formatOf(file);
  const code = fs.readFileSync(file, "utf8");
  for (const spec of relImports(code)) {
    const target = path.normalize(path.join(path.dirname(file), spec)).split(path.sep).join("/");
    const tgtFmt = formatOf(target.endsWith(".js") ? target : target + ".js");
    const targetUnderFormats = target.startsWith("src/formats/");
    const rel = file.split(path.sep).join("/");

    // 规则A：core import 形态——只放行 app.js → formats/index.js
    if (srcFmt === null && targetUnderFormats) {
      const isLoaderImport = target.replace(/\.js$/, "") === LOADER.split(path.sep).join("/").replace(/\.js$/, "");
      if (!(rel === "src/app.js" && isLoaderImport)) {
        violations.push(`[A] core ${rel} → 形态文件 ${target}（core 不得 import 形态内部）`);
      }
    }
    // 规则B：形态 import 另一形态（加载器除外）
    if (srcFmt && srcFmt !== "__loader__" && tgtFmt && tgtFmt !== "__loader__" && tgtFmt !== srcFmt) {
      violations.push(`[B] 形态 ${rel} → 另一形态 ${target}（formats 之间不得互 import）`);
    }
  }
}

console.log(`[boundary] 扫描 src/，违规 ${violations.length} 条`);
violations.forEach((v) => console.log("  " + v));
console.log(violations.length ? "FORMAT BOUNDARY GATE FAIL" : "FORMAT BOUNDARY GATE PASS");
process.exit(violations.length ? 1 : 0);
