import { useState, useContext, useEffect, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { BrandContext } from '../context/BrandContext';
import { AuthContext } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { Search, TrendingUp, Target, Check, Shuffle, Sparkles, Zap, Lock, Loader2, Radar, Activity, ExternalLink, ArrowUpRight, FolderPlus, AlertTriangle, RefreshCw, PenLine } from 'lucide-react';
import UpgradeModal from './UpgradeModal';
import { getAudienceInsights, scanTrendingTopics } from '../services/perplexityAPI';
import { getTrendDeepDive } from '../services/n8nWorkflowAPI';
import { useToast } from '../context/ToastContext';
import { getToastDisclaimer } from './AIDisclaimer';
import { supabase } from '../config/supabase';
import { saveToVault } from '../services/contentService';
import useAIUsage from '../hooks/useAIUsage';
import AIUsageMeter from './AIUsageMeter';
import RunCapMeter from './RunCapMeter';
import { getPlatformIcon } from './SocialIcons';
import { sanitizeAIOutput } from '../utils/textHelpers'; // HUTTLE: sanitized

const EMPTY_VALUES = new Set([
  'unknown', 'unclear', 'monitor', 'n/a', 'none', 'low',
  'limited data available', 'limited data available.',
  'not available', 'no data', 'no data available',
]);

function isSectionEmpty(value) {
  if (value == null) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return true;
    if (EMPTY_VALUES.has(trimmed.toLowerCase())) return true;
    if (trimmed.length < 20 && !trimmed.includes(' ')) return true;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return Object.values(value).every(isSectionEmpty);
  }
  return false;
}

function getDeepDiveLoadingMessage(seconds) {
  if (seconds < 8) return 'Researching real-time trend data...';
  if (seconds < 18) return 'Analyzing platform activity...';
  if (seconds < 28) return 'Compiling intelligence report...';
  return 'Finalizing deep analysis...';
}

function formatPlatformLabel(platform) {
  const normalized = String(platform || '').trim().toLowerCase();
  const platformLabels = {
    instagram: 'Instagram',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    facebook: 'Facebook',
    x: 'X',
    twitter: 'X',
  };

  return platformLabels[normalized] || platform;
}

