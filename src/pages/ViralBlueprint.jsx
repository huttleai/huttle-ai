import { useState, useContext, useEffect } from 'react';
import { useBrand } from '../context/BrandContext';
import { useSubscription } from '../context/SubscriptionContext';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Zap, 
  Sparkles, 
  Lock, 
  Check, 
  ChevronRight,
  Lightbulb,
  Copy,
  RefreshCw,
  Flame,
  Building,
  User,
  Users,
  Music,
  Video,
  MessageSquare,
  Eye,
  Hash,
  Mic,
  Type,
  Image,
  FileText,
  TrendingUp
} from 'lucide-react';
import { 
  TikTokIcon, 
  InstagramIcon, 
  TwitterXIcon, 
  YouTubeIcon,
  FacebookIcon
} from '../components/SocialIcons';
import LoadingSpinner from '../components/LoadingSpinner';
import UpgradeModal from '../components/UpgradeModal';
import { supabase } from '../config/supabase';
import ViralScoreGauge from '../components/ViralScoreGauge';
import PremiumScriptRenderer from '../components/PremiumScriptRenderer';
import SkeletonLoader from '../components/SkeletonLoader';

// TODO: N8N_WORKFLOW - Import workflow service when ready
import { generateViralBlueprint } from '../services/n8nWorkflowAPI';
import { WORKFLOW_NAMES, isWorkflowConfigured } from '../utils/workflowConstants';

// N8N Webhook URL for Viral Blueprint generation (via serverless proxy to avoid CORS)
const N8N_WEBHOOK_URL = '/api/viral-blueprint-proxy';

/**
 * Viral Blueprint Page
 * 
 * TODO: N8N_WORKFLOW - This feature will move to n8n workflow
 * Workflow: WORKFLOW_NAMES.VIRAL_BLUEPRINT
 * 
 * Current implementation uses:
 * - Mock blueprint generator (generateMockBlueprint function below)
 * 
 * Future implementation will:
 * 1. Check if workflow is configured via isWorkflowConfigured()
 * 2. If configured, call generateViralBlueprint() from n8nWorkflowAPI.js
 * 3. If not configured, fall back to mock generator
 * 
 * Expected workflow response format:
 * {
 *   success: true,
 *   blueprint: { isVideoContent, directorsCut, seoStrategy, audioVibe, viralScore },
 *   directorsCut: [{ step, title, script/text, visual/visualSuggestion }],
 *   seoStrategy: { visualKeywords, spokenHooks, captionKeywords },
 *   audioVibe: { mood, bpm, suggestion } | null,
 *   viralScore: number
 * }
 */

/**
 * Platform configuration with icons, colors, and post types
 */
/**
 * Video content types - these show Script + Visual columns
 */
const VIDEO_CONTENT_TYPES = [
  'Video', 'Reel', 'Story', 'Short'
];

/**
 * Platform configuration with icons, colors, and post types
 */
const PLATFORMS = [
  {
    id: 'TikTok',
    name: 'TikTok',
    icon: TikTokIcon,
    gradient: 'from-gray-900 to-gray-800',
    ring: 'ring-gray-900',
    glow: 'group-hover:shadow-[0_0_20px_rgba(0,0,0,0.2)]',
    postTypes: ['Video', 'Carousel']
  },
  {
    id: 'Instagram',
    name: 'Instagram',
    icon: InstagramIcon,
    gradient: 'from-pink-500 via-purple-500 to-orange-400',
    ring: 'ring-pink-500',
    glow: 'group-hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]',
    postTypes: ['Reel', 'Carousel', 'Story', 'Image Post']
  },
  {
    id: 'Facebook',
    name: 'Facebook',
    icon: FacebookIcon,
    gradient: 'from-blue-600 to-blue-500',
    ring: 'ring-blue-600',
    glow: 'group-hover:shadow-[0_0_20px_rgba(37,99,235,0.3)]',
    postTypes: ['Post', 'Reel', 'Story']
  },
  {
    id: 'X',
    name: 'X',
    icon: TwitterXIcon,
    gradient: 'from-gray-900 to-gray-800',
    ring: 'ring-gray-900',
    glow: 'group-hover:shadow-[0_0_20px_rgba(0,0,0,0.2)]',
    postTypes: ['Thread', 'Post']
  },
  {
    id: 'YouTube',
    name: 'YouTube',
    icon: YouTubeIcon,
    gradient: 'from-red-600 to-red-500',
    ring: 'ring-red-600',
    glow: 'group-hover:shadow-[0_0_20px_rgba(220,38,38,0.3)]',
    postTypes: ['Short', 'Video']
  }
];

/**
 * Objective options for the Strategy Brief
 */
const OBJECTIVES = [
  { id: 'views', label: 'Viral Reach', emoji: '🚀' },
  { id: 'conversion', label: 'Leads/Sales', emoji: '💰' },
  { id: 'trust', label: 'Community', emoji: '🤝' }
];

/**
 * Check if post type is video content
 */
const isVideoContent = (postType) => VIDEO_CONTENT_TYPES.includes(postType);

/**
 * Mock blueprint generator - simulates AI response
 * Adapts output based on whether content is video or text/image based
 */
