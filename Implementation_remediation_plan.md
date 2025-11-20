# Implementation Plan: Gemini API Schema Constraint Remediation

## Document Information
- **Created**: 2025-11-20
- **Based on**: remediation_plan
- **Objective**: Fix Gemini API "Schema produces too many states" error
- **Target Files**: server/prompts.js, server/routes/charts.js
- **Estimated Time**: 3-4 hours
- **Risk Level**: Low (follows proven pattern from commit 4c8951b)

---

## Overview

This implementation plan addresses the Gemini API rejection error caused by excessive schema complexity in `GANTT_CHART_SCHEMA`. The solution moves constraint validation from the JSON schema to post-generation code validation, following the established pattern from the PRESENTATION_SLIDES_SCHEMA fix.

**Key Principle**: Separate structure definition (in schema) from constraint enforcement (in code).

---

## Pre-Implementation Checklist

### Environment Preparation
- [ ] Ensure development environment is running
- [ ] Verify tests are passing: `npm test`
- [ ] Confirm API key is configured in `.env`
- [ ] Check git status is clean: `git status`
- [ ] Verify current branch: `claude/remediation-implementation-plan-01H4eqVURhCU9zCQNqKbqRXs`

### Backup Strategy
- [ ] Create backup of `server/prompts.js`
- [ ] Create backup of `server/routes/charts.js`
- [ ] Commit current state before changes: `git commit -m "[Backup] Pre-remediation snapshot"`

### Testing Preparation
- [ ] Identify test file that currently fails (upload research file that triggers error)
- [ ] Save test file path for validation testing
- [ ] Document current error message for comparison

---

## Implementation Phases

## Phase 1: Schema Simplification (30-45 minutes)

### Step 1.1: Locate GANTT_CHART_SCHEMA
**File**: `server/prompts.js`
**Line Range**: ~525-589

**Action**:
```bash
# Open the file and locate the schema
grep -n "export const GANTT_CHART_SCHEMA" server/prompts.js
```

**Expected Output**: Line number where schema starts

---

### Step 1.2: Analyze Current Schema Structure
**Action**: Read and document current schema constraints

**Current Constraints to Document**:
- `minLength: 1` on string fields
- `maxLength: 200` on string fields
- `minItems: 1` on array fields
- `maxItems: 500` on data array
- `maxItems: 200` on timeColumns array
- `maxItems: 20` on legend array

**Tool**: Create a constraint mapping table

| Field Path | Type | Current Constraints | Action |
|-----------|------|---------------------|--------|
| title | string | minLength: 1, maxLength: 200 | REMOVE |
| timeColumns | array | minItems: 1, maxItems: 200 | REMOVE |
| timeColumns[*] | string | minLength: 1, maxLength: 50 | REMOVE |
| data | array | minItems: 1, maxItems: 500 | REMOVE |
| data[*].title | string | minLength: 1, maxLength: 200 | REMOVE |
| legend | array | maxItems: 20 | REMOVE |
| ... | ... | ... | ... |

---

### Step 1.3: Create Simplified Schema
**File**: `server/prompts.js`
**Action**: Replace GANTT_CHART_SCHEMA with simplified version

**Implementation**:
```javascript
// BEFORE (lines ~525-589):
export const GANTT_CHART_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      minLength: 1,      // REMOVE THIS
      maxLength: 200     // REMOVE THIS
    },
    timeColumns: {
      type: "array",
      minItems: 1,       // REMOVE THIS
      maxItems: 200,     // REMOVE THIS
      items: {
        type: "string",
        minLength: 1,    // REMOVE THIS
        maxLength: 50    // REMOVE THIS
      }
    },
    data: {
      type: "array",
      minItems: 1,       // REMOVE THIS
      maxItems: 500,     // REMOVE THIS
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            minLength: 1,      // REMOVE THIS
            maxLength: 200     // REMOVE THIS
          },
          // ... other properties
        }
      }
    },
    legend: {
      type: "array",
      maxItems: 20       // REMOVE THIS
    }
  },
  required: ["title", "timeColumns", "data"]
};

// AFTER:
export const GANTT_CHART_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string"
      // Constraints removed - enforced in validateConstraints()
    },
    timeColumns: {
      type: "array",
      items: {
        type: "string"
      }
    },
    data: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          entity: { type: "string" },
          isSwimlane: { type: "boolean" },
          startCol: { type: "number" },
          endCol: { type: "number" },
          colorClass: { type: "string" },
          regulatoryFlags: {
            type: "object",
            properties: {
              hasRegulatoryDependency: { type: "boolean" },
              regulatorName: { type: "string" },
              approvalType: { type: "string" },
              deadline: { type: "string" },
              criticalityLevel: { type: "string" }
            }
          }
        },
        required: ["title", "isSwimlane"]
      }
    },
    legend: {
      type: "array",
      items: {
        type: "object",
        properties: {
          color: { type: "string" },
          label: { type: "string" },
          description: { type: "string" }
        },
        required: ["color", "label"]
      }
    }
  },
  required: ["title", "timeColumns", "data"]
};
```

