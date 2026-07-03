// 连续剧形态 AI 生成簇：本季分集设计（季感知）+ 单集拆场。从 microGen 拆出——它本不属微短剧。
// 运行期依赖 render/markDirty 经工厂注入；appState 直接 import。
import { appState } from "../../state.js";
import { list } from "../../utils.js";
import { createId } from "../../shared/projectFactory.js";

export function createSeriesGen({ render, markDirty }) {
  // 连续剧 · AI 设计本季分集（季感知，分批+进度+单批超时）。按 故事核心/季结构/季贯穿 铺本季逐集。
  async function aiDesignSeriesEpisodes() {
    const board = appState.project.episode_board;
    const season = appState.selection?.seasonNumber ?? 1;
    const seasonEps = () => (appState.project.episode_board?.episodes ?? []).filter((e) => (e.season ?? 1) === season).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const total = seasonEps().length;
    if (total === 0) return;
    const throughline = (board?.seasons ?? []).find((s) => s.number === season)?.throughline || "";
    // 思考型模型（glm 系）单批时延方差大，150s 实测 4 集批也会超；对齐单集写本的 240s
    const BATCH = 8, PER_BATCH_TIMEOUT = 240000;
    // 续铺而非重铺：跳过已填好的集，从第一个空集开始——否则超时后重试会把已生成的集整表覆盖
    const filled = (ep) => (ep.hook_3s || ep.payoff || ep.cliffhanger || ep.summary || "").trim().length > 0;
    const firstEmpty = seasonEps().findIndex((ep) => !filled(ep));
    if (firstEmpty === -1) {
      if (!confirm(`本季 ${total} 集大纲都已填写。重新设计将覆盖全部 ${total} 集，继续？`)) return;
    }
    const startAt = firstEmpty === -1 ? 0 : firstEmpty;
    appState.microGenBusy = "episode_design";
    appState.episodeDesignError = "";
    for (let start = startAt; start < total; start += BATCH) {
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
      // 贯穿线/季终钩子为空时用 AI 产出回填——「按季贯穿铺每集」不该在贯穿线缺席下静默进行
      const seasonMeta = (appState.project.episode_board?.seasons ?? []).find((s) => s.number === season);
      const d0 = result.choices?.[0]?.data ?? {};
      if (seasonMeta) {
        if (!(seasonMeta.throughline || "").trim() && (d0.throughline || "").trim()) seasonMeta.throughline = String(d0.throughline).trim();
        if (!(seasonMeta.season_hook || "").trim() && (d0.season_hook || "").trim()) seasonMeta.season_hook = String(d0.season_hook).trim();
      }
      markDirty();
    }
    appState.microGenBusy = "";
    appState.episodeDesignProgress = "";
    render();
  }

  // 连续剧 · 单集拆场：把一集五件套拆成 8-12 场写入 scene_workbench（带 episode_id），
  // 接回既有「场景拆解 / AI 写本场」链——分集大纲与拆场链之间此前没有任何 AI 通路。
  async function aiBreakdownEpisodeScenes(epId) {
    const eps = appState.project.episode_board?.episodes ?? [];
    const ep0 = eps.find((e) => e.id === epId);
    if (!ep0) return;
    if (!(ep0.hook_3s || ep0.summary || ep0.payoff || ep0.cliffhanger || "").trim()) {
      alert("本集大纲还是空的。先填写（或用「AI 设计本季分集」生成）钩子/主线/集尾，再拆场。");
      return;
    }
    const existing = list(appState.project.scene_workbench?.scenes).filter((s) => s.episode_id === epId);
    if (existing.length > 0 && !confirm(`本集已有 ${existing.length} 场。重新拆场会先移除这些场（已写成稿的场会保留），继续？`)) return;
    if (!appState.episodeSceneBusy) appState.episodeSceneBusy = {};
    appState.episodeSceneBusy[epId] = true;
    render();
    let result;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 540000);
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "episode_scene_breakdown", projectContext: appState.project, options: { episodeId: epId } }),
        signal: ctrl.signal
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      result = await res.json();
    } catch (e) { result = { error: e.name === "AbortError" ? "拆场超时，请重试" : "生成失败：" + e.message }; }
    finally { clearTimeout(timer); }
    delete appState.episodeSceneBusy[epId];
    const planned = list(result.choices?.[0]?.data?.scenes);
    if (result.error || planned.length === 0) {
      alert(`本集拆场失败：${result.error || "AI 未返回场景"}`);
      render();
      return;
    }
    // 重取 live 引用（await 期间 autosave 可能整体重赋 project）
    const ep = (appState.project.episode_board?.episodes ?? []).find((e) => e.id === epId);
    if (!ep) return;
    const wb = appState.project.scene_workbench ?? (appState.project.scene_workbench = { scenes: [] });
    if (!Array.isArray(wb.scenes)) wb.scenes = [];
    // 旧场处理：本集未写稿的场移除，已写成稿的保留在原位（绝不丢稿）
    wb.scenes = wb.scenes.filter((s) => s.episode_id !== epId || (s.script_full || "").trim().length > 0);
    // 新建项目的「开场场景」空壳占位：拆出真实场景后清掉
    wb.scenes = wb.scenes.filter((s) => !(
      s.title === "开场场景" &&
      !(s.script_full || s.script_excerpt || "").trim() &&
      list(s.linked_plot_card_ids).length === 0 &&
      ["", "待定地点"].includes((s.location || "").trim())
    ));
    // 集在季结构中的落段：按集序在本季中的比例映射到结构段
    const acts = list(appState.project.structure_profile?.acts);
    const seasonEpsSorted = (appState.project.episode_board?.episodes ?? [])
      .filter((e) => (e.season ?? 1) === (ep.season ?? 1))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const epPos = Math.max(0, seasonEpsSorted.indexOf(ep));
    const actIdx = acts.length ? Math.min(acts.length - 1, Math.floor((epPos / Math.max(1, seasonEpsSorted.length)) * acts.length)) : -1;
    const actId = actIdx >= 0 ? acts[actIdx].id : "";
    const nameToId = new Map(list(appState.project.character_hub?.characters).map((c) => [c.name, c.id]));
    const baseIndex = wb.scenes.length;
    const newIds = [];
    planned.forEach((p, i) => {
      const scene = {
        id: createId("scene"),
        order_index: baseIndex + i + 1,
        title: String(p.title ?? `第${ep.order_index}集 第${i + 1}场`),
        act_id: actId,
        episode_id: epId,
        linked_plot_card_ids: [],
        pov_character_id: nameToId.get(p.pov_name) ?? "",
        location: String(p.location ?? ""),
        time_of_day: String(p.time_of_day ?? ""),
        purpose: String(p.purpose ?? ""),
        obstacle: String(p.obstacle ?? ""),
        beat_summary: String(p.beat_summary ?? ""),
        entry_state: String(p.entry_state ?? ""),
        exit_state: String(p.exit_state ?? ""),
        status: "outline",
        script_excerpt: "",
        notes: ""
      };
      wb.scenes.push(scene);
      newIds.push(scene.id);
    });
    ep.scene_ids = [...list(ep.scene_ids).filter((sid) => wb.scenes.some((s) => s.id === sid)), ...newIds];
    markDirty();
    render();
    alert(`第 ${ep.order_index} 集已拆出 ${newIds.length} 场。\n\n去「场景拆解」可逐场微调，或直接到「剧本撰写」用「AI 写本场 / 批量生成」出稿。`);
  }

  // 连续剧 · AI 铺跨集支线：设计 2-3 条 B/C 线，节拍按集落卡到剧情板支线轨。
  // 支线卡（带 episode_id）会注入下一次「AI 设计本季分集」作为咬合约束。
  async function aiDesignSubplots() {
    const season = appState.selection?.seasonNumber ?? 1;
    const eps = (appState.project.episode_board?.episodes ?? []).filter((e) => (e.season ?? 1) === season);
    if (eps.length === 0) {
      alert("还没有分集。请先在「分集大纲」建立季-集骨架并铺集，再来铺跨集支线。");
      return;
    }
    const existing = list(appState.project.plot_board?.cards).filter((c) => c.episode_id && c.lane_id === "lane_subplot" && !c.deleted_at);
    if (existing.length > 0 && !confirm(`支线轨已有 ${existing.length} 张卡。重新铺支线会移除它们（已锁定的卡保留），继续？`)) return;
    appState.subplotDesignBusy = true;
    render();
    let result;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 240000);
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "series_subplot_design", projectContext: appState.project, options: { season } }),
        signal: ctrl.signal
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      result = await res.json();
    } catch (e) { result = { error: e.name === "AbortError" ? "支线设计超时，请重试" : "生成失败：" + e.message }; }
    finally { clearTimeout(timer); }
    appState.subplotDesignBusy = false;
    const subplots = list(result.choices?.[0]?.data?.subplots);
    if (result.error || subplots.length === 0) {
      alert(`铺支线失败：${result.error || "AI 未返回支线"}`);
      render();
      return;
    }
    const board = appState.project.plot_board ?? (appState.project.plot_board = { cards: [] });
    if (!Array.isArray(board.cards)) board.cards = [];
    board.cards = board.cards.filter((c) => !(c.episode_id && c.lane_id === "lane_subplot" && c.status !== "locked" && !c.deleted_at));
    const epByNo = new Map((appState.project.episode_board?.episodes ?? [])
      .filter((e) => (e.season ?? 1) === season)
      .map((e) => [e.order_index, e]));
    let added = 0;
    subplots.forEach((sp) => {
      list(sp.beats).forEach((b, i) => {
        const ep = epByNo.get(Number(b.ep));
        if (!ep) return;
        board.cards.push({
          id: createId("plot"),
          title: `${sp.name ? `[${sp.name}] ` : ""}${b.title || "支线节拍"}`,
          episode_id: ep.id,
          act_id: "",
          node_id: "",
          lane_id: "lane_subplot",
          lane_kind: "subplot",
          type: "subplot",
          status: "draft",
          summary: b.summary ?? "",
          dramatic_question: sp.arc ?? "",
          conflict: "",
          change: "",
          notes: "",
          character_ids: [],
          impact_tags: [],
          depends_on: [],
          next_ids: [],
          scene_seed_ids: [],
          order_index: i + 1
        });
        added += 1;
      });
    });
    markDirty();
    render();
    alert(`已铺 ${subplots.length} 条支线、${added} 张节拍卡到支线轨。\n\n下次「AI 设计本季分集」会把这些支线拍作为咬合约束注入。`);
  }

  return { aiDesignSeriesEpisodes, aiBreakdownEpisodeScenes, aiDesignSubplots };
}
