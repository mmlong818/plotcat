import { escapeHtml } from "../utils.js";
import { MICRO_STEPS } from "../state.js";
import { episodeBoardHTML } from "./episodes.js";

// 微短剧创作区（独立于电影工作台）：节点流水线导航 + 激活节点内容。
// 后端/数据/AI 全复用；这里只是短剧专属前端外壳。
export function renderMicroPage(dom, appState) {
  if (!dom.microNav || !dom.microContent) return;
  const cur = appState.microStep || "episodes";

  // ── 节点流水线导航 ──
  dom.microNav.innerHTML = MICRO_STEPS.map((s, i) => {
    const active = s.id === cur;
    const ready = !!s.done;
    return `
      <button class="micro-step ${active ? "is-active" : ""} ${ready ? "is-ready" : "is-todo"}"
        type="button" data-action="micro-step" data-id="${escapeHtml(s.id)}" title="${escapeHtml(s.description)}">
        <span class="micro-step__no">${escapeHtml(s.node)}</span>
        <span class="micro-step__label">${escapeHtml(s.label)}</span>
        ${ready ? `<span class="micro-step__dot" title="可用">●</span>` : `<span class="micro-step__todo">${escapeHtml(s.phase)}</span>`}
      </button>${i < MICRO_STEPS.length - 1 ? `<span class="micro-step__arrow">→</span>` : ""}`;
  }).join("");

  // ── 激活节点内容 ──
  const step = MICRO_STEPS.find((s) => s.id === cur) || MICRO_STEPS[0];
  let body;
  if (cur === "episodes") {
    body = episodeBoardHTML(appState);
  } else if (cur === "theme") {
    body = themeNodeHTML(appState);
  } else if (cur === "world") {
    body = worldNodeHTML(appState);
  } else if (cur === "characters") {
    body = charsNodeHTML(appState);
  } else if (cur === "plotframe") {
    body = plotFrameNodeHTML(appState);
  } else if (cur === "thrill") {
    body = thrillNodeHTML(appState);
  } else if (cur === "pacepay") {
    body = pacePayNodeHTML(appState);
  } else if (cur === "dialogue") {
    body = dialogueNodeHTML(appState);
  } else if (cur === "themelift") {
    body = themeLiftNodeHTML(appState);
  } else if (cur === "gender") {
    body = genderNodeHTML(appState);
  } else {
    body = `
      <section class="panel-inner">
        <div class="summary-card">
          <p class="section-label">节点 ${escapeHtml(step.node)} · ${escapeHtml(step.label)}</p>
          <h3>${escapeHtml(step.label)}</h3>
          <p class="scene-summary-hint" style="margin-top:6px">${escapeHtml(step.description)}</p>
          <p class="scene-summary-hint" style="margin-top:10px;color:var(--muted)">本节点将依据《2025版微短剧AI辅助编剧系统》节点 ${escapeHtml(step.node)} 的提示词实现（计划阶段 ${escapeHtml(step.phase)}）。</p>
        </div>
      </section>`;
  }
  dom.microContent.innerHTML = body;
}

