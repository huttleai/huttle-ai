import { useState, useContext } from 'react';
import { ChevronRight, ChevronLeft, Check, Sparkles, Target, Users, Calendar, MessageSquare, Rocket, TrendingUp, Palette, Zap, Briefcase, User, BookOpen, Smile, PenTool, Heart, Search } from 'lucide-react';
import { supabase } from '../config/supabase';
import { useToast } from '../context/ToastContext';
import { BrandContext } from '../context/BrandContext';

// Profile types
const PROFILE_TYPES = [
  { 
    value: 'brand', 
    label: 'Brand / Business', 
    description: 'Small business, agency, or company account',
    icon: Briefcase,
    gradient: 'from-slate-600 to-blue-600',
    bgPattern: 'bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.1),transparent_50%)]'
  },
  { 
    value: 'creator', 
    label: 'Solo Creator', 
    description: 'Building your personal brand & community',
    icon: Sparkles,
    gradient: 'from-violet-500 to-pink-500',
    bgPattern: 'bg-[radial-gradient(circle_at_70%_70%,rgba(236,72,153,0.1),transparent_50%)]'
  }
];

// Creator archetypes (for solo creators only)
const CREATOR_ARCHETYPES = [
  { value: 'educator', label: 'The Educator', description: 'You teach and explain', emoji: '📚', icon: BookOpen, color: 'from-blue-500 to-cyan-500' },
  { value: 'entertainer', label: 'The Entertainer', description: 'You make people smile', emoji: '🎭', icon: Smile, color: 'from-pink-500 to-rose-500' },
  { value: 'storyteller', label: 'The Storyteller', description: 'You share experiences', emoji: '✨', icon: PenTool, color: 'from-amber-500 to-orange-500' },
  { value: 'inspirer', label: 'The Inspirer', description: 'You motivate others', emoji: '🔥', icon: Heart, color: 'from-red-500 to-pink-500' },
  { value: 'curator', label: 'The Curator', description: 'You discover and share gems', emoji: '💎', icon: Search, color: 'from-purple-500 to-indigo-500' }
];

const NICHES = [
  { value: 'fitness', label: 'Fitness & Wellness', emoji: '💪', color: 'from-red-500 to-orange-500' },
  { value: 'food', label: 'Food & Cooking', emoji: '🍳', color: 'from-orange-500 to-yellow-500' },
  { value: 'travel', label: 'Travel & Adventure', emoji: '✈️', color: 'from-blue-500 to-cyan-500' },
  { value: 'fashion', label: 'Fashion & Beauty', emoji: '👗', color: 'from-pink-500 to-rose-500' },
  { value: 'tech', label: 'Technology & Gadgets', emoji: '💻', color: 'from-violet-500 to-purple-500' },
  { value: 'business', label: 'Business & Entrepreneurship', emoji: '💼', color: 'from-slate-600 to-slate-800' },
  { value: 'lifestyle', label: 'Lifestyle & Personal', emoji: '🌟', color: 'from-amber-500 to-yellow-500' },
  { value: 'education', label: 'Education & Learning', emoji: '📚', color: 'from-emerald-500 to-green-500' },
  { value: 'entertainment', label: 'Entertainment & Gaming', emoji: '🎮', color: 'from-purple-500 to-indigo-500' },
  { value: 'art', label: 'Art & Creativity', emoji: '🎨', color: 'from-rose-500 to-pink-500' },
  { value: 'other', label: 'Other', emoji: '📌', color: 'from-gray-500 to-gray-600' }
];

const AUDIENCES = [
  { value: 'gen-z', label: 'Gen Z (18-24)', description: 'Young, digital-native audience', icon: Zap },
  { value: 'millennials', label: 'Millennials (25-40)', description: 'Career-focused, diverse interests', icon: TrendingUp },
  { value: 'gen-x', label: 'Gen X (41-56)', description: 'Established, family-oriented', icon: Users },
  { value: 'boomers', label: 'Baby Boomers (57+)', description: 'Experienced, value-driven', icon: Target },
  { value: 'professionals', label: 'Professionals', description: 'Industry experts and leaders', icon: Sparkles },
  { value: 'entrepreneurs', label: 'Entrepreneurs', description: 'Business owners and startups', icon: Rocket },
  { value: 'students', label: 'Students', description: 'Learning-focused audience', icon: Calendar },
  { value: 'general', label: 'General Audience', description: 'Broad, mixed demographic', icon: Users }
];

