## 1. 认证契约类型

- [x] 1.1 新增二阶段 login、refresh、logout 和 `GET /api/auth/me` 响应类型。
- [x] 1.2 扩展持久化 session 状态，支持完整用户信息、roles、permission flags、derived 字段、login mode 和可选 JWT。
- [x] 1.3 为二阶段 auth 接口增加统一 envelope 解析。

## 2. 认证流程

- [x] 2.1 将 SaaS 登录调用替换为 `POST /api/auth/login`。
- [x] 2.2 将当前用户加载替换为 `GET /api/auth/me`。
- [x] 2.3 将 JWT refresh 限定在密码登录模式。
- [x] 2.4 增加密码登录与 gateway 模式的登出分支处理。
- [x] 2.5 从路由和菜单认证判断中移除 `/api/auth/status` 依赖。

## 3. 权限应用壳

- [x] 3.1 基于 `permission_flags` 和稳定 `derived` 字段暴露权限 helper。
- [x] 3.2 更新认证路由守卫以使用新的 auth context 结构。
- [x] 3.3 更新菜单显隐逻辑以使用新的权限 helper（当前壳未新增 admin 菜单，后续管理端菜单接入同一 helper）。

## 4. 验证

- [x] 4.1 增加密码登录、refresh、logout 和 `/me` 失败处理测试。
- [x] 4.2 增加 gateway 模式不调用 refresh 且不手动附加 gateway header 的测试。
- [x] 4.3 运行 typecheck 和认证相关定向测试。
- [x] 4.4 更新 mock runtime，支持二阶段 `/api/auth/login`、`/api/auth/me`、`/api/auth/logout`。
