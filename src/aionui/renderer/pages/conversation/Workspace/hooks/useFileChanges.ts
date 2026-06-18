/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { CompareResult, FileChangeInfo, SnapshotInfo } from '@/common/types/platform/fileSnapshot';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkspaceTab } from '../types';

type UseFileChangesParams = {
  workspace: string;
  enabled?: boolean;
};

type FileSnapshotEnableGuard = {
  workspace: string;
  activeTab: WorkspaceTab;
  isTemporaryWorkspace: boolean;
};

type UseFileChangesReturn = {
  staged: FileChangeInfo[];
  unstaged: FileChangeInfo[];
  changeCount: number;
  loading: boolean;
  snapshotInfo: SnapshotInfo | null;
  refreshChanges: () => Promise<void>;
  stageFile: (file_path: string) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageFile: (file_path: string) => Promise<void>;
  unstageAll: () => Promise<void>;
  discardFile: (file_path: string, operation: FileChangeInfo['operation']) => Promise<void>;
  resetFile: (file_path: string, operation: FileChangeInfo['operation']) => Promise<void>;
};

export function shouldEnableFileSnapshot({
  workspace,
  activeTab,
  isTemporaryWorkspace,
}: FileSnapshotEnableGuard): boolean {
  return Boolean(workspace) && activeTab === 'changes' && !isTemporaryWorkspace;
}

export function useFileChanges({ workspace, enabled = false }: UseFileChangesParams): UseFileChangesReturn {
  const [result, setResult] = useState<CompareResult>({ staged: [], unstaged: [] });
  const [loading, setLoading] = useState(false);
  const [snapshotInfo, setSnapshotInfo] = useState<SnapshotInfo | null>(null);
  const initializedRef = useRef(false);
  const initPromiseRef = useRef<Promise<boolean> | null>(null);
  const lifecycleIdRef = useRef(0);

  useEffect(() => {
    lifecycleIdRef.current += 1;
    initializedRef.current = false;
    initPromiseRef.current = null;
    setResult({ staged: [], unstaged: [] });
    setLoading(false);
    setSnapshotInfo(null);

    return () => {
      lifecycleIdRef.current += 1;
      initPromiseRef.current = null;
      if (!workspace || !initializedRef.current) return;

      initializedRef.current = false;
      ipcBridge.fileSnapshot.dispose.invoke({ workspace }).catch(() => {});
    };
  }, [enabled, workspace]);

  const ensureInitialized = useCallback(async (): Promise<boolean> => {
    if (!workspace || !enabled) return false;
    if (initializedRef.current) return true;
    if (initPromiseRef.current) return initPromiseRef.current;

    const lifecycleId = lifecycleIdRef.current;
    initPromiseRef.current = ipcBridge.fileSnapshot.init
      .invoke({ workspace })
      .then((info) => {
        if (lifecycleId !== lifecycleIdRef.current) return false;
        setSnapshotInfo(info);
        initializedRef.current = true;
        return true;
      })
      .catch((err) => {
        if (lifecycleId === lifecycleIdRef.current) {
          console.error('[useFileChanges] Failed to init snapshot:', err);
        }
        return false;
      })
      .finally(() => {
        if (lifecycleId === lifecycleIdRef.current) {
          initPromiseRef.current = null;
        }
      });

    return initPromiseRef.current;
  }, [enabled, workspace]);

  // Silent refresh: update data without showing loading spinner (used after git operations)
  const silentRefresh = useCallback(async () => {
    if (!(await ensureInitialized())) return;
    try {
      const res = await ipcBridge.fileSnapshot.compare.invoke({ workspace });
      setResult(res);
    } catch (err) {
      console.error('[useFileChanges] Failed to compare:', err);
    }
  }, [ensureInitialized, workspace]);

  // Full refresh with loading indicator (used for manual refresh button)
  const refreshChanges = useCallback(async () => {
    if (!workspace || !enabled) return;
    setLoading(true);
    try {
      if (!(await ensureInitialized())) return;
      const res = await ipcBridge.fileSnapshot.compare.invoke({ workspace });
      setResult(res);
    } catch (err) {
      console.error('[useFileChanges] Failed to compare:', err);
    } finally {
      setLoading(false);
    }
  }, [enabled, ensureInitialized, workspace]);

  const stageFile = useCallback(
    async (file_path: string) => {
      if (!workspace) return;
      await ipcBridge.fileSnapshot.stageFile.invoke({ workspace, file_path });
      await silentRefresh();
    },
    [workspace, silentRefresh]
  );

  const stageAll = useCallback(async () => {
    if (!workspace) return;
    await ipcBridge.fileSnapshot.stageAll.invoke({ workspace });
    await silentRefresh();
  }, [workspace, silentRefresh]);

  const unstageFile = useCallback(
    async (file_path: string) => {
      if (!workspace) return;
      await ipcBridge.fileSnapshot.unstageFile.invoke({ workspace, file_path });
      await silentRefresh();
    },
    [workspace, silentRefresh]
  );

  const unstageAll = useCallback(async () => {
    if (!workspace) return;
    await ipcBridge.fileSnapshot.unstageAll.invoke({ workspace });
    await silentRefresh();
  }, [workspace, silentRefresh]);

  const discardFile = useCallback(
    async (file_path: string, operation: FileChangeInfo['operation']) => {
      if (!workspace) return;
      await ipcBridge.fileSnapshot.discardFile.invoke({ workspace, file_path, operation });
      await silentRefresh();
    },
    [workspace, silentRefresh]
  );

  const resetFile = useCallback(
    async (file_path: string, operation: FileChangeInfo['operation']) => {
      if (!workspace) return;
      await ipcBridge.fileSnapshot.resetFile.invoke({ workspace, file_path, operation });
      await silentRefresh();
    },
    [workspace, silentRefresh]
  );

  return {
    staged: result.staged,
    unstaged: result.unstaged,
    changeCount: result.staged.length + result.unstaged.length,
    loading,
    snapshotInfo,
    refreshChanges,
    stageFile,
    stageAll,
    unstageFile,
    unstageAll,
    discardFile,
    resetFile,
  };
}
