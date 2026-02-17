import { useState, useContext, useEffect } from 'react';
import { Hash, Type, Target, BarChart3, Copy, Check, Wand2, MessageSquare, Zap, Save, Calendar, Image as ImageIcon, Lightbulb, ChevronRight, FolderPlus, Camera, Bot, Download, MessageCircle, DollarSign, Mail, ArrowRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { BrandContext } from '../context/BrandContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useContent } from '../context/ContentContext';
import { AuthContext } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import AIFeatureLock from '../components/AIFeatureLock';
import PlatformSelector from '../components/PlatformSelector';
import { getPlatformTips, getPlatform } from '../utils/platformGuidelines';
import { 
  generateCaption, 
  scoreContentQuality, 
  generateHashtags, 
  generateHooks, 
  generateCTAs,
  generateStyledCTAs,
  generateVisualIdeas,
  generateVisualBrainstorm 
} from '../services/grokAPI';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AIDisclaimerFooter, HowWePredictModal, getToastDisclaimer } from '../components/AIDisclaimer';
import { shouldResetAIUsage } from '../utils/aiUsageHelpers';
import { saveContentLibraryItem } from '../config/supabase';

function uniqueNonEmpty(items) {
  return [...new Set((items || []).map((item) => item?.trim()).filter(Boolean))];
}

function buildCaptionFallbacks(topic, platformLabel, tone) {
  const normalizedTopic = topic?.trim() || 'this idea';
  const platform = platformLabel || 'social media';
  const toneLabel = tone || 'engaging';

  return uniqueNonEmpty([
    `${normalizedTopic}: the version most people overlook. Save this and test it on ${platform}.`,
    `Quick ${toneLabel} take on ${normalizedTopic} -> what worked, what did not, and what to do next.`,
    `If you're working on ${normalizedTopic}, start here: one action today beats ten ideas tomorrow.`,
    `${normalizedTopic} can feel overwhelming. Break it into one clear step and share your result below.`,
  ]);
}

