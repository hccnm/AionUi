# Comet Design Handoff

- Change: saas-auth-shell-permissions
- Phase: design
- Mode: compact
- Context hash: eb021d3076668eecca55a3fcf423b12297c83f6e843f72ac4c0ccfa9a79fd3ea

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/saas-auth-shell-permissions/proposal.md

- Source: openspec/changes/saas-auth-shell-permissions/proposal.md
- Lines: 1-29
- SHA256: 26f2b16bc80519e10473b661decd7d7e17bd6f787014a8d3b525919d254e7950

```md
## Why

AionWeb 二阶段需要切换到 SaaS 优先的认证与权限应用壳。前端不能再把旧的状态探测接口或本地桌面状态当作登录态主依据，而必须以后端当前用户契约作为唯一业务判断来源。

## What Changes

- 新增 SaaS 认证应用壳，统一以 `GET /api/auth/me` 判断当前是否已登录、当前用户是谁、有哪些角色和权限。
- 支持账号密码登录模式下的 Aion JWT 保存、刷新和后端登出语义。
- 支持 gateway 模式通过 gateway proxy 访问 Aion，前端不负责 gateway 会话续期，也不手动构造 gateway 身份 header。
- 使用 `permission_flags` 作为长期权限契约，保留稳定的 `derived` 字段作为常用入口判断的便捷字段。
- **BREAKING**：SaaS 前端主流程不得依赖桌面/local 的 setup 或本地运行态。
- **BREAKING**：`/api/auth/status` 不再作为二阶段前端菜单、路由或登录态主依据。

## Capabilities

### New Capabilities

- `auth-session`: 覆盖 SaaS 登录态、token 处理、gateway 模式、登出语义和权限应用壳行为。

### Modified Capabilities

- None.

## Impact

- 影响前端认证会话存储、`AuthContext`、登录页、登出逻辑、认证路由守卫、菜单显隐、HTTP 鉴权层和 mock runtime 契约。
- 密码登录模式使用 `POST /api/auth/login`、`POST /api/auth/refresh`、后端登出接口和 `GET /api/auth/me`。
- Gateway 模式复用同一个 `GET /api/auth/me` 业务契约，但会话维护交给 gateway。
- 现有 `status/setup-password/change-password` 需要重新定位：`status` 仅兼容或探测，`setup-password` 不作为 SaaS 主流程，`change-password` 保留为个人账号能力。
```

## openspec/changes/saas-auth-shell-permissions/design.md

- Source: openspec/changes/saas-auth-shell-permissions/design.md
- Lines: 1-61
- SHA256: 3c4006f5b2dfaff41b7c3ac333791f96157cd7a0402c7e935442be70a7cb9efd