// 节点①·主题定位（ThemeAnchor）：输入 → AI 生成 → 可编辑输出
function themeNodeHTML(appState) {
  const ta = appState.project.theme_anchor ?? {};
  const loading = !!ta.loading;
  const has = !!(ta.logline || ta.track || ta.values);
  const tag = (v) => escapeHtml(v ?? "");
  const listBlock = (label, arr) => {
    const items = Array.isArray(arr) ? arr : [];
    if (!items.length) return "";
    return `<div class="cf-field"><span class="cf-label">${label}</span><ul class="theme-list">${items.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div>`;
  };
  return `
    <section class="panel-inner">
      <div class="summary-card">
        <p class="section-label">节点 01 · 主题与创意定位器 ThemeAnchor</p>
        <h3>主题定位 · 为后续所有节点提供"方向锚"</h3>
        <div class="form-grid form-grid--compact" style="margin-top:10px">
          <label class="field field--full"><span>故事概念 / 关键词</span>
            <textarea class="cf-textarea" rows="2" data-action="theme-field" data-field="input_concept" placeholder="一句话或几个关键词；留空让 AI 基于题材自由发挥">${tag(ta.input_concept)}</textarea></label>
          <label class="field"><span>平台 / 时长</span>
            <input class="cf-input" type="text" data-action="theme-field" data-field="input_platform" value="${tag(ta.input_platform)}" placeholder="如 竖屏微短剧 / 单集2-3分钟" /></label>
          <label class="field"><span>受众设想</span>
            <input class="cf-input" type="text" data-action="theme-field" data-field="input_audience" value="${tag(ta.input_audience)}" placeholder="如 一二线女性25-40" /></label>
        </div>
        <div style="margin-top:10px">
          <button class="button button--primary button--small" type="button" data-action="ai-gen-theme" ${loading ? "disabled" : ""}>
            ${loading ? "AI 定位中…（约 20-40 秒）" : has ? "↺ 重新定位" : "✦ AI 主题定位"}
          </button>
        </div>
        ${ta.error ? `<p class="cf-error" style="margin-top:8px">${escapeHtml(ta.error)}</p>` : ""}
      </div>

      ${has ? `
      <div class="summary-card" style="margin-top:12px">
        <p class="section-label">定位结果（可直接编辑）</p>
        <div class="form-grid form-grid--compact" style="margin-top:8px">
          <label class="field field--full"><span>一句话故事</span>
            <input class="cf-input" type="text" data-action="theme-field" data-field="logline" value="${tag(ta.logline)}" /></label>
          <label class="field field--full"><span>赛道定位</span>
            <input class="cf-input" type="text" data-action="theme-field" data-field="track" value="${tag(ta.track)}" /></label>
          <label class="field field--full"><span>目标受众</span>
            <input class="cf-input" type="text" data-action="theme-field" data-field="audience_out" value="${tag(ta.audience_out)}" /></label>
          <label class="field field--full"><span>主题与价值观</span>
            <textarea class="cf-textarea" rows="2" data-action="theme-field" data-field="values">${tag(ta.values)}</textarea></label>
        </div>
        ${listBlock("差异化要素", ta.diff)}
        ${listBlock("风险预警", ta.risks)}
      </div>` : ""}
    </section>`;
}

