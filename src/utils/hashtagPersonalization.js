/**
 * Resolves niche/industry and optional audience/platform/tone for "For you" dashboard hashtags.
 * Data maps from BrandContext (user_profile + preferences); onboarding answers live in the same row.
 */

function getPrimaryBrandText(value) {
  if (Array.isArray(value)) return value.find(Boolean)?.toString().trim() || '';
  if (typeof value !== 'string') return '';
  return value.split(',').map((part) => part.trim()).find(Boolean) || '';
}

/**
 * @param {object|null|undefined} brandProfile
 * @returns {{ source: 'brand_voice' | 'onboarding', niche: string, audience: string|null, platforms: string[]|null, tone: string|null } | null}
 */
export function getHashtagPersonalizationContext(brandProfile) {
  if (!brandProfile) return null;

  const nicheFromVoice =
    getPrimaryBrandText(brandProfile.niche) || getPrimaryBrandText(brandProfile.contentFocus);
  const nicheFromIndustry =
    getPrimaryBrandText(brandProfile.industry) || getPrimaryBrandText(brandProfile.subNiche);

  const niche = nicheFromVoice || nicheFromIndustry;
  if (!niche) return null;

  const source = nicheFromVoice ? 'brand_voice' : 'onboarding';

  const audienceRaw = getPrimaryBrandText(brandProfile.targetAudience);
  const platforms = Array.isArray(brandProfile.platforms) && brandProfile.platforms.length > 0
    ? brandProfile.platforms
    : null;
  const tone = Array.isArray(brandProfile.toneChips) && brandProfile.toneChips.length > 0
    ? brandProfile.toneChips.join(', ')
    : (getPrimaryBrandText(brandProfile.brandVoice) || null);

  return {
    source,
    niche,
    audience: audienceRaw || null,
    platforms,
    tone,
  };
}
