/**
 * Gemini API Integration Module
 * Phase 4 Enhancement: Extracted from server.js
 * Phase 3 Enhancement: Integrated metrics tracking
 * Handles all interactions with the Gemini AI API
 */

import { CONFIG, getGeminiApiUrl } from './config.js';
import { jsonrepair } from 'jsonrepair';
import { getMetricsCollector } from './monitoring.js';

const API_URL = getGeminiApiUrl();

/**
 * Parses a 429 rate limit error response to extract retry delay
 * @param {Object} errorData - The parsed error response JSON
 * @returns {number|null} Retry delay in milliseconds, or null if not found
 */
function parseRetryDelay(errorData) {
  try {
    if (!errorData || !errorData.error || !errorData.error.details) {
      return null;
    }

    // Find RetryInfo in the details array
    const retryInfo = errorData.error.details.find(
      detail => detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
    );

    if (!retryInfo || !retryInfo.retryDelay) {
      return null;
    }

    // Parse retry delay (format: "36s" or "36.397821569s")
    const delay = retryInfo.retryDelay;
    const seconds = parseFloat(delay.replace('s', ''));

    if (isNaN(seconds)) {
      return null;
    }

    return Math.ceil(seconds * 1000); // Convert to milliseconds and round up
  } catch (e) {
    console.error('Failed to parse retry delay:', e);
    return null;
  }
}

/**
 * Checks if an error is a rate limit (429) error
 * @param {Error} error - The error to check
 * @returns {boolean} True if this is a 429 rate limit error
 */
function isRateLimitError(error) {
  return error.message && error.message.includes('status: 429');
}

/**
 * Creates a user-friendly error message for quota exhaustion
 * @param {Object} errorData - The parsed error response JSON
 * @returns {string} User-friendly error message
 */
function createQuotaErrorMessage(errorData) {
  try {
    if (errorData && errorData.error && errorData.error.message) {
      const msg = errorData.error.message;

      // Check if it's a quota exhaustion error
      if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        // Extract retry delay if available
        const retryDelayMatch = msg.match(/retry in ([\d.]+)s/);
        const retryTime = retryDelayMatch ? Math.ceil(parseFloat(retryDelayMatch[1])) : null;

        if (retryTime && retryTime > 60) {
          return `API quota exceeded. The free tier has limits on requests per minute. Please wait ${Math.ceil(retryTime / 60)} minute(s) and try again, or upgrade your API plan at https://ai.google.dev/pricing`;
        } else if (retryTime) {
          return `API quota exceeded. Please wait ${retryTime} seconds and try again, or upgrade your API plan at https://ai.google.dev/pricing`;
        }

        return 'API quota exceeded. You have reached the free tier limit. Please wait a few minutes and try again, or upgrade your API plan at https://ai.google.dev/pricing';
      }
    }
  } catch (e) {
    console.error('Failed to create quota error message:', e);
  }

  return 'API rate limit exceeded. Please try again in a few minutes.';
}

/**
 * Generic retry wrapper for async operations with exponential backoff
 * Enhanced to handle 429 rate limit errors with proper retry delays
 * @param {Function} operation - The async operation to retry
 * @param {number} retryCount - Number of retry attempts
 * @param {Function} onRetry - Optional callback for retry events (attempt, error)
 * @returns {Promise<any>} Result of the operation
 * @throws {Error} If all retry attempts fail
 */
export async function retryWithBackoff(operation, retryCount = CONFIG.API.RETRY_COUNT, onRetry = null) {
  let lastError = null;

  for (let attempt = 0; attempt < retryCount; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt + 1}/${retryCount} failed:`, error.message);

      // Check if this is a rate limit error
      const isRateLimit = isRateLimitError(error);

      if (isRateLimit) {
        console.warn('⚠️  Rate limit (429) error detected');

        // For rate limit errors, don't retry if it's quota exhaustion
        // (retrying won't help until quota resets)
        if (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
          console.error('❌ Quota exhausted - cannot retry');
          throw error; // Fail immediately for quota exhaustion
        }
      }

      if (attempt >= retryCount - 1) {
        throw error; // Throw the last error
      }

      // Notify caller about retry if callback provided
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Calculate delay - use exponential backoff
      // For rate limit errors, use longer delays
      let delayMs;
      if (isRateLimit) {
        // For rate limits: 2s, 4s, 8s
        delayMs = CONFIG.API.RETRY_BASE_DELAY_MS * Math.pow(2, attempt + 1);
      } else {
        // For other errors: 1s, 2s, 3s
        delayMs = CONFIG.API.RETRY_BASE_DELAY_MS * (attempt + 1);
      }

      console.log(`Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error('All retry attempts failed.');
}

