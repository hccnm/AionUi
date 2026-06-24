# Brainstorm Summary

- Change: saas-auth-shell-permissions
- Date: 2026-06-18

## 已确认事实

- SaaS 模式最终替换桌面/local 能力，二阶段 SaaS 前端主路径不保留本地路径或本地 setup 能力。
- `GET /api/auth/me` 是业务登录态、当前用户、角色和权限的唯一判断入口。
- `/api/auth/status` 可以保留为兼容、健康探测或首次安装展示，但不得驱动 SaaS 菜单、路由或登录态。
- 密码登录模式使用 Aion JWT，前端保存 token，并且 refresh 只服务 Aion 自己签发的 JWT。
- Gateway 模式由 gateway 自己维护登录态和续期，前端不调用 Aion refresh，不构造 `X-Gateway-*` header。
- `permission_flags` 是长期权限契约，`derived` 是稳定便捷字段。
- `change-password` 保留为用户修改自己密码，管理员 reset-password 是独立能力。

## 候选技术方案

- 候选 A：最小替换现有 `AuthContext`，直接把旧 endpoint 改成新 endpoint。
- 候选 B：引入 phase2 auth contract/adapter，把 endpoint、envelope、session shape、permission helper 和 mode 行为集中处理，再让 `AuthContext` 变薄。
- 候选 C：并行保留 legacy auth 与 phase2 auth 两套 provider，通过运行模式切换。

## 已确认技术方向

采用候选 B：引入 phase2 auth contract/adapter，把 endpoint、envelope、session shape、permission helper 和 mode 行为集中处理，再让 `AuthContext` 变薄。

该方案比最小替换更能控制新旧响应格式、gateway/password 分支、权限 helper 和后续 admin/workspace 依赖；同时又不保留两套完整 provider，避免继续扩大 legacy 分支。

## 已确认接口边界

- 密码登录模式的 SaaS 前端登出路由统一使用 `POST /api/auth/logout`；旧 `/logout` 只作为后端兼容，不进入二阶段前端主实现。
- Gateway 登出 URL 由部署配置提供；如果未配置，前端只清本地状态并回到登录页，不通知 Aion 后端登出 gateway 会话。

## 确认的技术方案

采用候选 B：新增 phase2 auth contract/adapter 作为二阶段认证契约边界。该 adapter 统一封装 endpoint、envelope 解析、session shape、login mode、token refresh、logout 和权限 helper；`AuthContext` 只负责状态编排和对 UI 暴露稳定 API。

## 关键取舍与风险

- 多加一层 adapter 会增加初始结构，但能将新旧响应格式、password/gateway 分支、权限 helper 和后续 admin/workspace 依赖收敛到一个边界。
- 旧 auth 端点和 `setup_required` 逻辑可能仍残留在登录页、路由守卫或账号设置入口，需要在实现阶段专项审计。
- Gateway 登出无法由 Aion 后端完成，只能走部署配置 URL 或清理前端状态。

## 测试策略

- auth session store 单元测试：完整用户、roles、permission flags、derived、login mode、token 的读写和降级解析。
- auth HTTP 单元测试：password 模式 attach token 和 refresh；gateway 模式不 refresh、不造 gateway header。
- AuthContext 流程测试：`/me` 成功、401、403、refresh 成功/失败、logout 分支。
- 路由/菜单测试：只用 auth context 的权限 helper 决定入口显隐。

## Spec Patch

暂无候选 Spec Patch。
