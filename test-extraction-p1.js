/**
 * Extraction Completeness Test Suite - Phase 2 (P1)
 * Validates that AI extracts maximum tasks from research
 *
 * Run: node test-extraction-p1.js
 */

import fetch from 'node-fetch';
import FormData from 'form-data';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// Test cases with varying research complexity
const TEST_CASES = [
  {
    name: 'Simple Project (1 page)',
    research: `
# Website Redesign Project

## Timeline
- Planning Phase: January 2026 (4 weeks)
- Design Phase: February 2026 (3 weeks)
- Development Phase: March-April 2026 (8 weeks)
- Testing Phase: May 2026 (2 weeks)
- Launch: June 1, 2026

## Key Tasks
- Requirements gathering
- Stakeholder interviews
- Wireframe creation
- Visual design
- Frontend development
- Backend API integration
- QA testing
- User acceptance testing
- Production deployment
- Training materials
`,
    expectedMinTasks: 10,
    expectedMaxTasks: 15
  },
  {
    name: 'Complex Project (5 pages)',
    research: `
# Enterprise Banking System Migration - Detailed Project Plan

## Executive Summary
The bank will migrate from legacy core banking system to modern cloud-based platform by Q4 2026.

## Phase 1: Discovery & Planning (Q1 2026)
### Tasks:
- Current system audit (3 weeks)
- Vendor evaluation (4 weeks)
- Requirements documentation (2 weeks)
- Architecture design (3 weeks)
- Security assessment (2 weeks)
- Compliance review (2 weeks)
- Budget approval process (1 week)
- Stakeholder alignment (ongoing)

## Phase 2: Infrastructure Setup (Q2 2026)
### Tasks:
- Cloud environment provisioning (2 weeks)
- Network configuration (1 week)
- Security controls implementation (3 weeks)
- Monitoring setup (1 week)
- Backup systems configuration (1 week)
- Disaster recovery testing (2 weeks)
- VPN tunnel establishment (1 week)
- Identity management integration (2 weeks)

## Phase 3: Data Migration (Q2-Q3 2026)
### Tasks:
- Data mapping analysis (4 weeks)
- ETL pipeline development (6 weeks)
- Test data migration (2 weeks)
- Data validation rules (2 weeks)
- Customer data migration (3 weeks)
- Account data migration (3 weeks)
- Transaction history migration (4 weeks)
- Reference data migration (1 week)
- Data integrity verification (2 weeks)

## Phase 4: Application Development (Q3 2026)
### Tasks:
- API development (8 weeks)
- Frontend portal development (8 weeks)
- Mobile app development (10 weeks)
- Third-party integrations (6 weeks)
- Reporting module (4 weeks)
- Admin console (3 weeks)
- Customer self-service features (5 weeks)

## Phase 5: Testing & QA (Q3-Q4 2026)
### Tasks:
- Unit testing (ongoing)
- Integration testing (4 weeks)
- Performance testing (2 weeks)
- Security penetration testing (2 weeks)
- User acceptance testing (3 weeks)
- Regulatory compliance testing (2 weeks)
- Load testing (1 week)
- Failover testing (1 week)

## Phase 6: Regulatory Approvals (Q4 2026)
### Tasks:
- OCC submission preparation (2 weeks)
- FDIC notification (1 week)
- State banking department filing (1 week)
- OCC review period (45 days)
- Address regulator feedback (2 weeks)
- Final approval waiting period (1 week)

## Phase 7: Go-Live Preparation (Q4 2026)
### Tasks:
- Cutover planning (3 weeks)
- Training program development (4 weeks)
- Staff training sessions (2 weeks)
- Customer communication plan (2 weeks)
- Runbook creation (1 week)
- Rollback procedures (1 week)
- War room setup (1 week)

## Phase 8: Deployment & Transition (Late Q4 2026)
### Tasks:
- Final data sync (1 day)
- System cutover (2 days)
- Smoke testing (1 day)
- Customer access verification (1 day)
- Legacy system decommissioning (1 week)
- Post-go-live monitoring (4 weeks)
- Issue resolution (ongoing)
- Hypercare support (4 weeks)

## Dependencies
- Infrastructure must complete before data migration
- Data migration must complete before application testing
- All testing must pass before regulatory submission
- Regulatory approval required before go-live
- Training must complete before cutover

## Risks
- Legacy system integration challenges
- Data quality issues
- Regulatory approval delays
- Vendor delivery delays
- Resource constraints
- Customer adoption resistance
`,
    expectedMinTasks: 50,
    expectedMaxTasks: 80
  }
];

/**
 * Generate chart and retrieve metrics
 */
