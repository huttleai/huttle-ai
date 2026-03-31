import {
  getPlatformPromptRule,
  getHashtagConstraint,
  getPlatformContentRulesRecord,
  getCaptionOptimalLengthPhrase,
  getCaptionVisibleBeforeHint,
} from '../data/platformContentRules.js';

/**
 * Canonical user_type for n8n + downstream: derived only from profileType.
 * Matches BrandContext business detection: brand / business / brand_business → business; else creator.
 * @param {string|null|undefined} profileType
 * @returns {'business'|'creator'}
 */
export function deriveUserType(profileType) {
  const p = String(profileType ?? '').trim().toLowerCase();
  if (!p || p === 'brand' || p === 'business' || p === 'brand_business') return 'business';
  return 'creator';
}

function normStr(v, fallback = '') {
  if (v == null) return fallback;
  const s = String(v).trim();
  return s || fallback;
}

function normStrArray(v) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? '').trim()).filter(Boolean);
}

function normBool(v, fallback = false) {
  if (typeof v === 'boolean') return v;
  return fallback;
}

/**
 * Platform rule fields for the selected platform — always populated (no undefined).
 * @param {string|null|undefined} platformRaw e.g. "Instagram", "TikTok"
 */
export function getPlatformRulesForN8n(platformRaw) {
  const rules = getPlatformContentRulesRecord(platformRaw);
  const cap = rules.caption || {};

  const captionVisible =
    cap.visibleBeforeTruncation != null
      ? cap.visibleBeforeTruncation
      : cap.descriptionVisibleInSearch != null
        ? cap.descriptionVisibleInSearch
        : getCaptionVisibleBeforeHint(platformRaw);

  const captionOptimal =
    cap.optimalChars != null
      ? String(cap.optimalChars)
      : getCaptionOptimalLengthPhrase(platformRaw);

  return {
    platform_rules: normStr(getPlatformPromptRule(platformRaw)),
    hashtag_constraint: normStr(getHashtagConstraint(platformRaw)),
    hashtag_max: rules.hashtags?.max ?? 5,
    hashtag_optimal: normStr(rules.hashtags?.optimal),
    caption_visible_chars: captionVisible,
    caption_optimal_length: normStr(captionOptimal),
    video_hook_guidance: normStr(
      rules.video?.hook || 'Hook must land in the opening seconds; front-load value immediately.'
    ),
    platform_display_name: normStr(rules.displayName),
  };
}

function pick(input, ...keys) {
  for (const k of keys) {
    if (input[k] !== undefined && input[k] !== null) return input[k];
  }
  return undefined;
}

/**
 * Single canonical n8n webhook body: persona, platform rules, blueprint context.
 * Accepts Ignite flat shape (profileType, brandName, …) and/or nested brandProfile.
 *
 * @param {object} input
 * @returns {Record<string, unknown>}
 */
