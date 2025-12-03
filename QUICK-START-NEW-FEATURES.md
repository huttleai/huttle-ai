# Quick Start: New Features

## 🎯 For Users

### 1. First-Time Login → Onboarding Quiz

**What happens**: 6-step personalization quiz  
**Duration**: ~2 minutes  
**Can skip**: No (required for personalization)  

**Steps**:
1. Select your content niche
2. Choose target audience
3. Pick content goals
4. Set posting frequency
5. Select platforms you use
6. Choose brand voice

**After completion**: Never shown again, powers all AI personalization

---

### 2. Publishing Content → Deep Links

**Location**: Smart Calendar → Day View → "Publish Now"

**How to use**:
1. Click "Publish Now" on any scheduled post
2. Select platform (Instagram, Facebook, TikTok, YouTube, X)
3. Review caption and hashtags
4. Click "Publish Now"

**On mobile**: Native app opens with pre-filled content  
**On desktop**: Caption copied + web version opens

---

### 3. AI Visual Brainstormer

**Location**: AI Power Tools → "Visual Brainstormer" tool  
**Tier**: All (Free, Essentials, Pro)

**How to use**:
1. Describe your visual concept (e.g., "sunset yoga on beach")
2. Click "Generate Visual Ideas"
3. Get 5 detailed concepts with styles
4. Copy descriptions for Midjourney/DALL-E

**Output**: Concept descriptions, NOT actual images

---

### 4. Content Repurposer

**Location**: Sidebar → "Content Repurposer"  
**Tier**: Pro only

**How to use**:
1. Paste your original content
2. Select format conversion (e.g., Reel → Story)
3. Choose target platform (Instagram, TikTok, etc.)
4. Click "Repurpose Content"
5. Get optimized content + hashtags + tips

**Conversions**:
- Reel → Story/Thread
- Post → Carousel
- Video → Captions
- And more!

---

### 5. Voice Idea Spark (Huttle Agent)

**Location**: Huttle Agent → Mic button  
**Tier**: Pro only

**How to use**:
1. Open Huttle Agent from sidebar
2. Click microphone button (red = recording)
3. Speak your ideas naturally
4. Click stop (square button)
5. AI structures your rambling into actionable posts

**Tip**: Speak conversationally, don't worry about structure

---

## 🔧 For Developers

### Setup (5 minutes)

```bash
# 1. Run SQL files in Supabase
cat docs/setup/supabase-user-profile-schema.sql | supabase db execute
cat docs/setup/supabase-user-publishes-schema.sql | supabase db execute

# 2. Set environment variables
VITE_GROK_API_KEY=your_key
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key

# 3. Deploy
vercel --prod
```

### Key Files

**New Components**:
- `src/components/PublishModal.jsx` - Deep link publishing
- `src/components/OnboardingQuiz.jsx` - 6-step quiz
- `src/components/VoiceRecorder.jsx` - Voice recording
- `src/components/FeatureAccessList.jsx` - Tier comparison

**New Pages**:
- `src/pages/ContentRepurposer.jsx` - Content transformation
- `src/pages/HuttleAgent.jsx` - Chat with voice (rewritten)

**Modified Files**:
- `src/pages/AITools.jsx` - Added Visual Brainstormer
- `src/pages/SmartCalendar.jsx` - Added Publish button
- `src/context/AuthContext.jsx` - User profile integration
- `src/config/supabase.js` - Updated tier limits

### Testing Deep Links (Mobile)

```javascript
// iOS Safari
instagram://library?AssetPath=URL&text=CAPTION

// Android Chrome
snssdk1233://upload?video=URL&text=CAPTION

// Fallback (both)
if (!opened) {
  window.open('https://instagram.com/create');
  navigator.clipboard.writeText(caption);
}
```

### Testing Voice Recording

```javascript
// Check browser support
const SpeechRecognition = 
  window.SpeechRecognition || 
  window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  console.error('Speech API not supported');
}
```

### Tier Gating Check

```javascript
import { canAccessFeature } from '../config/supabase';

// Check if user can access feature
const hasAccess = canAccessFeature('content-repurposer', userTier);

if (!hasAccess) {
  setShowUpgradeModal(true);
  return;
}
```

---

## 📊 Tier Limits Quick Reference

| Feature | Free | Essentials | Pro |
|---------|------|-----------|-----|
| AI Gens/mo | 20 | 300 | 800 |
| Visual Brainstormer | ✅ | ✅ | ✅ |
| Content Repurposer | ❌ | ❌ | ✅ |
| Voice Idea Spark | ❌ | ❌ | ✅ |
| Huttle Agent | ❌ | ❌ | ✅ |

---

## 🐛 Common Issues

### "Publish button not working"
- Check if post has caption/hashtags
- Verify Supabase signed URLs are valid
- Test on different browser

### "Voice button disabled"
- Requires Pro tier
- Check browser support (Chrome/Safari work best)
- Verify microphone permissions

### "Onboarding keeps showing"
- Check `user_profile` table exists
- Verify RLS policies
- Confirm `quiz_completed_at` is set

### "Repurposer locked"
- Requires Pro tier
- Shows upgrade modal
- Check subscription status

---

## 📚 Full Documentation

- **Publish Flow**: `/docs/features/PUBLISH-FLOW-GUIDE.md`
- **AI Features**: `/docs/features/NEW-AI-FEATURES-GUIDE.md`
- **Implementation**: `/IMPLEMENTATION-COMPLETE-PIVOT.md`
- **Deployment**: `/DEPLOYMENT-READY.md`

---

## 🎉 That's It!

**Everything is ready to go. Deploy and test!**

