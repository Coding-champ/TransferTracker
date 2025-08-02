import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  shortName?: string;
  league: string;
  country: string;
  continent?: string;
  logoUrl?: string;
  clubValue?: number;
  foundingYear?: number;
  stadiumCapacity?: number;
  leagueTier?: number;
  stats: {
    transfersIn: number;
    transfersOut: number;
    totalSpent: number;
    totalReceived: number;
    netSpend: number;
    avgPlayerAge?: number;
    avgROI?: number;
    successfulTransfersRate?: number;
    avgPerformanceRating?: number;
  };
}

interface NetworkEdge extends d3.SimulationLinkDatum<NetworkNode> {
  id: string;
  source: string | NetworkNode;
  target: string | NetworkNode;
  transfers: TransferInfo[];
  stats: {
    totalValue: number;
    transferCount: number;
    avgTransferValue: number;
    types: string[];
    avgROI?: number;
    successRate?: number;
    seasons: string[];
    transferWindows: string[];
  };
}

interface TransferInfo {
  id: number;
  playerName: string;
  playerNationality?: string;
  transferFee: number | null;
  transferType: string;
  transferWindow?: string;
  date: Date;
  season: string;
  position: string | null;
  playerAge?: number;
  contractDuration?: number;
  marketValueAtTransfer?: number;
  isLoanToBuy?: boolean;
  roiPercentage?: number;
  performanceRating?: number;
  direction: 'out' | 'in';
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
    clubCount: number;
    edgeCount: number;
    avgROI: number;
    successRate: number;
    filters: any;
  };
}

