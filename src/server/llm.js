// 统一 LLM 完成层：所有服务端生成请求的唯一出口。
// 支持六种 provider：
//   zhipu      — 智谱 GLM（bigmodel.cn，OpenAI 兼容，默认；ZHIPU_API_KEY）
//   claude_cli — 本地 claude CLI（订阅计费，无需 key）
//   anthropic  — Anthropic API（ANTHROPIC_API_KEY）
//   openai     — OpenAI API（OPENAI_API_KEY）
//   gemini     — Google Gemini API（GEMINI_API_KEY）
//   custom     — 任意 OpenAI 兼容端点（DeepSeek/Kimi/Qwen/Ollama/Grok…，LLM_BASE_URL + LLM_API_KEY）
// 模型默认值核对于 2026-06-27，各厂商发新模型后可在设置面板直接改。
import { spawnClaude } from "./spawnClaude.js";
import { getDb } from "./db.js";
import { Agent, EnvHttpProxyAgent, setGlobalDispatcher } from "undici";

// undici 默认 headersTimeout/bodyTimeout=300s：非流式 LLM 请求在模型出全量结果前
// 不回响应头，重型步骤（scene_expansion 实测 380s+）会先于 AbortSignal.timeout(420s)
// 被 undici 掐死，表现为不可读的 "fetch failed"（真检发现的第三层超时）。
// dispatcher 超时是天花板，各请求的实际预算仍由 fetchSignal 的 AbortSignal 控制。
const DISPATCHER_TIMEOUTS = { headersTimeout: 600_000, bodyTimeout: 600_000 };

// Node 的 fetch 默认忽略 HTTP(S)_PROXY 环境变量；国内直连 OpenAI/Anthropic/Gemini
// 通常不可达。检测到代理环境变量时挂全局代理 dispatcher（遵守 NO_PROXY，
// 本地 127.0.0.1 的自家 API 与 Ollama 等不受影响）。
try {
  if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy) {
    setGlobalDispatcher(new EnvHttpProxyAgent(DISPATCHER_TIMEOUTS));
    console.log("[llm] 已启用环境代理（HTTPS_PROXY），外部模型 API 经代理访问");
  } else {
    setGlobalDispatcher(new Agent(DISPATCHER_TIMEOUTS));
  }
} catch (err) {
  console.warn("[llm] dispatcher 初始化失败：", err.message);
}

export const LLM_PROVIDERS = ["zhipu", "claude_cli", "anthropic", "openai", "gemini", "custom"];

const DEFAULT_MODELS = {
  zhipu: process.env.ZHIPU_MODEL || "glm-5.2",
  claude_cli: "",
  anthropic: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
  openai: process.env.OPENAI_MODEL || "gpt-5.4",
  gemini: process.env.GEMINI_MODEL || "gemini-3.5-flash",
  custom: process.env.LLM_MODEL || "deepseek-v4-flash"
};

const ENV_KEYS = {
  zhipu: process.env.ZHIPU_API_KEY || "",
  anthropic: process.env.ANTHROPIC_API_KEY || "",
  openai: process.env.OPENAI_API_KEY || "",
  gemini: process.env.GEMINI_API_KEY || "",
  custom: process.env.LLM_API_KEY || ""
};

const DEFAULT_BASE_URLS = {
  zhipu: process.env.ZHIPU_BASE_URL || "https://open.bigmodel.cn/api/paas/v4",
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com",
  gemini: "https://generativelanguage.googleapis.com",
  custom: process.env.LLM_BASE_URL || "https://api.deepseek.com/v1"
};

const TIMEOUT_MS = 300_000;

// 把外部中止信号（客户端断开）与超时信号合并：任一触发即中止 fetch，
// 避免客户端取消后底层 LLM 请求仍跑满 TIMEOUT_MS 造成连接泄漏。
// timeoutMs 可选覆盖默认 300s——个别单次请求量大的步骤（如全片场景表一次性展开
// 十几张剧情卡）在 glm-5.2 下实测耗时可达 380s+，仍在默认超时内触发 fetch failed。
function fetchSignal(signal, timeoutMs = TIMEOUT_MS) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([timeout, signal]) : timeout;
}

const initialProvider = LLM_PROVIDERS.includes(process.env.LLM_PROVIDER) ? process.env.LLM_PROVIDER : "zhipu";

