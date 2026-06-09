// 反机械化处理：把垂直单字 em-dash 瀑布重新合并为正常多字行
// 算法：
//   - 连续的"短行（≤4 字）以 ——\—、或裸字结尾"被识别为"瀑布块"
//   - 把瀑布块合并为一行，去掉中间多余的 em-dash 分隔
//   - 保留原有的场景头（INT./EXT.）、角色名（全大写或括号台词指示）、空行结构
//   - 不动已经是完整句子的行（>4 字 且 不以 — 收尾的）
//
// 这里"短行"具体规则：
//   trim 后长度 ≤ 4 字，并且 (以 — 结尾) 或 (内容是 1-3 个汉字 + 可选标点)
// 合并时：
//   - 把瀑布中的 "X——" / "X—" 末尾的 — 串去掉，把字直接拼起来
//   - 在原本句末（"。""！""？""."）处保留并换行；否则一整块合并成一行
//   - 强制每行最长 60 字（避免过长一行），按"，"或"。"切

import { DatabaseSync } from "node:sqlite";

function isSlugLine(line) {
  return /^(INT\.|EXT\.|EST\.|INT\.\/EXT\.|内景|外景)/i.test(line.trim());
}
function isCueLine(line) {
  // 纯角色名（一般 2-6 个汉字，无标点）或大写英文段落标识（CLOSE-UP, INSERT, CUT TO, FADE）
  const t = line.trim();
  if (!t) return false;
  if (/^(CLOSE-UP|CLOSE UP|INSERT|CUT TO|FADE|MATCH CUT|INTERCUT|MONTAGE|JUMP CUT|SMASH CUT|TIME CUT|CONTINUED|DISSOLVE|FLASHBACK|CUT BACK|MONTAGE|TITLE|END|---|PRELAP)/i.test(t)) return true;
  if (/^[（(].+[)）]$/.test(t)) return true; // 完整括号注（角色情绪）
  // 角色名行：2-6 个汉字，无标点，无 em-dash
  if (/^[一-龥]{2,6}$/.test(t)) return true;
  return false;
}
function isParentheticalOnly(line) {
  const t = line.trim();
  return /^[（(].+[)）]$/.test(t);
}

