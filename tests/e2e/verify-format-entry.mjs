// 验证：新建入口形态分层（电影长片/连续剧/微短剧）+ step1 形态只读 + 题材徽章不被裁切
import { chromium } from "playwright";

const BASE = "http://localhost:4173";
const out = [];
const ok = (name, pass, extra = "") => {
  out.push(`${pass ? "✓" : "✗"} ${name}${extra ? " — " + extra : ""}`);
  if (!pass) process.exitCode = 1;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => ok("无页面 JS 错误", false, e.message));

await page.goto(BASE, { waitUntil: "networkidle" });

// 1. 打开模式选择器
await page.click('[data-action="open-create-mode-picker"]');
await page.waitForSelector(".mode-picker-panel");

// 2. 形态段存在且恰好 3 个：长片/连续剧/微短剧，无短片无试播集
const fmtCards = await page.locator(".mode-format-card").allTextContents();
ok("形态入口恰好 3 个", fmtCards.length === 3, fmtCards.map((t) => t.trim().slice(0, 4)).join("/"));
const joined = fmtCards.join(" ");
ok("含 长片/连续剧/微短剧", joined.includes("电影长片") && joined.includes("连续剧") && joined.includes("微短剧"));
ok("不含 短片/试播集 入口", !/(^|[^影])短片|试播集/.test(joined));

// 3. 默认选中长片
ok("默认选中电影长片", await page.locator('.mode-format-card.is-active[data-id="feature"]').count() === 1);

// 4. 点微短剧 → 选中态切换，弹窗仍开
await page.click('.mode-format-card[data-id="micro_drama"]');
await page.waitForTimeout(120);
ok("点选微短剧后选中态切换", await page.locator('.mode-format-card.is-active[data-id="micro_drama"]').count() === 1);
ok("弹窗仍打开", await page.locator(".mode-picker-panel").count() === 1);

// 5. 走快速创建 → step1 形态只读 chip = 微短剧，无形态点选卡
await page.click('[data-action="open-quick-creation"]');
await page.waitForSelector("#cf-format-field");
const chip = (await page.locator(".cf-format-chip").textContent() ?? "").trim();
ok("step1 形态只读 chip=微短剧", chip === "微短剧", chip);
ok("step1 无形态点选卡", await page.locator('[data-action="cf-set-format"]').count() === 0);
ok("微短剧形态纪律提示出现", (await page.locator("#cf-format-field").textContent()).includes("黄金三秒"));

// 6. 题材徽章不裁切：选两个题材 → 主导/调味徽章完整位于容器可视区内
await page.click('.cf-genre-card[data-id="悬疑犯罪"]');
await page.waitForTimeout(80);
await page.click('.cf-genre-card[data-id="爱情/都市情感"]');
await page.waitForTimeout(80);
const badges = page.locator(".cf-genre-card__badge");
const n = await badges.count();
ok("徽章渲染（主导+调味）", n >= 2, `count=${n}`);
// 真实裁切判定：徽章矩形是否超出任何 overflow≠visible 的祖先矩形
const clipped = await page.evaluate(() => {
  return [...document.querySelectorAll(".cf-genre-card__badge")].some((el) => {
    const r = el.getBoundingClientRect();
    for (let a = el.parentElement; a; a = a.parentElement) {
      const o = getComputedStyle(a);
      if (o.overflow === "visible" && o.overflowX === "visible" && o.overflowY === "visible") continue;
      const ar = a.getBoundingClientRect();
      if (r.top < ar.top - 0.5 || r.right > ar.right + 0.5 || r.bottom > ar.bottom + 0.5 || r.left < ar.left - 0.5) return true;
    }
    return false;
  });
});
ok("徽章不被任何 overflow 祖先裁切", !clipped);
await page.screenshot({ path: "tests/e2e/_format-entry-step1.png" });

// 7. 回到首页再走一遍：以连续剧形态进入
await page.evaluate(() => localStorage.clear());
await page.goto(BASE, { waitUntil: "networkidle" });
await page.click('[data-action="open-create-mode-picker"]');
await page.waitForSelector(".mode-picker-panel");
await page.click('.mode-format-card[data-id="series"]');
await page.waitForTimeout(100);
await page.click('[data-action="open-quick-creation"]');
await page.waitForSelector(".cf-format-chip");
const chip2 = (await page.locator(".cf-format-chip").textContent() ?? "").trim();
ok("二次进入形态=连续剧", chip2 === "连续剧", chip2);

await browser.close();
console.log(out.join("\n"));
