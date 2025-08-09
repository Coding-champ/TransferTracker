/**
 * DataProvider - Isolated context for data state management
 * Manages loading states, errors, and cached data
 */

import React, { createContext, useReducer, ReactNode, useCallback } from 'react';
import { NetworkData, Statistics, Transfer } from '../../types';

// Define data state interface
interface DataState {
  networkData: NetworkData | null;
  statistics: Statistics | null;
  transfers: Transfer[] | null;
  loading: {
    networkData: boolean;
    statistics: boolean;
    transfers: boolean;
  };
  errors: {
    networkData: string | null;
    statistics: string | null;
    transfers: string | null;
  };
  lastUpdated: {
    networkData: number | null;
    statistics: number | null;
    transfers: number | null;
  };
  isStale: {
    networkData: boolean;
    statistics: boolean;
    transfers: boolean;
  };
}

// Define data action types
type DataAction =
  | { type: 'SET_NETWORK_DATA'; payload: NetworkData }
  | { type: 'SET_STATISTICS'; payload: Statistics }
  | { type: 'SET_TRANSFERS'; payload: Transfer[] }
  | { type: 'SET_LOADING'; payload: { type: keyof DataState['loading']; loading: boolean } }
  | { type: 'SET_ERROR'; payload: { type: keyof DataState['errors']; error: string | null } }
  | { type: 'SET_STALE'; payload: { type: keyof DataState['isStale']; stale: boolean } }
  | { type: 'CLEAR_DATA'; payload: keyof DataState['loading'] }
  | { type: 'CLEAR_ALL_DATA' };

// Define the context interface
interface DataContextType {
  state: DataState;
  setNetworkData: (data: NetworkData) => void;
  setStatistics: (data: Statistics) => void;
  setTransfers: (data: Transfer[]) => void;
  setLoading: (type: keyof DataState['loading'], loading: boolean) => void;
  setError: (type: keyof DataState['errors'], error: string | null) => void;
  setStale: (type: keyof DataState['isStale'], stale: boolean) => void;
  clearData: (type: keyof DataState['loading']) => void;
  clearAllData: () => void;
}

// Initial data state
const initialDataState: DataState = {
  networkData: null,
  statistics: null,
  transfers: null,
  loading: {
    networkData: false,
    statistics: false,
    transfers: false
  },
  errors: {
    networkData: null,
    statistics: null,
    transfers: null
  },
  lastUpdated: {
    networkData: null,
    statistics: null,
    transfers: null
  },
  isStale: {
    networkData: false,
    statistics: false,
    transfers: false
  }
};

// Reducer function with optimized updates
const dataReducer = (state: DataState, action: DataAction): DataState => {
  const timestamp = Date.now();

  switch (action.type) {
    case 'SET_NETWORK_DATA':
      return {
        ...state,
        networkData: action.payload,
        lastUpdated: { ...state.lastUpdated, networkData: timestamp },
        errors: { ...state.errors, networkData: null },
        loading: { ...state.loading, networkData: false },
        isStale: { ...state.isStale, networkData: false }
      };

    case 'SET_STATISTICS':
      return {
        ...state,
        statistics: action.payload,
        lastUpdated: { ...state.lastUpdated, statistics: timestamp },
        errors: { ...state.errors, statistics: null },
        loading: { ...state.loading, statistics: false },
        isStale: { ...state.isStale, statistics: false }
      };

    case 'SET_TRANSFERS':
      return {
        ...state,
        transfers: action.payload,
        lastUpdated: { ...state.lastUpdated, transfers: timestamp },
        errors: { ...state.errors, transfers: null },
        loading: { ...state.loading, transfers: false },
        isStale: { ...state.isStale, transfers: false }
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.type]: action.payload.loading
        }
      };

    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.type]: action.payload.error
        },
        loading: {
          ...state.loading,
          [action.payload.type]: false
        }
      };

    case 'SET_STALE':
      return {
        ...state,
        isStale: {
          ...state.isStale,
          [action.payload.type]: action.payload.stale
        }
      };

    case 'CLEAR_DATA':
      const dataType = action.payload;
      return {
        ...state,
        [dataType]: null,
        loading: { ...state.loading, [dataType]: false },
        errors: { ...state.errors, [dataType]: null },
        lastUpdated: { ...state.lastUpdated, [dataType]: null },
        isStale: { ...state.isStale, [dataType]: false }
      };

    case 'CLEAR_ALL_DATA':
      return initialDataState;

    default:
      return state;
  }
};

// Create the context
const DataContext = createContext<DataContextType | undefined>(undefined);

// Context provider component
interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(dataReducer, initialDataState);

  // Memoized action creators
  const setNetworkData = useCallback((data: NetworkData) => {
    dispatch({ type: 'SET_NETWORK_DATA', payload: data });
  }, []);

  const setStatistics = useCallback((data: Statistics) => {
    dispatch({ type: 'SET_STATISTICS', payload: data });
  }, []);

  const setTransfers = useCallback((data: Transfer[]) => {
    dispatch({ type: 'SET_TRANSFERS', payload: data });
  }, []);

  const setLoading = useCallback((type: keyof DataState['loading'], loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: { type, loading } });
  }, []);

  const setError = useCallback((type: keyof DataState['errors'], error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: { type, error } });
  }, []);

  const setStale = useCallback((type: keyof DataState['isStale'], stale: boolean) => {
    dispatch({ type: 'SET_STALE', payload: { type, stale } });
  }, []);

  const clearData = useCallback((type: keyof DataState['loading']) => {
    dispatch({ type: 'CLEAR_DATA', payload: type });
  }, []);

  const clearAllData = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_DATA' });
  }, []);

  const contextValue: DataContextType = {
    state,
    setNetworkData,
    setStatistics,
    setTransfers,
    setLoading,
    setError,
    setStale,
    clearData,
    clearAllData
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

// Export context for direct access
export { DataContext };

// Custom hook for using data context
export const useDataContext = (): DataContextType => {
  const context = React.useContext(DataContext);
  if (context === undefined) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};