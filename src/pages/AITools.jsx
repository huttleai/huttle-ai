import { useState, useContext, useEffect } from 'react';
import { Hash, Type, Target, BarChart3, Copy, Check, Wand2, MessageSquare, Zap, Save, Calendar, Image as ImageIcon, Lightbulb, ChevronRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { BrandContext } from '../context/BrandContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useContent } from '../context/ContentContext';
import { AuthContext } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import AIFeatureLock from '../components/AIFeatureLock';
import { 
  generateCaption, 
  scoreContentQuality, 
  generateHashtags, 
  generateHooks, 
  generateCTAs,
  generateVisualIdeas 
} from '../services/grokAPI';
import { useNavigate } from 'react-router-dom';
import { AIDisclaimerFooter, HowWePredictModal, getToastDisclaimer } from '../components/AIDisclaimer';
import { shouldResetAIUsage } from '../utils/aiUsageHelpers';

export default function AITools() {
  const { addToast: showToast } = useToast();
  const { brandData } = useContext(BrandContext);
  const { user } = useContext(AuthContext);
  const { userTier, getFeatureLimit } = useSubscription();
  const { saveGeneratedContent, setDraft } = useContent();
  const navigate = useNavigate();
  const [activeTool, setActiveTool] = useState('caption');
  const [copiedIndex, setCopiedIndex] = useState(null);
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
  const [contentScore, setContentScore] = useState(null);
  const [isLoadingScore, setIsLoadingScore] = useState(false);

  // Visual Brainstormer State
  const [visualPrompt, setVisualPrompt] = useState('');
  const [generatedVisualIdeas, setGeneratedVisualIdeas] = useState([]);
  const [isLoadingVisualIdeas, setIsLoadingVisualIdeas] = useState(false);
  
  // AI Usage Tracking
  const [aiGensUsed, setAiGensUsed] = useState(0);
  const [aiGensLimit, setAiGensLimit] = useState(Infinity);
  const [isAILocked, setIsAILocked] = useState(false);

  // Modal state
  const [showHowWePredictModal, setShowHowWePredictModal] = useState(false);

  // Initialize AI usage limits based on subscription tier
  useEffect(() => {
    const aiLimit = getFeatureLimit('aiGenerations');
    setAiGensLimit(aiLimit === -1 ? Infinity : aiLimit);
    
    const savedUsage = localStorage.getItem('aiGensUsed');
    if (savedUsage) {
      const used = parseInt(savedUsage, 10);
      setAiGensUsed(used);
      
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
      setAiGensUsed(0);
      localStorage.setItem('aiGensUsed', '0');
      localStorage.setItem('aiUsageLastReset', new Date().toISOString());
      setIsAILocked(false);
      showToast('Your AI usage limit has been reset! 🎉', 'success');
    }
  }, [user, showToast]);

  const checkAIUsage = () => {
    if (aiGensLimit !== Infinity && aiGensUsed >= aiGensLimit) {
      setIsAILocked(true);
      showToast('AI generation limit reached. Please upgrade to continue.', 'error');
      return false;
    }
    return true;
  };

  const incrementAIUsage = () => {
    const newUsage = aiGensUsed + 1;
    setAiGensUsed(newUsage);
    localStorage.setItem('aiGensUsed', newUsage.toString());
    
    if (aiGensLimit !== Infinity && newUsage >= aiGensLimit) {
      setIsAILocked(true);
    }
  };

  const tools = [
    { id: 'caption', name: 'Captions', icon: MessageSquare, description: 'Generate engaging captions' },
    { id: 'hashtags', name: 'Hashtags', icon: Hash, description: 'Find trending hashtags' },
    { id: 'hooks', name: 'Hooks', icon: Type, description: 'Craft attention grabbers' },
    { id: 'cta', name: 'CTAs', icon: Target, description: 'Call-to-action phrases' },
    { id: 'scorer', name: 'Scorer', icon: BarChart3, description: 'Score your content' },
    { id: 'visual-brainstorm', name: 'Visuals', icon: ImageIcon, description: 'Visual concept ideas' },
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
        const captions = result.caption.split(/\d+\./).filter(c => c.trim()).slice(0, 4);
        
        if (captions.length > 0) {
          setGeneratedCaptions(captions);
          incrementAIUsage();
          showToast(`Captions generated! ${getToastDisclaimer('general')}`, 'success');
        } else if (result.caption.trim()) {
          setGeneratedCaptions([result.caption.trim()]);
          incrementAIUsage();
          showToast(`Caption generated! ${getToastDisclaimer('general')}`, 'success');
        } else {
          setGeneratedCaptions([
            `Discover the amazing benefits of ${captionInput}! 🌟 Transform your routine with these proven tips.`,
            `Ready to learn about ${captionInput}? 💡 Here's everything you need to know to get started today!`,
            `${captionInput} has never been easier! ✨ Try these simple strategies and see real results.`,
            `Unlock the power of ${captionInput}! 🚀 Share this with someone who needs to see it.`
          ]);
          showToast(`Using fallback captions. ${getToastDisclaimer('general')}`, 'info');
        }
      } else {
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
      const result = await generateHashtags(hashtagInput, brandData);

      if (result.success) {
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
      const result = await generateHooks(hookInput, brandData, hookTheme);

      if (result.success) {
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
      const result = await generateCTAs(ctaGoal, brandData, ctaPlatform);

      if (result.success) {
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
      const result = await scoreContentQuality(contentToScore, brandData);

      if (result.success) {
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

  // Visual Brainstormer Handler
  const handleGenerateVisualIdeas = async () => {
    if (!visualPrompt.trim()) {
      showToast('Please describe your visual concept', 'warning');
      return;
    }

    if (!checkAIUsage()) return;

    setIsLoadingVisualIdeas(true);
    try {
      const result = await generateVisualIdeas(visualPrompt, brandData);
      
      let ideas = [];
      if (result.success && result.ideas) {
        const content = result.ideas;
        try {
          const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            ideas = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          } else {
            ideas = JSON.parse(content);
          }
        } catch {
          const ideaSections = content.split(/\d+\./).filter(s => s.trim());
          ideas = ideaSections.slice(0, 5).map((section, i) => ({
            title: `${visualPrompt} - Concept ${i + 1}`,
            description: section.trim().substring(0, 200),
            style: 'Creative visual style',
            platform: ['Instagram', 'TikTok', 'YouTube', 'Pinterest', 'Facebook'][i] || 'Instagram',
            type: ['image', 'video', 'carousel', 'image', 'video'][i] || 'image'
          }));
        }
      }
      
      if (ideas.length === 0) {
        ideas = [
          { title: `${visualPrompt} - Concept 1`, description: 'A visually striking composition that captures attention', style: 'Cinematic 4K with dramatic lighting', platform: 'Instagram', type: 'image' },
          { title: `${visualPrompt} - Concept 2`, description: 'Dynamic movement and energy to engage viewers', style: 'Fast-paced editing with bold colors', platform: 'TikTok', type: 'video' },
          { title: `${visualPrompt} - Concept 3`, description: 'Clean, minimalist approach with focus on key elements', style: 'Minimalist flat design', platform: 'Instagram', type: 'carousel' },
          { title: `${visualPrompt} - Concept 4`, description: 'Artistic interpretation with creative flair', style: 'Watercolor illustration style', platform: 'Pinterest', type: 'image' },
          { title: `${visualPrompt} - Concept 5`, description: 'Professional and polished for maximum impact', style: 'Studio photography aesthetic', platform: 'X (Twitter)', type: 'image' }
        ];
      }

      setGeneratedVisualIdeas(ideas);
      incrementAIUsage();
      showToast(`Visual ideas generated! ${getToastDisclaimer('general')}`, 'success');
    } catch (error) {
      console.error('Visual brainstorm error:', error);
      showToast('Error generating visual ideas', 'error');
    } finally {
      setIsLoadingVisualIdeas(false);
    }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSaveContent = (content, type, metadata = {}) => {
    saveGeneratedContent({ type, content, metadata, tool: activeTool });
    showToast('Content saved! Access it from Content Library.', 'success');
  };

  const handleScheduleContent = (content) => {
    setDraft({ content, source: 'ai-tools', tool: activeTool, timestamp: new Date().toISOString() });
    showToast('Navigating to calendar...', 'info');
    setTimeout(() => navigate('/calendar'), 500);
  };

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-16 md:pt-20 px-4 md:px-6 lg:px-8 pb-8 relative overflow-x-hidden">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 pointer-events-none pattern-mesh opacity-30 z-0" />
      
      <div className="relative z-10 max-w-full">
        {/* AI Lock Overlay */}
        {isAILocked && <AIFeatureLock used={aiGensUsed} limit={aiGensLimit} />}
        
        {/* Header */}
        <div className="mb-4 md:mb-6 lg:mb-8">
          <div className="flex items-start gap-2 md:gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-xl md:rounded-2xl bg-huttle-primary flex items-center justify-center shadow-xl shadow-huttle-blue/25 flex-shrink-0">
              <Zap className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl lg:text-3xl font-display font-bold text-gray-900">
                AI Power Tools
              </h1>
              <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                Generate captions, hashtags, hooks, and more
              </p>
              
              {/* AI Usage Indicator - Below title on mobile */}
              {aiGensLimit !== Infinity && (
                <div className="flex items-center gap-1.5 md:gap-2 mt-2 inline-flex px-2.5 md:px-3 py-1.5 md:py-2 bg-white rounded-lg md:rounded-xl border border-gray-200 shadow-soft">
                  <div className="w-1.5 h-1.5 rounded-full bg-huttle-cyan animate-pulse" />
                  <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                    <span className="text-gray-900 font-bold">{aiGensUsed}</span>/{aiGensLimit} used
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tool Selector */}
        <div className="mb-3 md:mb-4 lg:mb-6">
          {/* Mobile Dropdown - Gradient Button Style */}
          <div className="md:hidden relative group">
            {/* Active Tool Icon */}
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              {(() => {
                const ActiveToolIcon = tools.find(t => t.id === activeTool)?.icon;
                return ActiveToolIcon ? <ActiveToolIcon className="w-4 h-4 text-white drop-shadow-sm" /> : null;
              })()}
            </div>
            
            {/* Solid Blue Background Layer */}
            <div className="absolute inset-0 bg-huttle-primary rounded-xl shadow-lg shadow-huttle-primary/25" />
            
            {/* Select Element */}
            <select
              value={activeTool}
              onChange={(e) => setActiveTool(e.target.value)}
              className="relative w-full pl-11 pr-10 py-3.5 bg-transparent border-0 rounded-xl font-bold text-sm text-white outline-none appearance-none z-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundPosition: 'right 12px center',
                backgroundSize: '16px',
                backgroundRepeat: 'no-repeat'
              }}
            >
              {tools.map((tool) => (
                <option key={tool.id} value={tool.id} className="bg-gray-900 text-white">
                  {tool.name} - {tool.description}
                </option>
              ))}
            </select>
            
            {/* Shine Effect on Hover */}
            <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-active:opacity-10 transition-opacity pointer-events-none" />
          </div>

          {/* Desktop/Tablet Horizontal Scroll */}
          <div className="hidden md:block -mx-4 md:mx-0">
            <div className="flex gap-2 overflow-x-auto pb-2 px-4 md:px-0 snap-x snap-mandatory scrollbar-hide">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`group flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 whitespace-nowrap snap-start flex-shrink-0 text-sm ${
                    activeTool === tool.id
                      ? 'bg-huttle-primary text-white shadow-lg shadow-huttle-primary/25'
                      : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-huttle-primary/50 hover:text-huttle-primary'
                  }`}
                >
                  <tool.icon className={`w-4 h-4 ${activeTool === tool.id ? '' : 'group-hover:scale-110'} transition-transform flex-shrink-0`} />
                  <span>{tool.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tool Content Areas */}
        <div className="card overflow-hidden max-w-full">
          
          {/* Caption Generator */}
          {activeTool === 'caption' && (
            <div>
              <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100 bg-huttle-cyan-light/30">
                <h2 className="font-display font-bold text-gray-900 flex items-center gap-2.5 md:gap-3">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-huttle-primary flex items-center justify-center shadow-lg shadow-huttle-blue/20">
                    <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <span className="text-base md:text-lg">Caption Generator</span>
                </h2>
                <p className="text-xs md:text-sm text-gray-500 mt-2 ml-0 md:ml-[52px]">Create engaging captions from simple inputs</p>
              </div>

            <div className="p-4 md:p-5 space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Post Idea or Keywords
                </label>
                <textarea
                  value={captionInput}
                  onChange={(e) => setCaptionInput(e.target.value)}
                  placeholder="e.g., morning workout motivation, new product launch..."
                  className="w-full p-3 border border-gray-200 rounded-lg resize-none h-20 md:h-24 focus:ring-2 focus:ring-huttle-primary/20 focus:border-huttle-primary outline-none text-sm"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Length</label>
                  <select
                    value={captionLength}
                    onChange={(e) => setCaptionLength(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-huttle-primary/20 focus:border-huttle-primary outline-none text-sm"
                  >
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tone</label>
                  <select
                    value={captionTone}
                    onChange={(e) => setCaptionTone(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-huttle-primary/20 focus:border-huttle-primary outline-none text-sm"
                  >
                    <option value="engaging">Engaging</option>
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="funny">Funny</option>
                    <option value="inspirational">Inspirational</option>
                  </select>
                </div>
              </div>

              {/* Brand Voice Toggle */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 px-2.5 md:px-3 py-2 md:py-2.5 relative group">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={applyBrandVoice}
                      onChange={(e) => setApplyBrandVoice(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-[18px] md:w-9 md:h-5 bg-gray-300 peer-focus:ring-2 peer-focus:ring-huttle-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[14px] after:w-[14px] md:after:h-4 md:after:w-4 after:transition-all peer-checked:bg-huttle-primary"></div>
                  </div>
                  <span className="text-xs font-medium text-gray-600 flex-1">
                    Apply my brand voice
                  </span>
                </label>
                {brandData?.brandVoice && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-20">
                    Brand voice: <span className="font-bold text-huttle-cyan">{brandData.brandVoice}</span>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                      <div className="border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerateCaptions}
                disabled={isLoadingCaptions}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all font-medium text-sm disabled:opacity-50"
              >
                {isLoadingCaptions ? <LoadingSpinner size="sm" /> : <Wand2 className="w-4 h-4" />}
                <span>{isLoadingCaptions ? 'Generating...' : 'Generate Captions'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              {generatedCaptions.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <AIDisclaimerFooter phraseIndex={0} className="mb-3" onModalOpen={() => setShowHowWePredictModal(true)} />
                  <div className="space-y-3">
                    {generatedCaptions.map((caption, i) => (
                      <div key={i} className="p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-100 group hover:border-huttle-primary/30 transition-all">
                        <p className="text-xs md:text-sm text-gray-800 whitespace-pre-wrap mb-3">{caption.trim()}</p>
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                          <button onClick={() => handleCopy(caption.trim(), `caption-${i}`)} className="flex items-center gap-1 px-2 md:px-3 py-1.5 bg-white border border-gray-200 hover:border-huttle-primary/50 rounded text-xs font-medium transition-all">
                            {copiedIndex === `caption-${i}` ? <><Check className="w-3 h-3 text-green-600" /><span className="text-green-600">Copied</span></> : <><Copy className="w-3 h-3 text-gray-600" /><span>Copy</span></>}
                          </button>
                          <button onClick={() => handleSaveContent(caption.trim(), 'caption', { input: captionInput })} className="flex items-center gap-1 px-2 md:px-3 py-1.5 bg-white border border-gray-200 hover:border-huttle-primary/50 rounded text-xs font-medium transition-all">
                            <Save className="w-3 h-3 text-gray-600" /><span>Save</span>
                          </button>
                          <button onClick={() => handleScheduleContent(caption.trim())} className="flex items-center gap-1 px-2 md:px-3 py-1.5 bg-huttle-primary/10 text-huttle-primary hover:bg-huttle-primary/20 rounded text-xs font-medium transition-all">
                            <Calendar className="w-3 h-3" /><span>Schedule</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hashtag Generator */}
        {activeTool === 'hashtags' && (
          <div>
            <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100 bg-gradient-to-r from-cyan-50/50 to-blue-50/50">
              <h2 className="font-display font-bold text-gray-900 flex items-center gap-2.5 md:gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-huttle-primary flex items-center justify-center shadow-lg shadow-huttle-blue/20">
                  <Hash className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <span className="text-base md:text-lg">Hashtag Generator</span>
              </h2>
              <p className="text-xs md:text-sm text-gray-500 mt-2 ml-0 md:ml-[52px]">Find trending hashtags to boost discoverability</p>
            </div>

            <div className="p-4 md:p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Keywords or Niche</label>
                <input
                  type="text"
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  placeholder="e.g., fitness tips, small business marketing, travel photography"
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-huttle-primary/20 focus:border-huttle-primary outline-none text-sm"
                />
              </div>

              {/* Brand Voice Toggle */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 px-2.5 md:px-3 py-2 md:py-2.5 relative group">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={applyBrandVoice}
                      onChange={(e) => setApplyBrandVoice(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-[18px] md:w-9 md:h-5 bg-gray-300 peer-focus:ring-2 peer-focus:ring-huttle-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[14px] after:w-[14px] md:after:h-4 md:after:w-4 after:transition-all peer-checked:bg-huttle-primary"></div>
                  </div>
                  <span className="text-xs font-medium text-gray-600 flex-1">
                    Apply my brand voice
                  </span>
                </label>
                {brandData?.brandVoice && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-20">
                    Brand voice: <span className="font-bold text-huttle-cyan">{brandData.brandVoice}</span>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                      <div className="border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleGenerateHashtags} disabled={isLoadingHashtags} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all font-medium text-sm disabled:opacity-50">
                {isLoadingHashtags ? <LoadingSpinner size="sm" /> : <Hash className="w-4 h-4" />}
                <span>{isLoadingHashtags ? 'Finding...' : 'Generate Hashtags'}</span>
              </button>

              {generatedHashtags.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <AIDisclaimerFooter phraseIndex={1} className="mb-3" onModalOpen={() => setShowHowWePredictModal(true)} />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs md:text-sm font-medium text-gray-700">Ranked Hashtags</span>
                    <button onClick={() => handleCopy(generatedHashtags.map(h => h.tag).join(' '), 'all-hashtags')} className="text-xs text-huttle-primary hover:underline font-medium">
                      {copiedIndex === 'all-hashtags' ? 'Copied!' : 'Copy All'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {generatedHashtags.map((hashtag, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 md:p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-huttle-primary/30 transition-all">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 text-xs md:text-sm truncate">{hashtag.tag}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-huttle-primary font-medium">Score: {hashtag.score}%</span>
                            <span className="text-xs text-gray-500">{hashtag.posts} posts</span>
                          </div>
                        </div>
                        <button onClick={() => handleCopy(hashtag.tag, `hashtag-${i}`)} className="p-1.5 hover:bg-white rounded transition-colors flex-shrink-0 ml-2">
                          {copiedIndex === `hashtag-${i}` ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hook Builder */}
        {activeTool === 'hooks' && (
          <div>
            <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100 bg-huttle-cyan-light/30">
              <h2 className="font-display font-bold text-gray-900 flex items-center gap-2.5 md:gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-huttle-primary flex items-center justify-center shadow-lg shadow-huttle-blue/20">
                  <Type className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <span className="text-base md:text-lg">Hook Builder</span>
              </h2>
              <p className="text-xs md:text-sm text-gray-500 mt-2 ml-0 md:ml-[52px]">Craft attention-grabbing opening lines</p>
            </div>

            <div className="p-4 md:p-5 space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Hook Theme</label>
                <select value={hookTheme} onChange={(e) => setHookTheme(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-huttle-primary/20 focus:border-huttle-primary outline-none text-sm">
                  <option value="question">Question</option>
                  <option value="teaser">Teaser</option>
                  <option value="shocking">Shocking Statement</option>
                  <option value="story">Story Beginning</option>
                  <option value="statistic">Statistic/Fact</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Brief Idea</label>
                <input type="text" value={hookInput} onChange={(e) => setHookInput(e.target.value)} placeholder="e.g., why consistency matters in fitness" className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-huttle-primary/20 focus:border-huttle-primary outline-none text-sm" />
              </div>

              {/* Brand Voice Toggle */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 px-2.5 md:px-3 py-2 md:py-2.5 relative group">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={applyBrandVoice}
                      onChange={(e) => setApplyBrandVoice(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-[18px] md:w-9 md:h-5 bg-gray-300 peer-focus:ring-2 peer-focus:ring-huttle-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[14px] after:w-[14px] md:after:h-4 md:after:w-4 after:transition-all peer-checked:bg-huttle-primary"></div>
                  </div>
                  <span className="text-xs font-medium text-gray-600 flex-1">
                    Apply my brand voice
                  </span>
                </label>
                {brandData?.brandVoice && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-20">
                    Brand voice: <span className="font-bold text-huttle-cyan">{brandData.brandVoice}</span>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                      <div className="border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleGenerateHooks} disabled={isLoadingHooks} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all font-medium text-sm disabled:opacity-50">
                {isLoadingHooks ? <LoadingSpinner size="sm" /> : <Type className="w-4 h-4" />}
                <span>{isLoadingHooks ? 'Building...' : 'Generate Hooks'}</span>
              </button>

              {generatedHooks.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <AIDisclaimerFooter phraseIndex={2} className="mb-3" onModalOpen={() => setShowHowWePredictModal(true)} />
                  <div className="space-y-2">
                    {generatedHooks.map((hook, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-huttle-primary/30 transition-all">
                        <p className="text-sm text-gray-800 font-medium flex-1">{hook.trim()}</p>
                        <button onClick={() => handleCopy(hook.trim(), `hook-${i}`)} className="p-1.5 hover:bg-white rounded transition-colors ml-2 flex-shrink-0">
                          {copiedIndex === `hook-${i}` ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA Suggester */}
        {activeTool === 'cta' && (
          <div>
            <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100 bg-huttle-cyan-light/30">
              <h2 className="font-display font-bold text-gray-900 flex items-center gap-2.5 md:gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-huttle-primary flex items-center justify-center shadow-lg shadow-huttle-blue/20">
                  <Target className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <span className="text-base md:text-lg">CTA Suggester</span>
              </h2>
              <p className="text-xs md:text-sm text-gray-500 mt-2 ml-0 md:ml-[52px]">Generate powerful call-to-action phrases</p>
            </div>

            <div className="p-4 md:p-5 space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your Goal</label>
                <input type="text" value={ctaGoal} onChange={(e) => setCtaGoal(e.target.value)} placeholder="e.g., increase engagement, drive sales, get DMs" className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-huttle-primary/20 focus:border-huttle-primary outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Platform</label>
                <select value={ctaPlatform} onChange={(e) => setCtaPlatform(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-huttle-primary/20 focus:border-huttle-primary outline-none text-sm">
                  <option value="general">General</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="tiktok">TikTok</option>
                  <option value="twitter">X/Twitter</option>
                  <option value="youtube">YouTube</option>
                </select>
              </div>

              {/* Brand Voice Toggle */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 px-2.5 md:px-3 py-2 md:py-2.5 relative group">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={applyBrandVoice}
                      onChange={(e) => setApplyBrandVoice(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-[18px] md:w-9 md:h-5 bg-gray-300 peer-focus:ring-2 peer-focus:ring-huttle-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[14px] after:w-[14px] md:after:h-4 md:after:w-4 after:transition-all peer-checked:bg-huttle-primary"></div>
                  </div>
                  <span className="text-xs font-medium text-gray-600 flex-1">
                    Apply my brand voice
                  </span>
                </label>
                {brandData?.brandVoice && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-20">
                    Brand voice: <span className="font-bold text-huttle-cyan">{brandData.brandVoice}</span>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                      <div className="border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleGenerateCTAs} disabled={isLoadingCTAs} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all font-medium text-sm disabled:opacity-50">
                {isLoadingCTAs ? <LoadingSpinner size="sm" /> : <Target className="w-4 h-4" />}
                <span>{isLoadingCTAs ? 'Generating...' : 'Generate CTAs'}</span>
              </button>

              {generatedCTAs.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <AIDisclaimerFooter phraseIndex={3} className="mb-3" onModalOpen={() => setShowHowWePredictModal(true)} />
                  <div className="space-y-2">
                    {generatedCTAs.map((cta, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-huttle-primary/30 transition-all">
                        <div className="flex-1">
                          <p className="text-sm text-gray-800 font-medium">{cta.trim()}</p>
                          <p className="text-xs text-gray-500 mt-1">Best for: {ctaPlatform === 'general' ? 'All platforms' : ctaPlatform}</p>
                        </div>
                        <button onClick={() => handleCopy(cta.trim(), `cta-${i}`)} className="p-1.5 hover:bg-white rounded transition-colors ml-2 flex-shrink-0">
                          {copiedIndex === `cta-${i}` ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Quality Scorer */}
        {activeTool === 'scorer' && (
          <div>
            <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100 bg-huttle-cyan-light/30">
              <h2 className="font-display font-bold text-gray-900 flex items-center gap-2.5 md:gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-huttle-primary flex items-center justify-center shadow-lg shadow-huttle-blue/20">
                  <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <span className="text-base md:text-lg">Content Quality Scorer</span>
              </h2>
              <p className="text-xs md:text-sm text-gray-500 mt-2 ml-0 md:ml-[52px]">Get instant feedback and improvement tips</p>
            </div>

            <div className="p-4 md:p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Paste Your Content</label>
                <textarea value={contentToScore} onChange={(e) => setContentToScore(e.target.value)} placeholder="Paste your draft post, caption, or content here to get a quality score..." className="w-full p-3 border border-gray-200 rounded-lg resize-none h-36 focus:ring-2 focus:ring-huttle-primary/20 focus:border-huttle-primary outline-none text-sm" />
              </div>

              <button onClick={handleScoreContent} disabled={isLoadingScore} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all font-medium text-sm disabled:opacity-50">
                {isLoadingScore ? <LoadingSpinner size="sm" /> : <BarChart3 className="w-4 h-4" />}
                <span>{isLoadingScore ? 'Analyzing...' : 'Score Content'}</span>
              </button>

              {contentScore && (
                <div className="pt-4 border-t border-gray-100 space-y-4">
                  <AIDisclaimerFooter phraseIndex={0} className="mb-3" onModalOpen={() => setShowHowWePredictModal(true)} />
                  
                  {/* Overall Score */}
                  <div className="flex flex-col items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="36" stroke="#e5e7eb" strokeWidth="6" fill="none" />
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke="#00bad3"
                          strokeWidth="6"
                          fill="none"
                          strokeDasharray={`${(contentScore.overall / 100) * 226} 226`}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg sm:text-xl font-bold text-gray-900">{contentScore.overall}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900 text-sm md:text-base">Overall Score</p>
                      <p className="text-xs md:text-sm text-gray-500">{contentScore.overall >= 70 ? 'Great content!' : contentScore.overall >= 50 ? 'Good, with room to improve' : 'Needs work'}</p>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                    {Object.entries(contentScore.breakdown).map(([key, value]) => (
                      <div key={key} className="p-2.5 md:p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 capitalize mb-1">{key}</p>
                        <p className="text-lg md:text-xl font-bold text-gray-900">{value}%</p>
                      </div>
                    ))}
                  </div>

                  {/* Suggestions */}
                  <div className="bg-huttle-primary/5 rounded-lg p-4 border border-huttle-primary/10">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-huttle-primary" />
                      Suggestions
                    </h4>
                    <ul className="space-y-1.5">
                      {contentScore.suggestions.map((suggestion, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-huttle-primary mt-1.5 flex-shrink-0" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Visual Brainstormer */}
        {activeTool === 'visual-brainstorm' && (
          <div>
            <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100 bg-huttle-cyan-light/30">
              <h2 className="font-display font-bold text-gray-900 flex items-center gap-2.5 md:gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-huttle-primary flex items-center justify-center shadow-lg shadow-huttle-blue/20">
                  <ImageIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <span className="text-base md:text-lg">Visual Brainstormer</span>
              </h2>
              <p className="text-xs md:text-sm text-gray-500 mt-2 ml-0 md:ml-[52px]">Generate creative image and video concepts</p>
            </div>

            <div className="p-4 md:p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Describe Your Visual Concept</label>
                <textarea value={visualPrompt} onChange={(e) => setVisualPrompt(e.target.value)} placeholder="e.g., futuristic coffee shop interior, sunset yoga session on beach" className="w-full p-3 border border-gray-200 rounded-lg resize-none h-28 focus:ring-2 focus:ring-huttle-primary/20 focus:border-huttle-primary outline-none text-sm" />
                <p className="text-xs text-gray-500 mt-2">Be specific! Include mood, setting, colors, or visual style.</p>
              </div>

              {/* Brand Voice Toggle */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 px-2.5 md:px-3 py-2 md:py-2.5 relative group">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={applyBrandVoice}
                      onChange={(e) => setApplyBrandVoice(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-[18px] md:w-9 md:h-5 bg-gray-300 peer-focus:ring-2 peer-focus:ring-huttle-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[14px] after:w-[14px] md:after:h-4 md:after:w-4 after:transition-all peer-checked:bg-huttle-primary"></div>
                  </div>
                  <span className="text-xs font-medium text-gray-600 flex-1">
                    Apply my brand voice
                  </span>
                </label>
                {brandData?.brandVoice && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-20">
                    Brand voice: <span className="font-bold text-huttle-cyan">{brandData.brandVoice}</span>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                      <div className="border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleGenerateVisualIdeas} disabled={isLoadingVisualIdeas} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all font-medium text-sm disabled:opacity-50">
                {isLoadingVisualIdeas ? <LoadingSpinner size="sm" /> : <Lightbulb className="w-4 h-4" />}
                <span>{isLoadingVisualIdeas ? 'Generating...' : 'Generate Visual Ideas'}</span>
              </button>

              {generatedVisualIdeas.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <AIDisclaimerFooter phraseIndex={0} className="mb-3" onModalOpen={() => setShowHowWePredictModal(true)} />
                  <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded mb-3">These are concept descriptions. Export to Midjourney, DALL-E, or other tools to create!</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {generatedVisualIdeas.map((idea, i) => (
                      <div key={i} className="p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-100 group hover:border-huttle-primary/30 transition-all">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <h5 className="font-medium text-gray-900 text-xs md:text-sm flex-1 min-w-0">{idea.title}</h5>
                          <button onClick={() => handleCopy(JSON.stringify(idea, null, 2), `visual-${i}`)} className="p-1 hover:bg-white rounded flex-shrink-0">
                            {copiedIndex === `visual-${i}` ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-xs bg-huttle-primary/10 text-huttle-primary px-2 py-0.5 rounded font-medium">{idea.type}</span>
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{idea.platform}</span>
                        </div>
                        <p className="text-xs md:text-sm text-gray-600 mb-2">{idea.description}</p>
                        <p className="text-xs text-gray-500 italic">"{idea.style}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Usage Tracker */}
      {aiGensLimit !== Infinity && (
        <div className="mt-6 card p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs md:text-sm font-semibold text-gray-700">AI Generations Used</span>
            <span className="text-xs md:text-sm font-bold text-gray-900">{aiGensUsed} / {aiGensLimit}</span>
          </div>
          <div className="bg-gray-100 rounded-full h-2 md:h-2.5 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                aiGensUsed >= aiGensLimit * 0.9 
                  ? 'bg-huttle-gradient' 
                  : 'bg-gradient-to-r from-huttle-primary to-cyan-400'
              }`} 
              style={{ width: `${Math.min((aiGensUsed / aiGensLimit) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* How We Predict Modal */}
      <HowWePredictModal isOpen={showHowWePredictModal} onClose={() => setShowHowWePredictModal(false)} />
    </div>
    </div>
  );
}
