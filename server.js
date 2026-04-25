import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateActNodes,
  generateCreateWizardConceptOptions,
  generateCreateWizardStep,
  generateExpertResponse,
  getAiStatus,
  listAvailableModels,
  regenerateCreateWizardField,
  updateAiConfig
} from "./src/server/ai.js";
import { getDbInfo } from "./src/server/db.js";
import {
  createProject,
  createProjectVersion,
  deleteProject,
  ensureProjectSeeded,
  listProjectVersions,
  listProjects,
  loadProject,
  resetProject,
  restoreProjectVersion,
  saveProject,
  touchProject
} from "./src/server/repository.js";
import { computeIssues, summarizeIssues } from "./src/logic/rules.js";
import { createId } from "./src/shared/projectFactory.js";
import { structurePresets } from "./src/state.js";
import { generateContent, buildPromptForStep, formatStepResult, parseJsonFromText, buildEvaluatePromptForStep } from "./src/ai/generator.js";
import { buildAnalyzeAnchorPrompt, buildWorkbenchQuestionsPrompt, buildAssemblePrompt } from "./src/ai/proPrompts.js";
import { spawn } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = 4173;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

ensureProjectSeeded();

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function safePath(urlPath) {
  const rawPath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.normalize(path.join(root, rawPath));
  if (!filePath.startsWith(root)) {
    return null;
  }
  return filePath;
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) {
        reject(new Error("请求体过大"));
      }
    });
    request.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("JSON 解析失败"));
      }
    });
    request.on("error", reject);
  });
}

function decodeSegment(value) {
  return decodeURIComponent(value);
}

