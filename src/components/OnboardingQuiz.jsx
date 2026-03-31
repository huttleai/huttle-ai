import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AtSign,
  Briefcase,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Loader2,
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
    title: 'I own a brand or business',
    subtitle: 'Coffee shop, salon, agency, restaurant, etc.',
    icon: Briefcase,
  },
  {
    value: 'solo_creator',
    title: "I'm a solo content creator",
    subtitle: 'Personal brand, influencer, niche content',
    icon: Sparkles,
  },
];

const BUSINESS_GOAL_OPTIONS = [
  { value: 'drive_sales', label: 'Drive more sales' },
  { value: 'increase_foot_traffic', label: 'Increase foot traffic' },
  { value: 'build_community', label: 'Build a loyal community' },
  { value: 'grow_online_presence', label: 'Grow my online presence' },
  { value: 'build_brand_awareness', label: 'Build brand awareness' },
  { value: 'launch_product', label: 'Launch a new product or service' },
];

const AUDIENCE_LOCATION_OPTIONS = [
  { value: 'mostly_local', label: 'Mostly local — people near my location' },
  { value: 'mostly_online', label: 'Mostly online — could be anywhere' },
  { value: 'split_evenly', label: 'Both — a mix of local and online' },
];

const CREATOR_MONETIZATION_OPTIONS = [
  { value: 'brand_deals', label: 'Land brand deals and sponsorships' },
  { value: 'digital_products', label: 'Sell digital products or courses' },
  { value: 'coaching', label: 'Offer coaching or consulting' },
  { value: 'affiliate', label: 'Grow affiliate income' },
  { value: 'community_membership', label: 'Build a paid community or membership' },
  { value: 'not_yet_monetizing', label: "I'm just starting — figuring it out" },
];

const AUDIENCE_STAGE_OPTIONS = [
  { value: 'early', title: 'Just starting', subtitle: 'Under 1,000 followers' },
  { value: 'growing', title: 'Growing', subtitle: '1K to 10K followers' },
  { value: 'established', title: 'Established', subtitle: '10K+ followers' },
];

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'tiktok', label: 'TikTok', icon: Video },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'x', label: 'X (Twitter)', icon: Twitter },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'pinterest', label: 'Pinterest', icon: Globe },
];

const POSTING_FREQUENCY_OPTIONS = [
  { value: 'light', label: '1–2 times per week' },
  { value: 'moderate', label: '3–4 times per week' },
  { value: 'aggressive', label: '5–7 times per week' },
  { value: 'heavy', label: 'Multiple times per day' },
];

const STEP_LABELS = ['Name', 'Type', 'Setup', 'Niche', 'Goal', 'Audience', 'Platforms', 'Posting'];

