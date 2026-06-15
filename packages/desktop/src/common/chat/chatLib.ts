/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AcpPermissionRequest, PlanUpdate, ToolCallUpdate } from '@/common/types/platform/acpTypes';
import type { AcpAvailableCommand } from '@/common/chat/slash/types';
import type { IResponseMessage } from '../adapter/ipcBridge';
import { uuid } from '../utils';

/**
 * 安全的路径拼接函数，兼容Windows和Mac
 * @param basePath 基础路径
 * @param relativePath 相对路径
 * @returns 拼接后的绝对路径
 */
export const joinPath = (basePath: string, relativePath: string): string => {
  // 标准化路径分隔符为 /
  const normalizePath = (path: string) => path.replace(/\\/g, '/');

  const base = normalizePath(basePath);
  const relative = normalizePath(relativePath);

  // 去掉base路径末尾的斜杠
  const cleanBase = base.replace(/\/+$/, '');

  // 处理相对路径中的 ./ 和 ../
  const parts = relative.split('/');
  const resultParts = [];

  for (const part of parts) {
    if (part === '.' || part === '') {
      continue; // 跳过 . 和空字符串
    } else if (part === '..') {
      // 处理上级目录
      if (resultParts.length > 0) {
        resultParts.pop(); // 移除最后一个部分
      }
    } else {
      resultParts.push(part);
    }
  }

  // 拼接路径
  const result = cleanBase + '/' + resultParts.join('/');

  // 确保路径格式正确
  return result.replace(/\/+/g, '/'); // 将多个连续的斜杠替换为单个
};

/**
 * @description 跟对话相关的消息类型申明 及相关处理
 */

type TMessageType =
  | 'text'
  | 'tips'
  | 'tool_call'
  | 'tool_group'
  | 'agent_status'
  | 'permission'
  | 'acp_permission'
  | 'acp_tool_call'
  | 'plan'
  | 'thinking'
  | 'available_commands'
  | 'workflow_update';

interface IMessage<T extends TMessageType, Content extends Record<string, any>> {
  /**
   * 唯一ID
   */
  id: string;
  /**
   * 消息来源ID，
   */
  msg_id?: string;

  //消息会话ID
  conversation_id: string;
  /**
   * 消息类型
   */
  type: T;
  /**
   * 消息内容
   */
  content: Content;
  /**
   * 消息创建时间
   */
  created_at?: number;
  /**
   * 消息位置
   */
  position?: 'left' | 'right' | 'center' | 'pop';
  /**
   * 消息状态
   */
  status?: 'finish' | 'pending' | 'error' | 'work';
  /**
   * Hidden from UI display but persisted to DB and sent to agent.
   */
  hidden?: boolean;
}

export type CronMessageMeta = {
  source: 'cron';
  cron_job_id: string;
  cron_job_name: string;
  triggered_at: number;
};

export type IMessageText = IMessage<
  'text',
  {
    content: string;
    /** Backend explicitly replaced the accumulated text for this msg_id. */
    replace?: boolean;
    cronMeta?: CronMessageMeta;
    teammateMessage?: boolean;
    senderName?: string;
    senderAgentType?: string;
    /** Sender teammate's conversation id — lets the renderer resolve preset avatars via their conversation extras. */
    senderConversationId?: string;
  }
>;

export type AgentErrorOwnership = 'aionui' | 'user_agent' | 'user_llm_provider' | 'unknown_upstream';

export type AgentErrorResolutionKind =
  | 'retry'
  | 'wait_for_current_response'
  | 'start_new_session'
  | 'reconnect_agent'
  | 'check_agent_login'
  | 'check_agent_installation'
  | 'check_agent_version'
  | 'check_local_command'
  | 'check_provider_credentials'
  | 'check_provider_billing'
  | 'check_provider_base_url'
  | 'change_model'
  | 'reduce_context'
  | 'send_feedback';

export type AgentErrorResolutionTarget = 'provider_settings' | 'agent_settings' | 'new_conversation' | 'feedback';

export type AgentErrorResolution = {
  kind: AgentErrorResolutionKind;
  target?: AgentErrorResolutionTarget;
};

export type AgentStreamErrorInfo = {
  message: string;
  code?: string;
  ownership?: AgentErrorOwnership;
  detail?: string;
  workspacePath?: string;
  retryable?: boolean;
  feedback_recommended?: boolean;
  resolution?: AgentErrorResolution;
};

export type IMessageTips = IMessage<
  'tips',
  {
    content: string;
    type: 'error' | 'info' | 'success' | 'warning';
    code?: string;
    params?: Record<string, unknown>;
    error?: AgentStreamErrorInfo;
  }
>;

export const isErrorTipMessage = (message: IResponseMessage): boolean => {
  if (message.type !== 'tips' || !message.data || typeof message.data !== 'object') {
    return false;
  }

  const tipData = message.data as { type?: unknown };
  return tipData.type === 'error';
};

export type IMessageToolCall = IMessage<
  'tool_call',
  {
    call_id: string;
    name: string;
    args: Record<string, any>;
    error?: string;
    status?: 'running' | 'completed' | 'error';
    input?: Record<string, any>;
    output?: string;
    description?: string;
  }
>;

type IMessageToolGroupConfirmationDetailsBase<Type, Extra extends Record<string, any>> = {
  type: Type;
  title: string;
} & Extra;

export type IMessageToolGroup = IMessage<
  'tool_group',
  Array<{
    call_id: string;
    description: string;
    name: string;
    render_output_as_markdown: boolean;
    result_display?:
      | string
      | {
          file_diff: string;
          file_name: string;
        }
      | {
          img_url: string;
          relative_path: string;
        };
    status: 'Executing' | 'Success' | 'Error' | 'Canceled' | 'Pending' | 'Confirming';
    confirmationDetails?:
      | IMessageToolGroupConfirmationDetailsBase<
          'edit',
          {
            file_name: string;
            file_diff: string;
            isModifying?: boolean;
          }
        >
      | IMessageToolGroupConfirmationDetailsBase<
          'exec',
          {
            rootCommand: string;
            command: string;
          }
        >
      | IMessageToolGroupConfirmationDetailsBase<
          'info',
          {
            urls?: string[];
            prompt: string;
          }
        >
      | IMessageToolGroupConfirmationDetailsBase<
          'mcp',
          {
            tool_name: string;
            tool_display_name: string;
            server_name: string;
          }
        >;
  }>
>;

// Unified agent status message type for all ACP-based agents (Claude, Qwen, Codex, etc.)
export type IMessageAgentStatus = IMessage<
  'agent_status',
  {
    backend: string; // Agent identifier: 'claude', 'qwen', 'codex', 'remote', etc.
    status: 'connecting' | 'connected' | 'authenticated' | 'session_active' | 'error';
    /** Display name for the agent (e.g. extension-contributed adapter name) / Agent 显示名称 */
    agent_name?: string;
    // Optional legacy fields for backward compatibility
    session_id?: string;
    is_connected?: boolean;
    has_active_session?: boolean;
  }
>;

export type IMessageAcpPermission = IMessage<'acp_permission', AcpPermissionRequest>;

export type IMessagePermission = IMessage<'permission', IConfirmation>;

export type IMessageAcpToolCall = IMessage<'acp_tool_call', ToolCallUpdate>;

export const mergeAcpToolCallContent = (
  existing: IMessageAcpToolCall['content'],
  incoming: IMessageAcpToolCall['content']
): IMessageAcpToolCall['content'] => ({
  ...existing,
  ...incoming,
  update: {
    ...existing.update,
    ...incoming.update,
  },
});

type ResponseTextData = {
  content: string;
  replace?: boolean;
  cronMeta?: CronMessageMeta;
  teammate_message?: boolean;
  sender_name?: string;
  sender_backend?: string;
  sender_conversation_id?: string;
};

const isResponseTextData = (data: unknown): data is ResponseTextData =>
  typeof data === 'object' &&
  data !== null &&
  'content' in data &&
  typeof (data as { content?: unknown }).content === 'string';

export const isTextContentReplacement = (content: IMessageText['content'] | undefined): boolean =>
  content?.replace === true;

export const mergeTextMessageContent = (
  existing: IMessageText['content'],
  incoming: IMessageText['content']
): IMessageText['content'] => {
  const { replace: _existingReplace, ...existingRest } = existing;
  const { replace: incomingReplace, ...incomingRest } = incoming;

  return {
    ...existingRest,
    ...incomingRest,
    content: incomingReplace ? incoming.content : existing.content + incoming.content,
    ...(incomingReplace ? { replace: true } : {}),
  };
};

