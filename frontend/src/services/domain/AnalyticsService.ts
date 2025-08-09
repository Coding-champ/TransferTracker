/**
 * AnalyticsService - Handles statistics and analytics data
 * Specialized service for analytics with targeted caching strategies
 */

import axios from 'axios';
import { ApiResponse, Statistics, TransferSuccessStats, LoanToBuyAnalytics } from '../../types';
import { API_BASE_URL } from '../../utils';
import { BaseApiService } from '../base/BaseApiService';

// Create axios instance for analytics data
const analyticsClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export class AnalyticsService extends BaseApiService {
  
  /**
   * Get application health status
   */
  async checkHealth(): Promise<ApiResponse<{ message: string; timestamp: string; database: string }>> {
    return this.execute(
      () => analyticsClient.get('/health'),
      'Health Check',
      { 
        telemetryMeta: { 
          feature: 'analytics', 
          endpoint: 'health' 
        } 
      }
    );
  }

  /**
   * Get enhanced statistics
   */
  async getStatistics(): Promise<ApiResponse<Statistics>> {
    return this.execute(
      () => analyticsClient.get('/statistics'),
      'Get Statistics',
      { 
        useCache: true,
        cacheTTL: 2 * 60 * 1000, // 2 minutes cache for statistics
        cacheKey: 'statistics',
        telemetryMeta: { 
          feature: 'analytics', 
          endpoint: 'statistics' 
        } 
      }
    );
  }

  /**
   * Get transfer success statistics
   */
  async getTransferSuccessStats(clubId?: number, season?: string): Promise<ApiResponse<TransferSuccessStats>> {
    const params: any = {};
    if (clubId) params.clubId = clubId;
    if (season) params.season = season;
    
    const cacheKey = `transfer_success_${clubId || 'all'}_${season || 'all'}`;
    
    return this.execute(
      () => analyticsClient.get('/transfer-success-stats', { params }),
      'Get Transfer Success Stats',
      { 
        useCache: true,
        cacheTTL: 5 * 60 * 1000, // 5 minutes cache for success stats
        cacheKey,
        telemetryMeta: { 
          feature: 'analytics', 
          endpoint: 'transfer-success-stats',
          clubId, 
          season 
        } 
      }
    );
  }

  /**
   * Get loan-to-buy analytics
   */
  async getLoanToBuyAnalytics(): Promise<ApiResponse<LoanToBuyAnalytics>> {
    return this.execute(
      () => analyticsClient.get('/loan-to-buy-analytics'),
      'Get Loan-to-Buy Analytics',
      { 
        useCache: true,
        cacheTTL: 10 * 60 * 1000, // 10 minutes cache for loan analytics
        cacheKey: 'loan_to_buy_analytics',
        telemetryMeta: { 
          feature: 'analytics', 
          endpoint: 'loan-to-buy-analytics' 
        } 
      }
    );
  }

  /**
   * Get market value trends analytics
   */
  async getMarketValueTrends(clubId?: number, position?: string): Promise<ApiResponse<any>> {
    const params: any = {};
    if (clubId) params.clubId = clubId;
    if (position) params.position = position;
    
    const cacheKey = `market_trends_${clubId || 'all'}_${position || 'all'}`;
    
    return this.execute(
      () => analyticsClient.get('/market-value-trends', { params }),
      'Get Market Value Trends',
      { 
        useCache: true,
        cacheTTL: 15 * 60 * 1000, // 15 minutes cache for market trends
        cacheKey,
        telemetryMeta: { 
          feature: 'analytics', 
          endpoint: 'market-value-trends',
          clubId,
          position 
        } 
      }
    );
  }

  /**
   * Get performance metrics analytics
   */
  async getPerformanceMetrics(filters: {
    season?: string;
    league?: string;
    minAge?: number;
    maxAge?: number;
  } = {}): Promise<ApiResponse<any>> {
    const cacheKey = `performance_metrics_${JSON.stringify(filters)}`;
    
    return this.execute(
      () => analyticsClient.get('/performance-metrics', { params: filters }),
      'Get Performance Metrics',
      { 
        useCache: true,
        cacheTTL: 5 * 60 * 1000, // 5 minutes cache for performance metrics
        cacheKey,
        telemetryMeta: { 
          feature: 'analytics', 
          endpoint: 'performance-metrics',
          ...filters 
        } 
      }
    );
  }

  /**
   * Get transfer network metrics
   */
  async getNetworkMetrics(filters: {
    season?: string;
    minConnections?: number;
  } = {}): Promise<ApiResponse<any>> {
    const cacheKey = `network_metrics_${JSON.stringify(filters)}`;
    
    return this.execute(
      () => analyticsClient.get('/network-metrics', { params: filters }),
      'Get Network Metrics',
      { 
        useCache: true,
        cacheTTL: 10 * 60 * 1000, // 10 minutes cache for network metrics
        cacheKey,
        telemetryMeta: { 
          feature: 'analytics', 
          endpoint: 'network-metrics',
          ...filters 
        } 
      }
    );
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();