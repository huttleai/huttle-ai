/**
 * Brand Context Builder Utility
 * Centralizes brand voice/profile data for AI prompts
 * Ensures consistent brand alignment across all AI generations
 */

/**
 * Builds a comprehensive brand context string for AI prompts
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {string} Formatted brand context string
 */
export function buildBrandContext(brandData) {
  if (!brandData || Object.keys(brandData).length === 0) {
    return 'No brand profile available. Use a professional, engaging tone.';
  }

  const parts = [];
  
  if (brandData.brandName) {
    parts.push(`Brand Name: ${brandData.brandName}`);
  }
  
  if (brandData.niche) {
    parts.push(`Niche: ${brandData.niche}`);
  }
  
  if (brandData.industry) {
    parts.push(`Industry: ${brandData.industry}`);
  }
  
  if (brandData.targetAudience) {
    parts.push(`Target Audience: ${brandData.targetAudience}`);
  }
  
  if (brandData.brandVoice) {
    parts.push(`Brand Voice/Tone: ${brandData.brandVoice}`);
  }
  
  if (brandData.platforms && brandData.platforms.length > 0) {
    parts.push(`Preferred Platforms: ${brandData.platforms.join(', ')}`);
  }
  
  if (brandData.goals && brandData.goals.length > 0) {
    parts.push(`Content Goals: ${brandData.goals.join(', ')}`);
  }

  return parts.length > 0 
    ? parts.join('\n')
    : 'No brand profile available. Use a professional, engaging tone.';
}

/**
 * Builds a system prompt that includes brand context
 * @param {string} basePrompt - Base system prompt describing the AI's role
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {string} Enhanced system prompt with brand context
 */
export function buildSystemPrompt(basePrompt, brandData) {
  const brandContext = buildBrandContext(brandData);
  
  return `${basePrompt}

BRAND PROFILE:
${brandContext}

IMPORTANT: All content must align with the brand voice and profile above. Adapt your style, tone, and messaging to match the brand's identity.`;
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
 * Gets the niche or a default value
 * @param {Object} brandData - Brand data from BrandContext
 * @param {string} defaultNiche - Default niche if none specified
 * @returns {string} Niche string
 */
export function getNiche(brandData, defaultNiche = 'general') {
  return brandData?.niche || defaultNiche;
}

/**
 * Gets the target audience or a default value
 * @param {Object} brandData - Brand data from BrandContext
 * @param {string} defaultAudience - Default audience if none specified
 * @returns {string} Target audience string
 */
export function getTargetAudience(brandData, defaultAudience = 'general audience') {
  return brandData?.targetAudience || defaultAudience;
}

/**
 * Builds a brief brand context for shorter prompts
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {string} Brief brand context string
 */
export function buildBriefBrandContext(brandData) {
  const voice = getBrandVoice(brandData);
  const niche = getNiche(brandData);
  const audience = getTargetAudience(brandData);
  
  return `Brand Voice: ${voice} | Niche: ${niche} | Audience: ${audience}`;
}

