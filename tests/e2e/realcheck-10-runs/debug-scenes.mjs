process.env.NO_PROXY = '*';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/?n=' + Date.now(), { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Open existing project (most recent one)
const pid = await page.evaluate(async () => {
  const r = await fetch('/api/projects');
  const j = await r.json();
  return j.projects[0]?.id;
});
console.log('project id:', pid);

await page.evaluate(async (id) => {
  const r = await fetch('/api/projects/' + id);
  const j = await r.json();
  window.__yuandian.appState.project = j.project;
  window.__yuandian.normalizeProject();
  window.__yuandian.render();
}, pid);
await page.waitForTimeout(800);

const info = await page.evaluate(() => {
  const p = window.__yuandian.appState.project;
  return {
    sbScenes: p.story_bible?.scene_cards?.length || 0,
    sbScenesPreview: p.story_bible?.scene_cards?.slice(0, 3).map(s => ({ id: s.id, title: s.title, location: s.location, goal: s.goal, obstacle: s.obstacle })),
    workScenes: p.scene_workbench?.scenes?.length || 0,
    workScenesPreview: p.scene_workbench?.scenes?.slice(0, 3).map(s => ({ id: s.id, title: s.title, location: s.location, script_full_len: (s.script_full || '').length })),
    genre: p.project.genre,
    acts: p.structure_profile?.acts?.length,
  };
});
console.log(JSON.stringify(info, null, 2));

await browser.close();
