import { describe, expect, it, vi } from 'vitest';

import {
  AdminConflictError,
  AdminForbiddenError,
  AdminValidationError,
  canViewAdminRoles,
  canViewAdminUsers,
  createAdminAccessControlAdapter,
} from '../src/aionui/common/admin/adminAccessControl';
import type { Phase2CurrentUser } from '../src/aionui/common/auth/phase2';

const adminUser: Phase2CurrentUser = {
  id: 'user-admin',
  phone: '13800138000',
  username: 'admin',
  display_name: 'Admin',
  roles: [{ id: 'role_admin', role_key: 'admin', role_name: '管理员', permissions: ['*'] }],
  permission_flags: ['*'],
  is_admin: true,
};

describe('admin access control adapter', () => {
  it('lists users with pagination and filters', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: 'ok',
          data: [{ id: 'user-1', phone: '13800138000', status: 'enabled', roles: [] }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const adapter = createAdminAccessControlAdapter({ fetcher });

    await expect(adapter.listUsers({ page: 2, page_size: 20, keyword: 'tom', status: 'enabled' })).resolves.toMatchObject({
      total: 1,
    });
    expect(fetcher).toHaveBeenCalledWith('/api/admin/users?page=2&page_size=20&keyword=tom&status=enabled', {
      method: 'GET',
      headers: {},
      signal: undefined,
    });
  });

  it('updates status, resets password and assigns roles', async () => {
    const fetcher = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ code: 0, message: 'ok', data: { id: 'user-1', status: 'disabled', roles: [] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    );
    const adapter = createAdminAccessControlAdapter({ fetcher });

    await adapter.updateUserStatus('user-1', { status: 'disabled' });
    await adapter.resetUserPassword('user-1', { password: 'Passw0rd!' });
    await adapter.addUserRole('role_viewer', 'user-1');
    await adapter.removeUserRole('role_viewer', 'user-1');

    expect(fetcher).toHaveBeenNthCalledWith(1, '/api/admin/users/user-1/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"status":"disabled"}',
      signal: undefined,
    });
    expect(fetcher).toHaveBeenNthCalledWith(2, '/api/admin/users/user-1/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"password":"Passw0rd!"}',
      signal: undefined,
    });
    expect(fetcher).toHaveBeenNthCalledWith(3, '/api/admin/roles/role_viewer/users/user-1', {
      method: 'POST',
      headers: {},
      signal: undefined,
    });
    expect(fetcher).toHaveBeenNthCalledWith(4, '/api/admin/roles/role_viewer/users/user-1', {
      method: 'DELETE',
      headers: {},
      signal: undefined,
    });
  });

  it('diffs assigned roles so removed roles are deleted', async () => {
    const fetcher = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ code: 0, message: 'ok', data: { id: 'user-1', status: 'enabled', roles: [] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    const adapter = createAdminAccessControlAdapter({ fetcher });

    await adapter.assignUserRoles('user-1', {
      role_ids: ['role_admin', 'role_ops'],
      current_role_ids: ['role_admin', 'role_viewer'],
    });

    expect(fetcher).toHaveBeenNthCalledWith(1, '/api/admin/roles/role_ops/users/user-1', {
      method: 'POST',
      headers: {},
      signal: undefined,
    });
    expect(fetcher).toHaveBeenNthCalledWith(2, '/api/admin/roles/role_viewer/users/user-1', {
      method: 'DELETE',
      headers: {},
      signal: undefined,
    });
  });

  it('clears assigned roles with delete role-user calls', async () => {
    const fetcher = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ code: 0, message: 'ok', data: { id: 'user-1', status: 'enabled', roles: [] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    const adapter = createAdminAccessControlAdapter({ fetcher });

    await adapter.assignUserRoles('user-1', {
      role_ids: [],
      current_role_ids: ['role_admin', 'role_viewer'],
    });

    expect(fetcher).toHaveBeenNthCalledWith(1, '/api/admin/roles/role_admin/users/user-1', {
      method: 'DELETE',
      headers: {},
      signal: undefined,
    });
    expect(fetcher).toHaveBeenNthCalledWith(2, '/api/admin/roles/role_viewer/users/user-1', {
      method: 'DELETE',
      headers: {},
      signal: undefined,
    });
  });

  it('lists permission catalog and syncs user status', async () => {
    const fetcher = vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ code: 0, message: 'ok', data: [{ key: 'admin:user:list', label: '用户列表' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const adapter = createAdminAccessControlAdapter({ fetcher });

    await adapter.listPermissions();
    await adapter.getUserSyncStatus('user-1');
    await adapter.syncUserStatus('user-1');

    expect(fetcher).toHaveBeenNthCalledWith(1, '/api/admin/permissions', {
      method: 'GET',
      headers: {},
      signal: undefined,
    });
    expect(fetcher).toHaveBeenNthCalledWith(2, '/api/admin/users/user-1/sync-status', {
      method: 'GET',
      headers: {},
      signal: undefined,
    });
    expect(fetcher).toHaveBeenNthCalledWith(3, '/api/admin/users/user-1/sync-status', {
      method: 'POST',
      headers: {},
      signal: undefined,
    });
  });

  it('updates role status with dedicated endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, message: 'ok', data: { id: 'role_ops', status: 'disabled' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const adapter = createAdminAccessControlAdapter({ fetcher });

    await adapter.updateRoleStatus('role_ops', { status: 'disabled' });

    expect(fetcher).toHaveBeenCalledWith('/api/admin/roles/role_ops/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"status":"disabled"}',
      signal: undefined,
    });
  });

  it('creates and updates roles', async () => {
    const role = { id: 'role_ops', role_key: 'ops', role_name: 'Ops', permissions: ['admin:user:list'], is_system: false };
    const fetcher = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ code: 0, message: 'ok', data: role }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    );
    const adapter = createAdminAccessControlAdapter({ fetcher });

    await adapter.createRole({ role_key: 'ops', role_name: 'Ops', permissions: ['admin:user:list'] });
    await adapter.updateRole('role_ops', { role_name: 'Ops Updated', permissions: ['admin:user:list', 'admin:role:list'] });

    expect(fetcher).toHaveBeenNthCalledWith(1, '/api/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"role_key":"ops","role_name":"Ops","permissions":["admin:user:list"]}',
      signal: undefined,
    });
    expect(fetcher).toHaveBeenNthCalledWith(2, '/api/admin/roles/role_ops', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{"role_name":"Ops Updated","permissions":["admin:user:list","admin:role:list"]}',
      signal: undefined,
    });
  });

  it('maps forbidden, conflict and validation errors', async () => {
    const adapter403 = createAdminAccessControlAdapter({
      fetcher: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'FORBIDDEN', message: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      ),
    });
    await expect(adapter403.listRoles()).rejects.toBeInstanceOf(AdminForbiddenError);

    const adapter409 = createAdminAccessControlAdapter({
      fetcher: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'CONFLICT', message: 'Role key exists' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        })
      ),
    });
    await expect(adapter409.createRole({ role_key: 'admin', role_name: 'Admin', permissions: [] })).rejects.toBeInstanceOf(
      AdminConflictError
    );

    const adapter422 = createAdminAccessControlAdapter({
      fetcher: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'VALIDATION_ERROR', message: 'Invalid role name', data: { field: 'role_name' } }), {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        })
      ),
    });
    await expect(adapter422.updateRole('role-1', { role_name: '', permissions: [] })).rejects.toBeInstanceOf(AdminValidationError);
  });
});

describe('admin permission helpers', () => {
  it('uses permission flags and derived fields for navigation visibility', () => {
    expect(canViewAdminUsers(adminUser)).toBe(true);
    expect(canViewAdminRoles(adminUser)).toBe(true);
    expect(
      canViewAdminUsers({
        ...adminUser,
        permission_flags: [],
        roles: [{ id: 'role_user_admin', role_key: 'user_admin', role_name: 'User Admin', permissions: ['admin:user:list'] }],
      })
    ).toBe(true);
    expect(canViewAdminRoles({ ...adminUser, is_admin: false, permission_flags: [], roles: [] })).toBe(false);
  });
});
