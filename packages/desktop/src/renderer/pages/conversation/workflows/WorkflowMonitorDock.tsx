/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getWorkflowRunKey, type IMessageWorkflowUpdate, type WorkflowRun } from '@/common/chat/chatLib';
import MessageWorkflowUpdate from '@/renderer/pages/conversation/Messages/components/MessageWorkflowUpdate';
import classNames from 'classnames';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './WorkflowMonitorDock.module.css';
import { useWorkflowMonitor } from './useWorkflowMonitor';

const ACTIVE_STATUSES = new Set(['running', 'not_started', 'in_progress', 'pending']);
const ENDED_STATUSES = new Set(['completed', 'failed', 'stopped']);

const normalizeStatus = (status?: string): string => {
  if (status === 'in_progress' || status === 'pending') return 'running';
  return status || 'not_started';
};

type TLike = (key: string, options?: Record<string, unknown>) => string;

const statusLabel = (status: string | undefined, stopping: boolean, t: TLike): string => {
  if (stopping) {
    return t('conversation.workflowMonitor.status.stopping', { defaultValue: 'Stopping' });
  }
  const normalized = normalizeStatus(status);
  switch (normalized) {
    case 'not_started':
      return t('conversation.workflowMonitor.status.notStarted', { defaultValue: 'Not started' });
    case 'running':
      return t('conversation.workflowMonitor.status.running', { defaultValue: 'Running' });
    case 'completed':
      return t('conversation.workflowMonitor.status.completed', { defaultValue: 'Completed' });
    case 'failed':
      return t('conversation.workflowMonitor.status.failed', { defaultValue: 'Failed' });
    case 'stopped':
      return t('conversation.workflowMonitor.status.stopped', { defaultValue: 'Stopped' });
    default:
      return normalized;
  }
};

const workflowName = (run: WorkflowRun): string => run.workflowName || run.name || 'dynamic workflow';

const visibleSummary = (run: WorkflowRun, t: TLike): string =>
  run.error ||
  run.warning ||
  run.workflowAgents?.find((agent) => ACTIVE_STATUSES.has(normalizeStatus(agent.status)))?.currentAction ||
  run.workflowAgents?.[0]?.currentAction ||
  run.currentPhase ||
  run.progress ||
  run.summary ||
  (run.lastToolName
    ? t('conversation.workflowMonitor.lastToolSummary', {
        defaultValue: 'Last tool: {{tool}}',
        tool: run.lastToolName,
      })
    : t('conversation.workflowMonitor.waitingForUpdate', { defaultValue: 'Waiting for workflow update' }));

const isActive = (run: WorkflowRun): boolean => ACTIVE_STATUSES.has(normalizeStatus(run.status));