const generateMockBlueprint = (platform, postType, topic) => {
  const isVideo = isVideoContent(postType);
  
  // Video content blueprint (Script + Visual)
  const videoDirectorsCut = [
    {
      step: 1,
      title: 'The Hook',
      script: `"Stop scrolling if you want to know the truth about ${topic}..."`,
      visual: 'Close-up face shot, slight zoom-in effect. Text overlay: "THE TRUTH" in bold Impact font.'
    },
    {
      step: 2,
      title: 'The Problem',
      script: `"Everyone's been doing ${topic} wrong, and it's costing them thousands."`,
      visual: 'Split screen: Left shows common mistake, Right shows your face reacting with disbelief.'
    },
    {
      step: 3,
      title: 'The Revelation',
      script: '"Here\'s what the top 1% actually do differently..."',
      visual: 'B-roll of success imagery. Quick cuts. Text: "THE SECRET" with reveal animation.'
    },
    {
      step: 4,
      title: 'The Value Drop',
      script: `"The key is [specific tip about ${topic}]. Most people skip this step entirely."`,
      visual: 'Screen recording or demonstration. Arrow annotations pointing to key elements.'
    },
    {
      step: 5,
      title: 'The CTA',
      script: '"Follow for more, and drop a 🔥 if this helped!"',
      visual: 'Return to face. Point at camera. On-screen: Follow button animation + comment prompt.'
    }
  ];

  // Non-video content blueprint (Text + Visual Suggestion)
  const textDirectorsCut = [
    {
      step: 1,
      title: 'Opening Line',
      text: `The truth about ${topic} that nobody wants to talk about 👇`,
      visualSuggestion: 'Bold headline graphic with contrasting colors. Use a pattern interrupt image or eye-catching statistic.'
    },
    {
      step: 2,
      title: 'The Problem',
      text: `Most people approach ${topic} completely wrong. They focus on [common mistake] when they should be doing [better approach].`,
      visualSuggestion: 'Before/after comparison graphic or a "myth vs reality" split image.'
    },
    {
      step: 3,
      title: 'The Insight',
      text: `Here's what the top 1% understand: [Key insight about ${topic}]. This single shift changes everything.`,
      visualSuggestion: 'Clean infographic or quote card with your key insight. Use brand colors.'
    },
    {
      step: 4,
      title: 'The Value',
      text: `3 ways to apply this today:\n\n1. [Actionable tip]\n2. [Actionable tip]\n3. [Actionable tip]`,
      visualSuggestion: 'Numbered list graphic or carousel slide with icons for each point.'
    },
    {
      step: 5,
      title: 'The CTA',
      text: `Save this for later 🔖\n\nFollow @[handle] for more ${topic} insights.\n\nDrop a "🔥" if this helped!`,
      visualSuggestion: 'Call-to-action graphic with your profile handle and a clear next step.'
    }
  ];

  return {
    isVideoContent: isVideo,
    directorsCut: isVideo ? videoDirectorsCut : textDirectorsCut,
    seoStrategy: {
      visualKeywords: [
        `${topic.split(' ')[0]} hack`,
        'game changer',
        isVideo ? 'watch this' : 'read this',
        'secret revealed'
      ],
      spokenHooks: isVideo ? [
        'Stop scrolling',
        'Nobody talks about this',
        'Here\'s the truth',
        'You need to know this'
      ] : [
        'The truth about',
        'Nobody talks about',
        'Here\'s what works',
        'Save this for later'
      ],
      captionKeywords: [
        `#${topic.replace(/\s+/g, '').toLowerCase()}`,
        `#${platform.toLowerCase()}tips`,
        '#viralcontent',
        '#growthhacks',
        '#contentcreator'
      ]
    },
    audioVibe: isVideo ? {
      mood: platform === 'TikTok' || platform === 'Instagram' 
        ? 'Trending Lo-Fi Beat or Phonk Drop' 
        : platform === 'YouTube' 
          ? 'Cinematic Build-Up' 
          : 'Clean & Professional',
      bpm: platform === 'TikTok' ? '120-140' : '90-110',
      suggestion: platform === 'TikTok' 
        ? 'Use trending sounds from the Discover page' 
        : 'Original audio performs best on this platform'
    } : null,
    viralScore: Math.floor(Math.random() * 20) + 75
  };
};

/**
 * Adapter function to translate n8n response formats into the existing state structure.
 * Handles 5 master formats: Video, Carousel, Thread, Story, Post
 * Also handles new simplified format with nested blueprint object:
 * {
 *   blueprint: {
 *     viral_score: number,
 *     hooks: string[],
 *     content_script: string (Markdown formatted),
 *     seo_keywords: string[],
 *     suggested_hashtags: string[]
 *   }
 * }
 * 
 * @param {Object} data - The raw response data from n8n
 * @returns {Object} Normalized blueprint object matching the existing state structure
 */
