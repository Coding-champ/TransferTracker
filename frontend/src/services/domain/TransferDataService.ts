/**
 * TransferDataService - Handles transfer and network data
 * Specialized service for transfer data with performance optimization
 */

import axios from 'axios';
import { ApiResponse, NetworkData, Transfer, FilterParams, TransferQueryParams, PaginatedResponse } from '../../types';
import { API_BASE_URL, debugLog } from '../../utils';
import { BaseApiService } from '../base/BaseApiService';

// Create axios instance for transfer data
const transferDataClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export class TransferDataService extends BaseApiService {
  
  /**
   * Get network data with enhanced filters
   */
  async getNetworkData(filters: FilterParams = {}, options: { signal: AbortSignal }): Promise<ApiResponse<NetworkData>> {
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
      () => transferDataClient.get('/network-data', { 
        params,
        signal: options.signal 
      }),
      'Get Network Data',
      { 
        telemetryMeta: { 
          feature: 'transfer-data', 
          endpoint: 'network-data',
          paramsSample: Object.keys(params).slice(0, 6) 
        } 
      }
    );
  }

  /**
   * Get transfers with pagination and filters
   */
  async getTransfers(options: TransferQueryParams = {}): Promise<ApiResponse<PaginatedResponse<Transfer[]>>> {
    return this.execute(
      () => transferDataClient.get('/transfers', { params: options }),
      'Get Transfers',
      { 
        telemetryMeta: { 
          feature: 'transfer-data', 
          endpoint: 'transfers',
          page: options.page,
          limit: options.limit
        } 
      }
    );
  }

  /**
   * Get detailed transfer information by ID
   */
  async getTransferById(transferId: number): Promise<ApiResponse<Transfer>> {
    return this.execute(
      () => transferDataClient.get(`/transfers/${transferId}`),
      'Get Transfer By ID',
      { 
        useCache: true,
        cacheTTL: 2 * 60 * 1000,
        cacheKey: `transfer_${transferId}`,
        telemetryMeta: { 
          feature: 'transfer-data', 
          endpoint: 'transfer-detail',
          transferId 
        } 
      }
    );
  }

  /**
   * Get transfers by club ID
   */
  async getTransfersByClub(clubId: number, options: TransferQueryParams = {}): Promise<ApiResponse<PaginatedResponse<Transfer[]>>> {
    const params = { ...options, clubId };
    
    return this.execute(
      () => transferDataClient.get('/transfers', { params }),
      'Get Transfers By Club',
      { 
        telemetryMeta: { 
          feature: 'transfer-data', 
          endpoint: 'transfers-by-club',
          clubId,
          page: options.page,
          limit: options.limit
        } 
      }
    );
  }

  /**
   * Get transfers by season
   */
  async getTransfersBySeason(season: string, options: TransferQueryParams = {}): Promise<ApiResponse<PaginatedResponse<Transfer[]>>> {
    const params = { ...options, season };
    
    return this.execute(
      () => transferDataClient.get('/transfers', { params }),
      'Get Transfers By Season',
      { 
        telemetryMeta: { 
          feature: 'transfer-data', 
          endpoint: 'transfers-by-season',
          season,
          page: options.page,
          limit: options.limit
        } 
      }
    );
  }

  /**
   * Search transfers with text query
   */
  async searchTransfers(query: string, options: TransferQueryParams = {}): Promise<ApiResponse<PaginatedResponse<Transfer[]>>> {
    const params = { ...options, search: query };
    
    return this.execute(
      () => transferDataClient.get('/transfers', { params }),
      'Search Transfers',
      { 
        telemetryMeta: { 
          feature: 'transfer-data', 
          endpoint: 'search-transfers',
          query: query.substring(0, 20), // Truncate for telemetry
          page: options.page,
          limit: options.limit
        } 
      }
    );
  }
}

// Export singleton instance
export const transferDataService = new TransferDataService();