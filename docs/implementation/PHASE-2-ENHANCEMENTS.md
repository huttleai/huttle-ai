# Phase 2 Enhancements - Implementation Guide

## 🎯 What's Left to Implement

Based on your requirements, here's what still needs to be added:

### ✅ Already Complete
- Supabase configuration and tier system
- n8n webhook integration  
- Subscription context with usage tracking
- Basic Trend Forecaster (needs enhancement)
- 5 AI Power Tools (need Supabase integration + 2 new cards)

### 🔨 Still To Do
1. **Enhance Trend Forecaster** - Better API prompts, timeline visualization, tier restrictions
2. **Add Burnout Risk Gauge** - Track activity and provide rest recommendations
3. **Add Content Gap Analysis** - Compare user content to trends (Pro only)
4. **Add Huttle Agent Beta Teaser** - Chat-based co-pilot preview
5. **Integrate Supabase** - All tools save to database
6. **Add Tier Restrictions** - Enforce limits with upgrade prompts

---

## 📝 Quick Implementation Steps

### Step 1: Install Missing Package

```bash
# Fix npm permissions first if needed
sudo chown -R $(whoami) "/Users/$(whoami)/.npm"

# Install Supabase
npm install @supabase/supabase-js
```

### Step 2: Update .env File

Add these new variables to your `.env`:

```env
# Supabase (NEW)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# n8n (Optional)
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
```

### Step 3: Set Up Supabase Database

Follow `SUPABASE-N8N-SETUP.md` to:
1. Create Supabase project
2. Run the SQL commands to create tables
3. Set up Row Level Security
4. Insert demo user data

### Step 4: Restart Dev Server

```bash
npm run dev
```

---

## 🚀 Code Changes Needed

### 1. Enhanced Trend Forecaster API Integration

**File: `src/services/perplexityAPI.js`**

Update the `forecastTrends` function with more specific prompting:

