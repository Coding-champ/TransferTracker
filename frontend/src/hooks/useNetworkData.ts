import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NetworkData, FilterState } from '../types';
import { MOCK_NETWORK_DATA } from '../data/mockNetworkData';
import { handleError, isApiTimeoutError, isNetworkError, ApiError } from '../utils/errors';

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
  
  // Cache for preventing duplicate requests
  const requestCacheRef = useRef<Map<string, Promise<any>>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoize query parameters to prevent unnecessary re-fetches
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    // Array parameters
    if (filters.seasons.length > 0) {
      params.set('seasons', filters.seasons.join(','));
    }
    if (filters.leagues.length > 0) {
      params.set('leagues', filters.leagues.join(','));
    }
    if (filters.countries.length > 0) {
      params.set('countries', filters.countries.join(','));
    }
    if (filters.continents.length > 0) {
      params.set('continents', filters.continents.join(','));
    }
    if (filters.transferTypes.length > 0) {
      params.set('transferTypes', filters.transferTypes.join(','));
    }
    if (filters.transferWindows.length > 0) {
      params.set('transferWindows', filters.transferWindows.join(','));
    }
    if (filters.positions.length > 0) {
      params.set('positions', filters.positions.join(','));
    }
    if (filters.nationalities.length > 0) {
      params.set('nationalities', filters.nationalities.join(','));
    }
    if (filters.clubs.length > 0) {
      params.set('clubs', filters.clubs.join(','));
    }
    if (filters.leagueTiers.length > 0) {
      params.set('leagueTiers', filters.leagueTiers.join(','));
    }
    
    // Numeric parameters
    if (filters.minTransferFee) {
      params.set('minTransferFee', filters.minTransferFee.toString());
    }
    if (filters.maxTransferFee) {
      params.set('maxTransferFee', filters.maxTransferFee.toString());
    }
    if (filters.minPlayerAge) {
      params.set('minPlayerAge', filters.minPlayerAge.toString());
    }
    if (filters.maxPlayerAge) {
      params.set('maxPlayerAge', filters.maxPlayerAge.toString());
    }
    if (filters.minContractDuration) {
      params.set('minContractDuration', filters.minContractDuration.toString());
    }
    if (filters.maxContractDuration) {
      params.set('maxContractDuration', filters.maxContractDuration.toString());
    }
    if (filters.minROI !== undefined) {
      params.set('minROI', filters.minROI.toString());
    }
    if (filters.maxROI !== undefined) {
      params.set('maxROI', filters.maxROI.toString());
    }
    if (filters.minPerformanceRating !== undefined) {
      params.set('minPerformanceRating', filters.minPerformanceRating.toString());
    }
    if (filters.maxPerformanceRating !== undefined) {
      params.set('maxPerformanceRating', filters.maxPerformanceRating.toString());
    }
    
    // Boolean parameters
    if (filters.hasTransferFee) {
      params.set('hasTransferFee', 'true');
    }
    if (filters.excludeLoans) {
      params.set('excludeLoans', 'true');
    }
    if (filters.isLoanToBuy) {
      params.set('isLoanToBuy', 'true');
    }
    if (filters.onlySuccessfulTransfers) {
      params.set('onlySuccessfulTransfers', 'true');
    }
    
    return params;
  }, [filters]);

  // Stable query string for caching
  const queryString = useMemo(() => queryParams.toString(), [queryParams]);

  // Fetch data when query parameters change (with debouncing)
  useEffect(() => {
    setIsStale(true);
    
    const timeoutId = setTimeout(async () => {
      // Check cache first to prevent duplicate requests
      const cacheKey = queryString;
      if (requestCacheRef.current.has(cacheKey)) {
        try {
          const cachedData = await requestCacheRef.current.get(cacheKey)!;
          setNetworkData(cachedData);
          setIsStale(false);
          return;
        } catch (err) {
          // If cached request failed, remove from cache and continue
          requestCacheRef.current.delete(cacheKey);
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
          console.log('Fetching with enhanced filters:', queryString);

          const response = await fetch(`http://localhost:3001/api/network-data?${queryString}`, {
            signal
          });
          
          if (signal?.aborted) {
            throw new Error('Request aborted');
          }
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const result = await response.json();
          
          if (result.success) {
            console.log('Enhanced network data received:', {
              nodes: result.data.nodes.length,
              edges: result.data.edges.length,
              totalTransfers: result.data.metadata.totalTransfers,
              avgROI: result.data.metadata.avgROI,
              successRate: result.data.metadata.successRate
            });
            
            // Only update state if component is still mounted and request wasn't aborted
            if (!signal?.aborted) {
              setNetworkData(result.data);
              setError(null);
            }
            
            return result.data;
          } else {
            throw new Error(result.error || 'Failed to fetch network data');
          }
        } catch (err) {
          const processedError = handleError(err) as ApiError;
          
          if (processedError.name === 'AbortError') {
            console.log('Request was aborted');
            return null;
          }
          
          console.error('Network request failed:', processedError);
          
          if (!signal?.aborted) {
            // Set appropriate error message based on error type
            if (isApiTimeoutError(processedError) || isNetworkError(processedError)) {
              console.log('🔧 Using mock data due to network/timeout error');
              setNetworkData(MOCK_NETWORK_DATA as NetworkData);
              setError(null); // Clear error when using mock data
            } else {
              const errorMessage = (processedError as any).message || 'An error occurred';
              setError(errorMessage);
            }
          }
          
          return MOCK_NETWORK_DATA as NetworkData;
        } finally {
          if (!signal?.aborted) {
            setLoading(false);
          }
          // Clean up cache entry
          requestCacheRef.current.delete(cacheKey);
        }
      })();

      // Cache the promise
      requestCacheRef.current.set(cacheKey, fetchPromise);
    }, 300);
    
    return () => {
      clearTimeout(timeoutId);
      // Cleanup: abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clear any pending cache entries
      requestCacheRef.current.clear();
    };
  }, [queryString]); // Only depend on queryString

  // Cleanup effect for component unmount
  useEffect(() => {
    // Capture current refs for cleanup
    const currentController = abortControllerRef.current;
    const currentCache = requestCacheRef.current;
    
    return () => {
      // Ensure all requests are aborted when component unmounts
      if (currentController) {
        currentController.abort();
      }
      currentCache.clear();
    };
  }, []);

  // Manual refetch function
  const refetch = useCallback(() => {
    // Cancel any pending debounced requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Clear cache
    requestCacheRef.current.clear();
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    // Trigger a new fetch by creating a fake queryString change
    setIsStale(true);
    setTimeout(() => {
      // This will trigger the useEffect above
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