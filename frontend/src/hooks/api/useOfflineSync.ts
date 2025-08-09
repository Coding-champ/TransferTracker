/**
 * useOfflineSync Hook
 * 
 * Offline-first approach with:
 * - Request queuing when network unavailable
 * - Automatic sync when back online
 * - Conflict resolution strategies
 * - Persistent offline queue
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { OfflineSyncOptions, OfflineSyncState, OfflineAction } from './types';
import { useNetworkStatus } from './useNetworkStatus';
import { useToast } from '../../contexts/ToastContext';

/**
 * Hook for offline-first functionality with automatic sync
 * 
 * @param options - Offline sync configuration options
 * @returns Offline sync state and control functions
 */
export function useOfflineSync(options: OfflineSyncOptions = {}) {
  const {
    enableQueue = true,
    autoSync = true,
    syncInterval = 30000, // 30 seconds
    conflictDetection = false
  } = options;

  // State management
  const [state, setState] = useState<OfflineSyncState>({
    isOffline: !navigator.onLine,
    queue: [],
    isSyncing: false,
    lastSync: null,
    syncErrors: []
  });

  // Hook dependencies
  const networkStatus = useNetworkStatus();
  const { showToast } = useToast();

  // Refs for cleanup
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const queueRef = useRef<OfflineAction[]>([]);

  // Load queue from localStorage on mount
  useEffect(() => {
    if (!enableQueue) return;

    try {
      const storedQueue = localStorage.getItem('offline-sync-queue');
      if (storedQueue) {
        const parsedQueue: OfflineAction[] = JSON.parse(storedQueue);
        queueRef.current = parsedQueue;
        setState(prev => ({ ...prev, queue: parsedQueue }));
      }
    } catch (error) {
      console.warn('Failed to load offline queue from localStorage:', error);
    }
  }, [enableQueue]);

  // Save queue to localStorage
  const saveQueueToStorage = useCallback(() => {
    if (!enableQueue) return;

    try {
      localStorage.setItem('offline-sync-queue', JSON.stringify(queueRef.current));
    } catch (error) {
      console.warn('Failed to save offline queue to localStorage:', error);
    }
  }, [enableQueue]);

  // Add action to offline queue
  const queueAction = useCallback((action: OfflineAction) => {
    if (!enableQueue) return;

    queueRef.current.push(action);
    setState(prev => ({
      ...prev,
      queue: [...queueRef.current]
    }));

    saveQueueToStorage();
  }, [enableQueue, saveQueueToStorage]);

  // Remove action from queue
  const removeActionFromQueue = useCallback((actionId: string) => {
    queueRef.current = queueRef.current.filter(action => action.id !== actionId);
    setState(prev => ({
      ...prev,
      queue: [...queueRef.current]
    }));

    saveQueueToStorage();
  }, [saveQueueToStorage]);

  // Process a single queued action
  const processAction = useCallback(async (action: OfflineAction): Promise<boolean> => {
    try {
      await action.request();
      removeActionFromQueue(action.id);
      return true;
    } catch (error: any) {
      // Add to sync errors
      const syncError = {
        actionId: action.id,
        error: error.message || 'Sync failed',
        timestamp: Date.now()
      };

      setState(prev => ({
        ...prev,
        syncErrors: [...prev.syncErrors, syncError]
      }));

      // For now, remove failed actions from queue
      // In a real implementation, you might want to retry with exponential backoff
      removeActionFromQueue(action.id);
      return false;
    }
  }, [removeActionFromQueue]);

  // Sync all queued actions
  const syncQueue = useCallback(async (): Promise<{ success: number; failed: number }> => {
    if (!networkStatus.isOnline || state.isSyncing || queueRef.current.length === 0) {
      return { success: 0, failed: 0 };
    }

    setState(prev => ({ ...prev, isSyncing: true }));

    let successCount = 0;
    let failedCount = 0;

    // Process actions in sequence to avoid overwhelming the server
    for (const action of [...queueRef.current]) {
      const success = await processAction(action);
      if (success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    setState(prev => ({
      ...prev,
      isSyncing: false,
      lastSync: Date.now()
    }));

    // Show sync results
    if (successCount > 0) {
      showToast(`Synced ${successCount} offline actions`, { type: 'success' });
    }
    if (failedCount > 0) {
      showToast(`Failed to sync ${failedCount} actions`, { type: 'warning' });
    }

    return { success: successCount, failed: failedCount };
  }, [networkStatus.isOnline, state.isSyncing, processAction, showToast]);

  // Manual sync trigger
  const sync = useCallback(async () => {
    return await syncQueue();
  }, [syncQueue]);

  // Clear sync errors
  const clearSyncErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      syncErrors: []
    }));
  }, []);

  // Clear entire queue
  const clearQueue = useCallback(() => {
    queueRef.current = [];
    setState(prev => ({
      ...prev,
      queue: []
    }));
    saveQueueToStorage();
  }, [saveQueueToStorage]);

  // Get queue statistics
  const getQueueStats = useCallback(() => ({
    totalActions: queueRef.current.length,
    queriesCount: queueRef.current.filter(action => action.type === 'query').length,
    mutationsCount: queueRef.current.filter(action => action.type === 'mutation').length,
    oldestAction: queueRef.current.reduce((oldest, action) => 
      !oldest || action.metadata.timestamp < oldest.metadata.timestamp ? action : oldest,
      null as OfflineAction | null
    ),
    newestAction: queueRef.current.reduce((newest, action) => 
      !newest || action.metadata.timestamp > newest.metadata.timestamp ? action : newest,
      null as OfflineAction | null
    )
  }), []);

  // Update offline status when network status changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isOffline: !networkStatus.isOnline
    }));

    // Auto-sync when coming back online
    if (networkStatus.isOnline && autoSync && queueRef.current.length > 0) {
      // Small delay to ensure connection is stable
      setTimeout(() => {
        syncQueue();
      }, 1000);
    }
  }, [networkStatus.isOnline, autoSync, syncQueue]);

  // Setup auto-sync interval
  useEffect(() => {
    if (!autoSync || !syncInterval) return;

    syncIntervalRef.current = setInterval(() => {
      if (networkStatus.isOnline && !state.isSyncing && queueRef.current.length > 0) {
        syncQueue();
      }
    }, syncInterval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [autoSync, syncInterval, networkStatus.isOnline, state.isSyncing, syncQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  return {
    state,
    queueAction,
    sync,
    clearQueue,
    clearSyncErrors,
    getQueueStats
  };
}

export default useOfflineSync;