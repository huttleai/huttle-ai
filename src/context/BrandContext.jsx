import { createContext, useState, useEffect, useContext } from 'react';

export const BrandContext = createContext();

// Custom hook to use BrandContext
export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return {
    brandProfile: context.brandData, // Map brandData to brandProfile for compatibility
    updateBrandData: context.updateBrandData,
    resetBrandData: context.resetBrandData,
  };
}

export function BrandProvider({ children }) {
  const [brandData, setBrandData] = useState({
    brandName: '',
    niche: '',
    industry: '',
    targetAudience: '',
    brandVoice: '',
    platforms: [],
    goals: [],
  });

  useEffect(() => {
    // Load brand data from localStorage or API
    const savedBrand = localStorage.getItem('brandData');
    if (savedBrand) {
      setBrandData(JSON.parse(savedBrand));
    }
  }, []);

  const updateBrandData = (newData) => {
    const updated = { ...brandData, ...newData };
    setBrandData(updated);
    localStorage.setItem('brandData', JSON.stringify(updated));
  };

  const resetBrandData = () => {
    setBrandData({
      brandName: '',
      niche: '',
      industry: '',
      targetAudience: '',
      brandVoice: '',
      platforms: [],
      goals: [],
    });
    localStorage.removeItem('brandData');
  };

  return (
    <BrandContext.Provider value={{ brandData, updateBrandData, resetBrandData }}>
      {children}
    </BrandContext.Provider>
  );
}

