/**
 * Builds a brand context block for AI prompt injection.
 * Accepts either the raw brandData from BrandContext (camelCase)
 * or a mapped brandVoice object. Safe fallback if both are null.
 */
export function buildBrandContext(brandVoice, userProfile) {
  if (!brandVoice && !userProfile) return '';

  const lines = [];

  const profileType = brandVoice?.profile_type || brandVoice?.profileType;
  const isBusiness = profileType === 'brand_business'
    || profileType === 'brand'
    || profileType === 'business';
  const name = userProfile?.first_name || userProfile?.firstName || '';
  const handle = brandVoice?.handle || brandVoice?.socialHandle
    ? ` (${brandVoice?.handle || brandVoice?.socialHandle})`
    : '';
  if (name || handle) {
    lines.push(`${isBusiness ? 'Business Owner' : 'Creator'}: ${name}${handle}`);
  }
  if (profileType) lines.push(`Profile Type: ${profileType}`);

  const niche = brandVoice?.niche;
  if (niche) lines.push(`Niche/Industry: ${Array.isArray(niche) ? niche.join(', ') : niche}`);

  const targetAudience = brandVoice?.target_audience || brandVoice?.targetAudience;
  if (targetAudience) lines.push(`Target Audience: ${Array.isArray(targetAudience) ? targetAudience.join(', ') : targetAudience}`);

  const tone = brandVoice?.tone || brandVoice?.brandVoice;
  if (tone) lines.push(`Brand Voice Tone: ${tone}`);

  const contentStyle = brandVoice?.content_style || brandVoice?.contentStyle || brandVoice?.writingStyle;
  if (contentStyle) lines.push(`Content Style: ${contentStyle}`);

  const platforms = brandVoice?.platforms;
  if (platforms?.length) lines.push(`Primary Platforms: ${platforms.join(', ')}`);

  const bio = brandVoice?.bio || brandVoice?.brandName;
  if (bio) lines.push(`About: ${bio}`);

  if (lines.length === 0) return '';

  return [
    isBusiness
      ? '=== BRAND / BUSINESS PROFILE ==='
      : '=== CREATOR BRAND PROFILE ===',
    lines.join('\n'),
    isBusiness
      ? '=== END BRAND PROFILE ==='
      : '=== END BRAND PROFILE ===',
    '',
    isBusiness
      ? 'You are generating content for this business. Every output must serve ' +
        'the business goals — not celebrate the niche personally. Write on behalf ' +
        'of the brand, not a hobbyist. Ask: would a real business owner post this ' +
        'to attract customers? If not, replace it.'
      : 'You are generating content specifically for this creator. Match their ' +
        'tone, speak directly to their target audience, and reflect their niche ' +
        'in every word. Do not produce generic content. Every output must feel ' +
        'like it was written for this specific person and their brand.',
    ''
  ].join('\n');
}
