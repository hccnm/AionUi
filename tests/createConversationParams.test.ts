import { describe, expect, it } from 'vitest';

import { buildAgentConversationParams } from '../src/aionui/common/utils/buildAgentConversationParams';

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
});
