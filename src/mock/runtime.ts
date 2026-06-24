import type { IConversationArtifact } from '@/common/adapter/ipcBridge';
import type { TMessage } from '@/common/chat/chatLib';

const MOCK_ORIGIN = 'http://aionweb.mock';

type MockUser = {
  id: string;
  username: string;
};

type MockConversation = {
  created_at: number;
  modified_at: number;
  id: string;
  name: string;
  type: 'remote';
  status: 'finished';
  extra: {
    workspace?: string;
    display_path?: string;
    custom_workspace: boolean;
    pinned?: boolean;
    pinned_at?: number;
    skills?: string[];
  };
  model?: {
    provider_id: string;
    model: string;
    use_model: string;
  };
  workspace_id?: string;
};

type MockSshCredential = {
  id: string;
  name: string;
  public_key: string;
  fingerprint: string;
  created_at: string;
};

type MockGitProject = {
  id: string;
  display_name: string;
  repo_ssh_url: string;
  default_branch: string;
  credential_id: string;
  status: string;
  created_at: string | number;
  updated_at: string | number;
  last_synced_at?: string | number | null;
};

type MockWorkspaceResource = {
  id: string;
  name: string;
  status: 'active' | 'archived';
  source_type: 'blank' | 'git_project';
  git_project_id?: string | null;
  branch_ref?: string | null;
  root_rel_path?: string | null;
  display_path?: string;
  created_at: string | number;
  updated_at: string | number;
};

