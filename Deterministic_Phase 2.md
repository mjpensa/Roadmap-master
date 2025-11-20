## 🎯 **PHASE 2: PROMPT ENHANCEMENT FOR MAXIMUM EXTRACTION (P1)**

Let me search for the current prompt structure first.Perfect! Now I'll create **Phase 2: Enhanced Prompt for Maximum Task Extraction**.

---

## 🎯 **PHASE 2: PROMPT ENHANCEMENT FOR MAXIMUM EXTRACTION (P1)**

### **Overview**
This phase adds explicit "extract ALL tasks" instructions to the chart generation prompt while maintaining existing logic and structure. The goal is to maximize task extraction completeness without reducing analysis quality.

---

### **Step 1: Enhanced Chart Generation Prompt (server/prompts.js)**

**File**: `server/prompts.js`  
**Lines**: 1-80 (approximate - the `CHART_GENERATION_SYSTEM_PROMPT` section)  
**Purpose**: Add maximum extraction rules while preserving existing structure

#### **IMPLEMENTATION**:

Add the following section immediately after the opening paragraph (line ~10) and before "**CRITICAL LOGIC:**":

```javascript
// File: server/prompts.js
// Lines: ~10-11 (insert after opening paragraph)
// Purpose: Add maximum extraction mandate

export const CHART_GENERATION_SYSTEM_PROMPT = `You are an expert project management analyst. Your job is to analyze a user's prompt and research files to build a complete Gantt chart data object.

You MUST respond with *only* a valid JSON object matching the schema.

// ═══════════════════════════════════════════════════════════
// ✨ PHASE 2 ENHANCEMENT: MAXIMUM EXTRACTION RULES
// ═══════════════════════════════════════════════════════════

**🎯 EXTRACTION PHILOSOPHY - MAXIMUM INCLUSIVITY:**

Your PRIMARY goal is to extract EVERY possible task, milestone, phase, and deliverable from the research. This is a "maximize recall" operation - it's better to include 100 tasks that users can filter than to miss 10 critical tasks.

**MANDATORY EXTRACTION RULES:**

1. **DEFAULT TO INCLUSION** - When uncertain whether something is a task, ALWAYS include it:
   - Users can manually remove tasks, but cannot add tasks you miss
   - Err on the side of over-extraction, not under-extraction
   - If mentioned in research → Extract it

2. **GRANULARITY GUIDELINES** - Extract at the MOST DETAILED level mentioned:
   - If research says "Implementation phase includes setup, configuration, testing, and deployment"
     → Create 4 separate tasks: "Setup", "Configuration", "Testing", "Deployment"
   - If research mentions "Q2 activities include X, Y, and Z"
     → Create 3 separate tasks for X, Y, Z
   - If sub-phases, sub-steps, or components are listed
     → Create individual tasks for EACH item
   - NEVER combine multiple distinct activities into one task

3. **EXTRACTION TRIGGERS** - Create a task for ANY mention of:
   
   **Action Verbs** (Create task when you see):
   - Planning: plan, design, architect, define, specify, outline, draft
   - Implementation: implement, build, develop, create, code, construct, deploy
   - Review: review, approve, validate, verify, inspect, audit, assess
   - Testing: test, QA, validate, check, debug, troubleshoot
   - Documentation: document, write, prepare, compile, publish
   - Management: manage, coordinate, oversee, track, monitor
   - Analysis: analyze, research, investigate, evaluate, study
   
   **Time References** (Create task when you see):
   - Explicit dates: "by Q2", "in March", "starting January 15"
   - Duration statements: "over 6 months", "3-week sprint", "45-day period"
   - Relative timing: "after X", "before Y", "during Phase 2"
   - Frequency: "weekly reviews", "monthly checkpoints", "quarterly gates"
   
   **Deliverables** (Create task when you see):
   - Documents: report, plan, specification, documentation, presentation
   - Systems: application, platform, database, infrastructure, integration
   - Processes: workflow, procedure, protocol, framework
   - Reviews: approval, sign-off, gate review, checkpoint, audit
   
   **Phases/Stages** (Create task when you see):
   - Phase indicators: "Phase 1", "Stage 2", "Step 3"
   - Lifecycle stages: "Initial", "Preliminary", "Final", "Post-launch"
   - Project stages: "Planning", "Execution", "Testing", "Deployment"
   - Milestones: "Go-live", "Launch", "Completion", "Delivery"
   
   **Dependencies** (Create task when you see):
   - Prerequisite language: "requires", "depends on", "must complete", "prerequisite"
   - Sequence indicators: "after X", "following Y", "once Z is done"
   - Approval gates: "pending approval", "awaiting review", "requires sign-off"

