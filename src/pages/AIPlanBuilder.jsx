import { useState, useEffect } from 'react';
import { Wand2, Target, Calendar, TrendingUp, Sparkles, CheckCircle, Clock, Info, Loader } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useContent } from '../context/ContentContext';
import { useBrand } from '../context/BrandContext';
import { formatTo12Hour } from '../utils/timeFormatter';
import HoverPreview from '../components/HoverPreview';
import { createPlanBuilderJob, subscribeToJob, getJobStatus } from '../services/planBuilderAPI';
import { usePreferredPlatforms } from '../hooks/usePreferredPlatforms';

export default function AIPlanBuilder() {
  const { showToast } = useToast();
  const { schedulePost } = useContent();
  const { brandProfile } = useBrand();
  const { platforms: preferredPlatforms } = usePreferredPlatforms();
  const [selectedGoal, setSelectedGoal] = useState('Grow followers');
  const [selectedPeriod, setSelectedPeriod] = useState('7 days');
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [progress, setProgress] = useState(0);

  // Subscribe to job updates when a job is created
  useEffect(() => {
    if (!currentJobId) return;

    // Subscribe to realtime updates
    const unsubscribe = subscribeToJob(currentJobId, (updatedJob) => {
      setJobStatus(updatedJob.status);
      
      if (updatedJob.status === 'completed') {
        setGeneratedPlan(updatedJob.result);
        setIsGenerating(false);
        setProgress(100);
        showToast('AI Plan generated successfully!', 'success');
        setCurrentJobId(null);
      } else if (updatedJob.status === 'failed') {
        setIsGenerating(false);
        setProgress(0);
        showToast(updatedJob.error || 'Failed to generate plan', 'error');
        setCurrentJobId(null);
      } else if (updatedJob.status === 'running') {
        setProgress(50); // Indicate processing
      }
    });

    // Fallback polling every 3 seconds
    const pollInterval = setInterval(async () => {
      const result = await getJobStatus(currentJobId);
      if (result.success && result.job) {
        const job = result.job;
        setJobStatus(job.status);
        
        if (job.status === 'completed') {
          setGeneratedPlan(job.result);
          setIsGenerating(false);
          setProgress(100);
          showToast('AI Plan generated successfully!', 'success');
          setCurrentJobId(null);
          clearInterval(pollInterval);
        } else if (job.status === 'failed') {
          setIsGenerating(false);
          setProgress(0);
          showToast(job.error || 'Failed to generate plan', 'error');
          setCurrentJobId(null);
          clearInterval(pollInterval);
        } else if (job.status === 'running') {
          setProgress(50);
        }
      }
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [currentJobId, showToast]);

  const handlePlatformToggle = (platform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform) 
        : [...prev, platform]
    );
  };

  const handleGeneratePlan = async () => {
    if (selectedPlatforms.length === 0) {
      showToast('Please select at least one platform', 'error');
      return;
    }

    setIsGenerating(true);
    setProgress(10);
    
    // Call the backend API to create job
    const result = await createPlanBuilderJob({
      goal: selectedGoal,
      period: selectedPeriod,
      platforms: selectedPlatforms,
      niche: brandProfile?.niche || 'general',
      brandVoiceId: brandProfile?.brandVoice || null // This is a string, not an ID, but API accepts it
    });

    if (result.success) {
      setCurrentJobId(result.jobId);
      setProgress(25);
      showToast('Your AI plan is being generated...', 'info');
    } else {
      setIsGenerating(false);
      setProgress(0);
      showToast(result.error || 'Failed to start plan generation', 'error');
    }
  };

  const generateSchedule = (days, postsPerDay, platforms) => {
    const schedule = [];
    const contentTypes = ['Educational Post', 'Story/Reel', 'Carousel', 'Video', 'Engagement Post'];
    const themes = ['Industry Tips', 'Behind the Scenes', 'User Success Story', 'Trending Topic', 'Product Feature'];
    const times = ['09:00', '12:00', '15:00', '19:00', '20:00'];
    
    for (let day = 1; day <= days; day++) {
      const dayPosts = [];
      for (let post = 0; post < postsPerDay; post++) {
        dayPosts.push({
          time: times[post % times.length],
          type: contentTypes[Math.floor(Math.random() * contentTypes.length)],
          theme: themes[Math.floor(Math.random() * themes.length)],
          platform: platforms[Math.floor(Math.random() * platforms.length)]
        });
      }
      schedule.push({ day, posts: dayPosts });
    }
    
    return schedule;
  };

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-20 px-4 md:px-6 lg:px-8 pb-8">
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-huttle-gradient flex items-center justify-center shadow-lg shadow-huttle-blue/20">
            <Wand2 className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">
              AI Plan Builder
            </h1>
            <p className="text-sm md:text-base text-gray-500">
              Generate strategic 7-14 day content calendars powered by AI
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="card p-5 md:p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-huttle-primary" />
            Set Your Goal
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content Goal</label>
              <select 
                value={selectedGoal}
                onChange={(e) => setSelectedGoal(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
              >
                <option>Grow followers</option>
                <option>Increase engagement</option>
                <option>Build brand awareness</option>
                <option>Drive website traffic</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
              >
                <option>7 days</option>
                <option>14 days</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform Focus</label>
              <div className="flex flex-wrap gap-2">
                {preferredPlatforms.map(platform => (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformToggle(platform.displayName || platform.name)}
                    className={`px-3 py-1.5 border rounded-lg text-sm transition-all ${
                      selectedPlatforms.includes(platform.displayName || platform.name)
                        ? 'border-huttle-primary bg-huttle-primary text-white'
                        : 'border-gray-300 hover:border-huttle-primary hover:text-huttle-primary'
                    }`}
                  >
                    {platform.displayName || platform.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-huttle-50/50 to-cyan-50/50 rounded-xl border border-huttle-primary/20 p-5 md:p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-huttle-primary" />
            AI Recommendations
          </h2>
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-huttle-primary" />
                <span className="font-semibold text-sm">Post Frequency</span>
              </div>
              <p className="text-xs text-gray-600">4 posts per week for optimal growth</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="font-semibold text-sm">Content Mix</span>
              </div>
              <p className="text-xs text-gray-600">60% educational, 30% entertaining, 10% promotional</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-purple-500" />
                <span className="font-semibold text-sm">Best Times</span>
              </div>
              <p className="text-xs text-gray-600">Tuesday & Thursday at 7 PM EST</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6 md:p-8 text-center">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-huttle-cyan-light rounded-2xl flex items-center justify-center mx-auto mb-4">
          {isGenerating ? (
            <Loader className="w-7 h-7 md:w-8 md:h-8 text-huttle-primary animate-spin" />
          ) : (
            <Wand2 className="w-7 h-7 md:w-8 md:h-8 text-huttle-primary" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isGenerating ? 'Generating Your Plan...' : 'Ready to Build Your Plan?'}
        </h3>
        <p className="text-gray-600 mb-6 text-sm md:text-base">
          {isGenerating 
            ? 'Our AI is analyzing trends and creating your personalized content strategy'
            : 'AI will generate a complete content calendar based on your goals and preferences'
          }
        </p>
        
        {isGenerating && (
          <div className="mb-6 max-w-md mx-auto">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-huttle-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {jobStatus === 'running' ? 'Processing with AI...' : jobStatus === 'queued' ? 'Queued for processing...' : 'Starting...'}
            </p>
          </div>
        )}
        
        <button 
          onClick={handleGeneratePlan}
          disabled={isGenerating}
          className="btn-primary px-6 md:px-8 py-2.5 md:py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating...' : 'Generate AI Plan'}
        </button>
      </div>

      {/* Generated Plan Display */}
      {generatedPlan && (
        <div className="mt-8 space-y-6">
          {/* Plan Summary */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your AI-Generated Plan</h2>
                <p className="text-gray-600">Goal: {generatedPlan.goal} over {generatedPlan.period}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Total Posts</h4>
                <p className="text-3xl font-bold text-huttle-primary">{generatedPlan.totalPosts}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Platforms</h4>
                <p className="text-lg font-semibold text-gray-900">{generatedPlan.platforms.join(', ')}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Content Mix</h4>
                <div className="text-sm">
                  <span className="text-green-600 font-semibold">{generatedPlan.contentMix.educational}%</span> Educational • 
                  <span className="text-blue-600 font-semibold"> {generatedPlan.contentMix.entertaining}%</span> Fun • 
                  <span className="text-purple-600 font-semibold"> {generatedPlan.contentMix.promotional}%</span> Promo
                </div>
              </div>
            </div>
          </div>

          {/* Content Calendar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-huttle-primary" />
              Content Calendar
            </h3>
            
            <div className="space-y-4">
              {generatedPlan.schedule.map((daySchedule) => (
                <div key={daySchedule.day} className="border border-gray-200 rounded-lg p-4 hover:border-huttle-primary transition-all">
                  <h4 className="font-bold text-gray-900 mb-3">Day {daySchedule.day}</h4>
                  <div className="space-y-2">
                    {daySchedule.posts.map((post, idx) => (
                      <HoverPreview
                        key={idx}
                        preview={
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-bold text-gray-900 mb-2">{post.type} - {post.theme}</h4>
                              <p className="text-sm text-gray-600 mb-3">
                                Suggested caption: "Share your {post.theme.toLowerCase()} story! This is perfect for engaging your audience and building connection."
                              </p>
                            </div>
                            <div className="space-y-1 text-sm border-t pt-2">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Content Type:</span>
                                <span className="font-semibold">{post.type}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Theme:</span>
                                <span className="font-semibold">{post.theme}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Platform:</span>
                                <span className="font-semibold">{post.platform}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Optimal Time:</span>
                                <span className="font-semibold text-green-600">{formatTo12Hour(post.time)}</span>
                              </div>
                            </div>
                            <div className="bg-blue-50 rounded p-2 text-xs text-blue-800 border-t">
                              💡 This timing is optimized for maximum engagement based on your audience
                            </div>
                          </div>
                        }
                      >
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer">
                          <Clock className="w-5 h-5 text-huttle-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm text-gray-900">{formatTo12Hour(post.time)}</span>
                              <span className="text-xs px-2 py-0.5 bg-huttle-primary text-white rounded">{post.platform}</span>
                            </div>
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">{post.type}</span> • {post.theme}
                            </p>
                          </div>
                        </div>
                      </HoverPreview>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Info Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 font-medium mb-1">
                  Customize Your Plan in Smart Calendar
                </p>
                <p className="text-xs text-blue-700">
                  After exporting, you can edit post details, adjust timing, and make any custom changes within the Smart Calendar.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => setGeneratedPlan(null)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
            >
              Generate New Plan
            </button>
            <button 
              onClick={() => {
                // Add all posts to calendar
                let count = 0;
                const today = new Date();
                generatedPlan.schedule.forEach((daySchedule) => {
                  daySchedule.posts.forEach((post) => {
                    const postDate = new Date(today);
                    postDate.setDate(today.getDate() + daySchedule.day - 1);
                    const dateStr = postDate.toISOString().split('T')[0];
                    
                    schedulePost({
                      title: `${post.theme} - ${post.type}`,
                      platforms: [post.platform],
                      contentType: post.type,
                      scheduledDate: dateStr,
                      scheduledTime: post.time,
                      caption: `Generated from AI Plan Builder: ${post.theme}`,
                      hashtags: '',
                      keywords: ''
                    });
                    count++;
                  });
                });
                showToast(`${count} posts added to Smart Calendar!`, 'success');
              }}
              className="px-6 py-3 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all shadow-md font-medium"
            >
              Export to Calendar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

