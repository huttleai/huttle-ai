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
 * Checks if the profile is a solo creator type
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {boolean} True if creator profile
 */
export function isCreatorProfile(brandData) {
  return brandData?.profileType === 'creator';
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
  
  if (isCreator) {
    const archetype = brandData?.creatorArchetype;
    const traits = getArchetypeTraits(archetype);
    
    let instructions = `
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
    
    return instructions;
  } else {
    return `
BRAND CONTENT GUIDELINES:
- Maintain consistent brand voice and professional standards
- Write on behalf of the brand (we, our, us) unless specifically personal
- Focus on value proposition and brand messaging
- Ensure content aligns with brand identity and business goals
- Keep messaging professional yet engaging`;
  }
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
 * Gets personalized greeting based on profile type
 * @param {Object} brandData - Brand data from BrandContext
 * @param {string} fallbackName - Fallback name if none in profile
 * @returns {Object} Greeting object with message and name
 */
export function getPersonalizedGreeting(brandData, fallbackName = 'there') {
  const isCreator = isCreatorProfile(brandData);
  const name = brandData?.brandName || fallbackName;
  
  // Extract first name if full name provided
  const firstName = name.split(' ')[0].replace('@', '');
  
  if (isCreator) {
    return {
      message: `Hey ${firstName}! Ready to create?`,
      shortMessage: `Hey ${firstName}!`,
      name: firstName,
      isCreator: true
    };
  }
  
  return {
    message: `Welcome back, ${name}`,
    shortMessage: `Welcome, ${name}`,
    name: name,
    isCreator: false
  };
}
