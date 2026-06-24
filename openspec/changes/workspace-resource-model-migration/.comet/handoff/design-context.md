# Comet Design Handoff

- Change: workspace-resource-model-migration
- Phase: design
- Mode: compact
- Context hash: 9bed2f1626828101c310f4f20e22732a8dda9e6cf747dbd3428913086f7c023b

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/workspace-resource-model-migration/proposal.md

- Source: openspec/changes/workspace-resource-model-migration/proposal.md
- Lines: 1-28
- SHA256: eaa56fb83c2511e4fa95a7d4bca4048dd2967c51b8bbef75fc2573466f3efd74

```md
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
```

## openspec/changes/workspace-resource-model-migration/design.md

- Source: openspec/changes/workspace-resource-model-migration/design.md
- Lines: 1-60
- SHA256: 96a5f47b6a0abe85d0047fd23feb69a9061d078bb3243c887eb25ddc61fe0750

```md
## Context

当前前端在 conversation `extra.workspace` 中传递本地或服务器路径。二阶段 SaaS 模式将其替换为用户自有资源：SSH 凭据、Git 项目和以 string ID 标识的 Workspace。

用户已确认 SaaS 模式最终替换桌面/local 能力。二阶段 SaaS UI 应迁移到以 `workspace_id` 为可信来源，而不是在新流程中保留本地路径行为。

## Goals / Non-Goals

**Goals:**

- 新增 SSH 凭据和 Git 项目资源页面。
- 新增 Workspace 生命周期页面，包括通过 `PATCH /api/workspaces/{id}` 重命名。
- SaaS 会话创建必须使用 `workspace_id`。
- 只展示 `display_path`、`relative_path`、仓库显示名和 branch 等安全标签。

**Non-Goals:**

- 不在本 change 中实现 execution、preview、artifact 或运行态日志 UI。
- 不保留基于绝对路径的 SaaS 会话创建。
- 不在前端持久化 SSH private key 或 passphrase。
- 不实现组织级统一项目管理。

## Decisions

- Decision: SaaS 会话创建必须传 `workspace_id`。
  Rationale: Workspace 的 provisioning 和隔离边界由后端掌控，绝对路径不是稳定也不安全的前端契约。
  Alternative considered: 保留 `extra.workspace` 作为兼容来源。拒绝原因是 SaaS 中继续保留了可信路径输入。

- Decision: Workspace 管理包含重命名。
  Rationale: 后端文档漏列 update，但已确认二阶段至少应支持更新 workspace `name`。长期 workspace 需要用户可控标签。
  Alternative considered: 名称只能创建时设置。拒绝原因是长期资产需要可维护命名。

- Decision: SSH 凭据是个人资源。
  Rationale: 管理员不能读取或下载用户私钥，前端上传/生成后必须丢弃私钥和 passphrase。

- Decision: Git 项目是用户自有仓库引用。
  Rationale: 二阶段不需要后台统一项目管理，用户通过自己的 SSH 凭据绑定自己的 Git 项目记录。

- Decision: 旧路径历史不是 SaaS 可信输入。
  Rationale: 老会话可能只有绝对路径，但新 SaaS 流程不得继续写入或信任它。迁移或只读兼容应放在新前端主路径之外处理。

## Risks / Trade-offs

- [Risk] 现有组件普遍期望 workspace 是 path string -> Mitigation: 先引入 Workspace resource 类型，在边界处替换，再深入迁移消费者。
- [Risk] 历史会话没有 workspace ID -> Mitigation: 实施前明确迁移、只读或不可继续使用策略。
- [Risk] SSH 密钥材料可能被表单 helper 泄漏到本地存储 -> Mitigation: 隔离 secret 字段，提交完成后立即清空。
- [Risk] Git 验证和同步可能是异步过程 -> Mitigation: UI 建模 project status、last_verified_at 和 last_synced_at。

## Migration Plan

1. 新增 SSH 凭据、Git 项目和 Workspace 的 API client 与类型。
2. 新增资源管理页面和安全展示标签。
3. 将 Guid 工作区选择器替换为 Workspace 选择。
4. 将 conversation 创建 payload 改为发送 `workspace_id`。
5. 移除 SaaS 路径中对 `extra.workspace` 绝对路径的写入。

## Open Questions

- 只有绝对 workspace 路径的历史会话最终是迁移、只读，还是不可继续使用？
- Git project 更新是否属于二阶段，还是 create/verify/sync/delete 已足够？
```

