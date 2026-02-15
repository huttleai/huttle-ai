/**
 * Mock Data for Huttle AI - Iron Peak Fitness
 * Provides realistic, "lived-in" data for development and testing.
 * Theme: Fitness Gym / Health & Wellness
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
  scheduled: { bg: 'bg-huttle-50', text: 'text-huttle-primary', border: 'border-huttle-100' },
  ready: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' },
  posted: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
  active: { bg: 'bg-huttle-50', text: 'text-huttle-primary', border: 'border-huttle-100' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' }
};

// --- MOCK DATA ---

// 1. Scheduled Posts - Iron Peak Fitness
const postDates = generateRealisticDates(25);

export const mockScheduledPosts = [
  // Past Posts (Posted/Failed)
  {
    id: 'post-001',
    title: 'New Year Transformation Challenge Launch',
    caption: '🔥 NEW YEAR, NEW YOU! Iron Peak Fitness is launching our 12-Week Transformation Challenge! Join 500+ members who have already signed up. First 50 sign-ups get a FREE nutrition consultation. Link in bio to register! #TransformationChallenge #IronPeakFitness #NewYearNewYou',
    hashtags: '#TransformationChallenge #IronPeakFitness #NewYearNewYou #FitnessGoals #GymLife',
    keywords: 'transformation challenge, new year fitness, gym membership',
    platforms: ['Instagram', 'Facebook'],
    contentType: 'Image Post',
    imagePrompt: 'Before and after transformation collage with gym equipment in background',
    media: [],
    scheduledDate: postDates[0],
    scheduledTime: '06:00',
    status: 'posted',
    analytics: { likes: 2847, comments: 156, shares: 423, impressions: 18500 },
    createdAt: getDate(-10),
    updatedAt: getDate(-8),
    timezone: 'America/New_York'
  },
  {
    id: 'post-002',
    title: '5 Common Deadlift Mistakes',
    caption: 'Stop making these 5 deadlift mistakes that are killing your gains:\n1. Rounding your back\n2. Starting with hips too high\n3. Not engaging your lats\n4. Looking up instead of neutral\n5. Wearing the wrong shoes\n\nSave this post and share with your gym buddy! 💪',
    hashtags: '#DeadliftTips #FormCheck #IronPeakFitness #StrengthTraining',
    keywords: 'deadlift form, strength training tips',
    platforms: ['Instagram', 'TikTok'],
    contentType: 'Carousel',
    imagePrompt: '',
    media: [],
    scheduledDate: postDates[1],
    scheduledTime: '12:00',
    status: 'posted',
    analytics: { likes: 1234, comments: 89, shares: 312, impressions: 9800 },
    createdAt: getDate(-9),
    updatedAt: getDate(-9),
    timezone: 'America/New_York'
  },
  {
    id: 'post-003',
    title: 'Member Spotlight: Marcus Journey',
    caption: 'MEMBER SPOTLIGHT 🌟 Meet Marcus! He lost 45 lbs in 6 months and gained confidence he never knew he had. "Iron Peak isn\'t just a gym, it\'s a family that pushes you to be your best." Your transformation story could be next! 💪',
    hashtags: '#MemberSpotlight #TransformationStory #IronPeakFamily #FitnessJourney',
    keywords: 'member transformation, success story, weight loss',
    platforms: ['Instagram', 'Facebook'],
    contentType: 'Image Post',
    imagePrompt: 'Before and after photo of gym member with trainer',
    media: [],
    scheduledDate: postDates[2],
    scheduledTime: '18:00',
    status: 'posted',
    analytics: { likes: 892, comments: 67, shares: 145, impressions: 7200 },
    createdAt: getDate(-8),
    updatedAt: getDate(-8),
    timezone: 'America/New_York'
  },
  {
    id: 'post-004',
    title: 'HIIT Class Promo Video',
    caption: '🔥 Our HIIT classes are NO JOKE! 45 minutes of high-intensity intervals that will torch calories and build endurance. New class times added - 6AM, 12PM, and 7PM! Book your spot in the app.',
    hashtags: '#HIITWorkout #IronPeakClasses #CardioKiller #FitnessClass',
    keywords: 'HIIT class, group fitness, cardio workout',
    platforms: ['TikTok', 'Instagram'],
    contentType: 'Video Reel',
    videoPrompt: 'Fast-paced montage of HIIT class with energetic music',
    media: [],
    scheduledDate: postDates[3],
    scheduledTime: '17:00',
    status: 'failed',
    error: 'Video encoding error',
    createdAt: getDate(-7),
    updatedAt: getDate(-7),
    timezone: 'America/New_York'
  },
  {
    id: 'post-005',
    title: 'Monday Motivation',
    caption: 'The only bad workout is the one that didn\'t happen. Let\'s crush this week! 💪 Who\'s hitting the gym today? Drop a 🔥 in the comments! #MondayMotivation #IronPeakFitness',
    hashtags: '#MondayMotivation #GymLife #FitnessMotivation #IronPeak',
    keywords: 'motivation, monday, workout',
    platforms: ['Instagram', 'X'],
    contentType: 'Image Post',
    imagePrompt: 'Motivational quote over gym equipment photo',
    media: [],
    scheduledDate: postDates[4],
    scheduledTime: '05:30',
    status: 'posted',
    analytics: { likes: 456, comments: 78, shares: 34, impressions: 3200 },
    createdAt: getDate(-6),
    updatedAt: getDate(-6),
    timezone: 'America/New_York'
  },

  // Today's Posts
  {
    id: 'post-006',
    title: 'New Equipment Announcement',
    caption: '🎉 BIG NEWS! We just added 10 new Rogue power racks and a complete set of Eleiko competition plates! Your PRs are about to get CRUSHED. Come check them out today!',
    hashtags: '#NewEquipment #IronPeakFitness #GymUpgrade #PowerLifting',
    keywords: 'new equipment, gym upgrade, power racks',
    platforms: ['Instagram', 'Facebook', 'X'],
    contentType: 'Image Post',
    imagePrompt: 'Shiny new gym equipment with Iron Peak branding',
    media: [],
    scheduledDate: getDate(0),
    scheduledTime: '10:00',
    status: 'ready',
    createdAt: getDate(-2),
    updatedAt: getDate(-1),
    timezone: 'America/New_York'
  },
  {
    id: 'post-007',
    title: 'Protein Shake Recipe',
    caption: 'Post-workout fuel that actually tastes good! 🥤\n\n✅ 1 scoop chocolate protein\n✅ 1 banana\n✅ 2 tbsp peanut butter\n✅ 1 cup almond milk\n✅ Ice\n\nBlend and enjoy! What\'s YOUR go-to shake recipe?',
    hashtags: '#ProteinShake #PostWorkout #FitnessNutrition #IronPeakFitness',
    keywords: 'protein shake, nutrition, post workout',
    platforms: ['Instagram', 'TikTok'],
    contentType: 'Video Reel',
    videoPrompt: 'Quick recipe video showing shake being made',
    media: [],
    scheduledDate: getDate(0),
    scheduledTime: '14:00',
    status: 'scheduled',
    createdAt: getDate(-3),
    updatedAt: getDate(-1),
    timezone: 'America/New_York'
  },

  // Future Posts
  {
    id: 'post-008',
    title: 'Personal Training Special',
    caption: '🏋️ LIMITED TIME: Get 3 FREE personal training sessions when you sign up for a 6-month membership! Our certified trainers will create a custom plan just for you. DM us or visit the front desk to claim this offer!',
    hashtags: '#PersonalTraining #GymDeal #IronPeakFitness #FitnessGoals',
    keywords: 'personal training, membership deal, fitness special',
    platforms: ['Facebook', 'Instagram'],
    contentType: 'Image Post',
    imagePrompt: 'Personal trainer working with client on squat form',
    media: [],
    scheduledDate: postDates[7],
    scheduledTime: '09:00',
    status: 'scheduled',
    createdAt: getDate(-1),
    updatedAt: getDate(-1),
    timezone: 'America/New_York'
  },
  {
    id: 'post-009',
    title: 'Leg Day Workout',
    caption: 'LEG DAY DESTROYER 🦵\n\n4x12 Barbell Squats\n4x10 Romanian Deadlifts\n3x15 Leg Press\n3x12 Walking Lunges\n4x15 Leg Curls\n3x20 Calf Raises\n\nSave this and try it on your next leg day! Tag your workout partner 👇',
    hashtags: '#LegDay #WorkoutPlan #IronPeakFitness #StrengthTraining',
    keywords: 'leg workout, strength training, workout plan',
    platforms: ['Instagram', 'TikTok'],
    contentType: 'Carousel',
    imagePrompt: '',
    media: [],
    scheduledDate: postDates[8],
    scheduledTime: '11:00',
    status: 'draft',
    createdAt: getDate(-5),
    updatedAt: getDate(-1),
    timezone: 'America/New_York'
  },
  {
    id: 'post-010',
    title: 'Yoga Class Introduction',
    caption: 'NEW CLASS ALERT! 🧘 Introducing Yoga Flow at Iron Peak! Perfect for recovery days and improving flexibility. Every Sunday at 9AM. First class is FREE for all members!',
    hashtags: '#YogaClass #Recovery #IronPeakFitness #Flexibility',
    keywords: 'yoga class, recovery, flexibility',
    platforms: ['Instagram', 'Facebook'],
    contentType: 'Video',
    videoPrompt: 'Peaceful yoga class in progress with natural lighting',
    media: [],
    scheduledDate: postDates[9],
    scheduledTime: '08:00',
    status: 'scheduled',
    createdAt: getDate(-2),
    updatedAt: getDate(-2),
    timezone: 'America/New_York'
  },
  {
    id: 'post-011',
    title: 'Nutrition Workshop Announcement',
    caption: '📚 FREE NUTRITION WORKSHOP! Join our certified nutritionist this Saturday at 2PM to learn:\n\n• Meal prep basics\n• Macro counting made simple\n• Best foods for muscle gain\n• How to read nutrition labels\n\nLimited spots - register at the front desk!',
    hashtags: '#NutritionWorkshop #IronPeakFitness #MealPrep #FitnessEducation',
    keywords: 'nutrition workshop, meal prep, fitness education',
    platforms: ['Instagram', 'Facebook', 'X'],
    contentType: 'Image Post',
    imagePrompt: 'Workshop setting with healthy food display',
    media: [],
    scheduledDate: postDates[10],
    scheduledTime: '10:00',
    status: 'scheduled',
    createdAt: getDate(-1),
    updatedAt: getDate(-1),
    timezone: 'America/New_York'
  },
  {
    id: 'post-012',
    title: 'Weekend Hours Reminder',
    caption: '⏰ WEEKEND HOURS REMINDER!\n\nSaturday: 6AM - 8PM\nSunday: 7AM - 6PM\n\nNo excuses - we\'re open! See you there 💪',
    hashtags: '#WeekendWorkout #IronPeakFitness #GymHours',
    keywords: 'gym hours, weekend workout',
    platforms: ['Instagram'],
    contentType: 'Story',
    imagePrompt: 'Gym interior with clock showing hours',
    media: [],
    scheduledDate: postDates[11],
    scheduledTime: '16:00',
    status: 'scheduled',
    createdAt: getDate(-4),
    updatedAt: getDate(-4),
    timezone: 'America/New_York'
  },
  {
    id: 'post-013',
    title: 'Supplement Guide',
    caption: 'SUPPLEMENTS 101 💊\n\nWhat you actually need:\n✅ Protein powder\n✅ Creatine monohydrate\n✅ Vitamin D\n\nWhat you can skip:\n❌ Fat burners\n❌ BCAAs (if eating enough protein)\n❌ Pre-workout (coffee works!)\n\nSave this before you waste money!',
    hashtags: '#SupplementGuide #FitnessTips #IronPeakFitness #GymAdvice',
    keywords: 'supplements, fitness tips, nutrition',
    platforms: ['Instagram', 'TikTok'],
    contentType: 'Carousel',
    imagePrompt: '',
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
    title: 'Trainer Tip Tuesday',
    caption: '💡 TRAINER TIP TUESDAY with Coach Sarah!\n\n"Stop ego lifting. Drop the weight by 20% and focus on the mind-muscle connection. You\'ll see better results in half the time."\n\nWhat tip changed YOUR training? 👇',
    hashtags: '#TrainerTip #IronPeakFitness #FitnessAdvice #MindMuscle',
    keywords: 'trainer tip, fitness advice, workout tips',
    platforms: ['X', 'Instagram'],
    contentType: 'Image Post',
    imagePrompt: 'Trainer giving advice to client',
    media: [],
    scheduledDate: postDates[13],
    scheduledTime: '07:00',
    status: 'scheduled',
    createdAt: getDate(-3),
    updatedAt: getDate(-3),
    timezone: 'America/New_York'
  },
  {
    id: 'post-015',
    title: 'Gym Meme',
    caption: 'When someone asks if the squat rack is free but you have 6 more sets 😂💀 Tag your gym buddy who does this! #GymMemes #IronPeakFitness',
    hashtags: '#GymMemes #FitnessHumor #IronPeakFitness #GymLife',
    keywords: 'gym meme, fitness humor',
    platforms: ['Instagram', 'X', 'TikTok'],
    contentType: 'Image Post',
    imagePrompt: 'Funny gym meme about squat rack',
    media: [],
    scheduledDate: postDates[14],
    scheduledTime: '19:00',
    status: 'ready',
    createdAt: getDate(-1),
    updatedAt: getDate(-1),
    timezone: 'America/New_York'
  },
  {
    id: 'post-016',
    title: 'Spring Break Special',
    caption: '🌴 SPRING BREAK SPECIAL! Get beach-body ready with our 6-week intensive program. Includes:\n\n• Custom workout plan\n• Nutrition guide\n• Weekly check-ins\n• Access to all classes\n\n50% OFF for the first 20 sign-ups! DM "SPRING" to claim.',
    hashtags: '#SpringBreak #BeachBody #IronPeakFitness #FitnessChallenge',
    keywords: 'spring break, fitness program, gym special',
    platforms: ['Instagram', 'Facebook', 'TikTok'],
    contentType: 'Video Reel',
    videoPrompt: 'Energetic workout montage with beach imagery',
    media: [],
    scheduledDate: postDates[15],
    scheduledTime: '12:00',
    status: 'scheduled',
    createdAt: getDate(-5),
    updatedAt: getDate(-5),
    timezone: 'America/New_York'
  },
  {
    id: 'post-017',
    title: 'Upper Body Workout',
    caption: 'PUSH DAY PERFECTION 💪\n\n5x5 Bench Press\n4x8 Overhead Press\n4x10 Incline Dumbbell Press\n3x12 Cable Flyes\n3x15 Tricep Pushdowns\n3x12 Lateral Raises\n\nRest 2-3 min between heavy sets. Let\'s get it!',
    hashtags: '#PushDay #ChestWorkout #IronPeakFitness #StrengthTraining',
    keywords: 'push day, chest workout, upper body',
    platforms: ['Instagram', 'Facebook'],
    contentType: 'Carousel',
    imagePrompt: '',
    media: [],
    scheduledDate: postDates[16],
    scheduledTime: '06:00',
    status: 'draft',
    createdAt: getDate(-2),
    updatedAt: getDate(-2),
    timezone: 'America/New_York'
  },
  {
    id: 'post-018',
    title: 'Fitness Quote',
    caption: '"The pain you feel today will be the strength you feel tomorrow." 💪\n\nDouble tap if you\'re putting in the work! #IronPeakFitness #FitnessMotivation',
    hashtags: '#FitnessQuote #Motivation #IronPeakFitness #GymLife',
    keywords: 'fitness quote, motivation',
    platforms: ['Instagram', 'X'],
    contentType: 'Image Post',
    imagePrompt: 'Minimalist typography quote over gym background',
    media: [],
    scheduledDate: postDates[17],
    scheduledTime: '08:00',
    status: 'scheduled',
    createdAt: getDate(-6),
    updatedAt: getDate(-6),
    timezone: 'America/New_York'
  },
  {
    id: 'post-019',
    title: 'Staff Appreciation',
    caption: 'TEAM IRON PEAK! 🙌 Shoutout to our amazing staff who make this gym feel like home. From the front desk to our trainers - we appreciate you! Tag a staff member who\'s made a difference in your fitness journey.',
    hashtags: '#TeamIronPeak #GymFamily #StaffAppreciation #FitnessCommunity',
    keywords: 'staff appreciation, gym team',
    platforms: ['Instagram', 'Facebook'],
    contentType: 'Image Post',
    imagePrompt: 'Group photo of gym staff smiling',
    media: [],
    scheduledDate: postDates[18],
    scheduledTime: '15:00',
    status: 'scheduled',
    createdAt: getDate(-1),
    updatedAt: getDate(-1),
    timezone: 'America/New_York'
  },
  {
    id: 'post-020',
    title: 'Form Check Friday',
    caption: '📹 FORM CHECK FRIDAY! Send us a video of your lift and our coaches will give you FREE feedback. DM us your squat, deadlift, or bench press videos! #FormCheckFriday #IronPeakFitness',
    hashtags: '#FormCheck #FreeFeedback #IronPeakFitness #LiftingTips',
    keywords: 'form check, lifting tips, coaching',
    platforms: ['Instagram', 'TikTok'],
    contentType: 'Video',
    videoPrompt: 'Coach reviewing and correcting lift form',
    media: [],
    scheduledDate: postDates[19],
    scheduledTime: '16:00',
    status: 'draft',
    createdAt: getDate(-3),
    updatedAt: getDate(-3),
    timezone: 'America/New_York'
  }
];

// 2. AI Plan Builder History - Iron Peak Fitness
export const mockAIPlans = [
  {
    id: 'plan-001',
    name: 'New Year Transformation Campaign',
    goal: 'Drive membership sign-ups',
    period: '30 days',
    platforms: ['Instagram', 'Facebook'],
    createdDate: getDate(-45),
    lastUpdated: getDate(-10),
    progress: 100,
    status: 'Completed',
    statusColor: STATUS_COLORS.completed
  },
  {
    id: 'plan-002',
    name: 'Summer Body Challenge Promo',
    goal: 'Increase class attendance',
    period: '30 days',
    platforms: ['Instagram', 'TikTok'],
    createdDate: getDate(-15),
    lastUpdated: getDate(-2),
    progress: 65,
    status: 'Active',
    statusColor: STATUS_COLORS.active
  },
  {
    id: 'plan-003',
    name: 'Member Retention Campaign',
    goal: 'Reduce churn',
    period: '14 days',
    platforms: ['Instagram', 'Facebook', 'X'],
    createdDate: getDate(-60),
    lastUpdated: getDate(-46),
    progress: 100,
    status: 'Completed',
    statusColor: STATUS_COLORS.completed
  },
  {
    id: 'plan-004',
    name: 'Personal Training Upsell',
    goal: 'Increase PT bookings',
    period: '7 days',
    platforms: ['Instagram', 'Facebook'],
    createdDate: getDate(-5),
    lastUpdated: getDate(0),
    progress: 78,
    status: 'Active',
    statusColor: STATUS_COLORS.active
  },
  {
    id: 'plan-005',
    name: 'Weekend Warrior Engagement',
    goal: 'Boost weekend attendance',
    period: '7 days',
    platforms: ['Instagram', 'TikTok'],
    createdDate: getDate(0),
    lastUpdated: getDate(0),
    progress: 12,
    status: 'Draft',
    statusColor: STATUS_COLORS.draft
  }
];

// 3. Trend Lab Data - Organized by niche/industry
const trendingTopicsByNiche = {
  fitness: [
    { id: 'trend-fit-1', topic: 'Zone 2 Cardio', volume: '45k posts', growth: '+156%', growthDirection: 'up', platforms: ['Instagram', 'TikTok', 'YouTube'], engagement: 'Very High' },
    { id: 'trend-fit-2', topic: 'Protein Coffee (Proffee)', volume: '28k posts', growth: '+89%', growthDirection: 'up', platforms: ['TikTok', 'Instagram'], engagement: 'High' },
    { id: 'trend-fit-3', topic: '12-3-30 Treadmill Workout', volume: '67k posts', growth: '+234%', growthDirection: 'up', platforms: ['TikTok', 'Instagram'], engagement: 'Very High' },
    { id: 'trend-fit-4', topic: 'Cold Plunge Benefits', volume: '32k posts', growth: '+78%', growthDirection: 'up', platforms: ['Instagram', 'YouTube', 'X'], engagement: 'High' },
    { id: 'trend-fit-5', topic: 'Creatine for Women', volume: '19k posts', growth: '+145%', growthDirection: 'up', platforms: ['TikTok', 'Instagram'], engagement: 'High' },
    { id: 'trend-fit-6', topic: 'Walking Pad Workouts', volume: '52k posts', growth: '-12%', growthDirection: 'down', platforms: ['TikTok'], engagement: 'Medium' },
  ],
  beauty: [
    { id: 'trend-bty-1', topic: 'Glass Skin Routine', volume: '62k posts', growth: '+198%', growthDirection: 'up', platforms: ['TikTok', 'Instagram'], engagement: 'Very High' },
    { id: 'trend-bty-2', topic: 'Slugging Method', volume: '34k posts', growth: '+112%', growthDirection: 'up', platforms: ['TikTok', 'Instagram'], engagement: 'High' },
    { id: 'trend-bty-3', topic: 'Clean Beauty Swaps', volume: '27k posts', growth: '+76%', growthDirection: 'up', platforms: ['Instagram', 'YouTube'], engagement: 'High' },
    { id: 'trend-bty-4', topic: 'Latte Makeup Look', volume: '41k posts', growth: '+145%', growthDirection: 'up', platforms: ['TikTok', 'Instagram'], engagement: 'Very High' },
    { id: 'trend-bty-5', topic: 'Skin Cycling', volume: '29k posts', growth: '+67%', growthDirection: 'up', platforms: ['Instagram', 'TikTok'], engagement: 'High' },
  ],
  'medical spa': [
    { id: 'trend-med-1', topic: 'Prejuvenation (Preventive Botox)', volume: '38k posts', growth: '+167%', growthDirection: 'up', platforms: ['Instagram', 'TikTok'], engagement: 'Very High' },
    { id: 'trend-med-2', topic: 'Red Light Therapy at Home', volume: '45k posts', growth: '+134%', growthDirection: 'up', platforms: ['TikTok', 'Instagram', 'YouTube'], engagement: 'Very High' },
    { id: 'trend-med-3', topic: 'Lip Flip vs. Filler', volume: '31k posts', growth: '+89%', growthDirection: 'up', platforms: ['TikTok', 'Instagram'], engagement: 'High' },
    { id: 'trend-med-4', topic: 'Microneedling Results', volume: '22k posts', growth: '+56%', growthDirection: 'up', platforms: ['Instagram', 'YouTube'], engagement: 'High' },
    { id: 'trend-med-5', topic: 'Hydrafacial Before/After', volume: '18k posts', growth: '+78%', growthDirection: 'up', platforms: ['Instagram', 'TikTok'], engagement: 'High' },
  ],
  tech: [
    { id: 'trend-tech-1', topic: 'AI Coding Assistants', volume: '78k posts', growth: '+245%', growthDirection: 'up', platforms: ['X', 'YouTube', 'Instagram'], engagement: 'Very High' },
    { id: 'trend-tech-2', topic: 'Local LLMs', volume: '34k posts', growth: '+189%', growthDirection: 'up', platforms: ['X', 'YouTube'], engagement: 'High' },
    { id: 'trend-tech-3', topic: 'Vibe Coding', volume: '52k posts', growth: '+312%', growthDirection: 'up', platforms: ['TikTok', 'X', 'YouTube'], engagement: 'Very High' },
    { id: 'trend-tech-4', topic: 'AI Agents for Business', volume: '41k posts', growth: '+167%', growthDirection: 'up', platforms: ['X', 'Instagram'], engagement: 'High' },
    { id: 'trend-tech-5', topic: 'No-Code App Building', volume: '29k posts', growth: '+98%', growthDirection: 'up', platforms: ['TikTok', 'YouTube'], engagement: 'High' },
  ],
  food: [
    { id: 'trend-food-1', topic: 'Cottage Cheese Recipes', volume: '56k posts', growth: '+178%', growthDirection: 'up', platforms: ['TikTok', 'Instagram'], engagement: 'Very High' },
    { id: 'trend-food-2', topic: 'Dubai Chocolate Bar', volume: '89k posts', growth: '+345%', growthDirection: 'up', platforms: ['TikTok', 'Instagram'], engagement: 'Very High' },
    { id: 'trend-food-3', topic: 'Protein Ice Cream', volume: '33k posts', growth: '+112%', growthDirection: 'up', platforms: ['TikTok', 'Instagram'], engagement: 'High' },
    { id: 'trend-food-4', topic: 'Girl Dinner', volume: '42k posts', growth: '-8%', growthDirection: 'down', platforms: ['TikTok'], engagement: 'Medium' },
    { id: 'trend-food-5', topic: 'Kitchen Gadget Reviews', volume: '27k posts', growth: '+89%', growthDirection: 'up', platforms: ['TikTok', 'YouTube'], engagement: 'High' },
  ],
  business: [
    { id: 'trend-biz-1', topic: 'Side Hustle Stack', volume: '48k posts', growth: '+134%', growthDirection: 'up', platforms: ['TikTok', 'Instagram', 'X'], engagement: 'Very High' },
    { id: 'trend-biz-2', topic: 'UGC Creator Economy', volume: '35k posts', growth: '+167%', growthDirection: 'up', platforms: ['TikTok', 'Instagram'], engagement: 'High' },
    { id: 'trend-biz-3', topic: 'AI for Small Business', volume: '41k posts', growth: '+198%', growthDirection: 'up', platforms: ['X', 'Instagram', 'YouTube'], engagement: 'Very High' },
    { id: 'trend-biz-4', topic: 'Personal Branding Tips', volume: '29k posts', growth: '+78%', growthDirection: 'up', platforms: ['Instagram', 'X'], engagement: 'High' },
    { id: 'trend-biz-5', topic: 'Email Marketing Revival', volume: '22k posts', growth: '+56%', growthDirection: 'up', platforms: ['X', 'YouTube'], engagement: 'High' },
  ],
};

// General trending topics shown when no niche is configured
const generalTrendingTopics = [
  { id: 'trend-gen-1', topic: 'AI-Generated Content', volume: '120k posts', growth: '+267%', growthDirection: 'up', platforms: ['TikTok', 'Instagram', 'X', 'YouTube'], engagement: 'Very High' },
  { id: 'trend-gen-2', topic: 'Short-Form Video Storytelling', volume: '95k posts', growth: '+178%', growthDirection: 'up', platforms: ['TikTok', 'Instagram', 'YouTube'], engagement: 'Very High' },
  { id: 'trend-gen-3', topic: 'Authentic Over Polished', volume: '67k posts', growth: '+134%', growthDirection: 'up', platforms: ['TikTok', 'Instagram'], engagement: 'High' },
  { id: 'trend-gen-4', topic: 'Community-Led Growth', volume: '43k posts', growth: '+89%', growthDirection: 'up', platforms: ['Instagram', 'X'], engagement: 'High' },
  { id: 'trend-gen-5', topic: 'Micro-Influencer Partnerships', volume: '38k posts', growth: '+98%', growthDirection: 'up', platforms: ['Instagram', 'TikTok'], engagement: 'High' },
];

/**
 * Get trending topics based on user's niche/industry.
 * Returns general topics if no niche is configured.
 * @param {string} niche - User's niche from BrandContext
 * @param {string} industry - User's industry from BrandContext
 * @returns {Array} Matching trending topics
 */
