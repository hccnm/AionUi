/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import type { IResponseMessage } from '@/common/adapter/ipcBridge';
import {
  composeMessage,
  getWorkflowRunKey,
  normalizeAgentStreamError,
  transformMessage,
  transformWorkflowUpdateMessage,
  type IMessageTips,
  type IMessageAcpToolCall,
  type IMessageThinking,
  type IMessageWorkflowUpdate,
  type TMessage,
} from '@/common/chat/chatLib';

const CONVERSATION_ID = 'conversation-1';

function createThinkingMessage(msgId: string, content: string): IMessageThinking {
  return {
    id: `thinking-${content}`,
    type: 'thinking',
    msg_id: msgId,
    conversation_id: CONVERSATION_ID,
    position: 'left',
    content: {
      content,
      status: 'thinking',
    },
  };
}

function createThinkingDoneMessage(msgId: string, duration: number): IMessageThinking {
  return {
    id: `thinking-done-${msgId}`,
    type: 'thinking',
    msg_id: msgId,
    conversation_id: CONVERSATION_ID,
    position: 'left',
    content: {
      content: '',
      duration,
      status: 'done',
    },
  };
}

function createToolCallMessage(toolCallId: string): IMessageAcpToolCall {
  return {
    id: toolCallId,
    type: 'acp_tool_call',
    msg_id: toolCallId,
    conversation_id: CONVERSATION_ID,
    position: 'left',
    content: {
      session_id: 'session-1',
      update: {
        sessionUpdate: 'tool_call',
        tool_call_id: toolCallId,
        status: 'completed',
        title: 'Read file',
        kind: 'read',
      },
    },
  };
}

describe('composeMessage', () => {
  it('preserves thinking boundaries once a tool message has been inserted', () => {
    let list: TMessage[] = [];

    list = composeMessage(createThinkingMessage('msg-1', 'alpha'), list);
    list = composeMessage(createThinkingMessage('msg-1', 'beta'), list);

    expect(list).toHaveLength(1);
    expect(list[0].type).toBe('thinking');
    expect((list[0] as IMessageThinking).content.content).toBe('alphabeta');

    list = composeMessage(createToolCallMessage('tool-1'), list);
    list = composeMessage(createThinkingMessage('msg-1', 'gamma'), list);

    expect(list).toHaveLength(3);
    expect(list.map((message) => message.type)).toEqual(['thinking', 'acp_tool_call', 'thinking']);
    expect((list[0] as IMessageThinking).content.content).toBe('alphabeta');
    expect((list[2] as IMessageThinking).content.content).toBe('gamma');
  });

  it('merges thinking done updates back into the latest matching thinking message', () => {
    let list: TMessage[] = [];

    list = composeMessage(createThinkingMessage('msg-1', 'alpha'), list);
    list = composeMessage(createToolCallMessage('tool-1'), list);
    list = composeMessage(createThinkingDoneMessage('msg-1', 3200), list);

    expect(list).toHaveLength(2);
    expect(list.map((message) => message.type)).toEqual(['thinking', 'acp_tool_call']);
    expect((list[0] as IMessageThinking).content.status).toBe('done');
    expect((list[0] as IMessageThinking).content.duration).toBe(3200);
  });
});

