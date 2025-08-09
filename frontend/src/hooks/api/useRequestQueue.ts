/**
 * useRequestQueue Hook
 * 
 * Intelligent request batching and management with:
 * - Priority-based execution
 * - Automatic retry with exponential backoff  
 * - Bandwidth-aware throttling
 * - Request deduplication and batching
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { RequestQueueOptions, RequestQueueState, QueuedRequest } from './types';
import { useNetworkStatus } from './useNetworkStatus';

/**
 * Hook for intelligent request queuing and batching
 * 
 * @param options - Request queue configuration options
 * @returns Request queue state and control functions
 */
export function useRequestQueue(options: RequestQueueOptions = {}) {
  const {
    maxConcurrent = 3,
    priorityQueue = true,
    bandwidthAware = true,
    timeout = 30000 // 30 seconds
  } = options;

  // State management
  const [state, setState] = useState<RequestQueueState>({
    queue: [],
    processing: [],
    completed: 0,
    failed: 0,
    status: 'idle'
  });

  // Hook dependencies
  const networkStatus = useNetworkStatus();

  // Refs for internal state
  const queueRef = useRef<QueuedRequest[]>([]);
  const processingRef = useRef<QueuedRequest[]>([]);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update state from refs
  const updateState = useCallback(() => {
    setState(prev => ({
      ...prev,
      queue: [...queueRef.current],
      processing: [...processingRef.current],
      status: processingRef.current.length > 0 ? 'processing' : 
              queueRef.current.length > 0 ? 'processing' : 'idle'
    }));
  }, []);

  // Sort queue by priority
  const sortQueueByPriority = useCallback(() => {
    if (!priorityQueue) return;

    queueRef.current.sort((a, b) => {
      // Higher priority first, then by timestamp (FIFO for same priority)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.metadata.timestamp - b.metadata.timestamp;
    });
  }, [priorityQueue]);

  // Calculate concurrent limit based on network conditions
  const getConcurrentLimit = useCallback(() => {
    if (!bandwidthAware) return maxConcurrent;

    const quality = networkStatus.quality;
    switch (quality) {
      case 'poor':
        return Math.max(1, Math.floor(maxConcurrent / 3));
      case 'good':
        return Math.max(1, Math.floor(maxConcurrent / 2));
      case 'excellent':
      default:
        return maxConcurrent;
    }
  }, [bandwidthAware, maxConcurrent, networkStatus.quality]);

  // Process a single request
  const processRequest = useCallback(async (request: QueuedRequest): Promise<boolean> => {
    try {
      const result = await Promise.race([
        request.request(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
      ]);

      // Remove from processing
      processingRef.current = processingRef.current.filter(req => req.id !== request.id);
      
      // Update completed count
      setState(prev => ({ ...prev, completed: prev.completed + 1 }));
      
      return true;
    } catch (error: any) {
      // Handle retry logic
      if (request.retry && request.metadata.retryCount < request.retry.maxAttempts) {
        // Calculate retry delay
        const baseDelay = request.retry.delay;
        const retryDelay = request.retry.backoff ? 
          baseDelay * Math.pow(2, request.metadata.retryCount) : 
          baseDelay;

        // Update retry count and re-queue
        const retryRequest: QueuedRequest = {
          ...request,
          metadata: {
            ...request.metadata,
            retryCount: request.metadata.retryCount + 1
          }
        };

        setTimeout(() => {
          queueRef.current.push(retryRequest);
          sortQueueByPriority();
          updateState();
          processQueue();
        }, retryDelay);

      } else {
        // Max retries reached or no retry config
        setState(prev => ({ ...prev, failed: prev.failed + 1 }));
      }

      // Remove from processing
      processingRef.current = processingRef.current.filter(req => req.id !== request.id);
      
      return false;
    }
  }, [timeout, sortQueueByPriority, updateState]);

  // Process the queue
  const processQueue = useCallback(async () => {
    if (!networkStatus.isOnline) return;

    const concurrentLimit = getConcurrentLimit();
    
    // Process requests up to concurrent limit
    while (
      queueRef.current.length > 0 && 
      processingRef.current.length < concurrentLimit
    ) {
      const request = queueRef.current.shift()!;
      processingRef.current.push(request);
      
      // Process request asynchronously
      processRequest(request).finally(() => {
        updateState();
        // Continue processing if queue is not empty
        if (queueRef.current.length > 0) {
          processQueue();
        }
      });
    }

    updateState();
  }, [networkStatus.isOnline, getConcurrentLimit, processRequest, updateState]);

  // Add request to queue
  const addRequest = useCallback((
    requestFn: () => Promise<any>,
    options: {
      priority?: number;
      url?: string;
      method?: string;
      retry?: {
        maxAttempts: number;
        delay: number;
        backoff?: boolean;
      };
    } = {}
  ): string => {
    const {
      priority = 1,
      url = 'unknown',
      method = 'GET',
      retry
    } = options;

    const request: QueuedRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      request: requestFn,
      priority,
      metadata: {
        url,
        method,
        timestamp: Date.now(),
        retryCount: 0
      },
      retry
    };

    queueRef.current.push(request);
    sortQueueByPriority();
    updateState();

    // Start processing if not already processing
    if (processingRef.current.length === 0) {
      processQueue();
    }

    return request.id;
  }, [sortQueueByPriority, updateState, processQueue]);

  // Remove request from queue
  const removeRequest = useCallback((requestId: string): boolean => {
    const queueIndex = queueRef.current.findIndex(req => req.id === requestId);
    const processingIndex = processingRef.current.findIndex(req => req.id === requestId);

    let removed = false;

    if (queueIndex > -1) {
      queueRef.current.splice(queueIndex, 1);
      removed = true;
    }

    if (processingIndex > -1) {
      processingRef.current.splice(processingIndex, 1);
      removed = true;
    }

    if (removed) {
      updateState();
    }

    return removed;
  }, [updateState]);

  // Pause queue processing
  const pauseQueue = useCallback(() => {
    setState(prev => ({ ...prev, status: 'paused' }));
  }, []);

  // Resume queue processing
  const resumeQueue = useCallback(() => {
    setState(prev => ({ ...prev, status: 'idle' }));
    processQueue();
  }, [processQueue]);

  // Clear entire queue
  const clearQueue = useCallback(() => {
    queueRef.current = [];
    processingRef.current = [];
    setState({
      queue: [],
      processing: [],
      completed: 0,
      failed: 0,
      status: 'idle'
    });
  }, []);

  // Get queue statistics
  const getQueueStats = useCallback(() => ({
    queueLength: queueRef.current.length,
    processingCount: processingRef.current.length,
    totalRequests: state.completed + state.failed + queueRef.current.length + processingRef.current.length,
    averagePriority: queueRef.current.length > 0 ? 
      queueRef.current.reduce((sum, req) => sum + req.priority, 0) / queueRef.current.length : 0,
    oldestRequest: queueRef.current.reduce((oldest, req) => 
      !oldest || req.metadata.timestamp < oldest.metadata.timestamp ? req : oldest,
      null as QueuedRequest | null
    )
  }), [state.completed, state.failed]);

  // Start processing when network comes back online
  useEffect(() => {
    if (networkStatus.isOnline && state.status !== 'paused' && queueRef.current.length > 0) {
      processQueue();
    }
  }, [networkStatus.isOnline, state.status, processQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    addRequest,
    removeRequest,
    pauseQueue,
    resumeQueue,
    clearQueue,
    getQueueStats
  };
}

export default useRequestQueue;