# Fix Implementation Plan - Chart Generation Failure Resolution

**Error Reference:** `error desc_1.md`
**Created:** 2025-11-21
**Severity:** CRITICAL
**Estimated Timeline:** 3-5 days (Phase 1-3)

---

## Executive Summary

This implementation plan addresses the critical chart generation failures caused by:
1. **JSON truncation at 60,001 characters** from Gemini API responses
2. **Missing required `timeColumns` field** in AI-generated responses
3. **Input size validation bypass** (360KB uploaded vs 50KB configured limit)
4. **Timeout issues** (5-minute job timeout with 4-minute retry cycles)

The plan is divided into 3 phases: Immediate Fixes (P0), Robustness Improvements (P1), and Long-term Enhancements (P2).

---

## Phase 1: Immediate Fixes (P0) - Days 1-2

### 1.1 Fix Input Size Validation (CRITICAL)

**Problem:** 360KB research uploaded despite 50KB limit
**Root Cause:** Validation not enforcing configured limits
**Impact:** Exceeding Gemini context limits, causing truncation

**Implementation Steps:**

#### Step 1.1.1: Review Current Validation
**File:** `server/middleware.js`
**Action:** Read and analyze file upload validation logic

```bash
# Review current file size checks
# Look for: fileFilter, file size validation, research character count
```

**Expected Finding:** File upload middleware may only check individual file sizes, not total research content size.

#### Step 1.1.2: Add Total Research Size Validation
**File:** `server/routes/charts.js` (Line ~50-80, in POST /generate-chart handler)
**Location:** After file processing, before job creation

**Code to Add:**
```javascript
// After: const research = sortedFiles.map(...).join('\n\n');
// Add validation:

const totalResearchChars = research.length;
const maxChars = CONFIG.FILE_LIMITS.MAX_RESEARCH_CHARS; // 50000 for standard mode

if (totalResearchChars > maxChars) {
  console.warn(`[Chart Generation] Research size ${totalResearchChars} exceeds limit ${maxChars}`);

  // Check if semantic mode would help
  const semanticMaxChars = CONFIG.SEMANTIC?.MAX_RESEARCH_CHARS || 100000;

  if (totalResearchChars <= semanticMaxChars) {
    return res.status(400).json({
      error: 'RESEARCH_TOO_LARGE',
      message: `Your research (${(totalResearchChars / 1024).toFixed(1)}KB) exceeds the standard mode limit (${(maxChars / 1024).toFixed(1)}KB). Please try semantic mode or reduce your file count.`,
      currentSize: totalResearchChars,
      maxSize: maxChars,
      suggestSemanticMode: true,
      semanticMaxSize: semanticMaxChars
    });
  } else {
    return res.status(400).json({
      error: 'RESEARCH_TOO_LARGE',
      message: `Your research (${(totalResearchChars / 1024).toFixed(1)}KB) exceeds the maximum allowed size (${(semanticMaxChars / 1024).toFixed(1)}KB). Please reduce the number or size of files.`,
      currentSize: totalResearchChars,
      maxSize: semanticMaxChars
    });
  }
}

console.log(`[Chart Generation] Research size: ${totalResearchChars} chars (within ${maxChars} limit)`);
```

**Testing:**
```bash
# Test case 1: Upload 360KB of research (should fail with clear error)
# Test case 2: Upload 49KB of research (should succeed)
# Test case 3: Upload 80KB of research (should suggest semantic mode)
```

#### Step 1.1.3: Update Frontend Error Handling
**File:** `Public/main.js` (Line ~387-450, error handling in pollJobStatus)
**Action:** Add handling for RESEARCH_TOO_LARGE error

**Code to Add:**
```javascript
// In pollJobStatus error handling (around line 400)
if (data.error === 'RESEARCH_TOO_LARGE') {
  clearInterval(pollInterval);
  progressDiv.innerHTML = `
    <div class="text-red-500 font-semibold">⚠️ Research Size Limit Exceeded</div>
    <div class="text-gray-300 mt-2">${data.message}</div>
    ${data.suggestSemanticMode ? `
      <div class="mt-4 p-4 bg-blue-900 rounded">
        <strong>Suggestion:</strong> Enable semantic mode in your research files or reduce file count.
      </div>
    ` : ''}
  `;
  return;
}
```

---

### 1.2 Fix JSON Truncation at 60,001 Characters

**Problem:** Gemini API responses truncated at exactly 60,001 characters
**Root Cause:** Unknown - could be API limit, network buffer, or response handler

**Implementation Steps:**

#### Step 1.2.1: Investigate Gemini API Configuration
**File:** `server/gemini.js`
**Action:** Review response handling and size limits

**Investigation Checklist:**
- [ ] Check if `maxOutputTokens` is set in API configuration
- [ ] Review response buffer size limits
- [ ] Verify streaming vs. buffered response handling
- [ ] Check for hardcoded 60KB limits in code

**Code Review Target (gemini.js):**
```javascript
// Look for configuration like:
generationConfig: {
  temperature: ...,
  maxOutputTokens: ???, // <-- CHECK THIS
  topK: ...,
  topP: ...,
}
```

#### Step 1.2.2: Increase maxOutputTokens
**File:** `server/gemini.js`
**Action:** Set explicit maxOutputTokens based on model limits

**Research Required:**
- Gemini 2.5 Flash token limits (check documentation)
- Recommended: 8192 tokens for chart generation (current in prompts.js)

**Code to Modify:**
```javascript
// In callGeminiAPI function or similar
const generationConfig = {
  temperature: temperature,
  maxOutputTokens: 8192, // Explicitly set (was previously undefined?)
  topK: 40,
  topP: 0.95,
  responseMimeType: "application/json",
  responseSchema: schema // Ensure schema is passed
};
```