**Key Changes**:
- ✅ KEEP: `type` definitions (object, string, array, number, boolean)
- ✅ KEEP: `properties` structure
- ✅ KEEP: `required` arrays
- ✅ KEEP: Nested object definitions
- ❌ REMOVE: All `minLength`, `maxLength` constraints
- ❌ REMOVE: All `minItems`, `maxItems` constraints

---

### Step 1.4: Verify Schema Syntax
**Action**: Check for syntax errors

```bash
# Attempt to load the file (will error if syntax is invalid)
node -e "import('./server/prompts.js').then(() => console.log('✓ Syntax valid')).catch(e => console.error('✗ Syntax error:', e))"
```

**Expected Output**: `✓ Syntax valid`

---

### Step 1.5: Document Schema Changes
**Action**: Add comment block above schema

```javascript
/**
 * GANTT_CHART_SCHEMA - Simplified for Gemini API compatibility
 *
 * This schema defines the STRUCTURE of the expected JSON output but does NOT
 * enforce constraints (min/max lengths, array sizes). Constraint validation
 * is performed post-generation in validateConstraints() function in charts.js.
 *
 * Rationale: Complex constraints create combinatorial state explosion that
 * exceeds Gemini's schema validation limits (400 error: "too many states").
 *
 * Pattern: Follows the same approach as PRESENTATION_SLIDES_SCHEMA (commit 4c8951b)
 *
 * Last Updated: 2025-11-20
 * Related Issue: Gemini API schema constraint error
 */
export const GANTT_CHART_SCHEMA = {
  // ... simplified schema
};
```

---

## Phase 2: Post-Generation Constraint Validation (60-90 minutes)

### Step 2.1: Locate Integration Point
**File**: `server/routes/charts.js`
**Line Range**: ~283-298

**Action**: Find where `callGeminiForJson` returns ganttData

```javascript
// Current code (around line 283):
const ganttData = await callGeminiForJson(
  prompt,
  GANTT_CHART_SCHEMA,
  CHART_GENERATION_SYSTEM_PROMPT,
  research,
  CONFIG.AI.CHART_GENERATION_TOKENS,
  CONFIG.AI.TEMPERATURE_DETERMINISTIC
);

// Existing validation (lines 286-298)
if (!ganttData || typeof ganttData !== 'object') {
  throw new Error('AI returned invalid data structure');
}

// ... more existing code
```

**Expected Output**: Line numbers confirmed

---

### Step 2.2: Design validateConstraints Function
**Action**: Create comprehensive validation function

**Location**: Insert BEFORE the `processChartGeneration` function (around line 120)