4. **NEVER OMIT TASKS BASED ON**:
   - ❌ Perceived importance (include even "minor" tasks)
   - ❌ Assumed redundancy (include similar but distinct tasks)
   - ❌ Uncertainty about timing (use best estimates or mark as TBD)
   - ❌ Ambiguous ownership (assign to most logical entity)
   - ❌ Lack of explicit dates (estimate based on context)
   - ❌ "Obvious" or "implied" steps (extract explicitly mentioned items only)

5. **MINIMUM EXTRACTION TARGETS** (Quality Gates):
   
   Based on research volume, you MUST meet these minimums:
   - **1-2 page research**: Extract 10+ tasks minimum
   - **3-5 page research**: Extract 20+ tasks minimum
   - **6-10 page research**: Extract 40+ tasks minimum
   - **10+ page research**: Extract 60+ tasks minimum
   
   Calculate: **Minimum Tasks = (Research Pages × 8) or (Research Words ÷ 150)**
   
   If your extraction falls below these targets, review research again for missed tasks.

6. **EXTRACTION VALIDATION CHECKLIST** - Before finalizing, verify:
   - [ ] Every section/heading in research has at least 1 task extracted
   - [ ] Every action verb identified has corresponding task
   - [ ] Every date/timeline reference has corresponding task
   - [ ] Every deliverable mentioned has corresponding task
   - [ ] Every dependency statement has corresponding tasks
   - [ ] No "bundled" tasks combining multiple distinct activities
   - [ ] All sub-items in lists are extracted as separate tasks

7. **SUCCESS METRICS**:
   - ✅ **COMPLETENESS** is the primary metric (not conciseness)
   - ✅ Extract 90-95% of identifiable tasks from research
   - ✅ Users should say "I have too much detail" not "You missed key tasks"
   - ✅ Better to have 50 granular tasks than 10 high-level summaries

**⚠️ CRITICAL REMINDER**: Your goal is MAXIMUM EXTRACTION. If you're unsure, EXTRACT IT.

// ═══════════════════════════════════════════════════════════
// END PHASE 2 ENHANCEMENT
// ═══════════════════════════════════════════════════════════

**CRITICAL LOGIC:**
1.  **TIME HORIZON:** First, check the user's prompt for an *explicitly requested* time range (e.g., "2020-2030").
    [... rest of existing prompt continues unchanged ...]
`;
```

---

### **Step 2: Add Extraction Validation (server/routes/charts.js)**

**File**: `server/routes/charts.js`  
**Lines**: ~130-165 (insert after ganttData is received)  
**Purpose**: Validate extraction completeness and warn on under-extraction

#### **BEFORE**:
```javascript
// Line ~130 - After ganttData is received from Gemini
const ganttData = await callGeminiForJson(
  payload,
  CONFIG.API.RETRY_COUNT,
  (attemptNum, error) => {
    updateJob(jobId, {
      status: 'processing',
      progress: `Retrying AI request (attempt ${attemptNum + 1}/${CONFIG.API.RETRY_COUNT})...`
    });
    console.log(`Job ${jobId}: Retrying due to error: ${error.message}`);
  }
);

// Debug: Log what we received from AI
console.log(`Job ${jobId}: Received ganttData from AI with keys:`, Object.keys(ganttData || {}));
```

