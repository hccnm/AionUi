/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { IMessageAcpPermission } from '@/common/chat/chatLib';
import MessageAcpPermission from '@/renderer/pages/conversation/Messages/acp/MessageAcpPermission';

const mocks = vi.hoisted(() => ({
  confirmMessage: vi.fn(),
}));

vi.mock('@/common/adapter/ipcBridge', () => ({
  conversation: {
    confirmMessage: { invoke: mocks.confirmMessage },
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
  }),
}));

const createPermissionMessage = (overrides: Partial<IMessageAcpPermission['content']['tool_call']> = {}) => {
  const message: IMessageAcpPermission = {
    id: 'permission-message-1',
    msg_id: 'permission-msg-1',
    conversation_id: 'conversation-1',
    type: 'acp_permission',
    position: 'left',
    content: {
      session_id: 'session-1',
      options: [
        { option_id: 'run_once', name: 'Yes, run it', kind: 'allow_once' },
        { option_id: 'view_script', name: 'View raw script', kind: 'allow_once' },
        { option_id: 'deny', name: 'No', kind: 'reject_once' },
      ],
      tool_call: {
        tool_call_id: 'call-1',
        title: 'Workflow project-testcase-discovery',
        kind: 'execute',
        raw_input: {
          command: 'Workflow project-testcase-discovery',
        },
        ...overrides,
      },
    },
    created_at: 1,
  };

  return message;
};

describe('MessageAcpPermission', () => {
  it('keeps the approval card open after View raw script', async () => {
    mocks.confirmMessage.mockResolvedValueOnce(undefined);

    render(<MessageAcpPermission message={createPermissionMessage()} />);

    fireEvent.click(screen.getByLabelText('View raw script'));
    fireEvent.click(screen.getByTestId('message-acp-permission-confirm'));

    await waitFor(() => {
      expect(mocks.confirmMessage).toHaveBeenCalledWith({
        confirm_key: 'view_script',
        msg_id: 'permission-message-1',
        conversation_id: 'conversation-1',
        call_id: 'call-1',
      });
    });

    expect(screen.queryByText(/responseSentSuccessfully/)).not.toBeInTheDocument();
    expect(screen.getByText('View raw script')).toBeInTheDocument();
    expect(screen.getByTestId('message-acp-permission-confirm')).toHaveTextContent('messages.confirm');
  });

  it('resets local response state when a follow-up permission request replaces the card', async () => {
    mocks.confirmMessage.mockResolvedValueOnce(undefined);
    const { rerender } = render(<MessageAcpPermission message={createPermissionMessage()} />);

    fireEvent.click(screen.getByLabelText('Yes, run it'));
    fireEvent.click(screen.getByTestId('message-acp-permission-confirm'));

    await screen.findByText(/responseSentSuccessfully/);

    rerender(
      <MessageAcpPermission
        message={createPermissionMessage({
          title: 'Workflow project-testcase-discovery updated',
        })}
      />
    );

    expect(screen.queryByText(/responseSentSuccessfully/)).not.toBeInTheDocument();
    expect(screen.getByText('View raw script')).toBeInTheDocument();
    expect(screen.getByTestId('message-acp-permission-confirm')).toBeDisabled();
  });
});
