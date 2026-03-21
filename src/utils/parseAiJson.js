/**
 * Parse JSON from AI responses that may include markdown fences or prose wrappers.
 */
export function parseJsonLenient(text) {
  if (text == null) return null;
  if (typeof text === 'object') return text;
  if (typeof text !== 'string') return null;

  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    /* continue */
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      /* continue */
    }
  }

  const brace = trimmed.match(/\{[\s\S]*\}/);
  if (brace?.[0]) {
    try {
      return JSON.parse(brace[0]);
    } catch {
      /* continue */
    }
  }

  return null;
}