```javascript
/**
 * Validates chart data constraints that were removed from GANTT_CHART_SCHEMA
 * for Gemini API compatibility. Enforces limits on string lengths, array sizes,
 * and required fields.
 *
 * @param {Object} ganttData - The chart data object returned from AI
 * @throws {Error} Descriptive error if any constraint is violated
 * @returns {void}
 */
function validateConstraints(ganttData) {
  // === Title Validation ===
  if (!ganttData.title || typeof ganttData.title !== 'string') {
    throw new Error('Chart title is required and must be a string');
  }
  if (ganttData.title.trim().length === 0) {
    throw new Error('Chart title cannot be empty or whitespace-only');
  }
  if (ganttData.title.length > 200) {
    throw new Error(
      `Chart title exceeds 200 characters (got ${ganttData.title.length}). ` +
      `Title: "${ganttData.title.substring(0, 50)}..."`
    );
  }

  // === TimeColumns Validation ===
  if (!Array.isArray(ganttData.timeColumns)) {
    throw new Error(
      `timeColumns must be an array (got ${typeof ganttData.timeColumns})`
    );
  }
  if (ganttData.timeColumns.length === 0) {
    throw new Error('timeColumns array cannot be empty - at least one time period required');
  }
  if (ganttData.timeColumns.length > 200) {
    throw new Error(
      `timeColumns exceeds maximum of 200 items (got ${ganttData.timeColumns.length}). ` +
      `Consider grouping time periods or reducing granularity.`
    );
  }

  // Validate each time column string
  ganttData.timeColumns.forEach((col, index) => {
    if (typeof col !== 'string') {
      throw new Error(
        `timeColumns[${index}] must be a string (got ${typeof col})`
      );
    }
    if (col.trim().length === 0) {
      throw new Error(
        `timeColumns[${index}] cannot be empty or whitespace-only`
      );
    }
    if (col.length > 50) {
      throw new Error(
        `timeColumns[${index}] exceeds 50 characters (got ${col.length}): "${col}"`
      );
    }
  });

  // === Data Array Validation ===
  if (!Array.isArray(ganttData.data)) {
    throw new Error(
      `data must be an array (got ${typeof ganttData.data})`
    );
  }
  if (ganttData.data.length === 0) {
    throw new Error('data array cannot be empty - at least one task required');
  }
  if (ganttData.data.length > 500) {
    throw new Error(
      `data array exceeds maximum of 500 items (got ${ganttData.data.length}). ` +
      `Consider splitting into multiple charts or consolidating tasks.`
    );
  }

  // === Task Item Validation ===
  ganttData.data.forEach((task, index) => {
    // Task must be an object
    if (!task || typeof task !== 'object') {
      throw new Error(
        `Task at index ${index} must be an object (got ${typeof task})`
      );
    }

    // Title validation
    if (!task.title || typeof task.title !== 'string') {
      throw new Error(
        `Task at index ${index} must have a title string (got ${typeof task.title})`
      );
    }
    if (task.title.trim().length === 0) {
      throw new Error(
        `Task at index ${index} has empty title`
      );
    }
    if (task.title.length > 200) {
      throw new Error(
        `Task at index ${index} title exceeds 200 characters (got ${task.title.length}): ` +
        `"${task.title.substring(0, 50)}..."`
      );
    }

    // Entity validation (optional field, but if present must be string)
    if (task.entity !== undefined) {
      if (typeof task.entity !== 'string') {
        throw new Error(
          `Task "${task.title}" has invalid entity type (got ${typeof task.entity})`
        );
      }
      if (task.entity.length > 200) {
        throw new Error(
          `Task "${task.title}" entity exceeds 200 characters (got ${task.entity.length})`
        );
      }
    }

    // isSwimlane validation
    if (task.isSwimlane !== undefined && typeof task.isSwimlane !== 'boolean') {
      throw new Error(
        `Task "${task.title}" isSwimlane must be boolean (got ${typeof task.isSwimlane})`
      );
    }

    // Column index validation (only for non-swimlane tasks)
    if (!task.isSwimlane) {
      if (typeof task.startCol !== 'number') {
        throw new Error(
          `Task "${task.title}" startCol must be a number (got ${typeof task.startCol})`
        );
      }
      if (typeof task.endCol !== 'number') {
        throw new Error(
          `Task "${task.title}" endCol must be a number (got ${typeof task.endCol})`
        );
      }
      if (task.startCol < 0) {
        throw new Error(
          `Task "${task.title}" startCol cannot be negative (got ${task.startCol})`
        );
      }
      if (task.endCol < task.startCol) {
        throw new Error(
          `Task "${task.title}" endCol (${task.endCol}) must be >= startCol (${task.startCol})`
        );
      }
      if (task.endCol >= ganttData.timeColumns.length) {
        throw new Error(
          `Task "${task.title}" endCol (${task.endCol}) exceeds timeColumns length (${ganttData.timeColumns.length})`
        );
      }
    }

    // Color class validation
    if (task.colorClass !== undefined) {
      if (typeof task.colorClass !== 'string') {
        throw new Error(
          `Task "${task.title}" colorClass must be a string (got ${typeof task.colorClass})`
        );
      }
      const validColors = [
        'priority-red', 'medium-red', 'mid-grey', 'light-grey',
        'white', 'dark-blue'
      ];
      if (!validColors.includes(task.colorClass)) {
        throw new Error(
          `Task "${task.title}" has invalid colorClass "${task.colorClass}". ` +
          `Valid options: ${validColors.join(', ')}`
        );
      }
    }

    // Regulatory flags validation (if present)
    if (task.regulatoryFlags) {
      if (typeof task.regulatoryFlags !== 'object') {
        throw new Error(
          `Task "${task.title}" regulatoryFlags must be an object`
        );
      }
      // Validate individual regulatory flag fields
      const flags = task.regulatoryFlags;
      if (flags.regulatorName && flags.regulatorName.length > 100) {
        throw new Error(
          `Task "${task.title}" regulatorName exceeds 100 characters`
        );
      }
      if (flags.approvalType && flags.approvalType.length > 100) {
        throw new Error(
          `Task "${task.title}" approvalType exceeds 100 characters`
        );
      }
      if (flags.deadline && flags.deadline.length > 50) {
        throw new Error(
          `Task "${task.title}" regulatory deadline exceeds 50 characters`
        );
      }
      if (flags.criticalityLevel) {
        const validLevels = ['low', 'medium', 'high'];
        if (!validLevels.includes(flags.criticalityLevel)) {
          throw new Error(
            `Task "${task.title}" invalid criticalityLevel "${flags.criticalityLevel}". ` +
            `Valid options: ${validLevels.join(', ')}`
          );
        }
      }
    }
  });

  // === Legend Validation (optional) ===
  if (ganttData.legend !== undefined) {
    if (!Array.isArray(ganttData.legend)) {
      throw new Error(
        `legend must be an array (got ${typeof ganttData.legend})`
      );
    }
    if (ganttData.legend.length > 20) {
      throw new Error(
        `legend exceeds maximum of 20 items (got ${ganttData.legend.length})`
      );
    }

    ganttData.legend.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        throw new Error(
          `legend[${index}] must be an object`
        );
      }
      if (!item.color || typeof item.color !== 'string') {
        throw new Error(
          `legend[${index}] must have a color string`
        );
      }
      if (!item.label || typeof item.label !== 'string') {
        throw new Error(
          `legend[${index}] must have a label string`
        );
      }
      if (item.label.length > 100) {
        throw new Error(
          `legend[${index}] label exceeds 100 characters`
        );
      }
    });
  }

  // All validations passed
  return;
}
```

---

### Step 2.3: Integrate Validation into Processing Flow
**File**: `server/routes/charts.js`
**Location**: After line 283 (after `callGeminiForJson` returns)

**Action**: Add validation call between existing validations

