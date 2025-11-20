/**
 * Monitoring and Analytics Test Suite - Phase 4 (P3)
 * Validates monitoring system functionality
 * 
 * Run: node test-monitoring-p3.js
 */

import fetch from 'node-fetch';
import FormData from 'form-data';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(name, passed, message = '') {
  results.tests.push({ name, passed, message });
  if (passed) {
    results.passed++;
    log(`✅ PASS: ${name}`, 'green');
    if (message) log(`   ${message}`, 'gray');
  } else {
    results.failed++;
    log(`❌ FAIL: ${name}`, 'red');
    if (message) log(`   ${message}`, 'red');
  }
}

/**
 * Helper: Generate a test chart
 */
async function generateTestChart() {
  const formData = new FormData();
  formData.append('prompt', 'Create a test project timeline');
  
  const research = `
# Test Project
## Phase 1: Planning
- Requirements (2 weeks)
- Design (3 weeks)
## Phase 2: Execution
- Development (6 weeks)
- Testing (2 weeks)
`;
  
  const buffer = Buffer.from(research, 'utf-8');
  formData.append('researchFiles', buffer, {
    filename: 'test.md',
    contentType: 'text/markdown'
  });
  
  const response = await fetch(`${BASE_URL}/generate-chart`, {
    method: 'POST',
    body: formData
  });
  
  const { jobId } = await response.json();
  
  // Poll for completion
  let attempts = 0;
  while (attempts < 30) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const jobResponse = await fetch(`${BASE_URL}/job/${jobId}`);
    const job = await jobResponse.json();
    
    if (job.status === 'complete') {
      return { jobId, chartId: job.chartId, success: true };
    }
    
    if (job.status === 'error') {
      return { jobId, error: job.error, success: false };
    }
    
    attempts++;
  }
  
  throw new Error('Chart generation timeout');
}

/**
 * Test 1: Health Check Endpoint
 */
async function testHealthCheck() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('TEST 1: Health Check System', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

  try {
    // Test 1.1: Simple health check
    log('Testing simple health endpoint...', 'blue');
    const simpleResponse = await fetch(`${BASE_URL}/api/monitoring/health/simple`);
    const simpleHealth = await simpleResponse.json();
    
    recordTest('1.1 Simple health endpoint responds',
      simpleResponse.ok && simpleHealth.status === 'healthy',
      `Status: ${simpleHealth.status}, Uptime: ${simpleHealth.uptime}s`
    );

    // Test 1.2: Comprehensive health check
    log('\nTesting comprehensive health endpoint...', 'blue');
    const healthResponse = await fetch(`${BASE_URL}/api/monitoring/health`);
    const health = await healthResponse.json();
    
    recordTest('1.2 Comprehensive health endpoint responds',
      healthResponse.ok && health.status,
      `Status: ${health.status}, Checks: ${health.summary?.total || 0}`
    );

    // Test 1.3: Health checks present
    const expectedChecks = ['database', 'cache', 'memory', 'api'];
    const hasAllChecks = expectedChecks.every(check => health.checks?.[check]);
    
    recordTest('1.3 All health checks present',
      hasAllChecks,
      `Expected: ${expectedChecks.join(', ')}`
    );

    // Test 1.4: Database health check
    recordTest('1.4 Database health check passed',
      health.checks?.database?.status === 'pass',
      health.checks?.database?.message
    );

    // Test 1.5: Cache health check
    recordTest('1.5 Cache health check passed',
      health.checks?.cache?.status === 'pass',
      health.checks?.cache?.message
    );

    // Test 1.6: Memory health check
    recordTest('1.6 Memory health check passed',
      health.checks?.memory?.status === 'pass',
      `Heap used: ${health.checks?.memory?.details?.heapUsedPercent}%`
    );

  } catch (error) {
    recordTest('1.X Health check system', false, error.message);
  }
}

/**
 * Test 2: Metrics Collection
 */
