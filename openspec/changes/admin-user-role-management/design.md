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
