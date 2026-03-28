// src/render/structureLibrary.js
import { escapeHtml } from "../utils.js";
import { STORY_STRUCTURE_LIBRARY, STRUCTURE_LIBRARY_TAGS } from "../data/storyStructureLibrary.js";

function renderStructureCard(struct) {
  const builtInBadge = struct.builtInKey
    ? `<span class="chip chip--soft lib-card__badge">已内置</span>`
    : "";
  const actPills = struct.acts
    .map((act) => `<span class="lib-act-pill">${escapeHtml(act.title)}</span>`)
    .join("");
  const tagChips = struct.tags
    .map((tag) => `<span class="tag lib-tag-item">${escapeHtml(tag)}</span>`)
    .join("");
  const nodeCount = struct.nodes.length;
  return `
    <article class="lib-card" data-tags="${escapeHtml(struct.tags.join(","))}">
      <div class="lib-card__head">
        <div class="lib-card__title-group">
          <h3 class="lib-card__name">${escapeHtml(struct.name)}</h3>
          <p class="lib-card__en">${escapeHtml(struct.englishName)}</p>
        </div>
        ${builtInBadge}
      </div>
      <p class="lib-card__desc">${escapeHtml(struct.description)}</p>
      <div class="lib-card__tags">${tagChips}</div>
      <div class="lib-card__acts">${actPills}</div>
      <div class="lib-card__footer">
        <span class="lib-card__meta">${struct.acts.length} 幕 · ${nodeCount} 节点</span>
        <button
          class="button button--primary button--small"
          type="button"
          data-action="apply-library-structure"
          data-id="${escapeHtml(struct.id)}"
        >套用结构</button>
      </div>
    </article>
  `;
}

export function renderStructureLibraryDialog(filterTag = "all") {
  const filtered = filterTag === "all"
    ? STORY_STRUCTURE_LIBRARY
    : STORY_STRUCTURE_LIBRARY.filter((s) => s.tags.includes(filterTag));

  const tagButtons = ["all", ...STRUCTURE_LIBRARY_TAGS]
    .map((tag) => `
      <button
        class="lib-filter-btn ${tag === filterTag ? "is-active" : ""}"
        type="button"
        data-action="filter-library"
        data-tag="${escapeHtml(tag)}"
      >${tag === "all" ? "全部 (29)" : escapeHtml(tag)}</button>
    `)
    .join("");

  const cards = filtered.map(renderStructureCard).join("");

  return `
    <div class="lib-filter-bar">${tagButtons}</div>
    <div class="lib-grid">${cards}</div>
  `;
}
