import { useState, useContext } from 'react';
import { HelpCircle, Book, Mail, X, Star, Send, MessageSquarePlus, ChevronRight, 
  LayoutDashboard, FolderOpen, Wand2, Zap, Beaker, Repeat, Waves, Settings, FileText, Target } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import { useToast } from '../context/ToastContext';

export default function Help() {
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();
  
  // Modal states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  // Feedback form state
  const [feedbackType, setFeedbackType] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  // Email form state
  const [emailData, setEmailData] = useState({
    email: user?.email || '',
    subject: '',
    message: ''
  });
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  
  // Documentation state
  const [selectedFeature, setSelectedFeature] = useState(null);

  const faqs = [
    {
      question: 'How do AI generations work?',
      answer: 'AI generations power all of Huttle AI\'s intelligent features. Each plan includes a different monthly pool:\n\n• Essentials ($15/mo): 200 generations/month\n• Pro ($39/mo): 800 generations/month\n\nPro plans also have per-feature sub-limits on advanced tools to ensure fair usage:\n\n• Niche Intel: 5/month\n• Trend Discovery (Deep Dive): 50/month\n• Content Remix Studio: 75/month\n• Viral Blueprint: 40/month\n• AI Plan Builder: 20/month\n• All other AI tools (Captions, Hashtags, Hooks, CTAs, Scorer, Visual Brainstormer): No individual cap — they count toward your monthly total.\n\nYour usage resets at the start of each billing cycle. Track it in the sidebar AI meter or on each feature\'s page.'
    },
    {
      question: 'When do my AI generations reset?',
      answer: 'AI generations reset on the first day of each month at midnight UTC. Any unused generations do not roll over to the next month. You can track your usage in the sidebar or on the Subscription page.'
    },
    {
      question: 'How do I publish to social media?',
      answer: 'Huttle AI uses a Copy & Open flow for posting. Click "Ready to Post" on any scheduled post, copy the full text (or caption/hashtags only), open your platform (Instagram, TikTok, YouTube, Facebook, or X), then paste and publish natively. Huttle AI never connects to your social accounts — publishing is always copy-and-paste to the native app.'
    },
    {
      question: 'What is the Full Post Builder?',
      answer: 'Full Post Builder is a guided 5-step wizard that creates a complete, publish-ready post from scratch. You walk through Topic → Hook → Caption → Hashtags → CTA, with AI generating options at each step. Once finished, three scoring badges (Quality, Human Score, and Algorithm Alignment) grade your post so you can fine-tune before publishing. Your draft auto-saves so you can resume later.'
    },
    {
      question: 'What is Niche Intel?',
      answer: 'Niche Intel is an AI-powered research engine available on Pro and Founders Club plans. Enter your niche keywords or competitor handles and select a platform — the AI researches what content is actually working and returns Trending Themes (with momentum badges), Top Hook Patterns, Content Gap Opportunities, and 5 tailored Content Ideas. Click "Build Post" on any idea to send it directly to the Full Post Builder.'
    },
    {
      question: 'How does the Trend Lab work?',
      answer: 'Trend Lab is your hub for real-time trend intelligence. It has three sections:\n\n• Quick Scan — a rapid AI scan of rising topics in your niche, showing momentum, opportunity windows, and active platforms.\n• Deep Dive — a full intelligence report on a specific topic with competitor activity, audience sentiment, timing windows, and cited sources (Essentials/Pro).\n• Algorithm Alignment Checker — paste any draft content and select a platform to see how well it matches the platform\'s ranking signals.\n\nClick "Create Content" on any trend to jump to AI Tools, or "Remix" to send it to Content Remix Studio.'
    },
    {
      question: 'How do I save and organize content?',
      answer: 'Use the Content Vault to store images, videos, and text content. Create Projects (custom folders) to organize your assets, and switch between Grid and List views. Filter by type (Images / Videos / Text), search by name, or browse by Project. Every AI tool has a "Save to Vault" button so generated content lands here automatically.\n\nStorage limits by plan: Free 250 MB, Essentials 5 GB, Pro 25 GB. Track your usage in the storage meter on the Content Vault page.'
    },
    {
      question: 'What is Brand Voice and how do I set it up?',
      answer: 'Brand Voice helps AI understand your unique style. Go to Brand Voice page, describe your brand personality, tone, target audience, and key messaging. Select your active social platforms — these power features like Trend Lab, Remix Studio, and Viral Blueprint. The AI will then adapt all generated content to match your brand identity.'
    },
    {
      question: 'Is my data secure and private?',
      answer: 'Yes, we take data security seriously. Your content and account information are encrypted and stored securely. We never share your data with third parties. Huttle AI never connects to your social media accounts. You can delete your account and all associated data at any time from Settings.'
    }
  ];

  const feedbackTypes = [
    { id: 'bug', label: 'Bug Report', description: 'Something isn\'t working correctly' },
    { id: 'feature', label: 'Feature Request', description: 'Suggest a new feature or improvement' },
    { id: 'general', label: 'General Feedback', description: 'Share your thoughts and experience' }
  ];

  const features = [
    { 
      id: 'dashboard', 
      name: 'Dashboard', 
      icon: LayoutDashboard,
      description: 'Your personalized daily content intelligence hub',
      tips: [
        'Trending Now shows 4 AI-curated trending topics in your niche with momentum badges and content angles',
        'Hashtags of the Day gives you daily curated hashtags with reach estimates — click to copy any or all',
        'AI Insights delivers 3 daily tips on timing, audience, platform strategy, and content types',
        'Quick Create shortcuts let you jump straight into any of the 6 AI Power Tools',
        'Recently Saved shows your latest Content Vault items for fast access',
        'Dashboard data refreshes daily at 6 AM ET — check the freshness indicator in the header'
      ]
    },
    { 
      id: 'content-vault', 
      name: 'Content Vault', 
      icon: FolderOpen,
      description: 'Cloud storage and organization for all your content assets',
      tips: [
        'Upload images (PNG/JPG/GIF), videos (MP4/MOV), or paste text content like captions and hooks',
        'Create Projects to organize content into custom folders — assign items during upload or later',
        'Switch between Grid view (visual thumbnails) and List view (metadata-dense rows)',
        'Use the type filter tabs (All / Images / Videos / Text) and search bar to find content quickly',
        'Click any item to preview, edit text inline, copy to clipboard, download, or move between projects',
        'Storage limits vary by plan: Free 250 MB, Essentials 5 GB, Pro 25 GB — track usage in the sidebar meter'
      ]
    },
    { 
      id: 'full-post-builder', 
      name: 'Full Post Builder', 
      icon: FileText,
      description: 'Guided 5-step wizard to create a complete, publish-ready post',
      tips: [
        'Step 1 — Enter your topic, select a platform and content goal (grow followers, drive engagement, generate leads, or make a sale)',
        'Step 2 — Choose from 3 AI-generated hooks (Question, Bold Claim, Story, etc.) or regenerate for fresh options',
        'Step 3 — Review and edit the AI-generated caption with a live character count for your platform\'s limit',
        'Step 4 — Get up to 10 ranked hashtags labeled by tier (broad / mid / niche) with relevance scores',
        'Step 5 — Pick a call-to-action style (Direct, Soft, Urgency, Question, Story) to close your post',
        'Three scoring badges (Quality, Human Score, Algorithm Alignment) grade your finished post — use Copy All or Save to Vault'
      ]
    },
    { 
      id: 'plan-builder', 
      name: 'AI Plan Builder', 
      icon: Wand2,
      description: 'Generate a 7-day or 14-day content strategy with AI',
      tips: [
        'Set your content goal, time period (7 or 14 days), platform focus, and brand voice description',
        'AI generates a day-by-day card grid with topic, format, best posting time, and tone for each day',
        'Click "Open in Post Builder" on any day\'s card to start building that post immediately',
        'Use "Save Full Plan to Vault" to keep the entire plan, or "Export Plan" to copy a text summary to clipboard',
        'Generation takes about 25 seconds — a progress bar tracks it in real time'
      ]
    },
    { 
      id: 'ai-tools', 
      name: 'AI Power Tools', 
      icon: Zap,
      description: '6 specialized AI tools for sharpening every part of your content',
      tips: [
        'Caption Generator — create up to 4 caption variations by keyword, platform, length, and tone',
        'Hashtag Generator — get ranked hashtags with engagement scores and estimated reach per platform',
        'Hook Builder — generate scroll-stopping openers in styles like Question, Teaser, Shocking Statement, or Story',
        'CTA Suggester — get 3 call-to-action options (Direct, Soft, Urgency, Question, Story) tailored to your goal',
        'Content Scorer — 4 sub-tabs: Quality Score, Human Score (AI detection), Performance Prediction, and Algorithm Alignment',
        'Visual Brainstormer — choose a content format and get either AI Image Prompts or a Manual Shoot Guide with shot list, lighting, and props'
      ]
    },
    { 
      id: 'trend-lab', 
      name: 'Trend Lab', 
      icon: Beaker,
      description: 'Discover trending topics, check algorithm alignment, and plan timely content',
      tips: [
        'Quick Scan runs a rapid AI scan of rising topics in your niche with momentum badges and opportunity windows',
        'Deep Dive produces a full intelligence report for any topic — competitor activity, audience sentiment, timing windows, and sources',
        'Algorithm Alignment Checker scores how well your draft content matches a platform\'s ranking signals',
        'Click "Create Content" on any trend to jump to AI Tools with the topic pre-filled, or "Remix" to send it to Content Remix Studio',
        'Trend Forecaster (Coming Soon) will deliver a 7-day outlook with velocity predictions'
      ]
    },
    { 
      id: 'niche-intel', 
      name: 'Niche Intel', 
      icon: Target,
      description: 'AI-powered research engine that reveals what content is working in your niche (Pro)',
      tips: [
        'Enter your niche keywords or competitor handles, select a platform, and click "Analyze Now"',
        'Trending Themes show momentum badges (Rising / Peaking / Declining), best formats, and why each theme is working',
        'Top Hook Patterns give you ready-to-use, scroll-stopping hook templates — click to copy',
        'Content Gap Opportunities surface topics your competitors are missing, with opportunity tiers',
        '5 Content Ideas are tailored to your brand — click "Build Post" to send any idea to Full Post Builder',
        'Available on Pro plan (5 analyses/month) and Founders Club (10/month)'
      ]
    },
    { 
      id: 'content-remix', 
      name: 'Content Remix Studio', 
      icon: Repeat,
      description: '4-step wizard to remix any content for multiple platforms at once',
      tips: [
        'Step 1 — Paste any content (captions, blog excerpts, emails, scripts) with a 10-character minimum',
        'Step 2 — Choose a remix goal: Viral Reach, Sales Conversion, Educational, or Community Building',
        'Step 3 — Select which of your Brand Voice platforms to generate remixed versions for',
        'Step 4 — Review per-platform results with up to 3 variations each — Copy, Save to Vault, or Remix Again',
        'Trending topics from Trend Lab can be sent directly here via the "Remix" button'
      ]
    },
    { 
      id: 'viral-blueprint', 
      name: 'Viral Blueprint', 
      icon: Zap,
      description: 'AI-generated complete content blueprint with scripts, visuals, and SEO strategy',
      tips: [
        'Select a platform and format (Reel, Carousel, Thread, Short, etc.) then fill in your goal, topic, and audience',
        'The blueprint includes Viral Hooks (copy-on-click), a Director\'s Cut with script and visual direction per section',
        'SEO Strategy provides trending keywords and optimized hashtags with a "Copy All Tags" button',
        'Video content includes Audio Vibe recommendations with mood, BPM, and audio suggestions',
        'A Viral Score gauge (0–100) rates the overall virality potential of your blueprint',
        'Generation takes 60–90 seconds — available on Essentials and Pro plans'
      ]
    },
    { 
      id: 'brand-voice', 
      name: 'Brand Voice', 
      icon: Waves,
      description: 'Define your brand identity so AI matches your unique style',
      tips: [
        'Describe your brand personality, tone, and preferred writing style',
        'Set your target audience and key messaging pillars',
        'Select your active social platforms — these power Trend Lab, Remix Studio, and Viral Blueprint',
        'All AI-generated content across Huttle AI will adapt to your configured voice'
      ]
    },
    { 
      id: 'settings', 
      name: 'Settings', 
      icon: Settings,
      description: 'Manage your account, platforms, billing, and preferences',
      tips: [
        'Quick Nav cards link you to Profile, Brand Voice, Security, and Billing pages',
        'Preferred Platforms toggles control which platforms appear in Trend Lab, Remix Studio, and publishing flows',
        'Manage Billing opens the Stripe Customer Portal for plan changes, payment methods, and cancellation',
        'General settings let you choose your language and timezone',
        'Notification toggles control Trend Alerts and AI Usage Alerts'
      ]
    }
  ];

  const emailSubjects = [
    { id: 'technical', label: 'Technical Issue' },
    { id: 'billing', label: 'Billing Question' },
    { id: 'feature', label: 'Feature Question' },
    { id: 'other', label: 'Other' }
  ];

  const handleFeedbackSubmit = async () => {
    if (!user?.id) {
      showToast('Please log in to submit feedback', 'error');
      return;
    }

    if (!feedbackType || !feedbackText.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_feedback')
        .insert({
          user_id: user.id,
          feedback_type: feedbackType,
          rating: feedbackRating || null,
          feedback_text: feedbackText.trim(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      showToast('Thank you for your feedback!', 'success');
      setFeedbackSubmitted(true);
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackSubmitted(false);
        setFeedbackType('');
        setFeedbackRating(0);
        setFeedbackText('');
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showToast('Failed to submit feedback. Please try again.', 'error');
    }
  };

  const handleEmailSubmit = () => {
    // Here you would typically send to an email service or API
    setEmailSubmitted(true);
    setTimeout(() => {
      setShowEmailModal(false);
      setEmailSubmitted(false);
      setEmailData({ email: user?.email || '', subject: '', message: '' });
    }, 2000);
  };

  const resetDocsModal = () => {
    setShowDocsModal(false);
    setSelectedFeature(null);
  };

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-24 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8">
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
            <HelpCircle className="w-6 h-6 md:w-7 md:h-7 text-huttle-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">
              Help Center
            </h1>
            <p className="text-sm md:text-base text-gray-500">
              Get answers and support for Huttle AI
            </p>
          </div>
        </div>
      </div>

      {/* Help Tiles - Now 3 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Documentation Tile */}
        <div 
          onClick={() => setShowDocsModal(true)}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer hover:border-huttle-primary/30"
        >
          <Book className="w-8 h-8 text-huttle-primary mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Documentation</h3>
          <p className="text-sm text-gray-600 mb-3">Learn how to use all features</p>
          <div className="flex items-center text-huttle-primary text-sm font-medium">
            Browse Docs
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>

        {/* Email Support Tile */}
        <div 
          onClick={() => setShowEmailModal(true)}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer hover:border-huttle-primary/30"
        >
          <Mail className="w-8 h-8 text-huttle-primary mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
          <p className="text-sm text-gray-600 mb-3">Get help via email</p>
          <div className="flex items-center text-huttle-primary text-sm font-medium">
            Send Email
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>

        {/* Feedback Tile */}
        <div 
          onClick={() => setShowFeedbackModal(true)}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer hover:border-huttle-primary/30"
        >
          <MessageSquarePlus className="w-8 h-8 text-huttle-primary mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Feedback</h3>
          <p className="text-sm text-gray-600 mb-3">Share your experience with us</p>
          <div className="flex items-center text-huttle-primary text-sm font-medium">
            Give Feedback
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>
      </div>

      {/* FAQs Section */}
      <div className="card p-5 md:p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-huttle-primary" />
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-gray-200 pb-4 last:border-0">
              <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900">Share Your Feedback</h2>
              <button 
                onClick={() => {
                  setShowFeedbackModal(false);
                  setFeedbackSubmitted(false);
                  setFeedbackType('');
                  setFeedbackRating(0);
                  setFeedbackText('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              {feedbackSubmitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Thank You!</h3>
                  <p className="text-gray-600">Your feedback has been submitted successfully.</p>
                </div>
              ) : (
                <>
                  {/* Feedback Type Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      What type of feedback do you have?
                    </label>
                    <div className="space-y-2">
                      {feedbackTypes.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setFeedbackType(type.id)}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                            feedbackType === type.id 
                              ? 'border-huttle-primary bg-cyan-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-gray-900">{type.label}</div>
                          <div className="text-sm text-gray-500">{type.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Star Rating */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      How would you rate your experience?
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setFeedbackRating(star)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star 
                            className={`w-8 h-8 ${
                              star <= feedbackRating 
                                ? 'text-yellow-400 fill-yellow-400' 
                                : 'text-gray-300'
                            }`} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feedback Text */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tell us more
                    </label>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Share your thoughts, suggestions, or report an issue..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-huttle-primary focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleFeedbackSubmit}
                    disabled={!feedbackType || !feedbackText}
                    className="w-full py-3 bg-huttle-primary text-white rounded-xl font-semibold hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Feedback
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Documentation Modal */}
      {showDocsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedFeature && (
                  <button 
                    onClick={() => setSelectedFeature(null)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-500 rotate-180" />
                  </button>
                )}
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedFeature ? selectedFeature.name : 'Feature Documentation'}
                </h2>
              </div>
              <button 
                onClick={resetDocsModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {selectedFeature ? (
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center">
                      <selectedFeature.icon className="w-7 h-7 text-huttle-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{selectedFeature.name}</h3>
                      <p className="text-gray-600">{selectedFeature.description}</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h4 className="font-semibold text-gray-900 mb-4">Tips & How to Use</h4>
                    <ul className="space-y-3">
                      {selectedFeature.tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-huttle-primary text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                            {index + 1}
                          </div>
                          <span className="text-gray-700">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-6">Select a feature to learn more about how to use it:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {features.map((feature) => (
                      <button
                        key={feature.id}
                        onClick={() => setSelectedFeature(feature)}
                        className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-huttle-primary hover:bg-cyan-50/50 transition-all text-left group"
                      >
                        <div className="w-10 h-10 bg-gray-100 group-hover:bg-cyan-100 rounded-lg flex items-center justify-center transition-colors">
                          <feature.icon className="w-5 h-5 text-gray-600 group-hover:text-huttle-primary transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{feature.name}</div>
                          <div className="text-xs text-gray-500 truncate">{feature.description}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-huttle-primary transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email Support Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900">Email Support</h2>
              <button 
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailSubmitted(false);
                  setEmailData({ email: user?.email || '', subject: '', message: '' });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              {emailSubmitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-600">We'll get back to you within 24-48 hours.</p>
                </div>
              ) : (
                <>
                  {/* Email Address */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Email
                    </label>
                    <input
                      type="email"
                      value={emailData.email}
                      onChange={(e) => setEmailData({ ...emailData, email: e.target.value })}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-huttle-primary focus:border-transparent"
                    />
                  </div>

                  {/* Subject Dropdown */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <select
                      value={emailData.subject}
                      onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-huttle-primary focus:border-transparent bg-white"
                    >
                      <option value="">Select a topic...</option>
                      {emailSubjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Message */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      value={emailData.message}
                      onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                      placeholder="Describe your issue or question in detail..."
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-huttle-primary focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleEmailSubmit}
                    disabled={!emailData.email || !emailData.subject || !emailData.message}
                    className="w-full py-3 bg-huttle-primary text-white rounded-xl font-semibold hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send Message
                  </button>
                  
                  <p className="text-xs text-gray-500 text-center mt-4">
                    We typically respond within 24-48 business hours
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
