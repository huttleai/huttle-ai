import { createContext, useState, useEffect, useContext, useRef, useMemo, useCallback } from 'react';
import { supabase, getUserPreferences, saveUserPreferences } from '../config/supabase';
import { AuthContext } from './AuthContext';
import { formatEnumLabel, formatEnumArray, normalizeEnumValue } from '../utils/formatEnumLabel';

export const BrandContext = createContext();

/**
 * Columns on `user_profile` only. Do not add `content_focus`, `growth_stage`, or `creator_type` here —
 * those live on `user_preferences` and will cause PostgREST 400 / schema errors if selected from `user_profile`.
 */
const USER_PROFILE_SELECT =
  'user_id,first_name,profile_type,creator_archetype,brand_name,social_handle,niche,sub_niche,city,location_state,country,industry,target_audience,brand_voice_preference,preferred_platforms,content_goals,audience_pain_point,audience_action_trigger,tone_chips,writing_style,example_post,content_to_post,content_to_avoid,follower_count,primary_offer,conversion_goal,content_persona,monetization_goal,show_up_style,content_strengths,biggest_challenge,hook_style_preference,emotional_triggers,has_seen_welcome_notification,business_primary_goal,creator_monetization_path,is_local_business,audience_location_type,content_mix,posting_frequency,audience_stage';

const QUERY_TIMEOUT_MS = 5000;

function createEmptyBrandData() {
  return {
    firstName: '',
    profileType: 'business',
    creatorArchetype: '',
    brandName: '',
    handle: '',
    niche: '',
    subNiche: '',
    contentFocus: '',
    city: '',
    locationState: null,
    country: 'US',
    industry: '',
    growthStage: '',
    creatorType: null,
    targetAudience: '',
    brandVoice: '',
    platforms: [],
    goals: [],
    audiencePainPoint: '',
    audienceActionTrigger: '',
    toneChips: [],
    writingStyle: '',
    examplePost: '',
    contentToPost: [],
    contentToAvoid: '',
    followerCount: '',
    primaryOffer: '',
    conversionGoal: '',
    contentPersona: '',
    monetizationGoal: '',
    showUpStyle: '',
    contentStrengths: [],
    biggestChallenge: '',
    hookStylePreference: '',
    emotionalTriggers: [],
    /** true = already shown or legacy user; false = new profile, eligible for one-time welcome notification */
    hasSeenWelcomeNotification: true,
    businessPrimaryGoal: null,
    creatorMonetizationPath: null,
    isLocalBusiness: false,
    audienceLocationType: null,
    contentMix: null,
    postingFrequency: '',
    audienceStage: '',
    userBrandType: '',
    brandVibes: [],
    contentFocusPillars: [],
  };
}

function isBusinessProfileType(profileType) {
  return (
    !profileType
    || profileType === 'brand'
    || profileType === 'business'
    || profileType === 'brand_business'
  );
}

function normalizeProfileTypeForDb(profileType) {
  const p = String(profileType || '').toLowerCase().trim();
  if (p === 'solo_creator' || p === 'creator') return 'solo_creator';
  if (p === 'brand_business' || p === 'business' || p === 'brand' || p === 'business_owner' || p === 'hybrid') return 'brand_business';
  return 'brand_business';
}

function deriveUserBrandTypeFromProfileType(profileType) {
  const p = String(profileType || '').toLowerCase().trim();
  if (p === 'solo_creator' || p === 'creator') return 'solo_creator';
  if (p === 'brand_business' || p === 'brand' || p === 'business') return 'business_owner';
  return 'hybrid';
}

/** Values persisted in `user_preferences.user_brand_type` — not derived from profile_type. */
const EXPLICIT_USER_BRAND_TYPE_VALUES = new Set(['solo_creator', 'business_owner', 'hybrid']);

/**
 * @param {unknown} rawUserBrandType — literal `user_brand_type` from user_preferences (before merge fallbacks).
 * @returns {boolean}
 */
function computeHasExplicitBrandType(rawUserBrandType) {
  if (rawUserBrandType == null) return false;
  if (typeof rawUserBrandType !== 'string') return false;
  const t = rawUserBrandType.trim().toLowerCase();
  if (!t) return false;
  return EXPLICIT_USER_BRAND_TYPE_VALUES.has(t);
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return {
    brandProfile: context.brandData,
    updateBrandData: context.updateBrandData,
    resetBrandData: context.resetBrandData,
    refreshBrandData: context.refreshBrandData,
    loading: context.loading,
    brandFetchComplete: context.brandFetchComplete,
    // Convenience helpers for profile type
    isCreator: context.brandData?.profileType === 'creator' ||
               context.brandData?.profileType === 'solo_creator',
    isBrand: isBusinessProfileType(context.brandData?.profileType),
    hasExplicitBrandType: context.hasExplicitBrandType,
  };
}

