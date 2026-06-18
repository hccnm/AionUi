# SaaS Web Runtime Optimization Plan

## 目标

在保持当前 SaaS Web 功能可用的前提下，收紧启动关键路径、减少不必要请求、修复导航样式不对称，并清理桌面残留进入 Web 运行面的污染。

## 范围

- 运行时入口与布局
- Guid 首页与共享数据请求
- 侧栏与设置导航样式
- 构建隔离中的关键迁移债务

## 风险

- 误删桥接能力会直接影响当前可用功能
- 请求延后可能影响首次进入特定页面的数据完整性
- 依赖隔离可能暴露缺失依赖

## 执行步骤

1. 入口纯化
   - 清理 `main.tsx`、`Layout.tsx` 中默认执行的桌面副作用
   - 保留 Web 运行必须的 backend bridge
   - 验证基础路由可正常进入

2. 请求预算收敛
   - 移除非关键首屏预取
   - 将 cron、skills、MCP catalog 等请求推迟到真正需要的页面或交互
   - 对共享数据改为复用现有 SWR key 或单例缓存

3. 样式对齐
   - 修正设置侧栏分组标题、项目 padding、选中态容器节奏
   - 修正对话侧栏分割线、标题和列表节奏

4. 性能收尾
   - 清理重复监听、无意义 effect 和常驻数据联动
   - 评估 `vite.config.ts` 的依赖兜底是否可收紧，至少记录真实债务

## 验证

- `npm run typecheck`
- `npm run build`
- 必要时补充代码路径级自查说明

## 执行结果

1. 入口纯化：已完成
2. 请求预算收敛：已完成首轮
   - 已把 `assistants` 统一到单一共享 SWR key
   - 已把 `assistants` / `agents` 启动 catalog 改为共享 fetcher + 关闭 focus/reconnect 自动重刷
   - 已把 `usePresetAssistantInfo()` 改为按需拉取，普通会话不再额外触发 `acp-adapters`
   - 已把 cron 首屏全量列表改为复用缓存
   - 已把 WebSocket 收敛到共享单例，`ws-token` 不再重复获取
   - 已把 `main.tsx` 的 client settings 双初始化源去掉
   - 已把 MCP catalog 对 client settings 的读取改为复用 `configService`
   - 浏览器实测已确认 `guid` 首屏中的 `agents` / `assistants` / `providers` / `remote-agents` 为单次请求
3. 样式对齐：已完成并通过浏览器实页复核
   - `guid` 会话项与 `settings` 侧栏项的 icon/text 几何中心已对齐
4. 性能收尾：已完成关键路径清理，`typecheck` 仍受仓库既有历史错误影响，构建隔离与大 chunk 仍保留后续空间
