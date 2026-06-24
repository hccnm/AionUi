import { describe, expect, it, vi } from 'vitest';

import {
  WorkspaceFileConflictError,
  createWorkspaceRuntimeAdapter,
  mergeExecutionEvent,
} from '../src/aionui/common/resources/workspaceRuntime';

describe('workspace runtime adapter', () => {
  it('lists workspace files with workspace_id and relative path only', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: 'ok',
          data: [{ name: 'README.md', relative_path: 'README.md', kind: 'file', version: 'v1' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const adapter = createWorkspaceRuntimeAdapter({ fetcher });

    await expect(adapter.listFiles('ws_1', 'src/components')).resolves.toMatchObject({
      items: [{ name: 'README.md', path: 'README.md', type: 'file', version: 'v1' }],
      total: 1,
    });
    expect(fetcher).toHaveBeenCalledWith('/api/workspaces/ws_1/files/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"relative_path":"src/components"}',
      signal: undefined,
    });
  });

  it('writes content with base_version and maps conflicts to a typed error', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'VERSION_CONFLICT', message: 'stale version', data: { current_version: 'v2' } }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const adapter = createWorkspaceRuntimeAdapter({ fetcher });

    await expect(
      adapter.writeFile('ws_1', {
        path: 'README.md',
        content: 'next',
        base_version: 'v1',
      })
    ).rejects.toBeInstanceOf(WorkspaceFileConflictError);
    expect(fetcher).toHaveBeenCalledWith('/api/workspaces/ws_1/files/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"relative_path":"README.md","content":"next","base_version":"v1"}',
      signal: undefined,
    });
  });

  it('creates terminals and executions scoped by workspace', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 0, message: 'ok', data: { id: 'term_1', workspace_id: 'ws_1', cwd: 'src', status: 'running' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 0,
            message: 'ok',
            data: { id: 'exec_1', workspace_id: 'ws_1', execution_type: 'test_run', status: 'queued', created_at: 'now', updated_at: 'now' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    const adapter = createWorkspaceRuntimeAdapter({ fetcher });

    await expect(adapter.createTerminal('ws_1', { cwd: 'src', shell: 'bash' })).resolves.toMatchObject({
      id: 'term_1',
      workspace_id: 'ws_1',
    });
    await expect(adapter.createExecution('ws_1', { kind: 'test_run', relative_path: '.', command: 'npm test' })).resolves.toMatchObject({
      id: 'exec_1',
      kind: 'test_run',
    });
    expect(fetcher).toHaveBeenNthCalledWith(1, '/api/workspaces/ws_1/terminals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"relative_path":"src","shell":"bash"}',
      signal: undefined,
    });
    expect(fetcher).toHaveBeenNthCalledWith(2, '/api/workspaces/ws_1/executions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.any(String),
      signal: undefined,
    });
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual({
      execution_type: 'test_run',
      relative_path: '.',
      command: 'npm test',
    });
  });

  it('uses global execution routes and does not call unavailable artifact download endpoint', async () => {
    const fetcher = vi.fn().mockImplementation(() =>
      new Response(JSON.stringify({ code: 0, message: 'ok', data: [{ id: 'artifact_1', execution_id: 'exec_1', artifact_type: 'report', ref_: 'executions/exec_1/report.zip', immutable: true }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const adapter = createWorkspaceRuntimeAdapter({ fetcher });

    await adapter.cancelExecution('ws_1', 'exec_1');
    await adapter.updateExecutionStatus('ws_1', 'exec_1', 'running');
    await adapter.listArtifacts('ws_1', 'exec_1');
    await expect(adapter.getArtifactDownload('ws_1', 'exec_1', 'artifact_1')).rejects.toThrow('Artifact download is not available');

    expect(fetcher).toHaveBeenNthCalledWith(1, '/api/executions/exec_1/cancel', {
      method: 'POST',
      headers: {},
      signal: undefined,
    });
    expect(fetcher).toHaveBeenNthCalledWith(2, '/api/executions/exec_1/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"status":"running"}',
      signal: undefined,
    });
    expect(fetcher).toHaveBeenNthCalledWith(3, '/api/executions/exec_1/artifacts', {
      method: 'GET',
      headers: {},
      signal: undefined,
    });
  });
});

describe('workspace execution events', () => {
  it('merges status, logs, artifact and approval events for matching execution only', () => {
    const initial = {
      id: 'exec_1',
      workspace_id: 'ws_1',
      kind: 'preview_env' as const,
      status: 'queued' as const,
      logs: [],
      artifacts: [],
      created_at: 'now',
      updated_at: 'now',
    };

    const running = mergeExecutionEvent(initial, {
      type: 'status',
      workspace_id: 'ws_1',
      execution_id: 'exec_1',
      status: 'running',
      preview_url: 'https://preview.example.com',
    });
    const logged = mergeExecutionEvent(running, {
      type: 'log',
      workspace_id: 'ws_1',
      execution_id: 'exec_1',
      log: { id: 'log_1', level: 'info', message: 'started', timestamp: 'now' },
    });
    const approved = mergeExecutionEvent(logged, {
      type: 'approval',
      workspace_id: 'ws_1',
      execution_id: 'exec_1',
      approval_state: 'required',
    });
    const ignored = mergeExecutionEvent(approved, {
      type: 'status',
      workspace_id: 'ws_2',
      execution_id: 'exec_2',
      status: 'failed',
    });

    expect(ignored.status).toBe('waiting_approval');
    expect(ignored.logs).toHaveLength(1);
    expect(ignored.approval_state).toBe('required');
    expect(ignored.preview_url).toBe('https://preview.example.com');
  });
});
