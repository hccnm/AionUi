## ADDED Requirements

### Requirement: Workspace 作用域文件

前端 SHALL 通过 Workspace 作用域 API 使用 `workspace_id` 和 relative path 执行 SaaS 文件列表、内容读取、内容写入、mkdir、rename、delete 和 upload 操作。

#### Scenario: 读取 Workspace 文件

- **WHEN** 用户打开 Workspace 中的文件
- **THEN** 前端使用 workspace ID 和 relative path 请求内容，并只展示安全路径标签

#### Scenario: 写入冲突

- **WHEN** 文件写入因 `base_version` 返回版本冲突
- **THEN** 前端提示用户重新加载或解决冲突后再重试

### Requirement: Workspace 作用域终端

前端 SHALL 通过 Workspace 作用域终端 API 使用 `workspace_id` 和 relative path 创建终端会话。

#### Scenario: 启动终端

- **WHEN** 用户从 Workspace 启动终端
- **THEN** 前端发送 `workspace_id` 和 workspace-relative path

### Requirement: Execution 生命周期

前端 SHALL 支持为 Workspace 创建、列表展示、查看、取消和 redeploy TestRun 与 PreviewEnv 类型的 execution。

#### Scenario: 创建 TestRun

- **WHEN** 用户从 Workspace 启动测试运行
- **THEN** 前端在该 Workspace 下创建 execution，并展示返回的 execution ID 和状态

#### Scenario: Redeploy PreviewEnv

- **WHEN** 用户 redeploy preview execution
- **THEN** 前端调用 redeploy endpoint，并跟踪后端返回的新 execution ID

### Requirement: WebSocket execution events

前端 SHALL 使用 WebSocket 作为 execution status、logs、artifacts、preview updates、AI retry loop events 和 human approval states 的主事件流。

#### Scenario: Execution 状态更新

- **WHEN** WebSocket event 报告 execution 状态变化
- **THEN** 前端更新 execution 详情视图，而不要求整页刷新

#### Scenario: 需要人工审批

- **WHEN** execution event 报告需要 retry approval
- **THEN** 前端为该 execution 展示 approve 和 cancel 操作

### Requirement: Artifact 处理

前端 SHALL 通过后端受控 artifact API 列出和下载 artifact，并且 MUST NOT 直接访问内部对象存储或运行时基础设施地址。

#### Scenario: 下载 Artifact

- **WHEN** 用户下载 artifact
- **THEN** 前端使用后端提供的 download URL，并按正常鉴权处理

### Requirement: 运行时信息隐藏

前端 MUST NOT 展示服务器绝对路径、Kubernetes namespace、pod IP、container address、随机宿主端口或其他内部运行时基础设施标识。

#### Scenario: Preview 运行中

- **WHEN** preview environment 可用
- **THEN** 前端只展示公开 preview URL 和过期时间元数据
