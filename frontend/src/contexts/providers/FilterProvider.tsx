/**
 * FilterProvider - Isolated context for filter state management
 * Prevents unnecessary re-renders in components that don't need filter data
 */

import React, { createContext, useReducer, ReactNode, useCallback } from 'react';
import { FilterState } from '../../types';

// Define filter action types
type FilterAction =
  | { type: 'SET_FILTERS'; payload: FilterState }
  | { type: 'UPDATE_FILTER_FIELD'; payload: { field: keyof FilterState; value: any } }
  | { type: 'RESET_FILTERS' }
  | { type: 'CLEAR_NUMERIC_FILTERS' }
  | { type: 'CLEAR_ARRAY_FILTERS' };

// Define the context interface
interface FilterContextType {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  updateFilterField: <K extends keyof FilterState>(field: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  clearNumericFilters: () => void;
  clearArrayFilters: () => void;
}

// Initial filter state with sensible defaults
const initialFilters: FilterState = {
  seasons: ['2023/24'],
  leagues: [],
  countries: [],
  continents: [],
  transferTypes: ['sale', 'loan', 'free', 'loan_with_option'],
  transferWindows: [],
  positions: [],
  nationalities: [],
  clubs: [],
  leagueTiers: [],
  minTransferFee: undefined,
  maxTransferFee: undefined,
  minPlayerAge: undefined,
  maxPlayerAge: undefined,
  minContractDuration: undefined,
  maxContractDuration: undefined,
  minROI: undefined,
  maxROI: undefined,
  minPerformanceRating: undefined,
  maxPerformanceRating: undefined,
  hasTransferFee: false,
  excludeLoans: false,
  isLoanToBuy: false,
  onlySuccessfulTransfers: false
};

// Reducer function with optimized updates
const filterReducer = (state: FilterState, action: FilterAction): FilterState => {
  switch (action.type) {
    case 'SET_FILTERS':
      return action.payload;
    
    case 'UPDATE_FILTER_FIELD':
      return {
        ...state,
        [action.payload.field]: action.payload.value
      };
    
    case 'RESET_FILTERS':
      return initialFilters;
    
    case 'CLEAR_NUMERIC_FILTERS':
      return {
        ...state,
        minTransferFee: undefined,
        maxTransferFee: undefined,
        minPlayerAge: undefined,
        maxPlayerAge: undefined,
        minContractDuration: undefined,
        maxContractDuration: undefined,
        minROI: undefined,
        maxROI: undefined,
        minPerformanceRating: undefined,
        maxPerformanceRating: undefined
      };
    
    case 'CLEAR_ARRAY_FILTERS':
      return {
        ...state,
        leagues: [],
        countries: [],
        continents: [],
        transferWindows: [],
        positions: [],
        nationalities: [],
        clubs: [],
        leagueTiers: []
      };
    
    default:
      return state;
  }
};

// Create the context
const FilterContext = createContext<FilterContextType | undefined>(undefined);

// Context provider component
interface FilterProviderProps {
  children: ReactNode;
  initialState?: Partial<FilterState>;
}

export const FilterProvider: React.FC<FilterProviderProps> = ({ 
  children, 
  initialState 
}) => {
  const [filters, dispatch] = useReducer(
    filterReducer, 
    { ...initialFilters, ...initialState }
  );

  // Memoized action creators to prevent unnecessary re-renders
  const setFilters = useCallback((newFilters: FilterState) => {
    dispatch({ type: 'SET_FILTERS', payload: newFilters });
  }, []);

  const updateFilterField = useCallback(<K extends keyof FilterState>(
    field: K, 
    value: FilterState[K]
  ) => {
    dispatch({ 
      type: 'UPDATE_FILTER_FIELD', 
      payload: { field, value } 
    });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS' });
  }, []);

  const clearNumericFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_NUMERIC_FILTERS' });
  }, []);

  const clearArrayFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_ARRAY_FILTERS' });
  }, []);

  const contextValue: FilterContextType = {
    filters,
    setFilters,
    updateFilterField,
    resetFilters,
    clearNumericFilters,
    clearArrayFilters
  };

  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
};

// Export context for direct access
export { FilterContext };

// Custom hook for using filter context
export const useFilterContext = (): FilterContextType => {
  const context = React.useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilterContext must be used within a FilterProvider');
  }
  return context;
};