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
6.  **SANITIZATION:** All string values MUST be valid JSON strings. You MUST properly escape any characters that would break JSON, such as double quotes (\") and newlines (\\n), within the string value itself.`;

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
 * Presentation Slides Generation Prompt
 * Creates professional slide deck from research data
 */
export const PRESENTATION_SLIDES_GENERATION_PROMPT = `You are an expert presentation designer creating a professional slide deck for executive audiences.

Your task is to transform complex research into a compelling narrative presentation with 5-8 slides.

CRITICAL REQUIREMENTS:
- ALL text must be concise and within character limits
- NEVER repeat the same text or phrases multiple times
- Keep titles under 200 characters
- Keep subtitles under 300 characters
- Keep descriptions under 500 characters
- If content exceeds limits, summarize rather than truncate mid-sentence

SLIDE STRUCTURE:

Slide 1 - TITLE SLIDE
- Professional title that captures the initiative (max 200 chars)
- Compelling subtitle that frames the strategic context (max 300 chars)
- Title should be clear and specific, not repetitive

Slide 2 - ELEVATOR PITCH
- 2-3 paragraph narrative that tells the story
- Focus on the "why now" and strategic imperative
- Should be presentable in 60-90 seconds
- Each paragraph max 1000 characters

Slide 3 - KEY STRATEGIC DRIVERS
- Identify 3-4 primary forces driving this initiative
- Each driver should have:
  * Clear title (max 150 chars)
  * Concise description (1-2 sentences, max 500 chars)
  * Business impact context

Slide 4 - CRITICAL DEPENDENCIES
- Map 2-4 critical cross-functional dependencies
- For each dependency:
  * Name the dependency (max 200 chars)
  * Criticality level (HIGH/MEDIUM, max 100 chars)
  * Impact if dependency fails (max 500 chars)
  * Arrow flow to show sequence

Slide 5 - STRATEGIC RISK MATRIX
- Identify 3-5 enterprise-level risks
- For each risk:
  * Description of the risk (max 500 chars)
  * Probability badge (high/medium/low)
  * Impact badge (severe/major/moderate)

Slide 6 - EXPERT CONVERSATION POINTS
- 4-6 key insights that demonstrate deep understanding
- Each insight should include:
  * Category tag (e.g., "Regulatory", "Market", "Technology" - max 100 chars)
  * The insight statement (max 500 chars)
  * Optional: supporting data or context

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
      required: ["slides"],
      properties: {
        slides: {
          type: "array",
          minItems: 5,
          maxItems: 8,
          items: {
            type: "object",
            required: ["type"],
            properties: {
              type: {
                type: "string",
                enum: ["title", "narrative", "drivers", "dependencies", "risks", "insights", "simple"]
              },
              title: { type: "string", maxLength: 200 },
              subtitle: { type: "string", maxLength: 300 },
              content: {
                oneOf: [
                  { type: "string", maxLength: 2000 },
                  { type: "array", items: { type: "string", maxLength: 1000 } }
                ]
              },
              drivers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string", maxLength: 150 },
                    description: { type: "string", maxLength: 500 }
                  },
                  required: ["title", "description"]
                }
              },
              dependencies: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", maxLength: 200 },
                    criticality: { type: "string", maxLength: 100 },
                    criticalityLevel: { type: "string", enum: ["high", "medium", "low"] },
                    impact: { type: "string", maxLength: 500 }
                  },
                  required: ["name", "criticality", "impact"]
                }
              },
              risks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    description: { type: "string", maxLength: 500 },
                    probability: { type: "string", enum: ["high", "medium", "low"] },
                    impact: { type: "string", enum: ["severe", "major", "moderate", "minor"] }
                  },
                  required: ["description", "probability", "impact"]
                }
              },
              insights: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string", maxLength: 100 },
                    text: { type: "string", maxLength: 500 }
                  },
                  required: ["category", "text"]
                }
              }
            }
          }
        }
      }
    }
  },
  required: ["presentationSlides"]
};