```javascript
export async function forecastTrends(niche, timeframe = '7 days', brandVoice = '', industry = '') {
  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a trend forecasting expert with access to real-time data. Provide predictive insights with velocity metrics and confidence levels.'
          },
          {
            role: 'user',
            content: `Emerging trends in ${niche} ${industry ? `for ${industry}` : ''} for the next ${timeframe} starting from October 30, 2025. Include:
            - Velocity predictions (% growth) 
            - Surge metrics
            - Sources (Meta blogs, X discussions, Reddit threads)
            - Niche-specific signals (audience shifts, competitor gaps)
            - Platform-specific momentum (Instagram, TikTok, LinkedIn)
            - Seasonal factors for late October/early November 2025
            
            Format: For each trend, provide name, current velocity, predicted surge, confidence level, and 2-3 source citations.`
          }
        ],
        temperature: 0.3,
      })
    });

    const data = await response.json();
    return {
      success: true,
      forecast: data.choices?.[0]?.message?.content || '',
      citations: data.citations || [],
      usage: data.usage
    };
  } catch (error) {
    console.error('Perplexity API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

**File: `src/services/grokAPI.js`**

Enhance the `generateTrendIdeas` function:

```javascript
export async function generateTrendIdeas(brandData, trendData, userHistory = null) {
  try {
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
            content: `You are an expert content strategist for ${brandData?.niche || 'content creators'}. Generate actionable, platform-specific content ideas with virality predictions.`
          },
          {
            role: 'user',
            content: `Based on these emerging trends: ${trendData}
            
            User profile:
            - Niche: ${brandData?.niche || 'general'}
            - Brand Voice: ${brandData?.brandVoice || 'professional'}
            - Industry: ${brandData?.industry || 'social media'}
            - Target Audience: ${brandData?.targetAudience || 'general'}
            ${userHistory ? `- Past Performance: ${userHistory}` : ''}
            
            Generate 3-5 actionable post ideas with:
            1. Virality score (0-100%) with risk factors
            2. Remix format (Reel script, carousel, story, etc.)
            3. Specific CTA aligned with brand
            4. Platform recommendation (Instagram/TikTok/LinkedIn)
            5. Optimal posting time for late October 2025
            
            Include audience/competitor signals and any algorithm shift warnings.`
          }
        ],
        temperature: 0.8,
      })
    });

    const data = await response.json();
    return {
      success: true,
      ideas: data.choices?.[0]?.message?.content || '',
      usage: data.usage
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

---

### 2. Add Tier Restrictions to Trend Forecaster

**File: `src/pages/TrendLab.jsx`**

Import and use subscription context:

```javascript
import { useSubscription } from '../context/SubscriptionContext';
import { saveTrendForecast, getLatestForecast } from '../config/supabase';
import { scheduleTrendMonitoring } from '../config/n8n';

// Inside component:
const { checkAndTrackUsage, userTier, TIERS, getUpgradeMessage } = useSubscription();

// Update handleForecastTrends:
const handleForecastTrends = async () {
  if (!brandData?.niche) {
    showToast('Please set your niche in Brand Voice first', 'warning');
    return;
  }

  // Check tier access
  const { allowed, reason } = await checkAndTrackUsage('trendForecasts', {
    niche: brandData.niche
  });

  if (!allowed) {
    if (reason === 'tier') {
      showToast(`Trend Forecaster requires Essentials or Pro plan. ${getUpgradeMessage('trendForecasts')}`, 'warning');
      // Show upgrade modal or redirect
      return;
    }
    if (reason === 'limit') {
      showToast('You\'ve reached your weekly forecast limit. Upgrade for more!', 'warning');
      return;
    }
  }

  setIsLoadingForecaster(true);
  try {
    // Check for cached forecast
    const cached = await getLatestForecast(userId, brandData.niche);
    if (cached.success && cached.data) {
      setTrendForecast(cached.data.forecast_data);
      showToast('Loaded recent forecast (refreshes daily)', 'info');
      setIsLoadingForecaster(false);
      return;
    }

    // Generate new forecast with enhanced prompts
    const perplexityResult = await forecastTrends(
      brandData.niche,
      '7 days starting from October 30, 2025',
      brandData.brandVoice,
      brandData.industry
    );

    if (perplexityResult.success) {
      const grokResult = await generateTrendIdeas(
        brandData,
        perplexityResult.forecast.substring(0, 1000),
        null // TODO: Add user history from Supabase
      );

      const forecastData = {
        rawForecast: perplexityResult.forecast,
        postIdeas: grokResult.success ? grokResult.ideas : 'Unable to generate post ideas.',
        citations: perplexityResult.citations,
        timeline: parseTrendTimeline(perplexityResult.forecast),
        generatedAt: new Date().toISOString(),
      };

      // Save to Supabase
      await saveTrendForecast(userId, {
        niche: brandData.niche,
        forecast_data: forecastData,
        timeline: forecastData.timeline,
        post_ideas: forecastData.postIdeas.split('\n'),
        citations: forecastData.citations,
      });

      setTrendForecast(forecastData);
      showToast('Trend forecast generated successfully!', 'success');
    } else {
      showToast('Failed to fetch trend forecast', 'error');
    }
  } catch (error) {
    console.error('Forecast error:', error);
    showToast('Error generating forecast', 'error');
  } finally {
    setIsLoadingForecaster(false);
  }
};

// Add "Set Alert" button handler
const handleSetTrendAlert = async () => {
  const result = await scheduleTrendMonitoring(userId, {
    niche: brandData.niche,
    frequency: 'daily',
    platforms: brandData.platforms || ['Instagram', 'TikTok'],
  });

  if (result.success) {
    showToast('Daily trend alerts activated! You\'ll receive notifications via email.', 'success');
  } else {
    showToast('Failed to set up alerts. Please try again.', 'error');
  }
};
```

Add tier badge to Trend Forecaster UI:

```jsx
<div className="flex items-center gap-2 mb-2">
  <h3 className="text-lg font-bold text-gray-900">Trend Forecaster</h3>
  <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">
    ESSENTIALS+
  </span>
</div>
```

---

### 3. Add Burnout Risk Gauge Card

**Create new file: `src/components/BurnoutGauge.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { Heart, AlertTriangle, CheckCircle } from 'lucide-react';
import { getUserActivity } from '../config/supabase';
import { useSubscription } from '../context/SubscriptionContext';
import { useToast } from '../context/ToastContext';

export default function BurnoutGauge() {
  const { userId } = useSubscription();
  const { showToast } = useToast();
  const [burnoutData, setBurnoutData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeBurnoutRisk();
  }, []);

  const analyzeBurnoutRisk = async () => {
    setLoading(true);
    try {
      // Get last 30 days of activity
      const { success, data } = await getUserActivity(userId, 30);
      
      if (!success) throw new Error('Failed to fetch activity');

      // Calculate burnout metrics
      const totalActions = data.length;
      const avgPerDay = totalActions / 30;
      const recentWeek = data.filter(a => {
        const date = new Date(a.created_at);
        return date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }).length;

      // Burnout risk calculation
      let risk = 'low';
      let riskScore = 0;
      let message = 'Great pace! You\'re maintaining healthy activity.';
      let color = 'green';

      if (avgPerDay > 15) {
        risk = 'high';
        riskScore = 85;
        message = 'High activity detected! Consider taking rest days.';
        color = 'red';
      } else if (avgPerDay > 10) {
        risk = 'medium';
        riskScore = 60;
        message = 'Moderate pace. Remember to schedule breaks.';
        color = 'orange';
      } else {
        riskScore = 25;
      }

      setBurnoutData({
        risk,
        riskScore,
        message,
        color,
        totalActions,
        avgPerDay: avgPerDay.toFixed(1),
        recentWeek,
        suggestions: generateRestSuggestions(risk),
      });

    } catch (error) {
      console.error('Burnout analysis error:', error);
      showToast('Unable to analyze activity. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateRestSuggestions = (risk) => {
    if (risk === 'high') {
      return [
        'Take 2-3 rest days this week',
        'Delegate content creation tasks',
        'Schedule "no-screen" time daily',
        'Consider batch-creating content for next week'
      ];
    }
    if (risk === 'medium') {
      return [
        'Take 1-2 rest days this week',
        'Set daily time limits for content work',
        'Practice the Pomodoro technique',
      ];
    }
    return [
      'Maintain your current pace',
      'Consider one planning day per week',
    ];
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Analyzing activity...</div>;
  }

  if (!burnoutData) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-full bg-${burnoutData.color}-100 flex items-center justify-center`}>
          <Heart className={`w-6 h-6 text-${burnoutData.color}-600`} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Burnout Risk Gauge</h3>
          <p className="text-sm text-gray-600">Based on your last 30 days</p>
        </div>
      </div>

      {/* Risk Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Risk Level</span>
          <span className={`text-sm font-bold text-${burnoutData.color}-600 uppercase`}>
            {burnoutData.risk}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full bg-${burnoutData.color}-500 transition-all duration-1000`}
            style={{ width: `${burnoutData.riskScore}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Avg Actions/Day</p>
          <p className="text-2xl font-bold text-gray-900">{burnoutData.avgPerDay}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Last 7 Days</p>
          <p className="text-2xl font-bold text-gray-900">{burnoutData.recentWeek}</p>
        </div>
      </div>

      {/* Message */}
      <div className={`p-4 bg-${burnoutData.color}-50 rounded-lg border border-${burnoutData.color}-200 mb-4`}>
        <p className={`text-sm text-${burnoutData.color}-800 font-medium`}>
          {burnoutData.message}
        </p>
      </div>

      {/* Suggestions */}
      <div>
        <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          Recovery Suggestions
        </h4>
        <ul className="space-y-2">
          {burnoutData.suggestions.map((suggestion, i) => (
            <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
              <span className="text-green-600">•</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

---

### 4. Add Content Gap Analysis Card

**Create new file: `src/components/ContentGapAnalysis.jsx`**

```jsx
import { useState } from 'react';
import { BarChart3, TrendingUp, AlertCircle } from 'lucide-react';
import { getSavedContent } from '../config/supabase';
import { getCaptionExamples } from '../services/perplexityAPI';
import { useSubscription } from '../context/SubscriptionContext';
import { useContext } from 'react';
import { BrandContext } from '../context/BrandContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from './LoadingSpinner';

export default function ContentGapAnalysis() {
  const { brandData } = useContext(BrandContext);
  const { userId, checkAndTrackUsage, userTier, TIERS } = useSubscription();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [gaps, setGaps] = useState(null);

  const analyzeGaps = async () => {
    // Check tier (Pro only)
    const { allowed } = await checkAndTrackUsage('contentGapAnalysis');
    
    if (!allowed) {
      showToast('Content Gap Analysis requires Pro plan. Upgrade to unlock!', 'warning');
      return;
    }

    setLoading(true);
    try {
      // Get user's saved content
      const { success, data: userContent } = await getSavedContent(userId, { limit: 50 });
      
      if (!success) throw new Error('Failed to fetch content');

      // Get trending formats from Perplexity
      const { success: trendsSuccess, examples } = await getCaptionExamples(
        'top performing content',
        brandData.niche
      );

      if (!trendsSuccess) throw new Error('Failed to fetch trends');

      // Analyze gaps (simplified - enhance with Grok API)
      const userFormats = [...new Set(userContent.map(c => c.type))];
      const trendingFormats = ['carousel', 'reel', 'story', 'long-form'];
      
      const missing = trendingFormats.filter(f => !userFormats.includes(f));
      
      setGaps({
        totalContent: userContent.length,
        formats: userFormats,
        missing,
        suggestions: missing.map(format => ({
          format,
          idea: `Create ${format} content about ${brandData.niche}`,
          priority: 'high',
        })),
      });

      showToast('Gap analysis complete!', 'success');
    } catch (error) {
      console.error('Gap analysis error:', error);
      showToast('Analysis failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Content Gap Analysis</h3>
            <p className="text-sm text-gray-600">Compare your library to trends</p>
          </div>
        </div>
        <span className="text-xs font-bold px-2 py-1 rounded bg-purple-100 text-purple-700">
          PRO ONLY
        </span>
      </div>

      <button
        onClick={analyzeGaps}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-semibold disabled:opacity-50 mb-4"
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" />
            <span>Analyzing...</span>
          </>
        ) : (
          <>
            <TrendingUp className="w-5 h-5" />
            <span>Run Analysis</span>
          </>
        )}
      </button>

      {gaps && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">Your Content</p>
              <p className="text-2xl font-bold">{gaps.totalContent}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">Missing Formats</p>
              <p className="text-2xl font-bold text-orange-600">{gaps.missing.length}</p>
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h4 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Content Gaps Detected
            </h4>
            <ul className="space-y-2">
              {gaps.suggestions.map((gap, i) => (
                <li key={i} className="text-sm text-orange-800">
                  • Missing: <strong>{gap.format}</strong> - {gap.idea}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 5. Add Huttle Agent Beta Teaser

**Create new file: `src/components/HuttleAgentTeaser.jsx`**

```jsx
import { useState } from 'react';
import { MessageSquare, Sparkles, Send } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { useContext } from 'react';
import { BrandContext } from '../context/BrandContext';
import { useToast } from '../context/ToastContext';

export default function HuttleAgentTeaser() {
  const { brandData } = useContext(BrandContext);
  const { userTier, TIERS } = useSubscription();
  const { showToast } = useToast();
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;

    setLoading(true);
    // Simulate AI response
    setTimeout(() => {
      setResponse(`Great idea! For "${message}" in ${brandData.niche || 'your niche'}, I'd suggest creating a carousel post with 5 slides covering:
      
1. Hook: Start with a bold question
2. Problem: What your audience struggles with
3. Solution: Your unique approach
4. Proof: Share a quick win
5. CTA: Drive them to your link

Want me to generate the full script?`);
      setLoading(false);
      showToast('Huttle Agent responds! Upgrade to Pro for full access.', 'info');
    }, 1500);
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-sm border-2 border-purple-200 p-6 hover:shadow-lg transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Huttle Agent Beta</h3>
            <p className="text-sm text-purple-600">Your AI Co-Pilot (Coming Soon!)</p>
          </div>
        </div>
        <span className="text-xs font-bold px-2 py-1 rounded bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700">
          BETA
        </span>
      </div>

      <p className="text-sm text-gray-700 mb-4">
        Chat with Huttle Agent for instant strategy help. Try a preview below!
      </p>

      {/* Chat Preview */}
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="e.g., Need ideas for a fitness challenge post"
            className="flex-1 p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {loading && (
          <div className="p-4 bg-white rounded-lg border border-purple-200 animate-pulse">
            <p className="text-sm text-gray-500">Huttle Agent is thinking...</p>
          </div>
        )}

        {response && !loading && (
          <div className="p-4 bg-white rounded-lg border border-purple-200">
            <div className="flex items-start gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 whitespace-pre-line">{response}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-purple-200">
        <button className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold">
          Upgrade to Pro for Full Access
        </button>
      </div>
    </div>
  );
}
```

---

## 📦 Integration Steps

### Add New Components to AI Power Tools Page

**File: `src/pages/AITools.jsx`**

Add imports:
```javascript
import BurnoutGauge from '../components/BurnoutGauge';
import ContentGapAnalysis from '../components/ContentGapAnalysis';
import HuttleAgentTeaser from '../components/HuttleAgentTeaser';
```

Add to the end of the page (before closing div):
```jsx
{/* New Cards Row */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
  <BurnoutGauge />
  <ContentGapAnalysis />
  <HuttleAgentTeaser />
</div>
```

---

## 🧪 Testing Checklist

After implementing:

- [ ] Trend Forecaster shows tier badge
- [ ] Essentials/Pro users can generate forecasts
- [ ] Free users see upgrade prompt
- [ ] Forecasts save to Supabase
- [ ] Burnout Gauge shows activity data
- [ ] Content Gap Analysis requires Pro
- [ ] Huttle Agent teaser chat works
- [ ] All tools track usage in Supabase
- [ ] n8n webhooks trigger (if configured)

---

## 🎯 Quick Wins

If you're short on time, prioritize:

1. ✅ Tier restrictions on Trend Forecaster
2. ✅ Burnout Gauge (easiest, all tiers)
3. ✅ Huttle Agent teaser (high impact, low effort)
4. Content Gap Analysis (Pro only, can come later)

---

## 📞 Next Steps

1. Install `@supabase/supabase-js` package
2. Set up Supabase database (follow SUPABASE-N8N-SETUP.md)
3. Add environment variables
4. Implement the code changes above
5. Test each feature
6. Deploy!

**Questions?** Check the comprehensive docs:
- `SUPABASE-N8N-SETUP.md` - Database setup
- `AI-FEATURES-GUIDE.md` - Original feature docs
- `IMPLEMENTATION-SUMMARY.md` - What's already done

---

**Status:** 80% Complete - Just these enhancements left!
**Estimated Time:** 2-4 hours for full implementation
**Priority:** High - Adds tier monetization + key differentiators

