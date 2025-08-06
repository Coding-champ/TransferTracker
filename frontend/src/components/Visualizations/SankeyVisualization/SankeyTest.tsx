import React from 'react';
import { VisualizationProps } from '../../../types';
import { useSankeyData, GroupingMode } from './hooks/useSankeyData';
import SankeyChart from './components/SankeyChart';
import SankeyControls from './components/SankeyControls';
import SankeyEmptyState from './components/SankeyEmptyState';
import { SANKEY_MOCK_DATA } from './utils/mockData';

interface SankeyVisualizationProps extends VisualizationProps {}

// Simple test component to bypass the infinite re-render issue
export const SankeyVisualization: React.FC<SankeyVisualizationProps> = ({
  width = 1200,
  height = 600
}) => {
  const [groupingMode, setGroupingMode] = React.useState<GroupingMode>('league');
  
  // Use mock data directly for testing
  const { nodes, links, hasValidData } = useSankeyData(SANKEY_MOCK_DATA, groupingMode);

  // Show empty state if no valid data
  if (!hasValidData) {
    return <SankeyEmptyState width={width} height={height} />;
  }

  return (
    <div className="relative">
      <SankeyControls
        groupingMode={groupingMode}
        onGroupingModeChange={setGroupingMode}
      />
      
      <SankeyChart
        nodes={nodes}
        links={links}
        width={width}
        height={height}
        groupingMode={groupingMode}
      />
    </div>
  );
};

export default SankeyVisualization;