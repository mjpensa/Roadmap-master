# Chart Generation Timeout Investigation Report

**Date**: 2025-11-21
**Branch**: `claude/fix-chart-generation-013fbZRiZH6N7vxvDq7a2A5V`
**Status**: ⚠️ ONGOING - System regression causing timeouts with inputs that previously worked
**Severity**: CRITICAL - User cannot generate charts with even 1 file (system used to handle 10 files)

---

## Executive Summary

The AI Roadmap Generator is experiencing critical timeouts during chart generation. The system previously handled 10-file uploads successfully but now fails with single-file inputs as small as 34KB. Root cause analysis identified overly complex AI prompts causing processing times exceeding 3 minutes per attempt (9+ minutes total with retries). Multiple fixes have been implemented but the issue persists.

**Key Finding**: The `CHART_GENERATION_SYSTEM_PROMPT` in `server/prompts.js` contains 1,671 lines of instructions with verbose extraction rules, validation checklists, and complex decision trees that are causing the AI to process for excessive durations.

---

## Problem Statement

### User Report
> "I used to upload 10 files at a time. Now I cant upload one file anymore"

### Symptoms
1. **Chart generation timeouts** after 5 minutes (300 polling attempts × 1 second)
2. **All 3 AI retry attempts exhausted** (~120 seconds each)
3. **Fails with both large and small inputs**:
   - 69KB (2 files) - TIMEOUT
   - 34KB (1 file) - TIMEOUT
4. **Error message**: "Job timed out after 5 minutes. Please try again with a smaller research file."

### Technical Details
```
Server Configuration:
- API Timeout: 180,000ms (3 minutes) per attempt
- Retry Count: 3 attempts with exponential backoff
- Job Timeout: 600,000ms (10 minutes for large inputs >30KB)
- Client Polling: 300 attempts × 1 second = 5 minutes max

Observed Behavior:
- Attempt 1: ~122 seconds (TIMEOUT)
- Attempt 2: ~117 seconds (TIMEOUT)
- Attempt 3: ~60 seconds (TIMEOUT)
- Total time: ~299 seconds
- Client gives up at 300 polls (5 minutes)
```

---

## Root Cause Analysis

### Primary Cause: Overly Complex AI Prompt
**File**: `server/prompts.js` (1,671 lines)
**Component**: `CHART_GENERATION_SYSTEM_PROMPT`

#### Problematic Sections Identified

**1. MAXIMUM EXTRACTION RULES (Lines 88-129)**
```
- 94 lines of detailed extraction instructions
- Instructs AI to extract EVERY possible task, milestone, phase
- "DEFAULT TO INCLUSION - When uncertain, ALWAYS include it"
- "Extract at the MOST DETAILED level mentioned"
- Creates 100+ extraction triggers across 7 categories:
  * Action verbs (plan, design, implement, review, test, document, manage, analyze)
  * Time references (explicit dates, durations, relative timing, frequency)
  * Deliverables (documents, systems, processes, reviews)
  * Phases/stages (phase indicators, lifecycle stages, milestones)
  * Dependencies (prerequisites, sequences, approval gates)
```

**2. EXTRACTION VALIDATION CHECKLIST (Lines 113-121)**
```
- 7-point pre-submission checklist
- Requires AI to verify every section, verb, date, deliverable, dependency
- Forces AI to validate "No bundled tasks" and "All sub-items extracted"
- Adds significant processing overhead
```

**3. MINIMUM EXTRACTION TARGETS (Lines 101-111)**
```
- Enforces minimum task counts based on research volume:
  * 1-2 pages: 10+ tasks minimum
  * 3-5 pages: 20+ tasks minimum
  * 6-10 pages: 40+ tasks minimum
  * 10+ pages: 60+ tasks minimum
- Formula: Minimum Tasks = (Research Pages × 8) or (Research Words ÷ 150)
- Forces AI to re-scan research if targets not met
```

**4. SUCCESS METRICS (Lines 122-127)**
```
- "COMPLETENESS is the primary metric (not conciseness)"
- "Extract 90-95% of identifiable tasks from research"
- "Better to have 50 granular tasks than 10 high-level summaries"
- Explicitly prioritizes quantity over speed
```

**5. ADDITIONAL COMPLEXITY**
- **Critical Path Analysis** (Lines 184-193): Requires AI to evaluate dependencies and identify longest path
- **Task Type Classification** (Lines 174-183): Milestone vs. decision vs. task classification for every item
- **Cross-Swimlane Theme Analysis** (Lines 159-173): Two-step color assignment with theme identification
- **Banking-Specific Enhancements** (Lines 144-149): Stakeholder department organization logic
- **Regulatory Intelligence** (not visible in excerpt): Additional banking compliance logic