async function testMetricsCollection() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('TEST 2: Metrics Collection', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

  try {
    // Test 2.1: Metrics endpoint responds
    log('Fetching metrics...', 'blue');
    const metricsResponse = await fetch(`${BASE_URL}/api/monitoring/metrics`);
    const metricsData = await metricsResponse.json();
    
    recordTest('2.1 Metrics endpoint responds',
      metricsResponse.ok && metricsData.status === 'success',
      `Status: ${metricsData.status}`
    );

    const metrics = metricsData.metrics;

    // Test 2.2: Request metrics present
    recordTest('2.2 Request metrics present',
      metrics.requests && typeof metrics.requests.total === 'number',
      `Total requests: ${metrics.requests?.total || 0}`
    );

    // Test 2.3: Generation metrics present
    recordTest('2.3 Generation metrics present',
      metrics.generation && typeof metrics.generation.total === 'number',
      `Total generations: ${metrics.generation?.total || 0}`
    );

    // Test 2.4: Cache metrics present
    recordTest('2.4 Cache metrics present',
      metrics.cache && typeof metrics.cache.hitRate === 'number',
      `Hit rate: ${metrics.cache?.hitRate?.toFixed(2) || 0}%`
    );

    // Test 2.5: Error metrics present
    recordTest('2.5 Error metrics present',
      metrics.errors && typeof metrics.errors.total === 'number',
      `Total errors: ${metrics.errors?.total || 0}`
    );

    // Test 2.6: Performance metrics present
    recordTest('2.6 Performance metrics calculated',
      metrics.requests?.avgDuration >= 0 && metrics.requests?.p95Duration >= 0,
      `Avg: ${metrics.requests?.avgDuration}ms, P95: ${metrics.requests?.p95Duration}ms`
    );

    // Test 2.7: Rate metrics present
    recordTest('2.7 Rate metrics calculated',
      typeof metrics.requestsPerMinute === 'number',
      `RPM: ${metrics.requestsPerMinute}, RPH: ${metrics.requestsPerHour}`
    );

    // Test 2.8: Uptime tracking
    recordTest('2.8 Uptime tracked',
      metrics.uptime > 0,
      `Uptime: ${metrics.uptime}s`
    );

  } catch (error) {
    recordTest('2.X Metrics collection', false, error.message);
  }
}

/**
 * Test 3: System Metrics
 */
async function testSystemMetrics() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('TEST 3: System Resource Metrics', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

  try {
    log('Fetching system metrics...', 'blue');
    const response = await fetch(`${BASE_URL}/api/monitoring/system`);
    const data = await response.json();
    
    recordTest('3.1 System metrics endpoint responds',
      response.ok && data.status === 'success',
      `Status: ${data.status}`
    );

    const system = data.system;
    const process = data.process;

    // Test 3.2: CPU metrics
    recordTest('3.2 CPU metrics present',
      system?.cpu && typeof system.cpu.usagePercent === 'string',
      `CPUs: ${system?.cpu?.count}, Usage: ${system?.cpu?.usagePercent}%`
    );

    // Test 3.3: Memory metrics
    recordTest('3.3 Memory metrics present',
      system?.memory && typeof system.memory.usagePercent === 'string',
      `Total: ${system?.memory?.totalGB}GB, Used: ${system?.memory?.usagePercent}%`
    );

    // Test 3.4: Process metrics
    recordTest('3.4 Process metrics present',
      process?.memory && typeof process.memory.heapUsed === 'number',
      `Heap: ${process?.memory?.heapUsed}MB / ${process?.memory?.heapTotal}MB`
    );

    // Test 3.5: Platform info
    recordTest('3.5 Platform info present',
      system?.platform && system.platform.type,
      `Platform: ${system?.platform?.platform}, Node: ${system?.platform?.nodeVersion}`
    );

  } catch (error) {
    recordTest('3.X System metrics', false, error.message);
  }
}

/**
 * Test 4: SLA Monitoring
 */
