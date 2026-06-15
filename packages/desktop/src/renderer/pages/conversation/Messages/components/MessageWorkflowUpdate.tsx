/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  IMessageWorkflowUpdate,
  WorkflowAgent,
  WorkflowAgentUsage,
  WorkflowPhase,
  WorkflowRun,
  WorkflowRunStatus,
} from '@/common/chat/chatLib';
import classNames from 'classnames';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './MessageWorkflowUpdate.module.css';

const ACTIVE_STATUSES = new Set(['running', 'not_started', 'in_progress', 'pending']);
const PHASE_ACTIVE_STATUSES = new Set(['running', 'in_progress', 'pending']);
const DONE_STATUSES = new Set(['completed', 'failed', 'stopped']);

const normalizeStatus = (status?: WorkflowRunStatus): string => {
  if (!status) return 'not_started';
  if (status === 'in_progress' || status === 'pending') return 'running';
  return status;
};

type TLike = (key: string, options?: Record<string, unknown>) => string;

const statusLabel = (status: WorkflowRunStatus | undefined, stopRequested: boolean, t: TLike): string => {
  if (stopRequested) {
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

const getRunKey = (run: WorkflowRun, index: number): string =>
  run.runId || run.taskId || run.toolUseId || run.workflowName || run.name || `workflow-${index}`;

const visibleReason = (run: WorkflowRun): string | undefined =>
  run.error ||
  run.warning ||
  run.summary ||
  run.progress ||
  (run.lastToolName ? `Last tool: ${run.lastToolName}` : undefined);

const formatUsage = (usage: WorkflowAgentUsage | undefined, t: TLike): string => {
  if (!usage) return t('conversation.workflowMonitor.noUsageYet', { defaultValue: 'no usage yet' });
  const parts: string[] = [];
  if (typeof usage.totalTokens === 'number') {
    parts.push(t('conversation.workflowMonitor.tokens', { defaultValue: '{{count}} tok', count: usage.totalTokens }));
  }
  if (typeof usage.toolUses === 'number') {
    parts.push(t('conversation.workflowMonitor.tools', { defaultValue: '{{count}} tools', count: usage.toolUses }));
  }
  if (typeof usage.durationMs === 'number') parts.push(formatDuration(usage.durationMs));
  return parts.length
    ? parts.join(' · ')
    : t('conversation.workflowMonitor.noUsageYet', { defaultValue: 'no usage yet' });
};

const formatDuration = (durationMs?: number): string => {
  if (typeof durationMs !== 'number' || Number.isNaN(durationMs)) return '';
  if (durationMs < 1000) return `${durationMs}ms`;
  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
};

const formatUpdatedAt = (updatedAt: string | undefined, t: TLike): string => {
  if (!updatedAt) return t('conversation.workflowMonitor.now', { defaultValue: 'now' });
  const time = Date.parse(updatedAt);
  if (Number.isNaN(time)) return t('conversation.workflowMonitor.now', { defaultValue: 'now' });
  const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
  if (seconds < 5) return t('conversation.workflowMonitor.now', { defaultValue: 'now' });
  if (seconds < 60) {
    return t('conversation.workflowMonitor.secondsAgo', { defaultValue: '{{count}}s ago', count: seconds });
  }
  const minutes = Math.round(seconds / 60);
  return t('conversation.workflowMonitor.minutesAgo', { defaultValue: '{{count}}m ago', count: minutes });
};

const formatAgentCount = (count: number, t: TLike): string =>
  count === 1
    ? t('conversation.workflowMonitor.agentCountOne', { defaultValue: '1 agent' })
    : t('conversation.workflowMonitor.agentCountMany', { defaultValue: '{{count}} agents', count });

const activeAgentRows = (run: WorkflowRun): NonNullable<WorkflowRun['workflowAgents']> => {
  if (run.workflowAgents?.length) return run.workflowAgents;
  if (!run.lastToolName && !run.progress && !run.summary && !run.description) return [];
  return [
    {
      id: run.toolUseId || run.taskId || run.runId || workflowName(run),
      label: run.lastToolName || 'workflow task',
      status: run.status,
      currentAction: run.progress || run.summary || run.description,
      lastToolName: run.lastToolName,
      usage: run.usage,
      updatedAt: run.updatedAt,
      rawSdkEvent: run.rawSdkEvent,
    },
  ];
};

const compactText = (value?: string): string => value?.toLowerCase().replace(/\s+/g, '') ?? '';
const textContains = (source: string, needle: string): boolean => compactText(source).includes(compactText(needle));

const agentPhase = (agent?: WorkflowAgent): string | undefined =>
  agent?.phase || agent?.phaseTitle || agent?.currentPhase;

const phaseSearchText = (phase: WorkflowPhase): string => compactText(`${phase.title} ${phase.detail ?? ''}`);

const runSearchText = (run: WorkflowRun, agents: WorkflowAgent[]): string =>
  compactText(
    [
      run.currentPhase,
      run.lastToolName,
      run.progress,
      run.summary,
      run.description,
      ...agents.flatMap((agent) => [agentPhase(agent), agent.label, agent.lastToolName, agent.currentAction]),
    ]
      .filter(Boolean)
      .join(' ')
  );

const liveToolSearchText = (run: WorkflowRun, agent?: WorkflowAgent): string =>
  compactText([agentPhase(agent), agent?.label, agent?.lastToolName, run.lastToolName].filter(Boolean).join(' '));

const isAwaitingApproval = (run: WorkflowRun, agent?: WorkflowAgent): boolean => {
  const approvalText = compactText(
    [
      run.progress,
      run.summary,
      run.description,
      run.currentPhase,
      agent?.currentAction,
      agent?.label,
      agent?.lastToolName,
    ]
      .filter(Boolean)
      .join(' ')
  );
  if (!approvalText) return false;
  return ['awaitingworkflowapproval', 'awaitingapproval', 'workflowapproval', '等待审批', '审批中'].some((keyword) =>
    approvalText.includes(keyword)
  );
};

const findPhaseByLabel = (phases: WorkflowPhase[], label?: string): number => {
  if (!label) return -1;
  const normalized = compactText(label);
  if (!normalized) return -1;
  return phases.findIndex((phase) => {
    const phaseText = phaseSearchText(phase);
    return phaseText === normalized || phaseText.includes(normalized) || normalized.includes(compactText(phase.title));
  });
};

const findPhaseByKeywords = (phases: WorkflowPhase[], haystack: string): number => {
  if (!haystack) return -1;

  if (
    [
      'report:',
      'write-history',
      'test-histories',
      'icasehistory',
      'generate test report',
      'aggregate results',
      '生成报告',
      '写入报告',
    ].some((keyword) => textContains(haystack, keyword))
  ) {
    const reportIndex = phases.findIndex((phase) => {
      const phaseText = phaseSearchText(phase);
      return ['report', '生成报告', '报告', 'test-histories', 'icasehistory', 'aggregate'].some((keyword) =>
        textContains(phaseText, keyword)
      );
    });
    if (reportIndex >= 0) return reportIndex;
  }

  if (
    [
      'execute:',
      'test:case',
      'api test cases',
      'validate assertions',
      'against the running server',
      'execute test',
      '执行测试',
      '测试用例',
    ].some((keyword) => textContains(haystack, keyword))
  ) {
    const executeIndex = phases.findIndex((phase) => {
      const phaseText = phaseSearchText(phase);
      return ['execute', '执行', '运行', 'test cases', 'running server', '测试'].some((keyword) =>
        textContains(phaseText, keyword)
      );
    });
    if (executeIndex >= 0) return executeIndex;
  }

  if (
    ['discover:', 'scan', 'parse all test case json files', 'parse all test', 'discover', '扫描', '解析', '发现'].some(
      (keyword) => textContains(haystack, keyword)
    )
  ) {
    const discoverIndex = phases.findIndex((phase) => {
      const phaseText = phaseSearchText(phase);
      return ['discover', 'scan', 'parse', '发现', '扫描', '解析'].some((keyword) => textContains(phaseText, keyword));
    });
    if (discoverIndex >= 0) return discoverIndex;
  }

  if (['env-prepare', '环境准备', '获取token', '检查应用'].some((keyword) => textContains(haystack, keyword))) {
    const prepareIndex = phases.findIndex((phase) => {
      const phaseText = phaseSearchText(phase);
      return ['环境准备', '准备', 'token', '应用状态'].some((keyword) => textContains(phaseText, keyword));
    });
    if (prepareIndex >= 0) return prepareIndex;
  }

  return -1;
};

const resolveCurrentPhaseIndex = (run: WorkflowRun): number => {
  const phases = run.phases ?? [];
  const agents = activeAgentRows(run);
  if (!phases.length) return -1;
  const activeAgent = agents.find((agent) => ACTIVE_STATUSES.has(normalizeStatus(agent.status))) ?? agents[0];
  const agentPhaseIndex = findPhaseByLabel(phases, agentPhase(activeAgent));
  if (agentPhaseIndex >= 0) return agentPhaseIndex;
  const liveToolIndex = findPhaseByKeywords(phases, liveToolSearchText(run, activeAgent));
  if (liveToolIndex >= 0) return liveToolIndex;
  if (isAwaitingApproval(run, activeAgent)) return -1;
  if (run.currentPhase) {
    const exact = phases.findIndex((phase) => phase.title === run.currentPhase);
    if (exact >= 0) return exact;
    const fuzzy = findPhaseByLabel(phases, run.currentPhase);
    if (fuzzy >= 0) return fuzzy;
  }
  const agentLabelIndex = findPhaseByKeywords(phases, runSearchText(run, activeAgent ? [activeAgent] : agents));
  if (agentLabelIndex >= 0) return agentLabelIndex;
  const globalLabelIndex = findPhaseByKeywords(phases, runSearchText(run, agents));
  if (globalLabelIndex >= 0) return globalLabelIndex;
  const explicit = phases.findIndex(
    (phase) => phase.status && PHASE_ACTIVE_STATUSES.has(normalizeStatus(phase.status))
  );
  if (explicit >= 0) return explicit;
  const status = normalizeStatus(run.status);
  if (status === 'completed') return phases.length - 1;
  return -1;
};

const resolvePhaseIndexForAgent = (run: WorkflowRun, agent: WorkflowAgent): number => {
  const phases = run.phases ?? [];
  if (!phases.length) return -1;

  const exactPhaseIndex = findPhaseByLabel(phases, agentPhase(agent));
  if (exactPhaseIndex >= 0) return exactPhaseIndex;

  const keywordIndex = findPhaseByKeywords(
    phases,
    compactText([agentPhase(agent), agent.label, agent.lastToolName, agent.currentAction].filter(Boolean).join(' '))
  );
  if (keywordIndex >= 0) return keywordIndex;

  return -1;
};

const phaseStatus = (run: WorkflowRun, index: number): string => {
  const phases = run.phases ?? [];
  const current = resolveCurrentPhaseIndex(run);
  const workflowStatus = normalizeStatus(run.status);
  const explicit = phases[index]?.status ? normalizeStatus(phases[index]?.status) : undefined;
  if (explicit && explicit !== 'not_started') return explicit;
  if (workflowStatus === 'completed') return 'completed';
  if (workflowStatus === 'failed' && index === current) return 'failed';
  if (workflowStatus === 'stopped' && index === current) return 'stopped';
  if (index === current && ACTIVE_STATUSES.has(workflowStatus)) return 'running';
  return 'not_started';
};

const MetaPair: React.FC<{ label: string; value?: string }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className={styles.metaPair}>
      <span>{label}</span>
      <code>{value}</code>
    </div>
  );
};

