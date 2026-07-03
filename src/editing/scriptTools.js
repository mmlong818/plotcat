// 剧本批量编辑工具：全局查找替换、人名巡检。
// 从 app.js 外提；运行期依赖（render / markDirty）经工厂注入。
import { appState } from "../state.js";
import { list } from "../utils.js";
import { findUnknownSpeakers, findRosterNameDrift } from "./speakers.js";

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

  // 人名巡检：全量回扫所有已写场次，列出名单外说话人 + 动作行里的同姓漂移人名。
  // 结果写入 appState.scriptAuditResult 由剧本页渲染成面板（可复制、可点场次跳转），不再用 alert。
  function auditScriptSpeakers() {
    const scenes = list(appState.project.scene_workbench?.scenes)
      .filter((s) => (s.script_full || "").trim().length > 50)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const findings = [];
    for (const scene of scenes) {
      const unknown = findUnknownSpeakers(scene.script_full);
      if (unknown.length > 0) {
        findings.push({ sceneId: scene.id, orderIndex: scene.order_index, title: scene.title, kind: "名单外说话人", names: unknown });
      }
      const drift = findRosterNameDrift(scene.script_full);
      if (drift.length > 0) {
        findings.push({ sceneId: scene.id, orderIndex: scene.order_index, title: scene.title, kind: "疑似人名漂移（引号内与名单同姓但不在名单）", names: drift });
      }
    }
    appState.scriptAuditResult = { checkedCount: scenes.length, findings };
    render();
  }

  return { globalFindReplace, auditScriptSpeakers };
}