// 主算法：把整段文本重新归并
function destaccato(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 空行 / 场景头 / 段落标识 / 角色名行 / 完整括号 → 直接保留
    if (!trimmed || isSlugLine(line) || isCueLine(line) || isParentheticalOnly(line)) {
      out.push(line);
      i++;
      continue;
    }

    // 检测是否进入"瀑布块"：连续 ≥3 行短碎片
    let j = i;
    const fragments = [];
    while (j < lines.length) {
      const t = lines[j].trim();
      if (!t) break;
      if (isSlugLine(lines[j]) || isCueLine(lines[j]) || isParentheticalOnly(lines[j])) break;
      // 是否是"短碎片"：长度 ≤ 6 字 且 (以 — / 单字+。 / 数字+。 等结尾)
      // 或更宽松：长度 ≤ 8 字 且 以 — 收尾
      const isFrag =
        (t.length <= 8 && /[—\-]$/.test(t)) ||
        (t.length <= 4 && /^[一-龥]{1,4}[。，、,.]?$/.test(t));
      if (isFrag) {
        fragments.push(t);
        j++;
      } else {
        break;
      }
    }

    if (fragments.length >= 3) {
      // 合并这一串瀑布
      const clean = fragments.map((f) => f.replace(/[—\-]+\s*$/, "").trim());
      let merged = clean.join("");
      merged = merged.replace(/—{2,}/g, "").replace(/—/g, "");
      merged = merged.replace(/。{2,}/g, "。").replace(/\s+/g, "");
      if (merged.length > 60) {
        const parts = merged.split(/(?<=[。！？!?])/);
        for (const p of parts) if (p) out.push(p);
      } else if (merged.length > 0) {
        out.push(merged);
      }
      i = j;
      continue;
    }

    // 第二轮：合并连续"短句"（非瀑布但平均行长低的）
    // 检测：连续 ≥2 行，每行 trim 后 ≤ 12 字，且不是 slug/cue/parenthetical
    let k = i;
    const shortRun = [];
    while (k < lines.length) {
      const t = lines[k].trim();
      if (!t) break;
      if (isSlugLine(lines[k]) || isCueLine(lines[k]) || isParentheticalOnly(lines[k])) break;
      if (t.length > 14) break;
      shortRun.push(t);
      k++;
    }
    if (shortRun.length >= 2) {
      // 合并：去掉行尾的 — 串，把每个片段串到一行，但保留各自标点
      const clean = shortRun.map((f) => f.replace(/[—\-]+\s*$/, "").trim()).filter(Boolean);
      let merged = clean.join("");
      merged = merged.replace(/—{2,}/g, "").replace(/—/g, "");
      merged = merged.replace(/。{2,}/g, "。").replace(/\s+/g, "");
      if (merged.length > 60) {
        const parts = merged.split(/(?<=[。！？!?])/);
        for (const p of parts) if (p) out.push(p);
      } else if (merged.length > 0) {
        out.push(merged);
      }
      i = k;
      continue;
    }

    // 不是瀑布块，原样输出（但若行尾仍有 em-dash 残留并连下一行，下一轮会处理）
    out.push(line);
    i++;
  }

  // 后处理 A：把残留 em-dash 在剩余短行中再合并一遍（递归式扫描）
  let pass2 = out.slice();
  for (let iter = 0; iter < 3; iter++) {
    const next = [];
    let i = 0;
    while (i < pass2.length) {
      const line = pass2[i];
      const t = line.trim();
      if (!t || isSlugLine(line) || isCueLine(line) || isParentheticalOnly(line)) {
        next.push(line);
        i++;
        continue;
      }
      // 收集相邻短行 + 残留 em-dash 行
      let j = i;
      const buf = [];
      while (j < pass2.length) {
        const tt = pass2[j].trim();
        if (!tt) break;
        if (isSlugLine(pass2[j]) || isCueLine(pass2[j]) || isParentheticalOnly(pass2[j])) break;
        if (tt.length > 16) break;
        buf.push(tt);
        j++;
      }
      if (buf.length >= 2) {
        let m = buf.map((s) => s.replace(/[—\-]+\s*$/, "").trim()).join("");
        m = m.replace(/—+/g, "").replace(/\s+/g, "").replace(/。{2,}/g, "。");
        if (m.length > 80) {
          const parts = m.split(/(?<=[。！？!?])/);
          for (const p of parts) if (p) next.push(p);
        } else if (m.length > 0) {
          next.push(m);
        }
        i = j;
      } else {
        next.push(line);
        i++;
      }
    }
    pass2 = next;
  }

  // 后处理 B：合并"角色名 + (parenthetical) + 台词"为单行剧本式
  // 形如：
  //   萧景珩
  //   （极轻）
  //   昭仪。朕请你做一件事。
  // → 萧景珩（极轻）：昭仪。朕请你做一件事。
  const pass3 = [];
  let i2 = 0;
  while (i2 < pass2.length) {
    const cur = pass2[i2];
    const t = cur.trim();
    // 角色名：2-6 字汉字纯净
    if (/^[一-龥]{2,6}$/.test(t)) {
      let parens = [];
      let n = i2 + 1;
      // 吸收紧随的 parenthetical 行
      while (n < pass2.length && /^[（(].+[)）]$/.test(pass2[n].trim())) {
        parens.push(pass2[n].trim());
        n++;
      }
      // 吸收紧随的台词行（直到空行 / 角色名 / slug / INSERT 等）
      const dialogue = [];
      while (n < pass2.length) {
        const tt = pass2[n].trim();
        if (!tt) break;
        if (isSlugLine(pass2[n])) break;
        if (/^[一-龥]{2,6}$/.test(tt)) break;
        if (/^(CLOSE-UP|CLOSE UP|INSERT|CUT TO|FADE|MATCH CUT|INTERCUT|MONTAGE|JUMP CUT|SMASH CUT|TIME CUT|CONTINUED|DISSOLVE|FLASHBACK|CUT BACK|TITLE|END|---|PRELAP)/i.test(tt)) break;
        // 内嵌的 parenthetical 直接保留并入
        if (/^[（(].+[)）]$/.test(tt)) {
          dialogue.push(tt);
        } else {
          dialogue.push(tt);
        }
        n++;
      }
      if (dialogue.length > 0) {
        // 合并：把内嵌的 parenthetical（停一息 等）去掉换行后留在文本里
        const text = dialogue.join("").replace(/\s+/g, "");
        const parenPart = parens.length ? parens.join("") : "";
        pass3.push(`${t}${parenPart}：${text}`);
        i2 = n;
        continue;
      }
    }
    pass3.push(cur);
    i2++;
  }

  // 后处理 C：全局清理 em-dash 残留
  // 散文行（非 slug、非 INSERT 标签行）里的 em-dash 都视为机械化痕迹，去掉
  // 保留行：以 INT./EXT./EST. 开头、CLOSE-UP/INSERT/CUT TO 等技术标识行
  const pass4 = pass3.map((l) => {
    const t = l.trim();
    if (!t) return l;
    if (isSlugLine(l)) return l;
    if (/^(CLOSE-UP|CLOSE UP|INSERT|CUT TO|FADE|MATCH CUT|INTERCUT|MONTAGE|JUMP CUT|SMASH CUT|TIME CUT|CONTINUED|DISSOLVE|FLASHBACK|CUT BACK|TITLE|END|PRELAP)/i.test(t)) return l;
    // 替换连续 em-dash 为标点（一处长破折号 → 删除）
    return l.replace(/—{2,}/g, "").replace(/—/g, "").replace(/�/g, "");
  });

  // 后处理 D：合并连续两个空行
  const out2 = [];
  let prevBlank = false;
  for (const l of pass4) {
    const blank = !l.trim();
    if (blank && prevBlank) continue;
    out2.push(l);
    prevBlank = blank;
  }
  return out2.join("\n");
}