export function buildIgniteN8nPayload(input) {
  const bp = input.brandProfile && typeof input.brandProfile === 'object' ? input.brandProfile : {};
  const profile = { ...bp, ...input };

  const {
    topic,
    platform,
    content_type,
    goal,
    niche,
    target_audience,
    brand_voice_tone,
    required_sections = [],
    optional_sections = [],
    excluded_sections = [],
    viral_score_weights = {},
    blueprint_label,
    brand_context,
    trending_format_type,
    trending_niche_angle,
    hashtag_isolation_rule,
  } = input;

  const profileType = normStr(
    pick(input, 'profileType', 'profile_type') ?? bp.profileType ?? bp.profile_type,
    'brand_business'
  );
  const userType = deriveUserType(profileType);

  const pr = getPlatformRulesForN8n(platform);

  const businessPrimaryGoal = normStr(
    pick(input, 'businessPrimaryGoal', 'business_primary_goal') ?? bp.businessPrimaryGoal
  );
  const creatorMonetizationPath = normStr(
    pick(input, 'creatorMonetizationPath', 'creator_monetization_path') ?? bp.creatorMonetizationPath
  );
  const audienceLocationType = normStr(
    pick(input, 'audienceLocationType', 'audience_location_type') ?? bp.audienceLocationType
  );

  const brandName = normStr(pick(input, 'brandName', 'brand_name') ?? bp.brandName);
  const handle = normStr(pick(input, 'handle', 'socialHandle') ?? bp.socialHandle ?? bp.handle);
  const city = normStr(pick(input, 'city') ?? bp.city);
  const subNiche = normStr(pick(input, 'subNiche', 'sub_niche') ?? bp.subNiche);
  const audiencePainPoint = normStr(
    pick(input, 'audiencePainPoint', 'audience_pain_point') ?? bp.audiencePainPoint
  );
  const audienceActionTrigger = normStr(
    pick(input, 'audienceActionTrigger', 'audience_action_trigger') ?? bp.audienceActionTrigger
  );
  const writingStyle = normStr(pick(input, 'writingStyle', 'writing_style') ?? bp.writingStyle);
  const toneChips = normStrArray(pick(input, 'toneChips', 'tone_chips') ?? bp.toneChips);
  const examplePost = normStr(pick(input, 'examplePost', 'example_post') ?? bp.examplePost);
  const rawContentToPost = pick(input, 'contentToPost', 'content_to_post') ?? bp.contentToPost;
  const contentToPost = Array.isArray(rawContentToPost)
    ? rawContentToPost.map((x) => String(x ?? ''))
    : [];
  const contentToAvoid = normStr(pick(input, 'contentToAvoid', 'content_to_avoid') ?? bp.contentToAvoid);
  const primaryOffer = normStr(pick(input, 'primaryOffer', 'primary_offer') ?? bp.primaryOffer);
  const conversionGoal = normStr(pick(input, 'conversionGoal', 'conversion_goal') ?? bp.conversionGoal);
  const contentPersona = normStr(pick(input, 'contentPersona', 'content_persona') ?? bp.contentPersona);
  const monetizationGoal = normStr(
    pick(input, 'monetizationGoal', 'monetization_goal') ?? bp.monetizationGoal
  );
  const followerCount = normStr(pick(input, 'followerCount', 'follower_count') ?? bp.followerCount);
  const firstName = normStr(pick(input, 'firstName', 'first_name') ?? bp.firstName);

  const isLocal = normBool(
    pick(input, 'isLocalBusiness', 'is_local_business') ?? bp.isLocalBusiness,
    false
  );

  const payload = {
    topic: normStr(topic).slice(0, 500),
    platform: normStr(platform),
    content_type: normStr(content_type, 'Post'),
    goal: normStr(goal, 'Grow Followers'),
    niche: normStr(niche).slice(0, 200),
    target_audience: normStr(target_audience).slice(0, 200),
    brand_voice_tone: normStr(brand_voice_tone, 'Authentic').slice(0, 100),
    required_sections: Array.isArray(required_sections) ? required_sections : [],
    optional_sections: Array.isArray(optional_sections) ? optional_sections : [],
    excluded_sections: Array.isArray(excluded_sections) ? excluded_sections : [],
    viral_score_weights:
      viral_score_weights && typeof viral_score_weights === 'object' ? viral_score_weights : {},
    blueprint_label: normStr(blueprint_label),

    hashtag_instruction: pr.hashtag_constraint,
    platform_content_rules: pr.platform_rules,
    platform_rules: pr.platform_rules,
    hashtag_constraint: pr.hashtag_constraint,
    hashtag_max: pr.hashtag_max,
    hashtag_optimal: pr.hashtag_optimal,
    caption_visible_chars: pr.caption_visible_chars,
    caption_optimal_length: pr.caption_optimal_length,
    video_hook_guidance: pr.video_hook_guidance,
    platform_display_name: pr.platform_display_name,

    profile_type: profileType,
    profileType,
    user_type: userType,
    userType,

    business_primary_goal: businessPrimaryGoal,
    businessPrimaryGoal,
    creator_monetization_path: creatorMonetizationPath,
    creatorMonetizationPath,
    is_local_business: isLocal,
    isLocalBusiness: isLocal,
    audience_location_type: audienceLocationType,
    audienceLocationType,

    brand_name: brandName,
    brandName,
    handle,
    city,
    location_state: profile.locationState || profile.location_state || null,
    locationState: profile.locationState || profile.location_state || null,
    country: profile.country || 'US',
    locationFull: (() => {
      const parts = [
        profile.city || profile.brandCity || null,
        profile.locationState || profile.location_state || null,
        profile.country !== 'US' ? (profile.country || null) : null,
      ].filter(Boolean);
      return parts.length ? parts.join(', ') : null;
    })(),
    sub_niche: subNiche,
    subNiche,
    audience_pain_point: audiencePainPoint,
    audiencePainPoint,
    audience_action_trigger: audienceActionTrigger,
    audienceActionTrigger,
    writing_style: writingStyle,
    writingStyle,
    tone_chips: toneChips,
    toneChips,
    example_post: examplePost,
    examplePost,
    content_to_post: contentToPost,
    contentToPost,
    content_to_avoid: contentToAvoid,
    contentToAvoid,
    primary_offer: primaryOffer,
    primaryOffer,
    conversion_goal: conversionGoal,
    conversionGoal,
    content_persona: contentPersona,
    contentPersona,
    monetization_goal: monetizationGoal,
    monetizationGoal,
    follower_count: followerCount,
    followerCount,

    creator_name: normStr(brandName || firstName),
    brand_context: normStr(brand_context).slice(0, 2000),
    trending_format_type: normStr(trending_format_type),
    trending_niche_angle: normStr(trending_niche_angle),
    firstName: normStr(firstName),
    first_name: normStr(firstName),

    hashtag_isolation_rule: normStr(
      hashtag_isolation_rule ||
        'Return hashtags ONLY in the `hashtags` field. Do NOT include any hashtags (words beginning with #) anywhere in the caption, body, script, hook, or any other text field. All hashtags must be separated into the dedicated hashtags array/field exclusively.'
    ),

    format: normStr(content_type, 'Post'),
    postType: normStr(content_type, 'Post'),
    requestedPostType: normStr(content_type, 'Post'),
    objective: normStr(goal, 'viral'),
    targetAudience: normStr(target_audience),
  };

  return payload;
}
