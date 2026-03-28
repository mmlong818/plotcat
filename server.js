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
  createProject,
  createProjectVersion,
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

  return false;
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
