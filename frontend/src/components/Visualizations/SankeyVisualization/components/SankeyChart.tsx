import React, { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import * as d3Sankey from 'd3-sankey';

interface SankeyNode {
  id: string;
  name: string;
  category: string;
  value: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
}

interface SankeyLink {
  source: number | SankeyNode;
  target: number | SankeyNode;
  value: number;
  sourceCategory: string;
  targetCategory: string;
  width?: number;
}

interface SankeyChartProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  width: number;
  height: number;
  groupingMode: string;
}

const SankeyChart: React.FC<SankeyChartProps> = ({
  nodes,
  links,
  width,
  height,
  groupingMode
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const renderSankey = useCallback(() => {
    if (!svgRef.current || nodes.length === 0 || links.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Set up Sankey layout
    const sankeyLayout = d3Sankey.sankey()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[1, 1], [innerWidth - 1, innerHeight - 6]]);

    // Create a copy of the data for the sankey layout
    const sankeyData: d3Sankey.SankeyGraph<{}, {}> = {
      nodes: nodes.map(d => ({ ...d })),
      links: links.map(d => ({ ...d }))
    };

    try {
      sankeyLayout(sankeyData);
    } catch (error) {
      console.error('Sankey layout error:', error);
      return;
    }

    // Color scale
    const colorScale = d3.scaleOrdinal()
      .domain(nodes.map(d => d.name))
      .range(d3.schemeCategory10);

    // Draw links
    g.append('g')
      .selectAll('.link')
      .data(sankeyData.links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3Sankey.sankeyLinkHorizontal())
      .attr('stroke', (d: any) => colorScale(d.source.name) as string)
      .attr('stroke-width', (d: any) => Math.max(1, d.width || 0))
      .attr('stroke-opacity', 0.4)
      .attr('fill', 'none')
      .on('mouseover', function(event, d: any) {
        d3.select(this).attr('stroke-opacity', 0.8);
        
        // Add tooltip
        const tooltip = svg.append('g')
          .attr('class', 'link-tooltip')
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
          .text(`${d.source.name} → ${d.target.name}`);

        text.append('tspan')
          .attr('x', 0)
          .attr('dy', 16)
          .text(`€${(d.value / 1000000).toFixed(1)}M`);

        const bbox = text.node()!.getBBox();
        rect.attr('x', bbox.x - 4)
          .attr('y', bbox.y - 4)
          .attr('width', bbox.width + 8)
          .attr('height', bbox.height + 8);
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-opacity', 0.4);
        svg.select('.link-tooltip').remove();
      });

    // Draw nodes
    const node = g.append('g')
      .selectAll('.node')
      .data(sankeyData.nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.x0}, ${d.y0})`);

    node.append('rect')
      .attr('height', (d: any) => (d.y1 || 0) - (d.y0 || 0))
      .attr('width', sankeyLayout.nodeWidth())
      .attr('fill', (d: any) => colorScale(d.name) as string)
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .on('mouseover', function(event, d: any) {
        d3.select(this).attr('opacity', 0.8);
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 1);
      });

    // Add node labels
    node.append('text')
      .attr('x', (d: any) => (d.x0 || 0) < innerWidth / 2 ? sankeyLayout.nodeWidth() + 6 : -6)
      .attr('y', (d: any) => ((d.y1 || 0) - (d.y0 || 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => (d.x0 || 0) < innerWidth / 2 ? 'start' : 'end')
      .attr('font-size', '12px')
      .attr('fill', '#374151')
      .text((d: any) => d.name)
      .each(function(d: any) {
        // Wrap long text
        const text = d3.select(this);
        const words = d.name.split(/\s+/).reverse();
        let word;
        let line: string[] = [];
        let lineNumber = 0;
        const lineHeight = 1.1;
        const y = text.attr('y');
        const dy = parseFloat(text.attr('dy'));
        let tspan = text.text(null).append('tspan').attr('x', text.attr('x')).attr('y', y).attr('dy', dy + 'em');
        
        while ((word = words.pop())) {
          line.push(word);
          tspan.text(line.join(' '));
          if (tspan.node()!.getComputedTextLength() > 80) {
            line.pop();
            tspan.text(line.join(' '));
            line = [word];
            tspan = text.append('tspan').attr('x', text.attr('x')).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text(word);
          }
        }
      });

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text(`Transfer Flows by ${groupingMode.charAt(0).toUpperCase() + groupingMode.slice(1)}`);

  }, [nodes, links, width, height, groupingMode]);

  useEffect(() => {
    renderSankey();
  }, [renderSankey]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="border rounded-lg bg-white"
    />
  );
};

export default SankeyChart;