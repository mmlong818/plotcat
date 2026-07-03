import { ctx } from "./context.js";
import { appState } from "../state.js";
import { list } from "../utils.js";
import { buildFountainText } from "../render/screenplay.js";
import { openFountainPreview } from "../render/fountainViewer.js";

export function handleScreenplayClick(action, target, id, nodeId) {
  if (action === "ai-rate-screenplay-full") {
    ctx.aiRateScreenplayFull();
    return true;
  }
  if (action === "global-find-replace") {
    ctx.globalFindReplace();
    return true;
  }
  if (action === "ai-genre-audit") {
    ctx.aiGenreAudit();
    return true;
  }
  if (action === "ai-genre-remedy") {
    ctx.aiGenreRemedy();
    return true;
  }
  if (action === "audit-speakers") {
    ctx.auditScriptSpeakers();
    return true;
  }
  if (action === "dismiss-script-audit") {
    appState.scriptAuditResult = null;
    ctx.render();
    return true;
  }
  if (action === "ai-write-screenplay-bulk") {
    ctx.aiWriteScreenplayBulk();
    return true;
  }
  if (action === "ai-rewrite-all-screenplay") {
    const scenes = list(appState.project.scene_workbench?.scenes);
    const written = scenes.filter((s) => s.script_full && s.script_full.trim().length > 0);
    if (written.length === 0) {
      alert("没有已写的剧本可以重写。");
      return true;
    }
    if (!confirm(`将清空全部 ${written.length} 个场景的剧本并重新生成（应用最新反同质化 prompt）。\n\n这会消耗较多 token 且不可撤销。继续？`)) return true;
    written.forEach((s) => { s.script_full = ""; });
    ctx.markDirty();
    ctx.render();
    ctx.aiWriteScreenplayBulk();
    return true;
  }
  if (action === "export-screenplay-fountain") {
    const text = buildFountainText(appState);
    const title = (appState.project.project?.title || "screenplay").replace(/[\\/:*?"<>|]/g, "_");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.fountain`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }
  if (action === "preview-screenplay-full") {
    const text = buildFountainText(appState);
    const title = appState.project.project?.title || "剧本预览";
    const w = openFountainPreview(text, title);
    if (!w) alert("浏览器拦截了弹窗，请允许后重试。");
    return true;
  }
  return false;
}