#### Step 1.2.3: Add Response Size Logging
**File:** `server/gemini.js`
**Action:** Add detailed logging for response inspection

**Code to Add:**
```javascript
// After receiving AI response, before parsing
const responseText = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
const responseSize = responseText.length;

console.log(`[Gemini API] Response received:`);
console.log(`  - Size: ${responseSize} characters`);
console.log(`  - Size (KB): ${(responseSize / 1024).toFixed(2)} KB`);
console.log(`  - First 100 chars: ${responseText.substring(0, 100)}`);
console.log(`  - Last 100 chars: ${responseText.substring(responseSize - 100)}`);

if (responseSize >= 60000 && responseSize <= 60010) {
  console.error(`⚠️  WARNING: Response size near suspicious 60K truncation point!`);
}
```

#### Step 1.2.4: Add Truncation Detection
**File:** `server/routes/charts.js` (in processChartGeneration function)
**Action:** Detect and report truncation before attempting repair

**Code to Add:**
```javascript
// Before JSON.parse or jsonrepair
const likelyTruncated = (
  jsonText.length >= 60000 &&
  jsonText.length <= 60010 &&
  !jsonText.trim().endsWith('}')
);

if (likelyTruncated) {
  console.error(`[Chart Generation] TRUNCATION DETECTED:`);
  console.error(`  - JSON size: ${jsonText.length} chars`);
  console.error(`  - Ends with: "${jsonText.slice(-50)}"`);
  console.error(`  - Expected closing brace: false`);

  // Try repair but warn
  console.warn(`[Chart Generation] Attempting jsonrepair on truncated response...`);
}
```

---

### 1.3 Enforce JSON Schema for timeColumns

**Problem:** AI responses missing required `timeColumns` field
**Root Cause:** Schema may not be properly enforced, or prompt unclear

**Implementation Steps:**

#### Step 1.3.1: Verify Schema Definition
**File:** `server/prompts.js`
**Action:** Confirm CHART_GENERATION_JSON_SCHEMA includes timeColumns as required

**Code to Verify:**
```javascript
export const CHART_GENERATION_JSON_SCHEMA = {
  type: "object",
  properties: {
    timeColumns: {
      type: "array",
      items: { type: "string" },
      description: "Array of time period labels (e.g., ['Q1 2025', 'Q2 2025', ...])"
    },
    data: {
      type: "array",
      items: { /* ... */ }
    }
  },
  required: ["timeColumns", "data"], // <-- VERIFY THIS
  additionalProperties: false
};
```

**Action Required:** If `required` field is missing or incomplete, add it.

#### Step 1.3.2: Update Prompt for Clarity
**File:** `server/prompts.js` (CHART_GENERATION_SYSTEM_PROMPT)
**Action:** Add explicit instruction about timeColumns

**Code to Add (in prompt text):**
```javascript
// Add to CHART_GENERATION_SYSTEM_PROMPT near the top:

CRITICAL REQUIREMENT: Your response MUST include BOTH fields:
1. "timeColumns": An array of time period labels (e.g., ["Q1 2025", "Q2 2025", "Q3 2025", ...])
2. "data": An array of task objects

EXAMPLE CORRECT STRUCTURE:
{
  "timeColumns": ["Jan 2025", "Feb 2025", "Mar 2025", "Apr 2025"],
  "data": [
    {
      "label": "Task Name",
      "entity": "Team/System",
      // ... other fields
    }
  ]
}

FAILURE TO INCLUDE BOTH FIELDS WILL RESULT IN VALIDATION ERROR.
```

#### Step 1.3.3: Add Pre-Validation Before jsonrepair
**File:** `server/routes/charts.js`
**Action:** Check for timeColumns presence before attempting repair

**Code to Add:**
```javascript
// After receiving AI response, before JSON.parse
let parsedResponse;

try {
  parsedResponse = JSON.parse(responseText);
} catch (parseError) {
  console.warn(`[Chart Generation] Initial parse failed, attempting repair...`);

  // Quick check: does the text even contain "timeColumns"?
  if (!responseText.includes('"timeColumns"')) {
    console.error(`[Chart Generation] FATAL: Response missing "timeColumns" field entirely`);
    console.error(`Response preview: ${responseText.substring(0, 500)}...`);
    throw new Error('AI response missing required "timeColumns" field. This indicates a prompt/schema enforcement failure.');
  }

  // Attempt repair
  const repairedText = jsonrepair(responseText);
  parsedResponse = JSON.parse(repairedText);
}

// Validate structure
if (!Array.isArray(parsedResponse.timeColumns)) {
  console.error(`[Chart Generation] timeColumns validation failed:`);
  console.error(`  - Type: ${typeof parsedResponse.timeColumns}`);
  console.error(`  - Value: ${JSON.stringify(parsedResponse.timeColumns)}`);
  console.error(`  - Keys present: ${Object.keys(parsedResponse)}`);
  throw new Error('AI returned invalid timeColumns (not an array)');
}

if (!Array.isArray(parsedResponse.data)) {
  throw new Error('AI returned invalid data (not an array)');
}

console.log(`✅ [Chart Generation] Schema validation passed: timeColumns (${parsedResponse.timeColumns.length}), data (${parsedResponse.data.length})`);
```

---

### 1.4 Testing Phase 1 Fixes

**Test Suite:**

#### Test 1.4.1: Input Size Validation
```bash
# Setup: Create test files totaling different sizes

# Test A: 30KB (should succeed)
# Expected: Chart generated successfully

# Test B: 60KB (should fail with semantic mode suggestion)
# Expected: Error message suggesting semantic mode

# Test C: 120KB (should fail with size limit error)
# Expected: Error message to reduce files
```

