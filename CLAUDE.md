# CLAUDE.md - AI Assistant Guide

> **Last Updated:** 2025-11-17
> **Project:** AI Roadmap Generator
> **Version:** Phase 5 (Interactive Features Complete)

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Directory Structure](#directory-structure)
- [Key Modules](#key-modules)
- [Data Flow](#data-flow)
- [API Endpoints](#api-endpoints)
- [Development Workflows](#development-workflows)
- [Coding Conventions](#coding-conventions)
- [Configuration](#configuration)
- [Common Tasks](#common-tasks)
- [Security Considerations](#security-considerations)
- [Testing & Debugging](#testing--debugging)
- [Important Notes for AI Assistants](#important-notes-for-ai-assistants)

---

## Project Overview

The **AI Roadmap Generator** is a production-ready web application that transforms project research documents into interactive, AI-generated Gantt charts with deep task analysis capabilities.

### Core Capabilities

1. **Chart Generation** - Converts research files (.md, .txt, .docx) into structured Gantt charts
2. **Task Analysis** - Provides multi-phase analysis including risk assessment, timeline scenarios, and progress tracking
3. **Interactive Editing** - Drag-to-reschedule, resize bars, change colors via context menu
4. **Executive Summaries** - AI-synthesized strategic insights across all documents
5. **Q&A Chat** - Context-aware question answering about tasks and projects
6. **Export Capabilities** - PNG export, text export of analysis

### Key Features

- **Async Job Processing** with real-time progress updates
- **Session Management** for maintaining research context
- **URL-based Chart Sharing** (chartId in URL parameters)
- **Edit Mode Toggle** to lock/unlock interactive features
- **Modular Architecture** (90% reduction from original monolith)
- **Security Hardened** with rate limiting, XSS protection, prompt injection defense

---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | Latest | Runtime (ES modules enabled) |
| **Express** | 4.19.2 | Web framework |
| **Google Gemini AI** | gemini-2.5-flash-preview-09-2025 | AI analysis engine |
| **Helmet** | 8.0.0 | Security headers |
| **express-rate-limit** | 7.1.5 | API rate limiting |
| **Multer** | 1.4.5-lts.1 | File upload handling |
| **Mammoth** | 1.7.2 | .docx file parsing |
| **jsonrepair** | 3.13.1 | JSON response repair |
| **dotenv** | 16.4.5 | Environment config |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Vanilla JavaScript** | ES6+ | No framework dependency |
| **Tailwind CSS** | CDN (dev) | Utility-first styling |
| **html2canvas** | 1.4.1 | PNG chart export |
| **DOMPurify** | Latest | XSS sanitization |
| **HTML5 Drag & Drop API** | Native | Interactive editing |

### Deployment

- **Railway** (configured for cloud deployment)
- **In-memory storage** (1-hour expiration for sessions/charts/jobs)
- **Trust proxy: 1 hop** (Railway-specific configuration)

---

## Architecture Overview

### Backend Architecture (Phase 4 Refactor)

**Transformation:** 959-line monolith → Modular 100-line orchestrator (90% reduction)

```
server.js (orchestrator)
├── server/config.js           → Configuration & validation
├── server/middleware.js       → Security, uploads, rate limiting
├── server/storage.js          → Session/chart/job management
├── server/gemini.js           → AI integration with retry logic
├── server/prompts.js          → AI prompts & JSON schemas
├── server/utils.js            → Sanitization & validation
└── server/routes/
    ├── charts.js              → Chart generation & retrieval
    └── analysis.js            → Task analysis & Q&A
```

**Design Patterns:**
- **Separation of Concerns** - Each module has single responsibility
- **Configuration-Driven** - Frozen CONFIG objects prevent modification
- **Async Job Processing** - Background tasks with polling pattern
- **Retry Logic** - Exponential backoff for AI calls
- **Error Recovery** - JSON repair, graceful degradation

### Frontend Architecture (Phase 3 Refactor)

**Transformation:** 931-line monolith → Component-based modules (85% reduction)

```
chart-renderer.js (orchestrator)
├── config.js                  → Frontend configuration
├── Utils.js                   → Shared rendering utilities
├── GanttChart.js              → Core chart rendering (1,230 lines)
├── TaskAnalyzer.js            → Analysis modal with Q&A
├── DraggableGantt.js          → Drag-to-edit functionality
├── ResizableGantt.js          → Bar resizing
├── ContextMenu.js             → Right-click color picker
├── ExecutiveSummary.js        → Strategic insights display
└── ChatInterface.js           → Task Q&A component
```

**Design Patterns:**
- **Class-based Components** - Encapsulated state and behavior
- **Event Delegation** - Efficient event handling
- **Progressive Enhancement** - Core features work, enhancements add value
- **Graceful Degradation** - Handles missing data/errors elegantly

---

## Directory Structure

```
/home/user/Roadmap-master/
│
├── server.js                        # Main entry point (~100 lines)
├── package.json                     # Dependencies & npm scripts
├── .env                             # Environment variables (API_KEY)
├── .gitignore                       # Git ignore rules
├── readme.md                        # Deployment instructions
│
├── server/                          # Backend modules
│   ├── routes/
│   │   ├── charts.js               # Chart generation & retrieval endpoints
│   │   └── analysis.js             # Task analysis & Q&A endpoints
│   ├── config.js                   # Centralized configuration
│   ├── gemini.js                   # Gemini API integration
│   ├── middleware.js               # Security, rate limiting, uploads
│   ├── prompts.js                  # AI prompts & JSON schemas
│   ├── storage.js                  # In-memory session/chart/job storage
│   └── utils.js                    # Sanitization & validation utilities
│
├── Public/                          # Frontend files (static serving)
│   ├── index.html                  # Landing page with upload form
│   ├── chart.html                  # Chart display page
│   ├── style.css                   # Comprehensive styles (1,600+ lines)
│   ├── main.js                     # Form submission & job polling
│   ├── chart-renderer.js           # Chart orchestrator
│   ├── config.js                   # Frontend configuration
│   ├── Utils.js                    # Shared rendering utilities
│   ├── GanttChart.js               # Core chart rendering logic
│   ├── TaskAnalyzer.js             # Task analysis modal
│   ├── ChatInterface.js            # Q&A chat component
│   ├── DraggableGantt.js           # Drag-to-edit implementation
│   ├── ResizableGantt.js           # Bar resizing implementation
│   ├── ContextMenu.js              # Right-click color changing
│   ├── ExecutiveSummary.js         # Executive summary component
│   ├── bip_logo.png                # Logo asset
│   └── vertical-stripe.svg         # Decorative graphics
│
└── Documentation/                   # Implementation guides
    ├── DEPLOYMENT_NOTES.md
    ├── PHASE_1_IMPLEMENTATION_SUMMARY.md
    ├── PHASE_2_IMPLEMENTATION_SUMMARY.md
    ├── PHASE_3_IMPLEMENTATION_SUMMARY.md
    ├── PHASE_5_ENHANCEMENTS.md
    ├── TASK_ANALYSIS_ENHANCEMENT_RECOMMENDATIONS.md
    ├── Code Enhancement Plan.js
    ├── Exec Summary Plan
    └── Gantt Upgrade Plan
```

---

## Key Modules

### Server-Side Modules

#### server/routes/charts.js

**Endpoints:**
- `POST /generate-chart` - Starts async chart generation job
- `GET /job/:id` - Polls job status with progress updates
- `GET /chart/:id` - Retrieves chart by ID for URL-based sharing
- `POST /update-task-dates` - Persists drag-to-edit changes
- `POST /update-task-color` - Persists color changes

**Key Functions:**
- `processChartGeneration()` - Background processing with retry logic
- Job management (createJob, updateJob, completeJob, failJob)
- File parsing (extractTextFromFile for .md, .txt, .docx)

**Rate Limits:**
- `/generate-chart`: 20 requests per 15 minutes (strict)
- Others: 100 requests per 15 minutes

#### server/routes/analysis.js

**Endpoints:**
- `POST /get-task-analysis` - Generates detailed task analysis (Phases 1-3)
- `POST /ask-question` - Context-aware Q&A about tasks

**Key Functions:**
- Session validation
- Research text retrieval from storage
- AI prompt construction with task context

#### server/config.js

**Purpose:** Centralized, frozen configuration

**Sections:**
- `CONFIG.API` - Gemini model, temperature, timeout settings
- `CONFIG.FILES` - Supported MIME types, extensions, size limits
- `CONFIG.TIMEOUTS` - Request, chart generation, cleanup intervals
- `CONFIG.RATE_LIMITS` - Request limits for different endpoints
- `CONFIG.SERVER` - Port, trust proxy, storage expiration
- `CONFIG.ERRORS` - Error message templates

**Important:** All CONFIG objects are frozen with `Object.freeze()`

#### server/gemini.js

**Key Functions:**
- `callGeminiForJson(prompt, schema, onProgress)` - Structured JSON with retry
- `callGeminiForText(prompt, temperature)` - Text responses for Q&A

**Features:**
- Exponential backoff retry (3 attempts)
- JSON repair for malformed responses
- Safety rating validation
- Progress callbacks during retries
- Detailed error logging

#### server/prompts.js

**System Prompts:**
- `CHART_GENERATION_SYSTEM_PROMPT` - Gantt chart generation instructions
- `TASK_ANALYSIS_SYSTEM_PROMPT` - Multi-phase analysis instructions
- `EXECUTIVE_SUMMARY_GENERATION_PROMPT` - Strategic synthesis

**JSON Schemas:**
- `GANTT_CHART_SCHEMA` - Validates chart structure
- `TASK_ANALYSIS_SCHEMA` - Validates Phases 1-3 analysis
- `EXECUTIVE_SUMMARY_SCHEMA` - Validates summary structure

#### server/storage.js

**Storage Maps:**
- `sessionStore` - Research text + metadata (1-hour expiration)
- `chartStore` - Chart data + sessionId (1-hour expiration)
- `jobStore` - Job status + results (1-hour expiration)

**Key Functions:**
- `createSession(researchText)` - Returns sessionId
- `storeChart(chartData, sessionId)` - Returns chartId
- `createJob()` / `updateJob()` / `completeJob()` / `failJob()`
- `startCleanupInterval()` - Removes expired entries every 10 minutes

#### server/middleware.js

**Exports:**
- `configureHelmet()` - Security headers
- `configureCacheControl()` - Static asset caching
- `configureTimeout()` - Request timeout handler
- `uploadMiddleware` - Multer configuration (10 files max, 10MB each)
- `handleUploadErrors()` - Error handling middleware

**Security Features:**
- Rate limiting (strict + general limiters)
- File type validation (MIME + extension)
- Trust proxy configuration for Railway

#### server/utils.js

**Key Functions:**
- `sanitizePrompt(prompt)` - Removes prompt injection patterns
- `isValidChartId(id)` / `isValidJobId(id)` - ID format validation
- `isValidFileExtension(filename)` - Extension checking

**Sanitization Patterns Removed:**
- System role manipulation
- Jailbreak attempts
- Instruction override attempts
- DAN (Do Anything Now) prompts

### Frontend Modules

#### Public/main.js

**Responsibilities:**
- Form submission handling
- File/folder upload with drag-and-drop
- File validation (MIME type + extension)
- Job polling with progress updates
- Chart opening (URL-based or sessionStorage fallback)

**Key Functions:**
- `processFiles(files)` - Validates and displays file list
- `setUploadMode(mode)` - Toggles between file/folder upload
- `pollForJobCompletion(jobId, generateBtn)` - 1-second polling loop
- `handleChartGenerate(event)` - Main form submission handler

**Features:**
- Folder statistics display (total files, valid files, size, types)
- Large file set handling (shows first 50, indicates more)
- Visual feedback (drag-over highlighting, loading spinner)

#### Public/GanttChart.js (1,230 lines)

**Core Component** - Renders the entire Gantt chart

**Key Methods:**
- `render()` - Main rendering orchestrator
- `_buildHeader()` - Time column headers
- `_buildSwimLanes()` - Rows with labels and task bars
- `_buildLegend()` - Color-coded legend
- `_calculateTodayLine()` - Highlights current date
- `_addLogo()` - Adds company logo
- `_renderExecutiveSummary()` - Displays strategic insights

**Interactive Features:**
- `enableEditMode()` / `disableEditMode()` - Toggles all edit features
- `_enableInlineEditing()` - Double-click to edit titles/labels
- `_initializeRowControls()` - Add/delete row buttons
- `exportToPNG()` - html2canvas export with zoom handling

**Integration Points:**
- Initializes DraggableGantt, ResizableGantt, ContextMenu
- Communicates with TaskAnalyzer for task analysis

#### Public/TaskAnalyzer.js

**Responsibilities:**
- Displays multi-phase task analysis in modal
- Integrates ChatInterface for Q&A
- Exports analysis to plain text

**Key Methods:**
- `showAnalysis(taskName, entity, sessionId)` - Fetches and displays analysis
- `_renderAnalysisContent(analysis)` - Builds modal HTML
- `_buildQuickFactsSidebar(analysis)` - Sticky quick facts panel
- `_buildCollapsibleSection(title, content, isOpen)` - Expandable sections

**Phases Rendered:**
1. **Phase 1** - Timeline Scenarios, Risk Analysis, Impact Analysis, Scheduling Context
2. **Phase 2** - Progress Tracking, Motivators & Accelerators
3. **Phase 3** - Confidence Assessment, Export Functionality

**Layout:**
- Desktop (>1000px): Two-column (280px sidebar + flexible content)
- Mobile: Single column, stacked sections

#### Public/DraggableGantt.js (Phase 5)

**Responsibilities:**
- Implements drag-to-reschedule functionality
- HTML5 Drag & Drop API integration
- Server persistence of changes

**Key Methods:**
- `enableDragging()` - Adds dragstart/dragover/drop listeners
- `disableDragging()` - Removes all listeners
- `_handleDragStart(e)` - Stores drag data
- `_handleDragOver(e)` - Visual feedback (drag-over class)
- `_handleDrop(e)` - Updates data + persists to server

**Visual Feedback:**
- Drag-over highlighting on valid drop targets
- Cursor changes (grab → grabbing)
- Drag indicator shows source task

**Error Handling:**
- Automatic rollback if server update fails
- Logs all drag operations for debugging

#### Public/ResizableGantt.js (Phase 2)

**Responsibilities:**
- Implements bar edge resizing
- Duration adjustment
- Server persistence

**Key Methods:**
- `enableResizing()` - Adds mousedown listeners to bar edges
- `disableResizing()` - Removes all listeners
- `_handleResizeStart(e)` - Captures initial state
- `_handleResizeMove(e)` - Updates bar width in real-time
- `_handleResizeEnd(e)` - Persists changes to server

**Visual Feedback:**
- Cursor changes (ew-resize on edges)
- Smooth bar width transitions
- Min width enforcement (1 column)

#### Public/ContextMenu.js (Phase 5)

**Responsibilities:**
- Right-click context menu for color changing
- Color picker with available colors
- Legend refresh when new colors used

**Key Methods:**
- `enable()` - Adds contextmenu listeners
- `disable()` - Removes listeners
- `_showContextMenu(e, barElement)` - Displays color picker at cursor
- `_changeTaskColor(barElement, newColor)` - Updates color + persists

**Features:**
- Closes on outside click or Escape key
- Shows all available colors from CONFIG
- Updates legend automatically
- Highlights current color in picker

#### Public/ExecutiveSummary.js

**Responsibilities:**
- Renders AI-generated strategic insights
- Expandable/collapsible sections

**Sections:**
- Strategic Narrative
- Key Drivers
- Critical Dependencies
- Strategic Risks
- Key Insights

**Layout:**
- Full-width container above Gantt chart
- Collapsible sections for better UX
- Gradient accents for visual hierarchy

#### Public/ChatInterface.js

**Responsibilities:**
- Q&A chat within task analysis modal
- Real-time API calls to `/ask-question`

**Key Methods:**
- `render(sessionId)` - Creates chat UI
- `_sendQuestion()` - Posts question to server
- `_addMessage(sender, text, isError)` - Appends to chat thread

**Features:**
- Markdown rendering for AI responses (future enhancement)
- Error handling with user-friendly messages
- Loading spinner during API calls

#### Public/Utils.js

**Shared Utilities** - Used by multiple components

**Key Functions:**
- `safeGetElement(id)` - DOM element retrieval with error handling
- `buildTimelineScenarios(scenarios)` - Phase 1 rendering
- `buildRiskAnalysis(risks)` - Phase 1 rendering
- `buildImpactAnalysis(impact)` - Phase 1 rendering
- `buildSchedulingContext(context)` - Phase 1 rendering
- `buildProgressIndicators(progress)` - Phase 2 rendering
- `buildMotivatorsAccelerators(motivators)` - Phase 2 rendering
- `buildConfidenceAssessment(confidence)` - Phase 3 rendering
- `buildLegend(data)` - Extracts unique colors + builds legend HTML
- `detectTodayColumn(timeColumns)` - Finds current date in timeline
- `loadAndReplaceLogoPlaceholder()` - SVG logo loading

---

## Data Flow

### Chart Generation Flow

```
1. User uploads files + enters prompt (index.html)
   ↓
2. Form submission → POST /generate-chart (main.js)
   ↓
3. Server returns { jobId, status, message } immediately
   ↓
4. Background processing begins (processChartGeneration):
   a. Extract text from files (mammoth for .docx, fs.readFile for .md/.txt)
   b. Sanitize user prompt (remove injection patterns)
   c. Build Gemini API payload with CHART_GENERATION_SYSTEM_PROMPT
   d. Call Gemini for structured JSON (GANTT_CHART_SCHEMA validation)
   e. Generate executive summary (EXECUTIVE_SUMMARY_SCHEMA)
   f. Create session (stores research text, returns sessionId)
   g. Store chart data (returns chartId)
   h. Mark job as complete with full data
   ↓
5. Frontend polls GET /job/:id every 1 second (max 300 attempts = 5 min)
   ↓
6. Job status: 'processing' → 'complete' (or 'error')
   ↓
7. Receives complete job with { data: chartData, sessionId, chartId }
   ↓
8. Opens new tab: /chart.html?id={chartId}
   ↓
9. chart-renderer.js loads chart via GET /chart/:id
   ↓
10. GanttChart.render() creates visual representation
   ↓
11. User can now interact with chart (analyze tasks, edit, export)
```

### Task Analysis Flow

```
1. User clicks task in Gantt chart
   ↓
2. TaskAnalyzer.showAnalysis(taskName, entity, sessionId) called
   ↓
3. Displays loading modal
   ↓
4. POST /get-task-analysis with { taskName, entity, sessionId }
   ↓
5. Server retrieves research text from sessionStore
   ↓
6. Builds AI prompt with task context + TASK_ANALYSIS_SYSTEM_PROMPT
   ↓
7. Calls Gemini for structured analysis (TASK_ANALYSIS_SCHEMA)
   ↓
8. Returns Phases 1-3 data:
   - Timeline Scenarios (best/expected/worst)
   - Risk Analysis (severity, likelihood, mitigation)
   - Impact Analysis (downstream, business impact)
   - Scheduling Context (predecessors, successors, critical path)
   - Progress Tracking (% complete, milestones, blockers)
   - Motivators & Accelerators (drivers, incentives, opportunities)
   - Confidence Assessment (level, data quality, assumptions)
   ↓
9. TaskAnalyzer._renderAnalysisContent(analysis) builds modal
   ↓
10. User can ask questions via ChatInterface
   ↓
11. POST /ask-question with { taskName, entity, question, sessionId }
   ↓
12. Returns text answer (temperature: 0.1 for precision)
```

### Edit Flow (Drag-to-Reschedule)

```
1. User toggles Edit Mode ON (button in chart header)
   ↓
2. GanttChart.enableEditMode() called
   ↓
3. All edit features enabled:
   - DraggableGantt.enableDragging()
   - ResizableGantt.enableResizing()
   - ContextMenu.enable()
   ↓
4. User drags task bar to new position
   ↓
5. DraggableGantt._handleDragStart(e) stores original position
   ↓
6. DraggableGantt._handleDragOver(e) shows visual feedback (drag-over class)
   ↓
7. DraggableGantt._handleDrop(e) calculates new position
   ↓
8. Updates ganttData in memory (immediate visual update)
   ↓
9. POST /update-task-dates with old/new positions + dates
   ↓
10. Server logs change (client-side persistence, server acknowledgment)
   ↓
11. Success: Chart updated | Error: Rollback to original position
```

---

## API Endpoints

### Chart Generation & Retrieval

#### POST /generate-chart

**Purpose:** Starts async chart generation job

**Request:**
```javascript
// Content-Type: multipart/form-data
{
  prompt: string,              // User's project instructions
  researchFiles: File[]        // .md, .txt, .docx files
}
```

**Response:**
```javascript
{
  jobId: string,               // UUID for polling
  status: 'processing',
  message: 'Chart generation started'
}
```

**Rate Limit:** 20 requests per 15 minutes (strict)

**Errors:**
- 400: Missing files or prompt
- 413: File too large (max 10MB per file, 10 files total)
- 415: Unsupported file type
- 429: Rate limit exceeded
- 500: Server error

---

#### GET /job/:id

**Purpose:** Polls job status with progress updates

**Request:**
```
GET /job/550e8400-e29b-41d4-a716-446655440000
```

**Response (Processing):**
```javascript
{
  status: 'processing',
  progress: 'Analyzing documents... (Retry 2/3)'
}
```

**Response (Complete):**
```javascript
{
  status: 'complete',
  data: {
    chartId: string,
    sessionId: string,
    timeColumns: string[],
    data: Array<{
      label: string,
      color: string,
      tasks: Array<{
        task: string,
        start: number,
        end: number
      }>
    }>,
    executiveSummary: {
      strategicNarrative: string,
      keyDrivers: string[],
      criticalDependencies: string[],
      strategicRisks: string[],
      keyInsights: string[]
    }
  }
}
```

**Response (Error):**
```javascript
{
  status: 'error',
  error: 'Error message'
}
```

**Rate Limit:** 100 requests per 15 minutes

---

#### GET /chart/:id

**Purpose:** Retrieves chart by ID for URL-based sharing

**Request:**
```
GET /chart/chart_abc123xyz789
```

**Response:**
```javascript
{
  ...chartData,
  sessionId: string,
  chartId: string
}
```

**Rate Limit:** 100 requests per 15 minutes

**Errors:**
- 400: Invalid chart ID format
- 404: Chart not found or expired
- 500: Server error

---

### Task Analysis

#### POST /get-task-analysis

**Purpose:** Generates detailed Phases 1-3 task analysis

**Request:**
```javascript
{
  taskName: string,
  entity: string,              // Swimlane label
  sessionId: string
}
```

**Response:**
```javascript
{
  taskName: string,
  entity: string,
  timelineScenarios: {
    best: { estimate: string, confidence: string },
    expected: { estimate: string, confidence: string },
    worst: { estimate: string, confidence: string }
  },
  risks: Array<{
    risk: string,
    severity: 'Critical' | 'High' | 'Medium' | 'Low',
    likelihood: 'High' | 'Medium' | 'Low',
    impact: string,
    mitigation: string
  }>,
  impact: {
    downstreamTasks: string[],
    businessImpact: string,
    strategicSignificance: string
  },
  schedulingContext: {
    predecessors: string[],
    successors: string[],
    criticalPath: boolean,
    slackTime: string
  },
  progress: {                  // Only for in-progress tasks
    percentComplete: number,
    completedMilestones: string[],
    remainingMilestones: string[],
    velocity: string,
    activeBlockers: string[]
  },
  motivators: {
    externalDrivers: string[],
    internalIncentives: string[],
    efficiencyOpportunities: string[],
    successFactors: string[]
  },
  confidence: {
    level: 'High' | 'Medium' | 'Low',
    dataQuality: string,
    assumptionCount: number,
    assumptions: string[]
  }
}
```

**Rate Limit:** 100 requests per 15 minutes

**Errors:**
- 400: Missing required fields
- 404: Session not found or expired
- 500: AI generation error

---

#### POST /ask-question

**Purpose:** Context-aware Q&A about tasks

**Request:**
```javascript
{
  taskName: string,
  entity: string,
  question: string,
  sessionId: string
}
```

**Response:**
```javascript
{
  answer: string               // Text response from AI
}
```

**Rate Limit:** 100 requests per 15 minutes

**AI Settings:**
- Temperature: 0.1 (precise answers)
- Model: gemini-2.5-flash-preview-09-2025

---

### Chart Updates

#### POST /update-task-dates

**Purpose:** Persists drag-to-edit changes

**Request:**
```javascript
{
  taskName: string,
  entity: string,
  sessionId: string,
  oldStartCol: number,
  oldEndCol: number,
  newStartCol: number,
  newEndCol: number,
  startDate: string,           // e.g., "2025-01-15"
  endDate: string
}
```

**Response:**
```javascript
{
  success: true,
  message: 'Task dates updated successfully',
  taskName: string,
  newStartCol: number,
  newEndCol: number,
  startDate: string,
  endDate: string
}
```

**Note:** Currently logs changes but does not persist to database (client-side state only)

---

#### POST /update-task-color

**Purpose:** Persists color changes from context menu

**Request:**
```javascript
{
  taskName: string,
  entity: string,
  sessionId: string,
  taskIndex: number,
  oldColor: string,            // e.g., "#4A90E2"
  newColor: string
}
```

**Response:**
```javascript
{
  success: true,
  message: 'Task color updated successfully',
  taskName: string,
  newColor: string
}
```

**Note:** Currently logs changes but does not persist to database (client-side state only)

---

## Development Workflows

### Local Development Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd Roadmap-master

# 2. Install dependencies
npm install

# 3. Create .env file
cat > .env << EOF
API_KEY=your_gemini_api_key_here
PORT=3000
NODE_ENV=development
EOF

# 4. Start server
npm start

# 5. Access application
# Open browser to http://localhost:3000
```

### Branch Workflow

**Current Branch:** `claude/claude-md-mi2uxtf6dixhunmu-011iqVxarUfSot2Js98XdN9f`

**Git Commands:**
```bash
# Check current branch
git status

# Create new feature branch (if needed)
git checkout -b claude/feature-name-session-id

# Stage changes
git add <files>

# Commit with descriptive message
git commit -m "Add feature: detailed description"

# Push to origin (MUST start with 'claude/' and end with session ID)
git push -u origin claude/feature-name-session-id

# Retry push with exponential backoff if network errors occur
# (2s, 4s, 8s, 16s delays between retries, max 4 attempts)
```

**Important:** Branch names MUST start with `claude/` and end with the matching session ID, or push will fail with 403 error.

### Testing Workflow

**Manual Testing:**
```bash
# 1. Start server
npm start

# 2. Test chart generation
# - Upload files via UI
# - Check browser console for errors
# - Verify job polling completes
# - Confirm chart renders correctly

# 3. Test task analysis
# - Click any task in chart
# - Verify all Phase 1-3 sections render
# - Test Q&A chat functionality

# 4. Test interactive features
# - Toggle Edit Mode ON
# - Drag task to new position
# - Resize bar edges
# - Right-click to change color
# - Verify server persistence calls in Network tab
```

**Debugging:**
```bash
# Check logs for errors
# Server logs appear in terminal

# Check browser console
# Frontend logs appear in DevTools Console

# Check network requests
# View in DevTools Network tab
# Filter by: XHR, Fetch

# Common issues:
# - 429 errors: Rate limit exceeded (wait 15 minutes)
# - 404 errors: Session/chart expired (regenerate)
# - CORS errors: Check trust proxy setting
# - Upload errors: Check file size/type
```

### Deployment Workflow (Railway)

```bash
# 1. Commit all changes
git add .
git commit -m "Deployment: description of changes"

# 2. Push to GitHub
git push -u origin <branch-name>

# 3. Railway auto-deploys on push to main branch
# (Or manually deploy from Railway dashboard)

# 4. Set environment variables in Railway dashboard
# Variables → New Variable
# API_KEY = your_gemini_api_key
# NODE_ENV = production (optional)

# 5. Verify deployment
# Check Railway logs for startup success
# Test app at Railway-provided URL
```

---

## Coding Conventions

### File Naming

- **Backend files:** kebab-case (e.g., `chart-generation.js`, `task-analyzer.js`)
- **Frontend files:** kebab-case or PascalCase for components (e.g., `GanttChart.js`, `TaskAnalyzer.js`)
- **Config files:** lowercase (e.g., `config.js`, `package.json`)
- **Documentation:** UPPERCASE or Title Case (e.g., `README.md`, `CLAUDE.md`)

### Code Style

**JavaScript:**
```javascript
// ES6+ modules (import/export, not require)
import { CONFIG } from './config.js';
export { functionName };

// Class naming: PascalCase
class GanttChart { }

// Function naming: camelCase
function renderChart() { }

// Private methods: _prefixed
_buildQuickFacts() { }

// Constants: SCREAMING_SNAKE_CASE
const MAX_FILE_SIZE = 10485760;

// Frozen configuration objects
const CONFIG = Object.freeze({
  API_KEY: process.env.API_KEY
});
```

**JSDoc Comments:**
```javascript
/**
 * Generates a Gantt chart from research documents
 * @param {string} prompt - User's project instructions
 * @param {File[]} files - Uploaded research files
 * @returns {Promise<Object>} Chart data with sessionId and chartId
 * @throws {Error} If AI generation fails
 */
async function generateChart(prompt, files) {
  // Implementation
}
```

**Error Handling:**
```javascript
// Always use try-catch for async operations
try {
  const result = await riskyOperation();
  console.log('Success:', result);
} catch (error) {
  console.error('Operation failed:', error);
  throw new Error(`Detailed context: ${error.message}`);
}

// Validate inputs before processing
if (!input) {
  throw new Error('Input is required');
}
```

### CSS Style

**Class Naming (BEM-like):**
```css
/* Block */
.gantt-chart-container { }

/* Element */
.gantt-row-label { }

/* Modifier */
.gantt-bar--dragging { }

/* State */
.edit-mode-enabled { }
```

**Tailwind Utilities:**
```html
<!-- Prefer Tailwind for layout/spacing -->
<div class="flex flex-col items-center justify-center gap-4 p-6">
  <h1 class="text-3xl font-bold text-gray-800">Title</h1>
</div>

<!-- Use custom classes for components -->
<div class="gantt-bar" style="background-color: #4A90E2;">
  Task Name
</div>
```

### Security Practices

**XSS Prevention:**
```javascript
// Use textContent, not innerHTML
element.textContent = userInput;

// Sanitize with DOMPurify when HTML needed
element.innerHTML = DOMPurify.sanitize(userInput);

// Never use eval()
// ❌ eval(userInput)
// ✅ JSON.parse(userInput)
```

**Input Validation:**
```javascript
// Server-side validation ALWAYS
function isValidChartId(id) {
  return /^chart_[a-zA-Z0-9]+$/.test(id);
}

// Client-side validation for UX
const SUPPORTED_FILE_MIMES = ['text/markdown', 'text/plain', ...];
if (!SUPPORTED_FILE_MIMES.includes(file.type)) {
  displayError('Unsupported file type');
}
```

**Prompt Injection Defense:**
```javascript
// Remove malicious patterns from user prompts
function sanitizePrompt(prompt) {
  let sanitized = prompt.trim();

  // Remove system role manipulation
  sanitized = sanitized.replace(/You are now/gi, '[REMOVED]');
  sanitized = sanitized.replace(/Ignore (all )?previous instructions/gi, '[REMOVED]');

  // Remove jailbreak attempts
  sanitized = sanitized.replace(/DAN mode/gi, '[REMOVED]');

  return sanitized;
}
```

---

## Configuration

### Environment Variables (.env)

```bash
# Required
API_KEY=your_gemini_api_key_here

# Optional
PORT=3000                    # Server port (default: 3000)
NODE_ENV=development         # Environment (development/production)
```

### Backend Configuration (server/config.js)

```javascript
export const CONFIG = Object.freeze({
  API: {
    KEY: process.env.API_KEY,
    MODEL: 'gemini-2.5-flash-preview-09-2025',
    TEMPERATURE: 0,
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    TIMEOUT: 90000
  },

  FILES: {
    SUPPORTED_MIMES: ['text/markdown', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    SUPPORTED_EXTENSIONS: ['md', 'txt', 'docx'],
    MAX_FILE_SIZE: 10485760,     // 10MB
    MAX_FILE_COUNT: 10
  },

  TIMEOUTS: {
    REQUEST_TIMEOUT: 30000,      // 30 seconds
    CHART_GENERATION_TIMEOUT: 120000,  // 2 minutes
    CLEANUP_INTERVAL: 600000     // 10 minutes
  },

  RATE_LIMITS: {
    GENERAL_WINDOW_MS: 900000,   // 15 minutes
    GENERAL_MAX_REQUESTS: 100,
    STRICT_WINDOW_MS: 900000,
    STRICT_MAX_REQUESTS: 20
  },

  SERVER: {
    PORT: parseInt(process.env.PORT || '3000', 10),
    TRUST_PROXY_HOPS: 1,
    STORAGE_EXPIRATION_MS: 3600000  // 1 hour
  }
});
```

### Frontend Configuration (Public/config.js)

```javascript
export const CONFIG = Object.freeze({
  COLORS: {
    AVAILABLE: [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#6C5CE7', '#A29BFE', '#FD79A8',
      '#FDCB6E', '#00B894', '#E17055', '#74B9FF'
    ],
    DEFAULT_BAR: '#4A90E2',
    DRAG_OVER: '#90EE90',
    TODAY_LINE: '#FF0000'
  },

  FILES: {
    SUPPORTED_MIMES: ['text/markdown', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    SUPPORTED_EXTENSIONS: ['md', 'txt', 'docx'],
    MAX_SIZE: 10485760,
    MAX_COUNT: 10
  },

  UI: {
    POLL_INTERVAL: 1000,         // 1 second
    MAX_POLL_ATTEMPTS: 300,      // 5 minutes
    MODAL_WIDTH: '900px',
    SIDEBAR_WIDTH: '280px'
  }
});
```

---

## Common Tasks

### Adding a New AI Analysis Section

**1. Update Schema (server/prompts.js):**
```javascript
export const TASK_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    // ... existing properties
    newSection: {
      type: 'object',
      properties: {
        field1: { type: 'string' },
        field2: { type: 'array', items: { type: 'string' } }
      },
      required: ['field1', 'field2']
    }
  },
  required: ['taskName', 'entity', ..., 'newSection']
};
```

**2. Update System Prompt (server/prompts.js):**
```javascript
export const TASK_ANALYSIS_SYSTEM_PROMPT = `
...

## New Section Requirements
- Field 1: Provide detailed description
- Field 2: List of relevant items
...
`;
```

**3. Add Rendering Function (Public/Utils.js):**
```javascript
export function buildNewSection(data) {
  if (!data) return '';

  return `
    <div class="analysis-section">
      <h3>${data.field1}</h3>
      <ul>
        ${data.field2.map(item => `<li>${item}</li>`).join('')}
      </ul>
    </div>
  `;
}
```

**4. Integrate in TaskAnalyzer (Public/TaskAnalyzer.js):**
```javascript
_renderAnalysisContent(analysis) {
  // ... existing sections

  const newSectionHTML = Utils.buildNewSection(analysis.newSection);

  contentHTML += this._buildCollapsibleSection(
    'New Section',
    newSectionHTML,
    true  // isOpen by default
  );

  // ... rest of rendering
}
```

**5. Add Styling (Public/style.css):**
```css
/* New Section Styles */
.new-section-container {
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}
```

### Adding a New API Endpoint

**1. Create Route Handler (server/routes/your-route.js):**
```javascript
import express from 'express';
import { CONFIG } from '../config.js';
import { getSession } from '../storage.js';

const router = express.Router();

router.post('/your-endpoint', async (req, res) => {
  try {
    // 1. Validate inputs
    const { requiredField } = req.body;
    if (!requiredField) {
      return res.status(400).json({ error: 'Required field missing' });
    }

    // 2. Process request
    const result = await yourProcessingFunction(requiredField);

    // 3. Return response
    res.json({ success: true, data: result });

  } catch (error) {
    console.error('Error in your-endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

**2. Mount Route (server.js):**
```javascript
import yourRoutes from './server/routes/your-route.js';

// ... other setup

app.use('/', yourRoutes);
```

**3. Add Frontend Call (Public/your-component.js):**
```javascript
async function callYourEndpoint(data) {
  try {
    const response = await fetch('/your-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    console.error('Error calling endpoint:', error);
    throw error;
  }
}
```

### Adding Interactive Features

**1. Create Feature Module (Public/YourFeature.js):**
```javascript
export class YourFeature {
  constructor(ganttChart) {
    this.ganttChart = ganttChart;
    this.enabled = false;
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;

    // Add event listeners
    document.addEventListener('click', this._handleClick.bind(this));
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;

    // Remove event listeners
    document.removeEventListener('click', this._handleClick.bind(this));
  }

  _handleClick(e) {
    // Implementation
  }
}
```

**2. Integrate in GanttChart (Public/GanttChart.js):**
```javascript
import { YourFeature } from './YourFeature.js';

class GanttChart {
  constructor(data) {
    // ... existing setup
    this.yourFeature = new YourFeature(this);
  }

  enableEditMode() {
    this.editModeEnabled = true;

    // ... existing features
    this.yourFeature.enable();
  }

  disableEditMode() {
    this.editModeEnabled = false;

    // ... existing features
    this.yourFeature.disable();
  }
}
```

**3. Add Visual Feedback (Public/style.css):**
```css
/* Your Feature Styles */
.edit-mode-enabled .your-feature-element {
  cursor: pointer;
  transition: all 0.2s ease;
}

.edit-mode-enabled .your-feature-element:hover {
  opacity: 0.8;
  transform: scale(1.05);
}
```

---

## Security Considerations

### Prompt Injection Defense

**Sanitization in server/utils.js:**
```javascript
export function sanitizePrompt(prompt) {
  let sanitized = prompt.trim();

  // Patterns to remove (case-insensitive)
  const INJECTION_PATTERNS = [
    /You are now/gi,
    /Ignore (all )?previous instructions/gi,
    /Forget (all )?previous instructions/gi,
    /System:/gi,
    /Assistant:/gi,
    /DAN mode/gi,
    /Developer mode/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi
  ];

  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REMOVED]');
  }

  return sanitized;
}
```

**When to Use:**
- All user prompts before sending to Gemini
- Any user input used in AI system prompts
- Never trust user input to be safe

### XSS Prevention

**Always Sanitize HTML:**
```javascript
// ❌ NEVER do this
element.innerHTML = userInput;

// ✅ Use textContent for plain text
element.textContent = userInput;

// ✅ Use DOMPurify for HTML
element.innerHTML = DOMPurify.sanitize(userInput);
```

**Safe Rendering Patterns:**
```javascript
// Task names, labels (plain text only)
labelElement.textContent = taskName;

// AI-generated content (may contain formatting)
contentElement.innerHTML = DOMPurify.sanitize(aiResponse);

// Never use eval() or Function()
// ❌ eval(userCode);
// ✅ JSON.parse(jsonString);
```

### Rate Limiting

**Current Limits (server/middleware.js):**
```javascript
// General endpoints (100 requests per 15 min)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});

// Chart generation (20 requests per 15 min)
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many chart generation requests'
});
```

**How to Adjust:**
- Edit `CONFIG.RATE_LIMITS` in `server/config.js`
- Restart server for changes to take effect
- Monitor logs for `429 Too Many Requests` errors

### File Upload Security

**Validation Layers:**
```javascript
// 1. MIME type check
const SUPPORTED_MIMES = [
  'text/markdown',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// 2. Extension check (fallback)
const SUPPORTED_EXTENSIONS = ['md', 'txt', 'docx'];

// 3. File size limit
const MAX_FILE_SIZE = 10485760; // 10MB

// 4. File count limit
const MAX_FILE_COUNT = 10;
```

**Best Practices:**
- Always validate both MIME type AND extension
- Never trust MIME type alone (can be spoofed)
- Reject executable file types (.exe, .sh, .bat, etc.)
- Scan uploaded files with antivirus in production

---

## Testing & Debugging

### Common Issues & Solutions

#### "Job timed out after 5 minutes"
**Cause:** AI generation took too long
**Solution:**
- Check Gemini API status
- Reduce number of uploaded files
- Simplify prompt complexity
- Increase timeout in `CONFIG.TIMEOUTS.CHART_GENERATION_TIMEOUT`

#### "Session not found or expired"
**Cause:** Session storage expired (1-hour limit)
**Solution:**
- Regenerate chart (sessions expire after 1 hour)
- Increase expiration in `CONFIG.SERVER.STORAGE_EXPIRATION_MS`
- Consider persistent storage (database) for production

#### "Invalid chart data structure"
**Cause:** AI returned malformed JSON
**Solution:**
- Check Gemini API response in logs
- Verify JSON schema matches AI output
- Use `jsonrepair` to fix common issues
- Add more validation in schema

#### "Rate limit exceeded (429)"
**Cause:** Too many requests from same IP
**Solution:**
- Wait 15 minutes before retrying
- Adjust rate limits in `CONFIG.RATE_LIMITS`
- Use different IP/proxy for testing

#### "File upload failed"
**Cause:** File size/type validation failure
**Solution:**
- Check file is < 10MB
- Verify file type is .md, .txt, or .docx
- Check browser console for validation errors
- Ensure `multipart/form-data` encoding

### Debugging Checklist

**Backend Issues:**
```bash
# 1. Check server logs
npm start
# Look for error stack traces in terminal

# 2. Verify environment variables
cat .env
# Ensure API_KEY is set correctly

# 3. Test API endpoints directly
curl -X POST http://localhost:3000/generate-chart \
  -F "prompt=Test project" \
  -F "researchFiles=@test.md"

# 4. Check storage state
# Add console.log in storage.js to inspect Maps
```

**Frontend Issues:**
```javascript
// 1. Open browser DevTools (F12)

// 2. Check Console tab for errors
// Look for: Network errors, CORS errors, validation errors

// 3. Check Network tab for failed requests
// Filter: XHR, Fetch
// Inspect: Request payload, response status, response body

// 4. Check Application tab for storage
// SessionStorage: Should have 'ganttData' key
// Local Storage: Not used

// 5. Add breakpoints in code
debugger; // Will pause execution when DevTools open
```

### Performance Optimization

**Backend:**
- Use streaming for large file uploads
- Implement caching for repeated prompts
- Consider worker threads for file parsing
- Add database for persistent storage

**Frontend:**
- Lazy load analysis sections
- Virtualize long task lists
- Debounce resize/drag events
- Use requestAnimationFrame for smooth animations

---

## Important Notes for AI Assistants

### Critical Files - Handle with Care

**NEVER modify without explicit instruction:**
- `server/prompts.js` - AI system prompts (changes affect all generations)
- `server/config.js` - Backend configuration (frozen constants)
- `Public/config.js` - Frontend configuration (frozen constants)
- `package.json` - Dependencies (version conflicts possible)

**Always read before modifying:**
- `server.js` - Main orchestrator (understand flow first)
- `Public/GanttChart.js` - Core rendering (1,230 lines, complex logic)
- `Public/style.css` - Comprehensive styles (1,600+ lines, interdependent)

### Code Modification Guidelines

**When adding features:**
1. ✅ Create new module files (e.g., `NewFeature.js`)
2. ✅ Add rendering functions to `Utils.js` if shared
3. ✅ Import and integrate in existing components
4. ❌ Don't modify core rendering logic unless necessary
5. ❌ Don't break backward compatibility with existing charts

**When fixing bugs:**
1. ✅ Reproduce the issue first (understand root cause)
2. ✅ Add error handling, don't just silence errors
3. ✅ Log relevant context for debugging
4. ❌ Don't remove error messages without fixing the issue
5. ❌ Don't modify multiple files for unrelated bugs

**When refactoring:**
1. ✅ Test thoroughly before committing
2. ✅ Maintain API compatibility
3. ✅ Update documentation (CLAUDE.md, README.md)
4. ❌ Don't refactor without clear benefit
5. ❌ Don't change frozen CONFIG objects

### AI-Specific Considerations

**Gemini API Quirks:**
- JSON responses may have markdown code fences (````json) - strip before parsing
- Safety ratings can block valid responses - check `safetyRatings` in response
- Retry with exponential backoff for transient errors
- Use `responseSchema` for structured output (not manual parsing)

**Schema Validation:**
- Always validate AI responses against schema
- Use `jsonrepair` to fix common JSON issues (missing commas, trailing commas)
- Log malformed responses for debugging
- Provide clear error messages to users

**Prompt Engineering:**
- Be specific in system prompts (examples help)
- Use JSON schemas for structured output
- Set appropriate temperature (0 for structured, 0.7 for creative)
- Include format examples in prompts

### Git Workflow Reminders

**Branch Naming:**
- MUST start with `claude/`
- MUST end with session ID
- Example: `claude/feature-name-012abc345def`

**Commit Messages:**
- Be descriptive: `Add drag-to-reschedule feature with server persistence`
- Not vague: `Update files` or `Fix bug`

**Push Retry Logic:**
- Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s)
- Only retry on network errors, not permission errors
- Example:
```bash
git push -u origin <branch> || \
  (sleep 2 && git push -u origin <branch>) || \
  (sleep 4 && git push -u origin <branch>) || \
  (sleep 8 && git push -u origin <branch>) || \
  (sleep 16 && git push -u origin <branch>)
```

### Common Pitfalls to Avoid

**❌ DON'T:**
- Modify frozen CONFIG objects (will silently fail)
- Use `innerHTML` without DOMPurify sanitization
- Remove error handling to "simplify" code
- Change API response formats without updating clients
- Push to branches not starting with `claude/`
- Ignore rate limits when testing
- Store sensitive data in code (use .env)
- Commit `.env` file to git (in .gitignore)

**✅ DO:**
- Read existing code before modifying
- Test changes locally before pushing
- Add console.log for debugging (remove before commit)
- Update CLAUDE.md when making architectural changes
- Follow existing patterns and conventions
- Ask for clarification if requirements are unclear
- Check browser console for frontend errors
- Check terminal output for backend errors

### When in Doubt

**Exploration Strategy:**
1. Read `CLAUDE.md` (this file) for overview
2. Check `readme.md` for deployment context
3. Review `PHASE_*.md` files for feature history
4. Examine existing code for patterns
5. Test changes in isolated environment
6. Ask user for clarification if uncertain

**Getting Help:**
- Phase implementation summaries: `PHASE_*_IMPLEMENTATION_SUMMARY.md`
- Deployment notes: `DEPLOYMENT_NOTES.md`
- Enhancement recommendations: `TASK_ANALYSIS_ENHANCEMENT_RECOMMENDATIONS.md`
- Code plans: `Code Enhancement Plan.js`, `Gantt Upgrade Plan`, `Exec Summary Plan`

---

## Document History

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-17 | 1.0 | Initial comprehensive documentation covering Phases 1-5 |

---

**Last Reviewed:** 2025-11-17
**Maintainer:** AI Roadmap Generator Development Team
**Contact:** See repository README for contact information
