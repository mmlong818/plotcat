// storykb provider — 接 https://github.com/mmlong818/storykb
//
// 策略：
//   - sync(): 从 GitHub raw 拉 wiki-bundle.json，写到本地缓存
//   - listEntries(): 读本地缓存，按 query/type 过滤
//   - getEntry(id): 优先读详情缓存，未命中则远程拉 database/nodes/wiki/{id}.json 并缓存
//
// 缓存目录：data/knowledge-cache/storykb/

import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_DIR = path.resolve(__dirname, "../../../data/knowledge-cache/storykb");
const BUNDLE_FILE = path.join(CACHE_DIR, "wiki-bundle.json");
const DETAILS_DIR = path.join(CACHE_DIR, "nodes");
const META_FILE = path.join(CACHE_DIR, "_meta.json");

const RAW_BASE = "https://raw.githubusercontent.com/mmlong818/storykb/master";

function ensureCacheDirs() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.mkdirSync(DETAILS_DIR, { recursive: true });
}

function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "yuandian-screenwriting/1.0" } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return resolve(fetchRaw(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function loadBundleCache() {
  if (!fs.existsSync(BUNDLE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(BUNDLE_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function loadMeta() {
  if (!fs.existsSync(META_FILE)) return { entryCount: 0, lastSyncedAt: null };
  try {
    return JSON.parse(fs.readFileSync(META_FILE, "utf-8"));
  } catch {
    return { entryCount: 0, lastSyncedAt: null };
  }
}

function saveMeta(meta) {
  ensureCacheDirs();
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2), "utf-8");
}

// ── 转换 ────────────────────────────────────────────────────────────────────

function bundleConceptToSummary(c) {
  const subtitle = c.canonical_en ?? "";
  const aliases = Array.isArray(c.aliases) ? c.aliases : [];
  return {
    source_id: "storykb",
    external_id: c.conceptId,
    kind: "concept",
    title: c.canonical_zh || c.canonical_en || c.conceptId,
    subtitle: aliases.length > 0 ? `${subtitle} · 别名 ${aliases.join("、")}` : subtitle,
    tags: Array.isArray(c.types) ? c.types : [],
    preview: ""
  };
}

function detailToEntry(d) {
  const sections = d.sections || {};
  const bodyParts = [];
  const SECTION_ORDER = [
    ["definition",   "定义"],
    ["origins",      "起源"],
    ["components",   "构成"],
    ["mechanism",    "运作机制"],
    ["applications", "应用"],
    ["examples",     "案例"],
    ["diagnostics",  "诊断"],
    ["pitfalls",     "误区"]
  ];
  for (const [key, label] of SECTION_ORDER) {
    if (sections[key]) bodyParts.push(`## ${label}\n\n${sections[key]}`);
  }
  return {
    source_id: "storykb",
    external_id: d.conceptId,
    kind: "concept",
    title: d.canonical_zh || d.canonical_en || d.conceptId,
    subtitle: d.canonical_en || "",
    tags: Array.isArray(d.types) ? d.types : [],
    aliases: Array.isArray(d.aliases) ? d.aliases : [],
    body: bodyParts.join("\n\n"),
    sections,
    related: Array.isArray(d.related_concepts) ? d.related_concepts : [],
    sources: Array.isArray(d.source_perspectives) ? d.source_perspectives : []
  };
}

// ── Provider 接口 ───────────────────────────────────────────────────────────

async function sync() {
  ensureCacheDirs();
  const raw = await fetchRaw(`${RAW_BASE}/wiki-bundle.json`);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`storykb bundle 解析失败：${e.message}`);
  }
  fs.writeFileSync(BUNDLE_FILE, raw, "utf-8");
  const total = Array.isArray(parsed.concepts) ? parsed.concepts.length : 0;
  const meta = { entryCount: total, lastSyncedAt: new Date().toISOString() };
  saveMeta(meta);
  return { added: total, updated: 0, removed: 0, total };
}

async function listEntries({ query = "", type = "", limit = 30, offset = 0 } = {}) {
  const bundle = loadBundleCache();
  if (!bundle) return { items: [], total: 0, needsSync: true };
  const all = Array.isArray(bundle.concepts) ? bundle.concepts : [];
  const q = (query || "").trim().toLowerCase();
  const t = (type || "").trim();
  const filtered = all.filter((c) => {
    if (t && !(Array.isArray(c.types) && c.types.includes(t))) return false;
    if (!q) return true;
    const haystacks = [c.canonical_zh, c.canonical_en, ...(c.aliases || [])].filter(Boolean);
    return haystacks.some((s) => s.toLowerCase().includes(q));
  });
  const items = filtered.slice(offset, offset + limit).map(bundleConceptToSummary);
  return { items, total: filtered.length };
}

async function getEntry(externalId) {
  ensureCacheDirs();
  const detailPath = path.join(DETAILS_DIR, `${externalId}.json`);
  if (fs.existsSync(detailPath)) {
    try {
      return detailToEntry(JSON.parse(fs.readFileSync(detailPath, "utf-8")));
    } catch {
      // fallthrough to refetch
    }
  }
  try {
    const raw = await fetchRaw(`${RAW_BASE}/database/nodes/wiki/${externalId}.json`);
    const parsed = JSON.parse(raw);
    fs.writeFileSync(detailPath, raw, "utf-8");
    return detailToEntry(parsed);
  } catch (e) {
    return null;
  }
}

// ── meta 视图 ───────────────────────────────────────────────────────────────

export const storyKbProvider = {
  meta: {
    id: "storykb",
    name: "猫叔的编剧知识库",
    description: "497 个编剧核心概念，覆盖故事结构、人物塑造、对白技巧、戏剧理论、流派风格。",
    homepage: "https://github.com/mmlong818/storykb",
    kinds: ["concept"],
    hasSync: true,
    status: () => {
      const meta = loadMeta();
      return {
        entryCount: meta.entryCount ?? 0,
        lastSyncedAt: meta.lastSyncedAt ?? null
      };
    }
  },
  sync,
  listEntries,
  getEntry
};
