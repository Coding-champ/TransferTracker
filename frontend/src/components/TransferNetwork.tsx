import * as d3 from 'd3';
import React from 'react';
import { NetworkNode, NetworkEdge, FilterState } from '../types';
import { useNetworkData } from '../hooks/useNetworkData';
import { useNetworkInteractions } from '../hooks/useNetworkInteractions';
import NetworkLegend from './NetworkLegend';
import NodeInfoPanel from './NodeInfoPanel';
import EdgeInfoPanel from './EdgeInfoPanel';
import NetworkStatistics from './NetworkStatistics';
import { useCallback, useEffect, useRef } from 'react';

interface TransferNetworkProps {
  filters: FilterState;
}

const TransferNetwork: React.FC<TransferNetworkProps> = ({ filters }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Custom hooks for separated concerns
  const { networkData, loading, error, refetch } = useNetworkData(filters);
  const {
    selectedNodeData,
    hoveredEdgeData,
    isDraggingRef,
    handleNodeHover,
    handleNodeClick,
    handleEdgeHover,
    handleDragStart,
    handleDragEnd
  } = useNetworkInteractions();

  // D3 simulation and visualization refs
  const simulationRef = useRef<d3.Simulation<NetworkNode, NetworkEdge> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const currentTransformRef = useRef(d3.zoomIdentity);
  const isInitializedRef = useRef(false);

  // Enhanced color scale for leagues
  const colorScale = d3.scaleOrdinal<string>()
    .domain(['Bundesliga', 'Premier League', 'La Liga', 'Serie A', 'Ligue 1', 'Eredivisie', 'Primeira Liga', 'Süper Lig'])
    .range(['#d70909', '#3d0845', '#ff6b35', '#004225', '#1e3a8a', '#ff8c00', '#228b22', '#dc143c']);

  // Memoized D3 visualization setup
  const initializeVisualization = useCallback(() => {
    if (!networkData || !svgRef.current || isInitializedRef.current) return;

    console.log('Initializing enhanced D3 visualization...');
    isInitializedRef.current = true;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 1200;
    const height = 800;

    svg.attr('width', width).attr('height', height);

    // Create zoom container
    const zoomGroup = svg.append('g').attr('class', 'zoom-group');

    // 🔧 FIX: Enhanced zoom behavior with proper isDragging check
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .filter((event) => {
        // 🔧 FIX: Add missing isDraggingRef check that was in original
        if (isDraggingRef.current) return false;
        
        const target = event.target as Element;
        const isNode = target.classList.contains('node') || target.closest('.node');
        
        if (event.type === 'wheel') return true;
        if (event.type === 'mousedown' && !isNode) return true;
        
        return false;
      })
      .on('zoom', (event) => {
        // 🔧 FIX: Add isDragging check to prevent zoom during drag
        if (!isDraggingRef.current) {
          currentTransformRef.current = event.transform;
          zoomGroup.attr('transform', event.transform);
        }
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Enhanced simulation with adaptive forces
    const simulation = d3.forceSimulation<NetworkNode>(networkData.nodes)
      .force('link', d3.forceLink<NetworkNode, NetworkEdge>(networkData.edges)
        .id((d) => d.id)
        .distance((d) => {
          const baseDistance = 120;
          const transferCount = d.stats.transferCount;
          return Math.max(80, baseDistance - (transferCount * 5));
        })
        .strength(0.1))
      .force('charge', d3.forceManyBody()
        .strength((d) => {
          const activity = (d as NetworkNode).stats.transfersIn + (d as NetworkNode).stats.transfersOut;
          return -Math.max(200, Math.min(800, activity * 10));
        }))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius((d) => {
          const baseRadius = Math.sqrt((d as NetworkNode).stats.transfersIn + (d as NetworkNode).stats.transfersOut) * 2 + 8;
          return baseRadius + 5;
        }));

    simulationRef.current = simulation;

    // Create arrow markers
    createArrowMarkers(svg);

    // Create links
    const links = createLinks(zoomGroup, networkData.edges, handleEdgeHover, isDraggingRef);

    // Create nodes
    const { nodes, nodeCircles } = createNodes(zoomGroup, networkData.nodes, colorScale, handleNodeHover, handleNodeClick, simulation, isDraggingRef);

    // Create labels
    const { labels, roiLabels } = createLabels(zoomGroup, networkData.nodes);

    // 🔧 FIX: Setup drag behavior with proper isDraggingRef integration
    const dragHandler = createDragBehavior(simulation, handleDragStart, handleDragEnd, isDraggingRef);
    nodeCircles.call(dragHandler);

    // Simulation tick function
    simulation.on('tick', () => {
      links
        .attr('x1', (d) => (d.source as NetworkNode).x!)
        .attr('y1', (d) => (d.source as NetworkNode).y!)
        .attr('x2', (d) => (d.target as NetworkNode).x!)
        .attr('y2', (d) => (d.target as NetworkNode).y!);

      nodes.attr('transform', (d) => `translate(${d.x},${d.y})`);
      labels.attr('x', (d) => d.x!).attr('y', (d) => d.y! + 35);
      roiLabels.attr('x', (d) => d.x!).attr('y', (d) => d.y! + 48);
    });

    // Add zoom controls
    createZoomControls(svg, zoom);

    // Cleanup function
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      // 🔧 FIX: isDraggingRef cleanup is handled in useNetworkInteractions
    };
  }, [networkData, colorScale, handleNodeHover, handleNodeClick, handleEdgeHover, handleDragStart, handleDragEnd, isDraggingRef]);

  // Initialize visualization when data changes
  useEffect(() => {
    isInitializedRef.current = false; // Reset for new data
    const cleanup = initializeVisualization();
    return cleanup;
  }, [initializeVisualization]);

  // Clear selected node when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      // Only clear if not clicking on network elements
      const target = event?.target as Element;
      if (!target?.closest('.network-panel')) {
        // Don't clear selection to keep UI stable
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading enhanced network data...</div>
          <div className="text-sm text-gray-500 mt-2">Applying advanced filters...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
        <div className="text-center text-red-600">
          <div className="text-6xl mb-4">⚠️</div>
          <div className="text-lg mb-2">Error loading data</div>
          <div className="text-sm mb-4">{error}</div>
          <button 
            onClick={refetch}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!networkData || networkData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">🔍</div>
          <div className="text-lg mb-2">No data found</div>
          <div className="text-sm">Try adjusting your filters or search criteria</div>
          <div className="text-xs mt-2 text-gray-400">
            Current filters may be too restrictive
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" ref={containerRef}>
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Main Network Visualization */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Enhanced Transfer Network</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{networkData.nodes.length} clubs</span>
                <span>•</span>
                <span>{networkData.edges.length} connections</span>
                <span>•</span>
                <span className="text-green-600 font-medium">
                  {(networkData.metadata.successRate || 0).toFixed(1)}% success rate
                </span>
              </div>
            </div>
            <div className="relative network-panel">
              <svg 
                ref={svgRef} 
                className="w-full border border-gray-200 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100"
                style={{ minHeight: '600px' }}
              />
              
              {/* Enhanced instructions overlay */}
              <div className="absolute top-4 right-4 bg-white bg-opacity-95 rounded-lg p-4 text-xs text-gray-600 max-w-xs shadow-lg">
                <div className="font-medium mb-2 text-gray-800">🎮 Controls:</div>
                <div className="space-y-1">
                  <div>• Mouse wheel to zoom (0.1x - 5x)</div>
                  <div>• Drag empty space to pan</div>
                  <div>• Drag nodes to move them</div>
                  <div>• Click nodes to pin/unpin</div>
                  <div>• Use zoom buttons (top-left)</div>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <div className="font-medium mb-1 text-gray-800">🎨 Visual Guide:</div>
                  <div className="space-y-1">
                    <div>• <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span> High success rate</div>
                    <div>• <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span> Low success rate</div>
                    <div>• Dotted rings = Performance indicators</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Info Panel */}
        <div className="w-full xl:w-96 space-y-6">
          {/* Legend */}
          <NetworkLegend networkData={networkData} />

          {/* Selected Node Info */}
          {selectedNodeData && (
            <NodeInfoPanel selectedNodeData={selectedNodeData} />
          )}

          {/* Hovered Edge Info */}
          {hoveredEdgeData && (
            <EdgeInfoPanel hoveredEdgeData={hoveredEdgeData} />
          )}

          {/* Network Statistics */}
          <NetworkStatistics networkData={networkData} filters={filters} />
        </div>
      </div>
    </div>
  );
};

