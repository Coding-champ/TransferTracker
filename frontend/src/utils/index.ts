/**
 * Utils Index - Centralized re-exports for backward compatibility
 * 
 * This file maintains backward compatibility by re-exporting all utility functions
 * from their respective modular files. All existing imports will continue to work.
 */

// Re-export formatting utilities
export {
  formatCurrency,
  formatDate,
  formatPercentage,
  formatTransferType,
  formatTransferWindow,
  formatRating
} from './formatters';

// Re-export validation utilities
export {
  validateFilterCombination,
  countActiveFilters
} from './validators';

// Re-export API helper utilities
export {
  API_BASE_URL,
  API_RETRY_MAX,
  API_RETRY_BASE_MS,
  bigIntToNumber,
  buildQueryParams,
  filtersToApiParams
} from './api-helpers';

// Re-export parser utilities
export {
  safeParseArray,
  safeParseInt,
  safeParseFloat,
  safeParseIntArray
} from './parsers';

// Re-export color utilities
export {
  getLeagueColor,
  gettransferSuccessRateColor,
  getROIColor
} from './colors';

// Re-export debug utilities
export {
  debugLog,
  createPerformanceTimer
} from './debug';