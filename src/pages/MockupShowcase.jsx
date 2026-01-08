import IPhoneMockup from '../components/IPhoneMockup';
import { Download, Share2, Sparkles } from 'lucide-react';

/**
 * Mockup Showcase Page
 * 
 * Simple page to display the Viral Blueprint mobile screenshot in an iPhone frame.
 * Perfect for presentations, screenshots, or sharing.
 */
export default function MockupShowcase() {
  return (
    <div className="flex-1 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black ml-0 lg:ml-64 pt-24 lg:pt-20 px-4 md:px-6 lg:px-8 pb-12">
      {/* Animated background mesh */}
      <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-orange-500 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-600 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-purple-600 rounded-2xl blur opacity-40 animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center shadow-xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4">
            Viral Blueprint Generator
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Mobile Experience Showcase
          </p>
        </div>

        {/* Main Mockup Display */}
        <div className="flex justify-center mb-12">
          <IPhoneMockup 
            imageSrc="/viral-blueprint-mobile.png" 
            imageAlt="Viral Blueprint Generator - Mobile View"
            size="medium"
          />
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="glass-panel rounded-2xl p-6 border border-white/10 backdrop-blur-xl bg-white/5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">AI-Powered</h3>
            <p className="text-gray-400 text-sm">
              Generate viral content strategies with advanced AI analysis
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-white/10 backdrop-blur-xl bg-white/5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-4">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Multi-Platform</h3>
            <p className="text-gray-400 text-sm">
              Optimized for TikTok, Instagram, YouTube, Facebook, and X
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-white/10 backdrop-blur-xl bg-white/5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
              <Download className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Export Ready</h3>
            <p className="text-gray-400 text-sm">
              Copy scripts, hooks, and hashtags with one click
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <a 
            href="/dashboard/viral-blueprint"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-purple-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
          >
            <Sparkles className="w-5 h-5" />
            Try Viral Blueprint
          </a>
        </div>

      </div>
    </div>
  );
}

