// 知识源 provider 注册表。
// 新增源时：在 src/knowledge/providers/ 下实现 provider，然后在底部 register()。

const PROVIDERS = new Map();

export function registerProvider(provider) {
  if (!provider?.meta?.id) {
    throw new Error("Provider 必须有 meta.id");
  }
  PROVIDERS.set(provider.meta.id, provider);
}

export function listSources() {
  return Array.from(PROVIDERS.values()).map((p) => ({
    ...p.meta,
    status: typeof p.meta.status === "function" ? p.meta.status() : (p.meta.status ?? {})
  }));
}

export function getProvider(sourceId) {
  return PROVIDERS.get(sourceId) ?? null;
}

// ── 注册 provider 区域 ──────────────────────────────────────────────────────
import { storyKbProvider } from "./providers/storykb.js";
registerProvider(storyKbProvider);
