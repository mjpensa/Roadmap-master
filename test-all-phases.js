/**
 * Complete Test Suite Runner
 * Tests all 4 phases in sequence
 *
 * Run: node test-all-phases.js
 */

import { spawn } from 'child_process';

const tests = [
  { name: 'Phase 0: Determinism (P0)', file: 'test-determinism-p0.js' },
  { name: 'Phase 1: Extraction (P1)', file: 'test-extraction-p1.js' },
  { name: 'Phase 2: Caching (P2)', file: 'test-cache-p2.js' },
  { name: 'Phase 3: Monitoring (P3)', file: 'test-monitoring-p3.js' }
];

async function runTest(test) {
  return new Promise((resolve) => {
    const separator = '='.repeat(60);
    console.log(`\n${separator}`);
    console.log(`Running: ${test.name}`);
    console.log(separator);

    const child = spawn('node', [test.file], { stdio: 'inherit' });

    child.on('close', (code) => {
      resolve({ name: test.name, passed: code === 0 });
    });
  });
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        COMPLETE DETERMINISTIC ENHANCEMENT TEST SUITE      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const results = [];

  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
  }

  // Summary
  const separator = '='.repeat(60);
  console.log(`\n\n${separator}`);
  console.log('COMPLETE TEST SUITE SUMMARY');
  console.log(separator);

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(r => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${r.name}`);
  });

  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(0)}%\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests();
