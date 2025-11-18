# Semantic Overlay Engine - Detailed Implementation Plan
## Production Deployment Roadmap

**Date**: 2025-11-18
**Target Architecture**: Bimodal Fact/Inference System
**Implementation Lead**: Claude Sonnet 4.5
**Estimated Duration**: 4 weeks (160 hours)

---

## 📊 Executive Summary

This plan integrates the **Semantic Overlay Engine** into your existing AI Roadmap Generator, transforming it from a single-mode AI generator into a **bimodal system** that clearly separates:
- **Facts**: Explicitly stated information (100% confidence, source-cited)
- **Inferences**: AI-derived conclusions (0-99% confidence, with rationale)

**Key Innovation**: Executives can toggle between "Facts Only" and "AI-Enhanced" views in real-time.

---

## 🏗️ Current Architecture Analysis

### Existing Infrastructure (v2.2.0)

#### Backend Modules
```
server/
├── server.js              # Express entry point
├── config.js              # Centralized configuration
├── middleware.js          # Security, rate limiting, file uploads
├── storage.js             # In-memory state (sessions, charts, jobs)
├── database.js            # SQLite persistence (30-day retention)
├── gemini.js              # Gemini API client (temperature configurable)
├── prompts.js             # Roadmap generation prompts (1,671 lines)
├── prompts-research.js    # Research synthesis prompts (744 lines)
├── utils.js               # Sanitization utilities (100% test coverage)
└── routes/
    ├── charts.js          # Chart generation (async job processing)
    ├── analysis.js        # Task analysis + Q&A
    ├── research.js        # Research synthesis (8-step pipeline)
    └── analytics.js       # Usage tracking
```

#### Frontend Components
```
Public/
├── main.js                # File upload interface
├── chart-renderer.js      # Chart orchestrator
├── GanttChart.js          # Main chart component (2,227 lines)
├── DraggableGantt.js      # Drag-to-edit functionality
├── ResizableGantt.js      # Bar resizing
├── ContextMenu.js         # Color picker
├── ExecutiveSummary.js    # Strategic brief
├── PresentationSlides.js  # Slide deck generator
├── TaskAnalyzer.js        # Task analysis modal
├── ResearchSynthesizer.js # Research synthesis UI (1,836 lines)
└── Utils.js               # Shared utilities
```

#### Key Technologies
- **Runtime**: Node.js (ES6 modules)
- **Framework**: Express 4.19.2
- **Database**: better-sqlite3 12.4.1
- **AI**: Gemini 2.5 Flash Preview (configurable temperature)
- **Testing**: Jest 30.2.0 (124 tests, 69 passing)

### Current Gemini Integration

**File**: `server/gemini.js`
- ✅ Already has retry logic with exponential backoff
- ✅ Rate limit handling (429 errors)
- ✅ JSON repair via jsonrepair library
- ⚠️ Temperature is configurable but **not set to 0** by default
- ⚠️ No topK/topP enforcement for determinism
- ⚠️ No bimodal (fact/inference) data structures

**File**: `server/routes/charts.js`
- ✅ Async job processing (jobStore pattern)
- ✅ File processing (DOCX, PDF, MD, TXT)
- ✅ Three-phase generation (chart → summary → slides)
- ⚠️ No citation extraction from source documents
- ⚠️ No confidence scoring
- ⚠️ Single data structure (no fact/inference separation)

---

## 🎯 Gap Analysis

### What Exists
✅ Gemini API integration with retry logic
✅ File processing (DOCX, PDF, Markdown)
✅ JSON schema validation
✅ Async job processing infrastructure
✅ SQLite persistence layer
✅ Frontend component architecture
✅ Testing infrastructure (Jest)

### What's Missing
❌ **Zod schema library** (not installed)
❌ **Deterministic Gemini config** (temp=0, topK=1)
❌ **Bimodal data structures** (BimodalTask, BimodalDependency)
❌ **Citation extraction engine** (source quote → task mapping)
❌ **Confidence scoring system** (0.0-1.0 for inferences)
❌ **Soft repair validator** (Zod-based validation + auto-repair)
❌ **Toggle UI component** (Facts Only ↔ AI Insights)
❌ **Dependency chain resolver** (handle hidden inferences)
❌ **Banking-specific rules** (regulatory deadline detection)
❌ **Frontend filtering logic** (client-side fact/inference toggle)

---

## 📦 New Dependencies Required

```bash
npm install zod                    # Schema validation + type safety
npm install @google/generative-ai  # Official Gemini SDK (if not already installed)
```