type MockAdminRole = {
  id: string;
  role_key: string;
  role_name: string;
  description?: string;
  permissions: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

type MockAdminUser = {
  id: string;
  phone: string;
  display_name: string;
  avatar_url: string | null;
  status: 'enabled' | 'disabled';
  roles: MockAdminRole[];
  external_identities: Array<{ provider: string; external_user_id: string; display_name?: string }>;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

type MockWorkspaceFile = {
  path: string;
  content: string;
  version: number;
  modified_at: string;
};

type MockTerminalSession = {
  id: string;
  workspace_id: string;
  cwd: string;
  status: 'running' | 'closed';
  created_at: string;
};

type MockExecution = {
  id: string;
  workspace_id: string;
  execution_type: 'test_run' | 'preview_env';
  kind?: 'test_run' | 'preview_env';
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'waiting_approval';
  title?: string;
  command?: string;
  relative_path?: string;
  preview_url?: string;
  expires_at?: string;
  approval_state?: 'none' | 'required' | 'approved';
  logs: Array<{ id: string; level: 'info' | 'warn' | 'error'; message: string; timestamp: string }>;
  artifacts: MockExecutionArtifact[];
  created_at: string;
  updated_at: string;
};

type MockExecutionArtifact = {
  id: string;
  execution_id: string;
  name?: string;
  artifact_type: string;
  ref_: string;
  metadata?: Record<string, unknown>;
  size?: number;
  mime_type?: string;
  status: 'ready';
  immutable: boolean;
  created_at: string;
};

type MockTextMessage = {
  id: string;
  msg_id?: string;
  conversation_id: string;
  type: 'text';
  position: 'left' | 'right';
  content: { content: string };
  created_at: number;
  status?: 'finish' | 'pending';
};

type MockDbMessage = TMessage;

type MockResponseMessage = {
  type: string;
  data: unknown;
  msg_id: string;
  conversation_id: string;
  created_at?: number;
  replace?: boolean;
};

type MockSocketListener = (payload: string) => void;

type MockState = {
  nextId: number;
  currentUser: MockUser | null;
  needsSetup: boolean;
  accessToken: string | null;
  wsToken: string | null;
  settings: Record<string, unknown>;
  sshCredentials: MockSshCredential[];
  gitProjects: MockGitProject[];
  workspaces: MockWorkspaceResource[];
  adminRoles: MockAdminRole[];
  adminUsers: MockAdminUser[];
  workspaceFiles: Record<string, Record<string, MockWorkspaceFile>>;
  terminalSessions: Record<string, MockTerminalSession[]>;
  executions: Record<string, MockExecution[]>;
  conversations: MockConversation[];
  messages: Record<string, MockDbMessage[]>;
  artifacts: Record<string, IConversationArtifact[]>;
  requestLog: Array<{
    method: string;
    path: string;
    body?: unknown;
  }>;
  socketListeners: Set<MockSocketListener>;
};

const createInitialConversation = (now: number): MockConversation => ({
  created_at: now - 60_000,
  modified_at: now - 30_000,
  id: 'conv-demo',
  name: 'AionWeb Demo Showcase',
  type: 'remote',
  status: 'finished',
  extra: {
    workspace: '/srv/aion/demo-workspace',
    custom_workspace: true,
  },
  model: {
    provider_id: 'mock-provider',
    model: 'mock-remote',
    use_model: 'mock-remote',
  },
});

function buildUnifiedDiff(fileName: string, before: string, after: string): string {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  return [
    `--- ${fileName}`,
    `+++ ${fileName}`,
    `@@ -1,${beforeLines.length} +1,${afterLines.length} @@`,
    ...beforeLines.map((line) => `-${line}`),
    ...afterLines.map((line) => `+${line}`),
  ].join('\n');
}

function createShowcaseMessages(conversationId: string, now: number): MockDbMessage[] {
  const readmeBefore = ['# AionWeb Demo', '', 'This workspace starts with a minimal mock chat.'].join('\n');
  const readmeAfter = [
    '# AionWeb Demo Showcase',
    '',
    'This workspace now demonstrates message cards, tool summaries, permissions, plans, and artifacts.',
    '',
    '- markdown text',
    '- tool/file summaries',
    '- runtime and permission cards',
  ].join('\n');
  const readmeDiff = buildUnifiedDiff('README.md', readmeBefore, readmeAfter);

  return [
    {
      id: 'msg-show-user-1',
      msg_id: 'msg-show-user-1',
      conversation_id: conversationId,
      type: 'text',
      position: 'right',
      created_at: now - 240_000,
      status: 'finish',
      content: {
        content: '给我一个 mock 聊天，把所有常见展示内容都摆出来。',
      },
    },
    {
      id: 'msg-show-agent-1',
      msg_id: 'msg-show-agent-1',
      conversation_id: conversationId,
      type: 'text',
      position: 'left',
      created_at: now - 235_000,
      status: 'finish',
      content: {
        content: [
          '下面这条 mock 会话会尽量覆盖当前聊天区主要展示形态：',
          '',
          '- Markdown 段落、列表、引用和表格',
          '- 提示卡片、计划卡片、思考卡片',
          '- 工具步骤汇总、文件变更汇总、权限卡片',
          '- cron / skill artifact 卡片',
          '',
          '> 这是一条引用内容，用来检查排版间距。',
          '',
          '| 类型 | 作用 |',
          '| --- | --- |',
          '| `text` | 普通聊天与 Markdown |',
          '| `tool_group` | 步骤汇总 / 文件汇总 |',
          '| `permission` | 交互确认卡片 |',
          '',
          '```ts',
          'const showcase = { runtime: "mock", status: "ready" }',
          '```',
        ].join('\n'),
      },
    },
    {
      id: 'msg-show-tip-warning',
      msg_id: 'msg-show-tip-warning',
      conversation_id: conversationId,
      type: 'tips',
      position: 'center',
      created_at: now - 228_000,
      content: {
        type: 'warning',
        content:
          '这是一个 warning 提示卡片，用来检查折叠文本、颜色层级和反馈按钮留白。内容故意写长一点，方便观察多行换行与截断遮罩是否自然。',
      },
    },
    {
      id: 'msg-show-tip-json',
      msg_id: 'msg-show-tip-json',
      conversation_id: conversationId,
      type: 'tips',
      position: 'center',
      created_at: now - 220_000,
      content: {
        type: 'warning',
        content: JSON.stringify(
          {
            phase: 'mock-render',
            renderer: 'json-tip-preview',
            checks: ['spacing', 'code-block', 'color tokens'],
          },
          null,
          2
        ),
      },
    },
    {
      id: 'msg-show-agent-connected',
      msg_id: 'msg-show-agent-connected',
      conversation_id: conversationId,
      type: 'agent_status',
      position: 'left',
      created_at: now - 212_000,
      content: {
        backend: 'remote',
        status: 'connected',
        agent_name: 'Mock Remote Agent',
      },
    },
    {
      id: 'msg-show-thinking',
      msg_id: 'msg-show-thinking',
      conversation_id: conversationId,
      type: 'thinking',
      position: 'left',
      created_at: now - 205_000,
      content: {
        subject: 'Analyzing renderer coverage',
        content: '正在核对消息类型、聚合逻辑和 artifact 展示条件，确保 mock 数据尽量贴近真实结构。',
        status: 'thinking',
      },
    },
    {
      id: 'msg-show-plan',
      msg_id: 'msg-show-plan',
      conversation_id: conversationId,
      type: 'plan',
      position: 'left',
      created_at: now - 195_000,
      content: {
        session_id: conversationId,
        entries: [
          { content: '盘点消息渲染类型', status: 'completed' },
          { content: '组装 mock showcase 数据', status: 'completed' },
          { content: '在浏览器里逐项检查样式', status: 'in_progress' },
        ],
      },
    },
    {
      id: 'msg-show-tool-group-file',
      msg_id: 'msg-show-tool-group-file',
      conversation_id: conversationId,
      type: 'tool_group',
      position: 'left',
      created_at: now - 188_000,
      content: [
        {
          call_id: 'write-readme-showcase',
          description: 'Update README showcase content',
          name: 'WriteFile',
          render_output_as_markdown: false,
          result_display: {
            file_diff: readmeDiff,
            file_name: 'README.md',
          },
          status: 'Success',
        },
      ],
    },
    {
      id: 'msg-show-tool-group-steps',
      msg_id: 'msg-show-tool-group-steps',
      conversation_id: conversationId,
      type: 'tool_group',
      position: 'left',
      created_at: now - 180_000,
      content: [
        {
          call_id: 'list-renderers',
          description: 'Inspect available renderers',
          name: 'ReadFile',
          render_output_as_markdown: false,
          status: 'Success',
          result_display: 'Loaded MessageList.tsx and message components.',
        },
        {
          call_id: 'collect-mock-data',
          description: 'Assemble mock payloads',
          name: 'PlanSteps',
          render_output_as_markdown: true,
          status: 'Pending',
          result_display: 'Preparing tool, permission and artifact samples.',
        },
      ],
    },
    {
      id: 'msg-show-tool-call',
      msg_id: 'msg-show-tool-call',
      conversation_id: conversationId,
      type: 'tool_call',
      position: 'left',
      created_at: now - 172_000,
      content: {
        call_id: 'web-search-1',
        name: 'web_search',
        description: 'Collect release notes',
        args: {
          query: 'AionUi latest release notes',
          top_k: 3,
        },
        status: 'completed',
        output: 'Found changelog, docs, and issue references.',
      },
    },
    {
      id: 'msg-show-acp-tool-call',
      msg_id: 'msg-show-acp-tool-call',
      conversation_id: conversationId,
      type: 'acp_tool_call',
      position: 'left',
      created_at: now - 164_000,
      content: {
        session_id: conversationId,
        update: {
          sessionUpdate: 'tool_call',
          tool_call_id: 'acp-edit-home-copy',
          status: 'completed',
          title: 'Revise home empty state copy',
          kind: 'edit',
          rawInput: {
            path: 'src/pages/home.tsx',
            description: 'Make the empty state copy more explicit for showcase mode.',
          },
          content: [
            {
              type: 'content',
              content: {
                type: 'text',
                text: 'Updated the empty state helper copy and kept the CTA concise.',
              },
            },
            {
              type: 'diff',
              path: 'src/pages/home.tsx',
              old_text: 'const helper = "Start a chat";',
              new_text: 'const helper = "Start a showcase chat";',
            },
          ],
        },
      },
    },
    {
      id: 'msg-show-permission',
      msg_id: 'msg-show-permission',
      conversation_id: conversationId,
      type: 'permission',
      position: 'left',
      created_at: now - 156_000,
      content: {
        id: 'perm-shell-1',
        action: 'exec',
        title: 'Approve mock command execution',
        description: 'Allow the mock agent to run `pnpm test --filter messages`?',
        call_id: 'perm-shell-1',
        command_type: 'pnpm',
        options: [
          { label: 'Allow once', value: 'proceed_once' },
          { label: 'Always allow pnpm', value: 'proceed_always' },
          { label: 'Reject', value: 'reject_once' },
        ],
      },
    },
    {
      id: 'msg-show-acp-permission',
      msg_id: 'msg-show-acp-permission',
      conversation_id: conversationId,
      type: 'acp_permission',
      position: 'left',
      created_at: now - 148_000,
      content: {
        session_id: conversationId,
        options: [
          { option_id: 'allow_once', name: 'Allow once', kind: 'allow_once' },
          { option_id: 'allow_always', name: 'Always allow', kind: 'allow_always' },
          { option_id: 'reject_once', name: 'Reject', kind: 'reject_once' },
        ],
        tool_call: {
          tool_call_id: 'acp-permission-read-env',
          title: 'Read .env.local',
          kind: 'read',
          raw_input: {
            command: 'cat .env.local',
            description: 'Inspect local environment overrides for preview settings.',
          },
        },
      },
    },
    {
      id: 'msg-show-tip-error',
      msg_id: 'msg-show-tip-error',
      conversation_id: conversationId,
      type: 'tips',
      position: 'center',
      created_at: now - 140_000,
      content: {
        type: 'error',
        content: 'Mock provider token is missing for the screenshot export tool.',
        error: {
          message: 'Mock provider token is missing for the screenshot export tool.',
          code: 'USER_LLM_PROVIDER_AUTH_REQUIRED',
          ownership: 'user_llm_provider',
          detail: 'Set a provider token before invoking image-export related capabilities.',
          retryable: false,
          feedback_recommended: false,
          resolution: {
            kind: 'check_provider_credentials',
            target: 'provider_settings',
          },
        },
      },
    },
    {
      id: 'msg-show-agent-error',
      msg_id: 'msg-show-agent-error',
      conversation_id: conversationId,
      type: 'agent_status',
      position: 'left',
      created_at: now - 132_000,
      content: {
        backend: 'remote',
        status: 'error',
        agent_name: 'Mock Remote Agent',
      },
    },
    {
      id: 'msg-show-agent-2',
      msg_id: 'msg-show-agent-2',
      conversation_id: conversationId,
      type: 'text',
      position: 'left',
      created_at: now - 120_000,
      status: 'finish',
      content: {
        content: [
          '展示样本已就位。',
          '',
          '你现在可以重点检查：',
          '',
          '1. 工具步骤汇总的展开态',
          '2. 文件 diff 卡片的边框与滚动',
          '3. permission / acp_permission 卡片的间距',
          '4. artifact 卡片和消息正文之间的留白',
        ].join('\n'),
      },
    },
  ];
}

function createShowcaseArtifacts(conversationId: string, now: number): IConversationArtifact[] {
  return [
    {
      id: 'artifact-cron-showcase',
      conversation_id: conversationId,
      kind: 'cron_trigger',
      status: 'active',
      payload: {
        cron_job_id: 'cron-showcase-nightly',
        cron_job_name: 'Nightly Mock Render Audit',
        triggered_at: now - 110_000,
      },
      created_at: now - 110_000,
      updated_at: now - 110_000,
    },
    {
      id: 'artifact-skill-showcase',
      conversation_id: conversationId,
      kind: 'skill_suggest',
      status: 'pending',
      cron_job_id: 'cron-showcase-nightly',
      payload: {
        cron_job_id: 'cron-showcase-nightly',
        name: 'render-audit-checklist',
        description: 'A reusable checklist for visually auditing chat cards and spacing.',
        skillContent: ['# render-audit-checklist', '', '- verify spacing', '- verify tool cards', '- verify artifacts'].join(
          '\n'
        ),
      },
      created_at: now - 100_000,
      updated_at: now - 100_000,
    },
  ];
}

function createMockAssistant() {
  return {
    id: 'assistant-mock-remote',
    source: 'builtin' as const,
    name: 'Mock Remote Agent',
    name_i18n: { 'zh-CN': 'Mock Remote Agent' },
    description: 'A built-in assistant used by the AionWeb mock runtime.',
    description_i18n: { 'zh-CN': 'AionWeb mock runtime 内置助手。' },
    avatar: '',
    enabled: true,
    sort_order: 0,
    preset_agent_type: 'remote',
    enabled_skills: [],
    custom_skill_names: [],
    disabled_builtin_skills: [],
    context: '',
    context_i18n: {},
    prompts: [],
    prompts_i18n: {},
    models: ['mock-remote'],
  };
}

const createInitialState = (): MockState => {
  const now = Date.now();
  const conversation = createInitialConversation(now);
  const nowIso = new Date(now).toISOString();
  const adminRole: MockAdminRole = {
    id: 'role_admin',
    role_key: 'admin',
    role_name: '管理员',
    description: 'System administrator',
    permissions: [
      'admin:user:list',
      'admin:user:update',
      'admin:user:reset-password',
      'admin:user:assign-role',
      'admin:role:list',
      'admin:role:create',
      'admin:role:update',
    ],
    is_system: true,
    created_at: nowIso,
    updated_at: nowIso,
  };
  const viewerRole: MockAdminRole = {
    id: 'role_viewer',
    role_key: 'viewer',
    role_name: 'Viewer',
    description: 'Read only user',
    permissions: [],
    is_system: false,
    created_at: nowIso,
    updated_at: nowIso,
  };

  return {
    nextId: 1,
    currentUser: null,
    needsSetup: false,
    accessToken: null,
    wsToken: null,
    settings: {
      language: 'zh-CN',
      theme: 'light',
    },
    sshCredentials: [
      {
        id: 'ssh-demo',
        name: 'Demo SSH',
        public_key: 'ssh-ed25519 AAAA mock',
        fingerprint: 'SHA256:mock',
        created_at: new Date(now).toISOString(),
      },
    ],
    gitProjects: [
      {
        id: 'git-demo',
        display_name: 'Aion Web',
        repo_ssh_url: 'git@github.com:office-ai/aion-web.git',
        default_branch: 'main',
        credential_id: 'ssh-demo',
        status: 'active',
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      },
    ],
    workspaces: [
      {
        id: 'ws-demo',
        name: 'Aion Web Main',
        status: 'active',
        source_type: 'git_project',
        display_path: 'aion-web/main',
        git_project_id: 'git-demo',
        branch_ref: 'main',
        root_rel_path: 'workspaces/ws-demo/repo',
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      },
    ],
    adminRoles: [adminRole, viewerRole],
    adminUsers: [
      {
        id: 'user-demo',
        phone: '13800138000',
        display_name: '13800138000',
        avatar_url: null,
        status: 'enabled',
        roles: [adminRole],
        external_identities: [{ provider: 'password', external_user_id: '13800138000' }],
        created_at: nowIso,
        updated_at: nowIso,
        last_login_at: nowIso,
      },
    ],
    workspaceFiles: {
      'ws-demo': {
        'README.md': {
          path: 'README.md',
          content: '# Aion Web\n\nMock workspace README.',
          version: 1,
          modified_at: new Date(now).toISOString(),
        },
        'src/index.ts': {
          path: 'src/index.ts',
          content: 'export const runtime = "mock";',
          version: 1,
          modified_at: new Date(now).toISOString(),
        },
      },
    },
    terminalSessions: {
      'ws-demo': [],
    },
    executions: {
      'ws-demo': [],
    },
    conversations: [conversation],
    messages: {
      [conversation.id]: createShowcaseMessages(conversation.id, now),
    },
    artifacts: {
      [conversation.id]: createShowcaseArtifacts(conversation.id, now),
    },
    requestLog: [],
    socketListeners: new Set(),
  };
};

const mockState = createInitialState();

let installed = false;
let originalFetch: typeof globalThis.fetch | undefined;
let originalWebSocket: typeof globalThis.WebSocket | undefined;

function isInterceptMode(): boolean {
  return (import.meta.env.VITE_AIONWEB_MOCK_MODE ?? '').trim().toLowerCase() === 'intercept';
}

function nextId(prefix: string): string {
  mockState.nextId += 1;
  return `${prefix}-${mockState.nextId}`;
}

function jsonResponse(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });
}

