---
comet_change: saas-auth-shell-permissions
role: technical-design
canonical_spec: openspec
---

# SaaS 认证与权限应用壳技术设计

## 背景

AionWeb 当前认证模型仍保留旧接口和桌面/local 假设：启动时会调用 `/api/auth/status` 判断 setup 状态，再用 `/api/auth/user` 获取当前用户，登录和登出分别走 `/login` 与 `/logout`。二阶段 SaaS 前端需要切换到统一的业务判断入口：`GET /api/auth/me`。

本 change 的目标不是在旧逻辑上局部替换 endpoint，而是为二阶段建立一个明确的认证契约边界，支撑后续 admin、workspace resource 和 workspace runtime 三个 change。

## 目标

- 使用 `GET /api/auth/me` 作为唯一业务登录态、当前用户、角色和权限来源。
- 支持 password 与 gateway 两种模式，但让 UI 消费同一套 auth state。
- 让 `permission_flags` 成为长期权限契约，`derived` 作为稳定便捷字段。
- 密码登录模式使用 Aion JWT，refresh 仅服务 Aion JWT。
- Gateway 模式不保存 Aion JWT，不调用 refresh，不构造 `X-Gateway-*` header。
- 保留个人 `change-password`，并与管理员 reset-password 分离。

## 非目标

- 不保留桌面/local setup 作为 SaaS 主流程。
- 不让 `/api/auth/status` 参与路由、菜单或业务登录态判断。
- 不实现 admin 用户/角色页面。
- 不实现 workspace 资源模型或运行态能力。
- 不让 Aion 后端登出 gateway 会话。

## 采用方案

采用 phase2 auth contract/adapter 方案。新增一个二阶段认证契约层，把 endpoint、envelope、session shape、login mode、token refresh、logout 和权限 helper 集中封装。`AuthContext` 改为消费该 adapter，并对 UI 暴露稳定状态与动作。

不采用直接在 `AuthContext` 中替换 endpoint 的方案，因为当前认证逻辑已经混合了 setup、status、current user、token refresh 和 logout。继续在同一文件中扩展会让 password/gateway 分支、统一 envelope 和权限 helper 散落在 UI 状态层。

不采用并行保留 legacy auth provider 与 phase2 auth provider 的方案，因为 SaaS 模式最终替换桌面/local 能力，保留两套 provider 会扩大长期维护面。

## 模块边界

### Phase2 Auth Contract

新增二阶段 auth 类型，表达后端契约：

- `Phase2AuthUser`: `id`、`phone`、`display_name`、`avatar_url`、`status`、`login_mode`
- `Phase2Role`: `id`、`role_key`、`role_name`
- `Phase2AuthDerived`: `is_admin`、`can_manage_users`、`can_manage_roles`，并允许后续扩展
- `Phase2CurrentUser`: `user`、`roles`、`permission_flags`、`derived`
- `Phase2LoginResponse`: `token`、`expires_at`、`user`
- `Phase2Envelope<T>`: `{ code, message, data, trace_id }`

旧的 `AuthUser { id, username }` 不再足够。session store 应保存完整 current-user payload，而不是只保存基础用户字段。

### Phase2 Auth Adapter