```javascript
// Around line 283 - EXISTING CODE:
const ganttData = await callGeminiForJson(
  prompt,
  GANTT_CHART_SCHEMA,
  CHART_GENERATION_SYSTEM_PROMPT,
  research,
  CONFIG.AI.CHART_GENERATION_TOKENS,
  CONFIG.AI.TEMPERATURE_DETERMINISTIC
);

// EXISTING VALIDATION (lines 286-298):
if (!ganttData || typeof ganttData !== 'object') {
  throw new Error('AI returned invalid data structure');
}

// === NEW: ADD CONSTRAINT VALIDATION HERE ===
console.log('[Chart Generation] Validating constraints...');
try {
  validateConstraints(ganttData);
  console.log('[Chart Generation] ✓ All constraints validated successfully');
} catch (constraintError) {
  console.error('[Chart Generation] ✗ Constraint validation failed:', constraintError.message);
  throw new Error(`Chart data validation failed: ${constraintError.message}`);
}

// EXISTING PHASE 2 VALIDATION (lines 300+):
const extractionResults = validateExtraction(ganttData, parsedContent);
// ... rest of existing code continues unchanged
```

---

### Step 2.4: Add Logging for Debugging
**Action**: Enhance error context for troubleshooting

```javascript
// Within validateConstraints function, add summary logging at the start:
function validateConstraints(ganttData) {
  console.log('[Constraint Validation] Starting validation...');
  console.log(`[Constraint Validation] Chart: "${ganttData.title || 'UNTITLED'}"`);
  console.log(`[Constraint Validation] Time columns: ${ganttData.timeColumns?.length || 0}`);
  console.log(`[Constraint Validation] Tasks: ${ganttData.data?.length || 0}`);
  console.log(`[Constraint Validation] Legend items: ${ganttData.legend?.length || 0}`);

  // ... validation logic ...

  // At the end:
  console.log('[Constraint Validation] ✓ All validations passed');
}
```

---

## Phase 3: Testing & Validation (45-60 minutes)

### Step 3.1: Unit Test for validateConstraints
**File**: `tests/unit/charts.test.js` (NEW)

**Action**: Create comprehensive unit tests

```javascript
import { describe, it, expect } from '@jest/globals';

// Note: Need to export validateConstraints for testing
// In charts.js, add: export { validateConstraints }; (for testing only)

describe('validateConstraints', () => {
  describe('Title Validation', () => {
    it('should reject empty title', () => {
      const data = { title: '', timeColumns: ['Q1'], data: [{ title: 'Task', isSwimlane: false, startCol: 0, endCol: 0 }] };
      expect(() => validateConstraints(data)).toThrow('title cannot be empty');
    });

    it('should reject title exceeding 200 characters', () => {
      const longTitle = 'A'.repeat(201);
      const data = { title: longTitle, timeColumns: ['Q1'], data: [{ title: 'Task', isSwimlane: false, startCol: 0, endCol: 0 }] };
      expect(() => validateConstraints(data)).toThrow('exceeds 200 characters');
    });

    it('should accept valid title', () => {
      const data = { title: 'Valid Chart', timeColumns: ['Q1'], data: [{ title: 'Task', isSwimlane: false, startCol: 0, endCol: 0 }] };
      expect(() => validateConstraints(data)).not.toThrow();
    });
  });

  describe('TimeColumns Validation', () => {
    it('should reject empty timeColumns array', () => {
      const data = { title: 'Chart', timeColumns: [], data: [{ title: 'Task', isSwimlane: false, startCol: 0, endCol: 0 }] };
      expect(() => validateConstraints(data)).toThrow('timeColumns array cannot be empty');
    });

    it('should reject timeColumns exceeding 200 items', () => {
      const data = {
        title: 'Chart',
        timeColumns: Array(201).fill('Q1'),
        data: [{ title: 'Task', isSwimlane: false, startCol: 0, endCol: 0 }]
      };
      expect(() => validateConstraints(data)).toThrow('exceeds maximum of 200 items');
    });

    it('should accept valid timeColumns', () => {
      const data = { title: 'Chart', timeColumns: ['Q1', 'Q2', 'Q3'], data: [{ title: 'Task', isSwimlane: false, startCol: 0, endCol: 2 }] };
      expect(() => validateConstraints(data)).not.toThrow();
    });
  });

  describe('Data Array Validation', () => {
    it('should reject empty data array', () => {
      const data = { title: 'Chart', timeColumns: ['Q1'], data: [] };
      expect(() => validateConstraints(data)).toThrow('data array cannot be empty');
    });

    it('should reject data exceeding 500 tasks', () => {
      const tasks = Array(501).fill({ title: 'Task', isSwimlane: false, startCol: 0, endCol: 0 });
      const data = { title: 'Chart', timeColumns: ['Q1'], data: tasks };
      expect(() => validateConstraints(data)).toThrow('exceeds maximum of 500 items');
    });

    it('should accept valid data array', () => {
      const data = {
        title: 'Chart',
        timeColumns: ['Q1'],
        data: [
          { title: 'Task 1', isSwimlane: false, startCol: 0, endCol: 0 },
          { title: 'Task 2', isSwimlane: false, startCol: 0, endCol: 0 }
        ]
      };
      expect(() => validateConstraints(data)).not.toThrow();
    });
  });

  describe('Task Validation', () => {
    it('should reject task with empty title', () => {
      const data = {
        title: 'Chart',
        timeColumns: ['Q1'],
        data: [{ title: '', isSwimlane: false, startCol: 0, endCol: 0 }]
      };
      expect(() => validateConstraints(data)).toThrow('has empty title');
    });

    it('should reject task with invalid startCol/endCol', () => {
      const data = {
        title: 'Chart',
        timeColumns: ['Q1'],
        data: [{ title: 'Task', isSwimlane: false, startCol: 2, endCol: 1 }]
      };
      expect(() => validateConstraints(data)).toThrow('endCol');
    });

    it('should reject task with invalid colorClass', () => {
      const data = {
        title: 'Chart',
        timeColumns: ['Q1'],
        data: [{ title: 'Task', isSwimlane: false, startCol: 0, endCol: 0, colorClass: 'invalid-color' }]
      };
      expect(() => validateConstraints(data)).toThrow('invalid colorClass');
    });

    it('should accept swimlane without startCol/endCol', () => {
      const data = {
        title: 'Chart',
        timeColumns: ['Q1'],
        data: [{ title: 'Swimlane', isSwimlane: true }]
      };
      expect(() => validateConstraints(data)).not.toThrow();
    });
  });

  describe('Legend Validation', () => {
    it('should accept chart without legend', () => {
      const data = { title: 'Chart', timeColumns: ['Q1'], data: [{ title: 'Task', isSwimlane: false, startCol: 0, endCol: 0 }] };
      expect(() => validateConstraints(data)).not.toThrow();
    });

    it('should reject legend exceeding 20 items', () => {
      const legend = Array(21).fill({ color: 'red', label: 'Item' });
      const data = {
        title: 'Chart',
        timeColumns: ['Q1'],
        data: [{ title: 'Task', isSwimlane: false, startCol: 0, endCol: 0 }],
        legend
      };
      expect(() => validateConstraints(data)).toThrow('exceeds maximum of 20 items');
    });

    it('should accept valid legend', () => {
      const data = {
        title: 'Chart',
        timeColumns: ['Q1'],
        data: [{ title: 'Task', isSwimlane: false, startCol: 0, endCol: 0 }],
        legend: [{ color: 'priority-red', label: 'Critical', description: 'High priority' }]
      };
      expect(() => validateConstraints(data)).not.toThrow();
    });
  });
});
```