describe('normalizeAgentStreamError', () => {
  it('treats resolution-only error metadata as structured', () => {
    expect(
      normalizeAgentStreamError({
        message: 'Agent is still responding',
        resolution: {
          kind: 'wait_for_current_response',
        },
      })
    ).toEqual({
      message: 'Agent is still responding',
      resolution: {
        kind: 'wait_for_current_response',
      },
    });
  });

  it('drops unknown resolution kind and target values', () => {
    expect(
      normalizeAgentStreamError({
        message: 'Provider authentication failed',
        resolution: {
          kind: 'check_provider_credentials',
          target: 'unexpected_settings',
        },
      })
    ).toEqual({
      message: 'Provider authentication failed',
      resolution: {
        kind: 'check_provider_credentials',
      },
    });

    expect(
      normalizeAgentStreamError({
        message: 'Unknown recovery action',
        resolution: {
          kind: 'open_secret_panel',
          target: 'provider_settings',
        },
      })
    ).toBeUndefined();
  });

  it('preserves workspace path metadata on structured errors', () => {
    expect(
      normalizeAgentStreamError({
        message: 'The current Agent failed to run in this workspace path.',
        code: 'WORKSPACE_PATH_RUNTIME_UNAVAILABLE',
        workspacePath: '/tmp/Archive ',
      })
    ).toEqual({
      message: 'The current Agent failed to run in this workspace path.',
      code: 'WORKSPACE_PATH_RUNTIME_UNAVAILABLE',
      workspacePath: '/tmp/Archive ',
    });
  });
});

