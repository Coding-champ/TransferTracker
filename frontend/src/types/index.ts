// Zentrale Type-Definitionen

// ========== FILTER TYPES ==========
export interface FilterState {
  readonly seasons: string[];
  readonly leagues: string[];
  readonly countries: string[];
  readonly continents: string[];
  readonly transferTypes: string[];
  readonly transferWindows: string[];
  readonly positions: string[];
  readonly nationalities: string[];
  readonly clubs: number[];
  readonly leagueTiers: number[];
  readonly minTransferFee?: number;
  readonly maxTransferFee?: number;
  readonly minPlayerAge?: number;
  readonly maxPlayerAge?: number;
  readonly minContractDuration?: number;
  readonly maxContractDuration?: number;
  readonly minROI?: number;
  readonly maxROI?: number;
  readonly minPerformanceRating?: number;
  readonly maxPerformanceRating?: number;
  readonly hasTransferFee?: boolean;
  readonly excludeLoans?: boolean;
  readonly isLoanToBuy?: boolean;
  readonly onlySuccessfulTransfers?: boolean;
}

// ========== API RESPONSE TYPES ==========
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  details?: string;
}

// ========== BUSINESS ENTITY TYPES ==========
export interface League {
  id: number;
  name: string;
  country: string;
  continent: string;
  tier: number;
  seasonStartMonth?: number;
  uefaCoefficient?: number;
  clubCount: number;
  createdAt?: string;
}

export interface Club {
  id: number;
  name: string;
  shortName?: string;
  league: {
    id?: number;
    name: string;
    country: string;
    continent?: string;
    tier?: number;
  };
  country: string;
  city?: string;
  logoUrl?: string;
  clubValue?: number;
  foundingYear?: number;
  stadiumCapacity?: number;
  isActive?: boolean;
  transferCount: {
    in: number;
    out: number;
    total: number;
  };
  currentPlayerCount?: number;
}

