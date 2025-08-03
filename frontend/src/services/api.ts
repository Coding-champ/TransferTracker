// API-Service-Klasse
// Diese Klasse kapselt alle API-Aufrufe und bietet eine einfache Schnittstelle für die Frontend-Komponenten.
// Sie enthält Methoden für die Kommunikation mit dem Backend, einschließlich Fehlerbehandlung, Caching und Performance-Optimierung.

import axios, { AxiosResponse } from 'axios';
import { 
  ApiResponse, 
  League, 
  Club, 
  NetworkData, 
  Transfer, 
  Statistics, 
  TransferSuccessStats, 
  LoanToBuyAnalytics,
  FilterParams, 
  TransferQueryParams,
  PaginatedResponse 
} from '../types';
import { 
  API_BASE_URL, 
  buildQueryParams, 
  filtersToApiParams, 
  debugLog, 
  createPerformanceTimer 
} from '../utils';

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
    debugLog(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
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

// ========== API SERVICE CLASS ==========
class ApiService {
  
  // ========== HEALTH & STATUS ==========

  async checkHealth(): Promise<ApiResponse<{ message: string; timestamp: string; database: string }>> {
    const timer = createPerformanceTimer('Health Check');
    try {
      const response: AxiosResponse<ApiResponse<{ message: string; timestamp: string; database: string }>> = 
        await apiClient.get('/health');
      return response.data;
    } finally {
      timer();
    }
  }

  // ========== MASTER DATA ENDPOINTS ==========

  /**
   * Get all leagues with enhanced data
   */
  async getLeagues(): Promise<ApiResponse<League[]>> {
    const timer = createPerformanceTimer('Get Leagues');
    try {
      const response: AxiosResponse<ApiResponse<League[]>> = await apiClient.get('/leagues');
      return response.data;
    } finally {
      timer();
    }
  }

  /**
   * Get all clubs (optionally filtered by league)
   */
  async getClubs(leagueId?: number): Promise<ApiResponse<Club[]>> {
    const timer = createPerformanceTimer('Get Clubs');
    try {
      const params = leagueId ? { leagueId } : {};
      const response: AxiosResponse<ApiResponse<Club[]>> = await apiClient.get('/clubs', { params });
      return response.data;
    } finally {
      timer();
    }
  }

  /**
   * Get available seasons
   */
  async getSeasons(): Promise<ApiResponse<string[]>> {
    const response: AxiosResponse<ApiResponse<string[]>> = await apiClient.get('/seasons');
    return response.data;
  }

  /**
   * Get transfer types
   */
  async getTransferTypes(): Promise<ApiResponse<string[]>> {
    const response: AxiosResponse<ApiResponse<string[]>> = await apiClient.get('/transfer-types');
    return response.data;
  }

  /**
   * Get transfer windows (NEW)
   */
  async getTransferWindows(): Promise<ApiResponse<string[]>> {
    const response: AxiosResponse<ApiResponse<string[]>> = await apiClient.get('/transfer-windows');
    return response.data;
  }

  /**
   * Get player positions
   */
  async getPositions(): Promise<ApiResponse<string[]>> {
    const response: AxiosResponse<ApiResponse<string[]>> = await apiClient.get('/positions');
    return response.data;
  }

  /**
   * Get player nationalities (NEW)
   */
  async getNationalities(): Promise<ApiResponse<string[]>> {
    const response: AxiosResponse<ApiResponse<string[]>> = await apiClient.get('/nationalities');
    return response.data;
  }

  /**
   * Get continents (NEW)
   */
  async getContinents(): Promise<ApiResponse<string[]>> {
    const response: AxiosResponse<ApiResponse<string[]>> = await apiClient.get('/continents');
    return response.data;
  }

  /**
   * Get league tiers (NEW)
   */
  async getLeagueTiers(): Promise<ApiResponse<number[]>> {
    const response: AxiosResponse<ApiResponse<number[]>> = await apiClient.get('/league-tiers');
    return response.data;
  }

  // ========== CORE DATA ENDPOINTS ==========

  /**
   * Get network data with enhanced filters
   */
  async getNetworkData(filters: FilterParams = {}): Promise<ApiResponse<NetworkData>> {
    const timer = createPerformanceTimer('Get Network Data');
    try {
      // Convert filter object to query parameters
      const params: any = {};
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value) && value.length > 0) {
            params[key] = value.join(',');
          } else if (typeof value === 'number' || typeof value === 'boolean') {
            params[key] = value.toString();
          }
        }
      });

      debugLog('Network data request params', params);
      
      const response: AxiosResponse<ApiResponse<NetworkData>> = 
        await apiClient.get('/network-data', { params });
      return response.data;
    } finally {
      timer();
    }
  }

  /**
   * Get transfers with pagination and filters
   */
  async getTransfers(options: TransferQueryParams = {}): Promise<ApiResponse<PaginatedResponse<Transfer[]>>> {
    const timer = createPerformanceTimer('Get Transfers');
    try {
      const response = await apiClient.get('/transfers', { params: options });
      return response.data;
    } finally {
      timer();
    }
  }

  /**
   * Get enhanced statistics
   */
  async getStatistics(): Promise<ApiResponse<Statistics>> {
    const timer = createPerformanceTimer('Get Statistics');
    try {
      const response: AxiosResponse<ApiResponse<Statistics>> = await apiClient.get('/statistics');
      return response.data;
    } finally {
      timer();
    }
  }

  // ========== ENHANCED ANALYTICS ENDPOINTS ==========

  /**
   * Get transfer success statistics (NEW)
   */
  async getTransferSuccessStats(clubId?: number, season?: string): Promise<ApiResponse<TransferSuccessStats>> {
    const timer = createPerformanceTimer('Get Success Stats');
    try {
      const params: any = {};
      if (clubId) params.clubId = clubId;
      if (season) params.season = season;
      
      const response: AxiosResponse<ApiResponse<TransferSuccessStats>> = 
        await apiClient.get('/transfer-success-stats', { params });
      return response.data;
    } finally {
      timer();
    }
  }

  /**
   * Get loan-to-buy analytics (NEW)
   */
  async getLoanToBuyAnalytics(): Promise<ApiResponse<LoanToBuyAnalytics>> {
    const timer = createPerformanceTimer('Get Loan-to-Buy Analytics');
    try {
      const response: AxiosResponse<ApiResponse<LoanToBuyAnalytics>> = 
        await apiClient.get('/loan-to-buy-analytics');
      return response.data;
    } finally {
      timer();
    }
  }

  // ========== BATCH DATA LOADING ==========

  /**
   * Load all filter data in one batch request
   */
  async loadAllFilterData(): Promise<{
    leagues: League[];
    clubs: Club[];
    seasons: string[];
    transferTypes: string[];
    transferWindows: string[];
    positions: string[];
    nationalities: string[];
    continents: string[];
    leagueTiers: number[];
  }> {
    const timer = createPerformanceTimer('Load All Filter Data');
    try {
      const [
        leaguesRes,
        clubsRes,
        seasonsRes,
        transferTypesRes,
        transferWindowsRes,
        positionsRes,
        nationalitiesRes,
        continentsRes,
        leagueTiersRes
      ] = await Promise.all([
        this.getLeagues(),
        this.getClubs(),
        this.getSeasons(),
        this.getTransferTypes(),
        this.getTransferWindows(),
        this.getPositions(),
        this.getNationalities(),
        this.getContinents(),
        this.getLeagueTiers()
      ]);

      return {
        leagues: leaguesRes.success ? leaguesRes.data : [],
        clubs: clubsRes.success ? clubsRes.data : [],
        seasons: seasonsRes.success ? seasonsRes.data : [],
        transferTypes: transferTypesRes.success ? transferTypesRes.data : [],
        transferWindows: transferWindowsRes.success ? transferWindowsRes.data : [],
        positions: positionsRes.success ? positionsRes.data : [],
        nationalities: nationalitiesRes.success ? nationalitiesRes.data : [],
        continents: continentsRes.success ? continentsRes.data : [],
        leagueTiers: leagueTiersRes.success ? leagueTiersRes.data : []
      };
    } finally {
      timer();
    }
  }

  // ========== ERROR HANDLING UTILITIES ==========

  /**
   * Generic error handler for API responses
   */
  private handleApiError(error: any, context: string): never {
    console.error(`API Error in ${context}:`, error);
    
    if (error.response) {
      throw new Error(`${context} failed: ${error.response.data?.error || error.response.statusText}`);
    } else if (error.request) {
      throw new Error(`${context} failed: Network error`);
    } else {
      throw new Error(`${context} failed: ${error.message}`);
    }
  }

  // ========== CACHING UTILITIES ==========
  
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  /**
   * Get data from cache or fetch if expired
   */
  private async getCachedOrFetch<T>(
    cacheKey: string, 
    fetchFn: () => Promise<T>, 
    ttlMs: number = 5 * 60 * 1000 // 5 minutes default
  ): Promise<T> {
    const cached = this.cache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < cached.ttl) {
      debugLog(`Cache hit for ${cacheKey}`);
      return cached.data;
    }
    
    debugLog(`Cache miss for ${cacheKey}, fetching...`);
    const data = await fetchFn();
    
    this.cache.set(cacheKey, {
      data,
      timestamp: now,
      ttl: ttlMs
    });
    
    return data;
  }

  /**
   * Clear cache entry or entire cache
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
      debugLog(`Cleared cache for ${key}`);
    } else {
      this.cache.clear();
      debugLog('Cleared entire cache');
    }
  }

  // ========== CACHED METHODS ==========

  /**
   * Get leagues with caching
   */
  async getLeaguesCached(): Promise<ApiResponse<League[]>> {
    return this.getCachedOrFetch('leagues', () => this.getLeagues());
  }

  /**
   * Get clubs with caching
   */
  async getClubsCached(leagueId?: number): Promise<ApiResponse<Club[]>> {
    const cacheKey = `clubs_${leagueId || 'all'}`;
    return this.getCachedOrFetch(cacheKey, () => this.getClubs(leagueId));
  }

  /**
   * Get filter data with caching
   */
  async loadAllFilterDataCached(): Promise<{
    leagues: League[];
    clubs: Club[];
    seasons: string[];
    transferTypes: string[];
    transferWindows: string[];
    positions: string[];
    nationalities: string[];
    continents: string[];
    leagueTiers: number[];
  }> {
    return this.getCachedOrFetch('all_filter_data', () => this.loadAllFilterData(), 10 * 60 * 1000); // 10 minutes
  }
}

// ========== EXPORT SINGLETON INSTANCE ==========
export const apiService = new ApiService();
export default apiService;