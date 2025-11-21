# Prompt for Opus 4.1: Chart Generation Performance Optimization

## Context

You are working on an **AI Roadmap Generator** - a sophisticated Node.js application that uses Google Gemini AI to transform research documents into interactive Gantt charts with executive summaries and presentation slides.

The system has experienced a **critical performance regression**: it previously handled 10-file uploads successfully but now times out with even single-file inputs. The user's direct feedback: *"I used to upload 10 files at a time. Now I can't upload one file anymore"*.

## Your Mission

**Redesign the chart generation prompt (`CHART_GENERATION_SYSTEM_PROMPT`) to:**

1. ✅ **Restore Performance**: Complete chart generation in <90 seconds (currently: 180+ seconds timeout)
2. ✅ **Maintain Sophistication**: Preserve ALL banking enhancements, critical path analysis, regulatory intelligence
3. ✅ **Scale to 10 Files**: Handle 200KB research inputs (10 files × 20KB average)
4. ✅ **Preserve Quality**: Generated charts must remain executive-grade with rich features

**Non-Negotiable**: This is a banking industry product with sophisticated features that differentiate it from competitors. Removing features to improve performance is NOT acceptable. The solution must be architectural/prompt engineering optimization.

---

## Required Reading

**Primary Document**: `/home/user/Roadmap-master/Opus_feedback.md`

