/**
 * Pure validators for AI Power Tools output contracts (UI + service shapes).
 * Safe to import from Node (no import.meta.env). Used by scripts/ai-tools-qa.mjs.
 */

const HASHTAG_TIERS = new Set(['Popular', 'Medium', 'Niche']);
const CTA_GOALS = new Set(['engagement', 'sales', 'dms_leads']);
const CTA_FRICTION = new Set(['low', 'medium', 'high']);
const CTA_PLACEMENT = new Set(['caption_end', 'on_screen_text', 'voiceover', 'first_comment']);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** Normalized caption variant (post-parse / UI-ready). */
export function validateCaptionVariants(arr, { label = 'captions', min = 1, max = 6 } = {}) {
  assert(Array.isArray(arr), `${label}: must be array`);
  assert(arr.length >= min && arr.length <= max, `${label}: length ${arr.length} not in [${min},${max}]`);
  arr.forEach((v, i) => {
    assert(v && typeof v === 'object', `${label}[${i}]: object`);
    assert(typeof v.caption === 'string' && v.caption.trim().length > 5, `${label}[${i}]: caption`);
    assert(['short', 'medium', 'long'].includes(v.length), `${label}[${i}]: length enum`);
    assert(typeof v.variantId === 'number' || typeof v.variantId === 'string', `${label}[${i}]: variantId`);
  });
  return true;
}

export function validateHashtagRows(arr, { label = 'hashtags', min = 5, max = 12 } = {}) {
  assert(Array.isArray(arr), `${label}: must be array`);
  assert(arr.length >= min && arr.length <= max, `${label}: length ${arr.length} not in [${min},${max}]`);
  arr.forEach((h, i) => {
    assert(typeof h.tag === 'string' && h.tag.startsWith('#'), `${label}[${i}]: tag`);
    const score = Number(h.score);
    assert(Number.isFinite(score) && score >= 0 && score <= 100, `${label}[${i}]: score 0-100`);
    if (h.tier != null && h.tier !== '') {
      assert(HASHTAG_TIERS.has(h.tier), `${label}[${i}]: tier ${h.tier}`);
    }
  });
  return true;
}

export function validateHookLines(text, { label = 'hooks', minLines = 4, maxLines = 12 } = {}) {
  assert(typeof text === 'string' && text.trim(), `${label}: non-empty string`);
  const lines = text
    .split('\n')
    .map((l) => l.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
  assert(lines.length >= minLines && lines.length <= maxLines, `${label}: ${lines.length} lines not in [${minLines},${maxLines}]`);
  lines.forEach((line, i) => {
    const wc = line.split(/\s+/).length;
    assert(wc <= 22, `${label}[${i}]: hook too long (${wc} words)`);
  });
  return true;
}

export function validateStyledCtas(obj, { label = 'styledCTAs', min = 5, max = 8 } = {}) {
  assert(obj && typeof obj === 'object', `${label}: object`);
  assert(Array.isArray(obj.ctas), `${label}: ctas array`);
  assert(obj.ctas.length >= min && obj.ctas.length <= max, `${label}: ${obj.ctas.length} ctas`);
  obj.ctas.forEach((row, i) => {
    assert(typeof row.cta === 'string' && row.cta.trim(), `${label}.ctas[${i}].cta`);
    assert(typeof row.style === 'string', `${label}.ctas[${i}].style`);
  });
  return true;
}

export function validateCtaIdeas(arr, { label = 'ctaIdeas', min = 5, max = 8 } = {}) {
  assert(Array.isArray(arr), `${label}: array`);
  assert(arr.length >= min && arr.length <= max, `${label}: length`);
  arr.forEach((c, i) => {
    assert(typeof c.cta === 'string' && c.cta.trim(), `${label}[${i}].cta`);
    assert(CTA_GOALS.has(c.goal), `${label}[${i}].goal`);
    assert(CTA_FRICTION.has(c.friction), `${label}[${i}].friction`);
    assert(CTA_PLACEMENT.has(c.placement), `${label}[${i}].placement`);
  });
  return true;
}

/** Grok ContentScore object (pre-UI mapping). */
export function validateContentScoreRaw(obj, { label = 'contentScore' } = {}) {
  assert(obj && typeof obj === 'object', `${label}: object`);
  const nums = [
    'overallScore',
    'hookScore',
    'clarityScore',
    'valueScore',
    'algorithmAlignmentScore',
    'humanizerScore',
  ];
  nums.forEach((k) => {
    const n = Number(obj[k]);
    assert(Number.isFinite(n) && n >= 0 && n <= 100, `${label}.${k} 0-100`);
  });
  assert(Array.isArray(obj.strengths), `${label}.strengths`);
  assert(Array.isArray(obj.risks), `${label}.risks`);
  assert(Array.isArray(obj.fixes), `${label}.fixes`);
  assert(obj.strengths.length >= 1, `${label}: strengths`);
  obj.fixes.slice(0, 5).forEach((f, i) => {
    assert(f && typeof f === 'object', `${label}.fixes[${i}]`);
    assert(typeof f.issue === 'string', `${label}.fixes[${i}].issue`);
    assert(typeof f.suggestedRewrite === 'string', `${label}.fixes[${i}].suggestedRewrite`);
  });
  return true;
}

export function validateVisualConcepts(arr, { label = 'visualConcepts', min = 3, max = 6 } = {}) {
  assert(Array.isArray(arr), `${label}: array`);
  assert(arr.length >= min && arr.length <= max, `${label}: length`);
  const formats = new Set(['image', 'carousel', 'video', 'story', 'reel']);
  const outTypes = new Set(['ai_image_prompt', 'manual_shoot_guide', 'shot_list']);
  arr.forEach((c, i) => {
    assert(typeof c.conceptTitle === 'string', `${label}[${i}].conceptTitle`);
    assert(formats.has(c.format), `${label}[${i}].format`);
    assert(outTypes.has(c.outputType), `${label}[${i}].outputType`);
    assert(typeof c.promptOrGuide === 'string' && c.promptOrGuide.length > 10, `${label}[${i}].promptOrGuide`);
    assert(Array.isArray(c.sceneBeats), `${label}[${i}].sceneBeats`);
    assert(Array.isArray(c.visualMotifs), `${label}[${i}].visualMotifs`);
    if (c.trendSignal != null) {
      assert(typeof c.trendSignal === 'string', `${label}[${i}].trendSignal`);
    }
  });
  return true;
}
