/**
 * SelectionProvider - Isolated context for selection state management
 * Manages node/edge selections, hover states, and interaction states
 */

import React, { createContext, useReducer, ReactNode, useCallback } from 'react';
import { NetworkNode, NetworkEdge } from '../../types';

// Define selection state interface
interface SelectionState {
  selectedNode: NetworkNode | null;
  hoveredNode: NetworkNode | null;
  hoveredEdge: NetworkEdge | null;
  selectedTransfer: number | null;
  pinnedNodes: Set<string>;
  highlightedPaths: string[];
  interactionMode: 'select' | 'pan' | 'zoom' | 'drag';
  isDragging: boolean;
  isMultiSelectMode: boolean;
  selectedNodeHistory: NetworkNode[];
}

// Define selection action types
type SelectionAction =
  | { type: 'SET_SELECTED_NODE'; payload: NetworkNode | null }
  | { type: 'SET_HOVERED_NODE'; payload: NetworkNode | null }
  | { type: 'SET_HOVERED_EDGE'; payload: NetworkEdge | null }
  | { type: 'SET_SELECTED_TRANSFER'; payload: number | null }
  | { type: 'TOGGLE_NODE_PIN'; payload: string }
  | { type: 'SET_HIGHLIGHTED_PATHS'; payload: string[] }
  | { type: 'SET_INTERACTION_MODE'; payload: SelectionState['interactionMode'] }
  | { type: 'SET_IS_DRAGGING'; payload: boolean }
  | { type: 'SET_MULTI_SELECT_MODE'; payload: boolean }
  | { type: 'ADD_TO_SELECTION_HISTORY'; payload: NetworkNode }
  | { type: 'CLEAR_SELECTIONS' }
  | { type: 'CLEAR_HOVER_STATES' }
  | { type: 'CLEAR_ALL_PINS' };

// Define the context interface
interface SelectionContextType {
  state: SelectionState;
  setSelectedNode: (node: NetworkNode | null) => void;
  setHoveredNode: (node: NetworkNode | null) => void;
  setHoveredEdge: (edge: NetworkEdge | null) => void;
  setSelectedTransfer: (transferId: number | null) => void;
  toggleNodePin: (nodeId: string) => void;
  setHighlightedPaths: (paths: string[]) => void;
  setInteractionMode: (mode: SelectionState['interactionMode']) => void;
  setIsDragging: (isDragging: boolean) => void;
  setMultiSelectMode: (isMultiSelect: boolean) => void;
  addToSelectionHistory: (node: NetworkNode) => void;
  clearSelections: () => void;
  clearHoverStates: () => void;
  clearAllPins: () => void;
  isNodePinned: (nodeId: string) => boolean;
  isPathHighlighted: (path: string) => boolean;
}

// Initial selection state
const initialSelectionState: SelectionState = {
  selectedNode: null,
  hoveredNode: null,
  hoveredEdge: null,
  selectedTransfer: null,
  pinnedNodes: new Set(),
  highlightedPaths: [],
  interactionMode: 'select',
  isDragging: false,
  isMultiSelectMode: false,
  selectedNodeHistory: []
};

// Reducer function with optimized updates
const selectionReducer = (state: SelectionState, action: SelectionAction): SelectionState => {
  switch (action.type) {
    case 'SET_SELECTED_NODE':
      return {
        ...state,
        selectedNode: action.payload
      };

    case 'SET_HOVERED_NODE':
      return {
        ...state,
        hoveredNode: action.payload
      };

    case 'SET_HOVERED_EDGE':
      return {
        ...state,
        hoveredEdge: action.payload
      };

    case 'SET_SELECTED_TRANSFER':
      return {
        ...state,
        selectedTransfer: action.payload
      };

    case 'TOGGLE_NODE_PIN':
      const newPinnedNodes = new Set(state.pinnedNodes);
      if (newPinnedNodes.has(action.payload)) {
        newPinnedNodes.delete(action.payload);
      } else {
        newPinnedNodes.add(action.payload);
      }
      return {
        ...state,
        pinnedNodes: newPinnedNodes
      };

    case 'SET_HIGHLIGHTED_PATHS':
      return {
        ...state,
        highlightedPaths: action.payload
      };

    case 'SET_INTERACTION_MODE':
      return {
        ...state,
        interactionMode: action.payload
      };

    case 'SET_IS_DRAGGING':
      return {
        ...state,
        isDragging: action.payload
      };

    case 'SET_MULTI_SELECT_MODE':
      return {
        ...state,
        isMultiSelectMode: action.payload
      };

    case 'ADD_TO_SELECTION_HISTORY':
      const newHistory = [...state.selectedNodeHistory];
      // Remove duplicates and limit history size
      const existingIndex = newHistory.findIndex(n => n.id === action.payload.id);
      if (existingIndex >= 0) {
        newHistory.splice(existingIndex, 1);
      }
      newHistory.unshift(action.payload);
      // Keep only last 10 selections
      if (newHistory.length > 10) {
        newHistory.splice(10);
      }
      return {
        ...state,
        selectedNodeHistory: newHistory
      };

    case 'CLEAR_SELECTIONS':
      return {
        ...state,
        selectedNode: null,
        hoveredNode: null,
        hoveredEdge: null,
        selectedTransfer: null,
        highlightedPaths: []
      };

    case 'CLEAR_HOVER_STATES':
      return {
        ...state,
        hoveredNode: null,
        hoveredEdge: null
      };

    case 'CLEAR_ALL_PINS':
      return {
        ...state,
        pinnedNodes: new Set()
      };

    default:
      return state;
  }
};

