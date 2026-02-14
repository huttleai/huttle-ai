import { useState, useMemo, useEffect, useContext } from 'react';
import { Newspaper, ExternalLink, X, AlertCircle, TrendingUp, Users, Clock, Filter } from 'lucide-react';
import { socialUpdates as staticSocialUpdates } from '../data/socialUpdates';
import { getSocialUpdates } from '../config/supabase';
import { InstagramIcon, FacebookIcon, TikTokIcon, TwitterXIcon, YouTubeIcon } from '../components/SocialIcons';
import LoadingSpinner from '../components/LoadingSpinner';
import { BrandContext } from '../context/BrandContext';

// TODO: N8N_WORKFLOW - Import workflow service when ready
import { getSocialUpdates as getWorkflowSocialUpdates } from '../services/n8nWorkflowAPI';
import { WORKFLOW_NAMES, isWorkflowConfigured } from '../utils/workflowConstants';

/**
 * Social Updates Page
 * 
 * TODO: N8N_WORKFLOW - This feature will move to n8n workflow
 * Workflow: WORKFLOW_NAMES.SOCIAL_UPDATES
 * 
 * Data source priority:
 * 1. n8n workflow (when configured) - Real-time scraped updates
 * 2. Supabase social_updates table - Manually curated updates
 * 3. Static data (socialUpdates.js) - Fallback/demo data
 * 
 * Current implementation uses:
 * - Supabase social_updates table (primary)
 * - Static data from data/socialUpdates.js (fallback)
 * 
 * Future implementation will:
 * 1. Check if workflow is configured via isWorkflowConfigured()
 * 2. If configured, call getWorkflowSocialUpdates() first
 * 3. If workflow fails or not configured, fall back to Supabase
 * 4. If Supabase fails, fall back to static data
 * 
 * Expected workflow response format:
 * {
 *   success: true,
 *   updates: [{
 *     id, platform, date, date_month, title, description,
 *     link, impact, keyTakeaways, actionItems, affectedUsers, timeline
 *   }]
 * }
 */

