/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { mapAcpCommandsToSlashCommands } from '@/common/chat/slash/acpMapping';
import type { AcpSlashCommandApiItem, SlashCommandItem } from '@/common/chat/slash/types';
import type { ICreateConversationParams } from '@/common/adapter/ipcBridge';
import type { IMcpServer, TProviderWithModel } from '@/common/config/storage';
import { buildAgentConversationParams } from '@/common/utils/buildAgentConversationParams';
import { toSessionMcpServer } from '@/renderer/hooks/mcp/catalog';
import type { AcpModelInfo, AvailableAgent, EffectiveAgentInfo } from '../types';
import { useCallback, useEffect, useRef, useState } from 'react';

type BuildDraftParamsInput = {
  dir: string;
  selectedAgent: string;
  selectedAgentKey: string;
  selectedAgentInfo: AvailableAgent | undefined;
  is_presetAgent: boolean;
  selectedMode: string;
  selectedAcpModel: string | null;
  currentAcpCachedModelInfo: AcpModelInfo | null;
  current_model: TProviderWithModel | undefined;
  findAgentByKey: (key: string) => AvailableAgent | undefined;
  getEffectiveAgentType: (
    agentInfo: { agent_type: string; backend?: string; custom_agent_id?: string } | undefined
  ) => EffectiveAgentInfo;
  resolvePresetRulesAndSkills: (
    agentInfo: { agent_type: string; backend?: string; custom_agent_id?: string; context?: string } | undefined
  ) => Promise<{ rules?: string; skills?: string }>;
  resolveEnabledSkills: (
    agentInfo: { agent_type: string; backend?: string; custom_agent_id?: string } | undefined
  ) => string[] | undefined;
  resolveDisabledBuiltinSkills: (
    agentInfo: { agent_type: string; backend?: string; custom_agent_id?: string } | undefined
  ) => string[] | undefined;
  guidDisabledBuiltinSkills: string[] | undefined;
  guidEnabledSkills: string[] | undefined;
  availableMcpServers: IMcpServer[];
  selectedMcpServerIds: string[] | undefined;
};

