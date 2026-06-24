# Workspace Execution Runtime Plan

## Phase 1: API And Events

- Add `src/aionui/common/resources/workspaceRuntime.ts` with typed Workspace file, terminal, execution, artifact, and event APIs.
- Add tests for envelope parsing, relative path request shape, write conflict handling, execution lifecycle and artifact download URL handling.
- Reuse shared WebSocket for execution events and expose typed subscribe/merge helpers.

## Phase 2: Runtime UI

- Add `/runtime` page with workspace selector, file tree/content editor, terminal session card, execution list/detail, logs, preview, artifacts and approval actions.
- Link active workspaces from Resource Settings to `/runtime?workspace_id=...`.
- Keep all user-facing paths workspace-relative or `display_path` based.

## Phase 3: Mock Runtime

- Seed workspace files, file versions, terminal sessions, executions and artifacts.
- Implement `/api/workspaces/{id}/files`, content, operations, upload, terminals, executions, artifacts and approval endpoints.
- Broadcast typed execution events over mock WebSocket after create/redeploy/approval.

## Phase 4: Verification

- Run runtime adapter/event/mock tests.
- Run typecheck.
- Mark OpenSpec tasks complete and run Comet build/verify guards.
