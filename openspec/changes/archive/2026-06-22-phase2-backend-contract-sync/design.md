## Context

新版后端文档将二阶段接口从“建议契约”收敛为“真实后端契约”。当前前端是在上一版 OpenSpec change 基础上实现的，仍保留旧字段和旧路由：登录提交 `phone`、当前用户期望 `{ user, roles, derived }`、列表期望 `{ items, total }`、Git/SSH 使用旧路径、文件 API 使用 REST/query 形态、execution detail/redeploy/download/approve-retry 仍按旧草案调用。

这次同步是跨模块契约迁移，直接影响 API adapter、mock runtime、页面行为和测试。实现目标不是兼容两套后端，而是让二阶段前端按 `/Users/z/Downloads/frontend-api-contract(1).md` 对接新版 SaaS 后端。

## Goals / Non-Goals

**Goals:**

- 将二阶段前端 REST 解析统一到 `{ code, message, data, trace_id }`。
- 将列表消费改为 `data` 数组，同时保留页面侧需要的空数组、数量和加载态处理。
- 将 auth/admin/resource/files/execution adapter 更新到新版路由、字段和行为。
- 将 mock runtime 和测试更新为新版契约，避免本地测试继续固化旧接口。
- 对后端未开放能力采用前端禁用或替代策略：execution detail 由列表组合，redeploy 重新创建 preview execution，artifact download/approve-retry 不直接调用。
- 保持 SaaS 安全边界：不发送 CSRF、不暴露服务器路径、不信任 `extra.workspace`。

**Non-Goals:**

- 不为旧 `{ success, ... }` 后端响应增加长期兼容层。
- 不实现后端未开放的 SSE events，只预留事件模型和轮询 fallback。
- 不新增后端能力、数据库 schema 或服务端兼容接口。
- 不迁移或恢复桌面/local 主流程。

## Decisions

- Decision: 二阶段 adapter 使用严格 envelope 解析，并把历史兼容限制在非二阶段旧客户端代码。
  Rationale: 新文档明确前端只按一种 envelope 解析，继续兼容 `{ success, ... }` 会掩盖后端部署不一致。
  Alternative considered: 在 adapter 中同时兼容 `success` 和 `code`。拒绝原因是会让联调问题延迟暴露，并与新版文档冲突。

- Decision: 在 adapter 边界做字段归一，页面尽量消费稳定前端模型。
  Rationale: 页面已经依赖 `items`、`path`、`kind` 等前端语义；直接把后端字段散落到页面会放大改动面。
  Alternative considered: 全页面直接改成后端字段。拒绝原因是风险更高，且不利于后续小范围契约变动。

- Decision: 列表后端返回数组时，adapter 返回数组或由薄包装补齐前端旧 `PaginatedResult` 所需字段，但不得把 `{ items,total }` 当作后端契约。
  Rationale: 当前页面可能仍需要 `.items` 读取，迁移可分层完成；关键是请求/响应契约不再依赖后端分页对象。
  Alternative considered: 一次性把所有页面状态改为裸数组。可行但改动面更大，优先选择 adapter 兼容前端内部模型。

- Decision: 事件流当前采用轮询作为新版 runtime 主路径，WebSocket 保留为兼容 helper。
  Rationale: 新文档明确当前后端未开放 events，最终优先 SSE；直接依赖现有 WebSocket 会导致新版页面在真实后端上不可用。
  Alternative considered: 继续把 WebSocket 作为主实现。拒绝原因是与当前后端可用接口不一致。

- Decision: 未开放 endpoint 在 adapter 层显式不可用或映射为新版替代行为。
  Rationale: 调用不存在接口会导致用户路径失败；显式禁用可让 UI 做准确展示。
  Alternative considered: 保留方法并等待后端。拒绝原因是 mock/test 会继续固化错误契约。

- Decision: `workspace_id` 是 SaaS 会话唯一可信 Workspace 输入。
  Rationale: 后端会将 `workspace_id` 解析到受控目录，前端不应再传服务器绝对路径。
  Alternative considered: clone-create 保留 `extra.workspace` 兜底。拒绝原因是新文档明确后端会拒绝该可信来源。

## Risks / Trade-offs

- [Risk] 当前联调后端可能仍未部署新版 envelope 或字段 -> Mitigation: 以文档为准更新前端；若测试环境仍旧，需要后端先完成部署或另开临时兼容策略。
- [Risk] 页面仍依赖 `PaginatedResult.items`，裸数组迁移可能扩散 -> Mitigation: 在 adapter 层提供前端内部归一结果，测试确保后端输入是数组。
- [Risk] 禁用 artifact download/approve-retry 会减少当前原型能力 -> Mitigation: UI 展示 metadata 和等待状态，后端开放接口后再单独补充。
- [Risk] 时间字段从 ISO string 变为毫秒 timestamp number -> Mitigation: 类型放宽为 `string | number`，展示层统一格式化。
- [Risk] WebSocket 测试和旧页面行为受影响 -> Mitigation: 将新版 runtime 页面改为轮询路径，保留低层 WS helper 测试不作为新版契约主验证。

## Migration Plan

1. 更新契约测试，先让测试描述新版 auth/admin/resource/files/execution 请求和响应。
2. 更新 auth adapter、权限 helper 和会话存储接入，支持扁平 `/auth/me` 和 wildcard 权限。
3. 更新 admin adapter 和管理页调用，加入 permissions、sync-status、role-user add/remove、POST status。
4. 更新 SSH/Git/Workspace resource adapter 字段和路由，移除 SSH delete UI 入口。
5. 更新 Workspace runtime adapter 的文件 action、execution payload、global execution 子资源、artifact metadata 和禁用能力。
6. 更新 conversation clone/create 的 `workspace_id` 保障。
7. 更新 mock runtime 为新版契约，删除旧接口测试依赖。
8. 运行定向测试、typecheck 和 OpenSpec strict validate。

## Open Questions

- 后端是否会在列表接口后续补充分页元数据；如果会，需要新增契约而不是恢复旧 `{ items,total }` 假设。
- Execution SSE events 的准确 endpoint、event names 和重连语义尚未开放；本 change 只保留轮询 fallback 和未来迁移位。
- Artifact 下载、approve-retry 的最终接口未开放；本 change 不猜测 URL。