function emptyOk(): Response {
  return new Response(null, { status: 204 });
}

function notFound(message = 'Not Found'): Response {
  return jsonResponse({ success: false, error: message }, { status: 404 });
}

function listConversations() {
  return {
    data: {
      items: [...mockState.conversations].sort((left, right) => right.modified_at - left.modified_at),
      total: mockState.conversations.length,
      has_more: false,
    },
  };
}

function createAccessToken(username: string): string {
  return `mock-access-token:${username}:${Date.now()}`;
}

function toPhase2CurrentUser(user: MockUser) {
  return {
    id: user.id,
    phone: user.username,
    username: user.username,
    display_name: user.username,
    roles: mockState.adminRoles
      .filter((role) => role.role_key === 'admin')
      .map((role) => ({ id: role.id, role_key: role.role_key, role_name: role.role_name, permissions: ['*'] })),
    permission_flags: ['*', 'admin:user:list', 'admin:user:update', 'admin:role:list', 'admin:role:update'],
    is_admin: true,
  };
}

function createWsToken(): string {
  return `mock-ws-token:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function readAuthorization(init?: RequestInit): string | null {
  const headers = init?.headers;
  if (!headers) return null;
  if (headers instanceof Headers) {
    return headers.get('Authorization');
  }
  if (Array.isArray(headers)) {
    const matched = headers.find(([key]) => key.toLowerCase() === 'authorization');
    return matched?.[1] ?? null;
  }

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'authorization') {
      return value;
    }
  }

  return null;
}

function hasValidBearerAuth(init?: RequestInit): boolean {
  const authHeader = readAuthorization(init);
  return authHeader === `Bearer ${mockState.accessToken}`;
}

function broadcast(name: string, data: unknown): void {
  const payload = JSON.stringify({ name, data });
  for (const listener of mockState.socketListeners) {
    listener(payload);
  }
}

function sanitizeRelativePath(path: string | null | undefined): string {
  const normalized = (path || '.').replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
  if (!normalized || normalized === '.') return '.';
  const segments = normalized.split('/').filter((segment) => segment && segment !== '.' && segment !== '..');
  return segments.join('/') || '.';
}

function joinRelativePath(parent: string, child: string): string {
  const safeParent = sanitizeRelativePath(parent);
  const safeChild = sanitizeRelativePath(child);
  return safeParent === '.' ? safeChild : `${safeParent}/${safeChild}`;
}

function listWorkspaceFiles(
  workspaceId: string,
  path: string
): Array<{ name: string; relative_path: string; kind: 'file' | 'directory'; version?: string; updated_at?: string; size?: number }> {
  const safePath = sanitizeRelativePath(path);
  const prefix = safePath === '.' ? '' : `${safePath}/`;
  const files = mockState.workspaceFiles[workspaceId] ?? {};
  const entries = new Map<
    string,
    { name: string; relative_path: string; kind: 'file' | 'directory'; version?: string; updated_at?: string; size?: number }
  >();

  for (const item of Object.values(files)) {
    if (!item.path.startsWith(prefix)) continue;
    const rest = item.path.slice(prefix.length);
    if (!rest) continue;
    const [first, ...remaining] = rest.split('/');
    const entryPath = prefix ? `${prefix}${first}` : first;
    if (remaining.length > 0) {
      entries.set(entryPath, { name: first, relative_path: entryPath, kind: 'directory' });
    } else {
      entries.set(entryPath, {
        name: first,
        relative_path: entryPath,
        kind: 'file',
        version: `v${item.version}`,
        updated_at: item.modified_at,
        size: item.content.length,
      });
    }
  }

  return [...entries.values()].sort((left, right) => left.kind.localeCompare(right.kind) || left.name.localeCompare(right.name));
}

function createExecutionArtifact(executionId: string, workspaceId: string): MockExecutionArtifact {
  const artifactId = nextId('artifact');
  return {
    id: artifactId,
    execution_id: executionId,
    name: 'runtime-report.zip',
    artifact_type: 'report',
    ref_: `workspaces/${workspaceId}/executions/${executionId}/runtime-report.zip`,
    metadata: { workspace_id: workspaceId },
    size: 1024,
    mime_type: 'application/zip',
    status: 'ready',
    immutable: true,
    created_at: new Date().toISOString(),
  };
}

function createWorkspaceExecution(
  workspaceId: string,
  payload: {
    execution_type?: 'test_run' | 'preview_env';
    kind?: 'test_run' | 'preview_env';
    relative_path?: string;
    command?: string;
    title?: string;
  }
): MockExecution {
  const now = new Date().toISOString();
  const executionId = nextId('exec');
  const artifact = createExecutionArtifact(executionId, workspaceId);
  const executionType = payload.execution_type ?? payload.kind ?? 'test_run';
  const execution: MockExecution = {
    id: executionId,
    workspace_id: workspaceId,
    execution_type: executionType,
    kind: executionType,
    status: 'running',
    title: payload.title,
    command: payload.command,
    relative_path: sanitizeRelativePath(payload.relative_path),
    preview_url: executionType === 'preview_env' ? `https://preview.aionweb.mock/${executionId}` : undefined,
    expires_at: executionType === 'preview_env' ? new Date(Date.now() + 60 * 60 * 1000).toISOString() : undefined,
    approval_state: 'none',
    logs: [{ id: nextId('log'), level: 'info', message: 'Execution started', timestamp: now }],
    artifacts: [artifact],
    created_at: now,
    updated_at: now,
  };
  mockState.executions[workspaceId] = [execution, ...(mockState.executions[workspaceId] ?? [])];
  setTimeout(() => {
    broadcast('workspace.execution.event', {
      type: 'status',
      workspace_id: workspaceId,
      execution_id: executionId,
      status: execution.status,
      preview_url: execution.preview_url,
      expires_at: execution.expires_at,
      approval_state: execution.approval_state,
    });
    broadcast('workspace.execution.event', {
      type: 'artifact',
      workspace_id: workspaceId,
      execution_id: executionId,
      artifact,
    });
  }, 0);
  return execution;
}

