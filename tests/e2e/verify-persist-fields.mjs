const BASE = 'http://127.0.0.1:4173';
const get = async (id) => (await (await fetch(`${BASE}/api/projects/${id}`)).json()).project;
const listRes = await (await fetch(`${BASE}/api/projects`)).json();
const arr = listRes.projects;
let proj = null, pid = null;
for (const p of arr) {
  const cand = await get(p.id);
  if ((cand.character_hub?.characters ?? []).length > 0) { proj = cand; pid = p.id; break; }
}
if (!proj) { console.log('NO PROJECT WITH CHARS'); process.exit(1); }
const chars = proj.character_hub.characters;
const rels = proj.character_hub.relationship_map ?? [];
console.log('project:', pid, 'chars:', chars.length, 'rels:', rels.length);
chars[0].traits = ['__test_trait__'];
chars[0].mbti = 'INTJ';
chars[0].core_drive = '__test_drive__';
if (rels.length) rels[0].relationship_kind = '__test_kind__';
const put = await fetch(`${BASE}/api/projects/${pid}`, {
  method: 'PUT', headers: { 'content-type': 'application/json' },
  body: JSON.stringify(proj)
});
console.log('PUT status:', put.status);
const fresh = await get(pid);
const c0 = fresh.character_hub.characters.find(c => c.id === chars[0].id) ?? {};
const r0 = rels.length ? (fresh.character_hub.relationship_map ?? []).find(r => r.id === rels[0].id) ?? {} : {};
console.log('after reload -> traits:', JSON.stringify(c0.traits), 'mbti:', c0.mbti, 'core_drive:', c0.core_drive, 'rel_kind:', r0.relationship_kind);
