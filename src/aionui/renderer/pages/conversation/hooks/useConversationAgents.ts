/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import useSWR from 'swr';
import type { Assistant } from '@/common/types/agent/assistantTypes';
import { ASSISTANTS_SWR_KEY, fetchAssistantsCatalog } from '@/renderer/hooks/assistant/assistantsCatalog';
import { STATIC_RESOURCE_SWR_OPTIONS } from '@/renderer/utils/swr/staticResource';
import { DETECTED_AGENTS_SWR_KEY, fetchDetectedAgents } from '@/renderer/utils/model/agentTypes';
import type { AgentMetadata } from '@/renderer/utils/model/agentTypes';

export type UseConversationAgentsResult = {
  /** Detected execution engines (acp, extension, remote, aionrs, gemini, etc.) */
  cliAgents: AgentMetadata[];
  /** Preset assistants from `/api/assistants` — kept as-is, not re-shaped into agent form */
  presetAssistants: Assistant[];
  /** Loading state */
  isLoading: boolean;
  /** Refresh data */
  refresh: () => Promise<void>;
};

/**
 * Hook to fetch available CLI agents and preset assistants for the conversation tab dropdown.
 *
 * Two independent data sources:
 *   - Execution engines — from AgentRegistry via IPC (agents.detected)
 *   - Preset assistants — from backend `/api/assistants` (merged builtin + user + extension)
 */
export const useConversationAgents = (): UseConversationAgentsResult => {
  // Execution engines from AgentRegistry (shared cache with useDetectedAgents / useGuidAgentSelection)
  const {
    data: cliAgents,
    isLoading: isLoadingAgents,
    mutate,
  } = useSWR<AgentMetadata[]>(DETECTED_AGENTS_SWR_KEY, fetchDetectedAgents, STATIC_RESOURCE_SWR_OPTIONS);

  // Preset assistants from the backend-maintained catalog
  const {
    data: presetAssistants,
    isLoading: isLoadingPresets,
    mutate: mutatePresetAssistants,
  } = useSWR<Assistant[]>(ASSISTANTS_SWR_KEY, fetchAssistantsCatalog, STATIC_RESOURCE_SWR_OPTIONS);

  const refresh = async () => {
    await Promise.all([mutate(), mutatePresetAssistants()]);
  };

  return {
    cliAgents: cliAgents || [],
    presetAssistants: (presetAssistants || []).filter((assistant) => assistant.enabled !== false),
    isLoading: isLoadingAgents || isLoadingPresets,
    refresh,
  };
};
