import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandContext, useBrand } from '../context/BrandContext';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSubscription } from '../context/SubscriptionContext';
import {
  User,
  Target,
  Users,
  MessageSquare,
  Share2,
  Rocket,
  ChevronDown,
  Check,
  X,
  Briefcase,
  Sparkles,
  Save,
  Info,
} from 'lucide-react';
import { normalizeEnumValue } from '../utils/formatEnumLabel';
import { formatDisplayName } from '../utils/brandContextBuilder';
import { getBrandProfileSectionCompletion } from '../hooks/useBrandProfileSectionCompletion';
import { normalizePlatformName } from '../hooks/usePreferredPlatforms';
import {
  InstagramIconMono,
  FacebookIconMono,
  TikTokIconMono,
  TwitterXIconMono,
  YouTubeIconMono,
} from '../components/SocialIcons';

const SECTION_ORDER = ['aboutYou', 'yourNiche', 'yourAudience', 'yourVoice', 'yourPlatforms', 'yourGoals'];

const MAX_PLATFORMS = 4;
const MAX_TONE = 3;

const CREATOR_KIND = {
  solo: 'solo_creator',
  brand: 'brand_business',
};

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', Icon: InstagramIconMono },
  { id: 'tiktok', label: 'TikTok', Icon: TikTokIconMono },
  { id: 'youtube', label: 'YouTube', Icon: YouTubeIconMono },
  { id: 'facebook', label: 'Facebook', Icon: FacebookIconMono },
  { id: 'x', label: 'X (Twitter)', Icon: TwitterXIconMono },
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
  { value: 'fomo', label: 'Fear of missing out' },
  { value: 'social_proof', label: 'Social proof' },
  { value: 'education', label: 'Education / awareness' },
  { value: 'feeling_understood', label: 'Desire for transformation' },
  { value: 'good_deal', label: 'Limited-time urgency' },
];

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'educational', label: 'Educational' },
  { value: 'bold', label: 'Bold' },
  { value: 'warm', label: 'Warm' },
  { value: 'witty', label: 'Witty' },
  { value: 'empathetic', label: 'Empathetic' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'raw_authentic', label: 'Raw/Authentic' },
  { value: 'motivational', label: 'Motivational' },
];

const WRITING_STYLE_OPTIONS = [
  { value: 'short_punchy', label: 'Short & Punchy' },
  { value: 'data_facts', label: 'Detailed & Informative' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'how_to', label: 'Listicle / Tips' },
  { value: 'conversational_casual', label: 'Conversational / Casual' },
  { value: 'question_based', label: 'Question-based' },
];

const CONTENT_TO_POST_OPTIONS = [
  { value: 'behind_scenes', label: 'Behind the Scenes' },
  { value: 'results', label: 'Results/transformations' },
  { value: 'educational_tips', label: 'Tips & How-tos' },
  { value: 'trending', label: 'Trending topics' },
  { value: 'personal_stories', label: 'Personal Stories' },
  { value: 'product_spotlight', label: 'Promotions' },
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

const GROWTH_STAGE_OPTIONS = [
  { value: 'just_starting_out', label: 'Just Starting Out' },
  { value: 'building_momentum', label: 'Building Momentum' },
  { value: 'established', label: 'Established' },
  { value: 'large_audience', label: 'Large Audience' },
];

const POSTING_FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: '3_5x_week', label: '3–5x per week' },
  { value: '1_2x_week', label: '1–2x per week' },
  { value: 'few_times_month', label: 'A few times a month' },
];

const MAX_VIBE_SELECTIONS = 3;
const MAX_PILLAR_SELECTIONS = 2;

const BRAND_VIBES_OPTIONS = [
  { label: 'Authentic & Raw' },
  { label: 'Professional & Polished' },
  { label: 'Bold & Edgy' },
  { label: 'Warm & Community-Focused' },
  { label: 'Fun & Playful' },
  { label: 'Educational & Informative' },
  { label: 'Aspirational & Inspiring' },
  { label: 'Luxe & Elevated' },
];

const CONTENT_FOCUS_PILLARS_OPTIONS = [
  { label: 'My customers & community' },
  { label: 'My life running my business' },
  { label: 'Behind the scenes' },
  { label: 'Products & services in action' },
  { label: 'Education & tips' },
  { label: 'Personal stories & journey' },
  { label: 'Trends & pop culture' },
];

const AUDIENCE_STAGE_OPTIONS = [
  { value: 'early', label: 'Just starting out (under 500)' },
  { value: 'growing', label: 'Building momentum (500–10K)' },
  { value: 'established', label: 'Established audience (10K+)' },
];

const BUSINESS_PRIMARY_GOAL_OPTIONS = [
  { value: 'drive_sales', label: 'Drive Sales' },
  { value: 'increase_foot_traffic', label: 'Increase Foot Traffic' },
  { value: 'build_community', label: 'Build Community' },
  { value: 'grow_online_presence', label: 'Grow Online Presence' },
  { value: 'build_brand_awareness', label: 'Build Brand Awareness' },
  { value: 'launch_product', label: 'Launch a Product' },
];

