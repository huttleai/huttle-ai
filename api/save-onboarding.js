import { createClient } from '@supabase/supabase-js';
import { handlePreflight, setCorsHeaders } from './_utils/cors.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

function normalizeProfileType(profileType, creatorType) {
  const p = String(profileType || '').trim().toLowerCase();
  const ct = String(creatorType || '').trim().toLowerCase();

  // Accept the new constrained values directly
  if (p === 'brand_business' || ct === 'brand_business') return 'brand_business';
  if (p === 'solo_creator' || ct === 'solo_creator') return 'solo_creator';

  // Map new userBrandType values to DB-compatible profile_type values
  if (p === 'business_owner') return 'brand_business';
  if (p === 'hybrid') return 'brand_business';

  // Legacy fallback for any in-flight requests using old values
  if (p === 'business' || p === 'brand') return 'brand_business';
  return 'solo_creator';
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service client is not configured' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const accessToken = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    const {
      firstName,
      userBrandType,
      profileType,
      brandName,
      creatorHandle,
      creatorType,
      niche,
      growthStage,
      targetAudience,
      audiencePainPoint,
      platforms,
      followerCount,
      toneChips,
      conversionGoal,
      contentPersona,
      city,
      businessPrimaryGoal,
      audienceLocationType,
      isLocalBusiness,
      creatorMonetizationPath,
      audienceStage,
      postingFrequency,
      brandVibes,
      contentFocusPillars,
      quizCompletedAt,
      onboardingStep,
    } = req.body || {};

    const nowIso = new Date().toISOString();
    const normalizedProfileType = normalizeProfileType(profileType, creatorType);

    const profilePayload = {
      user_id: user.id,
      first_name: firstName || null,
      profile_type: normalizedProfileType,
      brand_name: brandName || null,
      social_handle: creatorHandle || null,
      niche: niche || null,
      target_audience: targetAudience || null,
      audience_pain_point: audiencePainPoint || null,
      preferred_platforms: Array.isArray(platforms) ? platforms : [],
      follower_count: followerCount || null,
      tone_chips: Array.isArray(toneChips) ? toneChips : [],
      conversion_goal: conversionGoal || null,
      content_persona: contentPersona || null,
      business_primary_goal: businessPrimaryGoal || null,
      audience_location_type: audienceLocationType || null,
      is_local_business: typeof isLocalBusiness === 'boolean' ? isLocalBusiness : false,
      creator_monetization_path: creatorMonetizationPath || null,
      audience_stage: audienceStage || null,
      posting_frequency: postingFrequency || null,
      has_completed_onboarding: true,
      quiz_completed_at: quizCompletedAt || nowIso,
      onboarding_step: onboardingStep || 10,
      updated_at: nowIso,
    };

    const { error: profileError } = await supabase
      .from('user_profile')
      .upsert(profilePayload, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      });

    if (profileError) {
      console.error('save-onboarding profile upsert failed:', profileError);
      return res.status(500).json({ error: profileError.message });
    }

    const { error: preferencesError } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: user.id,
          creator_type: creatorType || null,
          content_focus: niche || null,
          growth_stage: growthStage || null,
          target_audience: targetAudience || null,
          platforms: Array.isArray(platforms) ? platforms : [],
          city: city || null,
          user_brand_type: userBrandType || null,
          brand_vibes: Array.isArray(brandVibes) ? brandVibes : [],
          content_focus_pillars: Array.isArray(contentFocusPillars) ? contentFocusPillars : [],
          updated_at: nowIso,
        },
        {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        }
      );

    if (preferencesError) {
      // Non-fatal: new columns (user_brand_type, brand_vibes, content_focus_pillars) may not
      // exist yet. Profile was saved successfully. Log and continue.
      console.warn('save-onboarding preferences upsert warning (non-fatal):', preferencesError.message);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('save-onboarding request failed:', error);
    return res.status(500).json({ error: error.message || 'Failed to save onboarding' });
  }
}
