// 微短剧创作区各节点的 AI 生成簇（主题定位/世界观/人物/总框架/爽点高潮/节奏付费/分集写本/主题升华/性别向）。
// 从 app.js 外提；运行期依赖（render / markDirty）经工厂注入，appState 直接 import。
// 统一 live-ref 模式：await 期间 autosave 可能用新对象替换 appState.project，故 await 后重取 live 引用再写回，防孤立。
import { appState } from "../state.js";

export function createMicroGen({ render, markDirty }) {
  // 微短剧节点①·主题定位：AI 生成 theme_anchor（节点01）。直接 fetch /api/generate，try/finally 保证状态复位。
  async function aiGenTheme() {
    const t0 = appState.project.theme_anchor ?? (appState.project.theme_anchor = {});
    t0.loading = true; t0.error = ""; appState.microGenBusy = "theme_anchor"; render();
    const opts = { concept: t0.input_concept || "", platform: t0.input_platform || "", audience: t0.input_audience || "" };
    let result;
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "theme_anchor", projectContext: appState.project, options: opts })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      result = await res.json();
    } catch (e) {
      result = { error: "生成失败：" + e.message };
    }
    // autosave 可能在 await 期间用新对象替换 appState.project，故重新取 live 引用再写回
    const ta = appState.project.theme_anchor ?? (appState.project.theme_anchor = {});
    appState.microGenBusy = ""; ta.loading = false;
    const d = result.choices?.[0]?.data ?? {};
    if (result.error || !d.logline) {
      ta.error = result.error || "AI 未返回有效定位，请重试";
    } else {
      ta.logline = d.logline;
      ta.track = d.track ?? "";
      ta.audience_out = d.audience ?? "";
      ta.values = d.values ?? "";
      ta.theme_statement = (d.theme_statement && typeof d.theme_statement === "object") ? d.theme_statement : (ta.theme_statement ?? {});
      ta.diff = Array.isArray(d.diff) ? d.diff : [];
      ta.risks = Array.isArray(d.risks) ? d.risks : [];
      markDirty();
    }
    render();
  }

  // 微短剧节点②·世界观：AI 生成 world_forge（节点02）。同样 await 后重取 live 引用防 autosave 孤立。
  async function aiGenWorld() {
    const w0 = appState.project.world_forge ?? (appState.project.world_forge = {});
    w0.loading = true; w0.error = ""; appState.microGenBusy = "world_forge"; render();
    const opts = { era: w0.input_era || "", place: w0.input_place || "", conflict_type: w0.input_conflict || "" };
    let result;
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "world_forge", projectContext: appState.project, options: opts })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      result = await res.json();
    } catch (e) { result = { error: "生成失败：" + e.message }; }
    const w = appState.project.world_forge ?? (appState.project.world_forge = {});
    appState.microGenBusy = ""; w.loading = false;
    const d = result.choices?.[0]?.data ?? {};
    if (result.error || !d.summary) {
      w.error = result.error || "AI 未返回有效世界观，请重试";
    } else {
      w.summary = d.summary;
      w.rules = (d.rules && typeof d.rules === "object") ? d.rules : {};
      w.conflict_triggers = Array.isArray(d.conflict_triggers) ? d.conflict_triggers : [];
      markDirty();
    }
    render();
  }

  // 微短剧节点③·人物：AI 生成 char_smith（节点03）。live-ref 防孤立。
  async function aiGenChars() {
    const c0 = appState.project.char_smith ?? (appState.project.char_smith = {});
    c0.loading = true; c0.error = ""; appState.microGenBusy = "char_smith"; render();
    const opts = { note: c0.input_note || "" };
    let result;
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "char_smith", projectContext: appState.project, options: opts })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      result = await res.json();
    } catch (e) { result = { error: "生成失败：" + e.message }; }
    const c = appState.project.char_smith ?? (appState.project.char_smith = {});
    appState.microGenBusy = ""; c.loading = false;
    const d = result.choices?.[0]?.data ?? {};
    if (result.error || !d.protagonist) {
      c.error = result.error || "AI 未返回有效人物，请重试";
    } else {
      c.protagonist = (d.protagonist && typeof d.protagonist === "object") ? d.protagonist : {};
      c.supporting = Array.isArray(d.supporting) ? d.supporting : [];
      c.antagonist = (d.antagonist && typeof d.antagonist === "object") ? d.antagonist : {};
      c.relations = d.relations ?? "";
      markDirty();
    }
    render();
  }

  // 微短剧节点④·总框架：AI 生成 plot_frame（节点04）。live-ref 防孤立。
  async function aiGenPlotFrame() {
    const f0 = appState.project.plot_frame ?? (appState.project.plot_frame = {});
    f0.loading = true; f0.error = ""; appState.microGenBusy = "plot_frame"; render();
    const opts = { episodes: f0.input_episodes || "", length: f0.input_length || "" };
    let result;
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "plot_frame", projectContext: appState.project, options: opts })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      result = await res.json();
    } catch (e) { result = { error: "生成失败：" + e.message }; }
    const f = appState.project.plot_frame ?? (appState.project.plot_frame = {});
    appState.microGenBusy = ""; f.loading = false;
    const d = result.choices?.[0]?.data ?? {};
    if (result.error || !Array.isArray(d.event_chain) || d.event_chain.length === 0) {
      f.error = result.error || "AI 未返回有效框架，请重试";
    } else {
      f.event_chain = d.event_chain;
      f.acts = (d.acts && typeof d.acts === "object") ? d.acts : {};
      f.turns = (d.turns && typeof d.turns === "object") ? d.turns : {};
      f.suspense = Array.isArray(d.suspense) ? d.suspense : [];
      markDirty();
    }
    render();
  }

  // 微短剧节点⑥⑦/⑩/⑧/⑪/⑨ 的 AI 生成（统一 live-ref 防孤立模式）
  async function _microGen(key, step, optsFn, validateFn, applyFn) {
    const s0 = appState.project[key] ?? (appState.project[key] = {});
    s0.loading = true; s0.error = ""; appState.microGenBusy = key; render();
    let result;
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, projectContext: appState.project, options: optsFn(s0) })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      result = await res.json();
    } catch (e) { result = { error: "生成失败：" + e.message }; }
    const s = appState.project[key] ?? (appState.project[key] = {});
    appState.microGenBusy = ""; s.loading = false;
    const d = result.choices?.[0]?.data ?? {};
    if (result.error || !validateFn(d)) {
      s.error = result.error || "AI 未返回有效内容，请重试";
    } else { applyFn(s, d); markDirty(); }
    render();
  }
  const aiGenThrill = () => _microGen("thrill", "thrill", () => ({}),
    (d) => Array.isArray(d.main_thrills) && d.main_thrills.length,
    (s, d) => { s.main_thrills = d.main_thrills; s.aux_thrills = d.aux_thrills ?? []; s.release_table = d.release_table ?? []; s.pressure = d.pressure ?? {}; s.reversals = d.reversals ?? []; s.climax = d.climax ?? ""; s.anchors = (d.anchors && typeof d.anchors === "object") ? d.anchors : (s.anchors ?? {}); });
  const aiGenPacePay = () => _microGen("pace_pay", "pace_pay", () => ({}),
    (d) => !!d.ep_template,
    (s, d) => { s.ep_template = d.ep_template; s.zones = d.zones ?? {}; s.pay_nodes = d.pay_nodes ?? []; });
  const aiGenDialogue = () => _microGen("micro_dialogue", "micro_dialogue", (s) => ({ scene: s.input_scene || "" }),
    (d) => Array.isArray(d.rounds) && d.rounds.length,
    (s, d) => { s.setting = d.setting ?? ""; s.rounds = d.rounds; s.golden_line = d.golden_line ?? ""; s.action = d.action ?? ""; });

  // 节点⑤分集设计 · AI 一键铺分集大纲：依据总框架把每集的钩子/爽点/cliffhanger/情节填上。
  async function aiDesignEpisodes() {
    const n0 = (appState.project.episode_board?.episodes ?? []).length;
    if (n0 === 0) return;
    appState.microGenBusy = "episode_design"; render();
    let result;
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "episode_design", projectContext: appState.project, options: { count: n0 } })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      result = await res.json();
    } catch (e) { result = { error: "生成失败：" + e.message }; }
    appState.microGenBusy = "";
    const designs = result.choices?.[0]?.data?.episodes;
    // live-ref：await 后重取当前 episodes，按顺序写入 AI 设计（保留 id/scene_ids/script_full）
    const live = (appState.project.episode_board?.episodes ?? []).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    if (result.error || !Array.isArray(designs) || designs.length === 0) {
      appState.episodeDesignError = result.error || "AI 未返回分集大纲，请重试";
    } else {
      appState.episodeDesignError = "";
      designs.forEach((d, i) => {
        const ep = live[i];
        if (!ep) return;
        if (d.title) ep.title = String(d.title);
        ep.hook_3s = d.hook_3s ?? ep.hook_3s ?? "";
        ep.payoff = d.payoff ?? ep.payoff ?? "";
        ep.cliffhanger = d.cliffhanger ?? ep.cliffhanger ?? "";
        ep.summary = d.summary ?? ep.summary ?? "";
      });
      markDirty();
    }
    render();
  }

  // 流式剧本卷轴 · 单集写本（live-ref 防 autosave 孤立）。承接上一集结尾续写。
  async function aiWriteEpisode(epId) {
    const eps0 = appState.project.episode_board?.episodes ?? [];
    const ep0 = eps0.find((e) => e.id === epId);
    if (!ep0) return;
    ep0.script_loading = true; ep0.error = ""; render();
    const sorted = eps0.slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const idx = sorted.findIndex((e) => e.id === epId);
    const prevTail = idx > 0 ? (sorted[idx - 1].script_full || "") : "";
    const options = {
      episodeNumber: ep0.order_index,
      plan: { hook_3s: ep0.hook_3s, payoff: ep0.payoff, cliffhanger: ep0.cliffhanger, summary: ep0.summary },
      prevTail
    };
    let result;
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "episode_script", projectContext: appState.project, options })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      result = await res.json();
    } catch (e) { result = { error: "生成失败：" + e.message }; }
    // autosave 可能在 await 期间整体重赋 appState.project，重取 live 集引用再写
    const ep = (appState.project.episode_board?.episodes ?? []).find((e) => e.id === epId);
    if (!ep) return;
    ep.script_loading = false;
    const d = result.choices?.[0]?.data ?? {};
    const script = (d.script ?? "").trim();
    if (result.error || !script) {
      ep.error = result.error || "AI 未返回剧本，请重试";
    } else {
      ep.script_full = script;
      ep.status = "scripted";
      ep.error = "";
      markDirty();
    }
    render();
  }

  // 续写下一集：定位首个未写本的集，写它
  async function aiContinueEpisode() {
    const sorted = (appState.project.episode_board?.episodes ?? []).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const target = sorted.find((e) => !(e.script_full || "").trim());
    if (target) await aiWriteEpisode(target.id);
  }

  return {
    aiGenTheme, aiGenWorld, aiGenChars, aiGenPlotFrame,
    aiGenThrill, aiGenPacePay, aiGenDialogue,
    aiDesignEpisodes, aiWriteEpisode, aiContinueEpisode
  };
}
