import React, { useState } from 'react';
import { VisualizationProps } from '../../../types';
import { useSankeyData, GroupingMode } from './hooks/useSankeyData';
import SankeyChart from './components/SankeyChart';
import SankeyControls from './components/SankeyControls';
import SankeyEmptyState from './components/SankeyEmptyState';

interface SankeyVisualizationProps extends VisualizationProps {}

export const SankeyVisualization: React.FC<SankeyVisualizationProps> = ({
  networkData,
  width = 1200,
  height = 600
}) => {
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('league');
  
  // Process the real network data
  const { nodes, links, hasValidData } = useSankeyData(networkData, groupingMode);

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