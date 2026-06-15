/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IMessageWorkflowUpdate } from '@/common/chat/chatLib';
import MessageWorkflowUpdate from '@/renderer/pages/conversation/Messages/components/MessageWorkflowUpdate';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, options?: Record<string, unknown>) => {
      const fallback = typeof options?.defaultValue === 'string' ? options.defaultValue : _key;
      return fallback.replace(/\{\{(\w+)\}\}/g, (_match, name) => String(options?.[name] ?? ''));
    },
  }),
}));

const message: IMessageWorkflowUpdate = {
  id: 'workflow-1',
  type: 'workflow_update',
  msg_id: 'msg-1',
  conversation_id: 'conversation-1',
  position: 'left',
  content: {
    workflow: {
      workflowName: 'execute-order-test-cases',
      taskId: 'wflivxhky',
      runId: 'wf_123',
      status: 'failed',
      error: '应用未运行: http://localhost:8099 连接被拒绝',
      workflowAgents: [
        {
          id: 'agent-env',
          label: 'env-prepare',
          status: 'failed',
          currentAction: '检查应用状态失败',
          usage: { totalTokens: 12, toolUses: 2, durationMs: 9000 },
        },
      ],
      phases: [
        { title: '环境准备', detail: '检查服务状态' },
        { title: '执行测试', detail: '运行测试用例' },
        { title: '生成报告', detail: '写入 test-histories' },
      ],
    },
  },
};

