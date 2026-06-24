# Brainstorm Summary

- Change: phase2-backend-contract-sync
- Date: 2026-06-22

## 确认的技术方案

采用严格新版后端契约同步方案：二阶段 API adapter 只按 `{ code, message, data, trace_id }` 解析真实后端响应；请求路由和 payload 以 `/Users/z/Downloads/frontend-api-contract(1).md` 为事实源。实现层在 adapter 边界做字段归一，避免页面散落后端字段迁移逻辑。

认证使用 `username` 登录字段、`data.token`、扁平 `/api/auth/me` 和 wildcard 权限。管理员、资源、文件和 runtime adapter 分别切换到新版路径和字段。当前后端未开放的 execution detail、redeploy shortcut、artifact download、approve-retry 和 events 不再作为页面主依赖；redeploy 通过重新创建 preview execution 替代，events 先用轮询刷新，后续 SSE 开放后再接入。

## 关键取舍与风险

- 严格新版契约优先于兼容旧 `{ success, ... }`，避免把后端部署不一致隐藏到前端。
- 列表接口以后端数组为准，但 adapter 可以保留前端内部可消费的包装形态，降低页面改动范围。
- 禁用未开放能力会减少当前原型按钮，但能避免真实后端 404/405。
- 测试环境若仍未部署新版契约，联调会暴露后端部署问题，不应通过前端 CSRF 或 success 兼容掩盖。

## 测试策略

- 先更新 auth/admin/resource/runtime/mock tests，固定新版请求路径、payload、response envelope 和禁用能力。
- Adapter tests 覆盖数组列表、字段映射、wildcard 权限、文件 POST action、global execution 子资源。
- Mock runtime tests 覆盖新版二阶段接口，防止本地 mock 继续服务旧契约。
- 最后运行定向测试、`npm run typecheck` 和 `npx openspec validate phase2-backend-contract-sync --strict`。

## Spec Patch

无。当前 delta spec 已包含本轮需要的验收场景。