// Create the context
const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

// Context provider component
interface SelectionProviderProps {
  children: ReactNode;
}

export const SelectionProvider: React.FC<SelectionProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(selectionReducer, initialSelectionState);

  // Memoized action creators
  const setSelectedNode = useCallback((node: NetworkNode | null) => {
    dispatch({ type: 'SET_SELECTED_NODE', payload: node });
    if (node) {
      dispatch({ type: 'ADD_TO_SELECTION_HISTORY', payload: node });
    }
  }, []);

  const setHoveredNode = useCallback((node: NetworkNode | null) => {
    dispatch({ type: 'SET_HOVERED_NODE', payload: node });
  }, []);

  const setHoveredEdge = useCallback((edge: NetworkEdge | null) => {
    dispatch({ type: 'SET_HOVERED_EDGE', payload: edge });
  }, []);

  const setSelectedTransfer = useCallback((transferId: number | null) => {
    dispatch({ type: 'SET_SELECTED_TRANSFER', payload: transferId });
  }, []);

  const toggleNodePin = useCallback((nodeId: string) => {
    dispatch({ type: 'TOGGLE_NODE_PIN', payload: nodeId });
  }, []);

  const setHighlightedPaths = useCallback((paths: string[]) => {
    dispatch({ type: 'SET_HIGHLIGHTED_PATHS', payload: paths });
  }, []);

  const setInteractionMode = useCallback((mode: SelectionState['interactionMode']) => {
    dispatch({ type: 'SET_INTERACTION_MODE', payload: mode });
  }, []);

  const setIsDragging = useCallback((isDragging: boolean) => {
    dispatch({ type: 'SET_IS_DRAGGING', payload: isDragging });
  }, []);

  const setMultiSelectMode = useCallback((isMultiSelect: boolean) => {
    dispatch({ type: 'SET_MULTI_SELECT_MODE', payload: isMultiSelect });
  }, []);

  const addToSelectionHistory = useCallback((node: NetworkNode) => {
    dispatch({ type: 'ADD_TO_SELECTION_HISTORY', payload: node });
  }, []);

  const clearSelections = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTIONS' });
  }, []);

  const clearHoverStates = useCallback(() => {
    dispatch({ type: 'CLEAR_HOVER_STATES' });
  }, []);

  const clearAllPins = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_PINS' });
  }, []);

  // Utility functions
  const isNodePinned = useCallback((nodeId: string) => {
    return state.pinnedNodes.has(nodeId);
  }, [state.pinnedNodes]);

  const isPathHighlighted = useCallback((path: string) => {
    return state.highlightedPaths.includes(path);
  }, [state.highlightedPaths]);

  const contextValue: SelectionContextType = {
    state,
    setSelectedNode,
    setHoveredNode,
    setHoveredEdge,
    setSelectedTransfer,
    toggleNodePin,
    setHighlightedPaths,
    setInteractionMode,
    setIsDragging,
    setMultiSelectMode,
    addToSelectionHistory,
    clearSelections,
    clearHoverStates,
    clearAllPins,
    isNodePinned,
    isPathHighlighted
  };

  return (
    <SelectionContext.Provider value={contextValue}>
      {children}
    </SelectionContext.Provider>
  );
};

// Export context for direct access
export { SelectionContext };

// Custom hook for using selection context
export const useSelectionContext = (): SelectionContextType => {
  const context = React.useContext(SelectionContext);
  if (context === undefined) {
    throw new Error('useSelectionContext must be used within a SelectionProvider');
  }
  return context;
};