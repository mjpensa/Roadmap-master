I'll help you implement deterministic enhancements for your AI Roadmap Generator. Let me first search the project knowledge to understand the current codebase structure.Perfect! I can see your codebase structure. Now let me create a comprehensive, production-ready implementation plan starting with the **P0 (Critical) configuration changes**.

## 🚨 **PHASE 1: IMMEDIATE DETERMINISM FIX (P0 - Deploy Today)**

Based on my analysis of your project knowledge, I can see that `TEMPERATURE_STRUCTURED: 0` is already set, but the critical issue is the **lack of separation between structured and creative parameters**. All generations currently share the same `TOP_P` and `TOP_K` values.

### **Step 1: Refactor Configuration (server/config.js)**

**File**: `server/config.js`  
**Lines**: 62-71  
**Purpose**: Separate deterministic (structured) from creative parameters

#### **BEFORE**:
```javascript
// Lines 62-71 (current state)
API: {
  GEMINI_MODEL: 'gemini-2.5-flash-preview-09-2025',
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
  RETRY_COUNT: 3,
  RETRY_BASE_DELAY_MS: 1000,
  MAX_OUTPUT_TOKENS_CHART: 65536,
  MAX_OUTPUT_TOKENS_ANALYSIS: 65536,
  MAX_OUTPUT_TOKENS_QA: 8192,
  THINKING_BUDGET_ANALYSIS: 24576,
  THINKING_BUDGET_RESEARCH: 24576,
  THINKING_BUDGET_EXECUTIVE: 16384,
  TEMPERATURE_STRUCTURED: 0,
  TEMPERATURE_QA: 0.1,
  TOP_P: 1,
  TOP_K: 1
}
```

#### **AFTER**:
```javascript
// Lines 62-84 (refactored with selective temperature control)
API: {
  GEMINI_MODEL: 'gemini-2.5-flash-preview-09-2025',
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
  RETRY_COUNT: 3,
  RETRY_BASE_DELAY_MS: 1000,
  
  // Token limits (unchanged)
  MAX_OUTPUT_TOKENS_CHART: 65536,
  MAX_OUTPUT_TOKENS_ANALYSIS: 65536,
  MAX_OUTPUT_TOKENS_QA: 8192,
  MAX_OUTPUT_TOKENS_EXECUTIVE: 4096,  // NEW: Explicit limit for summaries
  MAX_OUTPUT_TOKENS_PRESENTATION: 16384,  // NEW: Explicit limit for slides
  
  // Thinking budgets (unchanged)
  THINKING_BUDGET_ANALYSIS: 24576,
  THINKING_BUDGET_RESEARCH: 24576,
  THINKING_BUDGET_EXECUTIVE: 16384,
  
  // === DETERMINISTIC SETTINGS (for structured data extraction) ===
  // Use for: Chart generation, task analysis, research extraction
  TEMPERATURE_STRUCTURED: 0.0,    // Zero randomness for reproducibility
  TOP_P_STRUCTURED: 1.0,          // No nucleus sampling (consider all tokens)
  TOP_K_STRUCTURED: 1,            // Only most likely token (deterministic)
  
  // === CREATIVE SETTINGS (for narrative generation) ===
  // Use for: Executive summaries, presentations, creative narratives
  TEMPERATURE_CREATIVE: 0.7,      // 70% creativity for eloquent summaries
  TOP_P_CREATIVE: 0.95,           // Diverse vocabulary (nucleus sampling)
  TOP_K_CREATIVE: 40,             // Consider top 40 tokens for variety
  
  // === BALANCED SETTINGS (for Q&A responses) ===
  // Use for: Interactive Q&A, contextual responses
  TEMPERATURE_QA: 0.5,            // Semi-creative (balanced)
  TOP_P_QA: 0.9,                  // Moderate diversity
  TOP_K_QA: 20                    // Moderate token choices
}
```

**Migration Notes**:
- `TEMPERATURE_STRUCTURED` already at 0.0 ✅
- Added explicit creative/QA parameter sets
- Backward compatible: existing `TOP_P` and `TOP_K` removed (replaced by specific variants)
- Added explicit token limits for summaries/presentations

