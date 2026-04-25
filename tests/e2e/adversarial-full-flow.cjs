// Adversarial full-flow driver: 真实跑一遍快速创作 → 项目固化 → 剧本生成
// 严格验证每一步契约，失败时打印诊断信息

const http = require("http");
const fs = require("fs");
const path = require("path");

const HOST = "127.0.0.1";
const PORT = 4173;

function req(method, p, body, timeoutMs = 300_000) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: HOST, port: PORT, path: p, method,
      headers: { "Content-Type": "application/json" }
    };
    if (data) options.headers["Content-Length"] = Buffer.byteLength(data);
    const r = http.request(options, (res) => {
      let buf = "";
      res.on("data", (c) => (buf += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, body: { raw: buf } }); }
      });
    });
    r.on("error", reject);
    r.setTimeout(timeoutMs, () => { r.destroy(new Error(`timeout ${timeoutMs}ms`)); });
    if (data) r.write(data);
    r.end();
  });
}

const log = (msg) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
const fail = (msg, ctx) => { console.error(`\n❌ FAIL: ${msg}`); if (ctx) console.error(JSON.stringify(ctx, null, 2).slice(0, 2000)); process.exit(1); };

async function gen(step, ctx, opts) {
  log(`→ generate step=${step}`);
  const res = await req("POST", "/api/generate", { step, projectContext: ctx, options: opts });
  if (res.status !== 200) fail(`HTTP ${res.status} on step=${step}`, res.body);
  if (res.body.error) fail(`step=${step} returned error`, res.body);
  const choices = res.body.choices ?? [];
  if (choices.length === 0) fail(`step=${step} returned 0 choices`, res.body);
  log(`  ← ${choices.length} choices, reasoning len=${(res.body.reasoning || "").length}`);
  return res.body;
}