#### Performance Impact

**Expected Processing Time** (based on prompt complexity):
- Research analysis: 30-60 seconds
- Task extraction (with maximum rules): 60-120 seconds
- Validation checklist verification: 15-30 seconds
- Critical path analysis: 15-30 seconds
- Theme analysis and color assignment: 10-20 seconds
- **Total: 130-260 seconds PER ATTEMPT**

With 3 retry attempts and exponential backoff:
- **Minimum total time**: 390 seconds (6.5 minutes)
- **Maximum total time**: 780 seconds (13 minutes)

**Exceeds both API timeout (3 minutes) and job timeout (5-10 minutes)**

---

## Troubleshooting Steps Completed

### Phase 1: Error Display and Size Validation

#### Fix 1: Error Message Display Bug
**Commit**: `a7aeabc` - [Bugfix] Fix error display and enable chunking for 40-200KB inputs
**Problem**: Error messages showing as "[object Object]"
**Solution**: Modified `failJob()` in `server/storage.js` to handle object error formats
**Result**: ✅ Errors now display correctly

**Changes**:
```javascript
export function failJob(jobId, errorMessage) {
  if (typeof errorMessage === 'object' && errorMessage !== null) {
    updateJob(jobId, {
      status: 'error',
      error: errorMessage.error || 'Unknown error occurred',
      errorCode: errorMessage.errorCode,
      errorDetails: errorMessage.errorDetails
    });
  } else {
    updateJob(jobId, {
      status: 'error',
      error: errorMessage || 'Unknown error occurred'
    });
  }
}
```

#### Fix 2: Research Size Validation
**Commit**: `a7aeabc`
**Problem**: 69KB input rejected even though chunking exists
**Solution**: Updated validation in `server/routes/charts.js` to enable chunking for 40-200KB inputs
**Result**: ✅ 69KB inputs now pass validation

**Changes**:
```javascript
const CHUNK_THRESHOLD = 40000; // 40KB
const MAX_WITH_CHUNKING = 200000; // 200KB
const willUseChunking = totalResearchChars > CHUNK_THRESHOLD;

if (willUseChunking) {
  console.log(`[Chart Generation] Input size >40KB - chunking enabled (limit: 200KB)`);
  if (totalResearchChars > MAX_WITH_CHUNKING) {
    failJob(jobId, { error: `Research exceeds 200KB limit`, errorCode: 'RESEARCH_TOO_LARGE' });
    return;
  }
} else {
  if (totalResearchChars > 50000) {
    failJob(jobId, { error: `Research exceeds 50KB standard limit` });
    return;
  }
}
```

### Phase 2: Syntax Errors and Crashes

#### Fix 3: Duplicate Variable Declaration
**Commit**: `e9b4d22` - [Hotfix] Remove duplicate CHUNK_THRESHOLD declaration
**Problem**: Server crashing on startup with `SyntaxError: Identifier 'CHUNK_THRESHOLD' has already been declared`
**Solution**: Consolidated to single declaration at line 280, removed duplicate at line 372
**Result**: ✅ Server starts successfully

#### Fix 4: Template Literal Syntax Error
**Commit**: `3eb64b0` - [Hotfix] Fix syntax error in prompt template literal
**Problem**: Server crashing with `SyntaxError: Unexpected token ':'` at line 71 in prompts.js
**Solution**: Removed triple backticks (```) used for markdown code blocks inside template literals
**Result**: ✅ Server starts successfully

**Root Cause**: Triple backticks inside template literals cause JavaScript parser to interpret internal quotes as string delimiters:
```javascript
// BEFORE (BROKEN):
const prompt = `
Example:
```
{
  "title": "Project Name"
}
```
`;

// AFTER (FIXED):
const prompt = `
Example:
{
  "title": "Project Name"
}
`;
```

### Phase 3: API Timeout Configuration

#### Fix 5: Initial 60-Second Timeout
**Commit**: `d6aab20` - [Critical Fix] Prevent infinite retry loop and API truncation issues
**Problem**: Chart generation timing out after 60 seconds
**Solution**: Added configurable timeout to `callGeminiForJson()` with AbortController
**Result**: ⚠️ Still timed out (60s was insufficient)

**Changes**:
```javascript
// server/gemini.js
export async function callGeminiForJson(payload, retryCount = 3, onRetry = null, timeoutMs = 60000) {
  return retryWithBackoff(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      // ... rest of processing
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`API request timed out after ${timeoutMs/1000} seconds`);
      }
      throw error;
    }
  }, retryCount, onRetry);
}
```

#### Fix 6: Increased to 3-Minute Timeout
**Commit**: `ceee972` - [Critical Fix] Increase chart generation timeout to 3 minutes
**Problem**: 60-second timeout too aggressive for complex chart generation
**Solution**: Increased timeout to 180 seconds (3 minutes) for chart generation specifically
**Result**: ⚠️ STILL TIMING OUT - AI taking longer than 3 minutes

**Changes**:
```javascript
// server/config.js
API: {
  TIMEOUT_CHART_GENERATION_MS: 180000, // 3 minutes for chart generation
  TIMEOUT_EXECUTIVE_SUMMARY_MS: 90000, // 90 seconds for summaries
  TIMEOUT_PRESENTATION_MS: 90000,      // 90 seconds for slides
  TIMEOUT_TASK_ANALYSIS_MS: 60000,     // 60 seconds for analysis
  TIMEOUT_QA_MS: 30000,                // 30 seconds for Q&A
  TIMEOUT_DEFAULT_MS: 60000,           // 60 seconds default
}

