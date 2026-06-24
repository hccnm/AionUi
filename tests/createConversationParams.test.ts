import { describe, expect, it } from 'vitest';

import { buildAgentConversationParams } from '../src/aionui/common/utils/buildAgentConversationParams';
import { isGuidConversationSubmitDisabled } from '../src/aionui/renderer/pages/guid/hooks/useGuidSend';

describe('buildAgentConversationParams', () => {
  it('uses workspace_id without writing extra.workspace for SaaS workspace resources', () => {
    const params = buildAgentConversationParams({
      backend: 'remote',
      name: 'Remote Agent',
      workspace: '/srv/aion/legacy-path',
      workspace_id: 'ws_1',
      model: {} as never,
      custom_agent_id: 'agent_1',
    });

    expect(params.workspace_id).toBe('ws_1');
    expect(params.extra.workspace).toBeUndefined();
    expect(params.extra.remote_agent_id).toBe('agent_1');
  });

  it('does not auto-send legacy workspace when workspace_id is missing', () => {
    const params = buildAgentConversationParams({
      backend: 'codex',
      name: 'Codex Agent',
      workspace: '/srv/aion/legacy-path',
      model: {} as never,
    });

    expect(params.workspace_id).toBeUndefined();
    expect(params.extra.workspace).toBeUndefined();
    expect(params.extra.backend).toBe('codex');
  });
});

describe('guid conversation submit guard', () => {
  it('requires a workspace_id before creating a SaaS conversation', () => {
    expect(isGuidConversationSubmitDisabled({ loading: false, input: 'fix bug' })).toBe(true);
    expect(isGuidConversationSubmitDisabled({ loading: false, input: 'fix bug', workspaceId: 'ws_1' })).toBe(false);
  });
});
