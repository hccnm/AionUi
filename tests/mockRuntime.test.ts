import { beforeEach, describe, expect, it } from 'vitest';
import { __mockRuntime } from '../src/mock/runtime';

describe('intercept mock runtime', () => {
  beforeEach(() => {
    __mockRuntime.resetInterceptMockState();
  });

  it('serves phase2 unauthenticated auth state before login and authenticated state after login', async () => {
    const beforeLogin = await __mockRuntime.handleMockApi('http://aionweb.mock/api/auth/me', { method: 'GET' });
    expect(beforeLogin).not.toBeNull();
    expect(await beforeLogin!.json()).toEqual({ code: 401, message: 'Unauthorized', data: null, trace_id: null });

    const loginResponse = await __mockRuntime.handleMockApi('http://aionweb.mock/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: '13800138000', password: 'pass-1' }),
    });
    const loginJson = await loginResponse!.json();

    const afterLogin = await __mockRuntime.handleMockApi('http://aionweb.mock/api/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${loginJson.data.token}`,
      },
    });
    expect(await afterLogin!.json()).toEqual({
      code: 0,
      message: 'ok',
      data: {
        id: 'user-demo',
        phone: '13800138000',
        username: '13800138000',
        display_name: '13800138000',
        roles: [{ id: 'role_admin', role_key: 'admin', role_name: '管理员', permissions: ['*'] }],
        permission_flags: ['*', 'admin:user:list', 'admin:user:update', 'admin:role:list', 'admin:role:update'],
        is_admin: true,
      },
      trace_id: null,
    });
  });

  it('does not expose legacy auth endpoints in the phase2 mock contract', async () => {
    const legacyLogin = await __mockRuntime.handleMockApi('http://aionweb.mock/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'demo' }),
    });
    const legacyUser = await __mockRuntime.handleMockApi('http://aionweb.mock/api/auth/user', {
      method: 'GET',
    });
    const legacyLogout = await __mockRuntime.handleMockApi('http://aionweb.mock/logout', { method: 'POST' });

    expect(legacyLogin).toBeNull();
    expect(legacyUser).toBeNull();
    expect(legacyLogout).toBeNull();
  });

  it('lists seeded conversations and appends a new one on create', async () => {
    const initial = await __mockRuntime.handleMockApi('http://aionweb.mock/api/conversations', { method: 'GET' });
    const initialJson = await initial!.json();
    expect(initialJson.data.items).toHaveLength(1);

    await __mockRuntime.handleMockApi('http://aionweb.mock/api/conversations', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Created in test',
        extra: { workspace: '/srv/aion/test-space' },
      }),
    });

    const afterCreate = await __mockRuntime.handleMockApi('http://aionweb.mock/api/conversations', { method: 'GET' });
    const afterCreateJson = await afterCreate!.json();
    expect(afterCreateJson.data.items).toHaveLength(2);
    expect(afterCreateJson.data.items[0].name).toBe('Created in test');
  });

  it('creates conversations from workspace_id without trusting absolute workspace path', async () => {
    const created = await __mockRuntime.handleMockApi('http://aionweb.mock/api/conversations', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Workspace ID session',
        workspace_id: 'ws-demo',
        extra: { workspace: '/srv/aion/should-not-be-used' },
      }),
    });

    const json = await created!.json();
    expect(json.data.workspace_id).toBe('ws-demo');
    expect(json.data.extra.workspace).toBeUndefined();
    expect(json.data.extra.display_path).toBe('aion-web/main');
  });

  it('serves workspace resource endpoints', async () => {
    const workspaces = await __mockRuntime.handleMockApi('http://aionweb.mock/api/workspaces', { method: 'GET' });
    expect((await workspaces!.json()).data[0]).toMatchObject({ id: 'ws-demo', source_type: 'git_project', branch_ref: 'main' });

    const renamed = await __mockRuntime.handleMockApi('http://aionweb.mock/api/workspaces/ws-demo', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Renamed Workspace' }),
    });
    expect((await renamed!.json()).data.name).toBe('Renamed Workspace');

    const uploaded = await __mockRuntime.handleMockApi('http://aionweb.mock/api/git/ssh-credentials', {
      method: 'POST',
      body: JSON.stringify({ name: 'GitHub', private_key: 'PRIVATE', passphrase: 'SECRET' }),
    });
    expect((await uploaded!.json()).data).toMatchObject({ name: 'GitHub' });
  });

  it('serves workspace runtime file and terminal endpoints without absolute paths', async () => {
    const files = await __mockRuntime.handleMockApi('http://aionweb.mock/api/workspaces/ws-demo/files/list', {
      method: 'POST',
      body: JSON.stringify({ relative_path: '.' }),
    });
    const filesJson = await files!.json();
    expect(filesJson.data.find((item: { relative_path: string }) => item.relative_path === 'README.md')).toMatchObject({
      relative_path: 'README.md',
      kind: 'file',
    });
    expect(JSON.stringify(filesJson)).not.toContain('/srv/');

    const content = await __mockRuntime.handleMockApi('http://aionweb.mock/api/workspaces/ws-demo/files/read', {
      method: 'POST',
      body: JSON.stringify({ relative_path: 'README.md' }),
    });
    const contentJson = await content!.json();
    expect(contentJson.data).toMatchObject({ relative_path: 'README.md', version: 'v1' });

    const write = await __mockRuntime.handleMockApi('http://aionweb.mock/api/workspaces/ws-demo/files/write', {
      method: 'POST',
      body: JSON.stringify({ relative_path: 'README.md', content: 'Updated README', base_version: 'v1' }),
    });
    expect((await write!.json()).data.version).toBe('v2');

    const terminal = await __mockRuntime.handleMockApi('http://aionweb.mock/api/workspaces/ws-demo/terminals', {
      method: 'POST',
      body: JSON.stringify({ relative_path: 'src' }),
    });
    expect((await terminal!.json()).data).toMatchObject({ workspace_id: 'ws-demo', cwd: 'src', status: 'running' });
  });

  it('serves workspace execution lifecycle and artifacts', async () => {
    const created = await __mockRuntime.handleMockApi('http://aionweb.mock/api/workspaces/ws-demo/executions', {
      method: 'POST',
      body: JSON.stringify({ execution_type: 'preview_env', relative_path: '.', title: 'Preview' }),
    });
    const createdJson = await created!.json();
    const executionId = createdJson.data.id;
    expect(createdJson.data).toMatchObject({ workspace_id: 'ws-demo', execution_type: 'preview_env', status: 'running' });
    expect(createdJson.data.preview_url).toContain('https://preview.aionweb.mock/');

    const artifacts = await __mockRuntime.handleMockApi(
      `http://aionweb.mock/api/executions/${executionId}/artifacts`,
      { method: 'GET' }
    );
    const artifactJson = await artifacts!.json();
    expect(artifactJson.data[0]).toMatchObject({ execution_id: executionId, ref_: expect.stringContaining(executionId) });

    const cancelled = await __mockRuntime.handleMockApi(
      `http://aionweb.mock/api/executions/${executionId}/cancel`,
      { method: 'POST' }
    );
    expect((await cancelled!.json()).data.status).toBe('cancelled');
  });

  it('serves admin users and roles endpoints', async () => {
    const users = await __mockRuntime.handleMockApi('http://aionweb.mock/api/admin/users?page=1&page_size=20', {
      method: 'GET',
    });
    const usersJson = await users!.json();
    expect(usersJson.data[0]).toMatchObject({ id: 'user-demo', status: 'enabled' });

    const status = await __mockRuntime.handleMockApi('http://aionweb.mock/api/admin/users/user-demo/status', {
      method: 'POST',
      body: JSON.stringify({ status: 'disabled' }),
    });
    expect((await status!.json()).data.status).toBe('disabled');

    const reset = await __mockRuntime.handleMockApi('http://aionweb.mock/api/admin/users/user-demo/reset-password', {
      method: 'POST',
      body: JSON.stringify({ password: 'Passw0rd!' }),
    });
    expect((await reset!.json()).data.id).toBe('user-demo');

    const roles = await __mockRuntime.handleMockApi('http://aionweb.mock/api/admin/roles', { method: 'GET' });
    const roleId = (await roles!.json()).data[0].id;

    const permissions = await __mockRuntime.handleMockApi('http://aionweb.mock/api/admin/permissions', { method: 'GET' });
    expect((await permissions!.json()).data[0]).toMatchObject({ key: 'admin:user:list' });

    const assigned = await __mockRuntime.handleMockApi(`http://aionweb.mock/api/admin/roles/${roleId}/users/user-demo`, {
      method: 'POST',
    });
    expect((await assigned!.json()).data.roles[0].id).toBe(roleId);

    const created = await __mockRuntime.handleMockApi('http://aionweb.mock/api/admin/roles', {
      method: 'POST',
      body: JSON.stringify({ role_key: 'ops', role_name: 'Ops', permissions: ['admin:user:list'] }),
    });
    const createdJson = await created!.json();
    expect(createdJson.data).toMatchObject({ role_key: 'ops', is_system: false });

    const updated = await __mockRuntime.handleMockApi(`http://aionweb.mock/api/admin/roles/${createdJson.data.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role_name: 'Operations', permissions: ['admin:user:list', 'admin:role:list'] }),
    });
    expect((await updated!.json()).data.role_name).toBe('Operations');
  });

  it('returns a server msg id when posting a message', async () => {
    const response = await __mockRuntime.handleMockApi('http://aionweb.mock/api/conversations/conv-demo/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'hello mock backend' }),
    });

    const json = await response!.json();
    expect(json.data.msg_id).toMatch(/^user-/);

    const messages = await __mockRuntime.handleMockApi(
      'http://aionweb.mock/api/conversations/conv-demo/messages?page=1&page_size=50',
      { method: 'GET' }
    );
    const messagesJson = await messages!.json();
    expect(messagesJson.data.items.some((item: { content: { content: string } }) => item.content.content === 'hello mock backend')).toBe(true);
  });
});
