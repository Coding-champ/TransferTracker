import { useCallback, useEffect } from 'react';
import * as d3 from 'd3';
import { HeatmapData, HeatmapCell, HeatmapConfig, UseHeatmapInteractionProps } from '../types';

export const useHeatmapInteraction = ({
  heatmapData,
  svgRef,
  config,
  onCellClick,
  onCellHover
}: UseHeatmapInteractionProps) => {
  
  const setupInteractions = useCallback(() => {
    if (!svgRef.current || !heatmapData) return;

    const svg = d3.select(svgRef.current);
    
    // Remove existing interactions
    svg.selectAll('.heatmap-cell')
      .on('mouseover', null)
      .on('mouseout', null)
      .on('click', null);

    // Setup hover interactions
    svg.selectAll('.heatmap-cell')
      .on('mouseover', function(event, d: HeatmapCell) {
        // Highlight current cell
        d3.select(this)
          .transition()
          .duration(150)
          .attr('stroke-width', 3)
          .attr('stroke', '#333333');

        // Highlight row and column
        svg.selectAll('.heatmap-cell')
          .filter((cell: HeatmapCell) => 
            cell.sourceIndex === d.sourceIndex || cell.targetIndex === d.targetIndex
          )
          .transition()
          .duration(150)
          .attr('opacity', 1);

        // Dim other cells
        svg.selectAll('.heatmap-cell')
          .filter((cell: HeatmapCell) => 
            cell.sourceIndex !== d.sourceIndex && cell.targetIndex !== d.targetIndex
          )
          .transition()
          .duration(150)
          .attr('opacity', 0.3);

        // Highlight labels
        svg.selectAll('.row-label')
          .filter((_, i) => i === d.sourceIndex)
          .transition()
          .duration(150)
          .attr('font-weight', 'bold')
          .attr('font-size', '12px');

        svg.selectAll('.col-label')
          .filter((_, i) => i === d.targetIndex)
          .transition()
          .duration(150)
          .attr('font-weight', 'bold')
          .attr('font-size', '12px');

        // Trigger hover callback with position
        const [mouseX, mouseY] = d3.pointer(event);
        onCellHover(d, { x: mouseX, y: mouseY });
      })
      .on('mouseout', function(event, d: HeatmapCell) {
        // Reset cell highlighting
        d3.select(this)
          .transition()
          .duration(150)
          .attr('stroke-width', 1)
          .attr('stroke', 'white');

        // Reset all cells opacity
        svg.selectAll('.heatmap-cell')
          .transition()
          .duration(150)
          .attr('opacity', 1);

        // Reset labels
        svg.selectAll('.row-label, .col-label')
          .transition()
          .duration(150)
          .attr('font-weight', 'normal')
          .attr('font-size', '10px');

        // Clear hover
        onCellHover(null);
      })
      .on('click', function(event, d: HeatmapCell) {
        // Add click animation
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke-width', 4)
          .attr('stroke', '#007bff')
          .transition()
          .duration(200)
          .attr('stroke-width', 2);

        // Trigger click callback
        onCellClick(d);
      });

    // Setup keyboard interactions
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Clear all selections and hover states
        svg.selectAll('.heatmap-cell')
          .transition()
          .duration(300)
          .attr('opacity', 1)
          .attr('stroke-width', 1)
          .attr('stroke', 'white');

        svg.selectAll('.row-label, .col-label')
          .transition()
          .duration(300)
          .attr('font-weight', 'normal')
          .attr('font-size', '10px');

        onCellHover(null);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [heatmapData, svgRef, onCellClick, onCellHover]);

  // Setup interactions when data or config changes
  useEffect(() => {
    const cleanup = setupInteractions();
    return cleanup;
  }, [setupInteractions]);

  // Utility function to programmatically trigger cell selection
  const selectCell = useCallback((sourceIndex: number, targetIndex: number) => {
    if (!svgRef.current || !heatmapData) return;

    const svg = d3.select(svgRef.current);
    const targetCell = heatmapData.matrix.find(
      cell => cell.sourceIndex === sourceIndex && cell.targetIndex === targetIndex
    );

    if (targetCell) {
      svg.selectAll('.heatmap-cell')
        .filter((d: HeatmapCell) => 
          d.sourceIndex === sourceIndex && d.targetIndex === targetIndex
        )
        .dispatch('click');
    }
  }, [svgRef, heatmapData]);

  // Utility function to highlight specific cells based on criteria
  const highlightCells = useCallback((
    predicate: (cell: HeatmapCell) => boolean,
    highlightColor = '#ffa500'
  ) => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    
    svg.selectAll('.heatmap-cell')
      .filter((d: HeatmapCell) => predicate(d))
      .transition()
      .duration(300)
      .attr('stroke', highlightColor)
      .attr('stroke-width', 3);
  }, [svgRef]);

  // Clear all highlights
  const clearHighlights = useCallback(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    
    svg.selectAll('.heatmap-cell')
      .transition()
      .duration(300)
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 1);

    svg.selectAll('.row-label, .col-label')
      .transition()
      .duration(300)
      .attr('font-weight', 'normal')
      .attr('font-size', '10px');
  }, [svgRef]);

  return {
    selectCell,
    highlightCells,
    clearHighlights
  };
};