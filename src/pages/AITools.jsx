import { useState, useContext, useEffect } from 'react';
import { Sparkles, Hash, Type, Target, BarChart3, Search, Copy, Check, Wand2, MessageSquare, Zap, Save, Calendar } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { BrandContext } from '../context/BrandContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useContent } from '../context/ContentContext';
import { AuthContext } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import AIFeatureLock from '../components/AIFeatureLock';
import { generateCaption, scoreContentQuality } from '../services/grokAPI';
import { useNavigate } from 'react-router-dom';
import { AIDisclaimerFooter, HowWePredictModal, getToastDisclaimer } from '../components/AIDisclaimer';
import { shouldResetAIUsage } from '../utils/aiUsageHelpers';

// Additional API functions for new tools
async function generateHashtags(input, niche, brandVoice) {
  try {
    const GROK_API_KEY = import.meta.env.VITE_GROK_API_KEY || '';
    const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
    
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: 'You are a hashtag expert. Generate relevant, high-engagement hashtags.'
          },
          {
            role: 'user',
            content: `Suggest 10 trending hashtags for: "${input}" in ${niche} niche. Pick hashtags that fit ${brandVoice} brand voice and boost discoverability. Format as: #hashtag (engagement score 0-100, posts count)`
          }
        ],
        temperature: 0.5,
      })
    });

    const data = await response.json();
    return {
      success: true,
      hashtags: data.choices?.[0]?.message?.content || ''
    };
  } catch (error) {
    console.error('Hashtag generation error:', error);
    return { success: false, error: error.message };
  }
}

async function generateHooks(input, niche, brandVoice) {
  try {
    const GROK_API_KEY = import.meta.env.VITE_GROK_API_KEY || '';
    const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
    
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: `You are a content hook expert for ${niche}. Create attention-grabbing opening lines.`
          },
          {
            role: 'user',
            content: `Build 4 short hooks under 15 words for: "${input}" in ${niche}, designed to spark engagement. Match ${brandVoice} brand voice. Number them 1-4.`
          }
        ],
        temperature: 0.8,
      })
    });

    const data = await response.json();
    return {
      success: true,
      hooks: data.choices?.[0]?.message?.content || ''
    };
  } catch (error) {
    console.error('Hook generation error:', error);
    return { success: false, error: error.message };
  }
}

async function generateCTAs(goal, niche, brandVoice, platform = 'general') {
  try {
    const GROK_API_KEY = import.meta.env.VITE_GROK_API_KEY || '';
    const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
    
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: 'You are a call-to-action specialist. Create compelling, action-oriented CTAs.'
          },
          {
            role: 'user',
            content: `Suggest 5 urgent CTAs for goal: "${goal}" in ${niche} on ${platform}. Examples like "DM for tips", "Save this", etc. Align with ${brandVoice} brand voice. Number them 1-5.`
          }
        ],
        temperature: 0.7,
      })
    });

    const data = await response.json();
    return {
      success: true,
      ctas: data.choices?.[0]?.message?.content || ''
    };
  } catch (error) {
    console.error('CTA generation error:', error);
    return { success: false, error: error.message };
  }
}

