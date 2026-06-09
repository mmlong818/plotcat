process.env.NO_PROXY = '*';
import { runOneProject } from './run-one.mjs';
import { PROJECTS } from './projects.mjs';
import { writeFile } from 'node:fs/promises';

const results = [];
const allFixes = [];
const startIdx = Number(process.argv[2] ?? 1) - 1;
const endIdx = Number(process.argv[3] ?? PROJECTS.length);

for (let i = startIdx; i < endIdx; i++) {
  const t0 = Date.now();
  try {
    const r = await runOneProject(i);
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    const p = r.project;
    const s = r.summary;
    const fixCount = 0; // per-project fix counter (架构层修复已发生在准备阶段)
    console.log(`[${i + 1}/10] ${p.title} | ${p.genre} | acts=${s.acts} chars=${s.characters} rels=${s.relationships} cards=${s.plotCards} scenes=${s.scenes} script=${s.firstSceneScriptLen}字 | ${dt}s | ${r.dir}`);
    results.push({ idx: i + 1, ...p, summary: s, dir: r.dir, elapsedSec: dt, ok: true });
  } catch (e) {
    console.error(`[${i + 1}/10] FAILED:`, e.message);
    results.push({ idx: i + 1, slug: PROJECTS[i].slug, title: PROJECTS[i].title, ok: false, error: e.message });
  }
}

await writeFile(
  'E:/CC/code/yuandian-screenwriting-system/tests/e2e/realcheck-shots/run-all-summary.json',
  JSON.stringify(results, null, 2),
  'utf8'
);
console.log('\n=== Final ===');
console.log(`OK: ${results.filter(r => r.ok).length} / Total: ${results.length}`);
