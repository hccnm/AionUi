import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, Message, Select, Space, Tag, Typography } from '@arco-design/web-react';
import { useSearchParams } from 'react-router-dom';
import { workspaceResourceAdapter, type WorkspaceResource } from '@/common/resources/workspaceResources';
import {
  WorkspaceFileConflictError,
  workspaceRuntimeAdapter,
  type WorkspaceExecution,
  type WorkspaceFileContent,
  type WorkspaceFileEntry,
  type WorkspaceTerminalSession,
} from '@/common/resources/workspaceRuntime';

const { Text } = Typography;

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

const WorkspaceRuntimePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [workspaces, setWorkspaces] = useState<WorkspaceResource[]>([]);
  const [workspaceId, setWorkspaceId] = useState(searchParams.get('workspace_id') ?? '');
  const [path, setPath] = useState('.');
  const [entries, setEntries] = useState<WorkspaceFileEntry[]>([]);
  const [file, setFile] = useState<WorkspaceFileContent | null>(null);
  const [draft, setDraft] = useState('');
  const [terminal, setTerminal] = useState<WorkspaceTerminalSession | null>(null);
  const [executions, setExecutions] = useState<WorkspaceExecution[]>([]);
  const [selectedExecutionId, setSelectedExecutionId] = useState('');
  const [command, setCommand] = useState('npm test');

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === workspaceId) ?? null,
    [workspaceId, workspaces]
  );
  const selectedExecution = useMemo(
    () => executions.find((execution) => execution.id === selectedExecutionId) ?? executions[0] ?? null,
    [executions, selectedExecutionId]
  );

  const loadWorkspaces = useCallback(async () => {
    const result = await workspaceResourceAdapter.listWorkspaces();
    setWorkspaces(result.items);
    const requested = searchParams.get('workspace_id');
    const fallback = result.items.find((workspace) => workspace.status !== 'archived')?.id ?? result.items[0]?.id ?? '';
    const nextWorkspaceId = requested && result.items.some((workspace) => workspace.id === requested) ? requested : fallback;
    if (nextWorkspaceId && nextWorkspaceId !== workspaceId) {
      setWorkspaceId(nextWorkspaceId);
    }
  }, [searchParams, workspaceId]);

  const loadFiles = useCallback(async () => {
    if (!workspaceId) return;
    const result = await workspaceRuntimeAdapter.listFiles(workspaceId, path);
    setEntries(result.items);
  }, [path, workspaceId]);

  const loadExecutions = useCallback(async () => {
    if (!workspaceId) return;
    const result = await workspaceRuntimeAdapter.listExecutions(workspaceId);
    setExecutions(result.items);
    setSelectedExecutionId((current) => current || result.items[0]?.id || '');
  }, [workspaceId]);

  const loadArtifacts = useCallback(async () => {
    if (!workspaceId || !selectedExecutionId) return;
    const result = await workspaceRuntimeAdapter.listArtifacts(workspaceId, selectedExecutionId);
    setExecutions((current) =>
      current.map((execution) => (execution.id === selectedExecutionId ? { ...execution, artifacts: result.items } : execution))
    );
  }, [selectedExecutionId, workspaceId]);

  useEffect(() => {
    loadWorkspaces().catch((error) => {
      Message.error(error instanceof Error ? error.message : 'Failed to load workspaces');
    });
  }, [loadWorkspaces]);

  useEffect(() => {
    if (!workspaceId) return;
    setSearchParams({ workspace_id: workspaceId });
    setFile(null);
    setDraft('');
    void Promise.all([loadFiles(), loadExecutions()]).catch((error) => {
      Message.error(error instanceof Error ? error.message : 'Failed to load runtime data');
    });
  }, [loadExecutions, loadFiles, setSearchParams, workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    const interval = window.setInterval(() => {
      void Promise.all([loadExecutions(), loadArtifacts()]).catch((error) => {
        console.error('Failed to poll runtime data:', error);
      });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [loadArtifacts, loadExecutions, workspaceId]);

  useEffect(() => {
    void loadArtifacts();
  }, [loadArtifacts]);

  const openEntry = async (entry: WorkspaceFileEntry) => {
    if (entry.type === 'directory') {
      setPath(entry.path);
      return;
    }
    try {
      const content = await workspaceRuntimeAdapter.readFile(workspaceId, entry.path);
      setFile(content);
      setDraft(content.content);
    } catch (error) {
      Message.error(error instanceof Error ? error.message : 'Failed to read file');
    }
  };

  const saveFile = async () => {
    if (!workspaceId || !file) return;
    try {
      const result = await workspaceRuntimeAdapter.writeFile(workspaceId, {
        path: file.path,
        content: draft,
        base_version: file.base_version,
      });
      setFile({ ...file, content: draft, base_version: result.version ?? file.base_version });
      Message.success('File saved');
      await loadFiles();
    } catch (error) {
      if (error instanceof WorkspaceFileConflictError) {
        Message.error('File changed on server. Reload before saving again.');
        return;
      }
      Message.error(error instanceof Error ? error.message : 'Failed to save file');
    }
  };

  const createFolder = async () => {
    const name = window.prompt('Folder name');
    if (!workspaceId || !name?.trim()) return;
    await workspaceRuntimeAdapter.mkdir(workspaceId, path === '.' ? name.trim() : `${path}/${name.trim()}`);
    await loadFiles();
  };

  const uploadTextFile = async () => {
    const fileName = window.prompt('File name');
    if (!workspaceId || !fileName?.trim()) return;
    const content = window.prompt('Text content') ?? '';
    await workspaceRuntimeAdapter.upload(workspaceId, {
      path,
      file_name: fileName.trim(),
      content_base64: toBase64(content),
      mime_type: 'text/plain',
    });
    await loadFiles();
  };

  const createTerminal = async () => {
    if (!workspaceId) return;
    const session = await workspaceRuntimeAdapter.createTerminal(workspaceId, { cwd: path });
    setTerminal(session);
  };

  const createExecution = async (kind: 'test_run' | 'preview_env') => {
    if (!workspaceId) return;
    const execution = await workspaceRuntimeAdapter.createExecution(workspaceId, {
      kind,
      relative_path: path,
      command: kind === 'test_run' ? command : undefined,
      title: kind === 'test_run' ? 'Test Run' : 'Preview Environment',
    });
    setExecutions((current) => [execution, ...current]);
    setSelectedExecutionId(execution.id);
  };

  const refreshExecution = async (operation: 'cancel' | 'redeploy') => {
    if (!workspaceId || !selectedExecution) return;
    const next =
      operation === 'cancel'
        ? await workspaceRuntimeAdapter.cancelExecution(workspaceId, selectedExecution.id)
        : await workspaceRuntimeAdapter.redeployExecution(workspaceId, selectedExecution.id);
    setExecutions((current) => [next, ...current.filter((execution) => execution.id !== next.id)]);
    setSelectedExecutionId(next.id);
  };

  const openArtifact = async (artifactId: string) => {
    void artifactId;
    Message.info('Artifact download is not available in the current phase-2 backend. Showing metadata only.');
  };

  return (
    <div className='h-full overflow-auto bg-bg-1 p-24px'>
      <div className='mx-auto flex max-w-1320px flex-col gap-16px'>
        <Card bordered={false}>
          <div className='flex flex-wrap items-center justify-between gap-12px'>
            <div>
              <div className='text-20px font-600'>Workspace Runtime</div>
              <Text type='secondary'>Workspace scoped files, terminal, executions, previews and artifacts.</Text>
            </div>
            <Select
              value={workspaceId}
              placeholder='Select workspace'
              className='min-w-280px'
              onChange={(value) => setWorkspaceId(String(value))}
            >
              {workspaces.map((workspace) => (
                <Select.Option key={workspace.id} value={workspace.id} disabled={workspace.status === 'archived'}>
                  {workspace.name} · {workspace.source_type}
                </Select.Option>
              ))}
            </Select>
          </div>
          {selectedWorkspace && (
            <div className='mt-12px flex flex-wrap gap-8px'>
              <Tag color='blue'>{selectedWorkspace.source_type}</Tag>
              <Tag>{selectedWorkspace.status}</Tag>
              {selectedWorkspace.branch_ref && <Tag>{selectedWorkspace.branch_ref}</Tag>}
            </div>
          )}
        </Card>

        <div className='grid grid-cols-1 gap-16px xl:grid-cols-[380px_1fr]'>
          <Card title='Files' bordered={false}>
            <Space direction='vertical' className='w-full'>
              <Input value={path} onChange={setPath} addBefore='/' />
              <Space wrap>
                <Button size='small' onClick={() => void loadFiles()}>
                  Refresh
                </Button>
                <Button size='small' onClick={() => setPath('.')}>
                  Root
                </Button>
                <Button size='small' onClick={() => void createFolder()}>
                  Mkdir
                </Button>
                <Button size='small' onClick={() => void uploadTextFile()}>
                  Upload Text
                </Button>
                <Button size='small' onClick={() => void createTerminal()}>
                  Terminal
                </Button>
              </Space>
              <div className='flex max-h-420px flex-col gap-8px overflow-auto'>
                {entries.map((entry) => (
                  <button
                    key={entry.path}
                    className='flex items-center justify-between rounded-8px border border-border-1 bg-fill-1 px-10px py-8px text-left hover:bg-fill-2'
                    onClick={() => void openEntry(entry)}
                  >
                    <span className='truncate'>{entry.name}</span>
                    <Tag size='small'>{entry.type}</Tag>
                  </button>
                ))}
              </div>
              {terminal && (
                <div className='rounded-8px bg-fill-1 p-10px'>
                  <div className='font-500'>Terminal {terminal.id}</div>
                  <Text type='secondary'>
                    {terminal.status} · /{terminal.cwd}
                  </Text>
                </div>
              )}
            </Space>
          </Card>

          <Card
            title={file ? `Editor /${file.path}` : 'Editor'}
            bordered={false}
            extra={
              <Button type='primary' disabled={!file} onClick={() => void saveFile()}>
                Save
              </Button>
            }
          >
            <Input.TextArea
              value={draft}
              onChange={setDraft}
              placeholder='Open a workspace file to edit'
              autoSize={{ minRows: 16, maxRows: 26 }}
            />
            {file && (
              <Text type='secondary' className='mt-8px block'>
                base_version: {file.base_version}
              </Text>
            )}
          </Card>
        </div>

        <Card title='Executions' bordered={false}>
          <Space direction='vertical' className='w-full'>
            <div className='flex flex-wrap items-center gap-8px'>
              <Input className='max-w-360px' value={command} onChange={setCommand} placeholder='Test command' />
              <Button type='primary' onClick={() => void createExecution('test_run')}>
                Create TestRun
              </Button>
              <Button onClick={() => void createExecution('preview_env')}>Create PreviewEnv</Button>
              <Button onClick={() => void loadExecutions()}>Refresh</Button>
            </div>
            <div className='grid grid-cols-1 gap-16px xl:grid-cols-[380px_1fr]'>
              <div className='flex max-h-460px flex-col gap-8px overflow-auto'>
                {executions.map((execution) => (
                  <button
                    key={execution.id}
                    className='rounded-8px border border-border-1 bg-fill-1 px-10px py-8px text-left hover:bg-fill-2'
                    onClick={() => setSelectedExecutionId(execution.id)}
                  >
                    <div className='flex items-center justify-between gap-8px'>
                      <span className='font-500'>{execution.title || execution.kind}</span>
                      <Tag color={execution.status === 'failed' ? 'red' : execution.status === 'running' ? 'blue' : 'green'}>
                        {execution.status}
                      </Tag>
                    </div>
                    <Text type='secondary' className='block truncate'>
                      /{execution.relative_path || '.'}
                    </Text>
                  </button>
                ))}
              </div>

              <div className='flex flex-col gap-12px'>
                {selectedExecution ? (
                  <>
                    <div className='flex flex-wrap items-center gap-8px'>
                      <Tag>{selectedExecution.kind}</Tag>
                      <Tag>{selectedExecution.status}</Tag>
                      {selectedExecution.approval_state && <Tag color='orange'>{selectedExecution.approval_state}</Tag>}
                      <Button size='small' onClick={() => void refreshExecution('cancel')}>
                        Cancel
                      </Button>
                      <Button size='small' onClick={() => void refreshExecution('redeploy')}>
                        Redeploy
                      </Button>
                      {selectedExecution.approval_state === 'required' && (
                        <Tag color='orange'>Waiting for backend approval endpoint</Tag>
                      )}
                    </div>
                    {selectedExecution.preview_url && (
                      <div className='rounded-8px bg-fill-1 p-10px'>
                        <div className='font-500'>Preview</div>
                        <a href={selectedExecution.preview_url} target='_blank' rel='noreferrer'>
                          {selectedExecution.preview_url}
                        </a>
                        {selectedExecution.expires_at && (
                          <Text type='secondary' className='block'>
                            expires_at: {selectedExecution.expires_at}
                          </Text>
                        )}
                      </div>
                    )}
                    <div className='rounded-8px bg-fill-1 p-10px'>
                      <div className='mb-6px font-500'>Logs</div>
                      <div className='max-h-180px overflow-auto font-mono text-12px'>
                        {(selectedExecution.logs ?? []).map((log) => (
                          <div key={log.id}>
                            [{log.level}] {log.message}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className='rounded-8px bg-fill-1 p-10px'>
                      <div className='mb-6px font-500'>Artifacts</div>
                      <Space direction='vertical' className='w-full'>
                        {(selectedExecution.artifacts ?? []).map((artifact) => (
                          <div key={artifact.id} className='flex items-center justify-between gap-8px'>
                            <span>{artifact.name || artifact.artifact_type || artifact.ref_ || artifact.id}</span>
                            <Button size='mini' onClick={() => void openArtifact(artifact.id)}>
                              Metadata
                            </Button>
                          </div>
                        ))}
                      </Space>
                    </div>
                  </>
                ) : (
                  <Text type='secondary'>No execution selected.</Text>
                )}
              </div>
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default WorkspaceRuntimePage;
