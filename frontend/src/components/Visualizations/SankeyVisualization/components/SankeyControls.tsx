import React from 'react';
import { GroupingMode } from '../hooks/useSankeyData';

interface SankeyControlsProps {
  groupingMode: GroupingMode;
  onGroupingModeChange: (mode: GroupingMode) => void;
}

const SankeyControls: React.FC<SankeyControlsProps> = ({
  groupingMode,
  onGroupingModeChange
}) => {
  return (
    <div className="absolute top-4 right-4 z-10">
      <div className="bg-white border rounded-lg p-2 shadow-sm">
        <label className="block text-xs font-medium text-gray-700 mb-1">Group by:</label>
        <select
          value={groupingMode}
          onChange={(e) => onGroupingModeChange(e.target.value as GroupingMode)}
          className="text-xs border rounded px-2 py-1"
        >
          <option value="continent">Continent</option>
          <option value="league">League</option>
          <option value="position">Direction</option>
        </select>
      </div>
    </div>
  );
};

export default SankeyControls;