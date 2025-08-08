// API-Service-Klasse
// Diese Klasse kapselt alle API-Aufrufe und bietet eine einfache Schnittstelle für die Frontend-Komponenten.
// Sie enthält Methoden für die Kommunikation mit dem Backend, einschließlich Fehlerbehandlung, Caching und Performance-Optimierung.

import axios from 'axios';
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
  debugLog, 
  createPerformanceTimer 
} from '../utils';
import { BaseApiService } from './BaseApiService';

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
    debugLog(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data
    });
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
    // Log error for debugging
    console.error('API Response Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });
    
    return Promise.reject(error);
  }
);

// ========== API SERVICE CLASS ==========
class ApiService extends BaseApiService {
  
  // ========== HEALTH & STATUS ==========

  async checkHealth(): Promise<ApiResponse<{ message: string; timestamp: string; database: string }>> {
    return this.execute(
      () => apiClient.get('/health'),
      'Health Check',
      { telemetryMeta: { feature: 'health' } }
    );
  }

  // ========== MASTER DATA ENDPOINTS ==========

  /**
   * Get all leagues with enhanced data
   */
  async getLeagues(): Promise<ApiResponse<League[]>> {
    return this.execute(
      () => apiClient.get('/leagues'),
      'Get Leagues',
      { useCache: true, cacheTTL: 10 * 60 * 1000, cacheKey: 'leagues', telemetryMeta: { feature: 'filters' } }
    );
  }

  /**
   * Get all clubs (optionally filtered by league)
   */
  async getClubs(leagueId?: number): Promise<ApiResponse<Club[]>> {
    const cacheKey = `clubs_${leagueId || 'all'}`;
    return this.execute(
      () => apiClient.get('/clubs', { params: leagueId ? { leagueId } : {} }),
      'Get Clubs',
      { useCache: true, cacheTTL: 10 * 60 * 1000, cacheKey, telemetryMeta: { feature: 'filters', leagueId } }
    );
  }

  /**
   * Get available seasons
   */
  async getSeasons(): Promise<ApiResponse<string[]>> {
    return this.execute(
      () => apiClient.get('/seasons'),
      'Get Seasons',
      { useCache: true, cacheTTL: 5 * 60 * 1000, cacheKey: 'seasons', telemetryMeta: { feature: 'filters' } }
    );
  }

  /**
   * Get transfer types
   */
  async getTransferTypes(): Promise<ApiResponse<string[]>> {
    return this.execute(
      () => apiClient.get('/transfer-types'),
      'Get Transfer Types',
      { useCache: true, cacheTTL: 5 * 60 * 1000, cacheKey: 'transfer-types', telemetryMeta: { feature: 'filters' } }
    );
  }

  /**
   * Get transfer windows (NEW)
   */
  async getTransferWindows(): Promise<ApiResponse<string[]>> {
    return this.execute(
      () => apiClient.get('/transfer-windows'),
      'Get Transfer Windows',
      { useCache: true, cacheTTL: 5 * 60 * 1000, cacheKey: 'transfer-windows', telemetryMeta: { feature: 'filters' } }
    );
  }

  /**
   * Get player positions
   */
  async getPositions(): Promise<ApiResponse<string[]>> {
    return this.execute(
      () => apiClient.get('/positions'),
      'Get Positions',
      { useCache: true, cacheTTL: 5 * 60 * 1000, cacheKey: 'positions', telemetryMeta: { feature: 'filters' } }
    );
  }

  /**
   * Get player nationalities (NEW)
   */
  async getNationalities(): Promise<ApiResponse<string[]>> {
    return this.execute(
      () => apiClient.get('/nationalities'),
      'Get Nationalities',
      { useCache: true, cacheTTL: 5 * 60 * 1000, cacheKey: 'nationalities', telemetryMeta: { feature: 'filters' } }
    );
  }

  /**
   * Get continents (NEW)
   */
  async getContinents(): Promise<ApiResponse<string[]>> {
    return this.execute(
      () => apiClient.get('/continents'),
      'Get Continents',
      { useCache: true, cacheTTL: 5 * 60 * 1000, cacheKey: 'continents', telemetryMeta: { feature: 'filters' } }
    );
  }

  /**
   * Get league tiers (NEW)
   */
  async getLeagueTiers(): Promise<ApiResponse<number[]>> {
    return this.execute(
      () => apiClient.get('/league-tiers'),
      'Get League Tiers',
      { useCache: true, cacheTTL: 5 * 60 * 1000, cacheKey: 'league-tiers', telemetryMeta: { feature: 'filters' } }
    );
  }

  // ========== CORE DATA ENDPOINTS ==========

  /**
   * Get network data with enhanced filters
   */
  async getNetworkData(filters: FilterParams = {}, p0: { signal: AbortSignal; }): Promise<ApiResponse<NetworkData>> {
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
    
    return this.execute(
      () => apiClient.get('/network-data', { params }),
      'Get Network Data',
      { telemetryMeta: { feature: 'network', paramsSample: Object.keys(params).slice(0, 6) } }
    );
  }

  /**
   * Get transfers with pagination and filters
   */
  async getTransfers(options: TransferQueryParams = {}): Promise<ApiResponse<PaginatedResponse<Transfer[]>>> {
    return this.execute(
      () => apiClient.get('/transfers', { params: options }),
      'Get Transfers',
      { telemetryMeta: { feature: 'table' } }
    );
  }

  /**
   * Get enhanced statistics
   */
  async getStatistics(): Promise<ApiResponse<Statistics>> {
    return this.execute(
      () => apiClient.get('/statistics'),
      'Get Statistics',
      { telemetryMeta: { feature: 'statistics' } }
    );
  }

  // ========== ENHANCED ANALYTICS ENDPOINTS ==========

  /**
   * Get transfer success statistics (NEW)
   */
  async getTransferSuccessStats(clubId?: number, season?: string): Promise<ApiResponse<TransferSuccessStats>> {
    const params: any = {};
    if (clubId) params.clubId = clubId;
    if (season) params.season = season;
    
    return this.execute(
      () => apiClient.get('/transfer-success-stats', { params }),
      'Get Success Stats',
      { telemetryMeta: { feature: 'analytics', clubId, season } }
    );
  }

  /**
   * Get loan-to-buy analytics (NEW)
   */
  async getLoanToBuyAnalytics(): Promise<ApiResponse<LoanToBuyAnalytics>> {
    return this.execute(
      () => apiClient.get('/loan-to-buy-analytics'),
      'Get Loan-to-Buy Analytics',
      { telemetryMeta: { feature: 'analytics' } }
    );
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
}

// ========== EXPORT SINGLETON INSTANCE ==========
export const apiService = new ApiService();
export default apiService;