import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { FilterState, NetworkNode, NetworkEdge, VisualizationType } from '../types';

// Define the shape of our application state
interface AppState {
  filters: FilterState;
  selectedNode: NetworkNode | null;
  hoveredEdge: NetworkEdge | null;
  activeVisualization: VisualizationType;
  visualizationData: Record<VisualizationType, any>;
}

// Define action types for state updates
type AppAction =
  | { type: 'SET_FILTERS'; payload: FilterState }
  | { type: 'SET_SELECTED_NODE'; payload: NetworkNode | null }
  | { type: 'SET_HOVERED_EDGE'; payload: NetworkEdge | null }
  | { type: 'SET_ACTIVE_VISUALIZATION'; payload: VisualizationType }
  | { type: 'SET_VISUALIZATION_DATA'; payload: { type: VisualizationType; data: any } }
  | { type: 'CLEAR_SELECTIONS' };

// Define the context interface
export interface AppContextType {
  state: AppState;
  setFilters: (filters: FilterState) => void;
  setSelectedNode: (node: NetworkNode | null) => void;
  setHoveredEdge: (edge: NetworkEdge | null) => void;
  setActiveVisualization: (type: VisualizationType) => void;
  setVisualizationData: (type: VisualizationType, data: any) => void;
  clearSelections: () => void;
}

// Initial state with default filters
const initialState: AppState = {
  filters: {
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
  },
  selectedNode: null,
  hoveredEdge: null,
  activeVisualization: 'network',
  visualizationData: {
    network: null,
    circular: null,
    sankey: null,
    heatmap: null,
    timeline: null,
    statistics: null
  }
};

// Reducer function to handle state updates
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    
    case 'SET_SELECTED_NODE':
      return { ...state, selectedNode: action.payload };
    
    case 'SET_HOVERED_EDGE':
      return { ...state, hoveredEdge: action.payload };
    
    case 'SET_ACTIVE_VISUALIZATION':
      return { ...state, activeVisualization: action.payload };
    
    case 'SET_VISUALIZATION_DATA':
      return { 
        ...state, 
        visualizationData: {
          ...state.visualizationData,
          [action.payload.type]: action.payload.data
        }
      };
    
    case 'CLEAR_SELECTIONS':
      return { ...state, selectedNode: null, hoveredEdge: null };
    
    default:
      return state;
  }
};

// Create the context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Context provider component
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Action creators
  const setFilters = (filters: FilterState) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  };

  const setSelectedNode = (node: NetworkNode | null) => {
    dispatch({ type: 'SET_SELECTED_NODE', payload: node });
  };

  const setHoveredEdge = (edge: NetworkEdge | null) => {
    dispatch({ type: 'SET_HOVERED_EDGE', payload: edge });
  };

  const setActiveVisualization = (type: VisualizationType) => {
    dispatch({ type: 'SET_ACTIVE_VISUALIZATION', payload: type });
  };

  const setVisualizationData = (type: VisualizationType, data: any) => {
    dispatch({ type: 'SET_VISUALIZATION_DATA', payload: { type, data } });
  };

  const clearSelections = () => {
    dispatch({ type: 'CLEAR_SELECTIONS' });
  };

  const contextValue: AppContextType = {
    state,
    setFilters,
    setSelectedNode,
    setHoveredEdge,
    setActiveVisualization,
    setVisualizationData,
    clearSelections
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the app context
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export default AppContext;