import { Bot, Sparkles, Crown, Clock } from 'lucide-react';

export default function HuttleAgent() {
  return (
    <div className="flex-1 bg-gray-50 ml-0 lg:ml-64 pt-20 px-4 md:px-8 pb-8 min-h-screen">
      <div className="max-w-4xl mx-auto">
        
        {/* Main Card - Dark futuristic container */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl">
          
          {/* Animated background effects */}
          <div className="absolute inset-0">
            {/* Subtle grid pattern */}
            <div 
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(0, 186, 211, 0.5) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0, 186, 211, 0.5) 1px, transparent 1px)
                `,
                backgroundSize: '60px 60px'
              }}
            />
            
            {/* Glowing orb effect */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-huttle-primary/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-huttle-primary/5 rounded-full blur-[100px]" />
            
            {/* Scan line effect */}
            <div className="absolute inset-0 overflow-hidden">
              <div 
                className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-huttle-primary/20 to-transparent animate-pulse"
                style={{ top: '30%' }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 px-6 md:px-12 py-12 md:py-16">
            
            {/* Status indicator */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 bg-gray-800/80 border border-gray-700/50 backdrop-blur-sm rounded-full px-4 py-2">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-huttle-primary animate-pulse" />
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-huttle-primary animate-ping" />
                </div>
                <span className="text-xs font-medium text-gray-400 tracking-wide uppercase">In Development</span>
              </div>
            </div>

            {/* Icon */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                {/* Outer glow ring */}
                <div className="absolute inset-0 -m-4 rounded-3xl bg-huttle-primary/20 blur-xl animate-pulse" />
                
                {/* Icon container */}
                <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-huttle-primary/30 flex items-center justify-center shadow-lg shadow-huttle-primary/20">
                  <Bot className="w-12 h-12 text-huttle-primary" />
                  
                  {/* Corner accents */}
                  <div className="absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2 border-huttle-primary rounded-tl-lg" />
                  <div className="absolute -top-px -right-px w-4 h-4 border-t-2 border-r-2 border-huttle-primary rounded-tr-lg" />
                  <div className="absolute -bottom-px -left-px w-4 h-4 border-b-2 border-l-2 border-huttle-primary rounded-bl-lg" />
                  <div className="absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2 border-huttle-primary rounded-br-lg" />
                </div>
                
                {/* Floating sparkle */}
                <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-huttle-primary-light animate-pulse" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-black text-center mb-4 text-white tracking-tight">
              Huttle Agent
            </h1>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              <div className="inline-flex items-center gap-2 bg-gray-800/60 border border-gray-700/50 text-gray-300 px-4 py-2 rounded-full text-sm font-medium">
                <Clock className="w-4 h-4 text-huttle-primary" />
                Early 2026
              </div>
              <div className="inline-flex items-center gap-2 bg-huttle-primary/10 border border-huttle-primary/30 text-huttle-primary px-4 py-2 rounded-full text-sm font-bold">
                <Crown className="w-4 h-4" />
                Pro Exclusive
              </div>
            </div>

            {/* Description */}
            <p className="text-lg md:text-xl text-gray-400 text-center max-w-2xl mx-auto leading-relaxed mb-12">
              Your personal AI content strategist that understands your brand, anticipates your needs, and helps you create content that resonates.
            </p>

            {/* Feature preview box */}
            <div className="relative max-w-xl mx-auto">
              <div className="relative bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
                {/* Terminal-style header */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-700/50">
                  <div className="w-3 h-3 rounded-full bg-gray-600" />
                  <div className="w-3 h-3 rounded-full bg-gray-600" />
                  <div className="w-3 h-3 rounded-full bg-gray-600" />
                  <span className="ml-3 text-xs text-gray-500 font-mono">huttle_agent.preview</span>
                </div>
                
                {/* Simulated chat preview */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-huttle-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-huttle-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="h-3 bg-gray-700/50 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-700/50 rounded w-1/2" />
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 justify-end">
                    <div className="flex-1 text-right">
                      <div className="h-3 bg-huttle-primary/20 rounded w-2/3 ml-auto mb-2" />
                      <div className="h-3 bg-huttle-primary/20 rounded w-1/3 ml-auto" />
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center flex-shrink-0">
                      <div className="w-4 h-4 rounded-full bg-gray-600" />
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-huttle-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-huttle-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="h-3 bg-gray-700/50 rounded w-full mb-2" />
                      <div className="h-3 bg-gray-700/50 rounded w-4/5 mb-2" />
                      <div className="h-3 bg-gray-700/50 rounded w-2/3" />
                    </div>
                  </div>
                </div>
                
                {/* Typing indicator */}
                <div className="mt-6 pt-4 border-t border-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-700/30 rounded-lg px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-huttle-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-huttle-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-huttle-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative corner brackets */}
              <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-huttle-primary/40 rounded-tl-lg" />
              <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-huttle-primary/40 rounded-tr-lg" />
              <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-huttle-primary/40 rounded-bl-lg" />
              <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-huttle-primary/40 rounded-br-lg" />
            </div>

            {/* CTA section */}
            <div className="mt-12 text-center">
              <p className="text-gray-500 text-sm mb-4">
                Available exclusively for Pro members
              </p>
              <a 
                href="/subscription" 
                className="inline-flex items-center gap-2 bg-huttle-primary hover:bg-huttle-primary-dark text-white font-semibold px-6 py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-huttle-primary/25"
              >
                <Crown className="w-4 h-4" />
                Upgrade to Pro
              </a>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Have ideas for Huttle Agent? We'd love to hear from you at{' '}
            <a href="mailto:support@huttle.ai" className="text-huttle-primary hover:underline font-medium">
              support@huttle.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