// Content goals - different for brand vs creator
const BRAND_CONTENT_GOALS = [
  { value: 'grow_followers', label: 'Grow Followers', icon: Users, color: 'bg-huttle-primary' },
  { value: 'increase_engagement', label: 'Increase Engagement', icon: MessageSquare, color: 'bg-green-500' },
  { value: 'drive_sales', label: 'Drive Sales', icon: Target, color: 'bg-purple-500' },
  { value: 'build_brand', label: 'Build Brand Awareness', icon: Sparkles, color: 'bg-amber-500' },
  { value: 'educate', label: 'Educate Audience', icon: Calendar, color: 'bg-cyan-500' },
  { value: 'generate_leads', label: 'Generate Leads', icon: Rocket, color: 'bg-pink-500' }
];

const CREATOR_CONTENT_GOALS = [
  { value: 'grow_followers', label: 'Grow My Following', icon: Users, color: 'bg-huttle-primary' },
  { value: 'increase_engagement', label: 'Boost Engagement', icon: MessageSquare, color: 'bg-green-500' },
  { value: 'build_community', label: 'Build Community', icon: Heart, color: 'bg-pink-500' },
  { value: 'share_story', label: 'Share My Story', icon: PenTool, color: 'bg-amber-500' },
  { value: 'express_myself', label: 'Express Myself', icon: Sparkles, color: 'bg-purple-500' },
  { value: 'monetize', label: 'Monetize Content', icon: Target, color: 'bg-emerald-500' }
];

const POSTING_FREQUENCIES = [
  { value: 'daily', label: 'Daily', description: '7+ posts per week', icon: '🔥' },
  { value: 'frequent', label: '3-5 times per week', description: 'Regular posting schedule', icon: '⚡' },
  { value: 'moderate', label: '1-2 times per week', description: 'Consistent but flexible', icon: '✨' },
  { value: 'occasional', label: 'A few times per month', description: 'Quality over quantity', icon: '💎' }
];

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', emoji: '📸', color: 'from-pink-500 via-purple-500 to-indigo-500' },
  { value: 'facebook', label: 'Facebook', emoji: '👥', color: 'from-blue-600 to-blue-700' },
  { value: 'tiktok', label: 'TikTok', emoji: '🎵', color: 'from-gray-900 to-black' },
  { value: 'twitter', label: 'X (Twitter)', emoji: '𝕏', color: 'from-gray-800 to-black' },
  { value: 'youtube', label: 'YouTube', emoji: '▶️', color: 'from-red-600 to-red-700' }
];

const BRAND_VOICES = [
  { value: 'casual', label: 'Casual & Friendly', description: 'Relaxed, conversational tone', emoji: '😊', color: 'from-yellow-400 to-orange-400' },
  { value: 'professional', label: 'Professional & Polished', description: 'Formal, authoritative', emoji: '💼', color: 'from-slate-600 to-slate-800' },
  { value: 'humorous', label: 'Humorous & Playful', description: 'Fun, lighthearted', emoji: '😄', color: 'from-pink-500 to-rose-500' },
  { value: 'inspirational', label: 'Inspirational & Motivating', description: 'Uplifting, encouraging', emoji: '🌟', color: 'from-amber-400 to-yellow-500' },
  { value: 'educational', label: 'Educational & Informative', description: 'Clear, instructive', emoji: '📚', color: 'from-blue-500 to-cyan-500' }
];