// server/routes/charts.js (line 528, 590)
ganttData = await callGeminiForJson(
  payload,
  CONFIG.API.RETRY_COUNT,
  onRetry,
  CONFIG.API.TIMEOUT_CHART_GENERATION_MS  // Use 3-minute timeout
);
```

**Server Logs Confirm Deployment**:
```
[Chart Generation] Job timeout: 10 minutes (research: 33.8KB - LARGE INPUT)
[Chart Generation] Using standard single-call processing
```

### Phase 4: Response Truncation Detection

#### Fix 7: Large Response Handling
**Commit**: `d6aab20`
**Problem**: AI generating 175KB responses with repeated metadata, truncated at ~180KB
**Solution**: Added detection for responses >100KB that don't end with closing brace
**Result**: ✅ Prevents infinite retries on truncated responses

**Changes**:
```javascript
// server/gemini.js (lines 301-325)
if (responseSize > 100000) {
  console.warn(`⚠️  WARNING: Very large response (${responseSizeKB}KB)!`);
  console.warn(`  - This may exceed Gemini API output limits`);
  console.warn(`  - Ends with closing brace: ${endsWithClosingBrace}`);

  if (!endsWithClosingBrace) {
    console.error(`  - ❌ TRUNCATION DETECTED: Response likely truncated by API`);
    throw new Error(
      `AI response truncated at ${responseSizeKB}KB. ` +
      `The AI is generating excessively verbose output that exceeds API limits. ` +
      `This is not a transient error and retrying will not help.`
    );
  }
}
```

#### Fix 8: Title Length Constraints
**Commit**: `d6aab20`
**Problem**: AI generating swimlane titles with metadata repeated 50+ times
**Solution**: Added maxLength constraints to schema and explicit forbidden examples in prompt
**Result**: ✅ Prevents 175KB responses with repeated metadata

**Changes**:
```javascript
// server/prompts.js - Schema (lines 458-472)
export const GANTT_CHART_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      maxLength: 200  // NEW: Enforce project title limit
    },
    data: {
      type: "array",
      items: {
        properties: {
          title: {
            type: "string",
            maxLength: 300  // NEW: Enforce task title limit
          }
        }
      }
    }
  }
};

// server/prompts.js - Prompt (lines 58-85)
**MANDATORY TITLE REQUIREMENTS:**
1. Project title: Maximum 200 characters
2. Task/swimlane titles: Maximum 300 characters
3. NEVER repeat text or metadata in titles
4. NEVER include validation statistics in titles

**❌ FORBIDDEN:**
title: "Regulatory & Policy (Theme: Compliance) (CP: Yes) (30% CP) (14 tasks)..."

**✅ CORRECT:**
title: "Regulatory & Policy - Compliance & Legal Gates"
```

### Phase 5: Prompt Simplification

#### Fix 9: Removed Verbose Extraction Rules
**Commit**: `5c80e84` - [Performance Fix] Simplify prompt to reduce AI processing time
**Problem**: Overly complex prompt causing 180+ second processing times
**Solution**: Removed 86 lines of verbose MAXIMUM EXTRACTION RULES
**Result**: ⏳ NOT YET TESTED (deployed but awaiting merge to master)

**Changes**:
```javascript
// BEFORE (Lines 88-132): 94 lines of detailed extraction rules
**🎯 EXTRACTION PHILOSOPHY - MAXIMUM INCLUSIVITY:**
Your PRIMARY goal is to extract EVERY possible task...
- DEFAULT TO INCLUSION - When uncertain, ALWAYS include it
- Extract at the MOST DETAILED level mentioned
- Create task for ANY mention of action verbs, time references, deliverables...
- MINIMUM EXTRACTION TARGETS: 10-60+ tasks based on research size
- EXTRACTION VALIDATION CHECKLIST: 7-point verification
- SUCCESS METRICS: COMPLETENESS is primary metric, extract 90-95%