**Justification**:
- **Zod**: Type-safe schema validation, soft repair strategy, JSON Schema generation
- **@google/generative-ai**: Official SDK may have better determinism controls than raw fetch

---

## 🗂️ File-by-File Implementation Plan

### Phase 1: Core Infrastructure (Week 1) - 40 hours

#### 1.1 Type Definitions & Schemas

**NEW FILE**: `types/SemanticGanttData.js` (ES6 module, not TypeScript)
- **Purpose**: Zod schemas for bimodal data structures
- **Size**: ~350 lines
- **Key Exports**:
  - `DataOrigin` enum (explicit/inferred/hybrid)
  - `ConfidenceScore` (0.0-1.0)
  - `Citation` schema (document, page, paragraph, quote)
  - `InferenceRationale` schema (method, explanation, confidence)
  - `BimodalTask` schema (extends current task with provenance)
  - `BimodalDependency` schema (extends current dependency)
  - `BimodalGanttData` schema (complete structure)
  - `validateAndRepairGanttData()` function
- **Dependencies**: `zod`
- **Integration Point**: Used by validation and API routes

**Code Structure**:
```javascript
// ES6 module format (not TypeScript)
import { z } from 'zod';

export const DataOrigin = z.enum(['explicit', 'inferred', 'hybrid']);
export const ConfidenceScore = z.number().min(0).max(1);
export const Citation = z.object({ /* ... */ });
// ... rest of schemas

// Export validation function
export function validateAndRepairGanttData(data) {
  try {
    return BimodalGanttData.parse(data);
  } catch (error) {
    return repairGanttData(data, error);
  }
}
```

---

#### 1.2 Deterministic Gemini Client

**NEW FILE**: `server/gemini-deterministic.js`
- **Purpose**: Zero-temperature Gemini client for deterministic outputs
- **Size**: ~250 lines
- **Key Features**:
  - `temperature: 0.0, topK: 1, topP: 0.0`
  - Two-pass generation (facts → inferences)
  - Consistency validation between passes
  - Caching via SHA-256 hash
  - Backoff retry integration
- **Dependencies**: `server/config.js`, `server/gemini.js` (for retry logic)
- **Integration Point**: New route for semantic chart generation

**Code Structure**:
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { retryWithBackoff } from './gemini.js'; // Reuse existing retry logic
import { BimodalGanttData } from '../types/SemanticGanttData.js';

export class DeterministicGeminiClient {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.seedValue = Date.now(); // Session-consistent seed
  }

  async generateStructuredGantt(researchText, userPrompt) {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview',
      generationConfig: {
        temperature: 0.0,
        topK: 1,
        topP: 0.0,
        responseMimeType: 'application/json',
        responseSchema: this.zodToJsonSchema(BimodalGanttData)
      }
    });

    // Pass 1: Extract facts
    const facts = await this.extractFacts(model, researchText, userPrompt);

    // Pass 2: Add inferences
    const complete = await this.addInferences(model, facts);

    return complete;
  }

  zodToJsonSchema(zodSchema) {
    // Convert Zod schema to JSON Schema format for Gemini
    // ...implementation
  }
}
```

**CRITICAL DECISION**: Reuse existing `retryWithBackoff()` from `server/gemini.js` rather than duplicating code.

---

#### 1.3 Semantic Prompts

**NEW FILE**: `server/prompts-semantic.js`
- **Purpose**: Two-pass prompts for fact extraction + inference generation
- **Size**: ~600 lines
- **Key Prompts**:
  - `DETERMINISTIC_GANTT_SYSTEM_PROMPT` (fact extraction rules)
  - `INFERENCE_GENERATION_PROMPT` (logical inference rules)
  - `BANKING_CONTEXT_ADDENDUM` (regulatory patterns)
- **Dependencies**: None
- **Integration Point**: Used by `gemini-deterministic.js`

**Code Structure**:
```javascript
export const DETERMINISTIC_GANTT_SYSTEM_PROMPT = `
You are a Strict Project Auditor operating in DETERMINISTIC MODE.

PASS 1: FACT EXTRACTION (100% Confidence)
- Only extract information DIRECTLY STATED in source text
- Must provide EXACT character-range citations
- No interpretation, no inference

FOR EACH FACT, RECORD:
{
  "content": "Exact statement",
  "citation": {
    "documentName": "...",
    "paragraphIndex": 3,
    "startChar": 145,
    "endChar": 287,
    "exactQuote": "The compliance review will take 6 weeks"
  },
  "confidence": 1.0,
  "origin": "explicit"
}
`;

