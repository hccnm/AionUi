import { ipcBridge } from '@/common';
import type { Assistant } from '@/common/types/agent/assistantTypes';

export const ASSISTANTS_SWR_KEY = 'assistants.list';

let assistantsPromise: Promise<Assistant[]> | null = null;

export async function fetchAssistantsCatalog(): Promise<Assistant[]> {
  if (assistantsPromise) {
    return assistantsPromise;
  }

  assistantsPromise = ipcBridge.assistants.list
    .invoke()
    .catch((error) => {
      console.error('Failed to load assistants:', error);
      return [] as Assistant[];
    })
    .finally(() => {
      assistantsPromise = null;
    });

  return assistantsPromise;
}