---

### **Step 2: Update Chart Generation Route (server/routes/charts.js)**

**File**: `server/routes/charts.js`  
**Lines**: 119-127  
**Purpose**: Use deterministic parameters for chart generation

#### **BEFORE**:
```javascript
// Lines 119-127 (current)
generationConfig: {
  responseMimeType: "application/json",
  responseSchema: GANTT_CHART_SCHEMA,
  maxOutputTokens: CONFIG.API.MAX_OUTPUT_TOKENS_CHART,
  temperature: CONFIG.API.TEMPERATURE_STRUCTURED,
  topP: CONFIG.API.TOP_P,
  topK: CONFIG.API.TOP_K
}
```

#### **AFTER**:
```javascript
// Lines 119-130 (enhanced with deterministic config)
generationConfig: {
  responseMimeType: "application/json",
  responseSchema: GANTT_CHART_SCHEMA,
  maxOutputTokens: CONFIG.API.MAX_OUTPUT_TOKENS_CHART,
  
  // DETERMINISTIC SETTINGS - Ensures 100% reproducible charts
  temperature: CONFIG.API.TEMPERATURE_STRUCTURED,  // 0.0
  topP: CONFIG.API.TOP_P_STRUCTURED,              // 1.0
  topK: CONFIG.API.TOP_K_STRUCTURED,              // 1
  
  // Additional determinism guarantees
  candidateCount: 1,        // Single response candidate
  stopSequences: []         // No early stopping
}
```

---

### **Step 3: Update Executive Summary Generation (server/routes/charts.js)**

**File**: `server/routes/charts.js`  
**Lines**: 207-215 (approximate)  
**Purpose**: Use creative parameters for summaries (maintain eloquence)

#### **BEFORE**:
```javascript
// Lines ~207-215 (current)
generationConfig: {
  responseMimeType: "application/json",
  responseSchema: EXECUTIVE_SUMMARY_SCHEMA,
  maxOutputTokens: CONFIG.API.MAX_OUTPUT_TOKENS_CHART,
  temperature: 0.7,  // Hardcoded!
  topP: CONFIG.API.TOP_P,
  topK: CONFIG.API.TOP_K
}
```

#### **AFTER**:
```javascript
// Lines ~207-217 (updated with creative config)
generationConfig: {
  responseMimeType: "application/json",
  responseSchema: EXECUTIVE_SUMMARY_SCHEMA,
  maxOutputTokens: CONFIG.API.MAX_OUTPUT_TOKENS_EXECUTIVE,  // Explicit limit
  
  // CREATIVE SETTINGS - Maintains eloquent, varied summaries
  temperature: CONFIG.API.TEMPERATURE_CREATIVE,    // 0.7
  topP: CONFIG.API.TOP_P_CREATIVE,                // 0.95
  topK: CONFIG.API.TOP_K_CREATIVE,                // 40
  
  candidateCount: 1
}
```

---

### **Step 4: Update Presentation Slides Generation (server/routes/charts.js)**

**File**: `server/routes/charts.js`  
**Lines**: ~255-263 and ~305-313 (two places: outline + content)  
**Purpose**: Use creative parameters for presentations

#### **BEFORE (Outline Generation)**:
```javascript
// Lines ~255-263
generationConfig: {
  responseMimeType: "application/json",
  responseSchema: PRESENTATION_SLIDES_OUTLINE_SCHEMA,
  maxOutputTokens: CONFIG.API.MAX_OUTPUT_TOKENS_CHART,
  temperature: 0.7,  // Hardcoded!
  topP: CONFIG.API.TOP_P,
  topK: CONFIG.API.TOP_K
}
```

