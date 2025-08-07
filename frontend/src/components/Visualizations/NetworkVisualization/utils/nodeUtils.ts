import * as d3 from 'd3';
import { NetworkNode } from '../../../../types';

/**
 * Create visual elements for network nodes
 */
export const createNodes = (
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  nodes: NetworkNode[],
  options: {
    colorScale?: d3.ScaleOrdinal<string, string>;
    onNodeHover?: (node: NetworkNode | null) => void;
    onNodeClick?: (node: NetworkNode) => void;
    isDraggingRef?: React.MutableRefObject<boolean>;
    sizeScale?: (activity: number) => number;
  } = {}
) => {
  const { 
    colorScale = d3.scaleOrdinal<string>(d3.schemeCategory10),
    onNodeHover,
    onNodeClick,
    isDraggingRef,
    sizeScale = (activity) => Math.max(10, Math.min(40, Math.sqrt(activity) * 2 + 8))
  } = options;

  // Create a group for all nodes
  const nodeGroup = container.append('g')
    .attr('class', 'nodes');

  // Create individual node groups
  const nodeGroups = nodeGroup.selectAll<SVGGElement, NetworkNode>('.node-group')
    .data(nodes)
    .enter().append('g')
    .attr('class', 'node-group')
    .attr('data-id', d => d.id);

  // Add main node circles
  const nodeCircles = nodeGroups.append<SVGCircleElement>('circle')
    .attr('class', 'node')
    .attr('r', d => {
      const activity = d.stats.transfersIn + d.stats.transfersOut;
      return sizeScale(activity);
    })
    .attr('fill', d => colorScale(d.league))
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .style('cursor', 'move')
    .on('mouseover', function(event, d) {
      if (!isDraggingRef?.current) {
        d3.select(this).attr('stroke-width', 4);
        if (onNodeHover) onNodeHover({ ...d });
      }
    })
    .on('mouseout', function(event, d) {
      if (!isDraggingRef?.current) {
        d3.select(this).attr('stroke-width', 2);
        if (onNodeHover) onNodeHover(null);
      }
    })
    .on('click', function(event, d) {
      if (!isDraggingRef?.current) {
        event.stopPropagation();
        if (onNodeClick) onNodeClick(d);
      }
    });

  // Add performance indicator rings
  nodeGroups.append<SVGCircleElement>('circle')
    .attr('class', 'performance-ring')
    .attr('r', d => {
      const activity = d.stats.transfersIn + d.stats.transfersOut;
      const baseRadius = sizeScale(activity);
      return baseRadius + 2;
    })
    .attr('fill', 'none')
    .attr('stroke', d => {
      if (d.stats.transferSuccessRate && d.stats.transferSuccessRate > 70) return '#10b981';
      if (d.stats.transferSuccessRate && d.stats.transferSuccessRate < 30) return '#ef4444';
      return 'transparent';
    })
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '5,3')
    .style('pointer-events', 'none');

  // Add pin indicators for fixed nodes
  nodeGroups.append('circle')
    .attr('class', 'pin-indicator')
    .attr('r', 3)
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('fill', '#f97316')
    .style('opacity', d => (d.fx !== null && d.fy !== null) ? 1 : 0)
    .style('pointer-events', 'none');

  return { nodes: nodeGroups, nodeCircles };
};

/**
 * Create labels for network nodes
 */
export const createLabels = (
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  nodes: NetworkNode[],
  options: {
    showRoi?: boolean;
    labelOffsetY?: number;
    roiOffsetY?: number;
  } = {}
) => {
  const { 
    showRoi = true, 
    labelOffsetY = 35,
    roiOffsetY = 48
  } = options;

  // Create a group for all labels
  const labelGroup = container.append('g')
    .attr('class', 'labels');

  // Prepare label data
  const labelData = nodes.map(node => ({
    ...node,
    labelText: node.shortName || node.name.substring(0, 12)
  }));

  // Add main node labels
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

  // Add ROI labels for nodes with ROI data
  const roiData = showRoi ? 
    nodes.filter(d => d.stats.avgROI !== undefined && d.stats.avgROI !== 0) : [];
  
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

  return { labels, roiLabels, labelOffsetY, roiOffsetY };
};

/**
 * Update node and label positions during simulation ticks
 */
export const updateNodePositions = (
  nodes: d3.Selection<SVGGElement, NetworkNode, SVGGElement, unknown>,
  labels: d3.Selection<SVGTextElement, NetworkNode, SVGGElement, unknown>,
  roiLabels: d3.Selection<SVGTextElement, NetworkNode, SVGGElement, unknown>,
  options: {
    labelOffsetY?: number;
    roiOffsetY?: number;
    transform?: d3.ZoomTransform;
    showLabelsZoomThreshold?: number;
  } = {}
) => {
  const {
    labelOffsetY = 35,
    roiOffsetY = 48,
    transform,
    showLabelsZoomThreshold = 0.5
  } = options;

  // Update node group positions
  nodes.attr('transform', d => `translate(${d.x},${d.y})`);

  // Determine if labels should be visible based on zoom level
  const zoomLevel = transform ? transform.k : 1;
  const showLabels = zoomLevel >= showLabelsZoomThreshold;

  // Update label positions
  labels
    .attr('x', d => d.x!)
    .attr('y', d => d.y! + labelOffsetY)
    .style('display', showLabels ? 'block' : 'none');

  // Update ROI label positions
  roiLabels
    .attr('x', d => d.x!)
    .attr('y', d => d.y! + roiOffsetY)
    .style('display', showLabels ? 'block' : 'none');
};