Adapter 负责调用和解析以下 API：

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/change-password`

Adapter 统一处理新 envelope，同时保留少量容错解析，用于开发期后端响应还未完全收敛时减少前端阻塞。容错只能放在 adapter 内，不向 UI 层扩散。

### Session Store

Session store 保存：

- `token: string | null`
- `currentUser: Phase2CurrentUser | null`
- `loginMode: "password" | "gateway" | null`

password 模式保存 token。gateway 模式不保存 Aion JWT，可保存 current-user payload 作为渲染缓存，但启动和恢复时仍必须重新调用 `/api/auth/me`。

旧 `needsSetup` 只作为 legacy 兼容字段保留，不参与 SaaS 主流程。登录页不应再因为 `/api/auth/status.needs_setup` 进入 SaaS setup-password 主流程。

### AuthContext

`AuthContext` 保留以下职责：

- 启动时调用 adapter 的 `getMe`
- 维护 `checking/authenticated/unauthenticated` 状态
- 暴露 `login`、`logout`、`refreshCurrentUser`、`changePassword`
- 暴露权限 helper，例如 `hasPermission(flag)`、`hasAnyPermission(flags)`、`derived`

`AuthContext` 不直接解析 envelope，不直接拼 endpoint，不直接判断 gateway header，也不直接实现 refresh HTTP 细节。

## 数据流

### 启动

1. `AuthProvider` 进入 `checking`。
2. 调用 `authAdapter.getMe()`。
3. 如果成功，写入 current-user payload，并进入 `authenticated`。
4. 如果返回 401，清理 session，并进入 `unauthenticated`。
5. 如果返回 403 或其他业务错误，进入 `unauthenticated` 或显示错误状态，具体展示由页面决定。

启动流程不调用 `/api/auth/status`。该接口只可用于兼容、健康探测或旧安装状态展示。

### 密码登录

1. 登录页提交手机号和密码到 `authAdapter.login`。
2. Adapter 调用 `POST /api/auth/login`。
3. 成功后保存 token 和 login mode。
4. 再调用 `GET /api/auth/me` 获取完整角色和权限。
5. `AuthContext` 写入 current-user payload，并进入 `authenticated`。

### Gateway 模式

1. 前端请求 gateway proxy 地址。
2. Gateway 注入可信下游身份。
3. 前端调用 `GET /api/auth/me`。
4. 成功则进入 `authenticated`。
5. 失败则进入 `unauthenticated`，由部署配置决定登录或登出跳转。

Gateway 模式不调用 `POST /api/auth/refresh`，不构造 `X-Gateway-*` header。

### Refresh

HTTP 层只有在 password mode 且存在 Aion JWT 时，才允许对 401 触发 refresh。Refresh 成功后重试原请求；失败则清理 session 并广播 auth expired。

Gateway mode 收到 401 时不 refresh，直接进入未登录状态。

### Logout

Password mode 调用 `POST /api/auth/logout`，用于撤销或拉黑 Aion JWT，并清理 cookie。无论后端响应是否成功，前端最终都清理本地 session。

Gateway mode 优先读取部署配置中的 gateway logout URL 并跳转；如果没有配置，则只清理本地 session 并回到登录页。Aion 不通知 gateway，也不负责撤销 gateway 会话。

## 权限设计

前端长期权限判断以 `permission_flags` 为准。`derived` 字段作为稳定便捷字段，用于常见入口控制，例如 `can_manage_users` 和 `can_manage_roles`。

菜单显隐和路由入口可以使用权限 helper，但这不是安全边界。直接访问管理路由时，后端 403 仍然是最终授权结果。

## 错误处理

新二阶段 auth API 使用统一 envelope。Adapter 需要将后端错误规范化为前端可消费结构：

- `UNAUTHENTICATED`: 清理 session，进入未登录状态。
- `FORBIDDEN`: 保留为授权错误，由页面决定展示。
- `VALIDATION_ERROR`: 展示表单字段或通用错误。
- `INTERNAL_ERROR`: 展示通用服务端错误，并保留 `trace_id` 供排查。

登录失败、refresh 失败、gateway 会话失效必须有清晰分支，不能都落到 unknown error。

## 迁移步骤

1. 新增 phase2 auth 类型和 adapter。
2. 扩展 session store，支持完整 current-user payload、login mode 和 token。
3. 更新 HTTP 鉴权层，按 login mode 决定是否 attach token 和 refresh。
4. 重构 `AuthContext`，改为消费 adapter 和 session store。
5. 更新登录页字段与请求，从 username 语义迁移到 phone/password。
6. 移除 SaaS 主流程对 `/api/auth/status`、`/api/auth/user`、`/login`、`/logout` 的依赖。
7. 增加权限 helper，并更新路由守卫和菜单显隐。
8. 保留 `change-password` 作为个人账号能力。

## 测试策略

- Session store 单元测试：完整 current-user payload、login mode、token、旧数据降级解析。
- Adapter 单元测试：envelope 成功/失败、登录成功、`/me` 401、validation error、trace_id 透传。
- HTTP 鉴权测试：password 模式 attach token 和 refresh；gateway 模式不 refresh、不构造 gateway header。
- AuthContext 测试：启动成功、启动 401、password login、logout、auth expired。
- 路由/菜单测试：入口显隐只依赖权限 helper，未登录时跳转登录页。

## 风险与缓解

- 风险：旧 setup-password 流程仍被登录页触发。
  缓解：实现阶段审计登录页状态机，SaaS 主流程不再由 `/api/auth/status.needs_setup` 驱动。

- 风险：后端 envelope 仍处于收敛期。
  缓解：兼容解析只允许存在于 adapter 内，后续可删除，不扩散到 UI。

- 风险：gateway 登出体验依赖部署配置。
  缓解：将 gateway logout URL 作为明确配置项；无配置时只清理前端状态并回登录页。

- 风险：权限 helper 被误认为安全边界。
  缓解：文档和代码命名强调 helper 只用于 UI 显隐，后端 403 仍是最终授权。

## Spec Patch

无。
