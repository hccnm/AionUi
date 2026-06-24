## Why

后端在新版二阶段接口文档中收敛了 SaaS 契约：认证改为纯 Bearer token、所有 REST 响应统一 envelope、列表数据返回数组、资源和 execution 路由也调整到新版命名。当前前端仍按上一版契约调用多个接口，继续联调会出现登录字段、权限结构、分页形态、文件接口和 execution 子资源不匹配。

## What Changes

- 同步认证契约：登录请求使用 `username`，登录和 refresh 从 `{ code, message, data, trace_id }` 中读取 token，`GET /api/auth/me` 解析扁平用户、角色、`permission_flags` 和 `is_admin`。
- 同步通用响应契约：二阶段 adapter 只按新版 envelope 解析，列表接口按 `data: []` 处理，不再把分页对象作为后端主契约。
- 同步管理员接口：用户状态改 `POST`，重置密码字段改 `password`，新增用户 sync-status、权限字典、角色状态和角色-用户增删接口。
- 同步资源接口：SSH/Git 路由切到 `/api/git/**`，Git 项目字段切到 `display_name`、`repo_ssh_url`、`credential_id`、`default_branch`，Workspace 字段切到 `source_type`、`branch_ref`、`root_rel_path`。
- 同步 Workspace 文件接口：所有 SaaS 文件操作使用 `/files/list|read|write|mkdir|rename|delete|upload` POST action，并用 `relative_path` 作为唯一路径输入。
- 同步 execution/runtime 接口：创建 payload 使用 `execution_type`，cancel/status/artifacts 改为 `/api/executions/{execution_id}/**`，不再调用当前后端未开放的 detail、redeploy shortcut、artifact download 和 approve-retry。
- 同步事件流策略：当前后端未开放 events，前端先用 execution/artifact 轮询展示状态；WebSocket 仅作为旧系统兼容，不作为新版页面主依赖。
- **BREAKING**：前端二阶段实现不再兼容历史 `{ success, ... }` 响应、不再发送或读取 CSRF token、不再调用旧 `/api/git-projects`、`/api/ssh-credentials`、旧文件 REST 路由和旧 workspace-scoped execution 子资源。

## Capabilities

### New Capabilities

- `phase2-backend-contract`: 覆盖新版二阶段后端契约在前端的统一解析、认证、管理员、资源、文件、conversation 和 execution/runtime 对接行为。

### Modified Capabilities

- None.

## Impact

- 影响前端二阶段 API adapter：`auth/phase2.ts`、`adminAccessControl.ts`、`workspaceResources.ts`、`workspaceRuntime.ts` 和相关页面调用。
- 影响 mock runtime 与测试，尤其是 `authPhase2`、`adminAccessControl`、`workspaceResources`、`workspaceRuntime`、`mockRuntime` 和 conversation workspace 相关测试。
- 影响运行态 UI 能力展示：未开放的 artifact download、approve retry、redeploy shortcut 和 execution detail 需要禁用或转为新版替代行为。
- 依赖后端按 `/Users/z/Downloads/frontend-api-contract(1).md` 部署新版契约；如果测试环境仍返回旧 `{ success, ... }`，需要后端先完成部署或单独声明临时兼容策略。
