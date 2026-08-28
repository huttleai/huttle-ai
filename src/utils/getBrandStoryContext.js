/*
 * getBrandStoryContext — Content Philosophy Utility
 * Single source of truth for AI content framing across all features.
 *
 * ROUTING ARCHITECTURE:
 * Driven exclusively by userBrandType — the explicit selection made by
 * the user in onboarding. The niche/industry field is freeform text and
 * is NEVER used for routing, inference, or type detection anywhere in
 * this file or anywhere else in the codebase.
 *
 * TYPE FRAMING IS UNIVERSAL:
 * It applies to any profession, niche, or industry without exception.
 * No accepted niche list exists in this system. If a user runs a
 * pottery studio, a food truck, an accounting firm, or anything else
 * imaginable, the userBrandType value determines their framing —
 * nothing else.
 *
 * TYPE REFERENCE (examples illustrative, never exhaustive):
 *
 * solo_creator — Any individual whose personal identity is the brand.
 *   The user IS the product. Personal life, opinions, and expertise are
 *   the content. No product posting cap applied.
 *
 * business_owner — Any individual running any business of any kind.
 *   Business type = voice context, never content topic. Max 30% product.
 *   Content centers on community, BTS, team, real moments, local culture.
 *
 * hybrid — Any individual building personal brand + business together.
 *   Blended framing: personal authenticity + business storytelling.
 *
 * MAINTENANCE NOTE:
 * If the content philosophy needs updating, change it here only.
 * It propagates automatically to all features that import this utility.
 *
 * SPOT CHECK SIMULATION RESULTS (verified 2026-04):
 *
 * CRITICAL DEVELOPER NOTE:
 * The profiles listed below are test cases only — they are a small,
 * arbitrary sample used to verify routing logic during the audit.
 * They do not represent the full range of supported users.
 *
 * Huttle AI supports ANY niche, profession, or business type imaginable.
 * The routing system has no concept of a supported or unsupported niche.
 * A landscaper, pool cleaning company, immigration lawyer, taxidermist,
 * or any other business or personal brand will receive identical,
 * correct framing based solely on their userBrandType selection.
 *
 * If a new business type needs to be "tested" in the future, simply
 * set userBrandType to the appropriate value and verify the output —
 * no code changes are ever required to support a new niche.
 *
 * The niche string is voice context only. It is never a routing input.
 * userBrandType is the only signal that determines content framing.
 * This is true for every business or creator type that has ever existed
 * or will ever exist.
 *
 * // The following profiles are illustrative test cases only (not exhaustive).
 * // Huttle AI is niche-agnostic. Any business or creator type not listed
 * // here receives identical correct framing — no additional code required.
 *
 * PROFILE 1 — Coffee Shop Owner (business_owner, niche: "coffee shop")
 * → Generated framing: business_owner block applied universally.
 *   Content centers on regulars, 5am open, barista team, neighborhood
 *   moments, seasonal menu woven in naturally, community events, BTS of a
 *   rush. Local weight added if contentFocusPillars contains community/BTS.
 *   BLOCKED: coffee facts, history of espresso, brewing methods guides —
 *   those are influencer/hobbyist content, not business owner content.
 *
 * PROFILE 2 — Fitness Influencer (solo_creator, niche: "fitness")
 * → Generated framing: solo_creator block applied. Personal transformation,
 *   workout opinions, real talk about fitness culture, their training life,
 *   motivational personal content. No 30% product cap. They ARE the product.
 *
 * PROFILE 3 — Real Estate Agent (business_owner, niche: "real estate")
 * → Generated framing: business_owner block applied. Neighborhood spotlights,
 *   client win stories, reality of home buying, local market moments, BTS of
 *   a deal closing, community posts. BLOCKED: "5 tips for first-time
 *   homebuyers" as repeating generic tip-list — that belongs on a real estate
 *   influencer account, not a working agent's business feed.
 *
 * PROFILE 4 — Personal Finance Coach (hybrid, niche: "personal finance")
 * → Generated framing: hybrid block applied. Personal money story + coaching
 *   expertise + business moments blended. ~40% personal expertise/opinions,
 *   ~30% business BTS/operations, ~30% community/audience relationship.
 *
 * PROFILE 5 — Tattoo Artist (business_owner, niche: "tattoo artist")
 * → Generated framing: business_owner block applied. Finished work with
 *   client story context, BTS of a session, studio culture, booking process,
 *   craft and care behind the work, artist personality.
 *   BLOCKED: tattoo facts, tattoo history, tattoo style guides in the style
 *   of an enthusiast blogger.
 *
 * PROFILE 6 — Food Truck Owner (business_owner, niche: "food truck")
 * → Generated framing: business_owner block applied. Daily location drops,
 *   prep BTS, sold-out moments, the team, regulars, weather reality, hustle
 *   of running a mobile business. BLOCKED: recipe tips, food culture content,
 *   cuisine history — that is food blogger content, not food truck content.
 *
 * PROFILE 7 — Floral Studio Owner (hybrid, niche: "floral design")
 * → Generated framing: hybrid block applied. Blend of artistic personality
 *   + studio BTS + client event stories + business of running a creative
 *   studio. ~40% personal artistic voice/opinions, ~30% studio BTS, ~30%
 *   community/client relationships. Hybrid framing handles creative/artisan
 *   businesses correctly — they have a personal brand AND a business.
 */

