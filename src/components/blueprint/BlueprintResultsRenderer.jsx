import { getSectionsForType, getBlueprintLabel, getViralScoreWeights } from '../../data/blueprintSchema';
import ViralScoreSection from './ViralScoreSection';
import HookTextSection from './HookTextSection';
import VisualCompositionSection from './VisualCompositionSection';
import DirectorsCutSection from './DirectorsCutSection';
import ScriptSection from './ScriptSection';
import AudioVibeSection from './AudioVibeSection';
import CaptionFrameworkSection from './CaptionFrameworkSection';
import HashtagStrategySection from './HashtagStrategySection';
import CarouselStructureSection from './CarouselStructureSection';
import StoryArcSection from './StoryArcSection';
import ThreadStructureSection from './ThreadStructureSection';
import ArticleStructureSection from './ArticleStructureSection';
import ThumbnailConceptSection from './ThumbnailConceptSection';
import DuetStitchSection from './DuetStitchSection';
import BoostReadinessSection from './BoostReadinessSection';
import CTASection from './CTASection';
import PostingTimeSection from './PostingTimeSection';
import ProTipsSection from './ProTipsSection';

const SECTION_COMPONENT_MAP = {
  hook_text: HookTextSection,
  hook: HookTextSection,
  visual_composition: VisualCompositionSection,
  directors_cut: DirectorsCutSection,
  script: ScriptSection,
  audio_vibe: AudioVibeSection,
  caption_framework: CaptionFrameworkSection,
  hashtag_strategy: HashtagStrategySection,
  carousel_structure: CarouselStructureSection,
  save_bait_strategy: null,
  story_arc: StoryArcSection,
  interactive_elements: null,
  visual_style_guide: null,
  thread_structure: ThreadStructureSection,
  article_structure: ArticleStructureSection,
  thumbnail_concept: ThumbnailConceptSection,
  chapter_structure: null,
  duet_stitch_potential: DuetStitchSection,
  boost_readiness_score: BoostReadinessSection,
  cta: CTASection,
  posting_time: PostingTimeSection,
  pro_tips: ProTipsSection,
  transitions: null,
  voiceover: null,
};

/**
 * Rendering order for blueprint sections.
 * ViralScore is handled separately at the top.
 * Sections not in this list are appended at the end.
 */
const RENDER_ORDER = [
  'hook_text',
  'hook',
  'directors_cut',
  'visual_composition',
  'carousel_structure',
  'story_arc',
  'thread_structure',
  'article_structure',
  'script',
  'thumbnail_concept',
  'chapter_structure',
  'caption_framework',
  'hashtag_strategy',
  'audio_vibe',
  'duet_stitch_potential',
  'boost_readiness_score',
  'cta',
  'posting_time',
  'pro_tips',
];

/**
 * Renders all blueprint sections dynamically based on platform + content_type.
 *
 * @param {Object} props
 * @param {string} props.platform
 * @param {string} props.contentType
 * @param {Object} props.blueprintData - parsed n8n response { viral_score, viral_score_breakdown, sections, what_makes_this_viral, pro_tips }
 */
export default function BlueprintResultsRenderer({ platform, contentType, blueprintData }) {
  if (!blueprintData) return null;

  const { required, optional, excluded } = getSectionsForType(platform, contentType);
  const allowedSections = new Set([...required, ...optional]);
  const excludedSections = new Set(excluded);
  const label = getBlueprintLabel(platform, contentType);
  const weights = getViralScoreWeights(platform, contentType);

  const sections = blueprintData.sections || {};
  const viralScore = blueprintData.viral_score ?? 0;
  const breakdown = blueprintData.viral_score_breakdown || {};
  const whatViral = blueprintData.what_makes_this_viral || '';
  const proTips = blueprintData.pro_tips || sections.pro_tips || [];
  const improvementTips = blueprintData.improvement_tips || [];

  Object.keys(sections).forEach(key => {
    if (excludedSections.has(key)) {
      console.warn('[Blueprint] Filtered excluded section:', key, 'for', platform, contentType);
    }
  });

  let sectionNumber = 0;

  const renderSection = (sectionKey) => {
    if (excludedSections.has(sectionKey)) return null;

    const data = sections[sectionKey];
    if (!data && !allowedSections.has(sectionKey)) return null;

    const Component = SECTION_COMPONENT_MAP[sectionKey];
    if (!Component) {
      if (data) {
        sectionNumber++;
        return (
          <div key={sectionKey} className="p-4 bg-white/70 rounded-xl border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              {sectionKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
            </p>
          </div>
        );
      }
      return null;
    }

    if (!data) {
      if (required.includes(sectionKey)) {
        sectionNumber++;
        return (
          <div key={sectionKey} className="p-4 bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
            <p className="text-sm text-gray-400 italic text-center">
              {sectionKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} — Not available for this blueprint
            </p>
          </div>
        );
      }
      return null;
    }

    sectionNumber++;
    return <Component key={sectionKey} data={data} sectionNumber={sectionNumber} />;
  };

  const renderedSections = RENDER_ORDER.map(renderSection).filter(Boolean);

  const renderedKeys = new Set(RENDER_ORDER);
  const extraSections = Object.keys(sections)
    .filter(key => !renderedKeys.has(key) && !excludedSections.has(key) && key !== 'pro_tips')
    .map(renderSection)
    .filter(Boolean);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Blueprint Type Badge */}
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-gray-900 to-gray-800 text-white text-sm font-bold shadow-lg">
          {label}
        </span>
      </div>

      {/* Viral Score */}
      <ViralScoreSection
        score={viralScore}
        breakdown={breakdown}
        weights={weights}
        whatMakesThisViral={whatViral}
        improvementTips={improvementTips}
      />

      {/* Dynamic sections */}
      {renderedSections}
      {extraSections}

      {/* Pro tips (always last) */}
      {proTips.length > 0 && !sections.pro_tips && (
        <ProTipsSection data={proTips} sectionNumber={++sectionNumber} />
      )}
    </div>
  );
}