// 🔧 FIX: Optimized helper functions for D3 visualization
const createArrowMarkers = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
  const defs = svg.append('defs');
  
  // Create marker definitions once and reuse
  const markerData = [
    { id: 'arrowhead', fill: '#666' },
    { id: 'arrowhead-success', fill: '#10b981' }
  ];

  markerData.forEach(({ id, fill }) => {
    defs.append('marker')
      .attr('id', id)
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', fill)
      .style('stroke', 'none');
  });
};

const createLinks = (
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  edges: NetworkEdge[],
  onEdgeHover: (edge: NetworkEdge | null) => void,
  isDraggingRef: React.MutableRefObject<boolean>
) => {
  const linkGroup = container.append('g').attr('class', 'links');
  
  // Pre-calculate edge properties for better performance
  const processedEdges = edges.map(edge => ({
    ...edge,
    strokeColor: edge.stats.successRate && edge.stats.successRate > 70 ? '#10b981' :
                edge.stats.successRate && edge.stats.successRate < 30 ? '#ef4444' : '#6b7280',
    strokeWidth: Math.max(1, Math.sqrt(edge.stats.transferCount) * 2),
    markerEnd: edge.stats.successRate && edge.stats.successRate > 70 ? 'url(#arrowhead-success)' : 'url(#arrowhead)'
  }));
  
  return linkGroup.selectAll('.link')
    .data(processedEdges)
    .enter().append('line')
    .attr('class', 'link')
    .attr('stroke', d => d.strokeColor)
    .attr('stroke-opacity', 0.6)
    .attr('stroke-width', d => d.strokeWidth)
    .attr('marker-end', d => d.markerEnd)
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      // 🔧 FIX: Only process hover if not dragging
      if (!isDraggingRef.current) {
        // Clone data to prevent mutations
        onEdgeHover({ ...d, stats: { ...d.stats }, transfers: [...d.transfers] });
        d3.select(this)
          .attr('stroke', '#ff6b35')
          .attr('stroke-opacity', 1)
          .attr('stroke-width', Math.max(3, Math.sqrt(d.stats.transferCount) * 3));
      }
    })
    .on('mouseout', function(event, d) {
      // 🔧 FIX: Only process hover if not dragging
      if (!isDraggingRef.current) {
        onEdgeHover(null);
        d3.select(this)
          .attr('stroke', d.strokeColor)
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', d.strokeWidth);
      }
    });
};

