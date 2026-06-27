import { ctx } from "./context.js";
import { appState } from "../state.js";
import { list } from "../utils.js";

// 短剧「集(episode)」CRUD。集是一等公民：黄金三秒钩子/爽点/集尾cliffhanger/付费卡点。
function episodes() {
  if (!appState.project.episode_board) appState.project.episode_board = { episodes: [] };
  if (!Array.isArray(appState.project.episode_board.episodes)) appState.project.episode_board.episodes = [];
  return appState.project.episode_board.episodes;
}
function getEpisode(id = appState.selection.episodeId) {
  return episodes().find((e) => e.id === id) ?? null;
}
function reindex() {
  episodes().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .forEach((e, i) => { e.order_index = i + 1; });
}

function seasons() {
  const board = appState.project.episode_board ?? (appState.project.episode_board = { episodes: [], seasons: [] });
  if (!Array.isArray(board.seasons) || board.seasons.length === 0) board.seasons = [{ number: 1, throughline: "", season_hook: "" }];
  return board.seasons;
}

export function handleEpisodeClick(action, target, id, nodeId) {
  if (action === "add-episode") {
    const isSeries = appState.project.project?.format === "series";
    const season = isSeries ? (appState.selection.seasonNumber ?? 1) : 1;
    const eps = episodes();
    const inSeason = eps.filter((e) => (e.season ?? 1) === season).length;
    const ep = {
      id: `ep_${Date.now().toString(36)}_${eps.length + 1}`,
      order_index: eps.length + 1,
      season,
      title: isSeries ? `S${season}E${inSeason + 1}` : `第${eps.length + 1}集`,
      hook_3s: "",
      payoff: "",
      cliffhanger: "",
      paywall_point: false,
      summary: "",
      status: "draft",
      scene_ids: []
    };
    eps.push(ep);
    appState.selection.episodeId = ep.id;
    ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "add-season") {
    const ss = seasons();
    const next = Math.max(0, ...ss.map((s) => s.number ?? 0)) + 1;
    ss.push({ number: next, throughline: "", season_hook: "" });
    appState.selection.seasonNumber = next;
    ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "select-season") { appState.selection.seasonNumber = Number(id) || 1; ctx.render(); return true; }
  if (action === "ai-design-season") { ctx.aiDesignSeriesEpisodes(); return true; }  // 连续剧·AI设计本季分集
  if (action === "select-episode") { appState.selection.episodeId = id; ctx.render(); return true; }
  if (action === "toggle-episode-paywall") {
    const ep = getEpisode(id);
    if (ep) { ep.paywall_point = !ep.paywall_point; ctx.markDirty(); ctx.render(); }
    return true;
  }
  if (action === "move-episode-up" || action === "move-episode-down") {
    const eps = episodes().slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const i = eps.findIndex((e) => e.id === id);
    const j = action === "move-episode-up" ? i - 1 : i + 1;
    if (i >= 0 && j >= 0 && j < eps.length) {
      const a = eps[i].order_index, b = eps[j].order_index;
      eps[i].order_index = b; eps[j].order_index = a;
      reindex();
      ctx.markDirty(); ctx.render();
    }
    return true;
  }
  if (action === "delete-episode") {
    const ep = getEpisode(id);
    if (!ep) return true;
    const linked = list(ep.scene_ids).length;
    const note = linked ? `\n本集关联 ${linked} 个场景，将解除关联（场景本身保留）。` : "";
    if (!confirm(`删除「${ep.title || "未命名集"}」？此操作不可恢复。${note}`)) return true;
    // 解除场景关联，不删场景
    list(appState.project.scene_workbench?.scenes).forEach((s) => { if (s.episode_id === ep.id) s.episode_id = ""; });
    appState.project.episode_board.episodes = episodes().filter((e) => e.id !== ep.id);
    if (appState.selection.episodeId === ep.id) appState.selection.episodeId = null;
    reindex();
    ctx.markDirty(); ctx.render();
    return true;
  }
  return false;
}
