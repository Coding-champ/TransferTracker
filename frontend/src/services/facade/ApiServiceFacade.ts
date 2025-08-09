/**
 * ApiServiceFacade - Backward compatibility facade
 * Provides the same interface as the original ApiService while delegating to domain services
 */

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
} from '../../types';

import { masterDataService } from '../domain/MasterDataService';
import { transferDataService } from '../domain/TransferDataService';
import { analyticsService } from '../domain/AnalyticsService';
import { filterDataService } from '../domain/FilterDataService';

/**
 * ApiServiceFacade maintains the exact same interface as the original ApiService
 * This ensures 100% backward compatibility with existing code
 */
export class ApiServiceFacade {
  
  // ========== HEALTH & STATUS ==========

  async checkHealth(): Promise<ApiResponse<{ message: string; timestamp: string; database: string }>> {
    return analyticsService.checkHealth();
  }

  // ========== MASTER DATA ENDPOINTS ==========

  /**
   * Get all leagues with enhanced data
   */
  async getLeagues(): Promise<ApiResponse<League[]>> {
    return masterDataService.getLeagues();
  }

  /**
   * Get all clubs (optionally filtered by league)
   */
  async getClubs(leagueId?: number): Promise<ApiResponse<Club[]>> {
    return masterDataService.getClubs(leagueId);
  }

  /**
   * Get available seasons
   */
  async getSeasons(): Promise<ApiResponse<string[]>> {
    return masterDataService.getSeasons();
  }

  /**
   * Get transfer types
   */
  async getTransferTypes(): Promise<ApiResponse<string[]>> {
    return masterDataService.getTransferTypes();
  }

  /**
   * Get transfer windows
   */
  async getTransferWindows(): Promise<ApiResponse<string[]>> {
    return masterDataService.getTransferWindows();
  }

  /**
   * Get player positions
   */
  async getPositions(): Promise<ApiResponse<string[]>> {
    return masterDataService.getPositions();
  }

  /**
   * Get player nationalities
   */
  async getNationalities(): Promise<ApiResponse<string[]>> {
    return masterDataService.getNationalities();
  }

  /**
   * Get continents
   */
  async getContinents(): Promise<ApiResponse<string[]>> {
    return masterDataService.getContinents();
  }

  /**
   * Get league tiers
   */
  async getLeagueTiers(): Promise<ApiResponse<number[]>> {
    return masterDataService.getLeagueTiers();
  }

  // ========== CORE DATA ENDPOINTS ==========

  /**
   * Get network data with enhanced filters
   */
  async getNetworkData(filters: FilterParams = {}, options: { signal: AbortSignal }): Promise<ApiResponse<NetworkData>> {
    return transferDataService.getNetworkData(filters, options);
  }

  /**
   * Get transfers with pagination and filters
   */
  async getTransfers(options: TransferQueryParams = {}): Promise<ApiResponse<PaginatedResponse<Transfer[]>>> {
    return transferDataService.getTransfers(options);
  }

  /**
   * Get enhanced statistics
   */
  async getStatistics(): Promise<ApiResponse<Statistics>> {
    return analyticsService.getStatistics();
  }

  // ========== ENHANCED ANALYTICS ENDPOINTS ==========

  /**
   * Get transfer success statistics
   */
  async getTransferSuccessStats(clubId?: number, season?: string): Promise<ApiResponse<TransferSuccessStats>> {
    return analyticsService.getTransferSuccessStats(clubId, season);
  }

  /**
   * Get loan-to-buy analytics
   */
  async getLoanToBuyAnalytics(): Promise<ApiResponse<LoanToBuyAnalytics>> {
    return analyticsService.getLoanToBuyAnalytics();
  }

  // ========== BATCH DATA LOADING ==========

  /**
   * Load all filter data in one batch request
   * PRESERVED: This method maintains the exact same return structure as the original
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
    return filterDataService.loadAllFilterData();
  }

  // ========== ADDITIONAL DOMAIN SERVICE METHODS ==========
  // These provide access to enhanced functionality while maintaining backward compatibility

  /**
   * Get transfer by ID (new functionality via TransferDataService)
   */
  async getTransferById(transferId: number): Promise<ApiResponse<Transfer>> {
    return transferDataService.getTransferById(transferId);
  }

  /**
   * Get transfers by club (enhanced functionality)
   */
  async getTransfersByClub(clubId: number, options: TransferQueryParams = {}): Promise<ApiResponse<PaginatedResponse<Transfer[]>>> {
    return transferDataService.getTransfersByClub(clubId, options);
  }

  /**
   * Search transfers (new functionality)
   */
  async searchTransfers(query: string, options: TransferQueryParams = {}): Promise<ApiResponse<PaginatedResponse<Transfer[]>>> {
    return transferDataService.searchTransfers(query, options);
  }

  /**
   * Validate filter combination (new functionality)
   */
  async validateFilterCombination(filters: {
    leagues?: number[];
    clubs?: number[];
    seasons?: string[];
    positions?: string[];
    nationalities?: string[];
  }): Promise<{
    isValid: boolean;
    errors: string[];
    suggestions: string[];
  }> {
    return filterDataService.validateFilterCombination(filters);
  }

  /**
   * Get market value trends (new analytics functionality)
   */
  async getMarketValueTrends(clubId?: number, position?: string): Promise<ApiResponse<any>> {
    return analyticsService.getMarketValueTrends(clubId, position);
  }

  /**
   * Get performance metrics (new analytics functionality)
   */
  async getPerformanceMetrics(filters: {
    season?: string;
    league?: string;
    minAge?: number;
    maxAge?: number;
  } = {}): Promise<ApiResponse<any>> {
    return analyticsService.getPerformanceMetrics(filters);
  }

  // ========== CACHE MANAGEMENT ==========
  
  /**
   * Clear all caches across all domain services
   */
  clearCache(key?: string): void {
    masterDataService.clearCache(key);
    transferDataService.clearCache(key);
    analyticsService.clearCache(key);
  }

  /**
   * Clear cache for specific domain
   */
  clearMasterDataCache(key?: string): void {
    masterDataService.clearCache(key);
  }

  clearTransferDataCache(key?: string): void {
    transferDataService.clearCache(key);
  }

  clearAnalyticsCache(key?: string): void {
    analyticsService.clearCache(key);
  }
}

// Export singleton instance for backward compatibility
export const apiServiceFacade = new ApiServiceFacade();