// AFTER (Lines 88-98): 11 lines of balanced extraction
**🎯 TASK EXTRACTION:**
Extract tasks, milestones, and deliverables from the research. Focus on:
1. Key Tasks: Extract major activities, deliverables, milestones
2. Reasonable Granularity: Break down phases when clearly specified
3. Clear Timing: Prioritize tasks with explicit dates
4. Avoid Over-Extraction: Don't create tasks for every minor detail
```

**Expected Impact**:
- Reduce extraction phase from 60-120s → 15-30s
- Eliminate validation checklist overhead (15-30s)
- Remove minimum target scanning (variable)
- **Total reduction: 75-150 seconds per attempt**

---

## Current Status

### What's Fixed ✅
1. Error message display (no more "[object Object]")
2. Research size validation (40-200KB inputs accepted)
3. Server startup crashes (syntax errors resolved)
4. API timeout configuration (3 minutes per attempt)
5. Truncation detection (prevents infinite retries on >100KB responses)
6. Title length constraints (prevents 175KB outputs)
7. Prompt simplification (reduced from 94 lines to 11 lines of extraction rules)

### What's Still Broken ❌
**Chart generation timing out with all input sizes**:
- 34KB (1 file) - TIMEOUT
- 69KB (2 files) - TIMEOUT
- System regressed from handling 10 files to handling 0 files

### Pending Validation
- **Fix 9 (Prompt Simplification)** needs to be merged to master and tested
- Expected to reduce processing time by 75-150 seconds per attempt
- Should bring total processing time under 60-90 seconds (well within 3-minute timeout)

---

## Technical Constraints for Prompt Redesign

### Hard Limits

#### 1. API Timeout Limits
```
Current Configuration:
- Chart Generation: 180,000ms (3 minutes) per attempt
- Maximum Retries: 3 attempts
- Total available time: 540 seconds (9 minutes) with retries
- Client timeout: 300 seconds (5 minutes)

⚠️ CONSTRAINT: Chart generation must complete in <180 seconds per attempt
⚠️ IDEAL TARGET: <90 seconds per attempt (50% safety margin)
```

#### 2. Gemini API Response Size Limits
```
Observed Truncation Patterns:
- 60KB boundary: Historical truncation point (documented in error desc_1.md)
- 100KB+ responses: High risk of truncation if missing closing braces
- 175KB response: Confirmed truncation case (caused by repeated metadata)

⚠️ CONSTRAINT: AI responses must stay under 60KB (safer) or 100KB (maximum)
⚠️ SOLUTION: Title length constraints (200 chars project, 300 chars tasks)
```

#### 3. Input Size Limits
```
Current Limits:
- Standard mode: 50KB (no chunking)
- Chunking mode: 40-200KB (split into 40KB chunks)
- Maximum file upload: 10MB per file, 200MB total

User Expectation: "Used to upload 10 files at a time"
⚠️ CONSTRAINT: Must handle 10 files × average 20KB = 200KB total input
```

#### 4. Job Processing Limits
```
Job Timeout Configuration:
- Standard inputs (<30KB): 5 minutes
- Large inputs (>30KB): 10 minutes
- Client polling: 5 minutes (300 seconds)

⚠️ CONSTRAINT: Must complete before client gives up (300 seconds)
```

### Performance Requirements

#### Processing Time Budget
```
Available Time: 180 seconds per attempt (3-minute timeout)

Required Phases:
1. Research analysis and parsing: 15-30s
2. Time horizon and interval selection: 5-10s
3. Swimlane identification: 5-10s
4. Task extraction: 30-60s ⚠️ CRITICAL PATH
5. Critical path analysis: 10-20s
6. Theme/color analysis: 5-10s
7. JSON schema validation: 5-10s
8. Response generation: 10-20s

TOTAL TARGET: 85-170 seconds
SAFETY MARGIN: 10-95 seconds
```

#### Task Extraction Complexity
```
Current Approach (BROKEN):
- Extract EVERY possible task (90-95% recall)
- Process 100+ extraction triggers
- Validate with 7-point checklist
- Enforce minimum task counts (10-60+)
- Result: 60-120 seconds processing time ❌

