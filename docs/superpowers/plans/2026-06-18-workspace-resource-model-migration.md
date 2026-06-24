---
change: workspace-resource-model-migration
design-doc: openspec/changes/workspace-resource-model-migration/design.md
base-ref: 18c16ff
---

# Workspace Resource Model Migration 实施计划

**Goal:** 将 SaaS 工作区资源从服务器绝对路径迁移到 `workspace_id`，补齐 SSH credential、Git project、Workspace 生命周期 API 和前端主链。

**Architecture:** 新增 resource API adapter 和资源类型；通过 Guid 选择 Workspace 并创建会话；保留旧 workspace path 只作为只读展示兼容，不再作为新 SaaS 会话可信输入。

## Task 1: Resource API Adapter

**Files**
- Create: `src/aionui/common/resources/workspaceResources.ts`
- Test: `tests/workspaceResources.test.ts`

- [x] Step 1: 写失败测试覆盖 envelope 解析、SSH secret 提交后调用者可清空、Workspace rename 使用 `PATCH /api/workspaces/{id}`。
- [x] Step 2: 实现 SSH credential、Git project、Workspace API adapter 和类型。
- [x] Step 3: 运行 `npm test -- tests/workspaceResources.test.ts`。

## Task 2: Conversation Creation Uses Workspace ID

**Files**
- Modify: `src/aionui/renderer/pages/conversation/utils/createConversationParams.ts`
- Modify: `src/aionui/common/adapter/ipcBridge.ts`
- Test: `tests/createConversationParams.test.ts`

- [x] Step 1: 写失败测试证明新会话 payload 使用 `workspace_id`，且不写入 `extra.workspace`。
- [x] Step 2: 扩展 `ICreateConversationParams` 和 HTTP mapper，支持 `workspace_id`。
- [x] Step 3: 运行相关测试。

## Task 3: Guid Workspace Selection

**Files**
- Create/Modify: Guid workspace selector components/hooks as needed
- Modify: `src/aionui/renderer/pages/guid/index.tsx`

- [x] Step 1: 加载 Workspace 列表，展示安全字段 `display_path`、repo name、branch。
- [x] Step 2: 禁止 archived Workspace 创建会话。
- [x] Step 3: 将发送链路传递选中的 `workspace_id`。

## Task 4: Resource Management Routes

**Files**
- Add pages under `src/aionui/renderer/pages/resources/`
- Modify router/sider settings navigation as appropriate

- [x] Step 1: 新增 SSH credentials、Git projects、Workspaces 页面。
- [x] Step 2: 支持列表、创建/上传/生成、验证/同步、重命名、归档/恢复/删除等主操作。
- [x] Step 3: 表单提交后清空 private key/passphrase。

## Task 5: Mock Runtime And Verification

**Files**
- Modify: `src/mock/runtime.ts`
- Modify: `tests/mockRuntime.test.ts`
- Modify: `openspec/changes/workspace-resource-model-migration/tasks.md`

- [x] Step 1: mock 支持 SSH/Git/Workspace endpoints 和 workspace-id conversation create。
- [x] Step 2: 勾选 OpenSpec 和 plan tasks。
- [x] Step 3: 运行 `npm test -- tests/workspaceResources.test.ts tests/createConversationParams.test.ts tests/mockRuntime.test.ts` 和 `npm run typecheck`。
