/**
 * Cache Functionality Test Suite - Phase 3 (P2)
 * Validates caching behavior, eviction, and statistics
 *
 * Run: node test-cache-p2.js
 */

import fetch from 'node-fetch';
import FormData from 'form-data';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// Simple research for testing
const TEST_RESEARCH = `
# Test Project

## Phase 1: Planning
- Requirements gathering (2 weeks)
- Budget approval (1 week)

## Phase 2: Execution
- Development (4 weeks)
- Testing (2 weeks)
- Deployment (1 week)
`;

/**
 * Generate chart and measure time
 */
async function generateChart(prompt = 'Create a Gantt chart') {
  const formData = new FormData();
  formData.append('prompt', prompt);

  const buffer = Buffer.from(TEST_RESEARCH, 'utf-8');
  formData.append('researchFiles', buffer, {
    filename: 'test-project.md',
    contentType: 'text/markdown'
  });

  const startTime = Date.now();

  const response = await fetch(`${BASE_URL}/generate-chart`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const { jobId } = await response.json();

  // Poll for completion
  let attempts = 0;
  while (attempts < 60) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const jobResponse = await fetch(`${BASE_URL}/job/${jobId}`);
    const job = await jobResponse.json();

    if (job.status === 'complete') {
      const duration = Date.now() - startTime;
      return {
        jobId,
        chartId: job.chartId,
        duration,
        fromCache: job._cached === true,
        cacheAge: job._cacheAge || 0,
        data: job
      };
    }

    if (job.status === 'error') {
      throw new Error(`Generation failed: ${job.error}`);
    }

    attempts++;
  }

  throw new Error('Timeout waiting for generation');
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  const response = await fetch(`${BASE_URL}/api/cache/stats`);

  if (!response.ok) {
    throw new Error(`Failed to get cache stats: HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Clear cache
 */
async function clearCache() {
  const response = await fetch(`${BASE_URL}/api/cache/clear`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error(`Failed to clear cache: HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Test 1: Cache Miss → Cache Hit
 */
async function testCacheHit() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Cache Miss → Cache Hit');
  console.log('='.repeat(60) + '\n');

  // Clear cache first
  console.log('Clearing cache...');
  await clearCache();

  // First generation (should be cache miss)
  console.log('\n1st Generation (expecting cache MISS)...');
  const result1 = await generateChart('Create a Gantt chart for the project');
  console.log(`  Duration: ${result1.duration}ms`);
  console.log(`  From cache: ${result1.fromCache}`);
  console.log(`  Chart ID: ${result1.chartId}`);

  // Second generation (should be cache hit)
  console.log('\n2nd Generation (expecting cache HIT)...');
  const result2 = await generateChart('Create a Gantt chart for the project');
  console.log(`  Duration: ${result2.duration}ms`);
  console.log(`  From cache: ${result2.fromCache}`);
  console.log(`  Chart ID: ${result2.chartId}`);

  // Verify cache hit
  const stats = await getCacheStats();
  console.log(`\nCache statistics:`);
  console.log(`  Hits: ${stats.cache.requests.hits}`);
  console.log(`  Misses: ${stats.cache.requests.misses}`);
  console.log(`  Hit rate: ${stats.cache.requests.hitRatePercent}%`);
  console.log(`  Cache size: ${stats.cache.size.current}/${stats.cache.size.max}`);

  // Validate
  const pass = result2.fromCache && result2.duration < (result1.duration / 2);
  console.log(`\nResult: ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Cache hit: ${result2.fromCache ? 'YES' : 'NO'}`);
  console.log(`  Speed improvement: ${((1 - result2.duration / result1.duration) * 100).toFixed(0)}%`);

  return { test: 'Cache Hit', passed: pass };
}

/**
 * Test 2: Different Prompts → Different Cache Keys
 */
async function testDifferentPrompts() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Different Prompts → Different Cache Keys');
  console.log('='.repeat(60) + '\n');

  await clearCache();

  // Generate with different prompts
  console.log('Generating with prompt A...');
  const result1 = await generateChart('Create a detailed project timeline');
  console.log(`  Duration: ${result1.duration}ms`);

  console.log('\nGenerating with prompt B...');
  const result2 = await generateChart('Build a comprehensive Gantt chart');
  console.log(`  Duration: ${result2.duration}ms`);

  // Both should be cache misses (different prompts)
  const stats = await getCacheStats();
  console.log(`\nCache statistics:`);
  console.log(`  Size: ${stats.cache.size.current}`);
  console.log(`  Misses: ${stats.cache.requests.misses}`);

  const pass = !result1.fromCache && !result2.fromCache && stats.cache.size.current === 2;
  console.log(`\nResult: ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Both were cache misses: ${!result1.fromCache && !result2.fromCache ? 'YES' : 'NO'}`);
  console.log(`  Cache has 2 entries: ${stats.cache.size.current === 2 ? 'YES' : 'NO'}`);

  return { test: 'Different Prompts', passed: pass };
}

/**
 * Test 3: Performance Improvement
 */
async function testPerformanceImprovement() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Performance Improvement');
  console.log('='.repeat(60) + '\n');

  await clearCache();

  // First generation (no cache)
  console.log('Generating without cache...');
  const result1 = await generateChart('Performance test chart');

  // Second generation (with cache)
  console.log('Generating with cache...');
  const result2 = await generateChart('Performance test chart');

  const improvement = ((1 - result2.duration / result1.duration) * 100);

  console.log(`\nPerformance comparison:`);
  console.log(`  Without cache: ${result1.duration}ms`);
  console.log(`  With cache: ${result2.duration}ms`);
  console.log(`  Improvement: ${improvement.toFixed(1)}%`);
  console.log(`  Speedup: ${(result1.duration / result2.duration).toFixed(1)}x`);

  // Cache should be at least 50% faster
  const pass = result2.fromCache && improvement >= 50;

  console.log(`\nResult: ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  From cache: ${result2.fromCache ? 'YES' : 'NO'}`);
  console.log(`  At least 50% faster: ${improvement >= 50 ? 'YES' : 'NO'}`);

  return { test: 'Performance Improvement', passed: pass };
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     CACHE FUNCTIONALITY TEST SUITE (Phase 3 - P2)     ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const results = [];

  try {
    results.push(await testCacheHit());
    results.push(await testDifferentPrompts());
    results.push(await testPerformanceImprovement());
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('TEST SUITE SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`\n${status} - ${result.test}`);
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total: ${results.length} tests | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Success rate: ${((passed / results.length) * 100).toFixed(0)}%`);
  console.log('='.repeat(60) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