```md
## Context

当前前端认证模型较轻，仍围绕 `/login`、`/logout`、`/api/auth/user`、`/api/auth/status` 等旧接口组织。二阶段产品形态切到 SaaS 优先后，前端只能信任 `GET /api/auth/me` 返回的用户身份和权限结果。

SaaS 模式最终替换桌面/local 能力。旧的桌面/local setup 流程可以留在旧产品分支里，但不属于二阶段 SaaS 前端主路径。

## Goals / Non-Goals

**Goals:**

- 统一以 `GET /api/auth/me` 作为业务登录态、当前用户、角色、权限 flags 和 derived 权限快捷字段的来源。
- 用同一套前端 auth model 覆盖密码登录和 gateway 模式。
- 以 `permission_flags` 作为长期权限契约，同时允许稳定 `derived` 字段服务常见入口判断。
- 保留 `change-password` 作为个人账号改密能力，并与管理员重置密码区分。

**Non-Goals:**

- 不把桌面/local 的 `setup-password` 作为 SaaS onboarding 主路径。
- 不用 `/api/auth/status` 决定菜单、路由或认证态。
- 不让前端构造 gateway 身份 header。
- 不让 gateway 模式调用 Aion JWT refresh。

## Decisions

- Decision: `GET /api/auth/me` 是 SaaS 前端唯一业务登录态来源。
  Rationale: 这样可以让路由守卫、菜单显隐、用户展示和权限判断在密码登录与 gateway 模式下保持一致。`/api/auth/status` 可以继续用于兼容、健康探测或首次安装展示，但不能控制 SaaS 应用壳。
  Alternative considered: 启动时继续先依赖 `/api/auth/status`。拒绝原因是会形成两个互相竞争的登录态来源。

- Decision: 密码登录模式由前端保存和刷新 Aion JWT。
  Rationale: JWT 由 Aion 签发，前端可以保存 token、附加 `Authorization: Bearer <token>`，并在需要时调用 refresh。
  Alternative considered: 密码登录也强制使用 gateway/cookie 语义。拒绝原因是二阶段后端契约已经明确账号密码登录返回 Aion JWT。

- Decision: Gateway 模式不调用 Aion refresh。
  Rationale: gateway 拥有上游登录态和续期策略。前端只访问 gateway proxy，并观察 `GET /api/auth/me` 成功或失败。
  Alternative considered: 在前端增加 gateway 专用 refresh 分支。拒绝原因是会把 gateway 会话策略泄漏到 AionWeb。

- Decision: 登出行为按模式区分。
  Rationale: 密码登录模式有后端撤销/拉黑 JWT 和清 cookie 的语义；gateway 模式下 Aion 不能登出 gateway 会话，只能跳转 gateway/开放平台登出，或按部署配置清理本地前端状态。
  Alternative considered: 所有模式共用一个登出 endpoint。拒绝原因是 Aion 无法撤销 gateway 拥有的会话。

- Decision: `permission_flags` 驱动长期权限判断，`derived` 字段作为稳定便捷字段。
  Rationale: flags 更精确且可扩展；derived 布尔值适合常见应用壳入口判断，但不应成为唯一授权模型。

## Risks / Trade-offs

- [Risk] 新旧 auth 响应格式混用导致解析不一致 -> Mitigation: 为二阶段新增接口建立清晰响应 adapter，并仅在新 SaaS 页面使用。
- [Risk] 不同 gateway 部署失败形态不同 -> Mitigation: 在 HTTP 层统一处理 401/403，回到未登录应用状态。
- [Risk] 旧 setup-password 假设残留在 UI 文案或路由逻辑里 -> Mitigation: 实施时审计登录页和账号设置路由。

## Migration Plan

1. 新增二阶段 auth 响应类型和统一 envelope 解析。
2. 扩展认证会话存储，持久化更完整的用户和权限 payload。
3. 将 SaaS 路径里的 `/api/auth/user` 和 `/login` 替换为 `/api/auth/me` 和 `/api/auth/login`。
4. 将 `/api/auth/status` 降级为兼容探测接口，并从路由/菜单判断中移除。
5. 增加按登录模式区分的登出处理。

## Open Questions

- 密码登录模式的后端登出最终路由是 `POST /api/auth/logout`，还是保留 `/logout`？
- Gateway 登出 URL 由前端部署配置提供、由 `/api/auth/me` 返回，还是完全在 AionWeb 外部处理？
```

## openspec/changes/saas-auth-shell-permissions/tasks.md

- Source: openspec/changes/saas-auth-shell-permissions/tasks.md
- Lines: 1-25
- SHA256: 0db1fefe3be34370107ceb9c55a51a508ab49637cb32aa1cd79569d5b9723cc3

```md
## 1. 认证契约类型

- [ ] 1.1 新增二阶段 login、refresh、logout 和 `GET /api/auth/me` 响应类型。
- [ ] 1.2 扩展持久化 session 状态，支持完整用户信息、roles、permission flags、derived 字段、login mode 和可选 JWT。
- [ ] 1.3 为二阶段 auth 接口增加统一 envelope 解析。

## 2. 认证流程

- [ ] 2.1 将 SaaS 登录调用替换为 `POST /api/auth/login`。
- [ ] 2.2 将当前用户加载替换为 `GET /api/auth/me`。
- [ ] 2.3 将 JWT refresh 限定在密码登录模式。
- [ ] 2.4 增加密码登录与 gateway 模式的登出分支处理。
- [ ] 2.5 从路由和菜单认证判断中移除 `/api/auth/status` 依赖。

## 3. 权限应用壳

- [ ] 3.1 基于 `permission_flags` 和稳定 `derived` 字段暴露权限 helper。
- [ ] 3.2 更新认证路由守卫以使用新的 auth context 结构。
- [ ] 3.3 更新菜单显隐逻辑以使用新的权限 helper。

## 4. 验证

- [ ] 4.1 增加密码登录、refresh、logout 和 `/me` 失败处理测试。
- [ ] 4.2 增加 gateway 模式不调用 refresh 且不手动附加 gateway header 的测试。
- [ ] 4.3 运行 typecheck 和认证相关定向测试。
```

## openspec/changes/saas-auth-shell-permissions/specs/auth-session/spec.md

- Source: openspec/changes/saas-auth-shell-permissions/specs/auth-session/spec.md
- Lines: 1-66
- SHA256: eb9a25da646e9d7cfa5fe25a70dea89cbdfe25713c2ab146ae20d39761d28f2a

```md
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

```