/**
 * Alias map: maps common niche/industry values to trendingTopicsByNiche keys.
 * Handles both raw enum values and formatted labels.
 */
const NICHE_ALIASES = {
  // Fitness
  fitness: 'fitness', 'fitness & wellness': 'fitness', 'fitness & sports': 'fitness',
  health: 'fitness', healthcare: 'fitness', 'healthcare & wellness': 'fitness',
  wellness: 'fitness', sports: 'fitness',
  // Beauty
  beauty: 'beauty', 'beauty & skincare': 'beauty', 'beauty & cosmetics': 'beauty',
  fashion: 'beauty', 'fashion & beauty': 'beauty', 'fashion & apparel': 'beauty',
  skincare: 'beauty', cosmetics: 'beauty',
  // Medical Spa
  'medical spa': 'medical spa', medspa: 'medical spa', aesthetics: 'medical spa',
  // Tech
  tech: 'tech', technology: 'tech', 'tech & gadgets': 'tech',
  'technology & software': 'tech', software: 'tech', saas: 'tech',
  // Food
  food: 'food', 'food & cooking': 'food', 'food & beverage': 'food',
  cooking: 'food', restaurant: 'food', recipes: 'food',
  // Business
  business: 'business', finance: 'business', 'finance & insurance': 'business',
  'real estate': 'business', real_estate: 'business', retail: 'business',
  'retail & e-commerce': 'business', ecommerce: 'business',
  services: 'business', 'professional services': 'business',
  'personal growth': 'business', entrepreneurship: 'business',
  marketing: 'business',
};

export const getMockTrendingTopics = (niche = '', industry = '') => {
  // Try niche first, then industry
  const candidates = [niche, industry].filter(Boolean);
  
  for (const raw of candidates) {
    const key = raw.toLowerCase().trim();
    
    // 1. Exact match on mock data keys
    if (trendingTopicsByNiche[key]) {
      return trendingTopicsByNiche[key];
    }
    
    // 2. Alias map lookup
    if (NICHE_ALIASES[key]) {
      return trendingTopicsByNiche[NICHE_ALIASES[key]] || [];
    }
    
    // 3. Partial keyword matching (e.g. "Health & Fitness" contains "fitness")
    for (const [nicheKey, topics] of Object.entries(trendingTopicsByNiche)) {
      if (key.includes(nicheKey) || nicheKey.includes(key)) {
        return topics;
      }
    }
    
    // 4. Partial alias matching (e.g. "tech & gadgets" contains "tech")
    for (const [aliasKey, mappedKey] of Object.entries(NICHE_ALIASES)) {
      if (key.includes(aliasKey) || aliasKey.includes(key)) {
        return trendingTopicsByNiche[mappedKey] || [];
      }
    }
  }
  
  return [];
};

/** @deprecated Use getMockTrendingTopics(niche, industry) instead */
export const mockTrendingTopics = generalTrendingTopics;

// 4. Huttle Agent Activity Log - Iron Peak Fitness
export const mockAgentActivity = [
  {
    id: 'log-001',
    message: 'Analyzing competitor gym posts for engagement patterns...',
    timestamp: '2 mins ago',
    type: 'info'
  },
  {
    id: 'log-002',
    message: 'Found 5 viral fitness hooks for your next reel',
    timestamp: '5 mins ago',
    type: 'success'
  },
  {
    id: 'log-003',
    message: 'Scheduled 3 workout posts for peak engagement times',
    timestamp: '12 mins ago',
    type: 'success'
  },
  {
    id: 'log-004',
    message: 'Trend alert: "Zone 2 Cardio" spiking in fitness niche',
    timestamp: '1 hour ago',
    type: 'warning'
  },
  {
    id: 'log-005',
    message: 'Content gap detected: Add more nutrition tips content',
    timestamp: '2 hours ago',
    type: 'info'
  },
  {
    id: 'log-006',
    message: 'Generated "Summer Body Challenge" content strategy',
    timestamp: '5 hours ago',
    type: 'success'
  },
  {
    id: 'log-007',
    message: 'Optimized 4 workout posts for Instagram SEO',
    timestamp: 'Yesterday',
    type: 'info'
  },
  {
    id: 'log-008',
    message: 'Repurposed YouTube workout video to TikTok format',
    timestamp: 'Yesterday',
    type: 'success'
  },
  {
    id: 'log-009',
    message: 'Analyzed member engagement patterns by time of day',
    timestamp: '2 days ago',
    type: 'info'
  },
  {
    id: 'log-010',
    message: 'Weekly fitness content performance report ready',
    timestamp: '2 days ago',
    type: 'info'
  }
];

