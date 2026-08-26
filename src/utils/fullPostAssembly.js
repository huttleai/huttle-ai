/**
 * Full Post Builder output assembly.
 *
 * The caption step is prompted to "Use this exact opening line" (the selected
 * hook) and to "End with one clear CTA", so a generated caption normally already
 * contains both. Naively concatenating [hook, caption, hashtags, cta] therefore
 * emits the hook twice as separate paragraphs and repeats the CTA — which is what
 * lands in the saved vault artifact. Assembly skips any part the caption already
 * carries instead of rewriting the model's copy.
 */

/**
 * Comparison-only form: case, punctuation, emoji, and spacing differences are
 * ignored so a hook echoed with drifted styling still counts as a duplicate.
 * @param {unknown} text
 * @returns {string}
 */
function normalizeForCompare(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {Array<{ tag?: string } | string> | string | null | undefined} hashtags
 * @returns {string}
 */
function joinHashtags(hashtags) {
  if (Array.isArray(hashtags)) {
    return hashtags
      .map((entry) => (typeof entry === 'string' ? entry : entry?.tag))
      .map((tag) => String(tag ?? '').trim())
      .filter(Boolean)
      .join(' ');
  }
  return String(hashtags ?? '').trim();
}

/**
 * Build the paste-ready post that is copied to the clipboard and saved to the vault.
 *
 * @param {object} parts
 * @param {string} [parts.hook] Selected hook.
 * @param {string} [parts.caption] Generated or user-edited caption body.
 * @param {Array<{ tag?: string } | string> | string} [parts.hashtags] Hashtag list or prejoined string.
 * @param {string} [parts.cta] Selected call to action.
 * @returns {string}
 */
export function assembleFullPost({ hook, caption, hashtags, cta } = {}) {
  const hookText = String(hook ?? '').trim();
  const captionText = String(caption ?? '').trim();
  const ctaText = String(cta ?? '').trim();
  const hashtagText = joinHashtags(hashtags);

  const captionCmp = normalizeForCompare(captionText);
  const hookCmp = normalizeForCompare(hookText);
  const ctaCmp = normalizeForCompare(ctaText);

  const captionOpensWithHook = Boolean(hookCmp) && Boolean(captionCmp) && captionCmp.startsWith(hookCmp);
  const captionEndsWithCta = Boolean(ctaCmp) && Boolean(captionCmp) && captionCmp.endsWith(ctaCmp);

  return [
    captionOpensWithHook ? '' : hookText,
    captionText,
    hashtagText,
    captionEndsWithCta ? '' : ctaText,
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Whether the caption already opens with the selected hook. Lets the UI avoid
 * showing the same line in both the Hook card and the Caption card.
 * @param {string} caption
 * @param {string} hook
 * @returns {boolean}
 */
export function captionAlreadyOpensWithHook(caption, hook) {
  const captionCmp = normalizeForCompare(caption);
  const hookCmp = normalizeForCompare(hook);
  return Boolean(hookCmp) && Boolean(captionCmp) && captionCmp.startsWith(hookCmp);
}

/**
 * Whether the caption already closes with the selected CTA.
 * @param {string} caption
 * @param {string} cta
 * @returns {boolean}
 */
export function captionAlreadyEndsWithCta(caption, cta) {
  const captionCmp = normalizeForCompare(caption);
  const ctaCmp = normalizeForCompare(cta);
  return Boolean(ctaCmp) && Boolean(captionCmp) && captionCmp.endsWith(ctaCmp);
}