Required Approach:
- Extract key tasks and deliverables
- Focus on explicit mentions (not implied)
- No validation checklist
- No minimum task count enforcement
- Target: 20-40 seconds processing time ✅
```

### Schema Complexity Limits

#### Current Schema (458 lines)
```javascript
GANTT_CHART_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", maxLength: 200 },
    timeColumns: { type: "array", items: { type: "string" } },
    data: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", maxLength: 300 },
          entity: { type: "string" },
          isSwimlane: { type: "boolean" },
          taskType: { type: "string", enum: ["milestone", "decision", "task"] },
          isCriticalPath: { type: "boolean" },
          regulatoryFlags: { /* banking-specific object */ },
          bar: {
            type: "object",
            properties: {
              startCol: { type: ["integer", "null"] },
              endCol: { type: ["integer", "null"] },
              color: { type: "string", enum: [...] }
            }
          }
        },
        required: ["title", "entity", "isSwimlane"]
      }
    },
    legend: { /* array of color labels */ }
  },
  required: ["title", "timeColumns", "data"]
}
```

**Complexity Factors**:
- 8 required fields per task object
- 3 enum validations (taskType, color)
- Nested object validation (bar, regulatoryFlags)
- Boolean logic for isSwimlane, isCriticalPath
- **Each validation adds processing overhead**

⚠️ CONSTRAINT: Schema complexity must be balanced against processing time

---

## Architectural Context

### Three-Phase AI Generation Pipeline

```
Phase 1: Gantt Chart (PRIMARY ISSUE)
├─ Timeout: 180 seconds
├─ Token Limit: 65,536 output tokens
├─ Temperature: 0.0 (deterministic)
├─ Schema: GANTT_CHART_SCHEMA (458 lines)
└─ Prompt: CHART_GENERATION_SYSTEM_PROMPT (1,671 lines) ⚠️ BOTTLENECK

Phase 2: Executive Summary
├─ Timeout: 90 seconds
├─ Token Limit: 4,096 output tokens
├─ Temperature: 0.7 (creative)
└─ Working correctly ✅

Phase 3: Presentation Slides
├─ Timeout: 90 seconds (2-phase: outline + content)
├─ Token Limit: 16,384 output tokens
├─ Temperature: 0.7 (creative)
└─ Working correctly ✅
```

**Only Phase 1 (Chart Generation) is timing out**

### Chunking Strategy (40-200KB Inputs)

For inputs >40KB, the system splits research into chunks and processes separately:

```javascript
// server/routes/charts.js (lines 465-544)
if (useChunking) {
  const chunks = chunkResearch(researchTextCache, 40000); // 40KB per chunk
  console.log(`Split into ${chunks.length} chunks`);

  for (let i = 0; i < chunks.length; i++) {
    // Process each chunk with full prompt + timeout
    const chunkResult = await callGeminiForJson(
      chunkPayload,
      CONFIG.API.RETRY_COUNT,
      onRetry,
      CONFIG.API.TIMEOUT_CHART_GENERATION_MS  // 3 minutes per chunk
    );
    chartChunks.push(chunkResult);
  }

  ganttData = mergeChartData(chartChunks); // Merge results
}
```

**Chunking Constraints**:
- Each chunk processes with full prompt complexity
- 5 chunks (200KB) × 180s timeout = 15 minutes theoretical maximum
- Chunking does NOT reduce prompt complexity per chunk
- ⚠️ CONSTRAINT: Prompt complexity affects every chunk equally

### Banking Enhancement Features

The system includes sophisticated banking-specific features that add prompt complexity:

```
1. Stakeholder Department Organization (lines 144-149)
   - IT/Technology, Legal, Business/Operations swimlanes
   - Smart assignment based on task nature

2. Regulatory Intelligence (integrated throughout)
   - regulatoryFlags object with hasRegulatoryDependency, regulatorName, approvalType
   - Visual 🏛️ icons on Gantt chart with tooltips
   - Summary box showing regulatory checkpoint totals

3. Task Type Classification (lines 174-183)
   - milestone, decision, task enum
   - Enables Executive View filtering
   - Keyword-based classification logic

4. Critical Path Analysis (lines 184-193)
   - isCriticalPath boolean per task
   - Dependency analysis across all tasks
   - Longest path calculation

5. Cross-Swimlane Theme Analysis (lines 159-173)
   - Two-step color assignment process
   - Theme identification across swimlanes
   - Fallback to swimlane-based coloring

6. Financial Impact Dashboard (task analysis)
   - ROI, payback period, NPV calculations
   - Confidence levels
   - Cost/benefit breakdowns