const WorkflowHistory: React.FC<{ runs: WorkflowRun[]; activeKey: string }> = ({ runs, activeKey }) => {
  const { t } = useTranslation();
  const history = runs.filter((run, index) => {
    const key = getRunKey(run, index);
    return key !== activeKey && DONE_STATUSES.has(normalizeStatus(run.status));
  });
  if (!history.length) return null;

  return (
    <details className={styles.history}>
      <summary>
        {t('conversation.workflowMonitor.completedRuns', {
          defaultValue: 'Completed runs ({{count}})',
          count: history.length,
        })}
      </summary>
      <div className={styles.historyList}>
        {history.map((run, index) => (
          <div key={getRunKey(run, index)} className={styles.historyItem}>
            <div>
              <strong>{workflowName(run)}</strong>
              <span>{statusLabel(run.status, false, t)}</span>
            </div>
            <p>
              {visibleReason(run) ||
                t('conversation.workflowMonitor.noSummaryReported', { defaultValue: 'No summary reported yet' })}
            </p>
            <div className={styles.historyMeta}>
              {run.taskId ? (
                <code>
                  {t('conversation.workflowMonitor.taskChip', { defaultValue: 'task {{id}}', id: run.taskId })}
                </code>
              ) : null}
              {run.runId ? (
                <code>{t('conversation.workflowMonitor.runChip', { defaultValue: 'run {{id}}', id: run.runId })}</code>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
};

type MessageWorkflowUpdateProps = {
  message: IMessageWorkflowUpdate;
  onStopWorkflow?: () => Promise<void>;
  stopRequested?: boolean;
  onSaveWorkflowScript?: () => Promise<void>;
  saveRequested?: boolean;
  saveDisabledReason?: string;
};

const MessageWorkflowUpdate: React.FC<MessageWorkflowUpdateProps> = ({
  message,
  onStopWorkflow,
  stopRequested = false,
  onSaveWorkflowScript,
  saveRequested = false,
  saveDisabledReason,
}) => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [manualPhaseIndex, setManualPhaseIndex] = useState<number | null>(null);
  const runs = message.content.runs?.length ? message.content.runs : [message.content.workflow];
  const activeRun = useMemo(
    () =>
      runs.find((run) => ACTIVE_STATUSES.has(normalizeStatus(run.status))) ??
      runs.find((run) => normalizeStatus(run.status) === 'failed') ??
      message.content.workflow,
    [message.content.workflow, runs]
  );
  const status = normalizeStatus(activeRun.status);
  const activeKey = getRunKey(activeRun, 0);
  const phases = activeRun.phases ?? [];
  const activePhaseIndex = resolveCurrentPhaseIndex(activeRun);
  const agents = activeAgentRows(activeRun);
  const selectedPhaseIndex = manualPhaseIndex ?? activePhaseIndex;
  const selectedPhase = selectedPhaseIndex >= 0 ? phases[selectedPhaseIndex] : undefined;
  const phaseAgents =
    selectedPhaseIndex >= 0
      ? agents.filter((agent) => resolvePhaseIndexForAgent(activeRun, agent) === selectedPhaseIndex)
      : agents;
  const runningAgents = agents.filter((agent) => ACTIVE_STATUSES.has(normalizeStatus(agent.status))).length;
  const agentsRunning = activeRun.agentsRunning ?? runningAgents;
  const reason = visibleReason(activeRun);
  const canStop = Boolean(onStopWorkflow && activeRun.taskId && ACTIVE_STATUSES.has(status) && !stopRequested);
  const canSave = Boolean(onSaveWorkflowScript && !saveDisabledReason && !saveRequested && !saving);
  const stopTitle = canStop
    ? t('conversation.workflowMonitor.stopTooltip', { defaultValue: 'Stop this Claude workflow' })
    : activeRun.taskId
      ? t('conversation.workflowMonitor.workflowNotRunning', { defaultValue: 'Workflow is not running' })
      : t('conversation.workflowMonitor.taskIdUnavailable', {
          defaultValue: 'Workflow task id is not available yet',
        });

  useEffect(() => {
    setManualPhaseIndex(null);
  }, [activeKey]);

  const handlePhaseClick = (index: number) => {
    setManualPhaseIndex(index);
  };

  const handleStopWorkflow = async () => {
    if (!canStop) return;
    await onStopWorkflow?.();
  };

  const handleSaveWorkflowScript = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSaveWorkflowScript?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.workflowCard} data-testid='workflow-monitor'>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {t('conversation.workflowMonitor.dynamicWorkflow', { defaultValue: 'Dynamic workflow' })}
          </p>
          <h3>{workflowName(activeRun)}</h3>
          {activeRun.description ? <p className={styles.description}>{activeRun.description}</p> : null}
        </div>
        <span className={classNames(styles.statusBadge, styles[`status_${status}`] ?? styles.status_not_started)}>
          {statusLabel(status, stopRequested, t)}
        </span>
      </div>

      {stopRequested ? (
        <div className={styles.waiting}>
          {t('conversation.workflowMonitor.stoppingWorkflow', { defaultValue: 'Stopping workflow...' })}
        </div>
      ) : ACTIVE_STATUSES.has(status) ? (
        <div className={styles.waiting}>
          {t('conversation.workflowMonitor.waitingForWorkflow', {
            defaultValue: 'Waiting for {{count}} dynamic workflow to finish',
            count: Math.max(agentsRunning, status === 'running' ? 1 : 0),
          })}
        </div>
      ) : null}

      <div className={styles.metaGrid}>
        <MetaPair
          label={t('conversation.workflowMonitor.taskId', { defaultValue: 'Task ID' })}
          value={activeRun.taskId}
        />
        <MetaPair label={t('conversation.workflowMonitor.runId', { defaultValue: 'Run ID' })} value={activeRun.runId} />
        <MetaPair
          label={t('conversation.workflowMonitor.toolUseId', { defaultValue: 'Tool Use ID' })}
          value={activeRun.toolUseId}
        />
        <MetaPair
          label={t('conversation.workflowMonitor.lastTool', { defaultValue: 'Last tool' })}
          value={activeRun.lastToolName}
        />
        <MetaPair
          label={t('conversation.workflowMonitor.script', { defaultValue: 'Script' })}
          value={activeRun.scriptPath}
        />
        <MetaPair
          label={t('conversation.workflowMonitor.transcript', { defaultValue: 'Transcript' })}
          value={activeRun.transcriptDir}
        />
      </div>

      <div className={styles.monitor}>
        <aside className={styles.phaseRail}>
          <div className={styles.phaseTitle}>
            {t('conversation.workflowMonitor.phases', { defaultValue: 'Phases' })}
          </div>
          {phases.length ? (
            phases.map((phase, index) => {
              const phaseState = phaseStatus(activeRun, index);
              return (
                <button
                  type='button'
                  key={`${phase.title}-${index}`}
                  className={classNames(styles.phaseRow, styles[`phase_${phaseState}`], {
                    [styles.phaseCurrent]: index === activePhaseIndex,
                    [styles.phaseSelected]: index === selectedPhaseIndex,
                  })}
                  onClick={() => handlePhaseClick(index)}
                >
                  <span>{index + 1}</span>
                  <div>
                    <strong>{phase.title}</strong>
                    {phase.detail ? <small>{phase.detail}</small> : null}
                  </div>
                </button>
              );
            })
          ) : (
            <div className={styles.emptyPhases}>
              {t('conversation.workflowMonitor.emptyPhases', {
                defaultValue: 'Waiting for Claude SDK workflow phases or script metadata',
              })}
            </div>
          )}
        </aside>

        <main className={styles.livePane}>
          <div className={styles.liveHeader}>
            <div>
              <strong>
                {selectedPhase
                  ? selectedPhase.title
                  : t('conversation.workflowMonitor.currentAgent', { defaultValue: 'Current agent' })}
              </strong>
              {selectedPhase?.detail ? <p>{selectedPhase.detail}</p> : null}
            </div>
            <span>
              {formatAgentCount(
                selectedPhaseIndex >= 0 ? phaseAgents.length : Math.max(agents.length, agentsRunning),
                t
              )}
            </span>
          </div>
          {status === 'failed' && reason ? <p className={styles.failureBanner}>{reason}</p> : null}
          {phaseAgents.length ? (
            <div className={styles.agentTable}>
              {phaseAgents.map((agent) => {
                const agentStatus = normalizeStatus(agent.status);
                return (
                  <div key={agent.id} className={styles.agentRow}>
                    <div className={styles.agentTopLine}>
                      <div className={styles.agentName}>
                        <span className={classNames(styles.agentDot, styles[`agent_${agentStatus}`])} />
                        <div>
                          <strong>{agent.label || agent.lastToolName || agent.id}</strong>
                          {agent.lastToolName && agent.lastToolName !== agent.label ? (
                            <small>{agent.lastToolName}</small>
                          ) : null}
                        </div>
                      </div>
                      <div className={styles.agentMeta}>
                        <code>{formatUsage(agent.usage, t)}</code>
                        <span>{formatUpdatedAt(agent.updatedAt, t)}</span>
                      </div>
                    </div>
                    <p className={classNames(styles.agentAction, { [styles.errorReason]: agentStatus === 'failed' })}>
                      {agent.currentAction ||
                        reason ||
                        t('conversation.workflowMonitor.waitingForAgentActivity', {
                          defaultValue: 'Waiting for agent activity',
                        })}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={classNames(styles.reason, { [styles.errorReason]: status === 'failed' })}>
              {selectedPhaseIndex >= 0
                ? phaseStatus(activeRun, selectedPhaseIndex) === 'not_started'
                  ? t('conversation.workflowMonitor.notStartedYet', { defaultValue: 'Not started yet' })
                  : t('conversation.workflowMonitor.noPhaseAgentActivity', {
                      defaultValue: 'No agent activity reported for this phase yet',
                    })
                : reason ||
                  t('conversation.workflowMonitor.waitingForSdkAgentActivity', {
                    defaultValue: 'Waiting for agent activity from Claude SDK',
                  })}
            </p>
          )}
        </main>
      </div>

      <WorkflowHistory runs={runs} activeKey={activeKey} />

      <div className={styles.controls}>
        <button disabled={!canStop} title={stopTitle} onClick={handleStopWorkflow}>
          {stopRequested
            ? t('conversation.workflowMonitor.stopRequestedButton', { defaultValue: 'stop requested' })
            : t('conversation.workflowMonitor.stopWorkflow', { defaultValue: 'x stop workflow' })}
        </button>
        <button
          disabled
          title={t('conversation.workflowMonitor.pauseUnsupported', {
            defaultValue: 'Claude SDK pause workflow control is not available',
          })}
        >
          {t('conversation.workflowMonitor.pauseWorkflow', { defaultValue: 'p pause' })}
        </button>
        <button
          disabled={!canSave}
          title={
            saveDisabledReason ||
            t('conversation.workflowMonitor.saveTooltip', {
              defaultValue: 'Save this Claude workflow script into the current project',
            })
          }
          onClick={handleSaveWorkflowScript}
        >
          {saveRequested || saving
            ? t('conversation.workflowMonitor.savingScript', { defaultValue: 'saving script...' })
            : t('conversation.workflowMonitor.saveScript', { defaultValue: 's save script' })}
        </button>
      </div>
    </section>
  );
};

export default MessageWorkflowUpdate;