This 1,000-line technical report contains:
- Complete root cause analysis (overly complex prompt: 1,671 lines, 94-line extraction rules)
- All 9 troubleshooting fixes attempted (what worked, what didn't)
- Performance constraints and hard limits (API timeouts, response sizes)
- Processing time budget breakdown (85-170s target across phases)
- Technical architecture context (3-phase pipeline, chunking strategy)
- Specific optimization recommendations with rationale
- Testing criteria and benchmarks
- Code samples and error logs

**Supporting Documents**:
- `/home/user/Roadmap-master/CLAUDE.md` - Complete architecture guide (see "Banking Enhancements Quick Reference")
- `/home/user/Roadmap-master/server/prompts.js` - Current prompt (1,671 lines, lines 10-398 are chart generation)
- `/home/user/Roadmap-master/server/config.js` - Configuration limits and timeouts

**Read these files completely before proceeding.**

---

## Problem Summary (Quick Reference)

### Root Cause
The `CHART_GENERATION_SYSTEM_PROMPT` contains overly verbose extraction rules that cause AI processing times of 180+ seconds per attempt:

```
Problematic Sections:
├─ MAXIMUM EXTRACTION RULES (lines 88-129): 94 lines telling AI to "extract EVERY possible task"
├─ EXTRACTION VALIDATION CHECKLIST: 7-point verification before submission
├─ MINIMUM EXTRACTION TARGETS: Enforce 10-60+ tasks based on research size
├─ SUCCESS METRICS: "Extract 90-95% of identifiable tasks" (not 90-95% of key tasks)
└─ 100+ extraction triggers across 7 categories (action verbs, time refs, deliverables, etc.)
```

**Result**: AI spends 60-120 seconds just on task extraction phase, exceeds 180-second timeout, fails after 3 retries.

### Performance Budget (Target)
```
Available Time: 180 seconds (API timeout) per attempt

Phase Allocation:
├─ Research analysis: 15-30s
├─ Time horizon/swimlanes: 10-20s
├─ Task extraction: 25-35s ⚠️ CURRENTLY 60-120s (BOTTLENECK)
├─ Critical path analysis: 10-20s
├─ Theme/color assignment: 5-10s
├─ Response generation: 10-20s
└─ TOTAL TARGET: 85-135s (45-95s safety margin)
```

### Hard Constraints
```
API Limits:
├─ Timeout: 180 seconds per attempt (3 attempts max = 540s total)
├─ Response size: <100KB (preferably <60KB to avoid truncation)
├─ Input size: 50KB standard, 200KB with chunking (5 × 40KB chunks)
└─ Client timeout: 300 seconds (5 minutes) - gives up if not complete

Chunking Impact:
├─ Inputs >40KB split into 40KB chunks
├─ Each chunk processes with FULL prompt complexity
├─ Worst case: 5 chunks × 90s target = 450s (must fit in 600s job timeout)
└─ ⚠️ Prompt optimization benefits ALL chunks equally
```

---

## Required Features (DO NOT REMOVE)

The prompt must generate charts with these sophisticated features:

### 1. Banking Stakeholder Swimlanes
- Intelligent organization by department: IT/Technology, Legal, Business/Operations
- Task assignment based on nature of work (technical → IT, contracts → Legal, etc.)
- Alternative groupings when stakeholder model doesn't fit

### 2. Regulatory Intelligence
```javascript
regulatoryFlags: {
  hasRegulatoryDependency: true,
  regulatorName: "OCC" | "FDIC" | "Federal Reserve",
  approvalType: "Pre-approval required" | "Notification" | "Post-implementation filing",
  deadline: "Q2 2026",
  criticalityLevel: "high" | "medium" | "low"
}
```
- Visual 🏛️ icons on Gantt chart with hover tooltips
- Summary box showing regulatory checkpoint counts

### 3. Task Type Classification
```javascript
taskType: "milestone" | "decision" | "task"
```
- **milestone**: Key deliverables, phase completions, launches ("Go Live", "Phase 1 Complete")
- **decision**: Executive decision points, budget approvals, go/no-go gates
- **task**: Regular implementation work (default)
- Enables Executive View filtering (shows only milestones + decisions)

### 4. Critical Path Analysis
```javascript
isCriticalPath: true | false
```
- Identifies time-sensitive tasks where delays push project deadline
- Tasks with no schedule slack
- Tasks blocking other tasks (predecessors)
- Longest sequence of dependent activities

### 5. Cross-Swimlane Theme Analysis
**Two-step color assignment strategy:**
1. Analyze all tasks for cross-swimlane themes (e.g., "Product Launch" spanning IT + Business + Legal)
2. Strategy A (preferred): Color by theme if 2-6 valid themes found
3. Strategy B (fallback): Color by swimlane if no clear themes
4. Generate legend explaining color meanings

### 6. Time Intelligence
- **Dynamic interval selection** based on project duration:
  - 0-3 months: Weeks ("W1 2026", "W2 2026")
  - 4-12 months: Months ("Jan 2026", "Feb 2026")
  - 1-3 years: Quarters ("Q1 2026", "Q2 2026")
  - 3+ years: Years ("2020", "2021", "2022")
- Automatic time horizon detection from research
- User override support for explicit date ranges

### 7. Quality Standards
- **Title length enforcement**: 200 chars (project), 300 chars (tasks) - prevents API truncation
- **Entity ownership**: Every task assigned to a team/department
- **Timing accuracy**: Tasks have dates when available, null when unknown
- **No empty swimlanes**: Only create swimlanes with tasks

---

## Optimization Targets (Primary Focus)

### 1. Task Extraction Redesign (CRITICAL - Saves 35-85 seconds)

**Current Approach (BROKEN)**:
```
Lines 88-129 (94 lines of instructions):
❌ "Extract EVERY possible task"
❌ "DEFAULT TO INCLUSION - When uncertain, ALWAYS include it"
❌ "Extract at the MOST DETAILED level mentioned"
❌ 100+ extraction triggers (action verbs, time refs, deliverables, phases, dependencies)
❌ Minimum task counts: 10-60+ based on research size
❌ 7-point validation checklist
❌ "Extract 90-95% of identifiable tasks"
❌ Formula: Minimum Tasks = (Research Pages × 8) or (Research Words ÷ 150)

Result: AI creates 60-100+ tasks, takes 60-120 seconds for extraction alone
```

**Required New Approach**:
```
Target: 10-25 lines of clear, focused instructions
Goal: 25-35 seconds for extraction phase
Output: 20-40 tasks for typical projects (scale proportionally for larger research)

Principles:
✅ Extract key tasks and major deliverables EXPLICITLY mentioned
✅ Break down phases into individual tasks ONLY when clearly specified
✅ Prioritize tasks with explicit dates or time periods
✅ Focus on project-critical activities (what executives care about)
✅ Avoid micro-tasks and obvious/implied steps
✅ NO validation checklists
✅ NO minimum task count enforcement
✅ NO exhaustive extraction trigger lists

Rationale:
- User can click any task for detailed analysis (TASK_ANALYSIS_SYSTEM_PROMPT provides depth)
- Better to have 30 useful tasks that load in 60s than 100 tasks that timeout
- Gantt chart is overview tool, not exhaustive work breakdown structure
- Task analysis feature provides detail on demand (unchanged, still sophisticated)
```

**Key Insight**: The system has TWO levels of detail:
1. **Chart Generation** (overview): Should be fast, focused on key tasks
2. **Task Analysis** (deep dive): Can be slow, comprehensive (triggered on-demand per task)

Optimize #1 without touching #2. User still gets full sophistication via task analysis.

### 2. Example Reduction (Saves 10-20 seconds)

**Current**: ~400 lines of examples scattered throughout prompt
**Target**: ~100-150 lines of focused examples

**Approach**:
- One clear example per major concept (not multiple variations)
- Combine multiple concepts in single examples where possible
- Remove edge case demonstrations (handle via schema constraints)
- Focus on common patterns, not exhaustive coverage

### 3. Schema Description Review (Saves 5-15 seconds)

**Current**: ~837 lines of schema-related content
**Question**: Is this needed given `responseSchema` parameter auto-validates?

**Approach**:
- Gemini's `responseSchema` parameter handles structural validation automatically
- Schema description in prompt may be redundant
- Consider reducing to ~200-300 lines focusing on:
  - Non-obvious field relationships
  - Business logic not expressible in JSON schema
  - Clarifications for ambiguous cases
- Move pure structural info to inline schema comments

### 4. Instruction Consolidation (Saves 5-10 seconds)

**Current**: Instructions split across multiple sections with some redundancy
**Target**: Consolidate related concepts, eliminate repetition

**Example**:
- Color logic appears in multiple places (strategy explanation, legend instructions, bar object definition)
- Consolidate to one clear section
- Reference it from other sections instead of repeating

---

## Deliverables Required

### 1. Redesigned Prompt
**File**: Provide complete replacement for `CHART_GENERATION_SYSTEM_PROMPT` (lines 10-398 in `server/prompts.js`)

**Requirements**:
- Target length: 800-1,000 lines (down from 1,671 lines)
- Maintains ALL required features listed above
- Optimized for <90 second processing time
- Clear section structure with comments
- Preserves title length constraints (critical for preventing truncation)

### 2. Schema Modifications (if needed)
**File**: `GANTT_CHART_SCHEMA` (lines 458-895 in `server/prompts.js`)

**Only modify if**:
- You identify structural issues causing performance problems
- You can simplify without losing validation capabilities
- Changes support faster AI processing

**Do NOT**:
- Remove required fields (title, timeColumns, data, etc.)
- Remove banking features (regulatoryFlags, taskType, isCriticalPath)
- Weaken validation (maxLength constraints are critical)

### 3. Implementation Notes
**Format**: Markdown document

**Include**:
- **Optimization Summary**: What changed and why (with line count savings)
- **Performance Impact Analysis**: Expected time savings per phase
- **Feature Verification Checklist**: Confirm all required features preserved
- **Testing Recommendations**: Specific test cases to validate performance + quality
- **Risk Assessment**: Any trade-offs or areas requiring monitoring
- **Rollback Plan**: How to revert if issues arise

### 4. Comparative Analysis
**Format**: Side-by-side comparison table

**Show**:
```
| Aspect | Before | After | Impact |
|--------|--------|-------|--------|
| Total prompt length | 1,671 lines | [new] lines | [X]% reduction |
| Extraction rules | 94 lines | [new] lines | [X]% reduction |
| Examples | ~400 lines | [new] lines | [X]% reduction |
| Est. extraction time | 60-120s | [new]s | [X]s faster |
| Est. total time | 180+s | [new]s | Within timeout ✓ |
| Expected task count | 60-100+ | [new] | More focused ✓ |
| Features preserved | [list] | [list] | All maintained ✓ |
```

---

## Success Criteria

Your solution will be considered successful if:

### Performance (Must-Have)
- ✅ Chart generation completes in **<90 seconds per attempt** (currently: 180+s timeout)
- ✅ **10-file uploads work** (200KB total input) - currently: fails with 1 file
- ✅ **Single-chunk inputs** (<40KB) complete in **<60 seconds**
- ✅ **Multi-chunk inputs** (40-200KB) complete within **600-second job timeout**

### Quality (Must-Have)
- ✅ **All banking features present**: Stakeholder swimlanes, regulatory flags, task types, critical path, themes
- ✅ **Title length compliance**: 200/300 char limits enforced (prevents truncation)
- ✅ **Smart task extraction**: 20-40 tasks for typical projects (not 100+, not <10)
- ✅ **Accurate classifications**: Task types, critical path, regulatory dependencies correct
- ✅ **Valid JSON responses**: <100KB, well-formed, no truncation
- ✅ **Executive-grade output**: Charts suitable for C-suite presentations

### User Acceptance (Must-Have)
- ✅ **Restore original capability**: "I used to upload 10 files" → Works again
- ✅ **Detail on demand**: Task analysis provides depth (clicking tasks gives full detail)
- ✅ **No timeouts**: Reasonable inputs (<200KB) complete successfully
- ✅ **Useful charts**: Enough detail to be actionable, not overwhelming

---

## Constraints and Guidelines

### DO NOT
- ❌ Remove banking features (regulatory flags, stakeholder swimlanes, etc.)
- ❌ Remove critical path analysis or theme analysis
- ❌ Remove task type classification (milestone/decision/task)
- ❌ Weaken title length constraints (200/300 chars - critical for preventing truncation)
- ❌ Sacrifice quality for speed (executive-grade output required)
- ❌ Change JSON schema structure (frontend depends on it)
- ❌ Modify other prompts (TASK_ANALYSIS_SYSTEM_PROMPT, etc.) - only chart generation

### DO
- ✅ Simplify extraction rules drastically (94 lines → 10-25 lines)
- ✅ Remove validation checklists and minimum task targets
- ✅ Reduce example verbosity (400 lines → 100-150 lines)
- ✅ Consolidate redundant instructions
- ✅ Focus on "what executives care about" for task selection
- ✅ Leverage JSON schema validation (reduce prompt explanation)
- ✅ Use clear, concise language
- ✅ Test against all performance benchmarks

### Optimization Philosophy
**"Do less work faster, provide depth on demand"**

- **Chart generation** (this prompt): Fast overview with key tasks
- **Task analysis** (separate prompt): Slow, comprehensive deep-dive per task
- User gets sophistication via two-tier approach, not one slow monolithic process

---

## Example Test Cases

Use these to validate your redesigned prompt:

### Test Case 1: Small Input (User's Current Failure)
```
Input: 34KB, 1 file (user's actual failing case)
Expected Performance: <45 seconds
Expected Output: 15-25 tasks, all features present
Success Criteria: Completes on first attempt without timeout
```

### Test Case 2: Medium Input
```
Input: 50KB, 3-5 files
Expected Performance: <75 seconds
Expected Output: 25-35 tasks, all features present
Success Criteria: Completes within 2 attempts
```

### Test Case 3: Large Input (Chunked)
```
Input: 80KB, 5-7 files (triggers chunking)
Expected Performance: <90 seconds per chunk (2 chunks = 180s total)
Expected Output: 35-50 tasks, all features present
Success Criteria: Completes within 2 attempts per chunk
```

### Test Case 4: Maximum Input (User's Original Capability)
```
Input: 200KB, 10 files (user's requirement: "I used to upload 10 files")
Expected Performance: <120 seconds per chunk (5 chunks = 600s total)
Expected Output: 50-70 tasks, all features present
Success Criteria: Completes within 10-minute job timeout
```

For each test case, verify:
- Regulatory flags present for compliance-related tasks
- Task types correctly classified (milestone/decision/task)
- Critical path accurately identified
- Themes or swimlane colors logically assigned
- All titles under length limits
- JSON response valid and <100KB

---

## Context About the Codebase

### Architecture Overview
```
Backend (Node.js + Express):
├─ server/prompts.js ⚠️ YOUR TARGET (1,671 lines)
│  ├─ CHART_GENERATION_SYSTEM_PROMPT (lines 10-398)
│  ├─ GANTT_CHART_SCHEMA (lines 458-895)
│  └─ Other prompts (task analysis, executive summary, slides)
├─ server/gemini.js (AI API integration with timeouts)
├─ server/routes/charts.js (chart generation flow, chunking logic)
└─ server/config.js (timeouts, limits, retries)

Frontend (Vanilla JavaScript):
├─ GanttChart.js (renders the chart from JSON)
├─ TaskAnalyzer.js (detailed on-demand analysis - UNCHANGED)
└─ ExecutiveSummary.js (strategic brief)
```

### Three-Phase AI Generation
```
Phase 1: Gantt Chart ⚠️ YOUR FOCUS (timing out)
├─ Prompt: CHART_GENERATION_SYSTEM_PROMPT (1,671 lines)
├─ Schema: GANTT_CHART_SCHEMA (438 lines)
├─ Timeout: 180 seconds per attempt, 3 attempts max
├─ Token limit: 65,536 output tokens
├─ Temperature: 0.0 (deterministic)
└─ Current status: BROKEN (180+s timeout)

Phase 2: Executive Summary (working fine)
├─ Timeout: 90 seconds
├─ Temperature: 0.7 (creative)
└─ Status: ✅ Working

Phase 3: Presentation Slides (working fine)
├─ Timeout: 90 seconds per phase (2-phase: outline + content)
├─ Temperature: 0.7 (creative)
└─ Status: ✅ Working
```

**Only Phase 1 needs optimization.**

### Chunking Strategy (40-200KB inputs)
```javascript
// server/routes/charts.js (lines 465-544)
if (totalResearchChars > 40000) {
  // Split into 40KB chunks
  const chunks = chunkResearch(researchTextCache, 40000);

  // Process each chunk with FULL prompt
  for (let chunk of chunks) {
    const result = await callGeminiForJson(
      buildPayload(chunk),
      retries: 3,
      timeout: 180000  // 3 minutes per chunk
    );
    chartChunks.push(result);
  }

  // Merge all chunk results
  ganttData = mergeChartData(chartChunks);
}
```

**Key Insight**: Prompt complexity affects EVERY chunk. Optimizing prompt helps both single-call AND chunked scenarios.

---

## Additional Resources

### Reference Examples
The current prompt includes extensive examples. Here are the most important to preserve (in simplified form):

**1. Title Length Example** (CRITICAL - prevents truncation):
```
❌ FORBIDDEN:
"Regulatory & Policy (Theme: Compliance) (CP: Yes) (100% of tasks have entity data)..."

✅ CORRECT:
"Regulatory & Policy - Compliance & Legal Gates"
```

**2. Banking Swimlane Example**:
```
Swimlanes:
- IT/Technology (technical implementation, infrastructure, systems)
- Legal (contracts, legal reviews, governance)
- Business/Operations (training, rollout, customer-facing)
```

**3. Color Strategy Example**:
```
Theme-based (preferred):
- "Product Launch" tasks across all swimlanes → priority-red
- "Technical Implementation" tasks → medium-red

Swimlane-based (fallback):
- All IT/Technology tasks → priority-red
- All Legal tasks → medium-red
```

Preserve the concepts, simplify the explanations.

### Schema Reference
```javascript
// Key required fields (DO NOT REMOVE)
{
  title: string (maxLength: 200),
  timeColumns: string[],
  data: [{
    title: string (maxLength: 300),
    entity: string,
    isSwimlane: boolean,
    taskType: "milestone" | "decision" | "task",
    isCriticalPath: boolean,
    regulatoryFlags: {
      hasRegulatoryDependency: boolean,
      regulatorName: string,
      approvalType: string,
      deadline: string,
      criticalityLevel: "high" | "medium" | "low"
    },
    bar: {
      startCol: number | null,
      endCol: number | null,
      color: enum
    }
  }],
  legend: [{ color: string, label: string }]
}
```

---

## Your Approach

### Step 1: Analysis
1. Read `Opus_feedback.md` completely (1,000 lines)
2. Read current `server/prompts.js` (focus on lines 10-398)
3. Identify ALL sections contributing to processing time
4. Map sections to performance budget phases
5. Prioritize optimizations by time savings potential

### Step 2: Design
1. Redesign extraction rules (CRITICAL: 94 lines → 10-25 lines)
2. Consolidate redundant instructions
3. Simplify examples (400 lines → 100-150 lines)
4. Review schema description necessity
5. Verify all required features preserved

### Step 3: Validation
1. Create comparative analysis (before/after table)
2. Estimate time savings per phase
3. Verify feature completeness
4. Write implementation notes with testing plan
5. Identify any risks or trade-offs

### Step 4: Documentation
1. Provide complete redesigned prompt
2. Provide schema modifications (if any)
3. Provide implementation notes
4. Provide comparative analysis
5. Provide testing recommendations

---

## Final Notes

### Critical Success Factors
1. **Task extraction redesign** is the #1 priority (saves 35-85 seconds)
2. **Preserve all banking features** (non-negotiable differentiation)
3. **Optimize for chunking** (worst case: 5 chunks × 90s = 450s)
4. **Title length enforcement** (prevents 175KB truncated responses)
5. **Test against user's actual failing case** (34KB, 1 file)

### Philosophy
**"Sophisticated intelligence delivered efficiently"**

This is an enterprise banking product competing on feature sophistication. The solution is not to dumb it down, but to architect the prompt for optimal AI processing efficiency while maintaining rich output quality.

Think of it like database query optimization: same result set, better execution plan.

### Questions to Consider
- Can extraction rules be guidance-based instead of exhaustive checklist-based?
- Are 400 lines of examples necessary, or can AI generalize from fewer examples?
- Is schema description redundant given JSON schema validation?
- Can instructions be more imperative and less explanatory?
- What can move from prompt to inline schema comments?

---

## Begin

Read the required files, analyze the problem deeply, and provide your optimized solution with complete documentation.

Your redesigned prompt will restore a critical enterprise application to working order while maintaining the sophisticated features that make it valuable to banking executives.

**Good luck!** 🚀