const CREATOR_MONETIZATION_PATH_OPTIONS = [
  { value: 'brand_deals', label: 'Brand Deals' },
  { value: 'digital_products', label: 'Digital Products' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'affiliate', label: 'Affiliate' },
  { value: 'not_yet_monetizing', label: 'Just Growing for Now' },
];

function normalizePlatformId(raw) {
  if (!raw) return raw;
  const v = String(raw).toLowerCase();
  if (v === 'twitter') return 'x';
  return v;
}

function normalizePlatformList(arr) {
  if (!Array.isArray(arr)) return [];
  return [
    ...new Set(
      arr
        .map((raw) => normalizePlatformName(raw) || normalizePlatformId(raw))
        .filter(Boolean)
    ),
  ];
}

function deriveCreatorKind(source = {}) {
  const ct = source.creatorType;
  if (ct) {
    const n = normalizeEnumValue(ct);
    if (n === 'solo_creator' || n === 'brand_business') return n;
  }
  const raw = String(ct || '').toLowerCase();
  if (raw.includes('solo')) return CREATOR_KIND.solo;
  if (raw.includes('brand')) return CREATOR_KIND.brand;

  const pt = String(source.profileType || '').toLowerCase();
  if (pt === 'creator') return CREATOR_KIND.solo;
  return CREATOR_KIND.brand;
}

function deriveUserBrandType(source = {}) {
  const ubt = String(source.userBrandType || '').trim().toLowerCase();
  if (ubt === 'solo_creator' || ubt === 'business_owner' || ubt === 'hybrid') return ubt;

  const ct = String(source.creatorType || '').trim().toLowerCase();
  const pt = String(source.profileType || '').trim().toLowerCase();
  if (ct === 'solo_creator' || pt === 'solo_creator' || pt === 'creator') return 'solo_creator';
  if (ct === 'brand_business' || pt === 'brand_business' || pt === 'business' || pt === 'brand') return 'business_owner';
  return 'hybrid';
}

function toFormData(source = {}) {
  const kind = deriveCreatorKind(source);
  return {
    firstName: source.firstName || '',
    userBrandType: deriveUserBrandType(source),
    creatorKind: kind,
    brandName: source.brandName || '',
    handle: source.handle || '',
    niche: source.niche || '',
    subNiche: source.subNiche || '',
    city: source.city || '',
    locationState: source.locationState ?? source.location_state ?? null,
    country: source.country || 'US',
    industry: source.industry || '',
    growthStage: source.growthStage || '',
    targetAudience: source.targetAudience || '',
    brandVoice: source.brandVoice || '',
    platforms: normalizePlatformList(source.platforms || []),
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
    contentStrengths: source.contentStrengths || [],
    biggestChallenge: source.biggestChallenge || '',
    hookStylePreference: source.hookStylePreference || '',
    emotionalTriggers: source.emotionalTriggers || [],
    businessPrimaryGoal: source.businessPrimaryGoal || null,
    creatorMonetizationPath: source.creatorMonetizationPath || null,
    isLocalBusiness: source.isLocalBusiness || false,
    postingFrequency: source.postingFrequency || '',
    audienceStage: source.audienceStage || '',
    brandVibes: source.brandVibes || [],
    contentFocusPillars: source.contentFocusPillars || [],
  };
}

function getInitialFormData() {
  return toFormData({});
}

function buildBrandUpdatePayload(fd) {
  return {
    firstName: fd.firstName?.trim() || '',
    userBrandType: fd.userBrandType || 'hybrid',
    profileType: fd.userBrandType === 'solo_creator' ? 'creator' : 'business',
    creatorType: fd.userBrandType === 'solo_creator' ? CREATOR_KIND.solo : CREATOR_KIND.brand,
    brandName: fd.brandName,
    handle: fd.handle,
    niche: fd.niche,
    subNiche: fd.subNiche,
    city: fd.city,
    locationState: fd.locationState,
    country: fd.country,
    industry: fd.industry,
    growthStage: fd.growthStage,
    targetAudience: fd.targetAudience,
    brandVoice: fd.brandVoice,
    platforms: fd.platforms,
    goals: fd.goals,
    audiencePainPoint: fd.audiencePainPoint,
    audienceActionTrigger: fd.audienceActionTrigger,
    toneChips: fd.toneChips,
    writingStyle: fd.writingStyle,
    examplePost: fd.examplePost,
    contentToPost: fd.contentToPost,
    contentToAvoid: fd.contentToAvoid,
    followerCount: fd.followerCount,
    primaryOffer: fd.primaryOffer,
    conversionGoal: fd.conversionGoal,
    contentPersona: fd.contentPersona,
    monetizationGoal: fd.monetizationGoal,
    showUpStyle: fd.showUpStyle,
    creatorArchetype: fd.creatorArchetype,
    contentStrengths: fd.contentStrengths,
    biggestChallenge: fd.biggestChallenge,
    hookStylePreference: fd.hookStylePreference,
    emotionalTriggers: fd.emotionalTriggers,
    businessPrimaryGoal: fd.businessPrimaryGoal || null,
    creatorMonetizationPath: fd.creatorMonetizationPath || null,
    isLocalBusiness: typeof fd.isLocalBusiness === 'boolean' ? fd.isLocalBusiness : false,
    postingFrequency: fd.postingFrequency || null,
    audienceStage: fd.audienceStage || null,
    brandVibes: Array.isArray(fd.brandVibes) ? fd.brandVibes : [],
    contentFocusPillars: Array.isArray(fd.contentFocusPillars) ? fd.contentFocusPillars : [],
  };
}

