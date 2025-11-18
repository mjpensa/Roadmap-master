# Semantic Overlay Engine - Quick Implementation Guide
## Immediate Deployment for Sonnet 4.5

---

## 🚀 Quick Start: Minimal Working Implementation

### Step 1: Install Required Dependencies

```bash
npm install zod @google/generative-ai
```

### Step 2: Create Core Files (Copy-Paste Ready)

#### A. Backend Route (`server/routes/semantic-gantt.js`)

```javascript
import express from 'express';
import { getDeterministicClient } from '../gemini-deterministic.js';
import { semanticValidator } from '../validation/semantic-repair.js';
import { BimodalGanttData } from '../../types/SemanticGanttData.js';

const router = express.Router();

router.post('/api/generate-semantic-gantt', async (req, res) => {
  try {
    const { researchText, userPrompt } = req.body;
    
    // Get deterministic Gemini client
    const geminiClient = getDeterministicClient(process.env.API_KEY);
    
    // Generate bimodal data
    const rawData = await geminiClient.generateStructuredGantt(
      researchText, 
      userPrompt
    );
    
    // Validate and repair
    const validationResult = await semanticValidator.validateAndRepair(rawData);
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Data validation failed',
        repairs: validationResult.repairs
      });
    }
    
    // Return validated bimodal data
    res.json({
      success: true,
      data: validationResult.data,
      metadata: {
        factCount: validationResult.data.statistics.explicitTasks,
        inferenceCount: validationResult.data.statistics.inferredTasks,
        averageConfidence: validationResult.data.statistics.averageConfidence,
        repairs: validationResult.repairs.length
      }
    });
    
  } catch (error) {
    console.error('Semantic Gantt Generation Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate semantic Gantt chart',
      details: error.message 
    });
  }
});

export default router;
```

