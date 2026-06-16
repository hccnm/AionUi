/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGuidAcpDraftConversation } from '@/renderer/pages/guid/hooks/useGuidAcpDraftConversation';

const { createInvokeMock, warmupInvokeMock, getSlashCommandsInvokeMock, updateInvokeMock, removeInvokeMock } =
  vi.hoisted(() => ({
    createInvokeMock: vi.fn(),
    warmupInvokeMock: vi.fn(),
    getSlashCommandsInvokeMock: vi.fn(),
    updateInvokeMock: vi.fn(),
    removeInvokeMock: vi.fn(),
  }));

vi.mock('@/common', () => ({
  ipcBridge: {
    conversation: {
      create: { invoke: createInvokeMock },
      warmup: { invoke: warmupInvokeMock },
      getSlashCommands: { invoke: getSlashCommandsInvokeMock },
      update: { invoke: updateInvokeMock },
      remove: { invoke: removeInvokeMock },
    },
  },
}));

const baseInput = {
  dir: '/workspace/project',
  selectedAgent: 'claude',
  selectedAgentKey: 'claude',
  selectedAgentInfo: {
    id: 'agent-claude',
    name: 'Claude Code',
    agent_type: 'claude',
    backend: 'claude',
  } as any,
  is_presetAgent: false,
  selectedMode: 'default',
  selectedAcpModel: null,
  currentAcpCachedModelInfo: null,
  current_model: {
    id: 'provider-1',
    platform: 'anthropic',
    name: 'Anthropic',
    base_url: '',
    api_key: '',
    use_model: 'claude-sonnet',
  },
  findAgentByKey: vi.fn(() => ({
    id: 'agent-claude',
    name: 'Claude Code',
    agent_type: 'claude',
    backend: 'claude',
  })),
  getEffectiveAgentType: vi.fn(() => ({ agent_type: 'claude', isAvailable: true })),
  resolvePresetRulesAndSkills: vi.fn(async () => ({})),
  resolveEnabledSkills: vi.fn(() => undefined),
  resolveDisabledBuiltinSkills: vi.fn(() => undefined),
  guidDisabledBuiltinSkills: undefined,
  guidEnabledSkills: undefined,
  availableMcpServers: [],
  selectedMcpServerIds: [],
};

describe('useGuidAcpDraftConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createInvokeMock.mockResolvedValue({ id: 'draft-1' });
    warmupInvokeMock.mockResolvedValue(undefined);
    getSlashCommandsInvokeMock.mockResolvedValue([
      {
        command: 'execute-order-test-cases',
        description: 'Run order test cases',
      },
    ]);
    updateInvokeMock.mockResolvedValue(true);
    removeInvokeMock.mockResolvedValue(true);
  });

  it('prewarms a hidden ACP draft conversation and exposes slash commands', async () => {
    const { result } = renderHook(() => useGuidAcpDraftConversation(baseInput));

    await waitFor(() => {
      expect(result.current.slashCommands).toEqual([
        expect.objectContaining({
          name: 'execute-order-test-cases',
          source: 'acp',
        }),
      ]);
    });

    expect(createInvokeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'acp',
        extra: expect.objectContaining({
          guid_draft: true,
          backend: 'claude',
          workspace: '/workspace/project',
        }),
      })
    );
    expect(warmupInvokeMock).toHaveBeenCalledWith({ conversation_id: 'draft-1' });
    expect(getSlashCommandsInvokeMock).toHaveBeenCalledWith({ conversation_id: 'draft-1' });
  });

  it('promotes the draft instead of creating another conversation on send', async () => {
    const { result } = renderHook(() => useGuidAcpDraftConversation(baseInput));

    await waitFor(() => {
      expect(result.current.conversationId).toBe('draft-1');
    });

    await expect(result.current.promote('Run workflow')).resolves.toBe('draft-1');
    expect(updateInvokeMock).toHaveBeenCalledWith({
      id: 'draft-1',
      merge_extra: true,
      updates: {
        name: 'Run workflow',
        extra: {
          guid_draft: false,
        },
      },
    });
  });
});
