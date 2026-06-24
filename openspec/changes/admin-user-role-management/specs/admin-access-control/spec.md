## ADDED Requirements

### Requirement: 管理应用壳显隐

前端 SHALL 基于 `GET /api/auth/me` 返回的当前用户 `permission_flags` 和稳定 `derived` 权限字段展示管理导航入口。

#### Scenario: 用户可以管理用户

- **WHEN** 当前用户具备用户管理权限
- **THEN** 前端展示用户管理入口

#### Scenario: 用户没有管理权限

- **WHEN** 当前用户不具备管理权限
- **THEN** 前端隐藏管理入口，同时后端授权仍是最终安全边界

### Requirement: 用户管理

前端 SHALL 使用 `/api/admin/users/**` 提供管理员用户列表、状态更新、密码重置和角色分配流程。

#### Scenario: 管理员禁用用户

- **WHEN** 管理员为用户提交 disabled 状态和原因
- **THEN** 前端调用用户状态接口，并在成功后刷新用户列表

#### Scenario: 管理员重置密码

- **WHEN** 管理员为其他用户提交新密码
- **THEN** 前端调用 admin reset-password，而不使用个人 change-password

### Requirement: 角色管理

前端 SHALL 使用 `/api/admin/roles/**` 提供角色列表、角色创建和角色更新流程。

#### Scenario: 管理员更新角色权限

- **WHEN** 管理员编辑角色 permission flags 并提交表单
- **THEN** 前端将更新后的角色 payload 发送到角色 API，并在成功后刷新角色数据

### Requirement: 后端授权边界

前端 MUST 将后端 403 响应视为管理 API 和管理路由的最终安全边界。

#### Scenario: 无权限直接访问路由

- **WHEN** 用户直接打开管理路由但页面数据接口返回 403
- **THEN** 前端展示无权限状态，而不是假设隐藏导航已经足够
