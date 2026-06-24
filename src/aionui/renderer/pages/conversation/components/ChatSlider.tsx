/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TChatConversation } from '@/common/config/storage';
import { Message } from '@arco-design/web-react';
import React from 'react';
import ChatWorkspace from '../Workspace';

const ChatSlider: React.FC<{
  conversation?: TChatConversation;
}> = ({ conversation }) => {
  const [messageApi, messageContext] = Message.useMessage({ maxCount: 1 });
  const workspaceId = conversation?.workspace_id;
  const workspaceLabel = conversation?.extra?.workspace || conversation?.name || workspaceId || '';

  let workspaceNode: React.ReactNode = null;
  if (conversation?.type === 'acp' && (workspaceId || conversation.extra?.workspace)) {
    workspaceNode = (
      <ChatWorkspace
        conversation_id={conversation.id}
        workspace={workspaceLabel}
        workspaceId={workspaceId}
        isTemporaryWorkspace={
          (conversation.extra as { is_temporary_workspace?: boolean } | undefined)?.is_temporary_workspace
        }
        eventPrefix='acp'
        messageApi={messageApi}
      ></ChatWorkspace>
    );
  } else if (conversation?.type === 'codex' && (workspaceId || conversation.extra?.workspace)) {
    workspaceNode = (
      <ChatWorkspace
        conversation_id={conversation.id}
        workspace={workspaceLabel}
        workspaceId={workspaceId}
        isTemporaryWorkspace={
          (conversation.extra as { is_temporary_workspace?: boolean } | undefined)?.is_temporary_workspace
        }
        eventPrefix='codex'
        messageApi={messageApi}
      ></ChatWorkspace>
    );
  } else if (conversation?.type === 'aionrs' && (workspaceId || conversation.extra?.workspace)) {
    workspaceNode = (
      <ChatWorkspace
        conversation_id={conversation.id}
        workspace={workspaceLabel}
        workspaceId={workspaceId}
        isTemporaryWorkspace={
          (conversation.extra as { is_temporary_workspace?: boolean } | undefined)?.is_temporary_workspace
        }
        eventPrefix='aionrs'
        messageApi={messageApi}
      ></ChatWorkspace>
    );
  }

  if (!workspaceNode) {
    return <div></div>;
  }

  return (
    <>
      {messageContext}
      {workspaceNode}
    </>
  );
};

export default ChatSlider;
