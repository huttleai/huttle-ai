import { useContext, useState, useEffect, useMemo } from 'react';
import { BrandContext } from '../context/BrandContext';
import { useToast } from '../context/ToastContext';
import { Mic2, Save, Sparkles, Briefcase, User, Check, BookOpen, Smile, PenTool, Heart, Search, Info } from 'lucide-react';
import AIVoicePreview from '../components/AIVoicePreview';

// Profile types
const PROFILE_TYPES = [
  { 
    value: 'brand', 
    label: 'Brand / Business', 
    description: 'Small business, agency, or company',
    icon: Briefcase,
    gradient: 'from-slate-600 to-blue-600'
  },
  { 
    value: 'creator', 
    label: 'Solo Creator', 
    description: 'Building your personal brand',
    icon: Sparkles,
    gradient: 'from-violet-500 to-pink-500'
  }
];

// Creator archetypes
const CREATOR_ARCHETYPES = [
  { value: 'educator', label: 'The Educator', description: 'Teach and explain', emoji: '📚', icon: BookOpen, color: 'from-blue-500 to-cyan-500' },
  { value: 'entertainer', label: 'The Entertainer', description: 'Make people smile', emoji: '🎭', icon: Smile, color: 'from-pink-500 to-rose-500' },
  { value: 'storyteller', label: 'The Storyteller', description: 'Share experiences', emoji: '✨', icon: PenTool, color: 'from-amber-500 to-orange-500' },
  { value: 'inspirer', label: 'The Inspirer', description: 'Motivate others', emoji: '🔥', icon: Heart, color: 'from-red-500 to-pink-500' },
  { value: 'curator', label: 'The Curator', description: 'Discover gems', emoji: '💎', icon: Search, color: 'from-purple-500 to-indigo-500' }
];

// Platform options
const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'X (Twitter)' }
];

// Goals for brands
const BRAND_GOALS = [
  { value: 'brand_awareness', label: 'Increase brand awareness' },
  { value: 'drive_sales', label: 'Drive sales' },
  { value: 'build_community', label: 'Build community' },
  { value: 'educate_audience', label: 'Educate audience' },
  { value: 'generate_leads', label: 'Generate leads' }
];

// Goals for creators
const CREATOR_GOALS = [
  { value: 'grow_following', label: 'Grow my following' },
  { value: 'boost_engagement', label: 'Boost engagement' },
  { value: 'build_community', label: 'Build community' },
  { value: 'share_story', label: 'Share my story' },
  { value: 'monetize', label: 'Monetize content' }
];