const llmConfig = {
  provider: initialProvider,
  apiKey: ENV_KEYS[initialProvider] ?? "",
  model: DEFAULT_MODELS[initialProvider] ?? "",
  baseUrl: DEFAULT_BASE_URLS[initialProvider] ?? "",
  source: initialProvider !== "claude_cli" && ENV_KEYS[initialProvider] ? "env" : initialProvider === "claude_cli" ? "subscription" : "none"
};

// ── 配置持久化（app_meta）：重启后不静默回退到 claude_cli ─────────────────────
// 注意：apiKey 以明文存本地 SQLite——本应用是单机本地工具，数据库即用户自己的磁盘；
// 不存时每次重启都要重粘 key，比泄露面更伤可用性。env 来源的 key 不落库。
const LLM_CONFIG_META_KEY = "llm_config";

function persistLlmConfig() {
  try {
    const db = getDb();
    const toSave = { ...llmConfig };
    if (toSave.source === "env") toSave.apiKey = "";
    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)")
      .run(LLM_CONFIG_META_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.warn("[llm] 配置持久化失败：", err.message);
  }
}

function restoreLlmConfig() {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM app_meta WHERE key = ?").get(LLM_CONFIG_META_KEY);
    if (!row?.value) return;
    const saved = JSON.parse(row.value);
    // 旧版智谱走 custom + bigmodel baseUrl，升级为一等 zhipu provider（key 原样保留）
    if (saved.provider === "custom" && /bigmodel\.cn/.test(saved.baseUrl || "")) saved.provider = "zhipu";
    if (!LLM_PROVIDERS.includes(saved.provider)) return;
    llmConfig.provider = saved.provider;
    llmConfig.model = saved.model || DEFAULT_MODELS[saved.provider] || "";
    llmConfig.baseUrl = saved.baseUrl || DEFAULT_BASE_URLS[saved.provider] || "";
    // key 优先级：落库的 session key > 当前 env key
    llmConfig.apiKey = saved.apiKey || ENV_KEYS[saved.provider] || "";
    llmConfig.source = saved.provider === "claude_cli" ? "subscription"
      : saved.apiKey ? "session" : llmConfig.apiKey ? "env" : "none";
  } catch (err) {
    console.warn("[llm] 配置恢复失败：", err.message);
  }
}

restoreLlmConfig();

export function getLlmConfig() {
  return { ...llmConfig };
}

export function setLlmConfig({ provider, apiKey, model, baseUrl } = {}) {
  if (provider != null && LLM_PROVIDERS.includes(String(provider).trim())) {
    const next = String(provider).trim();
    if (next !== llmConfig.provider) {
      llmConfig.provider = next;
      llmConfig.model = DEFAULT_MODELS[next] ?? "";
      llmConfig.baseUrl = DEFAULT_BASE_URLS[next] ?? "";
      llmConfig.apiKey = ENV_KEYS[next] ?? "";
      llmConfig.source = next === "claude_cli" ? "subscription" : llmConfig.apiKey ? "env" : "none";
    }
  }
  if (typeof apiKey === "string") {
    llmConfig.apiKey = apiKey.trim();
    if (llmConfig.provider !== "claude_cli") llmConfig.source = llmConfig.apiKey ? "session" : "none";
  }
  if (typeof model === "string" && model.trim()) llmConfig.model = model.trim();
  if (typeof baseUrl === "string" && baseUrl.trim()) llmConfig.baseUrl = baseUrl.trim().replace(/\/+$/, "");
  persistLlmConfig();
  return getLlmConfig();
}

// ── 连接档案：保存多套 provider 配置，支持智谱/DeepSeek/Claude API 等并存切换 ──
const PROFILES_META_KEY = "llm_profiles";
let llmProfiles = [];

function persistProfiles() {
  try {
    getDb().prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)")
      .run(PROFILES_META_KEY, JSON.stringify(llmProfiles));
  } catch (err) {
    console.warn("[llm] 档案持久化失败：", err.message);
  }
}

function restoreProfiles() {
  try {
    const row = getDb().prepare("SELECT value FROM app_meta WHERE key = ?").get(PROFILES_META_KEY);
    if (row?.value) {
      llmProfiles = JSON.parse(row.value)
        .map((p) => (p.provider === "custom" && /bigmodel\.cn/.test(p.baseUrl || "") ? { ...p, provider: "zhipu", name: p.name?.startsWith("bigmodel") ? `智谱 · ${p.model}` : p.name } : p))
        .filter((p) => LLM_PROVIDERS.includes(p.provider));
    }
  } catch (err) {
    console.warn("[llm] 档案恢复失败：", err.message);
  }
}
restoreProfiles();