const createNodes = (
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  nodes: NetworkNode[],
  colorScale: d3.ScaleOrdinal<string, string, never>,
  onNodeHover: (node: NetworkNode | null) => void,
  onNodeClick: (node: NetworkNode, simulation: any) => void,
  simulation: d3.Simulation<NetworkNode, NetworkEdge>,
  isDraggingRef: React.MutableRefObject<boolean>
) => {
  const nodeGroup = container.append('g').attr('class', 'nodes');

  const nodeGroups = nodeGroup.selectAll<SVGGElement, NetworkNode>('.node-group')
    .data(nodes)
    .enter().append('g')
    .attr('class', 'node-group');

  // Main node circles with optimized event handlers
  const nodeCircles = nodeGroups.append<SVGCircleElement>('circle')
    .attr('class', 'node')
    .attr('r', d => {
      const activity = d.stats.transfersIn + d.stats.transfersOut;
      const baseRadius = Math.sqrt(activity) * 2 + 8;
      return Math.max(10, Math.min(40, baseRadius));
    })
    .attr('fill', d => colorScale(d.league))
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .style('cursor', 'move')
    .on('mouseover', function(event, d) {
      // 🔧 FIX: Only process hover if not dragging
      if (!isDraggingRef.current) {
        // Clone data to prevent mutations
        onNodeHover({ ...d, stats: { ...d.stats } });
        d3.select(this).attr('stroke-width', 4);
      }
    })
    .on('mouseout', function(event, d) {
      // 🔧 FIX: Only process hover if not dragging
      if (!isDraggingRef.current) {
        d3.select(this).attr('stroke-width', 2);
      }
    })
    .on('click', function(event, d) {
      event.stopPropagation();
      onNodeClick(d, simulation);
    });

  // Performance indicator rings
  nodeGroups.append<SVGCircleElement>('circle')
    .attr('class', 'performance-ring')
    .attr('r', d => {
      const activity = d.stats.transfersIn + d.stats.transfersOut;
      const baseRadius = Math.sqrt(activity) * 2 + 8;
      return Math.max(12, Math.min(42, baseRadius + 2));
    })
    .attr('fill', 'none')
    .attr('stroke', d => {
      if (d.stats.successfulTransfersRate && d.stats.successfulTransfersRate > 70) return '#10b981';
      if (d.stats.successfulTransfersRate && d.stats.successfulTransfersRate < 30) return '#ef4444';
      return 'transparent';
    })
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '5,3')
    .style('pointer-events', 'none');

  return { nodes: nodeGroups, nodeCircles };
};