function emitConversationListChanged(conversation_id: string, action: 'created' | 'updated' | 'deleted'): void {
  broadcast('conversation.listChanged', { conversation_id, action });
}

function emitTurnCompleted(conversation: MockConversation, lastMessage: MockTextMessage): void {
  broadcast('turn.completed', {
    session_id: conversation.id,
    status: 'finished',
    state: 'ai_waiting_input',
    detail: '',
    can_send_message: true,
    workspace: conversation.extra.workspace,
    model: conversation.model,
    runtime: {
      state: 'idle',
      can_send_message: true,
      has_task: false,
      task_status: 'finished',
      is_processing: false,
      pending_confirmations: 0,
    },
    last_message: {
      id: lastMessage.id,
      type: lastMessage.type,
      content: lastMessage.content,
      status: lastMessage.status,
      created_at: lastMessage.created_at,
    },
  });
}

function scheduleAssistantReply(conversation: MockConversation, userInput: string): void {
  const assistantMsgId = nextId('assistant');
  const assistantDbMessage: MockTextMessage = {
    id: assistantMsgId,
    msg_id: assistantMsgId,
    conversation_id: conversation.id,
    type: 'text',
    position: 'left',
    created_at: Date.now(),
    status: 'finish',
    content: {
      content: `Mock reply: ${userInput}`,
    },
  };

  mockState.messages[conversation.id] = [...(mockState.messages[conversation.id] ?? []), assistantDbMessage];
  conversation.modified_at = Date.now();

  setTimeout(() => {
    const contentEvent: MockResponseMessage = {
      type: 'content',
      conversation_id: conversation.id,
      msg_id: assistantMsgId,
      created_at: assistantDbMessage.created_at,
      data: assistantDbMessage.content.content,
    };
    broadcast('message.stream', contentEvent);
    broadcast('message.stream', {
      type: 'finish',
      conversation_id: conversation.id,
      msg_id: `${assistantMsgId}-finish`,
      created_at: Date.now(),
      data: {},
    });
    emitConversationListChanged(conversation.id, 'updated');
    emitTurnCompleted(conversation, assistantDbMessage);
  }, 120);
}

async function readJsonBody(init?: RequestInit): Promise<unknown> {
  const body = init?.body;
  if (!body) return undefined;
  if (typeof body === 'string') return JSON.parse(body);
  if (body instanceof URLSearchParams) return Object.fromEntries(body.entries());
  return undefined;
}

function ensureConversation(id: string): MockConversation | undefined {
  return mockState.conversations.find((conversation) => conversation.id === id);
}

function workspaceEntries(workspace: string, relPath: string): Array<{ name: string; type: string }> {
  if (relPath && relPath !== '.') {
    return [];
  }

  return [
    { name: 'README.md', type: 'file' },
    { name: 'src', type: 'directory' },
    { name: 'notes.txt', type: 'file' },
    { name: workspace.split('/').pop() || 'workspace', type: 'directory' },
  ];
}