export const INFERENCE_GENERATION_PROMPT = `
PASS 2: LOGICAL INFERENCE (0.5-0.99 Confidence)
Based on extracted facts, apply STRICT LOGICAL RULES:

TEMPORAL LOGIC (0.85-0.95 confidence):
- If Task A "must complete Q2" and takes "3 months"
  → Infer: Start in Q4 prior year (0.9 confidence)

DEPENDENCY CHAINS (0.70-0.90 confidence):
- If "Testing" and "Development" exist
  → Infer: Testing depends on Development (0.85 confidence)
`;
```

---

#### 1.4 Soft Repair Validator

**NEW FILE**: `server/validation/semantic-repair.js`
- **Purpose**: Multi-pass validation with automatic repairs
- **Size**: ~450 lines
- **Key Features**:
  - Structure validation (ensure all required fields)
  - Citation repair (downgrade explicit → inferred if missing quote)
  - Confidence normalization (explicit=1.0, inferred<1.0)
  - Dependency integrity checks
  - Banking-specific validation (regulatory flags)
  - Emergency repair (minimal viable structure)
- **Dependencies**: `types/SemanticGanttData.js`
- **Integration Point**: API route validation middleware

**Code Structure**:
```javascript
import { validateAndRepairGanttData } from '../../types/SemanticGanttData.js';

export class SemanticDataValidator {
  async validateAndRepair(rawData) {
    let data = this.ensureStructure(rawData);
    data = this.repairCitations(data);
    data = this.normalizeConfidences(data);
    data = this.validateDependencies(data);
    data = this.validateBankingRequirements(data);

    try {
      const validated = validateAndRepairGanttData(data);
      return { success: true, data: validated, repairs: this.repairLog };
    } catch (error) {
      return this.emergencyRepair(data, error);
    }
  }

  repairCitations(data) {
    data.tasks = data.tasks.map(task => {
      if (task.origin === 'explicit' && !task.sourceCitations) {
        // Downgrade to inference
        return {
          ...task,
          origin: 'inferred',
          confidence: 0.85,
          inferenceRationale: { /* ... */ }
        };
      }
      return task;
    });
    return data;
  }
}
```

---

### Phase 2: API Routes (Week 2) - 40 hours

#### 2.1 Semantic Chart Generation Route

**NEW FILE**: `server/routes/semantic-gantt.js`
- **Purpose**: New endpoint for bimodal chart generation
- **Size**: ~200 lines
- **Endpoints**:
  - `POST /api/generate-semantic-gantt` (async job creation)
  - `GET /api/semantic-gantt/:chartId` (retrieve with toggle support)
- **Dependencies**:
  - `server/gemini-deterministic.js`
  - `server/validation/semantic-repair.js`
  - `server/storage.js` (reuse existing job/chart stores)
  - `server/database.js` (persist semantic charts)
- **Integration Point**: Mount in `server.js`

**Code Structure**:
```javascript
import express from 'express';
import { getDeterministicClient } from '../gemini-deterministic.js';
import { semanticValidator } from '../validation/semantic-repair.js';
import { createJob, storeChart } from '../storage.js';
import { trackEvent } from '../database.js';

const router = express.Router();

router.post('/api/generate-semantic-gantt', async (req, res) => {
  // Create job (reuse existing pattern from charts.js)
  const jobId = createJobId();
  createJob(jobId);

  // Process in background
  processSemanticGeneration(jobId, req.body, req.files);

  res.json({ jobId });
});

async function processSemanticGeneration(jobId, reqBody, files) {
  try {
    const client = getDeterministicClient(process.env.API_KEY);
    const rawData = await client.generateStructuredGantt(/* ... */);
    const result = await semanticValidator.validateAndRepair(rawData);

    if (result.success) {
      const chartId = storeChart(result.data);
      completeJob(jobId, chartId);
      trackEvent('semantic_chart_generated', { chartId, jobId });
    }
  } catch (error) {
    failJob(jobId, error.message);
  }
}

