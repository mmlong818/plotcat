// 存储与同步五元组：本地快照存取 + 服务端读写 + autosave 调度 + dirty 标记。从 app.js 外提。
// render/normalizeProject/renderRuntimeStatus/serializeCreation 定义在 app.js 内、且与本簇
// 互相调用（io ↔ render ↔ normalize），故作为工厂依赖注入，而非直接 import（避免循环依赖）。
import { STORAGE_KEY, AUTOSAVE_DELAY, appState } from "./state.js";
import { ensurePlotDrivenProject } from "./shared/plotDrivenProject.js";
import { list } from "./utils.js";

export function createPersistence({ normalizeProject, renderRuntimeStatus, serializeCreation, render }) {
  function saveLocalSnapshot() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        project: appState.project,
        projectList: appState.projectList,
        creation: serializeCreation(appState.creation),
        // 精品创作的问答是用户手打的——刷新丢失等于白答一轮
        proCreation: appState.proCreation?.active ? appState.proCreation : null,
        currentPage: appState.currentPage,
      })
    );
  }

  function loadLocalSnapshot() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `请求失败：${response.status}`);
    }
    return response.json();
  }

  async function loadProjectsFromServer() {
    const payload = await fetchJson("/api/projects");
    appState.projectList = payload.projects ?? [];
  }

  async function loadProjectFromServer(projectId) {
    const payload = await fetchJson(`/api/projects/${encodeURIComponent(projectId)}`);
    appState.project = ensurePlotDrivenProject(payload.project);
    appState.projectList = payload.projects ?? appState.projectList;
    normalizeProject();
    const firstChar = list(appState.project.character_hub?.characters)[0];
    if (firstChar && !appState.selection.characterId) {
      appState.selection.characterId = firstChar.id;
    }
  }

  async function saveProjectToServer() {
    appState.runtime.saving = true;
    // 标记 PUT 期间用户是否新增了改动；若有则 PUT 返回后不可覆盖本地最新状态
    appState.runtime.dirty = false;
    renderRuntimeStatus();
    const payload = await fetchJson(`/api/projects/${encodeURIComponent(appState.project.project.id)}`, {
      method: "PUT",
      body: JSON.stringify({ project: appState.project })
    });
    // 关键：PUT 完成时若 dirty 已被新编辑置 true，说明本地有 PUT 之外的新数据，
    // 不要用 server 返回值覆盖 appState.project，否则会丢失这段时间内用户的输入。
    if (!appState.runtime.dirty) {
      appState.project = ensurePlotDrivenProject(payload.project);
    }
    appState.projectList = payload.projects ?? appState.projectList;
    appState.runtime.serverAvailable = true;
    appState.runtime.saving = false;
    appState.runtime.lastSavedAt = new Date().toISOString();
    normalizeProject();
    saveLocalSnapshot();
    render();
    // 若期间有 dirty，再排一次 autosave 把最新状态推上去
    if (appState.runtime.dirty) scheduleAutosave();
  }

  function scheduleAutosave() {
    window.clearTimeout(appState.saveTimer);
    appState.saveTimer = window.setTimeout(async () => {
      if (!appState.runtime.dirty) return;
      saveLocalSnapshot();
      if (!appState.runtime.serverAvailable) {
        appState.runtime.lastSavedAt = "仅本地保存";
        renderRuntimeStatus();
        return;
      }
      try {
        await saveProjectToServer();
      } catch (error) {
        appState.runtime.serverAvailable = false;
        appState.runtime.saving = false;
        appState.runtime.lastSavedAt = "仅本地保存";
        renderRuntimeStatus();
      }
    }, AUTOSAVE_DELAY);
  }

  function markDirty() {
    appState.runtime.dirty = true;
    saveLocalSnapshot();
    renderRuntimeStatus();
    scheduleAutosave();
  }

  return {
    saveLocalSnapshot,
    loadLocalSnapshot,
    fetchJson,
    loadProjectsFromServer,
    loadProjectFromServer,
    saveProjectToServer,
    scheduleAutosave,
    markDirty
  };
}
