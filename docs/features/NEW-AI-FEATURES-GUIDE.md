# New AI Features Guide

## Overview

Three powerful new AI features have been added to enhance content creation:

1. **AI Visual Brainstormer** - Generate creative visual content concepts
2. **Content Repurposer** - Transform content across formats and platforms
3. **Voice Idea Spark** - Voice-to-text content ideation in Huttle Agent

## 1. AI Visual Brainstormer

### Location
AI Power Tools page (new tool card)

### Access
- ✅ Free tier
- ✅ Essentials tier  
- ✅ Pro tier

### How It Works

1. **Input**: Describe your visual concept (e.g., "futuristic coffee shop interior")
2. **Process**: Grok API generates 5 detailed visual ideas
3. **Output**: Concept descriptions with:
   - Title
   - Description (2-3 sentences)
   - Visual style (e.g., "cinematic 4K", "watercolor illustration")
   - Platform recommendation
   - Content type (image/video/carousel)

### Features

- **AI-Generated Concepts**: Not actual images - descriptions for use in Midjourney, DALL-E, etc.
- **Platform Optimization**: Suggests best platform for each concept
- **Style Guidance**: Detailed aesthetic direction
- **Copy & Save**: Easy export to Content Library
- **Niche Personalization**: Uses user profile data for relevant suggestions

### Usage Example

```javascript
// Input
visualPrompt = "Sunset yoga session on beach with ocean waves"

// Output (5 concepts like)
{
  title: "Zen Beach Yoga - Golden Hour",
  description: "Silhouette of yogi in warrior pose with dramatic sunset backdrop...",
  style: "Cinematic 4K with warm golden tones and lens flare",
  platform: "Instagram",
  type: "image"
}
```

### Integration with External Tools

Export concepts to:
- **Midjourney** (Discord bot)
- **DALL-E 3** (ChatGPT Plus)
- **Leonardo.ai**
- **Stable Diffusion**

### Limits

Counts toward monthly AI generation limit:
- Free: 20 gens/month
- Essentials: 300 gens/month
- Pro: 800 gens/month

---

## 2. Content Repurposer

### Location
New page in sidebar (AI Tools section, between Trend Lab and Huttle Agent)

### Access
- ❌ Free tier (locked)
- ❌ Essentials tier (locked)
- ✅ **Pro tier only**

### How It Works

1. **Input**: Paste original content
2. **Select Format**: Choose conversion (e.g., Reel → Story)
3. **Choose Platform**: Target platform for optimization
4. **Process**: Grok API repurposes content
5. **Output**: Optimized content with hashtags, tips, and hooks

### Format Conversions

| From | To | Description |
|------|-----|-------------|
| Reel | Story | Condense to story highlights |
| Reel | Thread | Break down video into text |
| Story | Reel | Expand into full reel |
| Post | Carousel | Split into slides |
| Long-form | Shorts | Extract key moments |
| Thread | Post | Combine into single post |
| Video | Captions | Generate from transcript |

### Platform Optimizations

Each platform has unique optimization:

| Platform | Max Length | Tone | Hashtags |
|----------|-----------|------|----------|
| Instagram | 2200 chars | Visual-first | 30 |
| TikTok | 300 chars | Casual-trendy | 5 |
| X (Twitter) | 280 chars | Concise | 3 |
| Facebook | 5000 chars | Conversational | 5 |
| YouTube | 5000 chars | Informative | 15 |
| LinkedIn | 3000 chars | Professional | 5 |

### Output Includes

1. **Optimized Content** - Reformatted for target platform
2. **Hashtags** - Platform-appropriate tags
3. **Platform Tips** - Best practices for that platform
4. **Engagement Hooks** - Suggested openers/CTAs

### Personalization

Uses user_profile data:
- **Niche**: Tailors content to user's niche
- **Target Audience**: Adjusts tone for audience
- **Content Goals**: Aligns with user's objectives

### Actions

- **Copy**: Copy content + hashtags to clipboard
- **Save**: Save to Content Library
- **Schedule**: Send to Smart Calendar for scheduling

### Tier Gating

Shows upgrade modal for Free/Essentials users:

```jsx
if (!isPro) {
  setShowUpgradeModal(true);
  return;
}
```

---

## 3. Voice Idea Spark

### Location
Huttle Agent page (chat interface)

### Access
- ❌ Free tier (mic button disabled with tooltip)
- ❌ Essentials tier (mic button disabled)
- ✅ **Pro tier only**

### How It Works

1. **Click Mic Button**: Start voice recording
2. **Speak Naturally**: Ramble your ideas
3. **Transcription**: Web Speech API converts to text
4. **AI Processing**: Grok turns rambling into structured outlines
5. **Actionable Output**: Organized post ideas

### Technology

**Web Speech API** (Browser-based)
- `window.SpeechRecognition` or `window.webkitSpeechRecognition`
- Continuous recognition
- Interim results shown in real-time
- Final transcript sent to AI

### Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full |
| Edge | ✅ Full |
| Safari | ✅ Full (iOS 14.5+) |
| Firefox | ❌ Limited |

### Features

- **Real-Time Transcription**: See your words as you speak
- **Continuous Recording**: Speak for as long as needed
- **Error Handling**: Permission requests and fallbacks
- **Context-Aware**: Integrates with user profile data

### Chat Interface

Transformed Huttle Agent from "Coming Soon" to fully functional:

```jsx
<VoiceRecorder
  onTranscript={handleVoiceTranscript}
  disabled={!isPro}
/>
```

### Conversation Flow

1. User clicks mic → starts recording (red pulsing button)
2. User speaks → interim text shows in input field
3. User clicks stop → final transcript sent as message
4. Huttle Agent responds with structured ideas

### Example Use Case

**User speaks**: "I want to post about healthy meal prep but I'm not sure how to make it interesting maybe share some tips about saving time and money"

**Huttle Agent responds**:
```
Great idea! Here's a structured approach:

1. Hook: "Stop wasting $200/week on takeout"
2. Main Content: 5-day meal prep guide
3. Time-saving tips:
   - Batch cook proteins Sunday
   - Pre-chop vegetables
   - Use mason jars for salads
4. Money-saving angle: Cost breakdown comparison
5. CTA: "Save this for your next meal prep session!"

Would you like me to turn this into a full caption?
```

### Pro Gating

Voice button disabled for Free/Essentials with upgrade prompt:

```jsx
if (!isPro) {
  setShowUpgradeModal(true);
  return;
}
```

---

## AI Generation Tracking

All three features count toward monthly AI generation limits:

### Implementation

```javascript
// Before generation
if (!checkAIUsage()) return;

// After successful generation
incrementAIUsage();

// Update in Supabase
localStorage.setItem('aiGensUsed', newUsage.toString());
```

### Limits

| Tier | Monthly Gens |
|------|-------------|
| Free | 20 |
| Essentials | 300 |
| Pro | 800 |

### Reset Logic

Resets on user's subscription anniversary:

```javascript
if (shouldResetAIUsage(subscriptionStartDate, lastResetDate)) {
  setAiGensUsed(0);
  showToast('Your AI usage limit has been reset! 🎉', 'success');
}
```

---

## Integration with User Profile

All features leverage onboarding quiz data:

```javascript
const niche = userProfile?.niche || 'general';
const audience = userProfile?.target_audience || 'general audience';
const goals = userProfile?.content_goals?.join(', ') || 'engagement';
```

This personalizes:
- Visual brainstorm suggestions
- Content repurposing tone
- Huttle Agent responses

---

## UI Components

### Feature Lock Overlay

```jsx
{isAILocked && <AIFeatureLock used={aiGensUsed} limit={aiGensLimit} />}
```

Shows when user reaches monthly limit.

### Upgrade Modal

```jsx
<UpgradeModal
  isOpen={showUpgradeModal}
  onClose={() => setShowUpgradeModal(false)}
  feature="Content Repurposer"
/>
```

Appears when non-Pro user tries Pro feature.

### Pro Badge

```jsx
<div className="flex items-center gap-1">
  <Crown className="w-4 h-4 text-white" />
  <span className="text-xs font-bold">PRO</span>
</div>
```

Shows on Pro-only features in sidebar.

---

## Error Handling

All features include comprehensive error handling:

```javascript
try {
  // API call
} catch (error) {
  console.error('Error:', error);
  addToast('Failed to generate. Please try again.', 'error');
  // Fallback logic
} finally {
  setIsLoading(false);
}
```

---

## Testing

### Visual Brainstormer
1. Navigate to AI Power Tools
2. Click "Visual Brainstormer" tool
3. Enter prompt: "modern minimalist home office"
4. Click "Generate Visual Ideas"
5. Verify 5 concepts appear with styles

### Content Repurposer
1. Navigate to Content Repurposer (sidebar)
2. Paste reel script
3. Select "Reel → Story"
4. Choose "Instagram"
5. Click "Repurpose Content"
6. Verify optimized output

### Voice Idea Spark
1. Navigate to Huttle Agent
2. Click microphone button (Pro only)
3. Speak: "I need post ideas about productivity hacks"
4. Click stop
5. Verify AI response with structured ideas

---

## Future Enhancements

1. **Image Generation**: Integrate DALL-E API directly
2. **Bulk Repurposing**: Process multiple posts at once
3. **Voice Commands**: "Generate 5 captions" via voice
4. **Multi-Language**: Support for non-English content
5. **Team Collaboration**: Share repurposed content with team

---

## Documentation

- See `/docs/features/PUBLISH-FLOW-GUIDE.md` for publishing
- See `/docs/setup/supabase-user-profile-schema.sql` for database
- See `src/components/VoiceRecorder.jsx` for voice implementation

