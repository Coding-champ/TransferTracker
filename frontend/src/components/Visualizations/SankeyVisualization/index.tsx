import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { VisualizationProps } from '../../../types';

interface SankeyVisualizationProps extends VisualizationProps {}

type GroupingMode = 'continent' | 'league' | 'position';

export const SankeyVisualization: React.FC<SankeyVisualizationProps> = ({
  networkData,
  filters,
  width = 1200,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('continent');
  
  // Process data for Sankey layout
  const { nodes, links } = useMemo(() => {
    if (!networkData?.edges || !networkData?.nodes) {
      return { nodes: [], links: [] };
    }
    
    const nodeMap = new Map(networkData.nodes.map(n => [n.id, n]));
    const flowData = new Map<string, number>();
    
    // Process transfers based on grouping mode
    networkData.edges.forEach(edge => {
      const sourceNode = nodeMap.get(typeof edge.source === 'string' ? edge.source : edge.source.id);
      const targetNode = nodeMap.get(typeof edge.target === 'string' ? edge.target : edge.target.id);
      
      if (!sourceNode || !targetNode) return;
      
      let sourceCategory: string;
      let targetCategory: string;
      
      switch (groupingMode) {
        case 'continent':
          sourceCategory = sourceNode.continent || 'Unknown';
          targetCategory = targetNode.continent || 'Unknown';
          break;
        case 'league':
          sourceCategory = sourceNode.league;
          targetCategory = targetNode.league;
          break;
        case 'position':
          // For position, we'll use transfer types as a proxy
          sourceCategory = 'Outgoing';
          targetCategory = 'Incoming';
          break;
        default:
          sourceCategory = sourceNode.continent || 'Unknown';
          targetCategory = targetNode.continent || 'Unknown';
      }
      
      if (sourceCategory !== targetCategory) {
        const flowKey = `${sourceCategory}→${targetCategory}`;
        flowData.set(flowKey, (flowData.get(flowKey) || 0) + edge.stats.totalValue);
      }
    });
    
    // Create unique nodes
    const nodeSet = new Set<string>();
    flowData.forEach((value, key) => {
      const [source, target] = key.split('→');
      nodeSet.add(source);
      nodeSet.add(target);
    });
    
    const nodes = Array.from(nodeSet).map(name => ({
      id: name,
      name,
      category: groupingMode,
      value: 0
    }));
    
    // Calculate node values
    const nodeValueMap = new Map<string, number>();
    flowData.forEach((value, key) => {
      const [source, target] = key.split('→');
      nodeValueMap.set(source, (nodeValueMap.get(source) || 0) + value);
      nodeValueMap.set(target, (nodeValueMap.get(target) || 0) + value);
    });
    
    nodes.forEach(node => {
      node.value = nodeValueMap.get(node.name) || 0;
    });
    
    // Create links
    const links: any[] = [];
    flowData.forEach((value, key) => {
      const [sourceName, targetName] = key.split('→');
      const sourceIndex = nodes.findIndex(n => n.name === sourceName);
      const targetIndex = nodes.findIndex(n => n.name === targetName);
      
      if (sourceIndex !== -1 && targetIndex !== -1) {
        links.push({
          source: sourceIndex,
          target: targetIndex,
          value,
          sourceCategory: sourceName,
          targetCategory: targetName
        });
      }
    });
    
    return { nodes, links };
  }, [networkData, groupingMode]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Set up Sankey layout
    const sankeyLayout = sankey()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[1, 1], [innerWidth - 1, innerHeight - 6]]);
    
    // Create a copy of the data for the sankey layout
    const sankeyData = {
      nodes: nodes.map(d => ({ ...d })),
      links: links.map(d => ({ ...d }))
    };
    
    sankeyLayout(sankeyData as any);
    
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
      .attr('d', sankeyLinkHorizontal())
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

  if (!networkData?.edges?.length) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
        style={{ width, height }}
      >
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">🌊</div>
          <div className="text-lg font-medium">Sankey Visualization</div>
          <div className="text-sm mt-2">No data available</div>
          <div className="text-xs mt-1">Apply filters to see transfer flows</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-white border rounded-lg p-2 shadow-sm">
          <label className="block text-xs font-medium text-gray-700 mb-1">Group by:</label>
          <select
            value={groupingMode}
            onChange={(e) => setGroupingMode(e.target.value as GroupingMode)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="continent">Continent</option>
            <option value="league">League</option>
            <option value="position">Direction</option>
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

export default SankeyVisualization;