async function testSLAMonitoring() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('TEST 4: SLA Monitoring', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

  try {
    log('Fetching SLA compliance data...', 'blue');
    const response = await fetch(`${BASE_URL}/api/monitoring/sla`);
    const data = await response.json();
    
    recordTest('4.1 SLA endpoint responds',
      response.ok && data.status === 'success',
      `Status: ${data.status}`
    );

    const compliance = data.compliance;

    // Test 4.2: Compliance check present
    recordTest('4.2 Compliance check executed',
      typeof compliance?.compliant === 'boolean',
      `Compliant: ${compliance?.compliant ? 'YES' : 'NO'}`
    );

    // Test 4.3: Availability metric
    recordTest('4.3 Availability metric present',
      compliance?.metrics?.availability && 
      typeof compliance.metrics.availability.current === 'string',
      `Current: ${compliance?.metrics?.availability?.current}%, Target: ${compliance?.metrics?.availability?.target}%`
    );

    // Test 4.4: Response time metric
    recordTest('4.4 Response time metric present',
      compliance?.metrics?.responseTime &&
      typeof compliance.metrics.responseTime.current === 'number',
      `Current: ${compliance?.metrics?.responseTime?.current}ms, Target: ${compliance?.metrics?.responseTime?.target}ms`
    );

    // Test 4.5: Error rate metric
    recordTest('4.5 Error rate metric present',
      compliance?.metrics?.errorRate &&
      typeof compliance.metrics.errorRate.current === 'string',
      `Current: ${compliance?.metrics?.errorRate?.current}%, Target: ${compliance?.metrics?.errorRate?.target}%`
    );

    // Test 4.6: Cache hit rate metric
    recordTest('4.6 Cache hit rate metric present',
      compliance?.metrics?.cacheHitRate &&
      typeof compliance.metrics.cacheHitRate.current === 'string',
      `Current: ${compliance?.metrics?.cacheHitRate?.current}%, Target: ${compliance?.metrics?.cacheHitRate?.target}%`
    );

    // Test 4.7: Violation tracking
    recordTest('4.7 Violation history tracked',
      Array.isArray(data.violationHistory),
      `History entries: ${data.violationHistory?.length || 0}`
    );

  } catch (error) {
    recordTest('4.X SLA monitoring', false, error.message);
  }
}

/**
 * Test 5: Dashboard Endpoint
 */
