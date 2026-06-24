---
comet_change: workspace-resource-model-migration
role: technical-design
canonical_spec: openspec
---

# Workspace 资源模型迁移技术设计

## 背景

AionWeb 当前会话创建和工作区展示仍围绕 `extra.workspace` 绝对路径。二阶段 SaaS 模式将 Workspace 定义为长期开发资产，前端必须改用后端分配的 `workspace_id`，并通过 Workspace 资源 API 获取安全展示字段。

## 目标

- 新增 SSH 凭据、Git 项目和 Workspace 生命周期 API adapter。
- 新会话创建使用 `workspace_id`，不再写入 `extra.workspace` 绝对路径。
- Guid 首页从本地文件夹选择迁移到 Workspace 选择。
- Workspace 展示只使用 `display_path`、仓库名、branch、relative path 等安全字段。
- SSH private key 和 passphrase 只存在于提交表单内，提交完成后必须清空。

## 非目标

- 不实现 execution、terminal、preview、artifact 或运行态日志 UI。
- 不实现组织级项目管理。
- 不让前端读取、下载或持久化 SSH private key。
- 不把旧绝对路径历史作为 SaaS 新会话的可信输入。

## 采用方案

新增 `workspaceResources` adapter 作为二阶段资源契约边界，集中处理 envelope、错误、类型和 endpoint。UI 通过该 adapter 消费 SSH credentials、Git projects 和 Workspaces。会话创建链路扩展 `workspace_id` 字段，并在 HTTP mapper 中避免为 SaaS 新流程写入 `extra.workspace`。

## 模块边界

- `src/aionui/common/resources/workspaceResources.ts`: 资源类型、统一 envelope 解析、SSH/Git/Workspace API 方法。
- Guid 页面: 加载可用 Workspace，选择未归档 Workspace 后创建会话。
- Resource pages: 提供 SSH credential、Git project、Workspace 的基础生命周期操作。
- Mock runtime: 提供二阶段资源 endpoints，支撑本地 intercept 模式和测试。

## 数据安全

SSH private key/passphrase 不进入 localStorage、session store 或全局配置。上传表单完成后清空 secret 状态。Workspace UI 不展示服务器绝对路径，若后端返回 legacy path 也只作为内部兼容字段，不在二阶段资源列表中展示。

## 验证

- Adapter 单测覆盖 envelope 解析、workspace rename、SSH secret 提交流程。
- 会话创建单测覆盖 `workspace_id` payload 且不写入 `extra.workspace`。
- Mock runtime 测试覆盖 workspace-id 创建会话。
- 运行 typecheck 和资源相关定向测试。