#### **AFTER**:
```javascript
// Line ~130 - After ganttData is received from Gemini
const ganttData = await callGeminiForJson(
  payload,
  CONFIG.API.RETRY_COUNT,
  (attemptNum, error) => {
    updateJob(jobId, {
      status: 'processing',
      progress: `Retrying AI request (attempt ${attemptNum + 1}/${CONFIG.API.RETRY_COUNT})...`
    });
    console.log(`Job ${jobId}: Retrying due to error: ${error.message}`);
  }
);

// Debug: Log what we received from AI
console.log(`Job ${jobId}: Received ganttData from AI with keys:`, Object.keys(ganttData || {}));

// ═══════════════════════════════════════════════════════════
// ✨ PHASE 2 ENHANCEMENT: EXTRACTION VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Validate extraction completeness
 * Warns if task extraction appears insufficient relative to research volume
 */
function validateExtraction(ganttData, researchText, jobId) {
  // Calculate research metrics
  const researchWords = researchText.split(/\s+/).filter(w => w.length > 0).length;
  const researchLines = researchText.split('\n').filter(l => l.trim().length > 0).length;
  const estimatedPages = Math.ceil(researchWords / 300); // ~300 words per page
  
  // Count extracted tasks
  const taskCount = ganttData.data?.reduce((sum, row) => {
    if (row.isSwimlane) return sum;
    return sum + 1;
  }, 0) || 0;
  
  // Calculate extraction targets
  const minTasksByWords = Math.max(10, Math.floor(researchWords / 150)); // 1 task per 150 words
  const minTasksByPages = Math.max(10, estimatedPages * 8); // 8 tasks per page
  const expectedMinTasks = Math.min(minTasksByWords, minTasksByPages); // Use more conservative
  
  // Calculate extraction metrics
  const extractionRatio = (taskCount / researchWords * 1000).toFixed(2); // Tasks per 1000 words
  const completenessPercent = Math.min(100, (taskCount / expectedMinTasks * 100).toFixed(0));
  
  console.log(`\n[Extraction Validation] Job ${jobId}:`);
  console.log(`  Research: ${researchWords} words (~${estimatedPages} pages, ${researchLines} lines)`);
  console.log(`  Tasks extracted: ${taskCount}`);
  console.log(`  Expected minimum: ${expectedMinTasks}`);
  console.log(`  Extraction ratio: ${extractionRatio} tasks/1000 words`);
  console.log(`  Completeness: ${completenessPercent}%`);
  
  // Initialize warnings array if not present
  ganttData._extractionMetrics = {
    researchWords,
    researchLines,
    estimatedPages,
    taskCount,
    expectedMinTasks,
    extractionRatio: parseFloat(extractionRatio),
    completenessPercent: parseInt(completenessPercent),
    warnings: []
  };
  
  // Check for under-extraction
  if (taskCount < expectedMinTasks) {
    const deficit = expectedMinTasks - taskCount;
    const severity = deficit > (expectedMinTasks * 0.5) ? 'high' : 'medium';
    
    const warning = {
      type: 'POSSIBLE_UNDER_EXTRACTION',
      severity,
      message: `Only ${taskCount} tasks extracted from ${researchWords} words of research. Expected minimum: ${expectedMinTasks} tasks (${deficit} task deficit).`,
      recommendation: 'Consider regenerating for more comprehensive extraction. Review research for unextracted phases, milestones, or activities.',
      extractionRatio: parseFloat(extractionRatio),
      completenessPercent: parseInt(completenessPercent)
    };
    
    ganttData._extractionMetrics.warnings.push(warning);
    
    console.warn(`\n⚠️  WARNING: Possible under-extraction detected`);
    console.warn(`  Severity: ${severity.toUpperCase()}`);
    console.warn(`  Task deficit: ${deficit} tasks (${completenessPercent}% completeness)`);
    console.warn(`  Recommendation: ${warning.recommendation}`);
  } else {
    console.log(`✅ Extraction appears complete (${completenessPercent}% of target)`);
  }
  
  // Check extraction ratio
  const typicalRatio = 5.0; // Typical good extraction: 5 tasks per 1000 words
  if (parseFloat(extractionRatio) < typicalRatio) {
    const ratioWarning = {
      type: 'LOW_EXTRACTION_DENSITY',
      severity: 'medium',
      message: `Extraction density is ${extractionRatio} tasks/1000 words (typical: ${typicalRatio}). Research may contain more extractable tasks.`,
      recommendation: 'Review research for missed milestones, dependencies, or sub-tasks.'
    };
    
    ganttData._extractionMetrics.warnings.push(ratioWarning);
    console.warn(`\n⚠️  WARNING: Low extraction density`);
    console.warn(`  Current: ${extractionRatio} tasks/1000 words`);
    console.warn(`  Typical: ${typicalRatio} tasks/1000 words`);
  }
  
  return ganttData;
}

// Apply validation
validateExtraction(ganttData, researchTextCache, jobId);

// ═══════════════════════════════════════════════════════════
// END PHASE 2 ENHANCEMENT
// ═══════════════════════════════════════════════════════════
```