function profileFingerprint(p) {
  return `${p.provider}|${p.model}|${p.baseUrl ?? ""}`;
}

// 列表返回时 key 打码，前端永远拿不到完整 key
export function listLlmProfiles() {
  const activeFp = profileFingerprint(llmConfig);
  return llmProfiles.map((p) => ({
    id: p.id,
    name: p.name,
    provider: p.provider,
    model: p.model,
    baseUrl: p.baseUrl ?? "",
    hasKey: Boolean(p.apiKey),
    active: profileFingerprint(p) === activeFp
  }));
}

export function upsertLlmProfile({ name, provider, apiKey, model, baseUrl } = {}) {
  if (!LLM_PROVIDERS.includes(provider)) return listLlmProfiles();
  const fp = profileFingerprint({ provider, model, baseUrl });
  const existing = llmProfiles.find((p) => profileFingerprint(p) === fp);
  if (existing) {
    if (apiKey) existing.apiKey = apiKey;
    if (name) existing.name = name;
  } else {
    llmProfiles.push({
      id: `prof_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name: name || (provider === "claude_cli" ? "Claude CLI" : `${provider === "custom" ? new URL(baseUrl || "https://x").hostname.split(".").slice(-2, -1)[0] : provider === "zhipu" ? "智谱" : provider} · ${model}`),
      provider,
      apiKey: apiKey ?? "",
      model: model ?? "",
      baseUrl: baseUrl ?? ""
    });
  }
  persistProfiles();
  return listLlmProfiles();
}

export function activateLlmProfile(id) {
  const p = llmProfiles.find((x) => x.id === id);
  if (!p) throw new Error("连接档案不存在");
  setLlmConfig({ provider: p.provider, apiKey: p.apiKey || ENV_KEYS[p.provider] || "", model: p.model, baseUrl: p.baseUrl });
  return getLlmStatus();
}

export function deleteLlmProfile(id) {
  llmProfiles = llmProfiles.filter((x) => x.id !== id);
  persistProfiles();
  return listLlmProfiles();
}

export function getLlmStatus() {
  const c = llmConfig;
  if (c.provider === "claude_cli") {
    return { configured: true, provider: "claude_cli", model: "claude CLI（订阅）", source: "subscription" };
  }
  return { configured: Boolean(c.apiKey), provider: c.provider, model: c.model, source: c.source };
}

// ── claude CLI 路径 ───────────────────────────────────────────────────────────
function claudeCliOnce(prompt, { effort = "", onChunk = null, signal = null, timeoutMs = TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error("请求已中止")); return; }
    const args = ["-p", "--output-format", "text"];
    if (effort) args.push("--effort", effort);
    const proc = spawnClaude(args);
    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");
    proc.stdin.setDefaultEncoding("utf8");
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => { proc.kill(); reject(new Error("claude CLI 超时")); }, timeoutMs);
    // 客户端断开时杀掉子进程，避免订阅额度被无人接收的生成白白消耗
    const onAbort = () => { proc.kill(); reject(new Error("请求已中止")); };
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
    const cleanup = () => { clearTimeout(timer); if (signal) signal.removeEventListener("abort", onAbort); };
    proc.stdout.on("data", (d) => { stdout += d; if (onChunk) onChunk(d); });
    proc.stderr.on("data", (d) => { stderr += d; });
    proc.stdin.write(prompt, "utf8");
    proc.stdin.end();
    proc.on("close", (code) => {
      cleanup();
      if (code !== 0) reject(new Error(`claude CLI 退出码 ${code}: ${stderr.slice(0, 300)}`));
      else resolve(stdout);
    });
    proc.on("error", (err) => { cleanup(); reject(err); });
  });
}

// ── Anthropic API ─────────────────────────────────────────────────────────────
async function anthropicComplete(prompt, { onChunk = null, signal = null, timeoutMs = TIMEOUT_MS } = {}) {
  const stream = Boolean(onChunk);
  const base = (llmConfig.baseUrl || DEFAULT_BASE_URLS.anthropic).replace(/\/+$/, "");
  const response = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": llmConfig.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: llmConfig.model,
      max_tokens: 16000,
      temperature: 0.6,
      stream,
      messages: [{ role: "user", content: prompt }]
    }),
    signal: fetchSignal(signal, timeoutMs)
  });
  if (!response.ok) throw new Error(`Anthropic 请求失败：${response.status} ${(await response.text()).slice(0, 300)}`);
  if (!stream) {
    const payload = await response.json();
    return (payload.content ?? []).map((b) => b.text ?? "").join("");
  }
  let full = "";
  for await (const data of sseEvents(response.body)) {
    let evt;
    try { evt = JSON.parse(data); } catch { continue; }
    if (evt.type === "content_block_delta" && evt.delta?.text) {
      full += evt.delta.text;
      onChunk(evt.delta.text);
    }
  }
  return full;
}

// ── OpenAI 及兼容端点（openai / custom） ─────────────────────────────────────
async function openAiCompatComplete(prompt, { onChunk = null, signal = null, timeoutMs = TIMEOUT_MS } = {}) {
  const base = llmConfig.baseUrl || DEFAULT_BASE_URLS[llmConfig.provider] || DEFAULT_BASE_URLS.openai;
  // 恒为流式请求：非流式模式下，模型思考期间连接零字节流动，会被代理/网关当作空闲
  // 连接掐断（真检实测：经本地代理 ~108s 即被断 UND_ERR_SOCKET other side closed，
  // 而该次生成需 ~292s 才出结果）。SSE 流式让字节持续流动，对任何中间盒免疫；
  // 调用方不要流（onChunk 为空）时在此聚合成整段返回，外部行为不变。
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${llmConfig.apiKey}`
    },
    body: JSON.stringify({
      model: llmConfig.model,
      stream: true,
      temperature: 0.6,
      messages: [{ role: "user", content: prompt }]
    }),
    signal: fetchSignal(signal, timeoutMs)
  });
  if (!response.ok) throw new Error(`${llmConfig.provider === "openai" ? "OpenAI" : llmConfig.provider === "zhipu" ? "智谱 GLM" : "兼容端点"} 请求失败：${response.status} ${(await response.text()).slice(0, 300)}`);
  let full = "";
  for await (const data of sseEvents(response.body)) {
    if (data === "[DONE]") break;
    let evt;
    try { evt = JSON.parse(data); } catch { continue; }
    const delta = evt.choices?.[0]?.delta?.content;
    if (delta) { full += delta; if (onChunk) onChunk(delta); }
  }
  return full;
}

