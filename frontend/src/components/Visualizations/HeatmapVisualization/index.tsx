import React, { useState, useMemo } from 'react';
import { NetworkData, FilterState } from '../../../types/index';
import { HeatmapGrid } from '../../../visualizations/heatmap/components/HeatmapGrid';
import { HeatmapTooltip } from '../../../visualizations/heatmap/components/HeatmapTooltip';
import { TransferDetailsModal } from '../../../visualizations/heatmap/components/TransferDetailsModal';
import { useHeatmapData } from '../../../visualizations/heatmap/hooks/useHeatmapData';
import { useDrillDown } from '../../../visualizations/heatmap/hooks/useDrillDown';
import { 
  HeatmapMode, 
  HeatmapCell, 
  HeatmapConfig, 
  HeatmapTooltipData,
  TransferDetail
} from '../../../visualizations/heatmap/types';
import { createMockNetworkData, createMockFilters } from '../../../utils/mockData';

interface HeatmapVisualizationProps {
  readonly networkData: NetworkData | null;
  readonly filters: FilterState;
  readonly width?: number;
  readonly height?: number;
}

export const HeatmapVisualization: React.FC<HeatmapVisualizationProps> = ({
  networkData,
  filters,
  width = 1200,
  height = 600
}) => {
  const [mode, setMode] = useState<HeatmapMode>('value');
  const [tooltipData, setTooltipData] = useState<HeatmapTooltipData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTransfers, setModalTransfers] = useState<TransferDetail[]>([]);
  const [modalSource, setModalSource] = useState('');
  const [modalTarget, setModalTarget] = useState('');

  // Drill-down state management
  const {
    state: drillDownState,
    canGoBack,
    goBack,
    handleCellClick,
    getCurrentLevelInfo,
    getBreadcrumbs
  } = useDrillDown();

  // Configuration
  const config = useMemo((): HeatmapConfig => ({
    width,
    height,
    margin: { top: 80, right: 40, bottom: 120, left: 140 },
    cellPadding: 0.05,
    animationDuration: 600
  }), [width, height]);

  // Use mock data if real data is not available (for development/testing)
  const effectiveNetworkData = useMemo(() => {
    if (networkData && networkData.nodes.length > 0 && networkData.edges.length > 0) {
      return networkData;
    }
    // Use mock data for testing when real data is not available
    return createMockNetworkData();
  }, [networkData]);

  const effectiveFilters = useMemo(() => {
    if (networkData && networkData.nodes.length > 0) {
      return filters;
    }
    // Use mock filters when using mock data
    return createMockFilters();
  }, [filters, networkData]);

  // Process data with modular hook
  const heatmapData = useHeatmapData({
    networkData: effectiveNetworkData,
    filters: effectiveFilters,
    drillDownState
  });

  // Handle cell interactions
  const handleCellHover = (cell: HeatmapCell | null, position?: { x: number; y: number }) => {
    if (cell && position) {
      setTooltipData({ cell, position });
    } else {
      setTooltipData(null);
    }
  };

  const handleCellClickWithModal = (cell: HeatmapCell) => {
    if (drillDownState.level === 'club') {
      // Show transfer details modal instead of drilling down further
      setModalSource(cell.source);
      setModalTarget(cell.target);
      setModalTransfers(generateMockTransfers(cell)); // In real app, fetch from API
      setShowModal(true);
    } else {
      // Use drill-down navigation
      handleCellClick(cell);
    }
  };

  const levelInfo = getCurrentLevelInfo();
  const breadcrumbs = getBreadcrumbs();

  // Show a different message when using mock data
  const usingMockData = !networkData || networkData.nodes.length === 0 || networkData.edges.length === 0;

  if (!effectiveNetworkData?.edges?.length) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
        style={{ width, height }}
      >
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">🗺️</div>
          <div className="text-lg font-medium">Enhanced Heatmap Visualization</div>
          <div className="text-sm mt-2">No data available</div>
          <div className="text-xs mt-1">Apply filters to see interactive transfer heatmap</div>
        </div>
      </div>
    );
  }

  if (!heatmapData) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
        style={{ width, height }}
      >
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-lg font-medium">Processing Data</div>
          <div className="text-sm mt-2">Building heatmap matrix...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Header with navigation */}
      <div className="mb-4">
        {usingMockData && (
          <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-blue-800 text-sm">
              📊 Demo Mode: Using sample data (backend not connected)
            </span>
          </div>
        )}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{levelInfo.title}</h3>
            <p className="text-sm text-gray-600">{levelInfo.description}</p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Mode selector */}
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as HeatmapMode)}
              className="text-sm border rounded px-3 py-1"
            >
              <option value="value">Transfer Value</option>
              <option value="count">Transfer Count</option>
              <option value="success-rate">Success Rate</option>
            </select>
            
            {/* Back button */}
            {canGoBack && (
              <button
                onClick={goBack}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                ← Back
              </button>
            )}
          </div>
        </div>

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.level}>
              {index > 0 && <span className="text-gray-400">→</span>}
              <button
                onClick={crumb.onClick}
                className={`px-2 py-1 rounded ${
                  crumb.isActive 
                    ? 'bg-blue-100 text-blue-800 font-medium' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {crumb.label}
              </button>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Main heatmap */}
      <div className="border rounded-lg bg-white">
        <HeatmapGrid
          data={heatmapData}
          config={config}
          mode={mode}
          onCellHover={handleCellHover}
          onCellClick={handleCellClickWithModal}
          className="drop-shadow-sm"
        />
      </div>

      {/* Level indicator */}
      <div className="absolute top-4 right-4 bg-white border rounded-lg p-2 shadow-sm">
        <div className="text-xs text-gray-600">Level {levelInfo.level}/{levelInfo.maxLevel}</div>
        <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
          <div 
            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
            style={{ width: `${(levelInfo.level / levelInfo.maxLevel) * 100}%` }}
          />
        </div>
      </div>

      {/* Stats summary */}
      <div className="absolute bottom-4 left-4 bg-white border rounded-lg p-3 shadow-sm">
        <div className="text-xs text-gray-600 mb-1">Matrix Stats</div>
        <div className="space-y-1 text-xs">
          <div>{heatmapData.labels.length} entities</div>
          <div>{heatmapData.matrix.length} connections</div>
          <div>Max {mode}: {mode === 'value' ? '€' + (heatmapData.maxValue / 1000000).toFixed(1) + 'M' : heatmapData.maxCount}</div>
        </div>
      </div>

      {/* Tooltip */}
      <HeatmapTooltip data={tooltipData} mode={mode} />

      {/* Transfer Details Modal */}
      <TransferDetailsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        sourceClub={modalSource}
        targetClub={modalTarget}
        transfers={modalTransfers}
      />
    </div>
  );
};

// Mock function to generate transfer details - replace with real API call
function generateMockTransfers(cell: HeatmapCell): TransferDetail[] {
  const transfers: TransferDetail[] = [];
  const count = Math.min(cell.count, 10); // Limit for demo
  
  for (let i = 0; i < count; i++) {
    transfers.push({
      id: `transfer-${i}`,
      playerName: `Player ${i + 1}`,
      position: ['GK', 'DF', 'MF', 'FW'][Math.floor(Math.random() * 4)],
      age: 18 + Math.floor(Math.random() * 15),
      value: cell.value * (0.5 + Math.random() * 0.5) / count,
      date: new Date(2023 - Math.floor(Math.random() * 3), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString(),
      success: Math.random() > 0.3,
      stats: {
        gamesPlayed: Math.floor(Math.random() * 30),
        goals: Math.floor(Math.random() * 10),
        assists: Math.floor(Math.random() * 8)
      }
    });
  }
  
  return transfers;
}

export default HeatmapVisualization;