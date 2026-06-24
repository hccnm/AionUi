---
comet_change: workspace-execution-runtime
role: technical-design
canonical_spec: openspec
---

# Workspace Execution Runtime Design

## Context

二阶段 SaaS runtime 需要把文件、终端、execution、artifact 和实时事件都收敛到 Workspace 资源模型。前端不得再把任意绝对路径作为可信运行态输入，也不得展示服务器内部路径、namespace、pod IP、container address 或随机宿主端口。

本 change 在前端新增一条 SaaS runtime 页面能力，入口以 `workspace_id` 为主键；旧 conversation-local 文件面板暂不在本 change 内重构，避免把桌面兼容逻辑和 SaaS 二阶段运行态混在同一套 UI。

## Decisions

- 新增 `workspaceRuntime` adapter，所有接口统一解析 `{ code, message, data, trace_id }` envelope，并允许 mock/测试注入 fetcher。
- 文件 API 只接受 `workspace_id` 和 relative `path`，写入必须带 `base_version`，409/`VERSION_CONFLICT` 会映射为 typed conflict error。
- terminal 创建 API 只发送 `workspace_id`、relative `cwd` 和可选 shell，不发送绝对路径。
- execution 支持 `test_run` 和 `preview_env`，提供 create/list/detail/cancel/redeploy/approve-retry。
- execution event 主通道复用现有 shared WebSocket，新增 typed subscribe helper；断线重连由 shared WebSocket 层负责，UI 在订阅时先拉详情作为遗漏事件 fallback。
- artifact 下载只消费后端返回的受控 `download_url`，前端不拼接对象存储或运行时内部地址。

## UI Scope

- 新增 `/runtime` 页面，提供 Workspace 选择、文件树、内容编辑、文件操作、terminal 创建、execution 列表/详情、日志、preview、artifact 和人工审批操作。
- Settings Resources 页增加 Workspace 的 “Open Runtime” 操作，作为 SaaS runtime 入口。
- runtime 页面展示 `display_path`、relative path、公开 preview URL 和过期时间；隐藏任何绝对路径和基础设施标识。

## Testing

- Adapter tests 覆盖 envelope、workspace-relative 文件写入、409 conflict、terminal、execution、artifact download helper。
- Event tests 覆盖 status/log/artifact/approval 事件合并和无关 workspace/execution 事件过滤。
- Mock runtime tests 覆盖 workspace file/content/write/terminal/execution/redeploy/artifact endpoint。
- 运行 `npm run typecheck` 和 runtime 定向测试。