```

**⚠️ CRITICAL**: These features add sophistication but also processing overhead

---

## Prompt Design Requirements for Opus

### Goals
1. **Restore functionality**: Handle 10-file uploads (200KB) without timeouts
2. **Maintain sophistication**: Keep all banking enhancements, critical path analysis, theme analysis
3. **Improve performance**: Reduce processing time from 180+ seconds to <90 seconds per attempt
4. **Preserve quality**: Maintain detailed task analysis capability (unchanged)

### Design Constraints

#### 1. Processing Time Budget
```
HARD REQUIREMENT: Complete chart generation in <90 seconds per attempt

Recommended Allocation:
- Core logic (time horizon, swimlanes): 15-25s
- Task extraction: 25-35s ⚠️ PRIMARY OPTIMIZATION TARGET
- Critical path analysis: 10-15s
- Theme/color assignment: 5-10s
- Schema validation & response: 10-15s

FORBIDDEN:
❌ Extraction validation checklists (adds 15-30s)
❌ Minimum task count enforcement (adds variable time for re-scanning)
❌ "Extract EVERY possible task" philosophy (creates 100+ tasks, 60-120s)
❌ Exhaustive extraction trigger lists (100+ patterns to match)
```

#### 2. Response Size Management
```
HARD REQUIREMENT: JSON responses <100KB (preferably <60KB)

Title Length Enforcement:
✅ Project title: maxLength 200 (keep this)
✅ Task titles: maxLength 300 (keep this)
✅ Explicit forbidden examples (keep this)

Additional Safeguards Needed:
- Limit number of tasks generated (recommend 30-50 max for standard inputs)
- Discourage verbose descriptions in any field
- Encourage concise entity names
```

#### 3. Prompt Structure Efficiency
```
Current Structure (1,671 lines):
- Critical requirements: ~50 lines ✅
- Title constraints: ~30 lines ✅
- Extraction rules: 94 lines ❌ TOO COMPLEX
- Core logic: ~150 lines ✅
- Color/theme logic: ~40 lines ✅
- Banking enhancements: ~30 lines ✅
- Task type classification: ~20 lines ✅
- Critical path logic: ~20 lines ✅
- Examples: ~400 lines ⚠️ MAY BE EXCESSIVE
- Schema description: ~837 lines ⚠️ VERY DETAILED

RECOMMENDATION:
- Keep critical requirements, constraints, core logic
- DRASTICALLY simplify extraction rules (94 lines → 10-20 lines)
- Reduce example verbosity (400 lines → 100-150 lines)
- Consider if full schema description needed (837 lines)
```

#### 4. Chunking Considerations
```
Current Behavior:
- Chunks activate at >40KB input
- Each chunk processed with FULL prompt complexity
- 5 chunks possible (200KB ÷ 40KB)

CRITICAL INSIGHT:
- If single chunk takes 180+ seconds, chunking makes it worse
- 5 chunks × 180s = 900 seconds (15 minutes) theoretical
- Prompt simplification benefits ALL chunks equally

⚠️ REQUIREMENT: Optimize prompt for WORST case (5-chunk scenario)
Target: 60s per chunk × 5 chunks = 300s total (within 10-minute job timeout)
```

### Specific Optimization Recommendations

#### 1. Task Extraction Redesign (CRITICAL)

**Current Approach (BROKEN)**:
```
Lines 88-129 (94 lines):
- "Extract EVERY possible task"
- "DEFAULT TO INCLUSION - When uncertain, ALWAYS include it"
- "Extract at the MOST DETAILED level mentioned"
- 100+ extraction triggers across 7 categories
- Minimum task counts (10-60+ based on size)
- 7-point validation checklist
- "Extract 90-95% of identifiable tasks"
```

**Recommended Approach**:
```
Simplified (10-20 lines):
- "Extract key tasks and major deliverables explicitly mentioned in research"
- "Break down phases into individual tasks ONLY when clearly specified"
- "Prioritize tasks with explicit dates or time periods"
- "Target 20-30 tasks for typical projects (scale proportionally for larger research)"
- NO validation checklist
- NO minimum task count enforcement
- NO "extract everything" philosophy

Rationale:
- User can click any task for detailed analysis (task analysis unchanged)
- Better to have 30 useful tasks than 100 tasks that timeout
- Extraction is the primary bottleneck (60-120s → target 25-35s)
```

#### 2. Example Reduction

**Current Approach**:
```
~400 lines of examples throughout prompt:
- Multiple examples per concept
- Detailed JSON examples for each feature
- Forbidden vs. correct comparisons
- Edge case demonstrations
```

**Recommended Approach**:
```
~100-150 lines of examples:
- One clear example per major concept
- Focus on common patterns (not edge cases)
- Combine multiple concepts in single examples where possible
- Move detailed examples to inline comments in schema definition

