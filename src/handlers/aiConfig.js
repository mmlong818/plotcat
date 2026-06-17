import { ctx } from "./context.js";
import { appState } from "../state.js";

export function handleAiConfigClick(action, target, id, nodeId) {
  if (action === "create-ai-step") { ctx.requestCreateStepSuggestionCurrent(target.dataset.step ?? ctx.getProjectCreateStep().id); return true; }
  if (action === "create-ai-field") { ctx.requestCreateFieldSuggestionCurrent(target.dataset.field ?? ""); return true; }
  if (action === "apply-concept-option") { ctx.applyConceptOptionCurrent(target.dataset.id ?? ""); return true; }
  if (action === "activate-llm-profile") {
    ctx.fetchJson(`/api/ai/profiles/${encodeURIComponent(id)}/activate`, { method: "POST" })
      .then((payload) => {
        appState.ai = payload.ai ?? appState.ai;
        appState.llmProfiles = payload.profiles ?? appState.llmProfiles;
        appState.aiConfigDraft.provider = appState.ai.provider || appState.aiConfigDraft.provider;
        appState.aiConfigDraft.model = appState.ai.model || "";
        appState.createAssistant.message = `已切换到 ${appState.ai.model || appState.ai.provider}`;
        ctx.renderCreateForm();
      })
      .catch((error) => { appState.createAssistant.error = error.message; ctx.renderCreateForm(); });
    return true;
  }
  if (action === "delete-llm-profile") {
    ctx.fetchJson(`/api/ai/profiles/${encodeURIComponent(id)}`, { method: "DELETE" })
      .then((payload) => { appState.llmProfiles = payload.profiles ?? []; ctx.renderCreateForm(); })
      .catch(() => {});
    return true;
  }
  if (action === "ai-provider-choice") {
    const provider = ctx.PROVIDER_LABELS[target.dataset.value] ? target.dataset.value : "openai";
    appState.aiConfigDraft.provider = provider;
    appState.aiConfigDraft.model = ctx.defaultModelForProvider(provider);
    appState.aiConfigDraft.baseUrl = provider === "custom" ? (appState.aiConfigDraft.baseUrl || "https://api.deepseek.com/v1") : "";
    appState.aiModelCatalog.provider = "";
    appState.aiModelCatalog.options = [];
    appState.createAssistant.error = "";
    ctx.renderCreateForm();
    return true;
  }
  if (action === "fetch-ai-models") { ctx.fetchAiModelOptionsCurrentV2(); return true; }
  if (action === "save-ai-config") { ctx.saveAiConfigDraftCurrentV2(); return true; }
  if (action === "disconnect-ai-config") { ctx.disconnectAiConfigDraftCurrentV2(); return true; }
  return false;
}