#### Test 1.4.2: JSON Response Handling
```bash
# Manual test with logging enabled

# Test A: Small research file (should generate complete JSON)
# Expected: Response < 60KB, valid timeColumns

# Test B: Medium research file (40-50KB)
# Expected: Response parsed correctly, timeColumns present

# Verify in logs:
# - Response size logged
# - No truncation warnings
# - Schema validation passes
```

#### Test 1.4.3: Schema Enforcement
```bash
# This tests the AI's compliance with schema

# Upload a simple research file
# Expected in logs:
# - "Schema validation passed: timeColumns (X), data (Y)"
# - No "missing timeColumns" errors
```

**Success Criteria for Phase 1:**
- [ ] No uploads > 50KB accepted in standard mode
- [ ] Clear error messages for oversized research
- [ ] No JSON truncation at 60,001 characters
- [ ] 100% of successful AI responses include timeColumns
- [ ] Detailed logging for debugging

---

## Phase 2: Robustness Improvements (P1) - Days 3-4

### 2.1 Improve Error Handling and Logging

**Goal:** Better visibility into failures for faster debugging

**Implementation Steps:**

#### Step 2.1.1: Enhance Gemini API Error Logging
**File:** `server/gemini.js`
**Action:** Add comprehensive error capture

**Code to Add:**
```javascript
// In callGeminiAPI function, catch block
catch (error) {
  console.error(`[Gemini API] Request failed:`);
  console.error(`  - Error type: ${error.constructor.name}`);
  console.error(`  - Error message: ${error.message}`);

  // Log full error details for network/API errors
  if (error.response) {
    console.error(`  - Status code: ${error.response.status}`);
    console.error(`  - Status text: ${error.response.statusText}`);
    console.error(`  - Response data: ${JSON.stringify(error.response.data, null, 2)}`);
  }

  // Log request details for reproducibility
  console.error(`  - Request details:`);
  console.error(`    - Temperature: ${temperature}`);
  console.error(`    - Max tokens: ${generationConfig?.maxOutputTokens}`);
  console.error(`    - Prompt length: ${prompt.length} chars`);
  console.error(`    - Research length: ${research?.length || 0} chars`);

  throw error; // Re-throw after logging
}
```

#### Step 2.1.2: Add Structured Error Codes
**File:** `server/config.js`
**Action:** Define error code constants

**Code to Add:**
```javascript
export const ERROR_CODES = Object.freeze({
  // Input validation
  RESEARCH_TOO_LARGE: 'RESEARCH_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',

  // AI API errors
  AI_TIMEOUT: 'AI_TIMEOUT',
  AI_JSON_TRUNCATED: 'AI_JSON_TRUNCATED',
  AI_INVALID_RESPONSE: 'AI_INVALID_RESPONSE',
  AI_MISSING_FIELD: 'AI_MISSING_FIELD',

  // Job errors
  JOB_TIMEOUT: 'JOB_TIMEOUT',
  JOB_NOT_FOUND: 'JOB_NOT_FOUND',

  // System errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  CACHE_ERROR: 'CACHE_ERROR'
});
```

#### Step 2.1.3: Update Job Error Tracking
**File:** `server/routes/charts.js`
**Action:** Include error codes in job failures

**Code to Modify:**
```javascript
// When setting job to error state
updateJob(jobId, {
  status: 'error',
  error: 'AI returned invalid timeColumns (not an array)',
  errorCode: ERROR_CODES.AI_MISSING_FIELD, // <-- ADD THIS
  errorDetails: {
    hasTimeColumns: !!ganttData.timeColumns,
    timeColumnsType: typeof ganttData.timeColumns,
    hasData: !!ganttData.data,
    responseKeys: Object.keys(ganttData)
  }
});
```

#### Step 2.1.4: Add Response Capture for Debugging
**File:** `server/routes/charts.js`
**Action:** Save failed responses to temp storage

**Code to Add:**
```javascript
// In catch block of processChartGeneration
catch (error) {
  console.error(`[Chart Generation] Failed for job ${jobId}:`, error.message);

  // Save failed response for debugging (only in development)
  if (process.env.NODE_ENV !== 'production' && responseText) {
    const debugPath = `./debug_response_${jobId}_${Date.now()}.json`;
    try {
      await fs.writeFile(debugPath, responseText, 'utf-8');
      console.log(`[Debug] Failed response saved to: ${debugPath}`);
    } catch (writeError) {
      console.warn(`[Debug] Could not save response: ${writeError.message}`);
    }
  }

  updateJob(jobId, {
    status: 'error',
    error: error.message,
    errorCode: determineErrorCode(error),
    errorDetails: {
      responseSize: responseText?.length || 0,
      timestamp: new Date().toISOString()
    }
  });
}
```

---

### 2.2 Adjust Timeout and Retry Strategy

**Problem:** 5-minute timeout insufficient for 3 retries at 4 minutes each
**Goal:** Balance user experience with realistic processing time

**Implementation Steps:**

#### Step 2.2.1: Make Job Timeout Configurable
**File:** `server/config.js`
**Action:** Add timeout configuration

**Code to Add:**
```javascript
export const CONFIG = Object.freeze({
  // ... existing config ...

  JOB: {
    // Timeout for chart generation jobs
    TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes (default)
    TIMEOUT_LARGE_INPUT_MS: 10 * 60 * 1000, // 10 minutes for large inputs

    // Retry configuration
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 2000, // 2 seconds between retries
    RETRY_EXPONENTIAL_BACKOFF: true,

    // Size threshold for extended timeout
    LARGE_INPUT_THRESHOLD_CHARS: 30000 // 30KB
  }
});
```

