import { escapeHtml, list } from "../utils.js";
import { getEpisodeConfig } from "../modes/registry.js";

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
    ? "连续剧按季管理：每集开场钩子 → 主线推进 → 集尾钩子，并衔接本季贯穿线。"
    : "每集统一四件套：黄金三秒钩子 → 爽点兑付 → 集尾 cliffhanger，付费卡点标记追更付费位。";
  const format = appState.project.project?.format;
  const isMicro = format === "micro_drama";
  // 分集标准(字段口径/是否有付费卡点)由模式注册表声明，不在此判断形态
  const epCfg = getEpisodeConfig(format);
  const EP = epCfg.labels;
  const showPaywall = epCfg.paywall;
  const designing = appState.microGenBusy === "episode_design";
  const designErr = appState.episodeDesignError;
  const header = `
    <div class="list-card__head" style="align-items:flex-start">
      <div>
        <p class="section-label">${labelText}</p>
        <h3>${eps.length} 集 · 已写 ${scriptedCount}${showPaywall ? ` · 付费卡点 ${paywallCount}` : ""}</h3>
        <p class="scene-summary-hint" style="margin-top:4px">${hintText}</p>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
        ${isMicro ? `<button class="button button--primary button--small" type="button" data-action="ai-design-episodes" ${designing ? "disabled" : ""}>${designing ? `AI 设计中…（${appState.episodeDesignProgress || "0/" + eps.length} 集，分批生成）` : "✦ AI 设计分集（按总框架铺钩子/爽点/cliff）"}</button>` : ""}
        ${withSeasons ? `<button class="button button--primary button--small" type="button" data-action="ai-design-season" ${designing ? "disabled" : ""}>${designing ? `AI 设计中…（${appState.episodeDesignProgress || "0/" + eps.length} 集）` : "✦ AI 设计本季分集（按季贯穿铺每集）"}</button>` : ""}
        <button class="button button--ghost button--tiny" type="button" data-action="add-episode">+ 新增一集</button>
      </div>
    </div>
    ${designErr ? `<p class="cf-error" style="margin-top:6px">${escapeHtml(designErr)}</p>` : ""}`;

  // 连续剧全空（刚建项目）：先做季集设置——定季数+每季集数，一键铺季-集骨架，再 AI 设计本季
  if (withSeasons && allEps.length === 0) {
    return `
      <section class="panel-inner"><div class="summary-card">
        <p class="section-label">季集设置</p>
        <h3>先规划季与集，再逐集铺剧情</h3>
        <p class="scene-summary-hint" style="margin-top:4px">连续剧按「季 → 集」管理：先定几季、每季多少集，建出骨架后用「AI 设计本季分集」按季贯穿线逐集铺开场钩子/主线/集尾。</p>
        <div class="form-grid form-grid--compact" style="margin-top:12px;max-width:520px">
          <label class="field"><span>季数</span>
            <input class="cf-input" id="series-season-count" type="number" min="1" max="12" value="1" /></label>
          <label class="field"><span>每季集数</span>
            <input class="cf-input" id="series-ep-count" type="number" min="1" max="60" value="12" /></label>
        </div>
        <div style="margin-top:14px"><button class="button button--primary" type="button" data-action="series-setup-build">建立季-集骨架 →</button></div>
      </div></section>`;
  }

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
          ${showPaywall && ep.paywall_point ? `<span class="ep-script__badge ep-script__badge--ok">💰付费卡点</span>` : ""}
          ${ep.hook_3s ? `<span class="ep-script__preview">🎬 ${escapeHtml(ep.hook_3s)}</span>` : ""}
        </summary>
        <div class="ep-script__body">
          <div style="display:flex;justify-content:flex-end;gap:4px;margin-bottom:8px">
            ${showPaywall ? `<button class="button button--ghost button--tiny ${ep.paywall_point ? "is-active" : ""}" type="button"
              data-action="toggle-episode-paywall" data-id="${escapeHtml(ep.id)}" title="标记/取消付费卡点">${ep.paywall_point ? "💰付费卡点" : "设为付费卡点"}</button>` : ""}
            <button class="button button--ghost button--tiny" type="button" data-action="move-episode-up" data-id="${escapeHtml(ep.id)}" ${idx === 0 ? "disabled" : ""} title="上移">↑</button>
            <button class="button button--ghost button--tiny" type="button" data-action="move-episode-down" data-id="${escapeHtml(ep.id)}" ${idx === eps.length - 1 ? "disabled" : ""} title="下移">↓</button>
            <button class="button button--ghost button--tiny" type="button" data-action="delete-episode" data-id="${escapeHtml(ep.id)}" title="删除本集">✕</button>
          </div>
          <div class="form-grid form-grid--compact">
            <label class="field field--full"><span>本集标题</span>
              <input class="cf-input" type="text" data-action="episode-field" data-field="title" data-id="${escapeHtml(ep.id)}" value="${escapeHtml(ep.title ?? "")}" placeholder="本集标题" /></label>
            <label class="field field--full"><span>${EP.hook}</span>
              <input class="cf-input" type="text" data-action="episode-field" data-field="hook_3s" data-id="${escapeHtml(ep.id)}" value="${escapeHtml(ep.hook_3s ?? "")}" placeholder="${EP.hookPh}" /></label>
            <label class="field field--full"><span>${EP.payoff}</span>
              <input class="cf-input" type="text" data-action="episode-field" data-field="payoff" data-id="${escapeHtml(ep.id)}" value="${escapeHtml(ep.payoff ?? "")}" placeholder="${EP.payoffPh}" /></label>
            <label class="field field--full"><span>${EP.cliff}</span>
              <input class="cf-input" type="text" data-action="episode-field" data-field="cliffhanger" data-id="${escapeHtml(ep.id)}" value="${escapeHtml(ep.cliffhanger ?? "")}" placeholder="${EP.cliffPh}" /></label>
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
