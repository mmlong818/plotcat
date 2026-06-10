import { escapeHtml, list, renderEmptyState, isBrokenPlaceholderText, sanitizeTextField } from "../utils.js";
import { sceneStatusLabels } from "../state.js";

function sceneStatusDot(status) {
  const map = { draft: "draft", outline: "active", locked: "locked", scripted: "done" };
  const cls = map[status] ?? "draft";
  return `<span class="status-dot status-dot--${cls}"></span>`;
}

function renderPlotChecklist(appState, selectedIds = []) {
  const selected = new Set(list(selectedIds));
  return `
    <div class="scene-plot-chips">
      ${list(appState.project.plot_board?.cards)
        .filter((c) => !c.deleted_at)
        .map(
          (card) => `
            <div class="scene-plot-chip-row ${selected.has(card.id) ? "is-active" : ""}">
              <label class="scene-plot-chip">
                <input
                  type="checkbox"
                  data-action="scene-plot-toggle"
                  data-id="${escapeHtml(card.id)}"
                  ${selected.has(card.id) ? "checked" : ""}
                />
                <span>${escapeHtml(card.title || "未命名剧情卡")}</span>
              </label>
              ${selected.has(card.id) ? `<button class="scene-plot-jump" type="button" data-action="jump-to-plot-card" data-id="${escapeHtml(card.id)}" title="跳转到该剧情卡">→</button>` : ""}
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

export function renderScenesPage(dom, appState, { getScene, getSceneLinkedPlotCards, getSceneLinkedCharacters, getActTitle }) {
  if (!dom.scenesContent) {
    return;
  }
  const selectedScene = getScene();
  const scenes = list(appState.project.scene_workbench?.scenes)
    .slice()
    .sort((left, right) => (left.order_index ?? 0) - (right.order_index ?? 0));
  const linkedPlotCards = getSceneLinkedPlotCards(selectedScene);
  const linkedCharacters = getSceneLinkedCharacters(selectedScene);
  dom.scenesContent.innerHTML = `
    <section class="scene-workbench scene-workbench--triple">
      <aside class="workbench-pane workbench-pane--rail">
        <div class="summary-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">场景导航</p>
              <h3>场景列表</h3>
            </div>
            <div style="display:flex; gap:6px">
              <button class="button button--ghost button--tiny" type="button" data-action="ai-expand-scenes" ${appState.sceneExpandLoading ? "disabled" : ""} title="把剧情卡拆成 2-4 场/卡的全片场景表，凑齐作品形态标准场数">${appState.sceneExpandLoading ? "规划中…" : "✦ AI 规划场景表"}</button>
              <button class="button button--ghost button--tiny" type="button" data-action="add-scene">新增场景</button>
            </div>
          </div>
          <div class="stack workbench-scroll-list">
            ${scenes
              .map(
                (scene) => `
                  <button class="list-select scene-row ${scene.id === appState.selection.sceneId ? "is-active" : ""}" type="button" data-action="select-scene" data-id="${escapeHtml(scene.id)}">
                    <span class="scene-row__num">${String(scene.order_index || 0).padStart(2, "0")}</span>
                    <span class="scene-row__body">
                      <span class="scene-row__title">${escapeHtml(scene.title || "未命名场景")}</span>
                      <span class="scene-row__meta">${escapeHtml(getActTitle(scene.act_id))} · ${sceneStatusDot(scene.status)}${escapeHtml(sceneStatusLabels[scene.status] ?? scene.status)}${list(scene.linked_plot_card_ids).length === 0 && !(scene.purpose || "").trim() ? ` · <span class="scene-row__orphan" title="本场未关联任何剧情卡且没有场景目的，可能游离于故事主线之外">⚠ 游离场</span>` : ""}</span>
                    </span>
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
      </aside>
      <div class="workbench-pane workbench-pane--main">
        ${
          !selectedScene
            ? `<div class="summary-card">${renderEmptyState("还没有选择场景", "点击左侧列表中的场景开始编辑")}</div>`
            : (() => {
                const acts = list(appState.project.structure_profile?.acts);
                const characters = list(appState.project.character_hub?.characters);
                const povChar = characters.find((c) => c.id === selectedScene.pov_character_id);
                const allChars = characters;
                const linkedIds = new Set(linkedCharacters.map((c) => c.id));
                const sceneText = [selectedScene.purpose, selectedScene.obstacle, selectedScene.beat_summary, selectedScene.script_excerpt].filter(Boolean).join(" ");
                const mentioned = sceneText ? allChars.filter((c) => {
                  if (linkedIds.has(c.id)) return false;
                  const name = (c.name || "").trim();
                  return name.length >= 2 && sceneText.includes(name);
                }) : [];
                return `
                  <section class="scene-edv2">
                    <header class="scene-edv2__topbar">
                      <nav class="scene-edv2__breadcrumb">
                        <select class="scene-edv2__bc-select" data-action="scene-field" data-field="act_id" title="所属幕">
                          ${acts.map((act) => `<option value="${escapeHtml(act.id)}" ${act.id === selectedScene.act_id ? "selected" : ""}>${escapeHtml(act.title)}</option>`).join("")}
                        </select>
                        <span class="scene-edv2__bc-sep">·</span>
                        <span class="scene-edv2__bc-pov-label">视角</span>
                        <select class="scene-edv2__bc-select" data-action="scene-field" data-field="pov_character_id" title="视角人物">
                          <option value="">未指定</option>
                          ${characters.map((c) => `<option value="${escapeHtml(c.id)}" ${c.id === selectedScene.pov_character_id ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
                        </select>
                      </nav>
                      <div class="scene-edv2__topbar-actions">
                        <button class="scene-edv2__ai-btn" type="button" data-action="ai-breakdown-scene" data-id="${escapeHtml(selectedScene.id)}" ${appState.sceneBreakdownLoading?.[selectedScene.id] ? "disabled" : ""} title="基于关联剧情卡和 POV 自动填进入/离开状态、阻力、转折">${appState.sceneBreakdownLoading?.[selectedScene.id] ? "拆解中…" : "✦ AI 拆这场"}</button>
                        <button class="scene-edv2__danger" type="button" data-action="delete-scene" data-id="${escapeHtml(selectedScene.id)}">🗑 删除场景</button>
                      </div>
                    </header>

                    <input class="scene-edv2__title" type="text"
                      data-action="scene-field" data-field="title"
                      value="${escapeHtml(selectedScene.title)}" placeholder="未命名场景…" />

                    <div class="scene-edv2__meta-row">
                      <label class="scene-edv2__inline">
                        <span class="scene-edv2__inline-label">地点</span>
                        <input class="scene-edv2__inline-input" type="text"
                          data-action="scene-field" data-field="location"
                          value="${escapeHtml(isBrokenPlaceholderText(selectedScene.location) ? "" : selectedScene.location)}"
                          placeholder="—" />
                      </label>
                      <label class="scene-edv2__inline">
                        <span class="scene-edv2__inline-label">时段</span>
                        <input class="scene-edv2__inline-input" type="text"
                          data-action="scene-field" data-field="time_of_day"
                          value="${escapeHtml(isBrokenPlaceholderText(selectedScene.time_of_day) ? "" : selectedScene.time_of_day)}"
                          placeholder="—" />
                      </label>
                      <label class="scene-edv2__inline">
                        <span class="scene-edv2__inline-label">状态</span>
                        <select class="scene-edv2__inline-select" data-action="scene-field" data-field="status">
                          ${Object.entries(sceneStatusLabels).map(([k, label]) => `<option value="${escapeHtml(k)}" ${k === selectedScene.status ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
                        </select>
                      </label>
                    </div>

                    <div class="scene-edv2__field">
                      <label class="scene-edv2__field-label">关联剧情卡 <span class="scene-edv2__field-hint">${linkedPlotCards.length} 张</span></label>
                      ${renderPlotChecklist(appState, selectedScene.linked_plot_card_ids)}
                    </div>

                    ${mentioned.length > 0 ? `
                      <div class="scene-edv2__alert">
                        <span class="scene-edv2__alert-icon">⚠</span>
                        <span class="scene-edv2__alert-text">文本中提到但未加入出场：</span>
                        <div class="scene-edv2__alert-chips">
                          ${mentioned.map((c) => `<button class="scene-edv2__alert-chip" type="button" data-action="jump-to-character" data-id="${escapeHtml(c.id)}">${escapeHtml(c.name)}</button>`).join("")}
                        </div>
                      </div>
                    ` : ""}

                    <div class="scene-edv2__field">
                      <label class="scene-edv2__field-label">场景目的</label>
                      <textarea class="scene-edv2__input" rows="3"
                        data-action="scene-field" data-field="purpose"
                        placeholder="本场谁要做什么，赌的是什么">${escapeHtml(selectedScene.purpose || "")}</textarea>
                    </div>

                    <div class="scene-edv2__field">
                      <label class="scene-edv2__field-label">阻力</label>
                      <textarea class="scene-edv2__input" rows="3"
                        data-action="scene-field" data-field="obstacle"
                        placeholder="谁挡了路、挡得多狠">${escapeHtml(selectedScene.obstacle || "")}</textarea>
                    </div>

                    <div class="scene-edv2__field">
                      <label class="scene-edv2__field-label">转折 / 变化</label>
                      <textarea class="scene-edv2__input" rows="3"
                        data-action="scene-field" data-field="beat_summary"
                        placeholder="进出这场后，世界/角色变了哪里">${escapeHtml(selectedScene.beat_summary || "")}</textarea>
                    </div>

                    <details class="scene-edv2__drama" ${(selectedScene.conflict_proposition || selectedScene.subtext_goal || selectedScene.arc_beat) ? "open" : ""}>
                      <summary>戏剧判断 <span class="scene-edv2__field-hint">（AI 写本场会强制使用）</span></summary>
                      <div class="scene-edv2__field" style="margin-top:10px">
                        <label class="scene-edv2__field-label">冲突主张</label>
                        <textarea class="scene-edv2__input" rows="2"
                          data-action="scene-field" data-field="conflict_proposition"
                          placeholder="谁要什么 / 谁挡着 / 赌注是什么（三层一齐写）">${escapeHtml(selectedScene.conflict_proposition || "")}</textarea>
                      </div>
                      <div class="scene-edv2__field">
                        <label class="scene-edv2__field-label">潜台词目标</label>
                        <textarea class="scene-edv2__input" rows="2"
                          data-action="scene-field" data-field="subtext_goal"
                          placeholder="角色嘴上说 X，心里要 Y——X 和 Y 分别是什么">${escapeHtml(selectedScene.subtext_goal || "")}</textarea>
                      </div>
                      <div class="scene-edv2__field">
                        <label class="scene-edv2__field-label">弧光位置</label>
                        <textarea class="scene-edv2__input" rows="2"
                          data-action="scene-field" data-field="arc_beat"
                          placeholder="本场主角的弧光从 A 推进到 B（A 是上一场离开时的位置）">${escapeHtml(selectedScene.arc_beat || "")}</textarea>
                      </div>
                    </details>

                    <div class="scene-edv2__pair">
                      <div class="scene-edv2__field">
                        <label class="scene-edv2__field-label">进入状态</label>
                        <input class="scene-edv2__input" type="text"
                          data-action="scene-field" data-field="entry_state"
                          value="${escapeHtml(selectedScene.entry_state || "")}"
                          placeholder="开场时角色处境" />
                      </div>
                      <div class="scene-edv2__field">
                        <label class="scene-edv2__field-label">离开状态</label>
                        <input class="scene-edv2__input" type="text"
                          data-action="scene-field" data-field="exit_state"
                          value="${escapeHtml(selectedScene.exit_state || "")}"
                          placeholder="收场时角色处境" />
                      </div>
                    </div>

                    <div class="scene-edv2__field">
                      <label class="scene-edv2__field-label">台词或片段种子</label>
                      <textarea class="scene-edv2__input" rows="4"
                        data-action="scene-field" data-field="script_excerpt"
                        placeholder="一两句关键对白 / 画面 / 动作">${escapeHtml(selectedScene.script_excerpt || "")}</textarea>
                    </div>

                    <details class="scene-edv2__notes">
                      <summary>备注</summary>
                      <textarea class="scene-edv2__input" rows="3" style="margin-top:8px"
                        data-action="scene-field" data-field="notes"
                        placeholder="给未来的自己留点话">${escapeHtml(sanitizeTextField(selectedScene.notes) || "")}</textarea>
                    </details>
                  </section>
                `;
              })()
        }
      </div>
    </section>
  `;
}
