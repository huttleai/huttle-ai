import { Bot, Sparkles, Crown, Zap, Brain, Target, TrendingUp, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HuttleAgent() {
  const features = [
    { icon: Brain, title: 'Intelligent Content Strategy', description: 'AI analyzes your niche and creates custom content plans' },
    { icon: Target, title: 'Audience Targeting', description: 'Identifies and reaches your ideal audience automatically' },
    { icon: TrendingUp, title: 'Real-Time Optimization', description: 'Continuously improves your content based on performance' },
    { icon: MessageSquare, title: 'Natural Conversation', description: 'Chat with your AI assistant like a real strategist' },
    { icon: Zap, title: 'Automated Workflows', description: 'Set it and forget it - Agent handles scheduling and posting' },
    { icon: Sparkles, title: 'Creative Ideation', description: 'Never run out of content ideas with AI brainstorming' }
  ];

  return (
    <div className="flex-1 bg-gray-50 ml-0 lg:ml-64 pt-20 px-4 md:px-8 pb-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-huttle-primary via-huttle-primary-dark to-purple-600 rounded-2xl shadow-2xl p-8 md:p-12 mb-8 text-white">
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white bg-opacity-20 px-4 py-2 rounded-full mb-4">
            <Crown className="w-4 h-4" />
            <span className="text-sm font-semibold">PRO EXCLUSIVE</span>
          </div>
          
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bot className="w-16 h-16" />
            <h1 className="text-4xl md:text-5xl font-bold">
              Huttle Agent
            </h1>
          </div>
          
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-gray-900 px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="font-bold">COMING SOON</span>
          </div>
          
          <p className="text-xl md:text-2xl font-medium mb-2">
            Your Personal AI Content Strategist
          </p>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            An intelligent assistant that understands your brand, creates content strategies, and manages your entire social media presence automatically.
          </p>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
      </div>

      {/* Features Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">What Huttle Agent Will Do</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-huttle-primary bg-opacity-10 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-huttle-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Availability Notice */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-3">Pro Users Get Early Access</h3>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Huttle Agent will be exclusively available to Pro subscribers when it launches. 
          Upgrade now to be first in line for the most powerful AI content assistant ever created.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/subscription"
            className="px-8 py-3 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all shadow-md font-semibold"
          >
            Upgrade to Pro
          </Link>
          <button
            className="px-8 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-huttle-primary hover:text-huttle-primary transition-all font-semibold"
          >
            Join Waitlist
          </button>
        </div>
      </div>

      {/* Beta Badge */}
      <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Beta Testing Program</h4>
            <p className="text-sm text-gray-600">
              We're currently testing Huttle Agent with select users. Want to be part of our beta program? 
              Pro subscribers will get priority access when we start accepting testers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
