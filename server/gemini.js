/**
 * Gemini API Integration Module
 * Phase 4 Enhancement: Extracted from server.js
 * Handles all interactions with the Gemini AI API
 */

import { CONFIG, getGeminiApiUrl } from './config.js';

const API_URL = getGeminiApiUrl();

/**
 * Calls Gemini API and expects a JSON response
 * @param {Object} payload - The API request payload
 * @param {number} retryCount - Number of retry attempts (default: 3)
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} If API call fails after all retries
 */
export async function callGeminiForJson(payload, retryCount = CONFIG.API.RETRY_COUNT) {
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

      const extractedJsonText = result.candidates[0].content.parts[0].text;
      return JSON.parse(extractedJsonText); // Return the parsed JSON

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