async function handleMockApi(input: RequestInfo | URL, init?: RequestInit): Promise<Response | null> {
  const requestUrl = new URL(typeof input === 'string' ? input : input.toString(), MOCK_ORIGIN);
  const pathname = requestUrl.pathname;
  const method = (init?.method ?? 'GET').toUpperCase();
  const body = await readJsonBody(init);

  mockState.requestLog.push({
    method,
    path: `${pathname}${requestUrl.search}`,
    ...(body !== undefined ? { body } : {}),
  });

  if (pathname === '/api/settings/client') {
    if (method === 'GET') return jsonResponse({ data: mockState.settings });
    if (method === 'PUT' && body && typeof body === 'object') {
      mockState.settings = { ...mockState.settings, ...(body as Record<string, unknown>) };
      return emptyOk();
    }
  }

  if (pathname === '/api/auth/status' && method === 'GET') {
    return jsonResponse({
      success: true,
      needs_setup: mockState.needsSetup,
      user_count: mockState.currentUser ? 1 : 0,
      is_authenticated: hasValidBearerAuth(init),
    });
  }

  if (pathname === '/api/auth/setup-password' && method === 'POST') {
    const newPassword =
      body && typeof body === 'object' && typeof (body as { new_password?: unknown }).new_password === 'string'
        ? (body as { new_password: string }).new_password
        : '';

    if (!mockState.needsSetup) {
      return jsonResponse({ success: false, error: 'System already initialized' }, { status: 409 });
    }

    if (newPassword.length < 8) {
      return jsonResponse({ success: false, error: 'PASSWORD_TOO_SHORT' }, { status: 400 });
    }

    mockState.needsSetup = false;
    return jsonResponse({ success: true, message: 'Initial admin password set' });
  }

  if (pathname === '/api/auth/refresh' && method === 'POST') {
    const token =
      body && typeof body === 'object' && typeof (body as { token?: unknown }).token === 'string'
        ? (body as { token: string }).token
        : '';

    if (!mockState.accessToken || token !== mockState.accessToken) {
      return jsonResponse({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    mockState.accessToken = createAccessToken(mockState.currentUser?.username ?? 'demo');
    return jsonResponse({ code: 0, message: 'ok', data: { token: mockState.accessToken }, trace_id: null });
  }

  if (pathname === '/api/auth/me' && method === 'GET') {
    if (!hasValidBearerAuth(init) || !mockState.currentUser) {
      return jsonResponse({ code: 401, message: 'Unauthorized', data: null, trace_id: null }, { status: 401 });
    }
    return jsonResponse({ code: 0, message: 'ok', data: toPhase2CurrentUser(mockState.currentUser), trace_id: null });
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    if (mockState.needsSetup) {
      return jsonResponse({ code: 'SETUP_REQUIRED', message: 'SETUP_REQUIRED' }, { status: 409 });
    }
    const username =
      body && typeof body === 'object' && typeof (body as { username?: unknown }).username === 'string'
        ? (body as { username: string }).username
        : 'demo';
    mockState.currentUser = { id: 'user-demo', username };
    mockState.accessToken = createAccessToken(username);
    return jsonResponse({
      code: 0,
      message: 'ok',
      data: {
        token: mockState.accessToken,
        user: {
          id: mockState.currentUser.id,
          username,
        },
      },
      trace_id: null,
    });
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    mockState.currentUser = null;
    mockState.accessToken = null;
    mockState.wsToken = null;
    return jsonResponse({ code: 0, message: 'ok', data: null });
  }

  if (pathname === '/api/auth/change-password' && method === 'POST') {
    if (!hasValidBearerAuth(init)) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const currentPassword =
      body && typeof body === 'object' && typeof (body as { current_password?: unknown }).current_password === 'string'
        ? (body as { current_password: string }).current_password
        : '';
    const newPassword =
      body && typeof body === 'object' && typeof (body as { new_password?: unknown }).new_password === 'string'
        ? (body as { new_password: string }).new_password
        : '';

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return jsonResponse({ success: false, error: 'PASSWORD_TOO_SHORT' }, { status: 400 });
    }

    return jsonResponse({ success: true, message: 'Password changed' });
  }

  if (pathname === '/api/ws-token' && method === 'GET') {
    if (!hasValidBearerAuth(init)) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    mockState.wsToken = createWsToken();
    return jsonResponse({
      success: true,
      ws_token: mockState.wsToken,
      expires_in: 300,
    });
  }

  if (pathname === '/api/admin/users' && method === 'GET') {
    const keyword = (requestUrl.searchParams.get('keyword') ?? '').toLowerCase();
    const status = requestUrl.searchParams.get('status');
    const filtered = mockState.adminUsers.filter((user) => {
      const matchesKeyword =
        !keyword ||
        user.phone.toLowerCase().includes(keyword) ||
        user.display_name.toLowerCase().includes(keyword) ||
        user.id.toLowerCase().includes(keyword);
      const matchesStatus = !status || user.status === status;
      return matchesKeyword && matchesStatus;
    });
    return jsonResponse({ code: 0, message: 'ok', data: filtered });
  }

  const adminUserStatusMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
  if (adminUserStatusMatch && method === 'POST') {
    const id = decodeURIComponent(adminUserStatusMatch[1]);
    const user = mockState.adminUsers.find((item) => item.id === id);
    if (!user) return notFound('User not found');
    const payload = (body ?? {}) as { status?: 'enabled' | 'disabled' };
    user.status = payload.status === 'disabled' ? 'disabled' : 'enabled';
    user.updated_at = new Date().toISOString();
    return jsonResponse({ code: 0, message: 'ok', data: user });
  }

  const adminUserResetMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/reset-password$/);
  if (adminUserResetMatch && method === 'POST') {
    const id = decodeURIComponent(adminUserResetMatch[1]);
    const user = mockState.adminUsers.find((item) => item.id === id);
    if (!user) return notFound('User not found');
    const payload = (body ?? {}) as { password?: string };
    if (!payload.password || payload.password.length < 8) {
      return jsonResponse({ code: 'PASSWORD_TOO_SHORT', message: 'Password is too short' }, { status: 400 });
    }
    user.updated_at = new Date().toISOString();
    return jsonResponse({ code: 0, message: 'ok', data: user });
  }

  if (pathname === '/api/admin/permissions' && method === 'GET') {
    const keys = [...new Set(mockState.adminRoles.flatMap((role) => role.permissions))];
    return jsonResponse({
      code: 0,
      message: 'ok',
      data: keys.map((key) => ({ key, label: key, description: key })),
    });
  }

  const adminUserSyncStatusMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/sync-status$/);
  if (adminUserSyncStatusMatch && (method === 'GET' || method === 'POST')) {
    const id = decodeURIComponent(adminUserSyncStatusMatch[1]);
    const user = mockState.adminUsers.find((item) => item.id === id);
    if (!user) return notFound('User not found');
    user.updated_at = new Date().toISOString();
    return jsonResponse({
      code: 0,
      message: 'ok',
      data: {
        user_id: id,
        status: 'synced',
        external_identities: user.external_identities,
      },
    });
  }

  if (pathname === '/api/admin/roles') {
    if (method === 'GET') {
      return jsonResponse({ code: 0, message: 'ok', data: mockState.adminRoles });
    }
    if (method === 'POST') {
      const payload = (body ?? {}) as { role_key?: string; role_name?: string; description?: string; permissions?: string[] };
      if (mockState.adminRoles.some((role) => role.role_key === payload.role_key)) {
        return jsonResponse({ code: 'CONFLICT', message: 'Role key exists' }, { status: 409 });
      }
      const now = new Date().toISOString();
      const role: MockAdminRole = {
        id: nextId('role'),
        role_key: payload.role_key?.trim() || nextId('role-key'),
        role_name: payload.role_name?.trim() || 'Role',
        description: payload.description,
        permissions: payload.permissions ?? [],
        is_system: false,
        created_at: now,
        updated_at: now,
      };
      mockState.adminRoles = [role, ...mockState.adminRoles];
      return jsonResponse({ code: 0, message: 'ok', data: role });
    }
  }

  const adminRoleMatch = pathname.match(/^\/api\/admin\/roles\/([^/]+)$/);
  if (adminRoleMatch && method === 'PATCH') {
    const id = decodeURIComponent(adminRoleMatch[1]);
    const role = mockState.adminRoles.find((item) => item.id === id);
    if (!role) return notFound('Role not found');
    if (role.is_system) {
      return jsonResponse({ code: 'FORBIDDEN', message: 'System role is protected' }, { status: 403 });
    }
    const payload = (body ?? {}) as { role_name?: string; description?: string; permissions?: string[] };
    role.role_name = payload.role_name?.trim() || role.role_name;
    role.description = payload.description ?? role.description;
    role.permissions = payload.permissions ?? role.permissions;
    role.updated_at = new Date().toISOString();
    for (const user of mockState.adminUsers) {
      user.roles = user.roles.map((item) => (item.id === role.id ? role : item));
    }
    return jsonResponse({ code: 0, message: 'ok', data: role });
  }

  const adminRoleStatusMatch = pathname.match(/^\/api\/admin\/roles\/([^/]+)\/status$/);
  if (adminRoleStatusMatch && method === 'POST') {
    const id = decodeURIComponent(adminRoleStatusMatch[1]);
    const role = mockState.adminRoles.find((item) => item.id === id);
    if (!role) return notFound('Role not found');
    role.updated_at = new Date().toISOString();
    return jsonResponse({ code: 0, message: 'ok', data: role });
  }

  const adminRoleUserMatch = pathname.match(/^\/api\/admin\/roles\/([^/]+)\/users\/([^/]+)$/);
  if (adminRoleUserMatch && (method === 'POST' || method === 'DELETE')) {
    const roleId = decodeURIComponent(adminRoleUserMatch[1]);
    const userId = decodeURIComponent(adminRoleUserMatch[2]);
    const role = mockState.adminRoles.find((item) => item.id === roleId);
    const user = mockState.adminUsers.find((item) => item.id === userId);
    if (!role) return notFound('Role not found');
    if (!user) return notFound('User not found');
    if (method === 'POST' && !user.roles.some((item) => item.id === role.id)) {
      user.roles = [role, ...user.roles];
    }
    if (method === 'DELETE') {
      user.roles = user.roles.filter((item) => item.id !== role.id);
    }
    user.updated_at = new Date().toISOString();
    return jsonResponse({ code: 0, message: 'ok', data: user });
  }

  if (pathname === '/api/agents' && method === 'GET') {
    return jsonResponse({
      data: [
        {
          id: 'agent-mock-remote',
          name: 'Mock Remote Agent',
          agent_type: 'remote',
          agent_source: 'builtin',
          enabled: true,
          available: true,
          handshake: {
            available_models: [{ id: 'mock-remote', name: 'Mock Remote', use_model: 'mock-remote' }],
          },
        },
      ],
    });
  }

  if (pathname === '/api/providers' && method === 'GET') {
    return jsonResponse({ data: [] });
  }

  if (pathname === '/api/skills' && method === 'GET') {
    return jsonResponse({ data: [] });
  }

  if (pathname === '/api/skills/builtin-auto' && method === 'GET') {
    return jsonResponse({ data: [] });
  }

  if (pathname === '/api/assistants' && method === 'GET') {
    return jsonResponse({ data: [createMockAssistant()] });
  }

  if (pathname === '/api/mcp/servers' && method === 'GET') {
    return jsonResponse({ data: [] });
  }

  if (pathname === '/api/cron/jobs' && method === 'GET') {
    return jsonResponse({ data: [] });
  }

  if (pathname === '/api/extensions/themes' && method === 'GET') {
    return jsonResponse({ data: [] });
  }

  if (pathname === '/api/google/subscription-status' && method === 'GET') {
    return jsonResponse({ data: { isSubscriber: false, lastChecked: Date.now() } });
  }

  if (pathname === '/api/git/ssh-credentials') {
    if (method === 'GET') return jsonResponse({ code: 0, message: 'ok', data: mockState.sshCredentials });
    if (method === 'POST') {
      const payload = (body ?? {}) as { name?: string; private_key?: string; passphrase?: string };
      const credential: MockSshCredential = {
        id: nextId('ssh'),
        name: payload.name?.trim() || 'SSH Credential',
        public_key: 'ssh-ed25519 AAAA generated',
        fingerprint: `SHA256:${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      mockState.sshCredentials = [credential, ...mockState.sshCredentials];
      return jsonResponse({ code: 0, message: 'ok', data: credential });
    }
  }

  if (pathname === '/api/git/ssh-credentials/generate' && method === 'POST') {
    const payload = (body ?? {}) as { name?: string };
    const credential: MockSshCredential = {
      id: nextId('ssh'),
      name: payload.name?.trim() || 'Generated SSH Credential',
      public_key: 'ssh-ed25519 AAAA generated',
      fingerprint: `SHA256:${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    mockState.sshCredentials = [credential, ...mockState.sshCredentials];
    return jsonResponse({ code: 0, message: 'ok', data: { credential, public_key: credential.public_key } });
  }

  if (pathname === '/api/git/projects') {
    if (method === 'GET') return jsonResponse({ code: 0, message: 'ok', data: mockState.gitProjects });
    if (method === 'POST') {
      const payload = (body ?? {}) as {
        display_name?: string;
        repo_ssh_url?: string;
        default_branch?: string;
        credential_id?: string;
      };
      const project: MockGitProject = {
        id: nextId('git'),
        display_name: payload.display_name?.trim() || 'Git Project',
        repo_ssh_url: payload.repo_ssh_url?.trim() || 'git@example.com:repo.git',
        default_branch: payload.default_branch?.trim() || 'main',
        credential_id: payload.credential_id || 'ssh-demo',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockState.gitProjects = [project, ...mockState.gitProjects];
      return jsonResponse({ code: 0, message: 'ok', data: project });
    }
  }

  const gitProjectActionMatch = pathname.match(/^\/api\/git\/projects\/([^/]+)\/(sync|archive)$/);
  if (gitProjectActionMatch && method === 'POST') {
    const id = decodeURIComponent(gitProjectActionMatch[1]);
    const action = gitProjectActionMatch[2];
    const project = mockState.gitProjects.find((item) => item.id === id);
    if (!project) return notFound('Git project not found');
    project.status = action === 'archive' ? 'archived' : 'active';
    project.last_synced_at = action === 'sync' ? new Date().toISOString() : project.last_synced_at;
    project.updated_at = new Date().toISOString();
    return jsonResponse({ code: 0, message: 'ok', data: project });
  }

  const gitProjectMatch = pathname.match(/^\/api\/git\/projects\/([^/]+)$/);
  if (gitProjectMatch) {
    const id = decodeURIComponent(gitProjectMatch[1]);
    const project = mockState.gitProjects.find((item) => item.id === id);
    if (!project) return notFound('Git project not found');
    if (method === 'PATCH') {
      const payload = (body ?? {}) as Partial<Pick<MockGitProject, 'display_name' | 'repo_ssh_url' | 'default_branch' | 'credential_id'>>;
      Object.assign(project, {
        ...(payload.display_name ? { display_name: payload.display_name } : {}),
        ...(payload.repo_ssh_url ? { repo_ssh_url: payload.repo_ssh_url } : {}),
        ...(payload.default_branch ? { default_branch: payload.default_branch } : {}),
        ...(payload.credential_id ? { credential_id: payload.credential_id } : {}),
        updated_at: new Date().toISOString(),
      });
      return jsonResponse({ code: 0, message: 'ok', data: project });
    }
    if (method === 'DELETE') {
      mockState.gitProjects = mockState.gitProjects.filter((item) => item.id !== id);
      return jsonResponse({ code: 0, message: 'ok', data: null });
    }
  }

  if (pathname === '/api/workspaces') {
    if (method === 'GET') return jsonResponse({ code: 0, message: 'ok', data: mockState.workspaces });
    if (method === 'POST') {
      const payload = (body ?? {}) as { name?: string; source_type?: 'blank' | 'git_project'; git_project_id?: string; branch_ref?: string };
      const project = mockState.gitProjects.find((item) => item.id === payload.git_project_id) ?? mockState.gitProjects[0];
      const branchRef = payload.branch_ref || project?.default_branch || 'main';
      const sourceType = payload.source_type ?? 'blank';
      const workspaceId = nextId('ws');
      const workspace: MockWorkspaceResource = {
        id: workspaceId,
        name: payload.name?.trim() || 'Workspace',
        status: 'active',
        source_type: sourceType,
        display_path: sourceType === 'git_project' ? `${project?.display_name || 'workspace'}/${branchRef}` : undefined,
        git_project_id: sourceType === 'git_project' ? project?.id || 'git-demo' : null,
        branch_ref: sourceType === 'git_project' ? branchRef : null,
        root_rel_path: `workspaces/${workspaceId}/repo`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockState.workspaces = [workspace, ...mockState.workspaces];
      return jsonResponse({ code: 0, message: 'ok', data: workspace });
    }
  }

  const workspaceActionMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/(archive|restore)$/);
  if (workspaceActionMatch && method === 'POST') {
    const id = decodeURIComponent(workspaceActionMatch[1]);
    const action = workspaceActionMatch[2];
    const workspace = mockState.workspaces.find((item) => item.id === id);
    if (!workspace) return notFound('Workspace not found');
    workspace.status = action === 'archive' ? 'archived' : 'active';
    workspace.updated_at = new Date().toISOString();
    return jsonResponse({ code: 0, message: 'ok', data: workspace });
  }

  const workspaceResourceMatch = pathname.match(/^\/api\/workspaces\/([^/]+)$/);
  if (workspaceResourceMatch) {
    const id = decodeURIComponent(workspaceResourceMatch[1]);
    const workspace = mockState.workspaces.find((item) => item.id === id);
    if (!workspace) return notFound('Workspace not found');
    if (method === 'GET') return jsonResponse({ code: 0, message: 'ok', data: workspace });
    if (method === 'PATCH') {
      const payload = (body ?? {}) as { name?: string };
      workspace.name = payload.name?.trim() || workspace.name;
      workspace.updated_at = new Date().toISOString();
      return jsonResponse({ code: 0, message: 'ok', data: workspace });
    }
    if (method === 'DELETE') {
      mockState.workspaces = mockState.workspaces.filter((item) => item.id !== id);
      return jsonResponse({ code: 0, message: 'ok', data: null });
    }
  }

  const workspaceFileOperationMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/files\/(list|read|write|mkdir|rename|delete|upload)$/);
  if (workspaceFileOperationMatch && method === 'POST') {
    const workspaceId = decodeURIComponent(workspaceFileOperationMatch[1]);
    const operation = workspaceFileOperationMatch[2];
    if (!mockState.workspaces.some((item) => item.id === workspaceId)) return notFound('Workspace not found');
    const files = (mockState.workspaceFiles[workspaceId] ??= {});

    if (operation === 'list') {
      const payload = (body ?? {}) as { relative_path?: string };
      const items = listWorkspaceFiles(workspaceId, payload.relative_path ?? '.');
      return jsonResponse({ code: 0, message: 'ok', data: items });
    }

    if (operation === 'read') {
      const payload = (body ?? {}) as { relative_path?: string };
      const relPath = sanitizeRelativePath(payload.relative_path);
      const file = files[relPath];
      if (!file) return notFound('File not found');
      return jsonResponse({
        code: 0,
        message: 'ok',
        data: {
          relative_path: file.path,
          content: file.content,
          version: `v${file.version}`,
          size: file.content.length,
        },
      });
    }

    if (operation === 'write') {
      const payload = (body ?? {}) as { relative_path?: string; content?: string; base_version?: string };
      const relPath = sanitizeRelativePath(payload.relative_path);
      const existing = files[relPath];
      if (existing && payload.base_version && payload.base_version !== `v${existing.version}`) {
        return jsonResponse(
          { code: 'VERSION_CONFLICT', message: 'stale version', data: { current_version: `v${existing.version}` } },
          { status: 409 }
        );
      }
      const version = (existing?.version ?? 0) + 1;
      files[relPath] = {
        path: relPath,
        content: payload.content ?? '',
        version,
        modified_at: new Date().toISOString(),
      };
      return jsonResponse({ code: 0, message: 'ok', data: { relative_path: relPath, version: `v${version}` } });
    }

    if (operation === 'mkdir') {
      const payload = (body ?? {}) as { relative_path?: string };
      const relPath = sanitizeRelativePath(payload.relative_path);
      return jsonResponse({ code: 0, message: 'ok', data: { relative_path: relPath } });
    }

    if (operation === 'rename') {
      const payload = (body ?? {}) as { relative_path?: string; new_relative_path?: string };
      const from = sanitizeRelativePath(payload.relative_path);
      const to = sanitizeRelativePath(payload.new_relative_path);
      if (files[from]) {
        files[to] = { ...files[from], path: to, version: files[from].version + 1, modified_at: new Date().toISOString() };
        delete files[from];
      }
      return jsonResponse({ code: 0, message: 'ok', data: { relative_path: to, version: files[to] ? `v${files[to].version}` : undefined } });
    }

    if (operation === 'delete') {
      const payload = (body ?? {}) as { relative_path?: string };
      const relPath = sanitizeRelativePath(payload.relative_path);
      for (const key of Object.keys(files)) {
        if (key === relPath || key.startsWith(`${relPath}/`)) {
          delete files[key];
        }
      }
      return jsonResponse({ code: 0, message: 'ok', data: null });
    }

    if (operation === 'upload') {
      const payload = (body ?? {}) as { relative_path?: string; file_name?: string; content_base64?: string; mime_type?: string };
      const relPath = joinRelativePath(payload.relative_path ?? '.', payload.file_name ?? 'upload.txt');
      const content =
        payload.content_base64 && typeof atob === 'function' ? atob(payload.content_base64) : (payload.content_base64 ?? '');
      files[relPath] = {
        path: relPath,
        content,
        version: 1,
        modified_at: new Date().toISOString(),
      };
      return jsonResponse({
        code: 0,
        message: 'ok',
        data: { name: relPath.split('/').pop() ?? relPath, relative_path: relPath, kind: 'file', version: 'v1', size: content.length },
      });
    }
  }

  const workspaceTerminalsMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/terminals$/);
  if (workspaceTerminalsMatch && method === 'POST') {
    const workspaceId = decodeURIComponent(workspaceTerminalsMatch[1]);
    const payload = (body ?? {}) as { relative_path?: string; shell?: string };
    const session: MockTerminalSession = {
      id: nextId('term'),
      workspace_id: workspaceId,
      cwd: sanitizeRelativePath(payload.relative_path),
      status: 'running',
      created_at: new Date().toISOString(),
    };
    mockState.terminalSessions[workspaceId] = [session, ...(mockState.terminalSessions[workspaceId] ?? [])];
    return jsonResponse({ code: 0, message: 'ok', data: session });
  }

  const workspaceExecutionsMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/executions$/);
  if (workspaceExecutionsMatch) {
    const workspaceId = decodeURIComponent(workspaceExecutionsMatch[1]);
    if (method === 'GET') {
      const items = mockState.executions[workspaceId] ?? [];
      return jsonResponse({ code: 0, message: 'ok', data: items });
    }
    if (method === 'POST') {
      const execution = createWorkspaceExecution(
        workspaceId,
        (body ?? {}) as {
          execution_type?: 'test_run' | 'preview_env';
          kind?: 'test_run' | 'preview_env';
          relative_path?: string;
          command?: string;
          title?: string;
        }
      );
      return jsonResponse({ code: 0, message: 'ok', data: execution });
    }
  }

  const executionArtifactsMatch = pathname.match(/^\/api\/executions\/([^/]+)\/artifacts$/);
  if (executionArtifactsMatch && method === 'GET') {
    const executionId = decodeURIComponent(executionArtifactsMatch[1]);
    const execution = Object.values(mockState.executions)
      .flat()
      .find((item) => item.id === executionId);
    if (!execution) return notFound('Execution not found');
    return jsonResponse({ code: 0, message: 'ok', data: execution.artifacts });
  }

  const executionActionMatch = pathname.match(/^\/api\/executions\/([^/]+)\/(cancel|status)$/);
  if (executionActionMatch && method === 'POST') {
    const executionId = decodeURIComponent(executionActionMatch[1]);
    const action = executionActionMatch[2];
    const execution = Object.values(mockState.executions)
      .flat()
      .find((item) => item.id === executionId);
    if (!execution) return notFound('Execution not found');

    execution.status = action === 'cancel' ? 'cancelled' : ((body as { status?: MockExecution['status'] } | undefined)?.status ?? execution.status);
    execution.updated_at = new Date().toISOString();
    broadcast('workspace.execution.event', {
      type: 'status',
      workspace_id: execution.workspace_id,
      execution_id: execution.id,
      status: execution.status,
      approval_state: execution.approval_state,
    });
    return jsonResponse({ code: 0, message: 'ok', data: execution });
  }

  if (pathname === '/api/conversations' && method === 'GET') {
    return jsonResponse(listConversations());
  }

  if (pathname === '/api/conversations' && method === 'POST') {
    const payload = (body ?? {}) as {
      name?: string;
      workspace_id?: string;
      extra?: { workspace?: string; skills?: string[] };
      model?: { provider_id?: string; model?: string; use_model?: string };
    };
    const id = nextId('conv');
    const workspaceResource = payload.workspace_id
      ? mockState.workspaces.find((item) => item.id === payload.workspace_id)
      : undefined;
    const workspace = payload.workspace_id ? undefined : payload.extra?.workspace ?? `/srv/aion/${id}`;
    const conversation: MockConversation = {
      created_at: Date.now(),
      modified_at: Date.now(),
      id,
      name: payload.name?.trim() || 'New Conversation',
      type: 'remote',
      status: 'finished',
      workspace_id: payload.workspace_id,
      extra: {
        ...(workspace ? { workspace } : {}),
        ...(workspaceResource ? { display_path: workspaceResource.display_path } : {}),
        custom_workspace: true,
        skills: payload.extra?.skills ?? [],
      },
      model: payload.model
        ? {
            provider_id: payload.model.provider_id ?? 'mock-provider',
            model: payload.model.model ?? payload.model.use_model ?? 'mock-remote',
            use_model: payload.model.use_model ?? payload.model.model ?? 'mock-remote',
          }
        : {
            provider_id: 'mock-provider',
            model: 'mock-remote',
            use_model: 'mock-remote',
          },
    };
    mockState.conversations = [conversation, ...mockState.conversations];
    mockState.messages[id] = [];
    mockState.artifacts[id] = [];
    emitConversationListChanged(id, 'created');
    return jsonResponse({ data: conversation });
  }

  const conversationMatch = pathname.match(/^\/api\/conversations\/([^/]+)$/);
  if (conversationMatch) {
    const conversationId = decodeURIComponent(conversationMatch[1]);
    const conversation = ensureConversation(conversationId);
    if (!conversation) return notFound('Conversation not found');

    if (method === 'GET') return jsonResponse({ data: conversation });
    if (method === 'PATCH') {
      const payload = (body ?? {}) as { name?: string; extra?: Record<string, unknown>; updates?: Record<string, unknown> };
      const nextName = payload.name ?? (payload.updates as { name?: string } | undefined)?.name;
      if (nextName) conversation.name = nextName;
      const nextExtra = payload.extra ?? (payload.updates as { extra?: Record<string, unknown> } | undefined)?.extra;
      if (nextExtra) {
        conversation.extra = { ...conversation.extra, ...nextExtra };
      }
      conversation.modified_at = Date.now();
      emitConversationListChanged(conversation.id, 'updated');
      return jsonResponse({ data: true });
    }
    if (method === 'DELETE') {
      mockState.conversations = mockState.conversations.filter((item) => item.id !== conversationId);
      delete mockState.messages[conversationId];
      delete mockState.artifacts[conversationId];
      emitConversationListChanged(conversationId, 'deleted');
      return jsonResponse({ data: true });
    }
  }

  const messagesMatch = pathname.match(/^\/api\/conversations\/([^/]+)\/messages(?:\/([^/]+))?$/);
  if (messagesMatch) {
    const conversationId = decodeURIComponent(messagesMatch[1]);
    const messageId = messagesMatch[2] ? decodeURIComponent(messagesMatch[2]) : undefined;
    const conversation = ensureConversation(conversationId);
    if (!conversation) return notFound('Conversation not found');

    if (method === 'GET' && !messageId) {
      const items = mockState.messages[conversationId] ?? [];
      return jsonResponse({ data: { items, total: items.length, has_more: false } });
    }

    if (method === 'GET' && messageId) {
      const message = (mockState.messages[conversationId] ?? []).find((item) => item.id === messageId);
      return message ? jsonResponse({ data: message }) : notFound('Message not found');
    }

    if (method === 'POST' && !messageId) {
      const payload = (body ?? {}) as { content?: string };
      const userMsgId = nextId('user');
      const userMessage: MockTextMessage = {
        id: userMsgId,
        msg_id: userMsgId,
        conversation_id: conversationId,
        type: 'text',
        position: 'right',
        created_at: Date.now(),
        status: 'finish',
        content: {
          content: payload.content ?? '',
        },
      };
      mockState.messages[conversationId] = [...(mockState.messages[conversationId] ?? []), userMessage];
      conversation.modified_at = Date.now();
      emitConversationListChanged(conversationId, 'updated');
      scheduleAssistantReply(conversation, payload.content ?? '');
      return jsonResponse({ data: { msg_id: userMsgId } });
    }
  }

  const workspaceMatch = pathname.match(/^\/api\/conversations\/([^/]+)\/workspace$/);
  if (workspaceMatch && method === 'GET') {
    const conversationId = decodeURIComponent(workspaceMatch[1]);
    const conversation = ensureConversation(conversationId);
    if (!conversation) return notFound('Conversation not found');
    const relPath = requestUrl.searchParams.get('path') ?? '.';
    return jsonResponse({ data: workspaceEntries(conversation.extra.workspace, relPath) });
  }

  if (pathname === '/api/messages/search' && method === 'GET') {
    return jsonResponse({ data: { items: [], total: 0, has_more: false } });
  }

  if (pathname.endsWith('/slash-commands') && method === 'GET') {
    return jsonResponse({ data: [] });
  }

  if (pathname.endsWith('/confirmations') && method === 'GET') {
    return jsonResponse({ data: [] });
  }

  if (pathname.endsWith('/artifacts') && method === 'GET') {
    const conversationId = pathname.split('/').at(-2);
    return jsonResponse({ data: conversationId ? mockState.artifacts[conversationId] ?? [] : [] });
  }

  if (pathname.endsWith('/cancel') && method === 'POST') {
    return emptyOk();
  }

  if (pathname === '/api/preview-history/list' && method === 'POST') {
    return jsonResponse({ data: [] });
  }

  if (pathname === '/api/preview-history/save' && method === 'POST') {
    return jsonResponse({
      data: {
        id: nextId('snapshot'),
        snapshot_id: nextId('snapshot'),
        created_at: Date.now(),
        label: 'Mock snapshot',
      },
    });
  }

  if (pathname === '/api/preview-history/get-content' && method === 'POST') {
    return jsonResponse({ data: null });
  }

  if (pathname.startsWith('/api/fs/') && method === 'GET') {
    return jsonResponse({ data: [] });
  }

  if (pathname.startsWith('/api/fs/') && method === 'POST') {
    if (pathname.includes('/metadata')) {
      return jsonResponse({
        data: {
          path: '/srv/aion/demo-workspace/README.md',
          name: 'README.md',
          size: 128,
          is_dir: false,
          modified_at: Date.now(),
        },
      });
    }
    if (pathname.includes('/read')) {
      return jsonResponse({ data: '# Mock File\n\nAionWeb intercept mode is serving this content.' });
    }
    if (pathname.includes('/download')) {
      return jsonResponse({ data: { url: '/mock-download' } });
    }
    if (pathname.includes('/list-workspace-files')) {
      return jsonResponse({ data: [] });
    }
    if (pathname.includes('/image-base64')) {
      return jsonResponse({ data: null });
    }
    if (pathname.includes('/snapshot/compare')) {
      return jsonResponse({
        data: {
          has_changes: false,
          files: [],
          staged_files: [],
          unstaged_files: [],
        },
      });
    }
    return jsonResponse({ data: true });
  }

  if (pathname.startsWith('/api/') && method === 'PUT') {
    return emptyOk();
  }

  if (pathname === '/api/auth/user') {
    return null;
  }

  if (pathname.startsWith('/api/')) {
    return jsonResponse({ data: null });
  }

  return null;
}

class MockWebSocket extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly url: string;
  readyState = MockWebSocket.CONNECTING;
  protocol = '';
  extensions = '';
  bufferedAmount = 0;
  binaryType: BinaryType = 'blob';
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  private closed = false;
  private readonly listener: MockSocketListener;

  constructor(url: string | URL, protocols?: string | string[]) {
    super();
    this.url = String(url);
    const requestedProtocol = Array.isArray(protocols) ? protocols[0] : protocols;
    this.protocol = requestedProtocol ?? '';
    this.listener = (payload) => {
      if (this.readyState !== MockWebSocket.OPEN) return;
      const event = new MessageEvent<string>('message', { data: payload });
      this.dispatchEvent(event);
      this.onmessage?.(event);
    };
    mockState.socketListeners.add(this.listener);

    queueMicrotask(() => {
      if (this.closed) return;
      if (this.protocol && this.protocol !== mockState.wsToken) {
        this.close(1008, 'invalid ws token');
        return;
      }
      this.readyState = MockWebSocket.OPEN;
      const event = new Event('open');
      this.dispatchEvent(event);
      this.onopen?.(event);
    });
  }

  send(_data: string | ArrayBufferLike | Blob | ArrayBufferView): void {}

  close(code = 1000, reason = ''): void {
    if (this.closed) return;
    this.closed = true;
    this.readyState = MockWebSocket.CLOSED;
    mockState.socketListeners.delete(this.listener);
    const event =
      typeof CloseEvent === 'function'
        ? new CloseEvent('close', { code, reason, wasClean: true })
        : (Object.assign(new Event('close'), { code, reason, wasClean: true }) as CloseEvent);
    this.dispatchEvent(event);
    this.onclose?.(event);
  }
}

