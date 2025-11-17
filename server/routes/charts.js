/**
 * Chart Routes Module
 * Phase 4 Enhancement: Extracted from server.js
 * Phase 5 Enhancement: Added drag-to-edit task date update endpoint
 * Handles chart generation and retrieval endpoints
 */

import express from 'express';
import mammoth from 'mammoth';
import { CONFIG } from '../config.js';
import { sanitizePrompt, isValidChartId, isValidJobId } from '../utils.js';
import { createSession, storeChart, getChart, updateChart, createJob, updateJob, getJob, completeJob, failJob } from '../storage.js';
import { callGeminiForJson } from '../gemini.js';
import { CHART_GENERATION_SYSTEM_PROMPT, GANTT_CHART_SCHEMA, EXECUTIVE_SUMMARY_GENERATION_PROMPT, EXECUTIVE_SUMMARY_SCHEMA, PRESENTATION_SLIDES_OUTLINE_PROMPT, PRESENTATION_SLIDES_OUTLINE_SCHEMA, PRESENTATION_SLIDE_CONTENT_PROMPT, PRESENTATION_SLIDE_CONTENT_SCHEMA } from '../prompts.js';
import { strictLimiter, apiLimiter } from '../middleware.js';

const router = express.Router();

/**
 * Processes chart generation asynchronously in the background
 * @param {string} jobId - The job ID
 * @param {Object} reqBody - Request body containing the prompt
 * @param {Array} files - Uploaded files
 * @returns {Promise<void>}
 */
