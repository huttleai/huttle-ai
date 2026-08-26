export const stripCitations = (text) => { // HUTTLE: sanitized
  if (!text) return ''; // HUTTLE: sanitized
  return text.replace(/\[\d+\]/g, '').trim(); // HUTTLE: sanitized
}; // HUTTLE: sanitized

export const stripMarkdown = (text) => { // HUTTLE: sanitized
  if (!text) return ''; // HUTTLE: sanitized
  return text // HUTTLE: sanitized
    .replace(/\*\*(.*?)\*\*/g, '$1') // HUTTLE: sanitized
    .replace(/\*(.*?)\*/g, '$1') // HUTTLE: sanitized
    .replace(/__(.*?)__/g, '$1') // HUTTLE: sanitized
    .replace(/_(.*?)_/g, '$1') // HUTTLE: sanitized
    .replace(/#{1,6}\s/g, '') // HUTTLE: sanitized
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // HUTTLE: sanitized
    .trim(); // HUTTLE: sanitized
}; // HUTTLE: sanitized

export const sanitizeAIOutput = (text) => { // HUTTLE: sanitized
  if (!text) return ''; // HUTTLE: sanitized
  return stripMarkdown(stripCitations(text)) // HUTTLE: sanitized
    .replace(/\s{2,}/g, ' ') // HUTTLE: sanitized
    .replace(/\n{3,}/g, '\n\n') // HUTTLE: sanitized
    .trim(); // HUTTLE: sanitized
}; // HUTTLE: sanitized

const AI_NULL_PLACEHOLDERS = new Set([
  'null', 'nil', 'none', 'n/a', 'na', 'undefined', 'not applicable', 'no text overlay',
]);

/**
 * Prompts that tell a model a field may be null frequently come back with the
 * literal text "null" (or "none", "N/A") instead of a JSON null, which then
 * renders verbatim in the DOM. Collapses those forms — plus nullish values and
 * non-string payloads — to '' so callers can rely on a simple falsiness check.
 * @param {unknown} value
 * @returns {string}
 */
export const normalizeAiPlaceholder = (value) => {
  if (value == null) return '';
  if (Array.isArray(value)) {
    return value.map((item) => normalizeAiPlaceholder(item)).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  return AI_NULL_PLACEHOLDERS.has(trimmed.toLowerCase().replace(/[.\s]+$/, '')) ? '' : trimmed;
};
