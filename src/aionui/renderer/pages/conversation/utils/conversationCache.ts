/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { isBackendHttpError } from '@/common/adapter/httpBridge';
import type { TChatConversation } from '@/common/config/storage';
import { mutate } from 'swr';
import { runSingleFlight } from './singleFlight';

const conversationInflight = new Map<string, Promise<TChatConversation | null>>();
const recentConversationCache = new Map<string, { value: TChatConversation | null; expiresAt: number }>();
const RECENT_CONVERSATION_TTL_MS = 1500;

export async function getConversationOrNull(conversation_id: string): Promise<TChatConversation | null> {
  const cached = recentConversationCache.get(conversation_id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  return runSingleFlight(conversationInflight, conversation_id, async () => {
    try {
      const conversation = await ipcBridge.conversation.get.invoke({ id: conversation_id });
      recentConversationCache.set(conversation_id, {
        value: conversation,
        expiresAt: Date.now() + RECENT_CONVERSATION_TTL_MS,
      });
      return conversation;
    } catch (error) {
      if (isBackendHttpError(error) && error.status === 404 && error.code === 'NOT_FOUND') {
        recentConversationCache.set(conversation_id, {
          value: null,
          expiresAt: Date.now() + RECENT_CONVERSATION_TTL_MS,
        });
        return null;
      }
      throw error;
    }
  });
}

export async function refreshConversationCache(conversation_id: string): Promise<void> {
  const conversation = await getConversationOrNull(conversation_id);
  if (!conversation) return;

  recentConversationCache.set(conversation_id, {
    value: conversation,
    expiresAt: Date.now() + RECENT_CONVERSATION_TTL_MS,
  });
  await mutate<TChatConversation>(`conversation/${conversation_id}`, conversation, false);
}
