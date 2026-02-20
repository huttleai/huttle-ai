import { useState, useContext } from 'react';
import { Repeat, FileText, ArrowRight, Wand2, Save, Calendar, Crown, Copy, Check, Sparkles, ChevronRight, Lightbulb, FolderPlus } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { BrandContext } from '../context/BrandContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useContent } from '../context/ContentContext';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { buildBrandContext, getBrandVoice, getNiche, getTargetAudience } from '../utils/brandContextBuilder';
import LoadingSpinner from '../components/LoadingSpinner';
import UpgradeModal from '../components/UpgradeModal';
const REPURPOSER_EXAMPLES = [
  {
    id: 'ex-001',
    originalContent: 'YouTube Video: "10 Tips for Growing Your Audience"',
    format: 'Video to Text',
    sourcePlatform: 'YouTube',
    targetPlatform: 'X (Twitter)',
    outputType: 'Thread (5 tweets)',
    repurposedContent: {
      content: '1/ Want to grow your audience faster? Here are 10 tips I\'ve learned from scaling multiple brands... 🧵👇',
      hashtags: '#AudienceGrowth #ContentStrategy #CreatorTips',
      hooks: ['Most creators fail at this one thing.', 'Your content isn\'t the problem — your strategy is.']
    }
  },
  {
    id: 'ex-002',
    originalContent: 'Instagram Post: "5 Productivity Hacks That Changed My Business"',
    format: 'Text to Video',
    sourcePlatform: 'Instagram',
    targetPlatform: 'TikTok',
    outputType: 'Video Script',
    repurposedContent: {
      content: '(Hook: Stop wasting time on busy work!) Here are 5 productivity hacks that actually move the needle for creators. Number 3 is a game-changer...',
      hashtags: '#ProductivityHacks #CreatorLife #WorkSmarter',
      hooks: ['You\'re wasting 3 hours a day. Here\'s the fix.', 'This one habit doubled my output.']
    }
  },
  {
    id: 'ex-003',
    originalContent: 'Blog Post: "The Ultimate Guide to Content Repurposing"',
    format: 'Long-form to Carousel',
    sourcePlatform: 'Blog',
    targetPlatform: 'Instagram',
    outputType: 'Carousel (8 slides)',
    repurposedContent: {
      content: 'Slide 1: One piece of content can become 10. Here\'s how.\nSlide 2: Start with your best-performing content.\nSlide 3: Break it into platform-specific formats...',
      hashtags: '#ContentRepurposing #SocialMediaStrategy #CreatorEconomy',
      hooks: ['Stop creating from scratch every time.', 'Work smarter, not harder with your content.']
    }
  }
];
import { saveContentLibraryItem, supabase } from '../config/supabase';

const FORMAT_OPTIONS = [
  { from: 'script', to: 'story', label: 'Script → Story Board', description: 'Outline story beats from your video script', icon: '📋' },
  { from: 'script', to: 'thread', label: 'Script → Thread', description: 'Turn your video script into a viral text thread', icon: '📄' },
  { from: 'story', to: 'reel', label: 'Story → Reel', description: 'Expand story into full reel', icon: '📱' },
  { from: 'post', to: 'carousel', label: 'Post → Carousel', description: 'Split into carousel slides', icon: '🎠' },
  { from: 'longform', to: 'shorts', label: 'Long-form → Shorts', description: 'Extract key moments as shorts', icon: '✂️' },
  { from: 'thread', to: 'post', label: 'Thread → Post', description: 'Combine thread into single post', icon: '📝' },
  { from: 'transcript', to: 'captions', label: 'Transcript → Captions', description: 'Format raw transcript into social captions', icon: '📝' }
];

const PLATFORM_OPTIMIZATIONS = [
  { value: 'instagram', label: 'Instagram', maxLength: 2200, tone: 'visual-first', hashtags: 30 },
  { value: 'tiktok', label: 'TikTok', maxLength: 300, tone: 'casual-trendy', hashtags: 5 },
  { value: 'twitter', label: 'X (Twitter)', maxLength: 280, tone: 'concise', hashtags: 3 },
  { value: 'facebook', label: 'Facebook', maxLength: 5000, tone: 'conversational', hashtags: 5 },
  { value: 'youtube', label: 'YouTube', maxLength: 5000, tone: 'informative', hashtags: 15 }
];

