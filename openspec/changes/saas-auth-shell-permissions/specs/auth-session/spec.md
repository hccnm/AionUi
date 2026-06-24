## ADDED Requirements

### Requirement: 当前用户权威来源

SaaS 前端 SHALL 使用 `GET /api/auth/me` 作为认证态、当前用户身份、角色、权限 flags 和 derived 权限快捷字段的唯一业务权威来源。

#### Scenario: 已登录启动

- **WHEN** SaaS 前端启动且 `GET /api/auth/me` 返回当前用户和权限
- **THEN** 前端将用户视为已登录，并根据该响应渲染授权路由和入口

#### Scenario: 未登录启动

- **WHEN** SaaS 前端启动且 `GET /api/auth/me` 返回 401
- **THEN** 前端将用户视为未登录，并进入登录流程

### Requirement: Status 探测不是业务门禁

SaaS 前端 MUST NOT 使用 `/api/auth/status` 作为主要登录态、菜单或权限判断来源。

#### Scenario: Status 接口仍存在

- **WHEN** `/api/auth/status` 因兼容或健康探测继续存在
- **THEN** SaaS 前端仍以 `GET /api/auth/me` 决定业务认证态

### Requirement: 密码登录 JWT 会话

密码登录模式下，前端 SHALL 保存 `POST /api/auth/login` 返回的 Aion JWT，将其作为 `Authorization: Bearer <token>` 附加到 Aion API 请求，并且仅对 Aion 签发的 JWT 使用 `POST /api/auth/refresh`。

#### Scenario: 密码登录成功

- **WHEN** 密码登录返回 token 和用户 payload
- **THEN** 前端保存 token，并通过 `GET /api/auth/me` 刷新当前用户状态

### Requirement: Gateway 会话委托

Gateway 模式下，前端 SHALL 访问 gateway proxy 地址，SHALL NOT 构造 `X-Gateway-*` header，并且 SHALL NOT 调用 Aion JWT refresh 续期 gateway 会话。

#### Scenario: Gateway 会话有效

- **WHEN** gateway proxy 注入有效下游身份且 `GET /api/auth/me` 成功
- **THEN** 前端在不保存 Aion JWT 的情况下将用户视为已登录

#### Scenario: Gateway 会话过期

- **WHEN** gateway 会话失效导致 `GET /api/auth/me` 失败
- **THEN** 前端将用户视为未登录，并按配置进入 gateway 登录或登出处理

### Requirement: 权限契约

前端 SHALL 使用 `permission_flags` 作为长期授权契约，并 MAY 使用稳定的 `derived` 字段处理常见应用壳入口判断。

#### Scenario: 管理入口显隐

- **WHEN** 当前用户 payload 包含允许用户管理的 permission flag 或 derived 字段
- **THEN** 前端可以展示管理入口，但仍以后端 403 响应作为安全边界

### Requirement: 账号密码修改

SaaS 前端 SHALL 保留 change-password 作为用户知道旧密码时修改自己密码的个人账号能力，并与管理员 reset-password 区分。

#### Scenario: 用户修改自己的密码

- **WHEN** 密码登录用户提交旧密码和新密码
- **THEN** 前端调用个人 change-password API，而不使用管理员 reset-password

