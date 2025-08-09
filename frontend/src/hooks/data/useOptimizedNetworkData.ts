/**
 * useOptimizedNetworkData - Enhanced network data hook with performance optimizations
 * Replaces the original useNetworkData with better memoization and caching
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { NetworkData, FilterState } from '../../types';
import { MOCK_NETWORK_DATA } from '../../data/mockNetworkData';
import { handleError, isApiTimeoutError, isNetworkError, ApiError, isAbortError } from '../../utils/errors';
import { filtersToApiParams } from '../../utils';
import { apiService } from '../../services';
import { RequestCancelledError } from '../../services/base/ApiErrors';
import { useToast } from '../../contexts/ToastContext';
import { useShallowMemoFilters } from '../performance/useShallowMemo';
import { useMemoizedCallback, useDebouncedCallback } from '../performance/useMemoizedCallback';
import { useRequestDeduplication } from '../cache/useRequestDeduplication';
import { useApiCache } from '../cache/useApiCache';

interface UseOptimizedNetworkDataReturn {
  networkData: NetworkData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isStale: boolean;
  lastFetchTime: number | null;
  cacheHit: boolean;
}

interface NetworkDataHookOptions {
  debounceMs?: number;
  cacheConfig?: {
    ttl?: number;
    enableLocalStorage?: boolean;
  };
  retryConfig?: {
    maxRetries?: number;
    retryDelay?: number;
  };
}

export const useOptimizedNetworkData = (
  filters: FilterState,
  options: NetworkDataHookOptions = {}
): UseOptimizedNetworkDataReturn => {
  const {
    debounceMs = 300,
    cacheConfig = { ttl: 2 * 60 * 1000, enableLocalStorage: false },
    retryConfig = { maxRetries: 2, retryDelay: 1000 }
  } = options;

  // State management
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  const [cacheHit, setCacheHit] = useState(false);

  // External dependencies
  const { showToast } = useToast();

  // Performance optimizations
  const stableFilters = useShallowMemoFilters(filters);
  const cache = useApiCache<NetworkData>(cacheConfig);
  const deduplication = useRequestDeduplication<NetworkData>();

  // Memoize query parameters string for caching
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    const f = stableFilters;

    // Arrays
    if (f.seasons.length > 0) params.set('seasons', f.seasons.join(','));
    if (f.leagues.length > 0) params.set('leagues', f.leagues.join(','));
    if (f.countries.length > 0) params.set('countries', f.countries.join(','));
    if (f.continents.length > 0) params.set('continents', f.continents.join(','));
    if (f.transferTypes.length > 0) params.set('transferTypes', f.transferTypes.join(','));
    if (f.transferWindows.length > 0) params.set('transferWindows', f.transferWindows.join(','));
    if (f.positions.length > 0) params.set('positions', f.positions.join(','));
    if (f.nationalities.length > 0) params.set('nationalities', f.nationalities.join(','));
    if (f.clubs.length > 0) params.set('clubs', f.clubs.join(','));
    if (f.leagueTiers.length > 0) params.set('leagueTiers', f.leagueTiers.join(','));

    // Numerics
    if (f.minTransferFee) params.set('minTransferFee', f.minTransferFee.toString());
    if (f.maxTransferFee) params.set('maxTransferFee', f.maxTransferFee.toString());
    if (f.minPlayerAge) params.set('minPlayerAge', f.minPlayerAge.toString());
    if (f.maxPlayerAge) params.set('maxPlayerAge', f.maxPlayerAge.toString());
    if (f.minContractDuration) params.set('minContractDuration', f.minContractDuration.toString());
    if (f.maxContractDuration) params.set('maxContractDuration', f.maxContractDuration.toString());
    if (f.minROI !== undefined) params.set('minROI', f.minROI.toString());
    if (f.maxROI !== undefined) params.set('maxROI', f.maxROI.toString());
    if (f.minPerformanceRating !== undefined) params.set('minPerformanceRating', f.minPerformanceRating.toString());
    if (f.maxPerformanceRating !== undefined) params.set('maxPerformanceRating', f.maxPerformanceRating.toString());

    // Booleans
    if (f.hasTransferFee) params.set('hasTransferFee', 'true');
    if (f.excludeLoans) params.set('excludeLoans', 'true');
    if (f.isLoanToBuy) params.set('isLoanToBuy', 'true');
    if (f.onlySuccessfulTransfers) params.set('onlySuccessfulTransfers', 'true');

    return params.toString();
  }, [stableFilters]);

  // Create stable cache key
  const cacheKey = useMemo(() => `network_data_${queryString}`, [queryString]);

  // Fetch function with retry logic
  const fetchNetworkData = useMemoizedCallback(async (signal?: AbortSignal): Promise<NetworkData> => {
    const apiParams = filtersToApiParams(stableFilters);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryConfig.maxRetries!; attempt++) {
      try {
        const response = await apiService.getNetworkData(apiParams, { signal: signal! });

        if (response.success) {
          return response.data;
        } else {
          throw new Error(response.error || 'Failed to fetch network data');
        }
      } catch (err) {
        lastError = err as Error;

        // Don't retry on abort or cancellation
        if (err instanceof RequestCancelledError || isAbortError(err)) {
          throw err;
        }

        // Wait before retry (except on last attempt)
        if (attempt < retryConfig.maxRetries!) {
          await new Promise(resolve => setTimeout(resolve, retryConfig.retryDelay! * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }, [stableFilters, retryConfig.maxRetries, retryConfig.retryDelay]);

  // Main data fetching function
  const performFetch = useMemoizedCallback(async () => {
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      setNetworkData(cachedData);
      setError(null);
      setIsStale(false);
      setCacheHit(true);
      return;
    }

    setCacheHit(false);
    setIsStale(true);
    setLoading(true);
    setError(null);

    try {
      const data = await deduplication.executeRequest(
        cacheKey,
        (signal) => fetchNetworkData(signal)
      );

      setNetworkData(data);
      setError(null);
      setIsStale(false);
      setLastFetchTime(Date.now());

      // Cache the successful result
      cache.set(cacheKey, data, { ttl: cacheConfig.ttl });

    } catch (err) {
      // Ignore explicit cancellations
      if (err instanceof RequestCancelledError || isAbortError(err)) {
        return;
      }

      const processedError = handleError(err) as ApiError;
      console.error('Network request failed:', processedError);

      if (isApiTimeoutError(processedError) || isNetworkError(processedError)) {
        setNetworkData(MOCK_NETWORK_DATA as NetworkData);
        setError(null);
        showToast('Network issue detected, using fallback data', { type: 'warning' });
      } else {
        const errorMessage = (processedError as any).message || 'An error occurred';
        setError(errorMessage);
        showToast(errorMessage, { type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  }, [cacheKey, cache, deduplication, fetchNetworkData, cacheConfig.ttl, showToast]);

  // Debounced fetch function
  const debouncedFetch = useDebouncedCallback(
    performFetch,
    debounceMs,
    [performFetch]
  );

  // Effect to trigger data fetching when filters change
  useEffect(() => {
    debouncedFetch();
  }, [debouncedFetch]);

  // Manual refetch function
  const refetch = useCallback(() => {
    // Clear cache and deduplication for this key
    cache.remove(cacheKey);
    deduplication.cancelRequest(cacheKey);
    
    // Trigger immediate fetch
    performFetch();
  }, [cache, cacheKey, deduplication, performFetch]);

  return {
    networkData,
    loading,
    error,
    refetch,
    isStale,
    lastFetchTime,
    cacheHit
  };
};