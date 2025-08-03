import React, { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { NetworkNode, NetworkEdge, NetworkData } from '../types';
import { useNetworkInteractions } from '../hooks/useNetworkInteractions';
import { useAppContext } from '../contexts/AppContext';

interface NetworkCanvasProps {
  networkData: NetworkData;
  width?: number;
  height?: number;
}

const NetworkCanvas: React.FC<NetworkCanvasProps> = ({ 
  networkData, 
  width = 1200, 
  height = 800
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<NetworkNode, NetworkEdge> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const currentTransformRef = useRef(d3.zoomIdentity);
  const isInitializedRef = useRef(false);

  const { setSelectedNode, setHoveredEdge } = useAppContext();
  const {
    isDraggingRef,
    handleDragStart,
    handleDragEnd
  } = useNetworkInteractions();

  // Enhanced color scale for leagues
  const colorScale = d3.scaleOrdinal<string>()
    .domain(['Bundesliga', 'Premier League', 'La Liga', 'Serie A', 'Ligue 1', 'Eredivisie', 'Primeira Liga', 'Süper Lig'])
    .range(['#d70909', '#3d0845', '#ff6b35', '#004225', '#1e3a8a', '#ff8c00', '#228b22', '#dc143c']);

  // Node hover handler
  const handleNodeHover = useCallback((node: NetworkNode | null) => {
    if (!isDraggingRef.current && node) {
      setSelectedNode({ ...node, stats: { ...node.stats } });
    }
  }, [isDraggingRef, setSelectedNode]);

  // Node click handler  
  const handleNodeClick = useCallback((node: NetworkNode, simulation: any) => {
    if (isDraggingRef.current) {
      console.log('Click suppressed - currently dragging');
      return;
    }
    
    setTimeout(() => {
      if (!isDraggingRef.current) {
        const isCurrentlyPinned = node.fx !== null && node.fx !== undefined;
        
        if (!isCurrentlyPinned) {
          node.fx = node.x;
          node.fy = node.y;
          console.log(`Node ${node.name} pinned at (${node.x}, ${node.y})`);
        } else {
          node.fx = null;
          node.fy = null;
          console.log(`Node ${node.name} unpinned`);
        }
        
        simulation.alpha(0.1).restart();
      }
    }, 50);
  }, [isDraggingRef]);

  // Edge hover handler
  const handleEdgeHover = useCallback((edge: NetworkEdge | null) => {
    if (!isDraggingRef.current && edge) {
      setHoveredEdge({ 
        ...edge, 
        stats: { ...edge.stats },
        transfers: [...edge.transfers]
      });
    } else if (!edge) {
      setHoveredEdge(null);
    }
  }, [isDraggingRef, setHoveredEdge]);

  // D3 visualization initialization
  const initializeVisualization = useCallback(() => {
    if (!networkData || !svgRef.current || isInitializedRef.current) return;

    console.log('Initializing D3 visualization...');
    isInitializedRef.current = true;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('width', width).attr('height', height);

    // Create zoom container
    const zoomGroup = svg.append('g').attr('class', 'zoom-group');

    // Enhanced zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .filter((event) => {
        if (isDraggingRef.current) return false;
        
        const target = event.target as Element;
        const isNode = target.classList.contains('node') || target.closest('.node');
        
        if (event.type === 'wheel') return true;
        if (event.type === 'mousedown' && !isNode) return true;
        
        return false;
      })
      .on('zoom', (event) => {
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

    // Setup drag behavior
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
    };
  }, [networkData, colorScale, handleNodeHover, handleNodeClick, handleEdgeHover, handleDragStart, handleDragEnd, isDraggingRef, width, height]);

  // Initialize visualization when data changes
  useEffect(() => {
    isInitializedRef.current = false; // Reset for new data
    const cleanup = initializeVisualization();
    return cleanup;
  }, [initializeVisualization]);

  // Expose refs for parent components (remove this since it's causing issues)
  // React.useImperativeHandle(React.forwardRef(() => null), () => ({
  //   svgRef,
  //   zoomRef
  // }));

  return (
    <svg 
      ref={svgRef} 
      className="w-full border border-gray-200 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100"
      style={{ minHeight: `${height}px` }}
    />
  );
};

// Helper functions (extracted from original TransferNetwork)
const createArrowMarkers = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
  const defs = svg.append('defs');
  
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
      if (!isDraggingRef.current) {
        onEdgeHover({ ...d, stats: { ...d.stats }, transfers: [...d.transfers] });
        d3.select(this)
          .attr('stroke', '#ff6b35')
          .attr('stroke-opacity', 1)
          .attr('stroke-width', Math.max(3, Math.sqrt(d.stats.transferCount) * 3));
      }
    })
    .on('mouseout', function(event, d) {
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
      if (!isDraggingRef.current) {
        onNodeHover({ ...d, stats: { ...d.stats } });
        d3.select(this).attr('stroke-width', 4);
      }
    })
    .on('mouseout', function(event, d) {
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

const createDragBehavior = (
  simulation: d3.Simulation<NetworkNode, NetworkEdge>,
  onDragStart: () => void,
  onDragEnd: () => void,
  isDraggingRef: React.MutableRefObject<boolean>
) => {
  return d3.drag<SVGCircleElement, NetworkNode>()
    .on('start', function(event, d) {
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
    });
};

export default NetworkCanvas;

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