// AI 场景生成簇：全片场景表规划/落地、单场拆解、写本、批量写本，以及 /api/generate 调用封装。
// 从 app.js 外提；运行期依赖（render / markDirty / normalizeProject）经工厂注入，
// callGenerateAPI / callGenerateAPIStream 由工厂返回供 app.js 其余生成流程复用。
import { appState } from "../state.js";
import { list, unique } from "../utils.js";
import { createId } from "../shared/projectFactory.js";
import { getLivePlotCards } from "../logic/getters.js";
import { findUnknownSpeakers } from "../editing/speakers.js";

// 各作品形态的标准场数目标（剧情卡 1:N 拆场凑齐）
export const SCENE_TARGETS_BY_FORMAT = {
  feature: 32, feature_film: 32, feature_or_pilot: 28,
  tv_pilot: 26, pilot: 26, series: 26,
  short: 12, micro_drama: 60, microdrama: 60
};

export function createSceneGeneration({ render, markDirty, normalizeProject }) {
  function applySceneExpansion(planned) {
    const live = list(appState.project.scene_workbench?.scenes);
    const byId = new Map(live.map((s) => [s.id, s]));
    const charByName = new Map(list(appState.project.character_hub?.characters).map((c) => [c.name, c.id]));
    const cardById = new Map(getLivePlotCards().map((c) => [c.id, c]));
    const used = new Set();
    const nextScenes = [];
    for (const item of planned) {
      if (item.existing_scene_id && byId.has(item.existing_scene_id)) {
        if (used.has(item.existing_scene_id)) continue;
        used.add(item.existing_scene_id);
        nextScenes.push(byId.get(item.existing_scene_id));
        continue;
      }
      const card = cardById.get(item.card_id);
      if (!card) continue;
      nextScenes.push({
        id: createId("scene"),
        order_index: 0,
        title: item.title || card.title || "未命名场景",
        act_id: card.act_id,
        linked_plot_card_ids: [card.id],
        pov_character_id: charByName.get((item.pov_name || "").trim()) ?? "",
        location: item.location ?? "",
        time_of_day: item.time_of_day ?? "",
        purpose: item.purpose ?? "",
        obstacle: item.obstacle ?? "",
        beat_summary: item.beat_summary ?? "",
        entry_state: "",
        exit_state: "",
        status: "draft",
        script_excerpt: "",
        notes: ""
      });
      // fulfills_setup 自动锚定：把伏笔的埋设/回收场指到这个新场，
      // 写本时即触发「本场伏笔任务」硬性块，状态同步也随之闭环
      const fulfills = String(item.fulfills_setup ?? "").trim();
      if (fulfills) {
        const isPay = fulfills.startsWith("pay:");
        const key = fulfills.replace(/^(plant:|pay:)/, "").trim().slice(0, 12);
        if (key) {
          for (const arr of [list(appState.project.lock_layer?.projections?.setup_payoffs), list(appState.project.story_bible?.setup_payoffs)]) {
            const sp = arr.find((x) => (x.setup_summary || "").includes(key));
            if (!sp) continue;
            const newScene = nextScenes[nextScenes.length - 1];
            if (isPay) { if (!sp.payoff_scene_id) sp.payoff_scene_id = newScene.id; }
            else if (!sp.setup_scene_id) sp.setup_scene_id = newScene.id;
          }
        }
      }
    }
    // 安全网：规划漏掉的已有场景（尤其有成稿的）一律保留，追加到末尾，绝不丢场
    for (const scene of live) {
      if (!used.has(scene.id)) nextScenes.push(scene);
    }
    // 新建项目的「开场场景」占位场：没写过、没挂剧情卡、没定地点，
    // 规划出真实场景表之后它只剩一个 ⚠ 游离空壳钉在第 1 位，清掉
    const cleaned = nextScenes.length > 1
      ? nextScenes.filter((s) => !(
          s.title === "开场场景" &&
          !(s.script_full || s.script_excerpt || "").trim() &&
          list(s.linked_plot_card_ids).length === 0 &&
          ["", "待定地点"].includes((s.location || "").trim())
        ))
      : nextScenes;
    cleaned.forEach((scene, index) => { scene.order_index = index + 1; });
    appState.project.scene_workbench.scenes = cleaned;
  }

  async function aiExpandScenes() {
    const cards = getLivePlotCards();
    if (cards.length === 0) {
      alert("还没有剧情卡。请先在「剧情开发」生成剧情卡，再规划全片场景表。");
      return;
    }
    const format = appState.project.project.format ?? "feature";
    const target = SCENE_TARGETS_BY_FORMAT[format] ?? 28;
    const existing = list(appState.project.scene_workbench?.scenes);
    if (!confirm(`AI 将把 ${cards.length} 张剧情卡拆成约 ${target} 场的全片场景表（一个节拍通常需要 2-4 场戏）。\n已有 ${existing.length} 场全部保留（含成稿），新场景按放映顺序插入。继续？`)) return;
    appState.sceneExpandLoading = true;
    render();
    try {
      const result = await callGenerateAPI("scene_expansion", appState.project, { targetSceneCount: target });
      if (result.error) throw new Error(result.error);
      const planned = list(result.choices?.[0]?.data?.scenes);
      if (planned.length === 0) throw new Error("AI 未返回场景表");
      applySceneExpansion(planned);
      markDirty();
      const overlaps = list(result.choices?.[0]?.data?.overlap_warnings);
      if (overlaps.length > 0) {
        alert(`扩场完成，但 AI 提示以下已有场景与新规划撞车，建议重写或删除：\n\n${overlaps.join("\n")}`);
      }
    } catch (error) {
      alert(`扩场失败：${error.message}`);
    } finally {
      appState.sceneExpandLoading = false;
      normalizeProject();
      render();
    }
  }

  async function aiBreakdownScene(sceneId) {
    if (!appState.sceneBreakdownLoading) appState.sceneBreakdownLoading = {};
    if (appState.sceneBreakdownLoading[sceneId]) return;
    appState.sceneBreakdownLoading[sceneId] = true;
    render();
    try {
      const result = await callGenerateAPI("scene_breakdown", appState.project, { sceneId });
      if (result.error) throw new Error(result.error);
      const data = result.choices?.[0]?.data ?? {};
      const scene = list(appState.project.scene_workbench?.scenes).find((s) => s.id === sceneId);
      if (!scene) throw new Error("场景已被移除");
      if (data.entry_state) scene.entry_state = String(data.entry_state).trim();
      if (data.exit_state)  scene.exit_state  = String(data.exit_state).trim();
      if (data.obstacle)    scene.obstacle    = String(data.obstacle).trim();
      if (data.beat_summary) scene.beat_summary = String(data.beat_summary).trim();
      // 落地拍摄定位：无效占位（待定/未定/空）才用 AI 结果覆盖，避免抹掉用户已填的地点
      const badLoc = (v) => !v || /待定|未定/.test(v);
      if (data.location && badLoc(scene.location)) scene.location = String(data.location).trim();
      if (data.time_of_day && badLoc(scene.time_of_day)) scene.time_of_day = String(data.time_of_day).trim();
      markDirty();
    } catch (err) {
      alert("AI 拆这场失败：" + err.message);
    } finally {
      delete appState.sceneBreakdownLoading[sceneId];
      render();
    }
  }

  async function aiWriteSceneScript(sceneId, { silent = false } = {}) {
    // 先确认场景存在 + 取标题（不要持有引用 — render() 调用 normalizeProject 会替换 project 对象）
    const peekScene = list(appState.project.scene_workbench?.scenes).find((s) => s.id === sceneId);
    if (!peekScene) return { ok: false, reason: "scene not found" };
    const sceneTitle = peekScene.title;
    if (peekScene.script_full && peekScene.script_full.trim().length > 50 && !silent) {
      if (!confirm("本场已有剧本内容，AI 生成将覆盖。继续？")) return { ok: false, reason: "user cancel" };
    }
    appState.screenplayAi.busySceneIds = unique([...appState.screenplayAi.busySceneIds, sceneId]);
    appState.screenplayAi.lastError = "";
    render();
    try {
      const result = await callGenerateAPI("scene_script", appState.project, { sceneId });
      if (result.error) throw new Error(result.error);
      const data = result.choices?.[0]?.data ?? {};
      const script = (data.script ?? "").trim();
      if (!script) throw new Error("AI 返回了空剧本");
      // 关键：重新查找而非用 captured 引用，因为 render() 期间 normalizeProject 会替换 appState.project
      const liveScene = list(appState.project.scene_workbench?.scenes).find((s) => s.id === sceneId);
      if (!liveScene) throw new Error("场景在生成期间被移除");
      liveScene.script_full = script;
      // AI 成稿后回写场景工作流状态，避免场景页一直停留在手填「草稿」与剧本页口径打架
      liveScene.status = "scripted";
      // 人名白名单事后校验：抓对白说话人行，比对项目人物名单，发现名单外人名立即提示
      const unknownNames = findUnknownSpeakers(script);
      if (unknownNames.length > 0) {
        const warn = `⚠ 名单外人物名：${unknownNames.join("、")}（请检查是否应为已有角色，或在人物页补建）`;
        liveScene.screenplay_notes = [liveScene.screenplay_notes, warn].filter(Boolean).join("\n");
      }
      // 幕评师修稿指令是一次性的：本轮重写已消费，清空避免影响后续无关生成
      if (liveScene.rater_directives) liveScene.rater_directives = "";
      if (data.end_hook || data.emotion_arc) {
        const notesParts = [
          liveScene.screenplay_notes,
          data.emotion_arc ? `情感弧：${data.emotion_arc}` : "",
          data.end_hook ? `结尾钩子：${data.end_hook}` : "",
          data.reasoning ? `AI 思路：${data.reasoning}` : ""
        ].filter(Boolean);
        liveScene.screenplay_notes = notesParts.join("\n");
      }
      markDirty();
      return { ok: true };
    } catch (error) {
      appState.screenplayAi.lastError = `场景「${sceneTitle || sceneId}」生成失败：${error.message}`;
      return { ok: false, reason: error.message };
    } finally {
      appState.screenplayAi.busySceneIds = appState.screenplayAi.busySceneIds.filter((id) => id !== sceneId);
      render();
    }
  }

  async function aiWriteScreenplayBulk() {
    if (appState.screenplayAi.bulkRunning) return;
    const allScenes = () => list(appState.project.scene_workbench?.scenes)
      .slice()
      .sort((a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999));
    const pickUnwritten = () => allScenes().filter((s) => !s.script_full || s.script_full.trim().length < 50);

    const initialTargets = pickUnwritten();
    if (initialTargets.length === 0) {
      alert("所有场景都已有剧本内容。若需要重写，请逐场使用「AI 写本场」。");
      return;
    }
    if (!confirm(`将依次为 ${initialTargets.length} 个未撰写场景生成剧本，可能耗时较长。继续？`)) return;

    appState.screenplayAi.bulkRunning = true;
    appState.screenplayAi.bulkProgress = { done: 0, total: initialTargets.length };
    appState.screenplayAi.lastError = "";
    render();

    // 第一轮：顺序生成所有未撰写场景
    for (const scene of initialTargets) {
      await aiWriteSceneScript(scene.id, { silent: true });
      appState.screenplayAi.bulkProgress.done += 1;
      render();
    }

    // 第二轮：重试本轮仍为空的场景（瞬时 API 失败常在长队列尾端集中出现）
    const stillEmpty = pickUnwritten();
    if (stillEmpty.length > 0) {
      appState.screenplayAi.bulkProgress = { done: 0, total: stillEmpty.length };
      appState.screenplayAi.lastError = `第一轮 ${stillEmpty.length} 场失败，自动重试中...`;
      render();
      for (const scene of stillEmpty) {
        await aiWriteSceneScript(scene.id, { silent: true });
        appState.screenplayAi.bulkProgress.done += 1;
        render();
      }
    }

    appState.screenplayAi.bulkRunning = false;
    const finalEmpty = pickUnwritten();
    if (finalEmpty.length > 0) {
      appState.screenplayAi.lastError = `仍有 ${finalEmpty.length} 场生成失败：${finalEmpty.slice(0, 3).map((s) => s.title).join("、")}${finalEmpty.length > 3 ? "..." : ""}。可逐场点「AI 写本场」单独重试。`;
    } else {
      appState.screenplayAi.lastError = "";
    }
    render();
  }

  // ── Creation API call ─────────────────────────────────────────────────────────

  async function callGenerateAPI(step, projectContext, options) {
    const controller = new AbortController();
    const timeoutMs = step === "title" ? 60000 : step === "scene_expansion" ? 240000 : 180000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, projectContext, options }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      const message = error.name === "AbortError"
        ? `AI 响应超时（${Math.round(timeoutMs / 1000)} 秒内未完成）`
        : error.message;
      return { choices: [], reasoning: "", warnings: [], error: message };
    } finally {
      clearTimeout(timer);
    }
  }

  // 流式调用：边生成边展示，onChunk(text) 实时回调，resolve 最终 result
  let _cfAbortController = null;

  async function callGenerateAPIStream(step, projectContext, options, onChunk) {
    _cfAbortController?.abort();
    const controller = new AbortController();
    _cfAbortController = controller;
    // 静默超时：区分「首字节」与「字节间」两段。重推理步骤（如 characters 的多字段心理档案）
    // 首 token 前模型会长时间思考，故首字节给更长宽限；流开始后用较短的 idle 超时兜底卡死。
    const FIRST_BYTE_TIMEOUT_MS = 120000;
    const IDLE_TIMEOUT_MS = 60000;
    let idleTimer = null;
    let timedOut = false;
    let started = false;
    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      const ms = started ? IDLE_TIMEOUT_MS : FIRST_BYTE_TIMEOUT_MS;
      idleTimer = setTimeout(() => { timedOut = true; controller.abort(); }, ms);
    };
    try {
      resetIdleTimer();
      const response = await fetch("/api/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, projectContext, options }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        started = true;
        resetIdleTimer();
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let evt;
          try { evt = JSON.parse(line.slice(6)); } catch { continue; }
          if (evt.type === "chunk") onChunk?.(evt.text);
          if (evt.type === "done") { if (idleTimer) clearTimeout(idleTimer); return evt; }
          if (evt.type === "error") { if (idleTimer) clearTimeout(idleTimer); return { choices: [], reasoning: "", warnings: [], error: evt.message }; }
        }
      }
      return { choices: [], reasoning: "", warnings: [], error: "流式响应未正常结束（模型可能未返回有效内容，检查设置里的模型连接）" };
    } catch (error) {
      if (error.name === "AbortError") {
        if (timedOut) return { choices: [], reasoning: "", warnings: [], error: "AI 响应超时（长时间无数据）。请检查设置 → 模型连接，确认所选模型可用。" };
        return { choices: [], reasoning: "", warnings: [], cancelled: true };
      }
      // 把生硬的技术错误（Failed to fetch / HTTP 5xx）翻译成编剧看得懂的提示，技术细节保留在括号内
      const raw = error.message || "未知错误";
      const friendly = /failed to fetch|networkerror|load failed/i.test(raw)
        ? `无法连接到模型服务（网络中断或服务未响应）。请检查网络与设置 → 模型连接。（${raw}）`
        : /^HTTP\s*\d/i.test(raw)
          ? `模型服务返回错误，请稍后重试或检查设置 → 模型连接。（${raw}）`
          : raw;
      return { choices: [], reasoning: "", warnings: [], error: friendly };
    } finally {
      if (idleTimer) clearTimeout(idleTimer);
    }
  }

  // 中止进行中的流式生成（供创作流「取消生成」按钮调用——abort 控制器是本闭包私有的）
  function cancelGeneration() {
    _cfAbortController?.abort();
  }

  return {
    applySceneExpansion,
    aiExpandScenes,
    aiBreakdownScene,
    aiWriteSceneScript,
    aiWriteScreenplayBulk,
    callGenerateAPI,
    callGenerateAPIStream,
    cancelGeneration
  };
}
