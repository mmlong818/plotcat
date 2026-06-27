import { escapeHtml, list } from "../utils.js";

// 短剧分集板：集为一等公民。每集 = 黄金三秒钩子 / 爽点 / 集尾cliffhanger / 付费卡点 / 关联场。
const STATUS_LABEL = { draft: "草拟", outline: "大纲", scripted: "已写", locked: "锁定" };

export function renderEpisodesPage(dom, appState) {
  if (!dom.episodesContent) return;
  dom.episodesContent.innerHTML = episodeBoardHTML(appState);
}

// 分集板 HTML（可复用：电影工作台 episodes 步[连续剧 season 模式] + 微短剧创作区 ⑤分集 节点[扁平单季]）
export function episodeBoardHTML(appState) {
  const withSeasons = appState.project.project?.format === "series";
  const allEps = list(appState.project.episode_board?.episodes)
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const scenes = list(appState.project.scene_workbench?.scenes);
  const sceneCountOf = (ep) => list(ep.scene_ids).filter((sid) => scenes.some((s) => s.id === sid)).length;

  // 季感知：series 按季分组、本季内 S{n}E{m} 编号；其余形态扁平单季。
  const seasons = list(appState.project.episode_board?.seasons);
  const activeSeason = withSeasons ? (appState.selection.seasonNumber ?? 1) : null;
  const eps = withSeasons ? allEps.filter((e) => (e.season ?? 1) === activeSeason) : allEps;
  const scriptedCount = eps.filter((e) => e.status === "scripted").length;
  const paywallCount = eps.filter((e) => e.paywall_point).length;
  const labelOf = (ep, idxInView) => withSeasons ? `S${ep.season ?? 1}E${idxInView + 1}` : `E${ep.order_index}`;

  const seasonBar = withSeasons ? (() => {
    const meta = seasons.find((s) => s.number === activeSeason) ?? { number: activeSeason, throughline: "", season_hook: "" };
    const tabs = seasons.slice().sort((a, b) => a.number - b.number).map((s) =>
      `<button class="button button--tiny ${s.number === activeSeason ? "button--primary" : "button--ghost"}" type="button" data-action="select-season" data-id="${s.number}">第${s.number}季</button>`
    ).join("");
    return `
      <div class="summary-card" style="margin-bottom:10px">
        <div class="list-card__head" style="align-items:center">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${tabs}
            <button class="button button--ghost button--tiny" type="button" data-action="add-season" title="新增一季">+ 新增一季</button>
          </div>
        </div>
        <div class="form-grid form-grid--compact" style="margin-top:8px">
          <label class="field field--full"><span>第${activeSeason}季·贯穿线（本季的主线推进与人物弧）</span>
            <input class="cf-input" type="text" data-action="season-field" data-field="throughline" value="${escapeHtml(meta.throughline ?? "")}" placeholder="本季从哪推进到哪、核心矛盾与赌注" /></label>
          <label class="field field--full"><span>季终钩子（引向下一季）</span>
            <input class="cf-input" type="text" data-action="season-field" data-field="season_hook" value="${escapeHtml(meta.season_hook ?? "")}" placeholder="本季结尾留什么大钩子勾住下一季" /></label>
        </div>
      </div>`;
  })() : "";

  const labelText = withSeasons ? `第${activeSeason}季 · 分集表` : "分集表 · 短剧按集量产";
  const hintText = withSeasons
    ? "连续剧按季管理：每集黄金三秒钩子 → 爽点 → 集尾 cliffhanger，并衔接本季贯穿线。"
    : "每集统一四件套：黄金三秒钩子 → 爽点兑付 → 集尾 cliffhanger，付费卡点标记追更付费位。";
  const isMicro = appState.project.project?.format === "micro_drama";
  const designing = appState.microGenBusy === "episode_design";
  const designErr = appState.episodeDesignError;
  const header = `
    <div class="list-card__head" style="align-items:flex-start">
      <div>
        <p class="section-label">${labelText}</p>
        <h3>${eps.length} 集 · 已写 ${scriptedCount} · 付费卡点 ${paywallCount}</h3>
        <p class="scene-summary-hint" style="margin-top:4px">${hintText}</p>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
        ${isMicro ? `<button class="button button--primary button--small" type="button" data-action="ai-design-episodes" ${designing ? "disabled" : ""}>${designing ? `AI 设计中…（${appState.episodeDesignProgress || "0/" + eps.length} 集，分批生成）` : "✦ AI 设计分集（按总框架铺钩子/爽点/cliff）"}</button>` : ""}
        ${withSeasons ? `<button class="button button--primary button--small" type="button" data-action="ai-design-season" ${designing ? "disabled" : ""}>${designing ? `AI 设计中…（${appState.episodeDesignProgress || "0/" + eps.length} 集）` : "✦ AI 设计本季分集（按季贯穿铺每集）"}</button>` : ""}
        <button class="button button--ghost button--tiny" type="button" data-action="add-episode">+ 新增一集</button>
      </div>
    </div>
    ${designErr ? `<p class="cf-error" style="margin-top:6px">${escapeHtml(designErr)}</p>` : ""}`;

  if (eps.length === 0) {
    return `
      <section class="panel-inner">${seasonBar}<div class="summary-card">${header}
        <p class="scene-summary-hint" style="margin-top:10px">${withSeasons ? `第${activeSeason}季还没有分集。点「+ 新增一集」开始。` : "还没有分集。点「+ 新增一集」开始，或在创作流用「分集大纲」一次性批量起集。"}</p>
      </div></section>`;
  }

  const rows = eps.map((ep, idx) => {
    const sel = appState.selection.episodeId === ep.id;
    const sc = sceneCountOf(ep);
    const filled = (ep.hook_3s || ep.payoff || ep.cliffhanger || ep.summary || "").trim().length > 0;
    return `
      <details class="ep-script" ${sel ? "open" : ""}>
        <summary class="ep-script__sum">
          <span class="ep-script__no">${labelOf(ep, idx)}</span>
          <span class="ep-script__title">${escapeHtml(ep.title || "未命名")}</span>
          <span class="ep-script__badge ${filled ? "ep-script__badge--ok" : ""}">${STATUS_LABEL[ep.status] ?? ep.status}</span>
          ${sc > 0 ? `<span class="ep-script__badge">${sc}场</span>` : `<span class="ep-script__badge" style="color:#c0622a">⚠无场</span>`}
          ${ep.paywall_point ? `<span class="ep-script__badge ep-script__badge--ok">💰付费卡点</span>` : ""}
          ${ep.hook_3s ? `<span class="ep-script__preview">🎬 ${escapeHtml(ep.hook_3s)}</span>` : ""}
        </summary>
        <div class="ep-script__body">
          <div style="display:flex;justify-content:flex-end;gap:4px;margin-bottom:8px">
            <button class="button button--ghost button--tiny ${ep.paywall_point ? "is-active" : ""}" type="button"
              data-action="toggle-episode-paywall" data-id="${escapeHtml(ep.id)}" title="标记/取消付费卡点">${ep.paywall_point ? "💰付费卡点" : "设为付费卡点"}</button>
            <button class="button button--ghost button--tiny" type="button" data-action="move-episode-up" data-id="${escapeHtml(ep.id)}" ${idx === 0 ? "disabled" : ""} title="上移">↑</button>
            <button class="button button--ghost button--tiny" type="button" data-action="move-episode-down" data-id="${escapeHtml(ep.id)}" ${idx === eps.length - 1 ? "disabled" : ""} title="下移">↓</button>
            <button class="button button--ghost button--tiny" type="button" data-action="delete-episode" data-id="${escapeHtml(ep.id)}" title="删除本集">✕</button>
          </div>
          <div class="form-grid form-grid--compact">
            <label class="field field--full"><span>本集标题</span>
              <input class="cf-input" type="text" data-action="episode-field" data-field="title" data-id="${escapeHtml(ep.id)}" value="${escapeHtml(ep.title ?? "")}" placeholder="本集标题" /></label>
            <label class="field field--full"><span>黄金三秒钩子（开场抓人）</span>
              <input class="cf-input" type="text" data-action="episode-field" data-field="hook_3s" data-id="${escapeHtml(ep.id)}" value="${escapeHtml(ep.hook_3s ?? "")}" placeholder="前3秒用什么钩住观众" /></label>
            <label class="field field--full"><span>本集爽点</span>
              <input class="cf-input" type="text" data-action="episode-field" data-field="payoff" data-id="${escapeHtml(ep.id)}" value="${escapeHtml(ep.payoff ?? "")}" placeholder="本集要兑付的爽/虐点" /></label>
            <label class="field field--full"><span>集尾 cliffhanger</span>
              <input class="cf-input" type="text" data-action="episode-field" data-field="cliffhanger" data-id="${escapeHtml(ep.id)}" value="${escapeHtml(ep.cliffhanger ?? "")}" placeholder="结尾留什么钩子逼观众追下一集" /></label>
            <label class="field field--full"><span>本集梗概</span>
              <textarea class="cf-textarea" rows="2" data-action="episode-field" data-field="summary" data-id="${escapeHtml(ep.id)}" placeholder="本集主要情节">${escapeHtml(ep.summary ?? "")}</textarea></label>
          </div>
        </div>
      </details>`;
  }).join("");

  return `
    <section class="panel-inner">
      ${seasonBar}
      <div class="summary-card">${header}</div>
      <div class="episode-list" style="margin-top:12px">${rows}</div>
    </section>`;
}
