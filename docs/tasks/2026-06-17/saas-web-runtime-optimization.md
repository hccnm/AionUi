# SaaS Web Runtime Optimization Task

## 当前状态

- 当前工作树已重新恢复 SaaS Web 需要保留的几类优化，不再是之前误回退后的“只剩 `backend.ts` 修复”状态
- 本次恢复以“不影响当前 Web 已可用功能”为前提，只收紧关键路径污染、重复请求和无意义桌面残留

## 目标

在不破坏当前 SaaS Web 已正常工作的前提下，完成以下优化：

- 清理进入 Web 关键路径的桌面残留代码
- 收敛首页与设置等入口的非必要请求
- 修复侧栏与设置导航的不对称样式
- 降低启动和交互过程中的卡顿与掉帧感

## 范围

- `src/aionui/renderer/main.tsx`
- `src/aionui/renderer/components/layout/**`
- `src/aionui/renderer/pages/guid/**`
- `src/aionui/renderer/pages/settings/**`
- `src/aionui/renderer/pages/cron/**`
- `src/aionui/common/adapter/**`
- `vite.config.ts`

## 边界

- 不改后端 API 语义
- 不主动删当前已验证可用的 SaaS 业务能力
- 不做无关重构
- 删除文件前需确认该文件不在当前 SaaS Web 关键路径内

## 当前判断

- `main.tsx` 存在不应默认执行的首屏预取与修复副作用
- `Layout.tsx` 存在桌面专属监听与调试逻辑进入 Web 布局挂载链
- `Sider/index.tsx` 默认挂载 `useAllCronJobs()`，会把定时任务请求带入所有页面
- `GuidPage.tsx` 首屏同时请求 skills 与 MCP catalog，需区分是否真属关键路径
- `vite.config.ts` 仍依赖 `AionUi/node_modules` 兜底，属于迁移债务

## 验证要求

- `npm run typecheck`
- `npm run build`
- 记录关键请求路径变化与剩余风险

## 已执行

- 清理 `main.tsx` 中 Web 无关的 Electron Sentry、安装失败页、启动期 cron 修复与 agents 预取阻塞
- 清理 `Layout.tsx` 中通知点击、tray、主进程日志、DevTools 手势、更新弹窗等 Web 无关挂载逻辑
- 为 cron 全量列表建立共享加载缓存，避免侧栏与历史区重复请求同一份数据
- 将 `assistants` 目录请求统一到单一 `assistants.list` 共享 SWR key，收敛 `guid` / `conversation` / `settings` / 会话行上的并发重复拉取
- 修正 `useAllCronJobs()` 首屏默认强制刷新，改为首屏复用共享缓存，仅保留显式 `refetch` 时的强制刷新
- 将 Guid 页的 skills catalog 与 MCP catalog 改为用户展开操作菜单时再加载
- 抽出共享 WebSocket 单例，合并 `common/adapter/browser.ts` 与 `common/adapter/httpBridge.ts` 原本各自维护的连接，去掉重复 `ws-token` 获取与重复握手
- 将 MCP catalog 读取本地配置时改为复用 `configService` 已加载缓存，不再额外直连第二次 `/api/settings/client`
- 移除 SaaS Web 下无意义的 `webui` / `pet` 路由、入口与死代码
- 收紧系统设置页中的桌面专属项，仅在桌面环境渲染
- 对齐设置侧栏与对话侧栏 section header / item 的节奏参数
- 修正会话行、团队行、项目折叠头的 hover 操作位覆盖文本问题，统一左侧导航的圆角与右侧留白
- 修正设置侧栏、团队侧栏、会话列表中图标与文字的垂直居中对齐，移除依赖固定 `line-height` 的偏移
- 对设置侧栏额外做半像素级光学校正，消除几何居中后仍存在的轻微视觉下沉
- 删除未引用的 `src/aionui/shims/officePlatform.ts`
- 去掉 `main.tsx` 中对 `configService.initialize()` 的重复首屏触发，收敛 `/api/settings/client` 的双初始化源
- 为共享 WebSocket 连接增加并发锁，并移除浏览器桥里重复的 `connectSharedWebSocket()` 调用，收敛 `ws-token` 抢占式重复获取
- 将 `assistants` 目录请求收口到单一共享 fetcher，并对 `agents` / `assistants` / `remote-agents` 等启动 catalog 关闭 focus/reconnect 自动重刷
- 将 `usePresetAssistantInfo()` 改成按会话类型按需拉取数据：普通预设会话不再无条件请求 `acp-adapters`、自定义 agent 目录或远程 agent 详情
- 将对话侧栏与设置侧栏的文本容器从绝对定位壳改回普通 flex 对齐，修正图标与文字中心不一致的问题

## 验证结果

- `npx vite build`：通过
- `npm run typecheck`：失败，但失败项为仓库既有历史错误
- 针对本次改动文件过滤后的 `typecheck` 输出：未出现命中本次改动文件的新报错
- Chrome 实页复核：
  - `guid` 对话侧栏首条会话项中，图标中心与文本中心都为 `292`
  - `settings/model` 设置侧栏首项中，图标中心与文本中心都为 `139`
  - `guid` 刷新后的 `httpBridge` 日志中，`GET /api/agents`、`GET /api/assistants`、`GET /api/conversations?limit=10000`、`GET /api/cron/jobs`、`GET /api/providers`、`GET /api/remote-agents` 都只出现单次请求发起日志
- Chrome 扩展的原始 CDP Network 事件在这轮复测里不稳定，未能直接导出 `ws-token` / `settings/client` 的最终条目数；这两项当前结论来自代码级根因修复而非稳定抓包

## 遗留风险

- 名称像本地能力的桥接接口，实际可能已走 SaaS backend；清理必须按运行路径判断
- 构建隔离一旦收紧，可能暴露未声明依赖
- `vite.config.ts` 仍保留 `AionUi/node_modules` fallback，说明依赖隔离债务尚未完全移除
- 构建仍存在超大 chunk 警告，后续应继续做路由级或能力级拆包
- `ws-token` 与 `settings/client` 这两条请求本轮未拿到稳定浏览器抓包证据；若你本地刷新后仍看到重复，需要继续用浏览器网络面板按 exact URL 再拆剩余调用链
