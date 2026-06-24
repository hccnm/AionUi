---
comet_change: phase2-backend-contract-sync
role: technical-design
canonical_spec: openspec
archived-with: 2026-06-22-phase2-backend-contract-sync
status: final
---

# Phase 2 Backend Contract Sync Design

## Context

后端新版二阶段契约把 SaaS 前端对接从上一版草案收敛为明确实现：认证只依赖 Bearer token，不需要 CSRF；所有 REST 接口使用 `{ code, message, data, trace_id }`；列表当前返回 `data` 数组；Git/SSH、Workspace 文件和 execution 子资源路由都有调整。

当前前端实现仍保留上一版假设：登录提交 `phone`、`/auth/me` 期望 `{ user, roles, derived }`、列表期望 `{ items,total }`、Git/SSH 访问旧路径、文件接口使用 query/REST 形态、execution detail/redeploy/download/approve-retry 仍按旧草案调用。这会导致真实后端联调在多个页面上失败。

## Goals

- 让二阶段 API adapter 与 `/Users/z/Downloads/frontend-api-contract(1).md` 保持一致。
- 将后端字段变化集中在 adapter 和 mock runtime，页面只消费稳定前端模型。
- 明确禁用或替代当前后端未开放的能力，避免 UI 调用不存在接口。
- 用测试固定新版契约，避免旧 mock 继续掩盖问题。

## Non-Goals

- 不实现旧 `{ success, ... }` 响应长期兼容。
- 不补 CSRF，也不读取 `aionui-csrf-token`。
- 不猜测 artifact download、approve-retry 或 SSE events 的未来接口。
- 不恢复 desktop/local 主流程。

## Decisions

### Strict Envelope Parsing

二阶段 adapter 以新版 envelope 为唯一后端契约。成功响应返回 `data`，错误响应提取 `message` 和 `trace_id`。列表接口以后端 `data: []` 为事实源；如果页面暂时还需要 `items`，由 adapter 做前端内部包装，不把 `{ items,total }` 视为后端响应。

### Adapter Boundary Normalization

字段迁移集中在 adapter：

- Auth 将扁平 `/auth/me` 归一为前端权限模型，并支持 `is_admin` 和 `*` wildcard。
- Resource 将后端 `display_name/repo_ssh_url/credential_id/default_branch` 映射到页面所需字段。
- Runtime 将后端 `relative_path/kind/updated_at/version` 映射到文件树和编辑器模型。
- Execution 将后端 `execution_type` 映射到前端现有 runtime 语义，避免页面大面积重写。

### Unavailable Runtime Capabilities

当前后端未开放的能力不再直接调用：

- `GET execution detail`：由 workspace execution list 加 artifact list 组合展示。
- `redeploy`：重新创建 `execution_type=preview_env`。
- `artifact download`：只展示 metadata 和 `ref_`，不拼 URL。
- `approve-retry`：展示等待状态，不提供继续按钮直到后端接口开放。
- `events`：先轮询 execution list/artifact list；SSE 开放后再接入。

### Conversation Workspace Safety

SaaS 会话创建和 clone-create 必须使用顶层 `workspace_id`。`extra.workspace` 只可作为非 SaaS 旧路径兼容，不作为受信 Workspace 来源传给新版后端。

## Data Flow

```text
Login Page
  -> POST /api/auth/login { username, password }
  -> save data.token
  -> GET /api/auth/me
  -> auth/session state + permission helpers

Resources Page
  -> /api/git/ssh-credentials/**
  -> /api/git/projects/**
  -> /api/workspaces/**
  -> adapter-normalized resource models

Runtime Page
  -> POST /api/workspaces/{workspace_id}/files/*
  -> POST /api/workspaces/{workspace_id}/executions { execution_type }
  -> GET /api/workspaces/{workspace_id}/executions
  -> GET /api/executions/{execution_id}/artifacts
  -> polling refresh until SSE exists
```

## Error Handling

- 401 remains auth-expired behavior for protected requests.
- 403 is the final authorization boundary for admin and resources.
- 409 file conflict keeps a typed conflict error and exposes current version if provided.
- Numeric `code` is treated as diagnostic metadata; HTTP status remains the primary error class.
- `trace_id` is retained in typed errors where adapters already expose error objects.

## Testing

- Auth tests cover `username`, `data.token`, flat `/auth/me`, `is_admin`, `*`, and no CSRF behavior.
- Admin tests cover array list responses, POST status, reset password `password`, permissions catalog, sync-status, and role-user add/remove.
- Resource tests cover `/api/git/**`, generate SSH return shape, Git project fields, Workspace source fields, and no SSH delete.
- Runtime tests cover file POST actions, `execution_type`, global `/api/executions/{id}/**`, redeploy-as-create, and disabled download/approve detail calls.
- Mock runtime tests mirror only the new contract.

## Risks

- Backend test environment may lag behind the document. If it still returns old `success` responses, that is a backend deployment mismatch rather than a frontend contract bug.
- Adapter normalization can temporarily preserve old frontend model names. This is acceptable if tests prove the network contract is new.
- SSE event details are not final. This change deliberately keeps event handling conservative and poll-based.
