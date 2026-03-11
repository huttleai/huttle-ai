import { createContext, useState, useEffect, useContext } from 'react';
import { supabase, getUserPreferences } from '../config/supabase';
import { AuthContext } from './AuthContext';
import { formatEnumLabel, formatEnumArray, normalizeEnumValue } from '../utils/formatEnumLabel';

export const BrandContext = createContext();

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
    isBrand: context.brandData?.profileType === 'brand' || !context.brandData?.profileType,
  };
}

export function BrandProvider({ children }) {
  const { user, userProfile, needsOnboarding } = useContext(AuthContext);
  const [brandData, setBrandData] = useState({
    firstName: '', // User first name from onboarding
    profileType: 'brand', // 'brand' or 'creator'
    creatorArchetype: '', // 'educator', 'entertainer', 'storyteller', 'inspirer', 'curator'
    brandName: '',
    niche: '',
    contentFocus: '',
    city: '',
    industry: '',
    growthStage: '',
    creatorType: null,
    targetAudience: '',
    brandVoice: '',
    platforms: [],
    goals: [],
    // Viral content strategy fields
    contentStrengths: [], // What user is best at
    biggestChallenge: '', // Main content struggle
    hookStylePreference: '', // Preferred hook style for viral content
    emotionalTriggers: [], // How they want audience to feel
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
        // Load from Supabase user_profile table
        // Use maybeSingle() instead of single() for new users who might not have a profile yet
        // Add timeout protection to prevent hanging queries
        const QUERY_TIMEOUT_MS = 8000;
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Brand data query timed out')), QUERY_TIMEOUT_MS);
        });

        const queryPromise = supabase
          .from('user_profile')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        const [{ data, error }, preferencesResult] = await Promise.all([
          Promise.race([queryPromise, timeoutPromise]),
          getUserPreferences(user.id),
        ]);

        if (error) {
          throw error;
        }

        const userPreferences = preferencesResult?.success && preferencesResult.data
          ? preferencesResult.data
          : {};

        if (data) {
          // Map user_profile fields to brandData structure
          // Apply formatEnumLabel to convert snake_case values to human-readable labels
          const mappedData = {
            firstName: data.first_name || '',
            profileType: data.profile_type || 'brand',
            creatorArchetype: data.creator_archetype ? normalizeOptionalEnum(data.creator_archetype) : '',
            brandName: data.brand_name || '',
            niche: data.niche ? formatEnumArray(data.niche) : '',
            contentFocus: userPreferences.content_focus
              ? formatEnumArray(userPreferences.content_focus)
              : (data.content_focus ? formatEnumArray(data.content_focus) : ''),
            city: data.city || '',
            industry: data.industry ? formatEnumLabel(data.industry) : '',
            growthStage: userPreferences.growth_stage
              ? normalizeOptionalEnum(userPreferences.growth_stage)
              : (data.growth_stage ? normalizeOptionalEnum(data.growth_stage) : ''),
            creatorType: userPreferences.creator_type
              ? normalizeOptionalEnum(userPreferences.creator_type)
              : (data.creator_type ? normalizeOptionalEnum(data.creator_type) : null),
            targetAudience: Array.isArray(data.target_audience)
              ? formatEnumArray(data.target_audience)
              : (data.target_audience ? formatEnumArray(data.target_audience) : ''),
            brandVoice: data.brand_voice_preference ? formatEnumLabel(data.brand_voice_preference) : '',
            platforms: data.preferred_platforms || [],
            goals: data.content_goals || [],
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
        } else {
          // No profile found, try localStorage
          applyLocalBrandFallback();
        }
      } catch (error) {
        if (retryCount === 0) {
          shouldRetry = true;
          console.warn('[Brand] First load failed, retrying in 3s...');
          retryTimeoutId = setTimeout(() => {
            if (isActive) {
              fetchBrandData(1);
            }
          }, 3000);
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
          industry: updated.industry || null,
          niche: updated.niche,
          city: updated.city || null,
          target_audience: updated.targetAudience,
          brand_voice_preference: updated.brandVoice,
          preferred_platforms: updated.platforms,
          content_goals: updated.goals,
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
      niche: '',
      contentFocus: '',
      city: '',
      industry: '',
      growthStage: '',
      creatorType: null,
      targetAudience: '',
      brandVoice: '',
      platforms: [],
      goals: [],
      // Viral content strategy fields
      contentStrengths: [],
      biggestChallenge: '',
      hookStylePreference: '',
      emotionalTriggers: [],
    };
    setBrandData(resetData);
    localStorage.removeItem('brandData');

    // Also reset in Supabase if user is authenticated
    if (user?.id) {
      try {
        const resetProfileData = {
          first_name: null,
          profile_type: 'brand',
          creator_archetype: null,
          brand_name: null,
          industry: null,
          niche: null,
          city: null,
          target_audience: null,
          brand_voice_preference: null,
          preferred_platforms: [],
          content_goals: [],
          // Viral content strategy fields
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

