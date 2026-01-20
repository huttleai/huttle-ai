/**
 * Demo Mode Mock Data Service
 * 
 * Provides realistic fitness-themed mock data for marketing demos
 * when VITE_DEMO_MODE=true or when API calls fail.
 * 
 * All mock data is fitness-themed for Iron Peak Fitness demo instance.
 */

// Check if demo mode is enabled
export const isDemoMode = () => {
  return import.meta.env.VITE_DEMO_MODE === 'true';
};

// Simulate API delay for realistic demo experience
export const simulateDelay = (minMs = 800, maxMs = 1500) => {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Randomize array and pick N items
const pickRandom = (array, count) => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// ============================================================================
// CAPTION GENERATOR MOCKS
// ============================================================================

const captionMocksShort = [
  "Your only competition is yesterday's you. 💪",
  "Sweat now, shine later. Every rep counts! 🔥",
  "Strong is the new beautiful. ✨",
  "No excuses. Just results. 💯",
  "Rise and grind. Your future self will thank you. 🌅",
  "Progress, not perfection. Keep moving forward. 🚀",
  "Train insane or remain the same. 🏋️",
  "Your body can stand almost anything. It's your mind you have to convince. 🧠",
];

const captionMocksMedium = [
  "Transformation doesn't happen overnight. It happens through daily habits, consistent effort, and believing in yourself even when progress feels slow. 💪 Keep pushing—you're closer than you think!\n\n#FitnessJourney #Motivation",
  
  "Home workouts hitting different today! 🏠🔥 You don't need a fancy gym to get results. All you need is dedication, a little space, and the willingness to show up for yourself every single day.\n\n#HomeWorkout #NoExcuses",
  
  "Meal prep Sunday is self-care Sunday. 🥗 Taking 2 hours today saves me 10+ hours this week. Plus, I actually eat healthy when it's already done! Who else is team meal prep?\n\n#MealPrep #HealthyEating",
  
  "Rest days aren't lazy days—they're growth days. 😴 Your muscles repair and grow stronger when you give them time to recover. Listen to your body and trust the process.\n\n#RestDay #Recovery",
  
  "6 months ago, I couldn't do a single pull-up. Today? I did 10. 🎯 The secret? Showing up even when I didn't feel like it. Your consistency will always beat perfection.\n\n#ProgressNotPerfection #FitnessGoals",
];

const captionMocksLong = [
  "Let me tell you something about fitness that took me years to understand... 🧵\n\nIt's not about being the strongest person in the gym. It's not about having the perfect diet or never missing a workout.\n\nIt's about showing up for yourself, day after day, even when motivation is nowhere to be found. It's about choosing progress over perfection and understanding that small steps lead to massive transformations.\n\nI used to think I needed to completely overhaul my life to get fit. Turns out, I just needed to start with one pushup. Then two. Then ten.\n\nThree years later, fitness isn't something I do—it's who I am. 💪\n\nWhat's one small step you can take TODAY toward your goals? Drop it in the comments! 👇\n\n#FitnessJourney #Transformation #Mindset #HealthyLifestyle",
  
  "The workout that changed everything for me... 🔥\n\nI was stuck in a plateau for MONTHS. Same weight, same strength, same frustration. Then I discovered this simple principle:\n\nProgressive overload + proper recovery = unstoppable gains.\n\nHere's what I changed:\n✅ Added 2.5lbs every week (small but consistent)\n✅ Prioritized 7-8 hours of sleep\n✅ Started tracking my protein intake\n✅ Took rest days seriously instead of feeling guilty\n\nThe result? I broke through my plateau in just 6 weeks and hit PRs I never thought possible.\n\nRemember: Your body adapts to what you consistently do. Challenge it, fuel it, rest it, repeat. 🚀\n\nSave this post and tag someone who needs to hear this! 💬\n\n#FitnessTips #Gains #WorkoutMotivation #GymLife #StrengthTraining",
  
  "Real talk about my fitness journey... 📖\n\nI didn't start because I loved working out. I started because I was tired of being tired. Tired of feeling uncomfortable in my own skin. Tired of making excuses.\n\nThe first month was HARD. I wanted to quit every single day. But I made a promise to myself: just show up. Even if it's for 10 minutes. Even if I'm not feeling it.\n\nSomething magical happened around month 3. It stopped being a chore and started being MY time. My therapy. My meditation.\n\nNow, 2 years later, I can't imagine my life without it. The physical changes are great, but the mental transformation? That's the real gift. 🎁\n\nTo everyone just starting: I see you. I believe in you. And I promise—if you stick with it, you'll thank yourself a year from now.\n\nWhat's YOUR fitness story? Share below! 👇❤️\n\n#FitnessMotivation #TransformationStory #MentalHealth #SelfImprovement",
];

export const getCaptionMocks = (length = 'medium', count = 4) => {
  let pool;
  switch (length) {
    case 'short':
      pool = captionMocksShort;
      break;
    case 'long':
      pool = captionMocksLong;
      break;
    default:
      pool = captionMocksMedium;
  }
  return pickRandom(pool, Math.min(count, pool.length));
};

// ============================================================================
// HASHTAG GENERATOR MOCKS
// ============================================================================

const hashtagMocks = [
  { tag: '#FitnessMotivation', score: 94, posts: '45.2M' },
  { tag: '#GymLife', score: 91, posts: '38.7M' },
  { tag: '#WorkoutRoutine', score: 88, posts: '12.4M' },
  { tag: '#FitFam', score: 86, posts: '52.1M' },
  { tag: '#HealthyLifestyle', score: 85, posts: '28.9M' },
  { tag: '#StrengthTraining', score: 82, posts: '8.3M' },
  { tag: '#HomeWorkout', score: 78, posts: '11.2M' },
  { tag: '#FitLife', score: 76, posts: '19.4M' },
  { tag: '#GymMotivation', score: 89, posts: '22.1M' },
  { tag: '#FitnessGoals', score: 84, posts: '15.8M' },
  { tag: '#WorkoutOfTheDay', score: 81, posts: '9.7M' },
  { tag: '#TransformationTuesday', score: 79, posts: '6.2M' },
  { tag: '#LegDay', score: 77, posts: '14.3M' },
  { tag: '#GainsDaily', score: 75, posts: '4.8M' },
  { tag: '#FitnessCommunity', score: 73, posts: '7.1M' },
];

export const getHashtagMocks = (count = 10) => {
  return pickRandom(hashtagMocks, Math.min(count, hashtagMocks.length))
    .sort((a, b) => b.score - a.score);
};

// ============================================================================
// HOOK BUILDER MOCKS
// ============================================================================

const hookMocks = [
  { text: "Stop doing crunches if you want abs.", theme: "Shocking Statement" },
  { text: "What if everything you knew about cardio was wrong?", theme: "Question" },
  { text: "I lost 30 pounds eating pizza every week.", theme: "Story" },
  { text: "97% of people fail their fitness goals. Here's why.", theme: "Statistic" },
  { text: "The workout that changed my life in 15 minutes...", theme: "Teaser" },
  { text: "Your trainer is lying to you about protein.", theme: "Shocking Statement" },
  { text: "What happens when you work out for 30 days straight?", theme: "Question" },
  { text: "I went from couch potato to marathon runner. Here's how.", theme: "Story" },
  { text: "Only 3% of gym members actually see results.", theme: "Statistic" },
  { text: "The secret exercise that transformed my body...", theme: "Teaser" },
  { text: "Forget everything you know about weight loss.", theme: "Shocking Statement" },
  { text: "Why do fit people wake up at 5 AM?", theme: "Question" },
];

export const getHookMocks = (theme = null, count = 5) => {
  let pool = hookMocks;
  if (theme && theme !== 'all') {
    pool = hookMocks.filter(h => h.theme.toLowerCase().includes(theme.toLowerCase()));
    if (pool.length < count) pool = hookMocks; // Fallback if not enough
  }
  return pickRandom(pool, Math.min(count, pool.length));
};

// ============================================================================
// CTA SUGGESTER MOCKS
// ============================================================================

const ctaMocks = {
  engagement: [
    "Drop a 💪 if you're working out today!",
    "What's YOUR favorite exercise? Comment below 👇",
    "Tag your workout partner who needs to see this!",
    "Double tap if you agree! ❤️",
    "Save this for your next workout! 📌",
    "Which one are you trying first? 1, 2, or 3?",
  ],
  sales: [
    "Link in bio for my free workout guide! 📲",
    "DM me 'FIT' for coaching info!",
    "Click the link to start your transformation!",
    "Limited spots available—grab yours now! ⚡",
    "Get 20% off with code STRONG20!",
  ],
  dms: [
    "DM 'START' for a personalized plan!",
    "Message me your biggest fitness struggle!",
    "DM 'READY' to join our challenge!",
    "Send me 'GOALS' and let's chat about your journey!",
    "DM me 'HELP' for a free consultation!",
  ],
  general: [
    "Follow for daily fitness tips! 🔔",
    "Share this with someone who needs motivation!",
    "Turn on post notifications to never miss a tip!",
    "Comment 'YES' if you're ready to transform!",
    "What topic should I cover next?",
  ],
};

export const getCTAMocks = (goal = 'general', count = 5) => {
  // Determine which pool to use based on goal keywords
  let pool = ctaMocks.general;
  const goalLower = goal.toLowerCase();
  
  if (goalLower.includes('engagement') || goalLower.includes('comment') || goalLower.includes('like')) {
    pool = ctaMocks.engagement;
  } else if (goalLower.includes('sale') || goalLower.includes('buy') || goalLower.includes('link')) {
    pool = ctaMocks.sales;
  } else if (goalLower.includes('dm') || goalLower.includes('message') || goalLower.includes('chat')) {
    pool = ctaMocks.dms;
  }
  
  return pickRandom(pool, Math.min(count, pool.length));
};

// ============================================================================
// CONTENT QUALITY SCORER MOCKS
// ============================================================================

const scorerSuggestions = [
  "Add a specific number or timeframe to create urgency",
  "Include a question to boost comments",
  "Consider adding more line breaks for readability",
  "Add 2-3 relevant emojis for visual appeal",
  "End with a clear call-to-action",
  "Start with a stronger hook to stop the scroll",
  "Include social proof or a personal story",
  "Use power words like 'transform', 'discover', 'secret'",
  "Add hashtags to increase discoverability",
  "Consider adding a poll or question sticker",
];

export const getContentScoreMock = (content) => {
  // Generate semi-random but realistic scores based on content length
  const contentLength = content?.length || 0;
  const hasEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]/u.test(content);
  const hasQuestion = content?.includes('?');
  const hasHashtag = content?.includes('#');
  const hasCTA = /comment|share|follow|tap|click|dm|link/i.test(content);
  
  // Base scores with some randomness
  let hookScore = Math.floor(Math.random() * 15) + 70;
  let engagementScore = Math.floor(Math.random() * 15) + 65;
  let ctaScore = Math.floor(Math.random() * 15) + 70;
  let readabilityScore = Math.floor(Math.random() * 15) + 68;
  
  // Adjust based on content analysis
  if (hasEmoji) engagementScore += 5;
  if (hasQuestion) engagementScore += 8;
  if (hasHashtag) engagementScore += 3;
  if (hasCTA) ctaScore += 10;
  if (contentLength > 100 && contentLength < 500) readabilityScore += 5;
  if (contentLength > 500) readabilityScore -= 5;
  
  // Cap scores at 100
  hookScore = Math.min(hookScore, 100);
  engagementScore = Math.min(engagementScore, 100);
  ctaScore = Math.min(ctaScore, 100);
  readabilityScore = Math.min(readabilityScore, 100);
  
  const overall = Math.round((hookScore + engagementScore + ctaScore + readabilityScore) / 4);
  
  // Pick relevant suggestions
  const suggestions = pickRandom(scorerSuggestions, 4);
  
  return {
    overall,
    breakdown: {
      hook: hookScore,
      engagement: engagementScore,
      cta: ctaScore,
      readability: readabilityScore,
    },
    suggestions,
    details: {
      hook: hookScore >= 80 ? "Strong opening that creates curiosity" : "Consider a more attention-grabbing opening",
      engagement: engagementScore >= 80 ? "Good use of engagement triggers" : "Add questions or interactive elements",
      cta: ctaScore >= 80 ? "Clear call-to-action" : "Add a clearer call-to-action",
      readability: readabilityScore >= 80 ? "Good length and formatting" : "Consider adjusting length or adding line breaks",
    }
  };
};

