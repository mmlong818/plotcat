// 统一 LLM 完成层：所有服务端生成请求的唯一出口。
// 支持五种 provider：
//   claude_cli — 本地 claude CLI（订阅计费，默认；无需 key）
//   anthropic  — Anthropic API（ANTHROPIC_API_KEY）
//   openai     — OpenAI API（OPENAI_API_KEY）
//   gemini     — Google Gemini API（GEMINI_API_KEY）
//   custom     — 任意 OpenAI 兼容端点（DeepSeek/Kimi/Qwen/GLM/Ollama/Grok…，LLM_BASE_URL + LLM_API_KEY）
// 模型默认值依据 E:\CC\ai-models.md（2026-05-30）。
import { spawnClaude } from "./spawnClaude.js";

export const LLM_PROVIDERS = ["claude_cli", "anthropic", "openai", "gemini", "custom"];

const DEFAULT_MODELS = {
  claude_cli: "",
  anthropic: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
  openai: process.env.OPENAI_MODEL || "gpt-5.4-mini",
  gemini: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  custom: process.env.LLM_MODEL || "deepseek-v4-flash"
};

const ENV_KEYS = {
  anthropic: process.env.ANTHROPIC_API_KEY || "",
  openai: process.env.OPENAI_API_KEY || "",
  gemini: process.env.GEMINI_API_KEY || "",
  custom: process.env.LLM_API_KEY || ""
};

const DEFAULT_BASE_URLS = {
  openai: "https://api.openai.com/v1",
  custom: process.env.LLM_BASE_URL || "https://api.deepseek.com/v1"
};

const TIMEOUT_MS = 300_000;

const initialProvider = LLM_PROVIDERS.includes(process.env.LLM_PROVIDER) ? process.env.LLM_PROVIDER : "claude_cli";

const llmConfig = {
  provider: initialProvider,
  apiKey: ENV_KEYS[initialProvider] ?? "",
  model: DEFAULT_MODELS[initialProvider] ?? "",
  baseUrl: DEFAULT_BASE_URLS[initialProvider] ?? "",
  source: initialProvider !== "claude_cli" && ENV_KEYS[initialProvider] ? "env" : initialProvider === "claude_cli" ? "subscription" : "none"
};

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
  return getLlmConfig();
}

export function getLlmStatus() {
  const c = llmConfig;
  if (c.provider === "claude_cli") {
    return { configured: true, provider: "claude_cli", model: "claude CLI（订阅）", source: "subscription" };
  }
  return { configured: Boolean(c.apiKey), provider: c.provider, model: c.model, source: c.source };
}

// ── claude CLI 路径 ───────────────────────────────────────────────────────────
function claudeCliOnce(prompt, { effort = "", onChunk = null } = {}) {
  return new Promise((resolve, reject) => {
    const args = ["-p", "--output-format", "text"];
    if (effort) args.push("--effort", effort);
    const proc = spawnClaude(args);
    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");
    proc.stdin.setDefaultEncoding("utf8");
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => { proc.kill(); reject(new Error("claude CLI 超时")); }, TIMEOUT_MS);
    proc.stdout.on("data", (d) => { stdout += d; if (onChunk) onChunk(d); });
    proc.stderr.on("data", (d) => { stderr += d; });
    proc.stdin.write(prompt, "utf8");
    proc.stdin.end();
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`claude CLI 退出码 ${code}: ${stderr.slice(0, 300)}`));
      else resolve(stdout);
    });
    proc.on("error", (err) => { clearTimeout(timer); reject(err); });
  });
}

// ── Anthropic API ─────────────────────────────────────────────────────────────
async function anthropicComplete(prompt, { onChunk = null } = {}) {
  const stream = Boolean(onChunk);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": llmConfig.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: llmConfig.model,
      max_tokens: 16000,
      stream,
      messages: [{ role: "user", content: prompt }]
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS)
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
async function openAiCompatComplete(prompt, { onChunk = null } = {}) {
  const base = llmConfig.baseUrl || DEFAULT_BASE_URLS[llmConfig.provider] || DEFAULT_BASE_URLS.openai;
  const stream = Boolean(onChunk);
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${llmConfig.apiKey}`
    },
    body: JSON.stringify({
      model: llmConfig.model,
      stream,
      messages: [{ role: "user", content: prompt }]
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`${llmConfig.provider === "openai" ? "OpenAI" : "兼容端点"} 请求失败：${response.status} ${(await response.text()).slice(0, 300)}`);
  if (!stream) {
    const payload = await response.json();
    return payload.choices?.[0]?.message?.content ?? "";
  }
  let full = "";
  for await (const data of sseEvents(response.body)) {
    if (data === "[DONE]") break;
    let evt;
    try { evt = JSON.parse(data); } catch { continue; }
    const delta = evt.choices?.[0]?.delta?.content;
    if (delta) { full += delta; onChunk(delta); }
  }
  return full;
}

// ── Gemini API ────────────────────────────────────────────────────────────────
async function geminiComplete(prompt, { onChunk = null } = {}) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(llmConfig.model)}:generateContent?key=${encodeURIComponent(llmConfig.apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    signal: AbortSignal.timeout(TIMEOUT_MS)
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
    case "openai":
    case "custom": return openAiCompatComplete(prompt, opts);
    case "gemini": return geminiComplete(prompt, opts);
    default: return claudeCliOnce(prompt, opts);
  }
}

// 带重试的完成调用（与原 callClaudeSubprocess 同语义）
export async function completeText(prompt, { effort = "", retries = 2, retryDelayMs = 4000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await dispatch(prompt, { effort });
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
export async function completeTextStream(prompt, onChunk, { effort = "" } = {}) {
  return dispatch(prompt, { effort, onChunk });
}