const createLabels = (
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  nodes: NetworkNode[]
) => {
  const labelGroup = container.append('g').attr('class', 'labels');
  
  // Pre-process label data
  const labelData = nodes.map(node => ({
    ...node,
    labelText: node.shortName || node.name.substring(0, 12)
  }));

  const roiData = nodes.filter(d => d.stats.avgROI !== undefined && d.stats.avgROI !== 0);
  
  const labels = labelGroup.selectAll('.label')
    .data(labelData)
    .enter().append('text')
    .attr('class', 'label')
    .text(d => d.labelText)
    .attr('font-size', '11px')
    .attr('font-family', 'Arial, sans-serif')
    .attr('fill', '#333')
    .attr('text-anchor', 'middle')
    .attr('dy', '.35em')
    .style('pointer-events', 'none')
    .style('font-weight', '500');

  const roiLabels = labelGroup.selectAll('.roi-label')
    .data(roiData)
    .enter().append('text')
    .attr('class', 'roi-label')
    .text(d => `ROI: ${d.stats.avgROI!.toFixed(0)}%`)
    .attr('font-size', '9px')
    .attr('font-family', 'Arial, sans-serif')
    .attr('fill', d => d.stats.avgROI! > 0 ? '#10b981' : '#ef4444')
    .attr('text-anchor', 'middle')
    .attr('dy', '.35em')
    .style('pointer-events', 'none')
    .style('font-weight', '600');

  return { labels, roiLabels };
};

// 🔧 FIX: Updated drag behavior with isDraggingRef integration
const createDragBehavior = (
  simulation: d3.Simulation<NetworkNode, NetworkEdge>,
  onDragStart: () => void,
  onDragEnd: () => void,
  isDraggingRef: React.MutableRefObject<boolean>
) => {
  return d3.drag<SVGCircleElement, NetworkNode>()
    .on('start', function(event, d) {
      // 🔧 FIX: Set isDraggingRef immediately on drag start
      isDraggingRef.current = true;
      onDragStart();
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      d3.select(this).attr('stroke-width', 4);
    })
    .on('drag', function(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on('end', function(event, d) {
      onDragEnd();
      if (!event.active) simulation.alphaTarget(0);
      d3.select(this).attr('stroke-width', 2);
      // 🔧 FIX: isDraggingRef timeout is now handled in useNetworkInteractions
    });
};

const createZoomControls = (
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  zoom: d3.ZoomBehavior<SVGSVGElement, unknown>
) => {
  const controlsGroup = svg.append('g')
    .attr('class', 'zoom-controls')
    .attr('transform', 'translate(20, 20)');

  // Optimized control button creation
  const buttonConfigs = [
    { y: 0, text: '+', action: () => svg.transition().duration(300).call(zoom.scaleBy as any, 1.5) },
    { y: 40, text: '−', action: () => svg.transition().duration(300).call(zoom.scaleBy as any, 0.67) },
    { y: 80, text: '⌂', action: () => svg.transition().duration(500).call(zoom.transform as any, d3.zoomIdentity) }
  ];

  buttonConfigs.forEach(({ y, text, action }) => {
    const button = controlsGroup.append('g').attr('class', 'zoom-button');
    
    button.append('rect')
      .attr('y', y)
      .attr('width', 35)
      .attr('height', 35)
      .attr('fill', 'white')
      .attr('stroke', '#d1d5db')
      .attr('stroke-width', 1)
      .attr('rx', 6)
      .style('cursor', 'pointer')
      .style('filter', 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))')
      .on('mouseover', function() {
        d3.select(this).attr('fill', '#f9fafb');
      })
      .on('mouseout', function() {
        d3.select(this).attr('fill', 'white');
      });

    button.append('text')
      .attr('x', 17.5)
      .attr('y', y + 22)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .style('pointer-events', 'none')
      .text(text);

    button.on('click', function(event) {
      event.stopPropagation();
      action();
    });
  });
};

export default React.memo(TransferNetwork);