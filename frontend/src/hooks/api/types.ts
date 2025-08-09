/**
 * Phase 4: API & Network Hooks Types
 * 
 * Comprehensive type definitions for the enhanced API layer with:
 * - Intelligent caching and request management
 * - Offline-first capabilities
 * - Performance optimizations
 * - Error recovery strategies
 */

// ===== Core API Query Types =====

export interface ApiQueryOptions {
  /** Enable intelligent caching */
  cache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** Enable request deduplication */
  deduplicate?: boolean;
  /** Enable stale-while-revalidate pattern */
  staleWhileRevalidate?: boolean;
  /** Background refetch interval in milliseconds */
  refetchInterval?: number;
  /** Enable background refetch on window focus */
  refetchOnWindowFocus?: boolean;
  /** Enable retry on failure */
  retry?: boolean | number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Enable offline support */
  offline?: boolean;
  /** Custom cache key generator */
  cacheKey?: string | (() => string);
  /** Abort controller for manual cancellation */
  abortController?: AbortController;
}

export interface ApiQueryState<T> {
  /** Current data */
  data: T | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Is data stale and needs refresh */
  isStale: boolean;
  /** Is currently refetching in background */
  isRefetching: boolean;
  /** Last successful fetch timestamp */
  lastFetched: number | null;
  /** Query status */
  status: 'idle' | 'loading' | 'success' | 'error';
}

export interface ApiQueryResult<T> extends ApiQueryState<T> {
  /** Manual refetch function */
  refetch: () => Promise<void>;
  /** Reset query state */
  reset: () => void;
  /** Invalidate and refetch */
  invalidate: () => Promise<void>;
}

// ===== Mutation Types =====

export interface ApiMutationOptions<TData, TVariables> {
  /** Optimistic update function */
  onMutate?: (variables: TVariables) => TData | undefined;
  /** Success callback */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Error callback */
  onError?: (error: Error, variables: TVariables, rollback?: () => void) => void;
  /** Completion callback (success or error) */
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
  /** Enable retry on failure */
  retry?: boolean | number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Enable offline queuing */
  offline?: boolean;
}

export interface ApiMutationState<TData> {
  /** Current data */
  data: TData | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Mutation status */
  status: 'idle' | 'loading' | 'success' | 'error';
}

export interface ApiMutationResult<TData, TVariables> extends ApiMutationState<TData> {
  /** Execute mutation */
  mutate: (variables: TVariables) => void;
  /** Execute mutation asynchronously */
  mutateAsync: (variables: TVariables) => Promise<TData>;
  /** Reset mutation state */
  reset: () => void;
}

// ===== Request Queue Types =====

export interface QueuedRequest {
  /** Unique request ID */
  id: string;
  /** Request function */
  request: () => Promise<any>;
  /** Request priority (higher = processed first) */
  priority: number;
  /** Request metadata */
  metadata: {
    url: string;
    method: string;
    timestamp: number;
    retryCount: number;
  };
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    delay: number;
    backoff?: boolean;
  };
}

export interface RequestQueueOptions {
  /** Maximum concurrent requests */
  maxConcurrent?: number;
  /** Enable priority-based execution */
  priorityQueue?: boolean;
  /** Enable bandwidth-aware throttling */
  bandwidthAware?: boolean;
  /** Queue timeout in milliseconds */
  timeout?: number;
}

export interface RequestQueueState {
  /** Queued requests */
  queue: QueuedRequest[];
  /** Currently processing requests */
  processing: QueuedRequest[];
  /** Completed requests count */
  completed: number;
  /** Failed requests count */
  failed: number;
  /** Queue status */
  status: 'idle' | 'processing' | 'paused';
}

// ===== Offline Sync Types =====

export interface OfflineAction {
  /** Unique action ID */
  id: string;
  /** Action type */
  type: 'query' | 'mutation';
  /** Request function */
  request: () => Promise<any>;
  /** Action metadata */
  metadata: {
    url: string;
    method: string;
    payload?: any;
    timestamp: number;
  };
  /** Conflict resolution strategy */
  conflictResolution?: 'server-wins' | 'client-wins' | 'merge' | 'custom';
}

export interface OfflineSyncOptions {
  /** Enable offline queue */
  enableQueue?: boolean;
  /** Enable automatic sync on network restore */
  autoSync?: boolean;
  /** Sync interval when online */
  syncInterval?: number;
  /** Enable conflict detection */
  conflictDetection?: boolean;
}

export interface OfflineSyncState {
  /** Is currently offline */
  isOffline: boolean;
  /** Queued offline actions */
  queue: OfflineAction[];
  /** Currently syncing */
  isSyncing: boolean;
  /** Last sync timestamp */
  lastSync: number | null;
  /** Sync errors */
  syncErrors: Array<{ actionId: string; error: string; timestamp: number }>;
}

// ===== Cache Types =====

export interface CacheEntry<T> {
  /** Cached data */
  data: T;
  /** Cache timestamp */
  timestamp: number;
  /** TTL in milliseconds */
  ttl: number;
  /** Cache tags for group invalidation */
  tags?: string[];
  /** Access count for LRU */
  accessCount: number;
  /** Last access timestamp */
  lastAccess: number;
}

export interface CacheOptions {
  /** Maximum cache size (number of entries) */
  maxSize?: number;
  /** Default TTL in milliseconds */
  defaultTTL?: number;
  /** Enable LRU eviction */
  lru?: boolean;
  /** Enable cache warming */
  warming?: boolean;
  /** Enable selective invalidation */
  selectiveInvalidation?: boolean;
}

export interface CacheState {
  /** Cache entries count */
  size: number;
  /** Cache hit rate */
  hitRate: number;
  /** Memory usage estimate in bytes */
  memoryUsage: number;
  /** Cache status */
  status: 'healthy' | 'full' | 'error';
}

// ===== Error Recovery Types =====

export interface ErrorClassification {
  /** Error type */
  type: 'network' | 'timeout' | 'server' | 'client' | 'unknown';
  /** Is error retryable */
  retryable: boolean;
  /** Suggested retry delay */
  retryDelay: number;
  /** Error severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorRecoveryOptions {
  /** Enable automatic retry */
  autoRetry?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry strategy */
  retryStrategy?: 'fixed' | 'exponential' | 'linear';
  /** Enable fallback data */
  enableFallback?: boolean;
  /** Fallback data provider */
  fallbackProvider?: () => any;
  /** Custom error classifier */
  errorClassifier?: (error: Error) => ErrorClassification;
}

export interface ErrorRecoveryState {
  /** Current error */
  error: Error | null;
  /** Error classification */
  classification: ErrorClassification | null;
  /** Retry count */
  retryCount: number;
  /** Is currently retrying */
  isRetrying: boolean;
  /** Has fallback data */
  hasFallback: boolean;
  /** Recovery status */
  status: 'idle' | 'analyzing' | 'retrying' | 'recovered' | 'failed';
}

// ===== Network Status Types =====

export interface NetworkCondition {
  /** Is online */
  isOnline: boolean;
  /** Connection type */
  connectionType: 'slow-2g' | '2g' | '3g' | '4g' | '5g' | 'wifi' | 'ethernet' | 'unknown';
  /** Effective connection type */
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  /** Download speed in Mbps */
  downlink: number;
  /** Round-trip time in milliseconds */
  rtt: number;
  /** Save data preference */
  saveData: boolean;
}

export interface NetworkStatusOptions {
  /** Enable adaptive loading */
  adaptiveLoading?: boolean;
  /** Enable bandwidth monitoring */
  bandwidthMonitoring?: boolean;
  /** Connection quality threshold */
  qualityThreshold?: 'low' | 'medium' | 'high';
}

export interface NetworkStatusState extends NetworkCondition {
  /** Connection quality assessment */
  quality: 'poor' | 'good' | 'excellent';
  /** Last status update */
  lastUpdate: number;
  /** Status monitoring enabled */
  monitoring: boolean;
}

// ===== Request Deduplication Types =====

export interface DeduplicationOptions {
  /** Deduplication strategy */
  strategy?: 'key-based' | 'content-based' | 'url-based';
  /** Custom key generator */
  keyGenerator?: (...args: any[]) => string;
  /** Deduplication window in milliseconds */
  window?: number;
  /** Enable response sharing */
  shareResponse?: boolean;
}

export interface DeduplicationState {
  /** Active requests map */
  activeRequests: Map<string, Promise<any>>;
  /** Deduplication stats */
  stats: {
    totalRequests: number;
    deduplicatedRequests: number;
    savedRequests: number;
  };
}

// ===== Common Utility Types =====

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestConfig {
  /** Request URL */
  url: string;
  /** HTTP method */
  method: RequestMethod;
  /** Request parameters */
  params?: Record<string, any>;
  /** Request data/body */
  data?: any;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request timeout */
  timeout?: number;
  /** Abort signal */
  signal?: AbortSignal;
}

export interface ApiHookConfig extends ApiQueryOptions {
  /** Hook debug name */
  debugName?: string;
  /** Enable development warnings */
  devWarnings?: boolean;
  /** Performance monitoring */
  performanceMonitoring?: boolean;
}