import { fetchWithSaasAuth } from '../auth/http';

export type ResourceStatus = 'active' | 'archived' | 'disabled' | 'syncing' | 'error' | string;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export interface SshCredential {
  id: string;
  name: string;
  public_key?: string;
  fingerprint?: string;
  status?: ResourceStatus;
  created_at: string;
  updated_at?: string | number;
}

export interface UploadSshCredentialInput {
  name: string;
  private_key: string;
  passphrase?: string;
}

export interface GenerateSshCredentialInput {
  name: string;
  comment?: string;
}

export interface GitProject {
  id: string;
  display_name: string;
  repo_ssh_url: string;
  default_branch?: string;
  credential_id?: string;
  status: ResourceStatus;
  last_verified_at?: string | number | null;
  last_synced_at?: string | number | null;
  created_at: string | number;
  updated_at?: string | number;
}

export interface CreateGitProjectInput {
  display_name: string;
  repo_ssh_url: string;
  credential_id: string;
  default_branch?: string;
}

export type UpdateGitProjectInput = Partial<CreateGitProjectInput>;

export interface WorkspaceResource {
  id: string;
  name: string;
  status: 'active' | 'archived' | string;
  source_type: 'blank' | 'git_project' | string;
  git_project_id?: string | null;
  branch_ref?: string | null;
  root_rel_path?: string | null;
  created_at?: string | number;
  updated_at?: string | number;
}

export type CreateWorkspaceInput = {
  name: string;
  source_type: 'blank';
} | {
  name: string;
  source_type: 'git_project';
  git_project_id: string;
  branch_ref?: string;
};

interface GenerateSshCredentialResponse {
  credential: SshCredential;
  public_key: string;
}

interface ResourceEnvelope<T> {
  code?: 0 | string;
  message?: string;
  data?: T;
  trace_id?: string;
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

interface AdapterOptions {
  fetcher?: Fetcher;
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('Content-Type');
  if (!contentType?.includes('application/json')) return null;
  return response.json();
}

function unwrapEnvelope<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ResourceEnvelope<T>).data as T;
  }
  return payload as T;
}

function toPaginatedResult<T>(value: T[] | PaginatedResult<T>): PaginatedResult<T> {
  if (Array.isArray(value)) {
    return {
      items: value,
      total: value.length,
    };
  }
  return value;
}

async function requestJson<T>(fetcher: Fetcher, input: string, init: RequestInit): Promise<T> {
  const response = await fetcher(input, init);
  const payload = await readJson(response);

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message?: unknown }).message)
        : `Request failed with status ${response.status}`;
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

export function createWorkspaceResourceAdapter(options: AdapterOptions = {}) {
  const fetcher = options.fetcher ?? defaultFetcher;

  return {
    listSshCredentials(signal?: AbortSignal) {
      return requestJson<SshCredential[] | PaginatedResult<SshCredential>>(fetcher, '/api/git/ssh-credentials', {
        method: 'GET',
        headers: {},
        signal,
      }).then(toPaginatedResult);
    },
    uploadSshCredential(input: UploadSshCredentialInput, signal?: AbortSignal) {
      return requestJson<SshCredential>(fetcher, '/api/git/ssh-credentials', jsonInit('POST', input, signal));
    },
    generateSshCredential(input: GenerateSshCredentialInput, signal?: AbortSignal) {
      return requestJson<GenerateSshCredentialResponse>(fetcher, '/api/git/ssh-credentials/generate', jsonInit('POST', input, signal)).then(
        (response) => ({
          ...response.credential,
          public_key: response.public_key,
        })
      );
    },
    listGitProjects(signal?: AbortSignal) {
      return requestJson<GitProject[] | PaginatedResult<GitProject>>(fetcher, '/api/git/projects', {
        method: 'GET',
        headers: {},
        signal,
      }).then(toPaginatedResult);
    },
    createGitProject(input: CreateGitProjectInput, signal?: AbortSignal) {
      return requestJson<GitProject>(fetcher, '/api/git/projects', jsonInit('POST', input, signal));
    },
    updateGitProject(id: string, input: UpdateGitProjectInput, signal?: AbortSignal) {
      return requestJson<GitProject>(fetcher, `/api/git/projects/${encodeURIComponent(id)}`, jsonInit('PATCH', input, signal));
    },
    syncGitProject(id: string, signal?: AbortSignal) {
      return requestJson<GitProject>(fetcher, `/api/git/projects/${encodeURIComponent(id)}/sync`, {
        method: 'POST',
        headers: {},
        signal,
      });
    },
    archiveGitProject(id: string, signal?: AbortSignal) {
      return requestJson<GitProject>(fetcher, `/api/git/projects/${encodeURIComponent(id)}/archive`, {
        method: 'POST',
        headers: {},
        signal,
      });
    },
    deleteGitProject(id: string, signal?: AbortSignal) {
      return requestJson<void>(fetcher, `/api/git/projects/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {},
        signal,
      });
    },
    listWorkspaces(signal?: AbortSignal) {
      return requestJson<WorkspaceResource[] | PaginatedResult<WorkspaceResource>>(fetcher, '/api/workspaces', {
        method: 'GET',
        headers: {},
        signal,
      }).then(toPaginatedResult);
    },
    createWorkspace(input: CreateWorkspaceInput, signal?: AbortSignal) {
      return requestJson<WorkspaceResource>(fetcher, '/api/workspaces', jsonInit('POST', input, signal));
    },
    getWorkspace(id: string, signal?: AbortSignal) {
      return requestJson<WorkspaceResource>(fetcher, `/api/workspaces/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: {},
        signal,
      });
    },
    renameWorkspace(id: string, name: string, signal?: AbortSignal) {
      return requestJson<WorkspaceResource>(
        fetcher,
        `/api/workspaces/${encodeURIComponent(id)}`,
        jsonInit('PATCH', { name }, signal)
      );
    },
    archiveWorkspace(id: string, signal?: AbortSignal) {
      return requestJson<WorkspaceResource>(fetcher, `/api/workspaces/${encodeURIComponent(id)}/archive`, {
        method: 'POST',
        headers: {},
        signal,
      });
    },
    restoreWorkspace(id: string, signal?: AbortSignal) {
      return requestJson<WorkspaceResource>(fetcher, `/api/workspaces/${encodeURIComponent(id)}/restore`, {
        method: 'POST',
        headers: {},
        signal,
      });
    },
    deleteWorkspace(id: string, signal?: AbortSignal) {
      return requestJson<void>(fetcher, `/api/workspaces/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {},
        signal,
      });
    },
  };
}

export const workspaceResourceAdapter = createWorkspaceResourceAdapter();
