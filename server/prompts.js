/**
 * AI Prompts and Schemas Module
 * Phase 4 Enhancement: Extracted from server.js
 * Centralizes all AI prompts and JSON schemas
 */

/**
 * Gantt Chart Generation System Prompt
 */
export const CHART_GENERATION_SYSTEM_PROMPT = `You are an expert project management analyst specializing in banking and financial services. Your job is to analyze research files and create a strategic Gantt chart.

You MUST respond with *only* a valid JSON object matching the schema.

// ═══════════════════════════════════════════════════════════
// 🚨 CRITICAL: REQUIRED FIELDS & CONSTRAINTS
// ═══════════════════════════════════════════════════════════

**MANDATORY RESPONSE STRUCTURE:**
{
  "title": "Project title (max 200 chars)",
  "timeColumns": ["Period1", "Period2", ...],
  "data": [/* task objects */],
  "legend": [/* color explanations */]
}

**TITLE LENGTH CONSTRAINTS (PREVENTS TRUNCATION):**
- Project title: Maximum 200 characters
- Task/swimlane titles: Maximum 300 characters
- Keep titles concise - NO metadata, statistics, or repeated text

// ═══════════════════════════════════════════════════════════
// ⚡ STREAMLINED TASK EXTRACTION (PERFORMANCE CRITICAL)
// ═══════════════════════════════════════════════════════════

**TASK EXTRACTION APPROACH:**

Extract KEY TASKS and MAJOR DELIVERABLES that executives would track:
- Focus on tasks EXPLICITLY mentioned with dates or durations
- Include major phases, milestones, and decision points
- Break down work ONLY when research provides clear decomposition
- Target 20-40 tasks for typical projects (scale proportionally)
- Prioritize quality over quantity - better 30 meaningful tasks than 100 trivial ones

**What to Extract:**
- Major deliverables and milestones mentioned by name
- Tasks with explicit timing (dates, quarters, durations)
- Critical decision points and approval gates
- Regulatory checkpoints and compliance deadlines
- Phase transitions and go-live events

**What to Skip:**
- Implied or assumed tasks not explicitly mentioned
- Micro-tasks and obvious sub-steps
- Generic activities without specific context

// ═══════════════════════════════════════════════════════════
// 🏦 BANKING INDUSTRY FEATURES (MAINTAIN ALL)
// ═══════════════════════════════════════════════════════════

**1. STAKEHOLDER SWIMLANES:**

Organize tasks by banking departments:
- IT/Technology: Systems, infrastructure, technical implementation
- Legal/Compliance: Regulatory reviews, legal documentation, governance
- Business/Operations: Training, rollout, customer-facing activities

Only create swimlanes with actual tasks. If research doesn't fit this model, use alternative logical groupings.

**2. REGULATORY FLAGS:**

For compliance-related tasks, add:
{
  "regulatoryFlags": {
    "hasRegulatoryDependency": true,
    "regulatorName": "OCC" | "FDIC" | "Federal Reserve",
    "approvalType": "Pre-approval required" | "Notification" | "Post-implementation filing",
    "deadline": "Q2 2026",
    "criticalityLevel": "high" | "medium" | "low"
  }
}

**3. TASK TYPE CLASSIFICATION:**

Classify each task:
- "milestone": Key deliverables, launches, completions
- "decision": Executive approvals, go/no-go gates
- "task": Regular implementation work (default)

**4. CRITICAL PATH IDENTIFICATION:**

Set isCriticalPath: true for tasks that:
- Have no schedule slack
- Block other tasks
- Are on the longest dependent path
- Would delay project if delayed

// ═══════════════════════════════════════════════════════════
// 🎯 TIME HORIZON & INTERVALS
// ═══════════════════════════════════════════════════════════

**DYNAMIC INTERVAL SELECTION:**

Based on total project duration:
- 0-3 months → Weeks: "W1 2026", "W2 2026"
- 4-12 months → Months: "Jan 2026", "Feb 2026"
- 1-3 years → Quarters: "Q1 2026", "Q2 2026"
- 3+ years → Years: "2026", "2027"

Detect time horizon from research. Support user overrides if specified.

// ═══════════════════════════════════════════════════════════
// 🎨 COLOR STRATEGY (SIMPLIFIED)
// ═══════════════════════════════════════════════════════════

**TWO-STEP COLOR ASSIGNMENT:**

1. Identify cross-swimlane themes (Product Launch, Compliance, Technology)
2. If 2-6 themes found → Color by theme
3. Otherwise → Color by swimlane
4. Add legend explaining color meanings

Available colors: priority-red, medium-red, mid-grey, light-grey, white, dark-blue

// ═══════════════════════════════════════════════════════════
// ✅ CORE LOGIC SUMMARY
// ═══════════════════════════════════════════════════════════

**PROCESSING STEPS:**

1. **Analyze Research** (15-20s target):
   - Identify project type and domain
   - Extract time horizon and key dates
   - Note stakeholder mentions

2. **Structure Chart** (10-15s target):
   - Determine appropriate time intervals
   - Create stakeholder swimlanes
   - Set up timeline columns

3. **Extract Tasks** (25-35s target):
   - Focus on explicit key tasks
   - Add to appropriate swimlanes
   - Set timing when available

4. **Enrich with Intelligence** (15-20s target):
   - Mark critical path tasks
   - Add regulatory flags
   - Classify task types
   - Assign theme colors

5. **Generate Output** (10-15s target):
   - Create clean JSON
   - Add color legend
   - Validate constraints

// ═══════════════════════════════════════════════════════════
// 📋 STREAMLINED EXAMPLES
// ═══════════════════════════════════════════════════════════

**EXAMPLE 1: Banking Digital Transformation**

{
  "title": "Digital Banking Platform Implementation",
  "timeColumns": ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"],
  "data": [
    {
      "title": "IT/Technology",
      "isSwimlane": true,
      "entity": "IT Department"
    },
    {
      "title": "Core Banking System Integration",
      "entity": "IT Department",
      "isSwimlane": false,
      "taskType": "task",
      "isCriticalPath": true,
      "bar": {
        "startCol": 0,
        "endCol": 2,
        "color": "priority-red"
      }
    },
    {
      "title": "Legal/Compliance",
      "isSwimlane": true,
      "entity": "Legal Department"
    },
    {
      "title": "OCC Regulatory Approval",
      "entity": "Legal Department",
      "isSwimlane": false,
      "taskType": "milestone",
      "isCriticalPath": true,
      "regulatoryFlags": {
        "hasRegulatoryDependency": true,
        "regulatorName": "OCC",
        "approvalType": "Pre-approval required",
        "deadline": "Q2 2026",
        "criticalityLevel": "high"
      },
      "bar": {
        "startCol": 1,
        "endCol": 1,
        "color": "priority-red"
      }
    }
  ],
  "legend": [
    { "color": "priority-red", "label": "Critical Path" },
    { "color": "medium-red", "label": "Technology Track" }
  ]
}

**EXAMPLE 2: Task Timing Patterns**

When research provides timing:
- "Q2 implementation" → startCol: 1, endCol: 1 (for Q2)
- "6-month rollout starting January" → startCol: 0, endCol: 5
- "Year-long initiative" → startCol: 0, endCol: 3 (for 4 quarters)

When timing is unclear:
- Set both startCol and endCol to null
- System will display as unscheduled task

// ═══════════════════════════════════════════════════════════
// ⚠️ COMMON PITFALLS TO AVOID
// ═══════════════════════════════════════════════════════════

**DON'T:**
- Create empty swimlanes
- Generate 100+ micro-tasks
- Add validation statistics to titles
- Duplicate tasks across swimlanes
- Make assumptions about unstated dates

**DO:**
- Keep task count reasonable (20-40 typical)
- Focus on executive-level visibility
- Use null for unknown dates
- Assign every task to an entity
- Maintain title length limits

// ═══════════════════════════════════════════════════════════
// 🏁 FINAL REMINDERS
// ═══════════════════════════════════════════════════════════

Remember: This is an EXECUTIVE ROADMAP for C-suite presentations:
- Quality over quantity in task selection
- Clear stakeholder organization
- Banking compliance intelligence
- Strategic milestones and decisions
- Professional, concise titles

Target processing efficiency: Complete analysis in <90 seconds.
Focus on what matters to executives, not every implementation detail.

Respond with ONLY the JSON object - no explanations or markdown.`;

/**
 * Task Analysis System Prompt
 */