// 节点②·世界观（WorldForge）：输入 → AI 生成 → 可编辑输出（背景/规则四项/冲突触发点）
function worldNodeHTML(appState) {
  const w = appState.project.world_forge ?? {};
  const r = w.rules ?? {};
  const loading = !!w.loading;
  const has = !!(w.summary || r.identity);
  const tag = (v) => escapeHtml(v ?? "");
  return `
    <section class="panel-inner">
      <div class="summary-card">
        <p class="section-label">节点 02 · 背景与世界观构建器 WorldForge</p>
        <h3>世界观 · 让冲突合理、反转可解释的"叙事土壤"</h3>
        <div class="form-grid form-grid--compact" style="margin-top:10px">
          <label class="field"><span>时代设想</span>
            <input class="cf-input" type="text" data-action="world-field" data-field="input_era" value="${tag(w.input_era)}" placeholder="当代/近未来/古代/架空" /></label>
          <label class="field"><span>地点 / 场域</span>
            <input class="cf-input" type="text" data-action="world-field" data-field="input_place" value="${tag(w.input_place)}" placeholder="城市/乡镇/某行业场域" /></label>
          <label class="field field--full"><span>核心冲突类型</span>
            <input class="cf-input" type="text" data-action="world-field" data-field="input_conflict" value="${tag(w.input_conflict)}" placeholder="如 阶层压制 / 资源争夺 / 身份错位" /></label>
        </div>
        <div style="margin-top:10px">
          <button class="button button--primary button--small" type="button" data-action="ai-gen-world" ${loading ? "disabled" : ""}>
            ${loading ? "AI 构建中…（约 20-40 秒）" : has ? "↺ 重新构建" : "✦ AI 构建世界观"}
          </button>
        </div>
        ${w.error ? `<p class="cf-error" style="margin-top:8px">${escapeHtml(w.error)}</p>` : ""}
      </div>

      ${has ? `
      <div class="summary-card" style="margin-top:12px">
        <p class="section-label">世界设定（可直接编辑）</p>
        <div class="form-grid form-grid--compact" style="margin-top:8px">
          <label class="field field--full"><span>背景摘要</span>
            <textarea class="cf-textarea" rows="2" data-action="world-field" data-field="summary">${tag(w.summary)}</textarea></label>
          <label class="field field--full"><span>身份 / 阶层</span>
            <textarea class="cf-textarea" rows="2" data-action="world-field" data-field="rules.identity">${tag(r.identity)}</textarea></label>
          <label class="field field--full"><span>权力 / 制度</span>
            <textarea class="cf-textarea" rows="2" data-action="world-field" data-field="rules.power">${tag(r.power)}</textarea></label>
          <label class="field field--full"><span>资源 / 禁忌</span>
            <textarea class="cf-textarea" rows="2" data-action="world-field" data-field="rules.resource">${tag(r.resource)}</textarea></label>
          <label class="field field--full"><span>规则的破坏与修复</span>
            <textarea class="cf-textarea" rows="2" data-action="world-field" data-field="rules.breakage">${tag(r.breakage)}</textarea></label>
        </div>
        ${Array.isArray(w.conflict_triggers) && w.conflict_triggers.length ? `<div class="cf-field"><span class="cf-label">冲突触发点</span><ul class="theme-list">${w.conflict_triggers.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div>` : ""}
      </div>` : ""}
    </section>`;
}

