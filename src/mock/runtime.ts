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
    workspace: string;
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
  settings: Record<string, unknown>;
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

  return {
    nextId: 1,
    currentUser: null,
    settings: {
      language: 'zh-CN',
      theme: 'light',
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

function broadcast(name: string, data: unknown): void {
  const payload = JSON.stringify({ name, data });
  for (const listener of mockState.socketListeners) {
    listener(payload);
  }
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

  if (pathname === '/api/auth/user' && method === 'GET') {
    return jsonResponse(
      mockState.currentUser
        ? { success: true, user: mockState.currentUser }
        : {
            success: false,
          }
    );
  }

  if (pathname === '/login' && method === 'POST') {
    const username =
      body && typeof body === 'object' && typeof (body as { username?: unknown }).username === 'string'
        ? (body as { username: string }).username
        : 'demo';
    mockState.currentUser = { id: 'user-demo', username };
    return jsonResponse({ success: true, user: mockState.currentUser });
  }

  if (pathname === '/logout' && method === 'POST') {
    mockState.currentUser = null;
    return jsonResponse({ success: true });
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

  if (pathname === '/api/conversations' && method === 'GET') {
    return jsonResponse(listConversations());
  }

  if (pathname === '/api/conversations' && method === 'POST') {
    const payload = (body ?? {}) as {
      name?: string;
      extra?: { workspace?: string; skills?: string[] };
      model?: { provider_id?: string; model?: string; use_model?: string };
    };
    const id = nextId('conv');
    const workspace = payload.extra?.workspace ?? `/srv/aion/${id}`;
    const conversation: MockConversation = {
      created_at: Date.now(),
      modified_at: Date.now(),
      id,
      name: payload.name?.trim() || 'New Conversation',
      type: 'remote',
      status: 'finished',
      extra: {
        workspace,
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

  constructor(url: string | URL) {
    super();
    this.url = String(url);
    this.listener = (payload) => {
      if (this.readyState !== MockWebSocket.OPEN) return;
      const event = new MessageEvent<string>('message', { data: payload });
      this.dispatchEvent(event);
      this.onmessage?.(event);
    };
    mockState.socketListeners.add(this.listener);

    queueMicrotask(() => {
      if (this.closed) return;
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
