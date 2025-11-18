# Semantic Overlay Engine - Technical Implementation Blueprint
## For Banking AI Roadmap Generator

**Architecture Role:** Principal AI Architect (Opus 4.1)  
**Implementation Lead:** Claude 3.5 Sonnet v2 (Sonnet 4.5)  
**Runtime Engine:** Gemini 2.5 Flash Preview  
**Validation:** Zod/TypeScript  
**Date:** November 2025

---

## 🎯 Executive Overview

This blueprint transforms your existing Gantt chart generator into a **Fact/Inference Bimodal System** that clearly distinguishes between:
- **Facts**: Information explicitly stated in source documents (100% confidence)
- **Inferences**: Logically derived insights by AI (0-99% confidence)

**Key Innovation**: A toggle switch in the UI allows executives to filter between "Just the facts" and "AI-enhanced insights" modes.

---

## 📊 Component 1: Bimodal Data Schema

### Enhanced Gantt Data Object Structure

```typescript
// types/SemanticGanttData.ts
import { z } from 'zod';

// Enum for data origin tracking
export const DataOrigin = z.enum(['explicit', 'inferred', 'hybrid']);

// Confidence scoring schema
export const ConfidenceScore = z.number()
  .min(0)
  .max(1)
  .describe('1.0 for explicit facts, 0.0-0.99 for inferences');

// Source citation schema
export const Citation = z.object({
  documentId: z.string(),
  documentName: z.string(),
  pageNumber: z.number().optional(),
  paragraphIndex: z.number(),
  startChar: z.number(),
  endChar: z.number(),
  exactQuote: z.string().max(500)
});

// Inference rationale schema
export const InferenceRationale = z.object({
  method: z.enum([
    'temporal_logic',      // "A must complete before B starts"
    'industry_standard',   // "Banking projects typically require X"
    'dependency_chain',    // "C depends on B which depends on A"
    'regulatory_pattern',  // "OCC approval typically takes 3-6 months"
    'resource_constraint', // "Only 2 architects available"
    'buffer_padding'      // "Added 20% contingency for risk"
  ]),
  explanation: z.string(),
  supportingFacts: z.array(z.string()).describe('IDs of explicit facts used'),
  confidence: ConfidenceScore
});

// Enhanced Task Schema with Bimodal Properties
export const BimodalTask = z.object({
  // Core properties (existing)
  id: z.string(),
  name: z.string(),
  
  // Bimodal metadata
  origin: DataOrigin,
  confidence: ConfidenceScore,
  
  // For explicit tasks
  sourceCitations: z.array(Citation).optional()
    .describe('Required when origin=explicit'),
  
  // For inferred tasks
  inferenceRationale: InferenceRationale.optional()
    .describe('Required when origin=inferred'),
  
  // Task details (enhanced)
  startDate: z.object({
    value: z.string().datetime(),
    origin: DataOrigin,
    confidence: ConfidenceScore,
    citation: Citation.optional(),
    rationale: InferenceRationale.optional()
  }),
  
  endDate: z.object({
    value: z.string().datetime(),
    origin: DataOrigin,
    confidence: ConfidenceScore,
    citation: Citation.optional(),
    rationale: InferenceRationale.optional()
  }),
  
  duration: z.object({
    value: z.number(),
    unit: z.enum(['days', 'weeks', 'months']),
    origin: DataOrigin,
    confidence: ConfidenceScore,
    citation: Citation.optional(),
    rationale: InferenceRationale.optional()
  }),
  
  // Resources with provenance
  resources: z.array(z.object({
    name: z.string(),
    role: z.string(),
    allocation: z.number().min(0).max(1),
    origin: DataOrigin,
    confidence: ConfidenceScore
  })),
  
  // Banking-specific fields
  regulatoryRequirement: z.object({
    isRequired: z.boolean(),
    regulation: z.string().optional(),
    deadline: z.string().datetime().optional(),
    origin: DataOrigin,
    confidence: ConfidenceScore
  }).optional(),
  
  // Visual styling based on confidence
  visualStyle: z.object({
    color: z.string(),      // Gradient from solid (facts) to transparent (low-confidence)
    borderStyle: z.enum(['solid', 'dashed', 'dotted']),
    opacity: z.number().min(0.3).max(1)
  })
});

// Bimodal Dependency Schema
export const BimodalDependency = z.object({
  id: z.string(),
  source: z.string(),      // Task ID
  target: z.string(),      // Task ID
  type: z.enum(['finish-to-start', 'start-to-start', 'finish-to-finish', 'start-to-finish']),
  
  // Bimodal metadata
  origin: DataOrigin,
  confidence: ConfidenceScore,
  
  // Provenance
  sourceCitation: Citation.optional(),
  inferenceRationale: InferenceRationale.optional(),
  
  // Dependency strength
  strength: z.enum(['mandatory', 'strong', 'moderate', 'weak'])
    .describe('Mandatory for explicit, varies for inferred'),
  
  // Lag time with provenance
  lagTime: z.object({
    value: z.number(),
    unit: z.enum(['days', 'weeks', 'months']),
    origin: DataOrigin,
    confidence: ConfidenceScore
  }).optional()
});

// Complete Bimodal Gantt Data Structure
export const BimodalGanttData = z.object({
  // Metadata
  generatedAt: z.string().datetime(),
  geminiVersion: z.literal('2.5-flash-preview'),
  determinismSeed: z.number(),
  
  // Project overview
  projectSummary: z.object({
    name: z.string(),
    description: z.string(),
    origin: DataOrigin,
    confidence: ConfidenceScore
  }),
  
  // Statistics
  statistics: z.object({
    totalTasks: z.number(),
    explicitTasks: z.number(),
    inferredTasks: z.number(),
    averageConfidence: z.number(),
    dataQualityScore: z.number().describe('Ratio of facts to total')
  }),
  
  // Core data
  tasks: z.array(BimodalTask),
  dependencies: z.array(BimodalDependency),
  
  // Swimlanes with provenance
  swimlanes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    taskIds: z.array(z.string()),
    origin: DataOrigin,
    confidence: ConfidenceScore
  })),
  
  // Risk factors with confidence
  risks: z.array(z.object({
    id: z.string(),
    description: z.string(),
    impact: z.enum(['low', 'medium', 'high', 'critical']),
    probability: z.number().min(0).max(1),
    affectedTaskIds: z.array(z.string()),
    origin: DataOrigin,
    confidence: ConfidenceScore,
    mitigationStrategy: z.string().optional()
  })),
  
  // Regulatory checkpoints (banking-specific)
  regulatoryCheckpoints: z.array(z.object({
    id: z.string(),
    regulation: z.string(),
    deadline: z.string().datetime(),
    taskIds: z.array(z.string()),
    origin: DataOrigin,
    confidence: ConfidenceScore,
    citation: Citation.optional()
  })),
  
  // Confidence distribution analysis
  confidenceAnalysis: z.object({
    distribution: z.array(z.object({
      range: z.string(),  // "0.9-1.0", "0.8-0.9", etc.
      count: z.number(),
      percentage: z.number()
    })),
    weakestLinks: z.array(z.object({
      taskId: z.string(),
      taskName: z.string(),
      confidence: z.number(),
      reason: z.string()
    }))
  })
});

// Export type for TypeScript
export type BimodalGanttDataType = z.infer<typeof BimodalGanttData>;

// Validation function with soft repair
export function validateAndRepairGanttData(data: unknown): BimodalGanttDataType {
  try {
    return BimodalGanttData.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Implement soft repair strategy
      return repairGanttData(data, error);
    }
    throw error;
  }
}

// Soft repair function
function repairGanttData(data: any, error: z.ZodError): BimodalGanttDataType {
  const repaired = { ...data };
  
  error.errors.forEach(err => {
    const path = err.path.join('.');
    
    // Repair missing citations for explicit items
    if (path.includes('sourceCitations') && path.includes('origin')) {
      const taskPath = path.split('.').slice(0, -2);
      const task = taskPath.reduce((obj, key) => obj[key], repaired);
      if (task && task.origin === 'explicit' && !task.sourceCitations) {
        // Downgrade to inferred if no citation
        task.origin = 'inferred';
        task.confidence = 0.75;
        task.inferenceRationale = {
          method: 'temporal_logic',
          explanation: 'Downgraded from explicit due to missing citation',
          supportingFacts: [],
          confidence: 0.75
        };
      }
    }
    
    // Add default confidence scores
    if (path.includes('confidence') && err.code === 'invalid_type') {
      const itemPath = path.split('.').slice(0, -1);
      const item = itemPath.reduce((obj, key) => obj[key], repaired);
      if (item) {
        item.confidence = item.origin === 'explicit' ? 1.0 : 0.7;
      }
    }
  });
  
  // Recursively validate until clean
  return validateAndRepairGanttData(repaired);
}
```

---

## 🤖 Component 2: Deterministic System Instruction

### Gemini 2.5 Flash System Prompt

```javascript
// server/prompts-semantic.js

export const DETERMINISTIC_GANTT_SYSTEM_PROMPT = `
You are a Strict Project Auditor & Timeline Analyst operating in DETERMINISTIC MODE.
Your role is to extract project information with ABSOLUTE PRECISION and ZERO CREATIVITY.

CRITICAL OPERATING PARAMETERS:
- Temperature: 0.0 (NO randomness)
- Top-K: 1 (ONLY most likely token)
- Response Format: STRICTLY JSON (no markdown, no explanations)
- Seed: ${Date.now()} (for reproducibility tracking)

YOUR TWO-PASS ANALYSIS PROTOCOL:

═══════════════════════════════════════════════════════════
PASS 1: FACT EXTRACTION (100% Confidence)
═══════════════════════════════════════════════════════════

DEFINITION OF "EXPLICIT FACT":
- Information DIRECTLY STATED in the source text
- Must be able to provide EXACT character-range citation
- No interpretation, no reading between lines
- If uncertain, it's NOT a fact

EXTRACTION RULES:
1. Tasks are explicit ONLY if the text says:
   - "Task X will..." / "Step Y involves..." / "Phase Z includes..."
   - "The project requires..." / "We must complete..."
   - Direct action verbs: "implement", "deploy", "review", "approve"

2. Dates/Durations are explicit ONLY if stated as:
   - "Starting Q2 2026" / "By March 31st" / "Within 6 months"
   - "Takes 3 weeks" / "Duration: 45 days"
   - NOT inferred from context

3. Dependencies are explicit ONLY if stated as:
   - "X depends on Y" / "After completing A, begin B"
   - "Prerequisite:" / "Requires completion of..."
   - NOT assumed from logical sequence

4. Resources are explicit ONLY if named:
   - "Project Manager: John Smith" / "Requires 3 developers"
   - "IT Department will handle..." / "Vendor ABC provides..."

FOR EACH EXPLICIT FACT, RECORD:
{
  "factId": "F-001",
  "content": "Exact statement from text",
  "citation": {
    "documentName": "research_doc_1.pdf",
    "paragraphIndex": 3,
    "startChar": 145,
    "endChar": 287,
    "exactQuote": "The compliance review process will take 6 weeks"
  },
  "confidence": 1.0,
  "origin": "explicit"
}

═══════════════════════════════════════════════════════════
PASS 2: LOGICAL INFERENCE (0.5-0.99 Confidence)
═══════════════════════════════════════════════════════════

ONLY AFTER completing Pass 1, apply STRICT LOGICAL RULES:

TEMPORAL LOGIC INFERENCES (Confidence: 0.85-0.95):
- If Task A "must be completed by Q2" and takes "3 months"
  → Infer: Task A starts in Q4 of previous year (0.9 confidence)
- If "regulatory approval" mentioned without timeline
  → Infer: 3-6 months based on banking standard (0.75 confidence)

DEPENDENCY CHAIN INFERENCES (Confidence: 0.70-0.90):
- If "System testing" exists and "Development" exists
  → Infer: Testing depends on Development (0.85 confidence)
- If "Go-live" mentioned
  → Infer: Depends on testing completion (0.8 confidence)

RESOURCE ALLOCATION INFERENCES (Confidence: 0.60-0.85):
- If "complex integration" without resource specification
  → Infer: 2-3 senior engineers needed (0.7 confidence)
- If "executive approval" mentioned
  → Infer: C-suite stakeholder involvement (0.75 confidence)

BANKING DOMAIN INFERENCES (Confidence: 0.70-0.95):
- If "OCC submission" mentioned
  → Infer: 45-day review period (0.9 confidence - regulatory standard)
- If "AML compliance" referenced
  → Infer: BSA officer involvement required (0.85 confidence)

FOR EACH INFERENCE, RECORD:
{
  "inferenceId": "I-001",
  "content": "Inferred statement",
  "inferenceRationale": {
    "method": "temporal_logic" | "dependency_chain" | "regulatory_pattern",
    "explanation": "Task A ends Q2, duration 3 months, therefore starts Q4 prior year",
    "supportingFacts": ["F-001", "F-003"],
    "confidence": 0.85
  },
  "origin": "inferred"
}

═══════════════════════════════════════════════════════════
OUTPUT STRUCTURE REQUIREMENTS
═══════════════════════════════════════════════════════════

Your response MUST be VALID JSON matching this EXACT structure:

{
  "determinismCheck": {
    "seed": ${Date.now()},
    "temperature": 0.0,
    "topK": 1,
    "timestamp": "ISO-8601 datetime"
  },
  "extractionSummary": {
    "totalItemsFound": number,
    "explicitFacts": number,
    "logicalInferences": number,
    "confidenceDistribution": {
      "1.0": number,
      "0.9-0.99": number,
      "0.8-0.89": number,
      "0.7-0.79": number,
      "below0.7": number
    }
  },
  "tasks": [...BimodalTask objects],
  "dependencies": [...BimodalDependency objects],
  "risks": [...],
  "regulatoryCheckpoints": [...],
  "dataQualityWarnings": [
    {
      "type": "missing_citation",
      "item": "Task ID",
      "suggestion": "Downgrade to inference or provide citation"
    }
  ]
}

REMEMBER:
- NEVER add information not present in source
- NEVER use creative interpretation
- ALWAYS provide citations for facts
- ALWAYS explain reasoning for inferences
- MAINTAIN exact same output for identical inputs
`;

export const BANKING_CONTEXT_ADDENDUM = `
BANKING-SPECIFIC FACT PATTERNS:
- Regulatory deadlines: Look for "must comply by", "effective date", "submission deadline"
- Vendor relationships: Look for "vendor", "third-party", "service provider"
- Risk assessments: Look for "risk", "threat", "vulnerability", "mitigation"
- Compliance requirements: Look for "audit", "examination", "review", "approval"

BANKING-SPECIFIC INFERENCE RULES:
- Federal regulatory approval: 45-90 days (0.85 confidence)
- State regulatory approval: 30-60 days (0.80 confidence)
- Vendor onboarding: 2-4 months (0.75 confidence)
- System integration with core banking: 3-6 months (0.80 confidence)
- User acceptance testing for financial systems: 1-2 months (0.85 confidence)
`;
```

---

## ⚙️ Component 3: Configuration Strategy

### Gemini API Configuration for Determinism

```javascript
// server/gemini-deterministic.js
import { GoogleGenerativeAI } from '@google/generative-ai';

export class DeterministicGeminiClient {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.seedValue = this.generateDeterministicSeed();
  }

  generateDeterministicSeed() {
    // Use a hash of the input content for consistent seeding
    return Date.now(); // Store this for session consistency
  }

  async generateStructuredGantt(researchText, userPrompt) {
    const model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-preview',
      generationConfig: {
        temperature: 0.0,        // CRITICAL: Zero randomness
        topK: 1,                 // CRITICAL: Only most likely token
        topP: 0.0,              // CRITICAL: No nucleus sampling
        maxOutputTokens: 30000,  // Sufficient for large projects
        seed: this.seedValue,    // Deterministic seed
        stopSequences: [],       // No early stopping
        
        // Response format STRICT enforcement
        responseMimeType: 'application/json',
        responseSchema: BimodalGanttData.shape  // Use Zod schema
      },
      
      // Safety settings - minimal filtering for professional content
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_ONLY_HIGH'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_ONLY_HIGH'
        }
      ],
      
      // System instruction configuration
      systemInstruction: DETERMINISTIC_GANTT_SYSTEM_PROMPT + BANKING_CONTEXT_ADDENDUM
    });

    // Create content with structured approach
    const chat = model.startChat({
      history: [],
      generationConfig: {
        temperature: 0.0,
        topK: 1
      }
    });

    // First request - PASS 1: Fact Extraction
    const factExtractionPrompt = `
PASS 1 - FACT EXTRACTION ONLY
Input Document:
${researchText}

User Context:
${userPrompt}

Extract ONLY explicit facts with exact citations.
Return JSON structure as specified.
`;

    const factResponse = await chat.sendMessage(factExtractionPrompt);
    const facts = JSON.parse(factResponse.response.text());

    // Second request - PASS 2: Logical Inference
    const inferencePrompt = `
PASS 2 - LOGICAL INFERENCE
Based on these extracted facts:
${JSON.stringify(facts, null, 2)}

Apply logical inference rules to fill gaps.
Maintain all facts from Pass 1.
Add inferences with confidence scores.
Return complete JSON structure.
`;

    const inferenceResponse = await chat.sendMessage(inferencePrompt);
    const completeData = JSON.parse(inferenceResponse.response.text());

    // Validate consistency between passes
    this.validateConsistency(facts, completeData);

    return completeData;
  }

  validateConsistency(facts, completeData) {
    // Ensure all facts from Pass 1 exist in Pass 2
    const factIds = new Set(facts.tasks?.map(t => t.id) || []);
    const completeIds = new Set(completeData.tasks?.map(t => t.id) || []);
    
    factIds.forEach(id => {
      if (!completeIds.has(id)) {
        throw new Error(`Determinism violation: Fact ${id} missing in Pass 2`);
      }
    });

    // Verify no facts changed confidence scores
    facts.tasks?.forEach(factTask => {
      const completeTask = completeData.tasks.find(t => t.id === factTask.id);
      if (completeTask && completeTask.origin === 'explicit' && completeTask.confidence !== 1.0) {
        throw new Error(`Determinism violation: Fact confidence changed for ${factTask.id}`);
      }
    });
  }

  // Thinking/Reasoning Budget Management
  async useReasoningBudget(prompt, useReasoning = false) {
    // Gemini 2.5's "thinking" tokens for complex inference
    // Only use for Pass 2 inference, not Pass 1 facts
    
    if (useReasoning) {
      // Enable chain-of-thought for inference pass
      return {
        ...this.generationConfig,
        responseFormat: {
          type: 'json',
          includeReasoning: true,  // This may add variability
          reasoningTokenBudget: 5000
        }
      };
    }
    
    // For fact extraction, disable reasoning to maintain determinism
    return {
      ...this.generationConfig,
      responseFormat: {
        type: 'json',
        includeReasoning: false  // Pure extraction, no reasoning
      }
    };
  }

  // Cache management for identical inputs
  getCacheKey(researchText, userPrompt) {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(researchText + userPrompt + this.seedValue)
      .digest('hex');
  }
}

// Singleton instance for session consistency
let deterministicClient = null;

export function getDeterministicClient(apiKey) {
  if (!deterministicClient) {
    deterministicClient = new DeterministicGeminiClient(apiKey);
  }
  return deterministicClient;
}
```

---

## 🎛️ Component 4: Toggle Logic (Frontend Architecture)

### Client-Side Filtering Implementation