// 节点③·人物（CharSmith）：主角/配角群像/反派/关系图谱
function charsNodeHTML(appState) {
  const c = appState.project.char_smith ?? {};
  const pr = c.protagonist ?? {};
  const an = c.antagonist ?? {};
  const sup = Array.isArray(c.supporting) ? c.supporting : [];
  const loading = !!c.loading;
  const has = !!(pr.identity || pr.desire || sup.length);
  const tag = (v) => escapeHtml(v ?? "");
  const fld = (label, df, val, full = true) => `<label class="field ${full ? "field--full" : ""}"><span>${label}</span><input class="cf-input" type="text" data-action="chars-field" data-field="${df}" value="${tag(val)}" /></label>`;
  const tfld = (label, df, val) => `<label class="field field--full"><span>${label}</span><textarea class="cf-textarea" rows="2" data-action="chars-field" data-field="${df}">${tag(val)}</textarea></label>`;
  return `
    <section class="panel-inner">
      <div class="summary-card">
        <p class="section-label">节点 03 · 人物设定工坊 CharSmith</p>
        <h3>人物 · 主角/配角/反派的"欲望—障碍—代价—成长"闭环</h3>
        <label class="field field--full" style="margin-top:10px"><span>创作者补充（可选）</span>
          <input class="cf-input" type="text" data-action="chars-field" data-field="input_note" value="${tag(c.input_note)}" placeholder="对人物的特别要求，如 主角女性/反派是亲人" /></label>
        <div style="margin-top:10px">
          <button class="button button--primary button--small" type="button" data-action="ai-gen-chars" ${loading ? "disabled" : ""}>
            ${loading ? "AI 设计中…（约 30-50 秒）" : has ? "↺ 重新设计" : "✦ AI 设计人物体系"}
          </button>
        </div>
        ${c.error ? `<p class="cf-error" style="margin-top:8px">${escapeHtml(c.error)}</p>` : ""}
      </div>

      ${has ? `
      <div class="summary-card" style="margin-top:12px">
        <p class="section-label">主角档案（可编辑）</p>
        <div class="form-grid form-grid--compact" style="margin-top:8px">
          ${fld("身份标签", "protagonist.identity", pr.identity)}
          ${fld("核心欲望", "protagonist.desire", pr.desire)}
          ${fld("致命缺陷", "protagonist.flaw", pr.flaw)}
          ${fld("独特能力", "protagonist.ability", pr.ability)}
          ${tfld("成长路径", "protagonist.growth", pr.growth)}
        </div>
      </div>

      <div class="summary-card" style="margin-top:12px">
        <p class="section-label">配角群像（${sup.length}）</p>
        ${sup.map((s, i) => `
          <div class="genre-contract-row" style="margin-top:8px">
            <div class="form-grid form-grid--compact">
              <label class="field"><span>姓名</span><input class="cf-input" type="text" data-action="chars-field" data-field="supporting.name" data-idx="${i}" value="${tag(s.name)}" /></label>
              <label class="field"><span>功能定位</span><input class="cf-input" type="text" data-action="chars-field" data-field="supporting.function" data-idx="${i}" value="${tag(s.function)}" /></label>
              <label class="field"><span>与主角关系</span><input class="cf-input" type="text" data-action="chars-field" data-field="supporting.relation" data-idx="${i}" value="${tag(s.relation)}" /></label>
              <label class="field"><span>记忆标签</span><input class="cf-input" type="text" data-action="chars-field" data-field="supporting.memory_tag" data-idx="${i}" value="${tag(s.memory_tag)}" /></label>
            </div>
          </div>`).join("") || `<p class="scene-summary-hint">（暂无配角）</p>`}
      </div>

      <div class="summary-card" style="margin-top:12px">
        <p class="section-label">反派设计 + 关系图谱</p>
        <div class="form-grid form-grid--compact" style="margin-top:8px">
          ${fld("反派·动机逻辑", "antagonist.motive", an.motive)}
          ${fld("反派·能力评估", "antagonist.power", an.power)}
          ${fld("反派·魅力包装", "antagonist.charm", an.charm)}
          ${tfld("关系图谱", "relations", c.relations)}
        </div>
      </div>` : ""}
    </section>`;
}

