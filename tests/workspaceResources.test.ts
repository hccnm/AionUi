import { describe, expect, it, vi } from 'vitest';

import { createWorkspaceResourceAdapter } from '../src/aionui/common/resources/workspaceResources';

describe('workspace resource adapter', () => {
  it('unwraps workspace list envelope', async () => {
    const workspaces = [
      {
        id: 'ws_1',
        name: 'Aion Web',
        status: 'active',
        source_type: 'git_project',
        git_project_id: 'git_1',
        branch_ref: 'main',
        root_rel_path: 'workspaces/ws_1/repo',
        created_at: 1782093787000,
        updated_at: 1782093787000,
      },
    ];
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, message: 'ok', data: workspaces, trace_id: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const adapter = createWorkspaceResourceAdapter({ fetcher });

    await expect(adapter.listWorkspaces()).resolves.toEqual({ items: workspaces, total: 1 });
    expect(fetcher).toHaveBeenCalledWith('/api/workspaces', {
      method: 'GET',
      headers: {},
      signal: undefined,
    });
  });

  it('renames workspace with PATCH /api/workspaces/{id}', async () => {
    const workspace = {
      id: 'ws_1',
        name: 'Renamed',
        status: 'active',
        source_type: 'git_project',
        git_project_id: 'git_1',
        branch_ref: 'main',
        root_rel_path: 'workspaces/ws_1/repo',
        created_at: 1782093787000,
        updated_at: 1782093847000,
    };
    const fetcher = vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ code: 0, message: 'ok', data: workspace }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const adapter = createWorkspaceResourceAdapter({ fetcher });

    await expect(adapter.renameWorkspace('ws_1', 'Renamed')).resolves.toEqual(workspace);
    expect(fetcher).toHaveBeenCalledWith('/api/workspaces/ws_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"Renamed"}',
      signal: undefined,
    });
  });

  it('submits ssh private key without retaining secret in adapter state', async () => {
    const credential = {
      id: 'ssh_1',
      name: 'GitHub',
      public_key: 'ssh-ed25519 AAAA',
      fingerprint: 'SHA256:test',
      created_at: '2026-06-18T00:00:00Z',
    };
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, message: 'ok', data: credential }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const adapter = createWorkspaceResourceAdapter({ fetcher });

    await expect(
      adapter.uploadSshCredential({ name: 'GitHub', private_key: 'PRIVATE', passphrase: 'SECRET' })
    ).resolves.toEqual(credential);
    expect(fetcher).toHaveBeenCalledWith('/api/git/ssh-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"GitHub","private_key":"PRIVATE","passphrase":"SECRET"}',
      signal: undefined,
    });
    expect(Object.values(adapter)).not.toContain('PRIVATE');
    expect(Object.values(adapter)).not.toContain('SECRET');
    expect('deleteSshCredential' in adapter).toBe(false);
  });

  it('uses /api/git routes and maps generate ssh response', async () => {
    const credential = {
      id: 'ssh_2',
      name: 'Generated',
      fingerprint: 'SHA256:gen',
      status: 'unverified',
    };
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, message: 'ok', data: { credential, public_key: 'ssh-ed25519 AAAA' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const adapter = createWorkspaceResourceAdapter({ fetcher });

    await expect(adapter.generateSshCredential({ name: 'Generated', comment: 'aion user key' })).resolves.toEqual({
      ...credential,
      public_key: 'ssh-ed25519 AAAA',
    });
    expect(fetcher).toHaveBeenCalledWith('/api/git/ssh-credentials/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"Generated","comment":"aion user key"}',
      signal: undefined,
    });
  });

  it('creates, updates, syncs and archives git projects with /api/git/projects', async () => {
    const project = {
      id: 'git_1',
      display_name: 'billing-service',
      repo_ssh_url: 'git@example.com:team/billing-service.git',
      credential_id: 'ssh_1',
      default_branch: 'main',
      status: 'active',
      created_at: 1782093787000,
    };
    const fetcher = vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ code: 0, message: 'ok', data: project }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const adapter = createWorkspaceResourceAdapter({ fetcher });

    await adapter.createGitProject({
      display_name: 'billing-service',
      repo_ssh_url: 'git@example.com:team/billing-service.git',
      credential_id: 'ssh_1',
      default_branch: 'main',
    });
    await adapter.updateGitProject('git_1', { display_name: 'billing-renamed' });
    await adapter.syncGitProject('git_1');
    await adapter.archiveGitProject('git_1');

    expect(fetcher).toHaveBeenNthCalledWith(1, '/api/git/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"display_name":"billing-service","repo_ssh_url":"git@example.com:team/billing-service.git","credential_id":"ssh_1","default_branch":"main"}',
      signal: undefined,
    });
    expect(fetcher).toHaveBeenNthCalledWith(2, '/api/git/projects/git_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{"display_name":"billing-renamed"}',
      signal: undefined,
    });
    expect(fetcher).toHaveBeenNthCalledWith(3, '/api/git/projects/git_1/sync', {
      method: 'POST',
      headers: {},
      signal: undefined,
    });
    expect(fetcher).toHaveBeenNthCalledWith(4, '/api/git/projects/git_1/archive', {
      method: 'POST',
      headers: {},
      signal: undefined,
    });
  });

  it('creates blank and git workspaces with source_type', async () => {
    const workspace = { id: 'ws_1', name: 'Blank', source_type: 'blank', status: 'active' };
    const fetcher = vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ code: 0, message: 'ok', data: workspace }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const adapter = createWorkspaceResourceAdapter({ fetcher });

    await adapter.createWorkspace({ name: 'Scratch', source_type: 'blank' });
    await adapter.createWorkspace({ name: 'Billing', source_type: 'git_project', git_project_id: 'git_1', branch_ref: 'feature/login' });

    expect(fetcher).toHaveBeenNthCalledWith(1, '/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"Scratch","source_type":"blank"}',
      signal: undefined,
    });
    expect(fetcher).toHaveBeenNthCalledWith(2, '/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"Billing","source_type":"git_project","git_project_id":"git_1","branch_ref":"feature/login"}',
      signal: undefined,
    });
  });
});