#### B. Minimal Frontend Toggle (`Public/semantic-toggle.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Semantic Gantt Chart - Banking Edition</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0c2340 0%, #1e3c72 100%);
            color: white;
            padding: 20px;
        }

        .control-panel {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
        }

        .toggle-container {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .toggle-switch {
            position: relative;
            width: 80px;
            height: 40px;
            background: #555;
            border-radius: 20px;
            cursor: pointer;
            transition: background 0.3s;
        }

        .toggle-switch.active {
            background: linear-gradient(90deg, #4CAF50, #45a049);
        }

        .toggle-slider {
            position: absolute;
            width: 36px;
            height: 36px;
            background: white;
            border-radius: 50%;
            top: 2px;
            left: 2px;
            transition: transform 0.3s;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        .toggle-switch.active .toggle-slider {
            transform: translateX(40px);
        }

        .stats-bar {
            display: flex;
            height: 30px;
            border-radius: 15px;
            overflow: hidden;
            margin-top: 15px;
            background: rgba(0,0,0,0.2);
        }

        .facts-portion {
            background: #4CAF50;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
        }

        .inferences-portion {
            background: #2196F3;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
        }

        .task {
            padding: 12px;
            margin: 8px 0;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.3s;
        }

        .task.fact {
            background: rgba(76, 175, 80, 0.2);
            border: 2px solid #4CAF50;
        }

        .task.inference {
            background: rgba(33, 150, 243, 0.1);
            border: 2px dashed #2196F3;
        }

        .task.hidden {
            display: none;
        }

        .confidence-badge {
            background: #FFC107;
            color: #333;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
        }

        .citation {
            font-size: 11px;
            color: #81C784;
            margin-top: 4px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="control-panel">
        <h2>🏦 Banking Project Gantt Chart - Semantic View</h2>
        
        <div class="toggle-container">
            <span>Facts Only</span>
            <div class="toggle-switch active" id="semanticToggle">
                <div class="toggle-slider"></div>
            </div>
            <span>+ AI Insights</span>
        </div>

        <div class="stats-bar" id="statsBar">
            <!-- Dynamically filled -->
        </div>

        <p id="statsText" style="margin-top: 10px; font-size: 14px; opacity: 0.9;"></p>
    </div>

    <div id="ganttContainer">
        <!-- Tasks will be rendered here -->
    </div>

    <script>
        class SemanticGanttViewer {
            constructor() {
                this.showInferences = true;
                this.data = null;
                this.init();
            }

            async init() {
                // Load data from API
                await this.loadData();
                
                // Set up toggle
                this.setupToggle();
                
                // Initial render
                this.render();
            }

            async loadData() {
                try {
                    const response = await fetch('/api/get-current-gantt');
                    this.data = await response.json();
                    this.updateStats();
                } catch (error) {
                    console.error('Failed to load data:', error);
                    // Use mock data for demo
                    this.data = this.getMockData();
                    this.updateStats();
                }
            }

            setupToggle() {
                const toggle = document.getElementById('semanticToggle');
                toggle.addEventListener('click', () => {
                    this.showInferences = !this.showInferences;
                    toggle.classList.toggle('active');
                    this.render();
                });
            }

            updateStats() {
                if (!this.data) return;

                const stats = this.data.statistics || {};
                const factCount = stats.explicitTasks || 0;
                const inferenceCount = stats.inferredTasks || 0;
                const total = factCount + inferenceCount;
                
                const factPercent = total > 0 ? (factCount / total * 100) : 0;
                const inferencePercent = total > 0 ? (inferenceCount / total * 100) : 0;

                // Update stats bar
                document.getElementById('statsBar').innerHTML = `
                    <div class="facts-portion" style="width: ${factPercent}%">
                        ${factCount} Facts
                    </div>
                    <div class="inferences-portion" style="width: ${inferencePercent}%">
                        ${inferenceCount} Inferences
                    </div>
                `;

                // Update text
                document.getElementById('statsText').textContent = 
                    `Data Quality: ${factPercent.toFixed(0)}% verified facts, ` +
                    `Average Confidence: ${(stats.averageConfidence * 100).toFixed(0)}%`;
            }

            render() {
                const container = document.getElementById('ganttContainer');
                container.innerHTML = '';

                if (!this.data || !this.data.tasks) {
                    container.innerHTML = '<p>No data available</p>';
                    return;
                }

                // Sort tasks by confidence (facts first)
                const sortedTasks = [...this.data.tasks].sort((a, b) => 
                    b.confidence - a.confidence
                );

                sortedTasks.forEach(task => {
                    const shouldShow = this.showInferences || task.origin === 'explicit';
                    
                    const taskEl = document.createElement('div');
                    taskEl.className = `task ${task.origin === 'explicit' ? 'fact' : 'inference'} ${!shouldShow ? 'hidden' : ''}`;
                    
                    // Build task content
                    let content = `
                        <div>
                            <strong>${task.name}</strong>
                            ${task.origin === 'explicit' && task.sourceCitations?.[0] ? 
                                `<div class="citation">Source: "${task.sourceCitations[0].exactQuote?.substring(0, 50)}..."</div>` : 
                                ''}
                            ${task.origin === 'inferred' ? 
                                `<div class="citation">AI: ${task.inferenceRationale?.explanation || 'Logical inference'}</div>` : 
                                ''}
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                    `;

                    // Add dates if available
                    if (task.startDate && task.endDate) {
                        const start = new Date(task.startDate.value).toLocaleDateString();
                        const end = new Date(task.endDate.value).toLocaleDateString();
                        content += `<span style="font-size: 12px; opacity: 0.8;">${start} - ${end}</span>`;
                    }

                    // Add confidence badge for inferences
                    if (task.origin === 'inferred') {
                        const confidencePercent = Math.round(task.confidence * 100);
                        content += `<span class="confidence-badge">${confidencePercent}%</span>`;
                    }

                    content += '</div>';
                    
                    taskEl.innerHTML = content;
                    container.appendChild(taskEl);
                });
            }

            getMockData() {
                return {
                    statistics: {
                        explicitTasks: 5,
                        inferredTasks: 3,
                        averageConfidence: 0.85
                    },
                    tasks: [
                        {
                            id: 'T1',
                            name: 'OCC Regulatory Approval Submission',
                            origin: 'explicit',
                            confidence: 1.0,
                            startDate: { value: '2026-01-15T00:00:00Z' },
                            endDate: { value: '2026-02-28T00:00:00Z' },
                            sourceCitations: [{
                                exactQuote: 'OCC submission must be completed by end of Q1 2026'
                            }]
                        },
                        {
                            id: 'T2',
                            name: 'Vendor Security Assessment',
                            origin: 'inferred',
                            confidence: 0.75,
                            startDate: { value: '2025-12-01T00:00:00Z' },
                            endDate: { value: '2026-01-14T00:00:00Z' },
                            inferenceRationale: {
                                explanation: 'Standard 45-day vendor assessment required before regulatory submission'
                            }
                        },
                        {
                            id: 'T3',
                            name: 'Core Banking System Integration',
                            origin: 'explicit',
                            confidence: 1.0,
                            startDate: { value: '2026-03-01T00:00:00Z' },
                            endDate: { value: '2026-06-30T00:00:00Z' },
                            sourceCitations: [{
                                exactQuote: 'Integration with FIS core platform scheduled for Q2-Q3 2026'
                            }]
                        }
                    ]
                };
            }
        }

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', () => {
            new SemanticGanttViewer();
        });
    </script>
</body>
</html>
```

---

## 🎯 Minimal Working Example for Testing

### Backend Test Endpoint (`server/test-semantic.js`)

```javascript
// Quick test endpoint to verify semantic processing
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

router.post('/api/test-semantic', async (req, res) => {
  const { text } = req.body;
  
  // Ultra-simple two-pass prompt
  const SIMPLE_PROMPT = `
PASS 1: Find explicit facts (things directly stated):
"${text}"

PASS 2: Make logical inferences from those facts.

Return JSON:
{
  "facts": [{"content": "...", "quote": "..."}],
  "inferences": [{"content": "...", "reasoning": "...", "confidence": 0.X}]
}`;

  try {
    const genAI = new GoogleGenerativeAI(process.env.API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-preview',
      generationConfig: {
        temperature: 0,
        topK: 1
      }
    });
    
    const result = await model.generateContent(SIMPLE_PROMPT);
    const response = await result.response;
    const jsonStr = response.text().replace(/```json|```/g, '').trim();
    const data = JSON.parse(jsonStr);
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## 📊 Banking-Specific Implementation Examples

### A. Regulatory Deadline Detection

```javascript
// server/banking-semantic-rules.js

export const BANKING_RULES = {
  // Regulatory patterns with confidence scores
  regulatory_deadlines: {
    'OCC': { reviewDays: 45, confidence: 0.9 },
    'FDIC': { reviewDays: 60, confidence: 0.85 },
    'Federal Reserve': { reviewDays: 90, confidence: 0.8 },
    'state banking': { reviewDays: 30, confidence: 0.75 }
  },

  // Common banking project phases
  standard_phases: {
    'vendor assessment': { duration: 45, unit: 'days', confidence: 0.8 },
    'compliance review': { duration: 6, unit: 'weeks', confidence: 0.85 },
    'UAT': { duration: 2, unit: 'months', confidence: 0.9 },
    'core integration': { duration: 4, unit: 'months', confidence: 0.75 }
  },

  // Risk indicators
  risk_keywords: [
    'legacy system', 'mainframe', 'COBOL', 'AS400',
    'data migration', 'customer impact', 'downtime'
  ]
};

// Apply banking rules to enhance inference
export function applyBankingRules(task) {
  let enhancements = {};
  
  // Check for regulatory mentions
  for (const [regulator, rules] of Object.entries(BANKING_RULES.regulatory_deadlines)) {
    if (task.name.toLowerCase().includes(regulator.toLowerCase())) {
      enhancements.regulatoryBuffer = {
        days: rules.reviewDays,
        confidence: rules.confidence,
        note: `Standard ${regulator} review period`
      };
    }
  }
  
  // Check for standard phases
  for (const [phase, timing] of Object.entries(BANKING_RULES.standard_phases)) {
    if (task.name.toLowerCase().includes(phase)) {
      if (!task.duration || task.duration.origin === 'inferred') {
        enhancements.suggestedDuration = {
          value: timing.duration,
          unit: timing.unit,
          confidence: timing.confidence,
          source: 'Banking industry standard'
        };
      }
    }
  }
  
  // Flag high-risk items
  const hasRiskIndicator = BANKING_RULES.risk_keywords.some(keyword => 
    task.name.toLowerCase().includes(keyword)
  );
  
  if (hasRiskIndicator) {
    enhancements.riskFlag = {
      level: 'high',
      suggestion: 'Add 20% contingency buffer',
      confidence: 0.7
    };
  }
  
  return { ...task, bankingEnhancements: enhancements };
}
```

### B. Executive Dashboard Component

```javascript
// Public/executive-dashboard.js

class ExecutiveDashboard {
  constructor(semanticData) {
    this.data = semanticData;
    this.render();
  }

  render() {
    const dashboard = document.createElement('div');
    dashboard.className = 'executive-dashboard';
    dashboard.innerHTML = `
      <div class="exec-header">
        <h1>Project Intelligence Dashboard</h1>
        <div class="data-quality-score">
          <div class="score-circle">${this.getQualityScore()}%</div>
          <span>Data Confidence</span>
        </div>
      </div>

      <div class="exec-grid">
        <!-- Key Metrics -->
        <div class="metric-card">
          <h3>Timeline Confidence</h3>
          <div class="metric-value">${this.getTimelineConfidence()}%</div>
          <div class="metric-detail">
            ${this.data.statistics.explicitTasks} verified milestones
          </div>
        </div>

        <!-- Regulatory Status -->
        <div class="metric-card regulatory">
          <h3>Regulatory Checkpoints</h3>
          <div class="checkpoint-list">
            ${this.getRegulatoryCheckpoints()}
          </div>
        </div>

        <!-- Risk Assessment -->
        <div class="metric-card risk">
          <h3>Top Risk Factors</h3>
          <div class="risk-list">
            ${this.getTopRisks()}
          </div>
        </div>

        <!-- Decision Points -->
        <div class="metric-card decisions">
          <h3>Upcoming Decisions</h3>
          <div class="decision-list">
            ${this.getDecisionPoints()}
          </div>
        </div>
      </div>

      <div class="inference-warning">
        <span class="warning-icon">ℹ️</span>
        <span>${this.data.statistics.inferredTasks} items are AI-inferred. 
        Toggle "Facts Only" mode for verified data only.</span>
      </div>
    `;

    document.body.prepend(dashboard);
  }

  getQualityScore() {
    const factRatio = this.data.statistics.explicitTasks / 
                      this.data.statistics.totalTasks;
    const avgConfidence = this.data.statistics.averageConfidence;
    return Math.round((factRatio * 0.6 + avgConfidence * 0.4) * 100);
  }

  getTimelineConfidence() {
    // Calculate confidence in timeline predictions
    const timelineTasks = this.data.tasks.filter(t => 
      t.startDate && t.endDate
    );
    
    const avgTimelineConfidence = timelineTasks.reduce((sum, t) => {
      const dateConfidence = (t.startDate.confidence + t.endDate.confidence) / 2;
      return sum + dateConfidence;
    }, 0) / timelineTasks.length;
    
    return Math.round(avgTimelineConfidence * 100);
  }

  getRegulatoryCheckpoints() {
    return this.data.regulatoryCheckpoints
      .slice(0, 3)
      .map(checkpoint => `
        <div class="checkpoint ${checkpoint.origin === 'explicit' ? 'verified' : 'inferred'}">
          <span class="reg-name">${checkpoint.regulation}</span>
          <span class="reg-date">${new Date(checkpoint.deadline).toLocaleDateString()}</span>
          ${checkpoint.origin === 'inferred' ? '<span class="ai-badge">AI</span>' : ''}
        </div>
      `).join('');
  }

  getTopRisks() {
    return this.data.risks
      .filter(r => r.impact === 'high' || r.impact === 'critical')
      .slice(0, 3)
      .map(risk => `
        <div class="risk-item">
          <span class="risk-level ${risk.impact}">${risk.impact.toUpperCase()}</span>
          <span class="risk-desc">${risk.description}</span>
          <div class="risk-confidence">
            Confidence: ${Math.round(risk.confidence * 100)}%
          </div>
        </div>
      `).join('');
  }

  getDecisionPoints() {
    // Find tasks that appear to be decision points
    const decisionTasks = this.data.tasks.filter(t => 
      t.name.match(/approval|decision|review|checkpoint|go.*no.*go/i)
    );
    
    return decisionTasks
      .slice(0, 3)
      .map(task => `
        <div class="decision-item">
          <span class="decision-name">${task.name}</span>
          <span class="decision-date">
            ${task.endDate ? new Date(task.endDate.value).toLocaleDateString() : 'TBD'}
          </span>
          ${task.origin === 'inferred' ? 
            '<span class="inference-note">Estimated</span>' : ''}
        </div>
      `).join('');
  }
}
```

---

## 🔧 Configuration Files

### Environment Variables (`.env`)

```bash
# Gemini API Configuration
API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash-preview

# Determinism Settings
SEMANTIC_TEMPERATURE=0.0
SEMANTIC_TOP_K=1
SEMANTIC_TOP_P=0.0
ENABLE_CACHING=true

# Banking Configuration
DEFAULT_CONFIDENCE_THRESHOLD=0.7
REGULATORY_BUFFER_DAYS=45
ENABLE_BANKING_RULES=true
```

### TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2022", "DOM"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": true
  },
  "include": ["**/*.ts", "**/*.js"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 🧪 Testing Scripts

### Determinism Test

```javascript
// test/test-determinism.js

async function testDeterminism() {
  const testInput = {
    researchText: "The project requires OCC approval by March 2026. Development takes 3 months.",
    userPrompt: "Create a project timeline"
  };
  
  console.log('Testing determinism with 5 identical requests...');
  
  const results = [];
  for (let i = 0; i < 5; i++) {
    const response = await fetch('http://localhost:3000/api/generate-semantic-gantt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testInput)
    });
    
    const data = await response.json();
    results.push(JSON.stringify(data.data));
    
    console.log(`Request ${i + 1}: ${data.metadata.factCount} facts, ${data.metadata.inferenceCount} inferences`);
  }
  
  // Check if all results are identical
  const allIdentical = results.every(r => r === results[0]);
  
  if (allIdentical) {
    console.log('✅ SUCCESS: All outputs are identical - determinism achieved!');
  } else {
    console.log('❌ FAILURE: Outputs differ - check temperature settings');
  }
}

testDeterminism().catch(console.error);
```

---

## 📈 Performance Monitoring

```javascript
// server/monitoring/semantic-metrics.js

export class SemanticMetrics {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      avgFactRatio: 0,
      avgConfidence: 0,
      repairCount: 0,
      cacheHits: 0,
      processingTimes: []
    };
  }

  recordRequest(result, processingTime) {
    this.metrics.totalRequests++;
    
    // Update averages
    const factRatio = result.data.statistics.explicitTasks / 
                     result.data.statistics.totalTasks;
    
    this.metrics.avgFactRatio = 
      (this.metrics.avgFactRatio * (this.metrics.totalRequests - 1) + factRatio) / 
      this.metrics.totalRequests;
    
    this.metrics.avgConfidence = 
      (this.metrics.avgConfidence * (this.metrics.totalRequests - 1) + 
       result.data.statistics.averageConfidence) / 
      this.metrics.totalRequests;
    
    this.metrics.repairCount += result.repairs?.length || 0;
    this.metrics.processingTimes.push(processingTime);
    
    // Log if concerning patterns
    if (factRatio < 0.2) {
      console.warn(`Low fact ratio: ${factRatio.toFixed(2)} for request ${this.metrics.totalRequests}`);
    }
  }

  getReport() {
    const avgProcessingTime = 
      this.metrics.processingTimes.reduce((a, b) => a + b, 0) / 
      this.metrics.processingTimes.length;
    
    return {
      totalRequests: this.metrics.totalRequests,
      avgFactRatio: (this.metrics.avgFactRatio * 100).toFixed(1) + '%',
      avgConfidence: (this.metrics.avgConfidence * 100).toFixed(1) + '%',
      totalRepairs: this.metrics.repairCount,
      avgProcessingTime: avgProcessingTime.toFixed(0) + 'ms',
      cacheHitRate: (this.metrics.cacheHits / this.metrics.totalRequests * 100).toFixed(1) + '%'
    };
  }
}

export const metrics = new SemanticMetrics();
```

---

## 🚦 Deployment Checklist

### Pre-Deployment

- [ ] Set all environment variables
- [ ] Test determinism (5+ identical requests)
- [ ] Verify Zod schemas compile
- [ ] Test with real banking documents
- [ ] Confirm UI toggle works smoothly
- [ ] Check citation extraction accuracy

### Deployment Steps

1. **Backend First**
   ```bash
   npm install zod @google/generative-ai
   cp semantic-gantt.js server/routes/
   cp semantic-repair.js server/validation/
   ```

2. **Frontend Second**
   ```bash
   cp semantic-toggle.html Public/
   cp BimodalGanttController.js Public/
   ```

3. **Integration**
   ```javascript
   // In server.js
   import semanticRoutes from './server/routes/semantic-gantt.js';
   app.use('/', semanticRoutes);
   ```

4. **Testing**
   ```bash
   npm test test-determinism.js
   curl -X POST http://localhost:3000/api/test-semantic \
     -H "Content-Type: application/json" \
     -d '{"text": "OCC approval required by Q2 2026"}'
   ```

### Post-Deployment Monitoring

- Monitor fact/inference ratios
- Track average confidence scores
- Check repair frequency
- Measure toggle performance
- Collect user feedback on clarity

---

## 💡 Pro Tips

1. **Start with high-quality documents** - Better source text = more facts
2. **Use specific banking terminology** - Helps inference engine
3. **Test toggle at different confidence levels** - Find optimal threshold
4. **Cache aggressively** - Deterministic = cacheable forever
5. **Monitor repair logs** - Indicates data quality issues

---

This quickstart guide provides everything needed for immediate implementation. Copy the code blocks, adjust for your environment, and deploy. The system will clearly distinguish facts from inferences, enabling better executive decision-making in your banking consultancy.