## openspec/changes/workspace-resource-model-migration/tasks.md

- Source: openspec/changes/workspace-resource-model-migration/tasks.md
- Lines: 1-26
- SHA256: 02ed4e73c3bfafb9f3c0273a0a8d73ed79fce4ae41368372e55b459e692f738d

```md
## 1. 资源 API 层

- [ ] 1.1 新增 SSH 凭据 API 方法和类型。
- [ ] 1.2 新增 Git 项目 API 方法和类型。
- [ ] 1.3 新增 Workspace API 方法和类型，包括 `PATCH /api/workspaces/{id}`。
- [ ] 1.4 为资源接口增加 envelope-aware 错误处理。

## 2. 资源页面

- [ ] 2.1 实现 SSH 凭据列表、上传、生成和删除流程。
- [ ] 2.2 实现 Git 项目列表、创建、验证、同步和删除流程。
- [ ] 2.3 实现 Workspace 列表、创建、详情、重命名、归档、恢复和删除流程。

## 3. 会话迁移

- [ ] 3.1 将 Guid 工作区文件夹选择替换为 SaaS Workspace 选择。
- [ ] 3.2 将会话创建 payload 改为发送 `workspace_id`。
- [ ] 3.3 移除 SaaS 对 `extra.workspace` 绝对路径字段的写入。
- [ ] 3.4 更新历史分组和标签展示以使用 Workspace 资源数据。

## 4. 安全与验证

- [ ] 4.1 审计 UI 中服务器绝对路径展示。
- [ ] 4.2 增加 SSH 凭据提交后清空 secret 的测试。
- [ ] 4.3 增加基于 workspace-id 创建会话的测试。
- [ ] 4.4 运行 typecheck 和 Workspace resource 相关定向测试。
```

## openspec/changes/workspace-resource-model-migration/specs/workspace-resources/spec.md

- Source: openspec/changes/workspace-resource-model-migration/specs/workspace-resources/spec.md
- Lines: 1-56
- SHA256: f775515529a8bb6722aa2f681589647c1e0038805591bb7abbf83a1057a49a29

```md
## ADDED Requirements

### Requirement: SSH 凭据管理

前端 SHALL 允许用户列出、上传、生成和删除自己的 SSH 凭据，并且不得在前端持久化 private key 或 passphrase。

#### Scenario: 上传私钥

- **WHEN** 用户上传 SSH private key 和可选 passphrase
- **THEN** 前端提交到凭据 API，并在完成后清空 secret 表单状态

#### Scenario: 生成公钥

- **WHEN** 用户生成 SSH key pair
- **THEN** 前端展示后端返回的 public key 供用户绑定到 Git 托管平台，并且不期望下载 private key

### Requirement: Git 项目管理

前端 SHALL 允许用户使用自己选择的 SSH 凭据列出、创建、验证、同步和删除自己的 Git 项目。

#### Scenario: Git 验证失败

- **WHEN** Git 项目创建或验证返回业务校验错误
- **THEN** 前端展示后端脱敏后的错误信息，不暴露敏感细节

### Requirement: Workspace 生命周期

前端 SHALL 允许用户列出、创建、查看、重命名、归档、恢复和删除 Workspace。

#### Scenario: 重命名 Workspace

- **WHEN** 用户更新 Workspace 名称
- **THEN** 前端调用 `PATCH /api/workspaces/{id}`，并在成功后刷新 Workspace 展示

#### Scenario: 已归档 Workspace

- **WHEN** Workspace 处于 archived 状态
- **THEN** 前端禁止从该 Workspace 新建开发会话，但仍允许被许可的只读视图

### Requirement: Workspace ID 创建会话

SaaS 前端 MUST 使用 `workspace_id` 创建开发会话，并且 MUST NOT 将 `extra.workspace` 绝对路径作为可信来源。

#### Scenario: 从 Workspace 创建会话

- **WHEN** 用户从选中的 Workspace 启动新的开发会话
- **THEN** 前端在会话创建请求中发送 `workspace_id`

### Requirement: 安全 Workspace 展示

前端 MUST 只展示 `display_path`、仓库显示名、branch 或 relative path 等安全 Workspace 标签，并且 MUST NOT 暴露服务器绝对路径。

#### Scenario: 渲染 Workspace 行

- **WHEN** 渲染 Workspace 列表项
- **THEN** 前端展示安全显示字段并隐藏服务器文件系统位置
```