const defaultFormData = {
  full_name: '',
  profile_type: '',
  business_name: '',
  creator_handle: '',
  niche: '',
  target_audience: '',
  business_primary_goal: '',
  audience_location_type: '',
  is_local_business: false,
  platforms: [],
  creator_monetization_path: '',
  audience_stage: '',
  posting_frequency: '',
};

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

  const isBrandBusiness = formData.profile_type === 'brand_business';
  const progress = (step / TOTAL_STEPS) * 100;

  const validateCurrentStep = (currentStep = step) => {
    if (currentStep === 1 && !formData.full_name.trim()) {
      addToast('Enter your name to continue.', 'warning');
      return false;
    }

    if (currentStep === 2 && !formData.profile_type) {
      addToast('Choose how you will use Huttle AI to continue.', 'warning');
      return false;
    }

    if (currentStep === 4 && !formData.niche.trim()) {
      addToast('Tell us your niche so we can personalize your dashboard.', 'warning');
      return false;
    }

    if (currentStep === 7 && formData.platforms.length === 0) {
      addToast('Select at least one primary platform.', 'warning');
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
    if (!validateCurrentStep(7)) return;

    if (!user?.id) {
      addToast('Please log in again to finish onboarding.', 'error');
      return;
    }

    const nowIso = new Date().toISOString();
    const postingFrequency = skipCity ? '' : formData.posting_frequency;
    const isLocal =
      formData.audience_location_type === 'mostly_local' ||
      formData.audience_location_type === 'split_evenly';

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
          firstName: formData.full_name.trim() || null,
          profileType: formData.profile_type,
          creatorType: formData.profile_type,
          brandName: isBrandBusiness ? (formData.business_name.trim() || null) : null,
          creatorHandle: !isBrandBusiness ? (formData.creator_handle.trim() || null) : null,
          niche: formData.niche.trim() || null,
          targetAudience: formData.target_audience.trim() || null,
          platforms: formData.platforms,
          businessPrimaryGoal: isBrandBusiness ? (formData.business_primary_goal || null) : null,
          audienceLocationType: isBrandBusiness ? (formData.audience_location_type || null) : null,
          isLocalBusiness: isBrandBusiness ? isLocal : false,
          creatorMonetizationPath: !isBrandBusiness
            ? (formData.creator_monetization_path || null)
            : null,
          audienceStage: !isBrandBusiness ? (formData.audience_stage || null) : null,
          postingFrequency: postingFrequency || null,
          quizCompletedAt: nowIso,
          onboardingStep: TOTAL_STEPS,
        }),
      });

      const result = await response.json();

      if (!response.ok || result?.success === false) {
        throw new Error(result?.error || 'Failed to save your onboarding answers.');
      }

      localStorage.setItem('brandData', JSON.stringify({
        firstName: formData.full_name.trim() || '',
        profileType: formData.profile_type,
        brandName: isBrandBusiness ? formData.business_name.trim() : '',
        handle: !isBrandBusiness ? formData.creator_handle.trim() : '',
        niche: formData.niche.trim(),
        contentFocus: formData.niche.trim(),
        targetAudience: formData.target_audience.trim(),
        platforms: formData.platforms,
        businessPrimaryGoal: isBrandBusiness ? formData.business_primary_goal : null,
        audienceLocationType: isBrandBusiness ? formData.audience_location_type : 'mostly_online',
        isLocalBusiness: isBrandBusiness ? isLocal : false,
        creatorMonetizationPath: !isBrandBusiness ? formData.creator_monetization_path : null,
        audienceStage: !isBrandBusiness ? formData.audience_stage : null,
      }));

      refreshBrandData?.();
      setIsSuccessState(true);

      await new Promise((resolve) => setTimeout(resolve, 700));

      if (onComplete) {
        const completionResult = await onComplete(formData);
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
    // Step 1: Name
    if (step === 1) {
      return (
        <div className="animate-fadeIn">
          <h2 className="mb-2 text-xl font-display font-bold text-slate-900 sm:text-2xl">
            What's your name?
          </h2>
          <p className="mb-6 text-slate-500">We'll use this to personalize your experience</p>

          <FieldLabel>Your Name</FieldLabel>
          <input
            type="text"
            value={formData.full_name}
            onChange={(event) => setFormData((prev) => ({ ...prev, full_name: event.target.value }))}
            placeholder="e.g. Alex Johnson"
            className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-base outline-none transition-all focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20"
          />
        </div>
      );
    }

    // Step 2: Account Type
    if (step === 2) {
      return (
        <div className="animate-fadeIn">
          <h2 className="mb-2 text-xl font-display font-bold text-slate-900 sm:text-2xl">
            How would you describe yourself?
          </h2>
          <p className="mb-6 text-slate-500">This helps us personalize everything for you</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CREATOR_TYPES.map((option) => {
              const Icon = option.icon;
              const isSelected = formData.profile_type === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, profile_type: option.value }))}
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

    // Step 3: Business Name (brand) or Creator Handle (creator)
    if (step === 3) {
      if (isBrandBusiness) {
        return (
          <div className="animate-fadeIn">
            <h2 className="mb-2 text-xl font-display font-bold text-slate-900 sm:text-2xl">
              What's your business called?
            </h2>
            <p className="mb-6 text-slate-500">We'll use this throughout your dashboard</p>

            <FieldLabel>Business Name</FieldLabel>
            <input
              type="text"
              value={formData.business_name}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, business_name: event.target.value }))
              }
              placeholder="e.g. Bloom Coffee Co., FitLife Studio"
              className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-base outline-none transition-all focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20"
            />
          </div>
        );
      }

      return (
        <div className="animate-fadeIn">
          <h2 className="mb-2 text-xl font-display font-bold text-slate-900 sm:text-2xl">
            What's your creator name or handle?
          </h2>
          <p className="mb-6 text-slate-500">This is how your audience knows you</p>

          <FieldLabel>Creator Name or Handle</FieldLabel>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <AtSign className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={formData.creator_handle}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, creator_handle: event.target.value }))
              }
              placeholder="@yourcreatorname"
              className="w-full rounded-2xl border-2 border-slate-200 py-3.5 pl-12 pr-4 text-base outline-none transition-all focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20"
            />
          </div>
        </div>
      );
    }

    // Step 4: Niche
    if (step === 4) {
      const nicheTitle = isBrandBusiness
        ? 'What kind of business is it?'
        : "What's your content niche?";
      const nichePlaceholder = isBrandBusiness
        ? 'e.g. Coffee shop, fitness studio, law firm...'
        : 'e.g. Coffee lover, fitness tips, travel vlogs...';
      const nicheHelper = isBrandBusiness
        ? 'This personalizes your trends, hashtags, and content ideas'
        : 'Your main topic or passion — be specific for better results';
      const nicheLabel = isBrandBusiness ? 'Business Type' : 'Content Niche';

      return (
        <div className="animate-fadeIn">
          <h2 className="mb-2 text-xl font-display font-bold text-slate-900 sm:text-2xl">
            {nicheTitle}
          </h2>
          <p className="mb-6 text-slate-500">{nicheHelper}</p>

          <FieldLabel>{nicheLabel}</FieldLabel>
          <input
            type="text"
            value={formData.niche}
            onChange={(event) => setFormData((prev) => ({ ...prev, niche: event.target.value }))}
            placeholder={nichePlaceholder}
            className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-base outline-none transition-all focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20"
          />

          <div className="mt-5">
            <FieldLabel>Target Audience</FieldLabel>
            <input
              type="text"
              value={formData.target_audience}
              onChange={(event) => setFormData((prev) => ({ ...prev, target_audience: event.target.value }))}
              placeholder={isBrandBusiness ? 'e.g. Busy moms, local homeowners, small biz owners...' : 'e.g. Aspiring photographers, new entrepreneurs...'}
              className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-base outline-none transition-all focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20"
            />
            <p className="mt-1 text-sm text-slate-400">Who are you creating content for?</p>
          </div>
        </div>
      );
    }

    // Step 5: Primary Goal (brand) or Monetization Path (creator)
    if (step === 5) {
      if (isBrandBusiness) {
        return (
          <div className="animate-fadeIn">
            <h2 className="mb-2 text-xl font-display font-bold text-slate-900 sm:text-2xl">
              What's the #1 thing you want your social media to do?
            </h2>
            <p className="mb-6 text-slate-500">We'll tune your content strategy around this</p>

            <div className="space-y-3">
              {BUSINESS_GOAL_OPTIONS.map((option) => {
                const isSelected = formData.business_primary_goal === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, business_primary_goal: option.value }))
                    }
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
            What's your goal with your content?
          </h2>
          <p className="mb-6 text-slate-500">We'll tune your content strategy around this</p>

          <div className="space-y-3">
            {CREATOR_MONETIZATION_OPTIONS.map((option) => {
              const isSelected = formData.creator_monetization_path === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      creator_monetization_path: option.value,
                    }))
                  }
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

    // Step 6: Audience Location (brand) or Audience Stage (creator)
    if (step === 6) {
      if (isBrandBusiness) {
        return (
          <div className="animate-fadeIn">
            <h2 className="mb-2 text-xl font-display font-bold text-slate-900 sm:text-2xl">
              Where is most of your target audience?
            </h2>
            <p className="mb-6 text-slate-500">
              Helps us target content and hashtags for your reach
            </p>

            <div className="space-y-3">
              {AUDIENCE_LOCATION_OPTIONS.map((option) => {
                const isSelected = formData.audience_location_type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        audience_location_type: option.value,
                        is_local_business:
                          option.value === 'mostly_local' || option.value === 'split_evenly',
                      }))
                    }
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
            How would you describe your audience right now?
          </h2>
          <p className="mb-6 text-slate-500">
            We'll tailor your growth strategy to your current stage
          </p>

          <div className="space-y-3">
            {AUDIENCE_STAGE_OPTIONS.map((option) => {
              const isSelected = formData.audience_stage === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, audience_stage: option.value }))
                  }
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

    // Step 7: Platforms
    if (step === 7) {
      return (
        <div className="animate-fadeIn">
          <h2 className="mb-2 text-xl font-display font-bold text-slate-900 sm:text-2xl">
            {isBrandBusiness
              ? 'Which platforms do you want to post on?'
              : 'Which platforms do you want to create content for?'}
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
        </div>
      );
    }

    // Step 8: Posting Frequency
    return (
      <div className="animate-fadeIn">
        <h2 className="mb-2 text-xl font-display font-bold text-slate-900 sm:text-2xl">
          How often do you want to post?
        </h2>
        <p className="mb-6 text-slate-500">We'll plan your content calendar around this</p>

        <div className="space-y-3">
          {POSTING_FREQUENCY_OPTIONS.map((option) => {
            const isSelected = formData.posting_frequency === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, posting_frequency: option.value }))
                }
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
                  <Calendar className="h-5 w-5" />
                </div>
                <span className="flex-1 font-semibold text-slate-900">{option.label}</span>
                {isSelected && <Check className="h-5 w-5 text-huttle-primary" />}
              </button>
            );
          })}
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
                  {formData.profile_type === 'solo_creator' ? (
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
                    disabled={
                      isSaving ||
                      (step === 1 && !formData.full_name.trim()) ||
                      (step === 2 && !formData.profile_type)
                    }
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