export default function AITools() {
  const { addToast: showToast } = useToast();
  const { brandData } = useContext(BrandContext);
  const { user } = useContext(AuthContext);
  const { userTier, getFeatureLimit } = useSubscription();
  const { saveGeneratedContent, setDraft } = useContent();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTool, setActiveTool] = useState('caption');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [savedIndex, setSavedIndex] = useState(null);
  const [scheduledIndex, setScheduledIndex] = useState(null);
  const [applyBrandVoice, setApplyBrandVoice] = useState(true);

  // Caption Generator State
  const [captionInput, setCaptionInput] = useState('');
  const [captionLength, setCaptionLength] = useState('medium');
  const [captionTone, setCaptionTone] = useState('engaging');
  const [captionPlatform, setCaptionPlatform] = useState('instagram');
  const [generatedCaptions, setGeneratedCaptions] = useState([]);
  const [isLoadingCaptions, setIsLoadingCaptions] = useState(false);

  // Hashtag Generator State
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtagPlatform, setHashtagPlatform] = useState('instagram');
  const [generatedHashtags, setGeneratedHashtags] = useState([]);
  const [isLoadingHashtags, setIsLoadingHashtags] = useState(false);

  // Hook Builder State
  const [hookInput, setHookInput] = useState('');
  const [hookTheme, setHookTheme] = useState('question');
  const [hookPlatform, setHookPlatform] = useState('instagram');
  const [generatedHooks, setGeneratedHooks] = useState([]);
  const [isLoadingHooks, setIsLoadingHooks] = useState(false);

  // CTA Suggester State (redesigned)
  const [ctaPromoting, setCtaPromoting] = useState('');
  const [ctaGoalType, setCtaGoalType] = useState('');
  const [ctaGoal, setCtaGoal] = useState(''); // kept for legacy compat
  const [ctaPlatform, setCtaPlatform] = useState('instagram');
  const [generatedCTAs, setGeneratedCTAs] = useState([]);
  const [styledCTAs, setStyledCTAs] = useState(null);
  const [isLoadingCTAs, setIsLoadingCTAs] = useState(false);

  // Content Quality Scorer State
  const [contentToScore, setContentToScore] = useState('');
  const [contentScore, setContentScore] = useState(null);
  const [isLoadingScore, setIsLoadingScore] = useState(false);

  // Visual Brainstormer State
  const [visualPrompt, setVisualPrompt] = useState('');
  const [visualPlatform, setVisualPlatform] = useState('instagram');
  const [visualContentFormat, setVisualContentFormat] = useState('Image');
  const [visualOutputType, setVisualOutputType] = useState('');
  const [generatedVisualIdeas, setGeneratedVisualIdeas] = useState([]);
  const [isLoadingVisualIdeas, setIsLoadingVisualIdeas] = useState(false);
  const [visualBrainstormResult, setVisualBrainstormResult] = useState(null);
  
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

  useEffect(() => {
    const topicParam = searchParams.get('topic');
    const toolParam = searchParams.get('tool');
    const validTools = new Set(['caption', 'hashtags', 'hooks', 'cta', 'scorer', 'visual-brainstorm']);

    let didPrefill = false;

    if (toolParam && validTools.has(toolParam)) {
      setActiveTool(toolParam);
      didPrefill = true;
    }

    if (topicParam) {
      setActiveTool('caption');
      setCaptionInput(topicParam);
      didPrefill = true;
    }

    if (didPrefill) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('tool');
      nextParams.delete('topic');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Caption Generator Handler
  const handleGenerateCaptions = async () => {
    if (!captionInput.trim()) {
      showToast('Please enter a post idea or keywords', 'warning');
      return;
    }

    if (!checkAIUsage()) return;

    setIsLoadingCaptions(true);
    try {
      // Build content data for Grok API
      const contentData = {
        topic: captionInput,
        platform: captionPlatform,
        tone: applyBrandVoice && brandData?.brandVoice ? brandData.brandVoice : captionTone,
        length: captionLength
      };

      const result = await generateCaption(contentData, brandData);

      if (result.success && result.caption) {
        const parsedCaptions = uniqueNonEmpty(
          result.caption
            .split(/\n{2,}|\d+\.\s+/)
            .map((part) => part.replace(/^[-*]\s*/, '').replace(/^["']|["']$/g, '').trim())
        );
        const fallbackCaptions = buildCaptionFallbacks(captionInput, captionPlatform, captionTone);
        const finalCaptions = uniqueNonEmpty([...parsedCaptions, ...fallbackCaptions]).slice(0, 4);

        if (finalCaptions.length > 0) {
          setGeneratedCaptions(finalCaptions);
          incrementAIUsage();
          showToast(`Captions generated! ${getToastDisclaimer('general')}`, 'success');
        } else {
          setGeneratedCaptions(fallbackCaptions);
          showToast(`Using fallback captions. ${getToastDisclaimer('general')}`, 'info');
        }
      } else {
        // Handle error with user-friendly messages
        const errorMessage = result.error || 'API error - using fallback captions';
        
        setGeneratedCaptions(buildCaptionFallbacks(captionInput, captionPlatform, captionTone));
        showToast(errorMessage, 'warning');
      }
    } catch (error) {
      console.error('Caption generation error:', error);
      setGeneratedCaptions(buildCaptionFallbacks(captionInput, captionPlatform, captionTone));
      showToast('Error generating captions. Using fallbacks.', 'error');
    } finally {
      setIsLoadingCaptions(false);
    }
  };

  // Parse hashtags from API response text into structured data
  const parseHashtagsFromText = (text, maxCount = 15) => {
    const hashtags = [];
    // Match hashtags like #SomeThing with optional metadata
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex);
    
    if (matches) {
      const uniqueTags = [...new Set(matches)];
      uniqueTags.slice(0, maxCount).forEach((tag, i) => {
        // Try to extract score/posts from nearby text
        const tagIndex = text.indexOf(tag);
        const nearbyText = text.substring(tagIndex, tagIndex + 200);
        const scoreMatch = nearbyText.match(/(?:score|engagement)[:\s]*(\d+)/i);
        const postsMatch = nearbyText.match(/(\d+(?:\.\d+)?[KMBkmb]?)\s*(?:posts|uses)/i);
        
        hashtags.push({
          tag,
          score: scoreMatch ? parseInt(scoreMatch[1]) : Math.max(95 - (i * 3), 40),
          posts: postsMatch ? postsMatch[1] : `${Math.floor(Math.random() * 5 + 1)}.${Math.floor(Math.random() * 9)}M`,
        });
      });
    }
    
    return hashtags;
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
      const result = await generateHashtags(hashtagInput, brandData, hashtagPlatform);
      const platformData = getPlatform(hashtagPlatform);
      const hashtagCount = platformData?.hashtags?.max || 10;

      if (result.success) {
        // Check if we have pre-parsed hashtag data (from demo mode)
        if (result.hashtagData && Array.isArray(result.hashtagData)) {
          setGeneratedHashtags(result.hashtagData.slice(0, hashtagCount));
        } else if (result.hashtags) {
          // Parse hashtags from API text response
          const parsed = parseHashtagsFromText(result.hashtags, hashtagCount);
          if (parsed.length > 0) {
            setGeneratedHashtags(parsed);
          } else {
            // Fallback: create structured data from raw text
            const lines = result.hashtags.split('\n').filter(l => l.trim());
            const fallbackHashtags = lines.slice(0, hashtagCount).map((line, i) => {
              const tagMatch = line.match(/#[\w]+/);
              return {
                tag: tagMatch ? tagMatch[0] : `#${hashtagInput.replace(/\s+/g, '')}${i + 1}`,
                score: Math.max(95 - (i * 4), 40),
                posts: `${(Math.random() * 5 + 0.5).toFixed(1)}M`,
              };
            });
            setGeneratedHashtags(fallbackHashtags);
          }
        }
        incrementAIUsage();
        showToast(`Hashtags generated for ${platformData?.name || 'social media'}! ${getToastDisclaimer('general')}`, 'success');
      } else {
        const errorMessage = result.error || 'Failed to generate hashtags';
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Hashtag generation error:', error);
      showToast('Error generating hashtags. Please try again.', 'error');
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
      const result = await generateHooks(hookInput, brandData, hookTheme, hookPlatform);
      const platformData = getPlatform(hookPlatform);

      if (result.success && result.hooks) {
        const hooks = result.hooks.split(/\d+\./).filter(h => h.trim());
        setGeneratedHooks(hooks.length > 0 ? hooks : [result.hooks]);
        incrementAIUsage();
        showToast(`Hooks generated for ${platformData?.name || 'social media'}! ${getToastDisclaimer('general')}`, 'success');
      } else {
        // Handle error with user-friendly messages
        const errorMessage = result.error || 'Failed to generate hooks';
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Hook generation error:', error);
      showToast('Error generating hooks. Please try again.', 'error');
    } finally {
      setIsLoadingHooks(false);
    }
  };

  // CTA Suggester Handler (redesigned)
  const handleGenerateCTAs = async () => {
    if (!ctaPromoting.trim()) {
      showToast('Please describe what you\'re promoting', 'warning');
      return;
    }
    if (!ctaGoalType) {
      showToast('Please select a goal', 'warning');
      return;
    }

    setIsLoadingCTAs(true);
    setStyledCTAs(null);
    try {
      const result = await generateStyledCTAs(
        { promoting: ctaPromoting, goalType: ctaGoalType },
        brandData,
        ctaPlatform
      );
      const platformData = getPlatform(ctaPlatform);

      if (result.success) {
        setStyledCTAs(result);
        incrementAIUsage();
        showToast(`CTAs generated for ${platformData?.name || 'social media'}! ${getToastDisclaimer('general')}`, 'success');
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

  // Parse score data from AI text response
  const parseScoreFromText = (text) => {
    try {
      // Try to extract numbers from the text
      const overallMatch = text.match(/(?:overall|total|final)[:\s]*(\d+)/i);
      const hookMatch = text.match(/hook[:\s]*(\d+)/i);
      const ctaMatch = text.match(/(?:cta|call.to.action)[:\s]*(\d+)/i);
      const hashtagMatch = text.match(/hashtag[s]?[:\s]*(\d+)/i);
      const engagementMatch = text.match(/(?:engagement|potential)[:\s]*(\d+)/i);
      
      const overall = overallMatch ? parseInt(overallMatch[1]) : null;
      const hook = hookMatch ? parseInt(hookMatch[1]) : null;
      const cta = ctaMatch ? parseInt(ctaMatch[1]) : null;
      const hashtags = hashtagMatch ? parseInt(hashtagMatch[1]) : null;
      const engagement = engagementMatch ? parseInt(engagementMatch[1]) : null;
      
      // Extract suggestions (lines starting with - or *)
      const suggestionLines = text.match(/[-*•]\s*(.+)/g) || [];
      const suggestions = suggestionLines.map(s => s.replace(/^[-*•]\s*/, '').trim()).filter(s => s.length > 10).slice(0, 5);
      
      if (overall || hook || cta) {
        return {
          overall: overall || Math.round(((hook || 70) + (cta || 70) + (engagement || 70) + (hashtags || 70)) / 4),
          breakdown: {
            hook: hook || 70,
            engagement: engagement || 70,
            cta: cta || 70,
            readability: hashtags || 70,
          },
          suggestions: suggestions.length > 0 ? suggestions : [
            'Consider strengthening your opening hook',
            'Add a clear call-to-action',
            'Include platform-optimized hashtags',
            'Review content length for your target platform',
          ],
        };
      }
      return null;
    } catch {
      return null;
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
        // Check if we have pre-parsed score data (from demo mode)
        if (result.score) {
          setContentScore({
            overall: result.score.overall,
            breakdown: result.score.breakdown,
            suggestions: result.score.suggestions,
            rawAnalysis: result.analysis
          });
        } else if (result.analysis) {
          // Try to parse the raw analysis from the API
          const parsed = parseScoreFromText(result.analysis);
          if (parsed) {
            setContentScore({
              ...parsed,
              rawAnalysis: result.analysis
            });
          } else {
            // Could not parse - use the raw analysis as suggestions
            setContentScore({
              overall: 75,
              breakdown: {
                hook: 78,
                engagement: 72,
                cta: 74,
                readability: 76
              },
              suggestions: [
                'Add a stronger hook in the first sentence',
                'Include 2-3 relevant emojis for visual appeal',
                'Shorten paragraphs for better mobile readability',
                'End with a clear call-to-action question'
              ],
              rawAnalysis: result.analysis
            });
          }
        }
        incrementAIUsage();
        showToast(`Content scored! ${getToastDisclaimer('general')}`, 'success');
      } else {
        const errorMessage = result.error || 'Failed to score content';
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Content scoring error:', error);
      showToast('Error scoring content. Please try again.', 'error');
    } finally {
      setIsLoadingScore(false);
    }
  };

  // Visual Brainstormer Handler (redesigned)
  const handleGenerateVisualBrainstorm = async () => {
    if (!visualPrompt.trim()) {
      showToast('Please describe what your content is about', 'warning');
      return;
    }
    if (!visualOutputType) {
      showToast('Please choose an output type', 'warning');
      return;
    }

    setIsLoadingVisualIdeas(true);
    setVisualBrainstormResult(null);
    try {
      const result = await generateVisualBrainstorm(
        { topic: visualPrompt, platform: visualPlatform, contentFormat: visualContentFormat, outputType: visualOutputType },
        brandData
      );
      
      if (result.success) {
        setVisualBrainstormResult(result);
        incrementAIUsage();
        showToast(`Visual brainstorm generated! ${getToastDisclaimer('general')}`, 'success');
      } else {
        showToast(result.error || 'Failed to generate visual brainstorm', 'error');
      }
    } catch (error) {
      console.error('Visual brainstorm error:', error);
      showToast('Error generating visual brainstorm', 'error');
    } finally {
      setIsLoadingVisualIdeas(false);
    }
  };

  // Legacy handler kept for backward compat
  const handleGenerateVisualIdeas = handleGenerateVisualBrainstorm;

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

  const handleAddToLibrary = async (content, contentType, metadata = {}, itemIndex = null) => {
    if (!user?.id) {
      showToast('Please log in to add content to library', 'error');
      return;
    }

    try {
      const toolNames = {
        caption: 'Caption',
        hashtags: 'Hashtags',
        hooks: 'Hook',
        cta: 'CTA',
        'visual-brainstorm': 'Visual Idea'
      };
      
      const baseName = toolNames[activeTool] || 'Content';
      const inputText = metadata.input || captionInput || hashtagInput || hookInput || ctaGoal || visualPrompt || '';
      const name = inputText 
        ? `${baseName} - ${inputText.substring(0, 30)}${inputText.length > 30 ? '...' : ''}`
        : `${baseName} - ${new Date().toLocaleDateString()}`;

      const itemData = {
        name,
        type: 'text',
        content: typeof content === 'string' ? content : JSON.stringify(content),
        size_bytes: 0,
        description: `Generated from ${toolNames[activeTool] || 'AI Tools'}`,
      };

      const result = await saveContentLibraryItem(user.id, itemData);

      if (result.success) {
        setSavedIndex(itemIndex);
        setTimeout(() => setSavedIndex(null), 2000);
        showToast('Added to Content Library!', 'success');
      } else {
        showToast('Failed to add to library', 'error');
        console.error('Error saving to library:', result.error);
      }
    } catch (error) {
      console.error('Error adding to library:', error);
      showToast('Error adding to library', 'error');
    }
  };

  const handleScheduleContent = (content, itemIndex = null) => {
    const contentAsText = typeof content === 'string' ? content : JSON.stringify(content);
    const draftTitle =
      captionInput
      || hashtagInput
      || hookInput
      || ctaPromoting
      || visualPrompt
      || 'AI Draft';

    setDraft({
      source: 'ai-tools',
      tool: activeTool,
      title: draftTitle,
      caption: contentAsText,
      platforms: [captionPlatform || hashtagPlatform || hookPlatform || ctaPlatform || visualPlatform || 'instagram'],
      timestamp: new Date().toISOString()
    });
    setScheduledIndex(itemIndex);
    setTimeout(() => setScheduledIndex(null), 2000);
    showToast('Opening post composer with your draft...', 'info');
    setTimeout(() => navigate('/dashboard/calendar'), 300);
  };

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-24 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8 relative overflow-x-hidden">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 pointer-events-none pattern-mesh opacity-30 z-0" />
      
      <div className="relative z-10 max-w-full">
        {/* Header */}
        <div className="mb-4 md:mb-6 lg:mb-8">
          <div className="flex items-start gap-2 md:gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 flex-shrink-0">
              <Zap className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-huttle-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl lg:text-3xl font-display font-bold text-gray-900">
                AI Power Tools
              </h1>
              <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                Generate captions, hashtags, hooks, and more
              </p>
            </div>
          </div>
        </div>

        {/* Tool Selector */}
        <div className="mb-3 md:mb-4 lg:mb-6">
          {/* Mobile Horizontal Scroll Tabs */}
          <div className="md:hidden -mx-4">
            <div className="flex gap-2 overflow-x-auto pb-2 px-4 snap-x snap-mandatory scrollbar-hide">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold transition-all duration-200 whitespace-nowrap snap-start flex-shrink-0 text-xs ${
                    activeTool === tool.id
                      ? 'bg-huttle-primary text-white shadow-lg shadow-huttle-primary/25'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-huttle-primary/50'
                  }`}
                >
                  <tool.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{tool.name}</span>
                </button>
              ))}
            </div>
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
              
              {/* Platform Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Platform</label>
                <PlatformSelector
                  value={captionPlatform}
                  onChange={setCaptionPlatform}
                  contentType="caption"
                  showTips={true}
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
                <span>{isLoadingCaptions ? 'Generating (10-15 sec)...' : 'Generate Captions'}</span>
                {!isLoadingCaptions && <ChevronRight className="w-4 h-4" />}
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
                          <button onClick={() => handleAddToLibrary(caption.trim(), 'caption', { input: captionInput }, `caption-${i}`)} className="flex items-center gap-1 px-2 md:px-3 py-1.5 bg-huttle-primary/10 text-huttle-primary hover:bg-huttle-primary/20 rounded text-xs font-medium transition-all">
                            {savedIndex === `caption-${i}` ? <><Check className="w-3 h-3 text-green-600" /><span className="text-green-600">Added!</span></> : <><FolderPlus className="w-3 h-3" /><span>Add to Library</span></>}
                          </button>
                          <button onClick={() => handleScheduleContent(caption.trim(), `caption-${i}`)} className="flex items-center gap-1 px-2 md:px-3 py-1.5 bg-white border border-gray-200 hover:border-huttle-primary/50 rounded text-xs font-medium transition-all">
                            {scheduledIndex === `caption-${i}` ? <><Check className="w-3 h-3 text-green-600" /><span className="text-green-600">Scheduled!</span></> : <><Calendar className="w-3 h-3 text-gray-600" /><span>Schedule</span></>}
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

              {/* Platform Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Platform</label>
                <PlatformSelector
                  value={hashtagPlatform}
                  onChange={setHashtagPlatform}
                  contentType="hashtag"
                  showTips={true}
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
                        <div className="flex items-center gap-1.5 ml-2">
                          <button onClick={() => handleAddToLibrary(hashtag.tag, 'hashtag', { input: hashtagInput }, `hashtag-${i}`)} className="p-1.5 hover:bg-white rounded transition-colors flex-shrink-0" title="Add to Library">
                            {savedIndex === `hashtag-${i}` ? <Check className="w-4 h-4 text-green-600" /> : <FolderPlus className="w-4 h-4 text-huttle-primary" />}
                          </button>
                          <button onClick={() => handleCopy(hashtag.tag, `hashtag-${i}`)} className="p-1.5 hover:bg-white rounded transition-colors flex-shrink-0">
                            {copiedIndex === `hashtag-${i}` ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
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
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Brief Idea</label>
                <input type="text" value={hookInput} onChange={(e) => setHookInput(e.target.value)} placeholder="e.g., why consistency matters in fitness" className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-huttle-primary/20 focus:border-huttle-primary outline-none text-sm" />
              </div>

              {/* Platform Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Platform</label>
                <PlatformSelector
                  value={hookPlatform}
                  onChange={setHookPlatform}
                  contentType="hook"
                  showTips={true}
                />
              </div>

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
                <span>{isLoadingHooks ? 'Generating (10-15 sec)...' : 'Generate Hooks'}</span>
              </button>

              {generatedHooks.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <AIDisclaimerFooter phraseIndex={2} className="mb-3" onModalOpen={() => setShowHowWePredictModal(true)} />
                  <div className="space-y-2">
                    {generatedHooks.map((hook, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-huttle-primary/30 transition-all">
                        <p className="text-sm text-gray-800 font-medium flex-1">{hook.trim()}</p>
                        <div className="flex items-center gap-1.5 ml-2">
                          <button onClick={() => handleAddToLibrary(hook.trim(), 'hook', { input: hookInput }, `hook-${i}`)} className="p-1.5 hover:bg-white rounded transition-colors flex-shrink-0" title="Add to Library">
                            {savedIndex === `hook-${i}` ? <Check className="w-4 h-4 text-green-600" /> : <FolderPlus className="w-4 h-4 text-huttle-primary" />}
                          </button>
                          <button onClick={() => handleCopy(hook.trim(), `hook-${i}`)} className="p-1.5 hover:bg-white rounded transition-colors flex-shrink-0">
                            {copiedIndex === `hook-${i}` ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
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

        {/* CTA Suggester — Redesigned */}
        {activeTool === 'cta' && (
          <div>
            <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100 bg-huttle-cyan-light/30">
              <h2 className="font-display font-bold text-gray-900 flex items-center gap-2.5 md:gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-huttle-primary flex items-center justify-center shadow-lg shadow-huttle-blue/20">
                  <Target className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <span className="text-base md:text-lg">CTA Suggester</span>
              </h2>
              <p className="text-xs md:text-sm text-gray-500 mt-2 ml-0 md:ml-[52px]">Generate powerful call-to-action phrases tailored to your goal</p>
            </div>

            <div className="p-4 md:p-5 space-y-4">
              {/* What are you promoting? */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">What are you promoting?</label>
                <input
                  type="text"
                  value={ctaPromoting}
                  onChange={(e) => setCtaPromoting(e.target.value)}
                  placeholder="e.g., My new online yoga course, Free ebook download, DM me for coaching"
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-huttle-primary/20 focus:border-huttle-primary outline-none text-sm"
                />
              </div>

              {/* Goal Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Goal</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'engagement', icon: MessageCircle, label: 'Drive Engagement', desc: 'Comments, shares, saves' },
                    { id: 'sales', icon: DollarSign, label: 'Drive Sales', desc: 'Purchases, sign-ups, downloads' },
                    { id: 'dms', icon: Mail, label: 'Drive DMs/Leads', desc: 'Direct messages, inquiries' }
                  ].map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => setCtaGoalType(goal.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        ctaGoalType === goal.id
                          ? 'border-huttle-primary bg-cyan-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <goal.icon className={`w-4 h-4 ${ctaGoalType === goal.id ? 'text-huttle-primary' : 'text-gray-400'}`} />
                        <span className="font-semibold text-gray-900 text-xs">{goal.label}</span>
                      </div>
                      <p className="text-xs text-gray-500">{goal.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Platform Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Platform</label>
                <PlatformSelector
                  value={ctaPlatform}
                  onChange={setCtaPlatform}
                  contentType="cta"
                  showTips={true}
                />
              </div>

              {/* Brand Voice Toggle */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 px-2.5 md:px-3 py-2 md:py-2.5">
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
                  <span className="text-xs font-medium text-gray-600 flex-1">Apply my brand voice</span>
                </label>
              </div>

              <button
                onClick={handleGenerateCTAs}
                disabled={isLoadingCTAs || !ctaPromoting.trim() || !ctaGoalType}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingCTAs ? <LoadingSpinner size="sm" /> : <Target className="w-4 h-4" />}
                <span>{isLoadingCTAs ? 'Generating (10-15 sec)...' : 'Generate CTAs'}</span>
              </button>

              {/* Results — Styled CTAs */}
              {styledCTAs?.ctas && (
                <div className="pt-4 border-t border-gray-100">
                  <AIDisclaimerFooter phraseIndex={3} className="mb-3" onModalOpen={() => setShowHowWePredictModal(true)} />
                  
                  {/* Platform tip */}
                  {styledCTAs.platformTip && (
                    <div className="text-xs text-huttle-primary bg-huttle-primary/5 border border-huttle-primary/10 px-3 py-2 rounded-lg mb-3 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{styledCTAs.platformTip}</span>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {styledCTAs.ctas.map((item, i) => {
                      const styleColors = {
                        'Direct': 'bg-blue-50 border-blue-200 text-blue-700',
                        'Soft': 'bg-green-50 border-green-200 text-green-700',
                        'Urgency': 'bg-red-50 border-red-200 text-red-700',
                        'Question': 'bg-purple-50 border-purple-200 text-purple-700',
                        'Story': 'bg-amber-50 border-amber-200 text-amber-700'
                      };
                      return (
                        <div key={i} className="p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-100 group hover:border-huttle-primary/30 transition-all">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${styleColors[item.style] || 'bg-gray-100 border-gray-200 text-gray-600'}`}>
                              {item.style}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800 font-medium mb-2">{item.cta}</p>
                          {item.tip && (
                            <p className="text-xs text-gray-500 mb-3 italic">{item.tip}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button onClick={() => handleCopy(item.cta, `cta-${i}`)} className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 hover:border-huttle-primary/50 rounded text-xs font-medium transition-all">
                              {copiedIndex === `cta-${i}` ? <><Check className="w-3 h-3 text-green-600" /><span className="text-green-600">Copied</span></> : <><Copy className="w-3 h-3 text-gray-600" /><span>Copy</span></>}
                            </button>
                            <button onClick={() => handleAddToLibrary(item.cta, 'cta', { input: ctaPromoting, platform: ctaPlatform, style: item.style }, `cta-${i}`)} className="flex items-center gap-1 px-2.5 py-1.5 bg-huttle-primary/10 text-huttle-primary hover:bg-huttle-primary/20 rounded text-xs font-medium transition-all">
                              {savedIndex === `cta-${i}` ? <><Check className="w-3 h-3 text-green-600" /><span className="text-green-600">Saved!</span></> : <><FolderPlus className="w-3 h-3" /><span>Save</span></>}
                            </button>
                            <button onClick={() => handleScheduleContent(item.cta, `cta-${i}`)} className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 hover:border-huttle-primary/50 rounded text-xs font-medium transition-all">
                              {scheduledIndex === `cta-${i}` ? <><Check className="w-3 h-3 text-green-600" /><span className="text-green-600">Added!</span></> : <><ArrowRight className="w-3 h-3 text-gray-600" /><span>Use in Post</span></>}
                            </button>
                          </div>
                        </div>
                      );
                    })}
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

        {/* Visual Brainstormer — Redesigned */}
        {activeTool === 'visual-brainstorm' && (
          <div>
            <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100 bg-huttle-cyan-light/30">
              <h2 className="font-display font-bold text-gray-900 flex items-center gap-2.5 md:gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-huttle-primary flex items-center justify-center shadow-lg shadow-huttle-blue/20">
                  <ImageIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <span className="text-base md:text-lg">Visual Brainstormer</span>
              </h2>
              <p className="text-xs md:text-sm text-gray-500 mt-2 ml-0 md:ml-[52px]">Get AI image prompts or a manual shoot guide for your content</p>
            </div>

            <div className="p-4 md:p-5 space-y-4">
              {/* Step 1: Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">What's your content about?</label>
                <textarea
                  value={visualPrompt}
                  onChange={(e) => setVisualPrompt(e.target.value)}
                  placeholder="e.g., Sunset yoga on the beach, Coffee shop morning routine, Behind-the-scenes at a photoshoot"
                  className="w-full p-3 border border-gray-200 rounded-lg resize-none h-20 focus:ring-2 focus:ring-huttle-primary/20 focus:border-huttle-primary outline-none text-sm"
                />
              </div>

              {/* Platform Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Platform</label>
                <PlatformSelector
                  value={visualPlatform}
                  onChange={setVisualPlatform}
                  contentType="visual"
                  showTips={true}
                />
              </div>

              {/* Content Format */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Content Format</label>
                <div className="flex flex-wrap gap-2">
                  {['Image', 'Carousel', 'Video', 'Story', 'Reel'].map((format) => (
                    <button
                      key={format}
                      onClick={() => setVisualContentFormat(format)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                        visualContentFormat === format
                          ? 'bg-huttle-primary text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Output Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Choose Output Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setVisualOutputType('ai-prompt')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      visualOutputType === 'ai-prompt'
                        ? 'border-huttle-primary bg-cyan-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Bot className="w-5 h-5 text-huttle-primary" />
                      <span className="font-semibold text-gray-900 text-sm">AI Image Prompt</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">Get detailed prompts for Midjourney, DALL-E, or any AI image generator</p>
                  </button>
                  <button
                    onClick={() => setVisualOutputType('shoot-guide')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      visualOutputType === 'shoot-guide'
                        ? 'border-huttle-primary bg-cyan-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Camera className="w-5 h-5 text-huttle-primary" />
                      <span className="font-semibold text-gray-900 text-sm">Manual Shoot Guide</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">Get a creative brief for shooting it yourself: angles, lighting, composition, props, mood</p>
                  </button>
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
              </div>

              <button
                onClick={handleGenerateVisualBrainstorm}
                disabled={isLoadingVisualIdeas || !visualPrompt.trim() || !visualOutputType}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingVisualIdeas ? <LoadingSpinner size="sm" /> : <Lightbulb className="w-4 h-4" />}
                <span>{isLoadingVisualIdeas ? 'Generating (10-15 sec)...' : 'Generate'}</span>
              </button>

              {/* Results — AI Image Prompts */}
              {visualBrainstormResult?.type === 'ai-prompt' && visualBrainstormResult.prompts && (
                <div className="pt-4 border-t border-gray-100">
                  <AIDisclaimerFooter phraseIndex={0} className="mb-3" onModalOpen={() => setShowHowWePredictModal(true)} />
                  <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg mb-3 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-huttle-primary flex-shrink-0" />
                    Copy these prompts directly into Midjourney, DALL-E, or any AI image generator.
                  </p>
                  <div className="space-y-3">
                    {visualBrainstormResult.prompts.map((prompt, i) => (
                      <div key={i} className="p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-huttle-primary/30 transition-all">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-xs font-bold text-huttle-primary bg-huttle-primary/10 px-2 py-0.5 rounded">Prompt {i + 1}</span>
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed mb-3">{prompt}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button onClick={() => handleCopy(prompt, `vb-prompt-${i}`)} className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 hover:border-huttle-primary/50 rounded text-xs font-medium transition-all">
                            {copiedIndex === `vb-prompt-${i}` ? <><Check className="w-3 h-3 text-green-600" /><span className="text-green-600">Copied</span></> : <><Copy className="w-3 h-3 text-gray-600" /><span>Copy</span></>}
                          </button>
                          <button onClick={() => handleAddToLibrary(prompt, 'visual-prompt', { input: visualPrompt }, `vb-prompt-${i}`)} className="flex items-center gap-1 px-2.5 py-1.5 bg-huttle-primary/10 text-huttle-primary hover:bg-huttle-primary/20 rounded text-xs font-medium transition-all">
                            {savedIndex === `vb-prompt-${i}` ? <><Check className="w-3 h-3 text-green-600" /><span className="text-green-600">Added!</span></> : <><FolderPlus className="w-3 h-3" /><span>Save</span></>}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Results — Manual Shoot Guide */}
              {visualBrainstormResult?.type === 'shoot-guide' && visualBrainstormResult.guide && (
                <div className="pt-4 border-t border-gray-100">
                  <AIDisclaimerFooter phraseIndex={0} className="mb-3" onModalOpen={() => setShowHowWePredictModal(true)} />
                  <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg mb-3 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-huttle-primary flex-shrink-0" />
                    Your creative brief for shooting "{visualPrompt}"
                  </p>
                  <div className="space-y-3">
                    {/* Shot List */}
                    <div className="p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <h5 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded bg-huttle-primary/10 flex items-center justify-center text-huttle-primary text-xs font-bold">1</span>
                        Shot List
                      </h5>
                      <ul className="space-y-1.5">
                        {(visualBrainstormResult.guide.shotList || []).map((shot, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-huttle-primary mt-1.5 flex-shrink-0" />
                            {shot}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Lighting */}
                    <div className="p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <h5 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center text-amber-600 text-xs font-bold">2</span>
                        Lighting
                      </h5>
                      <p className="text-sm text-gray-700">{visualBrainstormResult.guide.lighting}</p>
                    </div>

                    {/* Composition */}
                    <div className="p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <h5 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold">3</span>
                        Composition
                      </h5>
                      <p className="text-sm text-gray-700">{visualBrainstormResult.guide.composition}</p>
                    </div>

                    {/* Props & Styling */}
                    <div className="p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <h5 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded bg-pink-100 flex items-center justify-center text-pink-600 text-xs font-bold">4</span>
                        Props & Styling
                      </h5>
                      <p className="text-sm text-gray-700">{visualBrainstormResult.guide.propsAndStyling}</p>
                    </div>

                    {/* Mood & Color Palette */}
                    <div className="p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <h5 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded bg-green-100 flex items-center justify-center text-green-600 text-xs font-bold">5</span>
                        Mood & Color Palette
                      </h5>
                      <p className="text-sm text-gray-700">{visualBrainstormResult.guide.moodAndPalette}</p>
                    </div>

                    {/* Platform Tips */}
                    <div className="p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <h5 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">6</span>
                        Platform Tips
                      </h5>
                      <p className="text-sm text-gray-700">{visualBrainstormResult.guide.platformTips}</p>
                    </div>

                    {/* Copy / Save actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <button
                        onClick={() => {
                          const guide = visualBrainstormResult.guide;
                          const text = `SHOOT GUIDE: ${visualPrompt}\n\nSHOT LIST:\n${(guide.shotList || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nLIGHTING:\n${guide.lighting}\n\nCOMPOSITION:\n${guide.composition}\n\nPROPS & STYLING:\n${guide.propsAndStyling}\n\nMOOD & COLOR PALETTE:\n${guide.moodAndPalette}\n\nPLATFORM TIPS:\n${guide.platformTips}`;
                          handleCopy(text, 'full-guide');
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:border-huttle-primary/50 rounded-lg text-xs font-medium transition-all"
                      >
                        {copiedIndex === 'full-guide' ? <><Check className="w-3.5 h-3.5 text-green-600" /><span className="text-green-600">Copied!</span></> : <><Copy className="w-3.5 h-3.5 text-gray-600" /><span>Copy Full Guide</span></>}
                      </button>
                      <button
                        onClick={() => {
                          const guide = visualBrainstormResult.guide;
                          const text = `SHOOT GUIDE: ${visualPrompt}\n\nSHOT LIST:\n${(guide.shotList || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nLIGHTING:\n${guide.lighting}\n\nCOMPOSITION:\n${guide.composition}\n\nPROPS & STYLING:\n${guide.propsAndStyling}\n\nMOOD & COLOR PALETTE:\n${guide.moodAndPalette}\n\nPLATFORM TIPS:\n${guide.platformTips}`;
                          handleAddToLibrary(text, 'shoot-guide', { input: visualPrompt }, 'full-guide-save');
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-huttle-primary/10 text-huttle-primary hover:bg-huttle-primary/20 rounded-lg text-xs font-medium transition-all"
                      >
                        {savedIndex === 'full-guide-save' ? <><Check className="w-3.5 h-3.5 text-green-600" /><span className="text-green-600">Saved!</span></> : <><FolderPlus className="w-3.5 h-3.5" /><span>Save to Library</span></>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* How We Predict Modal */}
      <HowWePredictModal isOpen={showHowWePredictModal} onClose={() => setShowHowWePredictModal(false)} />
    </div>
    </div>
  );
}
