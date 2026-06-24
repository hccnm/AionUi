## 1. Contract Tests

- [x] 1.1 更新 auth 测试，覆盖 `username` 登录、`data.token`、扁平 `/api/auth/me`、`is_admin` 和 wildcard 权限。
- [x] 1.2 更新 admin 测试，覆盖数组列表、POST status、`password` reset、permissions 字典、sync-status 和 role-user add/remove。
- [x] 1.3 更新 resource 测试，覆盖 `/api/git/ssh-credentials`、`/api/git/projects`、新版 Git/Workspace 字段和禁用 SSH delete。
- [x] 1.4 更新 runtime 测试，覆盖文件 POST action、`execution_type`、global `/api/executions/{id}/**`、禁用 detail/redeploy/download/approve-retry。
- [x] 1.5 更新 mock runtime 测试，确保本地 mock 只暴露新版二阶段契约。

## 2. Auth And Envelope

- [x] 2.1 将二阶段 envelope 类型改为 numeric `code`、nullable `trace_id`，并统一错误 `message`/`trace_id` 提取。
- [x] 2.2 将登录请求 body 从 `phone` 改为 `username`，登录/refresh 响应只从 `data.token` 读取 token。
- [x] 2.3 将 `Phase2CurrentUser` 改为扁平模型，并从 `is_admin` 派生前端便捷字段。
- [x] 2.4 更新权限 helper，支持 `permission_flags` 和角色 `permissions` 中的 `*` wildcard。
- [x] 2.5 确认二阶段请求不读取或发送 CSRF token。

## 3. Admin Contract

- [x] 3.1 将 admin 列表解析从后端分页对象改为后端数组，并在 adapter 层保持页面可消费的数据形态。
- [x] 3.2 将用户状态更新改为 `POST /api/admin/users/{user_id}/status`。
- [x] 3.3 将管理员重置密码 payload 改为 `{ password }`。
- [x] 3.4 新增 `GET/POST /api/admin/users/{user_id}/sync-status` adapter 方法。
- [x] 3.5 新增 `GET /api/admin/permissions` adapter 方法并更新角色权限字段为 `permissions`。
- [x] 3.6 将角色启停和用户角色分配改为 `/api/admin/roles/{role_id}/status` 与 `/api/admin/roles/{role_id}/users/{user_id}`。

## 4. Resource And Workspace Contract

- [x] 4.1 将 SSH 凭据路由切换到 `/api/git/ssh-credentials/**`，并适配 generate 返回 `{ credential, public_key }`。
- [x] 4.2 移除或禁用前端 SSH 凭据删除能力。
- [x] 4.3 将 Git 项目路由切换到 `/api/git/projects/**`，字段改为 `display_name`、`repo_ssh_url`、`credential_id`、`default_branch`。
- [x] 4.4 新增 Git 项目 update/archive 方法，移除 verify shortcut 调用。
- [x] 4.5 将 Workspace 字段改为 `source_type`、`git_project_id`、`branch_ref`、`root_rel_path`，并避免展示 `root_rel_path`。
- [x] 4.6 确保 Workspace create 支持 blank 与 git_project 两种 source_type。

## 5. Files Conversation Runtime Contract

- [x] 5.1 将文件 list/read/write/mkdir/rename/delete/upload 全部改为 POST action 路由和 `relative_path` payload。
- [x] 5.2 将文件类型从 `path/type/modified_at/base_version` 映射到新版 `relative_path/kind/updated_at/version`。
- [x] 5.3 确保 conversation create 和 clone-create 在 SaaS 模式传顶层 `workspace_id`，不提交 `extra.workspace` 作为可信来源。
- [x] 5.4 将 terminal 创建 payload 改为 `relative_path`，避免展示真实服务器目录。
- [x] 5.5 将 execution 创建 payload 从 `kind` 改为 `execution_type`，并适配新版状态集合。
- [x] 5.6 将 cancel/status/artifacts 改为 `/api/executions/{execution_id}/**`，artifact 只展示 metadata 和 `ref_`。
- [x] 5.7 将 redeploy 映射为重新创建 `preview_env` execution，禁用 artifact download 和 approve-retry 直接调用。
- [x] 5.8 将新版 runtime 状态刷新改为 execution/artifact 轮询，保留 SSE 未来接入位。

## 6. Verification

- [x] 6.1 更新 mock runtime 中所有二阶段接口到新版路由、字段和 envelope。
- [x] 6.2 运行定向测试：auth、admin、resources、runtime、mock runtime、conversation params。
- [x] 6.3 运行 `npm run typecheck`。
- [x] 6.4 运行 `npx openspec validate phase2-backend-contract-sync --strict`。