export default function OnboardingQuiz({ onComplete }) {
  const { addToast } = useToast();
  const { updateBrandData } = useContext(BrandContext);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    profile_type: '',
    creator_archetype: '',
    niche: '',
    target_audience: '',
    content_goals: [],
    posting_frequency: '',
    preferred_platforms: [],
    brand_voice_preference: ''
  });
  const [saving, setSaving] = useState(false);

  const isCreator = formData.profile_type === 'creator';
  
  // Total steps: 7 for brand, 8 for creator (includes archetype step)
  const totalSteps = isCreator ? 8 : 7;
  const progress = (step / totalSteps) * 100;

  // Get step icons based on profile type
  const getStepIcons = () => {
    const baseIcons = [
      { icon: User, label: 'Profile' },
    ];
    
    if (isCreator) {
      baseIcons.push({ icon: Sparkles, label: 'Archetype' });
    }
    
    return [
      ...baseIcons,
      { icon: Palette, label: isCreator ? 'Focus' : 'Niche' },
      { icon: Users, label: isCreator ? 'Community' : 'Audience' },
      { icon: Target, label: 'Goals' },
      { icon: Calendar, label: 'Frequency' },
      { icon: Rocket, label: 'Platforms' },
      { icon: MessageSquare, label: isCreator ? 'Vibe' : 'Voice' }
    ];
  };

  const STEP_ICONS = getStepIcons();

  const handleMultiSelect = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  const handleNext = () => {
    // Validation based on current step
    if (step === 1 && !formData.profile_type) {
      addToast('Please select how you create content', 'warning');
      return;
    }
    
    // Archetype step for creators is optional
    const nicheStep = isCreator ? 3 : 2;
    const audienceStep = isCreator ? 4 : 3;
    const goalsStep = isCreator ? 5 : 4;
    const frequencyStep = isCreator ? 6 : 5;
    const platformsStep = isCreator ? 7 : 6;
    
    if (step === nicheStep && !formData.niche) {
      addToast(isCreator ? 'Please select your content focus' : 'Please select your content niche', 'warning');
      return;
    }
    if (step === audienceStep && !formData.target_audience) {
      addToast(isCreator ? 'Please select your community' : 'Please select your target audience', 'warning');
      return;
    }
    if (step === goalsStep && formData.content_goals.length === 0) {
      addToast('Please select at least one content goal', 'warning');
      return;
    }
    if (step === frequencyStep && !formData.posting_frequency) {
      addToast('Please select your posting frequency', 'warning');
      return;
    }
    if (step === platformsStep && formData.preferred_platforms.length === 0) {
      addToast('Please select at least one platform', 'warning');
      return;
    }

    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!formData.brand_voice_preference) {
      addToast(isCreator ? 'Please select your vibe' : 'Please select your brand voice', 'warning');
      return;
    }

    setSaving(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        throw new Error('Authentication error. Please try logging in again.');
      }
      
      if (!userData?.user) {
        throw new Error('Not authenticated. Please log in to continue.');
      }

      const userId = userData.user.id;
      console.log('Saving profile for user:', userId);

      // Prepare profile data - using upsert to handle both new users and existing rows
      // The onConflict: 'user_id' ensures we UPDATE if a row exists (e.g., from auth trigger)
      // instead of throwing a 409 Conflict error
      const profileData = {
        user_id: userId,
        profile_type: formData.profile_type,
        creator_archetype: formData.creator_archetype || null,
        niche: formData.niche,
        target_audience: formData.target_audience,
        content_goals: formData.content_goals,
        posting_frequency: formData.posting_frequency,
        preferred_platforms: formData.preferred_platforms,
        brand_voice_preference: formData.brand_voice_preference,
        quiz_completed_at: new Date().toISOString(),
        onboarding_step: totalSteps
      };

      const { data: profileResult, error: profileError } = await supabase
        .from('user_profile')
        .upsert(profileData, {
          onConflict: 'user_id',
          ignoreDuplicates: false // Ensure we update existing rows
        })
        .select();

      if (profileError) {
        console.error('Profile save error:', profileError);
        // Handle specific error codes
        if (profileError.code === '23505') {
          // Unique constraint violation - try update instead
          console.log('Duplicate detected, attempting update...');
          const { error: updateError } = await supabase
            .from('user_profile')
            .update(profileData)
            .eq('user_id', userId);
          
          if (updateError) {
            console.error('Update fallback error:', updateError);
            throw updateError;
          }
        } else {
          throw profileError;
        }
      }

      console.log('Profile saved successfully:', profileResult);

      // Update local brand context
      updateBrandData({
        profileType: formData.profile_type,
        creatorArchetype: formData.creator_archetype,
        niche: formData.niche,
        targetAudience: formData.target_audience,
        brandVoice: formData.brand_voice_preference,
        platforms: formData.preferred_platforms,
        goals: formData.content_goals,
      });

      addToast('Profile setup complete! 🎉', 'success');
      
      if (onComplete) {
        onComplete(formData);
      }

    } catch (error) {
      console.error('Error saving profile:', error);
      const errorMessage = error.message || 'Failed to save profile. Please try again.';
      addToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    // Step 1: Profile Type
    if (step === 1) {
      return (
        <div className="animate-fadeIn">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 mb-2">How do you create content?</h2>
          <p className="text-slate-500 mb-8">This helps us personalize your entire experience</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PROFILE_TYPES.map(type => {
              const Icon = type.icon;
              const isSelected = formData.profile_type === type.value;
              
              return (
                <button
                  key={type.value}
                  onClick={() => setFormData({ ...formData, profile_type: type.value, creator_archetype: '' })}
                  className={`group relative p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-50/50 shadow-lg'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-1'
                  }`}
                >
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.gradient} flex items-center justify-center mb-4 transition-transform group-hover:scale-105 ${isSelected ? 'scale-105' : ''}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{type.label}</h3>
                    <p className="text-sm text-slate-500">{type.description}</p>
                  </div>
                  
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    
    // Step 2 for Creator: Archetype Selection
    if (isCreator && step === 2) {
      return (
        <div className="animate-fadeIn">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 mb-2">What kind of creator are you?</h2>
          <p className="text-slate-500 mb-6">Pick the style that resonates most with you <span className="text-slate-400">(optional)</span></p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CREATOR_ARCHETYPES.map(archetype => {
              const isSelected = formData.creator_archetype === archetype.value;
              
              return (
                <button
                  key={archetype.value}
                  onClick={() => setFormData({ ...formData, creator_archetype: archetype.value })}
                  className={`group relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-50/50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${archetype.color} flex items-center justify-center text-lg transition-transform group-hover:scale-105 ${isSelected ? 'scale-105' : ''}`}>
                    {archetype.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{archetype.label}</p>
                    <p className="text-sm text-slate-500 truncate">{archetype.description}</p>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-cyan-500 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
          
          <p className="text-center text-sm text-slate-400 mt-4">
            This helps AI understand your unique style
          </p>
        </div>
      );
    }
    
    // Niche step
    const nicheStep = isCreator ? 3 : 2;
    if (step === nicheStep) {
      return (
        <div className="animate-fadeIn">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 mb-2">
            {isCreator ? "What's your content focus?" : "What's your content niche?"}
          </h2>
          <p className="text-slate-500 mb-6">
            {isCreator ? 'Choose what you mostly create content about' : 'Choose the category that best describes your content'}
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {NICHES.map(niche => (
              <button
                key={niche.value}
                onClick={() => setFormData({ ...formData, niche: niche.value })}
                className={`group relative p-4 rounded-xl border-2 transition-all duration-200 ${
                  formData.niche === niche.value
                    ? 'border-cyan-500 bg-cyan-50/50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-1'
                }`}
              >
                <div className={`text-2xl mb-2 transition-transform group-hover:scale-110 ${formData.niche === niche.value ? 'scale-110' : ''}`}>
                  {niche.emoji}
                </div>
                <p className="text-sm font-semibold text-slate-900">{niche.label}</p>
                {formData.niche === niche.value && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      );
    }
    
    // Audience step
    const audienceStep = isCreator ? 4 : 3;
    if (step === audienceStep) {
      return (
        <div className="animate-fadeIn">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 mb-2">
            {isCreator ? "Who's your community?" : "Who's your target audience?"}
          </h2>
          <p className="text-slate-500 mb-6">
            {isCreator ? 'Select who you want to connect with' : 'Select the primary demographic you want to reach'}
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AUDIENCES.map(audience => {
              const Icon = audience.icon;
              const isSelected = formData.target_audience === audience.value;
              return (
                <button
                  key={audience.value}
                  onClick={() => setFormData({ ...formData, target_audience: audience.value })}
                  className={`group flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-50/50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                    isSelected ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{audience.label}</p>
                    <p className="text-sm text-slate-500">{audience.description}</p>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-cyan-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    
    // Goals step
    const goalsStep = isCreator ? 5 : 4;
    if (step === goalsStep) {
      const goals = isCreator ? CREATOR_CONTENT_GOALS : BRAND_CONTENT_GOALS;
      
      return (
        <div className="animate-fadeIn">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 mb-2">What are your content goals?</h2>
          <p className="text-slate-500 mb-6">Select all that apply (choose at least one)</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {goals.map(goal => {
              const Icon = goal.icon;
              const isSelected = formData.content_goals.includes(goal.value);
              
              return (
                <button
                  key={goal.value}
                  onClick={() => handleMultiSelect('content_goals', goal.value)}
                  className={`group relative p-4 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-50/50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-1'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-lg ${goal.color} flex items-center justify-center mx-auto mb-3 transition-transform group-hover:scale-105 ${isSelected ? 'scale-105' : ''}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 text-center">{goal.label}</p>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    
    // Frequency step
    const frequencyStep = isCreator ? 6 : 5;
    if (step === frequencyStep) {
      return (
        <div className="animate-fadeIn">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 mb-2">How often do you plan to post?</h2>
          <p className="text-slate-500 mb-6">This helps us tailor content suggestions to your schedule</p>
          
          <div className="space-y-3">
            {POSTING_FREQUENCIES.map(freq => {
              const isSelected = formData.posting_frequency === freq.value;
              return (
                <button
                  key={freq.value}
                  onClick={() => setFormData({ ...formData, posting_frequency: freq.value })}
                  className={`group w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-50/50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-xl transition-transform group-hover:scale-105 ${
                    isSelected ? 'scale-105 bg-cyan-100' : ''
                  }`}>
                    {freq.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{freq.label}</p>
                    <p className="text-sm text-slate-500">{freq.description}</p>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-cyan-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    
    // Platforms step
    const platformsStep = isCreator ? 7 : 6;
    if (step === platformsStep) {
      return (
        <div className="animate-fadeIn">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 mb-2">Which platforms do you use?</h2>
          <p className="text-slate-500 mb-6">Select all platforms you create content for</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PLATFORMS.map(platform => {
              const isSelected = formData.preferred_platforms.includes(platform.value);
              
              return (
                <button
                  key={platform.value}
                  onClick={() => handleMultiSelect('preferred_platforms', platform.value)}
                  className={`group relative p-5 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-50/50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-1'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center mx-auto mb-3 text-xl transition-transform group-hover:scale-105 ${isSelected ? 'scale-105' : ''}`}>
                    <span className="text-white">{platform.emoji}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 text-center">{platform.label}</p>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    
    // Voice step (final)
    const voiceStep = isCreator ? 8 : 7;
    if (step === voiceStep) {
      return (
        <div className="animate-fadeIn">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 mb-2">
            {isCreator ? "What's your vibe?" : "What's your brand voice?"}
          </h2>
          <p className="text-slate-500 mb-6">
            {isCreator ? 'Choose the tone that feels most like you' : 'Choose the tone that best matches your content style'}
          </p>
          
          <div className="space-y-3">
            {BRAND_VOICES.map(voice => {
              const isSelected = formData.brand_voice_preference === voice.value;
              return (
                <button
                  key={voice.value}
                  onClick={() => setFormData({ ...formData, brand_voice_preference: voice.value })}
                  className={`group w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-50/50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${voice.color} flex items-center justify-center text-xl transition-transform group-hover:scale-105 ${
                    isSelected ? 'scale-105' : ''
                  }`}>
                    {voice.emoji}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{voice.label}</p>
                    <p className="text-sm text-slate-500">{voice.description}</p>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-cyan-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Premium Light Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
        {/* Subtle decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-cyan-100/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-slate-100/60 to-transparent rounded-full blur-3xl" />
        
        {/* Subtle dot pattern */}
        <div 
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `radial-gradient(circle, #cbd5e1 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            {/* Clean Header */}
            <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-5 bg-white border-b border-slate-100">
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                  isCreator 
                    ? 'bg-gradient-to-br from-violet-500 to-pink-500' 
                    : 'bg-gradient-to-br from-cyan-500 to-huttle-primary'
                }`}>
                  {isCreator ? <Sparkles className="w-5 h-5 text-white" /> : <Briefcase className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-900">
                    {step === 1 ? "Let's Personalize Your Experience" : isCreator ? "Building Your Creator Profile" : "Setting Up Your Brand"}
                  </h1>
                  <p className="text-slate-500 text-sm">
                    {step === 1 ? 'First, tell us how you create content' : 'Help us tailor AI suggestions just for you'}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      isCreator 
                        ? 'bg-gradient-to-r from-violet-500 to-pink-500' 
                        : 'bg-gradient-to-r from-cyan-500 to-huttle-primary'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-500 tabular-nums">
                  {step}/{totalSteps}
                </span>
              </div>

              {/* Step Indicators */}
              <div className="flex items-center justify-between mt-4 gap-1">
                {STEP_ICONS.map((stepItem, index) => {
                  const StepIcon = stepItem.icon;
                  const stepNum = index + 1;
                  const isActive = stepNum === step;
                  const isCompleted = stepNum < step;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${
                        isActive 
                          ? isCreator 
                            ? 'bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-md' 
                            : 'bg-gradient-to-br from-cyan-500 to-huttle-primary text-white shadow-md'
                          : isCompleted 
                            ? 'bg-emerald-100 text-emerald-600' 
                            : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                      </div>
                      <span className={`text-[10px] mt-1.5 hidden sm:block font-medium ${
                        isActive ? 'text-slate-900' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                      }`}>
                        {stepItem.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step Content */}
            <div className="p-6 sm:p-8 min-h-[420px] bg-white">
              {renderStepContent()}
            </div>

            {/* Footer with Navigation */}
            <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-4 bg-slate-50/50 border-t border-slate-100 flex gap-3">
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              
              {step < totalSteps ? (
                <button
                  onClick={handleNext}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                    isCreator 
                      ? 'bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600' 
                      : 'bg-gradient-to-r from-cyan-500 to-huttle-primary hover:from-cyan-600 hover:to-huttle-primary-dark'
                  }`}
                >
                  {isCreator && step === 2 && !formData.creator_archetype ? 'Skip' : 'Continue'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Complete Setup
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
