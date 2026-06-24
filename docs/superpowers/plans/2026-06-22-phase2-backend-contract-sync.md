---
change: phase2-backend-contract-sync
design-doc: docs/superpowers/specs/2026-06-22-phase2-backend-contract-sync-design.md
base-ref: d984682abd2cd8e14763e71343e873424abe1a5d
archived-with: 2026-06-22-phase2-backend-contract-sync
---

# Phase 2 Backend Contract Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align AionWeb phase-2 frontend adapters, mock runtime, and tests with `/Users/z/Downloads/frontend-api-contract(1).md`.

**Architecture:** Keep backend contract changes at adapter and mock boundaries. Existing pages may keep stable frontend-facing model names where useful, but every network request and mocked response must use the new envelope, route, payload, and field semantics.

**Tech Stack:** TypeScript, React, Vitest, existing `fetchWithSaasAuth`, existing mock runtime.

## Global Constraints

- SaaS mode uses `Authorization: Bearer <token>` and does not send or depend on CSRF.
- New phase-2 REST responses are `{ code, message, data, trace_id }`.
- Current list responses return `data: []`, not `{ items, total }`.
- File and terminal paths use `relative_path`; server absolute paths and `root_rel_path` must not be displayed.
- Current backend does not expose execution detail, redeploy shortcut, artifact download, approve-retry, or events.
- Conversation create and clone-create must use top-level `workspace_id` for SaaS workspaces.

archived-with: 2026-06-22-phase2-backend-contract-sync
---

### Task 1: Auth And Permission Contract

**Files:**
- Modify: `tests/authPhase2.test.ts`
- Modify: `tests/authSession.test.ts`
- Modify: `src/aionui/common/auth/phase2.ts`
- Modify: `src/aionui/common/auth/http.ts` only if token extraction needs tightening
- Modify: `src/mock/runtime.ts`

**Interfaces:**
- Produces: `Phase2CurrentUser` as a flat user object with `roles`, `permission_flags`, `is_admin`, and optional frontend-derived convenience flags.
- Produces: `hasPermission(currentUser, flag)` that treats `*` as wildcard.

- [x] **Step 1: Write failing tests**
  Add/adjust tests so `login('13900009999', 'x')` sends `{"username":"13900009999","password":"x"}`, `getMe()` accepts flat `data`, and wildcard permissions pass `hasPermission(user, 'admin:user:list')`.

- [x] **Step 2: Run auth tests and confirm failure**
  Run: `npm test -- tests/authPhase2.test.ts tests/authSession.test.ts`
  Expected before implementation: failures mentioning `phone`, nested `user`, or wildcard permissions.

- [x] **Step 3: Implement auth adapter changes**
  Change `Phase2AuthUser`/`Phase2CurrentUser` types, update login body, normalize `is_admin` into convenient frontend fields where existing UI still expects them, and keep CSRF absent.

- [x] **Step 4: Update mock auth responses**
  Change mock login and `/api/auth/me` to return `{ code: 0, message: 'ok', data: ... }` with flat current user.

- [x] **Step 5: Verify auth**
  Run: `npm test -- tests/authPhase2.test.ts tests/authSession.test.ts`
  Expected: PASS.

### Task 2: Admin Contract

**Files:**
- Modify: `tests/adminAccessControl.test.ts`
- Modify: `src/aionui/common/admin/adminAccessControl.ts`
- Modify: `src/mock/runtime.ts`

**Interfaces:**
- Produces: admin list adapters that consume backend array `data`.
- Produces: `listPermissions`, `getUserSyncStatus`, `syncUserStatus`, `updateRoleStatus`, `addUserRole`, `removeUserRole`.

- [x] **Step 1: Write failing admin tests**
  Cover `data: []` list responses, `POST /api/admin/users/{id}/status`, reset body `{ password }`, `GET /api/admin/permissions`, sync-status, and role-user add/remove routes.

- [x] **Step 2: Run admin tests and confirm failure**
  Run: `npm test -- tests/adminAccessControl.test.ts`
  Expected before implementation: failures for HTTP method, payload field, missing methods, or list shape.

- [x] **Step 3: Implement admin adapter**
  Update methods and types to the new contract. Keep page-facing return shape compatible where current pages expect it, but make tests prove backend input is array.

- [x] **Step 4: Update mock admin runtime**
  Mirror the new admin endpoints and envelope shapes in `src/mock/runtime.ts`.

- [x] **Step 5: Verify admin**
  Run: `npm test -- tests/adminAccessControl.test.ts`
  Expected: PASS.

### Task 3: Resource And Workspace Contract

**Files:**
- Modify: `tests/workspaceResources.test.ts`
- Modify: `src/aionui/common/resources/workspaceResources.ts`
- Modify: `src/aionui/renderer/pages/settings/ResourceSettings.tsx` if UI exposes SSH delete or old Git fields
- Modify: `src/mock/runtime.ts`

