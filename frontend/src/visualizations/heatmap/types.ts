import { NetworkData, Filters } from '../../types';

export interface HeatmapCell {
  source: string;
  target: string;
  value: number;
  count: number;
  sourceIndex: number;
  targetIndex: number;
  successRate?: number;
  topTransfer?: {
    player: string;
    value: number;
  };
}

export interface HeatmapData {
  matrix: HeatmapCell[];
  labels: string[];
  maxValue: number;
  maxCount: number;
}

export interface HeatmapConfig {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  cellPadding: number;
  animationDuration: number;
}

export type HeatmapMode = 'value' | 'count' | 'success-rate';

export interface DrillDownState {
  level: 'league' | 'club' | 'transfer';
  sourceFilter?: string;
  targetFilter?: string;
  selectedCell?: HeatmapCell;
}

export interface HeatmapTooltipData {
  cell: HeatmapCell;
  position: {
    x: number;
    y: number;
  };
}

export interface UseHeatmapDataProps {
  networkData: NetworkData | null;
  filters: Filters;
  drillDownState: DrillDownState;
}

export interface UseHeatmapInteractionProps {
  heatmapData: HeatmapData | null;
  svgRef: React.RefObject<SVGSVGElement>;
  config: HeatmapConfig;
  onCellClick: (cell: HeatmapCell) => void;
  onCellHover: (cell: HeatmapCell | null, position?: { x: number; y: number }) => void;
}

export interface UseDrillDownProps {
  initialState?: DrillDownState;
  onStateChange?: (state: DrillDownState) => void;
}

export interface TransferDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceClub: string;
  targetClub: string;
  transfers: TransferDetail[];
}

export interface TransferDetail {
  id: string;
  playerName: string;
  position: string;
  age: number;
  value: number;
  date: string;
  success: boolean;
  stats?: {
    gamesPlayed?: number;
    goals?: number;
    assists?: number;
  };
}