function DeepDiveLoadingState({ secondsElapsed }) {
  const steps = [
    'Research',
    'Platforms',
    'Report',
    'Finalize'
  ];
  const activeStepIndex = secondsElapsed < 8 ? 0 : secondsElapsed < 18 ? 1 : secondsElapsed < 28 ? 2 : 3;
  const progressPercent = Math.min(95, 20 + (activeStepIndex * 20) + (secondsElapsed % 10));

  return (
    <div className="space-y-5 rounded-2xl border border-huttle-100 bg-white/90 p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-huttle-50 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-huttle-primary animate-spin" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">{getDeepDiveLoadingMessage(secondsElapsed)}</p>
          <p className="text-xs text-gray-500">This can take 15-30 seconds for deeper real-time analysis.</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-huttle-blue via-huttle-primary to-huttle-600 transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {steps.map((label, index) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-full ${index <= activeStepIndex ? 'bg-huttle-primary animate-pulse' : 'bg-gray-200'}`} />
              <span className={`text-[10px] ${index <= activeStepIndex ? 'text-huttle-primary font-semibold' : 'text-gray-400'}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * TrendDiscoveryHub - Reimagined with cutting-edge design
 * A premium trend discovery experience with glassmorphism and advanced animations
 */
export default function TrendDiscoveryHub() {
  const { brandData } = useContext(BrandContext);
  const { user } = useContext(AuthContext);
  const { addToast: showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getFeatureLimit, userTier } = useSubscription();
  const quickScanUsage = useAIUsage('trendQuickScan');
  const deepDiveUsage = useAIUsage('trendDeepDive');
  
  const [activeMode, setActiveMode] = useState('quickScan');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [deepDiveTopic, setDeepDiveTopic] = useState('');
  const [deepDiveResults, setDeepDiveResults] = useState(null);
  const [isLoadingDeepDive, setIsLoadingDeepDive] = useState(false);
  const [autoRunTopic, setAutoRunTopic] = useState(null);
  const [savedTrendIndex, setSavedTrendIndex] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState(null);
  const [deepDiveError, setDeepDiveError] = useState(null);
  const [deepDiveLoadingSeconds, setDeepDiveLoadingSeconds] = useState(0);
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);
  /** When user switches away during Deep Dive, ignore late responses */
  const deepDiveCancelledRef = useRef(false);
  const [audienceInsightsResult, setAudienceInsightsResult] = useState(null);
  const [audienceInsightsError, setAudienceInsightsError] = useState(null);
  const [isLoadingAudienceInsights, setIsLoadingAudienceInsights] = useState(false);
  const [audienceInsightsContext, setAudienceInsightsContext] = useState(null);
  
  const canAccessDeepDive = getFeatureLimit('trendDeepDive') > 0;

  const clearAudienceInsights = () => {
    setAudienceInsightsResult(null);
    setAudienceInsightsError(null);
    setAudienceInsightsContext(null);
    setIsLoadingAudienceInsights(false);
  };

  // Simulate scan progress
  useEffect(() => {
    if (isScanning) {
      setScanProgress(0);
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);
      return () => clearInterval(interval);
    } else {
      setScanProgress(100);
    }
  }, [isScanning]);

  useEffect(() => {
    if (!isLoadingDeepDive && !isLoadingAudienceInsights) {
      setDeepDiveLoadingSeconds(0);
      return undefined;
    }

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      setDeepDiveLoadingSeconds(elapsedSeconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoadingAudienceInsights, isLoadingDeepDive]);

  useEffect(() => {
    const routeMode = searchParams.get('mode');
    if (routeMode !== 'audience') return;

    const routePlatform = String(searchParams.get('platform') || '').trim().toLowerCase();
    const demographics = String(searchParams.get('demographics') || '').trim() || null;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('mode');
    nextParams.delete('platform');
    nextParams.delete('demographics');
    setSearchParams(nextParams, { replace: true });

    if (!routePlatform) {
      showToast('Audience Insight Engine requires a platform context.', 'warning');
      return;
    }

    if (!brandData?.niche) {
      showToast('Add your niche in Brand Profile first (sidebar → Account).', 'warning');
      return;
    }

    let isActive = true;

    setActiveMode('deepDive');
    setDeepDiveResults(null);
    setDeepDiveError(null);
    setAudienceInsightsResult(null);
    setAudienceInsightsError(null);
    setAudienceInsightsContext({
      demographics,
      platform: routePlatform,
      platformLabel: formatPlatformLabel(routePlatform),
    });
    setIsLoadingAudienceInsights(true);

    const fetchAudienceInsights = async () => {
      try {
        const result = await getAudienceInsights(brandData, demographics, routePlatform);

        if (!isActive) return;

        if (result.success && result.insights) {
          setAudienceInsightsResult({
            insights: result.insights,
            citations: Array.isArray(result.citations) ? result.citations : [],
            generatedAt: result.generatedAt || new Date().toISOString(),
          });
          showToast(`Audience Insight Engine ready. ${getToastDisclaimer('forecast')}`, 'ai');
        } else {
          const errorMessage = result.error || 'Audience Insight Engine encountered a server issue. Please try again in a moment.';
          setAudienceInsightsError(errorMessage);
          showToast(errorMessage, 'error');
        }
      } catch (error) {
        if (!isActive) return;
        console.error('Audience Insight Engine error:', error);
        const errorMessage = 'Audience Insight Engine encountered a server issue. Please try again in a moment.';
        setAudienceInsightsError(errorMessage);
        showToast(errorMessage, 'error');
      } finally {
        if (isActive) {
          setIsLoadingAudienceInsights(false);
        }
      }
    };

    void fetchAudienceInsights();

    return () => {
      isActive = false;
    };
  }, [brandData, searchParams, setSearchParams, showToast]);

  // Handle navigation state from Dashboard "Deep Dive" trend cards.
  // On mount, read state.deepDiveTopic and state.autoRun, then pre-fill the input and optionally auto-run.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const { deepDiveTopic: routeTopic, autoRun } = location.state || {};
    if (!routeTopic) return;

    const safeTopic = String(routeTopic).substring(0, 200);
    setDeepDiveTopic(safeTopic);
    setActiveMode('deepDive');
    setDeepDiveResults(null);
    setDeepDiveError(null);

    if (autoRun) {
      setAutoRunTopic(safeTopic);
    }

    // Clear navigation state so a back-forward navigation doesn't re-trigger
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  }, []); // intentionally run only on mount

  // Once deepDiveTopic state matches the pending auto-run topic, call handleDeepDive.
  useEffect(() => {
    if (!autoRunTopic || deepDiveTopic !== autoRunTopic) return;
    setAutoRunTopic(null);
    handleDeepDive(); // deepDiveTopic is now the correct value in the closure
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepDiveTopic, autoRunTopic]);

  const getCategoryStyles = (category) => {
    const normalized = (category || '').toLowerCase();
    if (normalized === 'viral moment') return 'bg-pink-100 text-pink-700 border-pink-200';
    if (normalized === 'platform update') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (normalized === 'cultural wave') return 'bg-purple-100 text-purple-700 border-purple-200';
    if (normalized === 'news-driven') return 'bg-red-100 text-red-700 border-red-200';
    if (normalized === 'seasonal') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  const getMomentumMeta = (momentum) => {
    const normalized = (momentum || '').toLowerCase();
    if (normalized === 'rising') {
      return { symbol: '↑', className: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    }
    if (normalized === 'declining') {
      return { symbol: '↓', className: 'text-red-600 bg-red-50 border-red-200' };
    }
    return { symbol: '•', className: 'text-amber-600 bg-amber-50 border-amber-200' };
  };

  const getDeepDiveStatusStyles = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'rising') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (normalized === 'peaking') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (normalized === 'declining') return 'bg-red-100 text-red-700 border-red-200';
    if (normalized === 'emerging') return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getDeepDiveVelocityStyles = (velocity) => {
    const normalized = String(velocity || '').toLowerCase();
    if (normalized === 'explosive') return 'bg-red-100 text-red-700 border-red-200';
    if (normalized === 'steady') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (normalized === 'slow burn') return 'bg-gray-100 text-gray-700 border-gray-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getConfidenceStyles = (level) => {
    const normalized = String(level || '').toLowerCase();
    if (normalized === 'high') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (normalized === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (normalized === 'low') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getMoodStyles = (mood) => {
    const normalized = String(mood || '').toLowerCase();
    if (normalized === 'positive') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (normalized === 'negative') return 'bg-red-100 text-red-700 border-red-200';
    if (normalized === 'mixed') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (normalized === 'polarized') return 'bg-purple-100 text-purple-700 border-purple-200';
    if (normalized === 'curious') return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getTimingWindowStyles = (window) => {
    const normalized = String(window || '').toLowerCase();
    if (normalized === 'act now') return 'bg-red-100 text-red-700 border-red-200 animate-pulse';
    if (normalized === 'this week') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (normalized === 'monitor') return 'bg-gray-100 text-gray-700 border-gray-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getActivityDots = (level) => {
    const normalized = String(level || '').toLowerCase();
    if (normalized === 'high') return { filled: 3, className: 'bg-emerald-500' };
    if (normalized === 'medium') return { filled: 2, className: 'bg-amber-500' };
    return { filled: 1, className: 'bg-gray-500' };
  };

  const formatProcessedAt = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const handleQuickScan = async () => {
    clearAudienceInsights();

    if (!brandData?.niche) {
      showToast('Add your niche in Brand Profile first (sidebar → Account).', 'warning');
      return;
    }

    const gate = await quickScanUsage.checkCanGenerate();
    if (!gate.allowed) {
      showToast(gate.message || "You've reached your monthly Trend Pulse limit.", 'warning');
      return;
    }

    setIsScanning(true);
    try {
      // Track this usage
      await quickScanUsage.trackFeatureUsage({ niche: brandData.niche });

      const result = await scanTrendingTopics(brandData, 'all');
      
      if (result.success && result.scan) {
        setScanResults({
          ...result.scan,
          citations: result.citations || []
        });
        setScanError(null);
        showToast(`Scan complete! Found ${result.scan.trends.length} active trends. ${getToastDisclaimer('forecast')}`, 'success');
      } else {
        const errorMessage = result.error || 'Trend scan returned unexpected results. Please try again.';
        setScanError(errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Trend Pulse error:', error);
      setScanError('Trend scan returned unexpected results. Please try again.');
      showToast('Trend scan returned unexpected results. Please try again.', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDeepDive = async () => {
    clearAudienceInsights();

    if (!canAccessDeepDive) {
      setShowUpgradeModal(true);
      showToast('Deep Dive is available for Essentials and Pro plans', 'warning');
      return;
    }

    if (!deepDiveTopic.trim()) {
      showToast('Please enter a topic or competitor niche', 'warning');
      return;
    }

    const gate = await deepDiveUsage.checkCanGenerate();
    if (!gate.allowed) {
      showToast(gate.message || "You've reached your monthly Deep Dive limit.", 'warning');
      return;
    }

    setDeepDiveError(null);
    setDeepDiveResults(null);
    deepDiveCancelledRef.current = false;
    setIsLoadingDeepDive(true);
    try {
      // Fetch user profile for personalized context
      let userProfile = null;
      if (user?.id) {
        const { data } = await supabase
          .from('user_profile')
          .select('preferred_platforms')
          .eq('user_id', user.id)
          .single();
        userProfile = data;
      }

      // Use the direct Deep Dive AI route
      const result = await getTrendDeepDive({
        trend: deepDiveTopic.trim(),
        niche: brandData?.niche || '',
        platforms: userProfile?.preferred_platforms || ['Instagram', 'TikTok', 'X'],
        brandData: {
          brandVoice: brandData?.brandVoice || '',
          targetAudience: brandData?.targetAudience || ''
        }
      });

      if (result.success && result.report) {
        if (deepDiveCancelledRef.current) {
          return;
        }
        await deepDiveUsage.trackFeatureUsage({ topic: deepDiveTopic.trim() });
        setDeepDiveResults({
          topic: deepDiveTopic.trim(),
          report: result.report,
          competitorInsights: result.competitorInsights || [],
          citations: result.citations || [],
          metadata: result.metadata || {},
          raw: {
            success: true,
            report: result.report,
            citations: result.citations || [],
            metadata: result.metadata || {},
          },
        });
        setIsSourcesExpanded(false);
        setDeepDiveError(null);
        showToast(`Deep Dive report ready. ${getToastDisclaimer('forecast')}`, 'ai');
      } else {
        if (deepDiveCancelledRef.current) return;
        const errorMessage = result?.reason || 'Deep Dive encountered a server issue. Please try again in a moment.';
        setDeepDiveError(errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Deep Dive error:', error);
      if (deepDiveCancelledRef.current) return;
      const errorMessage = 'Deep Dive encountered a server issue. Please try again in a moment.';
      setDeepDiveError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoadingDeepDive(false);
    }
  };

  const handleDeepDiveFromTrend = (trendName) => {
    clearAudienceInsights();

    // Pre-fill the deep dive topic and switch to deep dive mode
    setDeepDiveTopic(trendName);
    setActiveMode('deepDive');
    showToast('Switched to Deep Dive — generate a report for this trend', 'success');
  };

  const handleCreatePostFromTrend = (trendName, trendPlatform = '') => {
    const topic = trendName.substring(0, 200);
    const params = new URLSearchParams({
      topic,
    });

    if (trendPlatform) {
      params.set('platform', String(trendPlatform).toLowerCase());
    }

    showToast('Opening Full Post Builder...', 'success');
    navigate(`/dashboard/full-post-builder?${params.toString()}`);
  };

  const handleSaveDeepDiveReport = async () => {
    if (!user?.id || !deepDiveResults?.report) {
      showToast('No report found to save.', 'warning');
      return;
    }

    try {
      const reportPayload = {
        topic: deepDiveResults.topic,
        report: deepDiveResults.report,
        citations: deepDiveResults.citations || [],
        metadata: deepDiveResults.metadata || {},
        savedAt: new Date().toISOString()
      };

      const itemData = {
        name: `Deep Dive Report - ${deepDiveResults.topic.substring(0, 40)}${deepDiveResults.topic.length > 40 ? '...' : ''}`,
        type: 'text',
        content: JSON.stringify(reportPayload, null, 2),
        size_bytes: 0,
        description: 'Structured trend intelligence report from Trend Lab Deep Dive'
      };

      const result = await saveToVault(user.id, itemData);
      if (result.success) {
        setSavedTrendIndex('deep-report');
        setTimeout(() => setSavedTrendIndex(null), 2000);
        showToast('Report saved to Content Vault!', 'success');
      } else {
        showToast('Failed to save report. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error saving Deep Dive report:', error);
      showToast('Failed to save report. Please try again.', 'error');
    }
  };

  const handleAddToLibrary = async (content, type = 'trend', itemIndex = null) => {
    if (!user?.id) {
      showToast('Please log in to add content to library', 'error');
      return;
    }

    try {
      const name = type === 'trend' 
        ? `Trend - ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`
        : `Trend Idea - ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`;

      const itemData = {
        name,
        type: 'text',
        content: content,
        size_bytes: 0,
        description: `Generated from Trend Discovery Hub`,
      };

      const result = await saveToVault(user.id, itemData);

      if (result.success) {
        setSavedTrendIndex(itemIndex);
        setTimeout(() => setSavedTrendIndex(null), 2000);
        showToast('Added to Content Vault!', 'success');
      } else {
        showToast('Failed to add to library', 'error');
        console.error('Error saving to library:', result.error);
      }
    } catch (error) {
      console.error('Error adding to library:', error);
      showToast('Error adding to library', 'error');
    }
  };

  return (
    <div className="relative mb-8" data-testid="trend-discovery-hub">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-huttle-500/10 via-huttle-400/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-cyan-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Main Container with Glass Effect */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/70 backdrop-blur-xl shadow-2xl shadow-gray-900/5">
        {/* Animated Mesh Gradient Overlay */}
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top_right,rgba(1,186,210,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.15),transparent_50%)]" />
        
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-huttle-blue via-huttle-primary to-huttle-600" />
        
        {/* Header Section */}
        <div className="relative px-6 pt-8 pb-6 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Title Group */}
            <div className="flex items-start gap-4">
              {/* Animated Icon Container */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-huttle-blue to-huttle-600 rounded-2xl blur-lg opacity-50 animate-pulse" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-huttle-blue via-huttle-primary to-huttle-600 p-[2px]">
                  <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center">
                    <Radar className="w-7 h-7 text-huttle-primary" />
                  </div>
                </div>
                {/* Orbiting Dots */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full animate-ping" />
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl md:text-3xl font-display font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                    Trend Discovery
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-huttle-blue to-huttle-primary text-white rounded-full">
                    Live
                  </span>
                </div>
                <p className="text-gray-500 text-sm md:text-base">
                  What's going viral right now — across all platforms and niches
                </p>
              </div>
            </div>

            {/* Mode Toggle - Pill Design */}
            <div className="relative flex p-1 bg-gray-100/80 rounded-2xl backdrop-blur-sm w-full md:w-auto">
              {/* Sliding Background */}
              <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-2px)] bg-white rounded-xl shadow-lg shadow-gray-900/10 transition-all duration-300 ease-out ${
                  activeMode === 'deepDive' ? 'translate-x-[calc(100%+2px)]' : 'translate-x-0'
                }`}
              />
              
              <button
                onClick={() => {
                  if (isLoadingDeepDive) deepDiveCancelledRef.current = true;
                  clearAudienceInsights();
                  setActiveMode('quickScan');
                }}
                title="See what's trending everywhere right now"
                data-testid="trend-pulse-tab"
                className={`relative z-10 flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-5 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-semibold transition-colors duration-300 flex-1 md:flex-none whitespace-nowrap ${
                  activeMode === 'quickScan'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Search className={`w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0 transition-all duration-300 ${activeMode === 'quickScan' ? 'text-huttle-primary' : ''}`} />
                <span className="hidden sm:inline">Trend Pulse</span>
                <span className="sm:hidden">Pulse</span>
                <span className="hidden md:inline text-[10px] ml-1 px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded-full font-bold">🌐 Live</span>
              </button>
              
              <button
                onClick={() => {
                  clearAudienceInsights();
                  if (canAccessDeepDive) {
                    setActiveMode('deepDive');
                  } else {
                    setShowUpgradeModal(true);
                  }
                }}
                title="Research what works specifically in your niche"
                className={`relative z-10 flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-5 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-semibold transition-colors duration-300 flex-1 md:flex-none whitespace-nowrap ${
                  activeMode === 'deepDive'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Target className={`w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0 transition-all duration-300 ${activeMode === 'deepDive' ? 'text-huttle-primary' : ''}`} />
                <span className="hidden sm:inline">Deep Dive</span>
                <span className="sm:hidden">Dive</span>
                <span className="hidden md:inline text-[10px] ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-bold">🔍 Niche</span>
                {!canAccessDeepDive && (
                  <Lock className="w-3 h-3 md:w-3.5 md:h-3.5 text-gray-400 flex-shrink-0" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative px-6 pb-8 md:px-8 min-h-[520px]">
          {/* Per-feature usage meter */}
          <div className="mb-4">
            {activeMode === 'quickScan' && (
              <AIUsageMeter
                used={quickScanUsage.featureUsed}
                limit={quickScanUsage.featureLimit}
                poolUsed={quickScanUsage.overallUsed}
                poolLimit={quickScanUsage.overallLimit}
                creditsPerRun={quickScanUsage.creditsPerRun}
                label="Trend Pulses this month"
                compact
              />
            )}
            {activeMode === 'deepDive' && (
              <RunCapMeter
                featureKey="trendDeepDive"
                tier={userTier}
                featureLabel="Deep Dive runs"
                compact
              />
            )}
          </div>

          <AnimatePresence mode="wait">
          {/* Trend Pulse Mode */}
          {activeMode === 'quickScan' && (
            <Motion.div
              key="quickScan"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {isScanning ? (
                /* Scanning Animation */
                <div className="relative py-16">
                  {/* Radar Animation Container */}
                  <div className="relative w-48 h-48 mx-auto">
                    {/* Outer Ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-huttle-200 animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="absolute inset-4 rounded-full border-2 border-huttle-300/60 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                    <div className="absolute inset-8 rounded-full border-2 border-huttle-400/40 animate-ping" style={{ animationDuration: '2s', animationDelay: '1s' }} />
                    
                    {/* Center Hub */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-huttle-blue to-huttle-600 flex items-center justify-center shadow-xl shadow-huttle-500/30">
                        <Radar className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '3s' }} />
                      </div>
                    </div>
                    
                    {/* Scanning Line */}
                    <div 
                      className="absolute inset-0 origin-center animate-spin" 
                      style={{ animationDuration: '2s' }}
                    >
                      <div className="absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-gradient-to-r from-huttle-primary to-transparent origin-left" />
                    </div>
                  </div>
                  
                  {/* Progress & Status */}
                  <div className="mt-8 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-huttle-50 rounded-full border border-huttle-100 mb-4">
                      <Activity className="w-4 h-4 text-huttle-primary animate-pulse" />
                      <span className="text-sm font-medium text-huttle-700">Scanning real-time data...</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="max-w-xs mx-auto">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-huttle-blue via-huttle-primary to-huttle-600 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${scanProgress}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Analyzing {brandData?.niche || 'your industry'} across platforms
                      </p>
                    </div>
                  </div>
                </div>
              ) : scanError ? (
                /* Error State with Retry */
                <div className="relative py-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Scan Failed</h3>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">{scanError}</p>
                  <button
                    onClick={() => { setScanError(null); handleQuickScan(); }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold transition-all shadow-lg"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                </div>
              ) : scanResults ? (
                /* Results Display */
                <div className="space-y-6">
                  {/* Results Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Live Results</span>
                      </div>
                      {scanResults.scan_summary ? (
                        <p className="text-sm text-gray-600 mt-1">{sanitizeAIOutput(scanResults.scan_summary)}</p>
                      ) : null}
                    </div>
                    <button
                      onClick={handleQuickScan}
                      className="group flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30"
                    >
                      <Radar className="w-4 h-4 group-hover:animate-spin" style={{ animationDuration: '2s' }} />
                      <span>Rescan</span>
                    </button>
                  </div>

                  {/* Trend Cards */}
                  <div className="space-y-3">
                    {scanResults.trends.map((trend, index) => {
                      const momentumMeta = getMomentumMeta(trend.momentum);
                      const sanitizedTrendTopic = sanitizeAIOutput(trend.topic) || 'Trend'; // HUTTLE: sanitized
                      const sanitizedWhyTrending = sanitizeAIOutput(trend.why_trending); // HUTTLE: sanitized
                      const sanitizedTrendRelevance = sanitizeAIOutput(trend.relevance_to_niche); // HUTTLE: sanitized
                      const trendTextForLibrary = `${sanitizedTrendTopic}. Why trending: ${sanitizedWhyTrending}. Relevance: ${sanitizedTrendRelevance}`; // HUTTLE: sanitized
                      return (
                        <div
                          key={`${trend.topic}-${index}`}
                          className="bg-white rounded-2xl border border-gray-200 p-4 md:p-5 hover:border-huttle-primary/30 hover:shadow-lg hover:shadow-huttle-500/10 transition-all"
                        >
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex-1 min-w-[220px]">
                                <h4 className="text-lg font-bold text-gray-900">{sanitizedTrendTopic}</h4>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getCategoryStyles(trend.category)}`}>
                                    {trend.category}
                                  </span>
                                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${momentumMeta.className}`}>
                                    {momentumMeta.symbol} {trend.momentum}
                                  </span>
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                    {trend.estimated_lifespan}
                                  </span>
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-huttle-50 text-huttle-primary border border-huttle-100">
                                    {trend.opportunity_window}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleAddToLibrary(trendTextForLibrary, 'trend', `trend-${index}`)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-600 rounded-lg text-xs font-medium transition-all"
                                title="Save to Library"
                              >
                                {savedTrendIndex === `trend-${index}` ? (
                                  <Check className="w-3.5 h-3.5 text-green-600" />
                                ) : (
                                  <FolderPlus className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            <div className="space-y-2">
                              <p className="text-sm text-gray-700"><span className="font-semibold text-gray-900">Why trending:</span> {sanitizedWhyTrending}</p>
                              <p className="text-sm text-gray-700"><span className="font-semibold text-gray-900">Niche relevance:</span> {sanitizedTrendRelevance}</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {(trend.platforms_active || []).map((platform, platformIndex) => (
                                <span
                                  key={`${platform}-${platformIndex}`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700"
                                >
                                  {getPlatformIcon(platform, 'w-3.5 h-3.5 text-gray-700')}
                                  {platform}
                                </span>
                              ))}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 pt-1">
                              <button
                                onClick={() => handleDeepDiveFromTrend(sanitizedTrendTopic)} // HUTTLE: card fix
                                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white border border-gray-200 hover:border-huttle-primary/50 text-gray-700 rounded-lg text-xs font-semibold transition-all hover:bg-huttle-50"
                              >
                                <Target className="w-3.5 h-3.5 text-huttle-primary" />
                                <span>Deep Dive</span>
                              </button>
                              <button
                                onClick={() => handleCreatePostFromTrend(sanitizedTrendTopic, trend.platforms_active?.[0])} // HUTTLE: card fix
                                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-huttle-primary text-white rounded-lg text-xs font-semibold transition-all shadow-sm hover:bg-huttle-primary-dark hover:shadow-md"
                              >
                                <PenLine className="w-3.5 h-3.5" />
                                <span>Create Content</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Last updated: {scanResults.last_updated ? new Date(scanResults.last_updated).toLocaleString() : new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                /* Empty State - CTA to Start Scan */
                <div className="relative py-16">
                  {/* Background Decoration */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <div className="w-64 h-64 rounded-full border-2 border-dashed border-huttle-400 animate-spin" style={{ animationDuration: '20s' }} />
                    <div className="absolute w-48 h-48 rounded-full border-2 border-dashed border-huttle-300 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
                  </div>
                  
                  <div className="relative text-center">
                    {/* Floating Icon */}
                    <div className="relative inline-block mb-6">
                      <div className="absolute inset-0 bg-gradient-to-br from-huttle-blue to-huttle-primary rounded-3xl blur-2xl opacity-30 animate-pulse" />
                      <div className="relative w-24 h-24 bg-gradient-to-br from-huttle-blue via-huttle-primary to-huttle-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-huttle-500/30">
                        <Radar className="w-12 h-12 text-white" />
                      </div>
                      {/* Orbiting Elements */}
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center shadow-lg animate-bounce" style={{ animationDelay: '0.5s' }}>
                        <TrendingUp className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    
                    <h3 className="text-2xl font-display font-bold text-gray-900 mb-3">
                      Discover What's Trending
                    </h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                      Scan real-time trends in <span className="font-semibold text-huttle-primary">{brandData?.niche || 'your industry'}</span> and find your next viral content opportunity
                    </p>
                    
                    <button
                      onClick={handleQuickScan}
                      className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-huttle-blue via-huttle-primary to-huttle-600 text-white rounded-2xl text-lg font-bold transition-all shadow-md hover:shadow-lg hover:shadow-huttle-500/30"
                      data-testid="trend-pulse-start-scan"
                    >
                      <Radar className="w-5 h-5 group-hover:animate-spin" style={{ animationDuration: '2s' }} />
                      <span>Start Scanning</span>
                      <div className="flex items-center justify-center w-6 h-6 bg-white/20 rounded-full">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </Motion.div>
          )}

          {/* Deep Dive Mode */}
          {activeMode === 'deepDive' && (
            <Motion.div
              key="deepDive"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {(isLoadingAudienceInsights || audienceInsightsResult || audienceInsightsError) ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-gray-900">Audience Insight Engine</h3>
                        <p className="text-sm text-gray-600">
                          {audienceInsightsContext?.platformLabel}
                          {audienceInsightsContext?.demographics ? ` · ${audienceInsightsContext.demographics}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          clearAudienceInsights();
                          setDeepDiveResults(null);
                          setDeepDiveError(null);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Open Deep Dive
                      </button>
                    </div>
                  </div>

                  {isLoadingAudienceInsights && <DeepDiveLoadingState secondsElapsed={deepDiveLoadingSeconds} />}

                  {audienceInsightsError && !isLoadingAudienceInsights && (
                    <div className="relative py-12 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Audience Insight Engine Failed</h3>
                      <p className="text-gray-500 mb-6 max-w-sm mx-auto">{audienceInsightsError}</p>
                      <button
                        onClick={() => {
                          clearAudienceInsights();
                          setActiveMode('deepDive');
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold transition-all shadow-lg"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Open Deep Dive
                      </button>
                    </div>
                  )}

                  {audienceInsightsResult && !isLoadingAudienceInsights && (
                    <>
                      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                          {sanitizeAIOutput(audienceInsightsResult.insights)}
                        </div>
                      </div>

                      {audienceInsightsResult.citations?.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                          <div className="flex flex-wrap gap-2">
                            {audienceInsightsResult.citations.map((citation, idx) => (
                              <a
                                key={`${citation}-${idx}`}
                                href={citation}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-huttle-primary transition-colors hover:border-huttle-200 hover:bg-huttle-50"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Source {idx + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : !canAccessDeepDive ? (
                /* Upgrade CTA */
                <div className="relative py-12">
                  {/* Lock Icon */}
                  <div className="text-center mb-8">
                    <div className="relative inline-block">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                        <Lock className="w-10 h-10 text-gray-400" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 px-2 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                        Pro
                      </div>
                    </div>
                  </div>
                  
                  <div className="max-w-lg mx-auto text-center">
                    <h3 className="text-2xl font-display font-bold text-gray-900 mb-3">
                      Unlock Deep Dive Analysis
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Get AI-powered content ideas inspired by trending patterns in any niche or competitor space
                    </p>
                    
                    {/* Feature Preview Cards */}
                    <div className="grid grid-cols-2 gap-3 mb-8">
                      {[
                        { icon: Target, label: 'Competitor Analysis' },
                        { icon: Sparkles, label: 'AI-Powered Ideas' },
                        { icon: TrendingUp, label: 'Trend Psychology' },
                        { icon: Shuffle, label: 'Brand Adaptation' }
                      ].map((feature, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-600"
                        >
                          <feature.icon className="w-4 h-4 text-huttle-primary" />
                          <span>{feature.label}</span>
                        </div>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-huttle-blue via-huttle-primary to-huttle-600 text-white rounded-2xl text-lg font-bold transition-all shadow-md hover:shadow-lg hover:shadow-huttle-500/30 hover:scale-105"
                    >
                      <Zap className="w-5 h-5" />
                      <span>Upgrade to Unlock</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Input Section */}
                  <div className="relative mb-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Enter a topic, competitor, or niche to analyze..."
                          value={deepDiveTopic}
                          onChange={(e) => setDeepDiveTopic(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleDeepDive()}
                          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-2xl text-base focus:border-huttle-primary focus:ring-4 focus:ring-huttle-primary/10 transition-all outline-none"
                        />
                      </div>
                      <button
                        onClick={handleDeepDive}
                        disabled={isLoadingDeepDive || !deepDiveTopic.trim()}
                        className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-huttle-blue via-huttle-primary to-huttle-600 text-white rounded-2xl font-bold transition-all shadow-md hover:shadow-lg hover:shadow-huttle-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoadingDeepDive ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            <span>Generate Report</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Deep Dive Error State */}
                  {deepDiveError && !isLoadingDeepDive && (
                    <div className="relative py-12 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Deep Dive Failed</h3>
                      <p className="text-gray-500 mb-6 max-w-sm mx-auto">{deepDiveError}</p>
                      <button
                        onClick={() => { setDeepDiveError(null); handleDeepDive(); }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold transition-all shadow-lg"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                      </button>
                    </div>
                  )}

                  {/* Loading State */}
                  {isLoadingDeepDive && <DeepDiveLoadingState secondsElapsed={deepDiveLoadingSeconds} />}

                  {/* Results */}
                  {deepDiveResults && !isLoadingDeepDive && (() => {
                    const report = deepDiveResults.report || {};
                    const metadata = deepDiveResults.metadata || {};
                    const sectionsParsed = metadata.sections_parsed || {};
                    const activeTrends = Array.isArray(report.active_trends) ? report.active_trends : [];
                    const platformActivity = Array.isArray(report.platform_activity) ? report.platform_activity : [];
                    const citations = Array.isArray(deepDiveResults.citations) ? deepDiveResults.citations : [];
                    const generatedAt = formatProcessedAt(metadata.processed_at);
                    const showTrendsSection = (sectionsParsed.trend_count ?? activeTrends.length) > 0 && activeTrends.length > 0;
                    const showPlatformSection = (sectionsParsed.platform_count ?? platformActivity.length) > 0 && platformActivity.length > 0;
                    const showCompetitorSection = Boolean(sectionsParsed.has_competitors) && Boolean(report.competitor_landscape);
                    const sanitizedDeepDiveTopic = sanitizeAIOutput(deepDiveResults.topic) || 'Trend report'; // HUTTLE: sanitized

                    return (
                      <div className="space-y-5 animate-fadeIn">
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-2">
                              <h3 className="text-xl font-bold text-gray-900">{sanitizedDeepDiveTopic}</h3>
                              {report.overview && (
                                <p className="text-sm leading-relaxed text-gray-600">{sanitizeAIOutput(report.overview)}</p>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {report.confidence?.level && (
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getConfidenceStyles(report.confidence.level)}`}>
                                  Confidence: {report.confidence.level}
                                </span>
                              )}
                              {generatedAt && (
                                <span className="text-xs text-gray-500">
                                  Generated {generatedAt}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {showTrendsSection && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900">Active Trends</h4>
                              <span className="rounded-full bg-huttle-100 px-2 py-0.5 text-xs font-semibold text-huttle-primary">
                                {activeTrends.length}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                              {activeTrends.map((trend, index) => {
                                const sanitizedActiveTrendName = sanitizeAIOutput(trend?.name) || 'Trend'; // HUTTLE: sanitized
                                return (
                                  <div key={`${trend?.name || 'trend'}-${index}`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                      <h5 className="font-semibold text-gray-900">{sanitizedActiveTrendName}</h5>
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {!isSectionEmpty(trend?.status) && (
                                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getDeepDiveStatusStyles(trend?.status)}`}>
                                            {trend.status}
                                          </span>
                                        )}
                                        {!isSectionEmpty(trend?.velocity) && (
                                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getDeepDiveVelocityStyles(trend?.velocity)}`}>
                                            {trend.velocity}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {trend?.primary_platform && (
                                      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2 py-1 text-xs text-gray-700">
                                        {getPlatformIcon(trend.primary_platform, 'w-3.5 h-3.5 text-gray-700')}
                                        <span>{trend.primary_platform}</span>
                                      </div>
                                    )}
                                    {trend?.evidence && !isSectionEmpty(trend.evidence) && (
                                      <div className="mb-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                                        {sanitizeAIOutput(trend.evidence)}
                                      </div>
                                    )}
                                    {trend?.why_it_matters && !isSectionEmpty(trend.why_it_matters) && (
                                      <p className="text-sm text-gray-700">{sanitizeAIOutput(trend.why_it_matters)}</p>
                                    )}
                                    <button
                                      onClick={() => handleCreatePostFromTrend(sanitizedActiveTrendName, trend?.primary_platform)} // HUTTLE: card fix
                                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-huttle-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-huttle-primary-dark"
                                    >
                                      <PenLine className="h-3.5 w-3.5" />
                                      Create Content
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {showPlatformSection && (() => {
                          const meaningfulPlatforms = platformActivity.filter((p) => {
                            const text = p?.["what's_happening"] || p?.whats_happening || p?.what_s_happening || '';
                            return !isSectionEmpty(text);
                          });
                          if (meaningfulPlatforms.length === 0) return null;
                          return (
                            <div className="space-y-3">
                              <h4 className="font-semibold text-gray-900">Platform Breakdown</h4>
                              <div className="space-y-2">
                                {meaningfulPlatforms.map((platform, index) => {
                                  const dots = getActivityDots(platform?.activity_level);
                                  const happeningText = sanitizeAIOutput(platform?.["what's_happening"] || platform?.whats_happening || platform?.what_s_happening || ''); // HUTTLE: sanitized
                                  return (
                                    <div key={`${platform?.name || 'platform'}-${index}`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2">
                                            {getPlatformIcon(platform?.name || '', 'w-4 h-4 text-gray-700')}
                                            <span className="font-semibold text-gray-900">{platform?.name || 'Platform'}</span>
                                          </div>
                                          {happeningText && (
                                            <p className="text-sm text-gray-700">{happeningText}</p>
                                          )}
                                        </div>
                                        <div className="space-y-2 md:text-right">
                                          <div className="flex items-center gap-1 md:justify-end">
                                            {[0, 1, 2].map((dotIndex) => (
                                              <span
                                                key={dotIndex}
                                                className={`h-2.5 w-2.5 rounded-full ${dotIndex < dots.filled ? dots.className : 'bg-gray-200'}`}
                                              />
                                            ))}
                                            <span className="ml-1 text-xs font-medium text-gray-600">{platform?.activity_level || 'Low'}</span>
                                          </div>
                                          {platform?.top_format && !isSectionEmpty(platform.top_format) && (
                                            <span className="inline-flex rounded-full border border-huttle-200 bg-huttle-50 px-2 py-0.5 text-xs font-medium text-huttle-primary">
                                              {platform.top_format}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {showCompetitorSection && !isSectionEmpty(report.competitor_landscape) && (
                          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <h4 className="mb-2 font-semibold text-gray-900">Competitor Activity</h4>
                            <p className="text-sm leading-relaxed text-gray-700">{sanitizeAIOutput(report.competitor_landscape)}</p>
                          </div>
                        )}

                        {report.audience_sentiment && !isSectionEmpty(report.audience_sentiment.overall_mood) && (
                          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <h4 className="mb-2 font-semibold text-gray-900">Audience Sentiment</h4>
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getMoodStyles(report.audience_sentiment.overall_mood)}`}>
                              {report.audience_sentiment.overall_mood}
                            </span>
                            {report.audience_sentiment.detail && !isSectionEmpty(report.audience_sentiment.detail) && (
                              <p className="mt-2 text-sm text-gray-700">{sanitizeAIOutput(report.audience_sentiment.detail)}</p>
                            )}
                          </div>
                        )}

                        {report.timing_window && !isSectionEmpty(report.timing_window.action_window) && (
                          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <h4 className="mb-2 font-semibold text-gray-900">Timing Window</h4>
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getTimingWindowStyles(report.timing_window.action_window)}`}>
                              {report.timing_window.action_window}
                            </span>
                            {report.timing_window.reasoning && !isSectionEmpty(report.timing_window.reasoning) && (
                              <p className="mt-2 text-sm text-gray-700">{sanitizeAIOutput(report.timing_window.reasoning)}</p>
                            )}
                            {report.timing_window.lifespan && !isSectionEmpty(report.timing_window.lifespan) && (
                              <p className="mt-1 text-sm text-gray-500">Estimated lifespan: {report.timing_window.lifespan}</p>
                            )}
                          </div>
                        )}

                        {citations.length > 0 && (
                          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <button
                              onClick={() => setIsSourcesExpanded((prev) => !prev)}
                              className="flex w-full items-center justify-between text-left"
                            >
                              <span className="font-semibold text-gray-900">Sources</span>
                              <span className="text-xs font-medium text-huttle-primary">
                                {isSourcesExpanded ? 'Hide' : 'Show'} ({citations.length})
                              </span>
                            </button>
                            {isSourcesExpanded && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {citations.map((citation, idx) => (
                                  <a
                                    key={`${citation}-${idx}`}
                                    href={citation}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-huttle-primary transition-colors hover:border-huttle-200 hover:bg-huttle-50"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Source {idx + 1}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:grid-cols-3">
                          <button
                            onClick={() => handleCreatePostFromTrend(sanitizedDeepDiveTopic, report.platform_activity?.[0]?.name || activeTrends?.[0]?.primary_platform)} // HUTTLE: card fix
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-huttle-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-huttle-primary-dark"
                          >
                            <PenLine className="h-4 w-4" />
                            Create Content From This
                          </button>
                          <button
                            onClick={handleSaveDeepDiveReport}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                          >
                            {savedTrendIndex === 'deep-report' ? (
                              <>
                                <Check className="h-4 w-4 text-emerald-600" />
                                Saved
                              </>
                            ) : (
                              <>
                                <FolderPlus className="h-4 w-4 text-huttle-primary" />
                                Save Report
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setDeepDiveTopic('');
                              setDeepDiveResults(null);
                              setDeepDiveError(null);
                              setIsSourcesExpanded(false);
                            }}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                          >
                            <RefreshCw className="h-4 w-4" />
                            New Deep Dive
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Empty State */}
                  {!deepDiveResults && !isLoadingDeepDive && !deepDiveError && (
                    <div className="text-center py-8 text-gray-500">
                      <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">
                        Enter a topic above to discover trending content patterns and get unique ideas
                      </p>
                    </div>
                  )}
                </>
              )}
            </Motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="deepDive"
      />
    </div>
  );
}