async function testExtractionCompleteness(testCase) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${testCase.name}`);
  console.log(`${'='.repeat(60)}\n`);

  // Step 1: Submit generation request
  const formData = new FormData();
  formData.append('prompt', 'Extract ALL tasks, milestones, and deliverables into a comprehensive Gantt chart');

  const buffer = Buffer.from(testCase.research, 'utf-8');
  formData.append('researchFiles', buffer, {
    filename: 'project-plan.md',
    contentType: 'text/markdown'
  });

  console.log('📤 Submitting chart generation request...');

  const response = await fetch(`${BASE_URL}/generate-chart`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const { jobId } = await response.json();
  console.log(`✅ Job created: ${jobId}`);

  // Step 2: Poll for completion
  let chartId = null;
  let attempts = 0;
  const maxAttempts = 60; // 60 seconds timeout

  console.log('⏳ Waiting for generation to complete...');

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const jobResponse = await fetch(`${BASE_URL}/job/${jobId}`);
    const job = await jobResponse.json();

    if (job.status === 'complete') {
      chartId = job.chartId;
      console.log(`✅ Generation complete: ${chartId}`);
      break;
    }

    if (job.status === 'error') {
      throw new Error(`Generation failed: ${job.error}`);
    }

    attempts++;
    if (attempts % 5 === 0) {
      console.log(`  Still processing... (${attempts}s elapsed)`);
    }
  }

  if (!chartId) {
    throw new Error('Generation timeout after 60 seconds');
  }

  // Step 3: Retrieve extraction metrics
  console.log('\n📊 Retrieving extraction metrics...');

  const metricsResponse = await fetch(`${BASE_URL}/api/chart/${chartId}/extraction-metrics`);

  if (!metricsResponse.ok) {
    throw new Error(`Failed to retrieve metrics: HTTP ${metricsResponse.status}`);
  }

  const metrics = await metricsResponse.json();

  // Step 4: Analyze results
  console.log('\n' + '─'.repeat(60));
  console.log('EXTRACTION ANALYSIS');
  console.log('─'.repeat(60));

  console.log(`\nResearch Input:`);
  console.log(`  Words: ${metrics.extraction.researchWords}`);
  console.log(`  Pages: ${metrics.extraction.estimatedPages}`);
  console.log(`  Lines: ${metrics.extraction.researchLines}`);

  console.log(`\nExtraction Results:`);
  console.log(`  Tasks extracted: ${metrics.extraction.taskCount}`);
  console.log(`  Expected minimum: ${metrics.extraction.expectedMinTasks}`);
  console.log(`  Extraction ratio: ${metrics.extraction.extractionRatio} tasks/1000 words`);
  console.log(`  Completeness: ${metrics.extraction.completenessPercent}%`);

  console.log(`\nChart Structure:`);
  console.log(`  Swimlanes: ${metrics.structure.totalSwimlanes}`);
  console.log(`  Time columns: ${metrics.structure.timeColumns}`);
  console.log(`  Tasks per swimlane: ${metrics.structure.avgTasksPerSwimlane}`);
  console.log(`  Critical path tasks: ${metrics.structure.criticalPathTasks} (${metrics.structure.criticalPathPercent}%)`);

  if (metrics.structure.tasksByType) {
    console.log(`\nTask Type Breakdown:`);
    Object.entries(metrics.structure.tasksByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  }

  // Check warnings
  if (metrics.extraction.warnings && metrics.extraction.warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${metrics.extraction.warnings.length}):`);
    metrics.extraction.warnings.forEach(warning => {
      console.log(`  [${warning.severity.toUpperCase()}] ${warning.type}`);
      console.log(`    ${warning.message}`);
      if (warning.recommendation) {
        console.log(`    💡 ${warning.recommendation}`);
      }
    });
  } else {
    console.log(`\n✅ No extraction warnings`);
  }

  // Validate against test expectations
  console.log('\n' + '─'.repeat(60));
  console.log('TEST VALIDATION');
  console.log('─'.repeat(60));

  const taskCount = metrics.extraction.taskCount;
  const passesMinimum = taskCount >= testCase.expectedMinTasks;
  const withinMaximum = taskCount <= testCase.expectedMaxTasks;
  const passesTest = passesMinimum && withinMaximum;

  console.log(`\nExpected range: ${testCase.expectedMinTasks}-${testCase.expectedMaxTasks} tasks`);
  console.log(`Actual: ${taskCount} tasks`);
  console.log(`\nMinimum threshold: ${passesMinimum ? '✅ PASS' : '❌ FAIL'} (${taskCount} >= ${testCase.expectedMinTasks})`);
  console.log(`Maximum threshold: ${withinMaximum ? '✅ PASS' : '⚠️  WARNING'} (${taskCount} <= ${testCase.expectedMaxTasks})`);
  console.log(`\nOverall: ${passesTest ? '✅ PASS' : '❌ FAIL'}`);

  return {
    testCase: testCase.name,
    passed: passesTest,
    taskCount,
    expectedMin: testCase.expectedMinTasks,
    expectedMax: testCase.expectedMaxTasks,
    completeness: metrics.extraction.completenessPercent,
    warnings: metrics.extraction.warnings?.length || 0,
    metrics
  };
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  EXTRACTION COMPLETENESS TEST SUITE (Phase 2 - P1)    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const results = [];

  for (const testCase of TEST_CASES) {
    try {
      const result = await testExtractionCompleteness(testCase);
      results.push(result);
    } catch (error) {
      console.error(`\n❌ Test failed: ${error.message}`);
      results.push({
        testCase: testCase.name,
        passed: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('TEST SUITE SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`\n${status} - ${result.testCase}`);
    if (result.taskCount) {
      console.log(`  Tasks: ${result.taskCount} (Expected: ${result.expectedMin}-${result.expectedMax})`);
      console.log(`  Completeness: ${result.completeness}%`);
      console.log(`  Warnings: ${result.warnings}`);
    }
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total: ${results.length} tests | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Success rate: ${((passed / results.length) * 100).toFixed(0)}%`);
  console.log('='.repeat(60) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Test suite failed:', error);
  process.exit(1);
});