#### Step 2.2.2: Implement Dynamic Timeout
**File:** `server/routes/charts.js`
**Action:** Use longer timeout for large inputs

**Code to Add:**
```javascript
// In POST /generate-chart, after research is combined
const researchSize = research.length;
const isLargeInput = researchSize > CONFIG.JOB.LARGE_INPUT_THRESHOLD_CHARS;
const jobTimeout = isLargeInput
  ? CONFIG.JOB.TIMEOUT_LARGE_INPUT_MS
  : CONFIG.JOB.TIMEOUT_MS;

console.log(`[Chart Generation] Job timeout: ${jobTimeout / 60000} minutes (input: ${(researchSize / 1024).toFixed(1)}KB)`);

// Store timeout in job metadata
const jobId = createJobId();
jobStore.set(jobId, {
  status: 'queued',
  progress: 'Starting...',
  createdAt: Date.now(),
  timeoutAt: Date.now() + jobTimeout, // <-- ADD THIS
  researchSize: researchSize
});
```

#### Step 2.2.3: Update Client-Side Polling
**File:** `Public/main.js`
**Action:** Use dynamic timeout from server

**Code to Modify:**
```javascript
// In handleSubmit function, after receiving jobId
const response = await fetch('/generate-chart', { /* ... */ });
const { jobId, sessionId, estimatedTimeout } = await response.json(); // <-- ADD estimatedTimeout

// Use server-provided timeout, with fallback
const maxPollTime = estimatedTimeout || (5 * 60 * 1000); // Default 5 min
const maxPolls = Math.ceil(maxPollTime / 1000); // 1 poll per second

console.log(`Job ${jobId} created. Will poll for up to ${maxPollTime / 60000} minutes.`);

// ... rest of polling logic
```

#### Step 2.2.4: Implement Exponential Backoff for Retries
**File:** `server/routes/charts.js`
**Action:** Progressive retry delays

**Code to Modify:**
```javascript
// In processChartGeneration retry logic
async function attemptChartGeneration(attempt, maxAttempts) {
  try {
    // ... AI call logic ...
  } catch (error) {
    if (attempt < maxAttempts) {
      // Calculate delay: 2s, 4s, 8s for attempts 1, 2, 3
      const baseDelay = CONFIG.JOB.RETRY_DELAY_MS;
      const delay = CONFIG.JOB.RETRY_EXPONENTIAL_BACKOFF
        ? baseDelay * Math.pow(2, attempt - 1)
        : baseDelay;

      console.log(`[Chart Generation] Retry ${attempt}/${maxAttempts} after ${delay}ms`);
      updateJob(jobId, {
        status: 'processing',
        progress: `Retrying after ${delay / 1000}s delay (attempt ${attempt + 1}/${maxAttempts})...`
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      return attemptChartGeneration(attempt + 1, maxAttempts);
    } else {
      throw error; // Max retries exceeded
    }
  }
}
```

---

### 2.3 Improve User Feedback

**Goal:** Keep users informed during long processing times

**Implementation Steps:**

#### Step 2.3.1: Add Progress Estimates
**File:** `server/routes/charts.js`
**Action:** Update progress messages with time estimates

**Code to Modify:**
```javascript
// Update progress messages to include estimates
updateJob(jobId, {
  status: 'processing',
  progress: 'Analyzing research... (1-2 minutes estimated)',
  progressPercent: 10
});

// After first AI call starts
updateJob(jobId, {
  status: 'processing',
  progress: 'Generating chart data with AI... (2-4 minutes estimated)',
  progressPercent: 30
});

// Before executive summary
updateJob(jobId, {
  status: 'processing',
  progress: 'Creating executive summary... (1 minute estimated)',
  progressPercent: 60
});

// Before slides
updateJob(jobId, {
  status: 'processing',
  progress: 'Building presentation slides... (1-2 minutes estimated)',
  progressPercent: 80
});
```

#### Step 2.3.2: Add Progress Bar to Frontend
**File:** `Public/main.js`
**Action:** Visual progress indicator

**Code to Add:**
```javascript
// In pollJobStatus function
if (data.status === 'processing') {
  const percent = data.progressPercent || 0;

  progressDiv.innerHTML = `
    <div class="text-blue-400 font-semibold">
      ${data.progress || 'Processing...'}
    </div>
    ${percent > 0 ? `
      <div class="w-full bg-gray-700 rounded-full h-2.5 mt-3">
        <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
             style="width: ${percent}%"></div>
      </div>
      <div class="text-sm text-gray-400 mt-1">${percent}% complete</div>
    ` : ''}
    <div class="text-sm text-gray-400 mt-2">
      Poll attempt ${pollCount} (timeout after ${maxPolls} attempts)
    </div>
  `;
}
```

#### Step 2.3.3: Add "What's Taking So Long?" Info
**File:** `Public/main.js`
**Action:** Show helpful info after 2 minutes

**Code to Add:**
```javascript
// In pollJobStatus, after 120 polls (2 minutes)
if (pollCount === 120 && data.status === 'processing') {
  const infoDiv = document.createElement('div');
  infoDiv.className = 'mt-4 p-3 bg-blue-900 rounded text-sm text-gray-300';
  infoDiv.innerHTML = `
    <strong>💡 Why is this taking time?</strong>
    <ul class="list-disc list-inside mt-2 space-y-1">
      <li>Analyzing ${data.fileCount || 'multiple'} research documents</li>
      <li>AI generating comprehensive roadmap</li>
      <li>Creating executive summary and presentation</li>
      <li>Large projects may take up to 5-10 minutes</li>
    </ul>
  `;
  progressDiv.appendChild(infoDiv);
}
```

---

### 2.4 Testing Phase 2 Improvements

**Test Suite:**

