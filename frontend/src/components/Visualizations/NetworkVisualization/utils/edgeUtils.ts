import * as d3 from 'd3';
import { NetworkEdge } from '../../../../types';

/**
 * Create arrow markers for directed edges
 */
export const createArrowMarkers = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
  const defs = svg.append('defs');
  
  const markerData = [
    { id: 'arrowhead', fill: '#666' },
    { id: 'arrowhead-success', fill: '#10b981' },
    { id: 'arrowhead-failure', fill: '#ef4444' },
    { id: 'arrowhead-hover', fill: '#ff6b35' }
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
 * Create edges (links) between nodes
 */
export const createLinks = (
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  edges: NetworkEdge[],
  options: {
    onEdgeHover?: (edge: NetworkEdge | null) => void;
    isDraggingRef?: React.MutableRefObject<boolean>;
    widthScale?: (count: number) => number;
  } = {}
) => {
  const { 
    onEdgeHover,
    isDraggingRef,
    widthScale = (count) => Math.max(1, Math.sqrt(count) * 1.5)
  } = options;

  // Create a group for all links
  const linkGroup = container.append('g')
    .attr('class', 'links');
  
  // Process edges with visual properties
  const processedEdges = edges.map(edge => ({
    ...edge,
    strokeColor: edge.stats.successRate && edge.stats.successRate > 70 ? '#10b981' :
                edge.stats.successRate && edge.stats.successRate < 30 ? '#ef4444' : '#6b7280',
    strokeWidth: widthScale(edge.stats.transferCount),
    markerEnd: edge.stats.successRate && edge.stats.successRate > 70 ? 'url(#arrowhead-success)' :
              edge.stats.successRate && edge.stats.successRate < 30 ? 'url(#arrowhead-failure)' : 'url(#arrowhead)'
  }));
  
  // Create links
  const links = linkGroup.selectAll('.link')
    .data(processedEdges)
    .enter().append('line')
    .attr('class', 'link')
    .attr('stroke', d => d.strokeColor)
    .attr('stroke-opacity', 0.6)
    .attr('stroke-width', d => d.strokeWidth)
    .attr('marker-end', d => d.markerEnd)
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      if (!isDraggingRef?.current) {
        if (onEdgeHover) onEdgeHover({ ...d, stats: { ...d.stats }, transfers: [...d.transfers] });
        
        d3.select(this)
          .attr('stroke', '#ff6b35')
          .attr('stroke-opacity', 1)
          .attr('stroke-width', Math.max(3, d.strokeWidth * 1.5))
          .attr('marker-end', 'url(#arrowhead-hover)');
      }
    })
    .on('mouseout', function(event, d) {
      if (!isDraggingRef?.current) {
        if (onEdgeHover) onEdgeHover(null);
        
        d3.select(this)
          .attr('stroke', d.strokeColor)
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', d.strokeWidth)
          .attr('marker-end', d.markerEnd);
      }
    });

  return links;
};

/**
 * Update edge positions during simulation ticks
 */
export const updateLinkPositions = (
  links: d3.Selection<SVGLineElement, NetworkEdge, SVGGElement, unknown>
) => {
  links
    .attr('x1', d => (d.source as any).x)
    .attr('y1', d => (d.source as any).y)
    .attr('x2', d => (d.target as any).x)
    .attr('y2', d => (d.target as any).y);
};