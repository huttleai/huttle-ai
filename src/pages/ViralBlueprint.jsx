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
  FileText
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

// TODO: N8N_WORKFLOW - Import workflow service when ready
import { generateViralBlueprint } from '../services/n8nWorkflowAPI';
import { WORKFLOW_NAMES, isWorkflowConfigured } from '../utils/workflowConstants';

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

export default function ViralBlueprint() {
  const { brandProfile, isCreator, isBrand } = useBrand();
  const { user } = useContext(AuthContext);
  const { addToast: showToast } = useToast();
  const { checkFeatureAccess, getFeatureLimit, userTier } = useSubscription();

  // Form state
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [selectedPostType, setSelectedPostType] = useState(null);
  const [objective, setObjective] = useState('views');
  const [topic, setTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('');

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlueprint, setGeneratedBlueprint] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);

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

    // Build payload
    const payload = {
      platform: selectedPlatform,
      type: selectedPostType,
      objective: objective,
      topic: topic.trim(),
      targetAudience: targetAudience.trim(),
      voiceContext: voiceContextLabel
    };

    console.log('Blueprint Payload:', payload);

    try {
      // ==========================================================================
      // TODO: N8N_WORKFLOW - Replace with workflow call when available
      // 
      // When implementing:
      // if (isWorkflowConfigured(WORKFLOW_NAMES.VIRAL_BLUEPRINT)) {
      //   const result = await generateViralBlueprint({
      //     platform: selectedPlatform,
      //     postType: selectedPostType,
      //     topic: topic.trim(),
      //     voiceContext: voiceContextLabel,
      //     brandProfile
      //   });
      //   if (result.success) {
      //     setGeneratedBlueprint({
      //       isVideoContent: result.blueprint?.isVideoContent,
      //       directorsCut: result.directorsCut,
      //       seoStrategy: result.seoStrategy,
      //       audioVibe: result.audioVibe,
      //       viralScore: result.viralScore
      //     });
      //     // Update usage and show success
      //     return;
      //   }
      //   // If workflow fails, fall through to mock generator
      // }
      // ==========================================================================
      
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Current implementation: Generate mock blueprint
      const mockBlueprint = generateMockBlueprint(selectedPlatform, selectedPostType, topic);
      setGeneratedBlueprint(mockBlueprint);

      // Update usage
      const newUsage = usageCount + 1;
      setUsageCount(newUsage);
      localStorage.setItem('viralBlueprintUsage', newUsage.toString());

      showToast('Viral Blueprint generated! 🚀', 'success');
      
      // Scroll to results
      setTimeout(() => {
        const resultsElement = document.getElementById('blueprint-results');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      
    } catch (error) {
      console.error('Generation error:', error);
      showToast('Failed to generate blueprint. Please try again.', 'error');
    } finally {
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

  // Reset form
  const handleReset = () => {
    setSelectedPlatform(null);
    setSelectedPostType(null);
    setObjective('views');
    setTopic('');
    setTargetAudience('');
    setGeneratedBlueprint(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex-1 min-h-screen bg-gray-50/50 ml-0 lg:ml-64 pt-20 px-4 md:px-6 lg:px-8 pb-12">
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
                  <span className="px-3 py-1 rounded-full bg-gray-900 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-gray-900/20 ring-1 ring-white/20">
                    Generator
                  </span>
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

        {/* Input Console - The Briefing */}
        <div className="card-glass overflow-hidden relative">
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
                      <>
                        <LoadingSpinner size="sm" color="rgb(251, 146, 60)" />
                        <span className="animate-pulse drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]">Engineering Virality...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-6 h-6 fill-current drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                        <span className="drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]">Generate Blueprint</span>
                        <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                      </>
                    )}
                  </button>
                  
                  {generatedBlueprint && (
                    <button
                      onClick={handleReset}
                      className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reset Generator
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Results Section - The Blueprint */}
        {generatedBlueprint && hasAccess && (
          <div id="blueprint-results" className="space-y-8 animate-reveal-up">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
              <h3 className="text-center font-display font-bold text-gray-400 uppercase tracking-widest text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                Your Blueprint
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
            </div>

            {/* Section A: Director's Cut / Content Blueprint */}
            <div className="glass-panel rounded-2xl p-6 md:p-8">
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
                  {generatedBlueprint.isVideoContent ? 'Script + Visual Guide' : 'Text + Visual Suggestions'}
                </span>
              </div>

              <div className="space-y-6">
                {generatedBlueprint.directorsCut.map((item, index) => (
                  <div 
                    key={index} 
                    className="relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Step Header */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 border-b border-gray-100">
                      <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold text-sm shadow-md">
                        {item.step}
                      </div>
                      <h3 className="font-bold text-gray-900">{item.title}</h3>
                    </div>

                    {/* Split View: Adaptive based on content type */}
                    <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                      {/* Left Column: Script (video) or Text (non-video) */}
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          {generatedBlueprint.isVideoContent 
                            ? <MessageSquare className="w-4 h-4 text-blue-500" />
                            : <Type className="w-4 h-4 text-blue-500" />
                          }
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            {generatedBlueprint.isVideoContent ? 'Script' : 'Text'}
                          </span>
                        </div>
                        <p className="text-gray-800 leading-relaxed font-medium whitespace-pre-line">
                          {generatedBlueprint.isVideoContent ? item.script : item.text}
                        </p>
                      </div>

                      {/* Right Column: Visual (video) or Visual Suggestion (non-video) */}
                      <div className="p-5 bg-gray-50/50">
                        <div className="flex items-center gap-2 mb-3">
                          {generatedBlueprint.isVideoContent 
                            ? <Eye className="w-4 h-4 text-purple-500" />
                            : <Image className="w-4 h-4 text-purple-500" />
                          }
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            {generatedBlueprint.isVideoContent ? 'Visual' : 'Visual Suggestion'}
                          </span>
                        </div>
                        <p className="text-gray-600 leading-relaxed text-sm">
                          {generatedBlueprint.isVideoContent ? item.visual : item.visualSuggestion}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section B: SEO Strategy - The Keyword Pack */}
            <div className="glass-panel rounded-2xl p-6 md:p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                    <Hash className="w-5 h-5 text-white" />
                  </div>
                  2025 SEO Strategy
                </h2>
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider">
                  Keyword Pack
                </span>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Visual Keywords */}
                <div className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-4">
                    <Type className="w-4 h-4 text-orange-500" />
                    <h3 className="font-bold text-gray-900 text-sm">Visual Keywords</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Put these on screen as text overlay</p>
                  <div className="flex flex-wrap gap-2">
                    {generatedBlueprint.seoStrategy.visualKeywords.map((keyword, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-xs font-medium text-orange-700"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Spoken Hooks / Opening Lines */}
                <div className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-4">
                    {generatedBlueprint.isVideoContent 
                      ? <Mic className="w-4 h-4 text-blue-500" />
                      : <Type className="w-4 h-4 text-blue-500" />
                    }
                    <h3 className="font-bold text-gray-900 text-sm">
                      {generatedBlueprint.isVideoContent ? 'Spoken Hooks' : 'Opening Lines'}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    {generatedBlueprint.isVideoContent 
                      ? 'Say these in the first 3 seconds' 
                      : 'Start your post with these phrases'
                    }
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {generatedBlueprint.seoStrategy.spokenHooks.map((hook, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-700"
                      >
                        {hook}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Caption Keywords */}
                <div className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-4">
                    <Hash className="w-4 h-4 text-purple-500" />
                    <h3 className="font-bold text-gray-900 text-sm">Caption Keywords</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Natural phrases for your description</p>
                  <div className="flex flex-wrap gap-2">
                    {generatedBlueprint.seoStrategy.captionKeywords.map((keyword, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-xs font-medium text-purple-700 cursor-pointer hover:bg-purple-100 transition-colors"
                        onClick={() => handleCopy(keyword, `caption-${index}`)}
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                  <button 
                    onClick={() => handleCopy(generatedBlueprint.seoStrategy.captionKeywords.join(' '), 'all-captions')}
                    className="mt-4 text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 transition-colors"
                  >
                    {copiedSection === 'all-captions' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedSection === 'all-captions' ? 'Copied!' : 'Copy All'}
                  </button>
                </div>
              </div>
            </div>

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

            {/* Viral Score Footer */}
            <div className="flex items-center justify-center gap-4 py-4">
              <span className="text-sm font-medium text-gray-500">Viral Potential Score:</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all duration-1000"
                    style={{ width: `${generatedBlueprint.viralScore}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-gray-900">{generatedBlueprint.viralScore}</span>
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
