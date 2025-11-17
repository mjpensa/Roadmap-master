/**
 * Gemini API Integration Module
 * Phase 4 Enhancement: Extracted from server.js
 * Handles all interactions with the Gemini AI API
 */

import { CONFIG, getGeminiApiUrl } from './config.js';
import { jsonrepair } from 'jsonrepair';

const API_URL = getGeminiApiUrl();

/**
 * Calls Gemini API and expects a JSON response
 * @param {Object} payload - The API request payload
 * @param {number} retryCount - Number of retry attempts (default: 3)
 * @param {Function} onRetry - Optional callback for retry events (attempt, error)
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} If API call fails after all retries
 */
export async function callGeminiForJson(payload, retryCount = CONFIG.API.RETRY_COUNT, onRetry = null) {
  for (let attempt = 0; attempt < retryCount; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorText = 'Unknown error';
        try {
          errorText = await response.text();
        } catch (e) {
          console.error('Failed to read error response:', e);
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

      let extractedJsonText = result.candidates[0].content.parts[0].text;

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

        // Try to repair the JSON using jsonrepair library
        try {
          console.log('Attempting to repair JSON using jsonrepair library...');
          const repairedJsonText = jsonrepair(extractedJsonText);
          const repairedData = JSON.parse(repairedJsonText);
          console.log('Successfully repaired and parsed JSON!');
          return repairedData;
        } catch (repairError) {
          console.error('JSON repair failed:', repairError.message);
          console.error('Saving full JSON response to help debug...');
          console.error('Full JSON response:', extractedJsonText);
          throw parseError; // Throw the original error
        }
      }

    } catch (error) {
      console.log(`Attempt ${attempt + 1}/${retryCount} failed:`, error.message);

      if (attempt >= retryCount - 1) {
        throw error; // Throw the last error
      }

      // Notify caller about retry if callback provided
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      const delayMs = CONFIG.API.RETRY_BASE_DELAY_MS * (attempt + 1);
      console.log(`Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('All API retry attempts failed.');
}

/**
 * Calls Gemini API and expects a text response
 * @param {Object} payload - The API request payload
 * @param {number} retryCount - Number of retry attempts (default: 3)
 * @returns {Promise<string>} Text response
 * @throws {Error} If API call fails after all retries
 */
export async function callGeminiForText(payload, retryCount = CONFIG.API.RETRY_COUNT) {
  for (let attempt = 0; attempt < retryCount; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorText = 'Unknown error';
        try {
          errorText = await response.text();
        } catch (e) {
          console.error('Failed to read error response:', e);
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

      return result.candidates[0].content.parts[0].text; // Return raw text

    } catch (error) {
      console.log(`Attempt ${attempt + 1} failed:`, error.message);
      if (attempt >= retryCount - 1) {
        throw error; // Throw the last error
      }
      await new Promise(resolve =>
        setTimeout(resolve, CONFIG.API.RETRY_BASE_DELAY_MS * (attempt + 1))
      );
    }
  }
  throw new Error('All API retry attempts failed.');
}
