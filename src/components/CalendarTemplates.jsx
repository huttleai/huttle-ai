import { useState, useContext } from 'react';
import { X, Calendar, Sparkles, Loader2, Check, ChevronRight, Rocket, TrendingUp, Users, Gift, Megaphone, Target } from 'lucide-react';
import { BrandContext } from '../context/BrandContext';
import { useContent } from '../context/ContentContext';
import { useToast } from '../context/ToastContext';
import { generateContentPlan } from '../services/grokAPI';

/**
 * Pre-built content calendar templates
 */
const TEMPLATES = [
  {
    id: 'product-launch',
    name: 'Product Launch Week',
    icon: Rocket,
    color: 'from-orange-500 to-red-500',
    description: 'Build anticipation and drive sales with a strategic launch sequence',
    duration: '7 days',
    postsPerDay: 2,
    phases: ['Teaser', 'Countdown', 'Launch Day', 'Social Proof', 'Final Push'],
    prompt: 'Create a 7-day product launch content calendar with teaser posts, countdown content, launch day announcements, customer testimonials/social proof, and final call-to-action posts.'
  },
  {
    id: 'engagement-boost',
    name: 'Engagement Boost',
    icon: TrendingUp,
    color: 'from-green-500 to-emerald-500',
    description: 'Maximize interactions with conversation-starting content',
    duration: '5 days',
    postsPerDay: 2,
    phases: ['Questions', 'Polls', 'Stories', 'UGC', 'Challenges'],
    prompt: 'Create a 5-day engagement-focused content calendar with question posts, polls, interactive stories, user-generated content prompts, and viral challenge ideas.'
  },
  {
    id: 'brand-awareness',
    name: 'Brand Awareness',
    icon: Megaphone,
    color: 'from-purple-500 to-violet-500',
    description: 'Introduce your brand and build recognition',
    duration: '7 days',
    postsPerDay: 1,
    phases: ['Brand Story', 'Values', 'Behind Scenes', 'Team', 'Mission'],
    prompt: 'Create a 7-day brand awareness content calendar with brand story posts, values-focused content, behind-the-scenes glimpses, team introductions, and mission-driven content.'
  },
  {
    id: 'community-building',
    name: 'Community Building',
    icon: Users,
    color: 'from-blue-500 to-cyan-500',
    description: 'Foster connections and grow your loyal community',
    duration: '7 days',
    postsPerDay: 1,
    phases: ['Welcome', 'Spotlight', 'Q&A', 'Tips', 'Celebration'],
    prompt: 'Create a 7-day community building content calendar with welcome/intro posts, member spotlights, Q&A sessions, exclusive tips, and community celebration posts.'
  },
  {
    id: 'seasonal-campaign',
    name: 'Seasonal Campaign',
    icon: Gift,
    color: 'from-pink-500 to-rose-500',
    description: 'Capitalize on holidays and seasonal trends',
    duration: '5 days',
    postsPerDay: 2,
    phases: ['Teaser', 'Theme', 'Offers', 'Urgency', 'Last Chance'],
    prompt: 'Create a 5-day seasonal/holiday campaign content calendar with themed teasers, festive content, special offers, urgency-building posts, and last-chance reminders.'
  },
  {
    id: 'lead-generation',
    name: 'Lead Generation',
    icon: Target,
    color: 'from-amber-500 to-yellow-500',
    description: 'Convert followers into leads with strategic content',
    duration: '7 days',
    postsPerDay: 1,
    phases: ['Pain Point', 'Solution', 'Value', 'Social Proof', 'CTA'],
    prompt: 'Create a 7-day lead generation content calendar with pain point awareness posts, solution teasers, value-packed content, testimonials/case studies, and strong call-to-action posts.'
  }
];

/**
 * CalendarTemplates - Pre-built content calendar templates with AI generation
 */