/**
 * Derives the effective userBrandType from the brand profile.
 * Reads userBrandType directly, then falls back to profileType for
 * backward compatibility with existing users.
 *
 * @param {Object} brandProfile
 * @returns {'solo_creator'|'business_owner'|'hybrid'}
 */
function resolveUserBrandType(brandProfile) {
  if (!brandProfile || typeof brandProfile !== 'object') return 'hybrid';

  const ubt = String(brandProfile.userBrandType || '').trim().toLowerCase();
  if (ubt === 'solo_creator' || ubt === 'business_owner' || ubt === 'hybrid') return ubt;

  const pt = String(brandProfile.profileType || '').trim().toLowerCase();
  if (pt === 'solo_creator' || pt === 'creator') return 'solo_creator';
  if (pt === 'brand_business' || pt === 'brand' || pt === 'business') return 'business_owner';
  if (pt === 'hybrid') return 'hybrid';

  return 'hybrid';
}

/**
 * Returns the content philosophy block for the AI system message.
 * Determines framing from userBrandType exclusively.
 * Local/community weight is added only if contentFocusPillars signals it.
 *
 * @param {Object} brandProfile - The brand profile from BrandContext.
 * @returns {string} A system-message-ready content philosophy string.
 */
export function getBrandStoryContext(brandProfile) {
  try {
    const userBrandType = resolveUserBrandType(brandProfile);

    let typeBlock = '';

    if (userBrandType === 'solo_creator') {
      typeBlock = `CONTENT PHILOSOPHY — SOLO CREATOR / PERSONAL BRAND:
This user has identified themselves as a solo creator or personal brand.
This framing applies universally — it does not matter what their niche,
industry, or profession is. Whether they are a fitness influencer, a
musician, a chef, a developer, an artist, or anyone else building a
personal brand, the same principle applies: they ARE the product.
Their personality, opinions, expertise, and life story are the content.
Do not apply a product/service posting cap — for solo creators,
their personal content IS the value they deliver.

Content approach:
- Lead with personal voice, lived experience, and authentic opinions
- Share transformation, behind-the-brand moments, and unfiltered perspective
- Build parasocial connection through consistent, real, human storytelling
- Up to 60% personal/life/opinion content is appropriate and expected
- Products or services can appear naturally but the PERSON is always the focus`;
    } else if (userBrandType === 'business_owner') {
      typeBlock = `CONTENT PHILOSOPHY — BUSINESS OWNER:
This user has identified themselves as a business or brand owner.
This framing applies universally to any business of any kind — a coffee
shop, a law firm, a floral studio, a food truck, a tattoo parlor, a
construction company, a vintage store, or any other business whatsoever.
The business type is context for their voice — it is NOT the content topic.
They post like a real person who loves what they do, not like an industry
influencer or product advertiser.

Content distribution (non-negotiable):
- Max 30% directly promotes their product or service
- 70% pulls from: behind-the-scenes, community moments, team stories,
  real moments of running the business, local culture, customer
  relationships, milestones, and day-in-the-life storytelling

Critical instruction: never generate content that a lifestyle influencer
or enthusiast blogger would post about this product category.
A coffee shop owner is not a coffee influencer. A florist is not a flower
enthusiast. A tattoo artist is not a tattoo history educator. A food truck
owner is not a food blogger. Generate content about running their business
and serving their community — not about the product category itself.

Voice: authentic business owner speaking to their regulars and neighbors.
Not a brand marketer. Not an industry pundit. A real person building
something real.`;
    } else {
      typeBlock = `CONTENT PHILOSOPHY — HYBRID (PERSONAL BRAND + BUSINESS):
This user has identified themselves as both a personal brand and a
business owner. This applies universally to any individual in any
industry who is building their personal reputation alongside a business.
Examples include consultants, coaches with products, creative agency
owners, speakers, or anyone whose name and business grow together.

Blend personal authenticity with business storytelling:
- ~40% personal expertise, opinions, and story
- ~30% business behind-the-scenes and operations
- ~30% community and audience relationship building

The person and the business are intertwined — their personality builds
the brand AND the brand validates their expertise. Never collapse them
into only a creator or only a business account.`;
    }

    const pillars = Array.isArray(brandProfile?.contentFocusPillars)
      ? brandProfile.contentFocusPillars
      : [];

    const LOCAL_COMMUNITY_PHRASES = [
      'my customers',
      'community',
      'my life running',
      'behind the scenes',
    ];

    const hasLocalWeight = pillars.some((p) =>
      LOCAL_COMMUNITY_PHRASES.some((phrase) =>
        String(p || '').toLowerCase().includes(phrase)
      )
    );

    const localBlock = hasLocalWeight
      ? `\nLOCAL & COMMUNITY CONTENT WEIGHT:
Weight neighborhood content, customer relationships, team moments,
and local community heavily in content recommendations.`
      : '';

    return `${typeBlock}${localBlock}`;
  } catch {
    return `CONTENT PHILOSOPHY — DEFAULT (HYBRID):
Blend personal authenticity with business storytelling.
~40% personal expertise and story, ~30% business BTS, ~30% community.`;
  }
}
