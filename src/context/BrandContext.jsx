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
  'user_id,first_name,profile_type,creator_archetype,brand_name,social_handle,niche,sub_niche,city,industry,target_audience,brand_voice_preference,preferred_platforms,content_goals,audience_pain_point,audience_action_trigger,tone_chips,writing_style,example_post,content_to_post,content_to_avoid,follower_count,primary_offer,conversion_goal,content_persona,monetization_goal,show_up_style,content_strengths,biggest_challenge,hook_style_preference,emotional_triggers';

const QUERY_TIMEOUT_MS = 5000;
const LEGACY_BRAND_CACHE_KEY = 'brandData';

function getBrandCacheKey(userId) {
  return userId ? `brandData:${userId}` : null;
}

function writeBrandCache(userId, data) {
  const cacheKey = getBrandCacheKey(userId);
  if (!cacheKey || !data) return;

  try {
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch {
    // Ignore localStorage quota / availability issues.
  }
}

function clearBrandCache(userId) {
  const cacheKey = getBrandCacheKey(userId);
  if (!cacheKey) return;
  localStorage.removeItem(cacheKey);
}

function hasMeaningfulBrandData(data) {
  if (!data || typeof data !== 'object') return false;

  const platforms = Array.isArray(data.platforms) ? data.platforms : [];
  const goals = Array.isArray(data.goals) ? data.goals : [];
  const toneChips = Array.isArray(data.toneChips) ? data.toneChips : [];

  return Boolean(
    String(data.firstName || '').trim()
    || String(data.brandName || '').trim()
    || String(data.niche || '').trim()
    || String(data.targetAudience || '').trim()
    || platforms.length > 0
    || goals.length > 0
    || toneChips.length > 0
  );
}

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
  const p = String(profileType || '').toLowerCase();
  if (p === 'creator' || p === 'solo_creator') return 'creator';
  return 'business';
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
    isCreator: context.brandData?.profileType === 'creator',
    isBrand: isBusinessProfileType(context.brandData?.profileType),
  };
}

export function BrandProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [brandData, setBrandData] = useState(createEmptyBrandData);
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
      clearBrandCache(prevId);
      localStorage.removeItem(LEGACY_BRAND_CACHE_KEY);
      setBrandData(createEmptyBrandData());
      setBrandFetchComplete(false);
    } else if (!userId && prevId) {
      clearBrandCache(prevId);
      localStorage.removeItem(LEGACY_BRAND_CACHE_KEY);
      setBrandData(createEmptyBrandData());
      setBrandFetchComplete(true);
    } else if (userId) {
      // One-time cleanup for legacy unscoped cache key.
      localStorage.removeItem(LEGACY_BRAND_CACHE_KEY);
    }
  }, [userId]);

  useEffect(() => {
    let isActive = true;

    const applyEmptyBrandFallback = () => {
      if (!isActive) return;
      setBrandData(createEmptyBrandData());
    };

    /**
     * Never hydrate authenticated fetch failures from localStorage.
     * Cached profile snapshots can be stale and overwrite newer server data on next save.
     */
    const applyFetchFailureFallback = () => {
      if (!isActive) return;
      if (!hasMeaningfulBrandData(brandDataRef.current)) {
        applyEmptyBrandFallback();
      }
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
    });

    const fetchBrandData = async () => {
      if (!user) {
        if (isActive) {
          applyEmptyBrandFallback();
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
          };

          const mergedData = userPreferences
            ? mergePreferencesIntoBrandData(mappedData, userPreferences)
            : mappedData;

          if (isActive) {
            setBrandData(mergedData);
          }
          writeBrandCache(user.id, mergedData);
        } else {
          console.info('[Brand] No profile row found, inserting default for user:', user.id);
          const { error: insertError } = await supabase
            .from('user_profile')
            .upsert({ user_id: user.id, profile_type: 'brand' }, { onConflict: 'user_id' });

          if (insertError) {
            console.warn('[Brand] Default row insert failed (non-critical):', insertError.message);
          }

          applyFetchFailureFallback();
          if (isActive && userPreferences) {
            setBrandData((current) => {
              const merged = mergePreferencesIntoBrandData(current, userPreferences);
              writeBrandCache(user.id, merged);
              return merged;
            });
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
    const updated = { ...brandDataRef.current, ...newData };
    setBrandData(updated);
    brandDataRef.current = updated;

    writeBrandCache(user?.id, updated);

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
        });

        if (!prefResult?.success) {
          console.warn('[Brand] user_preferences sync failed:', prefResult?.error);
          return {
            success: true,
            preferencesError: prefResult?.error || 'Could not sync preferences (growth stage, creator type, etc.)',
          };
        }

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
    clearBrandCache(user?.id);
    localStorage.removeItem(LEGACY_BRAND_CACHE_KEY);

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
      updateBrandData,
      resetBrandData,
      refreshBrandData,
      loading,
      brandFetchComplete,
    }),
    [brandData, updateBrandData, resetBrandData, refreshBrandData, loading, brandFetchComplete]
  );

  return (
    <BrandContext.Provider value={value}>
      {children}
    </BrandContext.Provider>
  );
}
