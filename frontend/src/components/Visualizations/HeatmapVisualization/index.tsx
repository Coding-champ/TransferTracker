import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { VisualizationProps } from '../../../types';

interface HeatmapVisualizationProps extends VisualizationProps {}

interface HeatmapCell {
  source: string;
  target: string;
  value: number;
  count: number;
  sourceIndex: number;
  targetIndex: number;
}

type HeatmapMode = 'value' | 'count';

export const HeatmapVisualization: React.FC<HeatmapVisualizationProps> = ({
  networkData,
  filters,
  width = 1200,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mode, setMode] = useState<HeatmapMode>('value');
  
  // Process data for heatmap
  const { matrix, labels } = useMemo(() => {
    if (!networkData?.edges || !networkData?.nodes) {
      return { matrix: [], labels: [] };
    }
    
    // Group by league for the heatmap
    const leagueMap = new Map<string, number>();
    const leagueNames: string[] = [];
    
    // Create unique league list
    networkData.nodes.forEach(node => {
      if (!leagueMap.has(node.league)) {
        leagueMap.set(node.league, leagueNames.length);
        leagueNames.push(node.league);
      }
    });
    
    // Initialize matrix
    const size = leagueNames.length;
    const valueMatrix: number[][] = Array(size).fill(null).map(() => Array(size).fill(0));
    const countMatrix: number[][] = Array(size).fill(null).map(() => Array(size).fill(0));
    
    // Populate matrix with transfer data
    const nodeMap = new Map(networkData.nodes.map(n => [n.id, n]));
    
    networkData.edges.forEach(edge => {
      const sourceNode = nodeMap.get(typeof edge.source === 'string' ? edge.source : edge.source.id);
      const targetNode = nodeMap.get(typeof edge.target === 'string' ? edge.target : edge.target.id);
      
      if (sourceNode && targetNode) {
        const sourceIndex = leagueMap.get(sourceNode.league)!;
        const targetIndex = leagueMap.get(targetNode.league)!;
        
        valueMatrix[sourceIndex][targetIndex] += edge.stats.totalValue;
        countMatrix[sourceIndex][targetIndex] += edge.stats.transferCount;
      }
    });
    
    // Create matrix data for visualization
    const matrix: HeatmapCell[] = [];
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        matrix.push({
          source: leagueNames[i],
          target: leagueNames[j],
          value: valueMatrix[i][j],
          count: countMatrix[i][j],
          sourceIndex: i,
          targetIndex: j
        });
      }
    }
    
    return { matrix, labels: leagueNames };
  }, [networkData]);

  useEffect(() => {
    if (!svgRef.current || labels.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const margin = { top: 80, right: 20, bottom: 100, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const cellSize = Math.min(innerWidth / labels.length, innerHeight / labels.length);
    const adjustedWidth = cellSize * labels.length;
    const adjustedHeight = cellSize * labels.length;
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Create scales
    const xScale = d3.scaleBand()
      .domain(labels)
      .range([0, adjustedWidth])
      .padding(0.1);
    
    const yScale = d3.scaleBand()
      .domain(labels)
      .range([0, adjustedHeight])
      .padding(0.1);
    
    // Color scale based on mode
    const values = matrix.map(d => mode === 'value' ? d.value : d.count).filter(v => v > 0);
    const colorScale = d3.scaleSequential(d3.interpolateReds)
      .domain([0, d3.max(values) || 1]);
    
    // Draw cells
    g.selectAll('.heatmap-cell')
      .data(matrix.filter(d => (mode === 'value' ? d.value : d.count) > 0))
      .enter()
      .append('rect')
      .attr('class', 'heatmap-cell')
      .attr('x', d => xScale(d.target)!)
      .attr('y', d => yScale(d.source)!)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(mode === 'value' ? d.value : d.count))
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke-width', 2).attr('stroke', '#333');
        
        // Add tooltip
        const tooltip = svg.append('g')
          .attr('class', 'heatmap-tooltip')
          .attr('transform', `translate(${event.offsetX}, ${event.offsetY})`);
        
        const rect = tooltip.append('rect')
          .attr('fill', 'black')
          .attr('opacity', 0.9)
          .attr('rx', 4);
        
        const text = tooltip.append('text')
          .attr('fill', 'white')
          .attr('font-size', '12px')
          .attr('text-anchor', 'middle')
          .attr('y', -5);
        
        text.append('tspan')
          .attr('x', 0)
          .attr('dy', 0)
          .text(`${d.source} → ${d.target}`);
        
        text.append('tspan')
          .attr('x', 0)
          .attr('dy', 16)
          .text(`${d.count} transfers`);
        
        text.append('tspan')
          .attr('x', 0)
          .attr('dy', 16)
          .text(`€${(d.value / 1000000).toFixed(1)}M total`);
        
        const bbox = text.node()!.getBBox();
        rect.attr('x', bbox.x - 4)
          .attr('y', bbox.y - 4)
          .attr('width', bbox.width + 8)
          .attr('height', bbox.height + 8);
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-width', 1).attr('stroke', 'white');
        svg.select('.heatmap-tooltip').remove();
      });
    
    // Add row labels (source leagues)
    g.selectAll('.row-label')
      .data(labels)
      .enter()
      .append('text')
      .attr('class', 'row-label')
      .attr('x', -10)
      .attr('y', d => yScale(d)! + yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#374151')
      .text(d => d.length > 15 ? d.substring(0, 15) + '...' : d);
    
    // Add column labels (target leagues)
    g.selectAll('.col-label')
      .data(labels)
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
      .text(d => d.length > 15 ? d.substring(0, 15) + '...' : d);
    
    // Add axis labels
    svg.append('text')
      .attr('x', margin.left + adjustedWidth / 2)
      .attr('y', height - 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text('Target League');
    
    svg.append('text')
      .attr('x', 30)
      .attr('y', margin.top + adjustedHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .attr('transform', `rotate(-90, 30, ${margin.top + adjustedHeight / 2})`)
      .text('Source League');
    
    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text(`Transfer ${mode === 'value' ? 'Value' : 'Count'} Heatmap by League`);
    
    // Add color legend
    const legendWidth = 200;
    const legendHeight = 20;
    const legendX = width - margin.right - legendWidth - 20;
    const legendY = 40;
    
    const legendScale = d3.scaleLinear()
      .domain(colorScale.domain())
      .range([0, legendWidth]);
    
    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d => mode === 'value' ? `€${(+d / 1000000).toFixed(0)}M` : (+d).toString());
    
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${legendX}, ${legendY})`);
    
    // Create gradient for legend
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'heatmap-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');
    
    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
      const offset = (i / numStops) * 100;
      const value = (i / numStops) * (colorScale.domain()[1] - colorScale.domain()[0]) + colorScale.domain()[0];
      gradient.append('stop')
        .attr('offset', `${offset}%`)
        .attr('stop-color', colorScale(value));
    }
    
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'url(#heatmap-gradient)')
      .attr('stroke', '#ccc');
    
    legend.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(legendAxis);
      
  }, [matrix, labels, mode, width, height]);

  if (!networkData?.edges?.length) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
        style={{ width, height }}
      >
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">🗺️</div>
          <div className="text-lg font-medium">Heatmap Visualization</div>
          <div className="text-sm mt-2">No data available</div>
          <div className="text-xs mt-1">Apply filters to see transfer activity heatmap</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-white border rounded-lg p-2 shadow-sm">
          <label className="block text-xs font-medium text-gray-700 mb-1">Show:</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as HeatmapMode)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="value">Transfer Value</option>
            <option value="count">Transfer Count</option>
          </select>
        </div>
      </div>
      
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border rounded-lg bg-white"
      />
    </div>
  );
};

export default HeatmapVisualization;