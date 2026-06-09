process.env.NO_PROXY = '*';
process.env.no_proxy = '*';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const BASE = 'http://127.0.0.1:4173';
const DB_PATH = path.resolve('data/yuandian.db');
const TARGETS = [
  { idx: 7,  label: '白桦树下',   projectId: 'project_mpo78ngx_slq32f' },
  { idx: 10, label: '晨星 2049',  projectId: 'project_mpo79am3_tkcfra' },
];

async function shoot() {
  const dir = 'E:/CC/code/yuandian-screenwriting-system/tests/e2e/realcheck-shots/round2';
  await mkdir(dir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  for (const t of TARGETS) {
    await page.goto(`${BASE}/?nocache=${Date.now()}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const opened = await page.evaluate(async (pid) => {
      const w = window.__yuandian;
      try {
        if (typeof w.openProject === 'function') await w.openProject(pid);
        else if (typeof w.loadProject === 'function') await w.loadProject(pid);
        else {
          const r = await fetch('/api/projects/' + pid);
          const j = await r.json();
          w.appState.project = j.project;
          w.appState.currentPage = 'workflow';
          if (typeof w.renderApp === 'function') w.renderApp();
        }
        return { ok: true, title: w.appState?.project?.project?.title };
      } catch (e) { return { ok: false, reason: e.message }; }
    }, t.projectId);
    console.log(`[${t.idx}/10] opened:`, opened);
    await page.waitForTimeout(900);
    await page.evaluate(() => document.querySelector('button[data-id="screenplay"]')?.click());
    await page.waitForTimeout(1100);
    const shotPath = path.join(dir, `B6-${t.idx}-${t.label}.png`);
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log('shot:', shotPath);
  }
  await browser.close();
}

function verifyDb() {
  const db = new DatabaseSync(DB_PATH);
  console.log('\n--- DB SUM 校验 ---');
  const stmt = db.prepare(`
    SELECT p.id, p.title,
      (SELECT COUNT(*) FROM scene_cards s WHERE s.project_id=p.id) AS scene_count,
      (SELECT SUM(LENGTH(s.script_full)) FROM scene_cards s WHERE s.project_id=p.id) AS script_total_chars
    FROM projects p WHERE p.id IN (?, ?) ORDER BY p.title`);
  for (const r of stmt.all(TARGETS[0].projectId, TARGETS[1].projectId)) {
    console.log(`SELECT  id=${r.id}  title=${r.title}  scene_count=${r.scene_count}  script_total_chars=${r.script_total_chars}`);
  }
  db.close();
}

await shoot();
verifyDb();
console.log('\nDONE.');
