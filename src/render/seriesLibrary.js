import { escapeHtml, list } from "../utils.js";

// 系列库管理页：跨项目共享的世界观资产（世界规则 / 系列时间线 / 常驻人物）。
// 从项目中心顶栏「资料库」进入；项目内的资料库仍是项目级（可挂载系列）。
export function renderSeriesLibraryPage(dom, appState) {
  if (!dom.seriesContent) return;
  const s = appState.seriesLibrary ?? { list: [], selected: null, loading: false };
  const sel = s.selected;

  const listPane = `
    <div class="summary-card">
      <div class="list-card__head">
        <div>
          <p class="section-label">系列库 · 跨项目世界观</p>
          <h3>${s.list.length} 个系列</h3>
        </div>
        <button class="button button--ghost button--tiny" type="button" data-action="series-create">新建系列</button>
      </div>
      <div class="stack workbench-scroll-list">
        ${s.list.map((item) => `
          <button class="list-select ${sel?.id === item.id ? "is-active" : ""}" type="button" data-action="series-select" data-id="${escapeHtml(item.id)}">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(item.description || "（无简介）")}</span>
          </button>
        `).join("") || `<p class="scene-summary-hint">还没有系列。系列库存放同一世界观下多部作品共享的设定——世界规则、纪元时间线、常驻人物。新建后在项目资料库里挂载即可注入该项目的所有 AI 生成。</p>`}
      </div>
    </div>
  `;

  const sectionEditor = (label, items, fields, addAction, deleteAction, hint) => `
    <div class="summary-card">
      <div class="list-card__head">
        <h3>${label}</h3>
        <button class="button button--ghost button--tiny" type="button" data-action="${addAction}">新增</button>
      </div>
      ${items.length === 0 ? `<p class="scene-summary-hint">${hint}</p>` : ""}
      <div class="stack">
        ${items.map((it, idx) => `
          <div class="genre-contract-row">
            <div class="form-grid form-grid--compact">
              ${fields.map((f) => `
                <label class="field ${f.full ? "field--full" : ""}">
                  <span>${escapeHtml(f.label)}</span>
                  ${f.textarea
                    ? `<textarea rows="2" data-action="series-item-field" data-section="${f.section}" data-idx="${idx}" data-field="${f.key}">${escapeHtml(it[f.key] ?? "")}</textarea>`
                    : `<input type="${f.type ?? "text"}" data-action="series-item-field" data-section="${f.section}" data-idx="${idx}" data-field="${f.key}" value="${escapeHtml(String(it[f.key] ?? ""))}" />`}
                </label>
              `).join("")}
            </div>
            <div style="margin-top:6px">
              <button class="button button--ghost button--tiny" type="button" data-action="${deleteAction}" data-id="${idx}">删除</button>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  const editorPane = !sel ? `
    <div class="summary-card">
      <p class="scene-summary-hint">从左侧选择一个系列，或「新建系列」。</p>
    </div>
  ` : `
    <div class="summary-card">
      <div class="form-grid">
        <label class="field"><span>系列名称</span>
          <input type="text" data-action="series-field" data-field="name" value="${escapeHtml(sel.name)}" /></label>
        <label class="field field--full"><span>简介</span>
          <input type="text" data-action="series-field" data-field="description" value="${escapeHtml(sel.description ?? "")}" placeholder="一句话说明这个世界观" /></label>
      </div>
      <div style="margin-top:8px; display:flex; gap:8px">
        <button class="button button--primary button--tiny" type="button" data-action="series-save" ${s.loading ? "disabled" : ""}>${s.loading ? "保存中…" : "保存系列"}</button>
        <button class="button button--ghost button--tiny" type="button" data-action="series-delete" data-id="${escapeHtml(sel.id ?? "")}">删除系列</button>
      </div>
    </div>
    ${sectionEditor("世界规则", list(sel.world_rules),
      [
        { key: "rule_statement", label: "规则", section: "world_rules", full: true, textarea: true },
        { key: "scope", label: "作用范围", section: "world_rules" }
      ],
      "series-add-rule", "series-del-rule",
      "本系列所有作品共守的硬设定（力量体系、专名、机构、禁忌）。挂载后注入结构/扩场/写本/幕评师。")}
    ${sectionEditor("系列时间线", list(sel.timeline_events),
      [
        { key: "story_day", label: "第几天/纪元序", section: "timeline_events", type: "number" },
        { key: "summary", label: "事件", section: "timeline_events", full: true }
      ],
      "series-add-event", "series-del-event",
      "跨作品的纪元级事件（大战、政权更替、主角团成立）。单部作品的时间线仍在项目资料库。")}
    ${sectionEditor("常驻人物", list(sel.regulars),
      [
        { key: "name", label: "姓名", section: "regulars" },
        { key: "role", label: "身份", section: "regulars" },
        { key: "bio", label: "档案", section: "regulars", full: true, textarea: true },
        { key: "voice", label: "声音规则", section: "regulars", full: true }
      ],
      "series-add-regular", "series-del-regular",
      "系列常驻角色（只读注入各项目的写本与扩场，不并入项目人物表——项目里仍可建立本片专属人物）。")}
  `;

  dom.seriesContent.innerHTML = `
    <section class="scene-workbench scene-workbench--triple" style="grid-template-columns: 300px 1fr">
      <aside class="workbench-pane workbench-pane--rail">${listPane}</aside>
      <div class="workbench-pane workbench-pane--main"><div class="stack">${editorPane}</div></div>
    </section>
  `;
}