export const TASK_ANALYSIS_SYSTEM_PROMPT = `You are a senior project management analyst. Your job is to analyze the provided research and a user prompt to build a detailed analysis for *one single task*.

The 'Research Content' may contain raw HTML (from .docx files) and Markdown (from .md files). You MUST parse these.

You MUST respond with *only* a valid JSON object matching the 'analysisSchema'.

**CRITICAL RULES FOR ANALYSIS:**
1.  **NO INFERENCE:** For 'taskName', 'facts', and 'assumptions', you MUST use key phrases and data extracted *directly* from the provided text.
2.  **CITE SOURCES & URLS (HIERARCHY):** You MUST find a source and a URL (if possible) for every 'fact' and 'assumption'. Follow this logic:
    a.  **PRIORITY 1 (HTML Link):** Search for an HTML \`<a>\` tag near the fact.
        - 'source': The text inside the tag (e.g., "example.com").
        - 'url': The \`href\` attribute (e.g., "https://example.com/article/nine").
    b.  **PRIORITY 2 (Markdown Link):** Search for a Markdown link \`[text](url)\` near the fact.
        - 'source': The \`text\` part.
        - 'url': The \`url\` part.
    c.  **PRIORITY 3 (Fallback):** If no link is found, use the filename as the 'source'.
        - 'source': The filename (e.g., "FileA.docx") from the \`--- Start of file: ... ---\` wrapper.
        - 'url': You MUST set this to \`null\`.
3.  **DETERMINE STATUS:** Determine the task's 'status' ("completed", "in-progress", or "not-started") based on the current date (assume "November 2025") and the task's dates.
4.  **PROVIDE RATIONALE:** You MUST provide a 'rationale' for 'in-progress' and 'not-started' tasks, analyzing the likelihood of on-time completion based on the 'facts' and 'assumptions'.
5.  **CLEAN STRINGS:** All string values MUST be valid JSON strings. You MUST properly escape any characters that would break JSON, such as double quotes (\") and newlines (\\n).

**PHASE 1 ENHANCEMENT REQUIREMENTS:**

6.  **SCHEDULING CONTEXT:** Analyze WHY this task starts when it does and provide dependency information:
    - 'rationale': Explain the timing drivers (market events, predecessor completions, resource availability, etc.)
    - 'predecessors': List tasks that must complete before this task can start (extract from research or infer from timeline)
    - 'successors': List tasks that depend on this task's completion (extract from research or infer from timeline)
    - 'isCriticalPath': Determine if this task is on the critical path (true if delays would push the final deadline)
    - 'slackDays': Estimate schedule slack/float in days (how much delay is tolerable), or null if unknown

7.  **TIMELINE SCENARIOS:** Provide three timeline estimates based on research:
    - 'expected': The current planned end date with confidence level (high/medium/low based on data quality and assumptions)
    - 'bestCase': Optimistic completion date assuming favorable conditions (explain assumptions briefly)
    - 'worstCase': Pessimistic completion date accounting for likely risks (explain risks briefly)
    - 'likelyDelayFactors': List 2-4 specific factors most likely to cause delays (resource constraints, dependencies, technical complexity, etc.)

8.  **RISK ANALYSIS:** Identify 2-5 specific risks or roadblocks:
    - 'name': Brief risk description (e.g., "Approval delays", "Technical complexity")
    - 'severity': Impact level - "high" (project-critical), "medium" (significant impact), or "low" (minor impact)
    - 'likelihood': Probability - "probable" (>60%), "possible" (30-60%), or "unlikely" (<30%)
    - 'impact': Describe what happens if this risk occurs (timeline, cost, scope, quality impact)
    - 'mitigation': Suggest concrete actions to reduce or avoid the risk

9.  **IMPACT ANALYSIS:** Assess consequences of delays or failure:
    - 'downstreamTasks': Estimate number of tasks that would be blocked or delayed (based on successors and research)
    - 'businessImpact': Describe business consequences (revenue loss, customer impact, market share, etc.)
    - 'strategicImpact': Describe effect on strategic goals, company roadmap, competitive position, etc.
    - 'stakeholders': List key stakeholders affected (teams, executives, customers, partners, etc.)

**PHASE 2 ENHANCEMENT REQUIREMENTS:**

10. **PROGRESS TRACKING:** For in-progress tasks ONLY, provide detailed progress information:
    - 'percentComplete': Estimate completion percentage (0-100%) based on milestones achieved, time elapsed, and remaining work
    - 'milestones': List 3-6 key checkpoints with:
      * 'name': Milestone description
      * 'completed': true if achieved, false if pending
      * 'date': Target or actual completion date
    - 'velocity': Assess current progress - "on-track" (meeting timeline), "behind" (delayed), or "ahead" (early)
    - 'activeBlockers': List current active issues blocking progress (empty array if none)

11. **ACCELERATORS:** Identify factors that could speed up completion or ensure success:
    - 'externalDrivers': Market pressures, competitive threats, customer demand (2-4 items)
    - 'internalIncentives': Team bonuses, executive sponsorship, strategic priorities, budget allocations (2-3 items)
    - 'efficiencyOpportunities': Parallel workstreams, automation, additional resources, process improvements (2-4 items)
    - 'successFactors': Critical conditions that must be maintained for on-time delivery (2-4 items)

**PHASE 3 ENHANCEMENT REQUIREMENTS:**

12. **CONFIDENCE ASSESSMENT:** Evaluate the reliability of the analysis:
    - 'level': Overall confidence level in the analysis - "high" (strong evidence, few assumptions), "medium" (moderate evidence, some assumptions), or "low" (limited evidence, many assumptions)
    - 'dataQuality': Quality of available research data - "complete" (comprehensive research coverage), "partial" (some gaps in data), or "limited" (minimal research available)
    - 'assumptionCount': Count the total number of assumptions made in the analysis (from assumptions array)
    - 'rationale': Brief explanation of confidence level (1-2 sentences explaining why confidence is high/medium/low)

**BANKING ENHANCEMENT - FINANCIAL IMPACT ANALYSIS:**

13. **FINANCIAL IMPACT ANALYSIS (BANKING CRITICAL):**
    Analyze the research documents for financial information and calculate ROI metrics:

    - **COSTS**: Extract or estimate cost information:
      * 'laborCosts': FTE counts × duration × average salary (use "$250K fully-loaded per banking FTE" if not specified)
      * 'technologyCosts': Infrastructure, licenses, cloud costs
      * 'vendorCosts': Consulting fees, third-party services
      * 'totalCost': Sum of all costs
      Example format: "$1.2M - 8 FTE × 6 months @ $250K fully-loaded"

    - **BENEFITS**: Identify and quantify benefits from research:
      * 'revenueIncrease': New customers, faster processing, upsell opportunities
      * 'costSavings': Automation savings, headcount reduction, efficiency gains
      * 'riskReduction': Compliance improvements, fraud prevention, error reduction
      * 'totalAnnualBenefit': Sum of annual benefits
      Example format: "$4.2M annually - 2,000 new accounts @ $2,100 annual value"

    - **ROI METRICS**: Calculate financial performance indicators:
      * 'paybackPeriod': Total Investment ÷ Annual Benefit (in months)
      * 'firstYearROI': ((Annual Benefit - Total Cost) ÷ Total Cost) × 100 (as percentage)
      * 'threeYearNPV': Sum of discounted cash flows using 8% discount rate (standard for banking)
      * 'confidenceLevel': "high" (strong financial data), "medium" (some estimates), "low" (many assumptions)
      Example: "paybackPeriod": "4.3 months", "firstYearROI": "277%", "threeYearNPV": "$16.4M at 8% discount"

    - **ESTIMATION GUIDELINES**: If specific financial numbers aren't in research, provide reasonable estimates:
      * Banking FTE fully-loaded cost: $200K-$300K
      * Typical digital banking project: 6-12 FTE for 6-12 months
      * Technology costs: $300K-$800K for cloud platforms
      * Clearly note all assumptions with disclaimer: "Estimated based on industry benchmarks"

    - **CRITICAL**: Always populate financial impact when possible. Executives make decisions based on ROI.
      If insufficient data, estimate conservatively and mark as "low" confidence.

  **BANKING ENHANCEMENT - STAKEHOLDER & CHANGE MANAGEMENT ANALYSIS:**
    Generate a comprehensive stakeholder analysis in the "stakeholderImpact" field. This is CRITICAL for banking executives to understand organizational readiness and change management requirements.

    - **customerExperience**: Analyze how this task impacts end customers
      * currentState: Describe current customer experience pain points (e.g., "Manual loan applications taking 3-5 days")
      * futureState: Describe improved experience after change (e.g., "Instant pre-qualification with 15-minute applications")
      * primaryBenefits: 3-5 concrete customer benefits (faster service, lower fees, better rates, convenience)
      * potentialConcerns: 2-4 realistic customer concerns (privacy, learning curve, trust in automation)
      * communicationStrategy: How to message this change to customers (town halls, FAQ, pilot program)

    - **internalStakeholders**: Identify 4-6 key employee groups affected by this task
      For each group (loan officers, IT staff, compliance team, branch managers, call center reps, etc.):
      * group: Role/department name
      * size: Approximate headcount ("~25 loan officers", "5-person IT team")
      * currentRole: What they do today
      * futureRole: How their job changes
      * impactLevel: "high" (job fundamentally changes), "medium" (significant new tools/processes), "low" (minor adjustments)
      * concerns: 2-3 realistic concerns (job security, skill gaps, workload, resistance to change)
      * trainingNeeds: Specific training required ("2-day platform certification", "ongoing AI oversight training")
      * championOpportunity: true if this group could become change advocates (early adopters, tech-savvy, high influence)

    - **executiveAlignment**: Map C-suite support for this initiative
      * sponsor: Primary executive sponsor (CEO, CTO, COO) with brief reason
      * supporters: 1-3 executives likely to support (with reasons: aligns with their goals, proven ROI, competitive pressure)
      * neutrals: 1-2 executives on the fence (reasons: other priorities, need more data, budget concerns)
      * resistors: 1-2 potential resistors (reasons: risk aversion, past failed projects, turf protection)
      * alignmentStrategy: 2-3 tactics to build consensus (steering committee, phased approach, quick wins, data-driven updates)

    - **changeReadiness**: Assess organizational readiness for this change (0-100 score)
      * score: Overall readiness score (0-100)
        - 0-30: High resistance, major cultural barriers
        - 31-60: Moderate readiness, need significant change management
        - 61-85: Good readiness, some friction expected
        - 86-100: Excellent readiness, change champions in place
      * culturalFit: How well this aligns with bank culture ("Conservative, risk-averse culture may resist rapid AI adoption")
      * historicalChangeSuccess: Track record with similar changes ("Successfully migrated to cloud in 2023, but mobile banking rollout had delays")
      * leadershipSupport: Strength of leadership commitment ("CEO publicly committed, but middle management skeptical")
      * resourceAvailability: Do they have bandwidth? ("IT team already at capacity with compliance projects")

    - **resistanceRisks**: Identify 3-5 specific resistance scenarios with mitigation plans
      For each risk:
      * risk: Specific resistance scenario (e.g., "Loan officers fear AI will replace them, leading to passive resistance")
      * probability: "high" (>60% chance), "medium" (30-60%), "low" (<30%)
      * impact: "critical" (could derail project), "major" (significant delays/cost), "moderate" (manageable setback)
      * mitigation: Concrete action plan (e.g., "Position AI as assistant, not replacement. Show case studies of productivity gains without headcount cuts. Involve loan officers in pilot design.")
      * earlyWarnings: 2-3 signs this is happening ("Low pilot participation", "Negative sentiment in surveys", "Key influencers spreading FUD")

    - **ESTIMATION GUIDELINES for stakeholder analysis**:
      * If research lacks specifics, use realistic banking industry assumptions
      * Typical banking org: 200-5000 employees, with 5-15 executives
      * Change readiness for traditional banks: typically 40-65 (moderate)
      * Change readiness for digital-first banks: typically 70-85 (good)
      * Common stakeholder groups: Branch staff, loan officers, IT, compliance, risk, operations, call center, marketing
      * Always include at least one resistance risk - no major change happens without resistance

    - **CRITICAL**: Stakeholder analysis should feel realistic and actionable. Avoid generic change management platitudes.
      Focus on banking-specific concerns (customer trust, employee skill gaps, technology debt).
      Executives need this to anticipate resistance and plan proactive interventions.

  **BANKING ENHANCEMENT - DATA MIGRATION & ANALYTICS STRATEGY:**
    Generate a comprehensive data migration and analytics strategy in the "dataMigrationStrategy" field. This is CRITICAL for banking executives to understand data complexity and analytics maturity progression.

    - **migrationComplexity**: Assess the data migration challenge
      * complexityLevel: "low" (single system, <100K records), "medium" (2-3 systems, 100K-1M records), "high" (4-6 systems, 1M-10M records), "critical" (7+ systems, >10M records, legacy mainframes)
      * volumeEstimate: Specific numbers (e.g., "2.4M customer records, 15M transactions, 450GB total")
      * systemsInvolved: Array of source systems (e.g., ["Core Banking (Fiserv)", "CRM (Salesforce)", "Loan Origination (Encompass)", "Legacy Mainframe (COBOL)"])
      * estimatedDuration: Realistic timeline (e.g., "6-9 months including parallel run")
      * technicalChallenges: 3-5 specific issues (e.g., "COBOL mainframe data extraction", "Real-time sync during cutover", "Customer SSN encryption migration", "Deduplication of 15% duplicate records")

    - **dataQuality**: Current state and improvement plan
      * currentQualityScore: 0-100 scale (banking typical: 55-75)
      * qualityIssues: Array of 3-6 specific issues with severity and remediation
        - Issue examples: "Address standardization (23% non-standard formats)", "Missing email addresses (42% of customers)", "Duplicate customer records (15% duplication rate)"
        - Severity: "critical" (blocks launch), "high" (major risk), "medium" (acceptable workaround), "low" (post-launch cleanup)
        - Remediation: Specific action (e.g., "Implement USPS address validation API", "Email collection campaign with incentives")
      * cleansingStrategy: Overall approach (e.g., "3-phase cleansing: automated deduplication (80% cases) → manual review (15%) → business rule exceptions (5%)")
      * validationRules: 4-6 rules (e.g., "SSN format validation", "Account balance reconciliation", "Transaction date logical consistency")

    - **analyticsRoadmap**: Maturity progression (4 phases)
      * currentMaturity: "descriptive" (reports), "diagnostic" (root cause), "predictive" (forecasts), "prescriptive" (recommendations)
      * targetMaturity: Same options - banking typical: descriptive → predictive
      * phases: Array of 3-4 phases showing progression
        - Phase 1 - Operational Analytics (Months 1-6):
          * Capabilities: ["Real-time transaction monitoring", "Daily reconciliation dashboards", "Branch performance reports", "Customer service metrics"]
          * Timeline: "Months 1-6"
          * Prerequisites: ["Data warehouse setup", "ETL pipelines for core systems", "BI tool implementation (Tableau/Power BI)"]
        - Phase 2 - Management Analytics (Months 7-12):
          * Capabilities: ["Customer segmentation analysis", "Product profitability analysis", "Risk exposure dashboards", "Compliance reporting automation"]
          * Prerequisites: ["Phase 1 complete", "Historical data cleaned (2+ years)", "Business glossary defined"]
        - Phase 3 - Predictive Analytics (Months 13-18):
          * Capabilities: ["Loan default prediction", "Customer churn models", "Cross-sell propensity scoring", "Fraud detection ML models"]
          * Prerequisites: ["Data science team hired", "MLOps infrastructure", "Model governance framework"]
        - Phase 4 - Prescriptive Analytics (Months 19-24+):
          * Capabilities: ["Personalized product recommendations", "Dynamic pricing optimization", "Automated lending decisions", "Real-time risk adjustments"]
          * Prerequisites: ["Phase 3 models validated", "A/B testing infrastructure", "Approval for AI decisions"]

    - **dataGovernance**: Framework for data management
      * ownershipModel: Who owns data (e.g., "Federated model: Business units own data, IT owns infrastructure, CDO owns standards")
      * dataClassification: Array of 3-5 data types with classification
        - Examples:
          * { dataType: "Customer PII (SSN, DOB)", classification: "restricted", handlingRequirements: "Encryption at rest/transit, access logging, annual recertification" }
          * { dataType: "Transaction history", classification: "confidential", handlingRequirements: "Encrypted storage, role-based access, 7-year retention" }
          * { dataType: "Marketing preferences", classification: "internal", handlingRequirements: "Standard access controls, opt-out honored" }
      * retentionPolicies: Array of 3-5 policies (e.g., "Transaction records: 7 years (compliance)", "Customer communications: 3 years", "Marketing data: Until opt-out")
      * qualityMetrics: Array of 4-6 KPIs (e.g., "Completeness: >95%", "Accuracy: >98%", "Timeliness: <24hr latency", "Consistency: <2% cross-system variance")
      * auditRequirements: Specific needs (e.g., "SOC 2 Type II annual audit, OCC data quality reviews, quarterly data lineage documentation")

    - **privacySecurity**: Compliance and protection measures
      * complianceRequirements: Array of applicable regulations (e.g., ["GLBA (Gramm-Leach-Bliley Act)", "FCRA (Fair Credit Reporting Act)", "State data breach laws", "GDPR (for EU customers)", "CCPA (California customers)"])
      * encryptionStrategy: Specific approach (e.g., "AES-256 for data at rest, TLS 1.3 for transit, tokenization for SSN/account numbers, hardware security modules (HSM) for key management")
      * accessControls: Detailed controls (e.g., "Role-based access (RBAC) with least privilege, MFA for all users, privileged access management (PAM) for admins, 90-day access recertification")
      * dataLineage: Tracking approach (e.g., "Automated lineage tracking via Collibra, source-to-report traceability, impact analysis for schema changes")
      * incidentResponse: Plan summary (e.g., "24-hour breach notification protocol, incident response team on call, customer notification templates pre-approved by legal, cyber insurance coverage")

    - **ESTIMATION GUIDELINES for data migration & analytics**:
      * Banking data complexity is typically HIGH due to:
        - Multiple legacy systems (core banking, loans, deposits, cards)
        - Data retention requirements (7+ years)
        - Customer privacy sensitivities
        - Real-time processing needs
      * Typical banking data quality scores: 55-75/100 (lower than most industries)
      * Analytics maturity progression: 6-24 months per phase
      * Always include compliance requirements - banking is heavily regulated
      * Common data issues: duplicates, address quality, missing emails, account reconciliation

    - **CRITICAL**: Data migration and analytics strategy should be realistic and banking-specific. Avoid generic IT platitudes.
      Focus on banking-specific challenges (compliance, real-time processing, customer privacy, legacy mainframe integration).
      Executives need this to understand technical complexity and set realistic expectations for analytics maturity.

  **BANKING ENHANCEMENT - SUCCESS METRICS & KPI FRAMEWORK:**
    Generate a comprehensive success metrics and KPI framework in the "successMetrics" field. This is CRITICAL for banking executives to commit to measurable outcomes and track continuous improvement.

    - **northStarMetric**: Define the single most important success indicator
      * metric: The one metric that best represents success (e.g., "Customer Digital Adoption Rate", "Net Promoter Score (NPS)", "Operational Cost per Transaction", "Loan Approval Speed")
      * definition: Precise measurement definition (e.g., "Percentage of customers using mobile app for >3 transactions per month")
      * targetValue: Specific, measurable target (e.g., "65% adoption within 12 months", "NPS >50")
      * currentBaseline: Current state measurement (e.g., "Current: 23% adoption", "Current NPS: 32")
      * measurementFrequency: "daily", "weekly", "monthly", "quarterly" (choose appropriate cadence)
      * rationale: Why this metric matters most (e.g., "Digital adoption is the best leading indicator of customer satisfaction, cost reduction, and competitive positioning")

    - **businessMetrics**: Categorized business outcome metrics (4 categories)

      * **revenueMetrics**: 2-4 metrics that drive top-line growth
        - Banking examples: "New account acquisitions", "Cross-sell rate", "Average customer lifetime value", "Fee income per customer"
        - For each metric: name, target, baseline, timeframe, trackingMethod
        - Example: { name: "New digital account openings", target: "5,000/month", baseline: "1,200/month (current)", timeframe: "Month 6 onwards", trackingMethod: "Real-time dashboard from core banking system" }

      * **costMetrics**: 2-4 metrics that reduce bottom-line costs
        - Banking examples: "Cost per transaction", "Branch operating costs", "Manual processing time", "Customer service handle time"
        - Example: { name: "Manual loan processing time", target: "Reduce from 45 min to 12 min", baseline: "45 min average (current)", timeframe: "By Month 9", trackingMethod: "Workflow system timestamps" }

      * **experienceMetrics**: 2-4 metrics measuring customer/employee satisfaction
        - Banking examples: "Net Promoter Score (NPS)", "Customer Effort Score (CES)", "Mobile app rating", "Employee satisfaction score", "First-call resolution rate"
        - Example: { name: "Mobile app store rating", target: "4.5+ stars", baseline: "3.2 stars (current)", timeframe: "Month 12", trackingMethod: "Weekly app store scraping" }

      * **riskMetrics**: 2-4 metrics reducing operational risk
        - Banking examples: "Fraud detection rate", "Compliance incidents", "System uptime", "Data breach incidents", "Audit findings"
        - Example: { name: "Compliance incidents", target: "Zero incidents", baseline: "3 incidents in past 12 months", timeframe: "Ongoing", trackingMethod: "Compliance management system tracking" }

    - **leadingIndicators**: 3-6 early warning metrics that predict outcomes
      * indicator: Specific measurable signal (e.g., "Daily active mobile users", "Customer support ticket volume", "Feature adoption rate", "Employee training completion")
      * predictedOutcome: What this indicates (e.g., "High DAU predicts strong monthly adoption rates", "Rising ticket volume signals UX issues before app rating drops")
      * thresholdAlert: When to act (e.g., "Alert if DAU drops >10% week-over-week", "Alert if tickets exceed 50/day")
      * monitoringFrequency: "daily", "weekly", "monthly" (choose appropriate cadence)
      * actionTrigger: What to do when threshold breached (e.g., "Conduct user interviews to identify friction points", "Activate UX improvement sprint")

    - **kpiDashboard**: 6-10 KPIs for executive dashboard (mix of categories)
      For each KPI:
      * kpi: Specific metric name (e.g., "Mobile app monthly active users", "Cost per digital transaction", "Digital account NPS")
      * category: "revenue", "cost", "experience", "risk", "operational"
      * currentValue: Current measurement (e.g., "45,000 MAU", "$0.87", "NPS 42")
      * targetValue: Goal (e.g., "120,000 MAU", "$0.25", "NPS 55+")
      * trend: "improving" (trending toward target), "declining" (moving away), "stable" (flat), "new" (no trend yet)
      * statusIndicator: "green" (on track), "yellow" (at risk), "red" (behind)
      * owner: Responsible executive (e.g., "Chief Digital Officer", "Head of Retail Banking", "SVP Customer Experience")
      * reviewCadence: "weekly", "monthly", "quarterly" (how often executives review)

    - **continuousImprovement**: Framework for ongoing optimization
      * reviewCycle: Cadence for metrics review (e.g., "Monthly business review with executives, quarterly deep-dive with board")
      * improvementTargets: 3-5 areas for ongoing optimization (e.g., ["Reduce mobile app latency from 2.1s to <1s", "Increase self-service resolution from 45% to 70%", "Expand product features based on top 5 user requests"])
      * optimizationOpportunities: 3-5 quick wins identified (e.g., ["A/B test simplified onboarding flow", "Implement proactive fraud alerts", "Add biometric login option"])
      * benchmarkComparison: How you compare to industry (e.g., "Top quartile in mobile adoption (65% vs. 48% industry average), lagging in NPS (42 vs. 52 industry average)")
      * iterationPlan: How to evolve metrics (e.g., "Phase 1: Core KPIs (months 1-6), Phase 2: Add predictive analytics (months 7-12), Phase 3: Real-time personalization metrics (year 2)")

    - **ESTIMATION GUIDELINES for success metrics**:
      * North Star Metric should be customer-centric or business-outcome-focused (not internal/technical)
      * Banking typical targets:
        - Digital adoption: 50-70% for retail banking, 30-50% for commercial banking
        - NPS: 40-60 (banking industry average: 30-40)
        - Cost reduction: 30-50% through automation
        - Processing time: 60-80% reduction via digital channels
      * Leading indicators should be measurable daily or weekly (not lagging annual metrics)
      * KPI dashboard should have 6-10 KPIs total (not too many to overwhelm executives)
      * Status indicators: Use red/yellow/green honestly based on actual progress
      * Always include at least one risk metric - banking is heavily regulated
      * Continuous improvement should reference industry benchmarks when possible

    - **CRITICAL**: Success metrics should be SMART (Specific, Measurable, Achievable, Relevant, Time-bound).
      Avoid vanity metrics ("increase awareness") - focus on business outcomes (revenue, cost, satisfaction, risk).
      Executives use these metrics to justify investment, track ROI, and make course corrections.
      Leading indicators are especially valuable - they allow proactive intervention before lagging metrics decline.

**IMPORTANT NOTES:**
- If research data is insufficient for Phase 1, 2, or 3 fields, provide reasonable estimates based on context, but note uncertainty in confidence levels.
- All Phase 1, 2, and 3 fields should be populated when possible - they provide critical decision-making insights.
- Ensure timeline scenarios are realistic and grounded in the research (avoid wild speculation).
- Risk analysis should focus on actionable risks with concrete mitigations, not generic concerns.
- Progress indicators are ONLY for in-progress tasks - omit this field for completed or not-started tasks.
- Accelerators should identify real opportunities based on research, not generic motivational statements.
- Confidence assessment should honestly reflect data quality - don't claim high confidence with limited research.`;

