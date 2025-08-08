import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as d3 from 'd3';
import * as d3Sankey from 'd3-sankey';
import { NetworkData } from '../../../../types';
import { NodeTooltip, FlowTooltip, NodeTooltipData, FlowTooltipData } from './SankeyTooltip';
import { createNodeTooltipData, createFlowTooltipData } from '../utils/tooltipData';
import { detectPatterns, getPatternById } from '../utils/patterns';

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
  networkData?: NetworkData;
  selectedPattern?: string | null;
  focusedNode?: string | null;
  onNodeClick?: (nodeId: string) => void;
}

const SankeyChart: React.FC<SankeyChartProps> = ({
  nodes,
  links,
  width,
  height,
  groupingMode,
  networkData,
  selectedPattern,
  focusedNode,
  onNodeClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltipData, setTooltipData] = useState<{
    type: 'node' | 'flow';
    data: NodeTooltipData | FlowTooltipData;
    x: number;
    y: number;
  } | null>(null);

  // Detect patterns when networkData changes
  const getPatternMatches = useCallback(() => {
    return networkData ? detectPatterns(networkData.edges, networkData.nodes) : new Map();
  }, [networkData]);

  const renderSankey = useCallback(() => {
    if (!svgRef.current || nodes.length === 0 || links.length === 0) return;

    const patternMatches = getPatternMatches();
    const selectedPatternEdges = selectedPattern ? patternMatches.get(selectedPattern) || [] : [];
    
    const getAggregationLevel = (): 'club' | 'league' | 'country' | 'continent' => {
      return groupingMode.includes('club') ? 'club' :
             groupingMode.includes('league') ? 'league' :
             groupingMode.includes('country') ? 'country' :
             'continent';
    };

    const shouldHighlightLink = (link: SankeyLink): boolean => {
      if (!selectedPattern || !networkData) return false;
      
      const aggregationLevel = getAggregationLevel();
      
      // Check if this link matches the selected pattern
      return selectedPatternEdges.some((edge: any) => {
        const sourceNode = networkData.nodes.find(n => {
          switch (aggregationLevel) {
            case 'club': return n.name === link.sourceCategory;
            case 'league': return n.league === link.sourceCategory;
            case 'country': return n.country === link.sourceCategory;
            case 'continent': return n.continent === link.sourceCategory;
            default: return false;
          }
        });
        
        const targetNode = networkData.nodes.find(n => {
          switch (aggregationLevel) {
            case 'club': return n.name === link.targetCategory;
            case 'league': return n.league === link.targetCategory;
            case 'country': return n.country === link.targetCategory;
            case 'continent': return n.continent === link.targetCategory;
            default: return false;
          }
        });
        
        if (!sourceNode || !targetNode) return false;
        
        const edgeSourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const edgeTargetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
        
        return edgeSourceId === sourceNode.id && edgeTargetId === targetNode.id;
      });
    };

    const shouldHighlightNode = (node: SankeyNode): boolean => {
      if (focusedNode) {
        return node.name === focusedNode;
      }
      
      if (selectedPattern) {
        // Highlight nodes that are part of the selected pattern
        const relevantLinks = links.filter(link => shouldHighlightLink(link));
        return relevantLinks.some(link => 
          link.sourceCategory === node.name || link.targetCategory === node.name
        );
      }
      
      return false;
    };

    const getConnectedLinks = (nodeName: string): SankeyLink[] => {
      return links.filter(link => 
        link.sourceCategory === nodeName || link.targetCategory === nodeName
      );
    };

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

    // Get pattern color if pattern is selected
    const selectedPatternObj = selectedPattern ? getPatternById(selectedPattern) : null;

    // Draw links
    const linkGroup = g.append('g');
    
    linkGroup.selectAll('.link')
      .data(sankeyData.links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3Sankey.sankeyLinkHorizontal())
      .attr('stroke', (d: any) => {
        const link = links.find(l => 
          l.sourceCategory === d.source.name && l.targetCategory === d.target.name
        );
        if (link && shouldHighlightLink(link) && selectedPatternObj) {
          return selectedPatternObj.strokeColor;
        }
        return colorScale(d.source.name) as string;
      })
      .attr('stroke-width', (d: any) => Math.max(1, d.width || 0))
      .attr('stroke-opacity', (d: any) => {
        const link = links.find(l => 
          l.sourceCategory === d.source.name && l.targetCategory === d.target.name
        );
        
        if (focusedNode) {
          return (d.source.name === focusedNode || d.target.name === focusedNode) ? 0.8 : 0.1;
        }
        
        if (selectedPattern && link) {
          return shouldHighlightLink(link) ? 0.9 : 0.15;
        }
        
        return 0.4;
      })
      .attr('fill', 'none')
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d: any) {
        // Highlight this link
        d3.select(this).attr('stroke-opacity', 0.8);
        
        // Create tooltip data
        if (networkData) {
          const tooltipData = createFlowTooltipData(
            d.source.name,
            d.target.name,
            networkData,
            getAggregationLevel()
          );
          
          if (tooltipData) {
            setTooltipData({
              type: 'flow',
              data: tooltipData,
              x: event.clientX,
              y: event.clientY
            });
          }
        }
      })
      .on('mousemove', function(event) {
        setTooltipData(prev => prev ? {
          ...prev,
          x: event.clientX,
          y: event.clientY
        } : null);
      })
      .on('mouseout', function(event, d: any) {
        // Reset link opacity based on current state
        const link = links.find(l => 
          l.sourceCategory === d.source.name && l.targetCategory === d.target.name
        );
        
        if (focusedNode) {
          d3.select(this).attr('stroke-opacity', 
            (d.source.name === focusedNode || d.target.name === focusedNode) ? 0.8 : 0.1
          );
        } else if (selectedPattern && link) {
          d3.select(this).attr('stroke-opacity', shouldHighlightLink(link) ? 0.9 : 0.15);
        } else {
          d3.select(this).attr('stroke-opacity', 0.4);
        }
        
        setTooltipData(null);
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
      .attr('fill', (d: any) => {
        if (shouldHighlightNode(d)) {
          return selectedPatternObj ? selectedPatternObj.color : '#3B82F6';
        }
        return colorScale(d.name) as string;
      })
      .attr('stroke', (d: any) => shouldHighlightNode(d) ? '#1D4ED8' : 'white')
      .attr('stroke-width', (d: any) => shouldHighlightNode(d) ? 2 : 1)
      .attr('opacity', (d: any) => {
        if (focusedNode) {
          return d.name === focusedNode ? 1 : 0.3;
        }
        if (selectedPattern) {
          return shouldHighlightNode(d) ? 1 : 0.4;
        }
        return 1;
      })
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d: any) {
        // Highlight connected links
        const connectedLinks = getConnectedLinks(d.name);
        
        linkGroup.selectAll('.link')
          .attr('stroke-opacity', function(linkData: any) {
            const isConnected = connectedLinks.some(cl => 
              cl.sourceCategory === linkData.source.name && cl.targetCategory === linkData.target.name
            );
            return isConnected ? 0.8 : 0.1;
          });
        
        // Highlight this node
        d3.select(this).attr('opacity', 1).attr('stroke-width', 2);
        
        // Create tooltip data
        if (networkData) {
          const tooltipData = createNodeTooltipData(
            d.id,
            d.name,
            networkData,
            getAggregationLevel()
          );
          
          if (tooltipData) {
            setTooltipData({
              type: 'node',
              data: tooltipData,
              x: event.clientX,
              y: event.clientY
            });
          }
        }
      })
      .on('mousemove', function(event) {
        setTooltipData(prev => prev ? {
          ...prev,
          x: event.clientX,
          y: event.clientY
        } : null);
      })
      .on('mouseout', function(event, d: any) {
        // Reset all links to their default state
        linkGroup.selectAll('.link')
          .attr('stroke-opacity', function(linkData: any) {
            const link = links.find(l => 
              l.sourceCategory === linkData.source.name && l.targetCategory === linkData.target.name
            );
            
            if (focusedNode) {
              return (linkData.source.name === focusedNode || linkData.target.name === focusedNode) ? 0.8 : 0.1;
            }
            
            if (selectedPattern && link) {
              return shouldHighlightLink(link) ? 0.9 : 0.15;
            }
            
            return 0.4;
          });
        
        // Reset node appearance
        const baseOpacity = focusedNode ? (d.name === focusedNode ? 1 : 0.3) :
                          selectedPattern ? (shouldHighlightNode(d) ? 1 : 0.4) : 1;
        
        d3.select(this)
          .attr('opacity', baseOpacity)
          .attr('stroke-width', shouldHighlightNode(d) ? 2 : 1);
        
        setTooltipData(null);
      })
      .on('click', function(event, d: any) {
        if (onNodeClick) {
          onNodeClick(d.name);
        }
      });

    // Add node labels
    node.append('text')
      .attr('x', (d: any) => (d.x0 || 0) < innerWidth / 2 ? sankeyLayout.nodeWidth() + 6 : -6)
      .attr('y', (d: any) => ((d.y1 || 0) - (d.y0 || 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => (d.x0 || 0) < innerWidth / 2 ? 'start' : 'end')
      .attr('font-size', '12px')
      .attr('fill', '#374151')
      .attr('opacity', (d: any) => {
        if (focusedNode) {
          return d.name === focusedNode ? 1 : 0.5;
        }
        if (selectedPattern) {
          return shouldHighlightNode(d) ? 1 : 0.6;
        }
        return 1;
      })
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

    // Add title with pattern information
    let titleText = `Transfer Flows by ${groupingMode.charAt(0).toUpperCase() + groupingMode.slice(1)}`;
    if (selectedPattern && selectedPatternObj) {
      titleText += ` - ${selectedPatternObj.name}`;
    }
    if (focusedNode) {
      titleText += ` (Focused on ${focusedNode})`;
    }

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text(titleText);

  }, [nodes, links, width, height, groupingMode, networkData, selectedPattern, focusedNode, onNodeClick, getPatternMatches]);

  useEffect(() => {
    renderSankey();
  }, [renderSankey]);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border rounded-lg bg-white"
      />
      
      {/* Enhanced Tooltips */}
      {tooltipData && tooltipData.type === 'node' && (
        <NodeTooltip
          data={tooltipData.data as NodeTooltipData}
          x={tooltipData.x}
          y={tooltipData.y}
        />
      )}
      
      {tooltipData && tooltipData.type === 'flow' && (
        <FlowTooltip
          data={tooltipData.data as FlowTooltipData}
          x={tooltipData.x}
          y={tooltipData.y}
        />
      )}
    </div>
  );
};

export default SankeyChart;