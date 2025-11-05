import { useContext, useState } from 'react';
import { BrandContext } from '../context/BrandContext';
import { useToast } from '../context/ToastContext';
import { Waves, Save, Sparkles } from 'lucide-react';

export default function BrandVoice() {
  const { brandData, updateBrandData } = useContext(BrandContext);
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({
    brandName: brandData?.brandName || '',
    niche: brandData?.niche || '',
    industry: brandData?.industry || '',
    targetAudience: brandData?.targetAudience || '',
    brandVoice: brandData?.brandVoice || '',
    platforms: brandData?.platforms || [],
    goals: brandData?.goals || []
  });

  const handleSave = () => {
    updateBrandData(formData);
    addToast('Brand Voice saved successfully!', 'success');
  };

  const handleReset = () => {
    setFormData({
      brandName: '',
      niche: '',
      industry: '',
      targetAudience: '',
      brandVoice: '',
      platforms: [],
      goals: []
    });
    addToast('Form reset successfully', 'info');
  };

  return (
    <div className="flex-1 bg-gray-50 ml-0 lg:ml-64 pt-20 px-4 md:px-8 pb-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Brand Voice
        </h1>
        <p className="text-gray-600">
          Customize all AI features to your brand, niche, and industry
        </p>
      </div>

      <div className="max-w-3xl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Name
              </label>
              <input
                type="text"
                value={formData.brandName}
                onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                placeholder="e.g., Glow MedSpa"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Niche
              </label>
              <input
                type="text"
                value={formData.niche}
                onChange={(e) => setFormData(prev => ({ ...prev, niche: e.target.value }))}
                placeholder="e.g., Medical Spa, Fitness, Beauty"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry
              </label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                placeholder="e.g., Healthcare, Wellness, Fashion"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience
              </label>
              <textarea
                value={formData.targetAudience}
                onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                placeholder="e.g., Women aged 25-45 interested in anti-aging treatments"
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Voice & Tone
              </label>
              <textarea
                value={formData.brandVoice}
                onChange={(e) => setFormData(prev => ({ ...prev, brandVoice: e.target.value }))}
                placeholder="e.g., Professional yet friendly, empowering, educational"
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Platforms
              </label>
              <div className="flex flex-wrap gap-3">
                {['Instagram', 'TikTok', 'YouTube', 'Facebook', 'LinkedIn', 'Twitter'].map(platform => (
                  <label key={platform} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-huttle-primary border-gray-300 rounded focus:ring-huttle-primary"
                    />
                    <span className="text-sm text-gray-700">{platform}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Goals
              </label>
              <div className="space-y-2">
                {['Increase brand awareness', 'Drive sales', 'Build community', 'Educate audience'].map(goal => (
                  <label key={goal} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-huttle-primary border-gray-300 rounded focus:ring-huttle-primary"
                    />
                    <span className="text-sm text-gray-700">{goal}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save Brand Voice
            </button>
            <button 
              onClick={handleReset}
              className="px-6 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-huttle-primary/10 to-huttle-primary-light/10 rounded-xl border border-huttle-primary/20 p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-huttle-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How This Helps</h3>
              <p className="text-sm text-gray-700">
                Your brand settings personalize all AI-generated content across Huttle AI. Trend Lab, 
                AI Plan Builder, and Huttle Agent will tailor suggestions specifically to your niche and voice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