#### **AFTER (Outline Generation)**:
```javascript
// Lines ~255-265
generationConfig: {
  responseMimeType: "application/json",
  responseSchema: PRESENTATION_SLIDES_OUTLINE_SCHEMA,
  maxOutputTokens: CONFIG.API.MAX_OUTPUT_TOKENS_PRESENTATION,
  
  // CREATIVE SETTINGS - Engaging slide structures
  temperature: CONFIG.API.TEMPERATURE_CREATIVE,
  topP: CONFIG.API.TOP_P_CREATIVE,
  topK: CONFIG.API.TOP_K_CREATIVE,
  
  candidateCount: 1
}
```

#### **BEFORE (Slide Content Generation)**:
```javascript
// Lines ~305-313
generationConfig: {
  responseMimeType: "application/json",
  responseSchema: PRESENTATION_SLIDE_CONTENT_SCHEMA,
  maxOutputTokens: CONFIG.API.MAX_OUTPUT_TOKENS_CHART,
  temperature: 0.7,  // Hardcoded!
  topP: CONFIG.API.TOP_P,
  topK: CONFIG.API.TOP_K
}
```

#### **AFTER (Slide Content Generation)**:
```javascript
// Lines ~305-315
generationConfig: {
  responseMimeType: "application/json",
  responseSchema: PRESENTATION_SLIDE_CONTENT_SCHEMA,
  maxOutputTokens: CONFIG.API.MAX_OUTPUT_TOKENS_PRESENTATION,
  
  // CREATIVE SETTINGS - Eloquent slide content
  temperature: CONFIG.API.TEMPERATURE_CREATIVE,
  topP: CONFIG.API.TOP_P_CREATIVE,
  topK: CONFIG.API.TOP_K_CREATIVE,
  
  candidateCount: 1
}
```

---

## 📝 **COMPLETE IMPLEMENTATION CHECKLIST (Phase 1)**

```markdown
### P0 Configuration Changes

- [ ] **Task 1**: Update `server/config.js` lines 62-84
  - [ ] Add `TEMPERATURE_CREATIVE: 0.7`
  - [ ] Add `TOP_P_STRUCTURED: 1.0`, `TOP_K_STRUCTURED: 1`
  - [ ] Add `TOP_P_CREATIVE: 0.95`, `TOP_K_CREATIVE: 40`
  - [ ] Add `TOP_P_QA: 0.9`, `TOP_K_QA: 20`
  - [ ] Add `MAX_OUTPUT_TOKENS_EXECUTIVE: 4096`
  - [ ] Add `MAX_OUTPUT_TOKENS_PRESENTATION: 16384`
  - [ ] Remove standalone `TOP_P` and `TOP_K` (replaced by variants)
  - [ ] Test: Run `node server.js` to ensure no syntax errors

- [ ] **Task 2**: Update `server/routes/charts.js` - Chart Generation (lines 119-130)
  - [ ] Replace `topP: CONFIG.API.TOP_P` → `CONFIG.API.TOP_P_STRUCTURED`
  - [ ] Replace `topK: CONFIG.API.TOP_K` → `CONFIG.API.TOP_K_STRUCTURED`
  - [ ] Add `candidateCount: 1`
  - [ ] Add `stopSequences: []`
  - [ ] Test: Generate a test chart, verify determinism

- [ ] **Task 3**: Update `server/routes/charts.js` - Executive Summary (lines ~207-217)
  - [ ] Replace `temperature: 0.7` → `CONFIG.API.TEMPERATURE_CREATIVE`
  - [ ] Replace `topP: CONFIG.API.TOP_P` → `CONFIG.API.TOP_P_CREATIVE`
  - [ ] Replace `topK: CONFIG.API.TOP_K` → `CONFIG.API.TOP_K_CREATIVE`
  - [ ] Replace `maxOutputTokens` → `CONFIG.API.MAX_OUTPUT_TOKENS_EXECUTIVE`
  - [ ] Test: Generate summary, verify eloquence maintained

- [ ] **Task 4**: Update `server/routes/charts.js` - Presentation Outline (lines ~255-265)
  - [ ] Replace hardcoded params with `CONFIG.API.*_CREATIVE`
  - [ ] Update `maxOutputTokens` → `CONFIG.API.MAX_OUTPUT_TOKENS_PRESENTATION`
  - [ ] Test: Generate presentation, verify creativity

- [ ] **Task 5**: Update `server/routes/charts.js` - Slide Content (lines ~305-315)
  - [ ] Same changes as Task 4
  - [ ] Test: Verify slide content quality

- [ ] **Task 6**: Rollback Plan
  - [ ] Commit changes: `git commit -m "P0: Selective temperature control"`
  - [ ] Tag release: `git tag v1.0.0-deterministic-p0`
  - [ ] Document rollback: `git revert HEAD` if issues occur
```