export function BrandProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [brandData, setBrandData] = useState(createEmptyBrandData);
  /** True only when `user_preferences.user_brand_type` is set in DB to a known Brand Voice value (not derived). */
  const [hasExplicitBrandType, setHasExplicitBrandType] = useState(false);
  /** Background profile fetch — never used to block primary UI; optional spinners only. */
  const [loading, setLoading] = useState(false);
  /** True after first fetch attempt finishes (success, timeout, or error) for the current user. */
  const [brandFetchComplete, setBrandFetchComplete] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const prevUserIdRef = useRef(null);
  const brandDataRef = useRef(brandData);
  brandDataRef.current = brandData;

  const normalizeOptionalEnum = (value) => {
    if (!value || typeof value !== 'string') return '';
    const normalized = normalizeEnumValue(value);
    return normalized || value.trim();
  };

  const userId = user?.id ?? null;
  useEffect(() => {
    const prevId = prevUserIdRef.current;
    prevUserIdRef.current = userId;

    if (prevId && userId && prevId !== userId) {
      localStorage.removeItem('brandData');
      setBrandData(createEmptyBrandData());
      setHasExplicitBrandType(false);
      setBrandFetchComplete(false);
    } else if (!userId && prevId) {
      localStorage.removeItem('brandData');
      setBrandData(createEmptyBrandData());
      setHasExplicitBrandType(false);
      setBrandFetchComplete(true);
    }
  }, [userId]);

  useEffect(() => {
    let isActive = true;

    const applyLocalBrandFallback = () => {
      const savedBrand = localStorage.getItem('brandData');
      if (!savedBrand || !isActive) return;

      try {
        setBrandData(JSON.parse(savedBrand));
      } catch (error) {
        console.warn('[Brand] Could not parse cached brand data:', error.message);
      }
    };

    const applyEmptyBrandFallback = () => {
      if (!isActive) return;
      setBrandData(createEmptyBrandData());
    };

    /** After a failed profile fetch/insert, prefer cached brand data so the UI is not wiped. */
    const applyFetchFailureFallback = () => {
      if (!isActive) return;
      const savedBrand = localStorage.getItem('brandData');
      if (savedBrand) {
        try {
          setBrandData(JSON.parse(savedBrand));
          return;
        } catch (e) {
          console.warn('[Brand] Could not parse cached brand data after fetch failure:', e.message);
        }
      }
      applyEmptyBrandFallback();
    };

    const mergePreferencesIntoBrandData = (baseData, userPreferences = {}) => ({
      ...baseData,
      contentFocus: userPreferences.content_focus
        ? formatEnumArray(userPreferences.content_focus)
        : baseData.contentFocus,
      city: userPreferences.city || baseData.city,
      growthStage: userPreferences.growth_stage
        ? normalizeOptionalEnum(userPreferences.growth_stage)
        : baseData.growthStage,
      creatorType: userPreferences.creator_type
        ? normalizeOptionalEnum(userPreferences.creator_type)
        : baseData.creatorType,
      userBrandType: userPreferences.user_brand_type
        ? String(userPreferences.user_brand_type)
        : (baseData.userBrandType || deriveUserBrandTypeFromProfileType(baseData.profileType)),
      brandVibes: Array.isArray(userPreferences.brand_vibes)
        ? userPreferences.brand_vibes
        : (baseData.brandVibes || []),
      contentFocusPillars: Array.isArray(userPreferences.content_focus_pillars)
        ? userPreferences.content_focus_pillars
        : (baseData.contentFocusPillars || []),
    });

    const fetchBrandData = async () => {
      if (!user) {
        if (isActive) {
          applyLocalBrandFallback();
          setBrandFetchComplete(true);
        }
        return;
      }

      setBrandFetchComplete(false);
      setLoading(true);

      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Brand data query timed out')), QUERY_TIMEOUT_MS);
        });

        const queryPromise = supabase
          .from('user_profile')
          .select(USER_PROFILE_SELECT)
          .eq('user_id', user.id)
          .maybeSingle();

        const safePreferencesPromise = getUserPreferences(user.id).then((result) => {
          if (!result?.success || !result.data) {
            return null;
          }

          return result.data;
        }).catch(() => null);

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

        if (error) {
          throw error;
        }

        /** Merge prefs in the same tick as profile data so a slow prefs fetch cannot overwrite in-progress edits. */
        const userPreferences = await safePreferencesPromise;
        if (!isActive) {
          return;
        }

        if (data && data.user_id) {
          const mappedData = {
            firstName: data.first_name || '',
            profileType: data.profile_type || 'brand',
            creatorArchetype: data.creator_archetype ? normalizeOptionalEnum(data.creator_archetype) : '',
            brandName: data.brand_name || '',
            handle: data.social_handle || '',
            niche: data.niche || '',
            subNiche: data.sub_niche || '',
            contentFocus: '',
            city: data.city || '',
            locationState: data.location_state || null,
            country: data.country || 'US',
            industry: data.industry ? formatEnumLabel(data.industry) : '',
            growthStage: '',
            creatorType: null,
            targetAudience: Array.isArray(data.target_audience)
              ? formatEnumArray(data.target_audience)
              : (data.target_audience ? formatEnumArray(data.target_audience) : ''),
            brandVoice: data.brand_voice_preference ? formatEnumLabel(data.brand_voice_preference) : '',
            platforms: data.preferred_platforms || [],
            goals: data.content_goals || [],
            audiencePainPoint: data.audience_pain_point || '',
            audienceActionTrigger: data.audience_action_trigger || '',
            toneChips: data.tone_chips || [],
            writingStyle: data.writing_style || '',
            examplePost: data.example_post || '',
            contentToPost: data.content_to_post || [],
            contentToAvoid: data.content_to_avoid || '',
            followerCount: data.follower_count || '',
            primaryOffer: data.primary_offer || '',
            conversionGoal: data.conversion_goal || '',
            contentPersona: data.content_persona || '',
            monetizationGoal: data.monetization_goal || '',
            showUpStyle: data.show_up_style || '',
            contentStrengths: data.content_strengths || [],
            biggestChallenge: data.biggest_challenge ? normalizeOptionalEnum(data.biggest_challenge) : '',
            hookStylePreference: data.hook_style_preference ? normalizeOptionalEnum(data.hook_style_preference) : '',
            emotionalTriggers: data.emotional_triggers || [],
            hasSeenWelcomeNotification: data.has_seen_welcome_notification !== false,
            businessPrimaryGoal: data.business_primary_goal || null,
            creatorMonetizationPath: data.creator_monetization_path || null,
            isLocalBusiness: data.is_local_business || false,
            audienceLocationType: data.audience_location_type || null,
            contentMix: data.content_mix || null,
            postingFrequency: data.posting_frequency || '',
            audienceStage: data.audience_stage || '',
            userBrandType: '',
            brandVibes: [],
            contentFocusPillars: [],
          };

          const mergedData = userPreferences
            ? mergePreferencesIntoBrandData(mappedData, userPreferences)
            : mappedData;

          if (isActive) {
            setBrandData(mergedData);
            setHasExplicitBrandType(computeHasExplicitBrandType(userPreferences?.user_brand_type));
          }
          localStorage.setItem('brandData', JSON.stringify(mergedData));
        } else {
          console.info('[Brand] No profile row found, inserting default for user:', user.id);
          const { error: insertError } = await supabase
            .from('user_profile')
            .upsert({ user_id: user.id, profile_type: 'brand' }, { onConflict: 'user_id', ignoreDuplicates: true });

          if (insertError) {
            console.warn('[Brand] Default row insert failed (non-critical):', insertError.message);
          }

          applyFetchFailureFallback();
          if (isActive && userPreferences) {
            setBrandData((current) => {
              const merged = mergePreferencesIntoBrandData(current, userPreferences);
              localStorage.setItem('brandData', JSON.stringify(merged));
              return merged;
            });
            setHasExplicitBrandType(computeHasExplicitBrandType(userPreferences?.user_brand_type));
          }
        }
      } catch (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.error('❌ [Brand] The user_profile table does not exist! Run docs/setup/supabase-user-profile-schema.sql');
        }
        applyFetchFailureFallback();
      } finally {
        setLoading(false);
        if (isActive) {
          setBrandFetchComplete(true);
        }
      }
    };

    void fetchBrandData();

    return () => {
      isActive = false;
    };
  }, [userId, reloadTrigger]);

  const updateBrandData = useCallback(async (newData) => {
    const existing = brandDataRef.current;
    const updates = newData;
    const updated = { ...existing, ...updates };
    setBrandData(updated);
    brandDataRef.current = updated;

    localStorage.setItem('brandData', JSON.stringify(updated));

    if (user?.id) {
      try {
        const profileData = {
          user_id: user.id,
          first_name: updated.firstName?.trim() || null,
          profile_type: normalizeProfileTypeForDb(updated.profileType),
          creator_archetype: normalizeOptionalEnum(updated.creatorArchetype) || null,
          brand_name: updated.brandName || null,
          social_handle: updated.handle || null,
          city: updated.city || null,
          location_state: updates.locationState ?? existing.locationState,
          country: updates.country ?? existing.country,
          industry: updated.industry
            ? normalizeOptionalEnum(updated.industry) || String(updated.industry).trim() || null
            : null,
          niche: updated.niche,
          sub_niche: updated.subNiche || null,
          target_audience: updated.targetAudience,
          brand_voice_preference: updated.brandVoice,
          preferred_platforms: updated.platforms,
          content_goals: updated.goals,
          audience_pain_point: updated.audiencePainPoint || null,
          audience_action_trigger: updated.audienceActionTrigger || null,
          tone_chips: updated.toneChips || [],
          writing_style: updated.writingStyle || null,
          example_post: updated.examplePost || null,
          content_to_post: updated.contentToPost || [],
          content_to_avoid: updated.contentToAvoid || null,
          follower_count: updated.followerCount || null,
          primary_offer: updated.primaryOffer || null,
          conversion_goal: updated.conversionGoal || null,
          content_persona: updated.contentPersona || null,
          monetization_goal: updated.monetizationGoal || null,
          show_up_style: updated.showUpStyle || null,
          content_strengths: updated.contentStrengths || [],
          biggest_challenge: normalizeOptionalEnum(updated.biggestChallenge) || null,
          hook_style_preference: normalizeOptionalEnum(updated.hookStylePreference) || null,
          emotional_triggers: updated.emotionalTriggers || [],
          business_primary_goal: updated.businessPrimaryGoal || null,
          creator_monetization_path: updated.creatorMonetizationPath || null,
          is_local_business: typeof updated.isLocalBusiness === 'boolean' ? updated.isLocalBusiness : false,
          audience_location_type: updated.audienceLocationType || null,
          content_mix: updated.contentMix || null,
          posting_frequency: updated.postingFrequency || null,
          audience_stage: updated.audienceStage || null,
          updated_at: new Date().toISOString(),
        };

        const { error: profileError } = await supabase
          .from('user_profile')
          .upsert(profileData, {
            onConflict: 'user_id'
          });

        if (profileError) {
          console.error('Error saving brand data to Supabase:', profileError);
          return { success: false, error: profileError.message };
        }

        const nicheForPrefs =
          typeof updated.niche === 'string'
            ? updated.niche
            : updated.niche
              ? String(updated.niche)
              : null;

        const prefResult = await saveUserPreferences(user.id, {
          creator_type: updated.creatorType || null,
          city: updated.city || null,
          growth_stage: normalizeOptionalEnum(updated.growthStage) || null,
          content_focus: nicheForPrefs,
          target_audience: updated.targetAudience || null,
          platforms: Array.isArray(updated.platforms) ? updated.platforms : [],
          user_brand_type: updated.userBrandType || null,
          brand_vibes: Array.isArray(updated.brandVibes) ? updated.brandVibes : [],
          content_focus_pillars: Array.isArray(updated.contentFocusPillars)
            ? updated.contentFocusPillars
            : [],
        });

        if (!prefResult?.success) {
          console.warn('[Brand] user_preferences sync failed:', prefResult?.error);
          return {
            success: true,
            preferencesError: prefResult?.error || 'Could not sync preferences (growth stage, creator type, etc.)',
          };
        }

        setHasExplicitBrandType(computeHasExplicitBrandType(updated.userBrandType));

        return { success: true };
      } catch (error) {
        console.error('Error updating brand data:', error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  }, [user?.id]);

  const resetBrandData = useCallback(async () => {
    const resetData = createEmptyBrandData();
    setBrandData(resetData);
    localStorage.removeItem('brandData');

    if (user?.id) {
      try {
        const resetProfileData = {
          profile_type: 'brand',
          creator_archetype: null,
          brand_name: null,
          social_handle: null,
          industry: null,
          niche: null,
          sub_niche: null,
          target_audience: null,
          brand_voice_preference: null,
          preferred_platforms: [],
          content_goals: [],
          audience_pain_point: null,
          audience_action_trigger: null,
          tone_chips: [],
          writing_style: null,
          example_post: null,
          content_to_post: [],
          content_to_avoid: null,
          follower_count: null,
          primary_offer: null,
          conversion_goal: null,
          content_persona: null,
          monetization_goal: null,
          show_up_style: null,
          content_strengths: [],
          biggest_challenge: null,
          hook_style_preference: null,
          emotional_triggers: [],
        };

        const { error } = await supabase
          .from('user_profile')
          .update(resetProfileData)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error resetting brand data in Supabase:', error);
        }
      } catch (error) {
        console.error('Error resetting brand data:', error);
      }
    }
  }, [user?.id]);

  const refreshBrandData = useCallback(() => {
    setReloadTrigger(prev => prev + 1);
  }, []);

  const value = useMemo(
    () => ({
      brandData,
      hasExplicitBrandType,
      updateBrandData,
      resetBrandData,
      refreshBrandData,
      loading,
      brandFetchComplete,
    }),
    [brandData, hasExplicitBrandType, updateBrandData, resetBrandData, refreshBrandData, loading, brandFetchComplete]
  );

  return (
    <BrandContext.Provider value={value}>
      {children}
    </BrandContext.Provider>
  );
}
