/**
 * Post-process captions from AI Power Tools → Captions only.
 * Hashtags belong in the separate Hashtag Generator; strip #tags and stray markdown bold.
 */
export function normalizeAIPowerToolsCaptionText(text) {
  if (!text || typeof text !== 'string') return text;
  let t = text.replace(/\*\*/g, '');
  const lines = t.split('\n');
  const fixed = lines.map((line) => {
    let L = line.replace(/(^|\s)#[A-Za-z][A-Za-z0-9_]*\b/g, ' ');
    L = L.replace(/\s{2,}/g, ' ').trim();
    return L;
  });
  t = fixed.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  t = t.replace(/\s+([.!?,;:])/g, '$1');
  return t.trim();
}
