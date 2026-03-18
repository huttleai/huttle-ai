import { useContext, useState, useEffect, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext'; // HUTTLE AI: updated 1
import { BrandContext } from '../context/BrandContext';
import { useToast } from '../context/ToastContext';
import {
  Mic2, Save, Sparkles, Briefcase, User, Check, BookOpen, Smile,
  PenTool, Heart, Info, Eye, TrendingUp, Calendar,
  MessageSquare, Lightbulb, Clock, Users,
} from 'lucide-react';
import { normalizeEnumValue } from '../utils/formatEnumLabel';

const PROFILE_TYPES = [
  {
    value: 'brand',
    label: 'Brand / Business',
    description: 'Small business, agency, or company',
    icon: Briefcase,
  },
  {
    value: 'creator',
    label: 'Solo Creator',
    description: 'Building your personal brand',
    icon: Sparkles,
  },
];

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'X (Twitter)' },
];

const BRAND_GOALS = [
  { value: 'brand_awareness', label: 'Increase brand awareness' },
  { value: 'drive_sales', label: 'Drive sales' },
  { value: 'build_community', label: 'Build community' },
  { value: 'educate_audience', label: 'Educate audience' },
  { value: 'generate_leads', label: 'Generate leads' },
];

const CREATOR_GOALS = [
  { value: 'grow_following', label: 'Grow my following' },
  { value: 'boost_engagement', label: 'Boost engagement' },
  { value: 'build_community', label: 'Build community' },
  { value: 'share_story', label: 'Share my story' },
  { value: 'monetize', label: 'Monetize content' },
];

const AUDIENCE_ACTION_OPTIONS = [
  { value: 'good_deal', label: 'A good deal / offer' },
  { value: 'social_proof', label: 'Social proof / results' },
  { value: 'education', label: 'Education / knowing more' },
  { value: 'feeling_understood', label: 'Feeling understood' },
  { value: 'fomo', label: 'FOMO / trending content' },
];

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'educational', label: 'Educational' },
  { value: 'bold', label: 'Bold' },
  { value: 'warm', label: 'Warm' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'raw_authentic', label: 'Raw/Authentic' },
  { value: 'motivational', label: 'Motivational' },
];

const WRITING_STYLE_OPTIONS = [
  { value: 'short_punchy', label: 'Short and punchy' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'data_facts', label: 'Data and facts' },
  { value: 'question_based', label: 'Question-based' },
  { value: 'how_to', label: 'How-to/instructional' },
];

const CONTENT_TO_POST_OPTIONS = [
  { value: 'behind_scenes', label: 'Behind the scenes' },
  { value: 'results', label: 'Results/transformations' },
  { value: 'educational_tips', label: 'Educational tips' },
  { value: 'trending', label: 'Trending topics' },
  { value: 'personal_stories', label: 'Personal stories' },
  { value: 'product_spotlight', label: 'Product/service spotlights' },
  { value: 'testimonials', label: 'Testimonials' },
  { value: 'polls_questions', label: 'Polls/questions' },
];

const FOLLOWER_COUNT_OPTIONS = [
  { value: 'under_500', label: 'Under 500' },
  { value: '500_2k', label: '500–2K' },
  { value: '2k_10k', label: '2K–10K' },
  { value: '10k_50k', label: '10K–50K' },
  { value: '50k_plus', label: '50K+' },
];

const BUSINESS_TYPE_OPTIONS = [
  { value: 'service', label: 'Service (appointment-based)' },
  { value: 'physical_product', label: 'Physical product' },
  { value: 'digital_product', label: 'Digital product' },
  { value: 'coaching', label: 'Coaching/consulting' },
  { value: 'retail', label: 'Retail' },
  { value: 'subscription', label: 'Subscription' },
];

const CONVERSION_GOAL_OPTIONS = [
  { value: 'book_appointment', label: 'Book an appointment' },
  { value: 'dm_us', label: 'DM us' },
  { value: 'visit_website', label: 'Visit website' },
  { value: 'buy_now', label: 'Buy now' },
  { value: 'get_quote', label: 'Get a quote' },
  { value: 'join_list', label: 'Join a list' },
];

