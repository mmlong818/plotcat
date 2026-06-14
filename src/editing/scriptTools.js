// 剧本批量编辑工具：全局查找替换、人名巡检。
// 从 app.js 外提；运行期依赖（render / markDirty）经工厂注入。
import { appState } from "../state.js";
import { list } from "../utils.js";
import { findUnknownSpeakers } from "./speakers.js";

// 全局查找替换扫描的场次字段
const SCENE_TEXT_FIELDS = ["title", "purpose", "obstacle", "beat_summary", "entry_state", "exit_state", "notes", "script_full", "screenplay_notes", "location"];

export function createScriptTools({ render, markDirty }) {
  // 全局查找替换：跨所有场次的剧本与字段（人名统一等批量修订）
  function globalFindReplace() {
    const find = window.prompt("全局查找（将扫描所有场次的剧本正文与字段）：")?.trim();
    if (!find) return;
    const scenes = list(appState.project.scene_workbench?.scenes);
    let hits = 0;
    const hitScenes = [];
    for (const scene of scenes) {
      let sceneHits = 0;
      for (const field of SCENE_TEXT_FIELDS) {
        const value = scene[field];
        if (typeof value === "string" && value.includes(find)) {
          sceneHits += value.split(find).length - 1;
        }
      }
      if (sceneHits > 0) { hits += sceneHits; hitScenes.push(`第 ${scene.order_index} 场（${sceneHits} 处）`); }
    }
    if (hits === 0) {
      alert(`没有找到「${find}」。`);
      return;
    }
    const replace = window.prompt(`「${find}」共 ${hits} 处，分布：${hitScenes.slice(0, 8).join("、")}${hitScenes.length > 8 ? " …" : ""}\n\n替换为（留空=取消）：`)?.trim();
    if (!replace) return;
    if (!confirm(`确认把全部 ${hits} 处「${find}」替换为「${replace}」？此操作影响所有场次。`)) return;
    for (const scene of scenes) {
      for (const field of SCENE_TEXT_FIELDS) {
        if (typeof scene[field] === "string" && scene[field].includes(find)) {
          scene[field] = scene[field].split(find).join(replace);
        }
      }
    }
    markDirty();
    render();
    alert(`已替换 ${hits} 处。`);
  }

  // 人名巡检：全量回扫所有已写场次，列出名单外说话人
  function auditScriptSpeakers() {
    const scenes = list(appState.project.scene_workbench?.scenes)
      .filter((s) => (s.script_full || "").trim().length > 50)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const findings = [];
    for (const scene of scenes) {
      const unknown = findUnknownSpeakers(scene.script_full);
      if (unknown.length > 0) findings.push(`第 ${scene.order_index} 场《${scene.title}》：${unknown.join("、")}`);
    }
    if (findings.length === 0) {
      alert(`人名巡检通过：${scenes.length} 个已写场次的说话人全部在人物名单内。`);
      return;
    }
    alert(`人名巡检发现 ${findings.length} 个场次存在名单外说话人：\n\n${findings.join("\n")}\n\n可用「查找替换」统一改名，或重新生成这些场次。`);
  }

  return { globalFindReplace, auditScriptSpeakers };
}
