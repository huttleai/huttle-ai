import { useState, useContext } from 'react';
import { HelpCircle, Book, Mail, X, Star, Send, MessageSquarePlus, ChevronRight, 
  LayoutDashboard, Calendar, FolderOpen, Wand2, Zap, Beaker, Repeat, Bot, Waves, Settings } from 'lucide-react';
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
      answer: 'AI generations are used when Trend Lab, AI Plan Builder, or AI Power Tools create content for you. Each AI action (generating captions, hashtags, content ideas, etc.) counts as one generation. Your subscription plan determines your monthly limit.'
    },
    {
      question: 'When do my AI generations reset?',
      answer: 'AI generations reset on the first day of each month at midnight UTC. Any unused generations do not roll over to the next month. You can track your usage in the sidebar or on the Subscription page.'
    },
    {
      question: 'Can I connect multiple social accounts?',
      answer: 'Yes! You can connect Instagram, TikTok, YouTube, Facebook, and X (Twitter) from Settings > Connected Accounts. Each platform can have one connected account per Huttle AI account.'
    },
    {
      question: 'How does the Trend Lab work?',
      answer: 'Trend Lab uses real-time AI analysis to scan social platforms and identify emerging trends in your niche. It provides trend scores, growth predictions, and content suggestions to help you create timely, relevant content.'
    },
    {
      question: 'How do I schedule posts with Smart Calendar?',
      answer: 'Navigate to Smart Calendar, click on any date or use the "Create Post" button. Select your platforms, add your content, choose the date and time, and click Schedule. The calendar shows optimal posting times based on your audience engagement patterns.'
    },
    {
      question: 'What is Brand Voice and how do I set it up?',
      answer: 'Brand Voice helps AI understand your unique style. Go to Brand Voice page, describe your brand personality, tone, target audience, and key messaging. The AI will then generate content that matches your brand identity.'
    },
    {
      question: 'What are the differences between subscription tiers?',
      answer: 'Free tier includes 20 AI generations/month and basic features. Essentials ($9/mo) offers 300 generations and full calendar access. Pro ($19/mo) includes 500 generations, Content Repurposer, priority support, and advanced analytics.'
    },
    {
      question: 'How do I save content to my Content Library?',
      answer: 'When you generate content using any AI tool, click the "Save to Library" button. You can also manually add content from the Content Library page. Organize saved content with tags and folders for easy access later.'
    },
    {
      question: 'Is my data secure and private?',
      answer: 'Yes, we take data security seriously. Your content and account information are encrypted and stored securely. We never share your data with third parties. You can delete your account and all associated data at any time from Settings.'
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
      description: 'Your central hub for Huttle AI',
      tips: [
        'View your content performance at a glance',
        'See upcoming scheduled posts',
        'Track your AI generation usage',
        'Quick access to recent activity and trends'
      ]
    },
    { 
      id: 'calendar', 
      name: 'Smart Calendar', 
      icon: Calendar,
      description: 'Schedule and manage your social media posts',
      tips: [
        'Click any date to create a new post',
        'Drag and drop posts to reschedule',
        'Green highlights show optimal posting times',
        'Filter by platform to see specific content'
      ]
    },
    { 
      id: 'library', 
      name: 'Content Library', 
      icon: FolderOpen,
      description: 'Store and organize your content',
      tips: [
        'Save generated content for later use',
        'Organize with tags and categories',
        'Search through your saved content',
        'Export content for external use'
      ]
    },
    { 
      id: 'plan-builder', 
      name: 'AI Plan Builder', 
      icon: Wand2,
      description: 'Create comprehensive content plans',
      tips: [
        'Generate a week or month of content ideas',
        'Customize based on your niche and goals',
        'Export plans to your calendar',
        'Edit and refine AI suggestions'
      ]
    },
    { 
      id: 'ai-tools', 
      name: 'AI Power Tools', 
      icon: Zap,
      description: 'Quick AI-powered content generation',
      tips: [
        'Generate captions instantly',
        'Create relevant hashtag sets',
        'Get content ideas for any topic',
        'Improve existing content with AI'
      ]
    },
    { 
      id: 'trend-lab', 
      name: 'Trend Lab', 
      icon: Beaker,
      description: 'Discover trending topics and content',
      tips: [
        'See real-time trending topics',
        'Filter trends by your niche',
        'Get content suggestions for trends',
        'Track trend momentum over time'
      ]
    },
    { 
      id: 'repurposer', 
      name: 'Content Repurposer', 
      icon: Repeat,
      description: 'Transform content for different platforms',
      tips: [
        'Convert long-form to short-form content',
        'Adapt content for different platforms',
        'Create multiple variations from one piece',
        'Maintain brand voice across formats'
      ]
    },
    { 
      id: 'brand-voice', 
      name: 'Brand Voice', 
      icon: Waves,
      description: 'Define your unique brand identity',
      tips: [
        'Describe your brand personality',
        'Set your preferred tone and style',
        'Define your target audience',
        'AI will match your voice in generations'
      ]
    },
    { 
      id: 'settings', 
      name: 'Settings', 
      icon: Settings,
      description: 'Configure your account',
      tips: [
        'Connect social media accounts',
        'Manage notification preferences',
        'Update account information',
        'Configure timezone and language'
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
    console.log('Email support request:', emailData);
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
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-20 px-4 md:px-6 lg:px-8 pb-8">
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-huttle-gradient flex items-center justify-center shadow-lg shadow-huttle-blue/20">
            <HelpCircle className="w-6 h-6 md:w-7 md:h-7 text-white" />
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
              <p className="text-sm text-gray-600">{faq.answer}</p>
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
