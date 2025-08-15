/**
 * API Helper Utilities
 * Provides functions for building API parameters, query strings, and handling API-related data transformations
 */

import { FilterState, FilterParams } from '../types';

// ========== CONSTANTS ==========
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/** Optional: Retry-Konfiguration für Axios (genutzt in services/api.ts Interceptor) */
export const API_RETRY_MAX = Number(process.env.REACT_APP_API_RETRY_MAX ?? 2);

/** Base milliseconds for API retry delay */
export const API_RETRY_BASE_MS = Number(process.env.REACT_APP_API_RETRY_BASE_MS ?? 300);

/**
 * Converts a BigInt value to a number for API compatibility
 * @param value - BigInt value or null
 * @returns Converted number or null
 */
export const bigIntToNumber = (value: bigint | null): number | null => {
  if (value === null) return null;
  const num = Number(value);
  return num === 0 ? 0 : num;
};

/**
 * Builds URL search parameters from filter state
 * @param filters - Current filter state
 * @returns URLSearchParams object with properly formatted parameters
 */
export const buildQueryParams = (filters: FilterState): URLSearchParams => {
  const params = new URLSearchParams();
  
  // Array-Parameter
  const arrayFilters: (keyof FilterState)[] = [
    'seasons', 'leagues', 'countries', 'continents', 'transferTypes', 
    'transferWindows', 'positions', 'nationalities', 'clubs', 'leagueTiers'
  ];
  
  arrayFilters.forEach(key => {
    const value = filters[key];
    if (Array.isArray(value) && value.length > 0) {
      params.set(key, value.join(','));
    }
  });
  
  // Numerische Parameter
  const numericFilters: (keyof FilterState)[] = [
    'minTransferFee', 'maxTransferFee', 'minPlayerAge', 'maxPlayerAge',
    'minContractDuration', 'maxContractDuration', 'minROI', 'maxROI',
    'minPerformanceRating', 'maxPerformanceRating'
  ];
  
  numericFilters.forEach(key => {
    const value = filters[key];
    if (value !== undefined && value !== null) {
      params.set(key, value.toString());
    }
  });
  
  // Boolean-Parameter
  const booleanFilters: (keyof FilterState)[] = [
    'hasTransferFee', 'excludeLoans', 'isLoanToBuy', 'onlySuccessfulTransfers'
  ];
  
  booleanFilters.forEach(key => {
    const value = filters[key];
    if (value === true) {
      params.set(key, 'true');
    }
  });
  
  return params;
};

/**
 * Converts filter state to API parameters format
 * @param filters - Current filter state
 * @returns FilterParams object suitable for API requests
 */
export const filtersToApiParams = (filters: FilterState): FilterParams => {
  const params: FilterParams = {};
  Object.keys(filters).forEach(key => {
    const value = filters[key as keyof FilterState];
    if (value !== undefined && value !== null) {
      if (Array.isArray(value) && value.length > 0) {
        (params as any)[key] = value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        (params as any)[key] = value;
      }
    }
  });
  return params;
};