/**
 * Q&A System Prompt Template
 * @param {string} taskName - The task name
 * @param {string} entity - The entity/organization
 * @returns {string} The Q&A system prompt
 */
export function getQASystemPrompt(taskName, entity) {
  return `You are a project analyst. Your job is to answer a user's question about a specific task.

**CRITICAL RULES:**
1.  **GROUNDING:** You MUST answer the question *only* using the information in the provided 'Research Content'.
2.  **CONTEXT:** Your answer MUST be in the context of the task: "${taskName}" (for entity: "${entity}").
3.  **NO SPECULATION:** If the answer cannot be found in the 'Research Content', you MUST respond with "I'm sorry, I don't have enough information in the provided files to answer that question."
4.  **CONCISE:** Keep your answer concise and to the point.
5.  **NO PREAMBLE:** Do not start your response with "Based on the research..." just answer the question directly.`;
}

/**
 * Gantt Chart JSON Schema
 * ULTRA-SIMPLIFIED: Removed ALL constraints to prevent "too many states" API error
 * - Removed: required arrays (they create combinatorial state explosion)
 * - Removed: enum constraints
 * - Removed: description fields
 * All validation now handled in post-generation code (validateConstraints in charts.js)
 */
export const GANTT_CHART_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      maxLength: 200
    },
    timeColumns: {
      type: "array",
      items: { type: "string" }
    },
    data: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            maxLength: 300
          },
          isSwimlane: { type: "boolean" },
          entity: { type: "string" },
          bar: {
            type: "object",
            properties: {
              startCol: { type: "number" },
              endCol: { type: "number" },
              color: { type: "string" }
            }
          },
          taskType: { type: "string" },
          isCriticalPath: { type: "boolean" }
        }
      }
    },
    legend: {
      type: "array",
      items: {
        type: "object",
        properties: {
          color: { type: "string" },
          label: { type: "string" }
        }
      }
    }
  },
  // PHASE 1 FIX: Enforce required fields to prevent AI from omitting critical data
  // Error desc_1.md documents missing timeColumns causing validation failures
  required: ["title", "timeColumns", "data"]
};