export default function BrandVoice() {
  const { brandData, updateBrandData } = useContext(BrandContext);
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({
    profileType: brandData?.profileType || 'brand',
    creatorArchetype: brandData?.creatorArchetype || '',
    brandName: brandData?.brandName || '',
    niche: brandData?.niche || '',
    industry: brandData?.industry || '',
    targetAudience: brandData?.targetAudience || '',
    brandVoice: brandData?.brandVoice || '',
    platforms: brandData?.platforms || [],
    goals: brandData?.goals || []
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync form data when brandData changes (e.g., after loading)
  useEffect(() => {
    if (brandData) {
      setFormData({
        profileType: brandData.profileType || 'brand',
        creatorArchetype: brandData.creatorArchetype || '',
        brandName: brandData.brandName || '',
        niche: brandData.niche || '',
        industry: brandData.industry || '',
        targetAudience: brandData.targetAudience || '',
        brandVoice: brandData.brandVoice || '',
        platforms: brandData.platforms || [],
        goals: brandData.goals || []
      });
    }
  }, [brandData]);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify({
      profileType: brandData?.profileType || 'brand',
      creatorArchetype: brandData?.creatorArchetype || '',
      brandName: brandData?.brandName || '',
      niche: brandData?.niche || '',
      industry: brandData?.industry || '',
      targetAudience: brandData?.targetAudience || '',
      brandVoice: brandData?.brandVoice || '',
      platforms: brandData?.platforms || [],
      goals: brandData?.goals || []
    });
    setHasUnsavedChanges(hasChanges);
  }, [formData, brandData]);

  const isCreator = formData.profileType === 'creator';

  // Calculate profile completeness
  const completeness = useMemo(() => {
    const fields = [
      { key: 'profileType', weight: 10, filled: !!formData.profileType },
      { key: 'brandName', weight: 20, filled: !!formData.brandName },
      { key: 'niche', weight: 15, filled: !!formData.niche },
      { key: 'industry', weight: 10, filled: !!formData.industry },
      { key: 'targetAudience', weight: 15, filled: !!formData.targetAudience },
      { key: 'brandVoice', weight: 15, filled: !!formData.brandVoice },
      { key: 'platforms', weight: 10, filled: formData.platforms?.length > 0 },
      { key: 'goals', weight: 5, filled: formData.goals?.length > 0 },
    ];
    
    if (isCreator) {
      fields.push({ key: 'creatorArchetype', weight: 10, filled: !!formData.creatorArchetype });
    }
    
    const totalWeight = fields.reduce((sum, f) => sum + f.weight, 0);
    const filledWeight = fields.reduce((sum, f) => sum + (f.filled ? f.weight : 0), 0);
    
    return Math.round((filledWeight / totalWeight) * 100);
  }, [formData, isCreator]);

  const handleSave = () => {
    updateBrandData(formData);
    setHasUnsavedChanges(false);
    addToast(isCreator ? 'Creator profile saved!' : 'Brand voice saved!', 'success');
  };

  const handleReset = () => {
    const resetData = {
      profileType: 'brand',
      creatorArchetype: '',
      brandName: '',
      niche: '',
      industry: '',
      targetAudience: '',
      brandVoice: '',
      platforms: [],
      goals: []
    };
    setFormData(resetData);
    addToast('Form reset successfully', 'info');
  };

  const handlePlatformToggle = (platform) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const handleGoalToggle = (goal) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }));
  };

  // Get labels based on profile type
  const labels = {
    nameLabel: isCreator ? 'Your Name or Handle' : 'Brand Name',
    namePlaceholder: isCreator ? 'e.g., Sarah Johnson or @sarahcreates' : 'e.g., Glow MedSpa',
    nicheLabel: isCreator ? 'Content Focus' : 'Niche',
    nichePlaceholder: isCreator ? 'e.g., Lifestyle, Fitness, Comedy' : 'e.g., Medical Spa, Fitness, Beauty',
    industryLabel: isCreator ? 'Category' : 'Industry',
    industryPlaceholder: isCreator ? 'e.g., Entertainment, Health & Wellness' : 'e.g., Healthcare, Wellness, Fashion',
    audienceLabel: isCreator ? 'Your Community' : 'Target Audience',
    audiencePlaceholder: isCreator ? 'e.g., Young adults who love authentic lifestyle content' : 'e.g., Women aged 25-45 interested in anti-aging treatments',
    voiceLabel: isCreator ? 'Your Vibe & Style' : 'Brand Voice & Tone',
    voicePlaceholder: isCreator ? 'e.g., Authentic, relatable, fun, conversational' : 'e.g., Professional yet friendly, empowering, educational',
  };

  const goals = isCreator ? CREATOR_GOALS : BRAND_GOALS;

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-20 px-4 md:px-6 lg:px-8 pb-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 ${
              isCreator 
                ? 'bg-gradient-to-br from-violet-500 to-pink-500 shadow-pink-500/20' 
                : 'bg-huttle-gradient shadow-huttle-blue/20'
            }`}>
              {isCreator ? <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-white" /> : <Mic2 className="w-6 h-6 md:w-7 md:h-7 text-white" />}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900 transition-all">
                {isCreator ? 'Creator Voice' : 'Brand Voice'}
              </h1>
              <p className="text-sm md:text-base text-gray-500 transition-all">
                {isCreator 
                  ? 'Customize AI to match your unique style and personality' 
                  : 'Customize all AI features to your brand, niche, and industry'
                }
              </p>
            </div>
          </div>
          
          {/* Completeness Ring */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="relative w-14 h-14">
              <svg className="w-14 h-14 transform -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="4"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  stroke={isCreator ? '#ec4899' : '#0ea5e9'}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${completeness * 1.508} 150.8`}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-bold ${completeness === 100 ? 'text-green-600' : 'text-gray-700'}`}>
                  {completeness}%
                </span>
              </div>
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-700">Profile</p>
              <p className={`${completeness === 100 ? 'text-green-600' : 'text-gray-500'}`}>
                {completeness === 100 ? 'Complete! 🎉' : 'Completeness'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl">
        {/* Profile Type Toggle */}
        <div className="card p-5 md:p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            I create content as a:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROFILE_TYPES.map(type => {
              const Icon = type.icon;
              const isSelected = formData.profileType === type.value;
              
              return (
                <button
                  key={type.value}
                  onClick={() => setFormData(prev => ({ ...prev, profileType: type.value }))}
                  className={`group relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                    isSelected
                      ? 'border-huttle-primary bg-huttle-50/50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${type.gradient} flex items-center justify-center transition-transform group-hover:scale-105 ${isSelected ? 'scale-105' : ''}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold transition-colors ${isSelected ? 'text-huttle-primary' : 'text-gray-900'}`}>
                      {type.label}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{type.description}</p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 bg-huttle-primary rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Creator Archetype (Only for creators) */}
        {isCreator && (
          <div className="card p-5 md:p-6 mb-6 animate-fadeIn">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Creator Archetype
            </label>
            <p className="text-xs text-gray-500 mb-4">This helps AI understand your unique content style</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {CREATOR_ARCHETYPES.map(archetype => {
                const isSelected = formData.creatorArchetype === archetype.value;
                
                return (
                  <button
                    key={archetype.value}
                    onClick={() => setFormData(prev => ({ ...prev, creatorArchetype: archetype.value }))}
                    className={`group relative p-3 rounded-xl border-2 transition-all duration-200 text-center ${
                      isSelected
                        ? 'border-huttle-primary bg-huttle-50/50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 mx-auto rounded-lg bg-gradient-to-br ${archetype.color} flex items-center justify-center text-lg mb-2 transition-transform group-hover:scale-110 ${isSelected ? 'scale-110' : ''}`}>
                      {archetype.emoji}
                    </div>
                    <p className="text-xs font-medium text-gray-900 leading-tight">{archetype.label}</p>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-huttle-primary rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Form */}
        <div className="card p-5 md:p-6 mb-6">
          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all">
                {labels.nameLabel}
              </label>
              <input
                type="text"
                value={formData.brandName}
                onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                placeholder={labels.namePlaceholder}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Niche / Content Focus */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all">
                {labels.nicheLabel}
              </label>
              <input
                type="text"
                value={formData.niche}
                onChange={(e) => setFormData(prev => ({ ...prev, niche: e.target.value }))}
                placeholder={labels.nichePlaceholder}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Industry / Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all">
                {labels.industryLabel}
                {isCreator && <span className="text-gray-400 font-normal ml-1">(Optional)</span>}
              </label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                placeholder={labels.industryPlaceholder}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Target Audience / Community */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all">
                {labels.audienceLabel}
              </label>
              <textarea
                value={formData.targetAudience}
                onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                placeholder={labels.audiencePlaceholder}
                rows="3"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none resize-none transition-all"
              />
            </div>

            {/* Voice & Tone / Vibe & Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 transition-all">
                {labels.voiceLabel}
              </label>
              <textarea
                value={formData.brandVoice}
                onChange={(e) => setFormData(prev => ({ ...prev, brandVoice: e.target.value }))}
                placeholder={labels.voicePlaceholder}
                rows="3"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none resize-none transition-all"
              />
            </div>

            {/* Platforms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Primary Platforms
              </label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(platform => {
                  const isSelected = formData.platforms.includes(platform.value);
                  return (
                    <button
                      key={platform.value}
                      onClick={() => handlePlatformToggle(platform.value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-huttle-primary text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {platform.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Goals */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 transition-all">
                Content Goals
              </label>
              <div className="flex flex-wrap gap-2">
                {goals.map(goal => {
                  const isSelected = formData.goals.includes(goal.value);
                  return (
                    <button
                      key={goal.value}
                      onClick={() => handleGoalToggle(goal.value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        isSelected
                          ? isCreator 
                            ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-md'
                            : 'bg-huttle-primary text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {goal.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Save/Reset Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button 
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className={`btn-primary ${!hasUnsavedChanges ? 'opacity-50 cursor-not-allowed' : ''} ${
                isCreator ? 'bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600' : ''
              }`}
            >
              <Save className="w-4 h-4" />
              {isCreator ? 'Save Creator Voice' : 'Save Brand Voice'}
            </button>
            <button 
              onClick={handleReset}
              className="btn-secondary"
            >
              Reset
            </button>
          </div>
          
          {hasUnsavedChanges && (
            <p className="mt-3 text-sm text-amber-600 flex items-center gap-1">
              <Info className="w-4 h-4" />
              You have unsaved changes
            </p>
          )}
        </div>

        {/* Mobile Completeness */}
        <div className="sm:hidden card p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke={isCreator ? '#ec4899' : '#0ea5e9'}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${completeness * 1.256} 125.6`}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xs font-bold ${completeness === 100 ? 'text-green-600' : 'text-gray-700'}`}>
                  {completeness}%
                </span>
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-900">Profile Completeness</p>
              <p className="text-sm text-gray-500">
                {completeness === 100 
                  ? 'Your profile is complete! 🎉' 
                  : 'Complete your profile for better AI suggestions'
                }
              </p>
            </div>
          </div>
        </div>

        {/* AI Voice Preview */}
        <div className="mb-6">
          <AIVoicePreview brandData={formData} isCreator={isCreator} />
        </div>

        {/* How This Helps */}
        <div className={`rounded-xl border p-5 md:p-6 transition-all duration-500 ${
          isCreator 
            ? 'bg-gradient-to-r from-violet-50/50 to-pink-50/50 border-pink-200/50'
            : 'bg-gradient-to-r from-huttle-50/50 to-cyan-50/50 border-huttle-primary/20'
        }`}>
          <div className="flex items-start gap-3">
            <Sparkles className={`w-5 h-5 flex-shrink-0 mt-1 ${isCreator ? 'text-pink-500' : 'text-huttle-primary'}`} />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How This Helps</h3>
              <p className="text-sm text-gray-700">
                {isCreator 
                  ? 'Your creator profile personalizes all AI-generated content across Huttle AI. Trend Lab and AI Plan Builder will match your unique voice and connect authentically with your community.'
                  : 'Your brand settings personalize all AI-generated content across Huttle AI. Trend Lab and AI Plan Builder will tailor suggestions specifically to your niche and voice.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
