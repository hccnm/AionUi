---
comet_change: admin-user-role-management
role: technical-design
canonical_spec: openspec
---

# Admin User Role Management Design

## Context

二阶段 SaaS 前端需要在同一应用壳内提供组织级用户和角色管理。后端不返回菜单树，前端使用本地路由和 `GET /api/auth/me` 返回的 `permission_flags`/`derived` 判断入口显隐。直接访问管理路由时，后端 403 仍是最终安全边界，前端需要展示 forbidden 状态。

## Decisions

- 新增 `adminAccessControl` adapter，集中处理 `/api/admin/users/**` 与 `/api/admin/roles/**` envelope、403、409、validation 和 business error。
- 管理入口通过 `useAuth()` 的 `hasAnyPermission` 与 `derived.can_manage_users/can_manage_roles` 判断；不新增后端菜单依赖。
- 路由使用 `/settings/admin/users` 和 `/settings/admin/roles`，复用现有 Settings 页面壳，降低布局和导航改动。
- 用户管理支持列表、启停、管理员重置密码、角色分配；不实现用户创建/删除。
- 角色管理支持列表、创建、更新；`is_system` 角色默认禁用编辑。
- API 403 映射为 `AdminForbiddenError`，页面展示无权限状态；冲突和校验错误展示后端 message。

## UI Scope

- Settings sider 和移动端 settings wrapper 增加基于权限的 Admin Users / Admin Roles 入口。
- 用户页面展示分页用户、状态、角色、外部身份、时间字段，并提供启停、reset password 和角色分配。
- 角色页面展示角色、权限摘要、系统角色保护，以及 create/update 表单。

## Testing

- Adapter tests 覆盖用户列表、状态更新、reset-password、角色分配、角色创建/更新，以及 403/409/validation error。
- Permission tests 覆盖管理入口显隐和 forbidden 判断 helper。
- Mock runtime tests 覆盖 admin users/roles endpoints。
- 运行 `npm run typecheck` 和管理相关定向测试。