const SHOW_UP_OPTIONS = [
  { value: 'on_camera', label: 'On camera (talking head)' },
  { value: 'voice_over', label: 'Voice over footage' },
  { value: 'text_on_screen', label: 'Text on screen' },
  { value: 'photos_only', label: 'Photos only' },
  { value: 'mixed', label: 'Mixed' },
];

const CONTENT_PERSONA_OPTIONS = [
  { value: 'the_expert', label: 'The Expert' },
  { value: 'the_entertainer', label: 'The Entertainer' },
  { value: 'the_motivator', label: 'The Motivator' },
  { value: 'the_documenter', label: 'The Documenter' },
  { value: 'the_educator', label: 'The Educator' },
  { value: 'the_storyteller', label: 'The Storyteller' },
];

const MONETIZATION_GOAL_OPTIONS = [
  { value: 'brand_deals', label: 'Brand deals' },
  { value: 'selling_own', label: 'Selling my own product/service' },
  { value: 'affiliate', label: 'Affiliate income' },
  { value: 'community', label: 'Community building' },
  { value: 'growing', label: 'Not yet — just growing' },
];

function normalizeSingleSelect(value, options) {
  if (!value) return '';
  const normalized = normalizeEnumValue(value);
  return options.some((o) => o.value === normalized) ? normalized : '';
}

