// app.js handler 外提的静态门禁（每个域提交前跑）。两道检查：
//  1) action 计数不变量：app.js + src/handlers/*.js 里每个 action === "X" 字面量的
//     出现次数，必须与基线逐一相等（搬移不增不减——漏搬则减少，误复制则增多）。
//  2) 悬空引用扫描：每个 handler 模块若以「裸调用 sym(」形式引用了 app.js 顶层声明的
//     本地符号，但既没 import 也不是 ctx 注入项，则标红（点击时会 ReferenceError）。
import fs from 'node:fs';

const baseCounts = Object.fromEntries(fs.readFileSync('tests/e2e/.actions_baseline.txt', 'utf8').trim().split(/\r?\n/).filter(Boolean).map(l => { const [a, c] = l.split(/\s+/); return [a, Number(c)]; }));
const app = fs.readFileSync('src/app.js', 'utf8');
const dir = 'src/handlers';
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'context.js') : [];
const srcs = Object.fromEntries(files.map(f => [f, fs.readFileSync(`${dir}/${f}`, 'utf8')]));

// 创作流程簇外提至 src/creation/（工厂注入模式，非 ctx handler）——纳入 action 计数范围，
// 但不纳入下方悬空引用扫描（其依赖经工厂参数解构注入，裸引用检查不适用）。
const creationDir = 'src/creation';
const creationSrcs = fs.existsSync(creationDir)
  ? Object.fromEntries(fs.readdirSync(creationDir).filter(f => f.endsWith('.js')).map(f => [f, fs.readFileSync(`${creationDir}/${f}`, 'utf8')]))
  : {};

// 三形态拆分后，series/micro 的 action 处理迁至 src/formats/（形态自拥）——纳入 action 计数范围，
// 同 creation 不纳入悬空引用扫描。
const formatsDir = 'src/formats';
const formatsSrcs = {};
if (fs.existsSync(formatsDir)) {
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) formatsSrcs[p] = fs.readFileSync(p, 'utf8'); } };
  walk(formatsDir);
}

// 1) action 计数不变量
const actRe = /action === "([a-z0-9-]+)"/g;
const counts = {};
for (const [, src] of [['app.js', app], ...Object.entries(srcs), ...Object.entries(creationSrcs), ...Object.entries(formatsSrcs)]) {
  let m; while ((m = actRe.exec(src))) counts[m[1]] = (counts[m[1]] || 0) + 1;
}
const allActions = new Set([...Object.keys(baseCounts), ...Object.keys(counts)]);
const drift = [...allActions].filter(a => (baseCounts[a] || 0) !== (counts[a] || 0))
  .map(a => `${a}(基线${baseCounts[a] || 0}→现${counts[a] || 0})`);
console.log(`[actions] 基线 ${Object.keys(baseCounts).length} 项；漂移 ${drift.length}`);
if (drift.length) console.log('  DRIFT:', drift.join(', '));
const actionFail = drift.length;

// 2) 悬空引用
const appSyms = new Set([...app.matchAll(/^(?:export )?(?:async )?(?:function|const|let|var)\s+([A-Za-z0-9_]+)/gm)].map(m => m[1]));
const ctxBlock = (app.match(/initContext\(\{([\s\S]*?)\}\)/) || [, ''])[1];
const ctxNames = new Set([...ctxBlock.matchAll(/([A-Za-z0-9_]+)\s*(?::|,|\n|$)/g)].map(m => m[1]));
let dangling = 0;
for (const [name, src] of Object.entries(srcs)) {
  const imported = new Set([...src.matchAll(/import\s*\{([^}]*)\}/g)].flatMap(m => m[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop()).filter(Boolean)));
  const local = new Set([...src.matchAll(/(?:export )?(?:async )?(?:function|const|let|var)\s+([A-Za-z0-9_]+)/g)].map(m => m[1]));
  for (const sym of appSyms) {
    if (ctxNames.has(sym) || imported.has(sym) || local.has(sym)) continue;
    if (new RegExp(`(?<![.\\w])${sym}(?![\\w])`).test(src)) { console.log(`  DANGLING ${name}: ${sym}  ← 未 import 且非 ctx (裸引用)`); dangling++; }
  }
}
console.log(dangling ? `[dangling] ${dangling} 处可疑` : '[dangling] 无');

const fail = actionFail || dangling;
console.log(fail ? 'GATE FAIL' : 'GATE PASS');
process.exit(fail ? 1 : 0);
