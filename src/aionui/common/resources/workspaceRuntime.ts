import { fetchWithSaasAuth } from '../auth/http';
import { sendSharedWebSocketMessage, subscribeSharedWebSocket } from '../adapter/sharedWebSocket';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  has_more?: boolean;
}

export type WorkspaceFileType = 'file' | 'directory';

export interface WorkspaceFileEntry {
  name: string;
  path: string;
  type: WorkspaceFileType;
  size?: number;
  modified_at?: string | number;
  version?: string;
}

export interface WorkspaceFileContent {
  path: string;
  content: string;
  base_version: string;
  language?: string;
  size?: number;
}

export interface WorkspaceFileWriteInput {
  path: string;
  content: string;
  base_version: string;
}

export interface WorkspaceFileUploadInput {
  path: string;
  file_name: string;
  content_base64: string;
  mime_type?: string;
}

export interface WorkspaceFileOperationResult {
  path: string;
  version?: string;
}

export interface WorkspaceTerminalInput {
  cwd?: string;
  shell?: string;
}

export interface WorkspaceTerminalSession {
  id: string;
  workspace_id: string;
  cwd: string;
  status: 'starting' | 'running' | 'closed' | 'failed' | string;
  websocket_url?: string;
  created_at?: string;
}

export type WorkspaceExecutionKind = 'test_run' | 'preview_env';
export type WorkspaceExecutionStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'waiting_approval' | string;
export type WorkspaceApprovalState = 'none' | 'required' | 'approved' | 'rejected' | string;

export interface WorkspaceExecutionLog {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | string;
  message: string;
  timestamp: string;
}

export interface WorkspaceExecutionArtifact {
  id: string;
  execution_id: string;
  name?: string;
  artifact_type?: string;
  ref_?: string;
  metadata?: Record<string, unknown>;
  size?: number;
  mime_type?: string;
  status?: 'ready' | 'pending' | 'failed' | string;
  download_url?: string;
  created_at?: string;
}

export interface WorkspaceExecution {
  id: string;
  workspace_id: string;
  kind: WorkspaceExecutionKind;
  status: WorkspaceExecutionStatus;
  title?: string;
  command?: string;
  relative_path?: string;
  preview_url?: string;
  expires_at?: string;
  ai_retry_state?: string;
  approval_state?: WorkspaceApprovalState;
  logs?: WorkspaceExecutionLog[];
  artifacts?: WorkspaceExecutionArtifact[];
  created_at: string;
  updated_at: string;
}

export interface CreateWorkspaceExecutionInput {
  kind: WorkspaceExecutionKind;
  relative_path?: string;
  command?: string;
  title?: string;
}

export interface ArtifactDownload {
  download_url: string;
  file_name: string;
}

export type WorkspaceExecutionEvent =
  | {
      type: 'status';
      workspace_id: string;
      execution_id: string;
      status: WorkspaceExecutionStatus;
      preview_url?: string;
      expires_at?: string;
      ai_retry_state?: string;
      approval_state?: WorkspaceApprovalState;
    }
  | {
      type: 'log';
      workspace_id: string;
      execution_id: string;
      log: WorkspaceExecutionLog;
    }
  | {
      type: 'artifact';
      workspace_id: string;
      execution_id: string;
      artifact: WorkspaceExecutionArtifact;
    }
  | {
      type: 'preview';
      workspace_id: string;
      execution_id: string;
      preview_url: string;
      expires_at?: string;
    }
  | {
      type: 'approval';
      workspace_id: string;
      execution_id: string;
      approval_state: WorkspaceApprovalState;
    };

interface RuntimeEnvelope<T> {
  code?: 0 | string;
  message?: string;
  data?: T;
  trace_id?: string;
}

interface BackendWorkspaceFileEntry {
  name: string;
  relative_path: string;
  kind: WorkspaceFileType;
  size?: number;
  updated_at?: string | number;
  version?: string;
}

interface BackendWorkspaceFileContent {
  relative_path: string;
  content: string;
  encoding?: string;
  version?: string;
  size?: number;
}