**Interfaces:**
- Produces: `/api/git/ssh-credentials/**` and `/api/git/projects/**` client methods.
- Produces: Workspace create/list types using `source_type`, `git_project_id`, `branch_ref`, and hidden `root_rel_path`.

- [x] **Step 1: Write failing resource tests**
  Cover new SSH/Git routes, generate response `{ credential, public_key }`, Git update/archive, Workspace blank/git create payloads, and no SSH delete client method.

- [x] **Step 2: Run resource tests and confirm failure**
  Run: `npm test -- tests/workspaceResources.test.ts`
  Expected before implementation: failures for old `/api/ssh-credentials` or `/api/git-projects`.

- [x] **Step 3: Implement resource adapter**
  Rename request fields to backend contract and normalize responses for existing UI.

- [x] **Step 4: Adjust resource UI if needed**
  Remove or hide SSH delete action and ensure `root_rel_path` is not displayed.

- [x] **Step 5: Update mock resource runtime and verify**
  Run: `npm test -- tests/workspaceResources.test.ts`
  Expected: PASS.

### Task 4: Files Conversation Runtime Contract

**Files:**
- Modify: `tests/workspaceRuntime.test.ts`
- Modify: `tests/createConversationParams.test.ts`
- Modify: `src/aionui/common/resources/workspaceRuntime.ts`
- Modify: `src/aionui/common/adapter/ipcBridge.ts`
- Modify: `src/aionui/common/utils/buildAgentConversationParams.ts` if clone/create helpers still leak `extra.workspace`
- Modify: `src/aionui/renderer/pages/runtime/WorkspaceRuntimePage.tsx`
- Modify: `src/mock/runtime.ts`

**Interfaces:**
- Produces: file action routes using `relative_path`.
- Produces: execution create using `execution_type`.
- Produces: global execution cancel/status/artifacts routes.
- Produces: runtime UI behavior that does not call unavailable detail/download/approve endpoints.

- [x] **Step 1: Write failing runtime tests**
  Cover `/files/list`, `/files/read`, `/files/write`, `/files/rename`, `/files/delete`, terminal `relative_path`, execution `execution_type`, global cancel/artifacts, redeploy-as-create, disabled download/approve-retry, and clone-create `workspace_id`.

- [x] **Step 2: Run runtime tests and confirm failure**
  Run: `npm test -- tests/workspaceRuntime.test.ts tests/createConversationParams.test.ts`
  Expected before implementation: failures for old file routes, `kind`, nested execution routes, or `extra.workspace`.

- [x] **Step 3: Implement runtime adapter**
  Change route builders, payloads, response mapping, unavailable method behavior, and polling-friendly list/artifact helpers.

- [x] **Step 4: Update runtime page calls**
  Use list-derived selected execution details, create new preview execution for redeploy, show artifact metadata without download call, and hide approve-retry action until backend opens it.

- [x] **Step 5: Update conversation clone/create mapping**
  Ensure clone-create forwards `workspace_id` and strips `extra.workspace` for SaaS conversations.

- [x] **Step 6: Update mock runtime and verify**
  Run: `npm test -- tests/workspaceRuntime.test.ts tests/createConversationParams.test.ts`
  Expected: PASS.

### Task 5: Full Mock And Regression Verification

**Files:**
- Modify: `tests/mockRuntime.test.ts`
- Modify: `src/mock/runtime.ts`
- Modify: `openspec/changes/phase2-backend-contract-sync/tasks.md`

**Interfaces:**
- Produces: mock runtime that only exposes new phase-2 contract paths.

- [x] **Step 1: Update mock runtime tests**
  Convert old mock endpoint calls to new auth/admin/resource/file/execution paths and assert old removed endpoints are not relied on.

- [x] **Step 2: Run mock tests and confirm failures if mock is incomplete**
  Run: `npm test -- tests/mockRuntime.test.ts`
  Expected before final mock update: failures for missing new mock endpoints.

- [x] **Step 3: Finish mock endpoint migration**
  Update `src/mock/runtime.ts` route matching, payload fields, and response objects.

- [x] **Step 4: Run all targeted tests**
  Run: `npm test -- tests/adminAccessControl.test.ts tests/mockRuntime.test.ts tests/authPhase2.test.ts tests/authSession.test.ts tests/workspaceRuntime.test.ts tests/workspaceResources.test.ts tests/createConversationParams.test.ts`
  Expected: PASS.

- [x] **Step 5: Run typecheck and OpenSpec validation**
  Run: `npm run typecheck`
  Run: `npx openspec validate phase2-backend-contract-sync --strict`
  Expected: PASS.

- [x] **Step 6: Mark OpenSpec tasks complete**
  Check off completed tasks in `openspec/changes/phase2-backend-contract-sync/tasks.md` only after implementation and verification pass.