export default router;
```

---

#### 2.2 Banking Rules Engine

**NEW FILE**: `server/banking-semantic-rules.js`
- **Purpose**: Domain-specific inference rules for banking
- **Size**: ~150 lines
- **Key Features**:
  - Regulatory deadline patterns (OCC: 45 days, FDIC: 60 days)
  - Standard phase durations (vendor assessment: 45 days, UAT: 2 months)
  - Risk keyword detection (legacy, mainframe, COBOL)
  - Auto-flagging regulatory tasks
- **Dependencies**: None (pure logic)
- **Integration Point**: Called by `semantic-repair.js` during validation

**Code Structure**:
```javascript
export const BANKING_RULES = {
  regulatory_deadlines: {
    'OCC': { reviewDays: 45, confidence: 0.9 },
    'FDIC': { reviewDays: 60, confidence: 0.85 }
  },
  standard_phases: {
    'vendor assessment': { duration: 45, unit: 'days', confidence: 0.8 },
    'UAT': { duration: 2, unit: 'months', confidence: 0.9 }
  }
};

export function applyBankingRules(task) {
  // Detect regulatory mentions
  // Suggest standard durations
  // Flag high-risk tasks
  return enhancedTask;
}
```

---

### Phase 3: Frontend Components (Week 3) - 50 hours

#### 3.1 Bimodal Gantt Controller

**NEW FILE**: `Public/BimodalGanttController.js`
- **Purpose**: Client-side toggle logic and data filtering
- **Size**: ~500 lines
- **Key Features**:
  - Toggle switch UI (Facts Only ↔ AI Insights)
  - Confidence slider (filter by minimum confidence)
  - Dependency chain resolver (preserve/bridge/break modes)
  - Visual styling based on confidence
  - Provenance tooltips
  - Confidence distribution charts
- **Dependencies**:
  - `Public/GanttChart.js` (extend/wrap existing component)
  - `Public/Utils.js` (reuse utility functions)
- **Integration Point**: Instantiated in `chart-renderer.js`

**Code Structure**:
```javascript
export class BimodalGanttController {
  constructor(ganttData, container) {
    this.fullData = ganttData;
    this.filteredData = null;
    this.showInferences = true;
    this.dependencyMode = 'preserve';
  }

  applyFilter() {
    if (!this.showInferences) {
      this.filteredData = this.filterFactsOnly();
    } else {
      this.filteredData = { ...this.fullData };
    }
    this.processDependencyChains();
    this.renderFilteredChart();
  }

  filterFactsOnly() {
    return {
      ...this.fullData,
      tasks: this.fullData.tasks.filter(t => t.origin === 'explicit'),
      dependencies: this.fullData.dependencies.filter(d => d.origin === 'explicit')
    };
  }

  processDependencyChains() {
    // Handle broken chains based on mode
    switch (this.dependencyMode) {
      case 'preserve': this.preserveDependencyChains(); break;
      case 'bridge': this.bridgeDependencyGaps(); break;
      case 'break': this.highlightBrokenDependencies(); break;
    }
  }
}
```

---

#### 3.2 Enhanced GanttChart Component

**MODIFY FILE**: `Public/GanttChart.js`
- **Changes**: Add bimodal rendering support
- **Lines Added**: ~200 lines
- **Key Modifications**:
  - Check if data has `origin` field (backward compatible)
  - Render confidence badges for inferences
  - Apply visual styling (solid green for facts, dashed blue for inferences)
  - Add citation tooltips
  - Integrate `BimodalGanttController` if semantic data detected
- **Integration Point**: Automatically detect semantic data structure

**Code Changes**:
```javascript
// In render() method, detect semantic data
render() {
  // ... existing code

  // Check if this is semantic data
  if (this.ganttData.tasks?.[0]?.origin) {
    this.enableSemanticMode();
  }

  // ... rest of existing code
}

enableSemanticMode() {
  // Import BimodalGanttController dynamically
  import('./BimodalGanttController.js').then(module => {
    this.bimodalController = new module.BimodalGanttController(
      this.ganttData,
      this.container
    );
    this.bimodalController.init();
  });
}

// Add new method for confidence-based styling
applyConfidenceStyle(taskElement, task) {
  if (task.origin === 'explicit') {
    taskElement.style.border = '2px solid #2E7D32';
    taskElement.style.opacity = '1.0';
  } else if (task.origin === 'inferred') {
    taskElement.style.border = '2px dashed #1976D2';
    taskElement.style.opacity = `${0.3 + (task.confidence * 0.7)}`;

    // Add confidence badge
    const badge = document.createElement('span');
    badge.className = 'confidence-badge';
    badge.textContent = `${Math.round(task.confidence * 100)}%`;
    taskElement.appendChild(badge);
  }
}
```

---

#### 3.3 Executive Dashboard Widget

**NEW FILE**: `Public/ExecutiveDashboard.js`
- **Purpose**: High-level semantic data overview
- **Size**: ~250 lines
- **Key Features**:
  - Data quality score (fact ratio + avg confidence)
  - Timeline confidence meter
  - Regulatory checkpoints list
  - Top risk factors
  - Upcoming decision points
  - Inference warning banner
- **Dependencies**: `Public/Utils.js`
- **Integration Point**: Optionally render above GanttChart

**Code Structure**:
```javascript
export class ExecutiveDashboard {
  constructor(semanticData) {
    this.data = semanticData;
  }

  render() {
    return `
      <div class="executive-dashboard">
        <div class="data-quality-score">${this.getQualityScore()}%</div>
        <div class="regulatory-checkpoints">${this.getRegulatoryCheckpoints()}</div>
        <div class="top-risks">${this.getTopRisks()}</div>
      </div>
    `;
  }

  getQualityScore() {
    const factRatio = this.data.statistics.explicitTasks / this.data.statistics.totalTasks;
    const avgConfidence = this.data.statistics.averageConfidence;
    return Math.round((factRatio * 0.6 + avgConfidence * 0.4) * 100);
  }
}
```

---

#### 3.4 Chart Renderer Integration

**MODIFY FILE**: `Public/chart-renderer.js`
- **Changes**: Detect semantic data and route to bimodal controller
- **Lines Added**: ~50 lines
- **Key Modifications**:
  - Check chartData structure for `origin` fields
  - If semantic: use `BimodalGanttController`
  - If legacy: use existing `GanttChart` component
  - Add semantic/legacy mode indicator

**Code Changes**:
```javascript
async function renderChart(chartId) {
  const chartData = await fetchChartData(chartId);

  // Detect semantic data structure
  const isSemanticData = chartData.tasks?.[0]?.origin !== undefined;

  if (isSemanticData) {
    console.log('🔬 Semantic data detected - enabling bimodal mode');
    const { BimodalGanttController } = await import('./BimodalGanttController.js');
    const controller = new BimodalGanttController(chartData, 'gantt-chart-container');
    controller.init();
  } else {
    console.log('📊 Legacy data - using standard renderer');
    const ganttChart = new GanttChart('gantt-chart-container', chartData);
    ganttChart.render();
  }
}
```

---

### Phase 4: Integration & Testing (Week 4) - 30 hours

#### 4.1 Server Integration

**MODIFY FILE**: `server.js`
- **Changes**: Mount new semantic routes
- **Lines Added**: ~10 lines

**Code Changes**:
```javascript
// Add new import
import semanticGanttRouter from './server/routes/semantic-gantt.js';

// Mount new routes
app.use('/', semanticGanttRouter);
```

---

#### 4.2 Configuration Updates

**MODIFY FILE**: `server/config.js`
- **Changes**: Add semantic-specific settings
- **Lines Added**: ~20 lines

**Code Changes**:
```javascript
export const CONFIG = {
  // ... existing config

  SEMANTIC: {
    ENABLE_DETERMINISTIC_MODE: process.env.ENABLE_SEMANTIC === 'true',
    DEFAULT_CONFIDENCE_THRESHOLD: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.7'),
    ENABLE_BANKING_RULES: process.env.ENABLE_BANKING_RULES !== 'false',
    CACHE_DETERMINISTIC_RESULTS: process.env.CACHE_SEMANTIC !== 'false'
  }
};
```

---

#### 4.3 Database Schema Extension

**MODIFY FILE**: `server/database.js`
- **Changes**: Add semantic chart storage
- **Lines Added**: ~50 lines
- **New Table**: `semantic_charts` (separate from legacy charts)

**Code Changes**:
```javascript
// Add new table in createTables()
db.exec(`
  CREATE TABLE IF NOT EXISTS semantic_charts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chartId TEXT UNIQUE NOT NULL,
    sessionId TEXT NOT NULL,
    ganttData TEXT NOT NULL,
    semanticMetadata TEXT NOT NULL,  -- fact/inference stats
    repairLog TEXT,                  -- validation repairs
    createdAt INTEGER NOT NULL,
    expiresAt INTEGER NOT NULL
  );
`);

// Add new functions
export function createSemanticChart(chartId, sessionId, data, metadata, repairs) {
  // ... implementation
}
```

---

#### 4.4 Unit Tests

**NEW FILE**: `__tests__/unit/semantic-validator.test.js`
- **Purpose**: Test soft repair logic
- **Size**: ~300 lines
- **Test Cases**:
  - Missing citation downgrade
  - Confidence normalization
  - Dependency integrity
  - Banking rule application
  - Emergency repair

**Code Structure**:
```javascript
import { describe, it, expect } from '@jest/globals';
import { SemanticDataValidator } from '../../../server/validation/semantic-repair.js';

