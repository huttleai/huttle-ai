function isObjectMap(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Returns the first valid content-mix object from candidate sources.
 * Accepts object values directly, and JSON strings only when they parse to an object map.
 */
export function resolvePlanContentMix(...sources) {
  for (const source of sources) {
    if (isObjectMap(source)) return source;

    if (typeof source === 'string') {
      try {
        const parsed = JSON.parse(source);
        if (isObjectMap(parsed)) return parsed;
      } catch {
        // Ignore malformed JSON and continue to the next source.
      }
    }
  }

  return {};
}
