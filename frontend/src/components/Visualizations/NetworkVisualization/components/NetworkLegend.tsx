import React from 'react';
import * as d3 from 'd3';
import { NetworkData } from '../../../../types';

interface NetworkLegendProps {
  networkData: NetworkData;
}

const NetworkLegend: React.FC<NetworkLegendProps> = ({ networkData }) => {
  // Enhanced color scale for leagues
  const colorScale = d3.scaleOrdinal<string>()
    .domain(['Bundesliga', 'Premier League', 'La Liga', 'Serie A', 'Ligue 1', 'Primera División', 'Série A', 'MLS', 'Championship', '2. Bundesliga'])
    .range(['#d70909', '#3d0845', '#ff6b35', '#146441ff', '#1e3a8a','#748ccfff','#4f895fff', '#cf4e84ff', '#696c74ff', '#a30e0eff']);

  const uniqueLeagues = Array.from(new Set(networkData.nodes.map(n => n.league))).slice(0, 10);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h4 className="text-lg font-semibold mb-4">Enhanced Legend</h4>
      <div className="space-y-3">
        {uniqueLeagues.map(league => (
          <div key={league} className="flex items-center">
            <div 
              className="w-4 h-4 rounded-full mr-3 border border-gray-300"
              style={{ backgroundColor: colorScale(league) }}
            ></div>
            <span className="text-sm font-medium">{league}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
        <div className="text-xs font-medium text-gray-700 mb-2">Performance Indicators:</div>
        <div className="flex items-center text-xs text-gray-600">
          <div className="w-3 h-3 rounded-full border-2 border-green-500 border-dashed mr-2"></div>
          High success rate (&gt;70%)
        </div>
        <div className="flex items-center text-xs text-gray-600">
          <div className="w-3 h-3 rounded-full border-2 border-red-500 border-dashed mr-2"></div>
          Low success rate (&lt;30%)
        </div>
        <div className="text-xs text-gray-600">• Node size = Transfer activity</div>
        <div className="text-xs text-gray-600">• Edge thickness = Transfer volume</div>
      </div>
    </div>
  );
};

export default React.memo(NetworkLegend);