type BackendWorkspaceExecution = Omit<WorkspaceExecution, 'kind'> & {
  execution_type?: WorkspaceExecutionKind;
  kind?: WorkspaceExecutionKind;
};

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;
type WebSocketSender = (name: string, data: unknown) => void;
type WebSocketSubscriber = (eventName: string, listener: (payload: unknown, eventName: string) => void) => () => void;

interface AdapterOptions {
  fetcher?: Fetcher;
  wsSender?: WebSocketSender;
  wsSubscriber?: WebSocketSubscriber;
}

export class WorkspaceFileConflictError extends Error {
  readonly current_version?: string;
  readonly trace_id?: string;

  constructor(message: string, options: { current_version?: string; trace_id?: string } = {}) {
    super(message);
    this.name = 'WorkspaceFileConflictError';
    this.current_version = options.current_version;
    this.trace_id = options.trace_id;
  }
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('Content-Type');
  if (!contentType?.includes('application/json')) return null;
  return response.json();
}

function unwrapEnvelope<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as RuntimeEnvelope<T>).data as T;
  }
  return payload as T;
}

function toPaginatedResult<T>(value: T[] | PaginatedResult<T>): PaginatedResult<T> {
  if (Array.isArray(value)) {
    return {
      items: value,
      total: value.length,
      has_more: false,
    };
  }
  return value;
}

function mapFileEntry(entry: BackendWorkspaceFileEntry): WorkspaceFileEntry {
  return {
    name: entry.name,
    path: entry.relative_path,
    type: entry.kind,
    size: entry.size,
    modified_at: entry.updated_at,
    version: entry.version,
  };
}

function mapFileContent(content: BackendWorkspaceFileContent): WorkspaceFileContent {
  return {
    path: content.relative_path,
    content: content.content,
    base_version: content.version ?? '',
    size: content.size,
  };
}

function mapExecution(execution: BackendWorkspaceExecution): WorkspaceExecution {
  return {
    ...execution,
    kind: execution.kind ?? execution.execution_type ?? 'test_run',
  };
}

async function requestJson<T>(fetcher: Fetcher, input: string, init: RequestInit): Promise<T> {
  const response = await fetcher(input, init);
  const payload = await readJson(response);

  if (!response.ok) {
    const envelope = payload && typeof payload === 'object' ? (payload as RuntimeEnvelope<unknown>) : {};
    const message = envelope.message ?? `Request failed with status ${response.status}`;
    if (response.status === 409 || envelope.code === 'VERSION_CONFLICT') {
      const data = envelope.data as { current_version?: string } | undefined;
      throw new WorkspaceFileConflictError(message, {
        current_version: data?.current_version,
        trace_id: envelope.trace_id,
      });
    }
    throw new Error(message);
  }

  return unwrapEnvelope<T>(payload);
}

function defaultFetcher(input: string, init?: RequestInit): Promise<Response> {
  return fetchWithSaasAuth(input, init, { auth: 'required' });
}

function jsonInit(method: string, body: unknown, signal?: AbortSignal): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  };
}

function getInit(signal?: AbortSignal): RequestInit {
  return { method: 'GET', headers: {}, signal };
}

function encodePath(path = '.'): string {
  return path || '.';
}

function workspacePath(workspaceId: string, suffix: string): string {
  return `/api/workspaces/${encodeURIComponent(workspaceId)}${suffix}`;
}

function upsertArtifact(
  current: WorkspaceExecutionArtifact[] = [],
  artifact: WorkspaceExecutionArtifact
): WorkspaceExecutionArtifact[] {
  const map = new Map(current.map((item) => [item.id, item]));
  map.set(artifact.id, { ...map.get(artifact.id), ...artifact });
  return [...map.values()];
}

