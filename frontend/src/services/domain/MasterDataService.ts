/**
 * MasterDataService - Handles league, club, and season data
 * Specialized service for master data with optimized caching
 */

import axios from 'axios';
import { ApiResponse, League, Club } from '../../types';
import { API_BASE_URL } from '../../utils';
import { BaseApiService } from '../base/BaseApiService';

// Create axios instance for master data
const masterDataClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export class MasterDataService extends BaseApiService {
  
  /**
   * Get all leagues with enhanced data
   */
  async getLeagues(): Promise<ApiResponse<League[]>> {
    return this.execute(
      () => masterDataClient.get('/leagues'),
      'Get Leagues',
      { 
        useCache: true, 
        cacheTTL: 10 * 60 * 1000, 
        cacheKey: 'leagues', 
        telemetryMeta: { feature: 'master-data', endpoint: 'leagues' } 
      }
    );
  }

  /**
   * Get all clubs (optionally filtered by league)
   */
  async getClubs(leagueId?: number): Promise<ApiResponse<Club[]>> {
    const cacheKey = `clubs_${leagueId || 'all'}`;
    return this.execute(
      () => masterDataClient.get('/clubs', { params: leagueId ? { leagueId } : {} }),
      'Get Clubs',
      { 
        useCache: true, 
        cacheTTL: 10 * 60 * 1000, 
        cacheKey, 
        telemetryMeta: { feature: 'master-data', endpoint: 'clubs', leagueId } 
      }
    );
  }

  /**
   * Get available seasons
   */
  async getSeasons(): Promise<ApiResponse<string[]>> {
    return this.execute(
      () => masterDataClient.get('/seasons'),
      'Get Seasons',
      { 
        useCache: true, 
        cacheTTL: 5 * 60 * 1000, 
        cacheKey: 'seasons', 
        telemetryMeta: { feature: 'master-data', endpoint: 'seasons' } 
      }
    );
  }

  /**
   * Get transfer types
   */
  async getTransferTypes(): Promise<ApiResponse<string[]>> {
    return this.execute(
      () => masterDataClient.get('/transfer-types'),
      'Get Transfer Types',
      { 
        useCache: true, 
        cacheTTL: 5 * 60 * 1000, 
        cacheKey: 'transfer-types', 
        telemetryMeta: { feature: 'master-data', endpoint: 'transfer-types' } 
      }
    );
  }

  /**
   * Get transfer windows
   */
  async getTransferWindows(): Promise<ApiResponse<string[]>> {
    return this.execute(
      () => masterDataClient.get('/transfer-windows'),
      'Get Transfer Windows',
      { 
        useCache: true, 
        cacheTTL: 5 * 60 * 1000, 
        cacheKey: 'transfer-windows', 
        telemetryMeta: { feature: 'master-data', endpoint: 'transfer-windows' } 
      }
    );
  }

  /**
   * Get player positions
   */
  async getPositions(): Promise<ApiResponse<string[]>> {
    return this.execute(
      () => masterDataClient.get('/positions'),
      'Get Positions',
      { 
        useCache: true, 
        cacheTTL: 5 * 60 * 1000, 
        cacheKey: 'positions', 
        telemetryMeta: { feature: 'master-data', endpoint: 'positions' } 
      }
    );
  }

  /**
   * Get player nationalities
   */
  async getNationalities(): Promise<ApiResponse<string[]>> {
    return this.execute(
      () => masterDataClient.get('/nationalities'),
      'Get Nationalities',
      { 
        useCache: true, 
        cacheTTL: 5 * 60 * 1000, 
        cacheKey: 'nationalities', 
        telemetryMeta: { feature: 'master-data', endpoint: 'nationalities' } 
      }
    );
  }

  /**
   * Get continents
   */
  async getContinents(): Promise<ApiResponse<string[]>> {
    return this.execute(
      () => masterDataClient.get('/continents'),
      'Get Continents',
      { 
        useCache: true, 
        cacheTTL: 5 * 60 * 1000, 
        cacheKey: 'continents', 
        telemetryMeta: { feature: 'master-data', endpoint: 'continents' } 
      }
    );
  }

  /**
   * Get league tiers
   */
  async getLeagueTiers(): Promise<ApiResponse<number[]>> {
    return this.execute(
      () => masterDataClient.get('/league-tiers'),
      'Get League Tiers',
      { 
        useCache: true, 
        cacheTTL: 5 * 60 * 1000, 
        cacheKey: 'league-tiers', 
        telemetryMeta: { feature: 'master-data', endpoint: 'league-tiers' } 
      }
    );
  }
}

// Export singleton instance
export const masterDataService = new MasterDataService();