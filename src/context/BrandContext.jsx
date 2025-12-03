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
  };
}

export function BrandProvider({ children }) {
  const { user, userProfile } = useContext(AuthContext);
  const [brandData, setBrandData] = useState({
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
          setBrandData({
            brandName: data.brand_name || '',
            niche: data.niche || '',
            industry: data.industry || '',
            targetAudience: data.target_audience || '',
            brandVoice: data.brand_voice_preference || '',
            platforms: data.preferred_platforms || [],
            goals: data.content_goals || [],
          });
          // Also sync to localStorage as backup
          localStorage.setItem('brandData', JSON.stringify({
            brandName: data.brand_name || '',
            niche: data.niche || '',
            industry: data.industry || '',
            targetAudience: data.target_audience || '',
            brandVoice: data.brand_voice_preference || '',
            platforms: data.preferred_platforms || [],
            goals: data.content_goals || [],
          }));
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
        const { error } = await supabase
          .from('user_profile')
          .upsert({
            user_id: user.id,
            niche: updated.niche,
            target_audience: updated.targetAudience,
            brand_voice_preference: updated.brandVoice,
            preferred_platforms: updated.platforms,
            content_goals: updated.goals,
            // Add new fields if they exist in your schema
            brand_name: updated.brandName,
            industry: updated.industry,
            updated_at: new Date().toISOString(),
          }, {
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
        await supabase
          .from('user_profile')
          .update({
            niche: null,
            target_audience: null,
            brand_voice_preference: null,
            preferred_platforms: [],
            content_goals: [],
            brand_name: null,
            industry: null,
          })
          .eq('user_id', user.id);
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

