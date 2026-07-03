import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
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
  ensureProjectSeeded,
  listProjects,
  loadProject,
  resetProject,
  saveProject
} from "./src/server/repository.js";
import { computeIssues, summarizeIssues } from "./src/logic/rules.js";
import { generateContent, buildPromptForStep, formatStepResult, parseJsonFromText, buildEvaluatePromptForStep } from "./src/ai/generator.js";
import { listSources, getProvider } from "./src/knowledge/registry.js";
import { completeText, completeTextStream, getLlmConfig, setLlmConfig, listLlmProfiles, upsertLlmProfile, activateLlmProfile, deleteLlmProfile } from "./src/server/llm.js";
import { json, readJsonBody, decodeSegment } from "./src/server/httpUtils.js";
import { getMockData } from "./src/server/mockData.js";
import { handleSeriesApi, handleProjectsApi } from "./src/server/routes/projects.js";
import { handleCreationFlowApi } from "./src/server/routes/creationFlow.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 4173;

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

function safePath(urlPath) {
  const rawPath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.normalize(path.join(root, rawPath));
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    return null;
  }
  return filePath;
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

  const handledSeries = await handleSeriesApi(request, response, pathname);
  if (handledSeries) return true;

  const handledProjects = await handleProjectsApi(request, response, pathname);
  if (handledProjects) {
    return true;
  }

  // ── 知识源（可插拔） ────────────────────────────────────────────────────
  if (pathname === "/api/knowledge/sources" && request.method === "GET") {
    json(response, 200, { sources: listSources() });
    return true;
  }
  const kbSearchMatch = pathname.match(/^\/api\/knowledge\/([^/]+)\/search$/);
  if (kbSearchMatch && request.method === "GET") {
    const provider = getProvider(decodeURIComponent(kbSearchMatch[1]));
    if (!provider) { json(response, 404, { error: "知识源不存在" }); return true; }
    const url = new URL(request.url, "http://localhost");
    try {
      const result = await provider.listEntries({
        query: url.searchParams.get("q") || "",
        type: url.searchParams.get("type") || "",
        limit: Number(url.searchParams.get("limit")) || 30,
        offset: Number(url.searchParams.get("offset")) || 0
      });
      json(response, 200, result);
    } catch (error) {
      json(response, 500, { error: error.message });
    }
    return true;
  }
  const kbEntryMatch = pathname.match(/^\/api\/knowledge\/([^/]+)\/entry\/([^/]+)$/);
  if (kbEntryMatch && request.method === "GET") {
    const provider = getProvider(decodeURIComponent(kbEntryMatch[1]));
    if (!provider) { json(response, 404, { error: "知识源不存在" }); return true; }
    try {
      const entry = await provider.getEntry(decodeURIComponent(kbEntryMatch[2]));
      if (!entry) { json(response, 404, { error: "条目不存在或未缓存" }); return true; }
      json(response, 200, { entry });
    } catch (error) {
      json(response, 500, { error: error.message });
    }
    return true;
  }
  const kbSyncMatch = pathname.match(/^\/api\/knowledge\/([^/]+)\/sync$/);
  if (kbSyncMatch && request.method === "POST") {
    const provider = getProvider(decodeURIComponent(kbSyncMatch[1]));
    if (!provider) { json(response, 404, { error: "知识源不存在" }); return true; }
    if (!provider.meta.hasSync) { json(response, 400, { error: "该源不支持 sync" }); return true; }
    try {
      const result = await provider.sync();
      json(response, 200, { ...result, status: typeof provider.meta.status === "function" ? provider.meta.status() : provider.meta.status });
    } catch (error) {
      json(response, 500, { error: error.message });
    }
    return true;
  }

  if (pathname === "/api/project" && request.method === "GET") {
    // 历史坑：本端点曾忽略 projectId 参数永远返回最近项目，外部脚本以为在读指定项目。
    // 现在显式支持 ?projectId=；不带参数才回落最近项目
    const requestedId = new URL(request.url, "http://localhost").searchParams.get("projectId");
    if (requestedId) {
      try {
        json(response, 200, { project: loadProject(requestedId) });
      } catch (error) {
        json(response, 404, { error: error.message });
      }
      return true;
    }
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
      const previous = getLlmConfig();
      const ai = updateAiConfig(body);
      // 非 CLI provider：保存即做一次微型补全验证，坏 key/坏模型当场报错并回滚，
      // 而不是等到用户写本时才在生成中途炸掉
      if (ai.provider !== "claude_cli" && body.skipVerify !== true) {
        try {
          await completeText("只回复两个字：就绪", { retries: 0 });
        } catch (verifyError) {
          setLlmConfig(previous);
          json(response, 400, { error: `连接验证失败：${verifyError.message.slice(0, 300)}` });
          return true;
        }
      }
      // 验证通过的连接自动存为档案，支持多套配置（智谱/DeepSeek/Claude API…）一键切换
      const cfg = getLlmConfig();
      upsertLlmProfile({ name: body.name, provider: cfg.provider, apiKey: cfg.apiKey, model: cfg.model, baseUrl: cfg.baseUrl });
      json(response, 200, { ai, profiles: listLlmProfiles() });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  if (pathname === "/api/ai/profiles" && request.method === "GET") {
    json(response, 200, { profiles: listLlmProfiles() });
    return true;
  }

  const profileActivateMatch = pathname.match(/^\/api\/ai\/profiles\/([^/]+)\/activate$/);
  if (profileActivateMatch && request.method === "POST") {
    try {
      const ai = activateLlmProfile(decodeSegment(profileActivateMatch[1]));
      json(response, 200, { ai, profiles: listLlmProfiles() });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }

  const profileDeleteMatch = pathname.match(/^\/api\/ai\/profiles\/([^/]+)$/);
  if (profileDeleteMatch && request.method === "DELETE") {
    json(response, 200, { profiles: deleteLlmProfile(decodeSegment(profileDeleteMatch[1])) });
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
    // 立即把响应头/首字节冲刷到客户端：否则 Node 会把 SSE 头缓冲到第一次 body 写入，
    // 导致重推理步骤（首 token 慢、且常是冷启动的 characters）在客户端/测试侧迟迟收不到响应。
    response.flushHeaders?.();
    response.write(": connected\n\n");
    // 心跳：首 token 到达前每 10s 发一条 SSE 注释，保活连接并重置客户端 idle 计时器。
    let firstChunkSeen = false;
    let heartbeat = setInterval(() => {
      if (!firstChunkSeen && !ended) response.write(": keepalive\n\n");
    }, 10000);
    const stopHeartbeat = () => { if (heartbeat) { clearInterval(heartbeat); heartbeat = null; } };

    let prompt;
    try { prompt = buildPromptForStep(step, projectContext, options); }
    catch (e) { stopHeartbeat(); response.write(`data: ${JSON.stringify({ type: "error", message: e.message })}\n\n`); response.end(); return true; }

    // 统一走 llm 层：claude_cli / anthropic / openai / custom 真流式，gemini 整段一次
    let ended = false;
    // 客户端断开时中止底层 LLM 请求（fetch / claude CLI 子进程），否则它会跑满 300s 超时，
    // 高并发或频繁取消时堆积泄漏的连接 / 子进程。
    const abortController = new AbortController();
    request.on("close", () => { ended = true; stopHeartbeat(); abortController.abort(); });

    completeTextStream(prompt, (chunk) => {
      if (ended) return;
      firstChunkSeen = true;
      stopHeartbeat();
      response.write(`data: ${JSON.stringify({ type: "chunk", text: chunk })}\n\n`);
    }, { signal: abortController.signal })
      .then((fullText) => {
        if (ended) return;
        ended = true;
        stopHeartbeat();
        try {
          const parsed = parseJsonFromText(fullText);
          const result = formatStepResult(step, parsed);
          response.write(`data: ${JSON.stringify({ type: "done", ...result })}\n\n`);
        } catch (e) {
          response.write(`data: ${JSON.stringify({ type: "error", message: e.message })}\n\n`);
        }
        response.end();
      })
      .catch((err) => {
        if (ended) return;
        ended = true;
        stopHeartbeat();
        response.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
        response.end();
      });
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
      const result = { stdout: await completeText(prompt), stderr: "" };
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

  if (await handleCreationFlowApi(request, response, pathname)) return true;

  return false;
}

const server = http.createServer(async (request, response) => {
  let url;
  try {
    url = new URL(request.url || "/", `http://${request.headers.host}`);
  } catch {
    json(response, 400, { error: "Bad Request" });
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    // 最外层兜底：路由分支若漏了 try/catch，异常在此收口，避免 unhandledRejection
    // 打挂进程或让请求永久挂起。
    try {
      const handled = await handleApi(request, response, url.pathname);
      if (!handled) {
        json(response, 404, { error: "Not Found" });
      }
    } catch (error) {
      console.error(`[api] ${request.method} ${url.pathname} 未捕获异常：`, error);
      if (!response.headersSent) {
        json(response, 500, { error: error?.message || "Internal Server Error" });
      } else {
        response.end();
      }
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

process.on("uncaughtException", (error) => {
  console.error("[fatal] uncaughtException：", error);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  // 只记录不退出：单个请求的漏网 rejection 不应拖垮本地单机服务
  console.error("[fatal] unhandledRejection：", reason);
});

server.on("error", (error) => {
  console.error(`[fatal] 服务启动失败（端口 ${port}）：`, error.message);
  process.exit(1);
});

// Node 18+ http.Server 默认 requestTimeout=300000ms（5分钟），到点无条件销毁连接——
// 与请求耗时无关，即使 handler 仍在正常等待LLM响应也会被砍断（真检发现：客户端表现为
// "fetch failed"，此时服务端日志/LLM调用可能仍在跑，只是连接已被Node底层强制断开）。
// src/ai/generator.js 的 STEP_TIMEOUT_OVERRIDES_MS 已放宽 scene_expansion(420s)/
// scene_script(480s) 两步的LLM侧超时，此处必须同步放宽HTTP层超时，否则底层连接会在
// LLM侧超时生效之前就被砍断，放宽LLM超时形同虚设。取最长步骤(480s)+余量。
server.requestTimeout = 600_000;
server.headersTimeout = 600_000;

server.listen(port, "127.0.0.1", () => {
  console.log(`原点编剧系统 MVP 已启动：http://127.0.0.1:${port}`);
});