export default function CalendarTemplates({ isOpen, onClose, onApplyTemplate }) {
  const { brandData } = useContext(BrandContext);
  const { schedulePost } = useContent();
  const { showToast } = useToast();
  
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setGeneratedPlan(null);
  };

  const handleGeneratePlan = async () => {
    if (!selectedTemplate) return;

    setIsGenerating(true);
    try {
      const result = await generateContentPlan(
        selectedTemplate.prompt,
        brandData,
        parseInt(selectedTemplate.duration)
      );

      if (result.success) {
        // Parse the generated plan into structured posts
        const posts = parsePlanToPosts(result.plan, selectedTemplate);
        setGeneratedPlan({
          template: selectedTemplate,
          rawPlan: result.plan,
          posts
        });
        showToast('Content plan generated! Review and apply to your calendar.', 'success');
      } else {
        showToast('Failed to generate plan. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Plan generation error:', error);
      showToast('Error generating plan', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Parse AI-generated plan into structured posts
  const parsePlanToPosts = (planText, template) => {
    const posts = [];
    const days = parseInt(template.duration);
    const postsPerDay = template.postsPerDay;
    
    // Split by day markers
    const dayMatches = planText.split(/Day\s+\d+|DAY\s+\d+/i).filter(s => s.trim());
    
    for (let day = 0; day < days; day++) {
      const dayContent = dayMatches[day] || '';
      const baseDate = new Date(startDate);
      baseDate.setDate(baseDate.getDate() + day);
      const dateStr = baseDate.toISOString().split('T')[0];
      
      // Extract post ideas from day content
      const postIdeas = dayContent.split(/\n\s*[-•]\s*|\n\d+\.\s*/).filter(s => s.trim().length > 10);
      
      for (let p = 0; p < postsPerDay && p < postIdeas.length; p++) {
        const content = postIdeas[p]?.trim() || `${template.phases[day % template.phases.length]} post`;
        posts.push({
          id: `${day}-${p}`,
          day: day + 1,
          date: dateStr,
          time: p === 0 ? '09:00' : '18:00',
          phase: template.phases[day % template.phases.length],
          title: `Day ${day + 1}: ${template.phases[day % template.phases.length]}`,
          caption: content.substring(0, 500),
          platform: 'Instagram', // Default, can be changed
          selected: true
        });
      }
    }
    
    return posts;
  };

  const handleApplyToCalendar = async () => {
    if (!generatedPlan || !generatedPlan.posts.length) return;

    setIsApplying(true);
    const selectedPosts = generatedPlan.posts.filter(p => p.selected);
    
    let scheduled = 0;
    for (const post of selectedPosts) {
      try {
        const postData = {
          title: post.title,
          platforms: [post.platform],
          contentType: 'Text Post',
          scheduledDate: post.date,
          scheduledTime: post.time,
          caption: post.caption,
          hashtags: '',
          keywords: selectedTemplate.name,
          imagePrompt: '',
          videoPrompt: '',
          media: []
        };

        const postId = await schedulePost(postData);
        if (postId) scheduled++;
      } catch (error) {
        console.error('Error scheduling post:', error);
      }
    }

    showToast(`Scheduled ${scheduled} posts to your calendar!`, 'success');
    setIsApplying(false);
    
    if (onApplyTemplate) {
      onApplyTemplate(generatedPlan);
    }
    
    onClose();
  };

  const togglePostSelection = (postId) => {
    setGeneratedPlan(prev => ({
      ...prev,
      posts: prev.posts.map(p => 
        p.id === postId ? { ...p, selected: !p.selected } : p
      )
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-huttle-primary" />
              Content Calendar Templates
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose a template and let AI generate a customized content plan
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!selectedTemplate ? (
            /* Template Selection Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className="text-left p-5 rounded-xl border-2 border-gray-200 hover:border-huttle-primary hover:shadow-lg transition-all group"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="bg-gray-100 px-2 py-1 rounded">{template.duration}</span>
                      <span className="bg-gray-100 px-2 py-1 rounded">{template.postsPerDay}/day</span>
                    </div>
                    <div className="flex items-center gap-1 text-huttle-primary text-sm font-medium mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Select</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : !generatedPlan ? (
            /* Template Configuration */
            <div className="space-y-6">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                ← Back to templates
              </button>

              <div className="flex items-start gap-4 p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${selectedTemplate.color} flex items-center justify-center flex-shrink-0`}>
                  <selectedTemplate.icon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedTemplate.name}</h3>
                  <p className="text-gray-600 mb-4">{selectedTemplate.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedTemplate.phases.map((phase, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700"
                      >
                        {phase}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span><strong>{selectedTemplate.duration}</strong> duration</span>
                    <span><strong>{selectedTemplate.postsPerDay}</strong> posts/day</span>
                    <span><strong>{parseInt(selectedTemplate.duration) * selectedTemplate.postsPerDay}</strong> total posts</span>
                  </div>
                </div>
              </div>

              {/* Start Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGeneratePlan}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-huttle-primary to-huttle-primary-light text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-huttle-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Your Content Plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Content Plan with AI
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Generated Plan Preview */
            <div className="space-y-6">
              <button
                onClick={() => setGeneratedPlan(null)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                ← Back to configuration
              </button>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Your {selectedTemplate.name} Plan
                  </h3>
                  <p className="text-sm text-gray-600">
                    {generatedPlan.posts.filter(p => p.selected).length} posts selected • Starting {new Date(startDate).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const allSelected = generatedPlan.posts.every(p => p.selected);
                    setGeneratedPlan(prev => ({
                      ...prev,
                      posts: prev.posts.map(p => ({ ...p, selected: !allSelected }))
                    }));
                  }}
                  className="text-sm text-huttle-primary hover:underline"
                >
                  {generatedPlan.posts.every(p => p.selected) ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Posts List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {generatedPlan.posts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => togglePostSelection(post.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      post.selected
                        ? 'border-huttle-primary bg-huttle-primary/5'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        post.selected ? 'border-huttle-primary bg-huttle-primary' : 'border-gray-300'
                      }`}>
                        {post.selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-huttle-primary bg-huttle-primary/10 px-2 py-0.5 rounded">
                            Day {post.day}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(post.date).toLocaleDateString()} at {post.time}
                          </span>
                          <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                            {post.phase}
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">{post.title}</h4>
                        <p className="text-xs text-gray-600 line-clamp-2">{post.caption}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Apply Button */}
              <button
                onClick={handleApplyToCalendar}
                disabled={isApplying || generatedPlan.posts.filter(p => p.selected).length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-huttle-primary to-huttle-primary-light text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-huttle-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Adding to Calendar...
                  </>
                ) : (
                  <>
                    <Calendar className="w-5 h-5" />
                    Add {generatedPlan.posts.filter(p => p.selected).length} Posts to Calendar
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Template button for use in SmartCalendar header
 */
export function CalendarTemplateButton({ onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 bg-huttle-gradient hover:bg-huttle-primary-dark text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md ${className}`}
    >
      <Sparkles className="w-4 h-4" />
      <span>Templates</span>
    </button>
  );
}

