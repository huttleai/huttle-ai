/**
 * Brand Context Builder Utility
 * Centralizes brand voice/profile data for AI prompts
 * Ensures consistent brand alignment across all AI generations
 * 
 * Supports both Brand/Business and Solo Creator profile types
 */

/**
 * Creator archetype traits for enhanced AI prompts
 */
const ARCHETYPE_TRAITS = {
  educator: {
    style: 'clear, instructional, and value-packed',
    approach: 'break down complex topics into digestible insights',
    tone: 'knowledgeable yet approachable',
    contentFocus: 'teaching, explaining, and sharing expertise'
  },
  entertainer: {
    style: 'witty, playful, and shareable',
    approach: 'use humor, relatable moments, and engaging hooks',
    tone: 'fun, lighthearted, and energetic',
    contentFocus: 'making people laugh, smile, and feel good'
  },
  storyteller: {
    style: 'narrative-driven and emotionally engaging',
    approach: 'share personal experiences and weave compelling stories',
    tone: 'authentic, vulnerable, and captivating',
    contentFocus: 'sharing journeys, lessons learned, and meaningful moments'
  },
  inspirer: {
    style: 'motivational, uplifting, and empowering',
    approach: 'encourage action and positive transformation',
    tone: 'passionate, encouraging, and aspirational',
    contentFocus: 'motivation, personal growth, and inspiring change'
  },
  curator: {
    style: 'discovery-focused and recommendation-driven',
    approach: 'curate and share the best finds and hidden gems',
    tone: 'trustworthy, insightful, and discerning',
    contentFocus: 'discovering, reviewing, and recommending'
  }
};

/**
 * Hook style descriptions for AI prompts
 */
const HOOK_STYLE_DESCRIPTIONS = {
  question: 'Open with thought-provoking questions that create curiosity',
  bold_statement: 'Lead with bold, attention-grabbing statements or claims',
  story: 'Start with a personal story or narrative hook',
  statistic: 'Open with surprising statistics or data points',
  controversy: 'Use controversial or unpopular opinions to spark interest',
  curiosity_gap: 'Create intrigue by hinting at secrets or insider knowledge'
};

/**
 * Emotional trigger descriptions for AI prompts
 */
const EMOTIONAL_TRIGGER_DESCRIPTIONS = {
  inspired: 'Content that motivates action and sparks ambition',
  entertained: 'Content that brings joy, laughter, and engagement',
  educated: 'Content that teaches and provides valuable insights',
  connected: 'Content that builds community and belonging',
  motivated: 'Content that drives goal achievement and progress',
  understood: 'Content that validates feelings and experiences'
};

/**
 * Content strength descriptions for AI prompts
 */
const STRENGTH_DESCRIPTIONS = {
  storytelling: 'Weave compelling narratives and personal experiences',
  education: 'Break down complex topics into digestible insights',
  entertainment: 'Create engaging, fun, and shareable content',
  visuals: 'Leverage strong visual elements and aesthetics',
  trends: 'Capitalize on trending topics and formats',
  authenticity: 'Emphasize genuine, relatable, and honest content'
};

/**
 * Checks if the profile is a solo creator type
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {boolean} True if creator profile
 */
export function isCreatorProfile(brandData) {
  return brandData?.profileType === 'creator';
}

/**
 * Formats a display name to ensure a capitalized leading character
 * @param {string} name - Raw name string
 * @returns {string} Formatted name
 */
