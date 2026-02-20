import { useState, useEffect, useContext } from 'react';
import { ChevronRight, ChevronLeft, Check, Sparkles, Target, Users, Calendar, MessageSquare, Rocket, TrendingUp, Palette, Zap, Briefcase, User, BookOpen, Smile, PenTool, Heart, Search, Instagram, Facebook, Youtube, Twitter, Video, AlertCircle, Eye, Clock, Lightbulb, HelpCircle, Building2, AtSign } from 'lucide-react';
import { supabase } from '../config/supabase';
import { useToast } from '../context/ToastContext';
import { BrandContext, useBrand } from '../context/BrandContext';
import { formatEnumLabel, formatEnumArray } from '../utils/formatEnumLabel';

// Profile types - clean monochrome design
const PROFILE_TYPES = [
  { 
    value: 'brand', 
    label: 'Brand / Business', 
    description: 'Small business, agency, or company account',
    icon: Briefcase
  },
  { 
    value: 'creator', 
    label: 'Solo Creator', 
    description: 'Building your personal brand & community',
    icon: Sparkles
  }
];

// Creator archetypes (for solo creators only) - clean icons
const CREATOR_ARCHETYPES = [
  { value: 'educator', label: 'The Educator', description: 'You teach and explain', icon: BookOpen },
  { value: 'entertainer', label: 'The Entertainer', description: 'You make people smile', icon: Smile },
  { value: 'storyteller', label: 'The Storyteller', description: 'You share experiences', icon: PenTool },
  { value: 'inspirer', label: 'The Inspirer', description: 'You motivate others', icon: Heart },
  { value: 'curator', label: 'The Curator', description: 'You discover and share gems', icon: Search }
];

// Brand niches — business content strategies (shown after Industry)
const BRAND_NICHES = [
  { value: 'product_reviews', label: 'Product Reviews & Demos', icon: Eye },
  { value: 'behind_scenes', label: 'Behind the Scenes', icon: Video },
  { value: 'thought_leadership', label: 'Industry Thought Leadership', icon: Lightbulb },
  { value: 'customer_stories', label: 'Customer Success Stories', icon: Heart },
  { value: 'how_to', label: 'How-To Guides & Tutorials', icon: BookOpen },
  { value: 'culture', label: 'Company Culture & Team', icon: Users },
  { value: 'promotions', label: 'Promotions & Launches', icon: Rocket },
  { value: 'other', label: 'Other', icon: Target }
];

// Creator focuses — personal content topics (replaces Industry + Niche for creators)
const CREATOR_FOCUSES = [
  { value: 'fitness', label: 'Fitness & Wellness', icon: Heart },
  { value: 'food', label: 'Food & Cooking', icon: Sparkles },
  { value: 'travel', label: 'Travel & Adventure', icon: Rocket },
  { value: 'fashion', label: 'Fashion & Beauty', icon: Palette },
  { value: 'tech', label: 'Tech & Gadgets', icon: Zap },
  { value: 'personal_growth', label: 'Personal Growth', icon: TrendingUp },
  { value: 'lifestyle', label: 'Lifestyle & Daily Life', icon: User },
  { value: 'education', label: 'Education & Tips', icon: BookOpen },
  { value: 'entertainment', label: 'Entertainment & Comedy', icon: Smile },
  { value: 'art', label: 'Art & Creativity', icon: PenTool },
  { value: 'other', label: 'Other', icon: Target }
];

// Brand audiences — customer-centric segments
const BRAND_AUDIENCES = [
  { value: 'small_business', label: 'Small Business Owners', description: 'Entrepreneurs running their own business', icon: Briefcase },
  { value: 'enterprise', label: 'Enterprise Decision Makers', description: 'Corporate buyers and managers', icon: Building2 },
  { value: 'gen_z_consumers', label: 'Gen Z Consumers (18-24)', description: 'Young, digital-native shoppers', icon: Zap },
  { value: 'millennial_consumers', label: 'Millennial Consumers (25-40)', description: 'Career-focused, value-driven buyers', icon: TrendingUp },
  { value: 'parents', label: 'Parents & Families', description: 'Family-oriented decision makers', icon: Users },
  { value: 'health_conscious', label: 'Health-Conscious Buyers', description: 'Wellness and lifestyle shoppers', icon: Heart },
  { value: 'tech_enthusiasts', label: 'Tech Enthusiasts', description: 'Early adopters and gadget lovers', icon: Lightbulb },
  { value: 'general', label: 'General Consumers', description: 'Broad consumer demographic', icon: Users },
  { value: 'other', label: 'Other', description: 'Fill in details on Brand Profile page', icon: HelpCircle }
];

