import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, Message, Select, Space, Tag, Typography } from '@arco-design/web-react';
import {
  AdminForbiddenError,
  adminAccessControlAdapter,
  canViewAdminRoles,
  type AdminPermission,
  type AdminRole,
} from '@/common/admin/adminAccessControl';
import { useAuth } from '@/renderer/hooks/context/AuthContext';
import SettingsPageWrapper from './components/SettingsPageWrapper';

const { Text } = Typography;

const AdminRolesSettings: React.FC = () => {
  const { currentUser } = useAuth();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<AdminPermission[]>([]);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [roleKey, setRoleKey] = useState('');
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [forbidden, setForbidden] = useState(!canViewAdminRoles(currentUser));
  const canManage = useMemo(() => canViewAdminRoles(currentUser), [currentUser]);
  const editingSystemRole = Boolean(selectedRole?.is_system);

  const load = useCallback(async () => {
    if (!canManage) {
      setForbidden(true);
      return;
    }
    try {
      const [roleResult, permissionResult] = await Promise.all([
        adminAccessControlAdapter.listRoles(),
        adminAccessControlAdapter.listPermissions(),
      ]);
      setRoles(roleResult.items);
      setPermissionCatalog(permissionResult);
      setForbidden(false);
    } catch (error) {
      if (error instanceof AdminForbiddenError) {
        setForbidden(true);
        return;
      }
      Message.error(error instanceof Error ? error.message : 'Failed to load roles');
    }
  }, [canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  const startCreate = () => {
    setSelectedRole(null);
    setRoleKey('');
    setRoleName('');
    setDescription('');
    setPermissions([]);
  };

  const startEdit = (role: AdminRole) => {
    setSelectedRole(role);
    setRoleKey(role.role_key);
    setRoleName(role.role_name);
    setDescription(role.description ?? '');
    setPermissions(role.permissions);
  };

  const submit = async () => {
    try {
      const payload = {
        role_key: selectedRole ? undefined : roleKey.trim(),
        role_name: roleName.trim(),
        description: description.trim() || undefined,
        permissions,
      };
      if (selectedRole) {
        if (selectedRole.is_system) return;
        await adminAccessControlAdapter.updateRole(selectedRole.id, payload);
        Message.success('Role updated');
      } else {
        await adminAccessControlAdapter.createRole(payload);
        Message.success('Role created');
      }
      startCreate();
      await load();
    } catch (error) {
      Message.error(error instanceof Error ? error.message : 'Failed to save role');
    }
  };

  if (forbidden) {
    return (
      <SettingsPageWrapper contentClassName='max-w-960px'>
        <Card bordered={false}>
          <div className='text-18px font-600'>Forbidden</div>
          <Text type='secondary'>You do not have permission to manage roles.</Text>
        </Card>
      </SettingsPageWrapper>
    );
  }

  return (
    <SettingsPageWrapper contentClassName='max-w-1180px'>
      <div className='grid grid-cols-1 gap-16px xl:grid-cols-[420px_1fr]'>
        <Card title='Roles' bordered={false}>
          <Space direction='vertical' className='w-full'>
            <Button type='primary' onClick={startCreate}>
              New Role
            </Button>
            {roles.map((role) => (
              <button
                key={role.id}
                className='w-full rounded-10px border border-border-1 bg-fill-1 p-12px text-left hover:bg-fill-2'
                onClick={() => startEdit(role)}
              >
                <div className='flex items-center justify-between gap-8px'>
                  <span className='font-600'>{role.role_name}</span>
                  {role.is_system && <Tag color='orange'>system</Tag>}
                </div>
                <Text type='secondary' className='block truncate'>
                  {role.role_key}
                </Text>
                <div className='mt-8px flex flex-wrap gap-6px'>
                  {role.permissions.slice(0, 4).map((permission) => (
                    <Tag key={permission} size='small'>
                      {permission}
                    </Tag>
                  ))}
                  {role.permissions.length > 4 && <Tag size='small'>+{role.permissions.length - 4}</Tag>}
                </div>
              </button>
            ))}
          </Space>
        </Card>

        <Card title={selectedRole ? `Edit ${selectedRole.role_name}` : 'Create Role'} bordered={false}>
          <Space direction='vertical' className='w-full'>
            {editingSystemRole && (
              <Tag color='orange'>System role is protected. Editing is disabled unless backend explicitly allows it.</Tag>
            )}
            <Input placeholder='Role key' value={roleKey} onChange={setRoleKey} disabled={Boolean(selectedRole)} />
            <Input placeholder='Role name' value={roleName} onChange={setRoleName} disabled={editingSystemRole} />
            <Input.TextArea
              placeholder='Description'
              value={description}
              onChange={setDescription}
              disabled={editingSystemRole}
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
            <Select
              mode='multiple'
              placeholder='Select permission flags'
              value={permissions}
              onChange={(value) => setPermissions((value as string[]) ?? [])}
              disabled={editingSystemRole}
              allowClear
            >
              {permissionCatalog.map((permission) => (
                <Select.Option key={permission.key} value={permission.key}>
                  {permission.label || permission.key}
                </Select.Option>
              ))}
            </Select>
            <Space>
              <Button type='primary' disabled={!roleName.trim() || (!selectedRole && !roleKey.trim()) || editingSystemRole} onClick={() => void submit()}>
                {selectedRole ? 'Update Role' : 'Create Role'}
              </Button>
              <Button onClick={startCreate}>Clear</Button>
            </Space>
          </Space>
        </Card>
      </div>
    </SettingsPageWrapper>
  );
};

export default AdminRolesSettings;
