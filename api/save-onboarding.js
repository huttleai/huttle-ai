import { createClient } from '@supabase/supabase-js';
import { handlePreflight, setCorsHeaders } from './_utils/cors.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

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
      profileType,
      brandName,
      creatorType,
      niche,
      growthStage,
      targetAudience,
      platforms,
      city,
      quizCompletedAt,
      onboardingStep,
    } = req.body || {};

    const nowIso = new Date().toISOString();

    const { error: profileError } = await supabase
      .from('user_profile')
      .upsert(
        {
          user_id: user.id,
          first_name: firstName || null,
          profile_type: profileType || 'creator',
          brand_name: brandName || null,
          niche: niche || null,
          target_audience: targetAudience || null,
          preferred_platforms: Array.isArray(platforms) ? platforms : [],
          has_completed_onboarding: true,
          quiz_completed_at: quizCompletedAt || nowIso,
          onboarding_step: onboardingStep || 6,
          updated_at: nowIso,
        },
        {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        }
      );

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
          updated_at: nowIso,
        },
        {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        }
      );

    if (preferencesError) {
      console.error('save-onboarding preferences upsert failed:', preferencesError);
      return res.status(500).json({ error: preferencesError.message });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('save-onboarding request failed:', error);
    return res.status(500).json({ error: error.message || 'Failed to save onboarding' });
  }
}
