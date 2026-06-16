import { json, readJsonBody, decodeSegment } from "../httpUtils.js";
import {
  createProject,
  createProjectVersion,
  deleteProject,
  deleteSeriesBible,
  getSeriesBible,
  listProjectVersions,
  listProjects,
  listSeriesBibles,
  loadProject,
  resetProject,
  restoreProjectVersion,
  saveProject,
  saveSeriesBible,
  touchProject
} from "../repository.js";

export async function handleSeriesApi(request, response, pathname) {
  if (pathname === "/api/series" && request.method === "GET") {
    json(response, 200, { series: listSeriesBibles() });
    return true;
  }
  if (pathname === "/api/series" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      json(response, 200, { series: saveSeriesBible(body), list: listSeriesBibles() });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }
  const seriesMatch = pathname.match(/^\/api\/series\/([^/]+)$/);
  if (seriesMatch && request.method === "GET") {
    const item = getSeriesBible(decodeSegment(seriesMatch[1]));
    if (!item) { json(response, 404, { error: "系列不存在" }); return true; }
    json(response, 200, { series: item });
    return true;
  }
  if (seriesMatch && request.method === "PUT") {
    try {
      const body = await readJsonBody(request);
      json(response, 200, { series: saveSeriesBible({ ...body, id: decodeSegment(seriesMatch[1]) }) });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return true;
  }
  if (seriesMatch && request.method === "DELETE") {
    json(response, 200, { list: deleteSeriesBible(decodeSegment(seriesMatch[1])) });
    return true;
  }
  return false;
}

export async function handleProjectsApi(request, response, pathname) {
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
      // 完整项目文档本身就有 project 元数据键：信封格式 body.project.project 存在，
      // 裸文档格式 body.project 是元数据对象（无 .project）。按此区分，避免裸文档被误拆。
      const nextProject = body?.project?.project ? body.project : body;
      if (!nextProject?.project || typeof nextProject.project !== "object") {
        json(response, 400, { error: "请求体不是有效的项目文档" });
        return true;
      }
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
