import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { VisualizationProps } from '../../../types';

interface TimelineVisualizationProps extends VisualizationProps {}

interface TimelineData {
  date: Date;
  count: number;
  value: number;
  season: string;
  window: string;
}

type TimelineMetric = 'count' | 'value' | 'avgValue';

export const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({
  networkData,
  filters,
  width = 1200,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [metric, setMetric] = useState<TimelineMetric>('count');
  
  // Process data for timeline
  const timelineData = useMemo(() => {
    if (!networkData?.edges || !networkData?.nodes) {
      return [];
    }
    
    const dataMap = new Map<string, { count: number; value: number; season: string; window: string }>();
    
    // Process all transfers
    networkData.edges.forEach(edge => {
      edge.transfers.forEach(transfer => {
        const date = new Date(transfer.date);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        
        if (!dataMap.has(dateKey)) {
          dataMap.set(dateKey, {
            count: 0,
            value: 0,
            season: transfer.season,
            window: transfer.transferWindow || 'unknown'
          });
        }
        
        const entry = dataMap.get(dateKey)!;
        entry.count += 1;
        entry.value += transfer.transferFee || 0;
      });
    });
    
    // Convert to array and sort by date
    const data: TimelineData[] = Array.from(dataMap.entries()).map(([dateStr, data]) => ({
      date: new Date(dateStr),
      count: data.count,
      value: data.value,
      season: data.season,
      window: data.window
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
    
    return data;
  }, [networkData]);

  useEffect(() => {
    if (!svgRef.current || timelineData.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const margin = { top: 40, right: 60, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(timelineData, d => d.date) as [Date, Date])
      .range([0, innerWidth]);
    
    let yScale: d3.ScaleLinear<number, number>;
    let getMetricValue: (d: TimelineData) => number;
    
    switch (metric) {
      case 'count':
        getMetricValue = d => d.count;
        yScale = d3.scaleLinear()
          .domain([0, d3.max(timelineData, getMetricValue) || 1])
          .range([innerHeight, 0]);
        break;
      case 'value':
        getMetricValue = d => d.value;
        yScale = d3.scaleLinear()
          .domain([0, d3.max(timelineData, getMetricValue) || 1])
          .range([innerHeight, 0]);
        break;
      case 'avgValue':
        getMetricValue = d => d.count > 0 ? d.value / d.count : 0;
        yScale = d3.scaleLinear()
          .domain([0, d3.max(timelineData, getMetricValue) || 1])
          .range([innerHeight, 0]);
        break;
      default:
        getMetricValue = d => d.count;
        yScale = d3.scaleLinear()
          .domain([0, d3.max(timelineData, getMetricValue) || 1])
          .range([innerHeight, 0]);
    }
    
    // Line generator
    const line = d3.line<TimelineData>()
      .x(d => xScale(d.date))
      .y(d => yScale(getMetricValue(d)))
      .curve(d3.curveMonotoneX);
    
    // Area generator for background
    const area = d3.area<TimelineData>()
      .x(d => xScale(d.date))
      .y0(innerHeight)
      .y1(d => yScale(getMetricValue(d)))
      .curve(d3.curveMonotoneX);
    
    // Add gradient for area
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'timeline-gradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0).attr('y1', innerHeight)
      .attr('x2', 0).attr('y2', 0);
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#3b82f6')
      .attr('stop-opacity', 0.1);
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#3b82f6')
      .attr('stop-opacity', 0.6);
    
    // Draw area
    g.append('path')
      .datum(timelineData)
      .attr('class', 'timeline-area')
      .attr('fill', 'url(#timeline-gradient)')
      .attr('d', area);
    
    // Draw line
    g.append('path')
      .datum(timelineData)
      .attr('class', 'timeline-line')
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2)
      .attr('d', line);
    
    // Draw points
    g.selectAll('.timeline-point')
      .data(timelineData)
      .enter()
      .append('circle')
      .attr('class', 'timeline-point')
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(getMetricValue(d)))
      .attr('r', 4)
      .attr('fill', '#3b82f6')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .on('mouseover', function(event, d) {
        d3.select(this).attr('r', 6);
        
        // Add tooltip
        const tooltip = svg.append('g')
          .attr('class', 'timeline-tooltip')
          .attr('transform', `translate(${xScale(d.date) + margin.left}, ${yScale(getMetricValue(d)) + margin.top - 10})`);
        
        const rect = tooltip.append('rect')
          .attr('fill', 'black')
          .attr('opacity', 0.9)
          .attr('rx', 4);
        
        const text = tooltip.append('text')
          .attr('fill', 'white')
          .attr('font-size', '12px')
          .attr('text-anchor', 'middle')
          .attr('y', -5);
        
        const formatDate = d3.timeFormat('%b %Y');
        text.append('tspan')
          .attr('x', 0)
          .attr('dy', 0)
          .text(formatDate(d.date));
        
        text.append('tspan')
          .attr('x', 0)
          .attr('dy', 16)
          .text(`${d.count} transfers`);
        
        if (metric === 'value') {
          text.append('tspan')
            .attr('x', 0)
            .attr('dy', 16)
            .text(`€${(d.value / 1000000).toFixed(1)}M total`);
        } else if (metric === 'avgValue') {
          text.append('tspan')
            .attr('x', 0)
            .attr('dy', 16)
            .text(`€${(getMetricValue(d) / 1000000).toFixed(1)}M avg`);
        }
        
        text.append('tspan')
          .attr('x', 0)
          .attr('dy', 16)
          .text(`Season: ${d.season}`);
        
        const bbox = text.node()!.getBBox();
        rect.attr('x', bbox.x - 4)
          .attr('y', bbox.y - 4)
          .attr('width', bbox.width + 8)
          .attr('height', bbox.height + 8);
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', 4);
        svg.select('.timeline-tooltip').remove();
      });
    
    // X-axis
    const xAxis = d3.axisBottom(xScale)
      .tickFormat((d) => d3.timeFormat('%b %Y')(d as Date))
      .ticks(d3.timeMonth.every(3));
    
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');
    
    // Y-axis
    let yAxisFormat: (d: d3.NumberValue) => string;
    switch (metric) {
      case 'value':
      case 'avgValue':
        yAxisFormat = (d: d3.NumberValue) => `€${(+d / 1000000).toFixed(0)}M`;
        break;
      default:
        yAxisFormat = (d: d3.NumberValue) => d.toString();
    }
    
    const yAxis = d3.axisLeft(yScale)
      .tickFormat(yAxisFormat);
    
    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);
    
    // Axis labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#6b7280')
      .text('Time Period');
    
    let yLabel = '';
    switch (metric) {
      case 'count':
        yLabel = 'Number of Transfers';
        break;
      case 'value':
        yLabel = 'Total Transfer Value (€M)';
        break;
      case 'avgValue':
        yLabel = 'Average Transfer Value (€M)';
        break;
    }
    
    svg.append('text')
      .attr('x', 15)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#6b7280')
      .attr('transform', `rotate(-90, 15, ${height / 2})`)
      .text(yLabel);
    
    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text(`Transfer Trends Over Time - ${yLabel}`);
      
  }, [timelineData, metric, width, height]);

  if (!networkData?.edges?.length) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
        style={{ width, height }}
      >
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📅</div>
          <div className="text-lg font-medium">Timeline Visualization</div>
          <div className="text-sm mt-2">No data available</div>
          <div className="text-xs mt-1">Apply filters to see transfer timeline</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-white border rounded-lg p-2 shadow-sm">
          <label className="block text-xs font-medium text-gray-700 mb-1">Metric:</label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as TimelineMetric)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="count">Transfer Count</option>
            <option value="value">Total Value</option>
            <option value="avgValue">Average Value</option>
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

export default TimelineVisualization;