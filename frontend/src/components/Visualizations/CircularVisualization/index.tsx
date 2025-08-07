import React, { useState } from 'react';
import * as d3 from 'd3';
import { VisualizationProps } from '../../../types';
import { useD3Container } from '../../../visualizations/shared/hooks/useD3Container';
import { useCircularLayout } from '../../../visualizations/circular/hooks/useCircularLayout';
import { useCircularInteraction } from '../../../visualizations/circular/hooks/useCircularInteraction';
import { useCircularZoom } from '../../../visualizations/circular/hooks/useCircularZoom';
import { 
  CircularVisualizationConfig,
  CircularZoomState,
  CircularNode
} from '../../../visualizations/circular/types';
import { createLeagueColorScale } from '../../../visualizations/shared/utils/d3-helpers';
import { 
  animateNodesEnter,
  animateArcsEnter,
  animateTierCircles,
  animateFilterTransition 
} from '../../../visualizations/circular/utils/circularAnimations';

interface CircularVisualizationProps extends VisualizationProps {}

export const CircularVisualization: React.FC<CircularVisualizationProps> = ({
  networkData,
  filters,
  width = 800,
  height = 800
}) => {
  const [rotation, setRotation] = useState(0);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [zoomState, setZoomState] = useState<CircularZoomState>({
    level: 1,
    focusedTier: null,
    focusedLeague: null,
    scale: 1,
    translateX: 0,
    translateY: 0
  });

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
    networkData,
    config,
    rotation,
    zoomState
  });

  // Setup interactions
  const { tooltip } = useCircularInteraction({
    layout,
    svgRef,
    config,
    onNodeClick: (node: CircularNode) => {
      setSelectedLeague(node.league);
    },
    onLeagueFilter: (league: string) => {
      // Integrate with global filter state here
      console.log('Filter by league:', league);
    },
    onRotationChange: setRotation
  });

  // Setup zoom controls
  const { zoomState: currentZoom, setZoomLevel, resetZoom } = useCircularZoom({
    layout,
    svgRef,
    config,
    onZoomChange: setZoomState
  });

  // Render visualization
  React.useEffect(() => {
    if (!svg || !layout) return;

    clearSvg();

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

    // Draw nodes
    const nodes = g.selectAll('.club-node')
      .data(layout.nodes)
      .enter()
      .append('circle')
      .attr('class', 'club-node')
      .attr('cx', d => d.x - config.margin.left)
      .attr('cy', d => d.y - config.margin.top)
      .attr('r', d => sizeScale(d.transferCount))
      .attr('fill', d => leagueColorScale(d.league) as string)
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    animateNodesEnter(nodes);

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
      'Drag to rotate view',
      'Double-click to reset',
      'Mousewheel to zoom',
      'Click node to filter league'
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

  }, [svg, layout, config, selectedLeague, currentZoom.level, clearSvg]);

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
          setSelectedLeague(null);
          resetZoom();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setZoomLevel, resetZoom]);

  if (!networkData?.nodes?.length) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
        style={{ width, height }}
      >
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">🔄</div>
          <div className="text-lg font-medium">Interactive Circular Visualization</div>
          <div className="text-sm mt-2">No data available</div>
          <div className="text-xs mt-1">Apply filters to see interactive liga hierarchy</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
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
        </div>

        {selectedLeague && (
          <div className="bg-green-100 border border-green-300 rounded-lg p-2 shadow-sm">
            <div className="text-xs font-medium text-green-800">Active Filter</div>
            <div className="text-xs text-green-700">{selectedLeague}</div>
            <button
              onClick={() => setSelectedLeague(null)}
              className="mt-1 px-2 py-1 text-xs bg-green-200 text-green-800 rounded hover:bg-green-300"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Reset Button */}
      <div className="absolute bottom-4 right-4 z-10">
        <button
          onClick={() => {
            setRotation(0);
            setSelectedLeague(null);
            resetZoom();
          }}
          className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700"
        >
          Reset View
        </button>
      </div>

      <svg ref={svgRef} width={width} height={height} />
      
      {/* Render tooltip */}
      {tooltip}
    </div>
  );
};

export default CircularVisualization;