describe('transformMessage', () => {
  it('returns undefined for hidden system stream messages', () => {
    const message: IResponseMessage = {
      type: 'system',
      data: 'cron metadata',
      msg_id: 'system-1',
      conversation_id: CONVERSATION_ID,
      hidden: true,
    };

    expect(transformMessage(message)).toBeUndefined();
  });

  it('preserves structured agent stream error metadata', () => {
    const message: IResponseMessage = {
      type: 'error',
      data: {
        message: 'The model provider rejected the request',
        code: 'USER_LLM_PROVIDER_AUTH_FAILED',
        ownership: 'user_llm_provider',
        detail: 'Provider returned 401.',
        workspacePath: '/tmp/provider-test',
        retryable: false,
        feedback_recommended: false,
        resolution: {
          kind: 'check_provider_credentials',
          target: 'provider_settings',
        },
      },
      msg_id: 'error-1',
      conversation_id: CONVERSATION_ID,
    };

    const transformed = transformMessage(message) as IMessageTips;

    expect(transformed.type).toBe('tips');
    expect(transformed.content.content).toBe('The model provider rejected the request');
    expect(transformed.content.error).toEqual({
      message: 'The model provider rejected the request',
      code: 'USER_LLM_PROVIDER_AUTH_FAILED',
      ownership: 'user_llm_provider',
      detail: 'Provider returned 401.',
      workspacePath: '/tmp/provider-test',
      retryable: false,
      feedback_recommended: false,
      resolution: {
        kind: 'check_provider_credentials',
        target: 'provider_settings',
      },
    });
  });

  it('preserves structured metadata on live tips error messages', () => {
    const message: IResponseMessage = {
      type: 'tips',
      data: {
        content: 'AionUI failed while sending the message',
        type: 'error',
        source: 'send_failed',
        code: 'INTERNAL_ERROR',
        error: {
          message: 'AionUI failed while sending the message',
          code: 'AIONUI_INTERNAL_ERROR',
          ownership: 'aionui',
          detail: 'Failed to write Codex sandbox config',
          retryable: true,
          feedback_recommended: true,
          resolution: {
            kind: 'send_feedback',
            target: 'feedback',
          },
        },
      },
      msg_id: 'tips-error-1',
      conversation_id: CONVERSATION_ID,
    };

    const transformed = transformMessage(message) as IMessageTips;

    expect(transformed.type).toBe('tips');
    expect(transformed.content.error).toEqual({
      message: 'AionUI failed while sending the message',
      code: 'AIONUI_INTERNAL_ERROR',
      ownership: 'aionui',
      detail: 'Failed to write Codex sandbox config',
      retryable: true,
      feedback_recommended: true,
      resolution: {
        kind: 'send_feedback',
        target: 'feedback',
      },
    });
  });

  it('preserves info tip type with code and params', () => {
    const message: IResponseMessage = {
      type: 'tips',
      data: {
        content: 'Select a slash command to continue',
        type: 'info',
        code: 'acp.empty_turn.choose_command',
        params: {
          command_count: 3,
        },
      },
      msg_id: 'tips-info-1',
      conversation_id: CONVERSATION_ID,
    };

    const transformed = transformMessage(message) as IMessageTips;

    expect(transformed.type).toBe('tips');
    expect(transformed.content).toMatchObject({
      content: 'Select a slash command to continue',
      type: 'info',
      code: 'acp.empty_turn.choose_command',
      params: {
        command_count: 3,
      },
    });
  });

  it('normalizes snake_case workflow_update events for the workflow monitor', () => {
    const message: IResponseMessage = {
      type: 'workflow_update',
      data: {
        session_id: 'sess-1',
        source_message_subtype: 'tool_call_update',
        workflow: {
          workflow_name: 'execute-order-test-cases',
          tool_use_id: 'toolu-1',
          task_id: 'task-1',
          run_id: 'wf_123',
          status: 'running',
          last_tool_name: 'Read',
          workflow_agents: [
            {
              id: 'agent-1',
              label: 'env-prepare',
              status: 'running',
              phase_title: '环境准备',
              current_phase: '环境准备',
              current_action: '检查应用状态',
              usage: { total_tokens: 42, tool_uses: 3, duration_ms: 1000 },
              updated_at: '2026-06-11T07:00:00.000Z',
              raw_sdk_event: { subtype: 'task_progress' },
            },
          ],
          script_path: '/repo/.claude/workflows/execute-order-test-cases.js',
          transcript_dir: '/tmp/workflows/wf_123',
          raw_input: { scriptPath: '/repo/.claude/workflows/execute-order-test-cases.js' },
          raw_sdk_event: { subtype: 'task_progress', last_tool_name: 'Read' },
          phases: [{ title: '环境准备', detail: '检查服务状态' }],
        },
      },
      msg_id: 'wf-msg',
      conversation_id: CONVERSATION_ID,
    };

    const transformed = transformWorkflowUpdateMessage(message) as IMessageWorkflowUpdate;

    expect(transformed.type).toBe('workflow_update');
    expect(transformed.content.sessionId).toBe('sess-1');
    expect(transformed.content.workflow.workflowName).toBe('execute-order-test-cases');
    expect(transformed.content.workflow.toolUseId).toBe('toolu-1');
    expect(transformed.content.workflow.runId).toBe('wf_123');
    expect(transformed.content.workflow.lastToolName).toBe('Read');
    expect(transformed.content.workflow.workflowAgents?.[0]).toMatchObject({
      id: 'agent-1',
      label: 'env-prepare',
      status: 'running',
      phaseTitle: '环境准备',
      currentPhase: '环境准备',
      currentAction: '检查应用状态',
      usage: { totalTokens: 42, toolUses: 3, durationMs: 1000 },
    });
    expect(transformed.content.workflow.rawInput).toEqual({
      scriptPath: '/repo/.claude/workflows/execute-order-test-cases.js',
    });
    expect(transformed.content.workflow.rawSdkEvent).toEqual({ subtype: 'task_progress', last_tool_name: 'Read' });
    expect(transformed.content.workflow.phases?.[0].title).toBe('环境准备');
  });

  it('uses toolUseId as workflow key before taskId or runId exists', () => {
    const message: IResponseMessage = {
      type: 'workflow_update',
      data: {
        session_id: 'sess-approval',
        workflow: {
          workflow_name: 'execute-order-test-cases',
          tool_use_id: 'toolu-approval',
          status: 'pending',
          progress: 'Awaiting workflow approval',
        },
      },
      msg_id: 'wf-approval',
      conversation_id: CONVERSATION_ID,
    };

    const transformed = transformWorkflowUpdateMessage(message) as IMessageWorkflowUpdate;

    expect(transformed.content.workflow.toolUseId).toBe('toolu-approval');
    expect(getWorkflowRunKey(transformed.content.workflow, 'fallback')).toBe('toolu-approval');
  });
});
