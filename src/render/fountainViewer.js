// Fountain 解析与排版渲染。
// 输入：Fountain 文本（含 title page + scene heading + action + character + dialogue + ...）
// 输出：parseFountain → 结构化 blocks；renderFountainHtml → 完整 HTML（带剧本标准排版 CSS）。
//
// 兼容：英文 INT./EXT./EST. + 中文 内景/外景；中文角色名（非全大写）通过"短行 + 上空行 + 下接 (/（/对白"启发式识别。
// 支持：title page (Title:/Author:/Draft date:/Contact:/Source:/Notes:/Copyright:)、scene heading、
//        action、character、parenthetical、dialogue、dual dialogue (^)、transition、centered (> <)、
//        page break (===)、section (#/##/###)、synopsis (=)、notes ([[ ]])、boneyard (/* */)、
//        lyrics (~)、forced lines (.heading / @character / !action / >transition)、
//        inline emphasis (**bold** *italic* _underline_)。

const SCENE_PREFIX_RE = /^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT\.?|EXT\.?|EST\.?|I\/E\.?|内景\/外景|外景\/内景|内景|外景)[\s. ]/i;
const TRANSITION_RE = /^(?:CUT TO|FADE (?:IN|OUT)|DISSOLVE TO|MATCH CUT TO|SMASH CUT TO|JUMP CUT TO|淡出|淡入|切至|溶解至|镜头切至|黑场)[\s:：]?.{0,12}[。.!?]?$/i;
const TITLE_KEY_RE = /^([A-Za-z][\w \-]*?):\s*(.*)$/;
const SHOT_HEADING_RE = /^(?:CLOSE-?UP|EXTREME CLOSE-?UP|WIDE SHOT|MEDIUM SHOT|TWO SHOT|OVER THE SHOULDER|POV|INSERT|MONTAGE|FLASHBACK|FLASH BACK|BEAT BREAK|END (?:OF )?FLASHBACK|TITLE CARD|CHYRON|SUPER|SUBTITLE|特写|大特写|全景|中景|远景|插入|蒙太奇|闪回|字幕|画外音?)\b[^。.!?]{0,60}[:：]?$/i;

const HEAD_KEYS_CN = {
  Title: "片名",
  Author: "编剧",
  Authors: "编剧",
  "Draft date": "稿日",
  Contact: "联系方式",
  Copyright: "版权",
  Source: "来源",
  Notes: "备注",
  Credit: "署名"
};

const ESCAPE_HTML = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ESCAPE_HTML[c]); }

function isBlank(line) { return /^\s*$/.test(line); }

function stripBoneyard(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "");
}