// 节点④·总框架（PlotFrame）：事件链 + 幕次 + 关键转折 + 悬念布局
function plotFrameNodeHTML(appState) {
  const f = appState.project.plot_frame ?? {};
  const acts = f.acts ?? {}, turns = f.turns ?? {};
  const loading = !!f.loading;
  const has = !!(Array.isArray(f.event_chain) && f.event_chain.length);
  const tag = (v) => escapeHtml(v ?? "");
  const tfld = (label, df, val) => `<label class="field field--full"><span>${label}</span><textarea class="cf-textarea" rows="2" data-action="plotframe-field" data-field="${df}">${tag(val)}</textarea></label>`;
  return `
    <section class="panel-inner">
      <div class="summary-card">
        <p class="section-label">节点 04 · 总剧情框架架构师 PlotFrame</p>
        <h3>总框架 · 全剧"起—承—转—合"主轴，为分集预留节点</h3>
        <div class="form-grid form-grid--compact" style="margin-top:10px">
          <label class="field"><span>预期总集数</span>
            <input class="cf-input" type="text" data-action="plotframe-field" data-field="input_episodes" value="${tag(f.input_episodes)}" placeholder="如 80" /></label>
          <label class="field"><span>单集时长</span>
            <input class="cf-input" type="text" data-action="plotframe-field" data-field="input_length" value="${tag(f.input_length)}" placeholder="如 2-3分钟" /></label>
        </div>
        <div style="margin-top:10px">
          <button class="button button--primary button--small" type="button" data-action="ai-gen-plotframe" ${loading ? "disabled" : ""}>
            ${loading ? "AI 架构中…（约 30-50 秒）" : has ? "↺ 重新架构" : "✦ AI 搭建总框架"}
          </button>
        </div>
        ${f.error ? `<p class="cf-error" style="margin-top:8px">${escapeHtml(f.error)}</p>` : ""}
      </div>

      ${has ? `
      <div class="summary-card" style="margin-top:12px">
        <p class="section-label">故事主线·事件链（每行一句，可编辑）</p>
        <textarea class="cf-textarea" rows="${Math.max(6, f.event_chain.length + 1)}" data-action="plotframe-field" data-field="event_chain" style="margin-top:8px">${tag(f.event_chain.join("\n"))}</textarea>
      </div>

      <div class="summary-card" style="margin-top:12px">
        <p class="section-label">幕次划分</p>
        <div class="form-grid form-grid--compact" style="margin-top:8px">
          ${tfld("第一幕·建立", "acts.act1", acts.act1)}
          ${tfld("第二幕·对抗", "acts.act2", acts.act2)}
          ${tfld("第三幕·解决", "acts.act3", acts.act3)}
        </div>
      </div>

      <div class="summary-card" style="margin-top:12px">
        <p class="section-label">关键转折点</p>
        <div class="form-grid form-grid--compact" style="margin-top:8px">
          ${tfld("激发事件", "turns.catalyst", turns.catalyst)}
          ${tfld("中点转折", "turns.midpoint", turns.midpoint)}
          ${tfld("危机时刻", "turns.crisis", turns.crisis)}
          ${tfld("高潮决战", "turns.climax", turns.climax)}
          ${tfld("结局回响", "turns.ending", turns.ending)}
        </div>
        ${Array.isArray(f.suspense) && f.suspense.length ? `<p class="section-label" style="margin-top:10px">悬念布局（每行一条）</p><textarea class="cf-textarea" rows="${Math.max(3, f.suspense.length + 1)}" data-action="plotframe-field" data-field="suspense" style="margin-top:6px">${tag(f.suspense.join("\n"))}</textarea>` : ""}
      </div>` : ""}
    </section>`;
}

// ── 通用渲染小工具（micro-field 体系）──
function mf(key, label, df, val, ph = "") { return `<label class="field field--full"><span>${label}</span><input class="cf-input" type="text" data-action="micro-field" data-key="${key}" data-field="${df}" value="${escapeHtml(val ?? "")}" placeholder="${ph}" /></label>`; }
function mt(key, label, df, val) { return `<label class="field field--full"><span>${label}</span><textarea class="cf-textarea" rows="2" data-action="micro-field" data-key="${key}" data-field="${df}">${escapeHtml(val ?? "")}</textarea></label>`; }
function genBtn(action, loading, has, idle, busy) { return `<div style="margin-top:10px"><button class="button button--primary button--small" type="button" data-action="${action}" ${loading ? "disabled" : ""}>${loading ? busy : has ? "↺ 重新生成" : idle}</button></div>`; }
function nodeHead(node, title, sub) { return `<p class="section-label">节点 ${node}</p><h3>${escapeHtml(title)}</h3>${sub ? `<p class="scene-summary-hint" style="margin-top:6px">${escapeHtml(sub)}</p>` : ""}`; }
function roList(label, arr, fmt) { const a = Array.isArray(arr) ? arr : []; if (!a.length) return ""; return `<div class="cf-field"><span class="cf-label">${label}</span><ul class="theme-list">${a.map((x) => `<li>${escapeHtml(fmt(x))}</li>`).join("")}</ul></div>`; }

