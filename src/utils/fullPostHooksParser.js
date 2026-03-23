/**
 * Parse Grok / Full Post Builder hook responses into plain hook strings.
 * Prefers structured JSON, then markdown fences, then numbered or bullet lines,
 * then a conservative prose fallback (multi-line / sentence / quoted segments).
 */

function cleanHookText(s) {
  return String(s || '')
    .replace(/^\*\*|\*\*$/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .trim();
}

function normalizeHookItem(entry) {
  if (entry == null) return '';
  if (typeof entry === 'string') return cleanHookText(entry);
  if (typeof entry === 'object') {
    const h = entry.hook ?? entry.text ?? entry.line ?? '';
    return cleanHookText(h);
  }
  return '';
}

function tryParseJsonHooks(raw) {
  try {
    const direct = JSON.parse(raw);
    if (Array.isArray(direct)) {
      return direct.map(normalizeHookItem).filter((h) => h.length > 2);
    }
    if (direct && typeof direct === 'object' && Array.isArray(direct.hooks)) {
      return direct.hooks.map(normalizeHookItem).filter((h) => h.length > 2);
    }
  } catch {
    /* fall through */
  }
  return [];
}

function dedupeTrim(hooks) {
  const seen = new Set();
  const out = [];
  for (const h of hooks) {
    const key = h.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out;
}

const JUNK_LINE = /^(here are|sure[!,.]?|ok[,!.]?|yes[,!.]?|thanks|below|following|hook\s*\d+|option\s*\d+)/i;
const URL_LIKE = /https?:\/\/\S+/i;

function wordCount(s) {
  return String(s || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function letterRatio(s) {
  const t = String(s || '');
  if (!t.length) return 0;
  const letters = (t.match(/[a-zA-Z]/g) || []).length;
  return letters / t.length;
}

/**
 * Conservative filter: long enough to be a hook, not obvious junk or URLs.
 */
export function isPlausibleHookLine(s) {
  const t = cleanHookText(s);
  if (t.length < 18 || t.length > 240) return false;
  if (URL_LIKE.test(t)) return false;
  if (JUNK_LINE.test(t)) return false;
  if (wordCount(t) < 4) return false;
  if (letterRatio(t) < 0.45) return false;
  if (/^[\d\s.,\-–—]+$/u.test(t)) return false;
  return true;
}

function stripLeadingNoiseParagraphs(text) {
  let t = String(text || '').trim();
  t = t.replace(/^```(?:json)?\s*[\s\S]*?```/gim, '').trim();
  const lines = t.split('\n').map((l) => l.trim()).filter(Boolean);
  while (lines.length && JUNK_LINE.test(lines[0]) && lines[0].length < 80) {
    lines.shift();
  }
  return lines.join('\n').trim() || t;
}

function splitSentences(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  const parts = t.split(/(?<=[.!?])\s+(?=[\w"'“‘(])/u);
  return parts.map((s) => s.trim()).filter(Boolean);
}

function extractQuotedSegments(text) {
  const out = [];
  const re = /"([^"]{12,220})"|'([^']{12,220})'/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const chunk = m[1] || m[2];
    if (chunk) out.push(chunk.trim());
  }
  return out;
}

/**
 * Last-resort extraction when the model returns plain prose.
 * @param {string} raw
 * @returns {string[]}
 */
export function extractHooksFromLooseProse(raw) {
  const cleaned = stripLeadingNoiseParagraphs(raw);
  if (!cleaned) return [];

  const candidates = [];

  for (const line of cleaned.split(/\n+/)) {
    const t = cleanHookText(line.replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, ''));
    if (isPlausibleHookLine(t)) candidates.push(t);
  }

  if (candidates.length < 3) {
    for (const q of extractQuotedSegments(cleaned)) {
      if (isPlausibleHookLine(q)) candidates.push(q);
    }
  }

  if (candidates.length < 3) {
    for (const s of splitSentences(cleaned)) {
      if (isPlausibleHookLine(s)) candidates.push(s);
    }
  }

  return dedupeTrim(candidates);
}

const MAX_HOOKS = 8;

/**
 * @param {string} text
 * @returns {string[]}
 */
export function parseFullPostHookList(text) {
  if (text == null || text === '') return [];
  const raw = String(text).trim();
  if (!raw) return [];

  const jsonFirst = tryParseJsonHooks(raw);
  if (jsonFirst.length) return dedupeTrim(jsonFirst).slice(0, MAX_HOOKS);

  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) {
    const inner = tryParseJsonHooks(fence[1].trim());
    if (inner.length) return dedupeTrim(inner).slice(0, MAX_HOOKS);
  }

  const numbered = [];
  for (const line of raw.split('\n')) {
    const m = line.trim().match(/^\d+[.)]\s*(.+)$/);
    if (m) {
      const h = cleanHookText(m[1]);
      if (h.length > 2) numbered.push(h);
    }
  }
  if (numbered.length) return dedupeTrim(numbered).slice(0, MAX_HOOKS);

  const bullets = [];
  for (const line of raw.split('\n')) {
    const m = line.trim().match(/^[-*]\s+(.+)$/);
    if (m) {
      const h = cleanHookText(m[1]);
      if (h.length > 2) bullets.push(h);
    }
  }
  if (bullets.length) return dedupeTrim(bullets).slice(0, MAX_HOOKS);

  let loose = extractHooksFromLooseProse(raw);
  if (loose.length > 0 && loose.length < 2) {
    const onlyLine = raw.replace(/\s+/g, ' ').trim();
    if (onlyLine.length > 40 && wordCount(onlyLine) >= 8) {
      const sentences = splitSentences(onlyLine).filter(isPlausibleHookLine);
      loose = dedupeTrim([...loose, ...sentences]);
    }
  }
  if (loose.length >= 2) return loose.slice(0, MAX_HOOKS);

  return [];
}

/**
 * Normalize Hook Builder (`generateHooks`) output into plain hook strings for Full Post cards.
 * @param {{ success?: boolean, hooks?: string, hookIdeas?: object[] }} result
 * @returns {string[]}
 */
export function extractHooksFromHookBuilderResult(result) {
  if (!result || result.success === false) return [];
  if (Array.isArray(result.hookIdeas) && result.hookIdeas.length > 0) {
    const fromIdeas = result.hookIdeas
      .map((h) => normalizeHookItem(h))
      .filter((h) => h.length > 12);
    if (fromIdeas.length) return dedupeTrim(fromIdeas).slice(0, MAX_HOOKS);
  }
  const fromText = parseFullPostHookList(result.hooks || '');
  if (fromText.length) return fromText;
  return extractHooksFromLooseProse(result.hooks || '').slice(0, MAX_HOOKS);
}
