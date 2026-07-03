// 形态条件预算门禁：防止散落的 format===/isSeries/isMicro/withSeasons 回潮。
// 形态差异应走 src/modes/registry.js(以 format 为键，合法，不计)；其它处新增需自觉更新基线。
import fs from 'node:fs';
import path from 'node:path';
const RE = /format === "(series|micro_drama|feature|pilot|short)"|\bisSeries\b|\bisMicro\b|\bwithSeasons\b/g;
const SKIP = new Set(['modes']);
function walk(dir) {
  let files = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) files = files.concat(walk(p)); }
    else if (e.name.endsWith('.js')) files.push(p);
  }
  return files;
}
let count = 0;
for (const f of walk('src')) { const m = fs.readFileSync(f, 'utf8').match(RE); count += m ? m.length : 0; }
const BASE = 'tests/e2e/.mode_baseline.txt';
const baseline = fs.existsSync(BASE) ? Number(fs.readFileSync(BASE, 'utf8').trim()) : count;
console.log(`[mode] 散落形态条件 ${count} / 基线 ${baseline}（registry 不计）`);
const fail = count > baseline;
if (fail) console.log('  MODE GATE FAIL: 新增散落形态条件——请改走 src/modes/registry.js，或确属合理则更新基线');
console.log(fail ? 'MODE GATE FAIL' : 'MODE GATE PASS');
process.exit(fail ? 1 : 0);