export default function ContentRepurposer() {
  const { addToast } = useToast();
  const { brandData } = useContext(BrandContext);
  const { user } = useContext(AuthContext);
  const { userTier } = useSubscription();
  const { saveGeneratedContent, setDraft } = useContent();
  const navigate = useNavigate();

  const [originalContent, setOriginalContent] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [targetPlatform, setTargetPlatform] = useState('instagram');
  const [repurposedContent, setRepurposedContent] = useState(null);
  const [isRepurposing, setIsRepurposing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  const isPro = userTier === 'Pro' || userTier === 'pro';

  const handleRepurpose = async () => {
    if (!isPro) {
      setShowUpgradeModal(true);
      return;
    }

    if (!originalContent.trim()) {
      addToast('Please enter or upload your original content', 'warning');
      return;
    }

    if (!selectedFormat) {
      addToast('Please select a format conversion', 'warning');
      return;
    }

    setIsRepurposing(true);

    try {
      // SECURITY: Use server-side proxy instead of exposing API key
      const GROK_PROXY_URL = '/api/ai/grok';

      const formatOption = FORMAT_OPTIONS.find(f => `${f.from}-${f.to}` === selectedFormat);
      const platformOpt = PLATFORM_OPTIMIZATIONS.find(p => p.value === targetPlatform);

      const brandContext = buildBrandContext(brandData);
      const brandVoice = getBrandVoice(brandData);
      const niche = getNiche(brandData);
      const audience = getTargetAudience(brandData);

      // Get auth headers
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(GROK_PROXY_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'grok-4-1-fast-reasoning',
          messages: [
            {
              role: 'system',
              content: `You are a content repurposing expert. Transform content between formats while maintaining core message and optimizing for specific platforms.

BRAND PROFILE:
${brandContext}

IMPORTANT: All repurposed content must match the brand voice and appeal to the target audience. Maintain brand consistency across all formats.`
            },
            {
              role: 'user',
              content: `Repurpose this content from ${formatOption.from} to ${formatOption.to} format, optimized for ${platformOpt.label}:

ORIGINAL CONTENT:
${originalContent}

REQUIREMENTS:
- Format: ${formatOption.to}
- Platform: ${platformOpt.label}
- Max length: ${platformOpt.maxLength} characters
- Platform tone: ${platformOpt.tone}
- Brand Voice: ${brandVoice} (MUST match this voice)
- Niche: ${niche}
- Target audience: ${audience}
- Include ${platformOpt.hashtags} relevant hashtags

Provide the repurposed content with:
1. Main content/caption (matching the brand voice)
2. Suggested hashtags (relevant to niche and audience)
3. Platform-specific tips
4. Engagement hooks (that resonate with target audience)

Format as JSON with fields: content, hashtags, tips, hooks`
            }
          ],
          temperature: 0.7,
        })
      });

      const data = await response.json();
      // SECURITY: Updated to use proxy response format
      const content = data.content || data.choices?.[0]?.message?.content || '';

      let result;
      try {
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          result = JSON.parse(content);
        }
      } catch {
        result = {
          content: content.substring(0, platformOpt.maxLength),
          hashtags: '#content #repurposed #socialmedia',
          tips: ['Post during peak engagement times', 'Add eye-catching visuals', 'Engage with comments quickly'],
          hooks: ['Attention-grabbing opening', 'Ask a question', 'Share surprising fact']
        };
      }

      setRepurposedContent({
        ...result,
        original: originalContent,
        format: formatOption,
        platform: platformOpt
      });

      addToast('Content repurposed successfully! 🎉', 'success');

    } catch (error) {
      console.error('Repurposing error:', error);
      addToast('Failed to repurpose content. Please try again.', 'error');
    } finally {
      setIsRepurposing(false);
    }
  };

  const handleCopy = async () => {
    if (!repurposedContent) return;

    try {
      const textToCopy = `${repurposedContent.content}\n\n${repurposedContent.hashtags}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      addToast('Copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('Failed to copy', 'error');
    }
  };

  const handleSave = async () => {
    if (!repurposedContent) return;

    if (!user?.id) {
      addToast('Please log in to save content to library', 'error');
      return;
    }

    try {
      const name = `Repurposed ${repurposedContent.format.to} - ${repurposedContent.platform.label}`;
      const fullContent = `${repurposedContent.content}\n\n${repurposedContent.hashtags || ''}`;

      const itemData = {
        name,
        type: 'text',
        content: fullContent,
        size_bytes: 0,
        description: `Repurposed from ${repurposedContent.format.from} to ${repurposedContent.format.to} for ${repurposedContent.platform.label}`,
      };

      const result = await saveContentLibraryItem(user.id, itemData);

      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        addToast('Saved to Content Library!', 'success');
      } else {
        addToast('Failed to save to library', 'error');
        console.error('Error saving to library:', result.error);
      }
    } catch (error) {
      console.error('Error saving to library:', error);
      addToast('Error saving to library', 'error');
    }
  };

  const handleSchedule = () => {
    if (!repurposedContent) return;

    setDraft({
      content: repurposedContent.content,
      hashtags: repurposedContent.hashtags,
      platform: repurposedContent.platform.value,
      source: 'content-repurposer',
      timestamp: new Date().toISOString()
    });

    setScheduled(true);
    setTimeout(() => setScheduled(false), 2000);
    addToast('Navigating to calendar...', 'info');
    setTimeout(() => navigate('/dashboard/calendar'), 500);
  };

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-24 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
            <Repeat className="w-6 h-6 md:w-7 md:h-7 text-huttle-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">
                Content Repurposer
              </h1>
              <span className="flex items-center gap-1 bg-huttle-primary/10 text-huttle-primary px-2 py-0.5 rounded-full text-xs font-bold">
                <Crown className="w-3 h-3" />
                PRO
              </span>
            </div>
            <p className="text-sm md:text-base text-gray-500">
              Transform your content across formats and platforms
            </p>
          </div>
        </div>
      </div>

      {/* Pro Upgrade Banner (only for non-Pro users) */}
      {!isPro && (
        <div className="mb-6 bg-gradient-to-r from-huttle-primary/5 to-huttle-primary-light/5 border border-huttle-primary/20 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-huttle-primary/10 flex items-center justify-center flex-shrink-0">
              <Crown className="w-6 h-6 text-huttle-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">
                Unlock Content Repurposer
              </p>
              <p className="text-sm text-gray-600">
                Save hours by automatically adapting your content for different platforms and formats.
              </p>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-4 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all font-medium text-sm whitespace-nowrap"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column - Input */}
        <div className="space-y-6">
          
          {/* Original Content Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-huttle-primary/10 flex items-center justify-center text-xs font-bold text-huttle-primary">1</span>
                Paste Your Content
              </h2>
            </div>
            <div className="p-5">
              <textarea
                value={originalContent}
                onChange={(e) => setOriginalContent(e.target.value)}
                placeholder="Paste your post, caption, script, or any content you want to repurpose..."
                className="w-full p-4 border border-gray-200 rounded-lg resize-none h-48 focus:ring-2 focus:ring-huttle-primary/20 focus:border-huttle-primary outline-none text-sm transition-all"
                disabled={!isPro}
              />
              <p className="text-xs text-gray-500 mt-2">
                {originalContent.length} characters
              </p>
            </div>
          </div>

          {/* Format Selection Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-huttle-primary/10 flex items-center justify-center text-xs font-bold text-huttle-primary">2</span>
                Choose Format Conversion
              </h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FORMAT_OPTIONS.map((option) => {
                  const isSelected = selectedFormat === `${option.from}-${option.to}`;
                  return (
                    <button
                      key={`${option.from}-${option.to}`}
                      onClick={() => setSelectedFormat(`${option.from}-${option.to}`)}
                      disabled={!isPro}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-huttle-primary bg-huttle-primary/5'
                          : 'border-gray-100 hover:border-gray-200'
                      } ${!isPro ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{option.icon}</span>
                        <span className={`text-sm font-medium ${isSelected ? 'text-huttle-primary' : 'text-gray-900'}`}>
                          {option.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 pl-7">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Platform Selection Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-huttle-primary/10 flex items-center justify-center text-xs font-bold text-huttle-primary">3</span>
                Select Target Platform
              </h2>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap gap-2">
                {PLATFORM_OPTIMIZATIONS.map((platform) => (
                  <button
                    key={platform.value}
                    onClick={() => setTargetPlatform(platform.value)}
                    disabled={!isPro}
                    className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
                      targetPlatform === platform.value
                        ? 'border-huttle-primary bg-huttle-primary text-white'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    } ${!isPro ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {platform.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Repurpose Button */}
          <button
            onClick={handleRepurpose}
            disabled={isRepurposing || !isPro}
            className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold transition-all ${
              isPro && !isRepurposing
                ? 'bg-huttle-primary text-white hover:bg-huttle-primary-dark hover:shadow-lg hover:shadow-huttle-primary/20'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isRepurposing ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Repurposing...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                <span>Repurpose Content</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Right Column - Output */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-huttle-primary" />
              Repurposed Content
            </h2>
            {repurposedContent && (
              <div className="flex items-center gap-1 text-xs">
                <span className="bg-huttle-primary/10 text-huttle-primary px-2 py-1 rounded font-medium">
                  {repurposedContent.format.label}
                </span>
                <ArrowRight className="w-3 h-3 text-gray-400" />
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
                  {repurposedContent.platform.label}
                </span>
              </div>
            )}
          </div>

          {repurposedContent ? (
            <div className="p-5 space-y-5">
              {/* Main Content */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Optimized Content
                </label>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {repurposedContent.content}
                  </p>
                </div>
              </div>

              {/* Hashtags */}
              {repurposedContent.hashtags && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Hashtags
                  </label>
                  <div className="p-3 bg-huttle-primary/5 rounded-lg border border-huttle-primary/10">
                    <p className="text-sm text-huttle-primary-dark font-medium">
                      {repurposedContent.hashtags}
                    </p>
                  </div>
                </div>
              )}

              {/* Platform Tips */}
              {repurposedContent.tips && repurposedContent.tips.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Platform Tips
                  </label>
                  <ul className="space-y-2">
                    {repurposedContent.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-huttle-primary mt-1.5 flex-shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Engagement Hooks */}
              {repurposedContent.hooks && repurposedContent.hooks.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Engagement Hooks
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {repurposedContent.hooks.map((hook, i) => (
                      <span 
                        key={i} 
                        className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full"
                      >
                        {hook}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-huttle-primary/10 text-huttle-primary hover:bg-huttle-primary/20 rounded-lg transition-colors text-sm font-medium"
                >
                  {saved ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">Added!</span>
                    </>
                  ) : (
                    <>
                      <FolderPlus className="w-4 h-4" />
                      <span>Add to Library</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleSchedule}
                  className="flex items-center gap-2 px-4 py-2 bg-huttle-primary text-white hover:bg-huttle-primary-dark rounded-lg transition-colors text-sm font-medium"
                >
                  {scheduled ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Scheduled!</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      <span>Schedule</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[500px] text-center p-8">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ready to Repurpose
              </h3>
              <p className="text-sm text-gray-500 max-w-xs">
                Paste your content, select a format conversion, and click "Repurpose Content" to see the AI-optimized version here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Example Transformations */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Example Transformations</h2>
            <p className="text-xs text-gray-500">See how content gets repurposed across platforms</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {REPURPOSER_EXAMPLES.map((example) => (
            <div 
              key={example.id}
              className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
            >
              {/* Source */}
              <div className="mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Source</span>
                <p className="text-sm font-medium text-gray-900 mt-1">{example.originalContent}</p>
              </div>
              
              {/* Arrow */}
              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-huttle-primary/30 to-transparent" />
                <ArrowRight className="w-4 h-4 text-huttle-primary" />
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-huttle-primary/30 to-transparent" />
              </div>
              
              {/* Output */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Output</span>
                  <span className="text-[10px] font-semibold text-huttle-primary bg-huttle-primary/10 px-2 py-0.5 rounded-full">
                    {example.targetPlatform}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700">{example.outputType}</p>
              </div>
              
              {/* Preview */}
              <div className="p-3 bg-white rounded-lg border border-gray-100">
                <p className="text-xs text-gray-600 line-clamp-3">{example.repurposedContent.content}</p>
                <p className="text-[10px] text-huttle-primary mt-2">{example.repurposedContent.hashtags}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          feature="Content Repurposer"
        />
      )}
    </div>
  );
}