export const preferTextMessageVersion = (primary: IMessageText, secondary: IMessageText): IMessageText => {
  const primaryIsReplace = isTextContentReplacement(primary.content);
  const secondaryIsReplace = isTextContentReplacement(secondary.content);

  if (primaryIsReplace !== secondaryIsReplace) {
    return primaryIsReplace ? primary : secondary;
  }

  return secondary.content.content.length > primary.content.content.length ? secondary : primary;
};

export type IMessagePlan = IMessage<
  'plan',
  {
    session_id: string;
    entries: PlanUpdate['update']['entries'];
  }
>;

export type IMessageThinking = IMessage<
  'thinking',
  {
    content: string;
    subject?: string;
    duration?: number;
    status: 'thinking' | 'done';
  }
>;

// Available commands from ACP agents (Claude, etc.)
export type AvailableCommand = AcpAvailableCommand;

export type IMessageAvailableCommands = IMessage<
  'available_commands',
  {
    commands: AvailableCommand[];
  }
>;

export type WorkflowRunStatus = 'not_started' | 'running' | 'completed' | 'failed' | 'stopped' | string;

export type WorkflowPhase = {
  title: string;
  detail?: string;
  status?: WorkflowRunStatus;
};

export type WorkflowAgentUsage = {
  totalTokens?: number;
  toolUses?: number;
  durationMs?: number;
};

export type WorkflowAgent = {
  id: string;
  label?: string;
  status?: WorkflowRunStatus;
  phase?: string;
  phaseTitle?: string;
  currentPhase?: string;
  currentAction?: string;
  lastToolName?: string;
  usage?: WorkflowAgentUsage;
  updatedAt?: string;
  rawSdkEvent?: unknown;
};

export type WorkflowRun = {
  workflowName?: string;
  name?: string;
  description?: string;
  toolUseId?: string;
  taskId?: string;
  runId?: string;
  status?: WorkflowRunStatus;
  taskType?: string;
  phases?: WorkflowPhase[];
  currentPhase?: string;
  agentsRunning?: number;
  workflowAgents?: WorkflowAgent[];
  usage?: WorkflowAgentUsage;
  progress?: string;
  summary?: string;
  error?: string;
  warning?: string;
  scriptPath?: string;
  transcriptDir?: string;
  sessionUrl?: string;
  lastToolName?: string;
  startedAt?: string;
  updatedAt?: string;
  completedAt?: string;
  rawInput?: unknown;
  rawOutput?: unknown;
  rawSdkEvent?: unknown;
};

export type WorkflowUpdateContent = {
  sessionId?: string;
  workflow: WorkflowRun;
  runs?: WorkflowRun[];
  sourceMessageSubtype?: string;
};

export type IMessageWorkflowUpdate = IMessage<'workflow_update', WorkflowUpdateContent>;

// eslint-disable-next-line max-len
export type TMessage =
  | IMessageText
  | IMessageTips
  | IMessageToolCall
  | IMessageToolGroup
  | IMessageAgentStatus
  | IMessagePermission
  | IMessageAcpPermission
  | IMessageAcpToolCall
  | IMessagePlan
  | IMessageThinking
  | IMessageAvailableCommands;