const adaptBlueprintResponse = (data) => {
  let directorsCut = [];
  let isVideo = false;

  // Handle nested response structures: { data: { blueprint: { ... } } } or { blueprint: { ... } }
  let blueprintData = null;
  if (data?.data?.blueprint && typeof data.data.blueprint === 'object') {
    blueprintData = data.data.blueprint;
  } else if (data?.blueprint && typeof data.blueprint === 'object') {
    blueprintData = data.blueprint;
  } else if (data && typeof data === 'object' && (data.hooks || data.content_script || data.seo_keywords)) {
    // Flat format with blueprint fields at root level
    blueprintData = data;
  }

  // 0a. NEW: Nested blueprint format: { blueprint: { viral_score, hooks, content_script, seo_keywords, suggested_hashtags } }
  if (blueprintData && (blueprintData.hooks || blueprintData.content_script || blueprintData.seo_keywords || blueprintData.suggested_hashtags)) {
    const bp = blueprintData;
    
    // Create a single directorsCut entry with the content script
    directorsCut = [{
      step: 1,
      title: 'Content Blueprint',
      script: bp.content_script || '',
      text: bp.content_script || '',
      visual: '', // No visual direction in new format
      visualSuggestion: ''
    }];

    // Map hooks to spokenHooks, seo_keywords to visualKeywords, hashtags to captionKeywords
    const seoStrategy = {
      visualKeywords: Array.isArray(bp.seo_keywords) ? bp.seo_keywords : (bp.seo_keywords ? [bp.seo_keywords] : []),
      spokenHooks: Array.isArray(bp.hooks) ? bp.hooks : (bp.hooks ? [bp.hooks] : []),
      captionKeywords: Array.isArray(bp.suggested_hashtags) ? bp.suggested_hashtags : (bp.suggested_hashtags ? [bp.suggested_hashtags] : [])
    };

    // Map viral_score, default to 85 if missing or 0
    const viralScore = (bp.viral_score && bp.viral_score > 0) ? bp.viral_score : 85;

    return {
      isVideoContent: false, // Default to non-video for simplified format
      directorsCut,
      viralScore,
      audioVibe: null,
      seoStrategy,
      // Preserve hooks array for dedicated display
      hooks: Array.isArray(bp.hooks) ? bp.hooks : (bp.hooks ? [bp.hooks] : [])
    };
  }

  // 0b. Legacy simplified format: { hooks, content_script, visual_direction, suggested_hashtags, viral_score, visual_keywords }
  if (data.hooks || data.content_script || data.visual_direction || data.suggested_hashtags) {
    // Create a single directorsCut entry with the content script and visual direction
    directorsCut = [{
      step: 1,
      title: 'Content Blueprint',
      script: data.content_script || '',
      text: data.content_script || '',
      visual: data.visual_direction || '',
      visualSuggestion: data.visual_direction || ''
    }];

    // Map hooks to spokenHooks, hashtags to captionKeywords, and visual_keywords to visualKeywords
    const seoStrategy = {
      visualKeywords: Array.isArray(data.visual_keywords) ? data.visual_keywords : (data.visual_keywords ? [data.visual_keywords] : []),
      spokenHooks: Array.isArray(data.hooks) ? data.hooks : (data.hooks ? [data.hooks] : []),
      captionKeywords: Array.isArray(data.suggested_hashtags) ? data.suggested_hashtags : (data.suggested_hashtags ? [data.suggested_hashtags] : [])
    };

    // Map viral_score, default to 85 if missing or 0
    const viralScore = (data.viral_score && data.viral_score > 0) ? data.viral_score : 85;

    return {
      isVideoContent: false, // Default to non-video for simplified format
      directorsCut,
      viralScore,
      audioVibe: null,
      seoStrategy,
      // Preserve hooks array for dedicated display
      hooks: Array.isArray(data.hooks) ? data.hooks : (data.hooks ? [data.hooks] : [])
    };
  }

  // 1. Video format (directors_cut with scenes)
  if (data.directors_cut?.scenes || data.directors_cut) {
    isVideo = true;
    const scenes = data.directors_cut?.scenes || data.directors_cut;
    if (Array.isArray(scenes)) {
      directorsCut = scenes.map((item, index) => ({
        step: index + 1,
        title: item.timestamp || `Scene ${index + 1}`,
        script: item.dialogue || item.script || '',
        visual: item.visual_note || item.visual || ''
      }));
    }
  }
  // 2. Carousel format (slide_breakdown)
  else if (data.slide_breakdown) {
    directorsCut = data.slide_breakdown.map((item) => ({
      step: item.slide_number || 1,
      title: `Slide ${item.slide_number || 1}`,
      script: [item.headline, item.body_text].filter(Boolean).join('\n\n'),
      visual: item.visual_description || ''
    }));
  }
  // 3. Thread format (tweet_breakdown)
  else if (data.tweet_breakdown) {
    directorsCut = data.tweet_breakdown.map((item) => ({
      step: item.tweet_number || 1,
      title: `Tweet ${item.tweet_number || 1}`,
      script: item.text || '',
      visual: item.media_suggestion ? `Media: ${item.media_suggestion}` : ''
    }));
  }
  // 4. Story format (frame_breakdown)
  else if (data.frame_breakdown) {
    isVideo = true;
    directorsCut = data.frame_breakdown.map((item) => ({
      step: item.frame_number || 1,
      title: `Frame ${item.frame_number || 1}`,
      script: item.text_overlay || '',
      visual: item.action 
        ? `${item.visual || ''}\n(Action: ${item.action})`
        : item.visual || ''
    }));
  }
  // 5. Post format (caption_structure - object to array)
  else if (data.caption_structure) {
    const cs = data.caption_structure;
    directorsCut = [
      {
        step: 1,
        title: 'Hook',
        script: cs.hook || '',
        visual: 'Opening visual to grab attention'
      },
      {
        step: 2,
        title: 'Story',
        script: cs.story || '',
        visual: 'Supporting visual for the narrative'
      },
      {
        step: 3,
        title: 'Value',
        script: Array.isArray(cs.value_points) ? cs.value_points.join('\n') : (cs.value_points || ''),
        visual: 'Visual highlighting key takeaways'
      },
      {
        step: 4,
        title: 'CTA',
        script: cs.cta || '',
        visual: 'Call-to-action visual prompt'
      }
    ];
  }
  // Fallback: try to use existing directorsCut if present
  else if (data.directorsCut && Array.isArray(data.directorsCut)) {
    directorsCut = data.directorsCut;
    isVideo = data.isVideoContent || false;
  }

  // Map viral score (handle nested or direct)
  const viralScore = typeof data.viral_score === 'object' 
    ? (data.viral_score?.score || 0)
    : (data.viral_score || data.viralScore || 0);

  // Map audio vibe (handle different key names)
  let audioVibe = null;
  if (data.audio_vibe) {
    audioVibe = {
      mood: data.audio_vibe.music_style || data.audio_vibe.mood || '',
      bpm: data.audio_vibe.bpm || '',
      suggestion: data.audio_vibe.suggestion || ''
    };
  } else if (data.audioVibe) {
    audioVibe = data.audioVibe;
  }

  // Map SEO strategy (handle different structures)
  let seoStrategy = {
    visualKeywords: [],
    captionKeywords: [],
    spokenHooks: []
  };

  if (data.seo_keywords && Array.isArray(data.seo_keywords)) {
    seoStrategy.visualKeywords = data.seo_keywords;
    seoStrategy.captionKeywords = data.seo_keywords;
  }
  
  if (data.seo_strategy) {
    if (data.seo_strategy.hashtags) {
      seoStrategy.visualKeywords = data.seo_strategy.hashtags;
      seoStrategy.captionKeywords = data.seo_strategy.hashtags;
    }
    if (data.seo_strategy.title) {
      seoStrategy.spokenHooks = [data.seo_strategy.title];
    }
    if (data.seo_strategy.visual_keywords) {
      seoStrategy.visualKeywords = data.seo_strategy.visual_keywords;
    }
    if (data.seo_strategy.caption_keywords) {
      seoStrategy.captionKeywords = data.seo_strategy.caption_keywords;
    }
    if (data.seo_strategy.spoken_hooks) {
      seoStrategy.spokenHooks = data.seo_strategy.spoken_hooks;
    }
  }

  // Fallback to existing seoStrategy if present
  if (data.seoStrategy) {
    seoStrategy = {
      visualKeywords: data.seoStrategy.visualKeywords || seoStrategy.visualKeywords,
      captionKeywords: data.seoStrategy.captionKeywords || seoStrategy.captionKeywords,
      spokenHooks: data.seoStrategy.spokenHooks || seoStrategy.spokenHooks
    };
  }

  return {
    isVideoContent: isVideo,
    directorsCut,
    viralScore,
    audioVibe,
    seoStrategy
  };
};

