import { test, describe } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import {
  extractJsonCandidate,
  repairUnescapedQuotes,
  repairUnquotedStringValues,
  parseJsonFromClaude
} from "../../src/server/ai/jsonRepair.js";

describe("jsonRepair: extractJsonCandidate", () => {
  test("提取完整的 ```json fence 块", () => {
    const text = "前言说明文字\n```json\n{\"title\":\"标题\",\"n\":1}\n```\n后续说明";
    const candidate = extractJsonCandidate(text).trim();
    assert.deepEqual(JSON.parse(candidate), { title: "标题", n: 1 });
  });

  test("提取无 fence 的裸 JSON（前后夹中文说明）", () => {
    const text = "好的，这是结果：{\"a\":1,\"b\":\"你好\"} 希望对你有帮助";
    const candidate = extractJsonCandidate(text);
    assert.deepEqual(JSON.parse(candidate), { a: 1, b: "你好" });
  });

  test("fence 未闭合（截断）：截到最后一个 } 仍可救", () => {
    const text = "```json\n{\"a\":1,\"b\":{\"c\":2}}\n后面是垂悬的未闭合垃圾 {";
    const candidate = extractJsonCandidate(text);
    assert.deepEqual(JSON.parse(candidate), { a: 1, b: { c: 2 } });
  });
});

describe("jsonRepair: repairUnescapedQuotes", () => {
  test("修复字符串值内未转义的英文双引号（中文场景常见）", () => {
    const broken = '{"line":"他说"你好"啊"}';
    assert.throws(() => JSON.parse(broken), /JSON/);
    const fixed = repairUnescapedQuotes(broken);
    assert.deepEqual(JSON.parse(fixed), { line: '他说"你好"啊' });
  });

  test("结构性引号（key/value 边界）不受影响", () => {
    const clean = '{"a":"b","c":{"d":"e"}}';
    assert.deepEqual(JSON.parse(repairUnescapedQuotes(clean)), { a: "b", c: { d: "e" } });
  });
});

describe("jsonRepair: repairUnquotedStringValues", () => {
  test("修复字符串值缺少起始引号", () => {
    const broken = '{"value_shift":从沉默/被忽视→到专业能力的确认"}';
    assert.throws(() => JSON.parse(broken), /JSON/);
    assert.deepEqual(JSON.parse(repairUnquotedStringValues(broken)), {
      value_shift: "从沉默/被忽视→到专业能力的确认"
    });
  });

  test("数字、布尔值、null、对象和数组不受影响", () => {
    const clean = '{"n":2,"ok":true,"empty":null,"obj":{"a":1},"items":[1,2]}';
    assert.deepEqual(JSON.parse(repairUnquotedStringValues(clean)), JSON.parse(clean));
  });
});

describe("jsonRepair: parseJsonFromClaude", () => {
  test("完整 fence 块直接解析成功", () => {
    const text = "```json\n{\"ok\":true}\n```";
    assert.deepEqual(parseJsonFromClaude(text), { ok: true });
  });

  test("裸 JSON + 未转义引号：两层修复叠加也能救回", () => {
    const text = '说明文字 {"desc":"他说"你好"啊","n":2} 结尾文字';
    assert.deepEqual(parseJsonFromClaude(text), { desc: '他说"你好"啊', n: 2 });
  });

  test("代码块中的字符串值漏掉起始引号：可修复", () => {
    const text = '```json\n{"nodes":{"opening":{"story_title":"林音修复磁带","value_shift":从沉默→到信任"}}}\n```';
    assert.deepEqual(parseJsonFromClaude(text), {
      nodes: {
        opening: {
          story_title: "林音修复磁带",
          value_shift: "从沉默→到信任"
        }
      }
    });
  });

  test("截断且不可救：应 throw", () => {
    const text = "```json\n{\"a\":1,\"b\":\"这段被截断了没有收尾的引号也没有收尾的括号";
    assert.throws(() => parseJsonFromClaude(text), /JSON parse failed/);
  });

  test("完全不是 JSON 的文本：应 throw", () => {
    assert.throws(() => parseJsonFromClaude("这不是json，完全不可用，纯中文说明。"), /JSON parse failed/);
  });
});

// ── generator.js 的 parseJsonFromText：走独立子进程 + 临时 DB，
// 避免 import 链（generator → llm.js → db.js 顶层 restoreLlmConfig() → getDb()）
// 在测试进程里连到真实 data/yuandian.db。db.js 已支持 YUANDIAN_DB_PATH 环境变量覆盖。
describe("generator.js: parseJsonFromText（子进程隔离，防止污染真实库）", () => {
  function runInChildWithTempDb(snippet) {
    const tmpDb = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "yd-jsonrepair-")), "test.db");
    return spawnSync(process.execPath, ["--input-type=module", "-e", snippet], {
      cwd: path.resolve(import.meta.dirname, "../.."),
      env: { ...process.env, YUANDIAN_DB_PATH: tmpDb },
      encoding: "utf8"
    });
  }

  test("完整 fence 块解析成功", () => {
    const r = runInChildWithTempDb(`
      const m = await import('./src/ai/generator.js');
      console.log(JSON.stringify(m.parseJsonFromText('\`\`\`json\\n{"ok":true}\\n\`\`\`')));
    `);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout.trim().split("\n").pop()), { ok: true });
  });

  test("裸 JSON（前后中文说明）解析成功", () => {
    const r = runInChildWithTempDb(`
      const m = await import('./src/ai/generator.js');
      console.log(JSON.stringify(m.parseJsonFromText('说明：{"a":1,"b":"你好"} 结束')));
    `);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout.trim().split("\n").pop()), { a: 1, b: "你好" });
  });

  test("字符串值内未转义引号：修复后解析成功", () => {
    const r = runInChildWithTempDb(`
      const m = await import('./src/ai/generator.js');
      console.log(JSON.stringify(m.parseJsonFromText('{"line":"他说"你好"啊"}')));
    `);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout.trim().split("\n").pop()), { line: '他说"你好"啊' });
  });

  test("截断且不可救：不 throw，回退 {raw: text}", () => {
    const r = runInChildWithTempDb(`
      const m = await import('./src/ai/generator.js');
      const text = '这不是json，完全不可用，纯中文说明。';
      const parsed = m.parseJsonFromText(text);
      console.log(JSON.stringify({ hasRaw: parsed.raw === text }));
    `);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout.trim().split("\n").pop()), { hasRaw: true });
  });
});
