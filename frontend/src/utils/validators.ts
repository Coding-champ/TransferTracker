/**
 * Validation Utilities
 * Provides functions for validating filter combinations and counting active filters
 */

import { FilterState } from '../types';

/**
 * Validates filter combinations for conflicts and logical issues
 * @param filters - Current filter state
 * @returns Array of warning messages for conflicting filters
 */
export const validateFilterCombination = (filters: FilterState): string[] => {
  const warnings: string[] = [];
  
  // Check for conflicting boolean filters
  if (filters.excludeLoans && filters.isLoanToBuy) {
    warnings.push('Conflicting filters: "Exclude loans" and "Loan-to-buy only" cannot both be active');
  }
  
  // Check for min/max range conflicts
  if (filters.minTransferFee && filters.maxTransferFee && filters.minTransferFee > filters.maxTransferFee) {
    warnings.push('Minimum transfer fee cannot be higher than maximum transfer fee');
  }
  
  if (filters.minPlayerAge && filters.maxPlayerAge && filters.minPlayerAge > filters.maxPlayerAge) {
    warnings.push('Minimum player age cannot be higher than maximum player age');
  }
  
  if (filters.minContractDuration && filters.maxContractDuration && filters.minContractDuration > filters.maxContractDuration) {
    warnings.push('Minimum contract duration cannot be higher than maximum contract duration');
  }
  
  if (filters.minROI !== undefined && filters.maxROI !== undefined && filters.minROI > filters.maxROI) {
    warnings.push('Minimum ROI cannot be higher than maximum ROI');
  }
  
  if (filters.minPerformanceRating !== undefined && filters.maxPerformanceRating !== undefined && 
      filters.minPerformanceRating > filters.maxPerformanceRating) {
    warnings.push('Minimum performance rating cannot be higher than maximum performance rating');
  }
  
  // Check for potentially confusing filter combinations
  if (filters.leagues.length > 0 && filters.continents.length > 0) {
    warnings.push('Both league and continent filters are active - results will show intersection');
  }
  
  return warnings;
};

/**
 * Counts the number of active filters in the filter state
 * @param filters - Current filter state
 * @returns Total count of active filters
 */
export const countActiveFilters = (filters: FilterState): number => {
  let count = 0;
  
  // Count array filters (each item in array counts as one filter)
  Object.keys(filters).forEach(key => {
    const value = filters[key as keyof FilterState];
    if (Array.isArray(value)) {
      count += value.length;
    } else if (typeof value === 'number' && value !== undefined) {
      count++;
    } else if (typeof value === 'boolean' && value === true) {
      count++;
    }
  });
  
  return count;
};