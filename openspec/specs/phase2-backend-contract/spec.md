# phase2-backend-contract Specification

## Purpose
TBD - created by archiving change phase2-backend-contract-sync. Update Purpose after archive.
## Requirements
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

#### Scenario: 文件操作
- **WHEN** 用户 mkdir、rename、delete 或 upload
- **THEN** 前端调用对应 `/files/mkdir`、`/files/rename`、`/files/delete` 或 `/files/upload` action 路由

### Requirement: Conversation Workspace ID 契约
SaaS 前端 MUST 在创建和 clone-create 开发会话时传递顶层 `workspace_id`，并且 MUST NOT 将 `extra.workspace` 服务器绝对路径作为可信来源。

#### Scenario: 创建开发会话
- **WHEN** 用户从 SaaS Workspace 启动 agent 会话
- **THEN** 前端调用 `POST /api/conversations` 并发送顶层 `workspace_id`

#### Scenario: 克隆开发会话
- **WHEN** 用户从已有 SaaS 会话 clone-create
- **THEN** 前端确保 `conversation.workspace_id` 存在，且不向后端提交 `extra.workspace` 作为 workspace 权威来源

### Requirement: Execution Runtime 新版接口
前端 SHALL 使用新版 execution 契约创建、展示和取消 TestRun/PreviewEnv。创建 payload MUST 使用 `execution_type`。取消、状态更新和 artifact 列表 SHALL 使用 `/api/executions/{execution_id}/**`。前端 MUST NOT 调用当前后端未开放的独立 execution detail、redeploy shortcut、artifact download 或 approve-retry endpoint。

#### Scenario: 创建 TestRun 或 PreviewEnv
- **WHEN** 用户启动测试运行或预览环境
- **THEN** 前端调用 `POST /api/workspaces/{workspace_id}/executions`，body 使用 `execution_type`

#### Scenario: 取消 Execution
- **WHEN** 用户停止 TestRun 或 PreviewEnv
- **THEN** 前端调用 `POST /api/executions/{execution_id}/cancel`

#### Scenario: 展示 Execution 详情
- **WHEN** 用户查看某个 execution 的详情
- **THEN** 前端从 workspace execution 列表和 artifact 列表组合展示，不调用不存在的 `GET /api/executions/{execution_id}` 详情接口

#### Scenario: Redeploy PreviewEnv
- **WHEN** 用户重新部署 preview
- **THEN** 前端重新创建一个新的 `execution_type=preview_env` execution，而不调用 `/redeploy`

### Requirement: Execution 事件流降级
当前后端未开放 execution events 时，前端 SHALL 使用 execution list 和 artifact list 轮询展示状态。后续 SSE 接口开放后，新页面 SHALL 按 SSE event model 对接；WebSocket MAY 作为旧系统兼容通道，但 MUST NOT 是新版页面的唯一状态来源。

#### Scenario: Events 未开放
- **WHEN** 后端未提供 `GET /api/executions/{execution_id}/events`
- **THEN** 前端不报错，并通过轮询刷新 execution 状态和 artifact metadata

#### Scenario: SSE 后续开放
- **WHEN** 后端开放 execution SSE events
- **THEN** 前端可以从轮询迁移到 SSE，但仍保留轮询作为加载和恢复 fallback