**Run Tests**:
```bash
npm test -- tests/unit/charts.test.js
```

---

### Step 3.2: Integration Test with Real File
**Action**: Test with the research file that currently fails

**Test Procedure**:
1. Start development server: `npm start`
2. Navigate to upload interface
3. Upload the failing research file
4. Submit chart generation request
5. Monitor server logs for:
   - `[Chart Generation] Validating constraints...`
   - `[Chart Generation] ✓ All constraints validated successfully`
6. Verify chart generates successfully

**Expected Before Fix**:
```
Error: 400 - Schema produces too many states for serving
```

**Expected After Fix**:
```
[Chart Generation] Calling Gemini API...
[Chart Generation] ✓ AI response received
[Chart Generation] Validating constraints...
[Constraint Validation] Chart: "Banking Modernization Roadmap"
[Constraint Validation] Time columns: 24
[Constraint Validation] Tasks: 45
[Constraint Validation] Legend items: 6
[Constraint Validation] ✓ All validations passed
[Chart Generation] ✓ All constraints validated successfully
[Chart Generation] Validating extraction quality...
[Chart Generation] ✓ Chart generation complete
```

---

### Step 3.3: Constraint Violation Testing
**Action**: Deliberately test constraint failures

**Test Cases**:

**Test 1: Oversized Title**
```javascript
// Modify AI response mock to return 250-character title
// Expected: Error with descriptive message about character limit
```

**Test 2: Too Many Tasks**
```javascript
// Modify AI response mock to return 501 tasks
// Expected: Error suggesting to split chart or consolidate
```

**Test 3: Invalid Column Indices**
```javascript
// Task with startCol=5, endCol=3 (reversed)
// Expected: Error explaining endCol must be >= startCol
```

**Test 4: Empty TimeColumns**
```javascript
// Chart with timeColumns: []
// Expected: Error explaining at least one time period required
```

**Manual Testing Script**:
```bash
# Create test file: tests/manual/constraint-tests.sh

#!/bin/bash

echo "Testing constraint validation..."

# Test 1: Valid data
echo "Test 1: Valid data (should succeed)"
curl -X POST http://localhost:3000/generate-chart \
  -F "files=@tests/fixtures/valid-research.txt" \
  -F "prompt=Create a simple roadmap"

# Test 2: Trigger with malformed mock
# (Requires modifying server to inject test data)

echo "All manual tests complete"
```

---

### Step 3.4: Regression Testing
**Action**: Ensure Phase 2 extraction validation still works

**Test Procedure**:
1. Generate a chart (should succeed)
2. Check server logs for extraction validation messages:
   ```
   [Chart Generation] Validating extraction quality...
   [Extraction Validation] Coverage: 85%
   [Extraction Validation] Completeness: 90%
   [Extraction Validation] ✓ Quality gates passed
   ```