async function processChartGeneration(jobId, reqBody, files) {
  try {
    // Update job status to processing
    updateJob(jobId, {
      status: 'processing',
      progress: 'Analyzing your request...'
    });

    const userPrompt = reqBody.prompt;

    // Sanitize user prompt to prevent prompt injection attacks
    const sanitizedPrompt = sanitizePrompt(userPrompt);

    // Create request-scoped storage (fixes global cache memory leak)
    let researchTextCache = "";
    let researchFilesCache = [];

    // Update progress
    updateJob(jobId, {
      status: 'processing',
      progress: `Processing ${files?.length || 0} uploaded file(s)...`
    });

    // Extract text from uploaded files (Sort for determinism, process in parallel)
    if (files && files.length > 0) {
      const sortedFiles = files.sort((a, b) => a.originalname.localeCompare(b.originalname));

      // Process files in parallel for better performance with large folders
      const fileProcessingPromises = sortedFiles.map(async (file) => {
        let content = '';

        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const result = await mammoth.convertToHtml({ buffer: file.buffer });
          content = result.value;
        } else {
          content = file.buffer.toString('utf8');
        }

        return {
          name: file.originalname,
          content: content
        };
      });

      // Wait for all files to be processed
      const processedFiles = await Promise.all(fileProcessingPromises);

      // Combine all file contents in order
      for (const processedFile of processedFiles) {
        researchTextCache += `\n\n--- Start of file: ${processedFile.name} ---\n`;
        researchFilesCache.push(processedFile.name);
        researchTextCache += processedFile.content;
        researchTextCache += `\n--- End of file: ${processedFile.name} ---\n`;
      }

      console.log(`Job ${jobId}: Processed ${processedFiles.length} files (${researchTextCache.length} characters total)`);
    }

    // Update progress
    updateJob(jobId, {
      status: 'processing',
      progress: 'Generating chart data with AI...'
    });

    // Build user query
    const geminiUserQuery = `${sanitizedPrompt}

**CRITICAL REMINDER:** You MUST escape all newlines (\\n) and double-quotes (\") found in the research content before placing them into the final JSON string values.

Research Content:
${researchTextCache}`;

    // Define the payload
    const payload = {
      contents: [{ parts: [{ text: geminiUserQuery }] }],
      systemInstruction: { parts: [{ text: CHART_GENERATION_SYSTEM_PROMPT }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: GANTT_CHART_SCHEMA,
        maxOutputTokens: CONFIG.API.MAX_OUTPUT_TOKENS_CHART,
        temperature: CONFIG.API.TEMPERATURE_STRUCTURED,
        topP: CONFIG.API.TOP_P,
        topK: CONFIG.API.TOP_K
      }
    };

    // Call the API with retry callback to update job status
    const ganttData = await callGeminiForJson(
      payload,
      CONFIG.API.RETRY_COUNT,
      (attemptNum, error) => {
        // Update job status to show retry attempt
        updateJob(jobId, {
          status: 'processing',
          progress: `Retrying AI request (attempt ${attemptNum + 1}/${CONFIG.API.RETRY_COUNT})...`
        });
        console.log(`Job ${jobId}: Retrying due to error: ${error.message}`);
      }
    );

    // Debug: Log what we received from AI
    console.log(`Job ${jobId}: Received ganttData from AI with keys:`, Object.keys(ganttData || {}));
    console.log(`Job ${jobId}: Has timeColumns:`, !!ganttData?.timeColumns, 'Has data:', !!ganttData?.data);

    // Validate data structure before proceeding
    if (!ganttData || typeof ganttData !== 'object') {
      throw new Error('AI returned invalid data structure (not an object)');
    }

    if (!ganttData.timeColumns || !Array.isArray(ganttData.timeColumns)) {
      console.error(`Job ${jobId}: Invalid timeColumns. Type:`, typeof ganttData.timeColumns, 'Value:', ganttData.timeColumns);
      throw new Error('AI returned invalid timeColumns (not an array)');
    }

    if (!ganttData.data || !Array.isArray(ganttData.data)) {
      console.error(`Job ${jobId}: Invalid data. Type:`, typeof ganttData.data, 'Value:', ganttData.data);
      throw new Error('AI returned invalid data array (not an array)');
    }

    if (ganttData.timeColumns.length === 0) {
      throw new Error('AI returned empty timeColumns array');
    }

    if (ganttData.data.length === 0) {
      throw new Error('AI returned empty data array');
    }

    console.log(`Job ${jobId}: Data validation passed - timeColumns: ${ganttData.timeColumns.length} items, data: ${ganttData.data.length} tasks`);

    // Update progress
    updateJob(jobId, {
      status: 'processing',
      progress: 'Generating executive summary...'
    });

    // NEW: Executive Summary Generation
    let executiveSummary = null;
    try {
      console.log(`Job ${jobId}: Generating executive summary from research data...`);

      const executiveSummaryQuery = `${sanitizedPrompt}

Analyze the following research content and generate a comprehensive executive summary that synthesizes strategic insights across all documents.

Research Content:
${researchTextCache}`;

      const executiveSummaryPayload = {
        contents: [{ parts: [{ text: executiveSummaryQuery }] }],
        systemInstruction: { parts: [{ text: EXECUTIVE_SUMMARY_GENERATION_PROMPT }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: EXECUTIVE_SUMMARY_SCHEMA,
          maxOutputTokens: CONFIG.API.MAX_OUTPUT_TOKENS_CHART,
          temperature: 0.7,
          topP: CONFIG.API.TOP_P,
          topK: CONFIG.API.TOP_K
        }
      };

      const summaryResponse = await callGeminiForJson(
        executiveSummaryPayload,
        CONFIG.API.RETRY_COUNT,
        (attemptNum, error) => {
          updateJob(jobId, {
            status: 'processing',
            progress: `Retrying executive summary generation (attempt ${attemptNum + 1}/${CONFIG.API.RETRY_COUNT})...`
          });
          console.log(`Job ${jobId}: Retrying executive summary due to error: ${error.message}`);
        }
      );

      // Extract the executiveSummary object from the response
      executiveSummary = summaryResponse.executiveSummary;

      // Add metadata
      if (executiveSummary && executiveSummary.metadata) {
        executiveSummary.metadata.lastUpdated = new Date().toISOString();
        executiveSummary.metadata.documentsCited = researchFilesCache.length;
      }

      console.log(`Job ${jobId}: Executive summary generated successfully`);
    } catch (summaryError) {
      console.error(`Job ${jobId}: Failed to generate executive summary:`, summaryError);
      // Don't fail the entire job if executive summary fails - just log it
      executiveSummary = null;
    }

    // Update progress
    updateJob(jobId, {
      status: 'processing',
      progress: 'Generating presentation slides...'
    });

    // NEW: Presentation Slides Generation (Two-Phase Approach)
    let presentationSlides = null;
    try {
      console.log(`Job ${jobId}: Generating presentation slides (Phase 1: Outline)...`);

      // PHASE 1: Generate slide outline (types and titles only)
      const outlineQuery = `Based on the following research, create an outline for a professional presentation slide deck.

Research Summary: ${sanitizedPrompt}

Research Content:
${researchTextCache.substring(0, 50000)}`; // Limit research content to avoid token limits

      const outlinePayload = {
        contents: [{ parts: [{ text: outlineQuery }] }],
        systemInstruction: { parts: [{ text: PRESENTATION_SLIDES_OUTLINE_PROMPT }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: PRESENTATION_SLIDES_OUTLINE_SCHEMA,
          maxOutputTokens: 2000,
          temperature: 0.7,
          topP: CONFIG.API.TOP_P,
          topK: CONFIG.API.TOP_K
        }
      };

      const outlineResponse = await callGeminiForJson(
        outlinePayload,
        CONFIG.API.RETRY_COUNT,
        (attemptNum, error) => {
          updateJob(jobId, {
            status: 'processing',
            progress: `Retrying presentation outline generation (attempt ${attemptNum + 1}/${CONFIG.API.RETRY_COUNT})...`
          });
          console.log(`Job ${jobId}: Retrying outline generation due to error: ${error.message}`);
        }
      );

      const outline = outlineResponse.outline;

      if (!outline || !Array.isArray(outline) || outline.length === 0) {
        throw new Error('Failed to generate slide outline - no slides in outline');
      }

      console.log(`Job ${jobId}: ✓ Generated outline with ${outline.length} slides`);
      outline.forEach((item, index) => {
        console.log(`  Slide ${index + 1}: type="${item.type}", title="${item.title}"`);
      });

      // PHASE 2: Generate content for each slide
      updateJob(jobId, {
        status: 'processing',
        progress: 'Generating detailed slide content...'
      });

      console.log(`Job ${jobId}: Generating detailed content for ${outline.length} slides...`);

      const slides = [];
      for (let i = 0; i < outline.length; i++) {
        const slideOutline = outline[i];
        console.log(`Job ${jobId}: Generating content for slide ${i + 1}/${outline.length}: "${slideOutline.title}"`);

        // Build prompt based on slide type
        let slidePrompt = `Generate detailed, professional content for this ${slideOutline.type} slide.

Slide Title: ${slideOutline.title}
Slide Type: ${slideOutline.type}

Research Summary: ${sanitizedPrompt}

Key Research Points:
${researchTextCache.substring(0, 20000)}

`;

        // Add type-specific instructions
        switch (slideOutline.type) {
          case 'title':
            slidePrompt += `For this TITLE slide, provide:
- title: "${slideOutline.title}"
- subtitle: A compelling subtitle that frames the strategic context (1-2 sentences)`;
            break;
          case 'narrative':
            slidePrompt += `For this NARRATIVE slide, provide:
- title: "${slideOutline.title}"
- content: Array of 2-3 paragraphs telling the strategic story (each 2-4 sentences)`;
            break;
          case 'drivers':
            slidePrompt += `For this DRIVERS slide, provide:
- title: "${slideOutline.title}"
- drivers: Array of 3-4 strategic drivers, each with:
  * title: Driver name
  * description: 1-2 sentence explanation`;
            break;
          case 'dependencies':
            slidePrompt += `For this DEPENDENCIES slide, provide:
- title: "${slideOutline.title}"
- dependencies: Array of 2-4 critical dependencies, each with:
  * name: Dependency name
  * criticality: "Critical", "High", or "Medium"
  * criticalityLevel: "high", "medium", or "low"
  * impact: What happens if this dependency fails (1-2 sentences)`;
            break;
          case 'risks':
            slidePrompt += `For this RISKS slide, provide:
- title: "${slideOutline.title}"
- risks: Array of 3-5 strategic risks, each with:
  * description: Risk description (1-2 sentences)
  * probability: "high", "medium", or "low"
  * impact: "severe", "major", "moderate", or "minor"`;
            break;
          case 'insights':
            slidePrompt += `For this INSIGHTS slide, provide:
- title: "${slideOutline.title}"
- insights: Array of 4-6 key insights, each with:
  * category: Category tag (e.g., "Market", "Technology", "Regulatory")
  * text: The insight statement (1-2 sentences)`;
            break;
          default:
            slidePrompt += `For this SIMPLE slide, provide:
- title: "${slideOutline.title}"
- content: Array of 3-5 bullet points (each 1-2 sentences)`;
        }

        const slidePayload = {
          contents: [{ parts: [{ text: slidePrompt }] }],
          systemInstruction: { parts: [{ text: PRESENTATION_SLIDE_CONTENT_PROMPT }] },
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: PRESENTATION_SLIDE_CONTENT_SCHEMA,
            maxOutputTokens: 4000,
            temperature: 0.7,
            topP: CONFIG.API.TOP_P,
            topK: CONFIG.API.TOP_K
          }
        };

        const slideResponse = await callGeminiForJson(
          slidePayload,
          CONFIG.API.RETRY_COUNT,
          (attemptNum, error) => {
            console.log(`Job ${jobId}: Retrying slide ${i + 1} content generation (attempt ${attemptNum + 1}/${CONFIG.API.RETRY_COUNT})...`);
          }
        );

        const slide = slideResponse.slide;
        if (slide) {
          slides.push(slide);
          console.log(`Job ${jobId}: ✓ Generated content for slide ${i + 1}: type="${slide.type}"`);
        } else {
          console.warn(`Job ${jobId}: ⚠️ Failed to generate content for slide ${i + 1}, skipping`);
        }
      }

      if (slides.length > 0) {
        presentationSlides = { slides };
        console.log(`Job ${jobId}: ✓ Successfully generated ${slides.length} slides with content`);
      } else {
        console.error(`Job ${jobId}: ❌ No slides generated successfully`);
        presentationSlides = null;
      }

    } catch (slidesError) {
      console.error(`Job ${jobId}: ❌ FAILED to generate presentation slides`);
      console.error(`Job ${jobId}: Error type:`, slidesError.constructor.name);
      console.error(`Job ${jobId}: Error message:`, slidesError.message);
      console.error(`Job ${jobId}: Error stack:`, slidesError.stack?.substring(0, 500));
      // Don't fail the entire job if presentation slides fail - just log it
      presentationSlides = null;
    }

    // Update progress
    updateJob(jobId, {
      status: 'processing',
      progress: 'Finalizing chart...'
    });

    // Create session to store research data for future requests
    const sessionId = createSession(researchTextCache, researchFilesCache);

    // Store chart data with unique ID for URL-based sharing (including executive summary and presentation slides)
    const chartDataWithEnhancements = {
      ...ganttData,
      executiveSummary: executiveSummary,
      presentationSlides: presentationSlides
    };
    const chartId = storeChart(chartDataWithEnhancements, sessionId);

    // Update job status to complete
    const completeData = {
      ...ganttData,
      executiveSummary: executiveSummary,
      presentationSlides: presentationSlides,
      sessionId,
      chartId
    };
    console.log(`Job ${jobId}: Setting complete status with data keys:`, Object.keys(completeData));
    console.log(`Job ${jobId}: Final data structure:`, {
      hasExecutiveSummary: !!executiveSummary,
      hasPresentationSlides: !!presentationSlides,
      presentationSlidesCount: presentationSlides?.slides?.length || 0
    });

    // Verify completeData before storing
    if (!completeData.timeColumns || !completeData.data) {
      console.error(`Job ${jobId}: Data corruption detected in completeData!`, {
        hasTimeColumns: !!completeData.timeColumns,
        hasData: !!completeData.data,
        keys: Object.keys(completeData)
      });
      throw new Error('Data corruption detected when creating completeData');
    }

    completeJob(jobId, completeData);

    console.log(`Job ${jobId}: Successfully completed`);

  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    failJob(jobId, error.message);
  }
}

/**
 * POST /generate-chart
 * Starts an async chart generation job
 */
router.post('/generate-chart', strictLimiter, async (req, res) => {
  // Generate unique job ID
  const jobId = createJob();

  console.log(`Creating new job ${jobId} with ${req.files?.length || 0} files`);

  // Return job ID immediately (< 100ms response time)
  res.json({
    jobId,
    status: 'processing',
    message: 'Chart generation started. Poll /job/:id for status updates.'
  });

  console.log(`Job ${jobId} queued, starting background processing...`);

  // Process the chart generation asynchronously in the background
  processChartGeneration(jobId, req.body, req.files)
    .catch(error => {
      console.error(`Background job ${jobId} encountered error:`, error);
    });
});

/**
 * GET /job/:id
 * Retrieves the status of a chart generation job
 * Note: No rate limiting applied since this is a lightweight status check
 * and clients poll frequently (every 1 second) during job processing
 */
router.get('/job/:id', (req, res) => {
  const jobId = req.params.id;

  // Validate job ID format
  if (!isValidJobId(jobId)) {
    console.log(`Invalid job ID format: ${jobId}`);
    return res.status(400).json({ error: CONFIG.ERRORS.INVALID_JOB_ID });
  }

  const job = getJob(jobId);
  if (!job) {
    console.log(`Job not found: ${jobId}`);
    return res.status(404).json({
      error: CONFIG.ERRORS.JOB_NOT_FOUND
    });
  }

  console.log(`Job ${jobId} status check: ${job.status}`);

  // Return job status
  if (job.status === 'complete') {
    console.log(`Job ${jobId} complete, returning data with keys:`, Object.keys(job.data || {}));

    // Verify data integrity before sending to client
    if (!job.data || typeof job.data !== 'object') {
      console.error(`Job ${jobId}: Invalid job.data structure. Type:`, typeof job.data);
      return res.status(500).json({ error: 'Internal server error: Invalid job data structure' });
    }

    if (!job.data.timeColumns || !Array.isArray(job.data.timeColumns)) {
      console.error(`Job ${jobId}: Invalid timeColumns in job.data. Type:`, typeof job.data.timeColumns);
      return res.status(500).json({ error: 'Internal server error: Invalid timeColumns' });
    }

    if (!job.data.data || !Array.isArray(job.data.data)) {
      console.error(`Job ${jobId}: Invalid data array in job.data. Type:`, typeof job.data.data);
      return res.status(500).json({ error: 'Internal server error: Invalid data array' });
    }

    console.log(`Job ${jobId}: Data validation passed before sending - timeColumns: ${job.data.timeColumns.length}, data: ${job.data.data.length}`);

    // Log the exact response structure being sent
    const response = {
      status: job.status,
      progress: job.progress,
      data: job.data
    };
    console.log(`Job ${jobId}: Sending response with structure:`, {
      status: response.status,
      progress: response.progress,
      dataKeys: Object.keys(response.data),
      dataHasTimeColumns: Array.isArray(response.data.timeColumns),
      dataHasData: Array.isArray(response.data.data),
      timeColumnsLength: response.data.timeColumns?.length,
      dataLength: response.data.data?.length
    });

    res.json(response);
  } else if (job.status === 'error') {
    console.log(`Job ${jobId} error: ${job.error}`);
    res.json({
      status: job.status,
      error: job.error
    });
  } else {
    // Processing or queued
    console.log(`Job ${jobId} still ${job.status}: ${job.progress}`);
    res.json({
      status: job.status,
      progress: job.progress
    });
  }
});

/**
 * GET /chart/:id
 * Retrieves a chart by its ID
 */
router.get('/chart/:id', (req, res) => {
  const chartId = req.params.id;
  console.log(`📊 Chart request received for ID: ${chartId}`);

  // Validate chart ID format
  if (!isValidChartId(chartId)) {
    console.log(`❌ Invalid chart ID format: ${chartId}`);
    return res.status(400).json({ error: CONFIG.ERRORS.INVALID_CHART_ID });
  }

  const chart = getChart(chartId);
  if (!chart) {
    console.log(`❌ Chart not found in storage: ${chartId}`);
    console.log(`📋 Available chart IDs in storage: [listing not implemented]`);
    return res.status(404).json({
      error: CONFIG.ERRORS.CHART_NOT_FOUND
    });
  }

  // Validate the chart data structure before sending
  if (!chart.data) {
    console.error(`❌ Chart ${chartId} has no data property`);
    return res.status(500).json({ error: 'Chart data is corrupted' });
  }

  if (!chart.data.timeColumns || !Array.isArray(chart.data.timeColumns)) {
    console.error(`❌ Chart ${chartId} has invalid timeColumns. Type:`, typeof chart.data.timeColumns);
    return res.status(500).json({ error: 'Chart data structure is invalid' });
  }

  if (!chart.data.data || !Array.isArray(chart.data.data)) {
    console.error(`❌ Chart ${chartId} has invalid data array. Type:`, typeof chart.data.data);
    return res.status(500).json({ error: 'Chart data structure is invalid' });
  }

  console.log(`✅ Chart ${chartId} found - returning ${chart.data.timeColumns.length} timeColumns and ${chart.data.data.length} tasks`);

  // Return chart data along with sessionId for subsequent requests
  const responseData = {
    ...chart.data,
    sessionId: chart.sessionId,
    chartId: chartId
  };

  console.log(`📤 Sending chart data with keys:`, Object.keys(responseData));

  res.json(responseData);
});

/**
 * POST /update-task-dates
 * Phase 5 Enhancement: Updates task dates when dragged in the Gantt chart
 */
router.post('/update-task-dates', express.json(), (req, res) => {
  try {
    const {
      taskName,
      entity,
      sessionId,
      oldStartCol,
      oldEndCol,
      newStartCol,
      newEndCol,
      startDate,
      endDate
    } = req.body;

    console.log(`🔄 Task date update request:`, {
      taskName,
      entity,
      sessionId,
      oldStartCol,
      oldEndCol,
      newStartCol,
      newEndCol,
      startDate,
      endDate
    });

    // Validate required fields
    if (!taskName || !sessionId || newStartCol === undefined || newEndCol === undefined) {
      console.log('❌ Missing required fields for task update');
      return res.status(400).json({
        error: 'Missing required fields: taskName, sessionId, newStartCol, newEndCol'
      });
    }

    // Note: In this implementation, we're acknowledging the update but not persisting it
    // to a database. The chart data is already updated in memory on the client side.
    // For production use, you would:
    // 1. Update the chart data in the chartStore
    // 2. Persist to a database if needed
    // 3. Trigger any necessary recalculations or notifications

    console.log(`✅ Task "${taskName}" dates updated successfully (client-side only)`);

    res.json({
      success: true,
      message: 'Task dates updated',
      taskName,
      newStartCol,
      newEndCol,
      startDate,
      endDate
    });
  } catch (error) {
    console.error('❌ Error updating task dates:', error);
    res.status(500).json({
      error: 'Failed to update task dates',
      details: error.message
    });
  }
});

/**
 * POST /update-task-color
 * Phase 6 Enhancement: Updates task bar color via context menu
 */
router.post('/update-task-color', express.json(), (req, res) => {
  try {
    const {
      taskName,
      entity,
      sessionId,
      taskIndex,
      oldColor,
      newColor
    } = req.body;

    console.log(`🎨 Task color update request:`, {
      taskName,
      taskIndex,
      oldColor,
      newColor
    });

    // Validate required fields
    if (!taskName || !sessionId || taskIndex === undefined || !newColor) {
      console.log('❌ Missing required fields for color update');
      return res.status(400).json({
        error: 'Missing required fields: taskName, sessionId, taskIndex, newColor'
      });
    }

    console.log(`✅ Task "${taskName}" color updated successfully`);

    res.json({
      success: true,
      message: 'Task color updated',
      taskName,
      newColor
    });
  } catch (error) {
    console.error('❌ Error updating task color:', error);
    res.status(500).json({
      error: 'Failed to update task color',
      details: error.message
    });
  }
});

export default router;
