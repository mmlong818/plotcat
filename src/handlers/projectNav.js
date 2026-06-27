import { ctx } from "./context.js";
import { appState } from "../state.js";
import { list } from "../utils.js";
import { ensurePlotDrivenProject } from "../shared/plotDrivenProject.js";
import { cloneDefaultProject } from "../data/defaultProject.js";
import { renderAiSettingsDialog } from "../render/project.js";

export function handleProjectNavClick(action, target, id, nodeId) {
  if (action === "open-project") {
    // 形态分流：微短剧进独立创作区；连续剧进工作台「总览」主页(再进各步)；其它进结构步
    const enter = () => {
      const fmt = appState.project.project?.format;
      if (fmt === "micro_drama") {
        ctx.setCurrentPage("micro");
      } else if (fmt === "series") {
        ctx.setCurrentPage("workflow");
        ctx.setCurrentStep("overview");
      } else {
        ctx.setCurrentPage("workflow");
        ctx.setCurrentStep("structure");
      }
    };
    ctx.loadProjectFromServer(id)
      .then(enter)
      .catch(() => {
        const snapshot = ctx.loadLocalSnapshot();
        if (snapshot?.project?.project?.id === id) {
          appState.project = ensurePlotDrivenProject(snapshot.project);
          ctx.normalizeProject();
          enter();
        }
      });
    return true;
  }
  if (action === "open-project-menu") {
    appState.projectMenuId = id;
    appState.projectDeleteConfirmId = null;
    ctx.render();
    return true;
  }
  if (action === "close-project-menu") {
    appState.projectMenuId = null;
    ctx.render();
    return true;
  }
  if (action === "rename-project") {
    const current = list(appState.projectList).find((p) => p.id === id);
    const nextTitle = window.prompt("项目新名称：", current?.title ?? "")?.trim();
    appState.projectMenuId = null;
    if (!nextTitle || nextTitle === current?.title) { ctx.render(); return true; }
    ctx.fetchJson(`/api/projects/${encodeURIComponent(id)}`)
      .then((payload) => {
        const doc = payload.project;
        doc.project.title = nextTitle;
        return ctx.fetchJson(`/api/projects/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project: doc })
        });
      })
      .then((payload) => {
        appState.projectList = payload.projects ?? appState.projectList;
        if (appState.project?.project?.id === id) appState.project.project.title = nextTitle;
        ctx.render();
      })
      .catch((error) => { window.alert(`重命名失败：${error.message}`); ctx.render(); });
    return true;
  }
  if (action === "request-delete-project") {
    appState.projectDeleteConfirmId = id;
    appState.projectMenuId = null;
    ctx.render();
    return true;
  }
  if (action === "cancel-delete-project") {
    appState.projectDeleteConfirmId = null;
    ctx.render();
    return true;
  }
  if (action === "confirm-delete-project") {
    const deletingId = id;
    ctx.fetchJson(`/api/projects/${encodeURIComponent(deletingId)}`, { method: "DELETE" })
      .then((payload) => {
        appState.projectList = payload.projects ?? [];
        appState.projectDeleteConfirmId = null;
        if (appState.project?.project?.id === deletingId) {
          window.clearTimeout(appState.saveTimer);
          appState.runtime.dirty = false;
          appState.project = null;
        }
        ctx.render();
      })
      .catch((error) => {
        appState.projectDeleteConfirmId = null;
        window.alert(`删除失败：${error.message}`);
        ctx.render();
      });
    return true;
  }
  if (action === "locks-tab") {
    appState.locksActiveTab = id;
    if (id === "kb" && appState.knowledge.sources.length === 0) {
      ctx.kbFetchSources().then(() => { if (appState.knowledge.selectedSourceId) ctx.kbSearch(); });
    } else if (id === "kb" && appState.knowledge.items.length === 0) {
      ctx.kbSearch();
    }
    ctx.render();
    return true;
  }
  if (action === "cancel-reset") { appState.resetConfirmPending = false; renderAiSettingsDialog(ctx.dom, appState, ctx.aiGetters); return true; }
  if (action === "confirm-reset") {
    appState.resetConfirmPending = false;
    (async () => {
      if (!appState.runtime.serverAvailable) {
        appState.project = ensurePlotDrivenProject(cloneDefaultProject());
        ctx.normalizeProject();
        ctx.render();
        return;
      }
      const payload = await ctx.fetchJson(`/api/projects/${encodeURIComponent(appState.project.project.id)}/reset`, { method: "POST" });
      appState.project = ensurePlotDrivenProject(payload.project);
      appState.projectList = payload.projects ?? appState.projectList;
      ctx.normalizeProject();
      ctx.render();
    })();
    return true;
  }
  return false;
}