/**
 * Task Analysis JSON Schema
 */
export const TASK_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    taskName: { type: "string" },
    startDate: { type: "string" },
    endDate: { type: "string" },
    status: { type: "string", enum: ["completed", "in-progress", "not-started", "n/a"] },
    facts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          fact: { type: "string" },
          source: { type: "string" },
          url: { type: "string" } // Can be a URL string or null
        }
      }
    },
    assumptions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          assumption: { type: "string" },
          source: { type: "string" },
          url: { type: "string" } // Can be a URL string or null
        }
      }
    },
    rationale: { type: "string" }, // For 'in-progress' or 'not-started'
    summary: { type: "string" }, // For 'completed'

    // PHASE 1 ENHANCEMENTS

    // Scheduling Context - Explains why task starts when it does
    schedulingContext: {
      type: "object",
      properties: {
        rationale: { type: "string" },
        predecessors: { type: "array", items: { type: "string" } },
        successors: { type: "array", items: { type: "string" } },
        isCriticalPath: { type: "boolean" },
        slackDays: { type: "number" }
      }
    },

    // Timeline Scenarios - Best/worst/expected case estimates
    timelineScenarios: {
      type: "object",
      properties: {
        expected: {
          type: "object",
          properties: {
            date: { type: "string" },
            confidence: { type: "string", enum: ["high", "medium", "low"] }
          }
        },
        bestCase: {
          type: "object",
          properties: {
            date: { type: "string" },
            assumptions: { type: "string" }
          }
        },
        worstCase: {
          type: "object",
          properties: {
            date: { type: "string" },
            risks: { type: "string" }
          }
        },
        likelyDelayFactors: { type: "array", items: { type: "string" } }
      }
    },

    // Structured Risk Analysis
    risks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          severity: { type: "string", enum: ["high", "medium", "low"] },
          likelihood: { type: "string", enum: ["probable", "possible", "unlikely"] },
          impact: { type: "string" },
          mitigation: { type: "string" }
        }
      }
    },

    // Impact Analysis - Consequences of delays
    impact: {
      type: "object",
      properties: {
        downstreamTasks: { type: "number" },
        businessImpact: { type: "string" },
        strategicImpact: { type: "string" },
        stakeholders: { type: "array", items: { type: "string" } }
      }
    },

    // PHASE 2 ENHANCEMENTS

    // Progress Indicators - For in-progress tasks only
    progress: {
      type: "object",
      properties: {
        percentComplete: { type: "number" },
        milestones: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              completed: { type: "boolean" },
              date: { type: "string" }
            }
          }
        },
        velocity: { type: "string", enum: ["on-track", "behind", "ahead"] },
        activeBlockers: { type: "array", items: { type: "string" } }
      }
    },

    // Motivators & Accelerators - Factors that can speed up completion
    accelerators: {
      type: "object",
      properties: {
        externalDrivers: { type: "array", items: { type: "string" } },
        internalIncentives: { type: "array", items: { type: "string" } },
        efficiencyOpportunities: { type: "array", items: { type: "string" } },
        successFactors: { type: "array", items: { type: "string" } }
      }
    },

    // PHASE 3 ENHANCEMENTS

    // Confidence Assessment - Data quality and certainty indicators
    confidence: {
      type: "object",
      properties: {
        level: { type: "string", enum: ["high", "medium", "low"] },
        dataQuality: { type: "string", enum: ["complete", "partial", "limited"] },
        assumptionCount: { type: "number" },
        rationale: { type: "string" }
      }
    },

    // BANKING ENHANCEMENT - Financial Impact Analysis
    financialImpact: {
      type: "object",
      properties: {
        costs: {
          type: "object",
          properties: {
            laborCosts: { type: "string" },
            technologyCosts: { type: "string" },
            vendorCosts: { type: "string" },
            totalCost: { type: "string" }
          }
        },
        benefits: {
          type: "object",
          properties: {
            revenueIncrease: { type: "string" },
            costSavings: { type: "string" },
            riskReduction: { type: "string" },
            totalAnnualBenefit: { type: "string" }
          }
        },
        roiMetrics: {
          type: "object",
          properties: {
            paybackPeriod: { type: "string" },
            firstYearROI: { type: "string" },
            threeYearNPV: { type: "string" },
            confidenceLevel: { type: "string", enum: ["high", "medium", "low"] }
          }
        }
      }
    },

    // BANKING ENHANCEMENT - Stakeholder & Change Management Analysis
    stakeholderImpact: {
      type: "object",
      properties: {
        // Customer Experience Impact
        customerExperience: {
          type: "object",
          properties: {
            currentState: { type: "string" },
            futureState: { type: "string" },
            primaryBenefits: { type: "array", items: { type: "string" } },
            potentialConcerns: { type: "array", items: { type: "string" } },
            communicationStrategy: { type: "string" }
          }
        },

        // Internal Stakeholders
        internalStakeholders: {
          type: "array",
          items: {
            type: "object",
            properties: {
              group: { type: "string" },
              size: { type: "string" },
              currentRole: { type: "string" },
              futureRole: { type: "string" },
              impactLevel: { type: "string", enum: ["high", "medium", "low"] },
              concerns: { type: "array", items: { type: "string" } },
              trainingNeeds: { type: "string" },
              championOpportunity: { type: "boolean" }
            }
          }
        },

        // Executive Alignment
        executiveAlignment: {
          type: "object",
          properties: {
            sponsor: { type: "string" },
            supporters: { type: "array", items: { type: "string" } },
            neutrals: { type: "array", items: { type: "string" } },
            resistors: { type: "array", items: { type: "string" } },
            alignmentStrategy: { type: "string" }
          }
        },

        // Change Readiness Assessment
        changeReadiness: {
          type: "object",
          properties: {
            overallScore: { type: "string", enum: ["high", "medium", "low"] },
            culturalFit: { type: "string" },
            historicalChange: { type: "string" },
            leadershipCommitment: { type: "string" },
            resourceAvailability: { type: "string" }
          }
        },

        // Resistance Risks
        resistanceRisks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              risk: { type: "string" },
              probability: { type: "string", enum: ["high", "medium", "low"] },
              impact: { type: "string" },
              mitigation: { type: "string" },
              earlyWarningSignal: { type: "string" }
            }
          }
        }
      }
    },

    // BANKING ENHANCEMENT - Data Migration & Analytics Strategy
    dataMigrationStrategy: {
      type: "object",
      properties: {
        // Migration Complexity Assessment
        migrationComplexity: {
          type: "object",
          properties: {
            complexityLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
            volumeEstimate: { type: "string" },
            systemsInvolved: { type: "array", items: { type: "string" } },
            estimatedDuration: { type: "string" },
            technicalChallenges: { type: "array", items: { type: "string" } }
          }
        },

        // Data Quality Analysis
        dataQuality: {
          type: "object",
          properties: {
            currentQualityScore: { type: "number" },
            qualityIssues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue: { type: "string" },
                  severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  remediation: { type: "string" }
                }
              }
            },
            cleansingStrategy: { type: "string" },
            validationRules: { type: "array", items: { type: "string" } }
          }
        },

        // Analytics Roadmap (Maturity Progression)
        analyticsRoadmap: {
          type: "object",
          properties: {
            currentMaturity: { type: "string", enum: ["descriptive", "diagnostic", "predictive", "prescriptive"] },
            targetMaturity: { type: "string", enum: ["descriptive", "diagnostic", "predictive", "prescriptive"] },
            phases: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  phase: { type: "string" },
                  capabilities: { type: "array", items: { type: "string" } },
                  timeline: { type: "string" },
                  prerequisites: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        },

        // Data Governance Framework
        dataGovernance: {
          type: "object",
          properties: {
            ownershipModel: { type: "string" },
            dataClassification: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  dataType: { type: "string" },
                  classification: { type: "string", enum: ["public", "internal", "confidential", "restricted"] },
                  handlingRequirements: { type: "string" }
                }
              }
            },
            retentionPolicies: { type: "array", items: { type: "string" } },
            qualityMetrics: { type: "array", items: { type: "string" } },
            auditRequirements: { type: "string" }
          }
        },

        // Privacy & Security Controls
        privacySecurity: {
          type: "object",
          properties: {
            complianceRequirements: { type: "array", items: { type: "string" } },
            encryptionStrategy: { type: "string" },
            accessControls: { type: "string" },
            dataLineage: { type: "string" },
            incidentResponse: { type: "string" }
          }
        }
      }
    },

    // BANKING ENHANCEMENT - Success Metrics & KPI Framework
    successMetrics: {
      type: "object",
      properties: {
        // North Star Metric - The single most important success indicator
        northStarMetric: {
          type: "object",
          properties: {
            metric: { type: "string" },
            definition: { type: "string" },
            targetValue: { type: "string" },
            currentBaseline: { type: "string" },
            measurementFrequency: { type: "string", enum: ["daily", "weekly", "monthly", "quarterly"] },
            rationale: { type: "string" }
          }
        },

        // Business Outcome Metrics (categorized)
        businessMetrics: {
          type: "object",
          properties: {
            // Revenue Impact
            revenueMetrics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  target: { type: "string" },
                  baseline: { type: "string" },
                  timeframe: { type: "string" },
                  trackingMethod: { type: "string" }
                }
              }
            },

            // Cost Reduction
            costMetrics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  target: { type: "string" },
                  baseline: { type: "string" },
                  timeframe: { type: "string" },
                  trackingMethod: { type: "string" }
                }
              }
            },

            // Customer Experience
            experienceMetrics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  target: { type: "string" },
                  baseline: { type: "string" },
                  timeframe: { type: "string" },
                  trackingMethod: { type: "string" }
                }
              }
            },

            // Risk Mitigation
            riskMetrics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  target: { type: "string" },
                  baseline: { type: "string" },
                  timeframe: { type: "string" },
                  trackingMethod: { type: "string" }
                }
              }
            }
          }
        },

        // Leading Indicators (Early Warning System)
        leadingIndicators: {
          type: "array",
          items: {
            type: "object",
            properties: {
              indicator: { type: "string" },
              predictedOutcome: { type: "string" },
              thresholdAlert: { type: "string" },
              monitoringFrequency: { type: "string", enum: ["daily", "weekly", "monthly"] },
              actionTrigger: { type: "string" }
            }
          }
        },

        // KPI Dashboard Configuration
        kpiDashboard: {
          type: "array",
          items: {
            type: "object",
            properties: {
              kpi: { type: "string" },
              category: { type: "string", enum: ["revenue", "cost", "experience", "risk", "operational"] },
              currentValue: { type: "string" },
              targetValue: { type: "string" },
              trend: { type: "string", enum: ["improving", "declining", "stable", "new"] },
              statusIndicator: { type: "string", enum: ["green", "yellow", "red"] },
              owner: { type: "string" },
              reviewCadence: { type: "string", enum: ["weekly", "monthly", "quarterly"] }
            }
          }
        },

        // Continuous Improvement Tracking
        continuousImprovement: {
          type: "object",
          properties: {
            reviewCycle: { type: "string" },
            improvementTargets: { type: "array", items: { type: "string" } },
            optimizationOpportunities: { type: "array", items: { type: "string" } },
            benchmarkComparison: { type: "string" },
            iterationPlan: { type: "string" }
          }
        }
      }
    }
  },
  required: ["taskName", "status"]
};

