import { useState, useContext, useEffect } from 'react';
import { Shuffle, Sparkles, ArrowRight, Copy, Check, Flame, DollarSign, Save, RefreshCw, Zap, AlertTriangle } from 'lucide-react';
import { BrandContext } from '../context/BrandContext';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { generateWithN8n } from '../services/n8nGeneratorAPI';
import { remixContentWithMode } from '../services/grokAPI';
import { getBrandVoice, getNiche, getTargetAudience } from '../utils/brandContextBuilder';
import LoadingSpinner from '../components/LoadingSpinner';
import RemixContentDisplay from '../components/RemixContentDisplay';
import { getToastDisclaimer } from '../components/AIDisclaimer';

/**
 * Content Remix Studio - Dedicated Page
 * 
 * Transform existing content into fresh posts for every platform.
 * Uses n8n webhook for AI-powered content remixing with two modes:
 * - Viral Reach: Optimized for engagement, shares, and maximum reach
 * - Sales Conversion: Optimized for conversions using PAS framework with CTAs
 */
export default function ContentRemix() {
  const { brandData } = useContext(BrandContext);
  const { user } = useContext(AuthContext);
  const { addToast: showToast } = useToast();
  
  // State
  const [remixInput, setRemixInput] = useState('');
  const [remixOutput, setRemixOutput] = useState(null);
  const [remixMode, setRemixMode] = useState('viral'); // 'viral' or 'sales'
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdea, setCopiedIdea] = useState(null);
  const [remixError, setRemixError] = useState(null);

  // Check for content passed from Trend Lab via sessionStorage
  useEffect(() => {
    const storedContent = sessionStorage.getItem('remixContent');
    if (storedContent) {
      setRemixInput(storedContent);
      sessionStorage.removeItem('remixContent');
    }
  }, []);

  /**
   * Handle content remixing via n8n webhook
   */
  const handleRemixContent = async () => {
    if (!remixInput.trim()) {
      showToast('Please enter content or a URL to remix', 'warning');
      return;
    }

    if (!user?.id) {
      showToast('Please log in to use remix features', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const result = await generateWithN8n({
        userId: user.id,
        topic: remixInput,
        platform: 'multi-platform',
        contentType: 'remix',
        brandVoice: getBrandVoice(brandData),
        remixMode: remixMode,
        additionalContext: {
          mode: remixMode,
          niche: getNiche(brandData),
          targetAudience: getTargetAudience(brandData),
          ...brandData
        }
      });

      if (result.success && result.content) {
        setRemixOutput(result.content);
        setRemixError(null);
        const modeLabel = remixMode === 'sales' ? 'Sales conversion' : 'Viral reach';
        showToast(`Content remixed for ${modeLabel}! ${getToastDisclaimer('remix')}`, 'success');
      } else {
        // n8n failed - try Grok API fallback
        console.warn('n8n remix failed, falling back to Grok API:', result.error);
        const grokResult = await remixContentWithMode(remixInput, brandData, remixMode);
        if (grokResult.success && grokResult.remixed) {
          setRemixOutput(grokResult.remixed);
          setRemixError(null);
          const modeLabel = remixMode === 'sales' ? 'Sales conversion' : 'Viral reach';
          showToast(`Content remixed for ${modeLabel}! ${getToastDisclaimer('remix')}`, 'success');
        } else {
          let errorMessage = 'Failed to remix content';
          if (result.errorType === 'TIMEOUT') {
            errorMessage = 'AI generation took too long. Please try again with shorter content.';
          } else if (result.errorType === 'NETWORK') {
            errorMessage = 'Connection failed. Please check your internet.';
          } else if (result.error) {
            errorMessage = result.error;
          }
          setRemixError(errorMessage);
          showToast(errorMessage, 'error');
        }
      }
    } catch (error) {
      console.error('Error remixing content:', error);
      // Final fallback to Grok API
      try {
        const grokResult = await remixContentWithMode(remixInput, brandData, remixMode);
        if (grokResult.success && grokResult.remixed) {
          setRemixOutput(grokResult.remixed);
          setRemixError(null);
          showToast(`Content remixed! ${getToastDisclaimer('remix')}`, 'success');
          return;
        }
      } catch (grokError) {
        console.error('Grok fallback also failed:', grokError);
      }
      setRemixError('Error remixing content. Please try again.');
      showToast('Error remixing content. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyIdea = (idea, index) => {
    navigator.clipboard.writeText(idea);
    setCopiedIdea(index);
    showToast(`Content copied! ${getToastDisclaimer('general')}`, 'success');
    setTimeout(() => setCopiedIdea(null), 2000);
  };

  const handleClearAndRemix = () => {
    setRemixInput('');
    setRemixOutput(null);
  };

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-24 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 pointer-events-none pattern-mesh opacity-30 z-0" />
      
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
              <Shuffle className="w-6 h-6 md:w-7 md:h-7 text-huttle-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">
                Content Remix Studio
              </h1>
              <p className="text-sm md:text-base text-gray-500">
                Transform your existing content into fresh posts for every platform
              </p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm">
              <Zap className="w-4 h-4 text-huttle-primary" />
              <span className="text-sm text-gray-600">Powered by AI</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm">
              <RefreshCw className="w-4 h-4 text-huttle-primary" />
              <span className="text-sm text-gray-600">Multi-Platform Output</span>
            </div>
          </div>
        </div>

        {/* Main Content - 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Input Section */}
          <div className="space-y-6">
            {/* Input Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-huttle-primary/10 flex items-center justify-center text-sm font-bold text-huttle-primary">1</span>
                Paste Your Content
              </h2>
              
              <textarea
                placeholder="Paste a URL, article, tweet, or any content you want to remix..."
                value={remixInput}
                onChange={(e) => setRemixInput(e.target.value)}
                className="w-full h-40 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-huttle-primary/30 focus:border-huttle-primary transition-all outline-none text-gray-800 placeholder-gray-400 resize-none"
              />
              
              <p className="text-xs text-gray-500 mt-2">
                Tip: Works best with blog posts, tweets, competitor content, or trending topics
              </p>
            </div>

            {/* Remix Mode Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-huttle-primary/10 flex items-center justify-center text-sm font-bold text-huttle-primary">2</span>
                Select Remix Mode
              </h2>
              
              <div className="relative inline-grid grid-cols-2 p-1 bg-gray-100 rounded-xl border border-gray-200 w-full">
                {/* Sliding Background */}
                <div 
                  className={`absolute top-1 bottom-1 bg-white rounded-lg shadow-sm transition-all duration-300 ease-out ${
                    remixMode === 'sales' 
                      ? 'left-[calc(50%+2px)] right-1' 
                      : 'left-1 right-[calc(50%+2px)]'
                  }`}
                />
                
                <button
                  onClick={() => setRemixMode('viral')}
                  className={`relative z-10 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-300 ${
                    remixMode === 'viral'
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Flame className={`w-5 h-5 transition-all duration-300 ${remixMode === 'viral' ? 'text-orange-500' : ''}`} />
                  <span>Viral Reach</span>
                </button>
                
                <button
                  onClick={() => setRemixMode('sales')}
                  className={`relative z-10 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-300 ${
                    remixMode === 'sales'
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <DollarSign className={`w-5 h-5 transition-all duration-300 ${remixMode === 'sales' ? 'text-green-600' : ''}`} />
                  <span>Sales Conversion</span>
                </button>
              </div>
              
              <p className="text-xs text-gray-500 mt-3">
                {remixMode === 'viral' 
                  ? '🔥 Optimized for engagement, shares, and maximum reach' 
                  : '💰 Optimized for conversions using PAS framework with CTAs'}
              </p>
            </div>

            {/* Remix Button */}
            <button
              onClick={handleRemixContent}
              disabled={isLoading || !remixInput.trim()}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-huttle-primary text-white rounded-xl hover:bg-huttle-primary-dark transition-all text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Remixing Content (10-15 sec)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Remix Content</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Brand Context Info */}
            {brandData?.niche && (
              <div className="bg-huttle-50 rounded-xl border border-huttle-100 p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Your Brand Context</h3>
                <div className="space-y-1 text-xs text-gray-600">
                  <p><span className="text-gray-500">Niche:</span> {brandData.niche}</p>
                  {brandData.targetAudience && (
                    <p><span className="text-gray-500">Audience:</span> {brandData.targetAudience}</p>
                  )}
                  {brandData.brandVoice && (
                    <p><span className="text-gray-500">Voice:</span> {brandData.brandVoice}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Output Section */}
          <div className="space-y-6">
            {/* Output Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6 min-h-[500px]">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-huttle-primary/10 flex items-center justify-center text-sm font-bold text-huttle-primary">3</span>
                Remixed Output
              </h2>
              
              {!remixOutput && !isLoading && !remixError && (
                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <Shuffle className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-600 mb-2">Ready to Remix</h3>
                  <p className="text-sm text-gray-500 max-w-sm">
                    Paste your content on the left, select a remix mode, and click "Remix Content" to generate fresh variations for every platform.
                  </p>
                </div>
              )}
              
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                  <div className="w-20 h-20 rounded-2xl bg-huttle-50 flex items-center justify-center mb-4 animate-pulse">
                    <Sparkles className="w-10 h-10 text-huttle-primary" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Remixing Your Content...</h3>
                  <p className="text-sm text-gray-500 max-w-sm">
                    Our AI is analyzing your content and creating platform-optimized variations. This usually takes 10-15 seconds.
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-huttle-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-huttle-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-huttle-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              
              {remixError && !isLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                    <AlertTriangle className="w-7 h-7 text-red-400" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Something went wrong</h3>
                  <p className="text-sm text-gray-500 mb-4 max-w-sm">{remixError}</p>
                  <button
                    onClick={() => { setRemixError(null); handleRemixContent(); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                </div>
              )}

              {remixOutput && !isLoading && (
                <div className="remix-output-container">
                  <RemixContentDisplay 
                    content={remixOutput}
                    onCopy={(idea, index) => handleCopyIdea(idea, `remix-${index}`)}
                    copiedIdea={copiedIdea}
                    onClearAndRemix={handleClearAndRemix}
                  />
                </div>
              )}
            </div>

            {/* Quick Actions */}
            {remixOutput && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigator.clipboard.writeText(remixOutput)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium border border-gray-200 shadow-sm"
                >
                  <Copy className="w-4 h-4" />
                  Copy All
                </button>
                <button
                  onClick={handleClearAndRemix}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium border border-gray-200 shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Remix Again
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2.5 bg-huttle-50 text-huttle-primary rounded-xl hover:bg-huttle-100 transition-all text-sm font-medium border border-huttle-200"
                >
                  <Save className="w-4 h-4" />
                  Save to Library
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pro Tips Section */}
        <div className="mt-8 card p-6 bg-gradient-to-r from-huttle-50 to-cyan-50 border-huttle-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-huttle-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-huttle-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-gray-900 mb-1">Pro Tips for Better Remixes</h3>
              <ul className="text-sm text-gray-600 space-y-1.5">
                <li>• <span className="font-medium text-gray-700">Viral Mode</span> works best for awareness content, memes, and trending topics</li>
                <li>• <span className="font-medium text-gray-700">Sales Mode</span> is perfect for product launches, promotions, and lead generation</li>
                <li>• Include URLs to automatically extract and remix article content</li>
                <li>• The more context in your input, the better the remixed output</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
