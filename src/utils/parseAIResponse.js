/**
 * parseAIResponse.js
 *
 * Defensive utilities for extracting structured data from AI API responses.
 * All functions are null-safe and never throw — they return fallbacks instead.
 *
 * Use these everywhere an AI response is consumed. Never parse inline.
 */

/**
 * Parses an AI response into an array of variant objects.
 * Handles: raw JSON strings, pre-parsed objects, single objects, arrays.
 * Always returns an array. Returns [] on any failure.
 *
 * @param {string|object|Array} response
 * @returns {Array<object>}
 */
export function parseVariants(response) {
  try {
    const parsed = typeof response === 'string' ? JSON.parse(response) : response;
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return [parsed];
    return [];
  } catch {
    return [];
  }
}

/**
 * Extracts a single named field from an AI response.
 * Handles arrays (takes first element) and plain objects.
 * If the response is a plain string that cannot be parsed as JSON, returns fallback.
 * Returns fallback on any failure.
 *
 * @param {string|object|Array} response
 * @param {string} field
 * @param {*} fallback
 * @returns {*}
 */
export function extractField(response, field, fallback = '') {
  try {
    const parsed = typeof response === 'string' ? JSON.parse(response) : response;
    const target = Array.isArray(parsed) ? parsed[0] : parsed;
    const value = target?.[field];
    return value !== undefined && value !== null ? value : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Strips markdown code fences and trims whitespace from a string.
 * Use when an API returns text wrapped in ```json ... ``` blocks.
 *
 * @param {string} text
 * @returns {string}
 */
export function stripCodeFences(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/^```(?:json|js|javascript)?\s*/i, '').replace(/\s*```$/, '').trim();
}