// Creator communities — follower/community segments
const CREATOR_COMMUNITIES = [
  { value: 'gen_z', label: 'Gen Z (18-24)', description: 'Young, digital-native followers', icon: Zap },
  { value: 'millennials', label: 'Millennials (25-40)', description: 'Career-focused, diverse interests', icon: TrendingUp },
  { value: 'gen_x', label: 'Gen X (41-56)', description: 'Established, family-oriented audience', icon: Users },
  { value: 'fellow_creators', label: 'Fellow Creators', description: 'Other creators in your space', icon: Sparkles },
  { value: 'entrepreneurs', label: 'Aspiring Entrepreneurs', description: 'People building their own thing', icon: Rocket },
  { value: 'students', label: 'Students & Learners', description: 'Knowledge-hungry audience', icon: BookOpen },
  { value: 'wellness', label: 'Wellness Community', description: 'Health and self-improvement focused', icon: Heart },
  { value: 'general', label: 'General Followers', description: 'Broad, mixed community', icon: Users },
  { value: 'other', label: 'Other', description: 'Fill in details on Brand Profile page', icon: HelpCircle }
];

// Content goals - clean teal icons
const BRAND_CONTENT_GOALS = [
  { value: 'grow_followers', label: 'Grow Followers', icon: Users },
  { value: 'increase_engagement', label: 'Increase Engagement', icon: MessageSquare },
  { value: 'drive_sales', label: 'Drive Sales', icon: Target },
  { value: 'build_brand', label: 'Build Brand Awareness', icon: Sparkles },
  { value: 'educate', label: 'Educate Audience', icon: BookOpen },
  { value: 'generate_leads', label: 'Generate Leads', icon: Rocket }
];

const CREATOR_CONTENT_GOALS = [
  { value: 'grow_followers', label: 'Grow My Following', icon: Users },
  { value: 'increase_engagement', label: 'Boost Engagement', icon: MessageSquare },
  { value: 'build_community', label: 'Build Community', icon: Heart },
  { value: 'share_story', label: 'Share My Story', icon: PenTool },
  { value: 'express_myself', label: 'Express Myself', icon: Sparkles },
  { value: 'monetize', label: 'Monetize Content', icon: Target }
];

const POSTING_FREQUENCIES = [
  { value: 'daily', label: 'Daily', description: '7+ posts per week', icon: Zap },
  { value: 'frequent', label: '3-5 times per week', description: 'Regular posting schedule', icon: TrendingUp },
  { value: 'moderate', label: '1-2 times per week', description: 'Consistent but flexible', icon: Calendar },
  { value: 'occasional', label: 'A few times per month', description: 'Quality over quantity', icon: Sparkles }
];

// Platforms with Lucide icons (monochrome)
const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'tiktok', label: 'TikTok', icon: Video },
  { value: 'twitter', label: 'X (Twitter)', icon: Twitter },
  { value: 'youtube', label: 'YouTube', icon: Youtube }
];

const BRAND_VOICES = [
  { value: 'casual', label: 'Casual & Friendly', description: 'Relaxed, conversational tone', icon: Smile },
  { value: 'professional', label: 'Professional & Polished', description: 'Formal, authoritative', icon: Briefcase },
  { value: 'humorous', label: 'Humorous & Playful', description: 'Fun, lighthearted', icon: Sparkles },
  { value: 'inspirational', label: 'Inspirational & Motivating', description: 'Uplifting, encouraging', icon: Heart },
  { value: 'educational', label: 'Educational & Informative', description: 'Clear, instructive', icon: BookOpen },
  { value: 'other', label: 'Other', description: 'Fill in details on Brand Profile page', icon: HelpCircle }
];