// Mock fitness blueprint for marketing demo
const generateFitnessMockBlueprint = () => {
  return {
    isVideoContent: true,
    directorsCut: [
      {
        step: 1,
        title: 'The Hook',
        script: '"If you\'re still doing cardio for fat loss in 2026, you\'re wasting your time. Here\'s why..."',
        visual: 'Intense close-up of your face with gym background slightly out of focus. Quick zoom on the words "STOP CARDIO" overlaid in bold red Impact font. Neon gym lights add drama.'
      },
      {
        step: 2,
        title: 'The Problem',
        script: '"Most gym-goers spend 45 minutes on the treadmill thinking they\'re burning fat. But here\'s the truth: they\'re actually losing muscle and slowing down their metabolism."',
        visual: 'B-roll split screen: Left shows someone exhausted on treadmill, Right shows your face explaining with genuine concern. Use slow-motion effect on treadmill footage. Add text: "Muscle Loss = Slower Metabolism"'
      },
      {
        step: 3,
        title: 'The Science',
        script: '"Research shows that strength training with progressive overload burns more calories for up to 48 hours AFTER your workout. That\'s called EPOC - and cardio doesn\'t touch it."',
        visual: 'Quick cuts of explosive strength training movements: deadlifts, squats, bench press. Use dynamic angles and slow-motion on the concentric phase. Overlay text: "EPOC Effect: 48hr Fat Burn 🔥"'
      },
      {
        step: 4,
        title: 'The Solution',
        script: '"Here\'s the game plan: 3-4 days strength training, 10-15 minutes HIIT max. Build muscle, keep your metabolism high, and actually enjoy your workouts. That\'s how you transform."',
        visual: 'Show yourself demonstrating a compound movement with perfect form. Cut to energetic HIIT sequence. End with before/after transformation photo with arrow animation. Text overlay: "The Real Formula ⚡"'
      },
      {
        step: 5,
        title: 'The CTA',
        script: '"Follow for more evidence-based fitness truth. Drop a 💪 if you\'re ready to ditch the treadmill and build real strength!"',
        visual: 'Return to face cam, point at camera with confident energy. Animate follow button bouncing in corner. Show comment section with fire emojis. End with branded gym logo fade.'
      }
    ],
    seoStrategy: {
      visualKeywords: [
        'gym transformation',
        'strength training benefits',
        'fat loss science',
        'muscle building tips',
        'EPOC effect',
        'cardio vs weights'
      ],
      spokenHooks: [
        'Stop doing cardio',
        'The truth about fat loss',
        'What the fitness industry won\'t tell you',
        'The science behind muscle gain',
        'Evidence-based training'
      ],
      captionKeywords: [
        '#gymtok',
        '#fitnesstips',
        '#strengthtraining',
        '#fatloss',
        '#musclebuilding',
        '#gymmotivation',
        '#fitnesstransformation',
        '#sciencebasedfitness',
        '#gymlife',
        '#workout',
        '#personaltrainer',
        '#fitfam'
      ]
    },
    audioVibe: {
      mood: 'High-Energy Phonk with Heavy Bass Drops',
      bpm: '140-160',
      suggestion: 'Use trending gym motivation sounds from TikTok - Phonk beats perform incredibly well for fitness content. Look for "Gym Phonk" or "Aggressive Workout Music" in your audio library.'
    },
    viralScore: 92,
    hooks: [
      'If you\'re still doing cardio for fat loss in 2026, you\'re wasting your time...',
      'The fitness industry doesn\'t want you to know this about "fat burning zones"',
      'Why bodybuilders never do hours of cardio (and you shouldn\'t either)',
      'I stopped doing cardio 6 months ago. Here\'s what happened to my body...',
      'POV: You just learned that cardio is sabotaging your transformation'
    ]
  };
};