// ============================================================================
// VISUAL BRAINSTORMER MOCKS
// ============================================================================

const visualIdeaMocks = [
  {
    title: "Before/After Transformation Split",
    description: "Side-by-side comparison showing dramatic fitness transformation with consistent lighting and pose",
    style: "Clean, high-contrast photography with minimal text overlay",
    type: "carousel",
  },
  {
    title: "Workout Demo Reel",
    description: "Quick-cut video showing proper form for 5 exercises with text overlays naming each move",
    style: "Dynamic transitions, upbeat music, bold typography",
    type: "reel",
  },
  {
    title: "Motivational Quote Graphic",
    description: "Powerful fitness quote on gradient background with gym equipment silhouette",
    style: "Minimalist design with bold sans-serif typography",
    type: "image",
  },
  {
    title: "Day in the Life Vlog",
    description: "Follow-along content showing morning routine, meals, and workout in authentic style",
    style: "Raw, authentic footage with natural lighting",
    type: "video",
  },
  {
    title: "Meal Prep Carousel",
    description: "Step-by-step guide showing weekly meal prep with macros and recipes",
    style: "Bright, appetizing food photography with clean layouts",
    type: "carousel",
  },
  {
    title: "Progress Timeline",
    description: "Monthly progress photos arranged in timeline format showing gradual transformation",
    style: "Consistent framing with date stamps and milestone markers",
    type: "carousel",
  },
];

export const getVisualIdeaMocks = (platform = 'instagram', count = 4) => {
  const ideas = pickRandom(visualIdeaMocks, Math.min(count, visualIdeaMocks.length));
  return ideas.map(idea => ({
    ...idea,
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
  }));
};

// ============================================================================
// EXPORT ALL MOCK GENERATORS
// ============================================================================

export default {
  isDemoMode,
  simulateDelay,
  getCaptionMocks,
  getHashtagMocks,
  getHookMocks,
  getCTAMocks,
  getContentScoreMock,
  getVisualIdeaMocks,
};


