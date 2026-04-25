// 把已生成的剧本数据补写回项目的正确字段
// 修正前一轮误把数据写到 story_bible.scene_cards.dialogue_seed（被 syncLegacyStoryBible 清掉）

const http = require("http");
const fs = require("fs");
const path = require("path");

const HOST = "127.0.0.1", PORT = 4173;

function req(method, p, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = { hostname: HOST, port: PORT, path: p, method, headers: { "Content-Type": "application/json" } };
    if (data) opts.headers["Content-Length"] = Buffer.byteLength(data);
    const r = http.request(opts, res => {
      let buf = ""; res.on("data", c => buf += c);
      res.on("end", () => { try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); } catch { resolve({ status: res.statusCode, body: { raw: buf } }); } });
    });
    r.on("error", reject); if (data) r.write(data); r.end();
  });
}

(async () => {
  const result = require(path.join(__dirname, "adversarial-flow-result.json"));
  const projectId = result.projectId;
  const wovenScenes = result.steps.scene_weave;
  console.log(`Repairing ${projectId} — ${wovenScenes.length} scenes`);

  const get = await req("GET", `/api/projects/${projectId}`);
  const p = get.body.project;
  const scenes = p.scene_workbench?.scenes ?? [];
  console.log(`scene_workbench.scenes: ${scenes.length}`);

  // 1. 写剧本到 scene_workbench.scenes[i].script_excerpt（正确入口）
  let written = 0;
  for (const w of wovenScenes) {
    const idx = scenes.findIndex(s => s.id === w.sceneId);
    if (idx === -1) {
      console.log(`  ⚠️ scene id ${w.sceneId} not in workbench`);
      continue;
    }
    scenes[idx].script_excerpt = w.data.script || "";
    scenes[idx].notes = w.data.subtext_map ? JSON.stringify(w.data.subtext_map.slice(0, 5), null, 2) : (scenes[idx].notes ?? "");
    written++;
  }
  console.log(`  ✓ wrote script to ${written} workbench scenes`);

  // 2. 派生关系写到 character_hub.relationship_map（用正确字段名）
  const characters = p.character_hub?.characters ?? [];
  const protagonist = characters[0];
  if (protagonist && characters.length > 1) {
    const charSrc = result.steps.characters ?? [];
    const charSrcMap = new Map(charSrc.map(c => [c.name, c]));
    p.character_hub.relationship_map = characters.slice(1).map((c, i) => {
      const src = charSrcMap.get(c.name) ?? {};
      return {
        id: `rel_repair_${i}`,
        source_character_id: protagonist.id,
        target_character_id: c.id,
        relationship_type: src.story_role ?? c.story_role ?? "supporting",
        tension: src.relationship_hook ?? "",
        power_balance: "",
        shared_history: "",
        hidden_information: "",
        related_plot_ids: []
      };
    });
    console.log(`  ✓ derived ${p.character_hub.relationship_map.length} relationships`);
  }

  // 3. PUT 全量项目
  const put = await req("PUT", `/api/projects/${projectId}`, { project: p });
  console.log(`PUT status: ${put.status}`);

  // 4. 验证
  const final = await req("GET", `/api/projects/${projectId}`);
  const fp = final.body.project;
  const fSc = fp.story_bible?.scene_cards ?? [];
  const fSw = fp.scene_workbench?.scenes ?? [];
  console.log("\n=== FINAL VERIFY ===");
  console.log(`  story_bible.scene_cards with dialogue_seed: ${fSc.filter(s => s.dialogue_seed).length} / ${fSc.length}`);
  console.log(`  scene_workbench.scenes with script_excerpt: ${fSw.filter(s => s.script_excerpt).length} / ${fSw.length}`);
  console.log(`  story_bible.relationships: ${fp.story_bible?.relationships?.length ?? 0}`);
  console.log(`  character_hub.relationship_map: ${fp.character_hub?.relationship_map?.length ?? 0}`);
  console.log(`  first scene_cards dialogue_seed sample: ${(fSc[0]?.dialogue_seed || "").slice(0, 60)}`);
})().catch(e => { console.error("ERR", e); process.exit(1); });
