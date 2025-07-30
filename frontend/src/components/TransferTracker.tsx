import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  shortName?: string;
  league: string;
  country: string;
  logoUrl?: string;
  stats: {
    transfersIn: number;
    transfersOut: number;
    totalSpent: number;
    totalReceived: number;
    netSpend: number;
    avgPlayerAge?: number;
  };
}

interface NetworkEdge extends d3.SimulationLinkDatum<NetworkNode> {
  id: string;
  source: string | NetworkNode;
  target: string | NetworkNode;
  transfers: any[];
  stats: {
    totalValue: number;
    transferCount: number;
    avgTransferValue: number;
    types: string[];
  };
}

interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  metadata: {
    totalTransfers: number;
    totalValue: number;
    dateRange: {
      start: string | null;
      end: string | null;
    };
    filters: any;
  };
}

interface TransferNetworkProps {
  filters: {
    seasons: string[];
    leagues: string[];
    transferTypes: string[];
    minTransferFee?: number;
    maxTransferFee?: number;
  };
}

const TransferNetwork: React.FC<TransferNetworkProps> = ({ filters }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(false);
  
  // CRITICAL: State für UI-Panel getrennt von D3-Visualisierung
  const [selectedNodeData, setSelectedNodeData] = useState<NetworkNode | null>(null);
  const [hoveredEdgeData, setHoveredEdgeData] = useState<NetworkEdge | null>(null);
  
  // Refs für D3 Elemente - diese sind persistent!
  const simulationRef = useRef<d3.Simulation<NetworkNode, NetworkEdge> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const currentTransformRef = useRef(d3.zoomIdentity);
  const isDraggingRef = useRef(false);
  const isInitializedRef = useRef(false);

  // Color scale for leagues
  const colorScale = d3.scaleOrdinal<string>()
    .domain(['Bundesliga', 'Premier League', 'La Liga', 'Serie A', 'Ligue 1'])
    .range(['#d70909', '#3d0845', '#ff6b35', '#004225', '#1e3a8a']);

  // Fetch network data
  useEffect(() => {
    const fetchNetworkData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        
        if (filters.seasons.length > 0) {
          params.set('seasons', filters.seasons.join(','));
        }
        if (filters.leagues.length > 0) {
          params.set('leagues', filters.leagues.join(','));
        }
        if (filters.transferTypes.length > 0) {
          params.set('transferTypes', filters.transferTypes.join(','));
        }
        if (filters.minTransferFee) {
          params.set('minTransferFee', filters.minTransferFee.toString());
        }
        if (filters.maxTransferFee) {
          params.set('maxTransferFee', filters.maxTransferFee.toString());
        }

        const response = await fetch(`http://localhost:3001/api/network-data?${params}`);
        const result = await response.json();
        
        if (result.success) {
          setNetworkData(result.data);
          isInitializedRef.current = false; // Reset bei neuen Daten
        }
      } catch (error) {
        console.error('Failed to fetch network data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNetworkData();
  }, [filters]);

  // CRITICAL: D3 Visualisierung nur einmal initialisieren
  useEffect(() => {
    if (!networkData || !svgRef.current || isInitializedRef.current) return;

    console.log('Initializing D3 visualization...');
    isInitializedRef.current = true;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const width = 1200;
    const height = 800;

    svg.attr('width', width).attr('height', height);

    // Create zoom container
    const zoomGroup = svg.append('g').attr('class', 'zoom-group');

    // Zoom behavior - wird nur einmal definiert!
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .filter((event) => {
        if (isDraggingRef.current) return false;
        
        const target = event.target as Element;
        const isNode = target.classList.contains('node') || target.closest('.node');
        
        if (event.type === 'wheel') return true;
        if (event.type === 'mousedown' && !isNode) return true;
        
        return false;
      })
      .on('zoom', (event) => {
        if (!isDraggingRef.current) {
          currentTransformRef.current = event.transform;
          zoomGroup.attr('transform', event.transform);
        }
      });

    // Apply zoom to SVG
    svg.call(zoom);
    zoomRef.current = zoom;

    // Create simulation
    const simulation = d3.forceSimulation<NetworkNode>(networkData.nodes)
      .force('link', d3.forceLink<NetworkNode, NetworkEdge>(networkData.edges)
        .id((d) => d.id)
        .distance(100)
        .strength(0.1))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    simulationRef.current = simulation;

    // Create arrow marker for directed edges
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#666')
      .style('stroke', 'none');

    // Create links inside zoom group
    const linkGroup = zoomGroup.append('g').attr('class', 'links');
    const links = linkGroup.selectAll('.link')
      .data(networkData.edges)
      .enter().append('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => Math.sqrt(d.stats.transferCount) * 2)
      .attr('marker-end', 'url(#arrowhead)')
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        // CRITICAL: State-Update ohne React Re-Render
        setHoveredEdgeData({...d}); // Kopie erstellen um Referenz-Probleme zu vermeiden
        d3.select(this).attr('stroke', '#ff6b35').attr('stroke-opacity', 1);
      })
      .on('mouseout', function(event, d) {
        setHoveredEdgeData(null);
        d3.select(this).attr('stroke', '#999').attr('stroke-opacity', 0.6);
      });

    // Create nodes inside zoom group  
    const nodeGroup = zoomGroup.append('g').attr('class', 'nodes');
    const nodes = nodeGroup.selectAll('.node')
      .data(networkData.nodes)
      .enter().append('circle')
      .attr('class', 'node')
      .attr('r', (d) => Math.sqrt(d.stats.transfersIn + d.stats.transfersOut) * 2 + 8)
      .attr('fill', (d) => colorScale(d.league))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'move')
      .on('mouseover', function(event, d) {
        if (!isDraggingRef.current) {
          // CRITICAL: State-Update ohne React Re-Render
          setSelectedNodeData({...d}); // Kopie erstellen
          d3.select(this).attr('stroke-width', 4);
        }
      })
      .on('mouseout', function(event, d) {
        if (!isDraggingRef.current) {
          d3.select(this).attr('stroke-width', 2);
        }
      })
      .on('click', function(event, d) {
        if (!isDraggingRef.current) {
          event.stopPropagation();
          // Toggle fixed position
          if (d.fx === null || d.fx === undefined) {
            d.fx = d.x;
            d.fy = d.y;
          } else {
            d.fx = null;
            d.fy = null;
          }
          simulation.alpha(0.3).restart();
        }
      });

    // Create labels inside zoom group
    const labelGroup = zoomGroup.append('g').attr('class', 'labels');
    const labels = labelGroup.selectAll('.label')
      .data(networkData.nodes)
      .enter().append('text')
      .attr('class', 'label')
      .text((d) => d.shortName || d.name)
      .attr('font-size', '12px')
      .attr('font-family', 'Arial, sans-serif')
      .attr('fill', '#333')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('pointer-events', 'none');

    // Drag behavior
    const dragHandler = d3.drag<SVGCircleElement, NetworkNode>()
      .on('start', function(event, d) {
        isDraggingRef.current = true;
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        d3.select(this).attr('stroke-width', 4);
      })
      .on('drag', function(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', function(event, d) {
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 100);
        if (!event.active) simulation.alphaTarget(0);
        d3.select(this).attr('stroke-width', 2);
      });

    // Apply drag to nodes
    nodes.call(dragHandler);

    // Simulation tick
    simulation.on('tick', () => {
      links
        .attr('x1', (d) => (d.source as NetworkNode).x!)
        .attr('y1', (d) => (d.source as NetworkNode).y!)
        .attr('x2', (d) => (d.target as NetworkNode).x!)
        .attr('y2', (d) => (d.target as NetworkNode).y!);

      nodes
        .attr('cx', (d) => d.x!)
        .attr('cy', (d) => d.y!);

      labels
        .attr('x', (d) => d.x!)
        .attr('y', (d) => d.y! + 35);
    });

    // Zoom controls - AUSSERHALB der zoom group!
    const controlsGroup = svg.append('g')
      .attr('class', 'zoom-controls')
      .attr('transform', 'translate(20, 20)');

    // Zoom In Button
    const zoomInButton = controlsGroup.append('g').attr('class', 'zoom-in');
    zoomInButton.append('rect')
      .attr('width', 30)
      .attr('height', 30)
      .attr('fill', 'white')
      .attr('stroke', '#ccc')
      .attr('rx', 3)
      .style('cursor', 'pointer');

    zoomInButton.append('text')
      .attr('x', 15)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .style('pointer-events', 'none')
      .text('+');

    zoomInButton.on('click', function(event) {
      event.stopPropagation();
      svg.transition().duration(300).call(zoom.scaleBy as any, 1.5);
    });

    // Zoom Out Button
    const zoomOutButton = controlsGroup.append('g').attr('class', 'zoom-out');
    zoomOutButton.append('rect')
      .attr('y', 35)
      .attr('width', 30)
      .attr('height', 30)
      .attr('fill', 'white')
      .attr('stroke', '#ccc')
      .attr('rx', 3)
      .style('cursor', 'pointer');

    zoomOutButton.append('text')
      .attr('x', 15)
      .attr('y', 55)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .style('pointer-events', 'none')
      .text('−');

    zoomOutButton.on('click', function(event) {
      event.stopPropagation();
      svg.transition().duration(300).call(zoom.scaleBy as any, 0.67);
    });

    // Reset Button
    const resetButton = controlsGroup.append('g').attr('class', 'zoom-reset');
    resetButton.append('rect')
      .attr('y', 70)
      .attr('width', 30)
      .attr('height', 30)
      .attr('fill', 'white')
      .attr('stroke', '#ccc')
      .attr('rx', 3)
      .style('cursor', 'pointer');

    resetButton.append('text')
      .attr('x', 15)
      .attr('y', 90)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .style('pointer-events', 'none')
      .text('⌂');

    resetButton.on('click', function(event) {
      event.stopPropagation();
      svg.transition().duration(500).call(zoom.transform as any, d3.zoomIdentity);
    });

    // Cleanup function
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      isDraggingRef.current = false;
    };
  }, [networkData, colorScale]); // Nur bei networkData-Änderung

  // Clear selected node when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setSelectedNodeData(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `€${(value / 1000).toFixed(0)}K`;
    }
    return `€${value}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading network data...</div>
        </div>
      </div>
    );
  }

  if (!networkData || networkData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
        <div className="text-center text-gray-500">
          <div className="text-lg mb-2">No data found</div>
          <div className="text-sm">Try adjusting your filters</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" ref={containerRef}>
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Main Network Visualization */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Transfer Network</h3>
              <div className="text-sm text-gray-500">
                {networkData.nodes.length} clubs • {networkData.edges.length} connections
              </div>
            </div>
            <div className="relative">
              <svg 
                ref={svgRef} 
                className="w-full border border-gray-200 rounded-lg bg-gray-50"
                style={{ minHeight: '600px' }}
              ></svg>
              {/* Instructions overlay */}
              <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-lg p-3 text-xs text-gray-600 max-w-xs">
                <div className="font-medium mb-1">Controls:</div>
                <div>• Mouse wheel to zoom</div>
                <div>• Drag empty space to pan</div>
                <div>• Drag nodes to move them</div>
                <div>• Click nodes to pin/unpin</div>
                <div>• Use zoom buttons (top-left)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="w-full xl:w-96 space-y-6">
          {/* Legend */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h4 className="text-lg font-semibold mb-4">Legend</h4>
            <div className="space-y-3">
              {['Bundesliga', 'Premier League', 'La Liga', 'Serie A', 'Ligue 1'].map(league => (
                <div key={league} className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-3 border border-gray-300"
                    style={{ backgroundColor: colorScale(league) }}
                  ></div>
                  <span className="text-sm font-medium">{league}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-1">
              <div className="text-xs text-gray-600">• Node size = Transfer activity</div>
              <div className="text-xs text-gray-600">• Edge width = Transfer count</div>
              <div className="text-xs text-gray-600">• Arrows show direction</div>
            </div>
          </div>

          {/* Selected Node Info */}
          {selectedNodeData && (
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h4 className="text-lg font-semibold mb-3">Club Details</h4>
              <div className="space-y-3">
                <div>
                  <h5 className="font-medium text-lg">{selectedNodeData.name}</h5>
                  <p className="text-sm text-gray-600 flex items-center">
                    <span 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: colorScale(selectedNodeData.league) }}
                    ></span>
                    {selectedNodeData.league} • {selectedNodeData.country}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-blue-600 font-medium">Transfers In</div>
                    <div className="text-2xl font-bold text-blue-800">
                      {selectedNodeData.stats.transfersIn}
                    </div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="text-red-600 font-medium">Transfers Out</div>
                    <div className="text-2xl font-bold text-red-800">
                      {selectedNodeData.stats.transfersOut}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Money Spent:</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(selectedNodeData.stats.totalSpent)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Money Received:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(selectedNodeData.stats.totalReceived)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600 font-medium">Net Spend:</span>
                    <span className={`font-bold ${selectedNodeData.stats.netSpend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedNodeData.stats.netSpend > 0 ? '-' : '+'}
                      {formatCurrency(Math.abs(selectedNodeData.stats.netSpend))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hovered Edge Info */}
          {hoveredEdgeData && (
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h4 className="text-lg font-semibold mb-3">Transfer Connection</h4>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">
                      {hoveredEdgeData.stats.transferCount}
                    </div>
                    <div className="text-sm text-gray-600">Transfers</div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Value:</span>
                    <span className="font-medium">
                      {formatCurrency(hoveredEdgeData.stats.totalValue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Value:</span>
                    <span className="font-medium">
                      {formatCurrency(hoveredEdgeData.stats.avgTransferValue)}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <span className="text-gray-600">Transfer Types:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {hoveredEdgeData.stats.types.map(type => (
                        <span 
                          key={type} 
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent transfers preview */}
                {hoveredEdgeData.transfers.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="text-xs text-gray-600 mb-2">Recent Transfers:</div>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {hoveredEdgeData.transfers.slice(0, 3).map((transfer, idx) => (
                        <div key={idx} className="text-xs text-gray-700">
                          <span className="font-medium">{transfer.playerName}</span>
                          {transfer.transferFee && (
                            <span className="text-gray-500 ml-1">
                              ({formatCurrency(transfer.transferFee)})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Network Statistics */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h4 className="text-lg font-semibold mb-4">Network Statistics</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center bg-blue-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-800">
                    {networkData.metadata.totalTransfers}
                  </div>
                  <div className="text-xs text-blue-600">Total Transfers</div>
                </div>
                <div className="text-center bg-green-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-800">
                    {formatCurrency(networkData.metadata.totalValue)}
                  </div>
                  <div className="text-xs text-green-600">Total Value</div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Clubs:</span>
                  <span className="font-medium">{networkData.nodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Transfer Routes:</span>
                  <span className="font-medium">{networkData.edges.length}</span>
                </div>
                {networkData.metadata.dateRange.start && networkData.metadata.dateRange.end && (
                  <div className="pt-2 border-t text-xs text-gray-500">
                    Data from {formatDate(networkData.metadata.dateRange.start)} to {formatDate(networkData.metadata.dateRange.end)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferNetwork;