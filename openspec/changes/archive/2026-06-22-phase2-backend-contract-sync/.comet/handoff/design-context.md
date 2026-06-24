# Comet Design Handoff

- Change: phase2-backend-contract-sync
- Phase: design
- Mode: compact
- Context hash: 4082ea5dd5b372d0e671f5cf9b81a36bbad35f009c6394aa82131da7c29c84bf

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/phase2-backend-contract-sync/proposal.md

- Source: openspec/changes/phase2-backend-contract-sync/proposal.md
- Lines: 1-31
- SHA256: 83802c78b7626420040ab75e6cb4bafe4a55c3ab9322c32077dad32cd6dabe0c

```md
## Why

后端在新版二阶段接口文档中收敛了 SaaS 契约：认证改为纯 Bearer token、所有 REST 响应统一 envelope、列表数据返回数组、资源和 execution 路由也调整到新版命名。当前前端仍按上一版契约调用多个接口，继续联调会出现登录字段、权限结构、分页形态、文件接口和 execution 子资源不匹配。

## What Changes

- 同步认证契约：登录请求使用 `username`，登录和 refresh 从 `{ code, message, data, trace_id }` 中读取 token，`GET /api/auth/me` 解析扁平用户、角色、`permission_flags` 和 `is_admin`。
- 同步通用响应契约：二阶段 adapter 只按新版 envelope 解析，列表接口按 `data: []` 处理，不再把分页对象作为后端主契约。
- 同步管理员接口：用户状态改 `POST`，重置密码字段改 `password`，新增用户 sync-status、权限字典、角色状态和角色-用户增删接口。
- 同步资源接口：SSH/Git 路由切到 `/api/git/**`，Git 项目字段切到 `display_name`、`repo_ssh_url`、`credential_id`、`default_branch`，Workspace 字段切到 `source_type`、`branch_ref`、`root_rel_path`。
- 同步 Workspace 文件接口：所有 SaaS 文件操作使用 `/files/list|read|write|mkdir|rename|delete|upload` POST action，并用 `relative_path` 作为唯一路径输入。
- 同步 execution/runtime 接口：创建 payload 使用 `execution_type`，cancel/status/artifacts 改为 `/api/executions/{execution_id}/**`，不再调用当前后端未开放的 detail、redeploy shortcut、artifact download 和 approve-retry。
- 同步事件流策略：当前后端未开放 events，前端先用 execution/artifact 轮询展示状态；WebSocket 仅作为旧系统兼容，不作为新版页面主依赖。
- **BREAKING**：前端二阶段实现不再兼容历史 `{ success, ... }` 响应、不再发送或读取 CSRF token、不再调用旧 `/api/git-projects`、`/api/ssh-credentials`、旧文件 REST 路由和旧 workspace-scoped execution 子资源。

## Capabilities

### New Capabilities

- `phase2-backend-contract`: 覆盖新版二阶段后端契约在前端的统一解析、认证、管理员、资源、文件、conversation 和 execution/runtime 对接行为。

### Modified Capabilities

- None.

## Impact

- 影响前端二阶段 API adapter：`auth/phase2.ts`、`adminAccessControl.ts`、`workspaceResources.ts`、`workspaceRuntime.ts` 和相关页面调用。
- 影响 mock runtime 与测试，尤其是 `authPhase2`、`adminAccessControl`、`workspaceResources`、`workspaceRuntime`、`mockRuntime` 和 conversation workspace 相关测试。
- 影响运行态 UI 能力展示：未开放的 artifact download、approve retry、redeploy shortcut 和 execution detail 需要禁用或转为新版替代行为。
- 依赖后端按 `/Users/z/Downloads/frontend-api-contract(1).md` 部署新版契约；如果测试环境仍返回旧 `{ success, ... }`，需要后端先完成部署或单独声明临时兼容策略。
```

## openspec/changes/phase2-backend-contract-sync/design.md

- Source: openspec/changes/phase2-backend-contract-sync/design.md
- Lines: 1-74
- SHA256: 6ef8c8efaf564d3fd1ed5d6bb8b30616abbca7ff6e72b3b24064ad17477da2bc

```md
## Context

新版后端文档将二阶段接口从“建议契约”收敛为“真实后端契约”。当前前端是在上一版 OpenSpec change 基础上实现的，仍保留旧字段和旧路由：登录提交 `phone`、当前用户期望 `{ user, roles, derived }`、列表期望 `{ items, total }`、Git/SSH 使用旧路径、文件 API 使用 REST/query 形态、execution detail/redeploy/download/approve-retry 仍按旧草案调用。

这次同步是跨模块契约迁移，直接影响 API adapter、mock runtime、页面行为和测试。实现目标不是兼容两套后端，而是让二阶段前端按 `/Users/z/Downloads/frontend-api-contract(1).md` 对接新版 SaaS 后端。

## Goals / Non-Goals

**Goals:**

- 将二阶段前端 REST 解析统一到 `{ code, message, data, trace_id }`。
- 将列表消费改为 `data` 数组，同时保留页面侧需要的空数组、数量和加载态处理。
- 将 auth/admin/resource/files/execution adapter 更新到新版路由、字段和行为。
- 将 mock runtime 和测试更新为新版契约，避免本地测试继续固化旧接口。
- 对后端未开放能力采用前端禁用或替代策略：execution detail 由列表组合，redeploy 重新创建 preview execution，artifact download/approve-retry 不直接调用。
- 保持 SaaS 安全边界：不发送 CSRF、不暴露服务器路径、不信任 `extra.workspace`。

**Non-Goals:**

- 不为旧 `{ success, ... }` 后端响应增加长期兼容层。
- 不实现后端未开放的 SSE events，只预留事件模型和轮询 fallback。
- 不新增后端能力、数据库 schema 或服务端兼容接口。
- 不迁移或恢复桌面/local 主流程。

## Decisions

- Decision: 二阶段 adapter 使用严格 envelope 解析，并把历史兼容限制在非二阶段旧客户端代码。
  Rationale: 新文档明确前端只按一种 envelope 解析，继续兼容 `{ success, ... }` 会掩盖后端部署不一致。
  Alternative considered: 在 adapter 中同时兼容 `success` 和 `code`。拒绝原因是会让联调问题延迟暴露，并与新版文档冲突。

- Decision: 在 adapter 边界做字段归一，页面尽量消费稳定前端模型。
  Rationale: 页面已经依赖 `items`、`path`、`kind` 等前端语义；直接把后端字段散落到页面会放大改动面。
  Alternative considered: 全页面直接改成后端字段。拒绝原因是风险更高，且不利于后续小范围契约变动。

- Decision: 列表后端返回数组时，adapter 返回数组或由薄包装补齐前端旧 `PaginatedResult` 所需字段，但不得把 `{ items,total }` 当作后端契约。
  Rationale: 当前页面可能仍需要 `.items` 读取，迁移可分层完成；关键是请求/响应契约不再依赖后端分页对象。
  Alternative considered: 一次性把所有页面状态改为裸数组。可行但改动面更大，优先选择 adapter 兼容前端内部模型。

- Decision: 事件流当前采用轮询作为新版 runtime 主路径，WebSocket 保留为兼容 helper。
  Rationale: 新文档明确当前后端未开放 events，最终优先 SSE；直接依赖现有 WebSocket 会导致新版页面在真实后端上不可用。
  Alternative considered: 继续把 WebSocket 作为主实现。拒绝原因是与当前后端可用接口不一致。

- Decision: 未开放 endpoint 在 adapter 层显式不可用或映射为新版替代行为。
  Rationale: 调用不存在接口会导致用户路径失败；显式禁用可让 UI 做准确展示。
  Alternative considered: 保留方法并等待后端。拒绝原因是 mock/test 会继续固化错误契约。

- Decision: `workspace_id` 是 SaaS 会话唯一可信 Workspace 输入。
  Rationale: 后端会将 `workspace_id` 解析到受控目录，前端不应再传服务器绝对路径。
  Alternative considered: clone-create 保留 `extra.workspace` 兜底。拒绝原因是新文档明确后端会拒绝该可信来源。

## Risks / Trade-offs

- [Risk] 当前联调后端可能仍未部署新版 envelope 或字段 -> Mitigation: 以文档为准更新前端；若测试环境仍旧，需要后端先完成部署或另开临时兼容策略。
- [Risk] 页面仍依赖 `PaginatedResult.items`，裸数组迁移可能扩散 -> Mitigation: 在 adapter 层提供前端内部归一结果，测试确保后端输入是数组。
- [Risk] 禁用 artifact download/approve-retry 会减少当前原型能力 -> Mitigation: UI 展示 metadata 和等待状态，后端开放接口后再单独补充。
- [Risk] 时间字段从 ISO string 变为毫秒 timestamp number -> Mitigation: 类型放宽为 `string | number`，展示层统一格式化。
- [Risk] WebSocket 测试和旧页面行为受影响 -> Mitigation: 将新版 runtime 页面改为轮询路径，保留低层 WS helper 测试不作为新版契约主验证。

## Migration Plan

1. 更新契约测试，先让测试描述新版 auth/admin/resource/files/execution 请求和响应。
2. 更新 auth adapter、权限 helper 和会话存储接入，支持扁平 `/auth/me` 和 wildcard 权限。
3. 更新 admin adapter 和管理页调用，加入 permissions、sync-status、role-user add/remove、POST status。
4. 更新 SSH/Git/Workspace resource adapter 字段和路由，移除 SSH delete UI 入口。
5. 更新 Workspace runtime adapter 的文件 action、execution payload、global execution 子资源、artifact metadata 和禁用能力。
6. 更新 conversation clone/create 的 `workspace_id` 保障。
7. 更新 mock runtime 为新版契约，删除旧接口测试依赖。
8. 运行定向测试、typecheck 和 OpenSpec strict validate。

## Open Questions

- 后端是否会在列表接口后续补充分页元数据；如果会，需要新增契约而不是恢复旧 `{ items,total }` 假设。
- Execution SSE events 的准确 endpoint、event names 和重连语义尚未开放；本 change 只保留轮询 fallback 和未来迁移位。
- Artifact 下载、approve-retry 的最终接口未开放；本 change 不猜测 URL。
```

## openspec/changes/phase2-backend-contract-sync/tasks.md

- Source: openspec/changes/phase2-backend-contract-sync/tasks.md
- Lines: 1-51
- SHA256: d75ae7a75dbc4e9452414713f8cd5424b54073c258865fb55ea5370f24614678

```md
## 1. Contract Tests

- [ ] 1.1 更新 auth 测试，覆盖 `username` 登录、`data.token`、扁平 `/api/auth/me`、`is_admin` 和 wildcard 权限。
- [ ] 1.2 更新 admin 测试，覆盖数组列表、POST status、`password` reset、permissions 字典、sync-status 和 role-user add/remove。
- [ ] 1.3 更新 resource 测试，覆盖 `/api/git/ssh-credentials`、`/api/git/projects`、新版 Git/Workspace 字段和禁用 SSH delete。
- [ ] 1.4 更新 runtime 测试，覆盖文件 POST action、`execution_type`、global `/api/executions/{id}/**`、禁用 detail/redeploy/download/approve-retry。
- [ ] 1.5 更新 mock runtime 测试，确保本地 mock 只暴露新版二阶段契约。

## 2. Auth And Envelope

- [ ] 2.1 将二阶段 envelope 类型改为 numeric `code`、nullable `trace_id`，并统一错误 `message`/`trace_id` 提取。
- [ ] 2.2 将登录请求 body 从 `phone` 改为 `username`，登录/refresh 响应只从 `data.token` 读取 token。
- [ ] 2.3 将 `Phase2CurrentUser` 改为扁平模型，并从 `is_admin` 派生前端便捷字段。
- [ ] 2.4 更新权限 helper，支持 `permission_flags` 和角色 `permissions` 中的 `*` wildcard。
- [ ] 2.5 确认二阶段请求不读取或发送 CSRF token。

## 3. Admin Contract

- [ ] 3.1 将 admin 列表解析从后端分页对象改为后端数组，并在 adapter 层保持页面可消费的数据形态。
- [ ] 3.2 将用户状态更新改为 `POST /api/admin/users/{user_id}/status`。
- [ ] 3.3 将管理员重置密码 payload 改为 `{ password }`。
- [ ] 3.4 新增 `GET/POST /api/admin/users/{user_id}/sync-status` adapter 方法。
- [ ] 3.5 新增 `GET /api/admin/permissions` adapter 方法并更新角色权限字段为 `permissions`。
- [ ] 3.6 将角色启停和用户角色分配改为 `/api/admin/roles/{role_id}/status` 与 `/api/admin/roles/{role_id}/users/{user_id}`。

## 4. Resource And Workspace Contract

- [ ] 4.1 将 SSH 凭据路由切换到 `/api/git/ssh-credentials/**`，并适配 generate 返回 `{ credential, public_key }`。
- [ ] 4.2 移除或禁用前端 SSH 凭据删除能力。
- [ ] 4.3 将 Git 项目路由切换到 `/api/git/projects/**`，字段改为 `display_name`、`repo_ssh_url`、`credential_id`、`default_branch`。
- [ ] 4.4 新增 Git 项目 update/archive 方法，移除 verify shortcut 调用。
- [ ] 4.5 将 Workspace 字段改为 `source_type`、`git_project_id`、`branch_ref`、`root_rel_path`，并避免展示 `root_rel_path`。
- [ ] 4.6 确保 Workspace create 支持 blank 与 git_project 两种 source_type。

## 5. Files Conversation Runtime Contract

- [ ] 5.1 将文件 list/read/write/mkdir/rename/delete/upload 全部改为 POST action 路由和 `relative_path` payload。
- [ ] 5.2 将文件类型从 `path/type/modified_at/base_version` 映射到新版 `relative_path/kind/updated_at/version`。
- [ ] 5.3 确保 conversation create 和 clone-create 在 SaaS 模式传顶层 `workspace_id`，不提交 `extra.workspace` 作为可信来源。
- [ ] 5.4 将 terminal 创建 payload 改为 `relative_path`，避免展示真实服务器目录。
- [ ] 5.5 将 execution 创建 payload 从 `kind` 改为 `execution_type`，并适配新版状态集合。
- [ ] 5.6 将 cancel/status/artifacts 改为 `/api/executions/{execution_id}/**`，artifact 只展示 metadata 和 `ref_`。
- [ ] 5.7 将 redeploy 映射为重新创建 `preview_env` execution，禁用 artifact download 和 approve-retry 直接调用。
- [ ] 5.8 将新版 runtime 状态刷新改为 execution/artifact 轮询，保留 SSE 未来接入位。

## 6. Verification

- [ ] 6.1 更新 mock runtime 中所有二阶段接口到新版路由、字段和 envelope。
- [ ] 6.2 运行定向测试：auth、admin、resources、runtime、mock runtime、conversation params。
- [ ] 6.3 运行 `npm run typecheck`。
- [ ] 6.4 运行 `npx openspec validate phase2-backend-contract-sync --strict`。
```

## openspec/changes/phase2-backend-contract-sync/specs/phase2-backend-contract/spec.md

- Source: openspec/changes/phase2-backend-contract-sync/specs/phase2-backend-contract/spec.md
- Lines: 1-125
- SHA256: cfe3e9b118e9dae34c65c9b13cb0dc23a56ef7394b47790733e918ed35dc9cb1

[TRUNCATED]

```md
## ADDED Requirements

### Requirement: 统一二阶段 REST envelope
前端二阶段 API adapter MUST 只按 `{ code, message, data, trace_id }` 解析新版 REST 响应。列表接口 SHALL 将 envelope 的 `data` 数组作为结果集合，并在需要分页 UI 时由前端或后续后端契约补充分页元数据，而不是假设后端返回 `{ items, total }`。

#### Scenario: 解析成功 envelope
- **WHEN** 二阶段接口返回 `code: 0` 且 `data` 为对象或数组
- **THEN** 前端 adapter 返回 `data` 内容给调用方

#### Scenario: 解析错误 envelope
- **WHEN** 二阶段接口返回非 2xx 响应且 body 包含 `message` 和 `trace_id`
- **THEN** 前端错误对象展示 `message` 并保留 `trace_id` 供排障使用

#### Scenario: 列表返回数组
- **WHEN** 用户、角色、Git 项目、Workspace、文件、execution 或 artifact 列表接口返回 `data: []`
- **THEN** 前端使用该数组渲染列表，不要求 `items` 或 `total`

### Requirement: SaaS Bearer 认证契约
前端 SHALL 使用 `username` 字段提交密码登录请求，保存登录响应 `data.token`，并在后续受保护 REST 请求中携带 `Authorization: Bearer <token>`。前端 MUST NOT 读取 `aionui-csrf-token` 或发送 `x-csrf-token` 作为二阶段 SaaS 鉴权要求。

#### Scenario: 密码登录成功
- **WHEN** 用户提交手机号语义账号和密码
- **THEN** 前端调用 `POST /api/auth/login`，body 使用 `{ "username": "...", "password": "..." }`，并保存响应 `data.token`

#### Scenario: 获取当前用户
- **WHEN** `GET /api/auth/me` 返回扁平 `data`，包含 `id`、`phone`、`username`、`display_name`、`roles`、`permission_flags` 和 `is_admin`
- **THEN** 前端将该响应作为唯一业务登录态和权限来源

#### Scenario: 超级管理员 wildcard 权限
- **WHEN** 当前用户的 `permission_flags` 或角色 permissions 包含 `*`
- **THEN** 前端权限 helper 将其视为具备二阶段前端所有菜单和按钮权限

### Requirement: 管理员新版接口
前端 SHALL 使用新版 `/api/admin/**` 契约管理用户、角色、权限字典和用户同步状态。用户状态更新 MUST 使用 `POST /api/admin/users/{user_id}/status`；管理员重置密码 MUST 发送 `{ "password": "..." }`；角色分配 MUST 使用角色中心的 `POST`/`DELETE /api/admin/roles/{role_id}/users/{user_id}`。

#### Scenario: 管理员更新用户状态
- **WHEN** 管理员启用或禁用用户
- **THEN** 前端调用 `POST /api/admin/users/{user_id}/status` 并发送目标 `status`

#### Scenario: 管理员重置用户密码
- **WHEN** 管理员重置其他用户密码
- **THEN** 前端调用 `POST /api/admin/users/{user_id}/reset-password` 并发送 `password`

#### Scenario: 角色权限选择
- **WHEN** 管理员打开角色创建或编辑表单
- **THEN** 前端从 `GET /api/admin/permissions` 读取权限字典，并从角色 `permissions` 字段读取已绑定权限

#### Scenario: 调整用户角色
- **WHEN** 管理员给用户添加或取消某个角色
- **THEN** 前端调用 `POST /api/admin/roles/{role_id}/users/{user_id}` 或 `DELETE /api/admin/roles/{role_id}/users/{user_id}`

### Requirement: SSH Git Workspace 资源新版接口
前端 SHALL 使用 `/api/git/ssh-credentials/**`、`/api/git/projects/**` 和 `/api/workspaces/**` 访问二阶段资源。前端 MUST NOT 调用旧 `/api/ssh-credentials` 或 `/api/git-projects`。前端 MUST NOT 渲染删除 SSH 凭据入口，因为当前二阶段后端未开放删除接口。

#### Scenario: SSH 凭据列表
- **WHEN** 用户查看自己的 SSH 凭据
- **THEN** 前端调用 `GET /api/git/ssh-credentials`

#### Scenario: 生成 SSH key pair
- **WHEN** 用户生成 SSH key pair
- **THEN** 前端调用 `POST /api/git/ssh-credentials/generate`，读取 `data.credential` 和 `data.public_key`

#### Scenario: Git 项目创建和同步
- **WHEN** 用户创建或同步 Git 项目
- **THEN** 前端使用 `display_name`、`repo_ssh_url`、`credential_id`、`default_branch` 字段和 `/api/git/projects/**` 路由

#### Scenario: Workspace 展示
- **WHEN** 前端渲染 Workspace 列表或详情
- **THEN** 前端使用 `source_type`、`git_project_id`、`branch_ref`、`status` 等安全字段，并且不展示 `root_rel_path`

### Requirement: Workspace 文件 action 接口
前端 SHALL 通过 Workspace 作用域 POST action API 执行 SaaS 文件操作，并且所有文件路径 MUST 使用 `relative_path`。前端 MUST NOT 调用旧 `GET /files?path=...`、`GET /files/content`、`PUT /files/content`、`PATCH /files` 或 query-string delete 文件接口。

#### Scenario: 列出文件
- **WHEN** 用户打开 Workspace 文件目录
- **THEN** 前端调用 `POST /api/workspaces/{workspace_id}/files/list`，body 使用 `{ "relative_path": "..." }`

#### Scenario: 读取和写入文件
- **WHEN** 用户读取或保存文件
- **THEN** 前端调用 `/files/read` 或 `/files/write`，并使用 `relative_path`、`content` 和 `base_version`
```

Full source: openspec/changes/phase2-backend-contract-sync/specs/phase2-backend-contract/spec.md

