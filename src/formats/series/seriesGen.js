// 连续剧形态 AI 生成簇：本季分集设计（季感知）。从 microGen 拆出——它本不属微短剧。
// 运行期依赖 render/markDirty 经工厂注入；appState 直接 import。
import { appState } from "../../state.js";

export function createSeriesGen({ render, markDirty }) {
  // 连续剧 · AI 设计本季分集（季感知，分批+进度+单批超时）。按 故事核心/季结构/季贯穿 铺本季逐集。
  async function aiDesignSeriesEpisodes() {
    const board = appState.project.episode_board;
    const season = appState.selection?.seasonNumber ?? 1;
    const seasonEps = () => (appState.project.episode_board?.episodes ?? []).filter((e) => (e.season ?? 1) === season).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const total = seasonEps().length;
    if (total === 0) return;
    const throughline = (board?.seasons ?? []).find((s) => s.number === season)?.throughline || "";
    const BATCH = 8, PER_BATCH_TIMEOUT = 150000;
    appState.microGenBusy = "episode_design";
    appState.episodeDesignError = "";
    for (let start = 0; start < total; start += BATCH) {
      const from = start + 1, to = Math.min(start + BATCH, total);
      appState.episodeDesignProgress = `${start}/${total}`;
      render();
      const liveBefore = seasonEps();
      const prev = start > 0 ? liveBefore[start - 1] : null;
      const priorTail = prev ? `《${prev.title || ""}》${prev.cliffhanger || prev.summary || ""}` : "";
      let result;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), PER_BATCH_TIMEOUT);
      try {
        const res = await fetch("/api/generate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: "series_episode_design", projectContext: appState.project, options: { season, from, to, count: total, throughline, priorTail } }),
          signal: ctrl.signal
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        result = await res.json();
      } catch (e) { result = { error: e.name === "AbortError" ? `第 ${from}-${to} 集生成超时` : "生成失败：" + e.message }; }
      finally { clearTimeout(timer); }
      const designs = result.choices?.[0]?.data?.episodes;
      if (result.error || !Array.isArray(designs) || designs.length === 0) {
        appState.episodeDesignError = `${result.error || "AI 未返回分集大纲"}（已完成 ${start}/${total} 集，可重试续铺）`;
        break;
      }
      const live = seasonEps();
      designs.forEach((d, i) => {
        const ep = live[start + i];
        if (!ep || start + i >= to) return;
        if (d.title) ep.title = String(d.title);
        ep.hook_3s = d.hook_3s ?? ep.hook_3s ?? "";
        ep.payoff = d.payoff ?? ep.payoff ?? "";
        ep.cliffhanger = d.cliffhanger ?? ep.cliffhanger ?? "";
        ep.summary = d.summary ?? ep.summary ?? "";
      });
      markDirty();
    }
    appState.microGenBusy = "";
    appState.episodeDesignProgress = "";
    render();
  }

  return { aiDesignSeriesEpisodes };
}