// ── Gemini API ────────────────────────────────────────────────────────────────
async function geminiComplete(prompt, { onChunk = null, signal = null, timeoutMs = TIMEOUT_MS } = {}) {
  const base = (llmConfig.baseUrl || DEFAULT_BASE_URLS.gemini).replace(/\/+$/, "");
  const endpoint = `${base}/v1beta/models/${encodeURIComponent(llmConfig.model)}:generateContent?key=${encodeURIComponent(llmConfig.apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    signal: fetchSignal(signal, timeoutMs)
  });
  if (!response.ok) throw new Error(`Gemini 请求失败：${response.status} ${(await response.text()).slice(0, 300)}`);
  const payload = await response.json();
  const text = (payload?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  if (onChunk && text) onChunk(text);
  return text;
}

// ── SSE 解析（Buffer 收集后整体按行解码，杜绝多字节截断） ─────────────────────
async function* sseEvents(body) {
  const decoder = new TextDecoder("utf-8");
  let buf = "";
  for await (const chunk of body) {
    buf += decoder.decode(chunk, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (line.startsWith("data:")) yield line.slice(5).trim();
    }
  }
}

// ── 统一出口 ──────────────────────────────────────────────────────────────────
async function dispatch(prompt, opts) {
  switch (llmConfig.provider) {
    case "anthropic": return anthropicComplete(prompt, opts);
    case "zhipu":
    case "openai":
    case "custom": return openAiCompatComplete(prompt, opts);
    case "gemini": return geminiComplete(prompt, opts);
    default: return claudeCliOnce(prompt, opts);
  }
}

// 带重试的完成调用（与原 callClaudeSubprocess 同语义）
export async function completeText(prompt, { effort = "", retries = 2, retryDelayMs = 4000, timeoutMs = TIMEOUT_MS } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await dispatch(prompt, { effort, timeoutMs });
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        console.warn(`[llm:${llmConfig.provider}] attempt ${attempt + 1}/${retries + 1} failed: ${String(err.message).slice(0, 120)}, retrying in ${retryDelayMs}ms...`);
        await new Promise((r) => setTimeout(r, retryDelayMs));
      }
    }
  }
  throw lastError;
}

// 流式完成：onChunk 按到达顺序回调文本增量，返回完整文本。不重试（流式中断由调用方处理）。
export async function completeTextStream(prompt, onChunk, { effort = "", signal = null } = {}) {
  return dispatch(prompt, { effort, onChunk, signal });
}
