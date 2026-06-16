import { getLlmConfig } from "../llm.js";

function list(value) {
  return Array.isArray(value) ? value : [];
}

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// provider/key/model 的真源在 llm.js；这里保留只读 shim 供结构化输出与模型列表使用
const runtimeConfig = {
  get provider() { return getLlmConfig().provider; },
  get apiKey() { return getLlmConfig().apiKey; },
  get model() { return getLlmConfig().model; },
  get source() { return getLlmConfig().source; }
};
const defaultModels = { openai: "gpt-5.4-mini", gemini: "gemini-2.5-flash" };

function normalizeProvider(value) {
  const v = String(value ?? "").trim();
  return ["claude_cli", "anthropic", "openai", "gemini", "custom"].includes(v) ? v : "openai";
}

function sortByPreferredOrder(items, priorities = []) {
  const scoreMap = new Map(priorities.map((value, index) => [value, index]));
  return [...items].sort((left, right) => {
    const leftScore = scoreMap.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightScore = scoreMap.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }
    return left.id.localeCompare(right.id);
  });
}

function isOpenAiSelectableModel(id) {
  const value = trimText(id).toLowerCase();
  if (!value) return false;
  if (!/^(gpt|o\d|o[1-9]|chatgpt-)/.test(value)) {
    return false;
  }
  if (/(audio|realtime|transcribe|tts|image|vision|search|deep-research|moderation|embedding|whisper|dall-e|sora|omni)/.test(value)) {
    return false;
  }
  if (/\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  return true;
}

async function listOpenAiModels(apiKey) {
  const response = await fetch("https://api.openai.com/v1/models", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI 模型列表获取失败：${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const options = list(payload.data)
    .map((item) => trimText(item?.id))
    .filter(isOpenAiSelectableModel)
    .map((id) => ({ id, label: id }));

  const deduped = [...new Map(options.map((item) => [item.id, item])).values()];
  return sortByPreferredOrder(deduped, [
    "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "gpt-4o",
    "gpt-4o-mini",
    "o4-mini",
    "o3"
  ]);
}

function isGeminiSelectableModel(model) {
  const name = trimText(model?.name);
  const id = name.replace(/^models\//, "");
  const actions = list(model?.supportedGenerationMethods ?? model?.supported_actions).map((item) => trimText(item));
  if (!id.startsWith("gemini")) {
    return false;
  }
  if (!actions.includes("generateContent")) {
    return false;
  }
  if (/(embedding|image|tts|audio|realtime)/i.test(id)) {
    return false;
  }
  return true;
}

async function listGeminiModels(apiKey) {
  let pageToken = "";
  const collected = [];

  do {
    const query = new URLSearchParams({ key: apiKey, pageSize: "1000" });
    if (pageToken) {
      query.set("pageToken", pageToken);
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?${query.toString()}`, {
      method: "GET"
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini 模型列表获取失败：${response.status} ${errorText}`);
    }

    const payload = await response.json();
    collected.push(...list(payload.models));
    pageToken = trimText(payload.nextPageToken);
  } while (pageToken);

  const options = collected
    .filter(isGeminiSelectableModel)
    .map((model) => {
      const id = trimText(model.name).replace(/^models\//, "");
      return {
        id,
        label: trimText(model.displayName) || id
      };
    });

  const deduped = [...new Map(options.map((item) => [item.id, item])).values()];
  return sortByPreferredOrder(deduped, ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"]);
}

function resolveApiKey(provider, apiKey) {
  const key = trimText(apiKey);
  if (key) {
    return key;
  }
  if (runtimeConfig.provider === provider && runtimeConfig.apiKey) {
    return runtimeConfig.apiKey;
  }
  return "";
}

function resolvePreferredModel(provider, models = []) {
  const currentModel = runtimeConfig.provider === provider ? trimText(runtimeConfig.model) : "";
  if (currentModel && models.some((item) => item.id === currentModel)) {
    return currentModel;
  }
  const defaultModel = defaultModels[provider];
  if (defaultModel && models.some((item) => item.id === defaultModel)) {
    return defaultModel;
  }
  return models[0]?.id ?? defaultModel;
}

async function listAnthropicModels(apiKey) {
  const response = await fetch("https://api.anthropic.com/v1/models?limit=100", {
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
  });
  if (!response.ok) throw new Error(`Anthropic 模型列表失败：${response.status} ${(await response.text()).slice(0, 200)}`);
  const payload = await response.json();
  return (payload.data ?? []).map((m) => ({ id: m.id, label: m.display_name || m.id }));
}

async function listCustomModels(apiKey, baseUrl) {
  const base = (baseUrl || "https://api.deepseek.com/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/models`, {
    headers: { authorization: `Bearer ${apiKey}` }
  });
  if (!response.ok) throw new Error(`兼容端点模型列表失败：${response.status} ${(await response.text()).slice(0, 200)}`);
  const payload = await response.json();
  return (payload.data ?? []).map((m) => ({ id: m.id, label: m.id }));
}

async function listAvailableModels({ provider, apiKey, baseUrl }) {
  const safeProvider = normalizeProvider(trimText(provider));
  if (safeProvider === "claude_cli") {
    return { provider: safeProvider, models: [], defaultModel: "" };
  }
  const safeApiKey = resolveApiKey(safeProvider, apiKey);
  if (!safeApiKey) {
    throw new Error("请先提供有效的 API Key。");
  }

  const models =
    safeProvider === "gemini" ? await listGeminiModels(safeApiKey)
    : safeProvider === "anthropic" ? await listAnthropicModels(safeApiKey)
    : safeProvider === "custom" ? await listCustomModels(safeApiKey, baseUrl ?? getLlmConfig().baseUrl)
    : await listOpenAiModels(safeApiKey);

  return {
    provider: safeProvider,
    models,
    defaultModel: resolvePreferredModel(safeProvider, models)
  };
}

export { listAvailableModels };
