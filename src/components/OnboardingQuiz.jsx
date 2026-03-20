import { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Instagram,
  Linkedin,
  Loader2,
  MapPin,
  Sparkles,
  TrendingUp,
  Twitter,
  Video,
  Youtube,
} from 'lucide-react';
import { supabase } from '../config/supabase';
import { AuthContext } from '../context/AuthContext';
import { BrandContext } from '../context/BrandContext';
import { useToast } from '../context/ToastContext';

const TOTAL_STEPS = 8;
const MAX_PLATFORM_SELECTIONS = 4;

const CREATOR_TYPES = [
  {
    value: 'brand_business',
    title: 'Brand / Business',
    subtitle: 'Marketing a business, service, or company',
    icon: Briefcase,
  },
  {
    value: 'solo_creator',
    title: 'Solo Creator',
    subtitle: 'Growing your personal brand or following',
    icon: Sparkles,
  },
];

const GROWTH_STAGES = [
  {
    value: 'just_starting_out',
    title: 'Just Starting Out',
    subtitle: '0 - 1K followers',
  },
  {
    value: 'building_momentum',
    title: 'Building Momentum',
    subtitle: '1K - 10K followers',
  },
  {
    value: 'established',
    title: 'Established',
    subtitle: '10K - 100K followers',
  },
  {
    value: 'large_audience',
    title: 'Large Audience',
    subtitle: '100K+ followers',
  },
];

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'tiktok', label: 'TikTok', icon: Video },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'x', label: 'X', icon: Twitter },
];

const TONE_CHIPS_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'educational', label: 'Educational' },
  { value: 'bold', label: 'Bold' },
  { value: 'warm', label: 'Warm' },
];

const FOLLOWER_COUNT_OPTIONS = [
  { value: 'under_500', label: 'Under 500' },
  { value: '500_2k', label: '500–2K' },
  { value: '2k_10k', label: '2K–10K' },
  { value: '10k_50k', label: '10K–50K' },
  { value: '50k_plus', label: '50K+' },
];

const CONVERSION_GOAL_OPTIONS = [
  { value: 'book_appointment', label: 'Book an appointment' },
  { value: 'dm_us', label: 'DM us' },
  { value: 'visit_website', label: 'Visit website' },
  { value: 'buy_now', label: 'Buy now' },
  { value: 'get_quote', label: 'Get a quote' },
  { value: 'join_list', label: 'Join a list' },
];

const CONTENT_PERSONA_OPTIONS = [
  { value: 'the_expert', label: 'The Expert' },
  { value: 'the_entertainer', label: 'The Entertainer' },
  { value: 'the_motivator', label: 'The Motivator' },
  { value: 'the_documenter', label: 'The Documenter' },
  { value: 'the_educator', label: 'The Educator' },
  { value: 'the_storyteller', label: 'The Storyteller' },
];

const STEP_LABELS = ['Type', 'Niche', 'Stage', 'Audience', 'Platforms', 'Tone', 'Goals', 'City'];

const defaultFormData = {
  creator_type: '',
  niche: '',
  growth_stage: 'building_momentum',
  target_audience: '',
  audience_pain_point: '',
  platforms: [],
  follower_count: '',
  tone_chips: [],
  conversion_goal: '',
  content_persona: '',
  city: '',
};

function countWords(value) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function getProfileType(creatorType) {
  return creatorType === 'brand_business' ? 'business' : 'creator';
}

function getFirstNameFromUser(user) {
  const candidates = [
    user?.user_metadata?.first_name,
    user?.user_metadata?.name,
    user?.user_metadata?.full_name,
    user?.email?.split('@')[0],
  ];

  const rawValue = candidates.find((value) => typeof value === 'string' && value.trim());
  if (!rawValue) return null;

  return rawValue.trim().split(' ')[0].replace(/^@+/, '') || null;
}

function FieldLabel({ children }) {
  return <label className="mb-2 block text-sm font-semibold text-slate-700">{children}</label>;
}

