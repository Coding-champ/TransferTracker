import * as d3 from 'd3';
import { formatCurrency } from '../../../../utils/formatters';

// Common color scales for visualizations
export const createLeagueColorScale = (leagues: string[]) => {
  const leagueColors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b',
    '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#aec7e8', '#ffbb78',
    '#98df8a', '#ff9896', '#c5b0d5', '#c49c94', '#f7b6d3', '#c7c7c7',
    '#dbdb8d', '#9edae5'
  ];
  
  return d3.scaleOrdinal<string>()
    .domain(leagues)
    .range(leagueColors);
};

export const createValueColorScale = (values: number[], scheme = d3.interpolateBlues) => {
  const extent = d3.extent(values) as [number, number];
  return d3.scaleSequential(scheme).domain(extent);
};

export const createSizeScale = (values: number[], range: [number, number] = [4, 20]) => {
  const extent = d3.extent(values) as [number, number];
  return d3.scaleLinear().domain(extent).range(range);
};

// Common formatting functions - imported from centralized utils

// Geometric helper functions
export const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

export const cartesianToPolar = (x: number, y: number, centerX: number, centerY: number) => {
  const dx = x - centerX;
  const dy = y - centerY;
  const radius = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
  return { radius, angle: angle < 0 ? angle + 360 : angle };
};

export const getAngleBetweenPoints = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
};

export const snapToAngle = (angle: number, snapDegrees: number = 30) => {
  return Math.round(angle / snapDegrees) * snapDegrees;
};

// SVG path generators
export const createArcPath = (
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number
): string | null => {
  const arc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .startAngle(startAngle * Math.PI / 180)
    .endAngle(endAngle * Math.PI / 180);
  
  return arc({} as any);
};

export const createCurvedPath = (
  source: { x: number; y: number },
  target: { x: number; y: number },
  curvature: number = 0.7
) => {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dr = Math.sqrt(dx * dx + dy * dy) * curvature;
  return `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`;
};

// Zoom and pan utilities
export const createZoomBehavior = (
  extent: [[number, number], [number, number]] = [[0.1, 0.1], [10, 10]]
) => {
  return d3.zoom()
    .scaleExtent(extent[0])
    .translateExtent([extent[1], extent[1]]);
};

export const getZoomTransform = (selection: d3.Selection<any, any, any, any>) => {
  return d3.zoomTransform(selection.node());
};

// Animation utilities - use animation-utils.ts for comprehensive animation features

// Data transformation utilities - imported from centralized utils

// Legend creation utilities
export interface LegendItem {
  label: string;
  color: string;
  value?: number;
  symbol?: 'circle' | 'square' | 'line';
}

export const createLegend = (
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  items: LegendItem[],
  position: { x: number; y: number },
  options: {
    title?: string;
    itemHeight?: number;
    symbolSize?: number;
    maxWidth?: number;
  } = {}
) => {
  const {
    title,
    itemHeight = 20,
    symbolSize = 12,
    maxWidth = 200
  } = options;

  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${position.x}, ${position.y})`);

  // Background
  const legendBg = legend.append('rect')
    .attr('fill', 'white')
    .attr('stroke', '#e5e7eb')
    .attr('stroke-width', 1)
    .attr('rx', 6)
    .attr('opacity', 0.95);

  const contentGroup = legend.append('g')
    .attr('transform', 'translate(12, 12)');

  let yOffset = 0;

  // Title
  if (title) {
    contentGroup.append('text')
      .attr('y', yOffset)
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text(title);
    yOffset += 20;
  }

  // Legend items
  items.forEach((item, i) => {
    const itemGroup = contentGroup.append('g')
      .attr('transform', `translate(0, ${yOffset + i * itemHeight})`);

    // Symbol
    if (item.symbol === 'line') {
      itemGroup.append('line')
        .attr('x1', 0)
        .attr('x2', symbolSize)
        .attr('y1', symbolSize / 2)
        .attr('y2', symbolSize / 2)
        .attr('stroke', item.color)
        .attr('stroke-width', 3);
    } else {
      const symbol = item.symbol === 'square' ? 'rect' : 'circle';
      const element = itemGroup.append(symbol);
      
      if (symbol === 'rect') {
        element
          .attr('width', symbolSize)
          .attr('height', symbolSize)
          .attr('fill', item.color);
      } else {
        element
          .attr('cx', symbolSize / 2)
          .attr('cy', symbolSize / 2)
          .attr('r', symbolSize / 2)
          .attr('fill', item.color);
      }
    }

    // Label
    itemGroup.append('text')
      .attr('x', symbolSize + 8)
      .attr('y', symbolSize / 2)
      .attr('dy', '0.35em')
      .attr('font-size', '11px')
      .attr('fill', '#6b7280')
      .text(item.label);

    // Value (if provided)
    if (item.value !== undefined) {
      itemGroup.append('text')
        .attr('x', maxWidth - 10)
        .attr('y', symbolSize / 2)
        .attr('dy', '0.35em')
        .attr('font-size', '11px')
        .attr('fill', '#6b7280')
        .attr('text-anchor', 'end')
        .text(typeof item.value === 'number' ? formatCurrency(item.value) : item.value);
    }
  });

  // Size the background
  const contentBounds = contentGroup.node()!.getBBox();
  legendBg
    .attr('width', Math.max(contentBounds.width + 24, maxWidth))
    .attr('height', contentBounds.height + 24);

  return legend;
};