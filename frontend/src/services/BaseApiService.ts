// Abstract Base API Service Class
// This class provides common API patterns including caching, error handling, and performance monitoring.

import { AxiosResponse } from 'axios';
import { ApiResponse } from '../types';
import { createPerformanceTimer, debugLog } from '../utils';
import {
  ApiError,
  NetworkError,
  TimeoutError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ServerError
} from './ApiErrors';

export abstract class BaseApiService {
  protected cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  protected async execute<T>(
    operation: () => Promise<AxiosResponse<ApiResponse<T>>>,
    context: string,
    options: {
      useCache?: boolean;
      cacheTTL?: number;
      cacheKey?: string;
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
      }

      const response = await operation();
      const result = response.data;

      if (useCache && cacheKey && result.success) {
        this.setCache(cacheKey, result, cacheTTL);
      }

      return result;
    } catch (error) {
      throw this.handleApiError(error, context);
    } finally {
      timer();
    }
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
          return new NotFoundError(`${context}: Resource not found`, error.config?.url);
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
        return new TimeoutError(`${context}: Request timeout`);
      }
      return new NetworkError(`${context}: Network error`);
    } else {
      return new ApiError(`${context}: ${error.message}`);
    }
  }

  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
      debugLog(`Cleared cache for ${key}`);
    } else {
      this.cache.clear();
      debugLog('Cleared entire cache');
    }
  }
}