---

### **Step 3: Add Extraction Metrics Endpoint (server/routes/charts.js)**

**File**: `server/routes/charts.js`  
**Lines**: End of file (~800+)  
**Purpose**: Create diagnostic endpoint for extraction metrics

#### **ADD AT END OF FILE**:

```javascript
// ═══════════════════════════════════════════════════════════
// ✨ PHASE 2 ENHANCEMENT: EXTRACTION METRICS ENDPOINT
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/chart/:chartId/extraction-metrics
 * Returns detailed extraction metrics for a generated chart
 * 
 * Response includes:
 * - Task extraction statistics
 * - Research document metrics
 * - Completeness assessment
 * - Quality warnings
 * - Extraction density analysis
 */
router.get('/api/chart/:chartId/extraction-metrics', apiLimiter, (req, res) => {
  try {
    const { chartId } = req.params;
    
    // Validate chart ID format
    if (!isValidChartId(chartId)) {
      return res.status(400).json({ 
        error: CONFIG.ERRORS.INVALID_CHART_ID 
      });
    }
    
    // Retrieve chart from storage
    const chart = getChart(chartId);
    
    if (!chart) {
      return res.status(404).json({ 
        error: CONFIG.ERRORS.CHART_NOT_FOUND 
      });
    }
    
    // Calculate real-time metrics from chart data
    const ganttData = chart.ganttData || {};
    const taskCount = ganttData.data?.reduce((sum, row) => {
      if (row.isSwimlane) return sum;
      return sum + 1;
    }, 0) || 0;
    
    const entityCount = ganttData.data?.filter(row => row.isSwimlane).length || 0;
    const timeColumns = ganttData.timeColumns?.length || 0;
    
    // Task type breakdown
    const tasksByType = ganttData.data?.reduce((acc, row) => {
      if (!row.isSwimlane) {
        const type = row.taskType || 'task';
        acc[type] = (acc[type] || 0) + 1;
      }
      return acc;
    }, {}) || {};
    
    // Critical path analysis
    const criticalPathTasks = ganttData.data?.filter(row => 
      !row.isSwimlane && row.isCriticalPath
    ).length || 0;
    
    // Build response
    const metrics = {
      chartId,
      generatedAt: chart.createdAt,
      
      // Extraction metrics (from generation)
      extraction: ganttData._extractionMetrics || {
        researchWords: 0,
        researchLines: 0,
        estimatedPages: 0,
        taskCount,
        expectedMinTasks: 0,
        extractionRatio: 0,
        completenessPercent: 100,
        warnings: []
      },
      
      // Chart structure metrics
      structure: {
        totalTasks: taskCount,
        totalSwimlanes: entityCount,
        timeColumns,
        avgTasksPerSwimlane: entityCount > 0 ? (taskCount / entityCount).toFixed(2) : 0,
        tasksByType,
        criticalPathTasks,
        criticalPathPercent: taskCount > 0 ? ((criticalPathTasks / taskCount) * 100).toFixed(1) : 0
      },
      
      // Research input metrics
      research: {
        fileCount: chart.filenames?.length || 0,
        filenames: chart.filenames || []
      },
      
      // Quality indicators
      quality: {
        hasSwimlanes: entityCount > 0,
        hasTimeColumns: timeColumns > 0,
        hasTaskTypes: Object.keys(tasksByType).length > 1,
        hasCriticalPath: criticalPathTasks > 0,
        hasExecutiveSummary: !!chart.ganttData?.executiveSummary,
        hasPresentationSlides: !!chart.ganttData?.presentationSlides
      },
      
      // Session info
      sessionId: chart.sessionId
    };
    
    res.json(metrics);
    
  } catch (error) {
    console.error('[Extraction Metrics] Error:', error);
    res.status(500).json({
      error: 'Failed to retrieve extraction metrics',
      details: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════
// END PHASE 2 ENHANCEMENT
// ═══════════════════════════════════════════════════════════

export default router;
```