#### Test 2.4.1: Extended Timeout
```bash
# Test with large input (40KB)
# Expected:
# - Job timeout extended to 10 minutes
# - Progress messages include time estimates
# - Client polls for up to 600 seconds
```

#### Test 2.4.2: Exponential Backoff
```bash
# Simulate AI failure (temporarily break API key)
# Expected retry delays:
# - Attempt 1 → 2: 2 seconds
# - Attempt 2 → 3: 4 seconds
# - Attempt 3 → fail: 8 seconds
```

#### Test 2.4.3: User Feedback
```bash
# Upload normal research file
# Expected:
# - Progress bar updates smoothly
# - Time estimates shown
# - "What's taking so long?" appears after 2 minutes
# - Progress percent increases: 10% → 30% → 60% → 80% → 100%
```

**Success Criteria for Phase 2:**
- [ ] Large inputs get extended timeout (10 minutes)
- [ ] Exponential backoff reduces rapid retry storms
- [ ] Users see progress bar and time estimates
- [ ] Detailed error logs for all failures
- [ ] Error codes standardized across codebase

---

## Phase 3: Long-term Enhancements (P2) - Day 5+

### 3.1 Implement Progressive Processing

**Goal:** Break large inputs into chunks for better reliability

**Implementation Steps:**

#### Step 3.1.1: Add Chunking Strategy
**File:** `server/utils.js` (create new function)
**Action:** Intelligent research chunking

**Code to Add:**
```javascript
/**
 * Split research into manageable chunks for AI processing
 * @param {string} research - Combined research text
 * @param {number} maxChunkSize - Max characters per chunk (default: 40000)
 * @returns {Array<string>} Array of research chunks
 */
export function chunkResearch(research, maxChunkSize = 40000) {
  if (research.length <= maxChunkSize) {
    return [research]; // No chunking needed
  }

  const chunks = [];
  const fileSeparator = '--- Start of file:';
  const files = research.split(fileSeparator);

  let currentChunk = '';

  for (const file of files) {
    if (!file.trim()) continue;

    const fileContent = fileSeparator + file;

    // If single file exceeds chunk size, split it
    if (fileContent.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }

      // Split large file by paragraphs
      const paragraphs = fileContent.split('\n\n');
      for (const para of paragraphs) {
        if (currentChunk.length + para.length > maxChunkSize) {
          chunks.push(currentChunk);
          currentChunk = para;
        } else {
          currentChunk += '\n\n' + para;
        }
      }
    } else {
      // Try to add file to current chunk
      if (currentChunk.length + fileContent.length > maxChunkSize) {
        chunks.push(currentChunk);
        currentChunk = fileContent;
      } else {
        currentChunk += fileContent;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  console.log(`[Chunking] Split ${research.length} chars into ${chunks.length} chunks`);
  return chunks;
}
```

#### Step 3.1.2: Implement Multi-Pass Chart Generation
**File:** `server/routes/charts.js`
**Action:** Generate chart from multiple chunks and merge

**Pseudocode:**
```javascript
async function processChartGenerationProgressive(jobId, prompt, research, sessionId) {
  // 1. Chunk research
  const chunks = chunkResearch(research, 40000);

  if (chunks.length === 1) {
    // Use existing single-pass logic
    return processChartGeneration(jobId, prompt, research, sessionId);
  }

  // 2. Generate partial charts for each chunk
  const partialCharts = [];
  for (let i = 0; i < chunks.length; i++) {
    updateJob(jobId, {
      status: 'processing',
      progress: `Processing chunk ${i + 1}/${chunks.length}...`,
      progressPercent: Math.floor((i / chunks.length) * 50)
    });

    const partialChart = await callGeminiAPI(
      CHART_GENERATION_SYSTEM_PROMPT,
      `Generate roadmap for chunk ${i + 1}:\n\n${prompt}`,
      chunks[i],
      CHART_GENERATION_JSON_SCHEMA,
      0,
      8192
    );

    partialCharts.push(partialChart);
  }

  // 3. Merge partial charts
  updateJob(jobId, {
    status: 'processing',
    progress: 'Merging chart data...',
    progressPercent: 60
  });

  const mergedChart = mergePartialCharts(partialCharts);

  // 4. Continue with executive summary and slides
  // ... rest of normal flow
}

function mergePartialCharts(partialCharts) {
  // Combine timeColumns (deduplicate)
  const allTimeColumns = partialCharts.flatMap(c => c.timeColumns);
  const uniqueTimeColumns = [...new Set(allTimeColumns)].sort();

  // Combine data arrays
  const allData = partialCharts.flatMap(c => c.data);

  return {
    timeColumns: uniqueTimeColumns,
    data: allData
  };
}
```

**Note:** This is a complex enhancement requiring careful testing. Recommended for Phase 3 only after Phase 1 and 2 are stable.

---

### 3.2 Add Monitoring and Alerts

**Goal:** Proactive detection of failures

**Implementation Steps:**

#### Step 3.2.1: Add Metrics Collection
**File:** `server/analytics.js` (extend existing)
**Action:** Track AI API performance metrics

