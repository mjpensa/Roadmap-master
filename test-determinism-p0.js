/**
 * Determinism Test Suite - Phase 1 (P0)
 * Validates that chart generation is 100% reproducible
 *
 * Run: node test-determinism-p0.js
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import crypto from 'crypto';
import fs from 'fs';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TEST_ITERATIONS = 5;  // Number of times to generate same chart

// Test research document
const TEST_RESEARCH = `
# Sample Project Plan

## Phase 1: Planning (Q1 2025)
- Requirements gathering
- Stakeholder interviews
- Budget approval

## Phase 2: Development (Q2 2025)
- System design
- Frontend implementation
- Backend API development
- Database schema creation

## Phase 3: Testing (Q3 2025)
- Unit testing
- Integration testing
- User acceptance testing
- Performance testing

## Phase 4: Deployment (Q4 2025)
- Production deployment
- User training
- Documentation
- Go-live support
`;

const TEST_PROMPT = "Create a Gantt chart for this project timeline";

/**
 * Generate a chart via API
 */
async function generateChart() {
  const formData = new FormData();
  formData.append('prompt', TEST_PROMPT);
  formData.append('researchFiles', Buffer.from(TEST_RESEARCH), {
    filename: 'test-project.md',
    contentType: 'text/markdown'
  });

  const response = await fetch(`${BASE_URL}/generate-chart`, {
    method: 'POST',
    body: formData,
    headers: formData.getHeaders()
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const { jobId } = await response.json();

  // Poll for completion
  let attempts = 0;
  const maxAttempts = 60; // 60 seconds timeout

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;

    const jobResponse = await fetch(`${BASE_URL}/job/${jobId}`);
    if (!jobResponse.ok) {
      throw new Error(`Job polling failed: ${jobResponse.status}`);
    }

    const job = await jobResponse.json();

    if (job.status === 'complete') {
      return job.data;
    }

    if (job.status === 'error') {
      throw new Error(`Job failed: ${job.error}`);
    }
  }

  throw new Error('Job timeout after 60 seconds');
}

/**
 * Calculate SHA-256 hash of data structure
 */
function calculateHash(data) {
  const normalized = JSON.stringify(data, null, 0);  // Compact JSON
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Extract task names for human-readable comparison
 */
function extractTaskNames(ganttData) {
  const tasks = [];
  for (const row of ganttData.data || []) {
    for (const task of row.tasks || []) {
      tasks.push({
        entity: row.entity,
        name: task.name,
        start: task.start,
        end: task.end
      });
    }
  }
  return tasks;
}

/**
 * Main test runner
 */
async function runDeterminismTest() {
  console.log('🧪 Starting Determinism Test (Phase 1 - P0)');
  console.log('='.repeat(60));
  console.log(`Iterations: ${TEST_ITERATIONS}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  const results = [];

  for (let i = 1; i <= TEST_ITERATIONS; i++) {
    console.log(`\n[Iteration ${i}/${TEST_ITERATIONS}] Generating chart...`);

    const startTime = Date.now();
    const ganttData = await generateChart();
    const duration = Date.now() - startTime;

    const hash = calculateHash(ganttData);
    const taskNames = extractTaskNames(ganttData);
    const taskCount = taskNames.length;

    results.push({
      iteration: i,
      hash,
      taskCount,
      taskNames,
      duration,
      ganttData
    });

    console.log(`  ✅ Completed in ${duration}ms`);
    console.log(`  Hash: ${hash.substring(0, 16)}...`);
    console.log(`  Tasks: ${taskCount}`);
  }

  // Analyze results
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTS ANALYSIS\n');

  // Check hash consistency
  const uniqueHashes = new Set(results.map(r => r.hash));
  const isDeterministic = uniqueHashes.size === 1;

  console.log(`Unique hashes: ${uniqueHashes.size} (${isDeterministic ? '✅ PASS' : '❌ FAIL'})`);
  console.log(`Expected: 1 (100% identical)`);

  if (!isDeterministic) {
    console.log('\n❌ DETERMINISM TEST FAILED');
    console.log('Hashes generated:');
    results.forEach(r => {
      console.log(`  Iteration ${r.iteration}: ${r.hash.substring(0, 16)}...`);
    });

    // Show first difference
    console.log('\n🔍 Comparing Iteration 1 vs Iteration 2:');
    const diff = findFirstDifference(results[0].ganttData, results[1].ganttData);
    console.log(diff);

    process.exit(1);
  }

  // Check task count consistency
  const taskCounts = results.map(r => r.taskCount);
  const uniqueTaskCounts = new Set(taskCounts);

  console.log(`\nTask counts: [${taskCounts.join(', ')}]`);
  console.log(`Variance: ${uniqueTaskCounts.size === 1 ? '0 ✅' : `${uniqueTaskCounts.size - 1} ❌`}`);

  // Performance stats
  const durations = results.map(r => r.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  console.log(`\nPerformance:`);
  console.log(`  Average: ${avgDuration.toFixed(0)}ms`);
  console.log(`  Min: ${minDuration}ms`);
  console.log(`  Max: ${maxDuration}ms`);

  // Sample tasks from first iteration
  console.log(`\nSample tasks (Iteration 1):`);
  results[0].taskNames.slice(0, 5).forEach(task => {
    console.log(`  - ${task.entity}: ${task.name} (${task.start} → ${task.end})`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ DETERMINISM TEST PASSED');
  console.log('All iterations produced identical outputs');

  // Save results
  const report = {
    timestamp: new Date().toISOString(),
    iterations: TEST_ITERATIONS,
    isDeterministic,
    uniqueHashes: uniqueHashes.size,
    avgDuration,
    results: results.map(r => ({
      iteration: r.iteration,
      hash: r.hash,
      taskCount: r.taskCount,
      duration: r.duration
    }))
  };

  fs.writeFileSync(
    'determinism-test-report-p0.json',
    JSON.stringify(report, null, 2)
  );

  console.log('\n📄 Report saved: determinism-test-report-p0.json');
}

/**
 * Find first structural difference between two objects
 */
function findFirstDifference(obj1, obj2, path = '') {
  if (typeof obj1 !== typeof obj2) {
    return `Type mismatch at ${path}: ${typeof obj1} vs ${typeof obj2}`;
  }

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      return `Array length mismatch at ${path}: ${obj1.length} vs ${obj2.length}`;
    }

    for (let i = 0; i < obj1.length; i++) {
      const diff = findFirstDifference(obj1[i], obj2[i], `${path}[${i}]`);
      if (diff) return diff;
    }
  } else if (typeof obj1 === 'object' && obj1 !== null) {
    const keys1 = Object.keys(obj1).sort();
    const keys2 = Object.keys(obj2).sort();

    if (keys1.length !== keys2.length) {
      return `Key count mismatch at ${path}: ${keys1.length} vs ${keys2.length}`;
    }

    for (const key of keys1) {
      const diff = findFirstDifference(obj1[key], obj2[key], `${path}.${key}`);
      if (diff) return diff;
    }
  } else if (obj1 !== obj2) {
    return `Value mismatch at ${path}: "${obj1}" vs "${obj2}"`;
  }

  return null;
}

// Run test
runDeterminismTest().catch(error => {
  console.error('\n💥 Test failed with error:', error);
  process.exit(1);
});