/**
 * Executive Summary Generation Prompt
 * Synthesizes complex research into executive intelligence
 */
export const EXECUTIVE_SUMMARY_GENERATION_PROMPT = `You are an expert strategic analyst synthesizing complex research into executive intelligence.

ANALYSIS FRAMEWORK:

1. STRATEGIC DRIVERS ANALYSIS
   - Identify 3-5 PRIMARY MARKET FORCES driving this initiative
   - Include specific metrics, timelines, or deadlines where mentioned
   - Frame each driver with its business impact and urgency level

2. CRITICAL PATH DEPENDENCIES
   - Extract the 2-3 MOST CRITICAL cross-functional dependencies
   - Explain WHY each dependency could become a bottleneck
   - Provide specific examples from the research that illustrate impact

3. RISK INTELLIGENCE
   - Identify 2-3 ENTERPRISE-LEVEL risks (not just project risks)
   - Include both probability and impact assessment where data permits
   - Suggest observable early warning indicators for each risk

4. EXPERT CONVERSATION ENABLERS
   - Extract 5-7 KEY FACTS that demonstrate deep understanding:
     * Industry-specific terminology with context
     * Quantitative benchmarks or performance metrics
     * Compliance considerations
     * Competitive landscape insights
     * Emerging trends or disruptions

5. STRATEGIC NARRATIVE
   - Craft a 2-3 sentence "elevator pitch" that captures the essence
   - Include the "so what" - why this matters to the organization NOW

6. KEY METRICS DASHBOARD (EXECUTIVE-FIRST ENHANCEMENT)
   - Provide exactly 6 high-level executive metrics in this specific order:
     1. Total Investment: Estimated total cost (e.g., "$2.4M" or "15-20% cost reduction")
     2. Time to Value: Timeline to ROI or project completion (e.g., "9 months" or "Q3 2026")
     3. Compliance Risk: Count of high-priority compliance checkpoints (e.g., "3 High Priority" or "Low Risk")
     4. ROI Projection: Projected return on investment (e.g., "340% in 18 months" or "Not Applicable")
     5. Critical Path Status: Current status of critical path (e.g., "On Track" or "At Risk - 2 delays")
     6. Vendor Lock-in: Vendor dependency risk level (e.g., "Medium Risk" or "Low - Multi-vendor strategy")
   - Use concise values (4-8 words max per metric)
   - If data unavailable, use "TBD" or "Not Specified"

7. TOP 3 STRATEGIC PRIORITIES (EXECUTIVE-FIRST ENHANCEMENT)
   - Identify the 3 MOST CRITICAL priorities that must happen first
   - For each priority, provide:
     * title: Brief priority name (4-8 words)
     * description: Why this is critical (1-2 sentences)
     * bankingContext: Banking-specific considerations (compliance requirements, market timing)
     * dependencies: External parties involved (vendors, partners)
     * deadline: When this must be completed (or null if flexible)
   - Order by criticality (most critical first)
   - Focus on strategic decisions, not tactical tasks

8. COMPETITIVE & MARKET INTELLIGENCE (BANKING ENHANCEMENT)
   - Analyze competitive positioning:
     * Market timing: Are we early adopters, fast followers, or catching up?
     * Competitor moves: What have major competitors (JPMorgan, Wells Fargo, Bank of America, regional banks) done in this space?
     * Competitive advantage: What unique positioning does this initiative create?
     * Market window: How long before this becomes table stakes vs. differentiator?
   - Look for competitive mentions, market trends, and industry adoption data in research
   - If no competitive data in research, provide general banking industry context

9. INDUSTRY BENCHMARKS (BANKING ENHANCEMENT)
   - Compare this initiative to banking industry standards:
     * Time to Market: How does the timeline compare to typical bank IT projects? (Industry average: 12-18 months for similar initiatives)
     * Investment Level: Is this cost-competitive? (Industry median: Varies by project type, typically $2-5M for digital banking initiatives)
     * Risk Profile: Is this riskier or safer than typical projects?
   - Provide variance percentages (e.g., "37% faster than industry average")
   - Include actionable insights (e.g., "Faster timeline creates competitive advantage but increases execution risk")
   - If specific benchmarks unavailable, use general banking industry knowledge

IMPORTANT: Your analysis must synthesize insights across ALL provided documents,
not just individual tasks. Look for patterns, contradictions, and convergent themes.
Use specific examples and data points from the research to support each insight.`;

