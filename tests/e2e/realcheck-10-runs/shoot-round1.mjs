// 第 1 轮验证：DB 校验 + Playwright B6 截图
process.env.NO_PROXY = '*';
process.env.no_proxy = '*';

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const BASE = 'http://127.0.0.1:4173';
const DB_PATH = path.resolve('data/yuandian.db');

const TARGETS = [
  { idx: 5, label: '破壁人', projectId: 'project_mpo788n5_4ktshx' },
  { idx: 6, label: '母亲的最后一通电话', projectId: 'project_mpo78g1s_irubgm' },
];

async function shoot() {
  const dir = 'E:/CC/code/yuandian-screenwriting-system/tests/e2e/realcheck-shots/round1';
  await mkdir(dir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  for (const t of TARGETS) {
    console.log(`\n--- 截图 ${t.label} ---`);
    await page.goto(`${BASE}/?nocache=${Date.now()}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // 点击该项目 (通过 __yuandian dev hook 直接跳)
    const opened = await page.evaluate(async (pid) => {
      const w = window.__yuandian;
      if (!w) return { ok: false, reason: 'no __yuandian' };
      try {
        if (typeof w.openProject === 'function') {
          await w.openProject(pid);
        } else if (typeof w.loadProject === 'function') {
          await w.loadProject(pid);
        } else {
          // fallback: 直接调 fetch + 灌到 appState
          const r = await fetch('/api/projects/' + pid);
          const j = await r.json();
          w.appState.project = j.project;
          w.appState.currentPage = 'workflow';
          if (typeof w.renderApp === 'function') w.renderApp();
        }
        return { ok: true, title: w.appState?.project?.project?.title };
      } catch (e) { return { ok: false, reason: e.message }; }
    }, t.projectId);
    console.log('opened:', opened);
    await page.waitForTimeout(900);

    // 进入 screenplay (B6) 页
    await page.evaluate(() => {
      const btn = document.querySelector('button[data-id="screenplay"]');
      if (btn) btn.click();
    });
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
      (SELECT COUNT(*) FROM scene_cards s WHERE s.project_id = p.id) AS scene_count,
      (SELECT SUM(LENGTH(s.script_full)) FROM scene_cards s WHERE s.project_id = p.id) AS script_total_chars
    FROM projects p
    WHERE p.id IN (?, ?)
    ORDER BY p.title
  `);
  const rows = stmt.all(TARGETS[0].projectId, TARGETS[1].projectId);
  for (const r of rows) {
    console.log(`SELECT  id=${r.id}  title=${r.title}  scene_count=${r.scene_count}  script_total_chars=${r.script_total_chars}`);
  }
  db.close();
}

await shoot();
verifyDb();
console.log('\nDONE.');
