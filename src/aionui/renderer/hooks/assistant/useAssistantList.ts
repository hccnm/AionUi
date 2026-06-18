import { resolveLocaleKey } from '@/common/utils';
import type { Assistant } from '@/common/types/agent/assistantTypes';
import { ASSISTANTS_SWR_KEY, fetchAssistantsCatalog } from '@/renderer/hooks/assistant/assistantsCatalog';
import { sortAssistants as sortAssistantsUtil } from '@/renderer/pages/settings/AssistantSettings/assistantUtils';
import { STATIC_RESOURCE_SWR_OPTIONS } from '@/renderer/utils/swr/staticResource';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

/**
 * Pure predicate: an assistant is extension-sourced.
 */
export const isExtensionAssistant = (assistant: Assistant | null | undefined): boolean =>
  assistant?.source === 'extension';

/**
 * Manages the assistant list: loading from backend, sorting, and tracking the
 * active selection. The backend merges builtin + user + extension into a single
 * ordered list, so no client-side merge logic is needed.
 */
export const useAssistantList = () => {
  const { i18n } = useTranslation();
  const [activeAssistantId, setActiveAssistantId] = useState<string | null>(null);
  const localeKey = resolveLocaleKey(i18n.language);

  const { data: assistantsData, mutate } = useSWR(ASSISTANTS_SWR_KEY, fetchAssistantsCatalog, STATIC_RESOURCE_SWR_OPTIONS);

  const assistants = useMemo(() => sortAssistantsUtil(assistantsData ?? []), [assistantsData]);

  const loadAssistants = useCallback(async () => {
    try {
      await mutate();
    } catch (error) {
      console.error('Failed to load assistants:', error);
    }
  }, [mutate]);

  useEffect(() => {
    setActiveAssistantId((prev) => {
      if (prev && assistants.some((a) => a.id === prev)) return prev;
      return assistants[0]?.id ?? null;
    });
  }, [assistants]);

  const setAssistants = useCallback(
    (value: Assistant[] | ((prev: Assistant[]) => Assistant[])) => {
      void mutate((prev) => {
        const current = prev ?? [];
        return typeof value === 'function'
          ? sortAssistantsUtil((value as (prev: Assistant[]) => Assistant[])(current))
          : sortAssistantsUtil(value);
      }, false);
    },
    [mutate]
  );

  const activeAssistant = assistants.find((a) => a.id === activeAssistantId) ?? null;

  return {
    assistants,
    setAssistants,
    activeAssistantId,
    setActiveAssistantId,
    activeAssistant,
    isExtensionAssistant,
    loadAssistants,
    localeKey,
  };
};
