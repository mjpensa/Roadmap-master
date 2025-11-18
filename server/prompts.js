/**
 * AI Prompts and Schemas Module
 * Phase 4 Enhancement: Extracted from server.js
 * Centralizes all AI prompts and JSON schemas
 */

/**
 * Gantt Chart Generation System Prompt
 */
export const CHART_GENERATION_SYSTEM_PROMPT = `You are an expert project management analyst. Your job is to analyze a user's prompt and research files to build a complete Gantt chart data object.

You MUST respond with *only* a valid JSON object matching the schema.

**CRITICAL LOGIC:**
1.  **TIME HORIZON:** First, check the user's prompt for an *explicitly requested* time range (e.g., "2020-2030").
    - If found, use that range.
    - If NOT found, find the *earliest* and *latest* date in all the research to create the range.
2.  **TIME INTERVAL:** Based on the *total duration* of that range, you MUST choose an interval:
    - 0-3 months total: Use "Weeks" (e.g., ["W1 2026", "W2 2026"])
    - 4-12 months total: Use "Months" (e.g., ["Jan 2026", "Feb 2026"])
    - 1-3 years total: Use "Quarters" (e.g., ["Q1 2026", "Q2 2026"])
    - 3+ years total: You MUST use "Years" (e.g., ["2020", "2021", "2022"])
3.  **CHART DATA:** Create the 'data' array.
    - First, identify all logical swimlanes (e.g., "Regulatory Drivers", "JPMorgan Chase"). Add an object for each: \`{ "title": "Swimlane Name", "isSwimlane": true, "entity": "Swimlane Name" }\`
    - Immediately after each swimlane, add all tasks that belong to it: \`{ "title": "Task Name", "isSwimlane": false, "entity": "Swimlane Name", "bar": { ... } }\`
    - **DO NOT** create empty swimlanes.
4.  **BAR LOGIC:**
    - 'startCol' is the 1-based index of the 'timeColumns' array where the task begins.
    - 'endCol' is the 1-based index of the 'timeColumns' array where the task ends, **PLUS ONE**.
    - A task in "2022" has \`startCol: 3, endCol: 4\` (if 2020 is col 1).
    - If a date is "Q1 2024" and the interval is "Years", map it to the "2024" column index.
    - If a date is unknown ("null"), the 'bar' object must be \`{ "startCol": null, "endCol": null, "color": "..." }\`.
5.  **COLORS & LEGEND:** This is a two-step process to assign meaningful colors and create a clear legend.
    a.  **Step 1: Analyze for Cross-Swimlane Themes:** Examine ALL tasks from ALL swimlanes to identify logical thematic groupings that span across multiple swimlanes (e.g., "Regulatory Activity", "Product Launch", "Technical Implementation"). A valid theme must:
        - Appear in at least 2 different swimlanes
        - Have a clear, consistent conceptual relationship (not just similar words)
        - Include at least 2 tasks per theme
        - Result in 2-6 total distinct themes
    b.  **Step 2: Choose Coloring Strategy:**
        * **STRATEGY A (Theme-Based - PREFERRED):** If you identified 2-6 valid cross-swimlane themes in Step 1:
          - Assign one unique color to each theme from this priority-ordered list: "priority-red", "medium-red", "mid-grey", "light-grey", "white", "dark-blue"
          - Color ALL tasks belonging to a theme with that theme's color (even across different swimlanes)
          - Populate the 'legend' array with theme labels: \`"legend": [{ "color": "priority-red", "label": "Regulatory Activity" }, { "color": "medium-red", "label": "Product Launch" }]\`
        * **STRATEGY B (Swimlane-Based - FALLBACK):** If you did NOT find 2-6 valid cross-swimlane themes:
          - Assign one unique color to each swimlane from this priority-ordered list: "priority-red", "medium-red", "mid-grey", "light-grey", "white", "dark-blue"
          - All tasks within the same swimlane get that swimlane's color
          - Populate the 'legend' array with swimlane names: \`"legend": [{ "color": "priority-red", "label": "Swimlane A Name" }, { "color": "medium-red", "label": "Swimlane B Name" }]\`
        * **CRITICAL:** The 'legend' array must NEVER be empty. It must always explain what the colors represent (either themes or swimlanes).
6.  **REGULATORY FLAGS (BANKING ENHANCEMENT):** For each task, analyze if it involves regulatory approval or compliance:
    - Set 'hasRegulatoryDependency' to true if the task requires:
      * Regulatory pre-approval (OCC, FDIC, Federal Reserve, State Banking Department)
      * Regulatory filing or notification
      * Compliance audit or review
      * Regulatory exam preparation
    - Populate 'regulatorName' with the specific regulator (e.g., "OCC", "FDIC", "Federal Reserve", "CFPB", "State Banking Department")
    - Set 'approvalType' to describe the requirement (e.g., "Pre-approval required", "Post-launch filing", "Ongoing compliance review")
    - Provide 'deadline' if mentioned in research (e.g., "Q2 2026 OCC exam window")
    - Set 'criticalityLevel' to:
      * "high" if delays would block project launch or cause compliance violations
      * "medium" if regulatory review is required but some flexibility exists
      * "low" if regulatory involvement is routine oversight
    - If task has no regulatory dependency, you may omit the entire 'regulatoryFlags' object or set 'hasRegulatoryDependency' to false
7.  **SANITIZATION:** All string values MUST be valid JSON strings. You MUST properly escape any characters that would break JSON, such as double quotes (\") and newlines (\\n), within the string value itself.`;

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
    - 'rationale': Explain the timing drivers (regulatory milestones, market events, predecessor completions, resource availability, etc.)
    - 'predecessors': List tasks that must complete before this task can start (extract from research or infer from timeline)
    - 'successors': List tasks that depend on this task's completion (extract from research or infer from timeline)
    - 'isCriticalPath': Determine if this task is on the critical path (true if delays would push the final deadline)
    - 'slackDays': Estimate schedule slack/float in days (how much delay is tolerable), or null if unknown