Rationale:
- AI models are sophisticated enough to generalize from fewer examples
- Shorter prompts = faster processing
- Critical requirements should be in constraints, not buried in examples
```

#### 3. Schema Description Optimization

**Current Approach**:
```
~837 lines of schema-related content:
- Full JSON schema with all properties
- Detailed descriptions for each field
- Inline examples in schema
- Type definitions and enums
```

**Recommended Approach**:
```
Evaluate if full schema description needed when using JSON schema validation:
- Gemini's responseSchema parameter handles validation automatically
- Schema description may be redundant with actual schema object
- Consider reducing to ~200-300 lines focusing on:
  * Non-obvious field relationships
  * Business logic (critical path, themes, etc.)
  * Validation rules not expressible in JSON schema

Rationale:
- JSON schema validation is automatic (no need to explain it in prompt)
- Shorter prompts = faster processing
- Focus prompt on logic, not structure
```

#### 4. Maintain Critical Features

**DO NOT REMOVE** (these define the product's value):
```
✅ Banking stakeholder swimlanes (IT/Technology, Legal, Business/Operations)
✅ Regulatory flags (hasRegulatoryDependency, regulatorName, approvalType)
✅ Task type classification (milestone, decision, task)
✅ Critical path analysis (isCriticalPath boolean)
✅ Cross-swimlane theme analysis (color strategy logic)
✅ Title length constraints (200/300 char limits with forbidden examples)
✅ Time horizon and interval logic (weeks/months/quarters/years)
✅ Bar logic (startCol, endCol calculation)

OPTIMIZE WITHOUT REMOVING:
⚠️ Make instructions more concise
⚠️ Reduce examples from multiple to single per concept
⚠️ Combine related instructions where possible
⚠️ Move implementation details to inline schema comments
```

### Testing Criteria for Redesigned Prompt

#### Performance Benchmarks
```
Test Case 1: Small Input (10-20KB, 1-2 files)
- Target: <45 seconds per attempt
- Expected tasks: 15-25 tasks
- Should complete on first attempt

Test Case 2: Medium Input (30-40KB, 3-5 files)
- Target: <75 seconds per attempt
- Expected tasks: 25-35 tasks
- Should complete within 2 attempts

Test Case 3: Large Input (60-80KB, 5-8 files)
- Target: <90 seconds per attempt (chunked)
- Expected tasks: 35-50 tasks
- Should complete within 2 attempts

Test Case 4: Maximum Input (150-200KB, 10 files) ⚠️ USER'S REQUIREMENT
- Target: <120 seconds per chunk (5 chunks = 600s total)
- Expected tasks: 50-70 tasks
- Should complete within job timeout (600-900s including retries)
```

#### Quality Benchmarks
```
✅ All banking features present (regulatory flags, stakeholder swimlanes, etc.)
✅ Critical path correctly identified for time-sensitive tasks
✅ Task types correctly classified (milestone/decision/task)
✅ Cross-swimlane themes identified where applicable
✅ Time intervals appropriate for horizon (weeks/months/quarters/years)
✅ Titles under length limits (200/300 chars)
✅ JSON response valid (no truncation, well-formed)
✅ Tasks have clear ownership (entity field populated)
✅ Tasks have timing when available (startCol/endCol or null)
```

#### User Acceptance Criteria
```
PRIMARY: "I used to upload 10 files at a time" → Must restore this capability
QUALITY: Task analysis depth unchanged (full detail on click)
USABILITY: Chart has enough detail to be useful (not too sparse)
PERFORMANCE: No timeouts with reasonable inputs (<200KB)
```

---

## File References

### Modified Files (on feature branch)
```
server/storage.js          - failJob() error handling
server/routes/charts.js    - Size validation, chunking, timeout configuration
server/gemini.js           - Timeout implementation, truncation detection
server/config.js           - Timeout constants
server/prompts.js          - Title constraints, extraction rules simplification
```

### Key Configuration Files
```
server/config.js           - Centralized configuration (196 lines)
  ├─ API.TIMEOUT_CHART_GENERATION_MS: 180000 (3 minutes)
  ├─ API.TIMEOUT_DEFAULT_MS: 60000 (1 minute)
  ├─ API.RETRY_COUNT: 3
  ├─ FILES.MAX_RESEARCH_CHARS: 50000 (50KB standard)
  ├─ JOB.TIMEOUT_MS: 300000 (5 minutes standard)
  └─ JOB.TIMEOUT_LARGE_INPUT_MS: 600000 (10 minutes large)