**Code to Add:**
```javascript
export class MetricsCollector {
  constructor() {
    this.metrics = {
      aiRequests: [],
      responseSizes: [],
      responseTimes: [],
      failures: []
    };
  }

  recordAIRequest(data) {
    this.metrics.aiRequests.push({
      timestamp: Date.now(),
      requestSize: data.requestSize,
      responseSize: data.responseSize,
      responseTime: data.responseTime,
      success: data.success,
      errorType: data.errorType
    });

    // Keep only last 1000 requests
    if (this.metrics.aiRequests.length > 1000) {
      this.metrics.aiRequests.shift();
    }
  }

  getStats() {
    const recent = this.metrics.aiRequests.slice(-100);
    const responseSizes = recent.map(r => r.responseSize).filter(s => s);
    const responseTimes = recent.map(r => r.responseTime).filter(t => t);

    return {
      totalRequests: this.metrics.aiRequests.length,
      successRate: recent.filter(r => r.success).length / recent.length,
      avgResponseSize: responseSizes.reduce((a, b) => a + b, 0) / responseSizes.length,
      avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      failureRate: recent.filter(r => !r.success).length / recent.length
    };
  }

  checkForAnomalies() {
    const stats = this.getStats();
    const alerts = [];

    // Alert if response sizes near truncation point
    if (stats.avgResponseSize > 55000) {
      alerts.push({
        type: 'RESPONSE_SIZE_WARNING',
        message: `Average response size (${stats.avgResponseSize}) approaching 60KB truncation threshold`,
        severity: 'warning'
      });
    }

    // Alert if failure rate high
    if (stats.failureRate > 0.2) {
      alerts.push({
        type: 'HIGH_FAILURE_RATE',
        message: `AI failure rate at ${(stats.failureRate * 100).toFixed(1)}%`,
        severity: 'critical'
      });
    }

    return alerts;
  }
}

export const metricsCollector = new MetricsCollector();
```

#### Step 3.2.2: Integrate Metrics into Gemini API
**File:** `server/gemini.js`
**Action:** Record metrics for every API call

**Code to Add:**
```javascript
import { metricsCollector } from './analytics.js';

// In callGeminiAPI function
const startTime = Date.now();
const requestSize = prompt.length + (research?.length || 0);

try {
  const response = await axios.post(/* ... */);
  const responseTime = Date.now() - startTime;
  const responseSize = response?.candidates?.[0]?.content?.parts?.[0]?.text?.length || 0;

  metricsCollector.recordAIRequest({
    requestSize,
    responseSize,
    responseTime,
    success: true
  });

  return response;
} catch (error) {
  const responseTime = Date.now() - startTime;

  metricsCollector.recordAIRequest({
    requestSize,
    responseSize: 0,
    responseTime,
    success: false,
    errorType: error.constructor.name
  });

  throw error;
}
```

#### Step 3.2.3: Add Monitoring Dashboard Endpoint
**File:** `server/routes/analytics.js`
**Action:** Expose metrics via API

**Code to Add:**
```javascript
import { metricsCollector } from '../analytics.js';

router.get('/monitoring/metrics', (req, res) => {
  const stats = metricsCollector.getStats();
  const alerts = metricsCollector.checkForAnomalies();

  res.json({
    stats,
    alerts,
    timestamp: new Date().toISOString()
  });
});

router.get('/monitoring/health', (req, res) => {
  const stats = metricsCollector.getStats();

  const isHealthy = (
    stats.successRate > 0.8 && // 80% success rate
    stats.avgResponseSize < 55000 // Not near truncation
  );

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    stats
  });
});
```

---

### 3.3 Cache Optimization

**Goal:** Reduce redundant AI calls, faster retries

**Implementation Steps:**

#### Step 3.3.1: Implement Partial Result Caching
**File:** `server/storage.js`
**Action:** Cache intermediate results

**Code to Add:**
```javascript
// Add to storage.js
const partialResultsCache = new Map();

export function cachePartialResult(jobId, phase, result) {
  if (!partialResultsCache.has(jobId)) {
    partialResultsCache.set(jobId, {});
  }

  partialResultsCache.get(jobId)[phase] = {
    result,
    timestamp: Date.now()
  };

  console.log(`[Cache] Stored partial result for job ${jobId}, phase: ${phase}`);
}

export function getPartialResult(jobId, phase) {
  const jobCache = partialResultsCache.get(jobId);
  if (!jobCache || !jobCache[phase]) {
    return null;
  }

  // Partial results valid for 1 hour
  const age = Date.now() - jobCache[phase].timestamp;
  if (age > 3600000) {
    console.log(`[Cache] Partial result expired for job ${jobId}, phase: ${phase}`);
    return null;
  }

  console.log(`[Cache] Retrieved partial result for job ${jobId}, phase: ${phase}`);
  return jobCache[phase].result;
}

export function clearPartialResults(jobId) {
  partialResultsCache.delete(jobId);
}
```

#### Step 3.3.2: Use Partial Cache in Chart Generation
**File:** `server/routes/charts.js`
**Action:** Resume from last successful phase

**Code to Modify:**
```javascript
async function processChartGeneration(jobId, prompt, research, sessionId) {
  try {
    // Check for cached partial results
    let ganttData = getPartialResult(jobId, 'ganttChart');

    if (!ganttData) {
      // Phase 1: Generate chart
      updateJob(jobId, { status: 'processing', progress: 'Generating chart...' });
      ganttData = await callGeminiAPI(/* ... */);
      cachePartialResult(jobId, 'ganttChart', ganttData);
    } else {
      console.log(`[Chart Generation] Using cached ganttData for job ${jobId}`);
    }

    // Phase 2: Executive summary
    let executiveSummary = getPartialResult(jobId, 'executiveSummary');

    if (!executiveSummary) {
      updateJob(jobId, { status: 'processing', progress: 'Creating summary...' });
      executiveSummary = await callGeminiAPI(/* ... */);
      cachePartialResult(jobId, 'executiveSummary', executiveSummary);
    } else {
      console.log(`[Chart Generation] Using cached executiveSummary for job ${jobId}`);
    }

    // ... similar for slides

    // Success: clear partial cache
    clearPartialResults(jobId);

  } catch (error) {
    // Keep partial results for retry
    console.log(`[Chart Generation] Partial results preserved for retry`);
    throw error;
  }
}
```