/**
 * Calls Gemini API and expects a JSON response
 * @param {Object} payload - The API request payload
 * @param {number} retryCount - Number of retry attempts (default: 3)
 * @param {Function} onRetry - Optional callback for retry events (attempt, error)
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} If API call fails after all retries
 */
export async function callGeminiForJson(payload, retryCount = CONFIG.API.RETRY_COUNT, onRetry = null) {
  return retryWithBackoff(async () => {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorText = 'Unknown error';
      let errorData = null;

      try {
        errorText = await response.text();
        // Try to parse as JSON for better error messages
        try {
          errorData = JSON.parse(errorText);
        } catch (jsonError) {
          // Not JSON, use raw text
        }
      } catch (e) {
        console.error('Failed to read error response:', e);
      }

      // ═══════════════════════════════════════════════════════════
      // ✨ PHASE 2 FIX: ENHANCED ERROR LOGGING
      // ═══════════════════════════════════════════════════════════
      // Provide comprehensive error context for debugging

      console.error('\n' + '='.repeat(60));
      console.error('[Gemini API] Request failed:');
      console.error('='.repeat(60));
      console.error(`  - Error type: ${response.status === 429 ? 'Rate Limit' : 'HTTP Error'}`);
      console.error(`  - Status code: ${response.status}`);
      console.error(`  - Status text: ${response.statusText}`);

      if (errorData) {
        console.error(`  - Error details: ${JSON.stringify(errorData, null, 2)}`);
      } else {
        console.error(`  - Error text: ${errorText.substring(0, 500)}`);
      }

      // Log request details for reproducibility (without exposing sensitive data)
      console.error('  - Request details:');
      console.error(`    - Has system instruction: ${!!payload.systemInstruction}`);
      console.error(`    - Has generation config: ${!!payload.generationConfig}`);
      console.error(`    - Temperature: ${payload.generationConfig?.temperature}`);
      console.error(`    - Max output tokens: ${payload.generationConfig?.maxOutputTokens}`);
      if (payload.contents && payload.contents[0] && payload.contents[0].parts && payload.contents[0].parts[0]) {
        const promptLength = payload.contents[0].parts[0].text?.length || 0;
        console.error(`    - Prompt length: ${promptLength} characters`);
      }
      console.error('='.repeat(60) + '\n');

      // For 429 errors, create user-friendly message
      if (response.status === 429 && errorData) {
        const friendlyMessage = createQuotaErrorMessage(errorData);
        throw new Error(`API call failed with status: ${response.status} - ${friendlyMessage}`);
      }

      throw new Error(`API call failed with status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      console.error('Invalid API response:', JSON.stringify(result));
      throw new Error('Invalid response from AI API');
    }

    const safetyRatings = result.candidates[0].safetyRatings;
    if (safetyRatings) {
      const blockedRating = safetyRatings.find(rating => rating.blocked);
      if (blockedRating) {
        throw new Error(`API call blocked due to safety rating: ${blockedRating.category}`);
      }
    }

    // Validate that parts array exists and has content
    if (!result.candidates[0].content.parts || !Array.isArray(result.candidates[0].content.parts) || result.candidates[0].content.parts.length === 0) {
      console.error('No content parts in Gemini response:', JSON.stringify(result));
      throw new Error('No content parts in Gemini response');
    }

    let extractedJsonText = result.candidates[0].content.parts[0].text;

    // ═══════════════════════════════════════════════════════════
    // ✨ PHASE 1 FIX: DETAILED RESPONSE SIZE LOGGING
    // ═══════════════════════════════════════════════════════════
    // Helps diagnose JSON truncation issues at 60,001 character boundary

    const responseSize = extractedJsonText.length;
    const responseSizeKB = (responseSize / 1024).toFixed(2);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[Gemini API] Response received:`);
    console.log(`${'='.repeat(60)}`);
    console.log(`  - Size: ${responseSize} characters`);
    console.log(`  - Size (KB): ${responseSizeKB} KB`);
    console.log(`  - First 100 chars: ${extractedJsonText.substring(0, 100)}`);
    console.log(`  - Last 100 chars: ${extractedJsonText.substring(responseSize - 100)}`);

    // ═══════════════════════════════════════════════════════════
    // ✨ PHASE 3 ENHANCEMENT: METRICS TRACKING
    // ═══════════════════════════════════════════════════════════
    // Track response sizes and detect truncation for monitoring

    let isTruncated = false;

    // CRITICAL: Check for suspicious truncation at ~60,001 character boundary
    // Error desc_1.md documents consistent truncation at exactly this point
    if (responseSize >= 60000 && responseSize <= 60010) {
      console.error(`\n${'!'.repeat(60)}`);
      console.error(`⚠️  WARNING: Response size near suspicious 60K truncation point!`);
      console.error(`${'!'.repeat(60)}`);
      console.error(`  - Exact size: ${responseSize} characters`);
      console.error(`  - This matches the truncation pattern from error desc_1.md`);
      console.error(`  - Last character: "${extractedJsonText.charAt(responseSize - 1)}"`);
      console.error(`  - Ends with closing brace: ${extractedJsonText.trim().endsWith('}')}`);

      if (!extractedJsonText.trim().endsWith('}')) {
        console.error(`  - ❌ TRUNCATION DETECTED: Response does not end with closing brace`);
        console.error(`  - Last 200 chars: ${extractedJsonText.substring(responseSize - 200)}`);
        isTruncated = true;
      }
    }
    console.log(`${'='.repeat(60)}\n`);

    // Record response size in metrics (for anomaly detection)
    try {
      const metrics = getMetricsCollector();
      metrics.recordResponseSize(responseSize, isTruncated);
    } catch (metricsError) {
      // Don't fail the request if metrics recording fails
      console.warn('[Metrics] Failed to record response size:', metricsError.message);
    }

    // Clean up the JSON text before parsing
    // Remove markdown code blocks if present
    extractedJsonText = extractedJsonText.trim();
    if (extractedJsonText.startsWith('```json')) {
      extractedJsonText = extractedJsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (extractedJsonText.startsWith('```')) {
      extractedJsonText = extractedJsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      return JSON.parse(extractedJsonText);
    } catch (parseError) {
      // Extract error position from error message
      const positionMatch = parseError.message.match(/position (\d+)/);
      const errorPosition = positionMatch ? parseInt(positionMatch[1]) : 0;

      // Log the problematic JSON for debugging
      console.error('JSON Parse Error:', parseError.message);
      console.error('Total JSON length:', extractedJsonText.length);
      console.error('Problematic JSON (first 500 chars):', extractedJsonText.substring(0, 500));
      if (errorPosition > 0) {
        const contextStart = Math.max(0, errorPosition - 200);
        const contextEnd = Math.min(extractedJsonText.length, errorPosition + 200);
        console.error('Problematic JSON (around error position):', extractedJsonText.substring(contextStart, contextEnd));
      }

      // ═══════════════════════════════════════════════════════════
      // ✨ PHASE 1 FIX: PRE-VALIDATION BEFORE REPAIR
      // ═══════════════════════════════════════════════════════════
      // Quick check: does the response even contain required fields?
      // This provides faster failure diagnosis before expensive repair attempts

      console.log('[Pre-Validation] Checking for required fields in raw response...');

      // Check for critical field presence (string-based search)
      const hasTimeColumnsString = extractedJsonText.includes('"timeColumns"');
      const hasDataString = extractedJsonText.includes('"data"');
      const hasTitleString = extractedJsonText.includes('"title"');

      if (!hasTimeColumnsString) {
        console.error('\n' + '!'.repeat(60));
        console.error('❌ FATAL: Response missing "timeColumns" field entirely');
        console.error('!'.repeat(60));
        console.error('Response preview (first 1000 chars):');
        console.error(extractedJsonText.substring(0, 1000));
        console.error('\nThis indicates a prompt/schema enforcement failure.');
        console.error('The AI did not follow the CRITICAL REQUIREMENT to include timeColumns.');
        throw new Error(
          'AI response missing required "timeColumns" field. ' +
          'This is a prompt/schema enforcement failure. ' +
          'Response size: ' + extractedJsonText.length + ' chars'
        );
      }

      if (!hasDataString) {
        console.error('❌ FATAL: Response missing "data" field entirely');
        throw new Error('AI response missing required "data" field');
      }

      console.log('[Pre-Validation] ✅ Required fields present as strings, attempting repair...');

      // Try to repair the JSON using jsonrepair library
      try {
        console.log('Attempting to repair JSON using jsonrepair library...');
        const repairedJsonText = jsonrepair(extractedJsonText);
        const repairedData = JSON.parse(repairedJsonText);
        console.log('Successfully repaired and parsed JSON!');

        // Log the repaired data structure for debugging
        console.log('🔍 Repaired data structure keys:', Object.keys(repairedData));

        // Validate based on response type (chart vs task analysis)
        // Chart data has: title, timeColumns, data
        // Task analysis has: taskName, status
        const isChartData = repairedData.title && repairedData.timeColumns && repairedData.data;
        const isTaskAnalysis = repairedData.taskName && repairedData.status;

        if (isChartData) {
          console.log('  - Detected chart data structure');
          console.log('  - title:', repairedData.title);
          console.log('  - timeColumns length:', repairedData.timeColumns?.length);
          console.log('  - data length:', repairedData.data?.length);

          // Validate chart data structure
          if (!repairedData.data || !Array.isArray(repairedData.data)) {
            console.error('❌ Repaired JSON is missing or has invalid data array');
            throw new Error('Repaired JSON structure is invalid - missing data array');
          }

          if (!repairedData.timeColumns || !Array.isArray(repairedData.timeColumns)) {
            console.error('❌ Repaired JSON is missing or has invalid timeColumns array');
            throw new Error('Repaired JSON structure is invalid - missing timeColumns array');
          }

          // Check for suspiciously small data arrays that might indicate corruption
          if (repairedData.data.length < 2) {
            console.warn('⚠️  Repaired data array has fewer than 2 items, possible data corruption from duplicate key removal');
            console.log('  - data items:', JSON.stringify(repairedData.data, null, 2));
          }

          // Validate data items have required properties
          for (let i = 0; i < repairedData.data.length; i++) {
            const item = repairedData.data[i];
            if (!item.title || typeof item.isSwimlane !== 'boolean' || !item.entity) {
              console.error(`❌ Data item ${i} is missing required properties:`, item);
              throw new Error(`Repaired JSON data item ${i} is invalid - missing required properties`);
            }
          }
        } else if (isTaskAnalysis) {
          console.log('  - Detected task analysis structure');
          console.log('  - taskName:', repairedData.taskName);
          console.log('  - status:', repairedData.status);
          // Task analysis is valid as long as it has taskName and status
        } else {
          console.warn('⚠️  Unknown repaired data structure, proceeding with caution');
        }

        console.log('✅ Repaired JSON validation passed');
        return repairedData;
      } catch (repairError) {
        console.error('JSON repair failed:', repairError.message);
        console.error('Saving full JSON response to help debug...');
        console.error('Full JSON response:', extractedJsonText);
        throw parseError; // Throw the original error
      }
    }
  }, retryCount, onRetry);
}

/**
 * Calls Gemini API and expects a text response
 * @param {Object} payload - The API request payload
 * @param {number} retryCount - Number of retry attempts (default: 3)
 * @returns {Promise<string>} Text response
 * @throws {Error} If API call fails after all retries
 */
export async function callGeminiForText(payload, retryCount = CONFIG.API.RETRY_COUNT) {
  return retryWithBackoff(async () => {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorText = 'Unknown error';
      let errorData = null;

      try {
        errorText = await response.text();
        // Try to parse as JSON for better error messages
        try {
          errorData = JSON.parse(errorText);
        } catch (jsonError) {
          // Not JSON, use raw text
        }
      } catch (e) {
        console.error('Failed to read error response:', e);
      }

      // For 429 errors, create user-friendly message
      if (response.status === 429 && errorData) {
        const friendlyMessage = createQuotaErrorMessage(errorData);
        throw new Error(`API call failed with status: ${response.status} - ${friendlyMessage}`);
      }

      throw new Error(`API call failed with status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      console.error('Invalid API response:', JSON.stringify(result));
      throw new Error('Invalid response from AI API');
    }

    const safetyRatings = result.candidates[0].safetyRatings;
    if (safetyRatings) {
      const blockedRating = safetyRatings.find(rating => rating.blocked);
      if (blockedRating) {
        throw new Error(`API call blocked due to safety rating: ${blockedRating.category}`);
      }
    }

    // Validate that parts array exists and has content
    if (!result.candidates[0].content.parts || !Array.isArray(result.candidates[0].content.parts) || result.candidates[0].content.parts.length === 0) {
      console.error('No content parts in Gemini response:', JSON.stringify(result));
      throw new Error('No content parts in Gemini response');
    }

    return result.candidates[0].content.parts[0].text; // Return raw text
  }, retryCount);
}