export function mergeExecutionEvent(execution: WorkspaceExecution, event: WorkspaceExecutionEvent): WorkspaceExecution {
  if (event.workspace_id !== execution.workspace_id || event.execution_id !== execution.id) {
    return execution;
  }

  if (event.type === 'status') {
    return {
      ...execution,
      status: event.status,
      preview_url: event.preview_url ?? execution.preview_url,
      expires_at: event.expires_at ?? execution.expires_at,
      ai_retry_state: event.ai_retry_state ?? execution.ai_retry_state,
      approval_state: event.approval_state ?? execution.approval_state,
      updated_at: new Date().toISOString(),
    };
  }

  if (event.type === 'log') {
    return {
      ...execution,
      logs: [...(execution.logs ?? []), event.log].slice(-500),
      updated_at: event.log.timestamp,
    };
  }

  if (event.type === 'artifact') {
    return {
      ...execution,
      artifacts: upsertArtifact(execution.artifacts, event.artifact),
      updated_at: event.artifact.created_at ?? new Date().toISOString(),
    };
  }

  if (event.type === 'preview') {
    return {
      ...execution,
      preview_url: event.preview_url,
      expires_at: event.expires_at ?? execution.expires_at,
      updated_at: new Date().toISOString(),
    };
  }

  return {
    ...execution,
    approval_state: event.approval_state,
    status: event.approval_state === 'required' ? 'waiting_approval' : execution.status,
    updated_at: new Date().toISOString(),
  };
}

function isExecutionEvent(payload: unknown): payload is WorkspaceExecutionEvent {
  if (!payload || typeof payload !== 'object') return false;
  const value = payload as Partial<WorkspaceExecutionEvent>;
  return typeof value.type === 'string' && typeof value.workspace_id === 'string' && typeof value.execution_id === 'string';
}

