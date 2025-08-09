/**
 * useTransferData - Specialized hook for transfer data management
 * Provides optimized transfer data fetching with pagination and search
 */

import { useState, useCallback, useMemo } from 'react';
import { Transfer, TransferQueryParams, PaginatedResponse } from '../../types';
import { apiService } from '../../services';
import { useApiCache } from '../cache/useApiCache';
import { useRequestDeduplication } from '../cache/useRequestDeduplication';
import { useMemoizedCallback } from '../performance/useMemoizedCallback';
import { useToast } from '../../contexts/ToastContext';

interface UseTransferDataReturn {
  transfers: Transfer[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  fetchTransfers: (params: TransferQueryParams) => Promise<void>;
  searchTransfers: (query: string, params?: TransferQueryParams) => Promise<void>;
  getTransferById: (id: number) => Promise<Transfer | null>;
  clearCache: () => void;
}

interface TransferDataHookOptions {
  defaultPageSize?: number;
  cacheConfig?: {
    ttl?: number;
    enableLocalStorage?: boolean;
  };
}

export const useTransferData = (
  options: TransferDataHookOptions = {}
): UseTransferDataReturn => {
  const {
    defaultPageSize = 20,
    cacheConfig = { ttl: 5 * 60 * 1000, enableLocalStorage: false }
  } = options;

  // State management
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: defaultPageSize,
    total: 0,
    hasNext: false,
    hasPrev: false
  });

  // Performance optimizations
  const cache = useApiCache<PaginatedResponse<Transfer[]>>(cacheConfig);
  const deduplication = useRequestDeduplication<PaginatedResponse<Transfer[]>>();
  const singleTransferCache = useApiCache<Transfer>({
    ...cacheConfig,
    defaultTTL: 10 * 60 * 1000 // Longer cache for individual transfers
  });

  const { showToast } = useToast();

  // Create cache key for transfer list requests
  const createCacheKey = useCallback((params: TransferQueryParams) => {
    const keyParts = [
      'transfers',
      params.page || 1,
      params.limit || defaultPageSize,
      params.clubId,
      params.season,
      params.transferType,
      params.transferWindow,
      params.nationality,
      params.minAge,
      params.maxAge,
      params.minContract,
      params.maxContract,
      params.minROI,
      params.maxROI,
      params.onlySuccessful,
      params.isLoanToBuy
    ].filter(value => value !== undefined).join('_');
    
    return keyParts;
  }, [defaultPageSize]);

  // Fetch transfers with caching and deduplication
  const fetchTransfers = useMemoizedCallback(async (params: TransferQueryParams): Promise<void> => {
    const cacheKey = createCacheKey(params);
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      setTransfers(cachedData.data);
      setPagination({
        page: cachedData.pagination.page,
        limit: cachedData.pagination.limit,
        total: cachedData.pagination.total,
        hasNext: cachedData.pagination.hasNext,
        hasPrev: cachedData.pagination.hasPrev
      });
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await deduplication.executeRequest(
        cacheKey,
        async () => {
          const apiResponse = await apiService.getTransfers(params);
          if (apiResponse.success) {
            return apiResponse.data;
          } else {
            throw new Error(apiResponse.error || 'Failed to fetch transfers');
          }
        }
      );

      setTransfers(response.data);
      setPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        hasNext: response.pagination.hasNext,
        hasPrev: response.pagination.hasPrev
      });
      setError(null);

      // Cache the successful result
      cache.set(cacheKey, response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      showToast(errorMessage, { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [cache, deduplication, createCacheKey, showToast]);

  // Search transfers with optimized caching
  // Note: Search functionality would need to be implemented in the API
  const searchTransfers = useMemoizedCallback(async (
    query: string, 
    params: TransferQueryParams = {}
  ): Promise<void> => {
    // For now, we'll just fetch transfers with the given params
    // In a real implementation, the API would need to support search
    console.warn('Search functionality not implemented in API. Fetching with current filters.');
    await fetchTransfers(params);
  }, [fetchTransfers]);

  // Get individual transfer by ID with dedicated caching
  const getTransferById = useMemoizedCallback(async (id: number): Promise<Transfer | null> => {
    const cacheKey = `transfer_${id}`;
    
    // Check cache first
    const cachedTransfer = singleTransferCache.get(cacheKey);
    if (cachedTransfer) {
      return cachedTransfer;
    }

    try {
      const response = await apiService.getTransferById(id);
      
      if (response.success) {
        // Cache the result
        singleTransferCache.set(cacheKey, response.data);
        return response.data;
      } else {
        throw new Error(response.error || 'Transfer not found');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transfer';
      showToast(errorMessage, { type: 'error' });
      return null;
    }
  }, [singleTransferCache, showToast]);

  // Clear all caches
  const clearCache = useCallback(() => {
    cache.clear();
    singleTransferCache.clear();
  }, [cache, singleTransferCache]);

  return {
    transfers,
    loading,
    error,
    pagination,
    fetchTransfers,
    searchTransfers,
    getTransferById,
    clearCache
  };
};

/**
 * useAnalyticsData - Specialized hook for analytics data management
 * Provides optimized analytics data fetching with intelligent caching
 */
export const useAnalyticsData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const cache = useApiCache<any>({
    defaultTTL: 10 * 60 * 1000, // 10 minutes for analytics
    enableLocalStorage: false
  });
  
  const deduplication = useRequestDeduplication<any>();
  const { showToast } = useToast();

  // Generic analytics data fetcher
  const fetchAnalyticsData = useMemoizedCallback(async <T>(
    key: string,
    fetchFn: () => Promise<{ success: boolean; data: T; error?: string }>
  ): Promise<T | null> => {
    // Check cache first
    const cachedData = cache.get(key);
    if (cachedData) {
      return cachedData;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await deduplication.executeRequest(key, fetchFn);
      
      if (response.success) {
        cache.set(key, response.data);
        setError(null);
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch analytics data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      showToast(errorMessage, { type: 'error' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [cache, deduplication, showToast]);

  // Specific analytics methods
  const getStatistics = useCallback(() => 
    fetchAnalyticsData('statistics', () => apiService.getStatistics()),
    [fetchAnalyticsData]
  );

  const getTransferSuccessStats = useCallback((clubId?: number, season?: string) => {
    const key = `transfer_success_${clubId || 'all'}_${season || 'all'}`;
    return fetchAnalyticsData(key, () => apiService.getTransferSuccessStats(clubId, season));
  }, [fetchAnalyticsData]);

  const getLoanToBuyAnalytics = useCallback(() =>
    fetchAnalyticsData('loan_to_buy', () => apiService.getLoanToBuyAnalytics()),
    [fetchAnalyticsData]
  );

  const getMarketValueTrends = useCallback((clubId?: number, position?: string) => {
    const key = `market_trends_${clubId || 'all'}_${position || 'all'}`;
    return fetchAnalyticsData(key, () => apiService.getMarketValueTrends(clubId, position));
  }, [fetchAnalyticsData]);

  return {
    loading,
    error,
    getStatistics,
    getTransferSuccessStats,
    getLoanToBuyAnalytics,
    getMarketValueTrends,
    clearCache: cache.clear
  };
};