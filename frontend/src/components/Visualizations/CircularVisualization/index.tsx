import React, { useState } from 'react';
import * as d3 from 'd3';
import { VisualizationProps } from '../../../types';
import { useAppContext } from '../../../contexts/AppContext';
import { useD3Container } from '../shared/hooks/useD3Container';
import { useCircularLayout } from './hooks/useCircularLayout';
import { useCircularInteraction } from './hooks/useCircularInteraction';
import { useCircularZoom } from './hooks/useCircularZoom';
import { 
  CircularVisualizationConfig,
  CircularNode
} from './types';
import { createLeagueColorScale } from '../shared/utils/d3-helpers';
import { 
  animateNodesEnter,
  animateArcsEnter,
  animateTierCircles,
  animateFilterTransition 
} from './utils/circularAnimations';

interface CircularVisualizationProps extends VisualizationProps {}

export const CircularVisualization: React.FC<CircularVisualizationProps> = ({
  networkData,
  filters,
  width = 800,
  height = 800
}) => {
  const [rotation, setRotation] = useState(0);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);

  // Get app context for filter management
  const { setFilters } = useAppContext();

  // Handle league selection with useCallback for performance
  const handleLeagueSelection = React.useCallback((node: CircularNode) => {
    setSelectedLeague(node.league);
    // Note: Zoom focusing is now handled internally by the zoom hook
  }, []);

  // Handle league filtering with useCallback
  const handleLeagueFilter = React.useCallback((league: string) => {
    // Integrate with global filter state
    setFilters({
      ...filters,
      leagues: [league]
    });
  }, [filters, setFilters]);

  // Create mock data for demo when no real data is available
  const createMockData = React.useCallback(() => {
    return {
      nodes: [
        { id: '1', name: 'Bayern Munich', league: 'Bundesliga', leagueTier: 1, stats: { transfersIn: 5, transfersOut: 3, totalSpent: 50000000, totalReceived: 30000000, netSpend: -20000000 } },
        { id: '2', name: 'Real Madrid', league: 'La Liga', leagueTier: 1, stats: { transfersIn: 4, transfersOut: 2, totalSpent: 80000000, totalReceived: 40000000, netSpend: -40000000 } },
        { id: '3', name: 'Manchester City', league: 'Premier League', leagueTier: 1, stats: { transfersIn: 6, transfersOut: 1, totalSpent: 100000000, totalReceived: 20000000, netSpend: -80000000 } },
        { id: '4', name: 'PSG', league: 'Ligue 1', leagueTier: 1, stats: { transfersIn: 3, transfersOut: 4, totalSpent: 60000000, totalReceived: 70000000, netSpend: 10000000 } },
        { id: '5', name: 'Juventus', league: 'Serie A', leagueTier: 1, stats: { transfersIn: 2, transfersOut: 5, totalSpent: 30000000, totalReceived: 80000000, netSpend: 50000000 } },
        { id: '6', name: 'Borussia Dortmund', league: 'Bundesliga', leagueTier: 1, stats: { transfersIn: 4, transfersOut: 3, totalSpent: 40000000, totalReceived: 60000000, netSpend: 20000000 } },
        { id: '7', name: 'Ajax', league: 'Eredivisie', leagueTier: 2, stats: { transfersIn: 2, transfersOut: 6, totalSpent: 15000000, totalReceived: 90000000, netSpend: 75000000 } },
        { id: '8', name: 'Porto', league: 'Primeira Liga', leagueTier: 2, stats: { transfersIn: 3, transfersOut: 4, totalSpent: 20000000, totalReceived: 50000000, netSpend: 30000000 } },
        { id: '9', name: 'Celtic', league: 'Scottish Premiership', leagueTier: 3, stats: { transfersIn: 1, transfersOut: 2, totalSpent: 5000000, totalReceived: 15000000, netSpend: 10000000 } },
        { id: '10', name: 'Red Bull Salzburg', league: 'Austrian Bundesliga', leagueTier: 3, stats: { transfersIn: 2, transfersOut: 3, totalSpent: 8000000, totalReceived: 25000000, netSpend: 17000000 } }
      ],
      edges: [
        { id: 'e1', source: '1', target: '2', transfers: [], stats: { totalValue: 25000000, transferCount: 1 } },
        { id: 'e2', source: '3', target: '1', transfers: [], stats: { totalValue: 40000000, transferCount: 2 } },
        { id: 'e3', source: '7', target: '3', transfers: [], stats: { totalValue: 35000000, transferCount: 1 } },
        { id: 'e4', source: '8', target: '4', transfers: [], stats: { totalValue: 15000000, transferCount: 1 } },
        { id: 'e5', source: '9', target: '7', transfers: [], stats: { totalValue: 8000000, transferCount: 1 } },
        { id: 'e6', source: '10', target: '5', transfers: [], stats: { totalValue: 12000000, transferCount: 1 } },
        { id: 'e7', source: '6', target: '3', transfers: [], stats: { totalValue: 30000000, transferCount: 1 } }
      ],
      metadata: {
        totalTransfers: 7,
        totalValue: 165000000,
        dateRange: { start: '2023-07-01', end: '2024-06-30' },
        clubCount: 10,
        edgeCount: 7,
        avgROI: 15.5,
        transferSuccessRate: 78.3,
        filters: filters
      }
    };
  }, [filters]);

  // Use mock data if no real data is available
  const dataToUse = React.useMemo(() => {
    return networkData?.nodes?.length ? networkData : createMockData();
  }, [networkData, createMockData]);

  // Clear selection handler
  const handleClearSelection = React.useCallback(() => {
    setSelectedLeague(null);
    // Note: Zoom state is managed internally by zoom hook
  }, []);

  // Configuration for the visualization
  const config = React.useMemo((): CircularVisualizationConfig => ({
    width,
    height,
    margin: { top: 40, right: 40, bottom: 40, left: 40 },
    minRadius: 60,
    maxRadius: Math.min(width, height) / 2 - 80,
    enableRotation: true,
    enableZoom: true,
    snapAngle: 30,
    animationDuration: 800
  }), [width, height]);

  // Setup D3 container
  const { svgRef, svg, clearSvg } = useD3Container({
    width,
    height,
    backgroundColor: 'white',
    className: 'border rounded-lg'
  });

  // Create circular layout
  const layout = useCircularLayout({
    networkData: dataToUse,
    config,
    rotation
  });

  // Setup interactions
  const { tooltip } = useCircularInteraction({
    layout,
    svgRef,
    config,
    onNodeClick: handleLeagueSelection,
    onLeagueFilter: handleLeagueFilter,
    onRotationChange: setRotation
  });

  // Setup zoom controls
  const { zoomState: currentZoom, setZoomLevel, resetZoom } = useCircularZoom({
    layout,
    svgRef,
    config
  });

  // Render visualization - simplified dependencies to prevent unnecessary re-renders
  React.useEffect(() => {
    if (!svg) return;

    clearSvg();
    
    // If no layout yet, show loading state
    if (!layout) {
      const loadingGroup = svg.append('g')
        .attr('class', 'loading-indicator')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);
      
      loadingGroup.append('circle')
        .attr('r', 20)
        .attr('fill', 'none')
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '15,5')
        .style('animation', 'spin 1s linear infinite');
      
      loadingGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 50)
        .attr('font-size', '14px')
        .attr('fill', '#6b7280')
        .text('Preparing circular layout...');
      
      return;
    }

    // Create main visualization group
    const g = svg.append('g')
      .attr('class', 'visualization-group')
      .attr('transform', `translate(${config.margin.left}, ${config.margin.top})`);

    // Color scales
    const uniqueLeagues = Array.from(new Set(layout.nodes.map(d => d.league)));
    const leagueColorScale = createLeagueColorScale(uniqueLeagues);
    const valueExtent = d3.extent(layout.arcs, d => d.value) as [number, number];
    const colorScale = d3.scaleSequential(d3.interpolateBlues).domain(valueExtent);

    // Draw tier circles (background guides)
    const tierCircles = g.selectAll('.tier-circle')
      .data(layout.tiers)
      .enter()
      .append('circle')
      .attr('class', 'tier-circle')
      .attr('cx', layout.centerX - config.margin.left)
      .attr('cy', layout.centerY - config.margin.top)
      .attr('fill', 'none')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2');

    animateTierCircles(tierCircles);

    // Draw transfer arcs
    const arcs = g.selectAll('.transfer-arc')
      .data(layout.arcs.filter(d => d.value > 0))
      .enter()
      .append('path')
      .attr('class', 'transfer-arc')
      .attr('d', d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 0.7;
        return `M${d.source.x - config.margin.left},${d.source.y - config.margin.top}A${dr},${dr} 0 0,1 ${d.target.x - config.margin.left},${d.target.y - config.margin.top}`;
      })
      .attr('fill', 'none')
      .attr('stroke', d => colorScale(d.value))
      .attr('stroke-width', d => Math.max(1, Math.log(d.value / 1000000 + 1) * 2))
      .attr('opacity', 0.6);

    animateArcsEnter(arcs);

    // Node size scale
    const sizeScale = d3.scaleLinear()
      .domain(d3.extent(layout.nodes, d => d.transferCount) as [number, number])
      .range([4, 12]);

    // Draw nodes with selection feedback
    const nodes = g.selectAll('.club-node')
      .data(layout.nodes)
      .enter()
      .append('circle')
      .attr('class', 'club-node')
      .attr('cx', d => d.x - config.margin.left)
      .attr('cy', d => d.y - config.margin.top)
      .attr('r', d => sizeScale(d.transferCount))
      .attr('fill', d => leagueColorScale(d.league) as string)
      .attr('stroke', d => {
        if (selectedLeague && d.league === selectedLeague) {
          return '#fbbf24'; // Golden highlight for selected league
        }
        return 'white';
      })
      .attr('stroke-width', d => {
        if (selectedLeague && d.league === selectedLeague) {
          return 4; // Thicker stroke for selected league
        }
        return 2;
      })
      .attr('opacity', d => {
        if (selectedLeague && d.league !== selectedLeague) {
          return 0.3; // Dim non-selected leagues
        }
        return 1;
      });

    animateNodesEnter(nodes);

    // Handle selection rings for selected league nodes
    const selectedNodes = selectedLeague ? layout.nodes.filter(n => n.league === selectedLeague) : [];
    
    const selectionRings = g.selectAll('.selection-ring')
      .data(selectedNodes);

    // Remove old rings
    selectionRings.exit()
      .transition()
      .duration(200)
      .attr('opacity', 0)
      .remove();

    // Add new rings
    selectionRings.enter()
      .append('circle')
      .attr('class', 'selection-ring')
      .attr('cx', d => d.x - config.margin.left)
      .attr('cy', d => d.y - config.margin.top)
      .attr('r', d => sizeScale(d.transferCount) + 8)
      .attr('fill', 'none')
      .attr('stroke', '#fbbf24')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,3')
      .attr('opacity', 0)
      .transition()
      .duration(300)
      .attr('opacity', 0.8);

    // Apply filter animation if league is selected
    if (selectedLeague) {
      animateFilterTransition(layout, svg, selectedLeague);
    }

    // Add legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', 'translate(20, 20)');

    const legendBg = legend.append('rect')
      .attr('fill', 'white')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1)
      .attr('rx', 6)
      .attr('opacity', 0.95);

    const legendContent = legend.append('g')
      .attr('transform', 'translate(12, 12)');

    legendContent.append('text')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text('Interactive Circular Visualization');

    let yOffset = 25;

    // Add controls explanation
    const controls = [
      'Drag to rotate view (R to reset)',
      'Double-click to reset rotation',
      'Mousewheel to zoom (1/2/3 keys)',
      'Click node to select league',
      'ESC to clear & reset, C to clear',
      'F to apply league filter'
    ];

    controls.forEach((control, i) => {
      legendContent.append('text')
        .attr('y', yOffset + i * 16)
        .attr('font-size', '11px')
        .attr('fill', '#6b7280')
        .text(control);
    });

    yOffset += controls.length * 16 + 10;

    // Add zoom level indicator
    legendContent.append('text')
      .attr('y', yOffset)
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text(`Zoom Level: ${currentZoom.level}`);

    // Size legend background
    const legendBounds = legendContent.node()!.getBBox();
    legendBg
      .attr('width', legendBounds.width + 24)
      .attr('height', legendBounds.height + 24);

  }, [svg, layout, config, selectedLeague, currentZoom.level, clearSvg, width, height]);

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'r':
        case 'R':
          setRotation(0);
          break;
        case '1':
          setZoomLevel(1);
          break;
        case '2':
          setZoomLevel(2);
          break;
        case '3':
          setZoomLevel(3);
          break;
        case 'Escape':
          handleClearSelection();
          resetZoom();
          break;
        case 'c':
        case 'C':
          // 'C' for clear selection
          handleClearSelection();
          break;
        case 'f':
        case 'F':
          // 'F' to apply filter if league is selected
          if (selectedLeague) {
            handleLeagueFilter(selectedLeague);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setZoomLevel, resetZoom, handleClearSelection, handleLeagueFilter, selectedLeague]);

  return (
    <div className="relative">
      {/* Show demo indicator when using mock data */}
      {!networkData?.nodes?.length && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-orange-100 border border-orange-300 rounded-lg px-3 py-1 shadow-sm">
            <div className="text-xs text-orange-800 font-medium">
              🎯 Demo Mode - Mock Data
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-white border rounded-lg px-3 py-2 shadow-sm">
          <div className="flex items-center text-sm text-gray-600">
            <button
              onClick={() => {
                setZoomLevel(1);
                handleClearSelection();
              }}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              All
            </button>
            {currentZoom.level >= 2 && currentZoom.focusedTier && (
              <>
                <span className="mx-2">→</span>
                <button
                  onClick={() => setZoomLevel(2, currentZoom.focusedTier!)}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Tier {currentZoom.focusedTier}
                </button>
              </>
            )}
            {selectedLeague && (
              <>
                <span className="mx-2">→</span>
                <span className="font-medium text-gray-800">{selectedLeague}</span>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Zoom Level Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <div className="bg-white border rounded-lg p-2 shadow-sm">
          <div className="text-xs font-medium text-gray-700 mb-2">Zoom Level</div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setZoomLevel(1)}
              className={`px-2 py-1 text-xs rounded ${
                currentZoom.level === 1 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setZoomLevel(2)}
              className={`px-2 py-1 text-xs rounded ${
                currentZoom.level === 2 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Tier Focus
            </button>
            <button
              onClick={() => setZoomLevel(3)}
              className={`px-2 py-1 text-xs rounded ${
                currentZoom.level === 3 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              League Details
            </button>
          </div>
          
          {/* Tier-specific zoom controls when in tier focus mode */}
          {currentZoom.level === 2 && layout && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-700 mb-1">Focus Tier</div>
              <div className="flex flex-col gap-1">
                {layout.tiers.map(tier => (
                  <button
                    key={tier.tier}
                    onClick={() => setZoomLevel(2, tier.tier)}
                    className={`px-2 py-1 text-xs rounded ${
                      currentZoom.focusedTier === tier.tier 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Tier {tier.tier} ({tier.nodeCount} clubs)
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* League-specific zoom controls when in league details mode */}
          {currentZoom.level === 3 && layout && selectedLeague && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-700 mb-1">League Focus</div>
              <div className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded">
                {selectedLeague}
              </div>
            </div>
          )}
        </div>

        {selectedLeague && (
          <div className="bg-green-100 border border-green-300 rounded-lg p-2 shadow-sm">
            <div className="text-xs font-medium text-green-800 mb-1">Active Filter</div>
            <div className="text-xs text-green-700 mb-2">League: {selectedLeague}</div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => {
                  // Apply league filter to global state
                  handleLeagueFilter(selectedLeague);
                }}
                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
              >
                Apply Filter
              </button>
              <button
                onClick={handleClearSelection}
                className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded hover:bg-green-300"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reset Button */}
      <div className="absolute bottom-4 right-4 z-10">
        <button
          onClick={() => {
            setRotation(0);
            handleClearSelection();
            resetZoom();
          }}
          className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700"
        >
          Reset View
        </button>
      </div>

      <svg ref={svgRef} width={width} height={height}>
        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .selection-ring {
              animation: pulse 2s infinite;
            }
            @keyframes pulse {
              0%, 100% { opacity: 0.8; }
              50% { opacity: 0.4; }
            }
          `}
        </style>
      </svg>
      
      {/* Render tooltip */}
      {tooltip}
    </div>
  );
};

export default CircularVisualization;