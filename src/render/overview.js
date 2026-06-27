import { escapeHtml, list } from "../utils.js";
import { structureTemplateLabels } from "../state.js";

// 项目总览（常驻主页）：把准备三步成果(故事核心/结构/人物)合起来呈现，并作为各步入口。
// 连续剧落地与打开项目时先到这里——给"我做出了什么"的收口 + launchpad。

const ROLE_LABELS = {
  protagonist: "主角", antagonist: "对手", ally: "盟友",
  opponent_ally: "复杂盟友", supporting: "配角"
};
const FORMAT_LABELS = { series: "连续剧", feature: "电影", micro_drama: "微短剧", short: "短片", pilot: "试播" };

function coreLine(label, value) {
  return value && value.trim()
    ? `<div class="ov-core-row"><span class="ov-core-key">${label}</span><span class="ov-core-val">${escapeHtml(value)}</span></div>`
    : "";
}

function editBtn(stepId, text = "去编辑 →") {
  return `<button class="button button--ghost button--tiny" type="button" data-action="go-step" data-id="${stepId}">${text}</button>`;
}

export function renderOverviewPage(dom, appState) {
  if (!dom.overviewContent) return;
  const p = appState.project;
  if (!p) { dom.overviewContent.innerHTML = ""; return; }

  const meta = p.project ?? {};
  const core = p.story_core ?? {};
  const acts = list(p.structure_profile?.acts);
  const tplLabel = structureTemplateLabels[p.structure_profile?.template] ?? p.structure_profile?.template ?? "未设置";
  const chars = list(p.character_hub?.characters);
  const rels = list(p.character_hub?.relationship_map);
  const eps = list(p.episode_board?.episodes);
  const isSeries = meta.format === "series";
  const genres = Array.isArray(meta.genre) ? meta.genre : (meta.genre ? [meta.genre] : []);

  const charsByRole = chars.reduce((acc, c) => {
    const r = c.story_role ?? "supporting";
    (acc[r] = acc[r] ?? []).push(c);
    return acc;
  }, {});
  const roleOrder = ["protagonist", "antagonist", "ally", "opponent_ally", "supporting"];

  const coreBody = [
    coreLine("故事前提", core.premise),
    coreLine("核心冲突", core.core_conflict),
    coreLine("中心问题", core.central_question),
    coreLine("情绪承诺", core.emotional_promise)
  ].filter(Boolean).join("");

  dom.overviewContent.innerHTML = `
    <section class="overview">
      <div class="ov-hero summary-card">
        <div class="ov-hero-top">
          <div>
            <span class="ov-format-badge">${escapeHtml(FORMAT_LABELS[meta.format] ?? meta.format ?? "项目")}</span>
            <h2 class="ov-title">《${escapeHtml(meta.title || "未命名项目")}》</h2>
          </div>
          <button class="step-next-cta" type="button" data-action="go-step" data-id="characters">开始创作 →</button>
        </div>
        ${meta.logline ? `<p class="ov-logline">${escapeHtml(meta.logline)}</p>` : ""}
        ${genres.length ? `<div class="ov-tags">${genres.map((g) => `<span class="ov-tag">${escapeHtml(g)}</span>`).join("")}</div>` : ""}
      </div>

      <div class="ov-grid">
        <div class="summary-card ov-card">
          <div class="list-card__head"><p class="section-label">故事核心</p>${editBtn("structure")}</div>
          ${coreBody || `<p class="ov-empty">还没填故事核心。</p>`}
        </div>

        <div class="summary-card ov-card">
          <div class="list-card__head"><p class="section-label">结构 · ${escapeHtml(tplLabel)}</p>${editBtn("structure")}</div>
          ${acts.length
            ? `<div class="ov-acts">${acts.map((a) => `<span class="ov-act-chip">${escapeHtml(a.title || "阶段")}${a.range_label ? `<em>${escapeHtml(a.range_label)}</em>` : ""}</span>`).join("")}</div>`
            : `<p class="ov-empty">还没有结构。</p>`}
        </div>

        <div class="summary-card ov-card ov-card--wide">
          <div class="list-card__head"><p class="section-label">人物 · ${chars.length} 位</p>${editBtn("characters")}</div>
          ${chars.length
            ? `<div class="ov-roles">${roleOrder.filter((r) => charsByRole[r]).map((r) => `
                <div class="ov-role-group">
                  <span class="ov-role-label">${ROLE_LABELS[r] ?? r}</span>
                  <span class="ov-role-names">${charsByRole[r].map((c) => escapeHtml(c.name || "未命名")).join("、")}</span>
                </div>`).join("")}</div>`
            : `<p class="ov-empty">还没有人物。</p>`}
        </div>

        <div class="summary-card ov-card ov-card--wide">
          <div class="list-card__head"><p class="section-label">进度</p></div>
          <div class="ov-progress">
            <button class="ov-stat" type="button" data-action="go-step" data-id="relationships">
              <span class="ov-stat-num">${rels.length}</span><span class="ov-stat-label">关系网 · 条</span></button>
            ${isSeries ? `<button class="ov-stat" type="button" data-action="go-step" data-id="episodes">
              <span class="ov-stat-num">${eps.length}</span><span class="ov-stat-label">分集 · 集</span></button>` : ""}
          </div>
        </div>
      </div>
    </section>`;
}
