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
