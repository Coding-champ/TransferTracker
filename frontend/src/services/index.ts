/**
 * Services Export Index
 * Provides both the new facade and original API service for smooth migration
 */

// Import the facade
import { apiServiceFacade } from './facade/ApiServiceFacade';

// Export the facade as the default API service for backward compatibility
export { apiServiceFacade as apiService } from './facade/ApiServiceFacade';
export { apiServiceFacade } from './facade/ApiServiceFacade';

// Export domain services for direct access if needed
export { masterDataService } from './domain/MasterDataService';
export { transferDataService } from './domain/TransferDataService';
export { analyticsService } from './domain/AnalyticsService';
export { filterDataService } from './domain/FilterDataService';

// Export base services
export { BaseApiService } from './base/BaseApiService';
export * from './base/ApiErrors';

// Keep the original API service available during migration
export { default as originalApiService } from './api';

// Export the default for existing imports
export default apiServiceFacade;