---

### 3.4 Testing Phase 3 Enhancements

**Test Suite:**

#### Test 3.4.1: Progressive Processing
```bash
# Upload 80KB research (2 chunks)
# Expected:
# - Progress: "Processing chunk 1/2...", "Processing chunk 2/2..."
# - Progress: "Merging chart data..."
# - Final chart includes data from both chunks
# - timeColumns merged and deduplicated
```

#### Test 3.4.2: Monitoring
```bash
# Access monitoring endpoints:
GET /api/monitoring/metrics
# Expected: JSON with stats, alerts

GET /api/monitoring/health
# Expected: 200 status if healthy, 503 if degraded

# Generate multiple charts to populate metrics
# Check for anomaly alerts if responses large
```

#### Test 3.4.3: Partial Caching
```bash
# Generate chart, interrupt during executive summary phase
# Retry same job
# Expected:
# - Logs show "Using cached ganttData"
# - Chart phase skipped, goes straight to summary
# - Total time reduced by ~50%
```

**Success Criteria for Phase 3:**
- [ ] Inputs > 50KB processed via chunking
- [ ] Monitoring dashboard shows real-time metrics
- [ ] Alerts triggered for anomalies (>55KB responses, >20% failure rate)
- [ ] Partial result caching speeds up retries
- [ ] Health endpoint accurate

---

## Implementation Checklist

### Phase 1 (P0) - MUST DO
- [ ] 1.1.1: Review current file validation logic
- [ ] 1.1.2: Add total research size validation (with semantic mode suggestion)
- [ ] 1.1.3: Update frontend error handling for size limits
- [ ] 1.2.1: Investigate Gemini API maxOutputTokens configuration
- [ ] 1.2.2: Set explicit maxOutputTokens in API calls
- [ ] 1.2.3: Add response size logging
- [ ] 1.2.4: Add truncation detection and warnings
- [ ] 1.3.1: Verify JSON schema includes required: ["timeColumns", "data"]
- [ ] 1.3.2: Update prompt with CRITICAL REQUIREMENT section
- [ ] 1.3.3: Add pre-validation before jsonrepair attempts
- [ ] 1.4: Run full Phase 1 test suite

### Phase 2 (P1) - SHOULD DO
- [ ] 2.1.1: Enhance Gemini API error logging
- [ ] 2.1.2: Add structured error code constants
- [ ] 2.1.3: Update job error tracking with codes
- [ ] 2.1.4: Add debug response capture (dev only)
- [ ] 2.2.1: Add job timeout config to server/config.js
- [ ] 2.2.2: Implement dynamic timeout based on input size
- [ ] 2.2.3: Update client polling to use server timeout
- [ ] 2.2.4: Implement exponential backoff for retries
- [ ] 2.3.1: Add progress percent and time estimates
- [ ] 2.3.2: Add progress bar to frontend
- [ ] 2.3.3: Add "What's taking so long?" info box
- [ ] 2.4: Run full Phase 2 test suite

### Phase 3 (P2) - NICE TO HAVE
- [ ] 3.1.1: Implement chunkResearch() utility
- [ ] 3.1.2: Implement progressive chart generation
- [ ] 3.1.2: Implement chart merging logic
- [ ] 3.2.1: Create MetricsCollector class
- [ ] 3.2.2: Integrate metrics into Gemini API calls
- [ ] 3.2.3: Add monitoring dashboard endpoints
- [ ] 3.3.1: Implement partial result caching
- [ ] 3.3.2: Use partial cache in chart generation
- [ ] 3.4: Run full Phase 3 test suite

---

## Rollback Plan

### If Phase 1 Causes Issues

**Symptoms:** Legitimate uploads failing, too restrictive validation

**Rollback Steps:**
1. Revert changes to `server/routes/charts.js` (input size validation)
2. Revert changes to `Public/main.js` (error handling)
3. Keep logging enhancements from 1.2.3 and 1.2.4 (helpful for debugging)
4. Investigate why validation too aggressive

**Safe Rollback:** Phase 1 changes are isolated to validation logic, easy to revert without affecting other systems.

### If Phase 2 Causes Issues

**Symptoms:** Extended timeouts causing user frustration, exponential backoff too slow

**Rollback Steps:**
1. Revert `CONFIG.JOB` settings to original values
2. Keep error logging improvements (2.1.x)
3. Remove progress bar if causing rendering issues
4. Restore original polling timeout

**Safe Rollback:** Config changes can be reverted via `server/config.js` without code changes.

### If Phase 3 Causes Issues

**Symptoms:** Chunking breaks chart coherence, caching causes stale data

**Rollback Steps:**
1. Disable progressive processing (set chunk size to Infinity)
2. Disable partial result caching (comment out cache calls)
3. Keep monitoring endpoints (read-only, no side effects)

**Safe Rollback:** Phase 3 is additive, can be disabled without removing code.

---

## Deployment Strategy

### Development Environment
1. Implement Phase 1 fixes
2. Test locally with various input sizes (10KB, 40KB, 60KB, 100KB)
3. Verify logs show expected behavior
4. Run unit tests if available

### Staging Environment (if available)
1. Deploy Phase 1 + 2 together
2. Test with real-world research documents
3. Monitor for 24 hours
4. Verify analytics tracking failures correctly

### Production Deployment
1. Deploy Phase 1 only initially
2. Monitor for 48 hours
3. If stable, deploy Phase 2
4. Monitor for 1 week
5. Deploy Phase 3 as enhancement (not critical path)

### Railway-Specific Considerations