/**
 * Executive Summary JSON Schema
 */
export const EXECUTIVE_SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    executiveSummary: {
      type: "object",
      required: ["drivers", "dependencies", "risks", "keyInsights", "strategicNarrative", "metadata", "keyMetricsDashboard", "strategicPriorities"],
      properties: {
        // EXECUTIVE-FIRST ENHANCEMENT: Key Metrics Dashboard
        keyMetricsDashboard: {
          type: "object",
          properties: {
            totalInvestment: { type: "string" },
            timeToValue: { type: "string" },
            complianceRisk: { type: "string" },
            roiProjection: { type: "string" },
            criticalPathStatus: { type: "string" },
            vendorLockIn: { type: "string" }
          },
          required: ["totalInvestment", "timeToValue", "complianceRisk", "roiProjection", "criticalPathStatus", "vendorLockIn"]
        },

        // EXECUTIVE-FIRST ENHANCEMENT: Top 3 Strategic Priorities
        strategicPriorities: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              bankingContext: { type: "string" },
              dependencies: { type: "string" },
              deadline: { type: "string" }
            },
            required: ["title", "description", "bankingContext", "dependencies"]
          }
        },

        drivers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              urgencyLevel: { type: "string", enum: ["critical", "high", "medium"] },
              metrics: { type: "array", items: { type: "string" } },
              sourceReferences: { type: "array", items: { type: "string" } }
            },
            required: ["title", "description", "urgencyLevel"]
          }
        },
        dependencies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              criticality: { type: "string" },
              impactedPhases: { type: "array", items: { type: "string" } },
              mitigationStrategy: { type: "string" }
            },
            required: ["name", "criticality"]
          }
        },
        risks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string", enum: ["strategic", "operational", "financial", "compliance"] },
              description: { type: "string" },
              probability: { type: "string", enum: ["high", "medium", "low"] },
              impact: { type: "string", enum: ["severe", "major", "moderate", "minor"] },
              earlyIndicators: { type: "array", items: { type: "string" } }
            },
            required: ["category", "description", "probability", "impact"]
          }
        },
        keyInsights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              insight: { type: "string" },
              talkingPoint: { type: "string" },
              supportingData: { type: "string" }
            },
            required: ["category", "insight"]
          }
        },
        strategicNarrative: {
          type: "object",
          properties: {
            elevatorPitch: { type: "string" },
            valueProposition: { type: "string" },
            callToAction: { type: "string" }
          },
          required: ["elevatorPitch", "valueProposition"]
        },
        metadata: {
          type: "object",
          properties: {
            confidenceLevel: { type: "number", minimum: 0, maximum: 100 },
            documentsCited: { type: "number" },
            lastUpdated: { type: "string" },
            analysisDepth: { type: "string", enum: ["comprehensive", "standard", "preliminary"] }
          },
          required: ["confidenceLevel", "documentsCited"]
        },

        // BANKING ENHANCEMENT: Competitive & Market Intelligence
        competitiveIntelligence: {
          type: "object",
          properties: {
            marketTiming: { type: "string" },
            competitorMoves: { type: "array", items: { type: "string" } },
            competitiveAdvantage: { type: "string" },
            marketWindow: { type: "string" }
          }
        },

        // BANKING ENHANCEMENT: Industry Benchmarks
        industryBenchmarks: {
          type: "object",
          properties: {
            timeToMarket: {
              type: "object",
              properties: {
                yourPlan: { type: "string" },
                industryAverage: { type: "string" },
                variance: { type: "string" },
                insight: { type: "string" }
              }
            },
            investmentLevel: {
              type: "object",
              properties: {
                yourPlan: { type: "string" },
                industryMedian: { type: "string" },
                variance: { type: "string" },
                insight: { type: "string" }
              }
            },
            riskProfile: {
              type: "object",
              properties: {
                yourPlan: { type: "string" },
                insight: { type: "string" }
              }
            }
          }
        }
      }
    }
  },
  required: ["executiveSummary"]
};