// 自检：在写库前 lint
function lintScene(script) {
  if (!script || !script.trim()) return { issues: ["EMPTY"], avgLen: 0, maxRun: 0 };
  const lines = script.split(/\r?\n/);
  let run = 0; let maxRun = 0;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const tooShort = /^[^。.!?]{1,4}—{1,2}\s*$/.test(t) || (/^[一-龥]{1,3}。?$/.test(t) && i + 1 < lines.length && /^[一-龥]{1,4}—/.test(lines[i + 1].trim()));
    if (tooShort) { run++; if (run > maxRun) maxRun = run; }
    else run = 0;
  }
  const emCount = (script.match(/——/g) || []).length;
  const emDensity = (emCount * 100) / script.length;
  const nonBlank = lines.map((l) => l.trim()).filter(Boolean);
  const avgLen = nonBlank.reduce((s, l) => s + l.length, 0) / Math.max(nonBlank.length, 1);
  const issues = [];
  if (maxRun >= 6) issues.push(`STACCATO(${maxRun})`);
  if (emDensity > 12) issues.push(`EMDASH(${emDensity.toFixed(1)})`);
  if (avgLen < 8) issues.push(`AVG(${avgLen.toFixed(1)})`);
  return { issues, avgLen, maxRun, emDensity };
}

// 处理一个项目
const DB_PATH = "./data/yuandian.db";
const pid = process.argv[2];
const dryRun = process.argv[3] === "--dry";

if (!pid) {
  console.error("usage: node destaccato.mjs <project_id> [--dry]");
  process.exit(2);
}

const db = new DatabaseSync(DB_PATH);

async function run() {
  const res = await fetch(`http://127.0.0.1:4173/api/projects/${pid}`);
  if (!res.ok) { console.error("GET fail", res.status); process.exit(1); }
  const { project } = await res.json();
  const cards = project.story_bible.scene_cards;
  const wb = (project.scene_workbench && project.scene_workbench.scenes) || [];
  const wbMap = new Map(wb.map((s) => [s.id, s]));

  let fixed = 0;
  let stillBad = 0;
  for (const c of cards) {
    const before = c.script_full || "";
    const after = destaccato(before);
    const beforeL = lintScene(before);
    const afterL = lintScene(after);
    if (beforeL.issues.length > 0 || afterL.issues.length > 0 || before !== after) {
      console.log(`#${c.order_index} ${c.title}`);
      console.log(`   before: ${beforeL.issues.join(",") || "ok"}  len=${before.length} avg=${beforeL.avgLen.toFixed(1)} maxRun=${beforeL.maxRun}`);
      console.log(`   after:  ${afterL.issues.join(",") || "ok"}  len=${after.length} avg=${afterL.avgLen.toFixed(1)} maxRun=${afterL.maxRun}`);
    }
    if (before !== after) fixed++;
    if (afterL.issues.length > 0) stillBad++;
    c.script_full = after;
    const w = wbMap.get(c.id);
    if (w) w.script_full = after;
  }

  console.log(`\n修复 ${fixed} 场 | 仍坏 ${stillBad} 场`);

  if (dryRun) {
    console.log("DRY RUN — not writing");
    return;
  }

  const put = await fetch(`http://127.0.0.1:4173/api/projects/${pid}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ project }),
  });
  if (!put.ok) { console.error("PUT fail", put.status, await put.text()); process.exit(1); }
  console.log("PUT ok");
}

run().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
