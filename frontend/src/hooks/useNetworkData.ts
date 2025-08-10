import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NetworkData, FilterState } from '../types';
import { MOCK_NETWORK_DATA } from '../data/mockNetworkData';
import { handleError, isApiTimeoutError, isNetworkError, ApiError, isAbortError } from '../utils/errors';
import { filtersToApiParams } from '../utils';
import apiService from '../services/api';
import { RequestCancelledError } from '../services/base/ApiErrors';
import { useToast } from '../contexts/ToastContext';

interface UseNetworkDataReturn {
  networkData: NetworkData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isStale: boolean;
}

export const useNetworkData = (filters: FilterState): UseNetworkDataReturn => {
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  
  const requestCacheRef = useRef<Map<string, Promise<any>>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  const { showToast } = useToast();

  // Memoize query parameters string for caching
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    const f = filters;

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
  }, [filters]);

  // Fetch data when query parameters change (with debouncing)
  useEffect(() => {
    setIsStale(true);
    const currentCache = requestCacheRef.current;
    
    const timeoutId = setTimeout(async () => {
      // Check cache first to prevent duplicate requests
      const cacheKey = queryString;
      if (currentCache.has(cacheKey)) {
        try {
          const cachedData = await currentCache.get(cacheKey)!;
          setNetworkData(cachedData);
          setIsStale(false);
          return;
        } catch {
          currentCache.delete(cacheKey);
        }
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setLoading(true);
      setError(null);
      setIsStale(false);
      
      const fetchPromise = (async () => {
        try {
          const apiParams = filtersToApiParams(filters);
          const response = await apiService.getNetworkData(apiParams, { signal });

          if (response.success) {
            if (!signal?.aborted) {
              setNetworkData(response.data);
              setError(null);
            }
            return response.data;
          } else {
            throw new Error(response.error || 'Failed to fetch network data');
          }
        } catch (err) {
          // Ignore explicit cancellations
          if (err instanceof RequestCancelledError || isAbortError(err)) {
            return null;
          }

          const processedError = handleError(err) as ApiError;
          console.error('Network request failed:', processedError);
          
          if (!signal?.aborted) {
            // Check for network errors more broadly - include connection errors, network errors, etc.
            const errorMessage = (processedError as any).message || '';
            const errorName = (processedError as any).name || '';
            
            const isNetworkIssue = isApiTimeoutError(processedError) || 
                                   isNetworkError(processedError) ||
                                   errorName === 'NetworkError' ||
                                   errorMessage.toLowerCase().includes('network') ||
                                   errorMessage.toLowerCase().includes('connection') ||
                                   errorMessage.toLowerCase().includes('refused') ||
                                   errorMessage.toLowerCase().includes('timeout');
            
            if (isNetworkIssue) {
              setNetworkData(MOCK_NETWORK_DATA as NetworkData);
              setError(null);
              showToast('Network issue detected, using fallback data', { type: 'warning' });
            } else {
              setError(errorMessage || 'An error occurred');
              showToast(errorMessage || 'An error occurred', { type: 'error' });
            }
          }
          
          return MOCK_NETWORK_DATA as NetworkData;
        } finally {
          if (!signal?.aborted) {
            setLoading(false);
          }
          currentCache.delete(cacheKey);
        }
      })();

      currentCache.set(cacheKey, fetchPromise);
    }, 300);
    
    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      currentCache.clear();
    };
  }, [queryString, filters, showToast]);

  // Cleanup effect for component unmount
  useEffect(() => {
    const currentController = abortControllerRef.current;
    const currentCache = requestCacheRef.current;
    
    return () => {
      if (currentController) {
        currentController.abort();
      }
      currentCache.clear();
    };
  }, []);

  // Manual refetch function
  const refetch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    requestCacheRef.current.clear();
    abortControllerRef.current = new AbortController();

    setIsStale(true);
    setTimeout(() => {
      setError(null);
    }, 0);
  }, []);

  return {
    networkData,
    loading,
    error,
    refetch,
    isStale
  };
};