3. Verify extraction metrics appear in logs
4. Confirm no regression in existing functionality

**Verification Checklist**:
- [ ] Extraction validation still runs after constraint validation
- [ ] Extraction metrics still calculated (coverage, completeness)
- [ ] Quality gates still enforced
- [ ] Logging output includes both constraint + extraction sections

---

## Phase 4: Documentation & Cleanup (30 minutes)

### Step 4.1: Update CLAUDE.md
**File**: `CLAUDE.md`
**Action**: Document the architectural change

**Add to "Common Development Tasks" section**:

```markdown
### Understanding Schema Constraint Validation

**Two-Stage Validation**:
1. **Schema Validation** (Gemini API): Structure and types only
2. **Constraint Validation** (Post-generation): Limits and business rules

**Why This Separation?**

The Gemini API has internal limits on schema complexity. Schemas with many constraints (minLength, maxLength, minItems, maxItems) create a combinatorial explosion of possible states. When this exceeds Gemini's threshold, the API rejects the request with a 400 error: "Schema produces too many states for serving".

**Solution**: Move constraint enforcement to post-generation validation in `validateConstraints()` function.

**Pattern**:
```javascript
// JSON Schema (sent to Gemini)
{
  type: "object",
  properties: {
    title: { type: "string" }  // No constraints
  }
}

// Validation Function (server-side)
function validateConstraints(data) {
  if (data.title.length > 200) {
    throw new Error('Title too long');
  }
}
```

**Location**: `server/routes/charts.js:120-350` (validateConstraints function)

**Related**: PRESENTATION_SLIDES_SCHEMA uses same pattern (commit 4c8951b)
```

---

### Step 4.2: Add Code Comments
**Action**: Document validation flow in charts.js

```javascript
// Around line 283 in charts.js:

// PHASE 1: AI Generation with simplified schema
// The schema defines structure (types, required fields) but NOT constraints
// This prevents "too many states" error from Gemini API
const ganttData = await callGeminiForJson(
  prompt,
  GANTT_CHART_SCHEMA,  // Simplified schema (no min/max constraints)
  CHART_GENERATION_SYSTEM_PROMPT,
  research,
  CONFIG.AI.CHART_GENERATION_TOKENS,
  CONFIG.AI.TEMPERATURE_DETERMINISTIC
);

// PHASE 2: Structure validation
// Verify AI returned an object (not null, undefined, or primitive)
if (!ganttData || typeof ganttData !== 'object') {
  throw new Error('AI returned invalid data structure');
}

// PHASE 3: Constraint validation
// Enforce all the constraints that were removed from the schema
// This catches AI output that violates business rules (too long, too many items, etc.)
console.log('[Chart Generation] Validating constraints...');
try {
  validateConstraints(ganttData);  // See function definition above
  console.log('[Chart Generation] ✓ All constraints validated successfully');
} catch (constraintError) {
  console.error('[Chart Generation] ✗ Constraint validation failed:', constraintError.message);
  throw new Error(`Chart data validation failed: ${constraintError.message}`);
}

// PHASE 4: Extraction quality validation
// Verify AI extracted information from research documents (Phase 2 enhancement)
// This ensures the chart reflects the uploaded research, not hallucinated data
const extractionResults = validateExtraction(ganttData, parsedContent);
```

---

### Step 4.3: Update Remediation Plan Status
**File**: `remediation_plan`
**Action**: Add implementation completion notes

```markdown
## Implementation Status

**Status**: ✅ COMPLETE
**Implemented**: 2025-11-20
**Implementation Plan**: See Implementation_remediation_plan.md

### Changes Made

1. **server/prompts.js**:
   - Simplified GANTT_CHART_SCHEMA (removed all min/max constraints)
   - Added documentation comment explaining rationale

2. **server/routes/charts.js**:
   - Added validateConstraints() function (lines 120-350)
   - Integrated constraint validation after AI generation (line 300)
   - Added comprehensive error messages with context

3. **tests/unit/charts.test.js** (NEW):
   - Created 25+ unit tests for constraint validation
   - Tests cover all constraint types and edge cases

### Verification Results

- [x] Schema simplification complete
- [x] Constraint validation function created
- [x] Integration point established
- [x] Unit tests passing
- [x] Integration test with failing file: SUCCESS
- [x] Phase 2 extraction validation: INTACT
- [x] Documentation updated

### Performance Impact

- Schema validation: Faster (simpler schema)
- Constraint validation: < 5ms additional overhead
- Overall: No measurable impact on user experience

### Error Message Improvements

**Before**: "400 - Schema produces too many states for serving" (unhelpful)
**After**: "Chart title exceeds 200 characters (got 245). Title: 'Banking Digital Transformation and Core System Mo...'" (actionable)
```

---

### Step 4.4: Create Commit Message
**Action**: Prepare detailed commit message

