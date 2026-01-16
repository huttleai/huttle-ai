import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../config/supabase';
import { AuthContext } from './AuthContext';

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
    loading: context.loading,
    // Convenience helpers for profile type
    isCreator: context.brandData?.profileType === 'creator',
    isBrand: context.brandData?.profileType === 'brand' || !context.brandData?.profileType,
  };
}

export function BrandProvider({ children }) {
  const { user, userProfile } = useContext(AuthContext);
  const [brandData, setBrandData] = useState({
    profileType: 'brand', // 'brand' or 'creator'
    creatorArchetype: '', // 'educator', 'entertainer', 'storyteller', 'inspirer', 'curator'
    brandName: '',
    niche: '',
    industry: '',
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

  // Load brand data from Supabase user_profile table
  useEffect(() => {
    const loadBrandData = async () => {
      if (!user) {
        // Fallback to localStorage if no user
        const savedBrand = localStorage.getItem('brandData');
        if (savedBrand) {
          setBrandData(JSON.parse(savedBrand));
        }
        setLoading(false);
        return;
      }

      try {
        // Load from Supabase user_profile table
        const { data, error } = await supabase
          .from('user_profile')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading user profile:', error);
          // Fallback to localStorage
          const savedBrand = localStorage.getItem('brandData');
          if (savedBrand) {
            setBrandData(JSON.parse(savedBrand));
          }
        } else if (data) {
          // Map user_profile fields to brandData structure
          const mappedData = {
            profileType: data.profile_type || 'brand',
            creatorArchetype: data.creator_archetype || '',
            brandName: data.brand_name || '',
            niche: data.niche || '',
            industry: data.industry || '',
            targetAudience: data.target_audience || '',
            brandVoice: data.brand_voice_preference || '',
            platforms: data.preferred_platforms || [],
            goals: data.content_goals || [],
            // Viral content strategy fields
            contentStrengths: data.content_strengths || [],
            biggestChallenge: data.biggest_challenge || '',
            hookStylePreference: data.hook_style_preference || '',
            emotionalTriggers: data.emotional_triggers || [],
          };
          setBrandData(mappedData);
          // Also sync to localStorage as backup
          localStorage.setItem('brandData', JSON.stringify(mappedData));
        } else {
          // No profile found, try localStorage
          const savedBrand = localStorage.getItem('brandData');
          if (savedBrand) {
            setBrandData(JSON.parse(savedBrand));
          }
        }
      } catch (error) {
        console.error('Error loading brand data:', error);
        // Fallback to localStorage
        const savedBrand = localStorage.getItem('brandData');
        if (savedBrand) {
          setBrandData(JSON.parse(savedBrand));
        }
      } finally {
        setLoading(false);
      }
    };

    loadBrandData();
  }, [user, userProfile]); // Reload when user or userProfile changes

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
          profile_type: updated.profileType || 'brand',
          creator_archetype: updated.creatorArchetype || null,
          brand_name: updated.brandName || null,
          industry: updated.industry || null,
          niche: updated.niche,
          target_audience: updated.targetAudience,
          brand_voice_preference: updated.brandVoice,
          preferred_platforms: updated.platforms,
          content_goals: updated.goals,
          // Viral content strategy fields
          content_strengths: updated.contentStrengths || [],
          biggest_challenge: updated.biggestChallenge || null,
          hook_style_preference: updated.hookStylePreference || null,
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
          // Data is still saved to localStorage, so user can continue
        }
      } catch (error) {
        console.error('Error updating brand data:', error);
        // Data is still saved to localStorage
      }
    }
  };

  const resetBrandData = async () => {
    const resetData = {
      profileType: 'brand',
      creatorArchetype: '',
      brandName: '',
      niche: '',
      industry: '',
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
          profile_type: 'brand',
          creator_archetype: null,
          brand_name: null,
          industry: null,
          niche: null,
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

  return (
    <BrandContext.Provider value={{ brandData, updateBrandData, resetBrandData, loading }}>
      {children}
    </BrandContext.Provider>
  );
}