describe('SemanticDataValidator', () => {
  describe('repairCitations', () => {
    it('should downgrade explicit task without citation to inference', () => {
      const task = {
        id: 'T1',
        origin: 'explicit',
        confidence: 1.0,
        sourceCitations: [] // Missing!
      };

      const validator = new SemanticDataValidator();
      const result = validator.repairCitations({ tasks: [task] });

      expect(result.tasks[0].origin).toBe('inferred');
      expect(result.tasks[0].confidence).toBe(0.85);
    });
  });
});
```

---

#### 4.5 Integration Tests

**NEW FILE**: `__tests__/integration/semantic-api.test.js`
- **Purpose**: Test end-to-end semantic chart generation
- **Size**: ~200 lines
- **Test Cases**:
  - Generate semantic chart with facts
  - Generate with only inferences
  - Determinism (5 identical requests)
  - Toggle filtering

**Code Structure**:
```javascript
import request from 'supertest';
import app from '../../server.js';

describe('Semantic Chart API', () => {
  it('should generate semantic chart with facts and inferences', async () => {
    const response = await request(app)
      .post('/api/generate-semantic-gantt')
      .field('prompt', 'Create timeline')
      .attach('files', Buffer.from('OCC approval required by Q2 2026'), 'test.txt');

    expect(response.status).toBe(200);
    expect(response.body.jobId).toBeDefined();
  });

  it('should produce identical outputs for identical inputs', async () => {
    const inputs = { /* ... */ };
    const results = [];

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/generate-semantic-gantt').send(inputs);
      results.push(res.body);
    }

    // All results should be identical (determinism test)
    expect(new Set(results.map(JSON.stringify)).size).toBe(1);
  });
});
```

---

#### 4.6 Frontend Tests

**NEW FILE**: `__tests__/unit/frontend/bimodal-controller.test.js`
- **Purpose**: Test toggle and filtering logic
- **Size**: ~150 lines
- **Test Cases**:
  - Facts-only filtering
  - Confidence threshold filtering
  - Dependency chain preservation
  - Dependency bridging

**Code Structure**:
```javascript
import { BimodalGanttController } from '../../../Public/BimodalGanttController.js';

