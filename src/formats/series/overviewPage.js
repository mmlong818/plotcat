import { escapeHtml, list } from "../../utils.js";
import { structureTemplateLabels, storyRoleLabels } from "../../state.js";

// 项目总览（常驻主页）：把准备三步成果(故事核心/结构/人物)合起来呈现，并作为各步入口。
// 连续剧落地与打开项目时先到这里——给"我做出了什么"的收口 + launchpad。

const FORMAT_LABELS = { series: "连续剧", feature: "电影", micro_drama: "微短剧", short: "短片", pilot: "试播" };

function coreLine(label, value) {
  return value && value.trim()
    ? `<div class="ov-core-row"><span class="ov-core-key">${label}</span><span class="ov-core-val">${escapeHtml(value)}</span></div>`
    : "";
}

function editBtn(stepId, text = "去编辑 →") {
  return `<button class="button button--ghost button--tiny" type="button" data-action="go-step" data-id="${stepId}">${text}</button>`;
}

// 连续剧季阶段：有分集就映射成集数区间(开季段·第1–3集)，否则只呈现阶段弧(名字)。
// 百分比是电影时长思维，对剧集不直观——精确占比留在结构骨架详情步。
function actEpisodeRanges(acts, epCount) {
  let prevEnd = 0;
  return acts.map((a) => {
    const m = String(a.range_label || "").match(/(\d+)\s*%?\s*[-–~]\s*(\d+)/);
    const endPct = m ? Number(m[2]) : 0;
    const start = prevEnd + 1;
    let end = Math.max(start, Math.round((endPct / 100) * epCount));
    end = Math.min(end, epCount);
    prevEnd = end;
    return { title: a.title || "阶段", label: start === end ? `第${start}集` : `第${start}–${end}集` };
  });
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
  // 用 state 的权威角色顺序，未知 role 排末尾——保证所有角色都呈现，不漏
  const roleRank = Object.keys(storyRoleLabels);
  const roleOrder = Object.keys(charsByRole)
    .sort((a, b) => ((roleRank.indexOf(a) + 1 || 999) - (roleRank.indexOf(b) + 1 || 999)));

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
            ? (eps.length > 0
                ? `<div class="ov-acts">${actEpisodeRanges(acts, eps.length).map((a) => `<span class="ov-act-chip">${escapeHtml(a.title)}<em>${escapeHtml(a.label)}</em></span>`).join("")}</div>`
                : `<div class="ov-arc">${acts.map((a) => `<span class="ov-arc-node">${escapeHtml(a.title || "阶段")}</span>`).join('<span class="ov-arc-sep">→</span>')}</div>`)
            : `<p class="ov-empty">还没有结构。</p>`}
        </div>

        <div class="summary-card ov-card ov-card--wide">
          <div class="list-card__head"><p class="section-label">人物 · ${chars.length} 位</p>${editBtn("characters")}</div>
          ${chars.length
            ? `<div class="ov-char-grid">${roleOrder.flatMap((r) => charsByRole[r].map((c) => {
                const arc = (c.arc_start || c.arc_end) ? `${escapeHtml(c.arc_start || "?")} → ${escapeHtml(c.arc_end || "?")}` : "";
                return `
                <div class="ov-char-card">
                  <div class="ov-char-head">
                    <span class="ov-char-name">${escapeHtml(c.name || "未命名")}</span>
                    <span class="ov-char-role-badge">${escapeHtml(storyRoleLabels[r] ?? r)}</span>
                    ${c.archetype ? `<span class="ov-char-arch">${escapeHtml(c.archetype)}</span>` : ""}
                  </div>
                  ${c.external_goal ? `<p class="ov-char-line"><span class="ov-char-k">想要</span>${escapeHtml(c.external_goal)}</p>` : ""}
                  ${c.dramatic_need ? `<p class="ov-char-line"><span class="ov-char-k">需要</span>${escapeHtml(c.dramatic_need)}</p>` : ""}
                  ${arc ? `<p class="ov-char-line"><span class="ov-char-k">弧光</span>${arc}</p>` : ""}
                </div>`;
              })).join("")}</div>`
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