function inlineFormat(s) {
  // 转义后再注入 emphasis；注意先做最长（***）以免被 ** 抢走。
  let out = esc(s);
  out = out.replace(/\*\*\*([^*\n]+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  out = out.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");
  out = out.replace(/_([^_\n]+?)_/g, "<u>$1</u>");
  return out;
}

function looksLikeCharacter(line, prevBlank, nextLine) {
  // 强制：@开头视为角色名（去掉 @ 后渲染）。
  if (line.startsWith("@")) return true;
  if (!prevBlank) return false;
  if (line.length > 30) return false;
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^[\(（\[【]/.test(trimmed)) return false; // 括号开头 → 不是角色
  if (/[。，,.；;！!？?:：、]/.test(trimmed)) return false; // 含句末标点或冒号 → 不是角色（防 CLOSE-UP X: / 时间： 这类 shot heading 被误判）
  if (/^["'"'「『]/.test(trimmed)) return false; // 引号开头 → 是台词/标题，不是角色名
  if (/^\d/.test(trimmed)) return false;
  // 下一行必须存在且非空（对白或括号）。
  if (nextLine == null || isBlank(nextLine)) return false;
  // 全英文规则：必须 ALL CAPS（Fountain 标准）。
  if (/^[A-Z0-9 .,'\-()\^]+$/.test(trimmed)) {
    // 标准 Fountain：character 行可带 (V.O.) (O.S.) (CONT'D) 等。
    return /[A-Z]/.test(trimmed);
  }
  // 含中文：把"陆青棠""陆青棠（35）""陆青棠 (V.O.)""沈澜 / 韦景行"都识别为角色。
  if (/[一-龥]/.test(trimmed)) return true;
  return false;
}

export function parseFountain(rawText) {
  const text = stripBoneyard(String(rawText || ""));
  const lines = text.replace(/\r\n?/g, "\n").split("\n");

  // —— Title page：连续 Key: Value 直到首个空行 ——
  const titlePage = {};
  let i = 0;
  // 仅当首行是 Key: 才进入 title-page 解析。
  if (lines.length && TITLE_KEY_RE.test(lines[0])) {
    let curKey = null;
    while (i < lines.length && !isBlank(lines[i])) {
      const m = lines[i].match(TITLE_KEY_RE);
      if (m) {
        curKey = m[1].trim();
        titlePage[curKey] = m[2];
      } else if (curKey && /^\s+\S/.test(lines[i])) {
        titlePage[curKey] = (titlePage[curKey] ? titlePage[curKey] + "\n" : "") + lines[i].trim();
      } else {
        break;
      }
      i++;
    }
    while (i < lines.length && isBlank(lines[i])) i++;
  }

  // —— 正文 ——
  const blocks = [];
  let prevBlank = true;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (isBlank(line)) {
      blocks.push({ type: "blank" });
      prevBlank = true;
      i++;
      continue;
    }

    // === 分页符
    if (/^={3,}\s*$/.test(trimmed)) {
      blocks.push({ type: "page_break" });
      i++; prevBlank = true; continue;
    }

    // # / ## / ### Section
    const sec = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (sec) {
      blocks.push({ type: "section", level: sec[1].length, text: sec[2] });
      i++; prevBlank = false; continue;
    }

    // = 单行 synopsis
    if (/^=\s+/.test(trimmed) && !/^={3,}/.test(trimmed)) {
      blocks.push({ type: "synopsis", text: trimmed.replace(/^=\s+/, "") });
      i++; prevBlank = false; continue;
    }

    // [[ note ]]
    if (/^\[\[.*\]\]\s*$/.test(trimmed)) {
      blocks.push({ type: "note", text: trimmed.replace(/^\[\[\s*|\s*\]\]$/g, "") });
      i++; prevBlank = false; continue;
    }

    // ~ lyrics
    if (trimmed.startsWith("~")) {
      blocks.push({ type: "lyric", text: trimmed.replace(/^~\s?/, "") });
      i++; prevBlank = false; continue;
    }

    // > centered <
    const centered = trimmed.match(/^>\s*(.+?)\s*<\s*$/);
    if (centered) {
      blocks.push({ type: "centered", text: centered[1] });
      i++; prevBlank = false; continue;
    }

    // > transition (强制) — 与 centered 互斥（centered 同时有 < 收尾）。
    if (trimmed.startsWith(">") && !trimmed.endsWith("<")) {
      blocks.push({ type: "transition", text: trimmed.replace(/^>\s*/, "") });
      i++; prevBlank = false; continue;
    }

    // ! 强制 action
    if (trimmed.startsWith("!")) {
      blocks.push({ type: "action", text: trimmed.slice(1) });
      i++; prevBlank = false; continue;
    }

    // . 强制 scene heading（点后必须紧接非点字符）
    if (/^\.[^.]/.test(trimmed)) {
      blocks.push({ type: "scene", text: trimmed.slice(1) });
      i++; prevBlank = false; continue;
    }

    // 普通 scene heading
    if (SCENE_PREFIX_RE.test(trimmed)) {
      blocks.push({ type: "scene", text: trimmed });
      i++; prevBlank = false; continue;
    }

    // Transition（启发式：全大写 + 以 TO: 结尾 或 含中文转场词，且独占一行）
    if (TRANSITION_RE.test(trimmed)) {
      blocks.push({ type: "transition", text: trimmed });
      i++; prevBlank = false; continue;
    }

    // Shot heading（CLOSE-UP / INSERT / MONTAGE / 闪回 / 字幕 等镜头/字幕标识）
    if (SHOT_HEADING_RE.test(trimmed)) {
      blocks.push({ type: "shot", text: trimmed });
      i++; prevBlank = false; continue;
    }

    // Character + 后续对白 / 括号
    const nextLine = lines[i + 1] ?? null;
    if (looksLikeCharacter(trimmed, prevBlank, nextLine)) {
      // 处理 dual dialogue 标记 ^（行尾）
      let nameLine = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
      let dual = false;
      if (nameLine.endsWith("^")) { dual = true; nameLine = nameLine.slice(0, -1).trim(); }
      const chunks = [];
      i++;
      while (i < lines.length && !isBlank(lines[i])) {
        const dl = lines[i].trimEnd();
        const dt = dl.trim();
        if (/^[\(（].*[\)）]\s*$/.test(dt)) {
          chunks.push({ kind: "paren", text: dt.replace(/^[\(（]|[\)）]$/g, "") });
        } else {
          chunks.push({ kind: "line", text: dt });
        }
        i++;
      }
      blocks.push({ type: "dialogue", character: nameLine, dual, chunks });
      prevBlank = false;
      continue;
    }

    // 默认：action（保留原换行）
    blocks.push({ type: "action", text: trimmed });
    i++; prevBlank = false;
  }

  return { titlePage, blocks };
}

function renderTitlePage(tp) {
  if (!tp || Object.keys(tp).length === 0) return "";
  const title = tp.Title || tp.title || "";
  const credit = tp.Credit || tp.credit || "编剧";
  const author = tp.Author || tp.Authors || tp.author || "";
  const source = tp.Source || tp.source || "";
  const date = tp["Draft date"] || tp.DraftDate || tp.Date || "";
  const contact = tp.Contact || tp.contact || "";
  return `
    <section class="fv-title-page">
      <div class="fv-tp-center">
        <h1 class="fv-tp-title">${inlineFormat(title).replace(/\n/g, "<br>")}</h1>
        ${credit ? `<div class="fv-tp-credit">${esc(credit)}</div>` : ""}
        ${author ? `<div class="fv-tp-author">${inlineFormat(author).replace(/\n/g, "<br>")}</div>` : ""}
        ${source ? `<div class="fv-tp-source">${inlineFormat(source).replace(/\n/g, "<br>")}</div>` : ""}
      </div>
      <div class="fv-tp-bottom-left">
        ${date ? `<div>${esc(HEAD_KEYS_CN["Draft date"])}: ${esc(date)}</div>` : ""}
      </div>
      <div class="fv-tp-bottom-right">
        ${contact ? `<div>${inlineFormat(contact).replace(/\n/g, "<br>")}</div>` : ""}
      </div>
    </section>
  `;
}

function renderBlock(b) {
  switch (b.type) {
    case "blank": return "";
    case "page_break": return `<hr class="fv-page-break" />`;
    case "section": return `<h${b.level + 1} class="fv-section fv-section--l${b.level}">${inlineFormat(b.text)}</h${b.level + 1}>`;
    case "synopsis": return `<p class="fv-synopsis">${inlineFormat(b.text)}</p>`;
    case "note": return `<aside class="fv-note">${inlineFormat(b.text)}</aside>`;
    case "lyric": return `<p class="fv-lyric">${inlineFormat(b.text)}</p>`;
    case "centered": return `<p class="fv-centered">${inlineFormat(b.text)}</p>`;
    case "scene": return `<h3 class="fv-scene">${inlineFormat(b.text)}</h3>`;
    case "shot": return `<p class="fv-shot">${inlineFormat(b.text)}</p>`;
    case "transition": return `<p class="fv-transition">${inlineFormat(b.text)}</p>`;
    case "action": return `<p class="fv-action">${inlineFormat(b.text)}</p>`;
    case "dialogue": {
      const inner = b.chunks.map((c) => c.kind === "paren"
        ? `<span class="fv-paren">（${inlineFormat(c.text)}）</span>`
        : `<span class="fv-line">${inlineFormat(c.text)}</span>`
      ).join("");
      const cls = `fv-dialogue${b.dual ? " fv-dialogue--dual" : ""}`;
      return `<div class="${cls}"><div class="fv-character">${esc(b.character)}</div><div class="fv-speech">${inner}</div></div>`;
    }
    default: return "";
  }
}

const FV_CSS = `
  :root {
    --fv-bg: #f4ede0;
    --fv-paper: #fbf8f1;
    --fv-ink: #1f1d18;
    --fv-muted: #6b6256;
    --fv-rule: #e7dcc4;
    --fv-accent: #8a5a2b;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--fv-bg); color: var(--fv-ink);
    font-family: "Courier Prime", "Courier New", "FangSong", "STFangsong", "FangSong_GB2312", "华文仿宋", "仿宋", "Source Han Serif SC", "Noto Serif CJK SC", serif;
    font-size: 13pt; line-height: 1.7; font-weight: 400; -webkit-font-smoothing: antialiased; }
  p, div, h1, h2, h3, h4, h5, h6 { font-weight: 400; }
  .fv-toolbar {
    position: sticky; top: 0; z-index: 10; backdrop-filter: blur(8px);
    background: rgba(244,237,224,0.92); border-bottom: 1px solid var(--fv-rule);
    padding: 10px 24px; display: flex; gap: 16px; align-items: center; font-size: 13px;
    font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  }
  .fv-toolbar button {
    border: 1px solid var(--fv-rule); background: var(--fv-paper); color: var(--fv-ink);
    padding: 6px 12px; border-radius: 6px; font: inherit; cursor: pointer;
  }
  .fv-toolbar button:hover { border-color: var(--fv-accent); color: var(--fv-accent); }
  .fv-meta { margin-left: auto; color: var(--fv-muted); }

  .fv-pages { padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 24px; }
  .fv-page {
    background: var(--fv-paper); color: var(--fv-ink);
    width: 8.5in; padding: 1in 1in 1in 1.5in;
    box-shadow: 0 6px 24px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05);
    border-radius: 2px;
  }

  .fv-title-page { min-height: 9in; display: grid;
    grid-template-rows: 1fr auto; grid-template-columns: 1fr 1fr;
    grid-template-areas: "center center" "bl br"; gap: 12px; }
  .fv-tp-center { grid-area: center; align-self: center; text-align: center; }
  .fv-tp-title { font-size: 22pt; letter-spacing: 0.05em; margin: 0 0 1em 0; text-transform: none; }
  .fv-tp-credit { color: var(--fv-muted); margin-bottom: 0.5em; }
  .fv-tp-author { font-size: 14pt; }
  .fv-tp-source { color: var(--fv-muted); margin-top: 1em; font-style: italic; }
  .fv-tp-bottom-left { grid-area: bl; align-self: end; color: var(--fv-muted); }
  .fv-tp-bottom-right { grid-area: br; align-self: end; text-align: right; color: var(--fv-muted); }

  .fv-scene { margin: 1.6em 0 0.6em; font-size: 13pt; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.02em; padding-bottom: 0.25em; border-bottom: 1px solid var(--fv-rule); }
  .fv-action { margin: 0.6em 0; white-space: pre-wrap; font-weight: 400; }
  .fv-dialogue { margin: 0.9em 0; }
  .fv-character { text-align: center; margin: 0; padding: 0; font-weight: 600;
    letter-spacing: 0.12em; max-width: 5in; margin-left: auto; margin-right: auto; }
  .fv-speech { max-width: 4.6in; margin: 0 auto; }
  .fv-speech .fv-line { display: block; }
  .fv-speech .fv-paren { display: block; text-align: center; color: var(--fv-muted);
    font-style: italic; margin: 0.1em 0; }
  .fv-shot { text-align: center; text-transform: uppercase; letter-spacing: 0.08em;
    font-weight: 600; margin: 1em 0 0.4em; color: var(--fv-ink); }
  .fv-dialogue--dual { display: inline-block; width: 48%; vertical-align: top; }

  .fv-transition { text-align: right; text-transform: uppercase; margin: 1em 0; font-weight: 600;
    letter-spacing: 0.04em; color: var(--fv-accent); }
  .fv-centered { text-align: center; margin: 1em 0; }
  .fv-section { margin: 1.4em 0 0.6em; font-family: -apple-system, "PingFang SC", sans-serif; color: var(--fv-accent); }
  .fv-section--l1 { font-size: 16pt; border-bottom: 2px solid var(--fv-accent); padding-bottom: 0.2em; }
  .fv-section--l2 { font-size: 14pt; }
  .fv-section--l3 { font-size: 12pt; }
  .fv-synopsis { color: var(--fv-muted); font-style: italic; border-left: 3px solid var(--fv-rule); padding-left: 12px; margin: 0.8em 0; }
  .fv-note { background: #fff7d6; border-left: 3px solid #d8b450; padding: 8px 12px; margin: 0.8em 0;
    font-family: -apple-system, "PingFang SC", sans-serif; font-size: 11pt; color: #6b5a1f; }
  .fv-lyric { font-style: italic; padding-left: 1.5in; }
  .fv-page-break { border: none; border-top: 1px dashed var(--fv-rule); margin: 1.5em 0; }

  @media print {
    body { background: white; }
    .fv-toolbar { display: none; }
    .fv-pages { padding: 0; gap: 0; }
    .fv-page { box-shadow: none; border-radius: 0; page-break-after: always; }
    .fv-page:last-child { page-break-after: auto; }
  }
`;

/**
 * 把 Fountain 文本渲染为完整 HTML 文档字符串。
 * @param {string} text Fountain 源
 * @param {{ title?: string, showRaw?: boolean }} [opts]
 * @returns {string}
 */
export function renderFountainHtml(text, opts = {}) {
  const { titlePage, blocks } = parseFountain(text);
  const docTitle = opts.title || titlePage.Title || titlePage.title || "剧本预览";

  const bodyBlocks = blocks.map(renderBlock).filter(Boolean).join("\n");
  const sceneCount = blocks.filter((b) => b.type === "scene").length;
  const wordCount = text.replace(/\s+/g, "").length;
  const pageEstimate = Math.max(1, Math.ceil(wordCount / 250));

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>${esc(docTitle)}</title>
<style>${FV_CSS}</style>
</head>
<body>
  <div class="fv-toolbar">
    <strong>${esc(docTitle)}</strong>
    <button type="button" onclick="window.print()">打印 / 导出 PDF</button>
    <button type="button" id="fv-toggle-raw">查看 .fountain 源</button>
    <span class="fv-meta">场景 ${sceneCount} · 约 ${wordCount} 字 · 估算 ${pageEstimate} 页</span>
  </div>
  <div class="fv-pages">
    <article class="fv-page">${renderTitlePage(titlePage)}</article>
    <article class="fv-page">${bodyBlocks}</article>
  </div>
  <pre id="fv-raw" style="display:none; padding: 24px; background:#1f1d18; color:#e7dcc4; white-space: pre-wrap; font-family: 'Courier New', monospace;">${esc(text)}</pre>
  <script>
    document.getElementById('fv-toggle-raw').addEventListener('click', () => {
      const r = document.getElementById('fv-raw');
      const p = document.querySelector('.fv-pages');
      const show = r.style.display === 'none';
      r.style.display = show ? 'block' : 'none';
      p.style.display = show ? 'none' : 'flex';
    });
  </script>
</body>
</html>`;
}

/**
 * 打开新窗口展示 Fountain 排版。
 * @param {string} text Fountain 源
 * @param {string} [title] 窗口标题
 * @returns {Window | null}
 */
export function openFountainPreview(text, title) {
  const w = window.open("", "_blank", "width=980,height=1000");
  if (!w) return null;
  w.document.open();
  w.document.write(renderFountainHtml(text, { title }));
  w.document.close();
  return w;
}