```bash
git add server/prompts.js server/routes/charts.js tests/unit/charts.test.js CLAUDE.md remediation_plan
git commit -m "[Fix] Resolve Gemini API schema constraint error

Problem:
- Gemini API rejected chart generation with '400 - too many states' error
- Root cause: GANTT_CHART_SCHEMA had too many nested constraints
- Constraints (minLength, maxLength, minItems, maxItems) created state explosion

Solution:
- Simplified GANTT_CHART_SCHEMA to structural definitions only
- Moved constraint validation to post-generation validateConstraints() function
- Follows proven pattern from PRESENTATION_SLIDES_SCHEMA (commit 4c8951b)

Changes:
- server/prompts.js: Removed all min/max constraints from schema
- server/routes/charts.js: Added validateConstraints() with comprehensive checks
- tests/unit/charts.test.js: Created 25+ tests for constraint validation

Impact:
- ✅ Gemini API now accepts schema successfully
- ✅ All constraints still enforced (just at different stage)
- ✅ Better error messages with context
- ✅ Phase 2 extraction validation preserved
- ✅ No functionality loss

Related: remediation_plan, Implementation_remediation_plan.md"
```

---

## Phase 5: Deployment & Monitoring (15 minutes)

### Step 5.1: Pre-Deployment Checklist
- [ ] All tests passing: `npm test`
- [ ] Integration test with failing file successful
- [ ] Phase 2 extraction validation still functional
- [ ] Documentation updated (CLAUDE.md, remediation_plan)
- [ ] Commit created and pushed to branch

---

### Step 5.2: Deployment Steps
```bash
# 1. Verify branch
git branch --show-current
# Expected: claude/remediation-implementation-plan-01H4eqVURhCU9zCQNqKbqRXs

# 2. Run final tests
npm test

# 3. Push to remote
git push -u origin claude/remediation-implementation-plan-01H4eqVURhCU9zCQNqKbqRXs

# 4. Monitor deployment logs (if auto-deploy enabled)
# Watch for successful restart and health checks
```

---

### Step 5.3: Post-Deployment Monitoring
**Action**: Monitor for errors in first 24 hours

**Key Metrics to Watch**:
1. **Error Rate**:
   - Before fix: 100% failure on complex schemas
   - After fix: Should return to baseline (<1%)

2. **Response Time**:
   - Constraint validation adds < 5ms
   - Monitor for latency increases

3. **Error Types**:
   - Watch for new constraint violation errors
   - These are GOOD (catching bad AI output)
   - Review messages for clarity

**Logging to Monitor**:
```bash
# Watch for constraint validation errors
tail -f server.log | grep "Constraint Validation"

# Expected normal output:
[Constraint Validation] Starting validation...
[Constraint Validation] Chart: "Banking Modernization"
[Constraint Validation] Time columns: 24
[Constraint Validation] Tasks: 45
[Constraint Validation] ✓ All validations passed

# Watch for extraction validation (should still appear)
tail -f server.log | grep "Extraction Validation"
```

---

### Step 5.4: User Communication
**Action**: Prepare user-facing release notes (if applicable)

```markdown
## What's Fixed

**Chart Generation Error**: Resolved issue where complex roadmaps failed with "Schema produces too many states" error.

**Impact**: You can now generate larger, more detailed roadmaps without encountering schema validation errors.

**Changes**: We've optimized how we validate chart data with the AI API, moving from schema-level constraints to post-generation validation. This has no impact on the quality of generated charts—all the same validations are still performed.

**Better Error Messages**: If the AI generates invalid data, you'll now see clear, actionable error messages explaining exactly what went wrong.
```

---

## Rollback Plan

### If Issues Arise

**Rollback Procedure**:
```bash
# 1. Revert the commit
git revert HEAD

# 2. Or restore from backup
git checkout HEAD~1 -- server/prompts.js server/routes/charts.js

# 3. Remove constraint validation tests (optional)
git rm tests/unit/charts.test.js

# 4. Push rollback
git push origin claude/remediation-implementation-plan-01H4eqVURhCU9zCQNqKbqRXs

# 5. Redeploy previous version
# (Deployment-specific steps)
```

**When to Rollback**:
- Error rate increases significantly (> 5%)
- New critical bugs discovered
- Performance degradation (> 50ms added latency)
- Phase 2 extraction validation broken

---

## Success Criteria

### Definition of Done

- [x] GANTT_CHART_SCHEMA simplified (all min/max constraints removed)
- [x] validateConstraints() function created and tested
- [x] Constraint validation integrated into chart generation flow
- [x] All unit tests passing (25+ new tests)
- [x] Integration test with previously failing file: SUCCESS
- [x] Phase 2 extraction validation: INTACT
- [x] Documentation updated (CLAUDE.md, remediation_plan, code comments)
- [x] Commit created with detailed message
- [x] Changes pushed to branch
- [x] No regression in existing functionality

### Acceptance Criteria

**Functional**:
- ✅ Charts generate successfully for previously failing research files
- ✅ All constraints still enforced (title length, array sizes, etc.)
- ✅ Error messages are descriptive and actionable
- ✅ Extraction validation (Phase 2) continues to work

**Non-Functional**:
- ✅ Response time impact < 10ms
- ✅ No breaking changes to API contracts
- ✅ Code follows existing patterns and conventions
- ✅ Test coverage for new code > 80%

---

## Risk Assessment

### Low Risk Items ✅
- Schema simplification (proven pattern from commit 4c8951b)
- Constraint validation logic (straightforward conditionals)
- Logging additions (read-only operations)

