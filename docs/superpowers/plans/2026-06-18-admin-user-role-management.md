# Admin User Role Management Plan

## Phase 1: API And Permission Helpers

- Add typed admin users/roles API adapter with envelope and error handling.
- Add admin permission helper for user/role navigation visibility and direct-route forbidden fallback.
- Add adapter and permission tests first.

## Phase 2: Routes And Navigation

- Register `/settings/admin/users` and `/settings/admin/roles`.
- Add permission-gated entries to desktop settings sider and mobile settings wrapper.
- Keep backend authorization as final boundary by rendering forbidden states on 403.

## Phase 3: Admin UI

- Build admin users page with list, enable/disable, reset password and role assignment.
- Build admin roles page with list, permissions summary, create/update form and system-role protection.

## Phase 4: Mock And Verification

- Add mock admin users/roles endpoints.
- Run admin adapter/permission/mock tests and typecheck.
- Mark OpenSpec tasks complete and run Comet build/verify guards.
