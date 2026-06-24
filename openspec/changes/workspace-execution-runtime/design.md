## Context

二阶段运行态能力建立在 Workspace 资源之上。前端不再把任意文件系统路径作为 SaaS 权威输入；所有文件、终端和 execution 操作都以 `workspace_id` 和相对路径为作用域。

用户已确认 execution 主事件流应使用 WebSocket，因为现有产品已有 WS 能力，后续状态、日志、artifact、AI loop 和人工审批都需要在同一运行态通道中扩展。SSE 只可作为只读日志 fallback。

## Goals / Non-Goals

**Goals:**

- 将文件、终端、TestRun、PreviewEnv、artifact 和事件视图全部限定在 `workspace_id` 下。
- 文件和终端操作使用 workspace-relative path。
- 使用 WebSocket 作为主要 execution event stream。
- 支持 PreviewEnv redeploy 和 execution cancel。
- 支持 AI 自动修复重试状态和人工审批操作。
- 新 runtime API 通过二阶段统一 envelope 解析。

**Non-Goals:**

- 不暴露服务器绝对路径或运行时基础设施细节。
- 不使用任意 path API 访问 SaaS 文件或终端。
- 不在本 change 中实现 SSH/Git/Workspace 生命周期管理。
- 不假设 PreviewEnv 会随 Workspace 修改自动实时变化；修改后需要 redeploy。

## Decisions

- Decision: runtime 操作全部以 `workspace_id` 为作用域。
  Rationale: Workspace 是长期 SaaS 开发资产，也是后端隔离边界。
  Alternative considered: 继续保留 conversation-scoped path API。拒绝原因是会延续任意路径语义。

- Decision: 文件操作使用相对路径和文件版本。
  Rationale: 相对路径避免路径泄漏，`base_version` 支持冲突感知写入。

- Decision: execution events 主通道使用 WebSocket。
  Rationale: status、logs、artifact 变化、AI loop 事件和人工审批状态适合共享长期 runtime channel。
  Alternative considered: 只使用 SSE。拒绝作为主实现，因为 SSE 是单向通道，并且会形成第二套主要实时模型。

- Decision: 新 runtime API 使用二阶段 envelope。
  Rationale: 统一 `code`、`message`、`data`、`trace_id` 处理对运行失败和排障支持很重要。

- Decision: artifact 下载通过后端受控 URL。
  Rationale: 前端不应直接访问内部对象存储、pod 地址、namespace 或 host port。

## Risks / Trade-offs

- [Risk] WebSocket 协议形态尚未完全明确 -> Mitigation: 先定义 typed event adapter，覆盖 status、log、artifact、approval 和 terminal 事件扩展位。
- [Risk] 大量日志压垮 UI 状态 -> Mitigation: 对日志 buffer 做上限或虚拟化，并在后端支持时补充历史拉取。
- [Risk] 文件写入冲突难以理解 -> Mitigation: 将 `base_version` 冲突明确展示为重新加载或覆盖选择。
- [Risk] Preview URL 创建后才返回 -> Mitigation: 将 preview URL 视为可由详情接口或事件 payload 更新的状态。

## Migration Plan

1. 新增 workspace files、terminals、executions、artifacts 和 approval actions 的 runtime API client 与类型。
2. 新增 WebSocket event model 和订阅管理。
3. 将文件树和编辑器操作迁移到 `workspace_id` 和 relative path。
4. 新增 execution 列表/详情、日志、artifact、preview、cancel、redeploy 和 approval UI。
5. 移除 SaaS 对任意 path 文件/终端 API 的使用。

## Open Questions

- Execution events 的最终 WebSocket channel 和订阅 payload 是什么？
- 后端是否支持历史事件重放，还是前端需要为遗漏日志准备轮询 fallback？
