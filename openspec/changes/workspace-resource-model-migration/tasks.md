## 1. 资源 API 层

- [x] 1.1 新增 SSH 凭据 API 方法和类型。
- [x] 1.2 新增 Git 项目 API 方法和类型。
- [x] 1.3 新增 Workspace API 方法和类型，包括 `PATCH /api/workspaces/{id}`。
- [x] 1.4 为资源接口增加 envelope-aware 错误处理。

## 2. 资源页面

- [x] 2.1 实现 SSH 凭据列表、上传、生成和删除流程。
- [x] 2.2 实现 Git 项目列表、创建、验证、同步和删除流程。
- [x] 2.3 实现 Workspace 列表、创建、详情、重命名、归档、恢复和删除流程。

## 3. 会话迁移

- [x] 3.1 将 Guid 工作区文件夹选择替换为 SaaS Workspace 选择。
- [x] 3.2 将会话创建 payload 改为发送 `workspace_id`。
- [x] 3.3 移除 SaaS 对 `extra.workspace` 绝对路径字段的写入。
- [x] 3.4 更新历史分组和标签展示以使用 Workspace 资源数据。

## 4. 安全与验证

- [x] 4.1 审计 UI 中服务器绝对路径展示。
- [x] 4.2 增加 SSH 凭据提交后清空 secret 的测试。
- [x] 4.3 增加基于 workspace-id 创建会话的测试。
- [x] 4.4 运行 typecheck 和 Workspace resource 相关定向测试。