7.  **TIMELINE SCENARIOS:** Provide three timeline estimates based on research:
    - 'expected': The current planned end date with confidence level (high/medium/low based on data quality and assumptions)
    - 'bestCase': Optimistic completion date assuming favorable conditions (explain assumptions briefly)
    - 'worstCase': Pessimistic completion date accounting for likely risks (explain risks briefly)
    - 'likelyDelayFactors': List 2-4 specific factors most likely to cause delays (resource constraints, dependencies, regulatory approvals, technical complexity, etc.)

8.  **RISK ANALYSIS:** Identify 2-5 specific risks or roadblocks:
    - 'name': Brief risk description (e.g., "Regulatory approval delays")
    - 'severity': Impact level - "high" (project-critical), "medium" (significant impact), or "low" (minor impact)
    - 'likelihood': Probability - "probable" (>60%), "possible" (30-60%), or "unlikely" (<30%)
    - 'impact': Describe what happens if this risk occurs (timeline, cost, scope, quality impact)
    - 'mitigation': Suggest concrete actions to reduce or avoid the risk

9.  **IMPACT ANALYSIS:** Assess consequences of delays or failure:
    - 'downstreamTasks': Estimate number of tasks that would be blocked or delayed (based on successors and research)
    - 'businessImpact': Describe business consequences (revenue loss, customer impact, compliance penalties, market share, etc.)
    - 'strategicImpact': Describe effect on strategic goals, company roadmap, competitive position, etc.
    - 'stakeholders': List key stakeholders affected (teams, executives, customers, partners, regulators, etc.)

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
    - 'externalDrivers': Market pressures, competitive threats, regulatory deadlines, customer demand (2-4 items)
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
 */
export const GANTT_CHART_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    timeColumns: {
      type: "array",
      items: { type: "string" }
    },
    data: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          isSwimlane: { type: "boolean" },
          entity: { type: "string" },
          bar: {
            type: "object",
            properties: {
              startCol: { type: "number" },
              endCol: { type: "number" },
              color: { type: "string" }
            },
          },
          regulatoryFlags: {
            type: "object",
            properties: {
              hasRegulatoryDependency: { type: "boolean" },
              regulatorName: { type: "string" },
              approvalType: { type: "string" },
              deadline: { type: "string" },
              criticalityLevel: { type: "string", enum: ["high", "medium", "low"] }
            }
          }
        },
        required: ["title", "isSwimlane", "entity"]
      }
    },
    legend: {
      type: "array",
      items: {
        type: "object",
        properties: {
          color: { type: "string" },
          label: { type: "string" }
        },
        required: ["color", "label"]
      }
    }
  },
  required: ["title", "timeColumns", "data", "legend"]
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
   - Include specific metrics, timelines, or regulatory deadlines where mentioned
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
     * Regulatory requirements or compliance considerations
     * Competitive landscape insights
     * Emerging trends or disruptions

5. STRATEGIC NARRATIVE
   - Craft a 2-3 sentence "elevator pitch" that captures the essence
   - Include the "so what" - why this matters to the organization NOW

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
      required: ["drivers", "dependencies", "risks", "keyInsights", "strategicNarrative", "metadata"],
      properties: {
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
              category: { type: "string", enum: ["strategic", "operational", "financial", "regulatory"] },
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