interface TransferNetworkProps {
  filters: {
    seasons: string[];
    leagues: string[];
    countries: string[];
    continents: string[];
    transferTypes: string[];
    transferWindows: string[];
    positions: string[];
    nationalities: string[];
    clubs: number[];
    leagueTiers: number[];
    minTransferFee?: number;
    maxTransferFee?: number;
    minPlayerAge?: number;
    maxPlayerAge?: number;
    minContractDuration?: number;
    maxContractDuration?: number;
    minROI?: number;
    maxROI?: number;
    minPerformanceRating?: number;
    maxPerformanceRating?: number;
    hasTransferFee?: boolean;
    excludeLoans?: boolean;
    isLoanToBuy?: boolean;
    onlySuccessfulTransfers?: boolean;
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

  // Enhanced color scale for leagues with more colors
  const colorScale = d3.scaleOrdinal<string>()
    .domain(['Bundesliga', 'Premier League', 'La Liga', 'Serie A', 'Ligue 1', 'Eredivisie', 'Primeira Liga', 'Süper Lig'])
    .range(['#d70909', '#3d0845', '#ff6b35', '#004225', '#1e3a8a', '#ff8c00', '#228b22', '#dc143c']);

  // Build query parameters from filters
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    
    // Array parameters
    if (filters.seasons.length > 0) {
      params.set('seasons', filters.seasons.join(','));
    }
    if (filters.leagues.length > 0) {
      params.set('leagues', filters.leagues.join(','));
    }
    if (filters.countries.length > 0) {
      params.set('countries', filters.countries.join(','));
    }
    if (filters.continents.length > 0) {
      params.set('continents', filters.continents.join(','));
    }
    if (filters.transferTypes.length > 0) {
      params.set('transferTypes', filters.transferTypes.join(','));
    }
    if (filters.transferWindows.length > 0) {
      params.set('transferWindows', filters.transferWindows.join(','));
    }
    if (filters.positions.length > 0) {
      params.set('positions', filters.positions.join(','));
    }
    if (filters.nationalities.length > 0) {
      params.set('nationalities', filters.nationalities.join(','));
    }
    if (filters.clubs.length > 0) {
      params.set('clubs', filters.clubs.join(','));
    }
    if (filters.leagueTiers.length > 0) {
      params.set('leagueTiers', filters.leagueTiers.join(','));
    }
    
    // Numeric parameters
    if (filters.minTransferFee) {
      params.set('minTransferFee', filters.minTransferFee.toString());
    }
    if (filters.maxTransferFee) {
      params.set('maxTransferFee', filters.maxTransferFee.toString());
    }
    if (filters.minPlayerAge) {
      params.set('minPlayerAge', filters.minPlayerAge.toString());
    }
    if (filters.maxPlayerAge) {
      params.set('maxPlayerAge', filters.maxPlayerAge.toString());
    }
    if (filters.minContractDuration) {
      params.set('minContractDuration', filters.minContractDuration.toString());
    }
    if (filters.maxContractDuration) {
      params.set('maxContractDuration', filters.maxContractDuration.toString());
    }
    if (filters.minROI !== undefined) {
      params.set('minROI', filters.minROI.toString());
    }
    if (filters.maxROI !== undefined) {
      params.set('maxROI', filters.maxROI.toString());
    }
    if (filters.minPerformanceRating !== undefined) {
      params.set('minPerformanceRating', filters.minPerformanceRating.toString());
    }
    if (filters.maxPerformanceRating !== undefined) {
      params.set('maxPerformanceRating', filters.maxPerformanceRating.toString());
    }
    
    // Boolean parameters
    if (filters.hasTransferFee) {
      params.set('hasTransferFee', 'true');
    }
    if (filters.excludeLoans) {
      params.set('excludeLoans', 'true');
    }
    if (filters.isLoanToBuy) {
      params.set('isLoanToBuy', 'true');
    }
    if (filters.onlySuccessfulTransfers) {
      params.set('onlySuccessfulTransfers', 'true');
    }
    
    return params;
  }, [filters]);

  // Fetch network data
  useEffect(() => {
    const fetchNetworkData = async () => {
      setLoading(true);
      try {
        const params = buildQueryParams();
        console.log('Fetching with enhanced filters:', params.toString());

        const response = await fetch(`http://localhost:3001/api/network-data?${params}`);
        const result = await response.json();
        
        if (result.success) {
          console.log('Enhanced network data received:', {
            nodes: result.data.nodes.length,
            edges: result.data.edges.length,
            totalTransfers: result.data.metadata.totalTransfers,
            avgROI: result.data.metadata.avgROI,
            successRate: result.data.metadata.successRate
          });
          setNetworkData(result.data);
          isInitializedRef.current = false; // Reset bei neuen Daten
        } else {
          console.error('Failed to fetch network data:', result.error);
        }
      } catch (error) {
        console.error('Network request failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNetworkData();
  }, [buildQueryParams]);

  // Enhanced D3 Visualization
  useEffect(() => {
    if (!networkData || !svgRef.current || isInitializedRef.current) return;

    console.log('Initializing enhanced D3 visualization...');
    isInitializedRef.current = true;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 1200;
    const height = 800;

    svg.attr('width', width).attr('height', height);

    // Create zoom container
    const zoomGroup = svg.append('g').attr('class', 'zoom-group');

    // Enhanced zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5]) // Increased max zoom
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

    svg.call(zoom);
    zoomRef.current = zoom;

    // Enhanced simulation with adaptive forces
    const simulation = d3.forceSimulation<NetworkNode>(networkData.nodes)
      .force('link', d3.forceLink<NetworkNode, NetworkEdge>(networkData.edges)
        .id((d) => d.id)
        .distance((d) => {
          // Dynamic distance based on transfer count
          const baseDistance = 120;
          const transferCount = d.stats.transferCount;
          return Math.max(80, baseDistance - (transferCount * 5));
        })
        .strength(0.1))
      .force('charge', d3.forceManyBody()
        .strength((d) => {
          // Dynamic charge based on transfer activity
          const activity = (d as NetworkNode).stats.transfersIn + (d as NetworkNode).stats.transfersOut;
          return -Math.max(200, Math.min(800, activity * 10));
        }))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius((d) => {
          const baseRadius = Math.sqrt((d as NetworkNode).stats.transfersIn + (d as NetworkNode).stats.transfersOut) * 2 + 8;
          return baseRadius + 5;
        }));

    simulationRef.current = simulation;

    // Enhanced arrow markers
    const defs = svg.append('defs');
    
    // Standard arrow
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#666')
      .style('stroke', 'none');

    // Success arrow (green)
    defs.append('marker')
      .attr('id', 'arrowhead-success')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#10b981')
      .style('stroke', 'none');

    // Create enhanced links
    const linkGroup = zoomGroup.append('g').attr('class', 'links');
    const links = linkGroup.selectAll('.link')
      .data(networkData.edges)
      .enter().append('line')
      .attr('class', 'link')
      .attr('stroke', (d) => {
        // Color based on success rate
        if (d.stats.successRate && d.stats.successRate > 70) return '#10b981'; // Green for high success
        if (d.stats.successRate && d.stats.successRate < 30) return '#ef4444'; // Red for low success
        return '#6b7280'; // Gray for neutral/unknown
      })
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => Math.max(1, Math.sqrt(d.stats.transferCount) * 2))
      .attr('marker-end', (d) => {
        return d.stats.successRate && d.stats.successRate > 70 ? 'url(#arrowhead-success)' : 'url(#arrowhead)';
      })
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        setHoveredEdgeData({...d});
        d3.select(this)
          .attr('stroke', '#ff6b35')
          .attr('stroke-opacity', 1)
          .attr('stroke-width', Math.max(3, Math.sqrt(d.stats.transferCount) * 3));
      })
      .on('mouseout', function(event, d) {
        setHoveredEdgeData(null);
        const originalColor = d.stats.successRate && d.stats.successRate > 70 ? '#10b981' : 
                            d.stats.successRate && d.stats.successRate < 30 ? '#ef4444' : '#6b7280';
        d3.select(this)
          .attr('stroke', originalColor)
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', Math.max(1, Math.sqrt(d.stats.transferCount) * 2));
      });

    // Enhanced nodes with performance indicators
    const nodeGroup = zoomGroup.append('g').attr('class', 'nodes');
    const nodes = nodeGroup.selectAll('.node')
      .data(networkData.nodes)
      .enter().append('g')
      .attr('class', 'node-group');

    // Main node circles
    const nodeCircles = nodes.append('circle')
      .attr('class', 'node')
      .attr('r', (d) => {
        const baseSize = Math.sqrt(d.stats.transfersIn + d.stats.transfersOut) * 2 + 8;
        return Math.max(10, Math.min(40, baseSize)); // Limit size range
      })
      .attr('fill', (d) => colorScale(d.league))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'move')
      .on('mouseover', function(event, d) {
        if (!isDraggingRef.current) {
          setSelectedNodeData({...d});
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

    // Performance indicator rings
    nodes.append('circle')
      .attr('class', 'performance-ring')
      .attr('r', (d) => {
        const baseSize = Math.sqrt(d.stats.transfersIn + d.stats.transfersOut) * 2 + 8;
        return Math.max(12, Math.min(42, baseSize + 2));
      })
      .attr('fill', 'none')
      .attr('stroke', (d) => {
        if (d.stats.successfulTransfersRate && d.stats.successfulTransfersRate > 70) return '#10b981';
        if (d.stats.successfulTransfersRate && d.stats.successfulTransfersRate < 30) return '#ef4444';
        return 'transparent';
      })
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,3')
      .style('pointer-events', 'none');

    // Enhanced labels
    const labelGroup = zoomGroup.append('g').attr('class', 'labels');
    const labels = labelGroup.selectAll('.label')
      .data(networkData.nodes)
      .enter().append('text')
      .attr('class', 'label')
      .text((d) => d.shortName || d.name.substring(0, 12))
      .attr('font-size', '11px')
      .attr('font-family', 'Arial, sans-serif')
      .attr('fill', '#333')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('pointer-events', 'none')
      .style('font-weight', '500');

    // ROI indicators (small text below labels)
    const roiLabels = labelGroup.selectAll('.roi-label')
      .data(networkData.nodes.filter(d => d.stats.avgROI !== undefined && d.stats.avgROI !== 0))
      .enter().append('text')
      .attr('class', 'roi-label')
      .text((d) => `ROI: ${d.stats.avgROI!.toFixed(0)}%`)
      .attr('font-size', '9px')
      .attr('font-family', 'Arial, sans-serif')
      .attr('fill', (d) => d.stats.avgROI! > 0 ? '#10b981' : '#ef4444')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('pointer-events', 'none')
      .style('font-weight', '600');

    // Enhanced drag behavior
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

    nodeCircles.call(dragHandler);

    // Enhanced simulation tick
    simulation.on('tick', () => {
      links
        .attr('x1', (d) => (d.source as NetworkNode).x!)
        .attr('y1', (d) => (d.source as NetworkNode).y!)
        .attr('x2', (d) => (d.target as NetworkNode).x!)
        .attr('y2', (d) => (d.target as NetworkNode).y!);

      nodes
        .attr('transform', (d) => `translate(${d.x},${d.y})`);

      labels
        .attr('x', (d) => d.x!)
        .attr('y', (d) => d.y! + 35);

      roiLabels
        .attr('x', (d) => d.x!)
        .attr('y', (d) => d.y! + 48);
    });

    // Enhanced zoom controls
    const controlsGroup = svg.append('g')
      .attr('class', 'zoom-controls')
      .attr('transform', 'translate(20, 20)');

    // Control buttons with enhanced styling
    const createControlButton = (y: number, text: string, onClick: () => void) => {
      const button = controlsGroup.append('g').attr('class', 'zoom-button');
      
      button.append('rect')
        .attr('y', y)
        .attr('width', 35)
        .attr('height', 35)
        .attr('fill', 'white')
        .attr('stroke', '#d1d5db')
        .attr('stroke-width', 1)
        .attr('rx', 6)
        .style('cursor', 'pointer')
        .style('filter', 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))')
        .on('mouseover', function() {
          d3.select(this).attr('fill', '#f9fafb');
        })
        .on('mouseout', function() {
          d3.select(this).attr('fill', 'white');
        });

      button.append('text')
        .attr('x', 17.5)
        .attr('y', y + 22)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .attr('fill', '#374151')
        .style('pointer-events', 'none')
        .text(text);

      button.on('click', function(event) {
        event.stopPropagation();
        onClick();
      });

      return button;
    };

    createControlButton(0, '+', () => {
      svg.transition().duration(300).call(zoom.scaleBy as any, 1.5);
    });

    createControlButton(40, '−', () => {
      svg.transition().duration(300).call(zoom.scaleBy as any, 0.67);
    });

    createControlButton(80, '⌂', () => {
      svg.transition().duration(500).call(zoom.transform as any, d3.zoomIdentity);
    });

    // Cleanup function
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      isDraggingRef.current = false;
    };
  }, [networkData, colorScale]);

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

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading enhanced network data...</div>
          <div className="text-sm text-gray-500 mt-2">Applying advanced filters...</div>
        </div>
      </div>
    );
  }

  if (!networkData || networkData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">🔍</div>
          <div className="text-lg mb-2">No data found</div>
          <div className="text-sm">Try adjusting your filters or search criteria</div>
          <div className="text-xs mt-2 text-gray-400">
            Current filters may be too restrictive
          </div>
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
              <h3 className="text-xl font-semibold">Enhanced Transfer Network</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{networkData.nodes.length} clubs</span>
                <span>•</span>
                <span>{networkData.edges.length} connections</span>
                <span>•</span>
                <span className="text-green-600 font-medium">
                  {formatPercentage(networkData.metadata.successRate)} success rate
                </span>
              </div>
            </div>
            <div className="relative">
              <svg 
                ref={svgRef} 
                className="w-full border border-gray-200 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100"
                style={{ minHeight: '600px' }}
              ></svg>
              
              {/* Enhanced instructions overlay */}
              <div className="absolute top-4 right-4 bg-white bg-opacity-95 rounded-lg p-4 text-xs text-gray-600 max-w-xs shadow-lg">
                <div className="font-medium mb-2 text-gray-800">🎮 Controls:</div>
                <div className="space-y-1">
                  <div>• Mouse wheel to zoom (0.1x - 5x)</div>
                  <div>• Drag empty space to pan</div>
                  <div>• Drag nodes to move them</div>
                  <div>• Click nodes to pin/unpin</div>
                  <div>• Use zoom buttons (top-left)</div>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <div className="font-medium mb-1 text-gray-800">🎨 Visual Guide:</div>
                  <div className="space-y-1">
                    <div>• <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span> High success rate</div>
                    <div>• <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span> Low success rate</div>
                    <div>• Dotted rings = Performance indicators</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Info Panel */}
        <div className="w-full xl:w-96 space-y-6">
          {/* Enhanced Legend */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h4 className="text-lg font-semibold mb-4">Enhanced Legend</h4>
            <div className="space-y-3">
              {Array.from(new Set(networkData.nodes.map(n => n.league))).slice(0, 8).map(league => (
                <div key={league} className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-3 border border-gray-300"
                    style={{ backgroundColor: colorScale(league) }}
                  ></div>
                  <span className="text-sm font-medium">{league}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <div className="text-xs font-medium text-gray-700 mb-2">Performance Indicators:</div>
              <div className="flex items-center text-xs text-gray-600">
                <div className="w-3 h-3 rounded-full border-2 border-green-500 border-dashed mr-2"></div>
                High success rate (&gt;70%)
              </div>
              <div className="flex items-center text-xs text-gray-600">
                <div className="w-3 h-3 rounded-full border-2 border-red-500 border-dashed mr-2"></div>
                Low success rate (&lt;30%)
              </div>
              <div className="text-xs text-gray-600">• Node size = Transfer activity</div>
              <div className="text-xs text-gray-600">• Edge thickness = Transfer volume</div>
              <div className="text-xs text-gray-600">• Green edges = High success rate</div>
            </div>
          </div>

          {/* Enhanced Selected Node Info */}
          {selectedNodeData && (
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h4 className="text-lg font-semibold mb-3">📊 Club Analytics</h4>
              <div className="space-y-4">
                <div>
                  <h5 className="font-medium text-lg">{selectedNodeData.name}</h5>
                  <p className="text-sm text-gray-600 flex items-center">
                    <span 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: colorScale(selectedNodeData.league) }}
                    ></span>
                    {selectedNodeData.league} • {selectedNodeData.country}
                    {selectedNodeData.continent && (
                      <span className="ml-1 text-gray-500">({selectedNodeData.continent})</span>
                    )}
                  </p>
                  {selectedNodeData.leagueTier && (
                    <p className="text-xs text-gray-500">Tier {selectedNodeData.leagueTier} League</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
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
                  {selectedNodeData.stats.successfulTransfersRate !== undefined && (
                    <div className="bg-green-50 rounded-lg p-3 col-span-2">
                      <div className="text-green-600 font-medium">Success Rate</div>
                      <div className="text-2xl font-bold text-green-800">
                        {formatPercentage(selectedNodeData.stats.successfulTransfersRate)}
                      </div>
                    </div>
                  )}
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
                  
                  {/* Enhanced metrics */}
                  {selectedNodeData.stats.avgROI !== undefined && selectedNodeData.stats.avgROI !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average ROI:</span>
                      <span className={`font-medium ${selectedNodeData.stats.avgROI > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(selectedNodeData.stats.avgROI)}
                      </span>
                    </div>
                  )}
                  
                  {selectedNodeData.stats.avgPerformanceRating !== undefined && selectedNodeData.stats.avgPerformanceRating > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Performance:</span>
                      <span className="font-medium text-blue-600">
                        {selectedNodeData.stats.avgPerformanceRating.toFixed(1)}/10
                      </span>
                    </div>
                  )}
                  
                  {selectedNodeData.stats.avgPlayerAge && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Player Age:</span>
                      <span className="font-medium text-gray-700">
                        {selectedNodeData.stats.avgPlayerAge.toFixed(1)} years
                      </span>
                    </div>
                  )}
                </div>

                {/* Club details */}
                {(selectedNodeData.clubValue || selectedNodeData.foundingYear || selectedNodeData.stadiumCapacity) && (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="text-xs font-medium text-gray-700 mb-2">Club Information:</div>
                    <div className="space-y-1 text-xs text-gray-600">
                      {selectedNodeData.clubValue && (
                        <div>Market Value: {formatCurrency(selectedNodeData.clubValue)}</div>
                      )}
                      {selectedNodeData.foundingYear && (
                        <div>Founded: {selectedNodeData.foundingYear}</div>
                      )}
                      {selectedNodeData.stadiumCapacity && (
                        <div>Stadium: {selectedNodeData.stadiumCapacity.toLocaleString()} seats</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Hovered Edge Info */}
          {hoveredEdgeData && (
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h4 className="text-lg font-semibold mb-3">🔗 Transfer Connection</h4>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">
                      {hoveredEdgeData.stats.transferCount}
                    </div>
                    <div className="text-sm text-gray-600">Total Transfers</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {hoveredEdgeData.stats.avgROI !== undefined && hoveredEdgeData.stats.avgROI !== 0 && (
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-blue-600">Avg ROI</div>
                      <div className={`font-bold ${hoveredEdgeData.stats.avgROI > 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatPercentage(hoveredEdgeData.stats.avgROI)}
                      </div>
                    </div>
                  )}
                  
                  {hoveredEdgeData.stats.successRate !== undefined && hoveredEdgeData.stats.successRate > 0 && (
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-green-600">Success Rate</div>
                      <div className="font-bold text-green-700">
                        {formatPercentage(hoveredEdgeData.stats.successRate)}
                      </div>
                    </div>
                  )}
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
                  
                  {hoveredEdgeData.stats.seasons.length > 0 && (
                    <div className="pt-2 border-t">
                      <span className="text-gray-600 text-xs">Active Seasons:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {hoveredEdgeData.stats.seasons.slice(0, 3).map(season => (
                          <span 
                            key={season} 
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                          >
                            {season}
                          </span>
                        ))}
                        {hoveredEdgeData.stats.seasons.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{hoveredEdgeData.stats.seasons.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {hoveredEdgeData.stats.transferWindows.length > 0 && (
                    <div className="pt-2">
                      <span className="text-gray-600 text-xs">Transfer Windows:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {hoveredEdgeData.stats.transferWindows.map(window => (
                          <span 
                            key={window} 
                            className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded"
                          >
                            {window}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-2 border-t">
                    <span className="text-gray-600 text-xs">Transfer Types:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {hoveredEdgeData.stats.types.map(type => (
                        <span 
                          key={type} 
                          className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded"
                        >
                          {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Enhanced recent transfers preview */}
                {hoveredEdgeData.transfers.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="text-xs text-gray-600 mb-2">Recent Transfers:</div>
                    <div className="space-y-2 max-h-24 overflow-y-auto">
                      {hoveredEdgeData.transfers.slice(0, 4).map((transfer, idx) => (
                        <div key={idx} className="text-xs bg-gray-50 rounded p-2">
                          <div className="font-medium text-gray-700">{transfer.playerName}</div>
                          <div className="flex justify-between text-gray-500 mt-1">
                            <span>
                              {transfer.transferFee ? formatCurrency(transfer.transferFee) : 'Free'}
                            </span>
                            <span>{transfer.season}</span>
                          </div>
                          {transfer.performanceRating && (
                            <div className="text-xs text-blue-600 mt-1">
                              Rating: {transfer.performanceRating.toFixed(1)}/10
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Network Statistics */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h4 className="text-lg font-semibold mb-4">📈 Network Analytics</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
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
              
              {/* Enhanced performance metrics */}
              {networkData.metadata.avgROI !== undefined && networkData.metadata.avgROI !== 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center bg-yellow-50 rounded-lg p-3">
                    <div className={`text-2xl font-bold ${networkData.metadata.avgROI > 0 ? 'text-green-800' : 'text-red-800'}`}>
                      {formatPercentage(networkData.metadata.avgROI)}
                    </div>
                    <div className="text-xs text-yellow-600">Average ROI</div>
                  </div>
                  <div className="text-center bg-emerald-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-emerald-800">
                      {formatPercentage(networkData.metadata.successRate)}
                    </div>
                    <div className="text-xs text-emerald-600">Success Rate</div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Clubs:</span>
                  <span className="font-medium">{networkData.nodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Transfer Routes:</span>
                  <span className="font-medium">{networkData.edges.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg per Route:</span>
                  <span className="font-medium">
                    {networkData.edges.length > 0 ? 
                      (networkData.metadata.totalTransfers / networkData.edges.length).toFixed(1) : 
                      '0'
                    } transfers
                  </span>
                </div>
                
                {networkData.metadata.dateRange.start && networkData.metadata.dateRange.end && (
                  <div className="pt-2 border-t text-xs text-gray-500">
                    <div>Data Period:</div>
                    <div className="font-medium">
                      {formatDate(networkData.metadata.dateRange.start)} to {formatDate(networkData.metadata.dateRange.end)}
                    </div>
                  </div>
                )}
              </div>

              {/* Filter summary */}
              <div className="pt-3 border-t border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-2">Active Filters:</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(filters).map(([key, value]) => {
                    if (Array.isArray(value) && value.length > 0) {
                      return (
                        <span key={key} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          {key}: {value.length}
                        </span>
                      );
                    }
                    if (typeof value === 'number' || (typeof value === 'boolean' && value)) {
                      return (
                        <span key={key} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                          {key}
                        </span>
                      );
                    }
                    return null;
                  }).filter(Boolean)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferNetwork;