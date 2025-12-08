/**
 * Mock Data for Huttle AI
 * Provides realistic, "lived-in" data for development and testing.
 */

// No icon imports needed - icons are handled by components

// --- HELPER FUNCTIONS ---

/**
 * Generates a date relative to today
 * @param {number} offsetDays - Number of days to offset (positive for future, negative for past)
 * @returns {string} Date string in YYYY-MM-DD format
 */
const getDate = (offsetDays) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
};

/**
 * Generates a realistic schedule of dates based on distribution:
 * 20% past (last 7 days), 10% today, 70% future (next 30 days)
 * @param {number} count - Number of dates to generate
 * @returns {Array<string>} Array of date strings
 */
const generateRealisticDates = (count) => {
  const dates = [];
  const pastCount = Math.floor(count * 0.2);
  const todayCount = Math.floor(count * 0.1);
  const futureCount = count - pastCount - todayCount;

  // Past dates (last 7 days)
  for (let i = 0; i < pastCount; i++) {
    const daysAgo = Math.floor(Math.random() * 7) + 1;
    dates.push(getDate(-daysAgo));
  }

  // Today's dates
  for (let i = 0; i < todayCount; i++) {
    dates.push(getDate(0));
  }

  // Future dates (next 30 days)
  for (let i = 0; i < futureCount; i++) {
    const daysFuture = Math.floor(Math.random() * 30) + 1;
    dates.push(getDate(daysFuture));
  }

  return dates.sort(); // Sort chronologically
};

// --- DATA CONSTANTS ---

export const STATUS_COLORS = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
  scheduled: { bg: 'bg-blue-50', text: 'text-huttle-primary', border: 'border-blue-100' },
  ready: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' },
  posted: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
  active: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' }
};

// --- MOCK DATA ---

// 1. Scheduled Posts
const postDates = generateRealisticDates(25);

export const mockScheduledPosts = [
  // Past Posts (Posted/Failed)
  {
    id: 'post-001',
    title: 'Product Launch Announcement',
    caption: '🚀 We are officially LIVE! After months of hard work, our new AI-powered analytics dashboard is finally here. Check the link in bio to start your free trial today! #ProductLaunch #SaaS #AI',
    hashtags: '#ProductLaunch #SaaS #AI #StartupLife #TechNews',
    keywords: 'product launch, analytics, dashboard',
    platforms: ['Instagram', 'X'],
    contentType: 'Image Post',
    imagePrompt: 'Futuristic dashboard interface glowing on a laptop screen',
    media: [],
    scheduledDate: postDates[0],
    scheduledTime: '09:00',
    status: 'posted',
    analytics: { likes: 12450, comments: 342, shares: 890, impressions: 45000 },
    createdAt: getDate(-10),
    updatedAt: getDate(-8),
    timezone: 'America/New_York'
  },
  {
    id: 'post-002',
    title: '5 SEO Tips',
    caption: 'Stop guessing with SEO. Here are 5 quick wins you can implement today:\n1. Update meta descriptions\n2. Compress images\n3. Fix broken links\n4. Use internal linking\n5. Optimize for mobile\n\nWhich one are you struggling with? 👇',
    hashtags: '#SEO #MarketingTips #DigitalMarketing #SmallBusiness',
    keywords: 'SEO, marketing tips',
    platforms: ['Facebook', 'Instagram'],
    contentType: 'Carousel',
    imagePrompt: '',
    media: [],
    scheduledDate: postDates[1],
    scheduledTime: '14:30',
    status: 'posted',
    analytics: { likes: 89, comments: 12, shares: 5, impressions: 1200 },
    createdAt: getDate(-9),
    updatedAt: getDate(-9),
    timezone: 'America/New_York'
  },
  {
    id: 'post-003',
    title: 'Why I Quit My Job',
    caption: 'It wasn’t an easy decision, but it was necessary. Sometimes you have to leap to fly. Here’s why I left my 9-5 to build my own agency... 🧵',
    hashtags: '#Entrepreneurship #AgencyLife #CareerGrowth #RiskTaking',
    keywords: 'entrepreneurship, career story',
    platforms: ['X'],
    contentType: 'Text Post',
    imagePrompt: '',
    media: [],
    scheduledDate: postDates[2],
    scheduledTime: '10:15',
    status: 'posted',
    analytics: { likes: 340, comments: 45, shares: 120, impressions: 8900 },
    createdAt: getDate(-8),
    updatedAt: getDate(-8),
    timezone: 'America/New_York'
  },
  {
    id: 'post-004',
    title: 'Weekly Roundup Video',
    caption: 'This week in tech: Apple’s new VR headset, Google’s AI update, and what it means for creators. Watch the full breakdown! 🎥',
    hashtags: '#TechNews #WeeklyRoundup #CreatorEconomy',
    keywords: 'tech news, apple, google',
    platforms: ['YouTube', 'TikTok'],
    contentType: 'Video',
    videoPrompt: 'Tech news presenter talking to camera with graphical overlays',
    media: [],
    scheduledDate: postDates[3],
    scheduledTime: '18:00',
    status: 'failed', // Simulate a failure
    error: 'Upload timeout',
    createdAt: getDate(-7),
    updatedAt: getDate(-7),
    timezone: 'America/New_York'
  },
   {
    id: 'post-005',
    title: 'Monday Motivation',
    caption: 'Your only limit is you. Start the week strong! 💪 #MondayMotivation #Grind',
    hashtags: '#MondayMotivation #Inspiration #Hustle',
    keywords: 'motivation, monday',
    platforms: ['Instagram', 'X'],
    contentType: 'Image Post',
    imagePrompt: 'Mountain climber reaching summit at sunrise',
    media: [],
    scheduledDate: postDates[4],
    scheduledTime: '08:00',
    status: 'posted',
    analytics: { likes: 5, comments: 0, shares: 1, impressions: 45 },
    createdAt: getDate(-6),
    updatedAt: getDate(-6),
    timezone: 'America/New_York'
  },

  // Today's Posts
  {
    id: 'post-006',
    title: 'New Feature Teaser',
    caption: 'Something BIG is coming tomorrow... Can you guess what it is? 👀 drop your guesses below!',
    hashtags: '#Teaser #NewFeature #ComingSoon',
    keywords: 'teaser, new feature',
    platforms: ['Instagram', 'Facebook', 'X'],
    contentType: 'Image Post',
    imagePrompt: 'Silhouette of a new product with question mark',
    media: [],
    scheduledDate: getDate(0),
    scheduledTime: '12:00',
    status: 'ready',
    createdAt: getDate(-2),
    updatedAt: getDate(-1),
    timezone: 'America/New_York'
  },
   {
    id: 'post-007',
    title: 'Poll: Content Preferences',
    caption: 'Do you prefer video content or written guides? Vote now! 🗳️',
    hashtags: '#Poll #UserFeedback #ContentStrategy',
    keywords: 'poll, feedback',
    platforms: ['X', 'Facebook'],
    contentType: 'Text Post',
    media: [],
    scheduledDate: getDate(0),
    scheduledTime: '16:00',
    status: 'scheduled',
    createdAt: getDate(-3),
    updatedAt: getDate(-1),
    timezone: 'America/New_York'
  },

  // Future Posts
  {
    id: 'post-008',
    title: 'Customer Spotlight: Sarah',
    caption: 'Meet Sarah. She doubled her leads in 30 days using our strategy. "I never thought it would be this easy," she says. Read her full story on the blog.',
    hashtags: '#CaseStudy #ClientSuccess #Testimonial',
    keywords: 'case study, testimonial',
    platforms: ['Facebook', 'Instagram'],
    contentType: 'Image Post',
    imagePrompt: 'Professional headshot of a happy client',
    media: [],
    scheduledDate: postDates[7],
    scheduledTime: '10:00',
    status: 'scheduled',
    createdAt: getDate(-1),
    updatedAt: getDate(-1),
    timezone: 'America/New_York'
  },
  {
    id: 'post-009',
    title: '3 Common Mistakes',
    caption: 'Are you making these 3 marketing mistakes? \n1. Ignoring video\n2. Posting inconsistently\n3. Not engaging with comments\n\nFixing these can change everything.',
    hashtags: '#MarketingMistakes #TipsAndTricks #SocialMediaGrowth',
    keywords: 'marketing mistakes, tips',
    platforms: ['TikTok', 'Instagram'],
    contentType: 'Video Reel',
    videoPrompt: 'Person counting down 3 items on fingers',
    media: [],
    scheduledDate: postDates[8],
    scheduledTime: '15:00',
    status: 'draft',
    createdAt: getDate(-5),
    updatedAt: getDate(-1),
    timezone: 'America/New_York'
  },
  {
    id: 'post-010',
    title: 'Behind The Scenes: Office Tour',
    caption: 'Welcome to our chaos! 🤪 Here’s where the magic happens. #OfficeTour #BTS #AgencyLife',
    hashtags: '#OfficeLife #BehindTheScenes #WorkCulture',
    keywords: 'office tour, bts',
    platforms: ['Instagram', 'TikTok'],
    contentType: 'Video Reel',
    videoPrompt: 'Fast-paced tour of a modern office space',
    media: [],
    scheduledDate: postDates[9],
    scheduledTime: '11:00',
    status: 'scheduled',
    createdAt: getDate(-2),
    updatedAt: getDate(-2),
    timezone: 'America/New_York'
  },
  {
    id: 'post-011',
    title: 'Q&A Session Annoucement',
    caption: 'Going live this Friday at 3PM EST to answer all your questions! Drop them here 👇',
    hashtags: '#QandA #LiveStream #Community',
    keywords: 'q&a, live',
    platforms: ['Instagram', 'Facebook', 'YouTube'],
    contentType: 'Image Post',
    imagePrompt: 'Graphic with Q&A text and time details',
    media: [],
    scheduledDate: postDates[10],
    scheduledTime: '09:00',
    status: 'scheduled',
    createdAt: getDate(-1),
    updatedAt: getDate(-1),
    timezone: 'America/New_York'
  },
  {
    id: 'post-012',
    title: 'Weekend Vibes',
    caption: 'Unplugging for the weekend. See you Monday! ✌️',
    hashtags: '#WeekendVibes #DigitalDetox',
    keywords: 'weekend, relax',
    platforms: ['Instagram'],
    contentType: 'Story',
    imagePrompt: 'Cozy coffee shop setting',
    media: [],
    scheduledDate: postDates[11],
    scheduledTime: '17:00',
    status: 'scheduled',
    createdAt: getDate(-4),
    updatedAt: getDate(-4),
    timezone: 'America/New_York'
  },
  {
    id: 'post-013',
    title: 'Tool Recommendation: Canva',
    caption: 'If you aren’t using Canva, you’re working too hard. Here’s how I create posts in 5 minutes.',
    hashtags: '#ToolsWeLove #DesignTips #CanvaHacks',
    keywords: 'canva, design tools',
    platforms: ['TikTok', 'Instagram'],
    contentType: 'Video Reel',
    videoPrompt: 'Screen recording of quick design process',
    media: [],
    scheduledDate: postDates[12],
    scheduledTime: '13:00',
    status: 'draft',
    createdAt: getDate(-2),
    updatedAt: getDate(-2),
    timezone: 'America/New_York'
  },
  {
    id: 'post-014',
    title: 'Industry News: Algorithm Changes',
    caption: 'The algorithm changed AGAIN. Here’s what you need to know to stay visible.',
    hashtags: '#SocialMediaNews #AlgorithmUpdate',
    keywords: 'algorithm, news',
    platforms: ['X', 'Facebook'],
    contentType: 'Text Post',
    media: [],
    scheduledDate: postDates[13],
    scheduledTime: '08:30',
    status: 'scheduled',
    createdAt: getDate(-3),
    updatedAt: getDate(-3),
    timezone: 'America/New_York'
  },
  {
    id: 'post-015',
    title: 'Meme: Client Expectations',
    caption: 'When the client says "make it pop" 😂 #DesignerProblems #AgencyLife',
    hashtags: '#MarketingMemes #Relatable',
    keywords: 'meme, humor',
    platforms: ['Instagram', 'X', 'Facebook'],
    contentType: 'Image Post',
    imagePrompt: 'Funny meme about design feedback',
    media: [],
    scheduledDate: postDates[14],
    scheduledTime: '12:30',
    status: 'ready',
    createdAt: getDate(-1),
    updatedAt: getDate(-1),
    timezone: 'America/New_York'
  },
  {
    id: 'post-016',
    title: 'Flash Sale Alert',
    caption: '24 HOURS ONLY! 50% off everything. Link in bio! 🚨',
    hashtags: '#FlashSale #Discount #LimitedTime',
    keywords: 'sale, promotion',
    platforms: ['Instagram', 'Facebook', 'TikTok'],
    contentType: 'Story',
    imagePrompt: 'Bold red and white sale graphic',
    media: [],
    scheduledDate: postDates[15],
    scheduledTime: '09:00',
    status: 'scheduled',
    createdAt: getDate(-5),
    updatedAt: getDate(-5),
    timezone: 'America/New_York'
  },
  {
    id: 'post-017',
    title: 'How-To: Content Calendar',
    caption: 'Struggling to be consistent? You need a content calendar. Swipe to see my template.',
    hashtags: '#ContentStrategy #Planning #Organization',
    keywords: 'content calendar, how-to',
    platforms: ['Instagram', 'Facebook'],
    contentType: 'Carousel',
    imagePrompt: '',
    media: [],
    scheduledDate: postDates[16],
    scheduledTime: '14:00',
    status: 'draft',
    createdAt: getDate(-2),
    updatedAt: getDate(-2),
    timezone: 'America/New_York'
  },
   {
    id: 'post-018',
    title: 'Quote of the Day',
    caption: '"Content is king, but engagement is queen, and the lady rules the house." - Mari Smith',
    hashtags: '#MarketingQuotes #Wisdom',
    keywords: 'quote, inspiration',
    platforms: ['X', 'Instagram'],
    contentType: 'Image Post',
    imagePrompt: 'Minimalist typography quote graphic',
    media: [],
    scheduledDate: postDates[17],
    scheduledTime: '10:00',
    status: 'scheduled',
    createdAt: getDate(-6),
    updatedAt: getDate(-6),
    timezone: 'America/New_York'
  },
   {
    id: 'post-019',
    title: 'Team Lunch',
    caption: 'Tacos for the team today! 🌮 celebrating a big win.',
    hashtags: '#TeamCulture #Foodie #Celebration',
    keywords: 'team, food',
    platforms: ['Instagram'],
    contentType: 'Story',
    imagePrompt: 'Group of people eating tacos',
    media: [],
    scheduledDate: postDates[18],
    scheduledTime: '12:00',
    status: 'scheduled',
    createdAt: getDate(-1),
    updatedAt: getDate(-1),
    timezone: 'America/New_York'
  },
  {
    id: 'post-020',
    title: 'Product Demo',
    caption: 'See how X feature works in real-time. It’s a game changer for [Audience].',
    hashtags: '#ProductDemo #Tutorial #Tech',
    keywords: 'demo, tutorial',
    platforms: ['YouTube', 'TikTok'],
    contentType: 'Video',
    videoPrompt: 'Screen recording software demo',
    media: [],
    scheduledDate: postDates[19],
    scheduledTime: '11:00',
    status: 'draft',
    createdAt: getDate(-3),
    updatedAt: getDate(-3),
    timezone: 'America/New_York'
  }
];

// 2. AI Plan Builder History
export const mockAIPlans = [
  {
    id: 'plan-001',
    name: 'Q1 Product Launch Strategy',
    goal: 'Drive conversions',
    period: '30 days',
    platforms: ['Instagram', 'Email'],
    createdDate: getDate(-45),
    lastUpdated: getDate(-10),
    progress: 100,
    status: 'Completed',
    statusColor: STATUS_COLORS.completed
  },
  {
    id: 'plan-002',
    name: '30-Day Personal Brand Growth',
    goal: 'Grow followers',
    period: '30 days',
    platforms: ['X', 'Instagram'],
    createdDate: getDate(-15),
    lastUpdated: getDate(-2),
    progress: 45,
    status: 'Active',
    statusColor: STATUS_COLORS.active
  },
  {
    id: 'plan-003',
    name: 'Authority Building',
    goal: 'Build authority',
    period: '14 days',
    platforms: ['X'],
    createdDate: getDate(-60),
    lastUpdated: getDate(-46),
    progress: 100,
    status: 'Completed',
    statusColor: STATUS_COLORS.completed
  },
  {
    id: 'plan-004',
    name: 'Holiday Content Campaign',
    goal: 'Increase engagement',
    period: '7 days',
    platforms: ['Instagram', 'TikTok', 'Facebook'],
    createdDate: getDate(-5),
    lastUpdated: getDate(0),
    progress: 78,
    status: 'Active',
    statusColor: STATUS_COLORS.active
  },
  {
    id: 'plan-005',
    name: 'Weekly Engagement Boost',
    goal: 'Boost engagement',
    period: '7 days',
    platforms: ['Instagram'],
    createdDate: getDate(0),
    lastUpdated: getDate(0),
    progress: 12,
    status: 'Draft',
    statusColor: STATUS_COLORS.draft
  }
];

// 3. Trend Lab Data
export const mockTrendingTopics = [
  {
    id: 'trend-001',
    topic: 'No-Code Revolution',
    volume: '12k posts',
    growth: '+120%',
    growthDirection: 'up', // for coloring
    platforms: ['X', 'Instagram'],
    engagement: 'High'
  },
  {
    id: 'trend-002',
    topic: 'AI Content Tools',
    volume: '8.5k posts',
    growth: '+89%',
    growthDirection: 'up',
    platforms: ['YouTube', 'X', 'TikTok'],
    engagement: 'Very High'
  },
  {
    id: 'trend-003',
    topic: 'Video-First Strategy',
    volume: '15k posts',
    growth: '+67%',
    growthDirection: 'up',
    platforms: ['Instagram', 'TikTok'],
    engagement: 'High'
  },
  {
    id: 'trend-004',
    topic: 'Micro-Influencers',
    volume: '6.2k posts',
    growth: '-5%',
    growthDirection: 'down',
    platforms: ['Instagram'],
    engagement: 'Medium'
  },
  {
    id: 'trend-005',
    topic: 'Interactive Posts',
    volume: '9.8k posts',
    growth: '+45%',
    growthDirection: 'up',
    platforms: ['Facebook', 'Instagram'],
    engagement: 'Medium'
  },
  {
    id: 'trend-006',
    topic: 'Community Building',
    volume: '11k posts',
    growth: '+78%',
    growthDirection: 'up',
    platforms: ['X', 'Discord'],
    engagement: 'High'
  }
];

// 4. Huttle Agent Activity Log
export const mockAgentActivity = [
  {
    id: 'log-001',
    message: 'Analyzing competitor top posts...',
    timestamp: '2 mins ago',
    type: 'info'
  },
  {
    id: 'log-002',
    message: 'Found 3 viral hooks for your next reel',
    timestamp: '5 mins ago',
    type: 'success'
  },
  {
    id: 'log-003',
    message: 'Scheduled 2 tweets for tomorrow',
    timestamp: '12 mins ago',
    type: 'success'
  },
  {
    id: 'log-004',
    message: 'Trend alert: "AI tools" spiking in your niche',
    timestamp: '1 hour ago',
    type: 'warning' // Used for alerts
  },
  {
    id: 'log-005',
    message: 'Content gap detected: Add more video content',
    timestamp: '2 hours ago',
    type: 'info'
  },
  {
    id: 'log-006',
    message: 'Generated "Q1 Product Launch" strategy',
    timestamp: '5 hours ago',
    type: 'success'
  },
  {
    id: 'log-007',
    message: 'Optimized 3 draft posts for SEO',
    timestamp: 'Yesterday',
    type: 'info'
  },
  {
    id: 'log-008',
    message: 'Repurposed YouTube video to Twitter thread',
    timestamp: 'Yesterday',
    type: 'success'
  },
  {
    id: 'log-009',
    message: 'Analyzed audience engagement patterns',
    timestamp: '2 days ago',
    type: 'info'
  },
  {
    id: 'log-010',
    message: 'Weekly performance report ready',
    timestamp: '2 days ago',
    type: 'info'
  }
];

// 5. Content Repurposer Examples
export const mockRepurposerExamples = [
  {
    id: 'repurpose-001',
    originalContent: 'YouTube Video: "How to scale your agency to $50k/mo"',
    format: 'Video to Text',
    sourcePlatform: 'YouTube',
    targetPlatform: 'X (Twitter)',
    outputType: 'Thread (5 tweets)',
    repurposedContent: {
      content: '1/ Scaling an agency isn\'t about working harder. It\'s about systems. Here are the 3 systems that took us to $50k/mo... 🧵👇',
      hashtags: '#AgencyLife #Scale #BusinessGrowth',
      hooks: ['Stop trading time for money.', 'The secret to scaling? Fire yourself.']
    }
  },
  {
    id: 'repurpose-002',
    originalContent: 'Instagram Post: "5 tips for better SEO ranking"',
    format: 'Text to Video',
    sourcePlatform: 'Instagram',
    targetPlatform: 'TikTok',
    outputType: 'Video Script',
    repurposedContent: {
      content: '(Hook: Stop ignoring SEO!) Want to rank #1? Here are 5 tips in 30 seconds. 1. Keywords in titles. 2. Alt text on images. 3... [Point to screen]',
      hashtags: '#SEO #MarketingTips #LearnOnTikTok',
      hooks: ['Your website is invisible. Here\'s why.', 'SEO is dead? No, you\'re just doing it wrong.']
    }
  },
  {
    id: 'repurpose-003',
    originalContent: 'Blog Post: "The Future of AI in Marketing"',
    format: 'Long-form to Carousel',
    sourcePlatform: 'Blog',
    targetPlatform: 'Instagram',
    outputType: 'Carousel (7 slides)',
    repurposedContent: {
      content: 'Slide 1: AI isn\'t replacing marketers.\nSlide 2: Marketers using AI will replace those who don\'t.\nSlide 3: Top 3 tools to learn now...',
      hashtags: '#AI #MarketingFuture #Innovation',
      hooks: ['Will AI take your job?', 'The marketing landscape is changing forever.']
    }
  }
];

/**
 * Helper to generate a single mock post if needed
 */
export const generateMockPost = (overrides = {}) => {
  return {
    id: `generated-${Date.now()}`,
    title: 'New Post',
    caption: 'This is a generated post.',
    platforms: ['Instagram'],
    scheduledDate: getDate(1),
    scheduledTime: '12:00',
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timezone: 'America/New_York',
    ...overrides
  };
};