// 节点⑥⑦·爽点高潮
function thrillNodeHTML(appState) {
  const t = appState.project.thrill ?? {}; const pr = t.pressure ?? {}; const loading = !!t.loading; const has = Array.isArray(t.main_thrills) && t.main_thrills.length;
  return `<section class="panel-inner"><div class="summary-card">${nodeHead("06+07 · 爽点引擎＋矛盾高潮", "爽点·高潮", "提炼主辅爽点+释放节奏，设计压力递进与反转、高潮落点")}${genBtn("ai-gen-thrill", loading, has, "✦ AI 设计爽点与高潮", "AI 设计中…")}${t.error ? `<p class="cf-error" style="margin-top:8px">${escapeHtml(t.error)}</p>` : ""}</div>
  ${has ? `<div class="summary-card" style="margin-top:12px"><p class="section-label">爽点体系</p>
    ${roList("主爽点", t.main_thrills, (x) => `[${x.layer}] ${x.desc} → ${x.payoff}`)}
    ${roList("辅助爽点", t.aux_thrills, (x) => x)}
    ${roList("释放节奏表", t.release_table, (x) => `${x.ep}｜${x.type}｜强度${x.strength}｜${x.note}`)}
  </div>
  <div class="summary-card" style="margin-top:12px"><p class="section-label">压力递进 + 反转 + 高潮（可编辑）</p>
    <div class="form-grid form-grid--compact" style="margin-top:8px">${mt("thrill", "第1阶段·小摩擦", "pressure.s1", pr.s1)}${mt("thrill", "第2阶段·中冲突", "pressure.s2", pr.s2)}${mt("thrill", "第3阶段·大危机", "pressure.s3", pr.s3)}${mt("thrill", "高潮爆发点", "climax", t.climax)}</div>
    ${roList("核心反转", t.reversals, (x) => `伏笔:${x.foreshadow} / 误导:${x.mislead} / 揭晓:${x.reveal} / 余波:${x.aftermath}`)}
  </div>` : ""}</section>`;
}

// 节点⑩·节奏付费
function pacePayNodeHTML(appState) {
  const p = appState.project.pace_pay ?? {}; const z = p.zones ?? {}; const loading = !!p.loading; const has = !!p.ep_template;
  return `<section class="panel-inner"><div class="summary-card">${nodeHead("10 · 分集节奏与付费设计 PacePay", "节奏·付费", "单集模板+全剧分区+付费节点，实现看完必点下一集")}${genBtn("ai-gen-pacepay", loading, has, "✦ AI 设计节奏与付费", "AI 编排中…")}${p.error ? `<p class="cf-error" style="margin-top:8px">${escapeHtml(p.error)}</p>` : ""}</div>
  ${has ? `<div class="summary-card" style="margin-top:12px"><p class="section-label">节奏与付费（可编辑）</p><div class="form-grid form-grid--compact" style="margin-top:8px">${mt("pace_pay", "单集标准模板", "ep_template", p.ep_template)}${mt("pace_pay", "免费区", "zones.free", z.free)}${mt("pace_pay", "首付费区", "zones.paid1", z.paid1)}${mt("pace_pay", "深度付费区", "zones.paid2", z.paid2)}</div>${roList("付费节点", p.pay_nodes, (x) => `${x.at}｜机制:${x.mechanism}｜价值:${x.value}`)}</div>` : ""}</section>`;
}

// 节点⑧·分集写本（三段对话）
function dialogueNodeHTML(appState) {
  const d = appState.project.micro_dialogue ?? {}; const loading = !!d.loading; const has = Array.isArray(d.rounds) && d.rounds.length;
  return `<section class="panel-inner"><div class="summary-card">${nodeHead("08 · 对话冲突生成器 DialogueForge", "分集写本", "把冲突落地为挑衅→加压→反杀三段递进对白+金句")}
    ${mf("micro_dialogue", "本场冲突描述", "input_scene", d.input_scene, "留空让AI据主线选高张力对峙场景")}
    ${genBtn("ai-gen-dialogue", loading, has, "✦ AI 生成三段对话", "AI 写本中…")}${d.error ? `<p class="cf-error" style="margin-top:8px">${escapeHtml(d.error)}</p>` : ""}</div>
  ${has ? `<div class="summary-card" style="margin-top:12px"><p class="section-label">场景设定</p><p class="scene-summary-hint">${escapeHtml(d.setting ?? "")}</p>
    <div class="dialogue-rounds" style="margin-top:8px">${d.rounds.map((r) => `<div class="genre-contract-row" style="margin-top:6px"><strong>${escapeHtml(r.round ?? "")}</strong><p class="scene-summary-hint">A：${escapeHtml(r.a ?? "")}</p><p class="scene-summary-hint">B：${escapeHtml(r.b ?? "")}</p></div>`).join("")}</div>
    <div class="form-grid form-grid--compact" style="margin-top:10px">${mt("micro_dialogue", "金句", "golden_line", d.golden_line)}${mt("micro_dialogue", "关键动作", "action", d.action)}</div></div>` : ""}</section>`;
}

