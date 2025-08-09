/**
 * VisualizationProvider - Isolated context for visualization state management
 * Manages visualization types, settings, and rendering states
 */

import React, { createContext, useReducer, ReactNode, useCallback } from 'react';
import { VisualizationType } from '../../types';

// Define visualization settings interfaces
interface VisualizationSettings {
  network: {
    showLabels: boolean;
    showROI: boolean;
    nodeSize: 'fixed' | 'degree' | 'transferValue';
    edgeThickness: 'fixed' | 'transferCount' | 'transferValue';
    colorScheme: 'league' | 'country' | 'continent' | 'performance';
    layout: 'force' | 'circular' | 'hierarchical';
    physics: {
      enabled: boolean;
      gravity: number;
      repulsion: number;
      damping: number;
    };
  };
  circular: {
    showLabels: boolean;
    groupBy: 'league' | 'country' | 'continent';
    sortBy: 'transferCount' | 'transferValue' | 'alphabetical';
    showConnections: boolean;
  };
  sankey: {
    showLabels: boolean;
    direction: 'horizontal' | 'vertical';
    nodeWidth: number;
    nodePadding: number;
  };
  heatmap: {
    colorScheme: 'sequential' | 'diverging';
    showValues: boolean;
    aggregation: 'count' | 'sum' | 'avg';
  };
}

// Define visualization state interface
interface VisualizationState {
  activeVisualization: VisualizationType;
  settings: VisualizationSettings;
  renderStates: {
    [K in VisualizationType]: {
      isRendering: boolean;
      lastRenderTime: number | null;
      error: string | null;
    };
  };
  containerSizes: {
    [K in VisualizationType]: {
      width: number;
      height: number;
    };
  };
  interactions: {
    zoomLevel: number;
    panOffset: { x: number; y: number };
    animationDuration: number;
    enableAnimations: boolean;
  };
}

// Define visualization action types
type VisualizationAction =
  | { type: 'SET_ACTIVE_VISUALIZATION'; payload: VisualizationType }
  | { type: 'UPDATE_VISUALIZATION_SETTING'; payload: { visualization: keyof VisualizationSettings; setting: string; value: any } }
  | { type: 'SET_RENDER_STATE'; payload: { visualization: VisualizationType; isRendering: boolean; error?: string | null } }
  | { type: 'SET_CONTAINER_SIZE'; payload: { visualization: VisualizationType; width: number; height: number } }
  | { type: 'SET_ZOOM_LEVEL'; payload: number }
  | { type: 'SET_PAN_OFFSET'; payload: { x: number; y: number } }
  | { type: 'SET_ANIMATION_DURATION'; payload: number }
  | { type: 'TOGGLE_ANIMATIONS' }
  | { type: 'RESET_INTERACTIONS' }
  | { type: 'RESET_VISUALIZATION_SETTINGS'; payload: keyof VisualizationSettings };

// Define the context interface
interface VisualizationContextType {
  state: VisualizationState;
  setActiveVisualization: (type: VisualizationType) => void;
  updateVisualizationSetting: <T extends keyof VisualizationSettings>(
    visualization: T,
    setting: keyof VisualizationSettings[T],
    value: any
  ) => void;
  setRenderState: (visualization: VisualizationType, isRendering: boolean, error?: string | null) => void;
  setContainerSize: (visualization: VisualizationType, width: number, height: number) => void;
  setZoomLevel: (level: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  setAnimationDuration: (duration: number) => void;
  toggleAnimations: () => void;
  resetInteractions: () => void;
  resetVisualizationSettings: (visualization: keyof VisualizationSettings) => void;
}

// Initial visualization state
const initialVisualizationState: VisualizationState = {
  activeVisualization: 'network',
  settings: {
    network: {
      showLabels: false,
      showROI: false,
      nodeSize: 'degree',
      edgeThickness: 'transferCount',
      colorScheme: 'league',
      layout: 'force',
      physics: {
        enabled: true,
        gravity: 0.1,
        repulsion: -100,
        damping: 0.9
      }
    },
    circular: {
      showLabels: true,
      groupBy: 'league',
      sortBy: 'transferCount',
      showConnections: true
    },
    sankey: {
      showLabels: true,
      direction: 'horizontal',
      nodeWidth: 15,
      nodePadding: 10
    },
    heatmap: {
      colorScheme: 'sequential',
      showValues: true,
      aggregation: 'count'
    }
  },
  renderStates: {
    network: { isRendering: false, lastRenderTime: null, error: null },
    circular: { isRendering: false, lastRenderTime: null, error: null },
    sankey: { isRendering: false, lastRenderTime: null, error: null },
    heatmap: { isRendering: false, lastRenderTime: null, error: null },
    timeline: { isRendering: false, lastRenderTime: null, error: null },
    statistics: { isRendering: false, lastRenderTime: null, error: null }
  },
  containerSizes: {
    network: { width: 800, height: 600 },
    circular: { width: 800, height: 600 },
    sankey: { width: 800, height: 600 },
    heatmap: { width: 800, height: 600 },
    timeline: { width: 800, height: 400 },
    statistics: { width: 800, height: 600 }
  },
  interactions: {
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 },
    animationDuration: 300,
    enableAnimations: true
  }
};

