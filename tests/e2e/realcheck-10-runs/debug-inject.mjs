process.env.NO_PROXY = '*';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/?n=' + Date.now(), { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

await page.evaluate(() => document.querySelector('[data-action="open-create-mode-picker"]').click());
await page.waitForTimeout(300);
await page.evaluate(() => document.querySelector('[data-action="open-from-structure"]').click());
await page.waitForFunction(() => window.__yuandian?.appState?.project?.project?.id && window.__yuandian.appState.currentPage === 'workflow', { timeout: 12000 });
await page.waitForTimeout(500);

const out = await page.evaluate(() => {
  const w = window.__yuandian;
  const p = w.appState.project;
  // Inject 3 characters
  p.character_hub.characters = [
    { id: 'char_test_0', name: '主角A', story_role: 'protagonist', archetype: '主角', external_goal: 'X', dramatic_need: '', arc_summary: '', mbti: '', character_traits: [], relationships: [], linked_plot_ids: [], sort_order: 0 },
    { id: 'char_test_1', name: '对手B', story_role: 'antagonist', archetype: '对手', external_goal: 'Y', dramatic_need: '', arc_summary: '', mbti: '', character_traits: [], relationships: [], linked_plot_ids: [], sort_order: 1 },
    { id: 'char_test_2', name: '盟友C', story_role: 'ally', archetype: '盟友', external_goal: 'Z', dramatic_need: '', arc_summary: '', mbti: '', character_traits: [], relationships: [], linked_plot_ids: [], sort_order: 2 },
  ];
  const beforeNorm = p.character_hub.characters.length;
  w.normalizeProject();
  const afterNorm = w.appState.project.character_hub.characters.length;
  w.markDirty();
  return { beforeNorm, afterNorm, names: w.appState.project.character_hub.characters.map(c=>c.name) };
});
console.log('inject result:', out);

// Save and re-fetch from DB
const saveOut = await page.evaluate(async () => {
  await window.__yuandian.saveProjectToServer();
  return window.__yuandian.appState.runtime.lastSavedAt;
});
console.log('saved at:', saveOut);

// Now check DB via API
const pid = await page.evaluate(() => window.__yuandian.appState.project.project.id);
const url = 'http://127.0.0.1:4173/api/projects/' + pid;
const resp = await page.evaluate(async (u) => {
  const r = await fetch(u);
  const j = await r.json();
  return { keys: Object.keys(j), chars: j.project?.character_hub?.characters?.length, names: j.project?.character_hub?.characters?.map(c=>c.name) };
}, url);
console.log('after save (server):', resp);

await browser.close();
