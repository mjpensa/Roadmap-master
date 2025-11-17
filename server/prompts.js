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
5.  **COLORS & LEGEND:** This is a two-step process.
    a.  **Step 1: Find Cross-Swimlane Themes:** First, analyze ALL tasks from ALL swimlanes. Try to find logical, thematic groupings (e.g., "Regulatory Activity", "Product Launch", "Internal Review").
    b.  **Step 2: Assign Colors:** The available color names are: "priority-red", "medium-red", "mid-grey", "light-grey", "white", "dark-blue".
        * **PRIORITY:** You MUST prioritize using the colors in this order: "priority-red" first, then "medium-red", then "mid-grey". Only use "light-grey", "white", and "dark-blue" if you identify more than 3 logical groupings and need more colors.
        * **IF you find 2-6 strong thematic groupings:** Assign a unique color from the available list (respecting the priority) to each theme. Color ALL tasks belonging to that theme with its assigned color.
        * **IF you do this:** You MUST populate the 'legend' array, e.g., \`"legend": [{ "color": "priority-red", "label": "Regulatory Activity" }, { "color": "medium-red", "label": "Product Launch" }]\`.
        * **FALLBACK:** If you *cannot* find any logical themes, then do this instead: assign a *single, different* color (respecting the priority) to each swimlane (e.g., all tasks under "Swimlane A" are "priority-red", all tasks under "Swimlane B" are "medium-red").
        * **IF you use the FALLBACK:** The 'legend' array MUST be an empty array \`[]\`.
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
5.  **CLEAN STRINGS:** All string values MUST be valid JSON strings. You MUST properly escape any characters that would break JSON, such as double quotes (\") and newlines (\\n).`;

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
    summary: { type: "string" } // For 'completed'
  },
  required: ["taskName", "status"]
};
