/**
 * Simple performance test to verify optimization functionality
 */

const { optimizeNetworkData, getOptimalPerformanceConfig } = require('../networkOptimizer');
const { performanceMonitor } = require('../performanceMonitor');

// Mock large dataset
function createLargeDataset(nodeCount, edgeCount) {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `node-${i}`,
    name: `Club ${i}`,
    stats: {
      transfersIn: Math.floor(Math.random() * 50),
      transfersOut: Math.floor(Math.random() * 50),
      avgROI: Math.random() * 100 - 50,
      successRate: Math.random() * 100,
      totalValue: Math.floor(Math.random() * 100000000),
      transferCount: Math.floor(Math.random() * 100)
    }
  }));

  const edges = Array.from({ length: edgeCount }, (_, i) => ({
    id: `edge-${i}`,
    source: `node-${Math.floor(Math.random() * nodeCount)}`,
    target: `node-${Math.floor(Math.random() * nodeCount)}`,
    stats: {
      totalValue: Math.floor(Math.random() * 50000000),
      transferCount: Math.floor(Math.random() * 20),
      avgTransferValue: Math.floor(Math.random() * 5000000),
      types: ['sale'],
      avgROI: Math.random() * 100 - 50,
      successRate: Math.random() * 100,
      seasons: ['2023/24'],
      transferWindows: ['summer']
    },
    transfers: []
  }));

  return {
    nodes,
    edges,
    metadata: {
      totalTransfers: edgeCount,
      totalValue: edges.reduce((sum, e) => sum + e.stats.totalValue, 0),
      seasons: ['2023/24'],
      leagues: [],
      countries: []
    }
  };
}

// Test performance with different dataset sizes
console.log('🚀 Performance Test: Network Optimization');

// Test 1: Small dataset (should not be optimized)
console.log('\n📊 Test 1: Small Dataset (100 nodes, 150 edges)');
const smallData = createLargeDataset(100, 150);
const smallConfig = getOptimalPerformanceConfig(100, 150);
const startSmall = performance.now();
const optimizedSmall = optimizeNetworkData(smallData, smallConfig);
const timeSmall = performance.now() - startSmall;
console.log(`✅ Small dataset: ${timeSmall.toFixed(2)}ms, optimized: ${optimizedSmall.metadata.isOptimized}`);

// Test 2: Large dataset (should be optimized)
console.log('\n📊 Test 2: Large Dataset (1000 nodes, 2000 edges)');
const largeData = createLargeDataset(1000, 2000);
const largeConfig = getOptimalPerformanceConfig(1000, 2000);
const startLarge = performance.now();
const optimizedLarge = optimizeNetworkData(largeData, largeConfig);
const timeLarge = performance.now() - startLarge;
console.log(`✅ Large dataset: ${timeLarge.toFixed(2)}ms, optimized: ${optimizedLarge.metadata.isOptimized}`);
console.log(`   📉 Reduced from ${largeData.nodes.length} to ${optimizedLarge.nodes.length} nodes`);
console.log(`   📉 Reduced from ${largeData.edges.length} to ${optimizedLarge.edges.length} edges`);

// Test 3: Very large dataset (should trigger circuit breaker)
console.log('\n📊 Test 3: Very Large Dataset (3000 nodes, 5000 edges)');
const veryLargeData = createLargeDataset(3000, 5000);
const veryLargeConfig = getOptimalPerformanceConfig(3000, 5000);
const startVeryLarge = performance.now();
const optimizedVeryLarge = optimizeNetworkData(veryLargeData, veryLargeConfig);
const timeVeryLarge = performance.now() - startVeryLarge;
console.log(`✅ Very large dataset: ${timeVeryLarge.toFixed(2)}ms, optimized: ${optimizedVeryLarge.metadata.isOptimized}`);
console.log(`   📉 Reduced from ${veryLargeData.nodes.length} to ${optimizedVeryLarge.nodes.length} nodes`);
console.log(`   📉 Reduced from ${veryLargeData.edges.length} to ${optimizedVeryLarge.edges.length} edges`);

// Performance summary
console.log('\n📋 Performance Summary:');
performanceMonitor.logSummary();

// Check if performance targets are met
const performanceTargets = {
  optimizationTime: Math.max(timeSmall, timeLarge, timeVeryLarge) < 100, // < 100ms
  dataSizeReduction: optimizedLarge.nodes.length < largeData.nodes.length * 0.8, // > 20% reduction
  circuitBreakerActive: optimizedVeryLarge.nodes.length <= 150 // Circuit breaker limits
};

console.log('\n🎯 Performance Targets:');
console.log(`   ⏱️  Optimization < 100ms: ${performanceTargets.optimizationTime ? '✅' : '❌'}`);
console.log(`   📊 Data reduction > 20%: ${performanceTargets.dataSizeReduction ? '✅' : '❌'}`);
console.log(`   🚨 Circuit breaker active: ${performanceTargets.circuitBreakerActive ? '✅' : '❌'}`);

const allTargetsMet = Object.values(performanceTargets).every(Boolean);
console.log(`\n🏆 Overall Performance: ${allTargetsMet ? '✅ PASS' : '❌ FAIL'}`);