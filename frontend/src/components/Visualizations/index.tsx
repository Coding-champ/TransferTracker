import { TabConfig } from '../../types';

// Export all visualization components
export { default as NetworkVisualization } from './NetworkVisualization';
export { default as CircularVisualization } from './CircularVisualization';
export { default as SankeyVisualization } from './SankeyVisualization';
export { default as HeatmapVisualization } from './HeatmapVisualization';
export { default as TimelineVisualization } from './TimelineVisualization';
export { default as StatisticsVisualization } from './StatisticsVisualization';

// Export shared components
export { default as TabNavigation } from './shared/TabNavigation';
export { default as VisualizationContainer } from './shared/VisualizationContainer';
export { default as EmptyState } from './shared/EmptyState';
export { default as VisualizationLoading } from './shared/VisualizationLoading';

// Export types and constants
export type { TabConfig, VisualizationType, VisualizationProps } from '../../types';

// Default tab configuration
export const DEFAULT_TABS: TabConfig[] = [
  {
    id: 'network',
    label: 'Network',
    description: 'Interaktive Transfer-Netzwerk Darstellung',
    icon: '🕸️'
  },
  {
    id: 'circular',
    label: 'Circular',
    description: 'Liga-Hierarchie in konzentrischen Ringen',
    icon: '🔄',
    disabled: false
  },
  {
    id: 'sankey',
    label: 'Sankey',
    description: 'Transfer-Flüsse zwischen Ligen/Kontinenten',
    icon: '🌊',
    disabled: false
  },
  {
    id: 'heatmap',
    label: 'Heatmap',
    description: 'Transfer-Intensität zwischen Regionen',
    icon: '🗺️',
    disabled: false
  },
  {
    id: 'timeline',
    label: 'Timeline',
    description: 'Zeitlicher Verlauf der Transfers',
    icon: '📅',
    disabled: false
  },
  {
    id: 'statistics',
    label: 'Statistics',
    description: 'Erweiterte Transfer-Statistiken',
    icon: '📊',
    disabled: false
  }
];