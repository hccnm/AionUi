## Why

二阶段将 Workspace 定义为长期 SaaS 开发资产。前端必须从可信服务器绝对路径模型迁移到 `workspace_id` 模型，并基于 Workspace 资源创建会话、展示文件和进入项目。

## What Changes

- 新增当前用户自己的 SSH 凭据管理。
- 新增用户自有 Git 项目管理。
- 新增 Workspace 列表、创建、详情、重命名、归档、恢复和删除流程。
- SaaS 会话创建改为要求 `workspace_id`，不再使用 `extra.workspace` 绝对路径。
- Workspace 展示只使用 `display_path`、`relative_path` 等安全字段，不展示服务器绝对路径。
- **BREAKING**：SaaS 前端不得把 `extra.workspace` 绝对路径作为可信 workspace 来源。

## Capabilities

### New Capabilities

- `workspace-resources`: 覆盖 SSH 凭据、Git 项目、Workspace 生命周期和基于 `workspace_id` 的会话创建。

### Modified Capabilities

- None.

## Impact

- 影响 Guid 工作区选择、conversation 创建、历史分组、workspace 标签、API adapter、mock runtime，以及所有当前把 workspace 当文件系统路径处理的代码路径。
- 该 change 依赖 auth shell 提供当前用户和权限状态。
- Workspace 重命名需要后端契约补充 `PATCH /api/workspaces/{id}`，至少支持更新 `name`。
