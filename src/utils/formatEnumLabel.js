/**
 * Format enum/snake_case values to human-readable labels.
 * Handles special cases like abbreviations and common terms.
 * 
 * @param {string} value - Raw enum value (e.g., 'behind_scenes', 'gen_z_consumers')
 * @returns {string} Formatted label (e.g., 'Behind the Scenes', 'Gen Z Consumers')
 */

// Special case mappings for exact matches
const EXACT_MAPPINGS = {
  // Niches
  'behind_scenes': 'Behind the Scenes',
  'customer_stories': 'Customer Success Stories',
  'thought_leadership': 'Industry Thought Leadership',
  'how_to': 'How-To Guides & Tutorials',
  'product_reviews': 'Product Reviews & Demos',
  'personal_growth': 'Personal Growth',
  
  // Audiences
  'gen_z_consumers': 'Gen Z Consumers',
  'gen_z': 'Gen Z',
  'millennial_consumers': 'Millennial Consumers',
  'millennials': 'Millennials',
  'gen_x': 'Gen X',
  'small_business': 'Small Business Owners',
  'enterprise': 'Enterprise Decision Makers',
  'health_conscious': 'Health-Conscious Buyers',
  'tech_enthusiasts': 'Tech Enthusiasts',
  'fellow_creators': 'Fellow Creators',
  'general': 'General',
  
  // Industries
  'real_estate': 'Real Estate',
  'healthcare': 'Healthcare & Wellness',
  'beauty': 'Beauty & Cosmetics',
  'fitness': 'Fitness & Sports',
  'food': 'Food & Beverage',
  'fashion': 'Fashion & Apparel',
  'technology': 'Technology & Software',
  'finance': 'Finance & Insurance',
  'education': 'Education & Training',
  'entertainment': 'Entertainment & Media',
  'retail': 'Retail & E-commerce',
  'services': 'Professional Services',
  
  // Content goals
  'grow_followers': 'Grow Followers',
  'increase_engagement': 'Increase Engagement',
  'drive_sales': 'Drive Sales',
  'build_brand': 'Build Brand Awareness',
  'build_community': 'Build Community',
  'share_story': 'Share My Story',
  'express_myself': 'Express Myself',
  'generate_leads': 'Generate Leads',
  'educate_audience': 'Educate Audience',
  'brand_awareness': 'Brand Awareness',
  'monetize': 'Monetize Content',
  'boost_engagement': 'Boost Engagement',
  'grow_following': 'Grow My Following',
  
  // Creator focuses
  'lifestyle': 'Lifestyle & Daily Life',
  'travel': 'Travel & Adventure',
  'tech': 'Tech & Gadgets',
  'art': 'Art & Creativity',
  
  // Brand voices
  'casual': 'Casual & Friendly',
  'professional': 'Professional & Polished',
  'humorous': 'Humorous & Playful',
  'inspirational': 'Inspirational & Motivating',
  'educational': 'Educational & Informative',
  
  // Posting frequencies
  'daily': 'Daily',
  'frequent': '3-5 Times per Week',
  'moderate': '1-2 Times per Week',
  'occasional': 'A Few Times per Month',
  
  // Content strengths
  'storytelling': 'Storytelling',
  'visuals': 'Visuals',
  'trends': 'Trends',
  'authenticity': 'Authenticity',
  
  // Challenges
  'consistency': 'Staying Consistent',
  'ideas': 'Coming Up With Ideas',
  'engagement': 'Getting Engagement',
  'growth': 'Growing My Audience',
  'time': 'Finding Time',
  'quality': 'Creating Quality Content',
  
  // Emotional triggers
  'inspired': 'Inspired',
  'entertained': 'Entertained',
  'educated': 'Educated',
  'connected': 'Connected',
  'motivated': 'Motivated',
  'understood': 'Understood',
  
  // Archetypes
  'educator': 'The Educator',
  'entertainer': 'The Entertainer',
  'storyteller': 'The Storyteller',
  'inspirer': 'The Inspirer',
  'curator': 'The Curator',
  
  // Abbreviations
  'cta': 'CTA',
  'ai': 'AI',
  'seo': 'SEO',
  'roi': 'ROI',
  'saas': 'SaaS',
  'b2b': 'B2B',
  'b2c': 'B2C',
};