// Industries for brands
const INDUSTRIES = [
  { value: 'healthcare', label: 'Healthcare & Wellness', icon: Heart },
  { value: 'beauty', label: 'Beauty & Cosmetics', icon: Sparkles },
  { value: 'fitness', label: 'Fitness & Sports', icon: Zap },
  { value: 'food', label: 'Food & Beverage', icon: Target },
  { value: 'fashion', label: 'Fashion & Apparel', icon: Palette },
  { value: 'technology', label: 'Technology & Software', icon: Lightbulb },
  { value: 'finance', label: 'Finance & Insurance', icon: Briefcase },
  { value: 'real_estate', label: 'Real Estate', icon: Building2 },
  { value: 'education', label: 'Education & Training', icon: BookOpen },
  { value: 'entertainment', label: 'Entertainment & Media', icon: Video },
  { value: 'retail', label: 'Retail & E-commerce', icon: Target },
  { value: 'services', label: 'Professional Services', icon: Users },
  { value: 'other', label: 'Other', icon: HelpCircle }
];

// Content strengths - what users are best at
const CONTENT_STRENGTHS = [
  { value: 'storytelling', label: 'Storytelling', description: 'Sharing compelling narratives', icon: PenTool },
  { value: 'education', label: 'Education', description: 'Teaching and explaining', icon: BookOpen },
  { value: 'entertainment', label: 'Entertainment', description: 'Making people laugh or smile', icon: Smile },
  { value: 'visuals', label: 'Visuals', description: 'Creating eye-catching content', icon: Eye },
  { value: 'trends', label: 'Trends', description: 'Jumping on what\'s hot', icon: TrendingUp },
  { value: 'authenticity', label: 'Authenticity', description: 'Being real and relatable', icon: Heart }
];

// Biggest challenges
const CONTENT_CHALLENGES = [
  { value: 'consistency', label: 'Staying Consistent', description: 'Posting regularly is hard', icon: Calendar },
  { value: 'ideas', label: 'Coming Up With Ideas', description: 'Running out of content ideas', icon: Lightbulb },
  { value: 'engagement', label: 'Getting Engagement', description: 'Not enough likes/comments', icon: MessageSquare },
  { value: 'growth', label: 'Growing My Audience', description: 'Gaining new followers', icon: TrendingUp },
  { value: 'time', label: 'Finding Time', description: 'Too busy to create', icon: Clock },
  { value: 'quality', label: 'Creating Quality Content', description: 'Making content look professional', icon: Sparkles }
];

// Hook style preferences for viral content
const HOOK_STYLES = [
  { value: 'question', label: 'Question Hook', description: '"Did you know...?" or "What if...?"', icon: HelpCircle },
  { value: 'bold_statement', label: 'Bold Statement', description: 'Strong opinion or claim', icon: AlertCircle },
  { value: 'story', label: 'Story Hook', description: '"Let me tell you about..."', icon: PenTool },
  { value: 'statistic', label: 'Statistic Hook', description: 'Numbers that shock or surprise', icon: TrendingUp },
  { value: 'controversy', label: 'Controversy Hook', description: 'Unpopular opinion or debate', icon: Zap },
  { value: 'curiosity_gap', label: 'Curiosity Gap', description: '"The secret that no one tells you..."', icon: Eye }
];

// Emotional triggers - how audience should feel
const EMOTIONAL_TRIGGERS = [
  { value: 'inspired', label: 'Inspired', description: 'Motivated to take action', icon: Rocket },
  { value: 'entertained', label: 'Entertained', description: 'Amused and engaged', icon: Smile },
  { value: 'educated', label: 'Educated', description: 'Learning something new', icon: BookOpen },
  { value: 'connected', label: 'Connected', description: 'Part of a community', icon: Users },
  { value: 'motivated', label: 'Motivated', description: 'Ready to achieve goals', icon: Target },
  { value: 'understood', label: 'Understood', description: 'Seen and validated', icon: Heart }
];

const defaultFormData = {
  profile_type: '',
  creator_archetype: '',
  first_name: '',
  brand_name: '',
  industry: '',
  industry_custom: '',
  niche: [],
  target_audience: [],
  content_goals: [],
  posting_frequency: '',
  preferred_platforms: [],
  brand_voice_preference: '',
  content_strengths: [],
  biggest_challenge: '',
  emotional_triggers: []
};

