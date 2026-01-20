import { useState, useCallback } from 'react';
import { Sparkles, RefreshCw, Copy, Check, Wand2 } from 'lucide-react';
import { generateCaption } from '../services/grokAPI';

// Sample topics to generate previews about
const SAMPLE_TOPICS = [
  'morning routine tips',
  'productivity hacks',
  'behind the scenes',
  'quick tip of the day',
  'motivation Monday',
  'weekend vibes',
  'new discovery to share',
  'honest thoughts'
];

/**
 * AI Voice Preview Component
 * Shows a live preview of how AI will write content based on the user's profile
 */
export default function AIVoicePreview({ brandData, isCreator }) {
  const [preview, setPreview] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Check if there's enough profile data to generate a preview
  const hasEnoughData = brandData?.brandName || brandData?.niche || brandData?.brandVoice;

  // Generate a sample caption
  const generatePreview = useCallback(async () => {
    if (!hasEnoughData) return;
    
    setIsGenerating(true);
    
    try {
      // Pick a random topic
      const topic = SAMPLE_TOPICS[Math.floor(Math.random() * SAMPLE_TOPICS.length)];
      
      // Add profile type context to the brand data
      const enhancedBrandData = {
        ...brandData,
        isCreator,
        profileContext: isCreator 
          ? `This is for a solo creator/influencer named ${brandData.brandName || 'the creator'}. Write in first person, authentic and personal.`
          : `This is for a brand called ${brandData.brandName || 'the brand'}. Maintain professional brand voice.`
      };
      
      const result = await generateCaption(
        { topic, platform: 'Instagram' },
        enhancedBrandData
      );

      if (result.success && result.caption) {
        // Clean up the caption - take first one if multiple were generated
        let caption = result.caption;
        
        // If it looks like multiple captions were generated, take just the first
        const captions = caption.split(/\d+\./).filter(c => c.trim());
        if (captions.length > 1) {
          caption = captions[0].trim();
        }
        
        // Limit length for preview
        if (caption.length > 350) {
          caption = caption.substring(0, 347) + '...';
        }
        
        setPreview(caption.trim());
        setHasGenerated(true);
      } else {
        // Use a smart fallback based on profile
        const fallbackCaption = generateFallbackCaption(brandData, isCreator);
        setPreview(fallbackCaption);
        setHasGenerated(true);
      }
    } catch (err) {
      console.error('Error generating preview:', err);
      // Use fallback on error
      const fallbackCaption = generateFallbackCaption(brandData, isCreator);
      setPreview(fallbackCaption);
      setHasGenerated(true);
    } finally {
      setIsGenerating(false);
    }
  }, [brandData, isCreator, hasEnoughData]);

  // Generate fallback caption based on profile
  const generateFallbackCaption = (data, forCreator) => {
    const name = data?.brandName || (forCreator ? 'friend' : 'team');
    const niche = data?.niche || 'content';
    
    if (forCreator) {
      const creatorCaptions = [
        `Hey everyone! 👋 Just wanted to share something that's been on my mind about ${niche}. Real talk - it's the small, consistent steps that make the biggest difference. What's one thing you're working on this week? Drop it below! 💭`,
        `POV: You finally figured out what works for YOU 🙌 Stop comparing your ${niche} journey to others. Your path is unique, and that's your superpower. Who needed to hear this today? ✨`,
        `Okay but can we talk about ${niche} for a sec? 👀 I've been experimenting with something new and the results are... *chef's kiss* Story time in the comments if you want the full breakdown! 🔥`
      ];
      return creatorCaptions[Math.floor(Math.random() * creatorCaptions.length)];
    } else {
      const brandCaptions = [
        `At ${name}, we believe in making ${niche} accessible to everyone. 🌟 Our mission goes beyond products - it's about transforming your experience. Ready to see the difference? Link in bio! ✨`,
        `Your ${niche} journey deserves the best support. That's why we're committed to excellence in everything we do. Join the ${name} community today and discover what makes us different. 💫`,
        `Behind every great result is a great process. At ${name}, we've refined our approach to ${niche} to deliver exactly what you need. Experience the ${name} difference! 🚀`
      ];
      return brandCaptions[Math.floor(Math.random() * brandCaptions.length)];
    }
  };

  // Handle copy
  const handleCopy = async () => {
    if (!preview) return;
    
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Don't show if no data
  if (!hasEnoughData && !hasGenerated) {
    return (
      <div className={`rounded-xl border-2 border-dashed p-6 transition-all ${
        isCreator ? 'border-huttle-200 bg-huttle-50/30' : 'border-huttle-primary/20 bg-huttle-50/30'
      }`}>
        <div className="text-center">
          <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3 ${
            isCreator ? 'bg-huttle-100' : 'bg-huttle-100'
          }`}>
            <Wand2 className={`w-6 h-6 ${isCreator ? 'text-huttle-primary' : 'text-huttle-primary'}`} />
          </div>
          <h4 className="font-semibold text-gray-900 mb-1">AI Voice Preview</h4>
          <p className="text-sm text-gray-500">
            Fill in your {isCreator ? 'name and content focus' : 'brand name and niche'} to see how AI will write for you
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      isCreator 
        ? 'border-huttle-200 bg-gradient-to-br from-huttle-50 to-cyan-50' 
        : 'border-huttle-primary/20 bg-gradient-to-br from-huttle-50 to-cyan-50'
    }`}>
      {/* Header */}
      <div className={`px-5 py-3 border-b flex items-center justify-between ${
        isCreator ? 'border-huttle-100 bg-white/50' : 'border-huttle-primary/10 bg-white/50'
      }`}>
        <div className="flex items-center gap-2">
          <Sparkles className={`w-4 h-4 ${isCreator ? 'text-huttle-primary' : 'text-huttle-primary'}`} />
          <h4 className="font-semibold text-gray-900 text-sm">AI Voice Preview</h4>
        </div>
        <div className="flex items-center gap-2">
          {preview && (
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-white/80 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-500" />
              )}
            </button>
          )}
          <button
            onClick={generatePreview}
            disabled={isGenerating}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-md ${
              isCreator
                ? 'bg-gradient-to-r from-huttle-blue via-huttle-500 to-huttle-600 text-white hover:from-huttle-500 hover:via-huttle-600 hover:to-huttle-700 hover:shadow-lg hover:shadow-huttle-500/30'
                : 'bg-gradient-to-r from-huttle-blue via-huttle-primary to-huttle-600 text-white hover:from-huttle-500 hover:via-huttle-600 hover:to-huttle-700 hover:shadow-lg hover:shadow-huttle-primary/30'
            } disabled:opacity-50`}
          >
            <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : hasGenerated ? 'Regenerate' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {!hasGenerated ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-3">
              Click "Generate" to see a sample of how AI will write for you
            </p>
            <button
              onClick={generatePreview}
              disabled={isGenerating}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md ${
                isCreator
                  ? 'bg-gradient-to-r from-huttle-blue via-huttle-500 to-huttle-600 text-white hover:from-huttle-500 hover:via-huttle-600 hover:to-huttle-700 hover:shadow-lg hover:shadow-huttle-500/30'
                  : 'bg-gradient-to-r from-huttle-blue via-huttle-primary to-huttle-600 text-white hover:from-huttle-500 hover:via-huttle-600 hover:to-huttle-700 hover:shadow-lg hover:shadow-huttle-primary/30'
              } disabled:opacity-50`}
            >
              <Wand2 className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
              {isGenerating ? 'Creating magic...' : 'See AI in action'}
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
              Here's how AI will write for you:
            </p>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              {isGenerating ? (
                <div className="flex items-center gap-3 text-gray-500">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
                  <span className="text-sm">Crafting your personalized preview...</span>
                </div>
              ) : (
                <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                  {preview}
                </p>
              )}
            </div>
            <p className="mt-3 text-xs text-gray-400 text-center">
              This preview adapts to your profile settings in real-time
            </p>
          </>
        )}
      </div>
    </div>
  );
}













