import { createContext, useState, useEffect, useContext } from 'react';
import { supabase, getUserPreferences } from '../config/supabase';
import { AuthContext } from './AuthContext';
import { formatEnumLabel, formatEnumArray, normalizeEnumValue } from '../utils/formatEnumLabel';

export const BrandContext = createContext();

function isBusinessProfileType(profileType) {
  return !profileType || profileType === 'brand' || profileType === 'business';
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
    // Convenience helpers for profile type
    isCreator: context.brandData?.profileType === 'creator',
    isBrand: isBusinessProfileType(context.brandData?.profileType),
  };
}

export function BrandProvider({ children }) {
  const { user, userProfile, needsOnboarding } = useContext(AuthContext);
  const [brandData, setBrandData] = useState({
    firstName: '',
    profileType: 'brand',
    creatorArchetype: '',
    brandName: '',
    socialHandle: '',
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
    // Audience expansion
    audiencePainPoint: '',
    audienceActionTrigger: '',
    // Voice expansion
    toneChips: [],
    writingStyle: '',
    examplePost: '',
    // Content expansion
    contentToPost: [],
    contentToAvoid: '',
    // Growth
    followerCount: '',
    // Business-only
    primaryOffer: '',
    conversionGoal: '',
    // Creator-only
    contentPersona: '',
    monetizationGoal: '',
    showUpStyle: '',
    // Viral content strategy fields
    contentStrengths: [],
    biggestChallenge: '',
    hookStylePreference: '',
    emotionalTriggers: [],
  });
  const [loading, setLoading] = useState(true);
  // Track if we need to force reload (e.g., after onboarding completes)
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const normalizeOptionalEnum = (value) => {
    if (!value || typeof value !== 'string') return '';
    const normalized = normalizeEnumValue(value);
    return normalized || value.trim();
  };

  // Load brand data from Supabase user_profile table
  useEffect(() => {
    let isActive = true;
    let retryTimeoutId = null;

    const applyLocalBrandFallback = () => {
      const savedBrand = localStorage.getItem('brandData');
      if (savedBrand && isActive) {
        setBrandData(JSON.parse(savedBrand));
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

    const applyPreferenceOverrides = (userPreferences) => {
      if (!isActive || !userPreferences) return;

      setBrandData((currentBrandData) => {
        const mergedBrandData = mergePreferencesIntoBrandData(currentBrandData, userPreferences);
        localStorage.setItem('brandData', JSON.stringify(mergedBrandData));
        return mergedBrandData;
      });
    };

    const fetchBrandData = async (retryCount = 0) => {
      let shouldRetry = false;

      if (!user) {
        // Fallback to localStorage if no user
        if (isActive) {
          applyLocalBrandFallback();
          setLoading(false);
        }
        return;
      }

      try {
        const QUERY_TIMEOUT_MS = 8000;
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Brand data query timed out')), QUERY_TIMEOUT_MS);
        });

        const queryPromise = supabase
          .from('user_profile')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        // Start preferences in parallel, but never await them for initial brand readiness.
        const safePreferencesPromise = getUserPreferences(user.id).then((result) => {
          if (!result?.success || !result.data) {
            return null;
          }

          return result.data;
        }).catch((e) => {
          console.warn('[Brand] Preferences fetch failed (non-blocking):', e.message);
          return null;
        });

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
        if (error) {
          throw error;
        }

        if (data) {
          // Map user_profile fields to brandData structure
          // Apply formatEnumLabel to convert snake_case values to human-readable labels.
          const mappedData = {
            firstName: data.first_name || '',
            profileType: data.profile_type || 'brand',
            creatorArchetype: data.creator_archetype ? normalizeOptionalEnum(data.creator_archetype) : '',
            brandName: data.brand_name || '',
            socialHandle: data.social_handle || '',
            niche: data.niche ? formatEnumArray(data.niche) : '',
            subNiche: data.sub_niche || data.industry || '',
            contentFocus: data.content_focus ? formatEnumArray(data.content_focus) : '',
            city: data.city || '',
            industry: data.industry ? formatEnumLabel(data.industry) : '',
            growthStage: data.growth_stage ? normalizeOptionalEnum(data.growth_stage) : '',
            creatorType: data.creator_type ? normalizeOptionalEnum(data.creator_type) : null,
            targetAudience: Array.isArray(data.target_audience)
              ? formatEnumArray(data.target_audience)
              : (data.target_audience ? formatEnumArray(data.target_audience) : ''),
            brandVoice: data.brand_voice_preference ? formatEnumLabel(data.brand_voice_preference) : '',
            platforms: data.preferred_platforms || [],
            goals: data.content_goals || [],
            // Audience expansion
            audiencePainPoint: data.audience_pain_point || '',
            audienceActionTrigger: data.audience_action_trigger || '',
            // Voice expansion
            toneChips: data.tone_chips || [],
            writingStyle: data.writing_style || '',
            examplePost: data.example_post || '',
            // Content expansion
            contentToPost: data.content_to_post || [],
            contentToAvoid: data.content_to_avoid || '',
            // Growth
            followerCount: data.follower_count || '',
            // Business-only
            primaryOffer: data.primary_offer || '',
            conversionGoal: data.conversion_goal || '',
            // Creator-only
            contentPersona: data.content_persona || '',
            monetizationGoal: data.monetization_goal || '',
            showUpStyle: data.show_up_style || '',
            // Viral content strategy fields
            contentStrengths: data.content_strengths || [],
            biggestChallenge: data.biggest_challenge ? normalizeOptionalEnum(data.biggest_challenge) : '',
            hookStylePreference: data.hook_style_preference ? normalizeOptionalEnum(data.hook_style_preference) : '',
            emotionalTriggers: data.emotional_triggers || [],
          };

          if (isActive) {
            setBrandData(mappedData);
          }
          // Also sync to localStorage as backup
          localStorage.setItem('brandData', JSON.stringify(mappedData));
          void safePreferencesPromise.then(applyPreferenceOverrides);
        } else {
          // No profile row exists — create a minimal default row so future queries succeed
          console.info('[Brand] No profile row found, inserting default for user:', user.id);
          const { error: insertError } = await supabase
            .from('user_profile')
            .upsert({ user_id: user.id, profile_type: 'brand' }, { onConflict: 'user_id' });

          if (insertError) {
            console.warn('[Brand] Default row insert failed (non-critical):', insertError.message);
          }

          applyLocalBrandFallback();
          void safePreferencesPromise.then(applyPreferenceOverrides);
        }
      } catch (error) {
        if (retryCount === 0) {
          shouldRetry = true;
          console.warn('[Brand] First load failed, retrying in 1s...');
          retryTimeoutId = setTimeout(() => {
            if (isActive) {
              fetchBrandData(1);
            }
          }, 1000);
          return;
        }

        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.error('❌ [Brand] The user_profile table does not exist! Run docs/setup/supabase-user-profile-schema.sql');
        }
        console.error('[Brand] Brand data load failed after retry:', error.message);
        applyLocalBrandFallback();
      } finally {
        if (isActive && !shouldRetry) {
          setLoading(false);
        }
      }
    };

    setLoading(true);
    fetchBrandData();

    return () => {
      isActive = false;
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
    };
  }, [user, userProfile, needsOnboarding, reloadTrigger]); // Reload when user, userProfile, or onboarding status changes

  const updateBrandData = async (newData) => {
    const updated = { ...brandData, ...newData };
    setBrandData(updated);
    
    // Save to localStorage immediately (for offline support)
    localStorage.setItem('brandData', JSON.stringify(updated));

    // Save to Supabase if user is authenticated
    if (user?.id) {
      try {
        // Complete data with all fields
        const profileData = {
          user_id: user.id,
          first_name: updated.firstName || null,
          profile_type: updated.profileType || 'brand',
          creator_archetype: normalizeOptionalEnum(updated.creatorArchetype) || null,
          brand_name: updated.brandName || null,
          social_handle: updated.socialHandle || null,
          industry: updated.industry || null,
          niche: updated.niche,
          sub_niche: updated.subNiche || null,
          target_audience: updated.targetAudience,
          brand_voice_preference: updated.brandVoice,
          preferred_platforms: updated.platforms,
          content_goals: updated.goals,
          // Audience expansion
          audience_pain_point: updated.audiencePainPoint || null,
          audience_action_trigger: updated.audienceActionTrigger || null,
          // Voice expansion
          tone_chips: updated.toneChips || [],
          writing_style: updated.writingStyle || null,
          example_post: updated.examplePost || null,
          // Content expansion
          content_to_post: updated.contentToPost || [],
          content_to_avoid: updated.contentToAvoid || null,
          // Growth
          follower_count: updated.followerCount || null,
          // Business-only
          primary_offer: updated.primaryOffer || null,
          conversion_goal: updated.conversionGoal || null,
          // Creator-only
          content_persona: updated.contentPersona || null,
          monetization_goal: updated.monetizationGoal || null,
          show_up_style: updated.showUpStyle || null,
          // Viral content strategy fields
          content_strengths: updated.contentStrengths || [],
          biggest_challenge: normalizeOptionalEnum(updated.biggestChallenge) || null,
          hook_style_preference: normalizeOptionalEnum(updated.hookStylePreference) || null,
          emotional_triggers: updated.emotionalTriggers || [],
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('user_profile')
          .upsert(profileData, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('Error saving brand data to Supabase:', error);
          return { success: false, error: error.message };
        }
        
        return { success: true };
      } catch (error) {
        console.error('Error updating brand data:', error);
        return { success: false, error: error.message };
      }
    }
    
    // Not authenticated — saved to localStorage only
    return { success: true };
  };

  const resetBrandData = async () => {
    const resetData = {
      firstName: '',
      profileType: 'brand',
      creatorArchetype: '',
      brandName: '',
      socialHandle: '',
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
    setBrandData(resetData);
    localStorage.removeItem('brandData');

    if (user?.id) {
      try {
        const resetProfileData = {
          first_name: null,
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
  };

  // Force reload brand data from Supabase (useful after onboarding)
  const refreshBrandData = () => {
    setReloadTrigger(prev => prev + 1);
  };

  return (
    <BrandContext.Provider value={{ brandData, updateBrandData, resetBrandData, refreshBrandData, loading }}>
      {children}
    </BrandContext.Provider>
  );
}

