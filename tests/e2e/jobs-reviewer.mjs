// 「乔布斯旁观者」— 苛刻 UX 审视器
//
// 每个 stage 完成后调用 jobsReview(page, context)：
//   1) 截屏当前页面 + 抽取关键 DOM 文本
//   2) 调 claude CLI 用乔布斯口吻挑刺
//   3) 返回 findings 数组 [{severity, where, issue, fix_hint}]
//
// 调用方按 severity 决定：critical → 立即停 + 修；high → 累计 + 继续；medium → 仅记录

import { spawn } from 'node:child_process';

const SYSTEM_PROMPT = `你是史蒂夫·乔布斯，刚走到工程师工位旁，旁观他在用一款叫「原点编剧系统」的编剧工具。
你的视角：
- 极致苛刻，不接受任何不合理的设计。
- 看到细节就会指出来：颜色、间距、字号、文案、流程、信息密度。
- 你最讨厌的事：让用户做计算机应该做的事；让用户重复输入同样的信息；让用户面对不属于他的术语；用户不知道现在在哪里、刚做了什么、下一步是什么。
- 你不提"建议加 XXX"这种功能请求，只指出"这里就是错的"或"这里没必要"。

输出严格 JSON：
{
  "findings": [
    {
      "severity": "critical" | "high" | "medium",
      "where": "具体位置（页面/控件/字段名）",
      "issue": "一句话点穿不合理在哪",
      "fix_hint": "如何修（具体到改什么）"
    }
  ]
}
最多 5 条。critical 限 1 条（这一条会阻断流程）。

严重度判据：
- critical：完全无法继续用、数据错误、逻辑死循环、违反用户直觉到困惑
- high：用了别扭、看不懂、需要猜
- medium：风格/文案/间距类小问题`;

function callClaude(prompt, timeoutMs = 90_000) {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['-p', '--output-format', 'text'], { stdio: ['pipe', 'pipe', 'pipe'] });
    proc.stdout.setEncoding('utf8');
    proc.stderr.setEncoding('utf8');
    let out = '', err = '';
    const t = setTimeout(() => { proc.kill(); reject(new Error('claude timeout')); }, timeoutMs);
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', d => err += d);
    proc.on('close', code => {
      clearTimeout(t);
      if (code !== 0) reject(new Error(`claude exit ${code}: ${err.slice(0, 200)}`));
      else resolve(out);
    });
    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

function parseJobs(text) {
  // 提取 JSON
  const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!match) return { findings: [], raw: text.slice(0, 500) };
  try {
    return JSON.parse(match[1]);
  } catch (e) {
    return { findings: [], raw: text.slice(0, 500), parseError: e.message };
  }
}

/**
 * 让乔布斯审视当前页面。
 * @param {Page} page Playwright page
 * @param {Object} ctx { stage, story, mode, justDid }
 * @returns {Promise<{findings, raw}>}
 */
export async function jobsReview(page, ctx) {
  // 1. 抽取页面可见文本（只看实际渲染给用户的元素，跳过 hidden / display:none）
  const snapshot = await page.evaluate(() => {
    const isVisible = (el) => {
      if (!el) return false;
      if (el.hidden) return false;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const s = window.getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
      // 再沿祖先链检查是否有 hidden 父
      let n = el.parentElement;
      while (n) {
        if (n.hidden) return false;
        const cs = window.getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        n = n.parentElement;
      }
      return true;
    };
    const parts = [];
    const eyebrow = document.querySelector('#hero-eyebrow');
    if (eyebrow && isVisible(eyebrow)) parts.push(`[HERO eyebrow]: ${eyebrow.textContent?.trim()}`);
    const stepperNav = document.querySelector('#stepper-nav');
    if (stepperNav && isVisible(stepperNav)) {
      const steps = Array.from(document.querySelectorAll('#stepper-nav .step-button')).map(b => {
        const label = b.querySelector('.step-button__label')?.textContent?.trim();
        const active = b.classList.contains('is-active');
        const done = b.classList.contains('is-completed');
        return active ? `*${label}*` : (done ? `✓${label}` : label);
      });
      if (steps.length) parts.push(`[Steps]: ${steps.join(' / ')}`);
    }
    // 主区可见文本
    const main = Array.from(document.querySelectorAll('main > section')).find(s => isVisible(s));
    const text = main ? main.innerText : (document.body.innerText || '').slice(0, 4000);
    parts.push(`[Page text]:\n${text.slice(0, 3500)}`);
    return parts.join('\n');
  });

  // 2. 构造 prompt
  const user = `${SYSTEM_PROMPT}

---
当前任务上下文：
  · 故事：${ctx.story}
  · 创作模式：${ctx.mode}
  · 当前 stage：${ctx.stage}
  · 用户刚做了：${ctx.justDid}

---
你看到的当前页面：

${snapshot}

---
请按 JSON schema 输出 3-5 条最不合理的点评。`;

  // 3. 调 claude
  let raw;
  try {
    raw = await callClaude(user);
  } catch (e) {
    return { findings: [], error: e.message };
  }
  const parsed = parseJobs(raw);
  return parsed;
}
