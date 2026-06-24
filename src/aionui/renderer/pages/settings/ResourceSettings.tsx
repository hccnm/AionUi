import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input, Message, Space, Tag, Typography } from '@arco-design/web-react';
import { useNavigate } from 'react-router-dom';
import SettingsPageWrapper from './components/SettingsPageWrapper';
import {
  workspaceResourceAdapter,
  type GitProject,
  type SshCredential,
  type WorkspaceResource,
} from '@/common/resources/workspaceResources';

const { Text } = Typography;

const ResourceSettings: React.FC = () => {
  const navigate = useNavigate();
  const [sshCredentials, setSshCredentials] = useState<SshCredential[]>([]);
  const [gitProjects, setGitProjects] = useState<GitProject[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceResource[]>([]);
  const [sshName, setSshName] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [gitName, setGitName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [selectedSshCredentialId, setSelectedSshCredentialId] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [selectedGitProjectId, setSelectedGitProjectId] = useState('');

  const reload = useCallback(async () => {
    const [sshResult, gitResult, workspaceResult] = await Promise.all([
      workspaceResourceAdapter.listSshCredentials(),
      workspaceResourceAdapter.listGitProjects(),
      workspaceResourceAdapter.listWorkspaces(),
    ]);
    setSshCredentials(sshResult.items);
    setGitProjects(gitResult.items);
    setWorkspaces(workspaceResult.items);
  }, []);

  useEffect(() => {
    reload().catch((error) => {
      console.error('Failed to load workspace resources:', error);
    });
  }, [reload]);

  const uploadCredential = async () => {
    try {
      await workspaceResourceAdapter.uploadSshCredential({
        name: sshName.trim(),
        private_key: privateKey,
        passphrase: passphrase || undefined,
      });
      setSshName('');
      setPrivateKey('');
      setPassphrase('');
      await reload();
      Message.success('SSH credential uploaded');
    } catch (error) {
      Message.error(error instanceof Error ? error.message : 'Failed to upload SSH credential');
    }
  };

  const generateCredential = async () => {
    try {
      await workspaceResourceAdapter.generateSshCredential({ name: sshName.trim() || 'Generated key' });
      setSshName('');
      setPrivateKey('');
      setPassphrase('');
      await reload();
      Message.success('SSH credential generated');
    } catch (error) {
      Message.error(error instanceof Error ? error.message : 'Failed to generate SSH credential');
    }
  };

  const createGitProject = async () => {
    try {
      await workspaceResourceAdapter.createGitProject({
        display_name: gitName.trim(),
        repo_ssh_url: repoUrl.trim(),
        default_branch: branch.trim() || undefined,
        credential_id: selectedSshCredentialId,
      });
      setGitName('');
      setRepoUrl('');
      await reload();
      Message.success('Git project created');
    } catch (error) {
      Message.error(error instanceof Error ? error.message : 'Failed to create Git project');
    }
  };

  const createBlankWorkspace = async () => {
    try {
      await workspaceResourceAdapter.createWorkspace({
        name: workspaceName.trim(),
        source_type: 'blank',
      });
      setWorkspaceName('');
      await reload();
      Message.success('Blank workspace created');
    } catch (error) {
      Message.error(error instanceof Error ? error.message : 'Failed to create workspace');
    }
  };

  const createGitWorkspace = async () => {
    try {
      await workspaceResourceAdapter.createWorkspace({
        name: workspaceName.trim(),
        source_type: 'git_project',
        git_project_id: selectedGitProjectId,
        branch_ref: branch.trim() || undefined,
      });
      setWorkspaceName('');
      await reload();
      Message.success('Git workspace created');
    } catch (error) {
      Message.error(error instanceof Error ? error.message : 'Failed to create workspace');
    }
  };

  return (
    <SettingsPageWrapper contentClassName='max-w-1180px'>
      <div className='flex flex-col gap-16px'>
        <Card title='SSH Credentials' bordered={false}>
          <Space direction='vertical' className='w-full'>
            <Input placeholder='Name' value={sshName} onChange={setSshName} />
            <Input.TextArea
              placeholder='Private key, cleared after submit'
              value={privateKey}
              onChange={setPrivateKey}
              autoSize={{ minRows: 3, maxRows: 8 }}
            />
            <Input.Password placeholder='Passphrase, cleared after submit' value={passphrase} onChange={setPassphrase} />
            <Space>
              <Button type='primary' disabled={!sshName.trim() || !privateKey.trim()} onClick={() => void uploadCredential()}>
                Upload
              </Button>
              <Button disabled={!sshName.trim()} onClick={() => void generateCredential()}>
                Generate
              </Button>
            </Space>
            {sshCredentials.map((credential) => (
              <div key={credential.id} className='rounded-8px bg-fill-1 px-12px py-8px'>
                <div className='min-w-0'>
                  <div className='font-500'>{credential.name}</div>
                  <Text type='secondary' className='block truncate'>
                    {credential.fingerprint || credential.public_key}
                  </Text>
                </div>
              </div>
            ))}
          </Space>
        </Card>

        <Card title='Git Projects' bordered={false}>
          <Space direction='vertical' className='w-full'>
            <Input placeholder='Project name' value={gitName} onChange={setGitName} />
            <Input placeholder='Repository URL' value={repoUrl} onChange={setRepoUrl} />
            <Input placeholder='Branch' value={branch} onChange={setBranch} />
            <Input placeholder='SSH credential id' value={selectedSshCredentialId} onChange={setSelectedSshCredentialId} />
            <Button
              type='primary'
              disabled={!gitName.trim() || !repoUrl.trim() || !selectedSshCredentialId}
              onClick={() => void createGitProject()}
            >
              Create Git Project
            </Button>
            {gitProjects.map((project) => (
              <div key={project.id} className='flex items-center justify-between gap-12px rounded-8px bg-fill-1 px-12px py-8px'>
                <div className='min-w-0'>
                  <div className='font-500'>{project.display_name}</div>
                  <Text type='secondary' className='block truncate'>
                    {project.repo_ssh_url} {project.default_branch ? `(${project.default_branch})` : ''}
                  </Text>
                </div>
                <Space>
                  <Tag>{project.status}</Tag>
                  <Button size='small' onClick={() => void workspaceResourceAdapter.syncGitProject(project.id).then(reload)}>
                    Sync
                  </Button>
                  <Button size='small' onClick={() => void workspaceResourceAdapter.archiveGitProject(project.id).then(reload)}>
                    Archive
                  </Button>
                  <Button status='danger' size='small' onClick={() => void workspaceResourceAdapter.deleteGitProject(project.id).then(reload)}>
                    Delete
                  </Button>
                </Space>
              </div>
            ))}
          </Space>
        </Card>

        <Card title='Workspaces' bordered={false}>
          <Space direction='vertical' className='w-full'>
            <Input placeholder='Workspace name' value={workspaceName} onChange={setWorkspaceName} />
            <Input placeholder='Git project id' value={selectedGitProjectId} onChange={setSelectedGitProjectId} />
            <Space wrap>
              <Button type='primary' disabled={!workspaceName.trim()} onClick={() => void createBlankWorkspace()}>
                Create Blank Workspace
              </Button>
              <Button disabled={!workspaceName.trim() || !selectedGitProjectId} onClick={() => void createGitWorkspace()}>
                Create Git Workspace
              </Button>
            </Space>
            {workspaces.length === 0 && (
              <Text type='secondary'>No workspace yet. Create a blank workspace first, then start a conversation from the home page.</Text>
            )}
            {workspaces.map((workspace) => (
              <div key={workspace.id} className='flex items-center justify-between gap-12px rounded-8px bg-fill-1 px-12px py-8px'>
                <div className='min-w-0'>
                  <div className='font-500'>{workspace.name}</div>
                  <Text type='secondary' className='block truncate'>
                    {workspace.source_type === 'git_project' ? workspace.git_project_id : workspace.source_type}
                    {workspace.branch_ref ? ` (${workspace.branch_ref})` : ''}
                  </Text>
                </div>
                <Space>
                  <Tag>{workspace.status}</Tag>
                  <Button
                    size='small'
                    disabled={workspace.status === 'archived'}
                    onClick={() => navigate(`/runtime?workspace_id=${encodeURIComponent(workspace.id)}`)}
                  >
                    Open Runtime
                  </Button>
                  <Button
                    size='small'
                    onClick={() => {
                      const name = window.prompt('Workspace name', workspace.name);
                      if (name?.trim()) void workspaceResourceAdapter.renameWorkspace(workspace.id, name.trim()).then(reload);
                    }}
                  >
                    Rename
                  </Button>
                  {workspace.status === 'archived' ? (
                    <Button size='small' onClick={() => void workspaceResourceAdapter.restoreWorkspace(workspace.id).then(reload)}>
                      Restore
                    </Button>
                  ) : (
                    <Button size='small' onClick={() => void workspaceResourceAdapter.archiveWorkspace(workspace.id).then(reload)}>
                      Archive
                    </Button>
                  )}
                  <Button status='danger' size='small' onClick={() => void workspaceResourceAdapter.deleteWorkspace(workspace.id).then(reload)}>
                    Delete
                  </Button>
                </Space>
              </div>
            ))}
          </Space>
        </Card>
      </div>
    </SettingsPageWrapper>
  );
};

export default ResourceSettings;
