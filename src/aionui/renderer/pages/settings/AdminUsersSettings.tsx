import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, Message, Select, Space, Tag, Typography } from '@arco-design/web-react';
import {
  AdminForbiddenError,
  adminAccessControlAdapter,
  canViewAdminUsers,
  type AdminRole,
  type AdminUser,
} from '@/common/admin/adminAccessControl';
import { useAuth } from '@/renderer/hooks/context/AuthContext';
import SettingsPageWrapper from './components/SettingsPageWrapper';

const { Text } = Typography;
const PAGE_SIZE = 20;

const AdminUsersSettings: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [forbidden, setForbidden] = useState(!canViewAdminUsers(currentUser));
  const canManage = useMemo(() => canViewAdminUsers(currentUser), [currentUser]);

  const load = useCallback(async () => {
    if (!canManage) {
      setForbidden(true);
      return;
    }
    try {
      const result = await adminAccessControlAdapter.listUsers({
        page,
        page_size: PAGE_SIZE,
        keyword: keyword.trim() || undefined,
        status: status || undefined,
      });
      setUsers(result.items);
      setTotal(result.total);
      setForbidden(false);

      adminAccessControlAdapter
        .listRoles()
        .then((roleResult) => setRoles(roleResult.items))
        .catch((error) => {
          if (!(error instanceof AdminForbiddenError)) {
            console.error('Failed to load roles for assignment:', error);
          }
        });
    } catch (error) {
      if (error instanceof AdminForbiddenError) {
        setForbidden(true);
        return;
      }
      Message.error(error instanceof Error ? error.message : 'Failed to load users');
    }
  }, [canManage, keyword, page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (user: AdminUser) => {
    const nextStatus = user.status === 'disabled' ? 'enabled' : 'disabled';
    const reason = nextStatus === 'disabled' ? window.prompt('Disable reason') || undefined : undefined;
    try {
      await adminAccessControlAdapter.updateUserStatus(user.id, { status: nextStatus, reason });
      Message.success('User status updated');
      await load();
    } catch (error) {
      Message.error(error instanceof Error ? error.message : 'Failed to update user status');
    }
  };

  const resetPassword = async (user: AdminUser) => {
    const newPassword = window.prompt(`New password for ${user.display_name || user.phone || user.id}`);
    if (!newPassword) return;
    try {
      await adminAccessControlAdapter.resetUserPassword(user.id, { password: newPassword });
      Message.success('Password reset');
    } catch (error) {
      Message.error(error instanceof Error ? error.message : 'Failed to reset password');
    }
  };

  const assignRoles = async (user: AdminUser) => {
    const currentRoleIds = user.roles.map((role) => role.id).join(',');
    const input = window.prompt('Role IDs, comma separated', currentRoleIds);
    if (input === null) return;
    const roleIds = input
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    try {
      const currentRoleIds = user.roles.map((role) => role.id);
      const target = new Set(roleIds);
      const current = new Set(currentRoleIds);
      const hasChanges = roleIds.some((roleId) => !current.has(roleId)) || currentRoleIds.some((roleId) => !target.has(roleId));
      if (!hasChanges) return;
      await adminAccessControlAdapter.assignUserRoles(user.id, { role_ids: roleIds, current_role_ids: currentRoleIds });
      Message.success('Roles assigned');
      await load();
    } catch (error) {
      Message.error(error instanceof Error ? error.message : 'Failed to assign roles');
    }
  };

  if (forbidden) {
    return (
      <SettingsPageWrapper contentClassName='max-w-960px'>
        <Card bordered={false}>
          <div className='text-18px font-600'>Forbidden</div>
          <Text type='secondary'>You do not have permission to manage users.</Text>
        </Card>
      </SettingsPageWrapper>
    );
  }

  return (
    <SettingsPageWrapper contentClassName='max-w-1180px'>
      <div className='flex flex-col gap-16px'>
        <Card bordered={false}>
          <div className='flex flex-wrap items-end justify-between gap-12px'>
            <div>
              <div className='text-20px font-600'>Admin Users</div>
              <Text type='secondary'>Manage user status, passwords and role assignments.</Text>
            </div>
            <Space wrap>
              <Input.Search
                value={keyword}
                onChange={setKeyword}
                onSearch={() => {
                  setPage(1);
                  void load();
                }}
                placeholder='Search phone or name'
                className='w-240px'
              />
              <Select
                value={status}
                placeholder='Status'
                allowClear
                className='w-150px'
                onChange={(value) => {
                  setStatus(value ? String(value) : '');
                  setPage(1);
                }}
              >
                <Select.Option value='enabled'>enabled</Select.Option>
                <Select.Option value='disabled'>disabled</Select.Option>
              </Select>
              <Button onClick={() => void load()}>Refresh</Button>
            </Space>
          </div>
        </Card>

        <Card bordered={false}>
          <Space direction='vertical' className='w-full'>
            {users.map((user) => (
              <div key={user.id} className='rounded-10px border border-border-1 bg-fill-1 p-12px'>
                <div className='flex flex-wrap items-center justify-between gap-12px'>
                  <div className='min-w-0'>
                    <div className='font-600'>{user.display_name || user.phone || user.id}</div>
                    <Text type='secondary' className='block truncate'>
                      {user.phone || user.id}
                    </Text>
                  </div>
                  <Space wrap>
                    <Tag color={user.status === 'disabled' ? 'red' : 'green'}>{user.status}</Tag>
                    <Button size='small' onClick={() => void updateStatus(user)}>
                      {user.status === 'disabled' ? 'Enable' : 'Disable'}
                    </Button>
                    <Button size='small' onClick={() => void resetPassword(user)}>
                      Reset Password
                    </Button>
                    <Button size='small' onClick={() => void assignRoles(user)} disabled={roles.length === 0}>
                      Assign Roles
                    </Button>
                  </Space>
                </div>
                <div className='mt-10px flex flex-wrap gap-8px'>
                  {user.roles.map((role) => (
                    <Tag key={role.id}>{role.role_name}</Tag>
                  ))}
                  {(user.external_identities ?? []).map((identity) => (
                    <Tag key={`${identity.provider}:${identity.external_user_id}`} color='blue'>
                      {identity.provider}
                    </Tag>
                  ))}
                </div>
                <Text type='secondary' className='mt-8px block'>
                  created: {user.created_at || '-'} · updated: {user.updated_at || '-'} · last login: {user.last_login_at || '-'}
                </Text>
              </div>
            ))}
            <div className='flex items-center justify-between pt-8px'>
              <Text type='secondary'>
                Page {page}, total {total}
              </Text>
              <Space>
                <Button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  Previous
                </Button>
                <Button disabled={page * PAGE_SIZE >= total} onClick={() => setPage((current) => current + 1)}>
                  Next
                </Button>
              </Space>
            </div>
          </Space>
        </Card>
      </div>
    </SettingsPageWrapper>
  );
};

export default AdminUsersSettings;