function normalizeMultiSelect(values, options) {
  if (!Array.isArray(values)) return [];
  const valid = new Set(options.map((o) => o.value));
  return values.map((v) => normalizeEnumValue(v)).filter((v) => valid.has(v));
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-5 h-5 text-huttle-primary" />}
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      </div>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

function ChipSelect({ options, value, onChange, multi = false }) {
  const isSelected = (optionValue) =>
    multi ? (Array.isArray(value) && value.includes(optionValue)) : value === optionValue;

  const handleClick = (optionValue) => {
    if (multi) {
      const arr = Array.isArray(value) ? value : [];
      onChange(
        arr.includes(optionValue)
          ? arr.filter((v) => v !== optionValue)
          : [...arr, optionValue]
      );
    } else {
      onChange(value === optionValue ? '' : optionValue);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = isSelected(option.value);
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleClick(option.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
              active
                ? 'bg-huttle-primary text-white border-huttle-primary shadow-md'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function FieldInput({ label, required, helper, children }) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {helper && <p className="text-xs text-gray-400 mb-2">{helper}</p>}
      {children}
    </div>
  );
}

const inputClasses =
  'w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-huttle-primary/50 focus:border-huttle-primary outline-none transition-all shadow-sm';

export default function BrandVoice() {
  const { brandData, updateBrandData, refreshBrandData } = useContext(BrandContext);
  const { userProfile } = useContext(AuthContext); // HUTTLE AI: updated 1
  const { addToast } = useToast();

  const toFormData = (source = {}) => ({
    profileType: source.profileType || 'brand',
    handle: source.handle || source.socialHandle || '', // HUTTLE AI: updated 1
    niche: source.niche || '',
    subNiche: source.subNiche || '',
    city: source.city || '',
    industry: source.industry || '',
    targetAudience: source.targetAudience || '',
    brandVoice: source.brandVoice || '',
    platforms: source.platforms || [],
    goals: source.goals || [],
    audiencePainPoint: source.audiencePainPoint || '',
    audienceActionTrigger: source.audienceActionTrigger || '',
    toneChips: source.toneChips || [],
    writingStyle: source.writingStyle || '',
    examplePost: source.examplePost || '',
    contentToPost: source.contentToPost || [],
    contentToAvoid: source.contentToAvoid || '',
    followerCount: source.followerCount || '',
    primaryOffer: source.primaryOffer || '',
    conversionGoal: source.conversionGoal || '',
    contentPersona: source.contentPersona || '',
    monetizationGoal: source.monetizationGoal || '',
    showUpStyle: source.showUpStyle || '',
    creatorArchetype: source.creatorArchetype || '',
  });

  const [formData, setFormData] = useState(toFormData(brandData));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (brandData) setFormData(toFormData(brandData));
  }, [brandData]);

  useEffect(() => {
    setHasUnsavedChanges(JSON.stringify(formData) !== JSON.stringify(toFormData(brandData)));
  }, [formData, brandData]);

  const isCreator = formData.profileType === 'creator';
  const goals = isCreator ? CREATOR_GOALS : BRAND_GOALS;

  const set = (key) => (e) => {
    const val = typeof e === 'string' || Array.isArray(e) ? e : e?.target?.value ?? '';
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const setCapitalized = (key) => (e) => {
    const raw = e.target.value;
    setFormData((prev) => ({ ...prev, [key]: raw.charAt(0).toUpperCase() + raw.slice(1) }));
  };

  const toggleArray = (key) => (val) => {
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key].includes(val)
        ? prev[key].filter((v) => v !== val)
        : [...prev[key], val],
    }));
  };

  const completeness = useMemo(() => {
    const fields = [
      { weight: 8, filled: !!formData.profileType },
      { weight: 8, filled: !!formData.niche },
      { weight: 8, filled: !!formData.targetAudience },
      { weight: 6, filled: formData.platforms?.length > 0 },
      { weight: 5, filled: formData.goals?.length > 0 },
      { weight: 6, filled: !!formData.audiencePainPoint },
      { weight: 8, filled: formData.toneChips?.length > 0 },
      { weight: 6, filled: !!formData.writingStyle },
      { weight: 8, filled: !!formData.examplePost },
      { weight: 5, filled: formData.contentToPost?.length > 0 },
      { weight: 5, filled: !!formData.followerCount },
    ];
    if (!isCreator) {
      fields.push({ weight: 5, filled: !!formData.conversionGoal });
    } else {
      fields.push({ weight: 5, filled: !!formData.contentPersona });
    }
    const total = fields.reduce((s, f) => s + f.weight, 0);
    const filled = fields.reduce((s, f) => s + (f.filled ? f.weight : 0), 0);
    return Math.round((filled / total) * 100);
  }, [formData, isCreator]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateBrandData(formData);
      if (result?.success === false) {
        addToast(result.error || 'Failed to save. Please try again.', 'error');
        return;
      }
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
    setFormData(toFormData({}));
    addToast('Form reset successfully', 'info');
  };

  const displayFirstName = userProfile?.first_name?.trim() || ''; // HUTTLE AI: updated 1

  const CompletenessRing = ({ className = '' }) => (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 transform -rotate-90">
          <circle cx="24" cy="24" r="20" fill="none" stroke="#f3f4f6" strokeWidth="4" />
          <circle
            cx="24" cy="24" r="20" fill="none"
            stroke={isCreator ? '#01bad2' : '#0ea5e9'}
            strokeWidth="4" strokeLinecap="round"
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
          {completeness === 100 ? 'Complete!' : 'In Progress'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-14 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8">
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
                  : 'Customize all AI features to your brand, niche, and industry'}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex">
            <div className="bg-white p-2 pr-4 rounded-xl border border-gray-100 shadow-sm">
              <CompletenessRing />
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
            {PROFILE_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = formData.profileType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, profileType: type.value }))}
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

        {/* ── SECTION 1: ABOUT YOU / YOUR BRAND ── */}
        <div className="card p-6 mb-6">
          <SectionHeader icon={User} title="About You" subtitle="Basic information about you and your brand" />
          <div className="space-y-6">
            {displayFirstName && ( // HUTTLE AI: updated 1
              <p className="text-sm text-gray-500">
                Personalizing content for: <span className="font-semibold text-gray-900">{displayFirstName}</span>
              </p>
            )}

            <FieldInput
              label="Your Name or Handle"
              helper="How you want to be referred to in your content"
            >
              <input
                type="text"
                value={formData.handle}
                onChange={set('handle')}
                placeholder="e.g. @AnytimeGlow or Glow by Angela"
                className={inputClasses}
              />
            </FieldInput>

            <FieldInput label={isCreator ? 'Content Focus' : 'Niche'}>
              <input
                type="text"
                value={formData.niche}
                onChange={setCapitalized('niche')}
                placeholder={isCreator ? 'e.g., Lifestyle, Fitness, Comedy' : 'e.g., Medical Spa, Fitness, Beauty'}
                className={inputClasses}
              />
            </FieldInput>

            <FieldInput label="Sub-niche" helper="Optional — narrow down your niche further">
              <input
                type="text"
                value={formData.subNiche}
                onChange={setCapitalized('subNiche')}
                placeholder="e.g., Anti-aging treatments, Beginner fitness"
                className={inputClasses}
              />
            </FieldInput>

            <FieldInput label="City" helper="Used to localize dashboard trends and hashtags when available.">
              <input
                type="text"
                value={formData.city}
                onChange={setCapitalized('city')}
                placeholder="e.g., Atlanta"
                className={inputClasses}
              />
            </FieldInput>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                Primary Platforms
              </label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const active = formData.platforms.includes(p.value);
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => toggleArray('platforms')(p.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                        active
                          ? 'bg-huttle-primary text-white border-huttle-primary shadow-md'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 2: YOUR AUDIENCE ── */}
        <div className="card p-6 mb-6">
          <SectionHeader icon={Users} title="Your Audience" subtitle="Help the AI understand who you're talking to" />
          <div className="space-y-6">
            <FieldInput label={isCreator ? 'Who they are' : 'Who they are'}>
              <textarea
                value={formData.targetAudience}
                onChange={setCapitalized('targetAudience')}
                placeholder="e.g., Women 25-45 interested in skincare"
                rows="3"
                className={`${inputClasses} resize-none`}
              />
            </FieldInput>

            <FieldInput
              label="Their biggest pain point"
              helper="What keeps them up at night related to your niche?"
            >
              <input
                type="text"
                value={formData.audiencePainPoint}
                onChange={setCapitalized('audiencePainPoint')}
                placeholder="e.g., They want smooth skin but fear pain and cost"
                className={inputClasses}
              />
            </FieldInput>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                What makes them act
              </label>
              <ChipSelect
                options={AUDIENCE_ACTION_OPTIONS}
                value={formData.audienceActionTrigger}
                onChange={set('audienceActionTrigger')}
              />
            </div>
          </div>
        </div>

        {/* ── SECTION 3: YOUR VOICE ── */}
        <div className="card p-6 mb-6">
          <SectionHeader icon={Mic2} title="Your Voice" subtitle="Define how the AI should sound when writing for you" />
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                Tone
              </label>
              <p className="text-xs text-gray-400 mb-3">Select all that apply</p>
              <ChipSelect
                options={TONE_OPTIONS}
                value={formData.toneChips}
                onChange={set('toneChips')}
                multi
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                Writing Style
              </label>
              <ChipSelect
                options={WRITING_STYLE_OPTIONS}
                value={formData.writingStyle}
                onChange={set('writingStyle')}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                A post that sounds like you
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Paste a caption or post you've written that felt like you. This is the single most useful thing you can give the AI — it will mirror your exact style.
              </p>
              <textarea
                value={formData.examplePost}
                onChange={set('examplePost')}
                placeholder="Paste your example here..."
                rows="4"
                className={`${inputClasses} resize-none`}
              />
              <div className="mt-2 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-huttle-50/60 border border-huttle-primary/10">
                <Sparkles className="w-4 h-4 text-huttle-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600">
                  The AI will match your sentence length, emoji style, punctuation, and vocabulary from this example.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 4: YOUR CONTENT ── */}
        <div className="card p-6 mb-6">
          <SectionHeader icon={PenTool} title="Your Content" subtitle="What kind of content you want to create" />
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                Content I want to post more of
              </label>
              <ChipSelect
                options={CONTENT_TO_POST_OPTIONS}
                value={formData.contentToPost}
                onChange={set('contentToPost')}
                multi
              />
            </div>

            <FieldInput label="Content to avoid" helper="Optional">
              <input
                type="text"
                value={formData.contentToAvoid}
                onChange={set('contentToAvoid')}
                placeholder="e.g., Nothing too salesy, no dancing trends"
                className={inputClasses}
              />
            </FieldInput>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                Content Goals
              </label>
              <div className="flex flex-wrap gap-2">
                {goals.map((g) => {
                  const active = formData.goals.includes(g.value);
                  return (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => toggleArray('goals')(g.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                        active
                          ? 'bg-huttle-primary text-white border-huttle-primary shadow-md'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 5: GROWTH ── */}
        <div className="card p-6 mb-6">
          <SectionHeader icon={TrendingUp} title="Growth" subtitle="Helps AI calibrate strategy for your stage of growth" />
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
              Your current following
            </label>
            <ChipSelect
              options={FOLLOWER_COUNT_OPTIONS}
              value={formData.followerCount}
              onChange={set('followerCount')}
            />
          </div>
        </div>

        {/* ── SECTION 6: BUSINESS DETAILS (business only) ── */}
        {!isCreator && (
          <div className="card p-6 mb-6 animate-fadeIn">
            <SectionHeader icon={Briefcase} title="Business Details" subtitle="Tell the AI about your business so it can optimize for conversions" />
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                  What you sell
                </label>
                <ChipSelect
                  options={BUSINESS_TYPE_OPTIONS}
                  value={formData.industry}
                  onChange={set('industry')}
                />
              </div>

              <FieldInput label="Your main offer">
                <input
                  type="text"
                  value={formData.primaryOffer}
                  onChange={set('primaryOffer')}
                  placeholder="e.g., Laser hair removal packages from $199"
                  className={inputClasses}
                />
              </FieldInput>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                  Primary conversion goal
                </label>
                <ChipSelect
                  options={CONVERSION_GOAL_OPTIONS}
                  value={formData.conversionGoal}
                  onChange={set('conversionGoal')}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 7: CREATOR DETAILS (creator only) ── */}
        {isCreator && (
          <div className="card p-6 mb-6 animate-fadeIn">
            <SectionHeader icon={Sparkles} title="Creator Details" subtitle="Help the AI understand your creative style" />
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                  How you show up
                </label>
                <ChipSelect
                  options={SHOW_UP_OPTIONS}
                  value={formData.showUpStyle}
                  onChange={set('showUpStyle')}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                  Your content persona
                </label>
                <ChipSelect
                  options={CONTENT_PERSONA_OPTIONS}
                  value={formData.contentPersona}
                  onChange={set('contentPersona')}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                  Monetization goal
                </label>
                <ChipSelect
                  options={MONETIZATION_GOAL_OPTIONS}
                  value={formData.monetizationGoal}
                  onChange={set('monetizationGoal')}
                />
              </div>
            </div>
          </div>
        )}

        {/* Save / Reset Buttons */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              className={`flex-1 px-6 py-3 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
                !hasUnsavedChanges || isSaving
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
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
              type="button"
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
          <CompletenessRing />
          <p className="text-sm text-gray-500 mt-2">
            {completeness === 100
              ? 'Your profile is complete!'
              : 'Complete your profile for better AI suggestions'}
          </p>
        </div>

        {/* How This Helps */}
        <div className="rounded-xl border p-5 md:p-6 bg-gradient-to-r from-huttle-50/50 to-cyan-50/50 border-huttle-primary/20 transition-all duration-500">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 flex-shrink-0 mt-1 text-huttle-primary" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How This Helps</h3>
              <p className="text-sm text-gray-700">
                {isCreator
                  ? 'Your creator profile personalizes all AI-generated content across Huttle AI. Trend Lab and AI Plan Builder will match your unique voice and connect authentically with your community.'
                  : 'Your brand settings personalize all AI-generated content across Huttle AI. Trend Lab and AI Plan Builder will tailor suggestions specifically to your niche and voice.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
