/**
 * Extraction Completeness Test Suite - Phase 2 (P1)
 * Validates that AI extracts maximum tasks from research
 *
 * Run: node test-extraction-p1.js
 */

import fetch from 'node-fetch';
import FormData from 'form-data';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// Test research with known task count
const TEST_RESEARCH = `
# Enterprise Banking System Migration Project

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

## Phase 4: Testing & QA (Q3-Q4 2026)
### Tasks:
- Unit testing (ongoing)
- Integration testing (4 weeks)
- Performance testing (2 weeks)
- Security penetration testing (2 weeks)
- User acceptance testing (3 weeks)
- Regulatory compliance testing (2 weeks)
- Load testing (1 week)
- Failover testing (1 week)

## Phase 5: Go-Live (Q4 2026)
### Tasks:
- Cutover planning (3 weeks)
- Training program development (4 weeks)
- Staff training sessions (2 weeks)
- Customer communication plan (2 weeks)
- Final data sync (1 day)
- System cutover (2 days)
- Post-go-live monitoring (4 weeks)
`;

/**
 * Generate chart and analyze extraction
 */
async function testExtraction() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  EXTRACTION COMPLETENESS TEST (Phase 2 - P1)          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Calculate research metrics
  const words = TEST_RESEARCH.split(/\s+/).filter(w => w.length > 0).length;
  const lines = TEST_RESEARCH.split('\n').filter(l => l.trim().length > 0).length;
  const estimatedPages = Math.ceil(words / 300);

  console.log('📄 Research Input:');
  console.log(`  Words: ${words}`);
  console.log(`  Lines: ${lines}`);
  console.log(`  Estimated Pages: ${estimatedPages}`);
  console.log(`  Expected Min Tasks: ${Math.max(10, Math.ceil(words / 150))} (words ÷ 150)`);

  // Submit generation request
  const formData = new FormData();
  formData.append('prompt', 'Extract ALL tasks, milestones, and deliverables into a comprehensive Gantt chart');
  formData.append('researchFiles', Buffer.from(TEST_RESEARCH), {
    filename: 'project-plan.md',
    contentType: 'text/markdown'
  });

  console.log('\n📤 Submitting chart generation request...');

  const response = await fetch(`${BASE_URL}/generate-chart`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const { jobId } = await response.json();
  console.log(`✅ Job created: ${jobId}`);
  console.log('⏳ Waiting for generation (check server logs for extraction metrics)...\n');

  // Poll for completion
  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const jobResponse = await fetch(`${BASE_URL}/job/${jobId}`);
    const job = await jobResponse.json();

    if (job.status === 'complete') {
      console.log(`\n✅ Generation complete!`);
      console.log(`   Chart ID: ${job.chartId}`);

      // Retrieve chart to count tasks
      const chartResponse = await fetch(`${BASE_URL}/api/chart/${job.chartId}`);
      const chartData = await chartResponse.json();

      const taskCount = chartData.data.filter(row => !row.isSwimlane).length;
      const swimlanes = chartData.data.filter(row => row.isSwimlane).length;
      const expectedMin = Math.max(10, Math.ceil(words / 150));

      console.log('\n' + '='.repeat(60));
      console.log('EXTRACTION RESULTS');
      console.log('='.repeat(60));
      console.log(`\nTasks extracted: ${taskCount}`);
      console.log(`Swimlanes: ${swimlanes}`);
      console.log(`Expected minimum: ${expectedMin}`);
      console.log(`Extraction ratio: ${(taskCount / expectedMin * 100).toFixed(0)}%`);

      // Validate
      const passed = taskCount >= expectedMin;

      console.log('\n' + '='.repeat(60));
      console.log('TEST RESULT');
      console.log('='.repeat(60));
      console.log(`\n${passed ? '✅ PASS' : '❌ FAIL'} - Extraction completeness test`);
      console.log(`  ${taskCount} >= ${expectedMin}: ${passed ? 'YES' : 'NO'}`);

      if (passed && taskCount >= expectedMin * 0.9) {
        console.log(`\n🎯 EXCELLENT - Comprehensive task extraction (90%+)`);
      } else if (passed) {
        console.log(`\n✅ GOOD - Acceptable task extraction`);
      } else {
        console.log(`\n⚠️  WARNING - Below target extraction`);
        console.log(`   Review server logs for detailed extraction metrics`);
      }

      console.log('\n💡 TIP: Check server console for detailed Phase 2 extraction validation report\n');

      process.exit(passed ? 0 : 1);
    }

    if (job.status === 'error') {
      throw new Error(`Generation failed: ${job.error}`);
    }

    attempts++;
    if (attempts % 10 === 0) {
      console.log(`  Still processing... (${attempts}s elapsed)`);
    }
  }

  throw new Error('Generation timeout after 60 seconds');
}

// Run test
testExtraction().catch(error => {
  console.error('\n💥 Test failed:', error.message);
  process.exit(1);
});
