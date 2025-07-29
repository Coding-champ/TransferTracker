// src/services/api.ts
import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    if (error.response?.status === 404) {
      console.error('API endpoint not found:', error.config?.url);
    } else if (error.response?.status >= 500) {
      console.error('Server error:', error.response?.data);
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
    }
    
    return Promise.reject(error);
  }
);

// Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  details?: string;
}

export interface League {
  id: number;
  name: string;
  country: string;
  tier: number;
  seasonStartMonth: number;
  clubCount: number;
  createdAt: string;
}

export interface Club {
  id: number;
  name: string;
  shortName?: string;
  league: {
    id: number;
    name: string;
    country: string;
  };
  country: string;
  logoUrl?: string;
  clubValue?: number;
  foundingYear?: number;
  stadiumCapacity?: number;
  transferCount: {
    in: number;
    out: number;
    total: number;
  };
}

export interface NetworkNode {
  id: string;
  name: string;
  shortName?: string;
  league: string;
  country: string;
  logoUrl?: string;
  clubValue?: number;
  stats: {
    transfersIn: number;
    transfersOut: number;
    totalSpent: number;
    totalReceived: number;
    netSpend: number;
    avgPlayerAge?: number;
  };
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  transfers: TransferInfo[];
  stats: {
    totalValue: number;
    transferCount: number;
    avgTransferValue: number;
    types: string[];
  };
}

export interface TransferInfo {
  id: number;
  playerName: string;
  transferFee: number | null;
  transferType: string;
  date: string;
  position: string | null;
  playerAge?: number;
  direction: 'out' | 'in';
}

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  metadata: {
    totalTransfers: number;
    totalValue: number;
    clubCount: number;
    edgeCount: number;
    dateRange: {
      start: string | null;
      end: string | null;
    };
    filters: any;
  };
}

export interface Transfer {
  id: number;
  playerName: string;
  transferFee: number | null;
  transferType: string;
  date: string;
  season: string;
  playerPosition: string | null;
  playerAge: number | null;
  marketValue: number | null;
  contractDuration: number | null;
  oldClub: {
    id: number;
    name: string;
    shortName?: string;
    league: string;
    country: string;
  } | null;
  newClub: {
    id: number;
    name: string;
    shortName?: string;
    league: string;
    country: string;
  };
}

export interface Statistics {
  totals: {
    transfers: number;
    clubs: number;
    leagues: number;
    transferValue: number;
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
}

export interface FilterParams {
  seasons?: string[];
  leagues?: string[];
  countries?: string[];
  transferTypes?: string[];
  positions?: string[];
  clubs?: number[];
  minTransferFee?: number;
  maxTransferFee?: number;
  minPlayerAge?: number;
  maxPlayerAge?: number;
  hasTransferFee?: boolean;
  excludeLoans?: boolean;
  limit?: number;
}

// API Service Class
class ApiService {
  
  // Health check
  async checkHealth(): Promise<ApiResponse<{ message: string; timestamp: string; database: string }>> {
    const response: AxiosResponse<ApiResponse<{ message: string; timestamp: string; database: string }>> = 
      await apiClient.get('/health');
    return response.data;
  }

  // Get all leagues
  async getLeagues(): Promise<ApiResponse<League[]>> {
    const response: AxiosResponse<ApiResponse<League[]>> = await apiClient.get('/leagues');
    return response.data;
  }

  // Get all clubs (optionally filtered by league)
  async getClubs(leagueId?: number): Promise<ApiResponse<Club[]>> {
    const params = leagueId ? { leagueId } : {};
    const response: AxiosResponse<ApiResponse<Club[]>> = await apiClient.get('/clubs', { params });
    return response.data;
  }

  // Get available seasons
  async getSeasons(): Promise<ApiResponse<string[]>> {
    const response: AxiosResponse<ApiResponse<string[]>> = await apiClient.get('/seasons');
    return response.data;
  }

  // Get transfer types
  async getTransferTypes(): Promise<ApiResponse<string[]>> {
    const response: AxiosResponse<ApiResponse<string[]>> = await apiClient.get('/transfer-types');
    return response.data;
  }

  // Get player positions
  async getPositions(): Promise<ApiResponse<string[]>> {
    const response: AxiosResponse<ApiResponse<string[]>> = await apiClient.get('/positions');
    return response.data;
  }

  // Get network data with filters
  async getNetworkData(filters: FilterParams = {}): Promise<ApiResponse<NetworkData>> {
    // Convert arrays to comma-separated strings for query params
    const params: any = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          params[key] = value.join(',');
        } else {
          params[key] = value;
        }
      }
    });

    console.log('Requesting network data with filters:', params);
    
    const response: AxiosResponse<ApiResponse<NetworkData>> = 
      await apiClient.get('/network-data', { params });
    return response.data;
  }

  // Get transfers with pagination
  async getTransfers(options: {
    page?: number;
    limit?: number;
    clubId?: number;
    season?: string;
    transferType?: string;
  } = {}): Promise<ApiResponse<{
    transfers: Transfer[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>> {
    const response = await apiClient.get('/transfers', { params: options });
    return response.data;
  }

  // Get statistics
  async getStatistics(): Promise<ApiResponse<Statistics>> {
    const response: AxiosResponse<ApiResponse<Statistics>> = await apiClient.get('/statistics');
    return response.data;
  }

  // Utility method to format currency
  formatCurrency(amount: number | null): string {
    if (!amount) return 'Free';
    
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `€${(amount / 1000).toFixed(0)}K`;
    } else {
      return `€${amount.toLocaleString()}`;
    }
  }

  // Utility method to format dates
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Build query string from filters
  private buildQueryString(filters: FilterParams): string {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          params.set(key, value.join(','));
        } else {
          params.set(key, value.toString());
        }
      }
    });
    
    return params.toString();
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;