export function createWorkspaceRuntimeAdapter(options: AdapterOptions = {}) {
  const fetcher = options.fetcher ?? defaultFetcher;
  const wsSender = options.wsSender ?? sendSharedWebSocketMessage;
  const wsSubscriber = options.wsSubscriber ?? subscribeSharedWebSocket;

  return {
    listFiles(workspaceId: string, path = '.', signal?: AbortSignal) {
      return requestJson<BackendWorkspaceFileEntry[] | PaginatedResult<BackendWorkspaceFileEntry>>(
        fetcher,
        workspacePath(workspaceId, '/files/list'),
        jsonInit('POST', { relative_path: encodePath(path) }, signal)
      ).then((result) => {
        const paginated = toPaginatedResult(result);
        return {
          ...paginated,
          items: paginated.items.map(mapFileEntry),
        };
      });
    },
    readFile(workspaceId: string, path: string, signal?: AbortSignal) {
      return requestJson<BackendWorkspaceFileContent>(
        fetcher,
        workspacePath(workspaceId, '/files/read'),
        jsonInit('POST', { relative_path: encodePath(path) }, signal)
      ).then(mapFileContent);
    },
    writeFile(workspaceId: string, input: WorkspaceFileWriteInput, signal?: AbortSignal) {
      return requestJson<WorkspaceFileOperationResult>(
        fetcher,
        workspacePath(workspaceId, '/files/write'),
        jsonInit('POST', { relative_path: input.path, content: input.content, base_version: input.base_version }, signal)
      );
    },
    mkdir(workspaceId: string, path: string, signal?: AbortSignal) {
      return requestJson<WorkspaceFileOperationResult>(
        fetcher,
        workspacePath(workspaceId, '/files/mkdir'),
        jsonInit('POST', { relative_path: path }, signal)
      );
    },
    rename(workspaceId: string, path: string, newPath: string, signal?: AbortSignal) {
      return requestJson<WorkspaceFileOperationResult>(
        fetcher,
        workspacePath(workspaceId, '/files/rename'),
        jsonInit('POST', { relative_path: path, new_relative_path: newPath }, signal)
      );
    },
    delete(workspaceId: string, path: string, signal?: AbortSignal) {
      return requestJson<void>(fetcher, workspacePath(workspaceId, '/files/delete'), jsonInit('POST', { relative_path: encodePath(path) }, signal));
    },
    upload(workspaceId: string, input: WorkspaceFileUploadInput, signal?: AbortSignal) {
      return requestJson<BackendWorkspaceFileEntry>(
        fetcher,
        workspacePath(workspaceId, '/files/upload'),
        jsonInit('POST', { ...input, relative_path: input.path, path: undefined }, signal)
      ).then(mapFileEntry);
    },
    createTerminal(workspaceId: string, input: WorkspaceTerminalInput, signal?: AbortSignal) {
      return requestJson<WorkspaceTerminalSession>(
        fetcher,
        workspacePath(workspaceId, '/terminals'),
        jsonInit('POST', { relative_path: input.cwd ?? '.', shell: input.shell }, signal)
      );
    },
    createExecution(workspaceId: string, input: CreateWorkspaceExecutionInput, signal?: AbortSignal) {
      return requestJson<BackendWorkspaceExecution>(
        fetcher,
        workspacePath(workspaceId, '/executions'),
        jsonInit('POST', { ...input, execution_type: input.kind, kind: undefined }, signal)
      ).then(mapExecution);
    },
    listExecutions(workspaceId: string, signal?: AbortSignal) {
      return requestJson<BackendWorkspaceExecution[] | PaginatedResult<BackendWorkspaceExecution>>(
        fetcher,
        workspacePath(workspaceId, '/executions'),
        getInit(signal)
      ).then((result) => {
        const paginated = toPaginatedResult(result);
        return {
          ...paginated,
          items: paginated.items.map(mapExecution),
        };
      });
    },
    getExecution(workspaceId: string, executionId: string, signal?: AbortSignal) {
      void workspaceId;
      void executionId;
      void signal;
      return Promise.reject(new Error('Execution detail endpoint is not available'));
    },
    cancelExecution(workspaceId: string, executionId: string, signal?: AbortSignal) {
      void workspaceId;
      return requestJson<BackendWorkspaceExecution>(
        fetcher,
        `/api/executions/${encodeURIComponent(executionId)}/cancel`,
        { method: 'POST', headers: {}, signal }
      ).then(mapExecution);
    },
    updateExecutionStatus(workspaceId: string, executionId: string, status: WorkspaceExecutionStatus, signal?: AbortSignal) {
      void workspaceId;
      return requestJson<BackendWorkspaceExecution>(
        fetcher,
        `/api/executions/${encodeURIComponent(executionId)}/status`,
        jsonInit('POST', { status }, signal)
      ).then(mapExecution);
    },
    redeployExecution(workspaceId: string, executionId: string, signal?: AbortSignal) {
      void executionId;
      return requestJson<BackendWorkspaceExecution>(
        fetcher,
        workspacePath(workspaceId, '/executions'),
        jsonInit('POST', { execution_type: 'preview_env' }, signal)
      ).then(mapExecution);
    },
    approveRetry(workspaceId: string, executionId: string, signal?: AbortSignal) {
      void workspaceId;
      void executionId;
      void signal;
      return Promise.reject(new Error('Approve retry endpoint is not available'));
    },
    listArtifacts(workspaceId: string, executionId: string, signal?: AbortSignal) {
      void workspaceId;
      return requestJson<WorkspaceExecutionArtifact[] | PaginatedResult<WorkspaceExecutionArtifact>>(
        fetcher,
        `/api/executions/${encodeURIComponent(executionId)}/artifacts`,
        getInit(signal)
      ).then(toPaginatedResult);
    },
    getArtifactDownload(workspaceId: string, executionId: string, artifactId: string, signal?: AbortSignal) {
      void workspaceId;
      void executionId;
      void artifactId;
      void signal;
      return Promise.reject(new Error('Artifact download is not available'));
    },
    subscribeExecutionEvents(
      workspaceId: string,
      listener: (event: WorkspaceExecutionEvent) => void,
      executionId?: string
    ): () => void {
      const subscription = { workspace_id: workspaceId, execution_id: executionId };
      wsSender('workspace.execution.subscribe', subscription);
      const unsubscribe = wsSubscriber('workspace.execution.event', (payload) => {
        if (!isExecutionEvent(payload)) return;
        if (payload.workspace_id !== workspaceId) return;
        if (executionId && payload.execution_id !== executionId) return;
        listener(payload);
      });
      return () => {
        unsubscribe();
        wsSender('workspace.execution.unsubscribe', subscription);
      };
    },
  };
}

export const workspaceRuntimeAdapter = createWorkspaceRuntimeAdapter();
