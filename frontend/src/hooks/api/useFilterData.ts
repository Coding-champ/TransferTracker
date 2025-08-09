import { useState, useEffect, useCallback, useMemo } from 'react';
import { League } from '../../types';
import apiService from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useApiCall } from './useApiCall';
import { handleError, ApiError } from '../../utils/errors';

/**
 * Interface for the filter data returned by the hook
 */
interface FilterData {
  leagues: League[];
  seasons: string[];
  transferTypes: string[];
  transferWindows: string[];
  positions: string[];
  nationalities: string[];
  continents: string[];
  leagueTiers: number[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Configuration for filter data fetching
 */
interface UseFilterDataConfig {
  /** Whether to cache filter data */
  enableCache?: boolean;
  /** Cache duration in milliseconds */
  cacheDuration?: number;
  /** Whether to retry failed requests */
  retry?: boolean;
  /** Auto-refresh interval in milliseconds */
  autoRefreshInterval?: number;
}

/**
 * Enhanced custom hook to fetch and manage filter data
 * 
 * Provides comprehensive filter option data with:
 * - Intelligent caching and refresh strategies
 * - Error handling with user-friendly feedback
 * - Performance optimization
 * - Auto-refresh capabilities
 * - TypeScript support with proper error types
 * 
 * @param config - Configuration options for the hook
 * @returns Filter data, loading state, and control functions
 * 
 * @example
 * ```typescript
 * const { data, loading, error, refetch } = useFilterData({
 *   enableCache: true,
 *   retry: true,
 *   autoRefreshInterval: 30000 // 30 seconds
 * });
 * 
 * if (loading) return <Spinner />;
 * if (error) return <ErrorMessage error={error} />;
 * 
 * return <FilterPanel leagues={data.leagues} />;
 * ```
 */
export const useFilterData = (config: UseFilterDataConfig = {}) => {
  const {
    enableCache = true,
    cacheDuration = 10 * 60 * 1000, // 10 minutes
    retry = true,
    autoRefreshInterval
  } = config;

  const [filterData, setFilterData] = useState<Omit<FilterData, 'loading' | 'error'>>({
    leagues: [],
    seasons: [],
    transferTypes: [],
    transferWindows: [],
    positions: [],
    nationalities: [],
    continents: [],
    leagueTiers: [],
    lastUpdated: null
  });

  const { showToast } = useToast();

  // Use the base API call hook with enhanced configuration
  const {
    state: { loading, error },
    execute: fetchFilterData,
    reset
  } = useApiCall(
    () => apiService.loadAllFilterData(),
    {
      retry,
      retryAttempts: 3,
      retryDelay: 1000,
      deduplicate: true,
      cacheTimeout: enableCache ? cacheDuration : 0,
      onError: (error: ApiError) => {
        const message = error?.message || 'Failed to load filter data';
        showToast(`Some filter data could not be loaded. ${message}`, { type: 'warning' });
      },
      onSuccess: (data) => {
        setFilterData({
          leagues: data.leagues || [],
          seasons: data.seasons || [],
          transferTypes: data.transferTypes || [],
          transferWindows: data.transferWindows || [],
          positions: data.positions || [],
          nationalities: data.nationalities || [],
          continents: data.continents || [],
          leagueTiers: data.leagueTiers || [],
          lastUpdated: new Date()
        });
      }
    }
  );

  /**
   * Manually refetch filter data
   */
  const refetch = useCallback(async () => {
    await fetchFilterData();
  }, [fetchFilterData]);

  /**
   * Reset filter data state
   */
  const resetFilterData = useCallback(() => {
    reset();
    setFilterData({
      leagues: [],
      seasons: [],
      transferTypes: [],
      transferWindows: [],
      positions: [],
      nationalities: [],
      continents: [],
      leagueTiers: [],
      lastUpdated: null
    });
  }, [reset]);

  /**
   * Check if data is stale and needs refresh
   */
  const isStale = useMemo(() => {
    if (!filterData.lastUpdated || !enableCache) return false;
    return Date.now() - filterData.lastUpdated.getTime() > cacheDuration;
  }, [filterData.lastUpdated, enableCache, cacheDuration]);

  // Initial data fetch
  useEffect(() => {
    fetchFilterData();
  }, [fetchFilterData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefreshInterval) return;

    const interval = setInterval(() => {
      if (!loading) {
        fetchFilterData();
      }
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshInterval, loading, fetchFilterData]);

  // Memoized return value to prevent unnecessary re-renders
  const result = useMemo((): FilterData & {
    refetch: () => Promise<void>;
    reset: () => void;
    isStale: boolean;
  } => ({
    ...filterData,
    loading,
    error,
    refetch,
    reset: resetFilterData,
    isStale
  }), [filterData, loading, error, refetch, resetFilterData, isStale]);

  return result;
};

/**
 * Hook for getting specific filter category data
 * 
 * @param category - The filter category to retrieve
 * @returns Specific filter category data
 */
export const useFilterCategory = <K extends keyof Omit<FilterData, 'loading' | 'error' | 'lastUpdated'>>(
  category: K
) => {
  const filterData = useFilterData();
  
  return useMemo(() => ({
    data: filterData[category],
    loading: filterData.loading,
    error: filterData.error,
    refetch: filterData.refetch
  }), [filterData, category]);
};

/**
 * Hook for getting leagues with enhanced filtering
 * 
 * @param filters - Optional filters for leagues
 * @returns Filtered leagues data
 */
export const useLeagues = (filters?: {
  tier?: number;
  country?: string;
  continent?: string;
}) => {
  const { leagues, loading, error, refetch } = useFilterData();

  const filteredLeagues = useMemo(() => {
    if (!filters) return leagues;

    return leagues.filter(league => {
      if (filters.tier && league.tier !== filters.tier) return false;
      if (filters.country && league.country !== filters.country) return false;
      if (filters.continent && league.continent !== filters.continent) return false;
      return true;
    });
  }, [leagues, filters]);

  return {
    leagues: filteredLeagues,
    loading,
    error,
    refetch
  };
};

export default useFilterData;