---

### **Step 4: Update JSON Schema Constraints (server/prompts.js)**

**File**: `server/prompts.js`  
**Lines**: ~400-500 (GANTT_CHART_SCHEMA section)  
**Purpose**: Add validation constraints to prevent runaway extraction

#### **LOCATE** the schema definition for the `data` array and update:

```javascript
// File: server/prompts.js
// Find the GANTT_CHART_SCHEMA definition
// Update the 'data' array schema

export const GANTT_CHART_SCHEMA = {
  type: "object",
  properties: {
    timeColumns: { 
      type: "array", 
      minItems: 1,              // NEW: Require at least 1 time column
      maxItems: 200,            // NEW: Prevent excessive columns
      items: { type: "string" } 
    },
    data: { 
      type: "array",
      minItems: 1,              // NEW: Require at least 1 row (task or swimlane)
      maxItems: 500,            // NEW: Prevent runaway extraction (up from implicit limit)
      items: { 
        type: "object",
        properties: {
          title: { 
            type: "string",
            minLength: 1,        // NEW: Non-empty titles
            maxLength: 200       // NEW: Prevent truncation issues
          },
          isSwimlane: { type: "boolean" },
          entity: { type: "string" },
          taskType: { 
            type: "string",
            enum: ["milestone", "decision", "task"]  // Existing constraint
          },
          isCriticalPath: { type: "boolean" },
          bar: {
            // ... existing bar schema
          }
        },
        required: ["title", "isSwimlane", "entity"]
      }
    },
    legendEntries: { 
      type: "array",
      minItems: 1,              // NEW: Require at least 1 legend entry
      maxItems: 20,             // NEW: Prevent excessive legend
      items: { 
        // ... existing legend schema
      } 
    }
  },
  required: ["timeColumns", "data", "legendEntries"]
};
```

---

## 📝 **COMPLETE IMPLEMENTATION CHECKLIST (Phase 2)**