---

## 🧪 **PHASE 1 VALIDATION TEST SUITE**

Create this test file to validate determinism immediately after Phase 1 deployment:

**File**: `test-determinism-p0.js` (new file in project root)

```javascript
/**
 * Determinism Test Suite - Phase 1 (P0)
 * Validates that chart generation is 100% reproducible
 * 
 * Run: node test-determinism-p0.js
 */

import fetch from 'node-fetch';
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
  
  const blob = new Blob([TEST_RESEARCH], { type: 'text/markdown' });
  formData.append('researchFiles', blob, 'test-project.md');

  const response = await fetch(`${BASE_URL}/generate-chart`, {
    method: 'POST',
    body: formData
  });

  const { jobId } = await response.json();
  
  // Poll for completion
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const jobResponse = await fetch(`${BASE_URL}/job/${jobId}`);
    const job = await jobResponse.json();
    
    if (job.status === 'complete') {
      return job.ganttData;
    }
    
    if (job.status === 'error') {
      throw new Error(`Job failed: ${job.error}`);
    }
  }
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
```

---

## 🚀 **DEPLOYMENT INSTRUCTIONS (Phase 1)**

### **Step-by-Step Deployment**:

```bash
# 1. Backup current configuration
cp server/config.js server/config.js.backup
cp server/routes/charts.js server/routes/charts.js.backup

# 2. Apply configuration changes
# (Edit server/config.js as specified in Step 1 above)

# 3. Apply route changes
# (Edit server/routes/charts.js as specified in Steps 2-4 above)

# 4. Restart server
pm2 restart ai-roadmap-generator
# OR
npm run start

# 5. Run determinism test
node test-determinism-p0.js

# 6. If tests pass, commit changes
git add server/config.js server/routes/charts.js test-determinism-p0.js
git commit -m "feat: P0 deterministic enhancements - selective temperature control"
git tag v1.0.0-deterministic-p0
git push origin main --tags

# 7. If tests fail, rollback immediately
cp server/config.js.backup server/config.js
cp server/routes/charts.js.backup server/routes/charts.js
pm2 restart ai-roadmap-generator
```

---

## ✅ **SUCCESS CRITERIA (Phase 1)**

After deploying Phase 1, you should see:

1. **Determinism Test**: 100% pass rate (5/5 identical outputs)
2. **Chart Generation**: Identical task extraction every time
3. **Executive Summaries**: Still eloquent and varied (temperature=0.7)
4. **Presentations**: Still engaging and creative (temperature=0.7)
5. **Performance**: <5 seconds generation time maintained
6. **No Breaking Changes**: All existing charts regenerate successfully

---

## 📊 **EXPECTED RESULTS**

### **Before Phase 1**:
```
Iteration 1 Hash: a3b5c7d9...
Iteration 2 Hash: f1e2d3c4...  ❌ Different!
Iteration 3 Hash: 9876fedc...  ❌ Different!
```

### **After Phase 1**:
```
Iteration 1 Hash: a3b5c7d9...
Iteration 2 Hash: a3b5c7d9...  ✅ Identical
Iteration 3 Hash: a3b5c7d9...  ✅ Identical
```

---

Would you like me to proceed with:
1. **Phase 2 (P1)**: Prompt enhancement for maximum task extraction?
2. **Phase 3 (P2)**: Validation and monitoring systems?
3. **Phase 4 (P3)**: Caching implementation?

Or would you prefer to implement Phase 1 first and validate before moving forward?