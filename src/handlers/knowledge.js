import { ctx } from "./context.js";

export function handleKnowledgeClick(action, target, id, nodeId) {
  if (action === "kb-init") { ctx.kbFetchSources().then(() => ctx.kbSearch()); return true; }
  if (action === "kb-sync") { ctx.kbSync(); return true; }
  if (action === "kb-open-entry") { ctx.kbOpenEntry(id); return true; }
  if (action === "kb-import") { ctx.kbImport(target.dataset.target); return true; }
  return false;
}
