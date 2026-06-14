// 系列库（跨项目世界观）：列表加载、保存、删除，以及创作页第 1 步点选卡的局部更新。
// 从 app.js 外提；运行期依赖（fetchJson / render / saveLocalSnapshot / renderCreationPage）
// 经工厂注入，静态依赖直接 import。
import { appState } from "../state.js";
import { list } from "../utils.js";
import { renderFormatFieldInner, renderGenreFieldInner } from "../render/creationFlow.js";

export function createSeriesLibrary({ fetchJson, render, saveLocalSnapshot, renderCreationPage }) {
  async function loadSeriesLibrary(selectId = null) {
    appState.seriesLibrary = appState.seriesLibrary ?? { list: [], selected: null, loading: false };
    try {
      const payload = await fetchJson("/api/series");
      appState.seriesLibrary.list = payload.series ?? [];
      const targetId = selectId ?? appState.seriesLibrary.selected?.id ?? appState.seriesLibrary.list[0]?.id;
      if (targetId) {
        const detail = await fetchJson(`/api/series/${encodeURIComponent(targetId)}`);
        appState.seriesLibrary.selected = detail.series;
      } else {
        appState.seriesLibrary.selected = null;
      }
    } catch (error) {
      appState.seriesLibrary.list = [];
    }
    render();
  }

  async function saveSelectedSeries() {
    const s = appState.seriesLibrary;
    if (!s?.selected) return;
    s.loading = true; render();
    try {
      const payload = s.selected.id
        ? await fetchJson(`/api/series/${encodeURIComponent(s.selected.id)}`, { method: "PUT", body: JSON.stringify(s.selected) })
        : await fetchJson("/api/series", { method: "POST", body: JSON.stringify(s.selected) });
      s.selected = payload.series;
      const listPayload = await fetchJson("/api/series");
      s.list = listPayload.series ?? s.list;
      // 当前项目若挂载了这个系列，刷新只读视图
      if (appState.project?.project?.series_id === s.selected.id) {
        appState.project.series_bible = s.selected;
      }
    } catch (error) {
      alert(`保存失败：${error.message}`);
    } finally {
      s.loading = false; render();
    }
  }

  // 创作页第 1 步的点选卡局部更新：只换两个容器的 innerHTML，
  // 不整页重绘（整页 innerHTML 替换会让装饰字体/边框重排，视觉上闪一下，
  // 且会丢失正在输入的文本框焦点与页面滚动位置）
  function patchCreationCardFields() {
    const c = appState.creation;
    if (!c) return;
    const fmtEl = document.querySelector("#cf-format-field");
    const genreEl = document.querySelector("#cf-genre-field");
    if (!fmtEl || !genreEl) { renderCreationPage(); return; }
    fmtEl.innerHTML = renderFormatFieldInner(c);
    genreEl.innerHTML = renderGenreFieldInner(c);
    saveLocalSnapshot();
  }

  function handleSeriesAction(action, id, target) {
    const s = appState.seriesLibrary = appState.seriesLibrary ?? { list: [], selected: null, loading: false };
    const sel = s.selected;
    switch (action) {
      case "series-create":
        s.selected = { id: "", name: "新系列", description: "", world_rules: [], timeline_events: [], regulars: [] };
        render();
        return true;
      case "series-select":
        loadSeriesLibrary(id);
        return true;
      case "series-save":
        saveSelectedSeries();
        return true;
      case "series-delete":
        if (!sel) return true;
        if (!confirm(`删除系列「${sel.name}」？挂载它的项目会失去系列注入（项目自身数据不受影响）。`)) return true;
        fetchJson(`/api/series/${encodeURIComponent(sel.id)}`, { method: "DELETE" })
          .then(() => { s.selected = null; loadSeriesLibrary(); })
          .catch((e) => alert(e.message));
        return true;
      case "series-add-rule":
        if (sel) { sel.world_rules = list(sel.world_rules); sel.world_rules.push({ rule_statement: "", scope: "" }); render(); }
        return true;
      case "series-del-rule":
        if (sel) { sel.world_rules.splice(Number(id), 1); render(); }
        return true;
      case "series-add-event":
        if (sel) { sel.timeline_events = list(sel.timeline_events); sel.timeline_events.push({ story_day: sel.timeline_events.length + 1, summary: "" }); render(); }
        return true;
      case "series-del-event":
        if (sel) { sel.timeline_events.splice(Number(id), 1); render(); }
        return true;
      case "series-add-regular":
        if (sel) { sel.regulars = list(sel.regulars); sel.regulars.push({ name: "", role: "", bio: "", voice: "" }); render(); }
        return true;
      case "series-del-regular":
        if (sel) { sel.regulars.splice(Number(id), 1); render(); }
        return true;
      default:
        return false;
    }
  }

  return { loadSeriesLibrary, patchCreationCardFields, handleSeriesAction };
}
