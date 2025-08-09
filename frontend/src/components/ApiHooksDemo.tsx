/**
 * Phase 4 API Hooks Demo Component
 * 
 * Demonstrates the enhanced API layer capabilities
 * with real-world usage examples
 */

import React, { useState } from 'react';
import { 
  useApiQuery, 
  useApiMutation, 
  useApiCache,
  useNetworkStatus,
  useRequestDeduplication,
  createCacheKey 
} from '../hooks/api';

// Sample data types
interface TransferData {
  id: string;
  playerName: string;
  fromClub: string;
  toClub: string;
  transferFee: number;
  season: string;
}

interface CreateTransferData {
  playerName: string;
  fromClub: string;
  toClub: string;
  transferFee: number;
}

// Mock API functions
const fetchTransfers = async (filters: Record<string, any>): Promise<TransferData[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return [
    {
      id: '1',
      playerName: 'Sample Player',
      fromClub: 'Club A',
      toClub: 'Club B',
      transferFee: 50000000,
      season: '2023/24'
    },
    {
      id: '2',
      playerName: 'Another Player',
      fromClub: 'Club C',
      toClub: 'Club D',
      transferFee: 25000000,
      season: '2023/24'
    }
  ];
};

const createTransfer = async (data: CreateTransferData): Promise<TransferData> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return {
    id: Date.now().toString(),
    ...data,
    season: '2023/24'
  };
};

