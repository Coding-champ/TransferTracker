import React, { useRef, useEffect, useCallback } from 'react';
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
  const isInitializedRef = useRef<boolean>(false);
  const lastHoverTimeRef = useRef<number>(0);

  // Stable event handlers using useCallback to prevent recreation
  const handleCellEnter = useCallback((event: any, d: HeatmapCell) => {
    const cellId = `${d.source}-${d.target}`;
    const now = Date.now();
    
    // Prevent rapid oscillation by adding a small debounce for the same cell
    if (currentHoveredCellRef.current === cellId && now - lastHoverTimeRef.current < 100) {
      return;
    }
    
    // Only update if this is a different cell to prevent rapid re-firing
    if (currentHoveredCellRef.current !== cellId) {
      currentHoveredCellRef.current = cellId;
      lastHoverTimeRef.current = now;
      if (onCellHover) {
        // Calculate tooltip position once per cell (centered in cell)  
        const cellRect = event.target.getBoundingClientRect();
        const tooltipX = cellRect.left + cellRect.width / 2;
        const tooltipY = cellRect.top + cellRect.height / 2;
        onCellHover(d, { x: tooltipX, y: tooltipY });
      }
    }
  }, [onCellHover]);

  const handleCellLeave = useCallback((event: any, d: HeatmapCell) => {
    const cellId = `${d.source}-${d.target}`;
    const now = Date.now();
    
    // Prevent rapid oscillation by adding a small debounce
    if (now - lastHoverTimeRef.current < 50) {
      return;
    }
    
    // Only clear if we're leaving the current hovered cell
    if (currentHoveredCellRef.current === cellId) {
      currentHoveredCellRef.current = null;
      if (onCellHover) {
        onCellHover(null);
      }
    }
  }, [onCellHover]);

  const handleCellClick = useCallback((event: any, d: HeatmapCell) => {
    if (onCellClick) {
      onCellClick(d);
    }
  }, [onCellClick]);

  const handleSvgLeave = useCallback(() => {
    currentHoveredCellRef.current = null;
    if (onCellHover) {
      onCellHover(null);
    }
  }, [onCellHover]);

  useEffect(() => {
    if (!svgRef.current || !data.matrix.length) return;

    const svg = d3.select(svgRef.current);
    const { width, height, margin } = config;

    // Only clear and rebuild if this is the first time or data structure changed significantly
    if (!isInitializedRef.current || svg.select('g.main-group').empty()) {
      svg.selectAll('*').remove();
      isInitializedRef.current = true;
    }

    // Calculate optimal cell size
    const cellSize = findOptimalCellSize(width, height, data.labels.length, margin);
    const adjustedWidth = cellSize * data.labels.length;
    const adjustedHeight = cellSize * data.labels.length;

    // Create or select main group
    let g = svg.select<SVGGElement>('g.main-group');
    if (g.empty()) {
      g = svg.append('g')
        .attr('class', 'main-group')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    }

    // Add mouse leave detection on the entire SVG
    svg.on('mouseleave', handleSvgLeave);

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

    // Update cells (data join pattern to minimize DOM manipulation)
    const cellSelection = g.selectAll<SVGRectElement, HeatmapCell>('.heatmap-cell')
      .data(data.matrix, (d: HeatmapCell) => `${d.source}-${d.target}`);

    // Remove old cells
    cellSelection.exit().remove();

    // Add new cells
    const newCells = cellSelection.enter()
      .append('rect')
      .attr('class', 'heatmap-cell')
      .attr('pointer-events', 'none')
      .attr('opacity', 0);

    // Update all cells (new + existing)
    const allCells = newCells.merge(cellSelection)
      .attr('x', (d: HeatmapCell) => xScale(d.target)!)
      .attr('y', (d: HeatmapCell) => yScale(d.source)!)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('stroke', 'white')
      .attr('stroke-width', 1);

    // Update fill colors
    allCells.transition()
      .duration(300)
      .attr('fill', (d: HeatmapCell) => {
        const value = mode === 'value' ? d.value : 
                     mode === 'count' ? d.count : 
                     d.successRate || 0;
        return colorScale(value);
      })
      .attr('opacity', 1);

    // Update value labels (only for large cells)
    const labelSelection = g.selectAll<SVGTextElement, HeatmapCell>('.cell-label')
      .data(cellSize > 30 ? data.matrix.filter(d => {
        const value = mode === 'value' ? d.value : 
                     mode === 'count' ? d.count : 
                     d.successRate || 0;
        return value > 0;
      }) : [], (d: HeatmapCell) => `${d.source}-${d.target}`);

    labelSelection.exit().remove();

    const newLabels = labelSelection.enter()
      .append('text')
      .attr('class', 'cell-label')
      .attr('pointer-events', 'none')
      .attr('opacity', 0);

    const allLabels = newLabels.merge(labelSelection)
      .attr('x', (d: HeatmapCell) => xScale(d.target)! + xScale.bandwidth() / 2)
      .attr('y', (d: HeatmapCell) => yScale(d.source)! + yScale.bandwidth() / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', `${Math.min(cellSize / 6, 10)}px`);

    allLabels.transition()
      .duration(300)
      .attr('fill', (d: HeatmapCell) => {
        const value = mode === 'value' ? d.value : 
                     mode === 'count' ? d.count : 
                     d.successRate || 0;
        const bgColor = colorScale(value);
        return d3.color(bgColor)!.darker(2).toString();
      })
      .attr('opacity', 0.8)
      .text((d: HeatmapCell) => {
        const value = mode === 'value' ? d.value : 
                     mode === 'count' ? d.count : 
                     d.successRate || 0;
        return formatColorScaleValue(value, mode);
      });

    // Update row labels
    const rowLabelSelection = g.selectAll<SVGTextElement, string>('.row-label')
      .data(data.labels, (d: string) => d);

    rowLabelSelection.exit().remove();

    const newRowLabels = rowLabelSelection.enter()
      .append('text')
      .attr('class', 'row-label')
      .attr('pointer-events', 'none');

    newRowLabels.merge(rowLabelSelection)
      .attr('x', -10)
      .attr('y', (d: string) => yScale(d)! + yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#374151')
      .text((d: string) => d.length > 20 ? d.substring(0, 20) + '...' : d);

    // Update column labels
    const colLabelSelection = g.selectAll<SVGTextElement, string>('.col-label')
      .data(data.labels, (d: string) => d);

    colLabelSelection.exit().remove();

    const newColLabels = colLabelSelection.enter()
      .append('text')
      .attr('class', 'col-label')
      .attr('pointer-events', 'none');

    newColLabels.merge(colLabelSelection)
      .attr('x', (d: string) => xScale(d)! + xScale.bandwidth() / 2)
      .attr('y', -10)
      .attr('text-anchor', 'start')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#374151')
      .attr('transform', (d: string) => `rotate(-45, ${xScale(d)! + xScale.bandwidth() / 2}, -10)`)
      .text((d: string) => d.length > 20 ? d.substring(0, 20) + '...' : d);

    // Update cell overlays for interaction
    const overlaySelection = g.selectAll<SVGRectElement, HeatmapCell>('.cell-overlay')
      .data(data.matrix, (d: HeatmapCell) => `${d.source}-${d.target}`);

    overlaySelection.exit().remove();

    const newOverlays = overlaySelection.enter()
      .append('rect')
      .attr('class', 'cell-overlay')
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all')
      .style('cursor', 'pointer');

    const allOverlays = newOverlays.merge(overlaySelection)
      .attr('x', (d: HeatmapCell) => xScale(d.target)!)
      .attr('y', (d: HeatmapCell) => yScale(d.source)!)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth());

    // Apply event handlers to overlays
    allOverlays
      .on('mouseenter', handleCellEnter)
      .on('mouseleave', handleCellLeave)
      .on('click', handleCellClick);

  }, [data, config, mode, handleCellEnter, handleCellLeave, handleCellClick, handleSvgLeave]);

  // Reset hovered cell when data changes
  useEffect(() => {
    currentHoveredCellRef.current = null;
    lastHoverTimeRef.current = 0;
    isInitializedRef.current = false; // Force re-initialization on data change
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