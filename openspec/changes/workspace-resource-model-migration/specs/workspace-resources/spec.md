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