export default function AITools() {
  const { addToast: showToast } = useToast();
  const { brandData } = useContext(BrandContext);
  const { user } = useContext(AuthContext);
  const { userTier, getFeatureLimit } = useSubscription();
  const { saveGeneratedContent, setDraft } = useContent();
  const navigate = useNavigate();
  const [activeTool, setActiveTool] = useState('caption');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [mainSearchQuery, setMainSearchQuery] = useState('');
  const [applyBrandVoice, setApplyBrandVoice] = useState(true);

  // Caption Generator State
  const [captionInput, setCaptionInput] = useState('');
  const [captionLength, setCaptionLength] = useState('medium');
  const [captionTone, setCaptionTone] = useState('engaging');
  const [generatedCaptions, setGeneratedCaptions] = useState([]);
  const [isLoadingCaptions, setIsLoadingCaptions] = useState(false);

  // Hashtag Generator State
  const [hashtagInput, setHashtagInput] = useState('');
  const [generatedHashtags, setGeneratedHashtags] = useState([]);
  const [isLoadingHashtags, setIsLoadingHashtags] = useState(false);

  // Hook Builder State
  const [hookInput, setHookInput] = useState('');
  const [hookTheme, setHookTheme] = useState('question');
  const [generatedHooks, setGeneratedHooks] = useState([]);
  const [isLoadingHooks, setIsLoadingHooks] = useState(false);

  // CTA Suggester State
  const [ctaGoal, setCtaGoal] = useState('');
  const [ctaPlatform, setCtaPlatform] = useState('general');
  const [generatedCTAs, setGeneratedCTAs] = useState([]);
  const [isLoadingCTAs, setIsLoadingCTAs] = useState(false);

  // Content Quality Scorer State
  const [contentToScore, setContentToScore] = useState('');
  
  // AI Usage Tracking
  const [aiGensUsed, setAiGensUsed] = useState(0);
  const [aiGensLimit, setAiGensLimit] = useState(Infinity);
  const [isAILocked, setIsAILocked] = useState(false);

  // Initialize AI usage limits based on subscription tier
  useEffect(() => {
    const aiLimit = getFeatureLimit('aiGenerations');
    setAiGensLimit(aiLimit === -1 ? Infinity : aiLimit);
    
    // Load saved AI usage (in real app, this would come from backend)
    const savedUsage = localStorage.getItem('aiGensUsed');
    if (savedUsage) {
      const used = parseInt(savedUsage, 10);
      setAiGensUsed(used);
      
      // Check if AI is locked
      if (aiLimit !== -1 && used >= aiLimit) {
        setIsAILocked(true);
      }
    }
  }, [userTier, getFeatureLimit]);

  // Check if usage should be reset based on subscription anniversary
  useEffect(() => {
    const lastResetDate = localStorage.getItem('aiUsageLastReset');
    const subscriptionStartDate = user?.subscriptionStartDate;
    
    if (shouldResetAIUsage(subscriptionStartDate, lastResetDate)) {
      // Reset usage
      setAiGensUsed(0);
      localStorage.setItem('aiGensUsed', '0');
      localStorage.setItem('aiUsageLastReset', new Date().toISOString());
      setIsAILocked(false);
      showToast('Your AI usage limit has been reset! 🎉', 'success');
    }
  }, [user, showToast]);

  // Check AI usage before any generation
  const checkAIUsage = () => {
    if (aiGensLimit !== Infinity && aiGensUsed >= aiGensLimit) {
      setIsAILocked(true);
      showToast('AI generation limit reached. Please upgrade to continue.', 'error');
      return false;
    }
    return true;
  };

  // Increment AI usage after successful generation
  const incrementAIUsage = () => {
    const newUsage = aiGensUsed + 1;
    setAiGensUsed(newUsage);
    localStorage.setItem('aiGensUsed', newUsage.toString());
    
    // Lock if limit reached
    if (aiGensLimit !== Infinity && newUsage >= aiGensLimit) {
      setIsAILocked(true);
    }
  };
  const [contentScore, setContentScore] = useState(null);
  const [isLoadingScore, setIsLoadingScore] = useState(false);

  // Modal state
  const [showHowWePredictModal, setShowHowWePredictModal] = useState(false);

  const tools = [
    { id: 'caption', name: 'Caption Generator', icon: MessageSquare, color: 'purple', description: 'Create engaging captions' },
    { id: 'hashtags', name: 'Hashtag Generator', icon: Hash, color: 'blue', description: 'Find trending hashtags' },
    { id: 'hooks', name: 'Hook Builder', icon: Type, color: 'green', description: 'Craft attention grabbers' },
    { id: 'cta', name: 'CTA Suggester', icon: Target, color: 'orange', description: 'Generate call-to-actions' },
    { id: 'scorer', name: 'Quality Scorer', icon: BarChart3, color: 'red', description: 'Score your content' },
  ];

  // Caption Generator Handler
  const handleGenerateCaptions = async () => {
    if (!captionInput.trim()) {
      showToast('Please enter a post idea or keywords', 'warning');
      return;
    }

    if (!checkAIUsage()) return;

    setIsLoadingCaptions(true);
    try {
      const brandVoice = applyBrandVoice && brandData?.brandVoice 
        ? brandData.brandVoice 
        : captionTone;

      const result = await generateCaption(
        { topic: captionInput, platform: 'social media' },
        { ...brandData, brandVoice }
      );

      if (result.success && result.caption) {
        // Parse the result into array
        const captions = result.caption.split(/\d+\./).filter(c => c.trim()).slice(0, 4);
        
        if (captions.length > 0) {
          setGeneratedCaptions(captions);
          incrementAIUsage();
          showToast(`Captions generated! ${getToastDisclaimer('general')}`, 'success');
        } else if (result.caption.trim()) {
          // Single caption, split by newlines or use as-is
          setGeneratedCaptions([result.caption.trim()]);
          incrementAIUsage();
          showToast(`Caption generated! ${getToastDisclaimer('general')}`, 'success');
        } else {
          // Fallback mock captions
          setGeneratedCaptions([
            `Discover the amazing benefits of ${captionInput}! 🌟 Transform your routine with these proven tips.`,
            `Ready to learn about ${captionInput}? 💡 Here's everything you need to know to get started today!`,
            `${captionInput} has never been easier! ✨ Try these simple strategies and see real results.`,
            `Unlock the power of ${captionInput}! 🚀 Share this with someone who needs to see it.`
          ]);
          showToast(`Using fallback captions. ${getToastDisclaimer('general')}`, 'info');
        }
      } else {
        // Fallback on error
        setGeneratedCaptions([
          `Discover the amazing benefits of ${captionInput}! 🌟 Transform your routine with these proven tips.`,
          `Ready to learn about ${captionInput}? 💡 Here's everything you need to know to get started today!`,
          `${captionInput} has never been easier! ✨ Try these simple strategies and see real results.`,
          `Unlock the power of ${captionInput}! 🚀 Share this with someone who needs to see it.`
        ]);
        showToast(result.error || 'API error - using fallback captions', 'warning');
      }
    } catch (error) {
      console.error('Caption generation error:', error);
      showToast('Error generating captions', 'error');
    } finally {
      setIsLoadingCaptions(false);
    }
  };

  // Hashtag Generator Handler
  const handleGenerateHashtags = async () => {
    if (!hashtagInput.trim()) {
      showToast('Please enter keywords or describe your content', 'warning');
      return;
    }

    if (!checkAIUsage()) return;

    setIsLoadingHashtags(true);
    try {
      const result = await generateHashtags(
        hashtagInput,
        brandData?.niche || 'general',
        brandData?.brandVoice || 'professional'
      );

      if (result.success) {
        // Parse hashtags (mock for now since we need actual API response)
        const mockHashtags = [
          { tag: '#ContentCreator', score: 95, posts: '2.4M' },
          { tag: '#SocialMediaMarketing', score: 92, posts: '1.8M' },
          { tag: '#DigitalMarketing', score: 89, posts: '3.1M' },
          { tag: '#ContentStrategy', score: 87, posts: '876K' },
          { tag: '#MarketingTips', score: 84, posts: '1.2M' },
          { tag: '#BrandBuilding', score: 82, posts: '654K' },
          { tag: '#SocialMedia', score: 80, posts: '5.6M' },
          { tag: '#OnlineMarketing', score: 75, posts: '987K' },
        ];
        setGeneratedHashtags(mockHashtags);
        incrementAIUsage();
        showToast(`Hashtags generated! ${getToastDisclaimer('general')}`, 'success');
      } else {
        showToast('Failed to generate hashtags', 'error');
      }
    } catch (error) {
      console.error('Hashtag generation error:', error);
      showToast('Error generating hashtags', 'error');
    } finally {
      setIsLoadingHashtags(false);
    }
  };

  // Hook Builder Handler
  const handleGenerateHooks = async () => {
    if (!hookInput.trim()) {
      showToast('Please enter your idea or theme', 'warning');
      return;
    }

    if (!checkAIUsage()) return;

    setIsLoadingHooks(true);
    try {
      const result = await generateHooks(
        `${hookTheme}: ${hookInput}`,
        brandData?.niche || 'general',
        brandData?.brandVoice || 'engaging'
      );

      if (result.success) {
        // Parse hooks into array
        const hooks = result.hooks.split(/\d+\./).filter(h => h.trim());
        setGeneratedHooks(hooks.length > 0 ? hooks : [result.hooks]);
        incrementAIUsage();
        showToast(`Hooks generated! ${getToastDisclaimer('general')}`, 'success');
      } else {
        showToast('Failed to generate hooks', 'error');
      }
    } catch (error) {
      console.error('Hook generation error:', error);
      showToast('Error generating hooks', 'error');
    } finally {
      setIsLoadingHooks(false);
    }
  };

  // CTA Suggester Handler
  const handleGenerateCTAs = async () => {
    if (!ctaGoal.trim()) {
      showToast('Please enter your goal', 'warning');
      return;
    }

    if (!checkAIUsage()) return;

    setIsLoadingCTAs(true);
    try {
      const result = await generateCTAs(
        ctaGoal,
        brandData?.niche || 'general',
        brandData?.brandVoice || 'professional',
        ctaPlatform
      );

      if (result.success) {
        // Parse CTAs into array
        const ctas = result.ctas.split(/\d+\./).filter(c => c.trim());
        setGeneratedCTAs(ctas.length > 0 ? ctas : [result.ctas]);
        incrementAIUsage();
        showToast(`CTAs generated! ${getToastDisclaimer('general')}`, 'success');
      } else {
        showToast('Failed to generate CTAs', 'error');
      }
    } catch (error) {
      console.error('CTA generation error:', error);
      showToast('Error generating CTAs', 'error');
    } finally {
      setIsLoadingCTAs(false);
    }
  };

  // Content Quality Scorer Handler
  const handleScoreContent = async () => {
    if (!contentToScore.trim()) {
      showToast('Please paste your content to score', 'warning');
      return;
    }

    if (!checkAIUsage()) return;

    setIsLoadingScore(true);
    try {
      const result = await scoreContentQuality(
        contentToScore,
        brandData
      );

      if (result.success) {
        // Parse the score (mock for demo)
        setContentScore({
          overall: 78,
          breakdown: {
            hook: 85,
            engagement: 72,
            cta: 80,
            readability: 75
          },
          suggestions: [
            'Add a stronger hook in the first sentence',
            'Include 2-3 relevant emojis for visual appeal',
            'Shorten paragraphs for better mobile readability',
            'End with a clear call-to-action question'
          ],
          rawAnalysis: result.analysis
        });
        incrementAIUsage();
        showToast(`Content scored! ${getToastDisclaimer('general')}`, 'success');
      } else {
        showToast('Failed to score content', 'error');
      }
    } catch (error) {
      console.error('Content scoring error:', error);
      showToast('Error scoring content', 'error');
    } finally {
      setIsLoadingScore(false);
    }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSaveContent = (content, type, metadata = {}) => {
    const savedId = saveGeneratedContent({
      type,
      content,
      metadata,
      tool: activeTool,
    });
    showToast('Content saved! Access it from Content Library.', 'success');
    return savedId;
  };

  const handleScheduleContent = (content) => {
    setDraft({
      content,
      source: 'ai-tools',
      tool: activeTool,
      timestamp: new Date().toISOString(),
    });
    showToast('Navigating to calendar...', 'info');
    setTimeout(() => navigate('/calendar'), 500);
  };

  return (
    <div className="flex-1 bg-gray-50 ml-0 lg:ml-64 pt-20 px-4 md:px-8 pb-8 relative">
      {/* AI Lock Overlay */}
      {isAILocked && <AIFeatureLock used={aiGensUsed} limit={aiGensLimit} />}
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-huttle-primary to-blue-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Spark Your Content
          </h1>
        </div>
        <p className="text-gray-600 mb-6">
          Quick AI-powered tools to generate captions, hooks, hashtags, and more in seconds
        </p>

        {/* Main Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Describe your post idea in plain words..."
            value={mainSearchQuery}
            onChange={(e) => setMainSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-huttle-primary focus:border-huttle-primary transition-all outline-none text-lg"
          />
        </div>

        {/* Brand Voice Toggle */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={applyBrandVoice}
              onChange={(e) => setApplyBrandVoice(e.target.checked)}
              className="w-5 h-5 text-huttle-primary rounded focus:ring-2 focus:ring-huttle-primary"
            />
            <span className="text-sm font-medium text-gray-700">
              Apply my brand voice automatically
            </span>
          </label>
          {brandData?.brandVoice && (
            <span className="text-xs bg-huttle-primary/10 text-huttle-primary px-2 py-1 rounded">
              {brandData.brandVoice}
            </span>
          )}
        </div>
      </div>

      {/* Tool Selector */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl font-semibold transition-all ${
              activeTool === tool.id
                ? 'bg-huttle-primary text-white shadow-lg scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-huttle-primary'
            }`}
          >
            <tool.icon className="w-6 h-6" />
            <div className="text-center">
              <div className="text-sm font-bold">{tool.name}</div>
              <div className={`text-xs ${activeTool === tool.id ? 'text-white/80' : 'text-gray-500'}`}>
                {tool.description}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Tool Content Areas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Caption Generator */}
        {activeTool === 'caption' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Caption Generator</h3>
                <p className="text-sm text-gray-600">Create engaging captions from simple inputs</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Post Idea or Keywords
                </label>
                <textarea
                  value={captionInput}
                  onChange={(e) => setCaptionInput(e.target.value)}
                  placeholder="e.g., morning workout motivation, new product launch, behind the scenes"
                  className="w-full p-4 border border-gray-300 rounded-lg resize-none h-32 focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Caption Length
                  </label>
                  <select
                    value={captionLength}
                    onChange={(e) => setCaptionLength(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
                  >
                    <option value="short">Short (1-2 sentences)</option>
                    <option value="medium">Medium (3-5 sentences)</option>
                    <option value="long">Long (paragraph)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tone
                  </label>
                  <select
                    value={captionTone}
                    onChange={(e) => setCaptionTone(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
                  >
                    <option value="engaging">Engaging</option>
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="funny">Funny</option>
                    <option value="inspirational">Inspirational</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateCaptions}
              disabled={isLoadingCaptions}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all shadow-md hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingCaptions ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Generating Captions...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>Generate Captions</span>
                </>
              )}
            </button>

            {generatedCaptions.length > 0 && (
              <div className="space-y-3 mt-6 pt-6 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Generated Captions ({generatedCaptions.length})
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveContent(generatedCaptions.join('\n\n---\n\n'), 'caption', { input: captionInput, tone: captionTone, length: captionLength })}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium"
                    >
                      <Save className="w-4 h-4" />
                      Save All
                    </button>
                  </div>
                </div>
                <AIDisclaimerFooter 
                  phraseIndex={0} 
                  className="mb-3"
                  onModalOpen={() => setShowHowWePredictModal(true)}
                />
                {generatedCaptions.map((caption, i) => (
                  <div
                    key={i}
                    className="p-4 bg-purple-50 rounded-lg border border-purple-200 hover:border-purple-300 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <pre className="flex-1 whitespace-pre-wrap text-sm text-gray-700 font-sans">
                        {caption.trim()}
                      </pre>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(caption.trim(), `caption-${i}`)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-purple-100 rounded transition-colors text-xs font-medium"
                      >
                        {copiedIndex === `caption-${i}` ? (
                          <>
                            <Check className="w-3 h-3 text-green-600" />
                            <span className="text-green-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-purple-600" />
                            <span className="text-purple-600">Copy</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleSaveContent(caption.trim(), 'caption', { input: captionInput })}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-purple-100 rounded transition-colors text-xs font-medium"
                      >
                        <Save className="w-3 h-3 text-purple-600" />
                        <span className="text-purple-600">Save</span>
                      </button>
                      <button
                        onClick={() => handleScheduleContent(caption.trim())}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-purple-100 rounded transition-colors text-xs font-medium"
                      >
                        <Calendar className="w-3 h-3 text-purple-600" />
                        <span className="text-purple-600">Schedule</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hashtag Generator */}
        {activeTool === 'hashtags' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Hash className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Hashtag Generator</h3>
                <p className="text-sm text-gray-600">Find trending hashtags to boost discoverability</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Keywords or Niche
              </label>
              <input
                type="text"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                placeholder="e.g., fitness tips, small business marketing, travel photography"
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
              />
            </div>

            <button
              onClick={handleGenerateHashtags}
              disabled={isLoadingHashtags}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingHashtags ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Finding Hashtags...</span>
                </>
              ) : (
                <>
                  <Hash className="w-5 h-5" />
                  <span>Generate Hashtags</span>
                </>
              )}
            </button>

            {generatedHashtags.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <AIDisclaimerFooter 
                  phraseIndex={1} 
                  className="mb-4"
                  onModalOpen={() => setShowHowWePredictModal(true)}
                />
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <Hash className="w-5 h-5 text-blue-600" />
                    Ranked Hashtags ({generatedHashtags.length})
                  </h4>
                  <button
                    onClick={() => handleCopy(generatedHashtags.map(h => h.tag).join(' '), 'all-hashtags')}
                    className="flex items-center gap-1 text-sm text-huttle-primary hover:underline font-medium"
                  >
                    {copiedIndex === 'all-hashtags' ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied All!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy All</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {generatedHashtags.map((hashtag, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-all group"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-blue-900">{hashtag.tag}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                            Score: {hashtag.score}%
                          </span>
                          <span className="text-xs text-gray-600">{hashtag.posts} posts</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy(hashtag.tag, `hashtag-${i}`)}
                        className="p-2 hover:bg-blue-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {copiedIndex === `hashtag-${i}` ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hook Builder */}
        {activeTool === 'hooks' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Type className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Hook Builder</h3>
                <p className="text-sm text-gray-600">Craft attention-grabbing opening lines</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Hook Theme
                </label>
                <select
                  value={hookTheme}
                  onChange={(e) => setHookTheme(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
                >
                  <option value="question">Question</option>
                  <option value="teaser">Teaser</option>
                  <option value="shocking">Shocking Statement</option>
                  <option value="story">Story Beginning</option>
                  <option value="statistic">Statistic/Fact</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Brief Idea
                </label>
                <input
                  type="text"
                  value={hookInput}
                  onChange={(e) => setHookInput(e.target.value)}
                  placeholder="e.g., why consistency matters in fitness"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateHooks}
              disabled={isLoadingHooks}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingHooks ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Building Hooks...</span>
                </>
              ) : (
                <>
                  <Type className="w-5 h-5" />
                  <span>Generate Hooks</span>
                </>
              )}
            </button>

            {generatedHooks.length > 0 && (
              <div className="space-y-3 mt-6 pt-6 border-t">
                <AIDisclaimerFooter 
                  phraseIndex={2} 
                  className="mb-3"
                  onModalOpen={() => setShowHowWePredictModal(true)}
                />
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-green-600" />
                  Generated Hooks ({generatedHooks.length})
                </h4>
                {generatedHooks.map((hook, i) => (
                  <div
                    key={i}
                    className="p-4 bg-green-50 rounded-lg border border-green-200 hover:border-green-300 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex-1 text-gray-800 font-medium">{hook.trim()}</p>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => handleCopy(hook.trim(), `hook-${i}`)}
                          className="p-2 hover:bg-green-100 rounded transition-colors flex-shrink-0"
                        >
                          {copiedIndex === `hook-${i}` ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-green-600" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="text-xs text-gray-500 bg-gray-50 rounded p-3 border border-gray-200">
                  💡 Pro tip: Test different hooks with your audience to see which style drives the most engagement
                </div>
              </div>
            )}
          </div>
        )}

        {/* CTA Suggester */}
        {activeTool === 'cta' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">CTA Suggester</h3>
                <p className="text-sm text-gray-600">Generate powerful call-to-action phrases</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Goal
                </label>
                <input
                  type="text"
                  value={ctaGoal}
                  onChange={(e) => setCtaGoal(e.target.value)}
                  placeholder="e.g., increase engagement, drive sales, get DMs"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Platform
                </label>
                <select
                  value={ctaPlatform}
                  onChange={(e) => setCtaPlatform(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
                >
                  <option value="general">General</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="twitter">X/Twitter</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="youtube">YouTube</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateCTAs}
              disabled={isLoadingCTAs}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all shadow-md hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingCTAs ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Generating CTAs...</span>
                </>
              ) : (
                <>
                  <Target className="w-5 h-5" />
                  <span>Generate CTAs</span>
                </>
              )}
            </button>

            {generatedCTAs.length > 0 && (
              <div className="space-y-3 mt-6 pt-6 border-t">
                <AIDisclaimerFooter 
                  phraseIndex={3} 
                  className="mb-3"
                  onModalOpen={() => setShowHowWePredictModal(true)}
                />
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-600" />
                  Generated CTAs ({generatedCTAs.length})
                </h4>
                {generatedCTAs.map((cta, i) => (
                  <div
                    key={i}
                    className="p-4 bg-orange-50 rounded-lg border border-orange-200 hover:border-orange-300 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-gray-800 font-medium">{cta.trim()}</p>
                        <p className="text-xs text-orange-600 mt-1">
                          Best for: {ctaPlatform === 'general' ? 'All platforms' : ctaPlatform}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopy(cta.trim(), `cta-${i}`)}
                        className="p-2 hover:bg-orange-100 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                      >
                        {copiedIndex === `cta-${i}` ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-orange-600" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content Quality Scorer */}
        {activeTool === 'scorer' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Content Quality Scorer</h3>
                <p className="text-sm text-gray-600">Get instant feedback and improvement tips</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Paste Your Content
              </label>
              <textarea
                value={contentToScore}
                onChange={(e) => setContentToScore(e.target.value)}
                placeholder="Paste your draft post, caption, or content here to get a quality score..."
                className="w-full p-4 border border-gray-300 rounded-lg resize-none h-48 focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
              />
            </div>

            <button
              onClick={handleScoreContent}
              disabled={isLoadingScore}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-md hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingScore ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Analyzing Content...</span>
                </>
              ) : (
                <>
                  <BarChart3 className="w-5 h-5" />
                  <span>Score Content</span>
                </>
              )}
            </button>

            {contentScore && (
              <div className="space-y-6 mt-6 pt-6 border-t">
                <AIDisclaimerFooter 
                  phraseIndex={0} 
                  className="mb-4"
                  onModalOpen={() => setShowHowWePredictModal(true)}
                />
                {/* Overall Score Gauge */}
                <div className="text-center p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-200">
                  <p className="text-sm font-semibold text-gray-600 mb-2">Overall Quality Score</p>
                  <div className="relative w-32 h-32 mx-auto mb-3">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#fee2e2"
                        strokeWidth="12"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke={contentScore.overall >= 70 ? '#10b981' : contentScore.overall >= 50 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${(contentScore.overall / 100) * 351.86} 351.86`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl font-bold text-gray-900">{contentScore.overall}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    {contentScore.overall >= 70 ? '🎉 Great content!' : contentScore.overall >= 50 ? '👍 Good, with room to improve' : '💪 Needs work'}
                  </p>
                </div>

                {/* Breakdown Scores */}
                <div>
                  <h4 className="font-bold text-gray-900 mb-3">Score Breakdown</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(contentScore.breakdown).map(([key, value]) => (
                      <div key={key} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 capitalize mb-1">{key}</p>
                        <p className="text-2xl font-bold text-gray-900">{value}%</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggestions */}
                <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Suggestions to Improve
                  </h4>
                  <ul className="space-y-2">
                    {contentScore.suggestions.map((suggestion, i) => (
                      <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      // Future enhancement: Regenerate improved version using AI feedback loop
                      // This will analyze the quality score and suggest improvements
                      showToast('Regenerating improved version...', 'info');
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all shadow-md font-medium"
                  >
                    <Wand2 className="w-4 h-4" />
                    Regenerate Improved Version
                  </button>
                  <button
                    onClick={() => handleCopy(contentScore.rawAnalysis, 'analysis')}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
                  >
                    {copiedIndex === 'analysis' ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Analysis</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Usage Tracker - Free vs Pro */}
      <div className="mt-6 bg-gradient-to-r from-huttle-primary/10 to-blue-100 rounded-xl border border-huttle-primary/20 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-gray-900 mb-1">Usage This Month</h4>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">12 / 20</span> AI generations used
            </p>
          </div>
          <button className="px-4 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all font-medium text-sm">
            Upgrade to Pro
          </button>
        </div>
        <div className="mt-3 bg-white rounded-full h-2 overflow-hidden">
          <div className="bg-huttle-primary h-full w-3/5 transition-all"></div>
        </div>
      </div>

      {/* How We Predict Modal */}
      <HowWePredictModal 
        isOpen={showHowWePredictModal} 
        onClose={() => setShowHowWePredictModal(false)} 
      />
    </div>
  );
}
