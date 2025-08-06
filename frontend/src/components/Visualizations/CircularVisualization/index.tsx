import React, { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { VisualizationProps, NetworkNode } from '../../../types';

interface CircularVisualizationProps extends VisualizationProps {}

interface CircularNode {
  id: string;
  name: string;
  league: string;
  tier: number;
  angle: number;
  radius: number;
  transferCount: number;
  totalValue: number;
  x: number;
  y: number;
}

interface CircularArc {
  source: CircularNode;
  target: CircularNode;
  value: number;
  type: 'inward' | 'outward' | 'same-tier';
}

export const CircularVisualization: React.FC<CircularVisualizationProps> = ({
  networkData,
  filters,
  width = 800,
  height = 800
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Process data for circular layout
  const { circularNodes, arcs, tiers } = useMemo(() => {
    if (!networkData?.nodes || !networkData?.edges) {
      return { circularNodes: [], arcs: [], tiers: [] };
    }
    
    // Group nodes by tier
    const nodesByTier = new Map<number, NetworkNode[]>();
    networkData.nodes.forEach(node => {
      const tier = node.leagueTier || 1;
      if (!nodesByTier.has(tier)) {
        nodesByTier.set(tier, []);
      }
      nodesByTier.get(tier)!.push(node);
    });
    
    // Calculate radial positions
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 40;
    const minRadius = 60;
    
    const tiers = Array.from(nodesByTier.keys()).sort((a, b) => a - b);
    const radiusStep = (maxRadius - minRadius) / Math.max(tiers.length - 1, 1);
    
    const circularNodes: CircularNode[] = [];
    
    tiers.forEach((tier, tierIndex) => {
      const nodes = nodesByTier.get(tier)!;
      const radius = minRadius + tierIndex * radiusStep;
      const angleStep = (2 * Math.PI) / nodes.length;
      
      nodes.forEach((node, nodeIndex) => {
        const angle = nodeIndex * angleStep;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        circularNodes.push({
          id: node.id,
          name: node.name,
          league: node.league,
          tier,
          angle,
          radius,
          transferCount: node.stats.transfersIn + node.stats.transfersOut,
          totalValue: node.stats.totalSpent + node.stats.totalReceived,
          x,
          y
        });
      });
    });
    
    // Create arcs for transfers
    const arcs: CircularArc[] = [];
    const nodeMap = new Map(circularNodes.map(n => [n.id, n]));
    
    networkData.edges.forEach(edge => {
      const sourceNode = nodeMap.get(typeof edge.source === 'string' ? edge.source : edge.source.id);
      const targetNode = nodeMap.get(typeof edge.target === 'string' ? edge.target : edge.target.id);
      
      if (sourceNode && targetNode) {
        const type = sourceNode.tier < targetNode.tier ? 'outward' : 
                    sourceNode.tier > targetNode.tier ? 'inward' : 'same-tier';
        
        arcs.push({
          source: sourceNode,
          target: targetNode,
          value: edge.stats.totalValue,
          type
        });
      }
    });
    
    return { circularNodes, arcs, tiers: tiers.map(t => ({ tier: t, radius: minRadius + (t - tiers[0]) * radiusStep })) };
  }, [networkData, width, height]);

  useEffect(() => {
    if (!svgRef.current || circularNodes.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create main group
    const g = svg.append('g');
    
    // Draw tier circles (background)
    g.selectAll('.tier-circle')
      .data(tiers)
      .enter()
      .append('circle')
      .attr('class', 'tier-circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', d => d.radius)
      .attr('fill', 'none')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2');
    
    // Draw tier labels
    g.selectAll('.tier-label')
      .data(tiers)
      .enter()
      .append('text')
      .attr('class', 'tier-label')
      .attr('x', centerX)
      .attr('y', d => centerY - d.radius - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#6b7280')
      .text(d => `Tier ${d.tier}`);
    
    // Color scale for transfer values
    const valueExtent = d3.extent(arcs, d => d.value) as [number, number];
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain(valueExtent);
    
    // League color scale - use colors per league instead of per club
    const leagueColors = [
      '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b',
      '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#aec7e8', '#ffbb78',
      '#98df8a', '#ff9896', '#c5b0d5', '#c49c94', '#f7b6d3', '#c7c7c7',
      '#dbdb8d', '#9edae5'
    ];
    const uniqueLeagues = Array.from(new Set(circularNodes.map(d => d.league)));  // Get unique leagues
    const leagueColorScale = d3.scaleOrdinal()
      .domain(uniqueLeagues)
      .range(leagueColors);
    
    // Draw transfer arcs
    g.selectAll('.transfer-arc')
      .data(arcs.filter(d => d.value > 0))
      .enter()
      .append('path')
      .attr('class', 'transfer-arc')
      .attr('d', d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 0.7;
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      })
      .attr('fill', 'none')
      .attr('stroke', d => colorScale(d.value))
      .attr('stroke-width', d => Math.max(1, Math.log(d.value / 1000000 + 1) * 2))
      .attr('opacity', 0.6)
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 1);
        
        // Add tooltip
        const tooltip = svg.append('g')
          .attr('class', 'tooltip')
          .attr('transform', `translate(${event.offsetX}, ${event.offsetY})`);
        
        const rect = tooltip.append('rect')
          .attr('fill', 'black')
          .attr('opacity', 0.8)
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
        d3.select(this).attr('opacity', 0.6);
        svg.select('.tooltip').remove();
      });
    
    // Node size scale
    const transferCountExtent = d3.extent(circularNodes, d => d.transferCount) as [number, number];
    const sizeScale = d3.scaleLinear()
      .domain(transferCountExtent)
      .range([4, 12]);
    
    // Draw nodes
    g.selectAll('.club-node')
      .data(circularNodes)
      .enter()
      .append('circle')
      .attr('class', 'club-node')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => sizeScale(d.transferCount))
      .attr('fill', d => {
        // Use league-specific colors 
        return leagueColorScale(d.league) as string;
      })
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('stroke-width', 3)
          .attr('r', sizeScale(d.transferCount) + 2);
        
        // Show node tooltip
        const tooltip = svg.append('g')
          .attr('class', 'node-tooltip')
          .attr('transform', `translate(${d.x}, ${d.y - 20})`);
        
        const rect = tooltip.append('rect')
          .attr('fill', 'black')
          .attr('opacity', 0.9)
          .attr('rx', 4);
        
        const text = tooltip.append('text')
          .attr('fill', 'white')
          .attr('font-size', '11px')
          .attr('text-anchor', 'middle')
          .attr('y', -5);
        
        text.append('tspan')
          .attr('x', 0)
          .attr('dy', 0)
          .text(d.name);
        
        text.append('tspan')
          .attr('x', 0)
          .attr('dy', 14)
          .text(`${d.transferCount} transfers`);
        
        text.append('tspan')
          .attr('x', 0)
          .attr('dy', 14)
          .text(`€${(d.totalValue / 1000000).toFixed(1)}M total`);
        
        const bbox = text.node()!.getBBox();
        rect.attr('x', bbox.x - 4)
          .attr('y', bbox.y - 4)
          .attr('width', bbox.width + 8)
          .attr('height', bbox.height + 8);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('stroke-width', 2)
          .attr('r', sizeScale(d.transferCount));
        svg.select('.node-tooltip').remove();
      });
    
    // Add comprehensive legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(20, 20)`);

    // Legend background
    const legendBg = legend.append('rect')
      .attr('fill', 'white')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1)
      .attr('rx', 6)
      .attr('opacity', 0.95);

    // Legend content
    const legendContent = legend.append('g')
      .attr('transform', 'translate(12, 12)');
    
    legendContent.append('text')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text('Liga Hierarchy (Circular View)');
    
    // Visual explanations
    let yOffset = 25;
    
    // Node size explanation with example
    const sizeGroup = legendContent.append('g')
      .attr('transform', `translate(0, ${yOffset})`);
    
    sizeGroup.append('circle')
      .attr('cx', 6)
      .attr('cy', 0)
      .attr('r', 4)
      .attr('fill', '#94a3b8')
      .attr('stroke', 'white')
      .attr('stroke-width', 1);
    
    sizeGroup.append('circle')
      .attr('cx', 18)
      .attr('cy', 0)
      .attr('r', 7)
      .attr('fill', '#64748b')
      .attr('stroke', 'white')
      .attr('stroke-width', 1);
    
    sizeGroup.append('text')
      .attr('x', 30)
      .attr('y', 4)
      .attr('font-size', '11px')
      .attr('fill', '#6b7280')
      .text('Node size = Transfer activity');
    
    yOffset += 20;
    
    // Color explanation
    const colorGroup = legendContent.append('g')
      .attr('transform', `translate(0, ${yOffset})`);
    
    // Show sample league colors
    const sampleLeagues = uniqueLeagues.slice(0, 5);
    sampleLeagues.forEach((league, i) => {
      colorGroup.append('circle')
        .attr('cx', i * 12 + 6)
        .attr('cy', 0)
        .attr('r', 5)
        .attr('fill', leagueColorScale(league) as string)
        .attr('stroke', 'white')
        .attr('stroke-width', 1);
    });
    
    colorGroup.append('text')
      .attr('x', 70)
      .attr('y', 4)
      .attr('font-size', '11px')
      .attr('fill', '#6b7280')
      .text('Different colors = Different leagues');
    
    yOffset += 20;
    
    // Ring explanation
    const ringGroup = legendContent.append('g')
      .attr('transform', `translate(0, ${yOffset})`);
    
    ringGroup.append('circle')
      .attr('cx', 10)
      .attr('cy', 0)
      .attr('r', 8)
      .attr('fill', 'none')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '2,2');
    
    ringGroup.append('text')
      .attr('x', 25)
      .attr('y', 4)
      .attr('font-size', '11px')
      .attr('fill', '#6b7280')
      .text('Ring position = League tier (1=inner, higher=outer)');
    
    yOffset += 20;
    
    // Arc explanation
    const arcGroup = legendContent.append('g')
      .attr('transform', `translate(0, ${yOffset})`);
    
    arcGroup.append('path')
      .attr('d', 'M5,0 Q15,10 25,0')
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 3)
      .attr('opacity', 0.7);
    
    arcGroup.append('text')
      .attr('x', 35)
      .attr('y', 4)
      .attr('font-size', '11px')
      .attr('fill', '#6b7280')
      .text('Arc thickness = Transfer value');
    
    yOffset += 20;
    
    // Tier breakdown
    if (tiers.length > 0) {
      const tierGroup = legendContent.append('g')
        .attr('transform', `translate(0, ${yOffset})`);
      
      tierGroup.append('text')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('fill', '#374151')
        .text('League Tiers:');
      
      yOffset += 15;
      
      tiers.slice(0, 4).forEach((tier, i) => {  // Show max 4 tiers to avoid overcrowding
        const tierItem = legendContent.append('g')
          .attr('transform', `translate(10, ${yOffset + i * 12})`);
        
        tierItem.append('text')
          .attr('font-size', '10px')
          .attr('fill', '#6b7280')
          .text(`Tier ${tier.tier} (${tier.radius.toFixed(0)}px from center)`);
      });
      
      yOffset += Math.min(tiers.length, 4) * 12;
    }
    
    // Set legend background size
    const legendBounds = legendContent.node()!.getBBox();
    legendBg
      .attr('width', legendBounds.width + 24)
      .attr('height', legendBounds.height + 24);
      
  }, [circularNodes, arcs, tiers, width, height]);

  if (!networkData?.nodes?.length) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
        style={{ width, height }}
      >
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">🔄</div>
          <div className="text-lg font-medium">Circular Visualization</div>
          <div className="text-sm mt-2">No data available</div>
          <div className="text-xs mt-1">Apply filters to see liga hierarchy</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border rounded-lg bg-white"
      />
    </div>
  );
};

export default CircularVisualization;