export default function OnboardingQuiz({ onComplete }) {
  const { addToast } = useToast();
  const { updateBrandData, refreshBrandData } = useContext(BrandContext);
  const [step, setStep] = useState(() => {
    try {
      const saved = localStorage.getItem('onboarding_step');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed >= 1 && parsed <= 10) return parsed;
      }
    } catch (e) {}
    return 1;
  });
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem('onboarding_progress');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultFormData, ...parsed };
      }
    } catch (e) {}
    return defaultFormData;
  });
  const [saving, setSaving] = useState(false);

  // Persist onboarding progress to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('onboarding_progress', JSON.stringify(formData));
      localStorage.setItem('onboarding_step', String(step));
    } catch (e) {}
  }, [formData, step]);

  const isCreator = formData.profile_type === 'creator';
  
  // Total steps: 10 for both brand and creator
  // Steps: Profile Type, (Archetype for creators), Name, (Industry for brands), Niche/Focus, Audience/Community, Goals, Strengths, Challenge, Emotional Triggers, Voice
  const totalSteps = 10;
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
      { icon: AtSign, label: 'Name' },
      ...(isCreator ? [] : [{ icon: Building2, label: 'Industry' }]),
      { icon: Palette, label: isCreator ? 'Focus' : 'Niche' },
      { icon: Users, label: isCreator ? 'Community' : 'Audience' },
      { icon: Target, label: 'Goals' },
      { icon: Zap, label: 'Strengths' },
      { icon: AlertCircle, label: 'Challenge' },
      { icon: Heart, label: 'Emotions' },
      { icon: MessageSquare, label: isCreator ? 'Vibe' : 'Voice' }
    ];
  };

  const STEP_ICONS = getStepIcons();

  const handleMultiSelect = (field, value) => {
    setFormData(prev => {
      const current = Array.isArray(prev[field]) ? prev[field] : (prev[field] ? [prev[field]] : []);
      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value]
      };
    });
  };

  // Helper to get the logical step number (accounts for skipped steps)
  const getLogicalStep = (displayStep) => {
    // For creators: skip step 3 (industry), so step 4 becomes logical step 4
    // For brands: all steps are shown
    if (isCreator && displayStep >= 3) {
      // Step 3 is skipped for creators, so step 3 in display = step 4 logically
      return displayStep;
    }
    return displayStep;
  };

  const handleNext = () => {
    // Step 1 validation: profile type + first name + brand name ALL required
    if (step === 1) {
      if (!formData.profile_type) {
        addToast('Please select how you create content', 'warning');
        return;
      }
      if (!formData.first_name.trim()) {
        addToast('Please enter your first name', 'warning');
        return;
      }
      if (!formData.brand_name.trim()) {
        addToast(isCreator ? 'Please enter your name or handle' : 'Please enter your brand name', 'warning');
        return;
      }
    }
    
    // Steps 2+ have relaxed validation — users can skip via "Skip for now"
    // But if they click "Continue", validate the current step content
    const industryStep = 3; // Only for brands
    const nicheStep = isCreator ? 4 : 4;
    const audienceStep = isCreator ? 5 : 5;
    const goalsStep = isCreator ? 6 : 6;
    const strengthsStep = isCreator ? 7 : 7;
    const challengeStep = isCreator ? 8 : 8;
    const emotionalStep = isCreator ? 9 : 9;

    // Industry step - required for brands, and if "Other" is selected, require custom text
    if (step === industryStep && !isCreator) {
      if (!formData.industry) {
        addToast('Please select your industry', 'warning');
        return;
      }
      if (formData.industry === 'other' && !formData.industry_custom.trim()) {
        addToast('Please specify your industry', 'warning');
        return;
      }
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

      // Use formatEnumLabel to convert snake_case enum values to human-readable labels
      const formatArray = (arr) => Array.isArray(arr) ? [...new Set(arr)].map(formatEnumLabel) : arr;
      
      // Prepare complete profile data with all fields (format enum labels)
      // Null out fields that don't apply to the chosen profile type
      const profileData = {
        user_id: userId,
        first_name: formData.first_name.trim(),
        profile_type: formData.profile_type,
        creator_archetype: isCreator && formData.creator_archetype ? formatEnumLabel(formData.creator_archetype) : null,
        brand_name: formData.brand_name?.trim() || null,
        industry: !isCreator
          ? (formData.industry === 'other' && formData.industry_custom
              ? formData.industry_custom.trim().charAt(0).toUpperCase() + formData.industry_custom.trim().slice(1)
              : (formData.industry ? formatEnumLabel(formData.industry) : null))
          : null,
        niche: Array.isArray(formData.niche) ? formData.niche.map(formatEnumLabel).join(', ') : formatEnumLabel(formData.niche),
        target_audience: formatArray(formData.target_audience),
        content_goals: formatArray(formData.content_goals),
        posting_frequency: formatEnumLabel(formData.posting_frequency),
        preferred_platforms: formatArray(formData.preferred_platforms),
        brand_voice_preference: formatEnumLabel(formData.brand_voice_preference),
        // Viral content strategy fields
        content_strengths: formatArray(formData.content_strengths),
        biggest_challenge: formData.biggest_challenge ? formatEnumLabel(formData.biggest_challenge) : null,
        emotional_triggers: formatArray(formData.emotional_triggers),
        quiz_completed_at: new Date().toISOString(),
        onboarding_step: totalSteps
      };

      console.log('Saving profile data:', profileData);

      const { data: profileResult, error: saveError } = await supabase
        .from('user_profile')
        .upsert(profileData, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })
        .select();

      if (saveError) {
        console.error('Profile save error:', saveError);
        throw saveError;
      }

      console.log('Profile saved successfully:', profileResult);

      // Update local brand context with all quiz data
      updateBrandData({
        firstName: formData.first_name.trim(),
        profileType: formData.profile_type,
        creatorArchetype: formData.creator_archetype || '',
        brandName: formData.brand_name || '',
        industry: formData.industry || '',
        niche: Array.isArray(formData.niche) ? formData.niche.join(', ') : formData.niche,
        targetAudience: formData.target_audience,
        brandVoice: formData.brand_voice_preference,
        platforms: formData.preferred_platforms,
        goals: formData.content_goals,
        // New viral content strategy fields
        contentStrengths: formData.content_strengths,
        biggestChallenge: formData.biggest_challenge || '',
        emotionalTriggers: formData.emotional_triggers,
      });

      // Force BrandContext to reload from database to ensure sync
      if (refreshBrandData) {
        refreshBrandData();
      }

      // Clear persisted onboarding progress
      localStorage.removeItem('onboarding_progress');
      localStorage.removeItem('onboarding_step');

      addToast('Profile setup complete! 🎉', 'success');
      
      // Call onComplete callback - must await since it may be async
      if (onComplete) {
        await onComplete(formData);
      }

    } catch (error) {
      console.error('Error saving profile:', error);
      const errorMessage = error.message || 'Failed to save profile. Please try again.';
      addToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Check if Step 1 (profile) is complete — all 3 fields required
  const isStep1Complete = formData.profile_type && formData.first_name.trim() && formData.brand_name.trim();

  // Render step content
  const renderStepContent = () => {
    // Step 1: Profile Type + First Name + Brand Name (ALL REQUIRED)
    if (step === 1) {
      return (
        <div className="animate-fadeIn">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 mb-2">How do you create content?</h2>
          <p className="text-slate-500 mb-6">This helps us personalize your entire experience</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {PROFILE_TYPES.map(type => {
              const Icon = type.icon;
              const isSelected = formData.profile_type === type.value;
              
              return (
                <button
                  key={type.value}
                  onClick={() => setFormData({ ...formData, profile_type: type.value, creator_archetype: '' })}
                  className={`group relative p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? 'border-huttle-primary bg-huttle-50 shadow-lg'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-1'
                  }`}
                >
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all ${
                      isSelected 
                        ? 'bg-huttle-primary text-white' 
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{type.label}</h3>
                    <p className="text-sm text-slate-500">{type.description}</p>
                  </div>
                  
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-huttle-primary rounded-full flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Name fields — shown inline on Step 1 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="e.g., Sarah"
                  className="w-full pl-12 pr-4 py-3.5 text-base border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-huttle-primary/50 focus:border-huttle-primary outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {formData.profile_type === 'creator' ? 'Your Name or Handle' : 'Brand Name'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  {formData.profile_type === 'creator' ? <AtSign className="w-5 h-5 text-slate-400" /> : <Building2 className="w-5 h-5 text-slate-400" />}
                </div>
                <input
                  type="text"
                  value={formData.brand_name}
                  onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                  placeholder={formData.profile_type === 'creator' ? 'e.g., Sarah Johnson or @sarahcreates' : 'e.g., Glow MedSpa'}
                  className="w-full pl-12 pr-4 py-3.5 text-base border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-huttle-primary/50 focus:border-huttle-primary outline-none transition-all"
                />
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {formData.profile_type === 'creator' ? 'AI will write content in first person as you' : 'AI will write content on behalf of your brand'}
              </p>
            </div>
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
              const Icon = archetype.icon;
              const isSelected = formData.creator_archetype === archetype.value;
              
              return (
                <button
                  key={archetype.value}
                  onClick={() => setFormData({ ...formData, creator_archetype: archetype.value })}
                  className={`group relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? 'border-huttle-primary bg-huttle-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
                    isSelected 
                      ? 'bg-huttle-primary text-white' 
                      : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{archetype.label}</p>
                    <p className="text-sm text-slate-500 truncate">{archetype.description}</p>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-huttle-primary flex-shrink-0" />
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
    
    // Industry step (only for brands, not creators)
    const industryStep = 3;
    if (step === industryStep && !isCreator) {
      return (
        <div className="animate-fadeIn">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 mb-2">
            What industry is your business in?
          </h2>
          <p className="text-slate-500 mb-6">
            This tells AI about your market and competitive landscape
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {INDUSTRIES.map(industry => {
              const Icon = industry.icon;
              const isSelected = formData.industry === industry.value;
              
              return (
                <button
                  key={industry.value}
                  onClick={() => setFormData({ ...formData, industry: industry.value, industry_custom: '' })}
                  className={`group relative p-4 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-huttle-primary bg-huttle-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-1'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 transition-all ${
                    isSelected 
                      ? 'bg-huttle-primary text-white' 
                      : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 text-center">{industry.label}</p>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-huttle-primary rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Show text input when "Other" is selected */}
          {formData.industry === 'other' && (
            <div className="mt-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Please specify your industry
              </label>
              <input
                type="text"
                value={formData.industry_custom}
                onChange={(e) => setFormData({ ...formData, industry_custom: e.target.value })}
                placeholder="e.g., Digital Marketing Agency"
                className="w-full px-4 py-3 text-base border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-huttle-primary/50 focus:border-huttle-primary outline-none transition-all"
                autoFocus
              />
            </div>
          )}
        </div>
      );
    }
    
    // Niche step — multi-select (checkboxes)
    const nicheStep = isCreator ? 4 : 4;
    if (step === nicheStep) {
      const niches = isCreator ? CREATOR_FOCUSES : BRAND_NICHES;
      const nicheSelections = Array.isArray(formData.niche) ? formData.niche : (formData.niche ? [formData.niche] : []);
      return (
        <div className="animate-fadeIn">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 mb-2">
            {isCreator ? "What's your content focus?" : "What type of content does your brand create?"}
          </h2>
          <p className="text-slate-500 mb-6">
            {isCreator ? 'Select all that apply — choose your content topics' : 'Select all that apply — your content angles'}
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {niches.map(niche => {
              const Icon = niche.icon;
              const isSelected = nicheSelections.includes(niche.value);
              
              return (
                <button
                  key={niche.value}
                  onClick={() => handleMultiSelect('niche', niche.value)}
                  className={`group relative p-4 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-huttle-primary bg-huttle-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-1'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 transition-all ${
                    isSelected 
                      ? 'bg-huttle-primary text-white' 
                      : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 text-center">{niche.label}</p>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-huttle-primary rounded-full flex items-center justify-center">
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
    
    // Audience step - multi-select, max 3
    const audienceStep = isCreator ? 5 : 5;
    if (step === audienceStep) {
      const audiences = isCreator ? CREATOR_COMMUNITIES : BRAND_AUDIENCES;
      const maxAudience = 3;
      const selectedCount = formData.target_audience.length;
      
      const handleAudienceToggle = (value) => {
        setFormData(prev => {
          const current = prev.target_audience;
          if (current.includes(value)) {
            return { ...prev, target_audience: current.filter(v => v !== value) };
          }
          if (current.length >= maxAudience) {
            addToast(`Maximum ${maxAudience} selections allowed`, 'warning');
            return prev;
          }
          return { ...prev, target_audience: [...current, value] };
        });
      };
      
      return (
        <div className="animate-fadeIn">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 mb-2">
            {isCreator ? "Who's your community?" : "Who's your target customer?"}
          </h2>
          <div className="flex items-center justify-between mb-6">
            <p className="text-slate-500">
              {isCreator ? 'Select up to 3 communities you want to reach' : 'Select up to 3 customer segments you serve'}
            </p>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
              selectedCount === maxAudience ? 'bg-huttle-primary/10 text-huttle-primary' : 'bg-slate-100 text-slate-500'
            }`}>
              {selectedCount}/{maxAudience} selected
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {audiences.map(audience => {
              const Icon = audience.icon;
              const isSelected = formData.target_audience.includes(audience.value);
              const isDisabled = !isSelected && selectedCount >= maxAudience;
              return (
                <button
                  key={audience.value}
                  onClick={() => handleAudienceToggle(audience.value)}
                  disabled={isDisabled}
                  className={`group flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? 'border-huttle-primary bg-huttle-50 shadow-md'
                      : isDisabled
                        ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                    isSelected ? 'bg-huttle-primary text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{audience.label}</p>
                    <p className="text-sm text-slate-500">{audience.description}</p>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-huttle-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    
    // Goals step
    const goalsStep = isCreator ? 6 : 6;
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
                      ? 'border-huttle-primary bg-huttle-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-1'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center mx-auto mb-3 transition-all ${
                    isSelected 
                      ? 'bg-huttle-primary text-white' 
                      : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 text-center">{goal.label}</p>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-huttle-primary rounded-full flex items-center justify-center">
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
    
    // Strengths step - what users are best at
    const strengthsStep = isCreator ? 7 : 7;
    if (step === strengthsStep) {
      return (
        <div className="animate-fadeIn">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 mb-2">What are you best at?</h2>
          <p className="text-slate-500 mb-6">Select your top strengths (choose at least one)</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CONTENT_STRENGTHS.map(strength => {
              const Icon = strength.icon;
              const isSelected = formData.content_strengths.includes(strength.value);
              
              return (
                <button
                  key={strength.value}
                  onClick={() => handleMultiSelect('content_strengths', strength.value)}
                  className={`group relative p-4 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-huttle-primary bg-huttle-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-1'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center mx-auto mb-3 transition-all ${
                    isSelected 
                      ? 'bg-huttle-primary text-white' 
                      : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 text-center">{strength.label}</p>
                  <p className="text-xs text-slate-500 text-center mt-1">{strength.description}</p>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-huttle-primary rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-center text-sm text-slate-400 mt-4">
            AI will emphasize these in your content
          </p>
        </div>
      );
    }
    
    // Challenge step - biggest content struggle
    const challengeStep = isCreator ? 8 : 8;
    if (step === challengeStep) {
      return (
        <div className="animate-fadeIn">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 mb-2">What's your biggest challenge?</h2>
          <p className="text-slate-500 mb-6">We'll help you overcome this</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CONTENT_CHALLENGES.map(challenge => {
              const Icon = challenge.icon;
              const isSelected = formData.biggest_challenge === challenge.value;
              return (
                <button
                  key={challenge.value}
                  onClick={() => setFormData({ ...formData, biggest_challenge: challenge.value })}
                  className={`group flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? 'border-huttle-primary bg-huttle-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
                    isSelected ? 'bg-huttle-primary text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{challenge.label}</p>
                    <p className="text-sm text-slate-500">{challenge.description}</p>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-huttle-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    
    
    // Emotional triggers step - how audience should feel
    const emotionalStep = isCreator ? 9 : 9;
    if (step === emotionalStep) {
      return (
        <div className="animate-fadeIn">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 mb-2">How do you want your audience to feel?</h2>
          <p className="text-slate-500 mb-6">Select the emotions you want to evoke (choose at least one)</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {EMOTIONAL_TRIGGERS.map(emotion => {
              const Icon = emotion.icon;
              const isSelected = formData.emotional_triggers.includes(emotion.value);
              
              return (
                <button
                  key={emotion.value}
                  onClick={() => handleMultiSelect('emotional_triggers', emotion.value)}
                  className={`group relative p-4 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-huttle-primary bg-huttle-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-1'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center mx-auto mb-3 transition-all ${
                    isSelected 
                      ? 'bg-huttle-primary text-white' 
                      : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 text-center">{emotion.label}</p>
                  <p className="text-xs text-slate-500 text-center mt-1">{emotion.description}</p>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-huttle-primary rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-center text-sm text-slate-400 mt-4">
            Emotional content gets more engagement
          </p>
        </div>
      );
    }
    
    // Voice step (final) - includes platform selection
    const voiceStep = 10;
    if (step === voiceStep) {
      return (
        <div className="animate-fadeIn">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 mb-2">
            {isCreator ? "What's your vibe?" : "What's your brand voice?"}
          </h2>
          <p className="text-slate-500 mb-6">
            {isCreator ? 'Choose the tone that feels most like you' : 'Choose the tone that best matches your content style'}
          </p>
          
          <div className="space-y-3 mb-8">
            {BRAND_VOICES.map(voice => {
              const Icon = voice.icon;
              const isSelected = formData.brand_voice_preference === voice.value;
              return (
                <button
                  key={voice.value}
                  onClick={() => setFormData({ ...formData, brand_voice_preference: voice.value })}
                  className={`group w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? 'border-huttle-primary bg-huttle-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
                    isSelected ? 'bg-huttle-primary text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{voice.label}</p>
                    <p className="text-sm text-slate-500">{voice.description}</p>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-huttle-primary" />
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Platform selection - inline on final step */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">
              Which platforms do you use? <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(platform => {
                const Icon = platform.icon;
                const isSelected = formData.preferred_platforms.includes(platform.value);
                
                return (
                  <button
                    key={platform.value}
                    onClick={() => handleMultiSelect('preferred_platforms', platform.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-huttle-primary bg-huttle-50 text-huttle-primary'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{platform.label}</span>
                    {isSelected && <Check className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Clean Light Background */}
      <div className="absolute inset-0 bg-slate-50">
        {/* Subtle dot pattern */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `radial-gradient(circle, #cbd5e1 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-[100dvh] flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Clean Header */}
            <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-5 bg-white border-b border-slate-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-huttle-primary">
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
                    className="h-full rounded-full transition-all duration-500 ease-out bg-huttle-primary"
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
                          ? 'bg-huttle-primary text-white shadow-md'
                          : isCompleted 
                            ? 'bg-emerald-100 text-emerald-600' 
                            : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                      </div>
                      <span className={`text-xs mt-1.5 hidden sm:block font-medium ${
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
            <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-4 bg-slate-50 border-t border-slate-100">
              <div className="flex gap-3">
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
                    disabled={step === 1 && !isStep1Complete}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold transition-all duration-200 ${
                      step === 1 && !isStep1Complete
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-huttle-primary hover:bg-huttle-primary-dark hover:shadow-lg hover:-translate-y-0.5'
                    }`}
                  >
                    {isCreator && step === 2 && !formData.creator_archetype ? 'Skip' : 'Continue'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold bg-emerald-500 hover:bg-emerald-600 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
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

              {/* Skip for now — visible on all steps after Step 1 */}
              {step > 1 && (
                <div className="flex justify-center mt-3">
                  <button
                    onClick={async () => {
                      try {
                        const { data: userData } = await supabase.auth.getUser();
                        if (userData?.user) {
                          const nicheValue = Array.isArray(formData.niche) 
                            ? formData.niche.map(formatEnumLabel).join(', ') 
                            : (formData.niche ? formatEnumLabel(formData.niche) : null);
                          await supabase
                            .from('user_profile')
                            .upsert({
                              user_id: userData.user.id,
                              first_name: formData.first_name?.trim() || null,
                              profile_type: formData.profile_type || null,
                              brand_name: formData.brand_name?.trim() || null,
                              niche: nicheValue,
                              quiz_completed_at: new Date().toISOString(),
                              onboarding_step: step
                            }, { onConflict: 'user_id', ignoreDuplicates: false });
                          
                          updateBrandData({
                            firstName: formData.first_name?.trim() || '',
                            profileType: formData.profile_type || 'brand',
                            brandName: formData.brand_name || '',
                            niche: nicheValue || '',
                          });
                          
                          if (refreshBrandData) refreshBrandData();
                          localStorage.removeItem('onboarding_progress');
                          localStorage.removeItem('onboarding_step');
                          addToast('You can complete your profile later in Settings', 'info');
                          if (onComplete) await onComplete(formData);
                        }
                      } catch (e) {
                        console.error('Skip onboarding error:', e);
                        addToast('Could not skip. Please complete the setup.', 'error');
                      }
                    }}
                    className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Skip for now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
