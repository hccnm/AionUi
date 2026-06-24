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

## Resolved Questions

- 密码登录模式使用 `POST /api/auth/logout`，旧 `/logout` 不作为 SaaS 二阶段主流程。
- Gateway 登出 URL 由前端部署配置提供；未配置时只清理本地前端状态并回到登录页，Aion 不通知 gateway。