export default function OnboardingQuiz({ onComplete }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useContext(AuthContext);
  const { refreshBrandData } = useContext(BrandContext);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccessState, setIsSuccessState] = useState(false);

  const isBrandBusiness = formData.creator_type === 'brand_business';
  const progress = (step / TOTAL_STEPS) * 100;
  const audienceWordCount = useMemo(() => countWords(formData.target_audience), [formData.target_audience]);

  const nicheCopy = isBrandBusiness
    ? {
        title: 'What is your business niche?',
        placeholder: 'e.g., Med Spa, Real Estate, Fitness Coaching, Restaurant, E-commerce',
        helper: 'This personalizes your trends, hashtags, and content ideas',
      }
    : {
        title: 'What do you create content about?',
        placeholder: 'e.g., Fitness, Travel, Food, Gaming, Fashion, Lifestyle, Beauty, Finance',
        helper: 'Your main topic or passion - be specific for better results',
      };

  const audienceCopy = isBrandBusiness
    ? {
        title: 'Who is your ideal customer?',
        placeholder:
          'e.g., Women 30-55 seeking anti-aging treatments in Atlanta, First-time homebuyers under 40, Small business owners needing accounting help',
        helper: 'The more specific, the better your AI content',
      }
    : {
        title: 'Who is your audience?',
        placeholder:
          'e.g., Busy moms who want quick healthy meals, College students interested in personal finance, Fitness beginners who are intimidated by the gym',
        helper: "Describe who you're talking to - age, interest, situation",
      };

  const validateCurrentStep = (currentStep = step) => {
    if (currentStep === 1 && !formData.creator_type) {
      addToast('Choose how you will use Huttle AI to continue.', 'warning');
      return false;
    }

    if (currentStep === 2 && !formData.niche.trim()) {
      addToast('Tell us your niche so we can personalize your dashboard.', 'warning');
      return false;
    }

    if (currentStep === 4 && !formData.target_audience.trim()) {
      addToast('Describe your audience before continuing.', 'warning');
      return false;
    }

    if (currentStep === 5 && formData.platforms.length === 0) {
      addToast('Select at least one primary platform.', 'warning');
      return false;
    }

    if (currentStep === 6 && formData.tone_chips.length === 0) {
      addToast('Select at least one tone to continue.', 'warning');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handlePlatformToggle = (platformValue) => {
    const isSelected = formData.platforms.includes(platformValue);

    if (!isSelected && formData.platforms.length >= MAX_PLATFORM_SELECTIONS) {
      addToast(`Choose up to ${MAX_PLATFORM_SELECTIONS} platforms to stay focused.`, 'warning');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      platforms: isSelected
        ? prev.platforms.filter((value) => value !== platformValue)
        : [...prev.platforms, platformValue],
    }));
  };

  const handleSubmit = async ({ skipCity = false } = {}) => {
    if (!validateCurrentStep(5)) return;

    if (!user?.id) {
      addToast('Please log in again to finish onboarding.', 'error');
      return;
    }

    const nowIso = new Date().toISOString();
    const nextCityValue = skipCity ? '' : formData.city.trim();
    const nextFormData = {
      ...formData,
      city: nextCityValue,
      niche: formData.niche.trim(),
      target_audience: formData.target_audience.trim(),
      audience_pain_point: formData.audience_pain_point.trim(),
      growth_stage: formData.growth_stage || 'building_momentum',
    };

    // Only derive first name from the authenticated user's own metadata.
    // Do NOT use brandData.firstName here — BrandContext may have loaded stale
    // localStorage data from a previous user session before the new user's
    // Supabase profile row was created, causing the "Angela" cross-user bug.
    const firstName = getFirstNameFromUser(user) || null;
    const profileType = getProfileType(nextFormData.creator_type);

    setIsSaving(true);
    setIsSuccessState(false);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Your session expired. Please log in again.');
      }

      const response = await fetch('/api/save-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          firstName,
          profileType,
          brandName: null,
          creatorType: nextFormData.creator_type,
          niche: nextFormData.niche,
          growthStage: nextFormData.growth_stage,
          targetAudience: nextFormData.target_audience,
          audiencePainPoint: nextFormData.audience_pain_point || null,
          platforms: nextFormData.platforms,
          followerCount: nextFormData.follower_count || null,
          toneChips: nextFormData.tone_chips || [],
          conversionGoal: nextFormData.conversion_goal || null,
          contentPersona: nextFormData.content_persona || null,
          city: nextCityValue || null,
          quizCompletedAt: nowIso,
          onboardingStep: TOTAL_STEPS,
        }),
      });

      const result = await response.json();

      if (!response.ok || result?.success === false) {
        throw new Error(result?.error || 'Failed to save your onboarding answers.');
      }

      localStorage.setItem('brandData', JSON.stringify({
        firstName: firstName || '',
        profileType,
        brandName: '',
        niche: nextFormData.niche,
        contentFocus: nextFormData.niche,
        growthStage: nextFormData.growth_stage,
        creatorType: nextFormData.creator_type,
        targetAudience: nextFormData.target_audience,
        audiencePainPoint: nextFormData.audience_pain_point,
        platforms: nextFormData.platforms,
        followerCount: nextFormData.follower_count,
        toneChips: nextFormData.tone_chips,
        conversionGoal: nextFormData.conversion_goal,
        contentPersona: nextFormData.content_persona,
        city: nextCityValue,
      }));

      refreshBrandData?.();
      setIsSuccessState(true);

      await new Promise((resolve) => setTimeout(resolve, 700));

      if (onComplete) {
        const completionResult = await onComplete(nextFormData);
        if (completionResult?.success === false) {
          throw new Error(completionResult.error || 'Could not finish onboarding.');
        }
      }

      addToast('Your dashboard is ready.', 'success');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Error saving onboarding:', error);
      addToast(error.message || 'Failed to save onboarding. Please try again.', 'error');
      setIsSuccessState(false);
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <div className="animate-fadeIn">
          <h2 className="mb-2 text-xl font-display font-bold text-slate-900 sm:text-2xl">
            How will you use Huttle AI?
          </h2>
          <p className="mb-6 text-slate-500">This helps us personalize everything for you</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CREATOR_TYPES.map((option) => {
              const Icon = option.icon;
              const isSelected = formData.creator_type === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, creator_type: option.value }))}
                  className={`relative min-h-[150px] rounded-2xl border-2 p-5 text-left transition-all ${
                    isSelected
                      ? 'border-huttle-primary bg-huttle-50 shadow-lg'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${
                      isSelected ? 'bg-huttle-primary text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-1 text-lg font-bold text-slate-900">{option.title}</h3>
                  <p className="text-sm leading-6 text-slate-500">{option.subtitle}</p>

                  {isSelected && (
                    <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-huttle-primary text-white">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="animate-fadeIn">
          <h2 className="mb-2 text-xl font-display font-bold text-slate-900 sm:text-2xl">
            {nicheCopy.title}
          </h2>
          <p className="mb-6 text-slate-500">{nicheCopy.helper}</p>

          <FieldLabel>{isBrandBusiness ? 'Business Niche' : 'Content Focus'}</FieldLabel>
          <input
            type="text"
            value={formData.niche}
            onChange={(event) => setFormData((prev) => ({ ...prev, niche: event.target.value }))}
            placeholder={nicheCopy.placeholder}
            className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-base outline-none transition-all focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20"
          />
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="animate-fadeIn">
          <h2 className="mb-2 text-xl font-display font-bold text-slate-900 sm:text-2xl">
            Where are you right now?
          </h2>
          <p className="mb-6 text-slate-500">We'll tailor your strategy to your current stage</p>

          <div className="space-y-3">
            {GROWTH_STAGES.map((option) => {
              const isSelected = formData.growth_stage === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, growth_stage: option.value }))}
                  className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? 'border-huttle-primary bg-huttle-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      isSelected ? 'bg-huttle-primary text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{option.title}</p>
                    <p className="text-sm text-slate-500">{option.subtitle}</p>
                  </div>
                  {isSelected && <Check className="h-5 w-5 text-huttle-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (step === 4) {
      const hasAudienceDepth = audienceWordCount >= 10;

      return (
        <div className="animate-fadeIn">
          <h2 className="mb-2 text-xl font-display font-bold text-slate-900 sm:text-2xl">
            {audienceCopy.title}
          </h2>
          <p className="mb-6 text-slate-500">{audienceCopy.helper}</p>

          <FieldLabel>{isBrandBusiness ? 'Ideal Customer' : 'Audience Description'}</FieldLabel>
          <textarea
            rows={3}
            value={formData.target_audience}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, target_audience: event.target.value }))
            }
            placeholder={audienceCopy.placeholder}
            className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-base outline-none transition-all focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-slate-500">Aim for at least 10 words</span>
            <span className={hasAudienceDepth ? 'text-emerald-600' : 'text-slate-400'}>
              {audienceWordCount} words
            </span>
          </div>

          <div className="mt-6">
            <FieldLabel>Their biggest pain point?</FieldLabel>
            <input
              type="text"
              value={formData.audience_pain_point}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, audience_pain_point: event.target.value }))
              }
              placeholder="e.g., They want results but don't know where to start"
              className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-base outline-none transition-all focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20"
            />
          </div>
        </div>
      );
    }

    if (step === 5) {
      return (
        <div className="animate-fadeIn">
          <h2 className="mb-2 text-xl font-display font-bold text-slate-900 sm:text-2xl">
            Which platforms matter most right now?
          </h2>
          <p className="mb-6 text-slate-500">
            Choose 1 to 4 platforms so your dashboard stays focused
          </p>

          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-sm text-slate-500">Minimum 1, maximum 4</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
              {formData.platforms.length}/{MAX_PLATFORM_SELECTIONS}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PLATFORM_OPTIONS.map((platform) => {
              const Icon = platform.icon;
              const isSelected = formData.platforms.includes(platform.value);

              return (
                <button
                  key={platform.value}
                  type="button"
                  onClick={() => handlePlatformToggle(platform.value)}
                  className={`flex min-h-[72px] items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? 'border-huttle-primary bg-huttle-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      isSelected ? 'bg-huttle-primary text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="flex-1 font-semibold text-slate-900">{platform.label}</span>
                  {isSelected && <Check className="h-5 w-5 text-huttle-primary" />}
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <FieldLabel>Your current following (approx)?</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {FOLLOWER_COUNT_OPTIONS.map((option) => {
                const isSelected = formData.follower_count === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, follower_count: option.value }))}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
                      isSelected
                        ? 'border-huttle-primary bg-huttle-50 text-huttle-primary shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (step === 6) {
      const MAX_TONE = 3;
      const handleToneToggle = (value) => {
        setFormData((prev) => {
          const current = prev.tone_chips;
          if (current.includes(value)) {
            return { ...prev, tone_chips: current.filter((v) => v !== value) };
          }
          if (current.length >= MAX_TONE) {
            addToast(`Pick up to ${MAX_TONE} tones.`, 'warning');
            return prev;
          }
          return { ...prev, tone_chips: [...current, value] };
        });
      };

      return (
        <div className="animate-fadeIn">
          <h2 className="mb-2 text-xl font-display font-bold text-slate-900 sm:text-2xl">
            How would you describe your tone?
          </h2>
          <p className="mb-6 text-slate-500">Select up to 3 that feel like you</p>

          <div className="flex flex-wrap gap-3">
            {TONE_CHIPS_OPTIONS.map((option) => {
              const isSelected = formData.tone_chips.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleToneToggle(option.value)}
                  className={`px-5 py-3 rounded-2xl text-sm font-semibold transition-all border-2 ${
                    isSelected
                      ? 'border-huttle-primary bg-huttle-50 text-huttle-primary shadow-md'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {option.label}
                  {isSelected && <Check className="ml-2 inline h-4 w-4" />}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>Select 1–3</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
              {formData.tone_chips.length}/{MAX_TONE}
            </span>
          </div>
        </div>
      );
    }

    if (step === 7) {
      if (isBrandBusiness) {
        return (
          <div className="animate-fadeIn">
            <h2 className="mb-2 text-xl font-display font-bold text-slate-900 sm:text-2xl">
              What's your primary conversion goal?
            </h2>
            <p className="mb-6 text-slate-500">What action should your audience take?</p>

            <div className="space-y-3">
              {CONVERSION_GOAL_OPTIONS.map((option) => {
                const isSelected = formData.conversion_goal === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, conversion_goal: option.value }))}
                    className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                      isSelected
                        ? 'border-huttle-primary bg-huttle-50 shadow-md'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="flex-1 font-semibold text-slate-900">{option.label}</span>
                    {isSelected && <Check className="h-5 w-5 text-huttle-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      return (
        <div className="animate-fadeIn">
          <h2 className="mb-2 text-xl font-display font-bold text-slate-900 sm:text-2xl">
            What's your content persona?
          </h2>
          <p className="mb-6 text-slate-500">How does your audience know you?</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CONTENT_PERSONA_OPTIONS.map((option) => {
              const isSelected = formData.content_persona === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, content_persona: option.value }))}
                  className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? 'border-huttle-primary bg-huttle-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="flex-1 font-semibold text-slate-900">{option.label}</span>
                  {isSelected && <Check className="h-5 w-5 text-huttle-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="animate-fadeIn">
        <h2 className="mb-2 text-xl font-display font-bold text-slate-900 sm:text-2xl">
          Where are you based?
        </h2>
        <p className="mb-6 text-slate-500">Adds local hashtags and trends to your dashboard</p>

        <FieldLabel>Your City (Recommended)</FieldLabel>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <MapPin className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={formData.city}
            onChange={(event) => setFormData((prev) => ({ ...prev, city: event.target.value }))}
            placeholder="e.g., Atlanta, New York, Los Angeles"
            className="w-full rounded-2xl border-2 border-slate-200 py-3.5 pl-12 pr-4 text-base outline-none transition-all focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20"
          />
        </div>

        <div className="mt-4 rounded-2xl border border-huttle-primary/10 bg-huttle-50 px-4 py-3 text-sm text-slate-600">
          We'll surface local tags like <span className="font-semibold text-slate-900">#AtlantaFitness</span> and trends popular in your area.
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50">
      <div className="min-h-[100dvh] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-3xl items-center justify-center">
          <div className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-5 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-huttle-primary text-white">
                  {formData.creator_type === 'solo_creator' ? (
                    <Sparkles className="h-5 w-5" />
                  ) : (
                    <Briefcase className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-display font-bold text-slate-900 sm:text-2xl">
                    Set Up Your Dashboard
                  </h1>
                  <p className="text-sm text-slate-500">
                    Step {step} of {TOTAL_STEPS}: {STEP_LABELS[step - 1]}
                  </p>
                </div>
              </div>

              <div className="mb-4 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-huttle-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-500">
                  {step}/{TOTAL_STEPS}
                </span>
              </div>

              <div className="grid grid-cols-8 gap-1.5">
                {STEP_LABELS.map((label, index) => {
                  const stepNumber = index + 1;
                  const isActive = stepNumber === step;
                  const isComplete = stepNumber < step;

                  return (
                    <div key={label} className="text-center">
                      <div
                        className={`mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                          isActive
                            ? 'bg-huttle-primary text-white'
                            : isComplete
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {isComplete ? <Check className="h-4 w-4" /> : stepNumber}
                      </div>
                      <span className="hidden text-[11px] font-medium text-slate-400 sm:block">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="min-h-[360px] px-5 py-6 sm:min-h-[400px] sm:px-8 sm:py-8">
              {renderStepContent()}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-5 py-5 sm:px-8 sm:py-6">
              <div className="flex flex-col gap-3 sm:flex-row">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                )}

                {step < TOTAL_STEPS ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={isSaving || (step === 1 && !formData.creator_type)}
                    className="flex-1 rounded-2xl bg-huttle-primary px-6 py-3 font-semibold text-white transition-all hover:bg-huttle-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="flex items-center justify-center gap-2">
                      Continue
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={isSaving}
                    className="flex-1 rounded-2xl bg-emerald-500 px-6 py-3 font-semibold text-white transition-all hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {isSuccessState ? 'Opening your dashboard...' : 'Saving your answers...'}
                        </>
                      ) : (
                        <>Set Up My Dashboard -&gt;</>
                      )}
                    </span>
                  </button>
                )}
              </div>

              {step === TOTAL_STEPS && (
                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleSubmit({ skipCity: true })}
                    disabled={isSaving}
                    className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
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
