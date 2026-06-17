# SaaS Web Runtime Optimization

## Why

当前 `AionWeb` 仍然建立在大量 `AionUi` renderer 迁移代码之上，Web 运行面和桌面运行面没有充分切开。结果是首屏请求偏重、桌面残留判断仍进入关键路径、样式节奏不统一，而且后续优化成本持续上升。

## What Changes

1. 剥离 SaaS Web 无关的 Electron / 本地壳层启动残留，避免它们继续进入 Web 关键路径。
2. 收敛首页、guid、settings、侧栏等常见入口的非必要请求，把能延后的数据改成惰性加载或共享缓存。
3. 修复侧栏与设置导航中的布局不对称和节奏不一致问题。
4. 针对卡顿与掉帧，清理启动期副作用、重复渲染和无意义状态联动。

## Capabilities

### New Capabilities

- `saas-web-runtime`: 定义 SaaS Web 运行时的最小启动路径、残留清理边界、请求预算和导航一致性要求

### Modified Capabilities

- None

## Impact

- Affected code:
  `src/aionui/renderer/main.tsx`、`src/aionui/renderer/components/layout/**`、`src/aionui/renderer/pages/guid/**`、`src/aionui/renderer/pages/settings/**`、`src/aionui/renderer/pages/conversation/GroupedHistory/**`、`src/aionui/common/**`、`vite.config.ts`
- Affected systems:
  browser runtime startup、HTTP/WS backend bridge、frontend navigation and rendering path
- Constraints:
  不修改后端 API 语义、不做数据库变更、不做远程推送或 CI 调整、不做无关业务重构