// Word-level special cases for title casing
const WORD_OVERRIDES = {
  'gen': 'Gen',
  'z': 'Z',
  'x': 'X',
  'cta': 'CTA',
  'ai': 'AI',
  'seo': 'SEO',
  'roi': 'ROI',
  'saas': 'SaaS',
  'b2b': 'B2B',
  'b2c': 'B2C',
  'to': 'to',
  'and': 'and',
  'the': 'the',
  'of': 'of',
  'for': 'for',
  'in': 'in',
  'on': 'on',
  'at': 'at',
  'by': 'by',
};

// Reverse mappings to normalize human-readable labels back to enum keys
const REVERSE_EXACT_MAPPINGS = Object.entries(EXACT_MAPPINGS).reduce((acc, [key, label]) => {
  acc[label.toLowerCase()] = key;
  return acc;
}, {});

export function formatEnumLabel(value) {
  if (!value || typeof value !== 'string') return value || '';
  
  // Trim whitespace
  const trimmed = value.trim();
  if (!trimmed) return '';
  
  // Check exact mapping first (case-insensitive)
  const lowerValue = trimmed.toLowerCase();
  if (EXACT_MAPPINGS[lowerValue]) {
    return EXACT_MAPPINGS[lowerValue];
  }
  
  // If it already looks formatted (contains spaces and starts with uppercase), return as-is
  if (trimmed.includes(' ') && trimmed[0] === trimmed[0].toUpperCase() && !trimmed.includes('_')) {
    return trimmed;
  }
  
  // Split on underscores and format each word
  const words = trimmed.split('_').filter(Boolean);
  
  const formatted = words.map((word, index) => {
    const lower = word.toLowerCase();
    
    // Check word-level overrides
    if (WORD_OVERRIDES[lower] !== undefined) {
      // Always capitalize first word
      if (index === 0) {
        const override = WORD_OVERRIDES[lower];
        return override.charAt(0).toUpperCase() + override.slice(1);
      }
      return WORD_OVERRIDES[lower];
    }
    
    // Default: capitalize first letter
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  
  return formatted.join(' ');
}

/**
 * Format an array of enum values to a human-readable comma-separated string.
 * 
 * @param {Array|string} values - Array of enum values or a JSON string
 * @returns {string} Formatted comma-separated string
 */
export function formatEnumArray(values) {
  if (!values) return '';
  
  // If it's already a formatted string (not JSON array), return with formatting
  if (typeof values === 'string') {
    // Check if it's a JSON array string like '["gen_z_consumers","millennial_consumers"]'
    if (values.startsWith('[')) {
      try {
        const parsed = JSON.parse(values);
        if (Array.isArray(parsed)) {
          return parsed.map(formatEnumLabel).filter(Boolean).join(', ');
        }
      } catch (e) {
        // Not valid JSON, treat as comma-separated
      }
    }
    
    // Already a comma-separated string — format each part
    return values
      .split(',')
      .map(v => formatEnumLabel(v.trim()))
      .filter(Boolean)
      .join(', ');
  }
  
  if (Array.isArray(values)) {
    return values.map(formatEnumLabel).filter(Boolean).join(', ');
  }
  
  return String(values);
}

/**
 * Normalize a human-readable value or enum-like value to snake_case enum key.
 * Example:
 * - "Staying Consistent" -> "consistency"
 * - "The Educator" -> "educator"
 * - "grow_followers" -> "grow_followers"
 *
 * @param {string} value
 * @returns {string}
 */
export function normalizeEnumValue(value) {
  if (!value || typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();

  // Handle known labels (human readable -> enum key)
  if (REVERSE_EXACT_MAPPINGS[lower]) {
    return REVERSE_EXACT_MAPPINGS[lower];
  }

  // If it already looks like a normalized enum key, keep it
  if (/^[a-z0-9_]+$/.test(trimmed)) {
    return trimmed;
  }

  // Normalize free-form labels into snake_case
  return trimmed
    .replace(/['"]/g, '')
    .replace(/&/g, ' and ')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

/**
 * Normalize an array/string of enum-like values to comma-separated keys.
 * @param {Array|string} values
 * @returns {string}
 */
export function normalizeEnumArray(values) {
  if (!values) return '';

  if (Array.isArray(values)) {
    return values.map(normalizeEnumValue).filter(Boolean).join(', ');
  }

  if (typeof values === 'string') {
    if (values.startsWith('[')) {
      try {
        const parsed = JSON.parse(values);
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeEnumValue).filter(Boolean).join(', ');
        }
      } catch (e) {
        // Ignore and treat as a plain string below
      }
    }

    return values
      .split(',')
      .map(v => normalizeEnumValue(v))
      .filter(Boolean)
      .join(', ');
  }

  return normalizeEnumValue(String(values));
}

export default formatEnumLabel;