// 5. Content Repurposer Examples - Iron Peak Fitness
export const mockRepurposerExamples = [
  {
    id: 'repurpose-001',
    originalContent: 'YouTube Video: "Complete Push Day Workout - 45 Minutes"',
    format: 'Video to Text',
    sourcePlatform: 'YouTube',
    targetPlatform: 'X (Twitter)',
    outputType: 'Thread (5 tweets)',
    repurposedContent: {
      content: '1/ Want to build a bigger chest and shoulders? Here\'s the exact push day routine that helped our members see results in 8 weeks... 🧵👇',
      hashtags: '#PushDay #ChestWorkout #FitnessThread #IronPeakFitness',
      hooks: ['Stop wasting time with junk volume.', 'The secret to chest gains? Progressive overload.']
    }
  },
  {
    id: 'repurpose-002',
    originalContent: 'Instagram Post: "5 High-Protein Meal Prep Ideas"',
    format: 'Text to Video',
    sourcePlatform: 'Instagram',
    targetPlatform: 'TikTok',
    outputType: 'Video Script',
    repurposedContent: {
      content: '(Hook: Stop eating boring chicken and rice!) Here are 5 high-protein meals that actually taste good AND help you hit your macros. Number 3 is a game-changer... [Show meal prep montage]',
      hashtags: '#MealPrep #HighProtein #FitnessTikTok #IronPeakFitness',
      hooks: ['Your meal prep is boring. Here\'s how to fix it.', 'Eating 150g protein doesn\'t have to suck.']
    }
  },
  {
    id: 'repurpose-003',
    originalContent: 'Blog Post: "The Ultimate Guide to Building Muscle After 40"',
    format: 'Long-form to Carousel',
    sourcePlatform: 'Blog',
    targetPlatform: 'Instagram',
    outputType: 'Carousel (8 slides)',
    repurposedContent: {
      content: 'Slide 1: Building muscle after 40 is different. Not harder - just different.\nSlide 2: Recovery becomes your superpower.\nSlide 3: Here\'s what to prioritize...',
      hashtags: '#FitnessOver40 #MuscleBuilding #IronPeakFitness #HealthyAging',
      hooks: ['Think you\'re too old to build muscle?', 'Age is just a number. Here\'s proof.']
    }
  }
];

/**
 * Helper to generate a single mock post if needed
 */
export const generateMockPost = (overrides = {}) => {
  return {
    id: `generated-${Date.now()}`,
    title: 'New Workout Post',
    caption: 'Ready to crush your fitness goals? 💪 #IronPeakFitness',
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