export const ApiHooksDemo: React.FC = () => {
  const [filters, setFilters] = useState({ season: '2023/24' });
  
  // Enhanced API Query with intelligent caching
  const {
    data: transfers,
    loading: transfersLoading,
    error: transfersError,
    refetch: refetchTransfers,
    isStale
  } = useApiQuery(
    () => fetchTransfers(filters),
    [filters],
    {
      cache: true,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      staleWhileRevalidate: true,
      refetchOnWindowFocus: true,
      retry: 3
    }
  );

  // Enhanced API Mutation with optimistic updates
  const {
    mutate: createTransferMutation,
    mutateAsync: createTransferAsync,
    loading: creatingTransfer,
    error: createError,
    data: createdTransfer
  } = useApiMutation(createTransfer, {
    onMutate: (variables) => {
      // Optimistic update - immediately show new transfer
      return {
        id: 'temp-' + Date.now(),
        ...variables,
        season: '2023/24'
      };
    },
    onSuccess: (data, variables) => {
      console.log('Transfer created successfully:', data);
      // Refetch transfers to get updated list
      refetchTransfers();
    },
    onError: (error, variables, rollback) => {
      console.error('Failed to create transfer:', error);
      if (rollback) rollback();
    }
  });

  // Cache management
  const cache = useApiCache<TransferData[]>();
  
  // Network status monitoring
  const networkStatus = useNetworkStatus({
    adaptiveLoading: true,
    bandwidthMonitoring: true
  });

  // Request deduplication
  const deduplication = useRequestDeduplication();

  // Demo functions
  const handleCreateTransfer = () => {
    createTransferMutation({
      playerName: 'Demo Player',
      fromClub: 'Demo Club A',
      toClub: 'Demo Club B',
      transferFee: 15000000
    });
  };

  const handleCacheDemo = () => {
    const cacheKey = createCacheKey('/api/transfers', filters);
    cache.set(cacheKey, transfers || [], 60000, ['transfers', filters.season]);
    
    const stats = cache.getStats();
    console.log('Cache stats:', stats);
  };

  const handleInvalidateCache = () => {
    cache.invalidateByTags(['transfers']);
    console.log('Cache invalidated');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Phase 4 API Hooks Demo</h1>
      
      {/* Network Status */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Network Status</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Status:</strong> {networkStatus.isOnline ? 'Online' : 'Offline'}
          </div>
          <div>
            <strong>Quality:</strong> {networkStatus.quality}
          </div>
          <div>
            <strong>Connection:</strong> {networkStatus.connectionType}
          </div>
          <div>
            <strong>Effective Type:</strong> {networkStatus.effectiveType}
          </div>
        </div>
      </div>

      {/* API Query Demo */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Enhanced API Query</h2>
        <div className="flex gap-4 mb-4">
          <button
            onClick={refetchTransfers}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={transfersLoading}
          >
            {transfersLoading ? 'Loading...' : 'Refetch Transfers'}
          </button>
          <button
            onClick={() => setFilters({ season: '2022/23' })}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Change Season
          </button>
        </div>
        
        {isStale && (
          <div className="text-orange-600 text-sm mb-2">
            Data is stale, refreshing in background...
          </div>
        )}
        
        {transfersError && (
          <div className="text-red-600 mb-2">Error: {transfersError}</div>
        )}
        
        {transfers && (
          <div>
            <h3 className="font-semibold mb-2">Transfers ({transfers.length}):</h3>
            <div className="space-y-2">
              {transfers.map(transfer => (
                <div key={transfer.id} className="p-2 bg-white rounded border">
                  <div className="font-medium">{transfer.playerName}</div>
                  <div className="text-sm text-gray-600">
                    {transfer.fromClub} → {transfer.toClub} 
                    (€{transfer.transferFee.toLocaleString()})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* API Mutation Demo */}
      <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Enhanced API Mutation</h2>
        <button
          onClick={handleCreateTransfer}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          disabled={creatingTransfer}
        >
          {creatingTransfer ? 'Creating...' : 'Create Demo Transfer'}
        </button>
        
        {createError && (
          <div className="text-red-600 mt-2">Error: {createError}</div>
        )}
        
        {createdTransfer && (
          <div className="mt-2 p-2 bg-white rounded border">
            <div className="font-medium">✓ Created: {createdTransfer.playerName}</div>
            <div className="text-sm text-gray-600">
              {createdTransfer.fromClub} → {createdTransfer.toClub}
            </div>
          </div>
        )}
      </div>

      {/* Cache Management Demo */}
      <div className="mb-6 p-4 bg-purple-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Cache Management</h2>
        <div className="flex gap-4 mb-4">
          <button
            onClick={handleCacheDemo}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            Cache Current Data
          </button>
          <button
            onClick={handleInvalidateCache}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Invalidate Cache
          </button>
        </div>
        
        <div className="text-sm">
          <div><strong>Cache Size:</strong> {cache.state.size} entries</div>
          <div><strong>Hit Rate:</strong> {cache.state.hitRate.toFixed(1)}%</div>
          <div><strong>Memory Usage:</strong> ~{(cache.state.memoryUsage / 1024).toFixed(1)}KB</div>
          <div><strong>Status:</strong> {cache.state.status}</div>
        </div>
      </div>

      {/* Request Deduplication Demo */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Request Deduplication</h2>
        <button
          onClick={() => {
            // Simulate multiple identical requests
            Promise.all([
              deduplication.execute(['demo-request'], () => 
                new Promise(resolve => setTimeout(() => resolve('Result'), 1000))
              ),
              deduplication.execute(['demo-request'], () => 
                new Promise(resolve => setTimeout(() => resolve('Result'), 1000))
              ),
              deduplication.execute(['demo-request'], () => 
                new Promise(resolve => setTimeout(() => resolve('Result'), 1000))
              )
            ]).then(() => {
              const stats = deduplication.getStats();
              console.log('Deduplication stats:', stats);
            });
          }}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Test Request Deduplication
        </button>
        
        <div className="text-sm mt-2">
          <div><strong>Total Requests:</strong> {deduplication.getStats().totalRequests}</div>
          <div><strong>Deduplicated:</strong> {deduplication.getStats().deduplicatedRequests}</div>
          <div><strong>Active:</strong> {deduplication.getStats().activeRequestsCount}</div>
        </div>
      </div>

      {/* Features Summary */}
      <div className="p-4 bg-indigo-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Enhanced Features</h2>
        <ul className="text-sm space-y-1">
          <li>✅ Intelligent request deduplication</li>
          <li>✅ Background refetch with stale-while-revalidate</li>
          <li>✅ Smart dependency tracking (prevents cascade re-renders)</li>
          <li>✅ Optimistic updates with automatic rollback</li>
          <li>✅ LRU cache with TTL invalidation</li>
          <li>✅ Network-aware adaptive loading</li>
          <li>✅ Automatic retry with exponential backoff</li>
          <li>✅ Offline-first with sync queue</li>
          <li>✅ Memory-efficient caching</li>
          <li>✅ Performance monitoring integration</li>
        </ul>
      </div>
    </div>
  );
};

export default ApiHooksDemo;