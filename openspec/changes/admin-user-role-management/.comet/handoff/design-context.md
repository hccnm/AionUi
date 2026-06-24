# Comet Design Handoff

- Change: admin-user-role-management
- Phase: design
- Mode: compact
- Context hash: b8faade1e7ca9d13025ae5812d3cd2c927e34e64b2adceaca1dc59d9ed7c5b8f

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/admin-user-role-management/proposal.md

- Source: openspec/changes/admin-user-role-management/proposal.md
- Lines: 1-27
- SHA256: 43e9d5b6d13e0a6f87e8c520a99c7ba50521b966dd6a4740c382288217b35b2c

```md
## Why

二阶段需要在 SaaS 前端内提供组织级管理能力。管理员需要管理用户、角色和权限配置，同时前端不能依赖后端返回菜单树。

## What Changes

- 新增用户列表、用户启停、管理员重置密码和用户角色分配流程。
- 新增角色列表、角色创建和角色更新流程。
- 管理入口根据 `GET /api/auth/me` 返回的当前用户权限展示。
- 前端隐藏入口只是体验优化，后端 403 仍是安全边界。
- **BREAKING**：SaaS 管理导航不得依赖后端菜单树。

## Capabilities

### New Capabilities

- `admin-access-control`: 覆盖用户管理、角色管理、角色分配和基于权限的管理应用壳行为。

### Modified Capabilities

- None.

## Impact

- 影响前端路由注册、侧边导航、管理页、表格/分页状态、表单、权限 helper，以及 `/api/admin/users/**`、`/api/admin/roles/**` 的 API adapter。
- 该 change 依赖 auth shell 提供 roles、permission flags 和 derived 权限快捷字段。
- 当前用户菜单判断使用 `GET /api/auth/me` 返回的最终权限；角色配置展示和编辑使用角色接口返回的数据。
```

## openspec/changes/admin-user-role-management/design.md

- Source: openspec/changes/admin-user-role-management/design.md
- Lines: 1-53
- SHA256: d7af2d3ee53257966248c510239fe592d1f8af03ab08dd74788c92d9750190df

```md
## Context

二阶段后端契约要求管理员功能仍在同一套前端内展示。后端不返回菜单树，前端需要使用本地路由配置，并结合 `GET /api/auth/me` 返回的当前用户权限决定入口显隐。

## Goals / Non-Goals

**Goals:**

- 新增 SaaS 管理路由，覆盖用户管理和角色管理。
- 支持管理员查看用户、启用/禁用用户、重置用户密码、分配用户角色。
- 支持管理员查看角色、创建角色、更新角色配置。
- 权限判断优先使用 `permission_flags`，稳定的 `derived` 字段可用于常见入口显隐。

**Non-Goals:**

- 不新增后端驱动菜单系统。
- 不把前端隐藏入口视为安全边界。
- 不在本 change 中实现 workspace、Git project 或 execution 管理。
- 不把个人 change-password 与管理员 reset-password 合并。

## Decisions

- Decision: 管理入口显隐来自 auth shell 的当前用户权限 payload。
  Rationale: 这样启动应用壳时不需要额外加载角色列表，并且符合 `/api/auth/me` 返回最终权限的后端契约。
  Alternative considered: 渲染管理壳前先加载角色列表。拒绝原因是角色列表描述可配置的角色定义，不一定等于当前用户的最终权限状态。

- Decision: 角色配置使用角色 API，不使用 `/api/auth/me`。
  Rationale: `/api/auth/me` 返回的是当前用户有效权限；角色列表/详情接口才是可编辑角色定义和权限配置来源。

- Decision: 管理路由需要清晰展示后端授权错误。
  Rationale: 隐藏菜单只是 UX，直接访问 URL 时必须以后端 403 为准并展示无权限状态。

- Decision: 暂不假设二阶段包含用户创建和用户删除。
  Rationale: 后端文档列出了列表、启停、重置密码和角色分配，没有列出用户创建/删除。若后端确认可后续补充。

## Risks / Trade-offs

- [Risk] 权限 flag 可配置列表来源不明确 -> Mitigation: 当前用户判断只用 `/api/auth/me`，可编辑角色权限优先使用角色接口返回的数据。
- [Risk] 系统角色被误编辑 -> Mitigation: 对 `is_system` 角色默认做保护，除非后端明确允许某项操作。
- [Risk] 管理表单与后端校验规则漂移 -> Mitigation: 展示统一 envelope 的 validation 错误，并保留后端 message。

## Migration Plan

1. 新增 admin API client。
2. 新增管理路由组和基于权限 helper 的导航入口。
3. 实现用户管理列表和操作。
4. 实现角色管理列表和编辑器。
5. 增加直接访问 403 状态和定向测试。

## Open Questions

- 二阶段是否包含用户创建，还是只管理 seed/open-platform 同步出来的用户？
- 是否存在独立权限 catalog 接口，还是角色接口就是可编辑权限来源？
```

## openspec/changes/admin-user-role-management/tasks.md

- Source: openspec/changes/admin-user-role-management/tasks.md
- Lines: 1-30
- SHA256: 64e5f03ae9e8487074357add5a2e4ecc68285d08141280825338529e9092917b

```md
## 1. API 层

- [ ] 1.1 新增用户列表、状态更新、重置密码和角色分配 API 方法。
- [ ] 1.2 新增角色列表、创建和更新 API 方法。
- [ ] 1.3 增加管理接口的 validation、forbidden、conflict 和 business error 统一处理。

## 2. 路由与导航

- [ ] 2.1 新增用户和角色管理路由组。
- [ ] 2.2 新增基于 auth 权限 helper 的管理导航入口。
- [ ] 2.3 新增直接访问时的 forbidden 和 not-found 状态。

## 3. 用户管理 UI

- [ ] 3.1 实现用户分页列表，展示状态、角色、外部身份和时间字段。
- [ ] 3.2 实现启用/禁用用户流程。
- [ ] 3.3 实现管理员重置密码流程。
- [ ] 3.4 实现用户角色分配流程。

## 4. 角色管理 UI

- [ ] 4.1 实现角色分页列表和权限摘要。
- [ ] 4.2 实现角色创建/更新表单。
- [ ] 4.3 对系统角色编辑进行保护或禁用，除非后端明确允许。

## 5. 验证

- [ ] 5.1 增加管理路由显隐和 forbidden 状态测试。
- [ ] 5.2 增加用户和角色 API adapter 测试。
- [ ] 5.3 运行 typecheck 和管理相关定向测试。
```

## openspec/changes/admin-user-role-management/specs/admin-access-control/spec.md

- Source: openspec/changes/admin-user-role-management/specs/admin-access-control/spec.md
- Lines: 1-47
- SHA256: 1ec2a1d4bf03e4183a0b9106bc6a19cebeace31f41d11fdfa1d63ff1b6f8a6a0

```md
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
```