function normalizeWritingStyle(value, options) {
  if (!value) return '';
  const normalized = normalizeEnumValue(value);
  return options.some((o) => o.value === normalized) ? normalized : '';
}

function NewBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ml-2 leading-none">
      NEW
    </span>
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
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border min-h-[44px] ${
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

function sectionToTestId(key) {
  return key.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

function CollapsibleSection({
  sectionKey,
  title,
  subtitle,
  icon: Icon,
  complete,
  isOpen,
  onToggle,
  children,
  onSave,
  saveDisabled = false,
  saveTestId,
}) {
  const testSeg = sectionToTestId(sectionKey);
  return (
    <div
      className="card overflow-hidden mb-4 md:mb-6"
      data-testid={`brand-profile-section-${testSeg}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 md:gap-4 px-4 py-4 md:px-6 md:py-4 min-h-[48px] text-left hover:bg-gray-50/80 transition-colors"
        data-testid={`brand-profile-section-toggle-${testSeg}`}
        aria-expanded={isOpen}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-huttle-primary/10">
          <Icon className="w-5 h-5 text-huttle-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900">{title}</p>
          <p className="text-xs md:text-sm text-gray-500 truncate">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {complete ? (
            <Check className="w-5 h-5 text-green-500" data-testid={`brand-profile-section-complete-${testSeg}`} />
          ) : (
            <X className="w-5 h-5 text-red-500" data-testid={`brand-profile-section-incomplete-${testSeg}`} />
          )}
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-6 pt-0 md:px-6 border-t border-gray-100">
              {children}
              {onSave && (
                <div className="mt-6 flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSave();
                    }}
                    disabled={saveDisabled}
                    data-testid={saveTestId}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-huttle-primary px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-huttle-primary-dark disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BrandVoice() {
  const { brandData, updateBrandData, brandFetchComplete } = useContext(BrandContext);
  const { isCreator, hasExplicitBrandType } = useBrand();
  const { user, updateUser } = useContext(AuthContext);
  const { addToast } = useToast();
  const { userTier } = useSubscription();

  const [formData, setFormData] = useState(getInitialFormData);
  const [openSections, setOpenSections] = useState(() =>
    Object.fromEntries(SECTION_ORDER.map((k) => [k, false]))
  );
  /** Must match initial `formData` so dirty detection and first hydrate behave correctly. */
  const baselineRef = useRef(JSON.stringify(getInitialFormData()));
  const autoExpandDoneRef = useRef(false);
  /** Only hydrate the form when fetch completes the first time — not on every `brandData` update (avoids stale fetch wiping edits). */
  const prevBrandFetchCompleteRef = useRef(false);
  const debounceRef = useRef(null);
  const [saveUi, setSaveUi] = useState('idle');
  const formRef = useRef(null);
  const userRef = useRef(user);
  userRef.current = user;
  formRef.current = formData;

  const isFoundingMember = ['founders', 'founder', 'builder', 'builders'].includes(userTier);

  const syncFromBrandData = useCallback((source, runAutoExpand = false) => {
    const next = toFormData(source);
    setFormData(next);
    baselineRef.current = JSON.stringify(next);
    if (runAutoExpand && !autoExpandDoneRef.current) {
      autoExpandDoneRef.current = true;
      const u = userRef.current;
      const { sections, completedCount, totalCount } = getBrandProfileSectionCompletion(next, u);
      const anyIncomplete = completedCount < totalCount;
      const firstIncomplete = SECTION_ORDER.find((k) => !sections[k].complete);
      if (anyIncomplete && firstIncomplete) {
        setOpenSections((o) => ({ ...o, [firstIncomplete]: true }));
      }
    }
  }, []);

  useEffect(() => {
    if (!brandFetchComplete) {
      prevBrandFetchCompleteRef.current = false;
      return;
    }

    const fetchJustFinished = !prevBrandFetchCompleteRef.current;
    prevBrandFetchCompleteRef.current = true;

    if (!fetchJustFinished) {
      return;
    }

    const dirtyNow = JSON.stringify(formRef.current) !== baselineRef.current;
    if (dirtyNow) return;
    const runExpand = !autoExpandDoneRef.current;
    syncFromBrandData(brandData, runExpand);
  }, [brandFetchComplete, brandData, syncFromBrandData]);

  useEffect(() => {
    autoExpandDoneRef.current = false;
    prevBrandFetchCompleteRef.current = false;
  }, [user?.id]);

  const isDirty = JSON.stringify(formData) !== baselineRef.current;
  const saveDisabled = !isDirty || saveUi === 'saving';

  const completion = useMemo(
    () => getBrandProfileSectionCompletion(formData, user),
    [formData, user]
  );

  const displayName = formatDisplayName(
    formData.firstName
      || user?.user_metadata?.first_name
      || user?.user_metadata?.name
      || ''
  );

  const persistForm = useCallback(
    async ({ isManual = false, successToast = null } = {}) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      const fd = formRef.current;
      const dirty = JSON.stringify(fd) !== baselineRef.current;
      if (!dirty) {
        if (isManual) {
          addToast('No changes to save.', 'info');
        }
        setSaveUi((s) => (s === 'pending' || s === 'saving' ? 'idle' : s));
        return;
      }

      setSaveUi('saving');
      try {
        const result = await updateBrandData(buildBrandUpdatePayload(fd));
        if (result?.success === false) {
          addToast(result.error || 'Could not save. Try again.', 'error');
          setSaveUi('idle');
          return;
        }
        if (result?.preferencesError) {
          addToast(
            `Profile saved, but some settings didn’t sync: ${result.preferencesError}. Try again or check your connection.`,
            'warning'
          );
        }
        const fn = fd.firstName?.trim();
        if (fn) {
          await updateUser({
            name: fn,
            full_name: fn,
            first_name: fn,
          });
        }
        baselineRef.current = JSON.stringify(fd);
        setSaveUi('saved');
        if (successToast) {
          addToast(successToast, 'success');
        }
      } catch (e) {
        console.error(e);
        addToast('Save failed. Changes are kept locally.', 'error');
        setSaveUi('idle');
      }
    },
    [addToast, updateBrandData, updateUser]
  );

  useEffect(() => {
    if (!brandFetchComplete) return;
    const dirty = JSON.stringify(formData) !== baselineRef.current;
    if (!dirty) {
      setSaveUi((s) => (s === 'pending' ? 'idle' : s));
      return;
    }

    setSaveUi((s) => (s === 'saving' ? s : 'pending'));
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void persistForm({ isManual: false });
    }, 1500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [formData, brandFetchComplete, persistForm]);

  useEffect(() => {
    if (saveUi !== 'saved') return;
    const t = setTimeout(() => setSaveUi('idle'), 2000);
    return () => clearTimeout(t);
  }, [saveUi]);

  const setField = (patch) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const isBusiness = formData.creatorKind === CREATOR_KIND.brand;
  const goalsMeta = isBusiness ? BRAND_GOALS : CREATOR_GOALS;

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePlatform = (id) => {
    const p = normalizePlatformName(id) || normalizePlatformId(id);
    if (!p) return;
    setFormData((prev) => {
      const norm = (x) => normalizePlatformName(x) || normalizePlatformId(x);
      const has = prev.platforms.some((x) => norm(x) === p);
      const effectiveCount = new Set(prev.platforms.map((x) => norm(x)).filter(Boolean)).size;
      if (!has && effectiveCount >= MAX_PLATFORMS) {
        addToast(`Choose up to ${MAX_PLATFORMS} platforms.`, 'warning');
        return prev;
      }
      const next = has
        ? prev.platforms.filter((x) => norm(x) !== p)
        : [...prev.platforms, p];
      const platforms = [...new Set(next.map((x) => norm(x)).filter(Boolean))];
      return { ...prev, platforms };
    });
  };

  const toggleGoal = (val) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.includes(val)
        ? prev.goals.filter((v) => v !== val)
        : [...prev.goals, val],
    }));
  };

  const toggleTone = (value) => {
    setFormData((prev) => {
      const cur = prev.toneChips || [];
      if (cur.includes(value)) {
        return { ...prev, toneChips: cur.filter((v) => v !== value) };
      }
      if (cur.length >= MAX_TONE) {
        addToast(`Pick up to ${MAX_TONE} tones.`, 'warning');
        return prev;
      }
      return { ...prev, toneChips: [...cur, value] };
    });
  };

  return (
    <div
      className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-12 lg:ml-64 pt-14 lg:pt-20 px-4 md:px-6 lg:px-8 pb-24 md:pb-28"
      data-testid="brand-profile-page"
    >
      <div className="pt-6 md:pt-0 mb-6 md:mb-8 max-w-3xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 shrink-0">
              <User className="w-6 h-6 md:w-7 md:h-7 text-huttle-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">Brand Profile</h1>
                {isFoundingMember && (
                  <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    🏆 FOUNDING MEMBER
                  </span>
                )}
              </div>
              <p className="text-sm md:text-base text-gray-500">
                Everything the AI needs to personalize your content
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {displayName ? `Hi, ${displayName}` : ''}
                {user?.email ? (
                  <span className="text-gray-400">
                    {displayName ? ' · ' : ''}
                    {user.email}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm" data-testid="brand-profile-save-status">
              {isDirty && saveUi === 'pending' && (
                <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                  <span className="h-2 w-2 rounded-full bg-amber-500" data-testid="brand-profile-unsaved-dot" />
                  Unsaved changes
                </span>
              )}
              {saveUi === 'saving' && (
                <span className="text-gray-500 animate-pulse">Saving...</span>
              )}
              {saveUi === 'saved' && (
                <span className="text-green-600 font-medium">Saved ✓</span>
              )}
            </div>
          </div>
        </div>

        <div
          className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
          data-testid="brand-profile-summary-bar"
        >
          {completion.completedCount === completion.totalCount ? (
            <p className="text-sm font-semibold text-green-600">All sections complete ✓</p>
          ) : (
            <p className="text-sm font-medium text-gray-800">
              {completion.completedCount} of {completion.totalCount} sections complete
            </p>
          )}
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-[#01BAD2] transition-all duration-500"
              style={{
                width: `${(completion.completedCount / completion.totalCount) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-3xl">
        {/* New-fields callout — only for profiles with no persisted niche yet (supplementary fields, not required once niche exists) */}
        {!hasExplicitBrandType && !String(brandData?.niche ?? '').trim() && (
          <div className="mb-4 md:mb-6 flex gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sky-900">A few new fields need your attention</p>
              <p className="mt-1 text-sm text-sky-700 leading-relaxed">
                We added Creator Type, Your Vibe, and Content Focus to help the AI understand you better.
                The fields marked <NewBadge /> below are what&apos;s changed — update them and save to unlock smarter
                content across every tool.
              </p>
            </div>
          </div>
        )}

        {/* Section 1 — About You */}
        <CollapsibleSection
          sectionKey="aboutYou"
          title="About You"
          subtitle="Your identity and how we address you"
          icon={User}
          complete={completion.sections.aboutYou.complete}
          isOpen={openSections.aboutYou}
          onToggle={() => toggleSection('aboutYou')}
          onSave={() =>
            void persistForm({ isManual: true, successToast: 'About you saved.' })
          }
          saveDisabled={saveDisabled}
          saveTestId="brand-profile-save-section-about-you"
        >
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                  First name <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setField({ firstName: e.target.value })}
                  className={inputClasses}
                  placeholder="First name"
                  data-testid="brand-profile-first-name"
                />
              </label>
              <div>
                <span className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Email</span>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700 text-sm">
                  {user?.email || '—'}
                </div>
              </div>
            </div>

            <FieldInput
              label={<>Creator type {!hasExplicitBrandType && <NewBadge />}</>}
              required
              helper="Shapes your AI content philosophy for every feature"
            >
              <div className="grid grid-cols-1 gap-3">
                {[
                  {
                    value: 'solo_creator',
                    emoji: '🎤',
                    title: "I'm the brand",
                    subtitle: 'Your name, face, and story are the product',
                    testId: 'brand-profile-creator-solo',
                  },
                  {
                    value: 'business_owner',
                    emoji: '🏪',
                    title: 'I run a business',
                    subtitle: 'Coffee shop, salon, agency, studio — any kind',
                    testId: 'brand-profile-creator-brand',
                  },
                  {
                    value: 'hybrid',
                    emoji: '🚀',
                    title: "I'm building both",
                    subtitle: 'Your name and your business grow together',
                    testId: 'brand-profile-creator-hybrid',
                  },
                ].map((option) => {
                  const isSelected = formData.userBrandType === option.value;
                  const syncedCreatorKind =
                    option.value === 'solo_creator' ? CREATOR_KIND.solo : CREATOR_KIND.brand;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setField({
                          userBrandType: option.value,
                          creatorKind: syncedCreatorKind,
                          goals: [],
                        })
                      }
                      className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left min-h-[56px] transition-all ${
                        isSelected
                          ? 'border-huttle-primary bg-white shadow-md ring-1 ring-huttle-primary'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                      data-testid={option.testId}
                    >
                      <span className="text-2xl">{option.emoji}</span>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{option.title}</p>
                        <p className="text-xs text-gray-500">{option.subtitle}</p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 shrink-0 text-huttle-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </FieldInput>

            {isBusiness && (
              <FieldInput label="Business name" helper="Shown in AI-generated content">
                <input
                  type="text"
                  value={formData.brandName}
                  onChange={(e) => setField({ brandName: e.target.value })}
                  className={inputClasses}
                  placeholder="Your business name"
                  data-testid="brand-profile-business-name"
                />
              </FieldInput>
            )}

            <FieldInput label="Your name or handle" helper="How you sign posts or DMs">
              <input
                type="text"
                value={formData.handle}
                onChange={(e) => setField({ handle: e.target.value })}
                className={inputClasses}
                placeholder="@handle or display name"
                data-testid="brand-profile-handle"
              />
            </FieldInput>

            <div className="space-y-6">
              <FieldInput label="City" helper="Local trends and hashtags when available">
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setField({ city: e.target.value })}
                  className={inputClasses}
                  placeholder="e.g. Atlanta"
                />
              </FieldInput>

              <FieldInput label="State / Region">
                <input
                  type="text"
                  value={formData.locationState ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setField({ locationState: v.trim() ? v : null });
                  }}
                  className={inputClasses}
                  placeholder="e.g. Georgia, Ontario, New South Wales"
                />
              </FieldInput>

              <FieldInput label="Country">
                <input
                  type="text"
                  value={formData.country || 'US'}
                  onChange={(e) => setField({ country: e.target.value })}
                  className={inputClasses}
                  placeholder="e.g. US, UK, Australia, Canada"
                />
              </FieldInput>

              {!isCreator && (
                <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 uppercase tracking-wide">Local Business</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      Turn on if you serve a specific city or area — unlocks local hashtags and neighborhood content in AI
                      generation
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.isLocalBusiness}
                    onClick={() => setField({ isLocalBusiness: !formData.isLocalBusiness })}
                    className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-huttle-primary/50 focus:ring-offset-2 ${
                      formData.isLocalBusiness ? 'bg-huttle-primary' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                        formData.isLocalBusiness ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              )}

              {!isCreator && (
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                    Primary Business Goal
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    What&apos;s the #1 thing your social media should do for your business?
                  </p>
                  <ChipSelect
                    options={BUSINESS_PRIMARY_GOAL_OPTIONS}
                    value={formData.businessPrimaryGoal || ''}
                    onChange={(v) => setField({ businessPrimaryGoal: v || null })}
                  />
                </div>
              )}

              {isCreator && (
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                    How are you monetizing (or planning to)?
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    This shapes how your content positions you to your audience.
                  </p>
                  <ChipSelect
                    options={CREATOR_MONETIZATION_PATH_OPTIONS}
                    value={formData.creatorMonetizationPath || ''}
                    onChange={(v) => setField({ creatorMonetizationPath: v || null })}
                  />
                </div>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* Section 2 — Niche */}
        <CollapsibleSection
          sectionKey="yourNiche"
          title="Your Niche"
          subtitle="What you talk about and your stage"
          icon={Target}
          complete={completion.sections.yourNiche.complete}
          isOpen={openSections.yourNiche}
          onToggle={() => toggleSection('yourNiche')}
          onSave={() =>
            void persistForm({ isManual: true, successToast: 'Niche & stage saved.' })
          }
          saveDisabled={saveDisabled}
          saveTestId="brand-profile-save-section-your-niche"
        >
          <div className="space-y-6 pt-4">
            <FieldInput label={isBusiness ? 'Content focus / niche' : 'Content focus / niche'} required>
              <input
                type="text"
                value={formData.niche}
                onChange={(e) =>
                  setField({
                    niche: e.target.value ? e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) : '',
                  })
                }
                className={inputClasses}
                placeholder="Your main topic or industry focus"
                data-testid="brand-profile-niche"
              />
            </FieldInput>
            <FieldInput label="Sub-niche" helper="Optional — narrow your positioning">
              <input
                type="text"
                value={formData.subNiche}
                onChange={(e) =>
                  setField({
                    subNiche: e.target.value ? e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) : '',
                  })
                }
                className={inputClasses}
              />
            </FieldInput>
            {isBusiness && (
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                  Industry / business type
                </label>
                <ChipSelect
                  options={BUSINESS_TYPE_OPTIONS}
                  value={(() => {
                    const raw = formData.industry || '';
                    const n = normalizeEnumValue(raw);
                    return BUSINESS_TYPE_OPTIONS.some((o) => o.value === n) ? n : '';
                  })()}
                  onChange={(v) => setField({ industry: v })}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                Growth stage
              </label>
              <ChipSelect
                options={GROWTH_STAGE_OPTIONS}
                value={formData.growthStage}
                onChange={(v) => setField({ growthStage: v })}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Section 3 — Audience */}
        <CollapsibleSection
          sectionKey="yourAudience"
          title="Your Audience"
          subtitle="Who you serve and what they struggle with"
          icon={Users}
          complete={completion.sections.yourAudience.complete}
          isOpen={openSections.yourAudience}
          onToggle={() => toggleSection('yourAudience')}
          onSave={() =>
            void persistForm({ isManual: true, successToast: 'Audience saved.' })
          }
          saveDisabled={saveDisabled}
          saveTestId="brand-profile-save-section-your-audience"
        >
          <div className="space-y-6 pt-4">
            <FieldInput label="Target audience" required>
              <textarea
                value={formData.targetAudience}
                onChange={(e) =>
                  setField({
                    targetAudience: e.target.value
                      ? e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1)
                      : '',
                  })
                }
                rows={3}
                className={`${inputClasses} resize-none`}
                placeholder="Who you're speaking to"
              />
            </FieldInput>
            <FieldInput label="Their biggest pain point" required>
              <input
                type="text"
                value={formData.audiencePainPoint}
                onChange={(e) =>
                  setField({
                    audiencePainPoint: e.target.value
                      ? e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1)
                      : '',
                  })
                }
                className={inputClasses}
                data-testid="brand-profile-pain-point"
              />
            </FieldInput>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                What triggers them to act
              </label>
              <ChipSelect
                options={AUDIENCE_ACTION_OPTIONS}
                value={formData.audienceActionTrigger}
                onChange={(v) => setField({ audienceActionTrigger: v })}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Section 4 — Voice */}
        <CollapsibleSection
          sectionKey="yourVoice"
          title="Your Voice"
          subtitle="Tone, format, and boundaries"
          icon={MessageSquare}
          complete={completion.sections.yourVoice.complete}
          isOpen={openSections.yourVoice}
          onToggle={() => toggleSection('yourVoice')}
          onSave={() =>
            void persistForm({ isManual: true, successToast: 'Voice & content saved.' })
          }
          saveDisabled={saveDisabled}
          saveTestId="brand-profile-save-section-your-voice"
        >
          <div className="space-y-6 pt-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide flex items-center flex-wrap gap-y-1">
                Your Vibe
                {!hasExplicitBrandType && <NewBadge />}
              </label>
              <p className="text-xs text-gray-400 mb-3">
                How do you want your content to feel? Pick up to {MAX_VIBE_SELECTIONS}.
              </p>
              <div className="flex flex-wrap gap-2">
                {BRAND_VIBES_OPTIONS.map((option) => {
                  const active = Array.isArray(formData.brandVibes) && formData.brandVibes.includes(option.label);
                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => {
                        const cur = Array.isArray(formData.brandVibes) ? formData.brandVibes : [];
                        if (active) {
                          setField({ brandVibes: cur.filter((v) => v !== option.label) });
                        } else if (cur.length >= MAX_VIBE_SELECTIONS) {
                          addToast(`Pick up to ${MAX_VIBE_SELECTIONS} vibes.`, 'warning');
                        } else {
                          setField({ brandVibes: [...cur, option.label] });
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border min-h-[44px] ${
                        active
                          ? 'bg-huttle-primary text-white border-huttle-primary shadow-md'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide flex items-center flex-wrap gap-y-1">
                Your Content Focus
                {!hasExplicitBrandType && <NewBadge />}
              </label>
              <p className="text-xs text-gray-400 mb-3">
                What do you want your feed to focus on? Pick up to {MAX_PILLAR_SELECTIONS}.
              </p>
              <div className="flex flex-wrap gap-2">
                {CONTENT_FOCUS_PILLARS_OPTIONS.map((option) => {
                  const active = Array.isArray(formData.contentFocusPillars) && formData.contentFocusPillars.includes(option.label);
                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => {
                        const cur = Array.isArray(formData.contentFocusPillars) ? formData.contentFocusPillars : [];
                        if (active) {
                          setField({ contentFocusPillars: cur.filter((v) => v !== option.label) });
                        } else if (cur.length >= MAX_PILLAR_SELECTIONS) {
                          addToast(`Pick up to ${MAX_PILLAR_SELECTIONS} content pillars.`, 'warning');
                        } else {
                          setField({ contentFocusPillars: [...cur, option.label] });
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border min-h-[44px] ${
                        active
                          ? 'bg-huttle-primary text-white border-huttle-primary shadow-md'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                Tone <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-400 mb-3">Select up to {MAX_TONE}</p>
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map((option) => {
                  const active = formData.toneChips.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleTone(option.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border min-h-[44px] ${
                        active
                          ? 'bg-huttle-primary text-white border-huttle-primary shadow-md'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                Writing style <span className="text-red-500">*</span>
              </label>
              <ChipSelect
                options={WRITING_STYLE_OPTIONS}
                value={normalizeWritingStyle(formData.writingStyle, WRITING_STYLE_OPTIONS)}
                onChange={(v) => setField({ writingStyle: v })}
              />
            </div>
            <FieldInput label="Example post you love" helper="Paste a post that captures your exact voice — the AI will match this style when writing for you.">
              <textarea
                value={formData.examplePost}
                onChange={(e) => setField({ examplePost: e.target.value })}
                rows={4}
                className={`${inputClasses} resize-none`}
              />
            </FieldInput>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                Content you want to post
              </label>
              <ChipSelect
                options={CONTENT_TO_POST_OPTIONS}
                value={formData.contentToPost}
                onChange={(v) => setField({ contentToPost: v })}
                multi
              />
            </div>
            <FieldInput label="Content to avoid" helper="Topics, formats, or language you never want in your content.">
              <textarea
                value={formData.contentToAvoid}
                onChange={(e) => setField({ contentToAvoid: e.target.value })}
                rows={3}
                className={`${inputClasses} resize-none`}
              />
            </FieldInput>
          </div>
        </CollapsibleSection>

        {/* Section 5 — Platforms */}
        <CollapsibleSection
          sectionKey="yourPlatforms"
          title="Your Platforms"
          subtitle="Where you publish (up to four)"
          icon={Share2}
          complete={completion.sections.yourPlatforms.complete}
          isOpen={openSections.yourPlatforms}
          onToggle={() => toggleSection('yourPlatforms')}
          onSave={() =>
            void persistForm({ isManual: true, successToast: 'Platforms saved.' })
          }
          saveDisabled={saveDisabled}
          saveTestId="brand-profile-save-section-your-platforms"
        >
          <div className="space-y-6 pt-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                Primary platforms <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-400 mb-3">Maximum {MAX_PLATFORMS}</p>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(({ id, label, Icon }) => {
                  const active = formData.platforms.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => togglePlatform(id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border min-h-[44px] ${
                        active
                          ? 'bg-huttle-primary text-white border-huttle-primary shadow-md'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      data-testid={`brand-profile-platform-${id}`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                Current following
              </label>
              <ChipSelect
                options={FOLLOWER_COUNT_OPTIONS}
                value={formData.followerCount}
                onChange={(v) => setField({ followerCount: v })}
              />
            </div>
            <FieldInput label="How often do you post?">
              <select
                value={formData.postingFrequency}
                onChange={(e) => setField({ postingFrequency: e.target.value })}
                className={inputClasses}
              >
                <option value="">Select frequency…</option>
                {POSTING_FREQUENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FieldInput>
            {isCreator && (
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                  Where is your audience right now?
                </label>
                <ChipSelect
                  options={AUDIENCE_STAGE_OPTIONS}
                  value={formData.audienceStage}
                  onChange={(v) => setField({ audienceStage: v })}
                />
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Section 6 — Goals */}
        <CollapsibleSection
          sectionKey="yourGoals"
          title="Your Goals"
          subtitle={isBusiness ? 'Offers and conversions' : 'Persona and monetization'}
          icon={Rocket}
          complete={completion.sections.yourGoals.complete}
          isOpen={openSections.yourGoals}
          onToggle={() => toggleSection('yourGoals')}
          onSave={() =>
            void persistForm({ isManual: true, successToast: 'Goals saved.' })
          }
          saveDisabled={saveDisabled}
          saveTestId="brand-profile-save-section-your-goals"
        >
          <div className="space-y-6 pt-4">
            {isBusiness ? (
              <>
                <FieldInput label="Primary offer" helper="What do you sell or offer?">
                  <input
                    type="text"
                    value={formData.primaryOffer}
                    onChange={(e) => setField({ primaryOffer: e.target.value })}
                    className={inputClasses}
                    data-testid="brand-profile-primary-offer"
                  />
                </FieldInput>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                    Conversion goal
                  </label>
                  <ChipSelect
                    options={CONVERSION_GOAL_OPTIONS}
                    value={formData.conversionGoal}
                    onChange={(v) => setField({ conversionGoal: v })}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                    Content persona
                  </label>
                  <ChipSelect
                    options={CONTENT_PERSONA_OPTIONS}
                    value={formData.contentPersona}
                    onChange={(v) => setField({ contentPersona: v })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                    Monetization goal
                  </label>
                  <ChipSelect
                    options={MONETIZATION_GOAL_OPTIONS}
                    value={formData.monetizationGoal}
                    onChange={(v) => setField({ monetizationGoal: v })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                    How you show up
                  </label>
                  <ChipSelect
                    options={SHOW_UP_OPTIONS}
                    value={formData.showUpStyle}
                    onChange={(v) => setField({ showUpStyle: v })}
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                Content goals
              </label>
              <p className="text-xs text-gray-400 mb-3">Optional — multi-select</p>
              <div className="flex flex-wrap gap-2">
                {goalsMeta.map((g) => {
                  const active = formData.goals.includes(g.value);
                  return (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => toggleGoal(g.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border min-h-[44px] ${
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
        </CollapsibleSection>

        <div className="sticky bottom-4 z-10 mt-10 flex justify-center pb-[env(safe-area-inset-bottom)] md:justify-end">
          <button
            type="button"
            data-testid="brand-profile-save-all"
            disabled={saveDisabled}
            onClick={() =>
              void persistForm({ isManual: true, successToast: 'All changes saved.' })
            }
            className="inline-flex min-h-[52px] w-full md:w-auto items-center justify-center gap-2 rounded-xl bg-huttle-primary px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-huttle-primary-dark disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            <Save className="w-5 h-5" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