// 统一所有需要用户交互的用户类型
export interface IConfirmation<Option extends any = any> {
  title?: string;
  id: string;
  action?: string;
  description: string;
  call_id: string;
  options: Array<{
    label: string;
    value: Option;
    params?: Record<string, string>; // Translation interpolation parameters
  }>;
  /**
   * Command type for exec confirmations (e.g., 'curl', 'npm', 'git')
   * Used for "always allow" permission memory
   */
  command_type?: string;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isWorkflowUpdateData = (value: unknown): value is WorkflowUpdateContent => {
  if (!isObject(value)) return false;
  return isObject(value.workflow);
};

const readString = (value: Record<string, unknown>, ...keys: string[]): string | undefined =>
  keys.map((key) => value[key]).find((item): item is string => typeof item === 'string' && item.length > 0);

const readNumber = (value: Record<string, unknown>, ...keys: string[]): number | undefined => {
  const key = keys.find((candidate) => typeof value[candidate] === 'number');
  return key ? (value[key] as number) : undefined;
};

export const normalizeWorkflowPhase = (phase: unknown): WorkflowPhase | undefined => {
  if (!isObject(phase)) return undefined;
  const title = readString(phase, 'title');
  if (!title) return undefined;
  return {
    title,
    detail: readString(phase, 'detail'),
    status: readString(phase, 'status'),
  };
};

const normalizeWorkflowAgentUsage = (usage: unknown): WorkflowAgentUsage | undefined => {
  if (!isObject(usage)) return undefined;
  const normalized = {
    totalTokens: readNumber(usage, 'totalTokens', 'total_tokens'),
    toolUses: readNumber(usage, 'toolUses', 'tool_uses'),
    durationMs: readNumber(usage, 'durationMs', 'duration_ms'),
  };
  return Object.values(normalized).some((value) => value !== undefined) ? normalized : undefined;
};

export const normalizeWorkflowAgent = (agent: unknown): WorkflowAgent | undefined => {
  if (!isObject(agent)) return undefined;
  const id = readString(agent, 'id', 'toolUseId', 'tool_use_id', 'taskId', 'task_id');
  if (!id) return undefined;
  return {
    ...agent,
    id,
    label: readString(agent, 'label', 'name'),
    status: readString(agent, 'status'),
    phase: readString(agent, 'phase'),
    phaseTitle: readString(agent, 'phaseTitle', 'phase_title'),
    currentPhase: readString(agent, 'currentPhase', 'current_phase'),
    currentAction: readString(agent, 'currentAction', 'current_action', 'description', 'summary'),
    lastToolName: readString(agent, 'lastToolName', 'last_tool_name'),
    usage: normalizeWorkflowAgentUsage(agent.usage),
    updatedAt: readString(agent, 'updatedAt', 'updated_at'),
    rawSdkEvent: agent.rawSdkEvent ?? agent.raw_sdk_event,
  };
};

export const normalizeWorkflowRun = (run: unknown): WorkflowRun | undefined => {
  if (!isObject(run)) return undefined;
  const phases = Array.isArray(run.phases)
    ? run.phases.map(normalizeWorkflowPhase).filter((phase): phase is WorkflowPhase => Boolean(phase))
    : undefined;
  const rawWorkflowAgents = run.workflowAgents ?? run.workflow_agents;
  const workflowAgents = Array.isArray(rawWorkflowAgents)
    ? rawWorkflowAgents.map(normalizeWorkflowAgent).filter((agent): agent is WorkflowAgent => Boolean(agent))
    : undefined;
  return {
    ...run,
    workflowName: readString(run, 'workflowName', 'workflow_name') ?? (run.workflowName as string | undefined),
    name: readString(run, 'name'),
    description: readString(run, 'description'),
    toolUseId: readString(run, 'toolUseId', 'tool_use_id'),
    taskId: readString(run, 'taskId', 'task_id'),
    runId: readString(run, 'runId', 'run_id'),
    status: readString(run, 'status'),
    taskType: readString(run, 'taskType', 'task_type'),
    phases: phases?.length ? phases : undefined,
    currentPhase: readString(run, 'currentPhase', 'current_phase'),
    agentsRunning: readNumber(run, 'agentsRunning', 'agents_running'),
    workflowAgents: workflowAgents?.length ? workflowAgents : undefined,
    usage: normalizeWorkflowAgentUsage(run.usage),
    progress: readString(run, 'progress'),
    summary: readString(run, 'summary'),
    error: readString(run, 'error'),
    warning: readString(run, 'warning'),
    scriptPath: readString(run, 'scriptPath', 'script_path'),
    transcriptDir: readString(run, 'transcriptDir', 'transcript_dir'),
    sessionUrl: readString(run, 'sessionUrl', 'session_url'),
    lastToolName: readString(run, 'lastToolName', 'last_tool_name'),
    startedAt: readString(run, 'startedAt', 'started_at'),
    updatedAt: readString(run, 'updatedAt', 'updated_at'),
    completedAt: readString(run, 'completedAt', 'completed_at'),
    rawInput: run.rawInput ?? run.raw_input,
    rawOutput: run.rawOutput ?? run.raw_output,
    rawSdkEvent: run.rawSdkEvent ?? run.raw_sdk_event,
  };
};

export const normalizeWorkflowRuns = (value: unknown): WorkflowRun[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const runs = value.map(normalizeWorkflowRun).filter((run): run is WorkflowRun => Boolean(run));
  return runs.length ? runs : undefined;
};

export const getWorkflowRunKey = (workflow: WorkflowRun, fallback = 'workflow'): string =>
  workflow.runId || workflow.taskId || workflow.toolUseId || workflow.workflowName || workflow.name || fallback;

export const mergeWorkflowUpdateContent = (
  existing: WorkflowUpdateContent,
  incoming: WorkflowUpdateContent
): WorkflowUpdateContent => ({
  ...existing,
  ...incoming,
  workflow: {
    ...existing.workflow,
    ...incoming.workflow,
    currentPhase: incoming.workflow.currentPhase,
    lastToolName: incoming.workflow.lastToolName ?? existing.workflow.lastToolName,
    progress: incoming.workflow.progress ?? existing.workflow.progress,
    summary: incoming.workflow.summary ?? existing.workflow.summary,
    phases: incoming.workflow.phases?.length ? incoming.workflow.phases : existing.workflow.phases,
    workflowAgents: incoming.workflow.workflowAgents?.length
      ? incoming.workflow.workflowAgents
      : existing.workflow.workflowAgents,
  },
  runs: incoming.runs?.length ? incoming.runs : existing.runs,
});

const AGENT_ERROR_OWNERSHIPS = new Set<AgentErrorOwnership>([
  'aionui',
  'user_agent',
  'user_llm_provider',
  'unknown_upstream',
]);

const AGENT_ERROR_RESOLUTION_KINDS = new Set<AgentErrorResolutionKind>([
  'retry',
  'wait_for_current_response',
  'start_new_session',
  'reconnect_agent',
  'check_agent_login',
  'check_agent_installation',
  'check_agent_version',
  'check_local_command',
  'check_provider_credentials',
  'check_provider_billing',
  'check_provider_base_url',
  'change_model',
  'reduce_context',
  'send_feedback',
]);

const AGENT_ERROR_RESOLUTION_TARGETS = new Set<AgentErrorResolutionTarget>([
  'provider_settings',
  'agent_settings',
  'new_conversation',
  'feedback',
]);

export const normalizeAgentErrorResolution = (value: unknown): AgentErrorResolution | undefined => {
  if (!isObject(value) || typeof value.kind !== 'string') {
    return undefined;
  }

  if (!AGENT_ERROR_RESOLUTION_KINDS.has(value.kind as AgentErrorResolutionKind)) {
    return undefined;
  }

  const target =
    typeof value.target === 'string' && AGENT_ERROR_RESOLUTION_TARGETS.has(value.target as AgentErrorResolutionTarget)
      ? (value.target as AgentErrorResolutionTarget)
      : undefined;

  return {
    kind: value.kind as AgentErrorResolutionKind,
    ...(target ? { target } : {}),
  };
};

export const normalizeAgentStreamError = (value: unknown): AgentStreamErrorInfo | undefined => {
  if (!isObject(value) || typeof value.message !== 'string') {
    return undefined;
  }

  const code = typeof value.code === 'string' ? value.code : undefined;
  const ownership =
    typeof value.ownership === 'string' && AGENT_ERROR_OWNERSHIPS.has(value.ownership as AgentErrorOwnership)
      ? (value.ownership as AgentErrorOwnership)
      : undefined;
  const detail = typeof value.detail === 'string' ? value.detail : undefined;
  const workspacePath = typeof value.workspacePath === 'string' ? value.workspacePath : undefined;
  const retryable = typeof value.retryable === 'boolean' ? value.retryable : undefined;
  const feedback_recommended = typeof value.feedback_recommended === 'boolean' ? value.feedback_recommended : undefined;
  const resolution = normalizeAgentErrorResolution(value.resolution);

  if (
    !code &&
    !ownership &&
    !detail &&
    !workspacePath &&
    retryable === undefined &&
    feedback_recommended === undefined &&
    !resolution
  ) {
    return undefined;
  }

  return {
    message: value.message,
    ...(code ? { code } : {}),
    ...(ownership ? { ownership } : {}),
    ...(detail ? { detail } : {}),
    ...(workspacePath ? { workspacePath } : {}),
    ...(retryable !== undefined ? { retryable } : {}),
    ...(feedback_recommended !== undefined ? { feedback_recommended } : {}),
    ...(resolution ? { resolution } : {}),
  };
};

/**
 * @description 将后端返回的消息转换为前端消息
 * */
export const transformWorkflowUpdateMessage = (message: IResponseMessage): IMessageWorkflowUpdate | undefined => {
  if (message.type !== 'workflow_update' || !isWorkflowUpdateData(message.data)) {
    return undefined;
  }
  const workflow = normalizeWorkflowRun(message.data.workflow);
  if (!workflow) {
    return undefined;
  }
  const created_at = message.created_at ?? Date.now();
  return {
    id: uuid(),
    type: 'workflow_update',
    msg_id: message.msg_id,
    position: 'left',
    conversation_id: message.conversation_id,
    created_at,
    content: {
      sessionId: message.data.sessionId ?? (message.data as { session_id?: string }).session_id,
      workflow,
      runs: normalizeWorkflowRuns(message.data.runs),
      sourceMessageSubtype:
        message.data.sourceMessageSubtype ??
        (message.data as { source_message_subtype?: string }).source_message_subtype,
    },
  };
};

export const transformMessage = (message: IResponseMessage): TMessage | undefined => {
  const created_at = message.created_at ?? Date.now();
  switch (message.type) {
    case 'error': {
      const errorData = message.data;
      const structuredError = normalizeAgentStreamError(errorData);
      const errorText =
        typeof errorData === 'string'
          ? errorData
          : ((errorData as { message?: string })?.message ?? JSON.stringify(errorData));
      return {
        id: uuid(),
        type: 'tips',
        msg_id: message.msg_id,
        position: 'center',
        conversation_id: message.conversation_id,
        created_at,
        content: {
          content: errorText,
          type: 'error',
          ...(structuredError ? { error: structuredError } : {}),
        },
      };
    }
    case 'tips': {
      const data = message.data as {
        content: string;
        type?: 'error' | 'info' | 'success' | 'warning';
        code?: unknown;
        params?: unknown;
        error?: unknown;
      };
      const tipType = data.type ?? 'warning';
      const tipCode = typeof data.code === 'string' ? data.code : undefined;
      const tipParams = isObject(data.params) ? data.params : undefined;
      const structuredError =
        tipType === 'error'
          ? (normalizeAgentStreamError(data.error) ?? normalizeAgentStreamError({ ...data, message: data.content }))
          : undefined;
      return {
        id: uuid(),
        type: 'tips',
        msg_id: message.msg_id,
        position: 'center',
        conversation_id: message.conversation_id,
        created_at,
        content: {
          content: data.content,
          type: tipType,
          ...(tipCode ? { code: tipCode } : {}),
          ...(tipParams ? { params: tipParams } : {}),
          ...(structuredError ? { error: structuredError } : {}),
        },
      };
    }
    case 'text':
    case 'content':
    case 'user_content': {
      const data = message.data;
      const isRichData = isResponseTextData(data);
      const shouldReplace = message.replace === true || (isRichData && data.replace === true);
      return {
        id: uuid(),
        type: 'text',
        msg_id: message.msg_id,
        position: message.type === 'user_content' ? 'right' : 'left',
        conversation_id: message.conversation_id,
        created_at,
        content: isRichData
          ? {
              content: data.content,
              cronMeta: data.cronMeta,
              ...(shouldReplace ? { replace: true } : {}),
              ...(data.teammate_message ? { teammateMessage: true } : {}),
              ...(data.sender_name ? { senderName: data.sender_name } : {}),
              ...(data.sender_backend ? { senderAgentType: data.sender_backend } : {}),
              ...(data.sender_conversation_id ? { senderConversationId: data.sender_conversation_id } : {}),
            }
          : {
              content: data as string,
              ...(shouldReplace ? { replace: true } : {}),
            },
        ...(message.hidden && { hidden: true }),
      };
    }
    case 'tool_call': {
      return {
        id: uuid(),
        type: 'tool_call',
        msg_id: message.msg_id,
        conversation_id: message.conversation_id,
        position: 'left',
        created_at,
        content: message.data as any,
      };
    }
    case 'tool_group': {
      return {
        type: 'tool_group',
        id: uuid(),
        msg_id: message.msg_id,
        conversation_id: message.conversation_id,
        created_at,
        content: message.data as any,
      };
    }
    case 'agent_status': {
      return {
        id: uuid(),
        type: 'agent_status',
        msg_id: message.msg_id,
        position: 'center',
        conversation_id: message.conversation_id,
        created_at,
        content: message.data as any,
      };
    }
    case 'permission': {
      return {
        id: uuid(),
        type: 'permission',
        msg_id: message.msg_id,
        position: 'left',
        conversation_id: message.conversation_id,
        created_at,
        content: message.data as any,
      };
    }
    case 'acp_permission': {
      return {
        id: uuid(),
        type: 'acp_permission',
        msg_id: message.msg_id,
        position: 'left',
        conversation_id: message.conversation_id,
        created_at,
        content: message.data as any,
      };
    }
    case 'acp_tool_call': {
      return {
        id: uuid(),
        type: 'acp_tool_call',
        msg_id: message.msg_id,
        position: 'left',
        conversation_id: message.conversation_id,
        created_at,
        content: message.data as any,
      };
    }
    case 'plan': {
      return {
        id: uuid(),
        type: 'plan',
        msg_id: message.msg_id,
        position: 'left',
        conversation_id: message.conversation_id,
        created_at,
        content: message.data as any,
      };
    }
    case 'thinking': {
      const data = message.data as {
        content: string;
        subject?: string;
        duration?: number;
        duration_ms?: number;
        status: 'thinking' | 'done';
      };
      return {
        id: uuid(),
        type: 'thinking',
        msg_id: message.msg_id,
        position: 'left',
        conversation_id: message.conversation_id,
        created_at,
        content: {
          content: data.content,
          subject: data.subject,
          duration: data.duration ?? data.duration_ms,
          status: data.status,
        },
      };
    }
    // Disabled: available_commands messages are too noisy and distracting in the chat UI
    case 'available_commands':
    case 'workflow_update':
      return undefined;
    case 'start':
    case 'finish':
    case 'thought':
    case 'skill_suggest':
    case 'cron_trigger':
    case 'info': // Stream retry notifications and similar transient agent updates
    case 'system': // Cron system responses, ignored
    case 'acp_model_info': // Model info updates, handled by AcpModelSelector
    case 'acp_mode_info': // Mode info updates, handled by AgentModeSelector
    case 'codex_model_info': // Legacy Codex model info updates
    case 'acp_context_usage': // Context usage updates, handled by AcpSendBox
    case 'request_trace': // Request trace events, logged to F12 console (not persisted)
      return undefined;
    default: {
      console.warn(
        `[transformMessage] Unsupported message type '${message.type}'. All non-standard message types should be pre-processed by respective AgentManagers.`
      );
      return undefined;
    }
  }
};

/**
 * @description 将消息合并到消息列表中
 * */
export const composeMessage = (
  message: TMessage | undefined,
  list: TMessage[] | undefined,
  messageHandler: (type: 'update' | 'insert', message: TMessage) => void = () => {}
): TMessage[] => {
  if (!message) return list || [];
  if (!list?.length) {
    messageHandler('insert', message);
    return [message];
  }
  const last = list[list.length - 1];

  const updateMessage = (index: number, message: TMessage, change = true) => {
    message.id = list[index].id;
    list[index] = message;
    if (change) messageHandler('update', message);
    return list.slice();
  };
  const pushMessage = (message: TMessage) => {
    list.push(message);
    messageHandler('insert', message);
    return list.slice();
  };

  if (message.type === 'tool_group') {
    const remainingToolsMap = new Map(message.content.map((t) => [t.call_id, t] as const));
    if (remainingToolsMap.size === 0) return list;

    const updatesToReport: TMessage[] = [];

    const updatedList = list.map((existingMessage) => {
      if (existingMessage.type !== 'tool_group') return existingMessage;
      if (!existingMessage.content.length) return existingMessage;

      let didMergeIntoThisMessage = false;
      const new_content = existingMessage.content.map((tool) => {
        const newToolData = remainingToolsMap.get(tool.call_id);
        if (!newToolData) return tool;
        didMergeIntoThisMessage = true;
        remainingToolsMap.delete(tool.call_id);
        // Create new object instead of mutating original
        return { ...tool, ...newToolData };
      });

      if (!didMergeIntoThisMessage) return existingMessage;
      const updatedMessage = { ...existingMessage, content: new_content } as TMessage;
      updatesToReport.push(updatedMessage);
      return updatedMessage;
    });

    const didUpdateExisting = updatesToReport.length > 0;
    for (const updatedMessage of updatesToReport) {
      messageHandler('update', updatedMessage);
    }

    const baseList = didUpdateExisting ? updatedList : list;

    // If there are new tool calls, append them as a new tool_group message (without mutating inputs)
    if (remainingToolsMap.size > 0) {
      const newTools = Array.from(remainingToolsMap.values());
      const insertMessage = { ...message, content: newTools } as TMessage;
      messageHandler('insert', insertMessage);
      return baseList.concat(insertMessage);
    }
    // No new tools appended; return a new list only if something was updated
    return didUpdateExisting ? baseList : list;
  }

  // Handle Gemini tool_call message merging
  if (message.type === 'tool_call') {
    for (let i = 0, len = list.length; i < len; i++) {
      const msg = list[i];
      if (msg.type === 'tool_call' && msg.content.call_id === message.content.call_id) {
        // Create new object instead of mutating original
        return updateMessage(i, { ...msg, content: { ...msg.content, ...message.content } });
      }
    }
    // If no existing tool call found, add new one
    return pushMessage(message);
  }

  // Handle acp_tool_call message merging
  if (message.type === 'acp_tool_call') {
    for (let i = 0, len = list.length; i < len; i++) {
      const msg = list[i];
      if (msg.type === 'acp_tool_call' && msg.content.update?.tool_call_id === message.content.update?.tool_call_id) {
        // Create new object instead of mutating original
        const merged = mergeAcpToolCallContent(msg.content, message.content);
        return updateMessage(i, { ...msg, content: merged });
      }
    }
    // If no existing tool call found, add new one
    return pushMessage(message);
  }

  if (message.type === 'plan') {
    for (let i = 0, len = list.length; i < len; i++) {
      const msg = list[i];
      if (msg.type === 'plan' && msg.content.session_id === message.content.session_id) {
        // Create new object instead of mutating original
        const merged = { ...msg.content, ...message.content };
        return updateMessage(i, { ...msg, content: merged });
      }
    }
    return pushMessage(message);
    // If no existing plan found, add new one
  }

  // Handle thinking message merging — only merge contiguous streaming chunks
  if (message.type === 'thinking') {
    if (message.content.status === 'done') {
      for (let i = list.length - 1; i >= 0; i--) {
        const msg = list[i];
        if (msg.type !== 'thinking' || msg.msg_id !== message.msg_id) continue;

        const merged = {
          ...msg.content,
          status: 'done' as const,
          duration: message.content.duration,
          subject: message.content.subject || msg.content.subject,
        };
        return updateMessage(i, { ...msg, content: merged });
      }
    }

    if (last.type === 'thinking' && last.msg_id === message.msg_id) {
      // Otherwise append content
      const merged = {
        ...last.content,
        content: last.content.content + message.content.content,
        subject: message.content.subject || last.content.subject,
      };
      return updateMessage(list.length - 1, { ...last, content: merged });
    }
    return pushMessage(message);
  }

  if (last.msg_id !== message.msg_id || last.type !== message.type) {
    return pushMessage(message);
  }
  if (message.type === 'text' && last.type === 'text') {
    message.content = mergeTextMessageContent(last.content, message.content);
  }
  return updateMessage(list.length - 1, Object.assign({}, last, message));
};

export const handleImageGenerationWithWorkspace = (message: TMessage, workspace: string): TMessage => {
  // 只处理text类型的消息
  if (message.type !== 'text') {
    return message;
  }

  // 深拷贝消息以避免修改原始对象
  const processedMessage = {
    ...message,
    content: {
      ...message.content,
      content: message.content.content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, imagePath) => {
        // 如果是绝对路径、http链接或data URL，保持不变
        if (
          imagePath.startsWith('http') ||
          imagePath.startsWith('data:') ||
          imagePath.startsWith('/') ||
          imagePath.startsWith('file:') ||
          imagePath.startsWith('\\') ||
          /^[A-Za-z]:/.test(imagePath)
        ) {
          return match;
        }
        // 如果是相对路径，与workspace拼接
        const absolutePath = joinPath(workspace, imagePath);
        return `![${alt}](${encodeURI(absolutePath)})`;
      }),
    },
  };

  return processedMessage;
};
