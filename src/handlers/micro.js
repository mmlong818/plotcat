import { ctx } from "./context.js";
import { appState } from "../state.js";
import { createId } from "../shared/projectFactory.js";

// 微短剧创作区交互（节点流水线导航等）。
export function handleMicroClick(action, target, id, nodeId) {
  if (action === "micro-setup-init") {                                          // 开篇：按集数+频向建分集骨架
    const input = document.querySelector("#micro-ep-count");
    let n = parseInt(input?.value ?? "60", 10);
    if (!Number.isFinite(n) || n < 1) n = 60;
    if (n > 200) n = 200;
    const board = appState.project.episode_board ?? (appState.project.episode_board = { episodes: [], seasons: [{ number: 1, throughline: "", season_hook: "" }] });
    if (!Array.isArray(board.episodes)) board.episodes = [];
    for (let i = 1; i <= n; i++) {
      board.episodes.push({
        id: createId("ep"), order_index: i, season: 1, title: `第${i}集`,
        hook_3s: "", payoff: "", cliffhanger: "", paywall_point: false,
        summary: "", script_full: "", script_loading: false, scene_ids: []
      });
    }
    appState.microStep = "theme"; // 开篇后进入节点流水线第一页(主题定位)，按编辑顺序往下走
    ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "micro-step") {
    appState.microStep = id;
    ctx.render();
    return true;
  }
  if (action === "ai-gen-theme") {        // 节点①主题定位
    ctx.aiGenTheme();
    return true;
  }
  if (action === "ai-gen-world") {        // 节点②世界观
    ctx.aiGenWorld();
    return true;
  }
  if (action === "ai-gen-chars") {        // 节点③人物
    ctx.aiGenChars();
    return true;
  }
  if (action === "ai-gen-plotframe") {    // 节点④总框架
    ctx.aiGenPlotFrame();
    return true;
  }
  if (action === "ai-gen-thrill") { ctx.aiGenThrill(); return true; }        // ⑥⑦爽点高潮
  if (action === "ai-gen-pacepay") { ctx.aiGenPacePay(); return true; }      // ⑩节奏付费
  if (action === "select-gender-mode") {                                      // ①主题定位·频向（设计之初基调）
    const gt = appState.project.gender_tune ?? (appState.project.gender_tune = {});
    gt.mode = id;
    ctx.markDirty(); ctx.render();
    return true;
  }
  if (action === "ai-cascade-from") {                                            // 一键级联：本节点及之后全部重生成
    const ok = window.confirm("将按顺序重新生成【本节点】及其后所有节点（到分集设计），覆盖它们现有内容——前置节点不动。\n\n这会逐节点调用 AI，耗时较长。继续？");
    if (ok) ctx.aiCascadeFrom(id);
    return true;
  }
  if (action === "ai-design-episodes") { ctx.aiDesignEpisodes(); return true; }  // ⑤分集设计·AI铺大纲
  if (action === "ai-write-episode") { ctx.aiWriteEpisode(id); return true; }   // ✎卷轴·单集写本
  if (action === "ai-rewrite-episode") { ctx.aiRewriteEpisode(id, target.dataset.mode); return true; } // 卷轴·单集改写(打磨对白/缩短/延长)
  if (action === "ai-continue-episode") { ctx.aiContinueEpisode(); return true; } // ✎卷轴·续写下一集
  if (action === "export-micro-script") {                                       // ✎卷轴·导出 PDF 剧本（浏览器打印→另存为 PDF）
    const eps = (appState.project.episode_board?.episodes ?? []).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const title = appState.project.project?.title || "微短剧";
    const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const body = eps.map((e) => `<section class="ep"><h2>第 ${esc(e.order_index ?? "")} 集　${esc(e.title || "")}</h2><pre>${esc((e.script_full || "").trim() || "（本集未写）")}</pre></section>`).join("");
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${esc(title)}-剧本</title>
      <style>
        @page { margin: 22mm 18mm; }
        body { font: 14px/1.85 "Songti SC","SimSun","Noto Serif CJK SC",serif; color:#111; }
        h1 { text-align:center; font-size:24px; margin:0 0 4px; }
        .sub { text-align:center; color:#666; font-size:12px; margin-bottom:28px; }
        .ep { page-break-inside:avoid; margin-bottom:26px; }
        .ep h2 { font-size:16px; border-bottom:1px solid #ccc; padding-bottom:4px; margin:0 0 8px; }
        pre { white-space:pre-wrap; word-break:break-word; font:inherit; margin:0; }
        @media print { .tip { display:none; } }
        .tip { position:fixed; top:8px; right:8px; background:#b5601d; color:#fff; padding:6px 12px; border-radius:6px; font-size:12px; }
      </style></head><body>
      <div class="tip">按 Ctrl/⌘+P → 目标选「另存为 PDF」</div>
      <h1>《${esc(title)}》</h1><div class="sub">微短剧剧本 · 共 ${eps.length} 集</div>
      ${body}
      <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
      </body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
    else { window.alert("浏览器拦截了弹窗，请允许后重试导出 PDF。"); }
    return true;
  }
  return false;
}