const CompactWorkflowBar: React.FC<{
  run: WorkflowRun;
  onExpand: () => void;
  onStopWorkflow: () => Promise<void>;
  onDismiss: () => void;
  stopRequested: boolean;
}> = ({ run, onExpand, onStopWorkflow, onDismiss, stopRequested }) => {
  const { t } = useTranslation();
  const status = normalizeStatus(run.status);
  const canStop = Boolean(run.taskId && isActive(run));
  const canDismiss = ENDED_STATUSES.has(status);

  const handleStop = async () => {
    if (!canStop || stopRequested) return;
    await onStopWorkflow();
  };

  return (
    <div className={styles.compactBar} data-testid='workflow-monitor-dock-compact'>
      <span className={classNames(styles.statusDot, styles[`status_${status}`])} />
      <div className={styles.main}>
        <div className={styles.titleLine}>
          <span className={styles.name}>{workflowName(run)}</span>
          <span className={styles.status}>{statusLabel(status, stopRequested, t)}</span>
        </div>
        <div className={classNames(styles.summary, { [styles.summaryFailed]: status === 'failed' })}>
          {visibleSummary(run, t)}
        </div>
      </div>
      <div className={styles.meta}>
        {run.taskId ? (
          <code title={t('conversation.workflowMonitor.taskTitle', { defaultValue: 'task {{id}}', id: run.taskId })}>
            {t('conversation.workflowMonitor.taskChip', { defaultValue: 'task {{id}}', id: run.taskId })}
          </code>
        ) : null}
        {run.runId ? (
          <code title={t('conversation.workflowMonitor.runTitle', { defaultValue: 'run {{id}}', id: run.runId })}>
            {t('conversation.workflowMonitor.runChip', { defaultValue: 'run {{id}}', id: run.runId })}
          </code>
        ) : null}
      </div>
      <button className={styles.actionButton} type='button' onClick={onExpand}>
        {t('conversation.workflowMonitor.expand', { defaultValue: 'expand' })}
      </button>
      {canDismiss ? (
        <button className={styles.dismissCompactButton} type='button' onClick={onDismiss}>
          {t('conversation.workflowMonitor.close', { defaultValue: 'close' })}
        </button>
      ) : (
        <button
          className={styles.stopButton}
          type='button'
          disabled={!canStop || stopRequested}
          title={
            canStop
              ? t('conversation.workflowMonitor.stopTooltip', { defaultValue: 'Stop this Claude workflow' })
              : t('conversation.workflowMonitor.workflowNotRunning', { defaultValue: 'Workflow is not running' })
          }
          onClick={handleStop}
        >
          {stopRequested
            ? t('conversation.workflowMonitor.stoppingCompact', { defaultValue: 'stopping' })
            : t('conversation.workflowMonitor.stopCompact', { defaultValue: 'stop' })}
        </button>
      )}
    </div>
  );
};

const WorkflowMonitorDock: React.FC<{ conversationId: string; workspacePath?: string }> = ({
  conversationId,
  workspacePath,
}) => {
  const { t } = useTranslation();
  const {
    content,
    activeRun,
    isOpen,
    open,
    collapse,
    dismiss,
    stopWorkflow,
    stopRequested,
    saveWorkflowScript,
    saveRequested,
    saveDisabledReason,
  } = useWorkflowMonitor(conversationId, workspacePath);

  const message = useMemo<IMessageWorkflowUpdate | null>(() => {
    if (!content || !activeRun) return null;
    return {
      id: `workflow-monitor-dock-${getWorkflowRunKey(activeRun, content.sessionId || conversationId)}`,
      type: 'workflow_update',
      conversation_id: conversationId,
      position: 'left',
      status: 'finish',
      content,
    };
  }, [activeRun, content, conversationId]);

  if (!content || !activeRun || !message) return null;

  const normalizedStatus = normalizeStatus(activeRun.status);
  const canDismiss = ENDED_STATUSES.has(normalizedStatus);

  return (
    <div className={styles.dock} data-testid='workflow-monitor-dock'>
      {isOpen ? (
        <div className={styles.expandedShell} data-testid='workflow-monitor-dock-expanded'>
          <div className={styles.expandedToolbar}>
            {canDismiss ? (
              <button className={styles.dismissButton} type='button' onClick={dismiss}>
                {t('conversation.workflowMonitor.close', { defaultValue: 'close' })}
              </button>
            ) : null}
            <button className={styles.collapseButton} type='button' onClick={collapse}>
              {t('conversation.workflowMonitor.collapse', { defaultValue: 'collapse' })}
            </button>
          </div>
          <MessageWorkflowUpdate
            message={message}
            onStopWorkflow={stopWorkflow}
            stopRequested={stopRequested}
            onSaveWorkflowScript={saveWorkflowScript}
            saveRequested={saveRequested}
            saveDisabledReason={saveDisabledReason}
          />
        </div>
      ) : (
        <CompactWorkflowBar
          run={activeRun}
          onExpand={open}
          onStopWorkflow={stopWorkflow}
          onDismiss={dismiss}
          stopRequested={stopRequested}
        />
      )}
    </div>
  );
};

export default WorkflowMonitorDock;
