import { useContext, useState, useEffect, useMemo } from 'react';
import { BrandContext } from '../context/BrandContext';
import { useToast } from '../context/ToastContext';
import { Mic2, Save, Sparkles, Briefcase, User, Check, BookOpen, Smile, PenTool, Heart, Search, Info, Eye, TrendingUp, Calendar, MessageSquare, Lightbulb, Clock, AlertCircle, HelpCircle, Rocket, Target, Zap, Users } from 'lucide-react';
// AIVoicePreview removed per requirements

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
    gradient: 'from-huttle-500 to-huttle-600'
  }
];

// Creator archetypes
const CREATOR_ARCHETYPES = [
  { value: 'educator', label: 'The Educator', description: 'Teach and explain', emoji: '📚', icon: BookOpen, color: 'from-blue-500 to-cyan-500' },
  { value: 'entertainer', label: 'The Entertainer', description: 'Make people smile', emoji: '🎭', icon: Smile, color: 'from-huttle-500 to-huttle-600' },
  { value: 'storyteller', label: 'The Storyteller', description: 'Share experiences', emoji: '✨', icon: PenTool, color: 'from-amber-500 to-orange-500' },
  { value: 'inspirer', label: 'The Inspirer', description: 'Motivate others', emoji: '🔥', icon: Heart, color: 'from-huttle-500 to-huttle-600' },
  { value: 'curator', label: 'The Curator', description: 'Discover gems', emoji: '💎', icon: Search, color: 'from-blue-500 to-cyan-500' }
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

// Content strengths - what users are best at
const CONTENT_STRENGTHS = [
  { value: 'storytelling', label: 'Storytelling', icon: PenTool },
  { value: 'education', label: 'Education', icon: BookOpen },
  { value: 'entertainment', label: 'Entertainment', icon: Smile },
  { value: 'visuals', label: 'Visuals', icon: Eye },
  { value: 'trends', label: 'Trends', icon: TrendingUp },
  { value: 'authenticity', label: 'Authenticity', icon: Heart }
];

// Biggest challenges
const CONTENT_CHALLENGES = [
  { value: 'consistency', label: 'Staying Consistent', icon: Calendar },
  { value: 'ideas', label: 'Coming Up With Ideas', icon: Lightbulb },
  { value: 'engagement', label: 'Getting Engagement', icon: MessageSquare },
  { value: 'growth', label: 'Growing My Audience', icon: TrendingUp },
  { value: 'time', label: 'Finding Time', icon: Clock },
  { value: 'quality', label: 'Creating Quality Content', icon: Sparkles }
];

// Emotional triggers - how audience should feel
const EMOTIONAL_TRIGGERS = [
  { value: 'inspired', label: 'Inspired', icon: Rocket },
  { value: 'entertained', label: 'Entertained', icon: Smile },
  { value: 'educated', label: 'Educated', icon: BookOpen },
  { value: 'connected', label: 'Connected', icon: Users },
  { value: 'motivated', label: 'Motivated', icon: Target },
  { value: 'understood', label: 'Understood', icon: Heart }
];

export default function BrandVoice() {
  const { brandData, updateBrandData, refreshBrandData } = useContext(BrandContext);
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({
    firstName: brandData?.firstName || '',
    profileType: brandData?.profileType || 'brand',
    creatorArchetype: brandData?.creatorArchetype || '',
    brandName: brandData?.brandName || '',
    socialHandle: brandData?.socialHandle || '',
    niche: brandData?.niche || '',
    industry: brandData?.industry || '',
    targetAudience: brandData?.targetAudience || '',
    brandVoice: brandData?.brandVoice || '',
    platforms: brandData?.platforms || [],
    goals: brandData?.goals || [],
    // Viral content strategy fields
    contentStrengths: brandData?.contentStrengths || [],
    biggestChallenge: brandData?.biggestChallenge || '',
    emotionalTriggers: brandData?.emotionalTriggers || []
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync form data when brandData changes (e.g., after loading)
  useEffect(() => {
    if (brandData) {
      setFormData({
        firstName: brandData.firstName || '',
        profileType: brandData.profileType || 'brand',
        creatorArchetype: brandData.creatorArchetype || '',
        brandName: brandData.brandName || '',
        socialHandle: brandData.socialHandle || '',
        niche: brandData.niche || '',
        industry: brandData.industry || '',
        targetAudience: brandData.targetAudience || '',
        brandVoice: brandData.brandVoice || '',
        platforms: brandData.platforms || [],
        goals: brandData.goals || [],
        // Viral content strategy fields
        contentStrengths: brandData.contentStrengths || [],
        biggestChallenge: brandData.biggestChallenge || '',
        emotionalTriggers: brandData.emotionalTriggers || []
      });
    }
  }, [brandData]);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify({
      firstName: brandData?.firstName || '',
      profileType: brandData?.profileType || 'brand',
      creatorArchetype: brandData?.creatorArchetype || '',
      brandName: brandData?.brandName || '',
      socialHandle: brandData?.socialHandle || '',
      niche: brandData?.niche || '',
      industry: brandData?.industry || '',
      targetAudience: brandData?.targetAudience || '',
      brandVoice: brandData?.brandVoice || '',
      platforms: brandData?.platforms || [],
      goals: brandData?.goals || [],
      // Viral content strategy fields
      contentStrengths: brandData?.contentStrengths || [],
      biggestChallenge: brandData?.biggestChallenge || '',
      emotionalTriggers: brandData?.emotionalTriggers || []
    });
    setHasUnsavedChanges(hasChanges);
  }, [formData, brandData]);

  const isCreator = formData.profileType === 'creator';

  // Calculate profile completeness
  const completeness = useMemo(() => {
    const fields = [
      { key: 'firstName', weight: 10, filled: !!formData.firstName },
      { key: 'profileType', weight: 8, filled: !!formData.profileType },
      { key: 'brandName', weight: 12, filled: !!formData.brandName },
      { key: 'niche', weight: 10, filled: !!formData.niche },
      { key: 'industry', weight: 8, filled: !!formData.industry },
      { key: 'targetAudience', weight: 10, filled: !!formData.targetAudience },
      { key: 'brandVoice', weight: 10, filled: !!formData.brandVoice },
      { key: 'platforms', weight: 8, filled: formData.platforms?.length > 0 },
      { key: 'goals', weight: 5, filled: formData.goals?.length > 0 },
      // Viral content strategy fields
      { key: 'contentStrengths', weight: 8, filled: formData.contentStrengths?.length > 0 },
      { key: 'biggestChallenge', weight: 6, filled: !!formData.biggestChallenge },
      { key: 'emotionalTriggers', weight: 6, filled: formData.emotionalTriggers?.length > 0 },
    ];
    
    if (isCreator) {
      fields.push({ key: 'creatorArchetype', weight: 8, filled: !!formData.creatorArchetype });
    }
    
    const totalWeight = fields.reduce((sum, f) => sum + f.weight, 0);
    const filledWeight = fields.reduce((sum, f) => sum + (f.filled ? f.weight : 0), 0);
    
    return Math.round((filledWeight / totalWeight) * 100);
  }, [formData, isCreator]);

  const handleSave = async () => {
    if (!formData.firstName.trim()) {
      addToast('First name is required', 'warning');
      return;
    }
    
    setIsSaving(true);
    try {
      const result = await updateBrandData(formData);
      
      if (result?.success === false) {
        addToast(result.error || 'Failed to save. Please try again.', 'error');
        return;
      }
      
      // Only refresh and mark saved after confirmed success
      refreshBrandData();
      setHasUnsavedChanges(false);
      addToast(isCreator ? 'Creator profile saved!' : 'Brand voice saved!', 'success');
    } catch (error) {
      console.error('Error saving brand data:', error);
      addToast('Something went wrong. Your changes are saved locally and will sync when the connection is restored.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const resetData = {
      firstName: '',
      profileType: 'brand',
      creatorArchetype: '',
      brandName: '',
      socialHandle: '',
      niche: '',
      industry: '',
      targetAudience: '',
      brandVoice: '',
      platforms: [],
      goals: [],
      // Viral content strategy fields
      contentStrengths: [],
      biggestChallenge: '',
      emotionalTriggers: []
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

  const handleStrengthToggle = (strength) => {
    setFormData(prev => ({
      ...prev,
      contentStrengths: prev.contentStrengths.includes(strength)
        ? prev.contentStrengths.filter(s => s !== strength)
        : [...prev.contentStrengths, strength]
    }));
  };

  const handleEmotionalTriggerToggle = (trigger) => {
    setFormData(prev => ({
      ...prev,
      emotionalTriggers: prev.emotionalTriggers.includes(trigger)
        ? prev.emotionalTriggers.filter(t => t !== trigger)
        : [...prev.emotionalTriggers, trigger]
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
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-24 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
              {isCreator ? <Sparkles className="w-7 h-7 text-huttle-primary" /> : <Mic2 className="w-7 h-7 text-huttle-primary" />}
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-gray-900 transition-all">
                {isCreator ? 'Creator Voice' : 'Brand Voice'}
              </h1>
              <p className="text-base text-gray-500 transition-all">
                {isCreator 
                  ? 'Customize AI to match your unique style and personality' 
                  : 'Customize all AI features to your brand, niche, and industry'
                }
              </p>
            </div>
          </div>
          
          {/* Completeness Ring */}
          <div className="hidden sm:flex items-center gap-4 bg-white p-2 pr-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth="4"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke={isCreator ? '#01bad2' : '#0ea5e9'}
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
            <div className="text-sm">
              <p className="font-semibold text-gray-900">Profile Status</p>
              <p className={`text-xs ${completeness === 100 ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                {completeness === 100 ? 'Complete! 🎉' : 'In Progress'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl">
        {/* Profile Type Toggle */}
        <div className="card p-6 mb-6">
          <label className="block text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">
            I create content as a:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PROFILE_TYPES.map(type => {
              const Icon = type.icon;
              const isSelected = formData.profileType === type.value;
              
              return (
                <button
                  key={type.value}
                  onClick={() => setFormData(prev => ({ ...prev, profileType: type.value }))}
                  className={`group relative flex items-center gap-4 p-5 rounded-xl border transition-all duration-300 text-left ${
                    isSelected
                      ? 'border-huttle-primary bg-white shadow-md ring-1 ring-huttle-primary'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                    isSelected 
                      ? 'bg-huttle-primary text-white shadow-lg shadow-huttle-primary/30' 
                      : 'bg-gray-50 text-gray-400 group-hover:bg-huttle-primary/10 group-hover:text-huttle-primary'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-lg transition-colors ${isSelected ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                      {type.label}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{type.description}</p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-4 right-4">
                      <div className="w-6 h-6 bg-huttle-primary rounded-full flex items-center justify-center shadow-sm">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Creator Archetype (Only for creators) */}
        {isCreator && (
          <div className="card p-6 mb-6 animate-fadeIn">
            <label className="block text-sm font-bold text-gray-900 mb-1 uppercase tracking-wide">
              Your Creator Archetype
            </label>
            <p className="text-sm text-gray-500 mb-4">This helps AI understand your unique content style</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {CREATOR_ARCHETYPES.map(archetype => {
                const isSelected = formData.creatorArchetype === archetype.value;
                const Icon = archetype.icon;
                
                return (
                  <button
                    key={archetype.value}
                    onClick={() => setFormData(prev => ({ ...prev, creatorArchetype: archetype.value }))}
                    className={`group relative p-4 rounded-xl border transition-all duration-200 text-center flex flex-col items-center ${
                      isSelected
                        ? 'border-huttle-primary bg-white shadow-md ring-1 ring-huttle-primary'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                      isSelected 
                        ? 'bg-huttle-primary/10' 
                        : 'bg-gray-50 group-hover:bg-gray-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        isSelected ? 'text-huttle-primary' : 'text-gray-500 group-hover:text-gray-700'
                      }`} />
                    </div>
                    <p className={`text-sm font-bold leading-tight ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                      {archetype.label}
                    </p>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-huttle-primary rounded-full flex items-center justify-center shadow-sm">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Form */}
        <div className="card p-6 mb-6">
          <div className="space-y-6">
            {/* First Name (required) */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 transition-all uppercase tracking-wide">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="e.g., Sarah"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-huttle-primary/50 focus:border-huttle-primary outline-none transition-all shadow-sm ${
                  !formData.firstName.trim() ? 'border-red-200' : 'border-gray-200'
                }`}
              />
              {!formData.firstName.trim() && (
                <p className="text-xs text-red-500 mt-1">First name is required</p>
              )}
            </div>

            {/* Brand Name / Handle */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 transition-all uppercase tracking-wide">
                {labels.nameLabel}
              </label>
              <input
                type="text"
                value={formData.brandName}
                onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                placeholder={labels.namePlaceholder}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-huttle-primary/50 focus:border-huttle-primary outline-none transition-all shadow-sm"
              />
            </div>

            {/* Social Media Handle (optional) */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 transition-all uppercase tracking-wide">
                Social Media Handle <span className="text-gray-400 font-normal normal-case">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.socialHandle}
                onChange={(e) => setFormData(prev => ({ ...prev, socialHandle: e.target.value }))}
                placeholder="e.g., @sarahcreates"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-huttle-primary/50 focus:border-huttle-primary outline-none transition-all shadow-sm"
              />
            </div>

            {/* Niche / Content Focus */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 transition-all uppercase tracking-wide">
                {labels.nicheLabel}
              </label>
              <input
                type="text"
                value={formData.niche}
                onChange={(e) => {
                  const value = e.target.value;
                  // Capitalize first letter
                  const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                  setFormData(prev => ({ ...prev, niche: capitalized }));
                }}
                placeholder={labels.nichePlaceholder}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-huttle-primary/50 focus:border-huttle-primary outline-none transition-all shadow-sm"
              />
            </div>

            {/* Industry / Category */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 transition-all uppercase tracking-wide">
                {labels.industryLabel}
                {isCreator && <span className="text-gray-400 font-normal ml-1 normal-case">(Optional)</span>}
              </label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => {
                  const value = e.target.value;
                  // Capitalize first letter
                  const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                  setFormData(prev => ({ ...prev, industry: capitalized }));
                }}
                placeholder={labels.industryPlaceholder}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-huttle-primary/50 focus:border-huttle-primary outline-none transition-all shadow-sm"
              />
            </div>

            {/* Target Audience / Community */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 transition-all uppercase tracking-wide">
                {labels.audienceLabel}
              </label>
              <textarea
                value={formData.targetAudience}
                onChange={(e) => {
                  const value = e.target.value;
                  // Capitalize first letter
                  const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                  setFormData(prev => ({ ...prev, targetAudience: capitalized }));
                }}
                placeholder={labels.audiencePlaceholder}
                rows="3"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-huttle-primary/50 focus:border-huttle-primary outline-none resize-none transition-all shadow-sm"
              />
            </div>

            {/* Voice & Tone / Vibe & Style */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 transition-all uppercase tracking-wide">
                {labels.voiceLabel}
              </label>
              <textarea
                value={formData.brandVoice}
                onChange={(e) => {
                  const value = e.target.value;
                  // Capitalize first letter
                  const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                  setFormData(prev => ({ ...prev, brandVoice: capitalized }));
                }}
                placeholder={labels.voicePlaceholder}
                rows="3"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-huttle-primary/50 focus:border-huttle-primary outline-none resize-none transition-all shadow-sm"
              />
            </div>

            {/* Platforms */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                Primary Platforms
              </label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(platform => {
                  const isSelected = formData.platforms.includes(platform.value);
                  return (
                    <button
                      key={platform.value}
                      onClick={() => handlePlatformToggle(platform.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                        isSelected
                          ? 'bg-huttle-primary text-white border-huttle-primary shadow-md'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
              <label className="block text-sm font-bold text-gray-900 mb-3 transition-all uppercase tracking-wide">
                Content Goals
              </label>
              <div className="flex flex-wrap gap-2">
                {goals.map(goal => {
                  const isSelected = formData.goals.includes(goal.value);
                  return (
                    <button
                      key={goal.value}
                      onClick={() => handleGoalToggle(goal.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                        isSelected
                          ? isCreator 
                            ? 'bg-gradient-to-r from-huttle-500 to-huttle-600 text-white border-transparent shadow-md'
                            : 'bg-huttle-primary text-white border-huttle-primary shadow-md'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {goal.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Viral Content Strategy Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-huttle-primary" />
              <h3 className="text-lg font-bold text-gray-900">Viral Content Strategy</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">These settings help AI create content optimized for maximum engagement and virality.</p>
            
            <div className="space-y-6">
              {/* Content Strengths */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                  Your Content Strengths
                </label>
                <p className="text-sm text-gray-500 mb-3">What are you best at? AI will emphasize these.</p>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_STRENGTHS.map(strength => {
                    const Icon = strength.icon;
                    const isSelected = formData.contentStrengths.includes(strength.value);
                    return (
                      <button
                        key={strength.value}
                        onClick={() => handleStrengthToggle(strength.value)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                          isSelected
                            ? 'bg-huttle-primary text-white border-huttle-primary shadow-md'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {strength.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Biggest Challenge */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                  Biggest Challenge
                </label>
                <p className="text-sm text-gray-500 mb-3">We'll help you overcome this.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CONTENT_CHALLENGES.map(challenge => {
                    const Icon = challenge.icon;
                    const isSelected = formData.biggestChallenge === challenge.value;
                    return (
                      <button
                        key={challenge.value}
                        onClick={() => setFormData(prev => ({ ...prev, biggestChallenge: challenge.value }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                          isSelected
                            ? 'bg-huttle-primary text-white border-huttle-primary shadow-md'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{challenge.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Emotional Triggers */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                  Emotional Triggers
                </label>
                <p className="text-sm text-gray-500 mb-3">How do you want your audience to feel?</p>
                <div className="flex flex-wrap gap-2">
                  {EMOTIONAL_TRIGGERS.map(emotion => {
                    const Icon = emotion.icon;
                    const isSelected = formData.emotionalTriggers.includes(emotion.value);
                    return (
                      <button
                        key={emotion.value}
                        onClick={() => handleEmotionalTriggerToggle(emotion.value)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                          isSelected
                            ? 'bg-huttle-primary text-white border-huttle-primary shadow-md'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {emotion.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Save/Reset Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-100">
            <button 
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              className={`flex-1 px-6 py-3 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
                !hasUnsavedChanges || isSaving
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                  : isCreator
                    ? 'bg-gradient-to-r from-huttle-500 to-huttle-600 text-white hover:shadow-lg hover:shadow-huttle-500/20'
                    : 'bg-huttle-primary text-white hover:bg-huttle-primary-dark hover:shadow-lg hover:shadow-huttle-primary/20'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {isCreator ? 'Save Creator Voice' : 'Save Brand Voice'}
                </>
              )}
            </button>
            <button 
              onClick={handleReset}
              className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          </div>
          
          {hasUnsavedChanges && (
            <p className="mt-4 text-sm text-amber-600 flex items-center justify-center gap-1.5 font-medium bg-amber-50 py-2 rounded-lg border border-amber-100">
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
                  stroke={isCreator ? '#01bad2' : '#0ea5e9'}
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

        {/* How This Helps */}
        <div className={`rounded-xl border p-5 md:p-6 transition-all duration-500 ${
          isCreator 
            ? 'bg-gradient-to-r from-huttle-50/50 to-cyan-50/50 border-huttle-200/50'
            : 'bg-gradient-to-r from-huttle-50/50 to-cyan-50/50 border-huttle-primary/20'
        }`}>
          <div className="flex items-start gap-3">
            <Sparkles className={`w-5 h-5 flex-shrink-0 mt-1 ${isCreator ? 'text-huttle-primary' : 'text-huttle-primary'}`} />
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
