// API 冒烟测试：起一个真实 server.js 子进程打真实 HTTP 请求。
// 不测任何需要真实 LLM key 的生成路径（/api/generate 只测「缺 step 参数」的 400 分支）。
// 数据隔离：用 __smoke_test__ 前缀标记本测试创建的项目，结束时通过 DELETE API 自行清理。
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import path from "node:path";

const PORT = Number(process.env.SMOKE_PORT) || 4199;
const BASE = `http://127.0.0.1:${PORT}`;
const projectRoot = path.resolve(import.meta.dirname, "..");

function fetchJson(urlPath, options = {}) {
  return fetch(`${BASE}${urlPath}`, options).then(async (res) => {
    let body = null;
    try { body = await res.json(); } catch { /* 无 body（如 204）时忽略 */ }
    return { status: res.status, body };
  });
}

async function waitForReady(child, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`server 子进程提前退出，exit code ${child.exitCode}`);
    }
    try {
      const res = await fetch(`${BASE}/api/status`);
      if (res.ok) return;
    } catch {
      // 未就绪，继续轮询
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("等待 /api/status 就绪超时");
}

function killChild(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null) { resolve(); return; }
    child.once("exit", () => resolve());
    child.kill();
    // Windows 上普通 kill 有时不生效，兜底强杀
    setTimeout(() => {
      if (child.exitCode === null && child.pid) {
        try { spawn("taskkill", ["/F", "/PID", String(child.pid), "/T"]); } catch { /* ignore */ }
      }
      resolve();
    }, 3000);
  });
}

let pass = 0;
let fail = 0;
async function t(name, fn) {
  try {
    await fn();
    pass++;
    console.log(`  ok - ${name}`);
  } catch (err) {
    fail++;
    console.log(`  FAIL - ${name}`);
    console.log(`    ${err.message}`);
  }
}

async function main() {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: projectRoot,
    // 未设 YUANDIAN_DB_PATH 时沿用 process.env 里没有该键的状态，落到真实 data/
    // （冒烟按设计允许写真实库，靠下方 __smoke_test__ 前缀 + DELETE 清理兜底）
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});

  const createdProjectIds = [];

  try {
    await waitForReady(child);
    console.log(`server 已就绪：${BASE}`);

    await t("GET /api/status 返回 200", async () => {
      const { status, body } = await fetchJson("/api/status");
      assert.equal(status, 200);
      assert.equal(body.server, "ok");
    });

    await t("GET /api/projects 返回项目列表", async () => {
      const { status, body } = await fetchJson("/api/projects");
      assert.equal(status, 200);
      assert.ok(Array.isArray(body.projects));
    });

    let projectId;
    await t("POST /api/projects 创建项目", async () => {
      const { status, body } = await fetchJson("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "__smoke_test__ 冒烟测试项目" })
      });
      assert.equal(status, 200);
      projectId = body.project?.project?.id;
      assert.ok(projectId, "创建响应里缺少 project.project.id");
      createdProjectIds.push(projectId);
    });

    await t("PUT /api/projects/:id 保存后，重新加载能验证字段持久化", async () => {
      const { body: loaded } = await fetchJson(`/api/projects/${projectId}`);
      const doc = loaded.project;
      doc.project.title = "__smoke_test__ 已改名";
      doc.project.logline = "__smoke_test__ 冒烟测试改动的 logline";

      const { status } = await fetchJson(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: doc })
      });
      assert.equal(status, 200);

      const { body: reloaded } = await fetchJson(`/api/projects/${projectId}`);
      assert.equal(reloaded.project.project.title, "__smoke_test__ 已改名");
      assert.equal(reloaded.project.project.logline, "__smoke_test__ 冒烟测试改动的 logline");
    });

    await t("GET 不存在的项目 → 404 而非挂起", async () => {
      const { status, body } = await fetchJson("/api/projects/__does_not_exist__");
      assert.equal(status, 404);
      assert.ok(body?.error);
    });

    await t("POST /api/generate 缺 step 参数 → 400 而非 500 崩溃", async () => {
      const { status, body } = await fetchJson("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      assert.equal(status, 400);
      assert.ok(body?.error);
    });

    await t("清理：DELETE 自己创建的测试项目", async () => {
      const { status } = await fetchJson(`/api/projects/${projectId}`, { method: "DELETE" });
      assert.equal(status, 200);
      createdProjectIds.pop();
      const { status: getStatus } = await fetchJson(`/api/projects/${projectId}`);
      assert.equal(getStatus, 404, "删除后仍能查到，清理未生效");
    });
  } finally {
    // 兜底清理：即使某个用例失败中断，也尽量把本次创建的测试项目删掉，不残留在真实 data/ 里
    for (const id of createdProjectIds) {
      try { await fetchJson(`/api/projects/${id}`, { method: "DELETE" }); } catch { /* best effort */ }
    }
    await killChild(child);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("smoke test 运行异常：", err);
  process.exit(1);
});