describe('BimodalGanttController', () => {
  it('should filter to facts only when toggle is off', () => {
    const data = {
      tasks: [
        { id: 'T1', origin: 'explicit' },
        { id: 'T2', origin: 'inferred' }
      ]
    };

    const controller = new BimodalGanttController(data, 'test-container');
    controller.showInferences = false;
    controller.applyFilter();

    expect(controller.filteredData.tasks.length).toBe(1);
    expect(controller.filteredData.tasks[0].id).toBe('T1');
  });
});
```

---

## 🔄 Integration Points Summary

### Backend Integration Points

| Existing Module | New Module | Integration Type | Complexity |
|----------------|------------|------------------|------------|
| `server/gemini.js` | `server/gemini-deterministic.js` | Extend | Low - Reuse retry logic |
| `server/routes/charts.js` | `server/routes/semantic-gantt.js` | Parallel | Low - Same pattern |
| `server/storage.js` | `types/SemanticGanttData.js` | Use | Low - Store new structure |
| `server/database.js` | New table `semantic_charts` | Extend | Low - Add table + functions |
| `server/middleware.js` | No changes | - | - |
| `server/utils.js` | No changes | - | - |

### Frontend Integration Points

| Existing Component | New Component | Integration Type | Complexity |
|-------------------|---------------|------------------|------------|
| `Public/GanttChart.js` | `Public/BimodalGanttController.js` | Wrap | Medium - Detect & route |
| `Public/chart-renderer.js` | Detect semantic data | Extend | Low - Structure check |
| `Public/Utils.js` | No changes | - | - |
| `Public/ExecutiveSummary.js` | Add semantic stats | Extend | Low - Add section |

---

## 📅 Phased Rollout Strategy

### Phase 1: Backend Core (Week 1)
**Goal**: Implement deterministic generation without breaking existing features

**Tasks**:
1. Install Zod: `npm install zod` (5 min)
2. Create `types/SemanticGanttData.js` (4 hours)
3. Create `server/gemini-deterministic.js` (6 hours)
4. Create `server/prompts-semantic.js` (4 hours)
5. Create `server/validation/semantic-repair.js` (8 hours)
6. Create `server/banking-semantic-rules.js` (3 hours)
7. Unit tests for validator (6 hours)
8. Manual testing with curl (2 hours)

**Deliverable**: Backend can generate semantic data (not yet exposed to UI)

**Risk**: Low - No changes to existing routes

---

### Phase 2: API Endpoints (Week 2)
**Goal**: Expose semantic generation via new API route

**Tasks**:
1. Create `server/routes/semantic-gantt.js` (6 hours)
2. Extend `server/database.js` with semantic table (3 hours)
3. Update `server/config.js` with semantic settings (1 hour)
4. Mount route in `server.js` (1 hour)
5. Integration tests (6 hours)
6. Test with Postman/curl (2 hours)
7. Performance testing (load test with 100 requests) (3 hours)

**Deliverable**: API endpoint `/api/generate-semantic-gantt` functional

**Risk**: Low - Isolated route, doesn't affect existing chart generation

---

### Phase 3: Frontend Components (Week 3)
**Goal**: Add toggle UI and bimodal rendering

**Tasks**:
1. Create `Public/BimodalGanttController.js` (12 hours)
2. Create `Public/ExecutiveDashboard.js` (6 hours)
3. Modify `Public/GanttChart.js` for semantic support (8 hours)
4. Modify `Public/chart-renderer.js` for detection (3 hours)
5. Add CSS styles for confidence visualization (4 hours)
6. Frontend unit tests (6 hours)
7. Cross-browser testing (Chrome, Firefox, Safari) (4 hours)
8. Mobile responsiveness testing (3 hours)

**Deliverable**: UI can toggle between facts and inferences

**Risk**: Medium - Changes to core rendering component

**Mitigation**: Feature detection ensures backward compatibility with legacy charts

---

### Phase 4: Integration & Polish (Week 4)
**Goal**: End-to-end testing, documentation, deployment prep

**Tasks**:
1. End-to-end testing (generate → render → toggle) (6 hours)
2. Determinism validation (100+ identical requests) (3 hours)
3. Banking document testing (real RFPs, regulations) (4 hours)
4. User acceptance testing (3-5 internal users) (8 hours)
5. Update `CLAUDE.md` with semantic features (3 hours)
6. Create user guide for toggle feature (2 hours)
7. Performance optimization (caching, bundle size) (6 hours)
8. Deployment to staging environment (2 hours)
9. Production deployment (2 hours)

**Deliverable**: Semantic overlay engine live in production

**Risk**: Low - Fully tested

---

## 🧪 Testing Strategy

### Unit Test Coverage Targets

| Module | Current | Target | Priority |
|--------|---------|--------|----------|
| `types/SemanticGanttData.js` | 0% | 90% | High |
| `server/validation/semantic-repair.js` | 0% | 95% | Critical |
| `server/gemini-deterministic.js` | 0% | 70% | Medium |
| `server/banking-semantic-rules.js` | 0% | 85% | High |
| `Public/BimodalGanttController.js` | 0% | 75% | Medium |

### Key Test Scenarios

#### Backend Tests
1. **Determinism Test**: 100 identical requests → 100 identical outputs
2. **Citation Repair**: Explicit task without citation → Downgraded to inference
3. **Confidence Normalization**: Inference with 1.0 confidence → Capped at 0.95
4. **Dependency Validation**: Orphaned dependencies → Removed
5. **Banking Rules**: Task named "OCC approval" → 45-day buffer added

#### Frontend Tests
1. **Toggle Switch**: ON → Show all tasks, OFF → Show only facts
2. **Confidence Filter**: Slider at 0.8 → Hide tasks with confidence < 0.8
3. **Dependency Preservation**: Hide inference → Keep as ghost task if needed
4. **Dependency Bridging**: A→B(hidden)→C → Create direct A→C dependency
5. **Visual Styling**: Fact → Solid green border, Inference → Dashed blue border

#### Integration Tests
1. **Full Pipeline**: Upload → Generate → Validate → Store → Retrieve → Render
2. **Legacy Compatibility**: Legacy chart data → Renders without errors
3. **Semantic Detection**: Semantic data → Bimodal controller activated
4. **Performance**: Generate chart in < 10 seconds for 50-task project

---

## 🚨 Risk Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Gemini non-determinism despite temp=0 | Medium | High | Add hash-based caching, retry on variance |
| Zod schema too restrictive | Low | Medium | Soft repair strategy handles edge cases |
| Performance degradation | Low | Low | Client-side filtering, no additional API calls |
| Legacy chart breakage | Low | High | Feature detection, backward compatibility |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| User confusion with toggle | Medium | Medium | Clear labels, onboarding tooltip |
| Low fact ratio (<20%) | High | High | Set expectations, show data quality score |
| Regulatory compliance concerns | Low | High | Full audit trail, transparent provenance |

---

## 📊 Success Metrics

### Technical Metrics
- ✅ **Determinism**: 100% identical outputs for 100 identical inputs
- ✅ **Fact Ratio**: Average >40% facts in banking documents
- ✅ **Toggle Performance**: <500ms switching time
- ✅ **Validation Success**: >95% of AI outputs pass validation (with repairs)
- ✅ **Test Coverage**: >85% on semantic modules

### User Experience Metrics
- ✅ **Clarity**: Users understand fact vs. inference within 30 seconds
- ✅ **Trust**: Executives comfortable presenting "facts only" to clients
- ✅ **Adoption**: >50% of charts generated in semantic mode after 30 days

### Business Metrics
- ✅ **Executive Review Time**: -50% reduction
- ✅ **Client Trust Score**: +15% improvement
- ✅ **Proposal Win Rate**: +10% increase (6-month target)

---

## 🔧 Development Environment Setup

### Prerequisites
```bash
# Ensure Node.js 18+ installed
node --version

