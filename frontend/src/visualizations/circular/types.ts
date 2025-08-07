import * as d3 from 'd3';

// Local types to avoid import issues
interface TransferInfo {
  id: number;
  playerName: string;
  transferFee: number | null;
  transferType: string;
  date: Date | string;
  season: string;
  position: string | null;
  direction: 'out' | 'in';
}

interface NetworkNodeStats {
  transfersIn: number;
  transfersOut: number;
  totalSpent: number;
  totalReceived: number;
  netSpend: number;
}

export interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  league: string;
  leagueTier?: number;
  stats: NetworkNodeStats;
}

interface NetworkEdgeStats {
  totalValue: number;
  transferCount: number;
}

export interface NetworkEdge extends d3.SimulationLinkDatum<NetworkNode> {
  id: string;
  source: string | NetworkNode;
  target: string | NetworkNode;
  transfers: TransferInfo[];
  stats: NetworkEdgeStats;
}

export interface CircularNode {
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
  originalData: NetworkNode;
}

export interface CircularArc {
  source: CircularNode;
  target: CircularNode;
  value: number;
  count: number;
  type: 'inward' | 'outward' | 'same-tier';
  originalEdge: NetworkEdge;
}

export interface CircularTier {
  tier: number;
  radius: number;
  nodeCount: number;
  nodes: CircularNode[];
}

export interface CircularLayout {
  nodes: CircularNode[];
  arcs: CircularArc[];
  tiers: CircularTier[];
  centerX: number;
  centerY: number;
  maxRadius: number;
  minRadius: number;
}

export interface CircularInteractionState {
  hoveredNode: CircularNode | null;
  hoveredArc: CircularArc | null;
  selectedNode: CircularNode | null;
  selectedLeague: string | null;
  isDragging: boolean;
  rotation: number;
}

export interface CircularZoomState {
  level: 1 | 2 | 3; // Overview, Tier-Focus, Liga-Details
  focusedTier: number | null;
  focusedLeague: string | null;
  scale: number;
  translateX: number;
  translateY: number;
}

export interface CircularVisualizationConfig {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  minRadius: number;
  maxRadius: number;
  enableRotation: boolean;
  enableZoom: boolean;
  snapAngle: number;
  animationDuration: number;
}

export interface UseCircularLayoutProps {
  networkData: { nodes: NetworkNode[]; edges: NetworkEdge[] } | null;
  config: CircularVisualizationConfig;
  rotation: number;
  zoomState: CircularZoomState;
}

export interface UseCircularInteractionProps {
  layout: CircularLayout | null;
  svgRef: React.RefObject<SVGSVGElement>;
  config: CircularVisualizationConfig;
  onNodeClick?: (node: CircularNode) => void;
  onLeagueFilter?: (league: string) => void;
  onRotationChange?: (rotation: number) => void;
}

export interface UseCircularZoomProps {
  layout: CircularLayout | null;
  svgRef: React.RefObject<SVGSVGElement>;
  config: CircularVisualizationConfig;
  onZoomChange?: (zoomState: CircularZoomState) => void;
}