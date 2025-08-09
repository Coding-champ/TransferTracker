/**
 * Type definitions for state management hooks
 * Phase 3: State Management Hooks Migration & Optimization
 */

// Global State Management Types
export interface StateSelector<T, R> {
  (state: T): R;
}

export interface StateSubscription<T> {
  id: string;
  selector: StateSelector<T, any>;
  callback: (value: any, previousValue: any) => void;
}

export interface GlobalStateConfig<T> {
  initialState: T;
  persistence?: {
    enabled: boolean;
    key: string;
    storage?: 'localStorage' | 'sessionStorage';
  };
  devTools?: boolean;
  middleware?: StateMiddleware<T>[];
}

export interface StateMiddleware<T> {
  (state: T, action: StateAction, next: (action: StateAction) => void): void;
}

export interface StateAction {
  type: string;
  payload?: any;
  meta?: {
    timestamp: number;
    source?: string;
  };
}

// State History Types
export interface StateHistoryEntry<T> {
  state: T;
  timestamp: number;
  action?: StateAction;
}

export interface StateHistoryConfig {
  maxEntries?: number;
  enableTimeTravel?: boolean;
  trackActions?: boolean;
}

// Optimistic Updates Types
export interface OptimisticUpdateConfig<T> {
  id: string;
  update: (current: T) => T;
  rollback?: (current: T, original: T) => T;
  timeout?: number;
  retryConfig?: {
    attempts: number;
    delay: number;
  };
}

export interface OptimisticUpdateResult<T> {
  commit: () => Promise<void>;
  rollback: () => void;
  retry: () => Promise<void>;
}

// Real-time Sync Types
export interface RealtimeSyncConfig {
  endpoint?: string;
  protocol?: 'websocket' | 'sse' | 'polling';
  reconnect?: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
  };
  heartbeat?: {
    enabled: boolean;
    interval: number;
  };
}

export interface RealtimeSyncMessage<T> {
  type: string;
  data: T;
  timestamp: number;
  id?: string;
}

// Cache Manager Types
export interface CacheConfig {
  maxSize?: number;
  ttl?: number;
  evictionPolicy?: 'lru' | 'lfu' | 'fifo';
  persistence?: boolean;
  tags?: string[];
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  tags: string[];
}

// Form State Types
export interface FormFieldConfig {
  name: string;
  validation?: ValidationRule[];
  debounce?: number;
  required?: boolean;
  dependencies?: string[];
}

export interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'custom';
  message: string;
  validator?: (value: any, allFields?: Record<string, any>) => boolean | Promise<boolean>;
}

export interface FormError {
  field: string;
  message: string;
  type: string;
}

export interface FormState<T> {
  values: T;
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  dirty: Record<keyof T, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  submitCount: number;
}

// Storage Types
export interface StorageConfig<T> {
  serializer?: {
    parse: (value: string) => T;
    stringify: (value: T) => string;
  };
  syncAcrossTabs?: boolean;
  compression?: boolean;
  encryption?: boolean;
  onError?: (error: Error) => void;
}

// Data Mutation Types
export interface MutationConfig<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  optimisticUpdate?: (variables: TVariables) => any;
  invalidateQueries?: string[];
}

export interface MutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data?: TData;
  error?: Error;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}