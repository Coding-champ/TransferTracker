import * as d3 from 'd3';
import { NetworkNode, NetworkEdge } from '../types';

/**
 * Creates arrow markers for the SVG visualization
 * @param svg - D3 selection of the SVG element
 */
export const createArrowMarkers = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
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

/**
 * Creates links (edges) for the network visualization
 * @param container - D3 selection of the container group
 * @param edges - Array of network edges
 * @param onEdgeHover - Callback for edge hover events
 * @param isDraggingRef - Ref to track dragging state
 * @returns D3 selection of the created links
 */
export const createLinks = (
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

/**
 * Creates nodes for the network visualization
 * @param container - D3 selection of the container group
 * @param nodes - Array of network nodes
 * @param colorScale - D3 color scale for leagues
 * @param onNodeHover - Callback for node hover events
 * @param onNodeClick - Callback for node click events
 * @param simulation - D3 force simulation
 * @param isDraggingRef - Ref to track dragging state
 * @returns Object containing node groups and circles selections
 */
export const createNodes = (
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

/**
 * Creates labels for the network nodes
 * @param container - D3 selection of the container group
 * @param nodes - Array of network nodes
 * @returns Object containing main labels and ROI labels selections
 */
export const createLabels = (
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

/**
 * Creates drag behavior for network nodes
 * @param simulation - D3 force simulation
 * @param onDragStart - Callback for drag start
 * @param onDragEnd - Callback for drag end
 * @param isDraggingRef - Ref to track dragging state
 * @param restartSimulation - Function to restart simulation with proper alpha
 * @returns D3 drag behavior
 */
export const createDragBehavior = (
  simulation: d3.Simulation<NetworkNode, NetworkEdge>,
  onDragStart: () => void,
  onDragEnd: () => void,
  isDraggingRef: React.MutableRefObject<boolean>,
  restartSimulation?: () => void
) => {
  return d3.drag<SVGCircleElement, NetworkNode>()
    .on('start', function(event, d) {
      isDraggingRef.current = true;
      onDragStart();
      // Use restartSimulation if available, otherwise use legacy approach
      if (restartSimulation) {
        restartSimulation();
      } else if (!event.active) {
        simulation.alphaTarget(0.3).restart();
      }
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
      // Allow simulation to stop naturally when dragging ends
      if (!event.active && !restartSimulation) {
        simulation.alphaTarget(0);
      }
      d3.select(this).attr('stroke-width', 2);
    });
};

/**
 * Creates zoom controls for the network visualization
 * @param svg - D3 selection of the SVG element
 * @param zoom - D3 zoom behavior
 */
export const createZoomControls = (
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

/**
 * Level of Detail (LOD) utility functions for optimizing visualization rendering
 */
export const lodHelpers = {
  /**
   * Determines if an element should be shown based on zoom level and size
   */
  shouldShowElement: (
    zoomLevel: number, 
    elementSize: number, 
    minZoomThreshold: number, 
    minSizeThreshold: number
  ): boolean => {
    if (zoomLevel < minZoomThreshold) {
      return elementSize >= minSizeThreshold;
    }
    return true;
  },

  /**
   * Calculates appropriate level of detail for current zoom
   */
  getLODLevel: (zoomLevel: number): 'high' | 'medium' | 'low' => {
    if (zoomLevel >= 1.5) return 'high';
    if (zoomLevel >= 0.5) return 'medium';
    return 'low';
  },

  /**
   * Applies LOD-based visibility to nodes
   */
  applyNodeLOD: (
    nodes: d3.Selection<SVGCircleElement, NetworkNode, SVGGElement, unknown>,
    zoomLevel: number,
    config: { hideSmallNodesThreshold: number; minNodeSize: number }
  ) => {
    nodes.style('display', (d) => {
      const nodeSize = Math.sqrt(d.stats.transfersIn + d.stats.transfersOut) * 2 + 8;
      return lodHelpers.shouldShowElement(
        zoomLevel, 
        nodeSize, 
        config.hideSmallNodesThreshold, 
        config.minNodeSize
      ) ? 'block' : 'none';
    });
  },

  /**
   * Applies LOD-based visibility to labels
   */
  applyLabelLOD: (
    labels: d3.Selection<SVGTextElement, NetworkNode, SVGGElement, unknown>,
    zoomLevel: number,
    hideLabelsThreshold: number
  ) => {
    const showLabels = zoomLevel >= hideLabelsThreshold;
    labels.style('display', showLabels ? 'block' : 'none');
  },

  /**
   * Applies LOD-based styling to edges
   */
  applyEdgeLOD: (
    edges: d3.Selection<SVGLineElement, NetworkEdge, SVGGElement, unknown>,
    zoomLevel: number,
    config: { simplificationThreshold: number; minEdgeValue: number }
  ) => {
    edges
      .style('display', (d) => {
        if (zoomLevel < config.simplificationThreshold) {
          return d.stats.totalValue >= config.minEdgeValue ? 'block' : 'none';
        }
        return 'block';
      })
      .style('stroke-width', (d) => {
        const baseWidth = Math.max(1, Math.log(d.stats.totalValue / 1000000 + 1) * 2);
        return zoomLevel < 0.5 ? Math.min(baseWidth, 2) : baseWidth;
      });
  }
};