export default function SocialUpdates() {
  const { brandData } = useContext(BrandContext);
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [apiUpdates, setApiUpdates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useStaticData, setUseStaticData] = useState(false);
  const [filterByBrandVoice, setFilterByBrandVoice] = useState(true);

  // Get user's Brand Voice platforms for filtering
  const brandVoicePlatforms = useMemo(() => {
    const platforms = brandData?.platforms || [];
    return platforms.map(p => {
      // Normalize platform names to match the update data format
      const lower = p.toLowerCase();
      if (lower === 'twitter' || lower === 'x') return 'X';
      return p.charAt(0).toUpperCase() + p.slice(1);
    });
  }, [brandData?.platforms]);

  const hasBrandVoicePlatforms = brandVoicePlatforms.length > 0;
  
  // Map platform names to icons and colors
  const platformConfig = {
    'Instagram': { icon: InstagramIcon, color: 'bg-pink-500' },
    'Facebook': { icon: FacebookIcon, color: 'bg-blue-600' },
    'TikTok': { icon: TikTokIcon, color: 'bg-black' },
    'X': { icon: TwitterXIcon, color: 'bg-black' },
    'Twitter': { icon: TwitterXIcon, color: 'bg-black' },
    'YouTube': { icon: YouTubeIcon, color: 'bg-red-600' }
  };
  
  // Transform Supabase update to match expected format
  const transformSupabaseUpdate = (update) => {
    const platformName = update.platform || 'Unknown';
    const config = platformConfig[platformName] || { icon: Newspaper, color: 'bg-gray-500' };
    
    // Parse date_month (format: "YYYY-MM") to "Month YYYY" format
    const dateStr = update.date_month || '';
    let displayDate = 'Unknown';
    if (dateStr) {
      const [year, month] = dateStr.split('-');
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      const monthIndex = parseInt(month) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        displayDate = `${monthNames[monthIndex]} ${year}`;
      }
    }
    
    return {
      id: update.id || `supabase-${Date.now()}`,
      platform: platformName,
      icon: config.icon,
      color: config.color,
      date: displayDate, // For display: "October 2024"
      date_month: dateStr, // Keep original for filtering: "2024-10"
      title: update.title || 'Platform Update',
      description: update.description || '',
      link: update.link || '#',
      impact: (update.impact || 'medium').toLowerCase(),
      keyTakeaways: update.key_takeaways || update.keyTakeaways || [],
      actionItems: update.action_items || update.actionItems || [],
      affectedUsers: update.affected_users || update.affectedUsers || '',
      timeline: update.timeline || ''
    };
  };
  
  // Fetch updates from Supabase on component mount
  useEffect(() => {
    const fetchUpdates = async () => {
      setIsLoading(true);
      try {
        // ==========================================================================
        // TODO: N8N_WORKFLOW - Add workflow as primary data source
        // 
        // When implementing:
        // if (isWorkflowConfigured(WORKFLOW_NAMES.SOCIAL_UPDATES)) {
        //   const workflowResult = await getWorkflowSocialUpdates({ limit: 12 });
        //   if (workflowResult.success && workflowResult.updates?.length > 0) {
        //     const transformed = workflowResult.updates.map(update => transformSupabaseUpdate(update));
        //     setApiUpdates(transformed);
        //     setUseStaticData(false);
        //     setIsLoading(false);
        //     return; // Exit early - workflow succeeded
        //   }
        //   // If workflow fails, fall through to Supabase
        //   console.log('[SocialUpdates] Workflow failed, falling back to Supabase');
        // }
        // ==========================================================================
        
        // Current implementation: Supabase as primary source
        const result = await getSocialUpdates(12);
        
        if (result.success && result.updates && result.updates.length > 0) {
          const transformed = result.updates.map(update => transformSupabaseUpdate(update));
          setApiUpdates(transformed);
          setUseStaticData(false);
        } else {
          // Fallback to static data if Supabase is empty or fails
          setUseStaticData(true);
        }
      } catch (error) {
        console.error('Error fetching social updates from Supabase:', error);
        setUseStaticData(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUpdates();
  }, []);
  
  // Parse date string - handles both "October 2024" and "2024-10" formats
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    
    // Check if it's in "YYYY-MM" format (from Supabase)
    if (dateStr.match(/^\d{4}-\d{2}$/)) {
      const [year, month] = dateStr.split('-');
      const monthIndex = parseInt(month) - 1;
      if (monthIndex >= 0 && monthIndex < 12 && !isNaN(year)) {
        return new Date(parseInt(year), monthIndex, 1);
      }
      return null;
    }
    
    // Otherwise, parse "Month YYYY" format (from static data)
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const parts = dateStr.split(' ');
    const monthName = parts[0];
    const year = parseInt(parts[1]);
    const monthIndex = monthNames.indexOf(monthName);
    
    if (monthIndex === -1 || isNaN(year)) {
      return null;
    }
    
    // Return the first day of that month
    return new Date(year, monthIndex, 1);
  };

  // Allowed platforms only
  const allowedPlatforms = ['Facebook', 'Instagram', 'TikTok', 'X', 'Twitter', 'YouTube'];
  
  // Filter out Threads, Snapchat, and any other platforms not in our service list
  const filterAllowedPlatforms = (updates) => {
    return updates.filter(update => {
      const platformName = update.platform || '';
      // Normalize platform names for comparison
      const normalizedPlatform = platformName.trim();
      
      // Check if platform is in allowed list (case-insensitive)
      const isAllowed = allowedPlatforms.some(allowed => 
        normalizedPlatform.toLowerCase() === allowed.toLowerCase()
      );
      
      // Explicitly exclude Threads and Snapchat
      const isExcluded = normalizedPlatform.toLowerCase() === 'threads' || 
                         normalizedPlatform.toLowerCase() === 'snapchat';
      
      if (!isAllowed || isExcluded) {
        return false;
      }
      
      return true;
    });
  };
  
  // Use API updates if available, otherwise fall back to static data
  // Filter to only include allowed platforms, then optionally filter by Brand Voice
  const allUpdates = useMemo(() => {
    const updates = useStaticData ? staticSocialUpdates : apiUpdates;
    let filtered = filterAllowedPlatforms(updates);

    // When filtering is enabled and user has Brand Voice platforms, show only those
    if (filterByBrandVoice && hasBrandVoicePlatforms) {
      filtered = filtered.filter(update => {
        const normalizedPlatform = (update.platform || '').trim();
        return brandVoicePlatforms.some(
          bp => bp.toLowerCase() === normalizedPlatform.toLowerCase()
        );
      });
    }

    return filtered;
  }, [useStaticData, apiUpdates, filterByBrandVoice, hasBrandVoicePlatforms, brandVoicePlatforms]);
  
  // Filter updates to show only the past 12 months from today's date
  // Shows entries from today back to 12 months ago, with most recent first
  // Example: If today is October 2025, shows entries from October 2025 back to October 2024
  const updates = useMemo(() => {
    if (allUpdates.length === 0) {
      return [];
    }
    
    // Get today's date (first of current month for comparison)
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = new Date(todayYear, todayMonth, 1);
    
    // Calculate 12 months ago from today
    // Example: If today is October 2025, twelveMonthsAgo is October 2024
    let cutoffYear = todayYear;
    let cutoffMonth = todayMonth - 12;
    
    // Handle year rollover if needed
    while (cutoffMonth < 0) {
      cutoffMonth += 12;
      cutoffYear -= 1;
    }
    
    const twelveMonthsAgo = new Date(cutoffYear, cutoffMonth, 1);
    
    // Filter to show entries from the past 12 months (from today back to 12 months ago)
    // Data is already sorted most recent first, so 2025 entries will appear before 2024 entries
    const filtered = allUpdates.filter(update => {
      // Handle both Supabase format (date_month) and static data format (date)
      const dateToParse = update.date_month || update.date;
      const updateDate = parseDate(dateToParse);
      
      if (!updateDate) {
        // Silently skip invalid dates
        return false;
      }
      
      // Include updates that are >= twelveMonthsAgo (October 2024)
      // No upper bound needed - we want all entries from the past 12 months
      // This will show October 2025 entries first (if available), then October 2024, September 2024, etc.
      const isIncluded = updateDate.getTime() >= twelveMonthsAgo.getTime();
      
      return isIncluded;
    });
    
    return filtered;
  }, [allUpdates]);

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="flex-1 bg-gray-50 ml-0 lg:ml-64 pt-24 lg:pt-20 px-4 md:px-8 pb-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
            <Newspaper className="w-6 h-6 md:w-7 md:h-7 text-huttle-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Social Updates
          </h1>
        </div>
        <p className="text-gray-600">
          Stay informed about the latest changes and updates from major social media platforms
        </p>

        {/* Platform filter toggle */}
        {hasBrandVoicePlatforms && (
          <div className="flex items-center gap-2 mt-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
              <button
                onClick={() => setFilterByBrandVoice(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filterByBrandVoice
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                My Platforms ({brandVoicePlatforms.length})
              </button>
              <button
                onClick={() => setFilterByBrandVoice(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  !filterByBrandVoice
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All Platforms
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
          <span className="ml-3 text-gray-600">Loading latest social media updates...</span>
        </div>
      )}

      {/* Summary Stats */}
      {!isLoading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Recent Updates</h3>
              <p className="text-2xl font-bold text-huttle-primary">{updates.length}</p>
              <p className="text-xs text-gray-500">Last 12 months</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">High Impact</h3>
              <p className="text-2xl font-bold text-red-600">{updates.filter(u => u.impact === 'high').length}</p>
              <p className="text-xs text-gray-500">Major changes</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Platforms Tracked</h3>
              <p className="text-2xl font-bold text-gray-900">
                {filterByBrandVoice && hasBrandVoicePlatforms ? brandVoicePlatforms.length : 6}
              </p>
              <p className="text-xs text-gray-500">
                {filterByBrandVoice && hasBrandVoicePlatforms ? 'Your platforms' : 'Social networks'}
              </p>
            </div>
          </div>

          {/* Updates List */}
          <div className="space-y-4">
            {updates.map((update) => (
          <div
            key={update.id}
            onClick={() => setSelectedUpdate(update)}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-huttle-primary transition-all cursor-pointer"
          >
            <div className="flex items-start gap-4">
              {/* Platform Icon */}
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-white border border-gray-100 shadow-sm">
                <update.icon className="w-7 h-7" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900">{update.platform}</h3>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">{update.date}</span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">{update.title}</h4>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${getImpactColor(update.impact)}`}>
                    {update.impact.toUpperCase()} IMPACT
                  </span>
                </div>
                
                <p className="text-gray-600 mb-3">
                  {update.description}
                </p>

                <div className="flex items-center gap-4">
                  <span className="text-sm text-huttle-primary hover:text-huttle-primary-dark font-medium">
                    Click for full breakdown →
                  </span>
                </div>
              </div>
            </div>
          </div>
            ))}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {selectedUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedUpdate(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-white border-b border-gray-100 p-6 rounded-t-xl">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm">
                    <selectedUpdate.icon className="w-10 h-10" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-1 text-gray-900">{selectedUpdate.platform} Update</h2>
                    <p className="text-sm text-gray-500">{selectedUpdate.date}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUpdate(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Title & Impact */}
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-2xl font-bold text-gray-900">{selectedUpdate.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${getImpactColor(selectedUpdate.impact)}`}>
                    {selectedUpdate.impact.toUpperCase()} IMPACT
                  </span>
                </div>
                <p className="text-gray-700 text-lg">{selectedUpdate.description}</p>
              </div>

              {/* Timeline & Affected Users */}
              {(selectedUpdate.timeline || selectedUpdate.affectedUsers) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedUpdate.timeline && (
                    <div className="p-4 bg-huttle-50 rounded-lg border border-huttle-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-huttle-primary" />
                        <h4 className="font-semibold text-gray-900">Timeline</h4>
                      </div>
                      <p className="text-sm text-gray-800">{selectedUpdate.timeline}</p>
                    </div>
                  )}
                  {selectedUpdate.affectedUsers && (
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-purple-600" />
                        <h4 className="font-semibold text-purple-900">Affected Users</h4>
                      </div>
                      <p className="text-sm text-purple-800">{selectedUpdate.affectedUsers}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Key Takeaways */}
              {selectedUpdate.keyTakeaways && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-green-900">Key Takeaways</h4>
                  </div>
                  <ul className="space-y-2">
                    {selectedUpdate.keyTakeaways.map((takeaway, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-green-800">
                        <span className="text-green-600 font-bold mt-0.5">•</span>
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {selectedUpdate.actionItems && (
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <h4 className="font-semibold text-orange-900">Recommended Actions</h4>
                  </div>
                  <ul className="space-y-2">
                    {selectedUpdate.actionItems.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-orange-800">
                        <span className="text-orange-600 font-bold mt-0.5">{i + 1}.</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Read More Link */}
              <div className="pt-4 border-t border-gray-200">
                <a
                  href={selectedUpdate.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  Read Official Announcement
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Footer Notes */}
      <div className="mt-8">
        <div className="bg-huttle-50 border border-huttle-200 rounded-xl p-4">
          <p className="text-sm text-gray-900">
            <strong>Note:</strong> These updates are curated to help you stay informed about platform changes that might affect your content strategy. Links are provided for detailed information from official sources.
          </p>
        </div>
      </div>
    </div>
  );
}

