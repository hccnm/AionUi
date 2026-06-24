## Why

二阶段 Workspace 需要浏览器端可管理的开发能力：文件访问、终端会话、预览环境、测试执行、日志、产物和 AI 自动修复循环。这些能力必须从 `workspace_id` 出发，并且不得暴露服务端运行时内部信息。

## What Changes

- 新增基于 Workspace 的文件浏览、内容读写、上传和文件操作，所有路径使用 workspace-relative path。
- 新增以 Workspace 和相对路径为作用域的终端创建能力。
- 新增 TestRun 和 PreviewEnv 的创建、列表、详情、取消和 redeploy 流程。
- 新增基于 WebSocket 的 execution 事件处理，用于状态、日志、artifact 和 AI loop 事件。
- 新增 artifact 列表和受控下载处理。
- **BREAKING**：SaaS 运行态页面不得使用任意 path API，也不得暴露服务器绝对路径、pod IP、namespace、container address 或随机宿主端口。

## Capabilities

### New Capabilities

- `workspace-runtime`: 覆盖 Workspace 作用域文件、终端、execution、preview env、artifact 和 execution events。

### Modified Capabilities

- None.

## Impact

- 影响 workspace 文件树、编辑器、上传流程、终端启动、preview/test 面板、execution 详情页、WebSocket 事件处理、artifact 下载和 mock runtime。
- 该 change 依赖 Workspace resource model 提供 `workspace_id`。
- 新二阶段 runtime API 应统一使用 `{ code, message, data, trace_id }` envelope。