async function handleProjectsApi(request, response, pathname) {
  if (pathname === "/api/projects" && request.method === "GET") {
    json(response, 200, { projects: listProjects() });
    return true;
  }

  if (pathname === "/api/projects" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const project = createProject(body);
      json(response, 200, {
        project,
        projects: listProjects(),
        versions: listProjectVersions(project.project.id)
      });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  const projectVersionsRestoreMatch = pathname.match(
    /^\/api\/projects\/([^/]+)\/versions\/([^/]+)\/restore$/
  );
  if (projectVersionsRestoreMatch && request.method === "POST") {
    try {
      const projectId = decodeSegment(projectVersionsRestoreMatch[1]);
      const versionId = decodeSegment(projectVersionsRestoreMatch[2]);
      const project = restoreProjectVersion(projectId, versionId);
      json(response, 200, {
        project,
        projects: listProjects(),
        versions: listProjectVersions(projectId)
      });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  const projectVersionsMatch = pathname.match(/^\/api\/projects\/([^/]+)\/versions$/);
  if (projectVersionsMatch && request.method === "GET") {
    try {
      const projectId = decodeSegment(projectVersionsMatch[1]);
      json(response, 200, { versions: listProjectVersions(projectId) });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  if (projectVersionsMatch && request.method === "POST") {
    try {
      const projectId = decodeSegment(projectVersionsMatch[1]);
      const body = await readJsonBody(request);
      json(response, 200, {
        versions: createProjectVersion(projectId, body),
        projects: listProjects()
      });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  const projectResetMatch = pathname.match(/^\/api\/projects\/([^/]+)\/reset$/);
  if (projectResetMatch && request.method === "POST") {
    try {
      const projectId = decodeSegment(projectResetMatch[1]);
      const project = resetProject(projectId);
      json(response, 200, {
        project,
        projects: listProjects(),
        versions: listProjectVersions(projectId)
      });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (projectMatch && request.method === "GET") {
    try {
      const projectId = decodeSegment(projectMatch[1]);
      touchProject(projectId);
      json(response, 200, { project: loadProject(projectId), projects: listProjects() });
    } catch (error) {
      json(response, 404, { error: error.message });
    }
    return true;
  }

  if (projectMatch && request.method === "DELETE") {
    try {
      const projectId = decodeSegment(projectMatch[1]);
      deleteProject(projectId);
      json(response, 200, { projects: listProjects() });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  if (projectMatch && request.method === "PUT") {
    try {
      const projectId = decodeSegment(projectMatch[1]);
      const body = await readJsonBody(request);
      const nextProject = body.project ?? body;
      nextProject.project.id = projectId;
      const project = saveProject(nextProject);
      json(response, 200, {
        project,
        projects: listProjects()
      });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  return false;
}

async function handleApi(request, response, pathname) {
  if (pathname === "/api/status" && request.method === "GET") {
    json(response, 200, {
      server: "ok",
      db: getDbInfo(),
      ai: getAiStatus()
    });
    return true;
  }

  const handledProjects = await handleProjectsApi(request, response, pathname);
  if (handledProjects) {
    return true;
  }

  if (pathname === "/api/project" && request.method === "GET") {
    const projects = listProjects();
    const activeProjectId = projects[0]?.id ?? null;
    json(response, 200, { project: activeProjectId ? loadProject(activeProjectId) : null });
    return true;
  }

  if (pathname === "/api/project" && request.method === "PUT") {
    try {
      const body = await readJsonBody(request);
      const nextProject = body.project ?? body;
      const project = saveProject(nextProject);
      json(response, 200, { project, projects: listProjects() });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  if (pathname === "/api/project/reset" && request.method === "POST") {
    const projects = listProjects();
    const activeProjectId = projects[0]?.id ?? null;
    if (!activeProjectId) {
      json(response, 404, { error: "没有可重置的项目" });
      return true;
    }
    json(response, 200, { project: resetProject(activeProjectId), projects: listProjects() });
    return true;
  }

  if (pathname === "/api/review" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const project = body.project ?? loadProject();
      const issues = computeIssues(project);
      json(response, 200, {
        issues,
        summary: summarizeIssues(issues)
      });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  if (pathname === "/api/ai/config" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      json(response, 200, { ai: updateAiConfig(body) });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  if (pathname === "/api/ai/models" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const result = await listAvailableModels(body);
      json(response, 200, result);
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  if (pathname === "/api/create-wizard/step" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const result = await generateCreateWizardStep({
        stepId: body.stepId,
        draft: body.draft
      });
      json(response, 200, { ...result, ai: getAiStatus() });
    } catch (error) {
      json(response, 500, { error: error.message });
    }
    return true;
  }

  if (pathname === "/api/create-wizard/concepts" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const result = await generateCreateWizardConceptOptions({
        draft: body.draft
      });
      json(response, 200, { ...result, ai: getAiStatus() });
    } catch (error) {
      json(response, 500, { error: error.message });
    }
    return true;
  }

  if (pathname === "/api/create-wizard/field" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const result = await regenerateCreateWizardField({
        field: body.field,
        draft: body.draft
      });
      json(response, 200, { ...result, ai: getAiStatus() });
    } catch (error) {
      json(response, 500, { error: error.message });
    }
    return true;
  }

  if (pathname.startsWith("/api/experts/") && request.method === "POST") {
    try {
      const expertId = pathname.replace("/api/experts/", "");
      const body = await readJsonBody(request);
      const project = body.project ?? loadProject();
      const selectedScene =
        project.story_bible.scene_cards.find((scene) => scene.id === body.selectedSceneId) ?? null;
      const issues = computeIssues(project);
      const result = await generateExpertResponse({
        expertId,
        project,
        selectedScene,
        issues
      });
      json(response, 200, result);
    } catch (error) {
      json(response, 500, { error: error.message });
    }
    return true;
  }

  if (pathname === "/api/generate" && request.method === "POST") {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    try {
      const body = await readJsonBody(request);
      const { step, projectContext, options } = body;
      if (!step) {
        json(response, 400, { error: "缺少 step 参数" });
        return true;
      }
      const result = await generateContent(step, projectContext, options);
      json(response, 200, result);
    } catch (error) {
      const mock = getMockData("fallback", {});
      json(response, 200, {
        error: error.message,
        mock: true,
        choices: mock.choices,
        reasoning: "API调用失败，返回示例数据",
        warnings: ["AI生成失败，以下为示例内容"]
      });
    }
    return true;
  }

  if (pathname === "/api/generate" && request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    response.end();
    return true;
  }

  // ── 流式生成端点（SSE）────────────────────────────────────────────────────
  if (pathname === "/api/generate/stream" && request.method === "POST") {
    let body;
    try { body = await readJsonBody(request); } catch { body = {}; }
    const { step, projectContext, options } = body;
    if (!step) { json(response, 400, { error: "缺少 step 参数" }); return true; }

    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });

    let prompt;
    try { prompt = buildPromptForStep(step, projectContext, options); }
    catch (e) { response.write(`data: ${JSON.stringify({ type: "error", message: e.message })}\n\n`); response.end(); return true; }

    const proc = spawn("claude", ["-p", "--output-format", "text"], { stdio: ["pipe", "pipe", "pipe"] });
    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");
    proc.stdin.setDefaultEncoding("utf8");
    proc.stdin.write(prompt, "utf8");
    proc.stdin.end();

    let fullText = "";
    let ended = false;
    const streamTimeout = setTimeout(() => {
      if (!ended) { proc.kill(); }
    }, 300_000);

    proc.stdout.on("data", (chunk) => {
      fullText += chunk;
      response.write(`data: ${JSON.stringify({ type: "chunk", text: chunk })}\n\n`);
    });

    proc.on("close", (code) => {
      ended = true;
      clearTimeout(streamTimeout);
      if (code !== 0) {
        response.write(`data: ${JSON.stringify({ type: "error", message: "claude CLI 异常退出" })}\n\n`);
      } else {
        try {
          const parsed = parseJsonFromText(fullText);
          const result = formatStepResult(step, parsed);
          response.write(`data: ${JSON.stringify({ type: "done", ...result })}\n\n`);
        } catch (e) {
          response.write(`data: ${JSON.stringify({ type: "error", message: e.message })}\n\n`);
        }
      }
      response.end();
    });

    proc.on("error", (err) => {
      ended = true;
      clearTimeout(streamTimeout);
      response.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
      response.end();
    });

    request.on("close", () => { ended = true; clearTimeout(streamTimeout); proc.kill(); });
    return true;
  }

  // ── Linda Seger 评分端点 ────────────────────────────────────────────────────
  if (pathname === "/api/evaluate" && request.method === "POST") {
    let body;
    try { body = await readJsonBody(request); } catch { body = {}; }
    const { step, content, context } = body;
    if (!step) { json(response, 400, { error: "缺少 step 参数" }); return true; }

    try {
      const prompt = buildEvaluatePromptForStep(step, content, context ?? {});
      const result = await new Promise((resolve, reject) => {
        const proc = spawn("claude", ["-p", "--output-format", "text"], { stdio: ["pipe", "pipe", "pipe"] });
        proc.stdout.setEncoding("utf8");
        proc.stderr.setEncoding("utf8");
        proc.stdin.setDefaultEncoding("utf8");
        let stdout = "";
        let stderr = "";
        const timer = setTimeout(() => { proc.kill(); reject(new Error("评估超时")); }, 150_000);
        proc.stdout.on("data", (d) => { stdout += d; });
        proc.stderr.on("data", (d) => { stderr += d; });
        proc.stdin.write(prompt, "utf8");
        proc.stdin.end();
        proc.on("close", (code) => {
          clearTimeout(timer);
          if (stderr) console.error(`[evaluate] stderr:`, stderr.slice(0, 400));
          if (code !== 0) reject(new Error(`claude CLI 退出码 ${code}: ${stderr.slice(0, 200)}`));
          else resolve({ stdout, stderr });
        });
        proc.on("error", (err) => { clearTimeout(timer); reject(err); });
      });
      const parsed = parseJsonFromText(result.stdout);
      if (parsed.raw) {
        console.error(`[evaluate] ${step} 解析失败，原始输出：`, result.stdout.slice(0, 300));
      }
      const score = typeof parsed.score === "number" ? parsed.score : 0;
      const dimensions = parsed.dimensions ?? {
        d1: parsed.d1, d2: parsed.d2, d3: parsed.d3, d4: parsed.d4
      };
      const debugStderr = result.stderr ? result.stderr.slice(0, 200) : null;
      json(response, 200, { score, best_idx: parsed.best_idx ?? 0, dimensions, feedback: parsed.feedback ?? "", raw_output: parsed.raw ?? null, debug_stderr: debugStderr });
    } catch (err) {
      console.error(`[evaluate] ${step} 评估异常：`, err.message);
      json(response, 200, { score: 0, best_idx: 0, feedback: `评估失败：${err.message}`, error: err.message });
    }
    return true;
  }

  if (pathname === "/api/creation-flow/finalize" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const { genres, concept, synopsis, characters, scenes, structure } = body;
      const title = concept?.title ?? synopsis?.version_label ?? "新长片项目";
      const logline = concept?.hook ?? synopsis?.summary ?? "";
      const genreList = Array.isArray(genres) ? genres : [];

      // 从幕数推断结构模板（act_structure 不返回 primary 字段时的 fallback）
      const actCount = Array.isArray(structure?.acts) ? structure.acts.length : 0;
      const primaryStructure = structure?.primary
        ?? (actCount === 4 ? "four_act" : actCount === 5 ? "feature_film" : "three_act");

      // 1. 创建基础项目
      const projectData = createProject({ title, format: "feature_film", genre: genreList, logline });

      // 2. 填充故事核心（central_question / emotional_promise 不复用 hook）
      projectData.story_core = {
        ...(projectData.story_core ?? {}),
        premise:           synopsis?.summary ?? concept?.hook ?? "",
        core_conflict:     concept?.core_conflict ?? "",
        central_question:  "",
        emotional_promise: concept?.unique_angle ?? "",
        theme_statement:   ""
      };

      // 3. 填充角色
      if (Array.isArray(characters) && characters.length > 0) {
        projectData.story_bible.characters = characters.map((c) => ({
          id: createId("char"),
          name: c.name ?? "角色",
          story_role: c.story_role ?? "supporting",
          external_want: c.desire ?? c.external_want ?? "",
          internal_need: c.need ?? c.internal_need ?? "",
          psychological_flaw: c.psychological_flaw ?? "",
          moral_flaw: c.moral_flaw ?? "",
          public_mask: c.public_mask ?? "",
          core_fear: c.core_fear ?? "",
          wound: c.wound ?? "",
          arc_start: c.arc_start ?? "",
          arc_end: c.arc_end ?? "",
          voice_rules: [],
          secret: c.secret ?? ""
        }));
      }

      // 4. 填充关键剧情点 → scene_cards（保留 conflict/turn）+ beats（链接到 scene_cards）
      if (Array.isArray(scenes) && scenes.length > 0) {
        const firstCharId = projectData.story_bible.characters[0]?.id ?? "";
        const sceneCards = scenes.map((s, i) => ({
          id: createId("scene"),
          order_index: i + 1,
          title: s.title ?? `场景 ${i + 1}`,
          pov_character_id: firstCharId,
          location: "待定",
          time_of_day: "待定",
          goal: s.goal ?? s.scene_goal ?? "",
          obstacle: s.conflict ?? "",
          tactic: "",
          turn: s.turn ?? "",
          value_shift: "",
          new_information: [],
          input_state: "",
          output_state: "",
          production_tags: [],
          dialogue_seed: "",
          emotion_stage: ""
        }));
        projectData.story_bible.scene_cards = sceneCards;
        projectData.story_bible.beats = scenes.map((s, i) => ({
          id: createId("beat"),
          framework: primaryStructure,
          slot: s.act_position ?? "setup",
          purpose: s.title ?? s.goal ?? s.scene_goal ?? `剧情点 ${i + 1}`,
          linked_scene_ids: [sceneCards[i].id]
        }));
      }

      // 5. 填充意图锚点
      projectData.intent_anchor = {
        ...projectData.intent_anchor,
        core_idea: synopsis?.summary ?? concept?.hook ?? "",
        theme: concept?.title ?? "",
        protagonist: Array.isArray(characters) && characters.length > 0 ? (characters[0]?.name ?? "") : ""
      };

      // 6. 填充 structure_profile（acts + nodes）和 character_hub
      const _preset1 = structurePresets[primaryStructure];
      if (_preset1) {
        const _acts1 = (_preset1.acts ?? []).map((a, i) => ({
          id: createId("act"), key: a.key, title: a.title, purpose: a.purpose,
          range_label: a.range_label, order_index: i
        }));
        const _actMap1 = new Map(_acts1.map(a => [a.key, a.id]));
        const _nodes1 = (_preset1.nodes ?? []).map(([nodeType, actKey, nodeTitle, required], i) => ({
          id: createId("node"), node_type: nodeType, title: nodeTitle, required,
          act_id: _actMap1.get(actKey) ?? null, order_index: i, card_ids: [], note: ""
        }));
        projectData.structure_profile = { template: primaryStructure, acts: _acts1, nodes: _nodes1 };
      } else {
        projectData.structure_profile = { template: primaryStructure };
      }
      projectData.character_hub = Array.isArray(characters) && characters.length > 0 ? {
        characters: projectData.story_bible.characters ?? []
      } : { characters: [] };
      projectData.plot_board = null;
      projectData.scene_workbench = null;

      const saved = saveProject(projectData);
      const projectId = saved.project?.id ?? saved.id;
      json(response, 200, { projectId, success: true });
    } catch (error) {
      json(response, 500, { error: error.message });
    }
    return true;
  }

  if (pathname === "/api/ai/generate-act-nodes" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const { projectCtx, actTitle, actPurpose, nodes } = body;
      const data = await generateActNodes({ projectCtx, actTitle, actPurpose, nodes });
      json(response, 200, { ok: true, data });
    } catch (error) {
      json(response, 500, { ok: false, error: error.message });
    }
    return true;
  }

  if (pathname === "/api/pro/analyze" && request.method === "POST") {
    let body;
    try { body = await readJsonBody(request); } catch { body = {}; }
    const { anchor, genres = [] } = body;
    if (!anchor) { json(response, 400, { error: "缺少 anchor 参数" }); return true; }

    try {
      const { system, user } = buildAnalyzeAnchorPrompt(anchor, genres);
      const fullPrompt = `${system}\n\n---\n\n${user}`;
      const result = await new Promise((resolve, reject) => {
        const proc = spawn("claude", ["-p", "--output-format", "text", "--effort", "low"], { stdio: ["pipe", "pipe", "pipe"] });
        proc.stdout.setEncoding("utf8");
        proc.stderr.setEncoding("utf8");
        proc.stdin.setDefaultEncoding("utf8");
        let stdout = "";
        let stderr = "";
        const timer = setTimeout(() => { proc.kill(); reject(new Error("analyze 超时")); }, 180_000);
        proc.stdout.on("data", (d) => { stdout += d; });
        proc.stderr.on("data", (d) => { stderr += d; });
        proc.stdin.write(fullPrompt, "utf8");
        proc.stdin.end();
        proc.on("close", (code) => {
          clearTimeout(timer);
          if (code !== 0) reject(new Error(`claude CLI 退出码 ${code}: ${stderr.slice(0, 200)}`));
          else resolve(stdout);
        });
        proc.on("error", (err) => { clearTimeout(timer); reject(err); });
      });
      const parsed = parseJsonFromText(result);
      json(response, 200, parsed);
    } catch (err) {
      json(response, 500, { error: err.message });
    }
    return true;
  }

  if (pathname === "/api/pro/questions" && request.method === "POST") {
    let body;
    try { body = await readJsonBody(request); } catch { body = {}; }
    const { wb, context = {}, anchor = "", genres = [] } = body;
    if (!wb) { json(response, 400, { error: "缺少 wb 参数" }); return true; }

    try {
      const { system, user } = buildWorkbenchQuestionsPrompt(wb, context, anchor, genres);
      const fullPrompt = `${system}\n\n---\n\n${user}`;
      const result = await new Promise((resolve, reject) => {
        const proc = spawn("claude", ["-p", "--output-format", "text", "--effort", "low"], { stdio: ["pipe", "pipe", "pipe"] });
        proc.stdout.setEncoding("utf8");
        proc.stderr.setEncoding("utf8");
        proc.stdin.setDefaultEncoding("utf8");
        let stdout = "";
        let stderr = "";
        const timer = setTimeout(() => { proc.kill(); reject(new Error("questions 超时")); }, 180_000);
        proc.stdout.on("data", (d) => { stdout += d; });
        proc.stderr.on("data", (d) => { stderr += d; });
        proc.stdin.write(fullPrompt, "utf8");
        proc.stdin.end();
        proc.on("close", (code) => {
          clearTimeout(timer);
          if (code !== 0) reject(new Error(`claude CLI 退出码 ${code}: ${stderr.slice(0, 200)}`));
          else resolve(stdout);
        });
        proc.on("error", (err) => { clearTimeout(timer); reject(err); });
      });
      const parsed = parseJsonFromText(result);
      json(response, 200, parsed);
    } catch (err) {
      json(response, 500, { error: err.message });
    }
    return true;
  }

  if (pathname === "/api/pro/assemble" && request.method === "POST") {
    let body;
    try { body = await readJsonBody(request); } catch { body = {}; }
    const { anchor = "", genres = [], theme = {}, character = {}, scene = {} } = body;

    try {
      const { system, user } = buildAssemblePrompt(
        anchor, genres,
        theme.questions ?? [],
        character.questions ?? [],
        scene.questions ?? []
      );
      const fullPrompt = `${system}\n\n---\n\n${user}`;
      const result = await new Promise((resolve, reject) => {
        const proc = spawn("claude", ["-p", "--output-format", "text", "--effort", "low"], { stdio: ["pipe", "pipe", "pipe"] });
        proc.stdout.setEncoding("utf8");
        proc.stderr.setEncoding("utf8");
        proc.stdin.setDefaultEncoding("utf8");
        let stdout = "";
        let stderr = "";
        const timer = setTimeout(() => { proc.kill(); reject(new Error("assemble 超时")); }, 240_000);
        proc.stdout.on("data", (d) => { stdout += d; });
        proc.stderr.on("data", (d) => { stderr += d; });
        proc.stdin.write(fullPrompt, "utf8");
        proc.stdin.end();
        proc.on("close", (code) => {
          clearTimeout(timer);
          if (code !== 0) reject(new Error(`claude CLI 退出码 ${code}: ${stderr.slice(0, 200)}`));
          else resolve(stdout);
        });
        proc.on("error", (err) => { clearTimeout(timer); reject(err); });
      });

      const assembled = parseJsonFromText(result);
      const title = assembled.story_core?.premise?.slice(0, 30) ?? anchor.slice(0, 30) ?? "精品项目";
      const logline = assembled.story_core?.premise ?? "";
      const genreList = Array.isArray(genres) ? genres : [];

      const projectData = createProject({ title, format: "feature_film", genre: genreList, logline });
      projectData.story_core = { ...assembled.story_core };
      projectData.intent_anchor = {
        ...projectData.intent_anchor,
        core_idea: assembled.story_core?.premise ?? "",
        theme: assembled.story_core?.theme_statement ?? ""
      };

      if (Array.isArray(assembled.characters) && assembled.characters.length > 0) {
        projectData.story_bible.characters = assembled.characters.map((c) => ({
          id: createId("char"),
          name: c.name ?? "角色",
          story_role: c.story_role ?? "protagonist",
          external_want: c.desire ?? "",
          internal_need: c.need ?? "",
          wound: c.wound ?? "",
          arc_start: c.arc_start ?? "",
          arc_end: c.arc_end ?? "",
          psychological_flaw: c.contradiction ?? "",
          notes: c.notes ?? "",
          public_mask: "",
          core_fear: "",
          moral_flaw: "",
          voice_rules: [],
          secret: ""
        }));
      }

      if (Array.isArray(assembled.scenes) && assembled.scenes.length > 0) {
        const firstCharId = projectData.story_bible.characters[0]?.id ?? "";
        const sceneCards = assembled.scenes.map((s, i) => ({
          id: createId("scene"),
          order_index: i + 1,
          title: s.title ?? `场景 ${i + 1}`,
          pov_character_id: firstCharId,
          location: "待定",
          time_of_day: "待定",
          goal: s.goal ?? "",
          obstacle: s.conflict ?? "",
          tactic: "",
          turn: s.turn ?? "",
          value_shift: "",
          new_information: [],
          input_state: "",
          output_state: "",
          production_tags: [],
          dialogue_seed: "",
          emotion_stage: ""
        }));
        projectData.story_bible.scene_cards = sceneCards;
        projectData.story_bible.beats = assembled.scenes.map((s, i) => ({
          id: createId("beat"),
          framework: "three_act",
          slot: s.act_position ?? "setup",
          purpose: s.title ?? "",
          linked_scene_ids: [sceneCards[i].id]
        }));
      }

      // 填充 structure_profile（acts + nodes）和 character_hub
      const _preset2 = structurePresets["three_act"];
      if (_preset2) {
        const _acts2 = (_preset2.acts ?? []).map((a, i) => ({
          id: createId("act"), key: a.key, title: a.title, purpose: a.purpose,
          range_label: a.range_label, order_index: i
        }));
        const _actMap2 = new Map(_acts2.map(a => [a.key, a.id]));
        const _nodes2 = (_preset2.nodes ?? []).map(([nodeType, actKey, nodeTitle, required], i) => ({
          id: createId("node"), node_type: nodeType, title: nodeTitle, required,
          act_id: _actMap2.get(actKey) ?? null, order_index: i, card_ids: [], note: ""
        }));
        projectData.structure_profile = { template: "three_act", acts: _acts2, nodes: _nodes2 };
      } else {
        projectData.structure_profile = { template: "three_act" };
      }
      projectData.character_hub = Array.isArray(assembled.characters) && assembled.characters.length > 0 ? {
        characters: projectData.story_bible.characters ?? []
      } : { characters: [] };
      projectData.plot_board = null;
      projectData.scene_workbench = null;

      const saved = saveProject(projectData);
      const projectId = saved.project?.id ?? saved.id;
      json(response, 200, { projectId, success: true });
    } catch (err) {
      json(response, 500, { error: err.message });
    }
    return true;
  }

  return false;
}

function getMockData(step, options) {
  const mockMap = {
    logline: {
      choices: [
        {
          id: "mock_logline_a",
          label: "方案A",
          content: "【逆流而上】\n一名即将退休的刑警，在最后一案中发现自己30年前的判决是错的——而真凶，正是他最信任的搭档。\n\n外部冲突：在系统压力下推翻铁案\n内部冲突：正义与忠诚哪个更重要\n反转潜力：主角可能才是真正的帮凶\n对标：《告白》的执念+《十二怒汉》的道德困境",
          data: { title: "逆流而上", hook: "最后一案变成最深的罪", external_conflict: "推翻铁案", internal_conflict: "正义与忠诚", twist_potential: "主角可能是帮凶", comparable: "告白+十二怒汉" }
        },
        {
          id: "mock_logline_b",
          label: "方案B",
          content: "【替身】\n一个整容失败的女演员，以替身身份重回演艺圈，却发现自己正在爱上那个夺走她人生的人。\n\n外部冲突：维持替身身份不被识破\n内部冲突：复仇欲望与真实情感的撕裂\n反转潜力：那个人其实早就认出了她\n对标：《奥赛罗》式设局+当代偶像剧的身份游戏",
          data: { title: "替身", hook: "她用别人的脸重新活了一次", external_conflict: "维持身份", internal_conflict: "复仇与爱的撕裂", twist_potential: "早被认出", comparable: "奥赛罗+偶像身份剧" }
        },
        {
          id: "mock_logline_c",
          label: "方案C",
          content: "【第五季】\n气候崩溃后，一个掌控最后农业数据的女科学家，必须在政府、资本和难民之间选择把种子给谁——而每个选择都意味着有人死去。\n\n外部冲突：三方抢夺数据控制权\n内部冲突：科学家的中立还是人类的偏爱\n反转潜力：数据本身就是被篡改的\n对标：《饥饿游戏》的政治+《她》的孤独感",
          data: { title: "第五季", hook: "最后的种子，谁能得到", external_conflict: "三方争夺", internal_conflict: "中立还是人性", twist_potential: "数据是假的", comparable: "饥饿游戏+末日孤独" }
        }
      ],
      reasoning: "三个方向分别探索了：道德困境型（警察/真相）、身份游戏型（替身/复仇）、末日抉择型（资源/权力）。每个都有强烈的内外冲突和内置反转空间。",
      warnings: []
    },
    treatment: {
      choices: [{
        id: "mock_treatment_a",
        label: "方案A",
        content: "【开端】警察老林在退休宴上接到最后一个案子：一具与30年前悬案高度吻合的尸体。世界：体制内的秩序感，他的缺口：从不质疑自己的判断。\n\n【激励事件】DNA比对证明，30年前入狱的人是无辜的。\n\n【中段复杂化】老林追查真相，却发现越来越多证据指向他最好的搭档老周。每一步推进都在摧毁他的过去。\n\n【黑暗时刻】老林被迫选择：提交证据意味着摧毁老周的家庭和他自己的荣誉；放弃意味着无辜者继续背锅。\n\n【终局抉择】他选择提交证据——不是为了正义，而是他终于承认自己当年也知道有什么不对，只是选择了不看。\n\n【余韵】老周入狱。老林在退休的第一天，去了那个冤案者家里，什么都没说。",
        data: { treatment: { opening: "退休宴/悬案", catalyst: "DNA证明冤案", midpoint_complication: "证据指向老周", dark_moment: "无法两全", final_choice: "提交证据承认自己的共谋", aftermath: "沉默的登门" }, theme_statement: "正义不是找到真凶，而是承认自己选择了不看" }
      }],
      reasoning: "Treatment以内部冲突驱动外部行动，避免了单纯的悬疑解谜，将主题锁定为「共谋者的觉醒」。",
      warnings: ["故事节奏较重，需确认目标受众接受度"]
    },
    characters: {
      choices: [{
        id: "mock_characters_a",
        label: "方案A",
        content: "【林国梁】protagonist\n欲望：安稳退休，不留遗憾\n需求：承认自己一直知道真相但选择了沉默\n创伤：父亲是被冤枉的右派，他用一辈子的「正确」来证明自己不一样\n弧光：从「按规则的正义」到「需要代价的真相」\n\n【周建国】antagonist\n欲望：保住现在的一切（家庭、地位、干净的履历）\n需求：他从未真正相信自己做错了，他只是做了「那个年代人人都会做的选择」\n创伤：穷怕了，权力是他唯一的安全感\n弧光：从理所当然到被自己的逻辑审判",
        data: { characters: [{ name: "林国梁", story_role: "protagonist", desire: "安稳退休", need: "承认共谋", wound: "父亲被冤枉", arc_start: "按规则行事", arc_end: "选择代价高昂的真相" }, { name: "周建国", story_role: "antagonist", desire: "保住地位", need: "承担责任", wound: "穷怕了", arc_start: "理所当然", arc_end: "被自己逻辑审判" }] }
      }],
      reasoning: "两个主要角色形成「同一创伤的两种应对」的对照结构，避免了简单的正邪二元。",
      warnings: []
    },
    beat_sheet: {
      choices: [{
        id: "mock_beatsheet_a",
        label: "方案A",
        content: "[1%] 开场印象\n退休宴上，老林接到电话。他看了一眼，接了。主角状态：表面淡定，内心已经不平静。\n\n[12%] 诱发事件\nDNA报告：死者与30年前无辜者匹配。一切开始动摇。\n\n[30%] 主线锁定\n老林选择私下调查，不上报。他告诉自己是为了确认真相。\n\n[55%] 反扑\n老周发现老林在查，开始布局反制。老林的家人收到威胁。\n\n[80%] 崩塌\n老林发现30年前的案卷里有他自己的签名——他签掉了那份质疑报告。\n\n[90%] 终局\n老林提交证据，接受调查。",
        data: { beat_sheet: [{ beat_name: "开场印象", percentage: "1%", what_happens: "退休宴接电话", protagonist_state: "表面淡定内心动摇" }] }
      }],
      reasoning: "节拍映射以内部冲突为核心节点，外部事件作为触发器而非主体。",
      warnings: []
    },
    scene_outline: {
      choices: [
        {
          id: "mock_scene_a",
          label: "场景1",
          content: "INT. 档案室 - 深夜\n目标：老林找到30年前案卷中的质疑报告\n冲突：档案管理员发现他违规调档\n转折：他找到了报告，上面有他自己的签名\n信息增量：观众知道他曾经知道真相\n结尾问题：他会销毁这份证据吗",
          data: { title: "INT. 档案室 - 深夜", scene_goal: "找质疑报告", conflict: "违规调档被发现", turn: "发现自己的签名", end_question: "他会销毁证据吗" }
        }
      ],
      reasoning: "场景选择档案室这一密闭空间，强化主角与过去的私密对话感。",
      warnings: []
    },
    scene_weave: {
      choices: [{
        id: "mock_weave_a",
        label: "方案A",
        content: "INT. 档案室 - 深夜\n\n昏黄的灯。林国梁翻开最后一个文件夹。\n\n他的手指停在一张纸上。很久。\n\n档案员（门口）\n林局，这批卷宗是保密级别的。\n\n林国梁\n我知道。\n\n他没有转身。手指压住那张纸。\n\n档案员\n我需要登记你的查阅记录。\n\n林国梁\n（终于转身，声音很平）\n登记吧。\n\n他把那张纸放了回去。但他记住了上面的字。\n\n档案员走后，他在原地站了很久，什么都没动。",
        data: { script: "完整剧本场景", subtext_map: [{ character: "档案员", says: "需要登记", means: "你在做违规的事" }, { character: "林国梁", says: "登记吧", means: "我已经得到我想要的了" }], emotion_arc: "紧张→发现→决定", end_hook: "他记住了但没取走——他要自己承担" }
      }],
      reasoning: "用「不拿走」替代「拿走」，让主角的选择更有分量——他不需要证据，他知道自己记得。",
      warnings: []
    },
    diagnosis: {
      choices: [{
        id: "mock_diagnosis_a",
        label: "诊断报告",
        content: "综合评分：6.5/10\n\n故事结构：7/10 - 五幕结构清晰，但中段压力不够持续\n角色发展：8/10 - 主角内外冲突设计扎实，对手稍显单薄\n场景张力：6/10 - 部分场景目标不明确，需要更清晰的进出场状态\n对话质量：待评估 - 尚无完整对白样本\n类型符合度：7/10 - 悬疑+道德剧的结合有市场，但节奏偏重\n\n问题与建议：\n⚠ 中段缺乏具体的时间压力 → 加入外部截止点（如退休日期倒计时）\n⚠ 对手动机需要更多同情空间 → 给老周一场关于「为何这样做」的解释场景\n\n优势：\n✓ 主题清晰，「共谋者的觉醒」有独特道德维度\n✓ 主角的内部障碍设计是故事最强处",
        data: { scores: { story_structure: { score: 7, comment: "五幕结构清晰" }, character_development: { score: 8, comment: "主角扎实" }, scene_tension: { score: 6, comment: "部分场景目标不明确" }, dialogue_quality: { score: 6, comment: "待评估" }, genre_fit: { score: 7, comment: "节奏偏重" } }, overall_score: 6.5 }
      }],
      reasoning: "整体诊断基于项目现有数据，评分侧重结构完整性和角色驱动力。",
      warnings: ["对白样本不足，对话质量评分仅供参考"]
    },
    fallback: {
      choices: [{
        id: "mock_fallback",
        label: "示例",
        content: "AI生成服务暂时不可用，请检查API密钥配置后重试。",
        data: {}
      }]
    }
  };

  return mockMap[step] ?? mockMap.fallback;
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  if (url.pathname.startsWith("/api/")) {
    const handled = await handleApi(request, response, url.pathname);
    if (!handled) {
      json(response, 404, { error: "Not Found" });
    }
    return;
  }

  const filePath = safePath(url.pathname);
  if (!filePath) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not Found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(content);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`原点编剧系统 MVP 已启动：http://127.0.0.1:${port}`);
});