async function testDashboard() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('TEST 5: Monitoring Dashboard', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

  try {
    log('Fetching complete dashboard...', 'blue');
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}/api/monitoring/dashboard`);
    const duration = Date.now() - startTime;
    const data = await response.json();
    
    recordTest('5.1 Dashboard endpoint responds',
      response.ok && data.status === 'success',
      `Status: ${data.status}, Duration: ${duration}ms`
    );

    const dashboard = data.dashboard;

    // Test 5.2: Overview section
    recordTest('5.2 Overview section present',
      dashboard?.overview && dashboard.overview.uptime,
      `Uptime: ${dashboard?.overview?.uptime}s, RPM: ${dashboard?.overview?.requestsPerMinute}`
    );

    // Test 5.3: Health section
    recordTest('5.3 Health section present',
      dashboard?.health && dashboard.health.status,
      `Status: ${dashboard?.health?.status}, Checks: ${dashboard?.health?.summary?.total || 0}`
    );

    // Test 5.4: Performance section
    recordTest('5.4 Performance section present',
      dashboard?.performance && dashboard.performance.requests,
      `Requests: ${dashboard?.performance?.requests?.total || 0}`
    );

    // Test 5.5: SLA section
    recordTest('5.5 SLA section present',
      dashboard?.sla && typeof dashboard.sla.compliant === 'boolean',
      `Compliant: ${dashboard?.sla?.compliant ? 'YES' : 'NO'}`
    );

    // Test 5.6: System section
    recordTest('5.6 System section present',
      dashboard?.system && dashboard.system.cpu,
      `CPU: ${dashboard?.system?.cpu?.usagePercent}%, Memory: ${dashboard?.system?.memory?.usagePercent}%`
    );

    // Test 5.7: Database section
    recordTest('5.7 Database section present',
      dashboard?.database && typeof dashboard.database.charts === 'number',
      `Charts: ${dashboard?.database?.charts || 0}, Sessions: ${dashboard?.database?.sessions || 0}`
    );

    // Test 5.8: Analytics section
    recordTest('5.8 Analytics section present',
      dashboard?.analytics,
      `Total charts: ${dashboard?.analytics?.total_generated || 0}`
    );

    // Test 5.9: Errors section
    recordTest('5.9 Errors section present',
      dashboard?.errors && typeof dashboard.errors.total === 'number',
      `Total errors: ${dashboard?.errors?.total || 0}`
    );

    // Test 5.10: Dashboard response time
    recordTest('5.10 Dashboard responds quickly',
      duration < 1000,
      `Response time: ${duration}ms (target: <1000ms)`
    );

  } catch (error) {
    recordTest('5.X Dashboard endpoint', false, error.message);
  }
}

/**
 * Test 6: Live Metrics Tracking
 */
async function testLiveTracking() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('TEST 6: Live Metrics Tracking', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

  try {
    // Get baseline metrics
    log('Getting baseline metrics...', 'blue');
    const baseline = await fetch(`${BASE_URL}/api/monitoring/metrics`);
    const baselineData = await baseline.json();
    const baselineRequests = baselineData.metrics.requests.total;

    // Generate a chart (triggers metrics)
    log('\nGenerating test chart...', 'blue');
    const generation = await generateTestChart();
    
    recordTest('6.1 Test chart generated',
      generation.success,
      generation.success ? `Chart ID: ${generation.chartId}` : generation.error
    );

    // Get updated metrics
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s for metrics to update
    
    log('\nChecking updated metrics...', 'blue');
    const updated = await fetch(`${BASE_URL}/api/monitoring/metrics`);
    const updatedData = await updated.json();
    const updatedRequests = updatedData.metrics.requests.total;

    // Test 6.2: Metrics updated
    recordTest('6.2 Metrics updated after generation',
      updatedRequests > baselineRequests,
      `Baseline: ${baselineRequests}, Updated: ${updatedRequests} (+${updatedRequests - baselineRequests})`
    );

    // Test 6.3: Generation metrics updated
    const hasGenerationMetrics = updatedData.metrics.generation.total > 0;
    recordTest('6.3 Generation metrics tracked',
      hasGenerationMetrics,
      `Total generations: ${updatedData.metrics.generation.total}`
    );

    // Test 6.4: Task count tracked
    const avgTasks = updatedData.metrics.generation.avgTasksExtracted;
    recordTest('6.4 Task extraction tracked',
      avgTasks > 0,
      `Average tasks: ${avgTasks.toFixed(1)}`
    );

  } catch (error) {
    recordTest('6.X Live tracking', false, error.message);
  }
}

/**
 * Test 7: Analytics Integration
 */
async function testAnalytics() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('TEST 7: Analytics Integration', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

  try {
    // Test 7.1: Overall analytics
    log('Fetching overall analytics...', 'blue');
    const overallResponse = await fetch(`${BASE_URL}/api/monitoring/analytics/overall`);
    const overall = await overallResponse.json();
    
    recordTest('7.1 Overall analytics endpoint responds',
      overallResponse.ok && overall.status === 'success',
      `Status: ${overall.status}`
    );

    // Test 7.2: Summary analytics
    log('\nFetching summary analytics...', 'blue');
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const summaryResponse = await fetch(
      `${BASE_URL}/api/monitoring/analytics/summary?startDate=${weekAgo}&endDate=${today}`
    );
    const summary = await summaryResponse.json();
    
    recordTest('7.2 Summary analytics endpoint responds',
      summaryResponse.ok && summary.status === 'success',
      `Date range: ${summary.dateRange?.startDate} to ${summary.dateRange?.endDate}`
    );

    // Test 7.3: Daily data present
    recordTest('7.3 Daily analytics data present',
      Array.isArray(summary.data),
      `Days with data: ${summary.data?.length || 0}`
    );

  } catch (error) {
    recordTest('7.X Analytics integration', false, error.message);
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   MONITORING & ANALYTICS TEST SUITE (Phase 4 - P3)        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await testHealthCheck();
    await testMetricsCollection();
    await testSystemMetrics();
    await testSLAMonitoring();
    await testDashboard();
    await testLiveTracking();
    await testAnalytics();
  } catch (error) {
    log(`\n💥 Test suite error: ${error.message}`, 'red');
    console.error(error.stack);
  }

  // Summary
  log('\n\n' + '='.repeat(60), 'cyan');
  log('TEST SUITE SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');

  const total = results.passed + results.failed;
  const successRate = total > 0 ? ((results.passed / total) * 100).toFixed(0) : 0;

  log(`\nTotal: ${total} tests | Passed: ${results.passed} | Failed: ${results.failed}`, 'cyan');
  log(`Success rate: ${successRate}%\n`, successRate >= 90 ? 'green' : 'red');

  if (results.failed > 0) {
    log('Failed tests:', 'red');
    results.tests.filter(t => !t.passed).forEach(test => {
      log(`  ❌ ${test.name}`, 'red');
      if (test.message) log(`     ${test.message}`, 'gray');
    });
  }

  log('\n' + '='.repeat(60) + '\n', 'cyan');

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