(async () => {
  const t0 = Date.now();
  const out = { steps: {}, errors: [] };

  // ── Step 1: concept ───────────────────────────────────────────────────────
  const concept = await gen("concept", {}, {
    genres: ["悬疑", "犯罪"], conceptHint: "失忆刑警追查自己曾犯下的命案", count: 3
  });
  const conceptChoice = concept.choices[0];
  if (!conceptChoice.data?.title || !conceptChoice.data?.hook) fail("concept missing title/hook", conceptChoice);
  out.steps.concept = conceptChoice.data;
  log(`  concept picked: 《${conceptChoice.data.title}》— ${conceptChoice.data.hook}`);

  // ── Step 2: act_structure ─────────────────────────────────────────────────
  const projectCtx = {
    project: {
      project: { genre: ["悬疑", "犯罪"], logline: conceptChoice.data.hook },
      story_core: { premise: conceptChoice.data.hook, core_conflict: conceptChoice.data.core_conflict ?? "" },
      intent_anchor: { protagonist: "" }
    }
  };
  const act = await gen("act_structure", projectCtx, {});
  const acts = act.choices[0].data?.acts ?? [];
  if (acts.length < 3) fail("act_structure returned <3 acts", act.choices[0]);
  out.steps.act_structure = act.choices[0].data;
  log(`  acts: ${acts.length}, names=${acts.map(a => a.act_name).join(" / ")}`);

  // ── Step 3: characters ────────────────────────────────────────────────────
  const chars = await gen("characters", projectCtx, { count: 4 });
  const charList = chars.choices[0].data?.characters ?? [];
  if (charList.length < 3) fail("characters returned <3", chars.choices[0]);
  out.steps.characters = charList;
  log(`  characters: ${charList.length}, names=${charList.map(c => c.name).join(" / ")}`);

  // ── Step 4: key_scenes ────────────────────────────────────────────────────
  const scenes = await gen("key_scenes", projectCtx, {});
  const sceneList = scenes.choices.map(c => c.data).filter(s => s && s.title);
  if (sceneList.length < 5) fail("key_scenes returned <5", scenes.choices);
  out.steps.key_scenes = sceneList;
  log(`  key_scenes: ${sceneList.length}, titles=${sceneList.slice(0, 3).map(s => s.title).join(" / ")}…`);

  // ── Step 5: finalize → 落库 ────────────────────────────────────────────────
  log("→ finalize");
  const finalize = await req("POST", "/api/creation-flow/finalize", {
    genres: ["悬疑", "犯罪"],
    concept: conceptChoice.data,
    synopsis: { summary: conceptChoice.data.hook, version_label: conceptChoice.data.title },
    characters: charList,
    scenes: sceneList,
    structure: { primary: "three_act", acts }
  });
  if (finalize.status !== 200) fail(`finalize HTTP ${finalize.status}`, finalize.body);
  const projectId = finalize.body.projectId ?? finalize.body.project?.project?.id;
  if (!projectId) fail("finalize did not return projectId", finalize.body);
  out.projectId = projectId;
  log(`  project created: ${projectId}`);

  // ── Step 6: 读回项目验证完整度 ──────────────────────────────────────────────
  const proj = await req("GET", `/api/projects/${projectId}`);
  const p = proj.body.project;
  const sceneCards = p.story_bible?.scene_cards ?? [];
  log(`  verify: characters=${p.story_bible?.characters?.length ?? 0}, sceneCards=${sceneCards.length}`);

  // ── Step 7: scene_weave 为全部 scene_card 生成对白，并写到 scene_workbench.scenes[i].script_excerpt
  // （scene_workbench 是真源；syncLegacyStoryBible 会派生到 scene_card.dialogue_seed）
  const projectCtxFull = { project: p };
  const wovenScenes = [];
  const workbenchScenes = p.scene_workbench?.scenes ?? [];
  for (const sc of sceneCards) {
    log(`→ scene_weave: "${sc.title}"`);
    const weave = await gen("scene_weave", projectCtxFull, { sceneId: sc.id });
    const weaveData = weave.choices[0].data ?? {};
    const scriptLen = (weaveData.script || "").length;
    if (!weaveData.script) fail(`scene_weave for "${sc.title}" returned no .script`, weaveData);
    log(`  ← script chars=${scriptLen}`);
    wovenScenes.push({ sceneId: sc.id, title: sc.title, data: weaveData });

    const wIdx = workbenchScenes.findIndex(w => w.id === sc.id);
    if (wIdx >= 0) {
      workbenchScenes[wIdx].script_excerpt = weaveData.script;
      workbenchScenes[wIdx].notes = weaveData.subtext_map
        ? JSON.stringify((weaveData.subtext_map || []).slice(0, 5))
        : (workbenchScenes[wIdx].notes ?? "");
    }
  }
  out.steps.scene_weave = wovenScenes;

  // ── Step 8: 派生 relationships → 写到 character_hub.relationship_map（真源）
  const charSrcMap = new Map((charList || []).map(c => [c.name, c]));
  const hubChars = p.character_hub?.characters ?? [];
  const protagonist = hubChars[0];
  if (protagonist && hubChars.length > 1) {
    p.character_hub.relationship_map = hubChars.slice(1).map((c, i) => {
      const src = charSrcMap.get(c.name) ?? {};
      return {
        id: `rel_auto_${i}`,
        source_character_id: protagonist.id,
        target_character_id: c.id,
        relationship_type: src.story_role ?? c.story_role ?? "supporting",
        tension: src.relationship_hook ?? "",
        power_balance: "",
        shared_history: "",
        hidden_information: src.secret ?? "",
        related_plot_ids: []
      };
    });
    log(`  derived relationship_map: ${p.character_hub.relationship_map.length}`);
  }

  // ── Step 9: PUT 全量项目 ──────────────────────────────────────────────────
  log("→ PUT updated project");
  const putRes = await req("PUT", `/api/projects/${projectId}`, { project: p });
  if (putRes.status !== 200) fail(`PUT HTTP ${putRes.status}`, putRes.body);
  log(`  saved`);

  // ── 最终验证 ─────────────────────────────────────────────────────────────
  const final = await req("GET", `/api/projects/${projectId}`);
  const fp = final.body.project;
  log("=== FINAL VERIFY ===");
  log(`  characters: ${fp.story_bible?.characters?.length ?? 0}`);
  log(`  relationships: ${fp.story_bible?.relationships?.length ?? 0}`);
  log(`  scene_cards: ${fp.story_bible?.scene_cards?.length ?? 0}`);
  log(`  scene_cards with dialogue: ${(fp.story_bible?.scene_cards ?? []).filter(s => s.dialogue_seed).length}`);
  log(`  acts: ${fp.structure_profile?.acts?.length ?? 0}`);
  log(`  nodes: ${fp.structure_profile?.nodes?.length ?? 0}`);

  // ── Step 10: 字段完整度校验（防止"看似成功实则缺失"再次发生）──────────────
  log("=== FIELD COMPLETENESS CHECK ===");
  const issues = [];
  const charFields = ["external_want", "internal_need", "psychological_flaw", "moral_flaw", "public_mask", "core_fear", "wound", "arc_start", "arc_end"];
  fp.story_bible.characters.forEach((c) => {
    charFields.forEach(f => { if (!c[f] || String(c[f]).trim() === "") issues.push(`character[${c.name}].${f} 空`); });
    if (!Array.isArray(c.voice_rules) || c.voice_rules.length === 0) issues.push(`character[${c.name}].voice_rules 空`);
  });
  const sceneFields = ["location", "time_of_day", "goal", "obstacle", "turn"];
  fp.story_bible.scene_cards.forEach((s, i) => {
    sceneFields.forEach(f => {
      const v = String(s[f] ?? "").trim();
      if (!v || v === "待定" || v === "不限") issues.push(`scene[${i+1} ${s.title}].${f}=${JSON.stringify(s[f])}`);
    });
    if (!s.dialogue_seed) issues.push(`scene[${i+1} ${s.title}].dialogue_seed 空`);
  });
  const nodes = fp.structure_profile?.nodes ?? [];
  nodes.forEach((n, i) => { if (!n.note || String(n.note).trim() === "") issues.push(`structure.nodes[${i} ${n.title}].note 空`); });
  const rels = fp.story_bible?.relationships ?? [];
  if (rels.length === 0) issues.push("relationships 数为 0");

  if (issues.length === 0) {
    log("  ✅ 所有字段完整");
  } else {
    log(`  ❌ ${issues.length} 处缺失：`);
    issues.slice(0, 30).forEach(i => log(`    · ${i}`));
    out.fieldIssues = issues;
  }

  // 写出剧本到独立 .md 方便阅读
  const screenplayPath = path.join(__dirname, "adversarial-screenplay.md");
  const screenplay = [
    `# ${out.steps.concept.title} — 自动生成完整剧本`,
    "",
    `> 一句话概念：${out.steps.concept.hook}`,
    `> 项目 ID：${projectId}`,
    "",
    "---",
    ...wovenScenes.map((w, i) => [
      `\n## 场景 ${i + 1}：${w.title}\n`,
      "```\n" + (w.data.script || "") + "\n```\n"
    ].join("\n"))
  ].join("\n");
  fs.writeFileSync(screenplayPath, screenplay);
  log(`✍️  screenplay → ${screenplayPath}`);

  // 写报告
  const outPath = path.join(__dirname, "adversarial-flow-result.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  log(`✅ DONE in ${((Date.now() - t0) / 1000).toFixed(1)}s. report → ${outPath}`);
})().catch((e) => { console.error("\n💥 UNCAUGHT", e); process.exit(2); });