export type GuidAcpDraftConversation = {
  conversationId: string | null;
  slashCommands: SlashCommandItem[];
  loading: boolean;
  promote: (name: string) => Promise<string | null>;
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const stableSorted = (items: string[] | undefined) => [...(items ?? [])].sort();

const buildContextKey = (input: BuildDraftParamsInput) => {
  const agentInfo = input.selectedAgentInfo;
  return JSON.stringify({
    dir: input.dir || '',
    selectedAgent: input.selectedAgent,
    selectedAgentKey: input.selectedAgentKey,
    selectedMode: input.selectedMode,
    selectedAcpModel: input.selectedAcpModel,
    cachedModelId: input.currentAcpCachedModelInfo?.current_model_id,
    currentModel: input.current_model?.use_model,
    agentId: agentInfo?.id,
    agentType: agentInfo?.agent_type,
    backend: agentInfo?.backend,
    customAgentId: agentInfo?.custom_agent_id,
    cliPath: agentInfo?.cli_path,
    disabledBuiltinSkills: stableSorted(input.guidDisabledBuiltinSkills),
    enabledSkills: stableSorted(input.guidEnabledSkills),
    selectedMcpServerIds: stableSorted(input.selectedMcpServerIds),
  });
};

const isAionrsAgent = (input: BuildDraftParamsInput) => {
  const { agent_type: effectiveAgentType } = input.getEffectiveAgentType(input.selectedAgentInfo);
  return input.selectedAgent === 'aionrs' || (input.is_presetAgent && effectiveAgentType === 'aionrs');
};

const buildAcpDraftParams = async (input: BuildDraftParamsInput): Promise<ICreateConversationParams | null> => {
  if (!input.selectedAgentInfo || isAionrsAgent(input)) {
    return null;
  }

  const isCustomWorkspace = Boolean(input.dir);
  const finalWorkspace = input.dir || '';
  const agentInfo = input.selectedAgentInfo;
  const is_preset = input.is_presetAgent;
  const preset_assistant_id = is_preset ? agentInfo?.custom_agent_id : undefined;
  const { agent_type: effectiveAgentType } = input.getEffectiveAgentType(agentInfo);
  const { rules: preset_rules } = await input.resolvePresetRulesAndSkills(agentInfo);
  const presetEnabledSkillsDefault = input.resolveEnabledSkills(agentInfo);
  const enabled_skills = input.guidEnabledSkills ?? presetEnabledSkillsDefault;
  const excludeBuiltinSkills = input.guidDisabledBuiltinSkills ?? input.resolveDisabledBuiltinSkills(agentInfo);
  const selectedMcpServerIdSet = new Set(input.selectedMcpServerIds ?? []);
  const selectedUserMcpServerIds = input.availableMcpServers
    .filter((server) => selectedMcpServerIdSet.has(server.id) && server.builtin !== true)
    .map((server) => server.id);
  const selectedSessionMcpServers = input.availableMcpServers
    .filter((server) => selectedMcpServerIdSet.has(server.id) && server.builtin === true)
    .map((server) => toSessionMcpServer(server));

  const agent_typeChanged = is_preset && input.selectedAgent !== effectiveAgentType;
  const acpBackend: string | undefined = agent_typeChanged
    ? effectiveAgentType
    : is_preset
      ? effectiveAgentType
      : input.selectedAgent;

  const acpAgentInfo = agent_typeChanged
    ? input.findAgentByKey(acpBackend as string)
    : agentInfo || input.findAgentByKey(input.selectedAgentKey);
  const agentBackend = acpBackend || input.selectedAgent;

  const params = buildAgentConversationParams({
    backend: agentBackend,
    name: '',
    agent_id: acpAgentInfo?.id,
    agent_name: acpAgentInfo?.name,
    preset_assistant_id,
    workspace: finalWorkspace,
    model: input.current_model!,
    cli_path: acpAgentInfo?.cli_path,
    custom_agent_id: acpAgentInfo?.custom_agent_id,
    custom_workspace: isCustomWorkspace,
    is_preset,
    preset_agent_type: effectiveAgentType,
    preset_resources: is_preset
      ? {
          rules: preset_rules,
          enabled_skills,
          exclude_auto_inject_skills: excludeBuiltinSkills,
        }
      : undefined,
    session_mode: input.selectedMode,
    current_model_id: input.selectedAcpModel || input.currentAcpCachedModelInfo?.current_model_id || undefined,
    extra: {
      default_files: [],
      exclude_auto_inject_skills: excludeBuiltinSkills,
      selected_mcp_server_ids: selectedUserMcpServerIds,
      selected_session_mcp_servers: selectedSessionMcpServers,
      ...(is_preset ? {} : input.guidEnabledSkills?.length ? { preset_enabled_skills: input.guidEnabledSkills } : {}),
      guid_draft: true,
    },
  });

  return params;
};

export const useGuidAcpDraftConversation = (input: BuildDraftParamsInput): GuidAcpDraftConversation => {
  const contextKey = buildContextKey(input);
  const inputRef = useRef(input);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [slashCommands, setSlashCommands] = useState<SlashCommandItem[]>([]);
  const [loading, setLoading] = useState(false);
  const draftRef = useRef<{ id: string; key: string } | null>(null);
  const promotedIdsRef = useRef(new Set<string>());
  const generationRef = useRef(0);

  useEffect(() => {
    inputRef.current = input;
  });

  const cleanupDraft = useCallback((draft: { id: string; key: string } | null) => {
    if (!draft || promotedIdsRef.current.has(draft.id)) return;
    void ipcBridge.conversation.remove.invoke({ id: draft.id }).catch((error) => {
      console.warn('[GuidDraft] Failed to cleanup draft conversation:', error);
    });
  }, []);

  useEffect(() => {
    return () => cleanupDraft(draftRef.current);
  }, [cleanupDraft]);

  useEffect(() => {
    let cancelled = false;
    const generation = ++generationRef.current;

    const prewarm = async () => {
      const currentInput = inputRef.current;
      if (!currentInput.selectedAgentInfo || isAionrsAgent(currentInput)) {
        cleanupDraft(draftRef.current);
        draftRef.current = null;
        setConversationId(null);
        setSlashCommands([]);
        setLoading(false);
        return;
      }

      if (draftRef.current && draftRef.current.key === contextKey) {
        return;
      }

      cleanupDraft(draftRef.current);
      draftRef.current = null;
      setConversationId(null);
      setSlashCommands([]);
      setLoading(true);

      try {
        const params = await buildAcpDraftParams(currentInput);
        if (!params || cancelled || generation !== generationRef.current) return;

        const conversation = await ipcBridge.conversation.create.invoke(params);
        if (!conversation?.id || cancelled || generation !== generationRef.current) return;

        draftRef.current = { id: conversation.id, key: contextKey };
        setConversationId(conversation.id);

        await ipcBridge.conversation.warmup.invoke({ conversation_id: conversation.id });
        if (cancelled || generation !== generationRef.current) return;

        let commands: AcpSlashCommandApiItem[] = await ipcBridge.conversation.getSlashCommands.invoke({
          conversation_id: conversation.id,
        });
        if (commands.length === 0) {
          await sleep(350);
          if (cancelled || generation !== generationRef.current) return;
          commands = await ipcBridge.conversation.getSlashCommands.invoke({ conversation_id: conversation.id });
        }

        if (!cancelled && generation === generationRef.current) {
          setSlashCommands(mapAcpCommandsToSlashCommands(commands));
        }
      } catch (error) {
        console.warn('[GuidDraft] Failed to prewarm ACP slash commands:', error);
        if (!cancelled && generation === generationRef.current) {
          setSlashCommands([]);
        }
      } finally {
        if (!cancelled && generation === generationRef.current) {
          setLoading(false);
        }
      }
    };

    void prewarm();
    return () => {
      cancelled = true;
    };
  }, [cleanupDraft, contextKey]);

  const promote = useCallback(async (name: string) => {
    const draft = draftRef.current;
    if (!draft) {
      return null;
    }

    promotedIdsRef.current.add(draft.id);
    draftRef.current = null;
    setConversationId(null);
    setSlashCommands([]);

    try {
      await ipcBridge.conversation.update.invoke({
        id: draft.id,
        merge_extra: true,
        updates: {
          name,
          extra: {
            guid_draft: false,
          },
        },
      });
      return draft.id;
    } catch (error) {
      promotedIdsRef.current.delete(draft.id);
      console.warn('[GuidDraft] Failed to promote draft conversation:', error);
      return null;
    }
  }, []);

  return {
    conversationId,
    slashCommands,
    loading,
    promote,
  };
};
