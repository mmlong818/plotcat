import { spawn } from "node:child_process";

// Windows 上全局 npm 安装的 claude 是 claude.cmd：
// spawn("claude") 直接 ENOENT，而 Node ≥18.20 出于安全考虑也禁止无 shell 直接
// spawn .cmd（EINVAL），必须走 shell。参数全部是固定 flag、prompt 走 stdin，无注入面。
export function spawnClaude(args = []) {
  if (process.platform === "win32") {
    return spawn("claude.cmd", args, { stdio: ["pipe", "pipe", "pipe"], shell: true });
  }
  return spawn("claude", args, { stdio: ["pipe", "pipe", "pipe"] });
}
