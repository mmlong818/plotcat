// 创作工作台 AI 簇：知识库检索/同步/导入、幕评师评分与修稿、类型契约/人物档案审计与修复、连续性提炼。
// 从 app.js 外提；运行期依赖（render / markDirty / normalizeProject）及 A 簇的
// callGenerateAPI / aiWriteSceneScript 经工厂注入。
import { appState } from "../state.js";
import { list } from "../utils.js";
import { createId } from "../shared/projectFactory.js";
import { getLivePlotCards } from "../logic/getters.js";

export function createCreationWorkbench({ render, markDirty, normalizeProject, callGenerateAPI, aiWriteSceneScript }) {
  // ── Knowledge sources ─────────────────────────────────────────────────────────

  async function kbFetchSources() {
    try {
      const r = await fetch("/api/knowledge/sources");
      const j = await r.json();
      appState.knowledge.sources = j.sources ?? [];
      if (!appState.knowledge.selectedSourceId && appState.knowledge.sources[0]) {
        appState.knowledge.selectedSourceId = appState.knowledge.sources[0].id;
      }
    } catch (e) {
      appState.knowledge.lastError = `加载知识源列表失败：${e.message}`;
    }
    render();
  }

  async function kbSearch() {
    const k = appState.knowledge;
    if (!k.selectedSourceId) return;
    k.loading = true;
    k.lastError = "";
    render();
    try {
      const params = new URLSearchParams({ q: k.query || "", limit: "30" });
      const r = await fetch(`/api/knowledge/${encodeURIComponent(k.selectedSourceId)}/search?${params}`);
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      k.items = j.items ?? [];
      k.total = j.total ?? 0;
      if (j.needsSync) k.lastError = "该源尚未同步本地数据，请先点「同步」。";
    } catch (e) {
      k.lastError = `搜索失败：${e.message}`;
      k.items = [];
      k.total = 0;
    } finally {
      k.loading = false;
      render();
    }
  }

  async function kbOpenEntry(externalId) {
    const k = appState.knowledge;
    if (!k.selectedSourceId) return;
    k.entryLoading = true;
    k.selectedEntry = { external_id: externalId, title: "...", body: "", tags: [], related: [] };
    render();
    try {
      const r = await fetch(`/api/knowledge/${encodeURIComponent(k.selectedSourceId)}/entry/${encodeURIComponent(externalId)}`);
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      k.selectedEntry = j.entry;
    } catch (e) {
      k.lastError = `加载详情失败：${e.message}`;
      k.selectedEntry = null;
    } finally {
      k.entryLoading = false;
      render();
    }
  }

  async function kbSync() {
    const k = appState.knowledge;
    if (!k.selectedSourceId) return;
    k.syncing = true;
    k.lastError = "";
    render();
    try {
      const r = await fetch(`/api/knowledge/${encodeURIComponent(k.selectedSourceId)}/sync`, { method: "POST" });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      // 刷新 sources status
      await kbFetchSources();
      k.lastImportMessage = `同步完成：${j.total} 条条目`;
      setTimeout(() => { k.lastImportMessage = ""; render(); }, 4000);
    } catch (e) {
      k.lastError = `同步失败：${e.message}`;
    } finally {
      k.syncing = false;
      render();
    }
  }

  async function kbImport(target) {
    const k = appState.knowledge;
    const detail = k.selectedEntry;
    if (!detail || !detail.body) return;
    k.importing = true;
    render();
    try {
      const { buildImportPatch } = await import("../knowledge/importer.js");
      const { field, item } = buildImportPatch(detail, target);
      if (!appState.project.story_bible[field]) appState.project.story_bible[field] = [];
      appState.project.story_bible[field].push(item);
      normalizeProject();
      markDirty();
      k.lastImportMessage = `已导入到本地「${field === "world_rules" ? "世界规则" : field === "setup_payoffs" ? "伏笔追踪" : "时间线"}」。可切到对应 tab 查看。`;
      setTimeout(() => { k.lastImportMessage = ""; render(); }, 4000);
    } catch (e) {
      k.lastError = `导入失败：${e.message}`;
    } finally {
      k.importing = false;
      render();
    }
  }

  // ── Screenplay AI ─────────────────────────────────────────────────────────────

  async function aiRateScene(sceneId) {
    const scene = list(appState.project.scene_workbench?.scenes).find((s) => s.id === sceneId);
    if (!scene) return;
    if (!scene.script_full || scene.script_full.trim().length < 80) {
      alert("本场还没写剧本，无法评分");
      return;
    }
    if (!appState.raterLoading) appState.raterLoading = {};
    appState.raterLoading[sceneId] = true;
    render();
    try {
      const result = await callGenerateAPI("act_rater", appState.project, {
        sceneId,
        scriptText: scene.script_full,
        genres: list(appState.project.project?.genre),
        tones: appState.project.project?.tone ? [appState.project.project.tone] : [],
        focuses: [],
        audience: ""
      });
      if (result.error) throw new Error(result.error);
      const data = result.choices?.[0]?.data ?? {};
      appState.raterResult = { sceneId, data };
    } catch (err) {
      alert("幕评师评分失败：" + err.message);
    } finally {
      delete appState.raterLoading[sceneId];
      render();
    }
  }

  async function aiRateScreenplayFull() {
    const scenes = list(appState.project.scene_workbench?.scenes);
    const writtenScenes = scenes.filter((s) => s.script_full && s.script_full.trim().length > 50);
    if (writtenScenes.length === 0) {
      alert("还没有任何已写场，无法进行全片评分");
      return;
    }
    appState.raterFullLoading = true;
    render();
    try {
      const result = await callGenerateAPI("act_rater", appState.project, {
        mode: "full",
        genres: list(appState.project.project?.genre),
        tones: appState.project.project?.tone ? [appState.project.project.tone] : [],
        focuses: [],
        audience: ""
      });
      if (result.error) throw new Error(result.error);
      const data = result.choices?.[0]?.data ?? {};
      appState.raterResult = { mode: "full", data };
    } catch (err) {
      alert("全片幕评师评分失败：" + err.message);
    } finally {
      appState.raterFullLoading = false;
      render();
    }
  }

  async function aiReviseFullScreenplayWithRater() {
    const rater = appState.raterResult;
    if (!rater || rater.mode !== "full") {
      alert("请先用全片幕评师评分");
      return;
    }
    const directives = rater.data.revision_directives || [];
    if (directives.length === 0) {
      alert("评分中未给出修稿指令");
      return;
    }
    // 按 sceneId 分组，每场注入对应 directives 进 notes
    const bySceneId = new Map();
    for (const d of directives) {
      const sid = d.scene_id;
      if (!sid) continue;
      if (!bySceneId.has(sid)) bySceneId.set(sid, []);
      bySceneId.get(sid).push(d);
    }
    if (bySceneId.size === 0) {
      alert("修稿指令未标注 scene_id，无法定向应用");
      return;
    }
    if (!confirm(`将按全片评审指令重写 ${bySceneId.size} 场剧本，可能耗时较长。继续？`)) return;

    for (const [sceneId, dirs] of bySceneId) {
      const scene = list(appState.project.scene_workbench?.scenes).find((s) => s.id === sceneId);
      if (!scene) continue;
      // 修稿指令存专用字段，不污染用户可见的创作笔记（notes）；写本成功后一次性消费清空
      scene.rater_directives = dirs.map((d, i) =>
        `${i + 1}. [${d.severity}] ${d.issue}\n   定位：${d.location_hint || "（未给定位）"}\n   要求：${d.directive}`
      ).join("\n");
    }
    markDirty();
    appState.raterResult = null;
    render();

    // 按 order_index 顺序依次重写每场
    const sceneIds = Array.from(bySceneId.keys());
    const sortedScenes = list(appState.project.scene_workbench?.scenes)
      .filter((s) => sceneIds.includes(s.id))
      .sort((a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999));
    appState.screenplayAi.bulkRunning = true;
    appState.screenplayAi.bulkProgress = { done: 0, total: sortedScenes.length };
    render();
    for (const s of sortedScenes) {
      await aiWriteSceneScript(s.id, { silent: true });
      appState.screenplayAi.bulkProgress.done += 1;
      render();
    }
    appState.screenplayAi.bulkRunning = false;
    render();
  }

  async function aiReviseSceneWithRater(sceneId) {
    const rater = appState.raterResult;
    if (!rater || rater.sceneId !== sceneId) {
      alert("请先用幕评师评分");
      return;
    }
    const scene = list(appState.project.scene_workbench?.scenes).find((s) => s.id === sceneId);
    if (!scene) return;
    const directives = (rater.data.revision_directives || []).map((d, i) =>
      `${i + 1}. [${d.severity}] ${d.issue}\n   定位：${d.location_hint}\n   要求：${d.directive}`
    ).join("\n");
    // 修稿指令存专用字段（buildSceneScriptPrompt 单独消费），不污染用户可见的创作笔记
    scene.rater_directives = directives;
    markDirty();
    appState.raterResult = null;
    render();
    await aiWriteSceneScript(sceneId, { silent: true });
  }

  // ── 类型契约审计：AI 逐条核验必备场景兑现 + 禁忌检查，结果存 genre_profile ────
  async function aiGenreAudit() {
    const scenes = list(appState.project.scene_workbench?.scenes);
    if (scenes.length === 0) {
      alert("还没有场景，无法检查契约兑现。");
      return;
    }
    appState.genreAuditLoading = true;
    render();
    try {
      const result = await callGenerateAPI("genre_audit", appState.project, {});
      if (result.error) throw new Error(result.error);
      const data = result.choices?.[0]?.data ?? {};
      if (!Array.isArray(data.fulfillment)) throw new Error("AI 未返回审计结果");
      appState.project.genre_profile.fulfillment_audit = {
        fulfillment: data.fulfillment,
        taboo_violations: list(data.taboo_violations),
        blend_balance: data.blend_balance ?? "",
        audited_at: new Date().toISOString()
      };
      markDirty();
    } catch (error) {
      alert(`契约审计失败：${error.message}`);
    } finally {
      appState.genreAuditLoading = false;
      render();
    }
  }

  // ── 人物档案兑现体检：档案承诺对照正文核验，结果存 character_hub ──────────────
  async function aiCharacterAudit() {
    const written = list(appState.project.scene_workbench?.scenes).filter((sc) => (sc.script_full || "").trim().length > 200);
    if (written.length < 3) {
      alert("已写场次不足（<3 场），档案体检需要正文作对照。先写一些剧本再来。");
      return;
    }
    appState.characterAuditLoading = true;
    render();
    try {
      const result = await callGenerateAPI("character_audit", appState.project, {});
      if (result.error) throw new Error(result.error);
      const data = result.choices?.[0]?.data ?? {};
      if (!Array.isArray(data.characters)) throw new Error("AI 未返回体检结果");
      appState.project.character_hub.fulfillment_audit = {
        characters: data.characters,
        audited_at: new Date().toISOString()
      };
      markDirty();
    } catch (error) {
      alert(`档案体检失败：${error.message}`);
    } finally {
      appState.characterAuditLoading = false;
      render();
    }
  }

  // ── 契约修复闭环：审计问题 → 修稿指令/新增场景 → 可选定向重生成 ──────────────
  async function aiGenreRemedy() {
    const audit = appState.project.genre_profile?.fulfillment_audit;
    const hasProblems = list(audit?.fulfillment).some((f) => f.status !== "fulfilled") || list(audit?.taboo_violations).length > 0;
    if (!audit || !hasProblems) {
      alert("没有待修复的契约问题。先点「检查契约兑现」做一次审计。");
      return;
    }
    appState.genreRemedyLoading = true;
    render();
    try {
      const result = await callGenerateAPI("genre_remedy", appState.project, {});
      if (result.error) throw new Error(result.error);
      const data = result.choices?.[0]?.data ?? {};
      const directives = list(data.scene_directives);
      const newScenes = list(data.new_scenes);
      if (directives.length === 0 && newScenes.length === 0) throw new Error("AI 未给出手术方案");

      const scenes = list(appState.project.scene_workbench?.scenes);
      const byOrder = new Map(scenes.map((s) => [Number(s.order_index), s]));
      const charByName = new Map(list(appState.project.character_hub?.characters).map((c) => [c.name, c.id]));
      const cardById = new Map(getLivePlotCards().map((c) => [c.id, c]));

      // 1. 修稿指令写入既有场次（叠加，不覆盖已有指令）。
      // 用 scene.id 追踪重生成目标——插入新场后 order_index 会整体重排，按场次号会错位漏场
      const directiveOrders = [];
      const targetSceneIds = new Set();
      for (const d of directives) {
        const scene = byOrder.get(Number(d.scene_order));
        if (!scene || !d.directive) continue;
        scene.rater_directives = [scene.rater_directives, d.directive].filter(Boolean).join("\n\n");
        directiveOrders.push(Number(d.scene_order));
        targetSceneIds.add(scene.id);
      }
      // 2. 新增场景插入指定位置
      const insertedTitles = [];
      for (const ns of newScenes) {
        const card = cardById.get(ns.card_id) ?? null;
        const scene = {
          id: createId("scene"),
          order_index: 0,
          title: ns.title || "未命名场景",
          act_id: card?.act_id ?? "",
          linked_plot_card_ids: card ? [card.id] : [],
          pov_character_id: charByName.get((ns.pov_name || "").trim()) ?? "",
          location: ns.location ?? "",
          time_of_day: ns.time_of_day ?? "",
          purpose: ns.purpose ?? "",
          obstacle: ns.obstacle ?? "",
          beat_summary: ns.beat_summary ?? "",
          entry_state: "",
          exit_state: "",
          status: "draft",
          script_excerpt: "",
          notes: ns.fulfills ? `兑现类型必备场景：${ns.fulfills}` : ""
        };
        const after = Number(ns.insert_after_order) || scenes.length;
        const sorted = list(appState.project.scene_workbench.scenes).sort((a, b) => a.order_index - b.order_index);
        const pos = sorted.findIndex((s) => Number(s.order_index) === after);
        sorted.splice(pos >= 0 ? pos + 1 : sorted.length, 0, scene);
        sorted.forEach((s, i) => { s.order_index = i + 1; });
        appState.project.scene_workbench.scenes = sorted;
        insertedTitles.push(`《${scene.title}》（第 ${scene.order_index} 场）`);
        targetSceneIds.add(scene.id);
      }
      normalizeProject();
      markDirty();
      render();

      const summary = [
        directives.length ? `已为 ${directiveOrders.length} 个场次写入修稿指令（第 ${directiveOrders.join("、")} 场）` : "",
        insertedTitles.length ? `已新增 ${insertedTitles.length} 场：${insertedTitles.join("、")}` : "",
        data.reasoning ? `\n手术思路：${data.reasoning}` : ""
      ].filter(Boolean).join("\n");

      // 3. 可选：立即串行重生成受影响场次（带指令的重写 + 新增场写稿）
      const regenTargets = list(appState.project.scene_workbench?.scenes)
        .filter((s) => targetSceneIds.has(s.id))
        .sort((a, b) => a.order_index - b.order_index);
      if (regenTargets.length > 0 && confirm(`${summary}\n\n是否立即按指令重生成这 ${regenTargets.length} 场？（每场约 2 分钟，可稍后在剧本页逐场手动生成）`)) {
        for (const target of regenTargets) {
          const r = await aiWriteSceneScript(target.id, { silent: true });
          if (!r.ok) {
            alert(`第 ${target.order_index} 场生成失败：${r.reason}。剩余场次已停止，可稍后手动生成。`);
            break;
          }
        }
        alert("契约修复重生成完成。建议重新点「检查契约兑现」复核。");
      } else if (regenTargets.length === 0) {
        alert(summary);
      }
    } catch (error) {
      alert(`契约修复失败：${error.message}`);
    } finally {
      appState.genreRemedyLoading = false;
      normalizeProject();
      render();
    }
  }

  // ── 连续性提炼：AI 通读剧情卡+场景表，回填伏笔追踪与时间线到资料库 ────────────
  async function aiExtractContinuity() {
    const scenes = list(appState.project.scene_workbench?.scenes);
    if (scenes.length === 0) {
      alert("还没有场景。请先完成场景拆解，再提炼连续性资料。");
      return;
    }
    appState.continuityExtractLoading = true;
    render();
    try {
      const result = await callGenerateAPI("continuity_extraction", appState.project, {});
      if (result.error) throw new Error(result.error);
      const data = result.choices?.[0]?.data ?? {};
      const sceneByOrder = new Map(scenes.map((s) => [Number(s.order_index), s]));
      const charByName = new Map(list(appState.project.character_hub?.characters).map((c) => [c.name, c.id]));
      const proj = appState.project;
      proj.story_bible = proj.story_bible || {};

      // 伏笔：按 setup_summary 去重合并
      const existingSetups = new Set(list(proj.lock_layer?.projections?.setup_payoffs).map((s) => s.setup_summary));
      let addedSetups = 0;
      for (const item of list(data.setup_payoffs)) {
        if (!item.setup_summary || existingSetups.has(item.setup_summary)) continue;
        // 防假 resolved：AI 声称的回收必须在该场正文里有实际痕迹
        // （payoff_summary 的关键词片段能在 script_full 中找到），否则降级为 open
        const payoffScene = sceneByOrder.get(Number(item.payoff_scene_order));
        const payoffVerified = (() => {
          if (!payoffScene || !item.payoff_summary) return false;
          const script = payoffScene.script_full || "";
          if (script.trim().length < 50) return false;
          // 取 payoff 摘要里的 2-6 字中文词组做存在性抽查，命中任意一个即认可
          const tokens = String(item.payoff_summary).match(/[一-龥]{2,6}/g) ?? [];
          return tokens.some((t) => script.includes(t));
        })();
        const setup = {
          id: createId("setup"),
          setup_summary: item.setup_summary,
          setup_scene_id: sceneByOrder.get(Number(item.setup_scene_order))?.id ?? "",
          expected_payoff_window: item.expected_payoff_window ?? "",
          status: payoffVerified ? "closed" : "open",
          payoff_scene_id: payoffVerified ? payoffScene.id : "",
          payoff_summary: payoffVerified ? (item.payoff_summary ?? "") : ""
        };
        proj.lock_layer.projections.setup_payoffs.push(setup);
        proj.story_bible.setup_payoffs = list(proj.story_bible.setup_payoffs);
        proj.story_bible.setup_payoffs.push(setup);
        addedSetups++;
      }
      // 时间线：按 summary 去重合并
      const existingEvents = new Set(list(proj.lock_layer?.projections?.timeline_events).map((e) => e.summary));
      let addedEvents = 0;
      for (const item of list(data.timeline_events)) {
        if (!item.summary || existingEvents.has(item.summary)) continue;
        const event = {
          id: createId("event"),
          story_day: Number(item.story_day) || 1,
          sequence_index: 1,
          summary: item.summary,
          participants: list(item.participants_names).map((n) => charByName.get(String(n).trim())).filter(Boolean),
          location: item.location ?? "",
          trigger: "",
          consequence: ""
        };
        proj.lock_layer.projections.timeline_events.push(event);
        proj.story_bible.timeline_events = list(proj.story_bible.timeline_events);
        proj.story_bible.timeline_events.push(event);
        addedEvents++;
      }
      // 专名连戏表 → 硬性世界规则（scope=专名连戏）。
      // buildSceneScriptPrompt 注入「已锁定世界规则」，后续所有写本自动遵守，闭合编号漂移
      const existingRules = new Set(list(proj.lock_layer?.projections?.world_rules).map((r) => r.rule_statement));
      let addedNouns = 0;
      for (const item of list(data.proper_nouns)) {
        if (!item.term) continue;
        const statement = `专名一律写作「${item.term}」（${item.kind ?? "专名"}）${item.note ? `——${item.note}` : ""}`;
        if (existingRules.has(statement)) continue;
        const rule = {
          id: createId("rule"),
          rule_statement: statement,
          rule_level: "hard",
          scope: "专名连戏",
          exceptions: [],
          evidence: []
        };
        proj.lock_layer.projections.world_rules.push(rule);
        proj.story_bible.world_rules = list(proj.story_bible.world_rules);
        proj.story_bible.world_rules.push(rule);
        addedNouns++;
      }
      markDirty();
      alert(`提炼完成：新增 ${addedSetups} 组伏笔、${addedEvents} 条时间线事件、${addedNouns} 条专名连戏规则。`);
    } catch (error) {
      alert(`提炼失败：${error.message}`);
    } finally {
      appState.continuityExtractLoading = false;
      normalizeProject();
      render();
    }
  }

  return {
    kbFetchSources, kbSearch, kbOpenEntry, kbSync, kbImport,
    aiRateScene, aiRateScreenplayFull, aiReviseFullScreenplayWithRater, aiReviseSceneWithRater,
    aiGenreAudit, aiCharacterAudit, aiGenreRemedy, aiExtractContinuity
  };
}