/**
 * Presentation Slides Generation - Phase 1: Outline
 * Generates slide types and titles only
 */
export const PRESENTATION_SLIDES_OUTLINE_PROMPT = `You are an expert presentation designer creating a slide deck outline for executive audiences.

Your task is to create an outline for a compelling narrative presentation with 5-8 slides based on the research provided.

SLIDE TYPES AVAILABLE:
- "title": Opening title slide with project name
- "narrative": Elevator pitch / strategic narrative (2-3 paragraphs)
- "drivers": Key strategic drivers (3-4 items)
- "dependencies": Critical dependencies (2-4 items)
- "risks": Strategic risk assessment (3-5 items)
- "insights": Expert conversation points / key insights (4-6 items)
- "simple": General content slide

REQUIREMENTS:
- First slide MUST be type "title"
- Include a mix of slide types that tell a complete story
- Each slide must have a UNIQUE title
- Titles should be clear and professional (under 150 characters)
- Create 5-8 slides total

IMPORTANT: You are ONLY creating the outline. Slide titles and types only. Content will be generated in a separate step.`;

export const PRESENTATION_SLIDES_OUTLINE_SCHEMA = {
  type: "object",
  properties: {
    outline: {
      type: "array",
      minItems: 5,
      maxItems: 8,
      items: {
        type: "object",
        required: ["type", "title"],
        properties: {
          type: {
            type: "string",
            enum: ["title", "narrative", "drivers", "dependencies", "risks", "insights", "simple"]
          },
          title: {
            type: "string",
            maxLength: 150
          }
        }
      }
    }
  },
  required: ["outline"]
};

/**
 * Presentation Slides Generation - Phase 2: Content
 * Generates detailed content for a specific slide
 * Uses the original detailed prompt requirements
 */
export const PRESENTATION_SLIDE_CONTENT_PROMPT = `You are an expert presentation designer creating professional slide content for executive audiences.

VISUAL DESIGN PHILOSOPHY:
This presentation uses a dark mode executive template with minimalist aesthetics and strategic use of color:
- Dark backgrounds (#1A1A1A) with white/light gray text for elegance
- Red accent (#da291c) for emphasis and high-priority items
- Green accent (#50AF7B) for positive drivers and low risks
- Yellow accent (#EE9E20) for warnings and medium risks
- Clean typography with Work Sans font family
- Strategic use of whitespace and visual hierarchy
- Smooth animations and hover effects for interactivity

CRITICAL REQUIREMENTS:
- ALL text must be concise and within character limits
- NEVER repeat the same text or phrases multiple times
- Keep titles under 200 characters
- Keep subtitles under 300 characters
- Keep descriptions under 500 characters
- If content exceeds limits, summarize rather than truncate mid-sentence
- Do NOT concatenate or duplicate content within titles or subtitles
- Use professional business language that sounds natural when read aloud
- Focus on strategic insights, not tactical details
- Extract specific data points and metrics from research when available
- NEVER repeat phrases or create circular text
- Stay well within character limits for all fields
- Create content that will look elegant when rendered with visual effects

SLIDE TYPE SPECIFICATIONS:

TYPE: "title" - TITLE SLIDE
REQUIRED FIELDS:
- title: Professional title that captures the initiative (max 200 chars)
OPTIONAL FIELDS:
- subtitle: Compelling subtitle that frames the strategic context (max 300 chars)
Example: { "type": "title", "title": "Digital Transformation Roadmap 2025-2030", "subtitle": "Strategic Initiative for Market Leadership" }

TYPE: "narrative" - ELEVATOR PITCH / STRATEGIC NARRATIVE
REQUIRED FIELDS:
- title: Section title (e.g., "Strategic Narrative", "Elevator Pitch")
- content: Array of 2-3 paragraph strings that tell the strategic story

DESIGN GUIDANCE:
- First paragraph should be the MOST IMPORTANT - it will be emphasized visually (larger font, bold weight)
- Focus on the "why now" and strategic imperative
- Should be presentable in 60-90 seconds when read aloud
- Use professional, executive-level language
- Build a narrative arc: context → value → impact
- Extract specific metrics and data points from research to add credibility

Each paragraph max 1000 characters.
Example: { "type": "narrative", "title": "Strategic Narrative", "content": ["Our AI-powered strategic intelligence platform transforms raw data into actionable executive insights, enabling Fortune 500 companies to anticipate market shifts 3-6 months ahead of competitors.", "By leveraging advanced machine learning algorithms and natural language processing, we analyze millions of data points from diverse sources...", "Unlike traditional business intelligence tools..."] }

TYPE: "drivers" - KEY STRATEGIC DRIVERS (NUMBERED LIST)
REQUIRED FIELDS:
- title: Section title (e.g., "Key Strategic Drivers")
- drivers: Array of 3-4 driver objects, each with:
  * title: Clear driver name (max 150 chars)
  * description: Concise explanation (1-2 sentences, max 500 chars)

VISUAL DESIGN:
- Each driver is displayed with a numbered circular bullet (green accent color)
- Clean left-aligned list with green left border accent
- Hover effects make items slide right and brighten
- Items are visually separated with subtle backgrounds and spacing

Example: { "type": "drivers", "title": "Key Strategic Drivers", "drivers": [{"title": "Market Intelligence Automation", "description": "Automated collection and analysis of market data reducing manual research time by 85% while increasing coverage breadth by 10x"}, {"title": "Predictive Analytics Engine", "description": "Machine learning models trained on 15 years of market data delivering 89% accuracy in trend prediction"}, {"title": "Real-time Competitive Monitoring", "description": "24/7 monitoring of competitor activities across 150+ data sources with instant alert capabilities"}, {"title": "Executive Dashboard Integration", "description": "Seamless integration with existing C-suite dashboards providing unified strategic view"}] }

TYPE: "dependencies" - CRITICAL DEPENDENCIES (VISUAL FLOW)
REQUIRED FIELDS:
- title: Section title (e.g., "Critical Dependencies")
- dependencies: Array of 2-4 dependency objects, each with:
  * name: Dependency name (max 200 chars)
  * criticality: Criticality label (max 100 chars, e.g., "Critical", "High Priority", "Moderate")
  * criticalityLevel: Enum value ("high", "medium", or "low") - determines visual styling
  * impact: Impact description if dependency fails (max 500 chars)

VISUAL DESIGN:
- Dependencies are displayed as a flowing sequence (left to right) with arrows between them
- Each dependency is shown as a card with border color and background tint based on criticalityLevel:
  * high: Red border/tint (#da291c) - critical path items
  * medium: Yellow border/tint (#EE9E20) - important but manageable
  * low: Green border/tint (#50AF7B) - lower risk dependencies
- Badge displays the criticality label with matching color
- Hover effects make cards lift and glow

Example: { "type": "dependencies", "title": "Critical Dependencies", "dependencies": [{"name": "Data Infrastructure", "criticality": "Critical", "criticalityLevel": "high", "impact": "Cloud-based infrastructure must maintain 99.99% uptime to ensure continuous data collection and processing"}, {"name": "API Integrations", "criticality": "High Priority", "criticalityLevel": "medium", "impact": "Third-party data provider APIs require stable connections and SLA compliance for real-time updates"}, {"name": "User Adoption", "criticality": "Moderate", "criticalityLevel": "low", "impact": "Executive buy-in and training programs ensure platform utilization across decision-making processes"}] }

TYPE: "risks" - STRATEGIC RISK MATRIX (3x3 VISUAL GRID)
REQUIRED FIELDS:
- title: Section title (e.g., "Strategic Risk Matrix", "Risk Assessment")
- risks: Array of 3-5 risk objects, each with:
  * description: Risk description (max 500 chars)
  * probability: Enum value ("high", "medium", or "low") - determines VERTICAL position in matrix
  * impact: Enum value ("high", "medium", or "low") - determines HORIZONTAL position in matrix

CRITICAL: This is a VISUAL RISK MATRIX with spatial positioning:
- Y-axis (vertical): Probability (High at top, Medium in middle, Low at bottom)
- X-axis (horizontal): Impact (Low at left, Medium in center, High at right)
- Each risk is positioned in its corresponding cell based on probability + impact combination
- Cells are color-coded: Green (low risk), Yellow (medium risk), Red (high risk)
- This creates an elegant 3x3 heat map for executive risk visualization

Example: { "type": "risks", "title": "Strategic Risk Matrix", "risks": [{"description": "Data Privacy Regulation changes could require architecture redesign", "probability": "high", "impact": "high"}, {"description": "Market Saturation in primary vertical", "probability": "high", "impact": "low"}, {"description": "Competitor Innovation in AI space", "probability": "medium", "impact": "medium"}, {"description": "Cybersecurity Breach exposing client data", "probability": "medium", "impact": "high"}, {"description": "Tech Stack Obsolescence within 5 years", "probability": "low", "impact": "low"}] }

TYPE: "insights" - EXPERT CONVERSATION POINTS (CARD GRID)
REQUIRED FIELDS:
- title: Section title (e.g., "Expert Conversation Points", "Key Insights")
- insights: Array of 4-6 insight objects, each with:
  * category: Category tag (e.g., "Technology", "Market Position", "Innovation", "Financial Impact", "Expansion", "Differentiation" - max 100 chars)
  * text: The insight statement with supporting detail (max 500 chars)

VISUAL DESIGN:
- Insights displayed as elegant cards in a responsive grid layout
- Each card has a colored top border (gradient red to yellow)
- Category badges rotate through accent colors (red, green, yellow)
- Cards have glass-morphism effect (semi-transparent with subtle gradient)
- Hover effects make cards lift with shadow
- Perfect for demonstrating deep domain expertise in executive conversations

CONTENT GUIDANCE:
- Include specific numbers, percentages, and metrics
- Reference concrete capabilities or achievements
- Each insight should be a "wow factor" conversation starter
- Balance across categories: technology, market, financials, strategy

Example: { "type": "insights", "title": "Expert Conversation Points", "insights": [{"category": "Technology", "text": "Our proprietary NLP engine processes unstructured data 40% faster than industry-standard solutions, enabling real-time insight generation from breaking news and social trends."}, {"category": "Market Position", "text": "Currently serving 47 Fortune 500 clients with a 94% retention rate, positioning us as the market leader in enterprise strategic intelligence solutions."}, {"category": "Financial Impact", "text": "Clients report average ROI of 312% within first year of implementation, with cost savings from improved decision-making exceeding $45M annually."}, {"category": "Innovation", "text": "Q3 2024 launch of quantum-resistant encryption ensures long-term data security, addressing enterprise concerns about future cryptographic vulnerabilities."}, {"category": "Differentiation", "text": "Only platform combining structured and unstructured data analysis with behavioral economics models for comprehensive strategic intelligence."}] }

TYPE: "simple" - GENERAL CONTENT SLIDE
REQUIRED FIELDS:
- title: Slide title
- content: Array of text strings (bullet points or paragraphs)
Example: { "type": "simple", "title": "Summary", "content": ["Key takeaway 1", "Key takeaway 2"] }

Your slide will be rendered in a professional template with appropriate styling.`;