export default function ViralBlueprint() {
  const { brandProfile, isCreator, isBrand } = useBrand();
  const { user } = useContext(AuthContext);
  const { addToast: showToast } = useToast();
  const { checkFeatureAccess, getFeatureLimit, userTier } = useSubscription();

  // Form state - Start empty for real users
  const [selectedPlatform, setSelectedPlatform] = useState('TikTok');
  const [selectedPostType, setSelectedPostType] = useState('Video');
  const [objective, setObjective] = useState('views');
  const [topic, setTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('');

  // UI state - Start with no blueprint
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlueprint, setGeneratedBlueprint] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);
  const [loadingStep, setLoadingStep] = useState('Generate Blueprint');
  
  // View state - Start with input form
  const [currentView, setCurrentView] = useState('input'); // 'input' | 'results'

  // Usage tracking
  const [usageCount, setUsageCount] = useState(0);
  const [usageLimit, setUsageLimit] = useState(0);

  // Check feature access and load usage
  useEffect(() => {
    const limit = getFeatureLimit('viralBlueprint');
    setUsageLimit(limit === -1 ? Infinity : limit);
    
    // Load saved usage from localStorage
    const savedUsage = localStorage.getItem('viralBlueprintUsage');
    if (savedUsage) {
      setUsageCount(parseInt(savedUsage, 10));
    }
  }, [userTier, getFeatureLimit]);

  // Stepped loading animation - cycles through messages every 12 seconds
  useEffect(() => {
    if (!isGenerating) {
      setLoadingStep('Generate Blueprint');
      return;
    }

    const messages = [
      'Scanning platform trends...',
      'Analyzing viral patterns...',
      'Drafting content strategy...',
      'Finalizing blueprint...'
    ];

    let currentIndex = 0;
    setLoadingStep(messages[0]);

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % messages.length;
      setLoadingStep(messages[currentIndex]);
    }, 12000);

    return () => clearInterval(interval);
  }, [isGenerating]);

  // Get current platform config
  const currentPlatform = PLATFORMS.find(p => p.id === selectedPlatform);

  // Check if form is valid for submission
  const isFormValid = selectedPlatform && selectedPostType && topic.trim().length > 0 && targetAudience.trim().length > 0;

  // Check if user has access
  const hasAccess = checkFeatureAccess('viralBlueprint');
  const isAtLimit = usageLimit !== Infinity && usageCount >= usageLimit;

  // Derive voice context label
  const voiceContextLabel = isCreator ? 'Personal Brand' : 'Business Authority';
  const VoiceIcon = isCreator ? User : Building;

  // Handle platform selection
  const handlePlatformSelect = (platformId) => {
    setSelectedPlatform(platformId);
    setSelectedPostType(null);
  };

  // Handle generation
  const handleGenerate = async () => {
    if (!hasAccess) {
      setShowUpgradeModal(true);
      return;
    }

    if (isAtLimit) {
      showToast('You\'ve reached your monthly blueprint limit. Upgrade for more!', 'warning');
      return;
    }

    if (!isFormValid) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }

    setIsGenerating(true);

    try {
      // Map UI post types to backend master formats (5 formats)
      const formatMapping = {
        'Reel': 'Video',
        'Short': 'Video',
        'TikTok': 'Video',
        'Video': 'Video',
        'Image Post': 'Post',
        'Post': 'Post',
        'Thread': 'Thread',
        'Carousel': 'Carousel',
        'Story': 'Story'
      };

      // Check if n8n workflow is configured
      const workflowConfigured = isWorkflowConfigured(WORKFLOW_NAMES.VIRAL_BLUEPRINT);
      
      if (!workflowConfigured) {
        console.log('[Viral Blueprint] n8n workflow not configured, using fallback generator');
        
        // Use mock blueprint generator with user's actual topic as fallback
        const fallbackBlueprint = generateMockBlueprint(selectedPlatform, selectedPostType, topic);
        
        setGeneratedBlueprint(fallbackBlueprint);
        setIsGenerating(false);
        
        // Update usage
        const newUsage = usageCount + 1;
        setUsageCount(newUsage);
        localStorage.setItem('viralBlueprintUsage', newUsage.toString());

        showToast('Blueprint generated!', 'success');
        setCurrentView('results');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Build payload matching what the proxy expects
      const payload = {
        topic: topic.trim(),
        platform: selectedPlatform,                                    // e.g., 'Instagram', 'YouTube'
        postType: formatMapping[selectedPostType] || 'Post',           // Maps to 5 master formats
        objective: objective,                                          // 'views', 'conversion', or 'trust'
        targetAudience: targetAudience.trim(),                         // e.g., 'SaaS Founders'
        voiceContext: {
          brandVoice: brandProfile?.brandVoice || 'Authentic and Authoritative',
          identity: brandProfile?.profileType === 'creator' ? 'Creator' : 'Business'
        }
      };

      console.log('[N8N] ====== WEBHOOK REQUEST DEBUG ======');
      console.log('[N8N] Using proxy endpoint:', N8N_WEBHOOK_URL);
      console.log('[N8N] Blueprint Payload:', JSON.stringify(payload, null, 2));
      console.log('[N8N] ====================================');

      // Get auth token for the proxy
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      // Make POST request with robust 120s timeout (compatible with all browsers)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('[N8N] Aborting request after 120s timeout');
        controller.abort();
      }, 120000);

      let response;
      try {
        console.log('[N8N] Making fetch request to:', N8N_WEBHOOK_URL);
        response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
          mode: 'cors', // Explicitly set CORS mode
        });
        console.log('[N8N] Fetch completed, status:', response.status, response.statusText);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('[N8N] ====== FETCH ERROR ======');
        console.error('[N8N] Error name:', fetchError.name);
        console.error('[N8N] Error message:', fetchError.message);
        console.error('[N8N] Error stack:', fetchError.stack);
        console.error('[N8N] ========================');
        
        if (fetchError.name === 'AbortError') {
          console.error('[N8N] Request aborted (timeout after 120s)');
          throw new Error('REQUEST_TIMEOUT');
        }
        
        // Check for CORS errors specifically
        if (fetchError.message.includes('CORS') || fetchError.message.includes('Failed to fetch')) {
          console.error('[N8N] CORS or network error - check webhook URL and CORS settings');
          throw new Error('CORS_ERROR: ' + fetchError.message);
        }
        
        throw fetchError;
      }

      clearTimeout(timeoutId);

      console.log('[N8N] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details');
        console.error('[N8N] HTTP Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`HTTP_ERROR: ${response.status} ${response.statusText}`);
      }

      // Parse JSON response
      let responseData;
      try {
        const rawText = await response.text();
        console.log('[N8N] Raw response:', rawText.substring(0, 500));
        responseData = JSON.parse(rawText);
        console.log('[N8N] Parsed response structure:', Object.keys(responseData));
      } catch (parseError) {
        console.error('[N8N] JSON Parse Error:', parseError);
        throw new Error('INVALID_JSON');
      }

      console.log('[N8N] ====== RESPONSE PARSING DEBUG ======');
      console.log('[N8N] Full response keys:', Object.keys(responseData));
      console.log('[N8N] Has response.data.blueprint:', !!responseData?.data?.blueprint);
      console.log('[N8N] Has response.blueprint:', !!responseData?.blueprint);
      console.log('[N8N] Full response structure:', JSON.stringify(responseData, null, 2).substring(0, 1000));
      console.log('[N8N] ====================================');

      // Pass the full responseData to adapter - it will handle extraction internally
      // The adapter checks for nested blueprint format: { blueprint: { ... } }
      // or flat format: { hooks, content_script, ... }
      const adaptedBlueprint = adaptBlueprintResponse(responseData);

      console.log('[N8N] Adapted blueprint:', {
        isVideoContent: adaptedBlueprint.isVideoContent,
        directorsCutLength: adaptedBlueprint.directorsCut?.length,
        viralScore: adaptedBlueprint.viralScore,
        hasAudioVibe: !!adaptedBlueprint.audioVibe,
        seoKeywordsCount: adaptedBlueprint.seoStrategy?.visualKeywords?.length
      });

      // Set state with adapted blueprint, falling back to UI-based video detection
      setGeneratedBlueprint({
        isVideoContent: adaptedBlueprint.isVideoContent || isVideoContent(selectedPostType),
        directorsCut: adaptedBlueprint.directorsCut || [],
        seoStrategy: adaptedBlueprint.seoStrategy || {
          visualKeywords: [],
          spokenHooks: [],
          captionKeywords: []
        },
        audioVibe: adaptedBlueprint.audioVibe || null,
        viralScore: (adaptedBlueprint.viralScore && adaptedBlueprint.viralScore > 0) ? adaptedBlueprint.viralScore : 85,
        // Preserve hooks array for dedicated UI display
        hooks: adaptedBlueprint.hooks || []
      });

      console.log('[N8N] Blueprint successfully adapted and mapped to state');

      // Update usage
      const newUsage = usageCount + 1;
      setUsageCount(newUsage);
      localStorage.setItem('viralBlueprintUsage', newUsage.toString());

      showToast('Viral Blueprint generated! 🚀', 'success');
      
      // Switch to results view and scroll to top
      setCurrentView('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } catch (error) {
      // Log detailed error information for debugging
      console.error('[N8N] Generation error:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      // Determine specific error message based on error type
      let errorMessage = 'Blueprint generation failed. Please try again.';
      
      if (error.message === 'REQUEST_TIMEOUT') {
        errorMessage = 'The request timed out after 120 seconds. Your n8n workflow may be taking longer than expected. Please try again.';
        console.error('[N8N] TIMEOUT: Workflow exceeded 120s limit');
      } else if (error.message === 'INVALID_JSON') {
        errorMessage = 'Received invalid response from n8n. Please check your workflow output format.';
        console.error('[N8N] PARSE ERROR: n8n returned non-JSON response');
      } else if (error.message === 'INVALID_BLUEPRINT_STRUCTURE') {
        errorMessage = 'The blueprint data structure is invalid. Please check your n8n workflow output.';
        console.error('[N8N] STRUCTURE ERROR: Blueprint data is missing or malformed');
      } else if (error.message?.startsWith('HTTP_ERROR')) {
        errorMessage = `Connection error: ${error.message.replace('HTTP_ERROR: ', '')}`;
        console.error('[N8N] HTTP ERROR: n8n returned error status');
      } else if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to n8n. Please check CORS settings and verify the webhook URL is correct.';
        console.error('[N8N] CORS/NETWORK ERROR: Cannot reach n8n webhook');
      }

      showToast(errorMessage, 'error');
      
      // Fallback: use mock generator with user's topic so they still get a result
      if (topic.trim()) {
        console.log('[Viral Blueprint] Falling back to mock generator after error');
        const fallbackBlueprint = generateMockBlueprint(selectedPlatform, selectedPostType, topic);
        setGeneratedBlueprint(fallbackBlueprint);
        setCurrentView('results');
        showToast('Generated with fallback template. Results may be less tailored.', 'info');
      }
    } finally {
      // Always stop loading spinner
      setIsGenerating(false);
    }
  };

  // Handle copy
  const handleCopy = (text, section) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Reset form and switch back to input view
  const handleReset = () => {
    setSelectedPlatform(null);
    setSelectedPostType(null);
    setObjective('views');
    setTopic('');
    setTargetAudience('');
    setGeneratedBlueprint(null);
    setCurrentView('input');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex-1 min-h-screen bg-gray-50/50 ml-0 lg:ml-64 pt-24 lg:pt-20 px-4 md:px-6 lg:px-8 pb-12">
      {/* Dynamic Background Mesh */}
      <div className="fixed inset-0 pointer-events-none opacity-40 z-0 bg-command-center" />
      
      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        
        {/* Command Center Header */}
        <div className="relative overflow-hidden rounded-2xl glass-panel p-8 md:p-10 transition-all duration-500 hover:shadow-lg group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-400/10 to-purple-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-gradient-to-br group-hover:from-orange-400/20 group-hover:to-purple-600/20 transition-all duration-700" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-purple-600 rounded-2xl blur opacity-40 animate-pulse" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center shadow-xl ring-1 ring-white/20">
                  <Flame className="w-8 h-8 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-gray-900 tracking-tight">
                    Viral Blueprint
                  </h1>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-gray-900 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-gray-900/20 ring-1 ring-white/20">
                      Generator
                    </span>
                    <span className="px-3 py-1 rounded-full bg-huttle-gradient text-white text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-huttle-blue/20 ring-1 ring-white/20">
                      Beta
                    </span>
                  </div>
                </div>
                <p className="text-gray-500 text-lg">
                  Engineer viral content with AI-powered precision
                </p>
              </div>
            </div>

            {/* Usage Stats */}
            {hasAccess && usageLimit !== Infinity && (
              <div className="w-full md:w-auto bg-white/50 backdrop-blur-md rounded-xl p-4 border border-white/60 shadow-sm">
                <div className="flex items-center justify-between gap-8 mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Monthly Credits</span>
                  <span className="text-sm font-mono font-bold text-gray-900">
                    {usageCount} <span className="text-gray-400">/</span> {usageLimit}
                  </span>
                </div>
                <div className="h-1.5 w-full md:w-48 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      usageCount / usageLimit > 0.9 ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                      usageCount / usageLimit > 0.7 ? 'bg-gradient-to-r from-orange-400 to-orange-500' : 
                      'bg-gradient-to-r from-blue-400 to-cyan-400'
                    }`}
                    style={{ width: `${Math.min((usageCount / usageLimit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Console - The Briefing (only shown in input view) */}
        {currentView === 'input' && (
        <div className="card-glass overflow-hidden relative animate-fadeIn">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-50" />
          
          <div className="p-6 md:p-8 space-y-8 relative z-10">
            {/* Locked State */}
            {!hasAccess ? (
              <div className="text-center py-16">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-gray-900 rounded-full blur opacity-20" />
                  <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-gray-50 to-white flex items-center justify-center border border-gray-200 shadow-xl">
                    <Lock className="w-10 h-10 text-gray-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Initialize Command Center</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                  Upgrade to Essentials or Pro to unlock the full power of the Viral Blueprint Generator.
                </p>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="btn-ignite px-10 py-4 rounded-xl font-bold text-white flex items-center gap-3 mx-auto text-lg shadow-xl shadow-orange-500/20 hover:shadow-orange-500/30 transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                  Unlock Access
                </button>
              </div>
            ) : (
              <>
                {/* Smart Context Badge */}
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-slate-100/80 border border-slate-200/50 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-200">
                      <VoiceIcon className="w-4 h-4 text-slate-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-600">
                      Analyzing as <span className="font-bold text-slate-900">{voiceContextLabel}</span> Mode
                    </span>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                </div>

                {/* Platform Selection */}
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-gray-900">Select Platform</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {PLATFORMS.map((platform) => {
                      const isSelected = selectedPlatform === platform.id;
                      const Icon = platform.icon;
                      
                      return (
                        <button
                          key={platform.id}
                          onClick={() => handlePlatformSelect(platform.id)}
                          className={`
                            relative group p-4 rounded-2xl border transition-all duration-300 ease-out overflow-hidden
                            ${isSelected 
                              ? `border-transparent bg-gray-900 text-white shadow-xl scale-[1.02] ring-2 ring-offset-2 ${platform.ring}` 
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg hover:-translate-y-1'
                            }
                          `}
                        >
                          <div className={`absolute inset-0 opacity-0 transition-opacity duration-300 ${isSelected ? 'opacity-20 bg-gradient-to-br ' + platform.gradient : platform.glow}`} />
                          
                          <div className="relative z-10 flex flex-col items-center gap-3">
                            <div className={`
                              w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
                              ${isSelected 
                                ? 'bg-white/10 shadow-inner' 
                                : 'bg-gray-50 group-hover:bg-white group-hover:shadow-md'
                              }
                            `}>
                              <Icon className={`w-6 h-6 transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`} />
                            </div>
                            <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                              {platform.name}
                            </span>
                          </div>
                          
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.6)] animate-pulse" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Post Type Selection */}
                <div className={`space-y-4 transition-all duration-500 ease-out ${selectedPlatform ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-4 pointer-events-none'}`}>
                  <h2 className="text-lg font-bold text-gray-900">Select Format</h2>
                  <div className="flex flex-wrap gap-3">
                    {currentPlatform?.postTypes.map((type) => {
                      const isSelected = selectedPostType === type;
                      
                      return (
                        <button
                          key={type}
                          onClick={() => setSelectedPostType(type)}
                          className={`
                            relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300
                            ${isSelected 
                              ? 'bg-gray-900 text-white shadow-lg scale-105' 
                              : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-md'
                            }
                          `}
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            {type}
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Strategy Brief Section */}
                <div className={`space-y-6 p-6 rounded-2xl bg-slate-50/50 border border-slate-200/50 transition-all duration-500 ease-out ${selectedPostType ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-4 pointer-events-none'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Strategy Brief</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  {/* Objective Selection */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900">What is the Goal?</h2>
                    <div className="flex flex-wrap gap-3">
                      {OBJECTIVES.map((obj) => {
                        const isSelected = objective === obj.id;
                        
                        return (
                          <button
                            key={obj.id}
                            onClick={() => setObjective(obj.id)}
                            className={`
                              relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300
                              ${isSelected 
                                ? 'bg-gray-900 text-white shadow-lg scale-105' 
                                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-md'
                              }
                            `}
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              <span>{obj.emoji}</span>
                              <span className="font-bold">{obj.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Topic Input */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900">What's the Topic?</h2>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lightbulb className={`w-5 h-5 transition-colors duration-300 ${topic ? 'text-orange-500' : 'text-gray-400'}`} />
                      </div>
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., AI automation for real estate agents"
                        className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-lg shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:ring-4 focus:ring-gray-900/10 transition-all outline-none group-hover:border-gray-300"
                        disabled={!selectedPostType}
                      />
                    </div>
                  </div>

                  {/* Target Audience Input */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900">Who is this for?</h2>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Users className={`w-5 h-5 transition-colors duration-300 ${targetAudience ? 'text-orange-500' : 'text-gray-400'}`} />
                      </div>
                      <input
                        type="text"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        placeholder="e.g., SaaS Founders, New Moms, First-time Homebuyers..."
                        className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-lg shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:ring-4 focus:ring-gray-900/10 transition-all outline-none group-hover:border-gray-300"
                        disabled={!selectedPostType}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Area */}
                <div className="pt-6 flex flex-col items-center justify-center gap-6">
                  <button
                    onClick={handleGenerate}
                    disabled={!isFormValid || isGenerating || isAtLimit}
                    className={`
                      group relative w-full md:w-auto px-12 py-5 rounded-2xl font-bold text-xl
                      flex items-center justify-center gap-4 transition-all duration-300
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
                      text-orange-400
                      ${isFormValid && !isGenerating && !isAtLimit 
                        ? 'hover:scale-[1.02]' 
                        : ''
                      }
                    `}
                    style={{
                      backgroundImage: 'none',
                      background: '',
                      backgroundColor: 'rgba(0, 0, 0, 1)',
                      border: '1px solid rgba(0, 0, 0, 0.2)',
                      ...(isFormValid && !isGenerating && !isAtLimit ? {
                        boxShadow: '0 0 20px rgba(249, 115, 22, 0.4), 0 0 40px rgba(168, 85, 247, 0.3), 0 0 60px rgba(249, 115, 22, 0.2)'
                      } : {})
                    }}
                    onMouseEnter={(e) => {
                      if (isFormValid && !isGenerating && !isAtLimit) {
                        e.currentTarget.style.boxShadow = '0 0 30px rgba(249, 115, 22, 0.6), 0 0 60px rgba(168, 85, 247, 0.5), 0 0 90px rgba(249, 115, 22, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isFormValid && !isGenerating && !isAtLimit) {
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(249, 115, 22, 0.4), 0 0 40px rgba(168, 85, 247, 0.3), 0 0 60px rgba(249, 115, 22, 0.2)';
                      }
                    }}
                  >
                    {/* Pulsing glow effect matching the icon's gradient */}
                    {isFormValid && !isGenerating && !isAtLimit && (
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-purple-600 rounded-2xl blur opacity-40 animate-pulse -z-10" />
                    )}
                    
                    {isGenerating ? (
                      <div className="flex items-center justify-center gap-3">
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="animate-pulse drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]">{loadingStep}</span>
                      </div>
                    ) : (
                      <>
                        <Zap className="w-6 h-6 fill-current drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                        <span className="drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]">Generate Blueprint</span>
                        <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                      </>
                    )}
                  </button>
                  
                  {/* Helper text for generation time expectation */}
                  <p className="text-xs text-gray-500 text-center mt-3">
                    ⚡ Deep research & strategy generation takes 60-90 seconds. Please keep this tab open.
                  </p>
                  
                </div>
              </>
            )}
          </div>
        </div>
        )}

        {/* Results Section - The Blueprint (only shown in results view) */}
        {currentView === 'results' && generatedBlueprint && hasAccess && (
          <div id="blueprint-results" className="space-y-8 animate-fadeIn">
            {/* Create New Blueprint Button + Context Summary */}
            <div className="relative overflow-hidden rounded-2xl glass-panel p-6 md:p-8 transition-all duration-500">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                {/* Generation Context Summary */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Blueprint Generated!</h2>
                      <p className="text-sm text-gray-500">Your viral content strategy is ready</p>
                    </div>
                  </div>
                  {/* Context Tags */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedPlatform && (
                      <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold flex items-center gap-1.5">
                        {(() => {
                          const platform = PLATFORMS.find(p => p.id === selectedPlatform);
                          const PlatformIcon = platform?.icon;
                          return PlatformIcon ? <PlatformIcon className="w-3.5 h-3.5" /> : null;
                        })()}
                        {selectedPlatform}
                      </span>
                    )}
                    {selectedPostType && (
                      <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                        {selectedPostType}
                      </span>
                    )}
                    {topic && (
                      <span className="px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold max-w-xs truncate">
                        {topic.length > 40 ? topic.substring(0, 40) + '...' : topic}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Create New Blueprint Button */}
                <button
                  onClick={handleReset}
                  className="group flex items-center gap-3 px-6 py-4 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                >
                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  <span>Create New Blueprint</span>
                </button>
              </div>
            </div>

            {/* Header with Viral Score Badge */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                <h3 className="text-center font-display font-bold text-gray-400 uppercase tracking-widest text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  Your Blueprint
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
              </div>
              
              {/* Viral Score Badge */}
              {generatedBlueprint.viralScore > 0 && (
                <div className={`
                  flex items-center gap-2 px-4 py-2 rounded-full shadow-lg
                  ${generatedBlueprint.viralScore >= 90 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                    : generatedBlueprint.viralScore >= 75 
                      ? 'bg-gradient-to-r from-orange-400 to-amber-500 text-white'
                      : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                  }
                `}>
                  <Flame className="w-4 h-4" />
                  <span className="font-bold text-sm">Viral Score: {generatedBlueprint.viralScore}</span>
                </div>
              )}
            </div>

            {/* Hooks Section - Display hooks as a styled list */}
            {generatedBlueprint.hooks && generatedBlueprint.hooks.length > 0 && (
              <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-gradient-to-br from-amber-50/60 to-orange-50/40 border border-amber-200/60 shadow-elevated p-6 md:p-8">
                {/* Glassmorphism gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/20 pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl blur opacity-40 animate-pulse" />
                        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-xl ring-1 ring-white/20">
                          <Flame className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      🔥 Viral Hooks
                    </h2>
                    <button 
                      onClick={() => handleCopy(generatedBlueprint.hooks.join('\n\n'), 'all-hooks')}
                      className="px-4 py-2 rounded-xl bg-white/80 hover:bg-white border border-amber-200 hover:border-amber-300 text-amber-700 text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                    >
                      {copiedSection === 'all-hooks' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy All
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {generatedBlueprint.hooks.map((hook, index) => (
                      <div 
                        key={index}
                        className="group flex items-start gap-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100/60 hover:border-amber-200 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => handleCopy(hook, `hook-${index}`)}
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                          {index + 1}
                        </div>
                        <p className="flex-1 text-gray-800 leading-relaxed font-medium">
                          {hook}
                        </p>
                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {copiedSection === `hook-${index}` ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Section A: Director's Cut / Content Blueprint */}
            <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/60 border border-white/60 shadow-elevated p-6 md:p-8">
              {/* Glassmorphism gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/20 pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-purple-600 rounded-xl blur opacity-40 animate-pulse" />
                      <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center shadow-xl ring-1 ring-white/20">
                        {generatedBlueprint.isVideoContent 
                          ? <Video className="w-5 h-5 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                          : <FileText className="w-5 h-5 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                        }
                      </div>
                    </div>
                    {generatedBlueprint.isVideoContent ? "The Director's Cut" : "Content Blueprint"}
                  </h2>
                  <span className="text-sm font-medium text-gray-500">
                    {generatedBlueprint.isVideoContent ? 'Script + Visual Guide' : 'Premium Strategy'}
                  </span>
                </div>

                <div className="space-y-6">
                  {generatedBlueprint.directorsCut.map((item, index) => (
                    <div 
                      key={index} 
                      className="relative backdrop-blur-md bg-white/80 rounded-2xl border border-white/80 overflow-hidden hover:shadow-xl transition-all duration-300 group animate-slideUp"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Step Header */}
                      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50/80 to-white/60 border-b border-gray-100/50 backdrop-blur-sm">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 text-white flex items-center justify-center font-bold text-sm shadow-lg">
                          {item.step}
                        </div>
                        <h3 className="font-bold text-gray-900">{item.title}</h3>
                      </div>

                      {/* Full Width Premium Script Renderer */}
                      <div className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          {generatedBlueprint.isVideoContent 
                            ? <MessageSquare className="w-4 h-4 text-indigo-500" />
                            : <Type className="w-4 h-4 text-indigo-500" />
                          }
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            {generatedBlueprint.isVideoContent ? 'Script' : 'Content'}
                          </span>
                        </div>
                        <PremiumScriptRenderer 
                          content={generatedBlueprint.isVideoContent ? item.script : item.text}
                          onCopy={(text) => handleCopy(text, `script-${index}`)}
                        />
                      </div>

                      {/* Visual Direction Section */}
                      {(item.visual || item.visualSuggestion) && (
                        <div className="p-6 pt-0">
                          <div className="p-5 bg-gradient-to-br from-purple-50/80 to-indigo-50/60 backdrop-blur-sm rounded-xl border border-purple-100/50">
                            <div className="flex items-center gap-2 mb-3">
                              {generatedBlueprint.isVideoContent 
                                ? <Eye className="w-4 h-4 text-purple-500" />
                                : <Image className="w-4 h-4 text-purple-500" />
                              }
                              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
                                Visual Direction
                              </span>
                            </div>
                            <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                              {generatedBlueprint.isVideoContent ? item.visual : item.visualSuggestion}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section B: SEO Strategy - The Keyword Pack - Only show if there's SEO data */}
            {(generatedBlueprint.seoStrategy.visualKeywords?.length > 0 || 
              generatedBlueprint.seoStrategy.captionKeywords?.length > 0) && (
              <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/60 border border-white/60 shadow-elevated p-6 md:p-8">
                {/* Glassmorphism gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-transparent to-green-50/20 pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                        <Hash className="w-5 h-5 text-white" />
                      </div>
                      SEO Strategy
                    </h2>
                    <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-xs font-bold uppercase tracking-wider shadow-sm border border-green-200/50">
                      Keyword Pack
                    </span>
                  </div>

              <div className="space-y-6">
                {/* Trending Keywords - Only show if there are seo_keywords */}
                {generatedBlueprint.seoStrategy.visualKeywords && generatedBlueprint.seoStrategy.visualKeywords.length > 0 && (
                  <div className="backdrop-blur-md bg-white/80 rounded-2xl p-6 border border-green-100/60 hover:shadow-xl transition-all duration-300 hover:border-green-200/80">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-md">
                        <TrendingUp className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm">📈 Trending Keywords</h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">Trending search terms to boost discoverability</p>
                    <div className="flex flex-wrap gap-2">
                      {generatedBlueprint.seoStrategy.visualKeywords.map((keyword, index) => (
                        <span 
                          key={index}
                          className="px-4 py-2 bg-gradient-to-br from-green-50/90 to-emerald-100/70 backdrop-blur-sm border border-green-300/60 rounded-full text-xs font-semibold text-green-700 shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-pointer"
                          onClick={() => handleCopy(keyword, `keyword-${index}`)}
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hashtags - Only show if there are hashtags */}
                {generatedBlueprint.seoStrategy.captionKeywords && generatedBlueprint.seoStrategy.captionKeywords.length > 0 && (
                  <div className="backdrop-blur-md bg-white/80 rounded-2xl p-6 border border-purple-100/60 hover:shadow-xl transition-all duration-300 hover:border-purple-200/80">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center shadow-md">
                        <Hash className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm">Hashtags</h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">Caption & description tags</p>
                    <div className="flex flex-wrap gap-2">
                      {generatedBlueprint.seoStrategy.captionKeywords.map((keyword, index) => (
                        <span 
                          key={index}
                          className="px-4 py-2 bg-gradient-to-br from-purple-50/90 to-purple-100/70 backdrop-blur-sm border border-purple-200/60 rounded-full text-xs font-semibold text-purple-700 shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-pointer"
                          onClick={() => handleCopy(keyword, `caption-${index}`)}
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                    <button 
                      onClick={() => handleCopy(generatedBlueprint.seoStrategy.captionKeywords.join(' '), 'all-captions')}
                      className="mt-5 w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      {copiedSection === 'all-captions' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied All!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy All Tags
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
                </div>
              </div>
            )}

            {/* Section C: Audio Vibe - Only for video content */}
            {generatedBlueprint.isVideoContent && generatedBlueprint.audioVibe && (
              <div className="glass-panel rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shadow-lg">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-900">Audio Vibe</h2>
                    <p className="text-gray-600">{generatedBlueprint.audioVibe.mood}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">BPM</span>
                    <p className="text-lg font-mono font-bold text-gray-900">{generatedBlueprint.audioVibe.bpm}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100">
                  💡 {generatedBlueprint.audioVibe.suggestion}
                </p>
              </div>
            )}

            {/* Premium Viral Score Gauge */}
            <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-gradient-to-br from-white/60 to-gray-50/40 border border-white/60 shadow-elevated p-8 md:p-12">
              {/* Glassmorphism gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50/20 via-transparent to-purple-50/20 pointer-events-none" />
              
              <div className="relative z-10 flex items-center justify-center">
                <ViralScoreGauge score={generatedBlueprint.viralScore} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="viralBlueprint"
      />
    </div>
  );
}
