import { describe, expect, it } from 'vitest';

import {
  isGuidHomeSelectableAgent,
  resolveGuidHomeInitialAgentKey,
} from '@/renderer/pages/guid/hooks/useGuidAgentSelection';
import { isSupportedNewConversationAgent } from '@/renderer/utils/model/agentTypeSupportPolicy';

describe('Guid home agent selection', () => {
  it('hides Aion CLI only from the Guid home picker', () => {
    expect(isSupportedNewConversationAgent({ agent_type: 'aionrs' })).toBe(true);
    expect(isGuidHomeSelectableAgent({ agent_type: 'aionrs' })).toBe(false);
    expect(isGuidHomeSelectableAgent({ agent_type: 'acp' })).toBe(true);
  });

  it('does not restore Aion CLI as the Guid home default', () => {
    expect(resolveGuidHomeInitialAgentKey('aionrs')).toBe('');
    expect(resolveGuidHomeInitialAgentKey('claude')).toBe('claude');
    expect(resolveGuidHomeInitialAgentKey('custom:assistant-id')).toBe('custom:assistant-id');
  });
});