export function installInterceptMockRuntime(): void {
  if (installed || !isInterceptMode() || typeof window === 'undefined') {
    return;
  }

  installed = true;
  originalFetch = globalThis.fetch.bind(globalThis);
  originalWebSocket = globalThis.WebSocket;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await handleMockApi(input, init);
    if (response) {
      return response;
    }

    return originalFetch!(input, init);
  };

  globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
}

export function resetInterceptMockState(): void {
  const initialState = createInitialState();
  mockState.currentUser = initialState.currentUser;
  mockState.needsSetup = initialState.needsSetup;
  mockState.accessToken = initialState.accessToken;
  mockState.wsToken = initialState.wsToken;
  mockState.settings = initialState.settings;
  mockState.conversations = initialState.conversations;
  mockState.messages = initialState.messages;
  mockState.artifacts = initialState.artifacts;
  mockState.requestLog = [];
  mockState.nextId = initialState.nextId;
}

export const __mockRuntime = {
  handleMockApi,
  getStateSnapshot: () => ({
    currentUser: mockState.currentUser,
    conversations: structuredClone(mockState.conversations),
    messages: structuredClone(mockState.messages),
    requestLog: structuredClone(mockState.requestLog),
  }),
  resetInterceptMockState,
};

if (typeof window !== 'undefined') {
  (window as Window & { __AIONWEB_MOCK_RUNTIME__?: typeof __mockRuntime }).__AIONWEB_MOCK_RUNTIME__ = __mockRuntime;
}

installInterceptMockRuntime();