### Medium Risk Items ⚠️
- Integration point (potential for missed edge cases)
- Error message wording (user-facing)
- Performance impact (new validation overhead)

### Mitigation Strategies
- **Thorough testing**: 25+ unit tests + integration tests
- **Gradual rollout**: Monitor error rates for 24 hours
- **Rollback plan**: Can revert in < 5 minutes if needed
- **Preserved logic**: Phase 2 extraction validation untouched

---

## Timeline

### Estimated Timeline
- **Phase 1** (Schema Simplification): 30-45 minutes
- **Phase 2** (Constraint Validation): 60-90 minutes
- **Phase 3** (Testing): 45-60 minutes
- **Phase 4** (Documentation): 30 minutes
- **Phase 5** (Deployment): 15 minutes

**Total**: 3-4 hours

### Recommended Schedule
**Day 1 (Morning)**:
- 9:00 AM - 10:00 AM: Phase 1 (Schema Simplification)
- 10:00 AM - 11:30 AM: Phase 2 (Constraint Validation)
- 11:30 AM - 12:00 PM: Break

**Day 1 (Afternoon)**:
- 12:00 PM - 1:00 PM: Phase 3 (Testing)
- 1:00 PM - 1:30 PM: Phase 4 (Documentation)
- 1:30 PM - 2:00 PM: Phase 5 (Deployment)
- 2:00 PM - 2:30 PM: Monitoring and validation

---

## Appendix

### A. Constraint Mapping Reference

| Constraint Type | Old Location | New Location | Validation Logic |
|----------------|--------------|--------------|------------------|
| Title min length | GANTT_CHART_SCHEMA.properties.title.minLength | validateConstraints() line ~130 | `title.trim().length === 0` |
| Title max length | GANTT_CHART_SCHEMA.properties.title.maxLength | validateConstraints() line ~135 | `title.length > 200` |
| TimeColumns min items | GANTT_CHART_SCHEMA.properties.timeColumns.minItems | validateConstraints() line ~150 | `timeColumns.length === 0` |
| TimeColumns max items | GANTT_CHART_SCHEMA.properties.timeColumns.maxItems | validateConstraints() line ~155 | `timeColumns.length > 200` |
| Data array min items | GANTT_CHART_SCHEMA.properties.data.minItems | validateConstraints() line ~175 | `data.length === 0` |
| Data array max items | GANTT_CHART_SCHEMA.properties.data.maxItems | validateConstraints() line ~180 | `data.length > 500` |
| Task title min length | GANTT_CHART_SCHEMA.properties.data.items.properties.title.minLength | validateConstraints() line ~200 | `task.title.trim().length === 0` |
| Task title max length | GANTT_CHART_SCHEMA.properties.data.items.properties.title.maxLength | validateConstraints() line ~205 | `task.title.length > 200` |
| Legend max items | GANTT_CHART_SCHEMA.properties.legend.maxItems | validateConstraints() line ~310 | `legend.length > 20` |

### B. Error Message Templates

Use these templates for consistent error messaging:

```javascript
// String length
`${fieldName} exceeds ${maxLength} characters (got ${actualLength}). ${context}`

// Array size
`${arrayName} exceeds maximum of ${maxItems} items (got ${actualCount}). ${suggestion}`

// Empty validation
`${fieldName} cannot be empty or whitespace-only`

// Type validation
`${fieldName} must be ${expectedType} (got ${actualType})`

// Relationship validation
`${field1} (${value1}) must be ${operator} ${field2} (${value2})`
```

### C. Reference: Commit 4c8951b Pattern

**PRESENTATION_SLIDES_SCHEMA** (successful precedent):

**Before**:
```javascript
{
  type: "array",
  minItems: 3,
  maxItems: 15,
  items: { /* ... */ }
}
```

**After**:
```javascript
{
  type: "array",
  items: { /* ... */ }
}
// Constraints moved to post-generation validation
```

**Result**: Eliminated schema complexity errors for presentation generation.

---

## Notes for AI Assistant

### Implementation Approach
1. **Read files first**: Always read current files before editing
2. **Preserve existing code**: Do not modify Phase 2 extraction validation
3. **Follow patterns**: Use existing code style and conventions
4. **Test incrementally**: Validate each phase before moving to next
5. **Document changes**: Add clear comments explaining the why

### Common Pitfalls to Avoid
- ❌ Don't remove `required` arrays from schema (keep structure validation)
- ❌ Don't modify `validateExtraction()` function (Phase 2 logic)
- ❌ Don't add new dependencies (use existing Node.js + Express stack)
- ❌ Don't change API contracts (maintain backward compatibility)
- ❌ Don't skip testing (validate both success and failure paths)

### Questions to Ask Before Starting
- Is the development environment ready?
- Are tests currently passing?
- Do we have backup/rollback capability?
- Is there a test file that reproduces the error?
- Are we on the correct git branch?

---

**Document Version**: 1.0.0
**Created**: 2025-11-20
**Based on**: remediation_plan (Gemini API Schema Constraint Error)
**Status**: Ready for implementation
**Next Steps**: Begin Phase 1 - Schema Simplification