export const PRESENTATION_SLIDE_CONTENT_SCHEMA = {
  type: "object",
  properties: {
    slide: {
      type: "object",
      required: ["type", "title"],
      properties: {
        type: {
          type: "string",
          enum: ["title", "narrative", "drivers", "dependencies", "risks", "insights", "simple"]
        },
        title: {
          type: "string",
          maxLength: 200
        },
        subtitle: {
          type: "string",
          maxLength: 300
        },
        content: {
          type: "array",
          items: {
            type: "string",
            maxLength: 1000
          }
        },
        drivers: {
          type: "array",
          items: {
            type: "object",
            required: ["title", "description"],
            properties: {
              title: {
                type: "string",
                maxLength: 150
              },
              description: {
                type: "string",
                maxLength: 500
              }
            }
          }
        },
        dependencies: {
          type: "array",
          items: {
            type: "object",
            required: ["name", "criticality", "impact"],
            properties: {
              name: {
                type: "string",
                maxLength: 200
              },
              criticality: {
                type: "string",
                maxLength: 100
              },
              criticalityLevel: {
                type: "string",
                enum: ["high", "medium", "low"]
              },
              impact: {
                type: "string",
                maxLength: 500
              }
            }
          }
        },
        risks: {
          type: "array",
          items: {
            type: "object",
            required: ["description", "probability", "impact"],
            properties: {
              description: {
                type: "string",
                maxLength: 500
              },
              probability: {
                type: "string",
                enum: ["high", "medium", "low"]
              },
              impact: {
                type: "string",
                enum: ["high", "medium", "low"]
              }
            }
          }
        },
        insights: {
          type: "array",
          items: {
            type: "object",
            required: ["category", "text"],
            properties: {
              category: {
                type: "string",
                maxLength: 100
              },
              text: {
                type: "string",
                maxLength: 500
              }
            }
          }
        }
      }
    }
  },
  required: ["slide"]
};

/**
 * Presentation Slides Generation Prompt (DEPRECATED - kept for reference)
 * Creates professional slide deck from research data
 */
export const PRESENTATION_SLIDES_GENERATION_PROMPT = `You are an expert presentation designer creating a professional slide deck for executive audiences.

Your task is to transform complex research into a compelling narrative presentation with 3-10 slides.

CRITICAL REQUIREMENTS:
- ALL text must be concise and within character limits
- NEVER repeat the same text or phrases multiple times
- EVERY slide must have a UNIQUE title - no two slides should have the same or similar titles
- Keep titles under 200 characters
- Keep subtitles under 300 characters
- Keep descriptions under 500 characters
- If content exceeds limits, summarize rather than truncate mid-sentence
- Do NOT concatenate or duplicate content within titles or subtitles
- Each slide should present NEW information, not repeat previous content

SLIDE STRUCTURE:

IMPORTANT: Each slide type has REQUIRED fields that MUST be populated. Slides without these fields will be rejected.

Slide 1 - TITLE SLIDE (type: "title")
REQUIRED FIELDS:
- title: Professional title that captures the initiative (max 200 chars)
OPTIONAL FIELDS:
- subtitle: Compelling subtitle that frames the strategic context (max 300 chars)
Example: { "type": "title", "title": "Digital Transformation Roadmap 2025-2030", "subtitle": "Strategic Initiative for Market Leadership" }

Slide 2 - ELEVATOR PITCH (type: "narrative")
REQUIRED FIELDS:
- title: Section title (e.g., "Strategic Narrative", "Elevator Pitch")
- content: Array of 2-3 paragraph strings that tell the story
Example: { "type": "narrative", "title": "Strategic Narrative", "content": ["First paragraph...", "Second paragraph...", "Third paragraph..."] }
Focus on the "why now" and strategic imperative. Should be presentable in 60-90 seconds. Each paragraph max 1000 characters.

Slide 3 - KEY STRATEGIC DRIVERS (type: "drivers")
REQUIRED FIELDS:
- title: Section title (e.g., "Key Strategic Drivers")
- drivers: Array of 3-4 driver objects, each with:
  * title: Clear driver name (max 150 chars)
  * description: Concise explanation (1-2 sentences, max 500 chars)
Example: { "type": "drivers", "title": "Key Strategic Drivers", "drivers": [{"title": "Market Demand", "description": "Growing customer demand for..."}, ...] }

Slide 4 - CRITICAL DEPENDENCIES (type: "dependencies")
REQUIRED FIELDS:
- title: Section title (e.g., "Critical Dependencies")
- dependencies: Array of 2-4 dependency objects, each with:
  * name: Dependency name (max 200 chars)
  * criticality: Criticality description (max 100 chars, e.g., "Critical", "High", "Medium")
  * criticalityLevel: Enum value ("high", "medium", or "low")
  * impact: Impact description if dependency fails (max 500 chars)
Example: { "type": "dependencies", "title": "Critical Dependencies", "dependencies": [{"name": "Cloud Infrastructure", "criticality": "Critical", "criticalityLevel": "high", "impact": "System downtime..."}, ...] }

Slide 5 - STRATEGIC RISK MATRIX (type: "risks") - 3x3 VISUAL GRID
REQUIRED FIELDS:
- title: Section title (e.g., "Strategic Risk Matrix", "Risk Assessment")
- risks: Array of 3-5 risk objects, each with:
  * description: Risk description (max 500 chars)
  * probability: Enum value ("high", "medium", or "low") - determines VERTICAL position
  * impact: Enum value ("high", "medium", or "low") - determines HORIZONTAL position
CRITICAL: Creates a visual 3x3 matrix heat map with spatial positioning based on probability (Y-axis) and impact (X-axis)
Example: { "type": "risks", "title": "Strategic Risk Matrix", "risks": [{"description": "Data Privacy Regulation changes may impact architecture", "probability": "high", "impact": "high"}, {"description": "Market Saturation limiting growth", "probability": "high", "impact": "low"}, ...] }

Slide 6 - EXPERT CONVERSATION POINTS (type: "insights")
REQUIRED FIELDS:
- title: Section title (e.g., "Expert Conversation Points", "Key Insights")
- insights: Array of 4-6 insight objects, each with:
  * category: Category tag (e.g., "Regulatory", "Market", "Technology" - max 100 chars)
  * text: The insight statement (max 500 chars)
Example: { "type": "insights", "title": "Expert Conversation Points", "insights": [{"category": "Market", "text": "Current market trends indicate..."}, ...] }

OPTIONAL: Additional Simple Slides (type: "simple")
REQUIRED FIELDS:
- title: Slide title
- content: Array of text strings or single text paragraph
Example: { "type": "simple", "title": "Summary", "content": ["Key takeaway 1", "Key takeaway 2"] }

IMPORTANT DESIGN PRINCIPLES:
- Keep text concise and scannable
- Use professional business language
- Focus on strategic insights, not tactical details
- Each slide should stand alone but support the overall narrative
- Extract specific data points and metrics from research when available
- NEVER repeat phrases or create circular text
- Stay well within character limits for all fields

Your slides will be rendered in a professional template with appropriate styling.`;

/**
 * Presentation Slides JSON Schema
 */
export const PRESENTATION_SLIDES_SCHEMA = {
  type: "object",
  properties: {
    presentationSlides: {
      type: "object",
      properties: {
        slides: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              title: { type: "string" },
              subtitle: { type: "string" },
              content: {
                type: "array",
                items: { type: "string" }
              },
              drivers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" }
                  }
                }
              },
              dependencies: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    criticality: { type: "string" },
                    criticalityLevel: { type: "string" },
                    impact: { type: "string" }
                  }
                }
              },
              risks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    description: { type: "string" },
                    probability: { type: "string" },
                    impact: { type: "string" }
                  }
                }
              },
              insights: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    text: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