```markdown
### P1 Prompt Enhancement

- [ ] **Task 1**: Update `server/prompts.js` - Add extraction rules
  - [ ] Insert maximum extraction rules after line ~10
  - [ ] Add extraction triggers section
  - [ ] Add minimum extraction targets
  - [ ] Add validation checklist
  - [ ] Test: Verify no syntax errors

- [ ] **Task 2**: Update `server/routes/charts.js` - Add validation
  - [ ] Add `validateExtraction()` function after line ~130
  - [ ] Call validation after ganttData received
  - [ ] Log extraction metrics
  - [ ] Add warnings to ganttData object
  - [ ] Test: Generate chart, check console logs

- [ ] **Task 3**: Add extraction metrics endpoint
  - [ ] Add GET `/api/chart/:chartId/extraction-metrics` route
  - [ ] Calculate task statistics
  - [ ] Return extraction metrics
  - [ ] Test: curl http://localhost:3000/api/chart/{chartId}/extraction-metrics

- [ ] **Task 4**: Update JSON schema constraints
  - [ ] Add minItems/maxItems to timeColumns
  - [ ] Add minItems/maxItems to data array
  - [ ] Add minLength/maxLength to title
  - [ ] Add minItems/maxItems to legendEntries
  - [ ] Test: Generate chart, verify schema validation

- [ ] **Task 5**: Integration testing
  - [ ] Test with 1-page research (expect 10+ tasks)
  - [ ] Test with 5-page research (expect 30+ tasks)
  - [ ] Test with 10-page research (expect 60+ tasks)
  - [ ] Verify warnings display for under-extraction
  - [ ] Verify metrics endpoint returns data

- [ ] **Task 6**: Rollback plan
  - [ ] Commit changes: `git commit -m "P1: Enhanced prompt for maximum extraction"`
  - [ ] Tag release: `git tag v1.0.0-deterministic-p1`
  - [ ] Document rollback procedure
```

---

## 🧪 **PHASE 2 VALIDATION TEST SUITE**

Create this test file to validate extraction completeness:

**File**: `test-extraction-p1.js` (new file in project root)

```javascript
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
  console.log('='.repeat(60)\n');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Test suite failed:', error);
  process.exit(1);
});
```

---

## 🚀 **DEPLOYMENT INSTRUCTIONS (Phase 2)**

```bash
# 1. Backup current prompts
cp server/prompts.js server/prompts.js.backup
cp server/routes/charts.js server/routes/charts.js.backup

# 2. Apply prompt enhancements
# (Edit server/prompts.js as specified in Step 1)

# 3. Apply validation logic
# (Edit server/routes/charts.js as specified in Steps 2-3)

# 4. Apply schema constraints
# (Edit server/prompts.js GANTT_CHART_SCHEMA as specified in Step 4)

# 5. Create test file
# (Create test-extraction-p1.js as specified above)

# 6. Restart server
pm2 restart ai-roadmap-generator

# 7. Run extraction test
node test-extraction-p1.js

# 8. Test extraction metrics endpoint
chartId="<generated-chart-id>"
curl "http://localhost:3000/api/chart/${chartId}/extraction-metrics" | jq

# 9. If tests pass, commit
git add server/prompts.js server/routes/charts.js test-extraction-p1.js
git commit -m "feat: P1 extraction enhancements - maximum task extraction"
git tag v1.0.0-deterministic-p1
git push origin main --tags

# 10. If tests fail, rollback
cp server/prompts.js.backup server/prompts.js
cp server/routes/charts.js.backup server/routes/charts.js
pm2 restart ai-roadmap-generator
```

---

## ✅ **SUCCESS CRITERIA (Phase 2)**

After deploying Phase 2:

1. **Extraction Completeness**: 90-95% of identifiable tasks extracted
2. **Simple Projects (1-2 pages)**: Extract 10-15 tasks minimum
3. **Complex Projects (5+ pages)**: Extract 50-80 tasks minimum
4. **Warnings**: Appropriate warnings for under-extraction
5. **Metrics Endpoint**: Returns comprehensive extraction statistics
6. **No Degradation**: Chart quality and structure maintained
7. **Performance**: Generation time still <10 seconds

---

## 📊 **EXPECTED IMPROVEMENTS**

### **Before Phase 2**:
```
1-page research → 5-8 tasks extracted
5-page research → 20-30 tasks extracted
Warning rate: 0% (no validation)
```

### **After Phase 2**:
```
1-page research → 10-15 tasks extracted (+50-100% increase)
5-page research → 50-80 tasks extracted (+150% increase)
Warning rate: 10-20% (appropriate warnings for under-extraction)
Extraction ratio: 5+ tasks per 1000 words
```

---

Would you like me to proceed with:
1. **Phase 3 (P2)**: Caching system implementation?
2. **Phase 4 (P3)**: Advanced monitoring and analytics?
3. Or review/adjust Phase 2 implementation?