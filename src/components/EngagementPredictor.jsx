import { useState, useEffect, useContext, useCallback } from 'react';
import { Sparkles, TrendingUp, Target, MessageSquare, Hash, Zap, ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react';
import { BrandContext } from '../context/BrandContext';
import { scoreContentQuality } from '../services/grokAPI';

/**
 * EngagementPredictor - AI-powered content scoring component
 * 
 * Analyzes post content and provides real-time engagement predictions
 * with visual scoring gauges and actionable improvement suggestions.
 */
export default function EngagementPredictor({ 
  caption = '', 
  hashtags = '', 
  title = '',
  platforms = [],
  onScoreChange = null,
  compact = false,
  autoAnalyze = false
}) {
  const { brandData } = useContext(BrandContext);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [scores, setScores] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [lastAnalyzedContent, setLastAnalyzedContent] = useState('');

  // Combine content for analysis
  const fullContent = `${title}\n\n${caption}\n\n${hashtags}`.trim();
  const hasContent = caption.length > 10 || title.length > 3;

  // Parse AI response to extract scores
  const parseScores = useCallback((analysis) => {
    const scores = {
      overall: 0,
      hook: 0,
      cta: 0,
      hashtags: 0,
      brandVoice: 0
    };

    // Extract numerical scores from the analysis text
    const overallMatch = analysis.match(/(?:overall|total|engagement)[^\d]*(\d{1,3})/i);
    const hookMatch = analysis.match(/hook[^\d]*(\d{1,3})/i);
    const ctaMatch = analysis.match(/(?:cta|call.to.action)[^\d]*(\d{1,3})/i);
    const hashtagMatch = analysis.match(/hashtag[^\d]*(\d{1,3})/i);
    const brandMatch = analysis.match(/(?:brand|voice|alignment)[^\d]*(\d{1,3})/i);

    if (overallMatch) scores.overall = Math.min(100, parseInt(overallMatch[1]));
    if (hookMatch) scores.hook = Math.min(100, parseInt(hookMatch[1]));
    if (ctaMatch) scores.cta = Math.min(100, parseInt(ctaMatch[1]));
    if (hashtagMatch) scores.hashtags = Math.min(100, parseInt(hashtagMatch[1]));
    if (brandMatch) scores.brandVoice = Math.min(100, parseInt(brandMatch[1]));

    // Calculate overall if not found
    if (!overallMatch && (hookMatch || ctaMatch || hashtagMatch)) {
      const validScores = [scores.hook, scores.cta, scores.hashtags, scores.brandVoice].filter(s => s > 0);
      scores.overall = validScores.length > 0 
        ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
        : 50;
    }

    // Extract suggestions
    const suggestionMatches = analysis.match(/(?:suggestion|improve|tip|recommendation)[s]?[:\s]*([^\n]+)/gi) || [];
    const bulletMatches = analysis.match(/[-•]\s*([^\n]+)/g) || [];
    
    const allSuggestions = [...suggestionMatches, ...bulletMatches]
      .map(s => s.replace(/^[-•]\s*/, '').replace(/^(?:suggestion|improve|tip|recommendation)[s]?[:\s]*/i, '').trim())
      .filter(s => s.length > 10 && s.length < 200)
      .slice(0, 4);

    return { scores, suggestions: allSuggestions };
  }, []);

  // Analyze content
  const analyzeContent = useCallback(async () => {
    if (!hasContent || isAnalyzing) return;
    
    setIsAnalyzing(true);
    
    try {
      const result = await scoreContentQuality(fullContent, brandData);
      
      if (result.success && result.analysis) {
        const { scores: parsedScores, suggestions: parsedSuggestions } = parseScores(result.analysis);
        setScores(parsedScores);
        setSuggestions(parsedSuggestions);
        setLastAnalyzedContent(fullContent);
        
        if (onScoreChange) {
          onScoreChange(parsedScores.overall);
        }
      } else {
        // Fallback scores based on content analysis
        const fallbackScores = calculateFallbackScores(caption, hashtags, title);
        setScores(fallbackScores);
        setSuggestions([
          'Add a compelling hook at the beginning',
          'Include a clear call-to-action',
          'Use relevant hashtags for your niche'
        ]);
      }
    } catch (error) {
      console.error('Engagement analysis error:', error);
      const fallbackScores = calculateFallbackScores(caption, hashtags, title);
      setScores(fallbackScores);
    } finally {
      setIsAnalyzing(false);
    }
  }, [fullContent, hasContent, brandData, parseScores, onScoreChange, caption, hashtags, title, isAnalyzing]);

  // Calculate fallback scores without API
  const calculateFallbackScores = (caption, hashtags, title) => {
    let hook = 30;
    let cta = 30;
    let hashtagScore = 30;
    let brandVoice = 50;

    // Hook analysis
    if (caption.length > 0) {
      const firstLine = caption.split('\n')[0] || '';
      if (firstLine.includes('?')) hook += 20;
      if (firstLine.match(/^[A-Z]/)) hook += 10;
      if (firstLine.length > 10 && firstLine.length < 80) hook += 15;
      if (firstLine.match(/[!🔥💡✨🚀]/)) hook += 10;
    }

    // CTA analysis
    const ctaKeywords = ['comment', 'share', 'follow', 'click', 'link', 'dm', 'save', 'tag', 'check out', 'learn more'];
    if (ctaKeywords.some(kw => caption.toLowerCase().includes(kw))) cta += 30;
    if (caption.includes('?')) cta += 15;
    if (caption.match(/👇|⬇️|↓|below/i)) cta += 10;

    // Hashtag analysis
    const hashtagCount = (hashtags.match(/#/g) || []).length;
    if (hashtagCount >= 3 && hashtagCount <= 10) hashtagScore += 30;
    else if (hashtagCount > 0 && hashtagCount < 3) hashtagScore += 15;
    else if (hashtagCount > 10) hashtagScore += 10;
    if (hashtags.length > 20) hashtagScore += 15;

    // Brand voice (basic check)
    if (caption.length > 50) brandVoice += 20;
    if (title.length > 5) brandVoice += 10;

    const overall = Math.round((hook + cta + hashtagScore + brandVoice) / 4);

    return {
      overall: Math.min(100, overall),
      hook: Math.min(100, hook),
      cta: Math.min(100, cta),
      hashtags: Math.min(100, hashtagScore),
      brandVoice: Math.min(100, brandVoice)
    };
  };

  // Auto-analyze when content changes significantly
  useEffect(() => {
    if (autoAnalyze && hasContent && fullContent !== lastAnalyzedContent && fullContent.length > 20) {
      const debounceTimer = setTimeout(() => {
        analyzeContent();
      }, 2000);
      return () => clearTimeout(debounceTimer);
    }
  }, [autoAnalyze, hasContent, fullContent, lastAnalyzedContent, analyzeContent]);

  // Get color based on score
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-rose-500';
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-rose-500';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  // Score gauge component
  const ScoreGauge = ({ score, label, icon: Icon, size = 'md' }) => {
    const radius = size === 'lg' ? 45 : 30;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <div className={`flex flex-col items-center ${size === 'lg' ? 'gap-2' : 'gap-1'}`}>
        <div className={`relative ${size === 'lg' ? 'w-28 h-28' : 'w-16 h-16'}`}>
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={size === 'lg' ? 8 : 5}
              className="text-gray-200"
            />
            {/* Progress circle */}
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={size === 'lg' ? 8 : 5}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={`${getScoreColor(score)} transition-all duration-700 ease-out`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`${size === 'lg' ? 'text-2xl' : 'text-sm'} font-bold ${getScoreColor(score)}`}>
              {score}
            </span>
            {size === 'lg' && (
              <span className="text-xs text-gray-500">{getScoreLabel(score)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-center">
          {Icon && <Icon className={`${size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} text-gray-500`} />}
          <span className={`${size === 'lg' ? 'text-sm' : 'text-xs'} font-medium text-gray-700`}>{label}</span>
        </div>
      </div>
    );
  };

  if (!hasContent && !scores) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-huttle-primary to-huttle-primary-light">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-800">Engagement Predictor</span>
          {scores && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getScoreBgColor(scores.overall)} text-white`}>
              {scores.overall}/100
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin text-huttle-primary" />}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 animate-slideDown">
          {/* Analyze Button */}
          {!scores && (
            <button
              onClick={analyzeContent}
              disabled={!hasContent || isAnalyzing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-huttle-primary to-huttle-primary-light text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-huttle-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Analyze Engagement Potential
                </>
              )}
            </button>
          )}

          {/* Scores Display */}
          {scores && (
            <>
              {/* Main Score */}
              <div className="flex justify-center py-2">
                <ScoreGauge score={scores.overall} label="Overall Score" icon={TrendingUp} size="lg" />
              </div>

              {/* Breakdown Scores */}
              <div className="grid grid-cols-4 gap-2">
                <ScoreGauge score={scores.hook} label="Hook" icon={Target} />
                <ScoreGauge score={scores.cta} label="CTA" icon={MessageSquare} />
                <ScoreGauge score={scores.hashtags} label="Hashtags" icon={Hash} />
                <ScoreGauge score={scores.brandVoice} label="Brand" icon={Sparkles} />
              </div>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    Improvement Tips
                  </h4>
                  <ul className="space-y-1">
                    {suggestions.map((suggestion, idx) => (
                      <li key={idx} className="text-xs text-amber-700 flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Re-analyze Button */}
              <button
                onClick={analyzeContent}
                disabled={isAnalyzing}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-huttle-primary bg-huttle-primary/10 rounded-lg hover:bg-huttle-primary/20 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
              </button>
            </>
          )}

          {/* Empty State */}
          {!scores && !isAnalyzing && (
            <p className="text-center text-sm text-gray-500 py-2">
              Add more content to your post, then click analyze to see your engagement prediction score.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline score badge for use in post cards
 */
export function EngagementScoreBadge({ score }) {
  const getColor = (s) => {
    if (s >= 80) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s >= 60) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (s >= 40) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-rose-100 text-rose-700 border-rose-200';
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${getColor(score)}`}>
      <Zap className="w-3 h-3" />
      {score}
    </span>
  );
}