describe('MessageWorkflowUpdate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a CLI-style workflow monitor with phases and visible failure reason', () => {
    render(<MessageWorkflowUpdate message={message} />);

    expect(screen.getByTestId('workflow-monitor')).toBeInTheDocument();
    expect(screen.getByText('execute-order-test-cases')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getAllByText('环境准备')).toHaveLength(2);
    expect(screen.getByText('执行测试')).toBeInTheDocument();
    expect(screen.getByText('生成报告')).toBeInTheDocument();
    expect(screen.getByText('env-prepare')).toBeInTheDocument();
    expect(screen.getByText('检查应用状态失败')).toBeInTheDocument();
    expect(screen.getByText('应用未运行: http://localhost:8099 连接被拒绝')).toBeInTheDocument();
    expect(screen.getByText('12 tok · 2 tools · 9s')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop workflow/i })).toBeDisabled();
  });

  it('delegates Claude workflow stop to the dock action when the active workflow is running', async () => {
    const stopSpy = vi.fn().mockResolvedValue(undefined);
    const runningMessage: IMessageWorkflowUpdate = {
      ...message,
      content: {
        workflow: {
          ...message.content.workflow,
          status: 'running',
          error: undefined,
        },
      },
    };

    render(<MessageWorkflowUpdate message={runningMessage} onStopWorkflow={stopSpy} />);

    fireEvent.click(screen.getByRole('button', { name: /stop workflow/i }));

    await waitFor(() => {
      expect(stopSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('syncs the live phase from write-history agent activity', () => {
    render(
      <MessageWorkflowUpdate
        message={{
          ...message,
          content: {
            workflow: {
              ...message.content.workflow,
              status: 'running',
              error: undefined,
              lastToolName: 'write-history',
              workflowAgents: [
                {
                  id: 'agent-history',
                  label: 'write-history',
                  status: 'running',
                  currentAction: '写入 test-histories 目录下的 ICaseHistory JSON 文件',
                },
              ],
            },
          },
        }}
      />
    );

    const reportPhase = screen.getByRole('button', { name: /生成报告/ });
    expect(reportPhase.className).toMatch(/phaseCurrent/);
    expect(screen.getAllByText('生成报告')).toHaveLength(2);
  });

  it('prefers the live agent tool over stale currentPhase when resolving the active phase', () => {
    render(
      <MessageWorkflowUpdate
        message={{
          ...message,
          content: {
            workflow: {
              ...message.content.workflow,
              status: 'running',
              error: undefined,
              currentPhase: '执行测试',
              lastToolName: 'env-prepare',
              workflowAgents: [
                {
                  id: 'agent-env',
                  label: 'env-prepare',
                  status: 'running',
                  currentAction: '执行指定测试用例文件夹中的所有测试用例并生成报告。参数：args = "文件夹名|时间戳"',
                },
              ],
            },
          },
        }}
      />
    );

    expect(screen.getByRole('button', { name: /环境准备/ }).className).toMatch(/phaseCurrent/);
    expect(screen.getByRole('button', { name: /执行测试/ }).className).not.toMatch(/phaseCurrent/);
    expect(screen.getAllByText('环境准备')).toHaveLength(2);
  });

  it('does not default to the first phase when no trustworthy phase signal exists', () => {
    const { container } = render(
      <MessageWorkflowUpdate
        message={{
          ...message,
          content: {
            workflow: {
              ...message.content.workflow,
              status: 'running',
              error: undefined,
              lastToolName: 'unknown-tool',
              progress: '处理无法归类的任务',
              workflowAgents: [
                {
                  id: 'agent-unknown',
                  label: 'unknown-tool',
                  status: 'running',
                  currentAction: '处理无法归类的任务',
                },
              ],
            },
          },
        }}
      />
    );

    expect(container.querySelector('[class*="phaseCurrent"]')).not.toBeInTheDocument();
    expect(screen.getByText('Current agent')).toBeInTheDocument();
  });

  it('does not mark any phase as active while the workflow is still awaiting approval', () => {
    const { container } = render(
      <MessageWorkflowUpdate
        message={{
          ...message,
          content: {
            workflow: {
              ...message.content.workflow,
              status: 'running',
              error: undefined,
              description: '执行指定测试用例文件夹中的所有测试用例并生成报告。参数：args = "文件夹名|时间戳"',
              workflowAgents: [
                {
                  id: 'agent-pending',
                  label: 'workflow task',
                  status: 'pending',
                  currentAction: 'Awaiting workflow approval',
                },
              ],
            },
          },
        }}
      />
    );

    expect(container.querySelector('[class*="phaseCurrent"]')).not.toBeInTheDocument();
    expect(screen.getByText('Current agent')).toBeInTheDocument();
    expect(screen.getByText('Awaiting workflow approval')).toBeInTheDocument();
  });

  it('shows not-started state when selecting a future phase with no matching agents yet', () => {
    const { container } = render(
      <MessageWorkflowUpdate
        message={{
          ...message,
          content: {
            workflow: {
              ...message.content.workflow,
              status: 'running',
              error: undefined,
              workflowAgents: [
                {
                  id: 'agent-env',
                  label: 'env-prepare',
                  status: 'running',
                  currentAction: '检查应用状态',
                },
              ],
            },
          },
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /执行测试/ }));

    expect(screen.getByText('Not started yet')).toBeInTheDocument();
    expect(screen.getByText('0 agents')).toBeInTheDocument();
    expect(screen.queryByText('检查应用状态')).not.toBeInTheDocument();
    expect(screen.getAllByText('执行测试')).toHaveLength(2);
    expect(container.querySelector('[class*="phaseSelected"]')).toBeInTheDocument();
  });

  it('filters the right pane to the selected phase agents', () => {
    render(
      <MessageWorkflowUpdate
        message={{
          ...message,
          content: {
            workflow: {
              ...message.content.workflow,
              status: 'running',
              error: undefined,
              workflowAgents: [
                {
                  id: 'agent-env',
                  label: 'env-prepare',
                  status: 'completed',
                  currentAction: '检查应用状态',
                },
                {
                  id: 'agent-test',
                  label: 'test:case[1.0.0].regionConfigManagement.json',
                  status: 'running',
                  currentAction: '执行 regionConfigManagement 测试用例',
                },
              ],
            },
          },
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /执行测试/ }));

    expect(screen.getByText('test:case[1.0.0].regionConfigManagement.json')).toBeInTheDocument();
    expect(screen.getByText('执行 regionConfigManagement 测试用例')).toBeInTheDocument();
    expect(screen.queryByText('检查应用状态')).not.toBeInTheDocument();
    expect(screen.getByText('1 agent')).toBeInTheDocument();
  });

  it('maps execute-prefixed workflow agents to the Execute phase', () => {
    render(
      <MessageWorkflowUpdate
        message={{
          ...message,
          content: {
            workflow: {
              ...message.content.workflow,
              status: 'running',
              error: undefined,
              phases: [
                { title: 'Discover', detail: 'Scan and parse all test case JSON files' },
                { title: 'Execute', detail: 'Execute test cases against the running server' },
                { title: 'Report', detail: 'Aggregate results and generate test report' },
              ],
              workflowAgents: [
                {
                  id: 'agent-execute',
                  label: 'execute:user-info',
                  status: 'running',
                  currentAction: 'Parse and execute API test cases from test-cases/sentinel-risk',
                },
              ],
            },
          },
        }}
      />
    );

    expect(screen.getByRole('button', { name: /Execute/ }).className).toMatch(/phaseCurrent/);
    fireEvent.click(screen.getByRole('button', { name: /Execute/ }));
    expect(screen.getByText('execute:user-info')).toBeInTheDocument();
    expect(screen.getByText(/Parse and execute API test cases/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Discover/ }));
    expect(screen.getByText('Not started yet')).toBeInTheDocument();
    expect(screen.queryByText('execute:user-info')).not.toBeInTheDocument();
  });

  it('enables save script when a dock save action is provided', async () => {
    const saveSpy = vi.fn().mockResolvedValue(undefined);
    render(<MessageWorkflowUpdate message={message} onSaveWorkflowScript={saveSpy} />);

    fireEvent.click(screen.getByRole('button', { name: /save script/i }));

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps long agent labels and usage in separate layout regions', () => {
    render(
      <MessageWorkflowUpdate
        message={{
          ...message,
          content: {
            workflow: {
              ...message.content.workflow,
              status: 'running',
              error: undefined,
              workflowAgents: [
                {
                  id: 'agent-long',
                  label: 'test:case[1.0.0].regionConfigManagement.json',
                  status: 'running',
                  currentAction:
                    '执行指定测试用例文件夹中的所有测试用例并输出非常长非常长的执行描述，确保不会和 agent 名称、usage、时间重叠',
                  usage: { totalTokens: 113860, toolUses: 99 },
                },
              ],
            },
          },
        }}
      />
    );

    expect(screen.getByText('test:case[1.0.0].regionConfigManagement.json')).toBeInTheDocument();
    expect(screen.getByText(/执行指定测试用例文件夹中的所有测试用例/)).toBeInTheDocument();
    expect(screen.getByText('113860 tok · 99 tools')).toBeInTheDocument();
    expect(document.querySelector('[class*="agentTopLine"]')).toBeInTheDocument();
    expect(document.querySelector('[class*="agentMeta"]')).toBeInTheDocument();
  });
});
