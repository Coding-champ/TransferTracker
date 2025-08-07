import { NetworkNode, NetworkEdge } from '../../../types';

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