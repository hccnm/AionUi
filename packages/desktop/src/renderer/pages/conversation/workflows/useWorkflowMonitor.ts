/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { IResponseMessage } from '@/common/adapter/ipcBridge';
import {
  getWorkflowRunKey,
  joinPath,
  mergeWorkflowUpdateContent,
  normalizeWorkflowRun,
  normalizeWorkflowRuns,
  transformWorkflowUpdateMessage,
  type WorkflowRun,
  type WorkflowUpdateContent,
} from '@/common/chat/chatLib';
import { useConversationRuntimeView } from '@/renderer/pages/conversation/runtime/useConversationRuntimeView';
import { Message } from '@arco-design/web-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const ACTIVE_STATUSES = new Set(['running', 'not_started', 'in_progress', 'pending']);
const ENDED_STATUSES = new Set(['completed', 'failed', 'stopped']);

type WorkflowMonitorState = {
  content: WorkflowUpdateContent | null;
  isOpen: boolean;
  collapsedByUser: boolean;
  activeRunKey?: string;
  dismissedRunKeys: string[];
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeStatus = (status?: string): string => {
  if (status === 'in_progress' || status === 'pending') return 'running';
  return status || 'not_started';
};

const approvalText = (run: WorkflowRun): string =>
  [
    run.status,
    run.progress,
    run.summary,
    run.description,
    run.currentPhase,
    run.lastToolName,
    ...(run.workflowAgents?.flatMap((agent) => [agent.status, agent.label, agent.currentAction, agent.lastToolName]) ??
      []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const isApprovalPlaceholder = (run: WorkflowRun): boolean => {
  if (!run.toolUseId || run.taskId || run.runId) return false;
  const text = approvalText(run);
  const status = (run.status || '').toLowerCase();
  const looksPending = status === 'pending' || text.includes('pending');
  const looksApproval = ['awaiting workflow approval', 'awaiting approval', '等待审批', '审批中'].some((keyword) =>
    text.includes(keyword)
  );
  return looksPending || looksApproval;
};

const isRenderableWorkflowRun = (run: WorkflowRun): boolean => !isApprovalPlaceholder(run);

const selectPrimaryRun = (content: WorkflowUpdateContent): WorkflowRun => {
  const runs = content.runs?.length ? content.runs : [content.workflow];
  return (
    runs.find((run) => ACTIVE_STATUSES.has(normalizeStatus(run.status))) ??
    runs.find((run) => normalizeStatus(run.status) === 'failed') ??
    content.workflow
  );
};

const getSessionId = (value: unknown): string | undefined => {
  if (!isObject(value)) return undefined;
  const candidate = value.sessionId ?? value.session_id;
  return typeof candidate === 'string' ? candidate : undefined;
};

const isEndedStatus = (status?: string): boolean => ENDED_STATUSES.has(normalizeStatus(status));

const runHasSameKey = (run: WorkflowRun, targetKey: string, fallbackKey: string): boolean =>
  getWorkflowRunKey(run, fallbackKey) === targetKey;

const updateRunInContent = (
  content: WorkflowUpdateContent,
  targetKey: string,
  updater: (run: WorkflowRun) => WorkflowRun
): WorkflowUpdateContent => {
  const fallbackSessionId = content.sessionId || 'workflow';
  const workflow = runHasSameKey(content.workflow, targetKey, fallbackSessionId)
    ? updater(content.workflow)
    : content.workflow;
  const runs = content.runs?.map((run, index) =>
    runHasSameKey(run, targetKey, `${fallbackSessionId}-${index}`) ? updater(run) : run
  );
  return { ...content, workflow, runs };
};

const scriptFromRawInput = (run: WorkflowRun): string | undefined => {
  if (!isObject(run.rawInput)) return undefined;
  const direct = run.rawInput.script;
  if (typeof direct === 'string' && direct.trim()) return direct;
  const rawInput = run.rawInput.rawInput ?? run.rawInput.raw_input;
  if (isObject(rawInput) && typeof rawInput.script === 'string' && rawInput.script.trim()) {
    return rawInput.script;
  }
  return undefined;
};

const hasScriptSource = (run?: WorkflowRun | null): boolean =>
  Boolean(run?.scriptPath || (run && scriptFromRawInput(run)));

const sanitizeWorkflowFileName = (name?: string): string => {
  const sanitized = (name || 'workflow')
    .trim()
    .replace(/[\\/:%*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/, '')
    .slice(0, 96);
  return sanitized || 'workflow';
};

const workflowScriptExtension = (scriptPath?: string): string => (scriptPath?.endsWith('.mjs') ? '.mjs' : '.js');

const unwrapStopResult = (response: unknown): unknown => {
  let current = response;
  for (let i = 0; i < 3; i += 1) {
    if (isObject(current) && 'result' in current) {
      current = current.result;
      continue;
    }
    break;
  }
  return current;
};

const workflowStopError = (response: unknown): string | undefined => {
  const result = unwrapStopResult(response);
  if (!isObject(result)) return undefined;
  if (result.unsupported === true) {
    return typeof result.reason === 'string' ? result.reason : 'Workflow stop is not supported by this agent';
  }
  if (result.ok === false) {
    return typeof result.reason === 'string' ? result.reason : 'Failed to stop workflow';
  }
  if (typeof result.error === 'string') {
    return result.error;
  }
  return undefined;
};

const runsFromListResult = (response: unknown): WorkflowUpdateContent | undefined => {
  const root = isObject(response) && 'result' in response ? response.result : response;
  if (!root) return undefined;
  const result = isObject(root) && 'result' in root ? root.result : root;
  const candidates = isObject(result)
    ? [result.runs, result.workflows, result.workflowRuns, result.workflow_runs]
    : [result];

  for (const candidate of candidates) {
    const runs = normalizeWorkflowRuns(candidate);
    if (runs?.length) {
      const primary =
        runs.find((run) => ACTIVE_STATUSES.has(normalizeStatus(run.status))) ??
        runs.find((run) => normalizeStatus(run.status) === 'failed') ??
        runs[0];
      return {
        sessionId: getSessionId(result),
        workflow: primary,
        runs,
        sourceMessageSubtype: 'poll',
      };
    }
  }

  if (isObject(result)) {
    const workflow = normalizeWorkflowRun(result.workflow);
    if (workflow) {
      return {
        sessionId: getSessionId(result),
        workflow,
        runs: normalizeWorkflowRuns(result.runs),
        sourceMessageSubtype: 'poll',
      };
    }
  }

  return undefined;
};

const selectVisibleRun = (content: WorkflowUpdateContent, dismissedRunKeys: string[]): WorkflowRun | null => {
  const primaryRun = selectPrimaryRun(content);
  if (isApprovalPlaceholder(primaryRun)) {
    return null;
  }

  const runs = content.runs?.length ? content.runs : [content.workflow];
  const visibleRuns = runs.filter((run, index) => {
    if (!isRenderableWorkflowRun(run)) return false;
    const key = getWorkflowRunKey(run, content.sessionId || `workflow-${index}`);
    return !dismissedRunKeys.includes(key);
  });

  if (!visibleRuns.length) return null;

  return (
    visibleRuns.find((run) => ACTIVE_STATUSES.has(normalizeStatus(run.status))) ??
    visibleRuns.find((run) => normalizeStatus(run.status) === 'failed') ??
    visibleRuns[0]
  );
};

const mergeMonitorState = (state: WorkflowMonitorState, incoming: WorkflowUpdateContent): WorkflowMonitorState => {
  const content = state.content ? mergeWorkflowUpdateContent(state.content, incoming) : incoming;
  const activeRun = selectPrimaryRun(content);
  const nextKey = getWorkflowRunKey(activeRun, content.sessionId || 'workflow');
  const isNewRun = Boolean(nextKey && nextKey !== state.activeRunKey);
  const isActive = ACTIVE_STATUSES.has(normalizeStatus(activeRun.status));
  const dismissedRunKeys = isNewRun && isActive ? [] : state.dismissedRunKeys;
  const visibleRun = selectVisibleRun(content, dismissedRunKeys);

  return {
    content,
    activeRunKey: nextKey,
    collapsedByUser: isNewRun ? false : state.collapsedByUser,
    isOpen: visibleRun ? (isNewRun ? true : state.collapsedByUser ? false : state.isOpen || isActive) : false,
    dismissedRunKeys,
  };
};

export const useWorkflowMonitor = (conversationId: string, workspacePath?: string) => {
  const { t } = useTranslation();
  const runtimeView = useConversationRuntimeView(conversationId);
  const [state, setState] = useState<WorkflowMonitorState>({
    content: null,
    isOpen: false,
    collapsedByUser: false,
    dismissedRunKeys: [],
  });
  const [stopRequestedRunKeys, setStopRequestedRunKeys] = useState<string[]>([]);
  const [conversationStopRunKeys, setConversationStopRunKeys] = useState<string[]>([]);
  const [saveRequestedRunKeys, setSaveRequestedRunKeys] = useState<string[]>([]);
  const refreshInFlightRef = useRef(false);
  const generationRef = useRef(0);

  const applyContent = useCallback((content: WorkflowUpdateContent) => {
    setState((previous) => mergeMonitorState(previous, content));
  }, []);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    const requestGeneration = generationRef.current;
    try {
      const response = await ipcBridge.conversation.listWorkflows.invoke({ conversation_id: conversationId });
      if (generationRef.current !== requestGeneration) return;
      const content = runsFromListResult(response);
      if (content) {
        applyContent(content);
      }
    } catch {
      // Polling is only a fallback for missed push notifications. Keep it quiet.
    } finally {
      if (generationRef.current === requestGeneration) {
        refreshInFlightRef.current = false;
      }
    }
  }, [applyContent, conversationId]);

  useEffect(() => {
    generationRef.current += 1;
    refreshInFlightRef.current = false;
    setState({ content: null, isOpen: false, collapsedByUser: false, dismissedRunKeys: [] });
    setStopRequestedRunKeys([]);
    setConversationStopRunKeys([]);
    setSaveRequestedRunKeys([]);
  }, [conversationId]);

  useEffect(() => {
    const handleResponse = (message: IResponseMessage) => {
      if (message.conversation_id !== conversationId) return;
      const transformed = transformWorkflowUpdateMessage(message);
      if (!transformed) return;
      applyContent(transformed.content);
    };

    return ipcBridge.acpConversation.responseStream.on(handleResponse);
  }, [applyContent, conversationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeRun = useMemo(
    () => (state.content ? selectVisibleRun(state.content, state.dismissedRunKeys) : null),
    [state.content, state.dismissedRunKeys]
  );
  const activeRunKey = useMemo(
    () => (activeRun ? getWorkflowRunKey(activeRun, state.content?.sessionId || conversationId) : undefined),
    [activeRun, conversationId, state.content?.sessionId]
  );
  const shouldPoll = activeRun ? ACTIVE_STATUSES.has(normalizeStatus(activeRun.status)) : false;

  useEffect(() => {
    if (!activeRunKey || !activeRun || !isEndedStatus(activeRun.status)) return;
    setStopRequestedRunKeys((previous) => previous.filter((key) => key !== activeRunKey));
    setConversationStopRunKeys((previous) => previous.filter((key) => key !== activeRunKey));
  }, [activeRun, activeRunKey]);

  useEffect(() => {
    if (!activeRun || !activeRunKey || !ACTIVE_STATUSES.has(normalizeStatus(activeRun.status))) return;

    if (runtimeView.view.localStopping) {
      setStopRequestedRunKeys((previous) => (previous.includes(activeRunKey) ? previous : [...previous, activeRunKey]));
      setConversationStopRunKeys((previous) =>
        previous.includes(activeRunKey) ? previous : [...previous, activeRunKey]
      );
      return;
    }

    if (!conversationStopRunKeys.includes(activeRunKey)) return;
    if (!runtimeView.hydrated || runtimeView.isProcessing || !runtimeView.canSendMessage) return;

    const stoppedAt = new Date().toISOString();
    const stoppedText = t('conversation.workflowMonitor.stoppedByConversationStop', {
      defaultValue: 'Stopped by conversation stop',
    });
    setState((previous) => {
      if (!previous.content) return previous;
      const content = updateRunInContent(previous.content, activeRunKey, (run) => ({
        ...run,
        status: 'stopped',
        progress: stoppedText,
        summary: stoppedText,
        completedAt: run.completedAt || stoppedAt,
        updatedAt: stoppedAt,
        workflowAgents: run.workflowAgents?.map((agent) => ({
          ...agent,
          status: ACTIVE_STATUSES.has(normalizeStatus(agent.status)) ? 'stopped' : agent.status,
          currentAction: agent.currentAction || stoppedText,
          updatedAt: stoppedAt,
        })),
      }));
      return { ...previous, content, isOpen: previous.collapsedByUser ? false : previous.isOpen };
    });
  }, [
    activeRun,
    activeRunKey,
    runtimeView.canSendMessage,
    runtimeView.hydrated,
    runtimeView.isProcessing,
    runtimeView.view.localStopping,
    conversationStopRunKeys,
    t,
  ]);

  useEffect(() => {
    if (!shouldPoll) return undefined;
    const timer = window.setInterval(() => {
      void refresh();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [refresh, shouldPoll]);

  const open = useCallback(() => {
    setState((previous) => ({ ...previous, isOpen: true, collapsedByUser: false }));
  }, []);

  const collapse = useCallback(() => {
    setState((previous) => ({ ...previous, isOpen: false, collapsedByUser: true }));
  }, []);

  const stopWorkflow = useCallback(async () => {
    if (!activeRun?.taskId || !activeRunKey) return;
    setStopRequestedRunKeys((previous) => (previous.includes(activeRunKey) ? previous : [...previous, activeRunKey]));
    try {
      const response = await ipcBridge.conversation.stopWorkflow.invoke({
        conversation_id: conversationId,
        task_id: activeRun.taskId,
        run_id: activeRun.runId,
        workflow_name: activeRun.workflowName || activeRun.name,
      });
      const error = workflowStopError(response);
      if (error) {
        throw new Error(error);
      }
      Message.success(t('conversation.workflowMonitor.stopRequested', { defaultValue: 'Workflow stop requested' }));
      void refresh();
    } catch (error) {
      setStopRequestedRunKeys((previous) => previous.filter((key) => key !== activeRunKey));
      Message.error(
        error instanceof Error
          ? error.message
          : t('conversation.workflowMonitor.stopFailed', { defaultValue: 'Failed to stop workflow' })
      );
    }
  }, [activeRun, activeRunKey, conversationId, refresh, t]);

  const saveWorkflowScript = useCallback(async () => {
    if (!activeRun || !activeRunKey) return;
    if (!workspacePath) {
      Message.error(
        t('conversation.workflowMonitor.saveNoWorkspace', {
          defaultValue: 'No project workspace is configured for this conversation',
        })
      );
      return;
    }

    const targetDir = joinPath(joinPath(workspacePath, '.claude'), 'workflows');
    const fileName = `${sanitizeWorkflowFileName(activeRun.workflowName || activeRun.name)}${workflowScriptExtension(
      activeRun.scriptPath
    )}`;
    const targetPath = joinPath(targetDir, fileName);
    setSaveRequestedRunKeys((previous) => (previous.includes(activeRunKey) ? previous : [...previous, activeRunKey]));

    try {
      let script = scriptFromRawInput(activeRun);
      if (activeRun.scriptPath) {
        script =
          (await ipcBridge.fs.readFile
            .invoke({ path: activeRun.scriptPath, workspace: workspacePath })
            .catch((): null => null)) ?? script;
      }
      if (!script) {
        throw new Error(
          t('conversation.workflowMonitor.saveScriptUnavailable', {
            defaultValue: 'Workflow script content is unavailable',
          })
        );
      }

      await ipcBridge.fs.createDirectory.invoke({ path: targetDir, workspace: workspacePath });
      await ipcBridge.fs.writeFile.invoke({ path: targetPath, data: script, workspace: workspacePath });

      try {
        await ipcBridge.shell.openFile.invoke(targetPath);
        Message.success(
          t('conversation.workflowMonitor.saveSuccess', {
            defaultValue: 'Workflow script saved to {{path}}',
            path: targetPath,
          })
        );
      } catch {
        await ipcBridge.shell.showItemInFolder.invoke(targetPath).catch((): undefined => undefined);
        Message.warning(
          t('conversation.workflowMonitor.saveOpenFailed', {
            defaultValue: 'Workflow script saved, but could not open it automatically: {{path}}',
            path: targetPath,
          })
        );
      }
    } catch (error) {
      Message.error(
        error instanceof Error
          ? error.message
          : t('conversation.workflowMonitor.saveFailed', { defaultValue: 'Failed to save workflow script' })
      );
    } finally {
      setSaveRequestedRunKeys((previous) => previous.filter((key) => key !== activeRunKey));
    }
  }, [activeRun, activeRunKey, t, workspacePath]);

  const dismiss = useCallback(() => {
    if (!activeRun) return;
    const status = normalizeStatus(activeRun.status);
    if (!ENDED_STATUSES.has(status)) return;
    const runKey = getWorkflowRunKey(activeRun, state.content?.sessionId || conversationId);
    setState((previous) => ({
      ...previous,
      isOpen: false,
      collapsedByUser: false,
      dismissedRunKeys: previous.dismissedRunKeys.includes(runKey)
        ? previous.dismissedRunKeys
        : [...previous.dismissedRunKeys, runKey],
    }));
  }, [activeRun, conversationId, state.content?.sessionId]);

  return {
    content: state.content,
    activeRun,
    activeRunKey,
    isOpen: state.isOpen,
    collapsedByUser: state.collapsedByUser,
    stopRequested: activeRunKey ? stopRequestedRunKeys.includes(activeRunKey) : false,
    saveRequested: activeRunKey ? saveRequestedRunKeys.includes(activeRunKey) : false,
    saveDisabledReason: !activeRun
      ? undefined
      : !workspacePath
        ? t('conversation.workflowMonitor.saveNoWorkspace', {
            defaultValue: 'No project workspace is configured for this conversation',
          })
        : hasScriptSource(activeRun)
          ? undefined
          : t('conversation.workflowMonitor.saveScriptPathUnavailable', {
              defaultValue: 'Workflow script path is unavailable',
            }),
    open,
    collapse,
    dismiss,
    refresh,
    stopWorkflow,
    saveWorkflowScript,
  };
};
