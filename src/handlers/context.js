// 延迟绑定的控制器上下文。
//
// app.js 里 render()/markDirty()/normalizeProject() 等核心编排函数与入口深度纠缠
// （io ↔ render ↔ normalize 互相调用），无法干净外提。外提出去的事件 handler 模块
// 需要调用它们，但 handler 在「用户点击时」才执行——那时 app.js 的 bootstrap 早已
// 运行、ctx 早已注入。因此用一个稳定的对象引用做晚绑定：handler 模块 import { ctx }
// 拿到引用，在调用时刻读 ctx.render 等；app.js 在启动时 initContext(...) 填充实现。
export const ctx = {};

export function initContext(impl) {
  Object.assign(ctx, impl);
}
