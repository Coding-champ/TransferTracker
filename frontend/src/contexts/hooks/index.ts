/**
 * Context hooks index
 * Re-exports all context hooks for easy importing
 */

export { useFilterContext } from '../providers/FilterProvider';
export { useDataContext } from '../providers/DataProvider';
export { useSelectionContext } from '../providers/SelectionProvider';
export { useVisualizationContext } from '../providers/VisualizationProvider';
export { useToast } from '../ToastContext';

// Combined hook for backward compatibility
export { useAppContext } from '../AppContextNew';