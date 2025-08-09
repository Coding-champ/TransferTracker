/**
 * Contexts index - Export all context providers and hooks
 */

// Export all providers
export { FilterProvider } from './providers/FilterProvider';
export { DataProvider } from './providers/DataProvider';
export { SelectionProvider } from './providers/SelectionProvider';
export { VisualizationProvider } from './providers/VisualizationProvider';
export { ToastProvider } from './ToastContext';

// Export combined app provider
export { AppProvider as NewAppProvider } from './AppContextNew';

// Export all hooks
export * from './hooks';

// Keep original AppContext export for backward compatibility
export { AppProvider, useAppContext } from './AppContext';
export type { AppContextType } from './AppContext';

// Export the original AppContext as legacy for gradual migration
export { default as LegacyAppContext } from './AppContext';