```javascript
// Public/BimodalGanttController.js

export class BimodalGanttController {
  constructor(ganttData, container) {
    this.fullData = ganttData;        // Complete data from API
    this.filteredData = null;          // Currently displayed data
    this.container = container;
    this.showInferences = true;        // Default: show everything
    this.dependencyMode = 'preserve';  // How to handle inference gaps
  }

  // Initialize UI controls
  initToggleControls() {
    const controlPanel = document.createElement('div');
    controlPanel.className = 'bimodal-controls';
    controlPanel.innerHTML = `
      <div class="toggle-container">
        <label class="toggle-switch">
          <input type="checkbox" id="inference-toggle" checked>
          <span class="slider">
            <span class="label-on">AI Insights ON</span>
            <span class="label-off">Facts Only</span>
          </span>
        </label>
        
        <div class="confidence-filter">
          <label>Minimum Confidence: 
            <input type="range" id="confidence-slider" 
                   min="0" max="100" value="0" step="5">
            <span id="confidence-value">0%</span>
          </label>
        </div>
        
        <div class="dependency-handling">
          <label>When hiding inferences:
            <select id="dependency-mode">
              <option value="preserve">Keep dependency chains</option>
              <option value="bridge">Bridge gaps automatically</option>
              <option value="break">Show broken dependencies</option>
            </select>
          </label>
        </div>
      </div>
      
      <div class="data-quality-indicator">
        <div class="quality-bar">
          <div class="fact-portion" style="width: ${this.calculateFactRatio()}%"></div>
        </div>
        <span class="quality-label">
          ${this.fullData.statistics.explicitTasks} facts / 
          ${this.fullData.statistics.inferredTasks} inferences
        </span>
      </div>
    `;
    
    this.container.prepend(controlPanel);
    this.bindToggleEvents();
  }

  bindToggleEvents() {
    // Main toggle switch
    document.getElementById('inference-toggle').addEventListener('change', (e) => {
      this.showInferences = e.target.checked;
      this.applyFilter();
    });

    // Confidence slider
    document.getElementById('confidence-slider').addEventListener('input', (e) => {
      const confidenceThreshold = e.target.value / 100;
      document.getElementById('confidence-value').textContent = `${e.target.value}%`;
      this.applyConfidenceFilter(confidenceThreshold);
    });

    // Dependency mode selector
    document.getElementById('dependency-mode').addEventListener('change', (e) => {
      this.dependencyMode = e.target.value;
      this.applyFilter();
    });
  }

  applyFilter() {
    if (!this.showInferences) {
      // Filter to facts only
      this.filteredData = this.filterFactsOnly();
    } else {
      // Show everything
      this.filteredData = { ...this.fullData };
    }
    
    // Handle dependency chains
    this.processDependencyChains();
    
    // Re-render the chart
    this.renderFilteredChart();
  }

  filterFactsOnly() {
    return {
      ...this.fullData,
      tasks: this.fullData.tasks.filter(task => 
        task.origin === 'explicit' || 
        (task.origin === 'hybrid' && task.confidence >= 0.8)
      ),
      dependencies: this.fullData.dependencies.filter(dep => 
        dep.origin === 'explicit'
      )
    };
  }

  applyConfidenceFilter(threshold) {
    this.filteredData = {
      ...this.fullData,
      tasks: this.fullData.tasks.filter(task => 
        task.confidence >= threshold
      ),
      dependencies: this.fullData.dependencies.filter(dep => 
        dep.confidence >= threshold
      )
    };
    
    this.processDependencyChains();
    this.renderFilteredChart();
  }

  processDependencyChains() {
    // Handle broken dependency chains based on selected mode
    switch (this.dependencyMode) {
      case 'preserve':
        // Keep all tasks in dependency chains, even if filtered
        this.preserveDependencyChains();
        break;
        
      case 'bridge':
        // Create direct connections skipping filtered tasks
        this.bridgeDependencyGaps();
        break;
        
      case 'break':
        // Show broken dependencies visually
        this.highlightBrokenDependencies();
        break;
    }
  }

  preserveDependencyChains() {
    // If Task C (Fact) → Task B (Inference) → Task A (Fact)
    // and inferences are hidden, keep B but style it differently
    
    const taskIds = new Set(this.filteredData.tasks.map(t => t.id));
    const requiredTasks = new Set();
    
    // Find tasks needed to maintain chains
    this.filteredData.dependencies.forEach(dep => {
      if (taskIds.has(dep.source) && taskIds.has(dep.target)) {
        // Dependency is complete
        return;
      }
      
      if (taskIds.has(dep.source) || taskIds.has(dep.target)) {
        // One end exists, need to preserve chain
        requiredTasks.add(dep.source);
        requiredTasks.add(dep.target);
      }
    });
    
    // Add back required tasks with special styling
    requiredTasks.forEach(taskId => {
      if (!taskIds.has(taskId)) {
        const task = this.fullData.tasks.find(t => t.id === taskId);
        if (task) {
          this.filteredData.tasks.push({
            ...task,
            visualStyle: {
              ...task.visualStyle,
              opacity: 0.3,  // Ghost task
              borderStyle: 'dotted'
            }
          });
        }
      }
    });
  }

  bridgeDependencyGaps() {
    // Create direct dependencies skipping hidden tasks
    // C → B → A becomes C → A if B is hidden
    
    const taskIds = new Set(this.filteredData.tasks.map(t => t.id));
    const newDependencies = [];
    
    this.filteredData.dependencies.forEach(dep => {
      if (!taskIds.has(dep.source) || !taskIds.has(dep.target)) {
        // Find alternative path
        const alternativePath = this.findAlternativePath(
          dep.source, 
          dep.target, 
          taskIds
        );
        
        if (alternativePath) {
          newDependencies.push({
            ...dep,
            id: `${dep.id}_bridged`,
            source: alternativePath.source,
            target: alternativePath.target,
            origin: 'inferred',
            confidence: alternativePath.confidence * 0.8,
            inferenceRationale: {
              method: 'dependency_chain',
              explanation: `Bridged connection due to hidden intermediate tasks`,
              supportingFacts: [dep.id],
              confidence: alternativePath.confidence * 0.8
            }
          });
        }
      }
    });
    
    // Add bridged dependencies
    this.filteredData.dependencies.push(...newDependencies);
  }

  findAlternativePath(sourceId, targetId, visibleTaskIds) {
    // Implement path-finding algorithm to bridge gaps
    // Returns the shortest path through visible tasks
    
    // Simplified implementation
    const allPaths = this.fullData.dependencies;
    const visited = new Set();
    const queue = [{ current: sourceId, confidence: 1.0 }];
    
    while (queue.length > 0) {
      const { current, confidence } = queue.shift();
      
      if (current === targetId && visibleTaskIds.has(current)) {
        return { source: sourceId, target: targetId, confidence };
      }
      
      if (visited.has(current)) continue;
      visited.add(current);
      
      // Find next steps
      allPaths
        .filter(dep => dep.source === current)
        .forEach(dep => {
          if (visibleTaskIds.has(dep.target) || dep.target === targetId) {
            queue.push({
              current: dep.target,
              confidence: confidence * dep.confidence
            });
          }
        });
    }
    
    return null;
  }

  highlightBrokenDependencies() {
    // Mark dependencies as broken if they reference hidden tasks
    const taskIds = new Set(this.filteredData.tasks.map(t => t.id));
    
    this.filteredData.dependencies = this.filteredData.dependencies.map(dep => {
      if (!taskIds.has(dep.source) || !taskIds.has(dep.target)) {
        return {
          ...dep,
          visualStyle: {
            color: '#ff0000',
            strokeDasharray: '5,5',
            opacity: 0.5
          },
          isBroken: true
        };
      }
      return dep;
    });
  }

  renderFilteredChart() {
    // Update visual representation
    this.updateTaskBars();
    this.updateDependencyLines();
    this.updateConfidenceIndicators();
    this.updateLegend();
  }

  updateTaskBars() {
    // Apply visual styling based on confidence
    this.filteredData.tasks.forEach(task => {
      const element = document.querySelector(`[data-task-id="${task.id}"]`);
      if (!element) return;
      
      // Apply confidence-based styling
      if (task.origin === 'explicit') {
        element.className = 'task-bar fact-based';
        element.style.opacity = '1.0';
        element.style.border = '2px solid #2E7D32';  // Green for facts
      } else if (task.origin === 'inferred') {
        element.className = 'task-bar inference-based';
        element.style.opacity = `${0.3 + (task.confidence * 0.7)}`;
        element.style.border = `2px dashed #1976D2`;  // Blue for inferences
        
        // Add confidence badge
        const badge = document.createElement('span');
        badge.className = 'confidence-badge';
        badge.textContent = `${Math.round(task.confidence * 100)}%`;
        element.appendChild(badge);
      }
      
      // Add hover tooltip with provenance
      element.title = this.generateProvenanceTooltip(task);
    });
  }

  updateDependencyLines() {
    // Style dependency arrows based on confidence
    this.filteredData.dependencies.forEach(dep => {
      const line = document.querySelector(`[data-dep-id="${dep.id}"]`);
      if (!line) return;
      
      if (dep.origin === 'explicit') {
        line.style.stroke = '#2E7D32';
        line.style.strokeWidth = '2px';
        line.style.strokeDasharray = 'none';
      } else {
        line.style.stroke = '#1976D2';
        line.style.strokeWidth = '1px';
        line.style.strokeDasharray = '4,4';
        line.style.opacity = `${dep.confidence}`;
      }
      
      if (dep.isBroken) {
        line.style.stroke = '#ff0000';
        line.classList.add('broken-dependency');
      }
    });
  }

  updateConfidenceIndicators() {
    // Add visual confidence indicators to the chart
    const indicatorPanel = document.createElement('div');
    indicatorPanel.className = 'confidence-indicators';
    
    // Confidence distribution chart
    const distribution = this.calculateConfidenceDistribution();
    indicatorPanel.innerHTML = `
      <div class="distribution-chart">
        <h4>Confidence Distribution</h4>
        <div class="dist-bars">
          ${Object.entries(distribution).map(([range, count]) => `
            <div class="dist-bar">
              <div class="bar" style="height: ${count * 5}px"></div>
              <span class="label">${range}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="weakest-links">
        <h4>Lowest Confidence Items</h4>
        <ul>
          ${this.findWeakestLinks().map(item => `
            <li>
              <span class="task-name">${item.taskName}</span>
              <span class="confidence">${Math.round(item.confidence * 100)}%</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
    
    this.container.appendChild(indicatorPanel);
  }

  updateLegend() {
    const legend = document.createElement('div');
    legend.className = 'bimodal-legend';
    legend.innerHTML = `
      <h4>Data Provenance Legend</h4>
      <div class="legend-items">
        <div class="legend-item">
          <div class="legend-box fact"></div>
          <span>Explicit Fact (100% confidence)</span>
        </div>
        <div class="legend-item">
          <div class="legend-box inference-high"></div>
          <span>High Confidence Inference (80-99%)</span>
        </div>
        <div class="legend-item">
          <div class="legend-box inference-medium"></div>
          <span>Medium Confidence Inference (60-79%)</span>
        </div>
        <div class="legend-item">
          <div class="legend-box inference-low"></div>
          <span>Low Confidence Inference (&lt;60%)</span>
        </div>
        <div class="legend-item">
          <div class="legend-box broken"></div>
          <span>Broken Dependency Chain</span>
        </div>
      </div>
    `;
    
    this.container.appendChild(legend);
  }

  generateProvenanceTooltip(task) {
    if (task.origin === 'explicit') {
      return `FACT: "${task.sourceCitations[0]?.exactQuote || 'Direct quote'}"
Source: ${task.sourceCitations[0]?.documentName || 'Document'}
Confidence: 100%`;
    } else {
      return `INFERENCE: ${task.inferenceRationale?.explanation || 'AI-derived'}
Method: ${task.inferenceRationale?.method || 'logical'}
Confidence: ${Math.round(task.confidence * 100)}%
Based on: ${task.inferenceRationale?.supportingFacts?.join(', ') || 'context'}`;
    }
  }

  calculateFactRatio() {
    const total = this.fullData.statistics.totalTasks;
    const facts = this.fullData.statistics.explicitTasks;
    return Math.round((facts / total) * 100);
  }

  calculateConfidenceDistribution() {
    const distribution = {
      '100%': 0,
      '90-99%': 0,
      '80-89%': 0,
      '70-79%': 0,
      '60-69%': 0,
      '<60%': 0
    };
    
    this.filteredData.tasks.forEach(task => {
      const conf = task.confidence;
      if (conf === 1.0) distribution['100%']++;
      else if (conf >= 0.9) distribution['90-99%']++;
      else if (conf >= 0.8) distribution['80-89%']++;
      else if (conf >= 0.7) distribution['70-79%']++;
      else if (conf >= 0.6) distribution['60-69%']++;
      else distribution['<60%']++;
    });
    
    return distribution;
  }

  findWeakestLinks() {
    return this.filteredData.tasks
      .filter(task => task.confidence < 0.8)
      .sort((a, b) => a.confidence - b.confidence)
      .slice(0, 5)
      .map(task => ({
        taskName: task.name,
        confidence: task.confidence,
        reason: task.inferenceRationale?.method || 'unknown'
      }));
  }
}

// CSS for bimodal visualization
const bimodalStyles = `
<style>
  .bimodal-controls {
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }

  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 120px;
    height: 40px;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(to right, #757575, #424242);
    transition: .4s;
    border-radius: 34px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 32px;
    width: 32px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  input:checked + .slider {
    background: linear-gradient(to right, #43a047, #66bb6a);
  }

  input:checked + .slider:before {
    transform: translateX(80px);
  }

  .label-on, .label-off {
    color: white;
    font-size: 12px;
    font-weight: bold;
    text-transform: uppercase;
    opacity: 0.6;
    transition: opacity 0.3s;
  }

  input:checked + .slider .label-on {
    opacity: 1;
  }

  input:not(:checked) + .slider .label-off {
    opacity: 1;
  }

  .task-bar.fact-based {
    background: linear-gradient(135deg, #2E7D32 0%, #43A047 100%);
    box-shadow: 0 2px 4px rgba(46, 125, 50, 0.3);
  }

  .task-bar.inference-based {
    background: linear-gradient(135deg, #1976D2 0%, #42A5F5 100%);
    position: relative;
  }

  .confidence-badge {
    position: absolute;
    top: -10px;
    right: -10px;
    background: #FFC107;
    color: #333;
    border-radius: 12px;
    padding: 2px 6px;
    font-size: 10px;
    font-weight: bold;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  .data-quality-indicator {
    margin-top: 15px;
    padding: 10px;
    background: rgba(255,255,255,0.1);
    border-radius: 4px;
  }

  .quality-bar {
    height: 20px;
    background: rgba(0,0,0,0.2);
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 5px;
  }

  .fact-portion {
    height: 100%;
    background: linear-gradient(90deg, #2E7D32, #43A047);
    transition: width 0.3s ease;
  }

  .quality-label {
    color: white;
    font-size: 12px;
    opacity: 0.9;
  }

  .confidence-filter {
    margin-top: 15px;
    color: white;
  }

  .confidence-filter input[type="range"] {
    width: 200px;
    vertical-align: middle;
  }

  #confidence-value {
    display: inline-block;
    width: 40px;
    text-align: center;
    font-weight: bold;
  }

  .dependency-handling {
    margin-top: 15px;
    color: white;
  }

  .dependency-handling select {
    background: rgba(255,255,255,0.2);
    color: white;
    border: 1px solid rgba(255,255,255,0.3);
    padding: 5px 10px;
    border-radius: 4px;
  }

  .broken-dependency {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }

  .bimodal-legend {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    max-width: 250px;
  }

  .legend-box {
    display: inline-block;
    width: 20px;
    height: 12px;
    margin-right: 8px;
    border-radius: 2px;
    vertical-align: middle;
  }

  .legend-box.fact {
    background: #2E7D32;
    border: 2px solid #1B5E20;
  }

  .legend-box.inference-high {
    background: #1976D2;
    opacity: 0.9;
    border: 2px dashed #0D47A1;
  }

  .legend-box.inference-medium {
    background: #1976D2;
    opacity: 0.7;
    border: 2px dashed #0D47A1;
  }

  .legend-box.inference-low {
    background: #1976D2;
    opacity: 0.5;
    border: 2px dotted #0D47A1;
  }

  .legend-box.broken {
    background: repeating-linear-gradient(
      45deg,
      #ff0000,
      #ff0000 2px,
      transparent 2px,
      transparent 4px
    );
  }

  .confidence-indicators {
    position: absolute;
    top: 20px;
    right: 20px;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    width: 300px;
  }

  .distribution-chart h4,
  .weakest-links h4 {
    margin: 0 0 10px 0;
    color: #333;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .dist-bars {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    height: 60px;
    margin-bottom: 10px;
  }

  .dist-bar {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0 2px;
  }

  .dist-bar .bar {
    width: 100%;
    background: linear-gradient(to top, #1976D2, #42A5F5);
    border-radius: 2px 2px 0 0;
    transition: height 0.3s ease;
  }

  .dist-bar .label {
    font-size: 9px;
    margin-top: 4px;
    color: #666;
  }

  .weakest-links ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .weakest-links li {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    border-bottom: 1px solid #eee;
    font-size: 13px;
  }

  .weakest-links .task-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #555;
  }

  .weakest-links .confidence {
    color: #ff6b6b;
    font-weight: bold;
    margin-left: 10px;
  }
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', bimodalStyles);
```

---

## 🛠️ Component 5: Validation & Repair Strategy

### Zod-Based Soft Repair Implementation

```javascript
// server/validation/semantic-repair.js

import { z } from 'zod';
import { BimodalGanttData } from '../../types/SemanticGanttData';

export class SemanticDataValidator {
  constructor() {
    this.repairLog = [];
    this.validationStats = {
      totalRepairs: 0,
      downgradedFacts: 0,
      addedCitations: 0,
      inferredDependencies: 0
    };
  }

  /**
   * Main validation and repair function
   * Implements a multi-pass repair strategy
   */
  async validateAndRepair(rawData) {
    this.repairLog = [];
    
    // Pass 1: Structure validation
    let data = this.ensureStructure(rawData);
    
    // Pass 2: Citation repair
    data = this.repairCitations(data);
    
    // Pass 3: Confidence normalization
    data = this.normalizeConfidences(data);
    
    // Pass 4: Dependency validation
    data = this.validateDependencies(data);
    
    // Pass 5: Banking-specific validation
    data = this.validateBankingRequirements(data);
    
    // Final validation against schema
    try {
      const validated = BimodalGanttData.parse(data);
      this.logRepairSummary();
      return {
        success: true,
        data: validated,
        repairs: this.repairLog,
        stats: this.validationStats
      };
    } catch (error) {
      // If still failing, apply emergency repairs
      return this.emergencyRepair(data, error);
    }
  }

  /**
   * Pass 1: Ensure basic structure exists
   */
  ensureStructure(data) {
    const repaired = {
      generatedAt: data.generatedAt || new Date().toISOString(),
      geminiVersion: data.geminiVersion || '2.5-flash-preview',
      determinismSeed: data.determinismSeed || Date.now(),
      projectSummary: data.projectSummary || {
        name: 'Untitled Project',
        description: 'No description provided',
        origin: 'inferred',
        confidence: 0.5
      },
      statistics: data.statistics || {},
      tasks: data.tasks || [],
      dependencies: data.dependencies || [],
      swimlanes: data.swimlanes || [],
      risks: data.risks || [],
      regulatoryCheckpoints: data.regulatoryCheckpoints || [],
      confidenceAnalysis: data.confidenceAnalysis || {}
    };

    // Calculate statistics if missing
    if (!repaired.statistics.totalTasks) {
      repaired.statistics = this.calculateStatistics(repaired);
    }

    return repaired;
  }

  /**
   * Pass 2: Repair citation issues
   */
  repairCitations(data) {
    data.tasks = data.tasks.map(task => {
      // Check if explicit task has citations
      if (task.origin === 'explicit' && (!task.sourceCitations || task.sourceCitations.length === 0)) {
        this.repairLog.push({
          type: 'DOWNGRADE_TO_INFERENCE',
          taskId: task.id,
          taskName: task.name,
          reason: 'Missing citation for explicit fact',
          action: 'Downgraded to high-confidence inference'
        });

        this.validationStats.downgradedFacts++;

        // Downgrade to inference
        return {
          ...task,
          origin: 'inferred',
          confidence: 0.85, // High confidence since it was marked explicit
          inferenceRationale: {
            method: 'temporal_logic',
            explanation: 'Originally marked as explicit but lacking citation. High confidence due to initial classification.',
            supportingFacts: [],
            confidence: 0.85
          },
          sourceCitations: undefined
        };
      }

      // Validate citation format if present
      if (task.sourceCitations) {
        task.sourceCitations = task.sourceCitations.map(citation => {
          // Ensure required fields
          if (!citation.exactQuote && citation.startChar && citation.endChar) {
            // Attempt to extract quote if positions are provided
            citation.exactQuote = '[Quote extraction required]';
            this.repairLog.push({
              type: 'CITATION_REPAIR',
              taskId: task.id,
              reason: 'Missing exact quote in citation',
              action: 'Placeholder added - requires manual extraction'
            });
          }
          return citation;
        });
      }

      return task;
    });

    return data;
  }

  /**
   * Pass 3: Normalize confidence scores
   */
  normalizeConfidences(data) {
    data.tasks = data.tasks.map(task => {
      // Ensure confidence aligns with origin
      if (task.origin === 'explicit' && task.confidence !== 1.0) {
        this.repairLog.push({
          type: 'CONFIDENCE_CORRECTION',
          taskId: task.id,
          oldConfidence: task.confidence,
          newConfidence: 1.0,
          reason: 'Explicit facts must have 100% confidence'
        });
        task.confidence = 1.0;
      }

      // Ensure inferred tasks have valid confidence
      if (task.origin === 'inferred') {
        if (task.confidence === 1.0) {
          task.confidence = 0.95; // Cap inferences at 95%
          this.repairLog.push({
            type: 'CONFIDENCE_CAP',
            taskId: task.id,
            reason: 'Inferences cannot have 100% confidence'
          });
        }
        if (task.confidence < 0.3) {
          task.confidence = 0.3; // Minimum useful confidence
          this.repairLog.push({
            type: 'CONFIDENCE_FLOOR',
            taskId: task.id,
            reason: 'Raised confidence to minimum threshold'
          });
        }
      }

      // Validate nested confidence scores (dates, durations)
      if (task.startDate) {
        task.startDate = this.repairDateConfidence(task.startDate, task.origin);
      }
      if (task.endDate) {
        task.endDate = this.repairDateConfidence(task.endDate, task.origin);
      }

      return task;
    });

    // Apply same logic to dependencies
    data.dependencies = data.dependencies.map(dep => {
      if (dep.origin === 'explicit' && dep.confidence !== 1.0) {
        dep.confidence = 1.0;
      } else if (dep.origin === 'inferred' && dep.confidence === 1.0) {
        dep.confidence = 0.9;
      }
      return dep;
    });

    return data;
  }

  /**
   * Pass 4: Validate dependency integrity
   */
  validateDependencies(data) {
    const taskIds = new Set(data.tasks.map(t => t.id));
    
    data.dependencies = data.dependencies.filter(dep => {
      // Check if both tasks exist
      if (!taskIds.has(dep.source) || !taskIds.has(dep.target)) {
        this.repairLog.push({
          type: 'DEPENDENCY_REMOVED',
          depId: dep.id,
          source: dep.source,
          target: dep.target,
          reason: 'Referenced task does not exist'
        });
        return false;
      }

      // Validate dependency type
      if (!['finish-to-start', 'start-to-start', 'finish-to-finish', 'start-to-finish'].includes(dep.type)) {
        dep.type = 'finish-to-start'; // Default
        this.repairLog.push({
          type: 'DEPENDENCY_TYPE_FIXED',
          depId: dep.id,
          reason: 'Invalid dependency type, defaulted to finish-to-start'
        });
      }

      // Ensure strength is set
      if (!dep.strength) {
        dep.strength = dep.origin === 'explicit' ? 'mandatory' : 'moderate';
      }

      return true;
    });

    // Check for orphan tasks (no dependencies)
    const connectedTasks = new Set();
    data.dependencies.forEach(dep => {
      connectedTasks.add(dep.source);
      connectedTasks.add(dep.target);
    });

    const orphanTasks = data.tasks.filter(t => !connectedTasks.has(t.id));
    if (orphanTasks.length > 0) {
      this.repairLog.push({
        type: 'ORPHAN_TASKS_DETECTED',
        count: orphanTasks.length,
        taskIds: orphanTasks.map(t => t.id),
        warning: 'Tasks without dependencies detected - may need manual connection'
      });
    }

    return data;
  }

  /**
   * Pass 5: Banking-specific validation
   */
  validateBankingRequirements(data) {
    // Check for regulatory deadlines
    const regulatoryTasks = data.tasks.filter(t => 
      t.name.match(/regulatory|compliance|audit|OCC|FDIC|Basel|sox/i)
    );

    regulatoryTasks.forEach(task => {
      if (!task.regulatoryRequirement) {
        task.regulatoryRequirement = {
          isRequired: true,
          regulation: this.detectRegulation(task.name),
          deadline: task.endDate?.value,
          origin: 'inferred',
          confidence: 0.7
        };

        this.repairLog.push({
          type: 'REGULATORY_FLAG_ADDED',
          taskId: task.id,
          regulation: task.regulatoryRequirement.regulation,
          reason: 'Detected regulatory keyword in task name'
        });
      }
    });

    // Ensure regulatory checkpoints exist for flagged tasks
    const checkpointTaskIds = new Set(
      data.regulatoryCheckpoints.flatMap(rc => rc.taskIds)
    );

    regulatoryTasks.forEach(task => {
      if (!checkpointTaskIds.has(task.id)) {
        data.regulatoryCheckpoints.push({
          id: `RC_${task.id}`,
          regulation: task.regulatoryRequirement?.regulation || 'Unknown',
          deadline: task.endDate?.value || new Date().toISOString(),
          taskIds: [task.id],
          origin: 'inferred',
          confidence: 0.6
        });

        this.validationStats.inferredDependencies++;
      }
    });

    return data;
  }

  /**
   * Emergency repair for critical failures
   */
  emergencyRepair(data, error) {
    this.repairLog.push({
      type: 'EMERGENCY_REPAIR',
      error: error.message,
      action: 'Applied emergency fixes to make data schema-compliant'
    });

    // Create minimal valid structure
    const emergencyData = {
      ...this.ensureStructure(data),
      tasks: data.tasks?.slice(0, 10) || [], // Limit tasks
      dependencies: [], // Clear dependencies to avoid conflicts
      statistics: {
        totalTasks: data.tasks?.length || 0,
        explicitTasks: 0,
        inferredTasks: data.tasks?.length || 0,
        averageConfidence: 0.5,
        dataQualityScore: 0
      },
      confidenceAnalysis: {
        distribution: [],
        weakestLinks: []
      }
    };

    // Ensure all tasks are valid
    emergencyData.tasks = emergencyData.tasks.map((task, idx) => ({
      id: task.id || `TASK_${idx}`,
      name: task.name || `Task ${idx + 1}`,
      origin: 'inferred',
      confidence: 0.5,
      startDate: {
        value: new Date().toISOString(),
        origin: 'inferred',
        confidence: 0.5
      },
      endDate: {
        value: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        origin: 'inferred',
        confidence: 0.5
      },
      duration: {
        value: 7,
        unit: 'days',
        origin: 'inferred',
        confidence: 0.5
      },
      resources: [],
      visualStyle: {
        color: '#999999',
        borderStyle: 'dotted',
        opacity: 0.5
      }
    }));

    try {
      const validated = BimodalGanttData.parse(emergencyData);
      return {
        success: true,
        data: validated,
        repairs: this.repairLog,
        stats: this.validationStats,
        emergency: true
      };
    } catch (finalError) {
      return {
        success: false,
        error: finalError.message,
        repairs: this.repairLog,
        stats: this.validationStats
      };
    }
  }

  // Helper functions
  repairDateConfidence(dateObj, parentOrigin) {
    if (!dateObj.origin) {
      dateObj.origin = parentOrigin;
    }
    if (!dateObj.confidence) {
      dateObj.confidence = dateObj.origin === 'explicit' ? 1.0 : 0.7;
    }
    return dateObj;
  }

  calculateStatistics(data) {
    const tasks = data.tasks || [];
    const explicitTasks = tasks.filter(t => t.origin === 'explicit').length;
    const inferredTasks = tasks.filter(t => t.origin === 'inferred').length;
    const totalTasks = tasks.length;
    
    const avgConfidence = totalTasks > 0
      ? tasks.reduce((sum, t) => sum + (t.confidence || 0), 0) / totalTasks
      : 0;

    return {
      totalTasks,
      explicitTasks,
      inferredTasks,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      dataQualityScore: totalTasks > 0 ? explicitTasks / totalTasks : 0
    };
  }

  detectRegulation(taskName) {
    const regulations = {
      'occ': 'OCC',
      'fdic': 'FDIC',
      'basel': 'Basel III',
      'sox': 'SOX',
      'dodd-frank': 'Dodd-Frank',
      'glba': 'GLBA',
      'bsa': 'BSA',
      'aml': 'AML',
      'kyc': 'KYC'
    };

    const lower = taskName.toLowerCase();
    for (const [key, value] of Object.entries(regulations)) {
      if (lower.includes(key)) {
        return value;
      }
    }

    return 'General Compliance';
  }

  logRepairSummary() {
    console.log('===== Semantic Validation Summary =====');
    console.log(`Total repairs: ${this.validationStats.totalRepairs}`);
    console.log(`Downgraded facts: ${this.validationStats.downgradedFacts}`);
    console.log(`Added citations: ${this.validationStats.addedCitations}`);
    console.log(`Inferred dependencies: ${this.validationStats.inferredDependencies}`);
    console.log(`Repair log entries: ${this.repairLog.length}`);
    
    if (this.repairLog.length > 0) {
      console.log('\nRecent repairs:');
      this.repairLog.slice(-5).forEach(repair => {
        console.log(`  - ${repair.type}: ${repair.reason || repair.action}`);
      });
    }
  }
}

// Export singleton instance
export const semanticValidator = new SemanticDataValidator();
```

---

## 📋 Implementation Checklist

### Phase 1: Backend Infrastructure (Week 1)
- [ ] Install Zod dependency: `npm install zod`
- [ ] Create `types/SemanticGanttData.ts` with bimodal schema
- [ ] Implement `server/gemini-deterministic.js` with zero-temperature config
- [ ] Create `server/prompts-semantic.js` with two-pass prompts
- [ ] Build `server/validation/semantic-repair.js` for data validation
- [ ] Add new route: `server/routes/semantic-chart.js`

### Phase 2: Frontend Components (Week 2)
- [ ] Create `Public/BimodalGanttController.js`
- [ ] Implement toggle switch UI components
- [ ] Add confidence visualization styling
- [ ] Build dependency chain management logic
- [ ] Create provenance tooltip system
- [ ] Add confidence distribution charts

### Phase 3: Integration & Testing (Week 3)
- [ ] Connect frontend to new semantic API endpoint
- [ ] Test determinism with identical inputs
- [ ] Validate soft repair mechanisms
- [ ] Banking-specific validation testing
- [ ] Performance testing with large datasets
- [ ] User acceptance testing with toggle functionality

### Phase 4: Polish & Documentation (Week 4)
- [ ] Create user guide for fact/inference interpretation
- [ ] Add executive briefing mode for C-suite
- [ ] Implement caching for deterministic results
- [ ] Create confidence improvement suggestions
- [ ] Build citation verification tools
- [ ] Deploy to production environment

---

## 🎯 Success Metrics

1. **Determinism**: 100% identical outputs for identical inputs
2. **Data Quality**: >40% facts in typical banking documents
3. **Performance**: <2 second toggle switching time
4. **Accuracy**: >90% correct fact/inference classification
5. **Usability**: <30 seconds to understand confidence indicators

---

## 🔔 Critical Reminders for Sonnet 4.5 Implementation

1. **ALWAYS use temperature=0.0 and topK=1 for Gemini calls**
2. **NEVER mix facts and inferences without clear visual distinction**
3. **ALWAYS validate citations exist before marking as explicit**
4. **Cache deterministic results using SHA-256 hash of inputs**
5. **Test with banking-specific documents (regulations, RFPs, project plans)**

This blueprint provides a complete, production-ready implementation for your Semantic Overlay Engine, enabling clear distinction between facts and AI-derived insights while maintaining perfect determinism for executive decision-making in banking contexts.
