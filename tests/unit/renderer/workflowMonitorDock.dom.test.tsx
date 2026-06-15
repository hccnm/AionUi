/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IResponseMessage } from '@/common/adapter/ipcBridge';
import { ConversationProvider } from '@/renderer/hooks/context/ConversationContext';
import { Message } from '@arco-design/web-react';
import { resetConversationRuntimeViewStoreForTest } from '@/renderer/pages/conversation/runtime/conversationRuntimeViewStore';

const mocks = vi.hoisted(() => {
  const listeners = new Set<(message: IResponseMessage) => void>();
  return {
    listeners,
    listWorkflows: vi.fn(),
    stopWorkflow: vi.fn(),
    getConversation: vi.fn(),
    readFile: vi.fn(),
    createDirectory: vi.fn(),
    writeFile: vi.fn(),
    openFile: vi.fn(),
    showItemInFolder: vi.fn(),
    onResponseStream: vi.fn((callback: (message: IResponseMessage) => void) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    }),
    onNoop: vi.fn(() => () => {}),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, options?: Record<string, unknown>) => {
      const fallback = typeof options?.defaultValue === 'string' ? options.defaultValue : _key;
      return fallback.replace(/\{\{(\w+)\}\}/g, (_match, name) => String(options?.[name] ?? ''));
    },
  }),
}));

vi.mock('@/common', () => ({
  ipcBridge: {
    conversation: {
      get: { invoke: mocks.getConversation },
      listWorkflows: { invoke: mocks.listWorkflows },
      stopWorkflow: { invoke: mocks.stopWorkflow },
      turnCompleted: { on: mocks.onNoop },
      listChanged: { on: mocks.onNoop },
    },
    fs: {
      readFile: { invoke: mocks.readFile },
      createDirectory: { invoke: mocks.createDirectory },
      writeFile: { invoke: mocks.writeFile },
    },
    shell: {
      openFile: { invoke: mocks.openFile },
      showItemInFolder: { invoke: mocks.showItemInFolder },
    },
    acpConversation: {
      responseStream: { on: mocks.onResponseStream },
    },
  },
}));

import WorkflowMonitorDock from '@/renderer/pages/conversation/workflows/WorkflowMonitorDock';

const conversationId = 'conversation-1';
const workspacePath = '/Users/ethanhuang/Desktop/codespace/test/more-ecommerce-server';

const renderDock = () =>
  render(
    <ConversationProvider value={{ conversation_id: conversationId, type: 'acp', workspace: workspacePath }}>
      <WorkflowMonitorDock conversationId={conversationId} workspacePath={workspacePath} />
    </ConversationProvider>
  );

const emitWorkflowUpdate = (workflow: Record<string, unknown>) => {
  const message: IResponseMessage = {
    type: 'workflow_update',
    conversation_id: conversationId,
    msg_id: `msg-${workflow.runId || workflow.taskId || 'workflow'}`,
    turn_id: 'turn-1',
    data: {
      workflow,
    },
  };

  act(() => {
    for (const listener of mocks.listeners) {
      listener(message);
    }
  });
};

describe('WorkflowMonitorDock', () => {
  beforeEach(() => {
    resetConversationRuntimeViewStoreForTest();
    mocks.getConversation.mockResolvedValue({
      id: conversationId,
      type: 'acp',
      runtime: {
        state: 'idle',
        is_processing: false,
        can_send_message: true,
        pending_confirmations: 0,
        has_backend_runtime: true,
        turn_id: null,
      },
    });
    mocks.listWorkflows.mockResolvedValue({ result: { workflows: [] } });
    mocks.stopWorkflow.mockResolvedValue({ result: {} });
    mocks.readFile.mockResolvedValue('export const meta = { name: "execute-order-test-cases" }');
    mocks.createDirectory.mockResolvedValue(true);
    mocks.writeFile.mockResolvedValue(true);
    mocks.openFile.mockResolvedValue(undefined);
    mocks.showItemInFolder.mockResolvedValue(undefined);
    vi.spyOn(Message, 'success').mockImplementation(() => undefined as never);
    vi.spyOn(Message, 'error').mockImplementation(() => undefined as never);
    vi.spyOn(Message, 'warning').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    mocks.listeners.clear();
    resetConversationRuntimeViewStoreForTest();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('auto-renders an expanded dock when a running workflow update arrives', async () => {
    renderDock();

    expect(screen.queryByTestId('workflow-monitor-dock')).not.toBeInTheDocument();

    emitWorkflowUpdate({
      workflowName: 'execute-order-test-cases',
      taskId: 'task-1',
      runId: 'wf_1',
      status: 'running',
      progress: '环境准备',
      phases: [{ title: '环境准备' }, { title: '执行测试' }],
    });

    expect(await screen.findByTestId('workflow-monitor-dock-expanded')).toBeInTheDocument();
    expect(screen.getByTestId('workflow-monitor')).toBeInTheDocument();
    expect(screen.getByText('execute-order-test-cases')).toBeInTheDocument();
    expect(screen.getByText('Waiting for 1 dynamic workflow to finish')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /collapse/i }).parentElement?.className).toMatch(/expandedToolbar/);
  });

  it('does not render the dock before the workflow is actually approved and started', async () => {
    renderDock();

    emitWorkflowUpdate({
      workflowName: 'execute-order-test-cases',
      toolUseId: 'call_approval',
      status: 'pending',
      progress: 'Awaiting workflow approval',
      workflowAgents: [
        {
          id: 'agent-approval',
          label: 'workflow task',
          status: 'pending',
          currentAction: 'Awaiting workflow approval',
        },
      ],
    });

    expect(screen.queryByTestId('workflow-monitor-dock')).not.toBeInTheDocument();

    emitWorkflowUpdate({
      workflowName: 'execute-order-test-cases',
      toolUseId: 'call_approval',
      taskId: 'task-1',
      runId: 'wf_1',
      status: 'running',
      progress: '环境准备',
    });

    expect(await screen.findByTestId('workflow-monitor-dock-expanded')).toBeInTheDocument();
  });

  it('keeps the same run collapsed across progress updates and expands for a new run', async () => {
    renderDock();

    emitWorkflowUpdate({
      workflowName: 'execute-order-test-cases',
      taskId: 'task-1',
      runId: 'wf_1',
      status: 'running',
      progress: '环境准备',
    });

    fireEvent.click(await screen.findByRole('button', { name: /collapse/i }));
    expect(screen.getByTestId('workflow-monitor-dock-compact')).toBeInTheDocument();

    emitWorkflowUpdate({
      workflowName: 'execute-order-test-cases',
      taskId: 'task-1',
      runId: 'wf_1',
      status: 'running',
      progress: '执行测试',
    });

    expect(screen.getByTestId('workflow-monitor-dock-compact')).toBeInTheDocument();
    expect(screen.getByText('执行测试')).toBeInTheDocument();

    emitWorkflowUpdate({
      workflowName: 'execute-order-test-cases',
      taskId: 'task-2',
      runId: 'wf_2',
      status: 'running',
      progress: '生成报告',
    });

    expect(await screen.findByTestId('workflow-monitor-dock-expanded')).toBeInTheDocument();
  });

  it('shows failed reason in the collapsed bar and can stop active workflows', async () => {
    renderDock();

    emitWorkflowUpdate({
      workflowName: 'execute-order-test-cases',
      taskId: 'task-1',
      runId: 'wf_1',
      status: 'running',
      progress: '执行测试',
    });
    fireEvent.click(await screen.findByRole('button', { name: /collapse/i }));

    fireEvent.click(screen.getByRole('button', { name: /^stop$/i }));
    expect(screen.getByRole('button', { name: /stopping/i })).toBeDisabled();
    await waitFor(() => {
      expect(mocks.stopWorkflow).toHaveBeenCalledWith({
        conversation_id: conversationId,
        task_id: 'task-1',
        run_id: 'wf_1',
        workflow_name: 'execute-order-test-cases',
      });
    });

    emitWorkflowUpdate({
      workflowName: 'execute-order-test-cases',
      taskId: 'task-1',
      runId: 'wf_1',
      status: 'failed',
      error: '应用未运行: http://localhost:8099 连接被拒绝',
    });

    expect(screen.getByTestId('workflow-monitor-dock-compact')).toBeInTheDocument();
    expect(screen.getByText('应用未运行: http://localhost:8099 连接被拒绝')).toBeInTheDocument();
  });

  it('saves the workflow script into the current project .claude/workflows folder', async () => {
    renderDock();

    emitWorkflowUpdate({
      workflowName: 'execute-order-test-cases',
      taskId: 'task-1',
      runId: 'wf_1',
      status: 'completed',
      scriptPath:
        '/Users/ethanhuang/Desktop/codespace/test/more-ecommerce-server/.claude/workflows/execute-order-test-cases.js',
      summary: '执行完成',
    });

    fireEvent.click(await screen.findByRole('button', { name: /save script/i }));

    const targetDir = `${workspacePath}/.claude/workflows`;
    const targetPath = `${targetDir}/execute-order-test-cases.js`;
    await waitFor(() => {
      expect(mocks.createDirectory).toHaveBeenCalledWith({ path: targetDir, workspace: workspacePath });
      expect(mocks.writeFile).toHaveBeenCalledWith({
        path: targetPath,
        data: 'export const meta = { name: "execute-order-test-cases" }',
        workspace: workspacePath,
      });
      expect(mocks.openFile).toHaveBeenCalledWith(targetPath);
    });
  });

  it('falls back to showing the saved workflow in folder when opening the script fails', async () => {
    mocks.openFile.mockRejectedValueOnce(new Error('open failed'));
    renderDock();

    emitWorkflowUpdate({
      workflowName: 'execute-order-test-cases',
      taskId: 'task-1',
      runId: 'wf_1',
      status: 'completed',
      scriptPath:
        '/Users/ethanhuang/Desktop/codespace/test/more-ecommerce-server/.claude/workflows/execute-order-test-cases.js',
      summary: '执行完成',
    });

    fireEvent.click(await screen.findByRole('button', { name: /save script/i }));

    await waitFor(() => {
      expect(mocks.showItemInFolder).toHaveBeenCalledWith(
        `${workspacePath}/.claude/workflows/execute-order-test-cases.js`
      );
    });
  });

  it('does not start a second listWorkflows request while the previous refresh is pending', async () => {
    vi.useFakeTimers();
    let resolveList: (value: unknown) => void = () => {};
    const pendingList = new Promise((resolve) => {
      resolveList = resolve;
    });
    mocks.listWorkflows.mockReturnValueOnce(pendingList).mockResolvedValue({ result: { workflows: [] } });

    renderDock();
    expect(mocks.listWorkflows).toHaveBeenCalledTimes(1);

    emitWorkflowUpdate({
      workflowName: 'execute-order-test-cases',
      taskId: 'task-1',
      runId: 'wf_1',
      status: 'running',
      progress: '执行测试',
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(mocks.listWorkflows).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveList({
        result: {
          workflows: [
            {
              workflowName: 'execute-order-test-cases',
              taskId: 'task-1',
              runId: 'wf_1',
              status: 'running',
            },
          ],
        },
      });
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(mocks.listWorkflows).toHaveBeenCalledTimes(2);
  });

  it.each(['completed', 'failed', 'stopped'])(
    'keeps the dock visible but stops polling after a %s workflow update',
    async (status) => {
      vi.useFakeTimers();
      renderDock();
      expect(mocks.listWorkflows).toHaveBeenCalledTimes(1);
      mocks.listWorkflows.mockClear();

      emitWorkflowUpdate({
        workflowName: 'execute-order-test-cases',
        taskId: 'task-1',
        runId: 'wf_1',
        status,
        progress: '结束',
      });

      expect(screen.getByTestId('workflow-monitor-dock-expanded')).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(7500);
      });
      expect(mocks.listWorkflows).not.toHaveBeenCalled();
      expect(screen.getByTestId('workflow-monitor-dock-expanded')).toBeInTheDocument();
    }
  );

  it('allows dismissing a completed run and does not reshow it until a new run starts', async () => {
    renderDock();

    emitWorkflowUpdate({
      workflowName: 'execute-order-test-cases',
      taskId: 'task-1',
      runId: 'wf_1',
      status: 'completed',
      summary: '执行完成',
    });

    fireEvent.click(await screen.findByRole('button', { name: /^close$/i }));
    expect(screen.queryByTestId('workflow-monitor-dock')).not.toBeInTheDocument();

    emitWorkflowUpdate({
      workflowName: 'execute-order-test-cases',
      taskId: 'task-1',
      runId: 'wf_1',
      status: 'completed',
      summary: '执行完成',
    });

    expect(screen.queryByTestId('workflow-monitor-dock')).not.toBeInTheDocument();

    emitWorkflowUpdate({
      workflowName: 'execute-order-test-cases',
      taskId: 'task-2',
      runId: 'wf_2',
      status: 'running',
      progress: '环境准备',
    });

    expect(await screen.findByTestId('workflow-monitor-dock-expanded')).toBeInTheDocument();
  });
});
