import { escapeHtml, inputField, textareaField, selectField, list, renderEmptyState } from "../utils.js";

function renderGenreItems(items = [], actionPrefix = "convention", emptyMessage = "还没有内容。") {
  if (items.length === 0) {
    return renderEmptyState(emptyMessage);
  }
  return `
    <div class="stack">
      ${items
        .map(
          (item) => `
            <article class="list-select list-select--static">
              <strong>${escapeHtml(item.name || "未命名条目")}</strong>
              <span>${escapeHtml(item.status || item.description || "")}</span>
              <div class="form-grid form-grid--compact">
                ${inputField("名称", `${actionPrefix}-field`, "name", item.name)}
                ${
                  actionPrefix === "convention"
                    ? selectField("状态", `${actionPrefix}-field`, "status", item.status, [
                        ["required", "必备"],
                        ["optional", "可选"]
                      ])
                    : ""
                }
                ${textareaField("说明", `${actionPrefix}-field`, "description", item.description, { rows: 3 })}
              </div>
              <div class="inline-actions">
                <button class="button button--ghost button--tiny" type="button" data-action="delete-${escapeHtml(actionPrefix)}" data-id="${escapeHtml(item.id)}">删除</button>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

export function renderGenresPage(dom, appState) {
  const profile = appState.project.genre_profile;
  dom.genresContent.innerHTML = `
    <section class="genre-workbench">
      <div class="summary-card">
        <p class="section-label">类型定位</p>
        <div class="form-grid">
          ${inputField("主类型", "genre-field", "primary_genre", profile.primary_genre)}
          ${inputField("副类型", "genre-field", "secondary_genres_text", list(profile.secondary_genres).join("、"))}
          ${textareaField("观众承诺", "genre-field", "audience_promise", profile.audience_promise, { rows: 3 })}
          ${inputField("气质词", "genre-field", "tone_words_text", list(profile.tone_words).join("、"), { full: true })}
        </div>
      </div>
      <div class="genre-workbench__grid">
        <div class="summary-card">
          <div class="list-card__head">
            <h3>类型常规</h3>
            <button class="button button--ghost button--tiny" type="button" data-action="add-convention">新增常规</button>
          </div>
          ${renderGenreItems(list(profile.conventions), "convention", "先写下这一类作品必须兑现的期待。")}
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>类型禁区</h3>
            <button class="button button--ghost button--tiny" type="button" data-action="add-taboo">新增禁区</button>
          </div>
          ${renderGenreItems(list(profile.taboos), "taboo", "先写下不该踩的类型雷区。")}
        </div>
      </div>
    </section>
  `;
}
