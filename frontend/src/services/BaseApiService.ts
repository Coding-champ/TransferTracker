// Abstract Base API Service Class
// This class provides common API patterns including caching, error handling, and performance monitoring.

import { AxiosResponse } from 'axios';
import { ApiResponse } from '../types';
import { createPerformanceTimer, debugLog } from '../utils';
import {
  ApiError,
  NetworkError,
  TimeoutError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ServerError,
  ApiTimeoutError,
  ApiNotFoundError
} from './ApiErrors';
import { captureException, getTelemetryContext } from '../utils/telemetry';

export abstract class BaseApiService {
  protected cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  protected pendingRequests = new Map<string, Promise<ApiResponse<any>>>();

  protected async execute<T>(
    operation: () => Promise<AxiosResponse<ApiResponse<T>>>,
    context: string,
    options: {
      useCache?: boolean;
      cacheTTL?: number;
      cacheKey?: string;
      telemetryMeta?: Record<string, any>;
    } = {}
  ): Promise<ApiResponse<T>> {
    const { useCache = false, cacheTTL = 5 * 60 * 1000, cacheKey } = options;
    const timer = createPerformanceTimer(context);
    
    try {
      if (useCache && cacheKey) {
        const cached = this.getFromCache<T>(cacheKey);
        if (cached) {
          debugLog(`Cache hit for ${cacheKey}`);
          return cached;
        }

        // Check for pending request with the same cache key to prevent duplicate requests
        const pendingRequest = this.pendingRequests.get(cacheKey);
        if (pendingRequest) {
          debugLog(`Returning pending request for ${cacheKey}`);
          return pendingRequest as Promise<ApiResponse<T>>;
        }
      }

      // Create the request promise
      const requestPromise = this.executeRequest(operation, context, { useCache, cacheTTL, cacheKey });
      
      // Store pending request if using cache
      if (useCache && cacheKey) {
        this.pendingRequests.set(cacheKey, requestPromise);
      }

      const result = await requestPromise;

      // Clean up pending request
      if (useCache && cacheKey) {
        this.pendingRequests.delete(cacheKey);
      }

      return result;
    } catch (error: any) {
      // Clean up pending request on error
      if (useCache && cacheKey) {
        this.pendingRequests.delete(cacheKey);
      }

      const mapped = this.handleApiError(error, context);

      // Capture telemetry for server/network/timeout issues
      if (
        mapped instanceof ServerError ||
        mapped instanceof NetworkError ||
        mapped instanceof TimeoutError ||
        mapped instanceof ApiTimeoutError
      ) {
        try {
          const cfg = error?.config || {};
          const baseCtx = getTelemetryContext();
          captureException(error, {
            context,
            url: cfg?.url,
            method: cfg?.method,
            params: cfg?.params,
            httpStatus: error?.response?.status,
            ...baseCtx,
            ...(options.telemetryMeta || {}),
          });
        } catch {
          // ignore
        }
      }

      throw mapped;
    } finally {
      timer();
    }
  }

  private async executeRequest<T>(
    operation: () => Promise<AxiosResponse<ApiResponse<T>>>,
    context: string,
    options: {
      useCache?: boolean;
      cacheTTL?: number;
      cacheKey?: string;
    }
  ): Promise<ApiResponse<T>> {
    const { useCache = false, cacheTTL = 5 * 60 * 1000, cacheKey } = options;
    
    const response = await operation();
    const result = response.data;

    if (useCache && cacheKey && result.success) {
      this.setCache(cacheKey, result, cacheTTL);
    }

    return result;
  }

  protected getFromCache<T>(key: string): ApiResponse<T> | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if ((now - cached.timestamp) > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  protected setCache<T>(key: string, data: ApiResponse<T>, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  protected handleApiError(error: any, context: string): ApiError {
    console.error(`API Error in ${context}:`, error);

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 404:
          return new ApiNotFoundError(`${context}: Resource not found`, error.config?.url);
        case 400:
          return new BadRequestError(`${context}: Bad request`, data?.error);
        case 401:
          return new UnauthorizedError(`${context}: Unauthorized`);
        case 403:
          return new ForbiddenError(`${context}: Forbidden`);
        case 500:
        case 502:
        case 503:
          return new ServerError(`${context}: Server error`, data?.error);
        default:
          return new ApiError(`${context}: HTTP ${status}`, error.response.statusText);
      }
    } else if (error.request) {
      if (error.code === 'ECONNABORTED') {
        return new ApiTimeoutError(`${context}: Request timeout`);
      }
      return new NetworkError(`${context}: Network error`);
    } else {
      return new ApiError(`${context}: ${error.message}`);
    }
  }

  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
      this.pendingRequests.delete(key);
      debugLog(`Cleared cache for ${key}`);
    } else {
      this.cache.clear();
      this.pendingRequests.clear();
      debugLog('Cleared entire cache');
    }
  }
}