export function formatDisplayName(name = '') {
  if (typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  return trimmed
    .split(/\s+/)
    .map((word) => word.replace(/^[^a-zA-Z]*[a-z]/, (match) => match.toUpperCase()))
    .join(' ');
}

/**
 * Gets archetype traits for a creator
 * @param {string} archetype - Creator archetype value
 * @returns {Object|null} Archetype traits object or null
 */
export function getArchetypeTraits(archetype) {
  return ARCHETYPE_TRAITS[archetype] || null;
}

/**
 * Builds a comprehensive brand/creator context string for AI prompts
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {string} Formatted context string
 */
export function buildBrandContext(brandData) {
  if (!brandData || Object.keys(brandData).length === 0) {
    return 'No profile available. Use a professional, engaging tone.';
  }

  const isCreator = isCreatorProfile(brandData);
  const parts = [];
  
  // Profile type header
  if (isCreator) {
    parts.push('PROFILE TYPE: Solo Creator / Personal Brand');
    if (brandData.brandName) {
      parts.push(`Creator Name: ${brandData.brandName}`);
    }
  } else {
    parts.push('PROFILE TYPE: Brand / Business');
  if (brandData.brandName) {
    parts.push(`Brand Name: ${brandData.brandName}`);
  }
  }
  
  // Creator archetype (for creators only)
  if (isCreator && brandData.creatorArchetype) {
    const traits = getArchetypeTraits(brandData.creatorArchetype);
    if (traits) {
      parts.push(`Creator Archetype: ${brandData.creatorArchetype.charAt(0).toUpperCase() + brandData.creatorArchetype.slice(1)}`);
      parts.push(`Content Style: ${traits.style}`);
      parts.push(`Approach: ${traits.approach}`);
    }
  }
  
  // Niche / Content Focus
  if (brandData.niche) {
    parts.push(isCreator ? `Content Focus: ${brandData.niche}` : `Niche: ${brandData.niche}`);
  }
  
  // Industry / Category
  if (brandData.industry) {
    parts.push(isCreator ? `Category: ${brandData.industry}` : `Industry: ${brandData.industry}`);
  }
  
  // Target Audience / Community
  if (brandData.targetAudience) {
    parts.push(isCreator ? `Community: ${brandData.targetAudience}` : `Target Audience: ${brandData.targetAudience}`);
  }
  
  // Voice / Vibe
  if (brandData.brandVoice) {
    parts.push(isCreator ? `Vibe & Style: ${brandData.brandVoice}` : `Brand Voice/Tone: ${brandData.brandVoice}`);
  }
  
  // Platforms
  if (brandData.platforms && brandData.platforms.length > 0) {
    parts.push(`Preferred Platforms: ${brandData.platforms.join(', ')}`);
  }
  
  // Goals
  if (brandData.goals && brandData.goals.length > 0) {
    parts.push(`Content Goals: ${brandData.goals.join(', ')}`);
  }
  
  // Viral Content Strategy Fields
  parts.push(''); // Empty line for separation
  parts.push('VIRAL CONTENT STRATEGY:');
  
  // Content Strengths
  if (brandData.contentStrengths && brandData.contentStrengths.length > 0) {
    const strengthDescriptions = brandData.contentStrengths
      .map(s => STRENGTH_DESCRIPTIONS[s] || s)
      .join('; ');
    parts.push(`Content Strengths: ${brandData.contentStrengths.join(', ')}`);
    parts.push(`Leverage these strengths: ${strengthDescriptions}`);
  }
  
  // Biggest Challenge (helps AI provide targeted advice)
  if (brandData.biggestChallenge) {
    parts.push(`Main Challenge: ${brandData.biggestChallenge.replace(/_/g, ' ')}`);
  }
  
  // Hook Style Preference
  if (brandData.hookStylePreference) {
    const hookDescription = HOOK_STYLE_DESCRIPTIONS[brandData.hookStylePreference] || brandData.hookStylePreference;
    parts.push(`Preferred Hook Style: ${brandData.hookStylePreference.replace(/_/g, ' ')}`);
    parts.push(`Hook Approach: ${hookDescription}`);
  }
  
  // Emotional Triggers
  if (brandData.emotionalTriggers && brandData.emotionalTriggers.length > 0) {
    const emotionDescriptions = brandData.emotionalTriggers
      .map(e => EMOTIONAL_TRIGGER_DESCRIPTIONS[e] || e)
      .join('; ');
    parts.push(`Emotional Triggers: ${brandData.emotionalTriggers.join(', ')}`);
    parts.push(`Content should make audience feel: ${emotionDescriptions}`);
  }

  return parts.length > 0 
    ? parts.join('\n')
    : 'No profile available. Use a professional, engaging tone.';
}

/**
 * Builds profile-type specific instructions for AI
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {string} Instructions string
 */
function buildProfileInstructions(brandData) {
  const isCreator = isCreatorProfile(brandData);
  
  let instructions = '';
  
  if (isCreator) {
    const archetype = brandData?.creatorArchetype;
    const traits = getArchetypeTraits(archetype);
    
    instructions = `
CREATOR CONTENT GUIDELINES:
- Write in FIRST PERSON (I, me, my) - this is personal content from the creator
- Be authentic, relatable, and genuine - avoid corporate-speak
- Connect emotionally with the audience/community
- Use conversational language that feels natural
- Include personal touches and authentic personality`;
    
    if (traits) {
      instructions += `
- Content approach: ${traits.approach}
- Maintain a ${traits.tone} tone throughout
- Focus on ${traits.contentFocus}`;
    }
  } else {
    instructions = `
BRAND CONTENT GUIDELINES:
- Maintain consistent brand voice and professional standards
- Write on behalf of the brand (we, our, us) unless specifically personal
- Focus on value proposition and brand messaging
- Ensure content aligns with brand identity and business goals
- Keep messaging professional yet engaging`;
  }
  
  // Add viral content optimization instructions
  instructions += `

VIRAL CONTENT OPTIMIZATION:`;
  
  // Hook style instructions
  if (brandData?.hookStylePreference) {
    const hookDesc = HOOK_STYLE_DESCRIPTIONS[brandData.hookStylePreference];
    if (hookDesc) {
      instructions += `
- HOOK STYLE: ${hookDesc}`;
    }
  }
  
  // Content strengths instructions
  if (brandData?.contentStrengths && brandData.contentStrengths.length > 0) {
    const strengths = brandData.contentStrengths
      .map(s => STRENGTH_DESCRIPTIONS[s] || s)
      .slice(0, 3) // Top 3 strengths
      .join('; ');
    instructions += `
- LEVERAGE STRENGTHS: ${strengths}`;
  }
  
  // Emotional triggers instructions
  if (brandData?.emotionalTriggers && brandData.emotionalTriggers.length > 0) {
    const emotions = brandData.emotionalTriggers
      .map(e => e.replace(/_/g, ' '))
      .join(', ');
    instructions += `
- EVOKE EMOTIONS: Make content that leaves the audience feeling ${emotions}`;
  }
  
  // Challenge-aware suggestions
  if (brandData?.biggestChallenge) {
    const challengeAdvice = {
      consistency: 'Create content that can be easily batched and scheduled',
      ideas: 'Suggest creative angles and unique perspectives',
      engagement: 'Include strong CTAs and conversation starters',
      growth: 'Optimize for shareability and discoverability',
      time: 'Focus on efficient, high-impact content formats',
      quality: 'Prioritize polish and professional presentation'
    };
    const advice = challengeAdvice[brandData.biggestChallenge];
    if (advice) {
      instructions += `
- OPTIMIZATION TIP: ${advice}`;
    }
  }
  
  return instructions;
}

/**
 * Builds a system prompt that includes brand/creator context
 * @param {string} basePrompt - Base system prompt describing the AI's role
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {string} Enhanced system prompt with context
 */
export function buildSystemPrompt(basePrompt, brandData) {
  const brandContext = buildBrandContext(brandData);
  const instructions = buildProfileInstructions(brandData);
  const isCreator = isCreatorProfile(brandData);
  
  const headerLabel = isCreator ? 'CREATOR PROFILE' : 'BRAND PROFILE';
  
  return `${basePrompt}

${headerLabel}:
${brandContext}
${instructions}

IMPORTANT: All content must align with the ${isCreator ? 'creator\'s personal voice and style' : 'brand voice and identity'} above. Adapt your output to match ${isCreator ? 'their authentic personality' : 'the brand\'s guidelines'}.`;
}

/**
 * Gets the brand voice or a default value
 * @param {Object} brandData - Brand data from BrandContext
 * @param {string} defaultVoice - Default voice if none specified
 * @returns {string} Brand voice string
 */
export function getBrandVoice(brandData, defaultVoice = 'professional and engaging') {
  return brandData?.brandVoice || defaultVoice;
}

/**
 * Gets the niche/content focus or a default value
 * @param {Object} brandData - Brand data from BrandContext
 * @param {string} defaultNiche - Default niche if none specified
 * @returns {string} Niche string
 */
export function getNiche(brandData, defaultNiche = 'general') {
  return brandData?.niche || defaultNiche;
}

/**
 * Gets the target audience/community or a default value
 * @param {Object} brandData - Brand data from BrandContext
 * @param {string} defaultAudience - Default audience if none specified
 * @returns {string} Target audience string
 */
export function getTargetAudience(brandData, defaultAudience = 'general audience') {
  return brandData?.targetAudience || defaultAudience;
}

/**
 * Gets the profile type
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {string} 'creator' or 'brand'
 */
export function getProfileType(brandData) {
  return brandData?.profileType === 'creator' ? 'creator' : 'brand';
}

/**
 * Gets the creator's name or brand name
 * @param {Object} brandData - Brand data from BrandContext
 * @param {string} defaultName - Default name if none specified
 * @returns {string} Name string
 */
export function getName(brandData, defaultName = '') {
  return brandData?.brandName || defaultName;
}

/**
 * Builds a brief brand/creator context for shorter prompts
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {string} Brief context string
 */
export function buildBriefBrandContext(brandData) {
  const isCreator = isCreatorProfile(brandData);
  const voice = getBrandVoice(brandData);
  const niche = getNiche(brandData);
  const audience = getTargetAudience(brandData);
  
  if (isCreator) {
    const archetype = brandData?.creatorArchetype;
    const traits = getArchetypeTraits(archetype);
    const archetypeInfo = traits ? ` | Style: ${traits.style}` : '';
    return `Creator Voice: ${voice} | Focus: ${niche} | Community: ${audience}${archetypeInfo}`;
  }
  
  return `Brand Voice: ${voice} | Niche: ${niche} | Audience: ${audience}`;
}

/**
 * Gets personalized greeting — always uses first name
 * - Uses firstName from brand profile, or fallback from user metadata
 * - Fallback if no name → "Hey there!" with profile completion nudge
 *
 * @param {Object} brandData - Brand data from BrandContext
 * @param {string} fallbackName - Fallback name if none in profile (e.g. from user metadata)
 * @returns {Object} Greeting object with message, name, and needsProfile flag
 */
export function getPersonalizedGreeting(brandData, fallbackName = 'there') {
  const isCreator = isCreatorProfile(brandData);

  // Always use first name for greeting (creator and brand alike)
  const rawName = brandData?.firstName || fallbackName;
  const firstName = formatDisplayName(rawName).split(' ')[0].replace('@', '');
  const hasName = !!(brandData?.firstName || (fallbackName && fallbackName !== 'there'));

  return {
    message: hasName ? `Hey ${firstName}! Ready to create?` : 'Hey there! Ready to create?',
    shortMessage: hasName ? `Hey ${firstName}!` : 'Hey there!',
    name: hasName ? firstName : 'there',
    isCreator,
    needsProfile: !hasName,
  };
}

/**
 * Gets the preferred hook style or a default value
 * @param {Object} brandData - Brand data from BrandContext
 * @param {string} defaultStyle - Default hook style if none specified
 * @returns {string} Hook style string
 */
export function getHookStyle(brandData, defaultStyle = 'question') {
  return brandData?.hookStylePreference || defaultStyle;
}

/**
 * Gets the hook style description for AI prompts
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {string} Hook style description
 */
export function getHookStyleDescription(brandData) {
  const style = brandData?.hookStylePreference;
  return HOOK_STYLE_DESCRIPTIONS[style] || 'Create attention-grabbing opening hooks';
}

/**
 * Gets content strengths as a formatted string
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {string} Comma-separated strengths or default
 */
export function getContentStrengths(brandData) {
  const strengths = brandData?.contentStrengths;
  if (strengths && strengths.length > 0) {
    return strengths.join(', ');
  }
  return 'storytelling, authenticity';
}

/**
 * Gets emotional triggers as a formatted string
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {string} Comma-separated emotions or default
 */
export function getEmotionalTriggers(brandData) {
  const triggers = brandData?.emotionalTriggers;
  if (triggers && triggers.length > 0) {
    return triggers.join(', ');
  }
  return 'inspired, connected';
}

/**
 * Gets the biggest challenge
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {string} Challenge or null
 */
export function getBiggestChallenge(brandData) {
  return brandData?.biggestChallenge || null;
}

/**
 * Builds a viral-optimized brief context for hook generation
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {string} Brief viral context string
 */
export function buildViralContext(brandData) {
  const parts = [];
  
  if (brandData?.hookStylePreference) {
    parts.push(`Hook Style: ${HOOK_STYLE_DESCRIPTIONS[brandData.hookStylePreference] || brandData.hookStylePreference}`);
  }
  
  if (brandData?.contentStrengths && brandData.contentStrengths.length > 0) {
    parts.push(`Strengths: ${brandData.contentStrengths.join(', ')}`);
  }
  
  if (brandData?.emotionalTriggers && brandData.emotionalTriggers.length > 0) {
    parts.push(`Evoke: ${brandData.emotionalTriggers.join(', ')}`);
  }
  
  return parts.length > 0 ? parts.join(' | ') : 'Create engaging, shareable content';
}