export interface TransferInfo {
  id: number;
  playerName: string;
  playerNationality?: string;
  transferFee: number | null;
  transferType: string;
  transferWindow?: string;
  date: Date | string;
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

export interface Transfer {
  id: number;
  playerName: string;
  playerNationality?: string;
  transferFee: number | null;
  transferType: string;
  transferWindow?: string;
  date: string;
  season: string;
  playerPosition: string | null;
  playerAge: number | null;
  marketValueAtTransfer?: number;
  contractDuration?: number;
  isLoanToBuy?: boolean;
  wasSuccessful?: boolean;
  roiPercentage?: number;
  oldClub: {
    id: number;
    name: string;
    shortName?: string;
    league: string;
    country: string;
    continent?: string;
    tier?: number;
  } | null;
  newClub: {
    id: number;
    name: string;
    shortName?: string;
    league: string;
    country: string;
    continent?: string;
    tier?: number;
  };
  success?: {
    performanceRating: number;
    marketValueGrowth: number | null;
    contractExtensions: number;
    trophiesWon: number;
    evaluatedAfterYears: number;
    lastEvaluated: string;
  };
  playerPerformance?: {
    gamesPlayed: number;
    goalsScored: number;
    marketValueEnd: number | null;
    wasRegularStarter: boolean;
  };
  isFollowUpPurchase?: boolean;
  originalLoan?: {
    id: number;
    playerName: string;
    date: string;
  };
  hasFollowUpPurchases?: boolean;
  followUpPurchases?: Array<{
    id: number;
    playerName: string;
    transferFee: number | null;
    date: string;
  }>;
}

// ========== NETWORK VISUALIZATION TYPES ==========
export interface NetworkNode extends d3.SimulationNodeDatum {
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

export interface NetworkEdge extends d3.SimulationLinkDatum<NetworkNode> {
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

export interface NetworkData {
  readonly nodes: NetworkNode[];
  readonly edges: NetworkEdge[];
  readonly metadata: {
    readonly totalTransfers: number;
    readonly totalValue: number;
    readonly dateRange: {
      readonly start: string | null;
      readonly end: string | null;
    };
    readonly clubCount: number;
    readonly edgeCount: number;
    readonly avgROI: number;
    readonly successRate: number;
    readonly filters: FilterState;
  };
}

// ========== STATISTICS TYPES ==========
export interface Statistics {
  totals: {
    transfers: number;
    clubs: number;
    leagues: number;
    transferValue: number;
  };
  performance: {
    avgROI: number;
    successRate: number;
  };
  topTransfer: {
    playerName: string;
    fee: number;
    from: string;
    to: string;
    date: string;
  } | null;
  recentTransfers: Array<{
    playerName: string;
    from: string;
    to: string;
    fee: number | null;
    date: string;
  }>;
  topPerformingClubs: Array<{
    id: number;
    name: string;
    league: string;
    continent: string;
    totalSpent: number;
    totalReceived: number;
    netSpend: number;
    successRate: number;
    avgPerformanceRating: number;
    transferCount: number;
  }>;
  transfersByWindow: Array<{
    window: string;
    count: number;
  }>;
  transfersByContinent: Array<{
    continent: string;
    count: number;
  }>;
}

export interface TransferSuccessStats {
  overview: {
    totalTransfers: number;
    successfulTransfers: number;
    successRate: number;
    avgROI: number;
    avgPerformanceRating: number;
  };
  topPerformers: Array<{
    id: number;
    playerName: string;
    transferFee: number | null;
    performanceRating: number;
    roiPercentage: number | null;
    from: string;
    to: string;
    date: string;
  }>;
  worstPerformers: Array<{
    id: number;
    playerName: string;
    transferFee: number | null;
    performanceRating: number;
    roiPercentage: number | null;
    from: string;
    to: string;
    date: string;
  }>;
}

export interface LoanToBuyAnalytics {
  overview: {
    totalLoans: number;
    loansToBuy: number;
    completedPurchases: number;
    conversionRate: number;
    avgLoanDuration: number;
  };
  successfulConversions: Array<{
    loanTransfer: {
      id: number;
      playerName: string;
      from: string;
      to: string;
      date: string;
      season: string;
    };
    purchases: Array<{
      id: number;
      transferFee: number | null;
      date: string;
      wasSuccessful: boolean;
    }>;
  }>;
}

// ========== PAGINATION TYPES ==========
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T;
  pagination: PaginationInfo;
}

// ========== COMPONENT PROP TYPES ==========
export interface FilterPanelProps {
  onFiltersChange: (filters: FilterState) => void;
}

export interface TransferNetworkProps {
  filters: FilterState;
}

// ========== UTILITY TYPES ==========
export type TransferType = 'sale' | 'loan' | 'free' | 'loan_with_option';
export type TransferWindow = 'summer' | 'winter';
export type ContinentType = 'Europe' | 'South America' | 'North America' | 'Africa' | 'Asia' | 'Oceania';

// ========== VISUALIZATION TYPES ==========
export type VisualizationType = 'network' | 'circular' | 'sankey' | 'heatmap' | 'timeline' | 'statistics';

export interface TabConfig {
  readonly id: VisualizationType;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly disabled?: boolean;
}

export interface VisualizationProps {
  readonly networkData: NetworkData;
  readonly filters: FilterState;
  readonly width?: number;
  readonly height?: number;
}

// ========== CIRCULAR VISUALIZATION TYPES ==========
export interface CircularNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  league: string;
  tier: number;
  angle: number;
  radius: number;
  transferCount: number;
  totalValue: number;
}

export interface CircularData {
  readonly nodes: CircularNode[];
  readonly tiers: Array<{
    tier: number;
    radius: number;
    clubs: CircularNode[];
  }>;
  readonly transfers: Array<{
    source: string;
    target: string;
    value: number;
    type: 'inward' | 'outward' | 'circular';
  }>;
}

// ========== SANKEY VISUALIZATION TYPES ==========
export interface SankeyNode {
  id: string;
  name: string;
  category: string;
  value: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
}

export interface SankeyLink {
  source: string | SankeyNode;
  target: string | SankeyNode;
  value: number;
  y0?: number;
  y1?: number;
  width?: number;
}

export interface SankeyData {
  readonly nodes: SankeyNode[];
  readonly links: SankeyLink[];
  readonly groupBy: 'league' | 'continent' | 'position';
}

// ========== API PARAMETER TYPES ==========
export interface FilterParams {
  seasons?: string[];
  leagues?: string[];
  countries?: string[];
  continents?: string[];
  transferTypes?: string[];
  transferWindows?: string[];
  positions?: string[];
  nationalities?: string[];
  clubs?: number[];
  leagueTiers?: number[];
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
  limit?: number;
}

export interface TransferQueryParams {
  page?: number;
  limit?: number;
  clubId?: number;
  season?: string;
  transferType?: string;
  transferWindow?: string;
  nationality?: string;
  minAge?: number;
  maxAge?: number;
  minContract?: number;
  maxContract?: number;
  minROI?: number;
  maxROI?: number;
  onlySuccessful?: boolean;
  isLoanToBuy?: boolean;
}