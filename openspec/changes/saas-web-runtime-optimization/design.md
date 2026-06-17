# SaaS Web Runtime Optimization Design

## Context

已确认的关键现状：

- `src/aionui/renderer/main.tsx` 仍承担桌面和 web 共用入口角色，包含 Electron Sentry、桌面失败页语义、`/api/agents` 预取、cron 修复等启动副作用。
- `src/aionui/renderer/components/layout/Layout.tsx` 仍挂有 deep link、主进程日志流、tray 事件、DevTools 打开逻辑。
- `vite.config.ts` 仍通过 `AionUi/node_modules` 做包解析兜底，说明 web 版尚未完成构建隔离。
- `src/aionui/common/chat/imageGenCore.ts`、`src/aionui/common/platform/*` 等模块仍带 Node/Electron 假设。
- 侧栏与设置页的布局密度、分组标题位置、选中态容器节奏不一致，和截图现象一致。

## Goals / Non-Goals

**Goals:**

- 让 SaaS Web 运行面只保留 browser + backend bridge 必需逻辑。
- 让首屏仅加载认证、基础配置和首个页面真正需要的数据。
- 让 UI 修正建立在现有设计体系上，而不是额外发明一套组件层。
- 让性能优化以“删副作用、减请求、少重渲染”为主。

**Non-Goals:**

- 不把整套 `src/aionui` 一次性拆成全新目录结构。
- 不在本次中重写 router 或状态管理范式。
- 不为未来未知场景提前做平台抽象二次设计。

## Decisions

### Decision 1: 先隔离入口副作用，再删残留模块

- 选择：
  优先清理 `renderer/main.tsx`、`Layout.tsx`、侧栏和 settings 入口上“默认会执行”的桌面逻辑，而不是先做大面积文件删除。
- 原因：
  这样可以先把 Web 关键路径瘦下来，同时降低误删 bridge 能力的风险。
- 备选：
  直接按目录批量删除 Electron/desktop 相关模块。未采用，因为同名模块中存在 Web 与桌面共享路径。

### Decision 2: 用请求预算而不是单点缓存补丁来收敛首屏

- 选择：
  把数据加载分成关键路径、次关键路径、非关键路径，然后优先移除默认预取。
- 原因：
  当前问题不只是缓存缺失，更是很多数据不该在首屏请求。
- 备选：
  保留现有 eager fetch，只补 SWR 缓存。未采用，因为这只能减少重复请求，不能减少首次压力。

### Decision 3: 样式修正只在现有设计语言内做局部对齐

- 选择：
  针对 section header、选中态容器、padding、icon slot 和 divider 节奏做局部样式修正。
- 原因：
  用户反馈是 SaaS Web 表现不对称，不是要做新的视觉系统。
- 备选：
  对侧栏与设置页整体重构。未采用，因为风险高且超出本次范围。

### Decision 4: 性能优化优先删副作用与重复渲染，不先做抽象重构

- 选择：
  先减少 mount 副作用、全量渲染和无效依赖，再考虑结构层重构。
- 原因：
  当前卡顿更像“迁移遗留带来的负担”，不是缺少抽象。
- 备选：
  先引入新的状态层或列表虚拟化框架。未采用，因为问题尚未定位到必须依赖新架构。

## Risks / Trade-offs

- [桥接误删风险] 名称像本地能力的 API 实际可能是 SaaS 后端桥接
  → 先按真实运行路径分类，再做移除或 no-op
- [请求收敛回归风险] 延后请求可能影响某些页面首次可用性
  → 逐路由验证 guid、conversation、settings 的基本可用性
- [迁移债务暴露风险] 构建层对 `AionUi/node_modules` 的依赖去除后，可能暴露未声明依赖
  → 先记录并补齐当前 web 真实依赖，再移除 fallback
- [性能收益有限风险] 某些卡顿可能来自后端或大内容渲染，不全是前端副作用
  → 先完成前端路径瘦身，再用请求和渲染证据判断下一轮优化点
