## Why

二阶段需要在 SaaS 前端内提供组织级管理能力。管理员需要管理用户、角色和权限配置，同时前端不能依赖后端返回菜单树。

## What Changes

- 新增用户列表、用户启停、管理员重置密码和用户角色分配流程。
- 新增角色列表、角色创建和角色更新流程。
- 管理入口根据 `GET /api/auth/me` 返回的当前用户权限展示。
- 前端隐藏入口只是体验优化，后端 403 仍是安全边界。
- **BREAKING**：SaaS 管理导航不得依赖后端菜单树。

## Capabilities

### New Capabilities

- `admin-access-control`: 覆盖用户管理、角色管理、角色分配和基于权限的管理应用壳行为。

### Modified Capabilities

- None.

## Impact

- 影响前端路由注册、侧边导航、管理页、表格/分页状态、表单、权限 helper，以及 `/api/admin/users/**`、`/api/admin/roles/**` 的 API adapter。
- 该 change 依赖 auth shell 提供 roles、permission flags 和 derived 权限快捷字段。
- 当前用户菜单判断使用 `GET /api/auth/me` 返回的最终权限；角色配置展示和编辑使用角色接口返回的数据。
