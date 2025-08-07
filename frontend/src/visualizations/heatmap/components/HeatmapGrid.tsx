import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { HeatmapData, HeatmapConfig, HeatmapMode, HeatmapCell } from '../types';
import { createHeatmapColorScale, formatColorScaleValue } from '../utils/colorScales';
import { findOptimalCellSize } from '../utils/heatmapCalculations';

interface HeatmapGridProps {
  data: HeatmapData;
  config: HeatmapConfig;
  mode: HeatmapMode;
  onCellHover?: (cell: HeatmapCell | null, position?: { x: number; y: number }) => void;
  onCellClick?: (cell: HeatmapCell) => void;
  className?: string;
}

export const HeatmapGrid: React.FC<HeatmapGridProps> = ({
  data,
  config,
  mode,
  onCellHover,
  onCellClick,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const currentHoveredCellRef = useRef<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data.matrix.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height, margin } = config;

    // Calculate optimal cell size
    const cellSize = findOptimalCellSize(width, height, data.labels.length, margin);
    const adjustedWidth = cellSize * data.labels.length;
    const adjustedHeight = cellSize * data.labels.length;

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create scales
    const xScale = d3.scaleBand()
      .domain(data.labels)
      .range([0, adjustedWidth])
      .padding(0.05);

    const yScale = d3.scaleBand()
      .domain(data.labels)
      .range([0, adjustedHeight])
      .padding(0.05);

    // Create color scale based on mode
    const values = data.matrix.map(d => {
      switch (mode) {
        case 'value': return d.value;
        case 'count': return d.count;
        case 'success-rate': return d.successRate || 0;
        default: return d.value;
      }
    });

    const colorScale = createHeatmapColorScale(mode, values);

    // Draw cells
    const cells = g.selectAll('.heatmap-cell')
      .data(data.matrix)
      .enter()
      .append('rect')
      .attr('class', 'heatmap-cell')
      .attr('x', d => xScale(d.target)!)
      .attr('y', d => yScale(d.source)!)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => {
        const value = mode === 'value' ? d.value : 
                     mode === 'count' ? d.count : 
                     d.successRate || 0;
        return colorScale(value);
      })
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 0)
      .style('cursor', 'pointer');

    // Animate cells entrance
    cells.transition()
      .duration(config.animationDuration)
      .delay((d, i) => i * 10)
      .attr('opacity', 1);

    // Add value labels for large cells
    if (cellSize > 30) {
      g.selectAll('.cell-label')
        .data(data.matrix.filter(d => {
          const value = mode === 'value' ? d.value : 
                       mode === 'count' ? d.count : 
                       d.successRate || 0;
          return value > 0;
        }))
        .enter()
        .append('text')
        .attr('class', 'cell-label')
        .attr('x', d => xScale(d.target)! + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.source)! + yScale.bandwidth() / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', `${Math.min(cellSize / 6, 10)}px`)
        .attr('fill', d => {
          const value = mode === 'value' ? d.value : 
                       mode === 'count' ? d.count : 
                       d.successRate || 0;
          const bgColor = colorScale(value);
          // Simple contrast check
          return d3.color(bgColor)!.darker(2).toString();
        })
        .attr('opacity', 0)
        .text(d => {
          const value = mode === 'value' ? d.value : 
                       mode === 'count' ? d.count : 
                       d.successRate || 0;
          return formatColorScaleValue(value, mode);
        })
        .transition()
        .duration(config.animationDuration)
        .delay((d, i) => i * 10 + 200)
        .attr('opacity', 0.8);
    }

    // Add row labels (source)
    g.selectAll('.row-label')
      .data(data.labels)
      .enter()
      .append('text')
      .attr('class', 'row-label')
      .attr('x', -10)
      .attr('y', d => yScale(d)! + yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#374151')
      .text(d => d.length > 20 ? d.substring(0, 20) + '...' : d);

    // Add column labels (target)
    g.selectAll('.col-label')
      .data(data.labels)
      .enter()
      .append('text')
      .attr('class', 'col-label')
      .attr('x', d => xScale(d)! + xScale.bandwidth() / 2)
      .attr('y', -10)
      .attr('text-anchor', 'start')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#374151')
      .attr('transform', d => `rotate(-45, ${xScale(d)! + xScale.bandwidth() / 2}, -10)`)
      .text(d => d.length > 20 ? d.substring(0, 20) + '...' : d);

    // Add interactions
    cells
      .on('mouseover', function(event, d) {
        const cellId = `${d.source}-${d.target}`;
        if (currentHoveredCellRef.current !== cellId) {
          currentHoveredCellRef.current = cellId;
          if (onCellHover) {
            // Calculate tooltip position once per cell (centered in cell)
            const cellRect = this.getBoundingClientRect();
            const tooltipX = cellRect.left + cellRect.width / 2;
            const tooltipY = cellRect.top + cellRect.height / 2;
            onCellHover(d, { x: tooltipX, y: tooltipY });
          }
        }
      })
      .on('mouseleave', function() {
        currentHoveredCellRef.current = null;
        if (onCellHover) {
          onCellHover(null);
        }
      })
      .on('click', function(event, d) {
        if (onCellClick) {
          onCellClick(d);
        }
      });

  }, [data, config, mode, onCellHover, onCellClick]);

  // Reset hovered cell when data changes
  useEffect(() => {
    currentHoveredCellRef.current = null;
  }, [data.matrix]);

  return (
    <svg
      ref={svgRef}
      width={config.width}
      height={config.height}
      className={`heatmap-grid ${className}`}
    />
  );
};