// 新知识源 provider 模板。复制此文件改名后在 registry.js 注册即可。
//
// 必须实现的接口：
//   meta: { id, name, description, homepage, kinds, hasSync, status() }
//   sync(): Promise<{ added, updated, removed, total }>
//   listEntries(opts): Promise<{ items: KnowledgeEntrySummary[], total: number, needsSync?: boolean }>
//   getEntry(externalId): Promise<KnowledgeEntryDetail | null>
//
// 见 types.js 的 JSDoc 类型定义。

export const templateProvider = {
  meta: {
    id: "template",                  // 必须全局唯一
    name: "示例知识源",
    description: "请替换为你的知识库描述。",
    homepage: "https://example.com",
    kinds: ["concept"],              // 见 types.js 的 STANDARD_KINDS
    hasSync: false,
    status: () => ({ entryCount: 0, lastSyncedAt: null })
  },

  async sync() {
    // 拉远程数据 → 写本地缓存
    return { added: 0, updated: 0, removed: 0, total: 0 };
  },

  async listEntries({ query = "", type = "", limit = 30, offset = 0 } = {}) {
    // 读本地缓存并过滤
    return { items: [], total: 0, needsSync: true };
  },

  async getEntry(externalId) {
    // 拉单条详情
    return null;
  }
};
