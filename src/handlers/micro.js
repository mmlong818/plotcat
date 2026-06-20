import { ctx } from "./context.js";
import { appState } from "../state.js";

// 微短剧创作区交互（节点流水线导航等）。
export function handleMicroClick(action, target, id, nodeId) {
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
  if (action === "ai-gen-dialogue") { ctx.aiGenDialogue(); return true; }    // ⑧分集写本
  if (action === "ai-gen-themelift") { ctx.aiGenThemeLift(); return true; }  // ⑪主题升华
  if (action === "ai-gen-gender") { ctx.aiGenGender(); return true; }        // ⑨性别向
  if (action === "select-gender-mode") {                                      // ⑨频向切换
    const gt = appState.project.gender_tune ?? (appState.project.gender_tune = {});
    gt.mode = id;
    ctx.markDirty(); ctx.render();
    return true;
  }
  return false;
}