**Environment Variables:**
```bash
# Add to Railway dashboard:
NODE_ENV=production
JOB_TIMEOUT_MS=300000          # 5 minutes (default)
JOB_LARGE_INPUT_TIMEOUT_MS=600000  # 10 minutes
MAX_RESEARCH_CHARS=50000       # 50KB
SEMANTIC_MAX_RESEARCH_CHARS=100000  # 100KB
```

**Database Persistence:**
- Warning: SQLite on Railway is ephemeral
- Consider migrating to Railway Postgres for production
- Partial result cache will be lost on restart (acceptable for Phase 3)

---

## Success Metrics

### Phase 1 Success
- **Primary:** 0 JSON truncation errors at 60,001 characters
- **Primary:** 0 missing timeColumns errors
- **Primary:** 100% rejection of inputs > 50KB in standard mode
- **Secondary:** Clear error messages for oversized inputs
- **Secondary:** Detailed logs for all AI responses

### Phase 2 Success
- **Primary:** Large inputs (30-50KB) complete within 10-minute timeout
- **Primary:** Exponential backoff reduces retry storms
- **Primary:** Users see progress updates every 30 seconds
- **Secondary:** Error codes standardized across all failures
- **Secondary:** Debug responses saved in development

### Phase 3 Success
- **Primary:** Inputs 50-100KB processed via chunking
- **Primary:** Partial caching speeds up retries by >40%
- **Secondary:** Monitoring dashboard accessible
- **Secondary:** Anomaly alerts trigger for degraded performance

---

## Future Improvements (Beyond This Fix)

1. **Streaming Responses:** Use Gemini streaming API for real-time progress
2. **Semantic Mode Integration:** Auto-switch to semantic mode for large inputs
3. **Queue System:** Bull or similar for robust job processing
4. **Database Migration:** Move from SQLite to PostgreSQL for persistence
5. **Frontend Framework:** Migrate to React/Vue for better state management
6. **API Rate Limiting:** Per-user limits to prevent abuse
7. **Multi-Model Support:** Fallback to GPT-4 if Gemini fails
8. **Progressive Web App:** Offline support, background processing

---

## Appendix A: File Modification Summary

### Files to Modify (Phase 1)
1. `server/routes/charts.js` - Input validation, truncation detection, schema validation
2. `server/config.js` - Error codes (if needed)
3. `server/gemini.js` - maxOutputTokens, response logging
4. `server/prompts.js` - Clarify timeColumns requirement
5. `Public/main.js` - Error handling for RESEARCH_TOO_LARGE

### Files to Modify (Phase 2)
1. `server/config.js` - Job timeout configuration
2. `server/routes/charts.js` - Dynamic timeout, exponential backoff, progress estimates
3. `server/gemini.js` - Enhanced error logging
4. `Public/main.js` - Progress bar, dynamic timeout, info boxes

### Files to Modify (Phase 3)
1. `server/utils.js` - chunkResearch() function
2. `server/routes/charts.js` - Progressive processing, partial caching
3. `server/storage.js` - Partial result cache
4. `server/analytics.js` - MetricsCollector class
5. `server/gemini.js` - Metrics integration
6. `server/routes/analytics.js` - Monitoring endpoints

### New Files to Create
- None (all changes in existing files)

---

## Appendix B: Testing Script Templates

### Test Script 1: Input Size Validation
```bash
#!/bin/bash
# test_input_validation.sh

echo "Test 1: Small input (should succeed)"
curl -X POST http://localhost:3000/generate-chart \
  -F "files=@small_research.txt" \
  -F "prompt=Create roadmap"

echo "Test 2: Large input 60KB (should suggest semantic mode)"
curl -X POST http://localhost:3000/generate-chart \
  -F "files=@large_research_60kb.txt" \
  -F "prompt=Create roadmap"

echo "Test 3: Very large input 120KB (should reject)"
curl -X POST http://localhost:3000/generate-chart \
  -F "files=@very_large_research_120kb.txt" \
  -F "prompt=Create roadmap"
```

### Test Script 2: Job Timeout
```bash
#!/bin/bash
# test_job_timeout.sh

# Start job
RESPONSE=$(curl -s -X POST http://localhost:3000/generate-chart \
  -F "files=@medium_research.txt" \
  -F "prompt=Create roadmap")

JOB_ID=$(echo $RESPONSE | jq -r '.jobId')

echo "Job ID: $JOB_ID"

# Poll for 10 minutes
for i in {1..600}; do
  STATUS=$(curl -s http://localhost:3000/job/$JOB_ID | jq -r '.status')
  echo "[$i/600] Status: $STATUS"

  if [ "$STATUS" == "complete" ]; then
    echo "✅ Job completed successfully"
    exit 0
  fi

  if [ "$STATUS" == "error" ]; then
    echo "❌ Job failed"
    curl -s http://localhost:3000/job/$JOB_ID | jq '.'
    exit 1
  fi

  sleep 1
done

echo "⏱️  Job timed out after 600 seconds"
```

---

## Appendix C: Related Documentation

- **Error Analysis:** `error desc_1.md`
- **Codebase Guide:** `CLAUDE.md`
- **API Documentation:** `readme.md`
- **Configuration Guide:** `server/config.js` (inline comments)
- **Testing Guide:** `TESTING.md`

---

## Sign-Off

**Plan Author:** AI Assistant (Claude)
**Plan Date:** 2025-11-21
**Plan Version:** 1.0
**Estimated Effort:** 3-5 days (24-40 hours)
**Risk Level:** Medium (touching critical path, but changes isolated)

**Approval Required From:**
- Technical Lead: [ ]
- QA Lead: [ ]
- Product Owner: [ ]

**Pre-Implementation Review:**
- [ ] All team members have read this plan
- [ ] Test environment prepared
- [ ] Rollback plan understood
- [ ] Monitoring in place for production

---

**END OF IMPLEMENTATION PLAN**
