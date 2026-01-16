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
        // Base data without creator_archetype (for backward compatibility)
        const baseData = {
          user_id: user.id,
          profile_type: updated.profileType || 'brand',
          niche: updated.niche,
          target_audience: updated.targetAudience,
          brand_voice_preference: updated.brandVoice,
          preferred_platforms: updated.platforms,
          content_goals: updated.goals,
          brand_name: updated.brandName,
          industry: updated.industry,
          updated_at: new Date().toISOString(),
        };

        // Try with creator_archetype first
        const dataWithArchetype = {
          ...baseData,
          creator_archetype: updated.creatorArchetype || null,
        };

        const { error } = await supabase
          .from('user_profile')
          .upsert(dataWithArchetype, {
            onConflict: 'user_id'
          });

        if (error) {
          // If error is about missing creator_archetype column, retry without it
          if (error.message?.includes('creator_archetype') || error.code === '42703') {
            console.warn('creator_archetype column not found, saving without it...');
            const { error: retryError } = await supabase
              .from('user_profile')
              .upsert(baseData, {
                onConflict: 'user_id'
              });
            
            if (retryError) {
              console.error('Error saving brand data to Supabase:', retryError);
            }
          } else {
            console.error('Error saving brand data to Supabase:', error);
          }
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
    };
    setBrandData(resetData);
    localStorage.removeItem('brandData');

    // Also reset in Supabase if user is authenticated
    if (user?.id) {
      try {
        // Base reset data without creator_archetype (for backward compatibility)
        const baseResetData = {
          profile_type: 'brand',
          niche: null,
          target_audience: null,
          brand_voice_preference: null,
          preferred_platforms: [],
          content_goals: [],
          brand_name: null,
          industry: null,
        };

        // Try with creator_archetype first
        const { error } = await supabase
          .from('user_profile')
          .update({
            ...baseResetData,
            creator_archetype: null,
          })
          .eq('user_id', user.id);

        if (error) {
          // If error is about missing creator_archetype column, retry without it
          if (error.message?.includes('creator_archetype') || error.code === '42703') {
            await supabase
              .from('user_profile')
              .update(baseResetData)
              .eq('user_id', user.id);
          }
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