// 节点⑪·主题升华
function themeLiftNodeHTML(appState) {
  const t = appState.project.theme_lift ?? {}; const ts = t.theme_statement ?? {}; const an = t.anchors ?? {}; const loading = !!t.loading; const has = !!(ts.core);
  return `<section class="panel-inner"><div class="summary-card">${nodeHead("11 · 主题升华与观众代入 ThemeLift", "主题升华", "终局价值验证+情绪曲线+记忆锚点")}${genBtn("ai-gen-themelift", loading, has, "✦ AI 升华主题", "AI 升华中…")}${t.error ? `<p class="cf-error" style="margin-top:8px">${escapeHtml(t.error)}</p>` : ""}</div>
  ${has ? `<div class="summary-card" style="margin-top:12px"><p class="section-label">主题陈述 + 记忆锚点（可编辑）</p><div class="form-grid form-grid--compact" style="margin-top:8px">${mt("theme_lift", "核心命题", "theme_statement.core", ts.core)}${mt("theme_lift", "表现形式", "theme_statement.form", ts.form)}${mt("theme_lift", "社会意义", "theme_statement.meaning", ts.meaning)}${mf("theme_lift", "金句锚点", "anchors.line", an.line)}${mf("theme_lift", "场面锚点", "anchors.scene", an.scene)}${mf("theme_lift", "情感锚点", "anchors.emotion", an.emotion)}${mt("theme_lift", "观众代入机制", "immersion", t.immersion)}</div>${roList("情绪曲线", t.emotion_curve, (x) => `${x.eps}｜${x.mood}｜强度${x.strength}｜${x.turn}`)}</div>` : ""}</section>`;
}

// 节点⑨·性别向（全局调优）
function genderNodeHTML(appState) {
  const g = appState.project.gender_tune ?? {}; const mode = g.mode || "mixed"; const loading = !!g.loading; const has = !!g.demand_map;
  const modeBtn = (m, label) => `<button class="button ${mode === m ? "button--primary" : "button--ghost"} button--small" type="button" data-action="select-gender-mode" data-id="${m}">${label}</button>`;
  return `<section class="panel-inner"><div class="summary-card">${nodeHead("09 · 性别向差异化调优 GenderTune", "性别向", "选定频向后注入所有 AI 生成，优化诉求/节奏/场景/台词")}
    <div style="margin-top:10px;display:flex;gap:6px">${modeBtn("male", "男频")}${modeBtn("female", "女频")}${modeBtn("mixed", "混频")}</div>
    ${genBtn("ai-gen-gender", loading, has, "✦ AI 生成频向调优方案", "AI 调优中…")}${g.error ? `<p class="cf-error" style="margin-top:8px">${escapeHtml(g.error)}</p>` : ""}</div>
  ${has ? `<div class="summary-card" style="margin-top:12px"><p class="section-label">调优方案（可编辑）</p><div class="form-grid form-grid--compact" style="margin-top:8px">${mt("gender_tune", "受众诉求映射", "demand_map", g.demand_map)}${mt("gender_tune", "节奏控制", "pace", g.pace)}${mt("gender_tune", "情感处理", "emotion", g.emotion)}${mt("gender_tune", "台词风格", "dialogue_style", g.dialogue_style)}</div>${roList("典型场景建议", g.scenes, (x) => x)}</div>` : ""}</section>`;
}
