/**
 * Builds a rich user context string for AI prompt injection.
 *
 * Accepts either:
 *   - brandData (camelCase) from BrandContext — the common case in all AI functions
 *   - a raw user_profile DB row (snake_case) — for direct Supabase fetches
 *
 * This context block is injected near the top of every in-code AI prompt so the
 * model understands whether it is serving a business owner or a solo creator,
 * and applies the correct content strategy accordingly.
 *
 * @param {Object} profile - brandData from BrandContext or a raw user_profile row
 * @returns {string} Plain text context block ready for system prompt injection
 */
export function buildUserContext(profile) {
  if (!profile) return '';

  // Support both camelCase (brandData) and snake_case (raw DB row)
  const profileType = profile.profile_type || profile.profileType || '';
  const isBusiness =
    !profileType ||
    profileType === 'brand' ||
    profileType === 'business' ||
    profileType === 'brand_business';
  const isCreator = profileType === 'creator' || profileType === 'solo_creator';

  const niche = profile.niche || 'general business';
  const postingFreq =
    profile.posting_frequency || profile.postingFrequency || 'moderate';

  const rawPlatforms =
    profile.platforms || profile.preferred_platforms || [];
  const platformStr = Array.isArray(rawPlatforms)
    ? rawPlatforms.join(', ')
    : rawPlatforms || 'Instagram, TikTok';

  if (isBusiness) {
    // brand_name in DB maps to brandName in camelCase; the spec calls it business_name
    const businessName =
      profile.business_name ||
      profile.brand_name ||
      profile.brandName ||
      'their business';
    const primaryGoal =
      profile.business_primary_goal ||
      profile.businessPrimaryGoal ||
      'grow online presence';
    const audienceLocType =
      profile.audience_location_type || profile.audienceLocationType || '';
    const isLocal =
      profile.is_local_business ?? profile.isLocalBusiness ?? false;

    const audienceLabel =
      audienceLocType === 'mostly_local'
        ? 'Primarily local customers'
        : audienceLocType === 'split_evenly'
          ? 'Mix of local and online audience'
          : 'Online audience';

    return [
      `USER TYPE: Business owner / Brand`,
      `Business name: ${businessName}`,
      `Industry/niche: ${niche}`,
      `Primary goal: ${primaryGoal}`,
      `Audience: ${audienceLabel}`,
      `Is local business: ${isLocal ? 'Yes — location-based content is highly relevant' : 'No'}`,
      `Posting frequency: ${postingFreq}`,
      `Platforms: ${platformStr || 'Instagram, TikTok'}`,
      ``,
      `CRITICAL CONTENT RULE: This user is a BUSINESS OWNER, not a niche hobbyist.`,
      `Content must serve the BUSINESS — not just celebrate the niche topic.`,
      `A coffee shop owner does NOT post generic coffee facts. They post about their`,
      `shop's story, their staff, their regulars, behind-the-scenes, local events,`,
      `seasonal menu items, customer moments, and reasons to visit.`,
      `Always ask: "Would a real ${niche} owner actually post this`,
      `on their business account?" If not, generate something different.`,
    ].join('\n');
  }

  if (isCreator) {
    // Prefer the most human-readable name available
    const displayName =
      profile.display_name ||
      profile.full_name ||
      profile.handle ||
      profile.social_handle ||
      profile.brandName ||
      profile.brand_name ||
      profile.firstName ||
      profile.first_name ||
      'creator';
    const monetizationPath =
      profile.creator_monetization_path ||
      profile.creatorMonetizationPath ||
      'grow audience';
    // audience_stage isn't in the DB schema; growthStage is the closest equivalent
    const audienceStage =
      profile.audience_stage ||
      profile.growthStage ||
      profile.growth_stage ||
      'growing';

    return [
      `USER TYPE: Solo content creator / Personal brand`,
      `Creator name/handle: ${displayName}`,
      `Content niche: ${niche}`,
      `Monetization goal: ${monetizationPath}`,
      `Audience stage: ${audienceStage}`,
      `Posting frequency: ${postingFreq}`,
      `Platforms: ${platformStr || 'Instagram, TikTok'}`,
      ``,
      `CRITICAL CONTENT RULE: This user is a SOLO CREATOR building a personal brand.`,
      `Content must be personality-driven, niche-focused, and audience-growth oriented.`,
      `A coffee creator posts their passion, opinions, discoveries, reviews, and personal`,
      `experiences with coffee. The goal is to make the CREATOR the authority in the niche`,
      `— not to sell a product or drive foot traffic.`,
    ].join('\n');
  }

  // Fallback for profiles missing profile_type
  return [
    `User niche: ${niche}`,
    `Platforms: ${platformStr || 'Instagram, TikTok'}`,
    `Posting frequency: ${postingFreq}`,
  ].join('\n');
}

/**
 * Wraps a buildUserContext result in a clearly labelled delimiter block
 * ready to be prepended to any system prompt.
 *
 * @param {Object} profile - Same argument as buildUserContext
 * @returns {string} Delimited context block, or empty string if no context
 */
export function buildUserContextBlock(profile) {
  const ctx = buildUserContext(profile);
  if (!ctx) return '';
  return `=== USER PROFILE CONTEXT ===\n${ctx}\n=== END USER PROFILE CONTEXT ===`;
}
