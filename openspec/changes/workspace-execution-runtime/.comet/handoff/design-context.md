# Comet Design Handoff

- Change: workspace-execution-runtime
- Phase: design
- Mode: compact
- Context hash: 50844dbff2564b354201435977b1925319bb0d54c234787a568b7f1d77195b7d

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/workspace-execution-runtime/proposal.md

- Source: openspec/changes/workspace-execution-runtime/proposal.md
- Lines: 1-28
- SHA256: 1be560b2f5f27c064b83c8a225b3a085ddea4d4e0d9c71849c7566a9a29d8d7a

```md
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
```

## openspec/changes/workspace-execution-runtime/design.md

- Source: openspec/changes/workspace-execution-runtime/design.md
- Lines: 1-62
- SHA256: b9162d2c41cdb7fe912bb767d2db9347029f11ad65c508ae6d19ff10b211ec29

```md
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
```

## openspec/changes/workspace-execution-runtime/tasks.md

- Source: openspec/changes/workspace-execution-runtime/tasks.md
- Lines: 1-35
- SHA256: 1b714fbed9f5f148f9a10f6b47584b83a7b26f33c397882144b029a37c8646ce

```md
## 1. Runtime API 层

- [ ] 1.1 新增 Workspace 文件 API 方法，覆盖 list、read、write、mkdir、rename、delete 和 upload。
- [ ] 1.2 新增终端创建 API 方法。
- [ ] 1.3 新增 execution API 方法，覆盖 create、list、detail、cancel、redeploy 和 approve-retry。
- [ ] 1.4 新增 artifact list 和 download helper。
- [ ] 1.5 为 runtime API 增加统一 envelope 解析。

## 2. WebSocket Events

- [ ] 2.1 定义 status、logs、artifacts、preview 和 approval states 的 typed execution event model。
- [ ] 2.2 新增 execution WebSocket 订阅和清理逻辑。
- [ ] 2.3 增加断线重连和遗漏事件 fallback 状态处理。

## 3. 文件与终端 UI

- [ ] 3.1 将文件树操作迁移到 `workspace_id` 和 relative path。
- [ ] 3.2 将文件编辑器读写迁移到 content API 和 `base_version`。
- [ ] 3.3 新增基于 Workspace API 的上传和文件操作流程。
- [ ] 3.4 新增基于 Workspace terminal API 的终端启动流程。

## 4. Execution UI

- [ ] 4.1 实现 execution 列表和详情视图。
- [ ] 4.2 实现 TestRun 创建流程。
- [ ] 4.3 实现 PreviewEnv 创建、cancel 和 redeploy 流程。
- [ ] 4.4 实现 artifact list/download UI。
- [ ] 4.5 实现 AI retry 和 human approval 控制。

## 5. 安全与验证

- [ ] 5.1 审计 runtime UI，确认不泄漏内部路径和基础设施标识。
- [ ] 5.2 增加 execution event handling 和状态更新测试。
- [ ] 5.3 增加文件写入冲突处理测试。
- [ ] 5.4 运行 typecheck 和 runtime 相关定向测试。
```

## openspec/changes/workspace-execution-runtime/specs/workspace-runtime/spec.md

- Source: openspec/changes/workspace-execution-runtime/specs/workspace-runtime/spec.md
- Lines: 1-70
- SHA256: 6ee69ef28631c4e4cd90bd49d4c1fbcf6b6fbc535d97a6552d172c61fc038338

```md
## ADDED Requirements

### Requirement: Workspace 作用域文件

前端 SHALL 通过 Workspace 作用域 API 使用 `workspace_id` 和 relative path 执行 SaaS 文件列表、内容读取、内容写入、mkdir、rename、delete 和 upload 操作。

#### Scenario: 读取 Workspace 文件

- **WHEN** 用户打开 Workspace 中的文件
- **THEN** 前端使用 workspace ID 和 relative path 请求内容，并只展示安全路径标签

#### Scenario: 写入冲突

- **WHEN** 文件写入因 `base_version` 返回版本冲突
- **THEN** 前端提示用户重新加载或解决冲突后再重试

### Requirement: Workspace 作用域终端

前端 SHALL 通过 Workspace 作用域终端 API 使用 `workspace_id` 和 relative path 创建终端会话。

#### Scenario: 启动终端

- **WHEN** 用户从 Workspace 启动终端
- **THEN** 前端发送 `workspace_id` 和 workspace-relative path

### Requirement: Execution 生命周期

前端 SHALL 支持为 Workspace 创建、列表展示、查看、取消和 redeploy TestRun 与 PreviewEnv 类型的 execution。

#### Scenario: 创建 TestRun

- **WHEN** 用户从 Workspace 启动测试运行
- **THEN** 前端在该 Workspace 下创建 execution，并展示返回的 execution ID 和状态

#### Scenario: Redeploy PreviewEnv

- **WHEN** 用户 redeploy preview execution
- **THEN** 前端调用 redeploy endpoint，并跟踪后端返回的新 execution ID

### Requirement: WebSocket execution events

前端 SHALL 使用 WebSocket 作为 execution status、logs、artifacts、preview updates、AI retry loop events 和 human approval states 的主事件流。

#### Scenario: Execution 状态更新

- **WHEN** WebSocket event 报告 execution 状态变化
- **THEN** 前端更新 execution 详情视图，而不要求整页刷新

#### Scenario: 需要人工审批

- **WHEN** execution event 报告需要 retry approval
- **THEN** 前端为该 execution 展示 approve 和 cancel 操作

### Requirement: Artifact 处理

前端 SHALL 通过后端受控 artifact API 列出和下载 artifact，并且 MUST NOT 直接访问内部对象存储或运行时基础设施地址。

#### Scenario: 下载 Artifact

- **WHEN** 用户下载 artifact
- **THEN** 前端使用后端提供的 download URL，并按正常鉴权处理

### Requirement: 运行时信息隐藏

前端 MUST NOT 展示服务器绝对路径、Kubernetes namespace、pod IP、container address、随机宿主端口或其他内部运行时基础设施标识。

#### Scenario: Preview 运行中

- **WHEN** preview environment 可用
- **THEN** 前端只展示公开 preview URL 和过期时间元数据
```