# Ensure current dependencies installed
npm install

# Add new dependencies
npm install zod
```

### Environment Variables
```bash
# Add to .env
ENABLE_SEMANTIC=true
CONFIDENCE_THRESHOLD=0.7
ENABLE_BANKING_RULES=true
CACHE_SEMANTIC=true
```

### Verify Setup
```bash
# Run existing tests to ensure no breakage
npm test

# Start server
npm start

# Test semantic endpoint (once implemented)
curl -X POST http://localhost:3000/api/generate-semantic-gantt \
  -H "Content-Type: multipart/form-data" \
  -F "prompt=Create a timeline" \
  -F "files=@test.txt"
```

---

## 📁 File Creation Checklist

### New Files (Total: 10 files)
- [ ] `types/SemanticGanttData.js` (350 lines)
- [ ] `server/gemini-deterministic.js` (250 lines)
- [ ] `server/prompts-semantic.js` (600 lines)
- [ ] `server/validation/semantic-repair.js` (450 lines)
- [ ] `server/banking-semantic-rules.js` (150 lines)
- [ ] `server/routes/semantic-gantt.js` (200 lines)
- [ ] `Public/BimodalGanttController.js` (500 lines)
- [ ] `Public/ExecutiveDashboard.js` (250 lines)
- [ ] `__tests__/unit/semantic-validator.test.js` (300 lines)
- [ ] `__tests__/integration/semantic-api.test.js` (200 lines)

**Total New Code**: ~3,250 lines

### Modified Files (Total: 6 files)
- [ ] `server.js` (+10 lines)
- [ ] `server/config.js` (+20 lines)
- [ ] `server/database.js` (+50 lines)
- [ ] `Public/GanttChart.js` (+200 lines)
- [ ] `Public/chart-renderer.js` (+50 lines)
- [ ] `Public/ExecutiveSummary.js` (+50 lines)

**Total Modified Code**: ~380 lines

### Total Implementation Size
**New + Modified**: ~3,630 lines
**Existing Codebase**: ~17,029 lines
**Growth**: +21% increase

---

## 🎯 Next Steps

### Option A: Start Immediately
Begin with Phase 1 (Backend Core) by creating the Zod schemas and deterministic client.

**Command**:
```bash
npm install zod
mkdir -p types server/validation __tests__/unit __tests__/integration
```

### Option B: Pilot Testing
Create a minimal proof-of-concept (just deterministic client + simple toggle) to validate approach.

**Deliverable**: Working demo in 8 hours

### Option C: Stakeholder Review
Present this plan to technical and business stakeholders for approval before proceeding.

**Format**: 30-minute presentation using SEMANTIC_EXECUTIVE_BRIEF.md

---

## 📞 Support & Questions

**Technical Questions**: Refer to SEMANTIC_OVERLAY_IMPLEMENTATION_BLUEPRINT.md
**Quick Start**: Refer to SEMANTIC_QUICKSTART_GUIDE.md
**Architecture Questions**: This document (SEMANTIC_IMPLEMENTATION_PLAN.md)

---

**Status**: Ready for Implementation
**Reviewed By**: Claude Sonnet 4.5
**Approval Required**: Project Sponsor
**Estimated Start Date**: Upon Approval
**Estimated Completion**: 4 weeks from start