// Reducer function with optimized updates
const visualizationReducer = (state: VisualizationState, action: VisualizationAction): VisualizationState => {
  switch (action.type) {
    case 'SET_ACTIVE_VISUALIZATION':
      return {
        ...state,
        activeVisualization: action.payload
      };

    case 'UPDATE_VISUALIZATION_SETTING':
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload.visualization]: {
            ...state.settings[action.payload.visualization],
            [action.payload.setting]: action.payload.value
          }
        }
      };

    case 'SET_RENDER_STATE':
      return {
        ...state,
        renderStates: {
          ...state.renderStates,
          [action.payload.visualization]: {
            isRendering: action.payload.isRendering,
            lastRenderTime: action.payload.isRendering ? null : Date.now(),
            error: action.payload.error || null
          }
        }
      };

    case 'SET_CONTAINER_SIZE':
      return {
        ...state,
        containerSizes: {
          ...state.containerSizes,
          [action.payload.visualization]: {
            width: action.payload.width,
            height: action.payload.height
          }
        }
      };

    case 'SET_ZOOM_LEVEL':
      return {
        ...state,
        interactions: {
          ...state.interactions,
          zoomLevel: action.payload
        }
      };

    case 'SET_PAN_OFFSET':
      return {
        ...state,
        interactions: {
          ...state.interactions,
          panOffset: action.payload
        }
      };

    case 'SET_ANIMATION_DURATION':
      return {
        ...state,
        interactions: {
          ...state.interactions,
          animationDuration: action.payload
        }
      };

    case 'TOGGLE_ANIMATIONS':
      return {
        ...state,
        interactions: {
          ...state.interactions,
          enableAnimations: !state.interactions.enableAnimations
        }
      };

    case 'RESET_INTERACTIONS':
      return {
        ...state,
        interactions: {
          zoomLevel: 1,
          panOffset: { x: 0, y: 0 },
          animationDuration: 300,
          enableAnimations: true
        }
      };

    case 'RESET_VISUALIZATION_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload]: initialVisualizationState.settings[action.payload]
        }
      };

    default:
      return state;
  }
};

// Create the context
const VisualizationContext = createContext<VisualizationContextType | undefined>(undefined);

// Context provider component
interface VisualizationProviderProps {
  children: ReactNode;
}

export const VisualizationProvider: React.FC<VisualizationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(visualizationReducer, initialVisualizationState);

  // Memoized action creators
  const setActiveVisualization = useCallback((type: VisualizationType) => {
    dispatch({ type: 'SET_ACTIVE_VISUALIZATION', payload: type });
  }, []);

  const updateVisualizationSetting = useCallback(<T extends keyof VisualizationSettings>(
    visualization: T,
    setting: keyof VisualizationSettings[T],
    value: any
  ) => {
    dispatch({
      type: 'UPDATE_VISUALIZATION_SETTING',
      payload: { visualization, setting: setting as string, value }
    });
  }, []);

  const setRenderState = useCallback((
    visualization: VisualizationType,
    isRendering: boolean,
    error?: string | null
  ) => {
    dispatch({
      type: 'SET_RENDER_STATE',
      payload: { visualization, isRendering, error }
    });
  }, []);

  const setContainerSize = useCallback((
    visualization: VisualizationType,
    width: number,
    height: number
  ) => {
    dispatch({
      type: 'SET_CONTAINER_SIZE',
      payload: { visualization, width, height }
    });
  }, []);

  const setZoomLevel = useCallback((level: number) => {
    dispatch({ type: 'SET_ZOOM_LEVEL', payload: level });
  }, []);

  const setPanOffset = useCallback((offset: { x: number; y: number }) => {
    dispatch({ type: 'SET_PAN_OFFSET', payload: offset });
  }, []);

  const setAnimationDuration = useCallback((duration: number) => {
    dispatch({ type: 'SET_ANIMATION_DURATION', payload: duration });
  }, []);

  const toggleAnimations = useCallback(() => {
    dispatch({ type: 'TOGGLE_ANIMATIONS' });
  }, []);

  const resetInteractions = useCallback(() => {
    dispatch({ type: 'RESET_INTERACTIONS' });
  }, []);

  const resetVisualizationSettings = useCallback((visualization: keyof VisualizationSettings) => {
    dispatch({ type: 'RESET_VISUALIZATION_SETTINGS', payload: visualization });
  }, []);

  const contextValue: VisualizationContextType = {
    state,
    setActiveVisualization,
    updateVisualizationSetting,
    setRenderState,
    setContainerSize,
    setZoomLevel,
    setPanOffset,
    setAnimationDuration,
    toggleAnimations,
    resetInteractions,
    resetVisualizationSettings
  };

  return (
    <VisualizationContext.Provider value={contextValue}>
      {children}
    </VisualizationContext.Provider>
  );
};

// Export context for direct access
export { VisualizationContext };

// Custom hook for using visualization context
export const useVisualizationContext = (): VisualizationContextType => {
  const context = React.useContext(VisualizationContext);
  if (context === undefined) {
    throw new Error('useVisualizationContext must be used within a VisualizationProvider');
  }
  return context;
};