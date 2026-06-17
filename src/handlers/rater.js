import { ctx } from "./context.js";
import { appState } from "../state.js";

export function handleRaterClick(action, target, id, nodeId) {
  if (action === "close-rater") {
    appState.raterResult = null;
    ctx.render();
    return true;
  }
  if (action === "apply-rater-revision") {
    ctx.aiReviseSceneWithRater(id);
    return true;
  }
  if (action === "apply-rater-revision-full") {
    ctx.aiReviseFullScreenplayWithRater();
    return true;
  }
  return false;
}
