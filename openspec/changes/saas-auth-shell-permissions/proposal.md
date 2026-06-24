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
