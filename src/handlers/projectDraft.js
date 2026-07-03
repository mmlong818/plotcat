import { ctx } from "./context.js";
import { appState } from "../state.js";

export function handleProjectDraftClick(action, target, id, nodeId) {
  if (action === "cf-toggle-genre") {
    const c = appState.creation;
    if (!c) return true;
    c.genres = Array.isArray(c.genres) ? c.genres : [];
    if (c.genres.includes(id)) {
      c.genres = c.genres.filter((g) => g !== id);
    } else if (c.genres.length < 3) {
      c.genres = [...c.genres, id];
    } else {
      alert("最多选 1 个主导 + 2 个调味类型。先取消一个再选。");
      return true;
    }
    ctx.patchCreationCardFields();
    return true;
  }
  if (action === "toggle-draft-genre") {
    const val = target.dataset.value ?? "";
    const current = Array.isArray(appState.projectDraft.genre) ? appState.projectDraft.genre : [];
    appState.projectDraft.genre = current.includes(val) ? current.filter((g) => g !== val) : [...current, val];
    appState.createConceptOptions = [];
    appState.createAssistant.error = "";
    ctx.renderCreateForm();
    return true;
  }
  if (action === "toggle-draft-tone") {
    const val = target.dataset.value ?? "";
    appState.projectDraft.tone = appState.projectDraft.tone === val ? "" : val;
    appState.createConceptOptions = [];
    appState.createAssistant.error = "";
    ctx.renderCreateForm();
    return true;
  }
  if (action === "draft-choice") { ctx.updateDraftField(target.dataset.field, target.dataset.value ?? ""); return true; }
  if (action === "go-step") { ctx.setCurrentStep(id); return true; }
  return false;
}
