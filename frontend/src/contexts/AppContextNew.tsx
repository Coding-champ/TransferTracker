/**
 * AppContext - Combined context provider
 * Orchestrates all specialized providers while maintaining backward compatibility
 */

import React, { ReactNode } from 'react';
import { FilterProvider, useFilterContext } from './providers/FilterProvider';
import { DataProvider, useDataContext } from './providers/DataProvider';
import { SelectionProvider, useSelectionContext } from './providers/SelectionProvider';
import { VisualizationProvider, useVisualizationContext } from './providers/VisualizationProvider';
import { ToastProvider } from './ToastContext';

// Combined provider component
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <ToastProvider>
      <FilterProvider>
        <DataProvider>
          <SelectionProvider>
            <VisualizationProvider>
              {children}
            </VisualizationProvider>
          </SelectionProvider>
        </DataProvider>
      </FilterProvider>
    </ToastProvider>
  );
};

// Re-export all context hooks for convenience
export { useFilterContext } from './providers/FilterProvider';
export { useDataContext } from './providers/DataProvider';
export { useSelectionContext } from './providers/SelectionProvider';
export { useVisualizationContext } from './providers/VisualizationProvider';
export { useToast } from './ToastContext';

// Legacy compatibility hook that combines all contexts
// This maintains backward compatibility with existing code
export const useAppContext = () => {
  const filterContext = useFilterContext();
  const dataContext = useDataContext();
  const selectionContext = useSelectionContext();
  const visualizationContext = useVisualizationContext();

  // Legacy interface mapping
  return {
    // Legacy state mapping
    state: {
      filters: filterContext.filters,
      selectedNode: selectionContext.state.selectedNode,
      hoveredEdge: selectionContext.state.hoveredEdge,
      activeVisualization: visualizationContext.state.activeVisualization,
      visualizationData: {
        network: dataContext.state.networkData,
        circular: null, // These would be populated by specific hooks
        sankey: null,
        heatmap: null,
        timeline: null,
        statistics: dataContext.state.statistics
      }
    },
    
    // Legacy action mapping
    setFilters: filterContext.setFilters,
    setSelectedNode: selectionContext.setSelectedNode,
    setHoveredEdge: selectionContext.setHoveredEdge,
    setActiveVisualization: visualizationContext.setActiveVisualization,
    setVisualizationData: (type: string, data: any) => {
      // Map to appropriate data context methods
      switch (type) {
        case 'network':
          dataContext.setNetworkData(data);
          break;
        case 'statistics':
          dataContext.setStatistics(data);
          break;
        // Add other cases as needed
      }
    },
    clearSelections: selectionContext.clearSelections,
    
    // Additional context access for advanced usage
    contexts: {
      filter: filterContext,
      data: dataContext,
      selection: selectionContext,
      visualization: visualizationContext
    }
  };
};

// For complete backward compatibility, export the original interface too
export interface AppContextType {
  state: {
    filters: any;
    selectedNode: any;
    hoveredEdge: any;
    activeVisualization: any;
    visualizationData: any;
  };
  setFilters: (filters: any) => void;
  setSelectedNode: (node: any) => void;
  setHoveredEdge: (edge: any) => void;
  setActiveVisualization: (type: any) => void;
  setVisualizationData: (type: string, data: any) => void;
  clearSelections: () => void;
}

export default AppProvider;