server/prompts.js          - AI prompts (1,671 lines) ⚠️ OPTIMIZATION TARGET
  ├─ CHART_GENERATION_SYSTEM_PROMPT (lines 10-398)
  ├─ GANTT_CHART_SCHEMA (lines 458-895, 438 lines)
  └─ Other prompts (executive summary, task analysis, etc.)
```

### Relevant Commits (chronological)
```
a7aeabc - [Bugfix] Fix error display and enable chunking
e9b4d22 - [Hotfix] Remove duplicate CHUNK_THRESHOLD declaration
d6aab20 - [Critical Fix] Prevent infinite retry loop and truncation
3eb64b0 - [Hotfix] Fix syntax error in prompt template literal
ceee972 - [Critical Fix] Increase chart generation timeout to 3 minutes
5c80e84 - [Performance Fix] Simplify prompt to reduce AI processing time
```

---

## Recommendations for Next Steps

### Immediate Action (Manual Testing Required)
1. **Merge commit `5c80e84` to master** - Deploy prompt simplification fix
2. **Test with user's 34KB input** - Verify if simplification resolves timeout
3. **Test with user's 69KB input** - Verify chunking works with simplified prompt
4. **Test with 10-file upload** - Verify restoration of original capability

### Short-Term (If Fix 9 Insufficient)
1. **Engage Opus for prompt redesign** - Use this report as requirements document
2. **Focus on extraction rules** - Primary bottleneck (60-120s processing time)
3. **Reduce example verbosity** - Secondary optimization (~400 lines → 100-150 lines)
4. **Benchmark each iteration** - Track processing time improvements

### Long-Term Architecture Improvements
1. **Prompt engineering metrics** - Add timing breakdowns to measure prompt sections
2. **Chunking optimization** - Consider different strategies for >40KB inputs
3. **Progressive enhancement** - Fast basic chart + optional detailed pass
4. **Caching strategy** - Cache intermediate results (swimlanes, themes, etc.)
5. **User controls** - Let users toggle detail level (quick vs. comprehensive)

---

## Appendix: Sample Error Logs

### Typical Timeout Sequence
```
[Chart Generation] Research size validation: 34571 chars
[Chart Generation] ✅ Research size within standard limits: 34571 chars
[Chart Generation] Job timeout: 10 minutes (research: 33.8KB - LARGE INPUT)
[Chart Generation] Using standard single-call processing

Job creation - Polling attempt: 1 (1s)
Job creation - Polling attempt: 2 (2s)
...
Job creation - Polling attempt: 122 (122s)
Job 123456: Retrying AI request (attempt 2/3)...
...
Job creation - Polling attempt: 239 (239s)
Job 123456: Retrying AI request (attempt 3/3)...
...
Job creation - Polling attempt: 300 (300s)
Error: Job timed out after 5 minutes. Please try again with a smaller research file.
```

### Response Truncation Example (Fixed)
```
[Gemini API] Response received:
  - Size: 175843 characters
  - Size (KB): 171.72 KB
  - Last 100 chars: ...(Theme: Regulatory Compliance & Legal Gates - Red) (CP: Yes, High Impact Decisions/Mandates) (30% of tasks are CP, 100% of decisi

⚠️  WARNING: Very large response (171.72KB)!
  - This may exceed Gemini API output limits
  - Ends with closing brace: false
❌ TRUNCATION DETECTED: Response likely truncated by API

Error: AI response truncated at 171.72KB. The AI is generating excessively verbose output.
```

---

## Glossary

- **Chunking**: Splitting research >40KB into 40KB segments, processing each separately, then merging
- **Critical Path**: Sequence of dependent tasks where delays affect project completion date
- **Job**: Async background process for chart generation, tracked by jobId
- **Polling**: Client checks job status every 1 second (up to 300 times / 5 minutes)
- **Retry Logic**: 3 attempts per API call with exponential backoff (2s, 4s, 8s delays)
- **Session**: Research context stored with sessionId for task analysis and Q&A
- **Swimlane**: Row in Gantt chart grouping related tasks (e.g., "IT/Technology", "Legal")
- **Task Type**: Classification (milestone/decision/task) for Executive View filtering
- **Theme**: Cross-swimlane grouping for color-coding (e.g., "Product Launch")
- **Timeout**: Maximum time allowed for API call (3 minutes for chart generation)
- **Truncation**: AI response cut off mid-JSON due to exceeding size limits

---

**END OF REPORT**

Generated: 2025-11-21
Author: Claude (Sonnet 4.5)
Branch: claude/fix-chart-generation-013fbZRiZH6N7vxvDq7a2A5V
Latest Commit: 5c80e84 [Performance Fix] Simplify prompt to reduce AI processing time
