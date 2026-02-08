import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, Check, ArrowRight, Sparkles, Shield, 
  Zap, Users, Lock, X, AlertCircle
} from 'lucide-react';
import { supabase } from '../config/supabase';

// ============================================
// WAITLIST MODAL (Copied from LandingPage)
// ============================================

const WaitlistModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setSubmitSuccess(false);
      setFormData({ firstName: '', lastName: '', email: '' });
      setError(null);
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.email) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/subscribe-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSubmitSuccess(true);
      } else {
        setError(data.details || data.error || 'Failed to join waitlist. Please try again.');
      }
    } catch (error) {
      console.error('Waitlist submission error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          <motion.div 
            className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2B8FC7] to-[#01bad2]" />
            
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#2B8FC7] to-[#01bad2] flex items-center justify-center">
                <Sparkles className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Join the Waitlist</h3>
                <p className="text-sm text-slate-500">Be the first to know when we launch</p>
              </div>
            </div>

            {submitSuccess ? (
              <motion.div 
                className="text-center py-8"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="text-green-600" size={32} />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">You're on the list!</h4>
                <p className="text-slate-500 mb-6">We'll notify you when Huttle AI launches.</p>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#2B8FC7] to-[#01bad2] text-white font-bold shadow-lg shadow-[#01bad2]/25 hover:shadow-[#01bad2]/40 transition-shadow"
                >
                  Got it!
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#01bad2] focus:ring-2 focus:ring-[#01bad2]/20 outline-none transition-all"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name <span className="text-slate-400">(optional)</span></label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#01bad2] focus:ring-2 focus:ring-[#01bad2]/20 outline-none transition-all"
                    placeholder="Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-[#01bad2] focus:ring-2 focus:ring-[#01bad2]/20 outline-none transition-all"
                    placeholder="john@example.com"
                  />
                </div>
                
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                    <AlertCircle size={18} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-[#2B8FC7] to-[#01bad2] text-white font-bold shadow-lg shadow-[#01bad2]/25 hover:shadow-[#01bad2]/40 transition-shadow disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Joining...' : 'Join the Waitlist'}
                  {!isSubmitting && <ArrowRight size={18} />}
                </button>
              </form>
            )}

            <p className="text-center text-xs text-slate-400 mt-4">
              We respect your privacy. Unsubscribe anytime.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================
// FOUNDERS PAGE
// ============================================

export default function FoundersPage() {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  const handleCheckout = async () => {
    setIsCheckingOut(true);

    const founderPriceId = import.meta.env.VITE_STRIPE_PRICE_FOUNDER_ANNUAL;
    
    if (!founderPriceId) {
      alert('Payment system is being configured. Please try again shortly or contact support@huttleai.com');
      setIsCheckingOut(false);
      return;
    }

    try {
      // Build headers - include auth token if user is logged in
      const headers = { 'Content-Type': 'application/json' };
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } catch (e) {
        // Continue without auth - guest checkout is supported
      }

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          priceId: founderPriceId,
          planId: 'founder',
          billingCycle: 'annual',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create checkout session: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(`Failed to start checkout: ${error.message}\n\nPlease contact support@huttleai.com if this persists.`);
      setIsCheckingOut(false);
    }
  };

  const benefits = [
    { 
      icon: Lock, 
      title: "Lifetime Price Lock", 
      desc: "$199/year forever, even when prices increase to $357/year" 
    },
    { 
      icon: Zap, 
      title: "Highest AI Limits", 
      desc: "Pro & Founders get the most generous generation limits" 
    },
    { 
      icon: Sparkles, 
      title: "All Pro Features", 
      desc: "Viral Blueprint, Content Remix Studio, Trend Deep Dive, and more" 
    },
    { 
      icon: Shield, 
      title: "Priority Support", 
      desc: "Direct access to the founding team for questions and feedback" 
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
      <WaitlistModal isOpen={isWaitlistOpen} onClose={() => setIsWaitlistOpen(false)} />
      
      {/* Navigation - Minimal for campaign focus */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <img src="/huttle-logo.png" alt="Huttle AI" className="h-8 w-auto" />
            </Link>
            {/* Back to Home link removed for campaign focus */}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-28 lg:pt-32 pb-8 sm:pb-12 lg:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/50 mb-4 sm:mb-8"
          >
            <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
            <span className="text-xs sm:text-sm font-semibold text-amber-700">Founding Member Exclusive</span>
          </motion.div>

          {/* Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight mb-4 sm:mb-6"
          >
            Join the{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2B8FC7] to-[#01bad2]">
              Founders Club
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto mb-6 sm:mb-8 lg:mb-12 px-2"
          >
            Lock in early access pricing forever. Be among the first 100 creators to shape the future of AI-powered content creation.
          </motion.p>

          {/* Spots remaining indicator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center justify-center gap-2 mb-4 sm:mb-8"
          >
            <Users className="w-4 h-4 text-[#01bad2]" />
            <span className="text-sm font-medium text-slate-600">
              <span className="text-[#01bad2] font-bold">23 spots</span> remaining
            </span>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* On mobile: Pricing card first (order-1), Benefits second (order-2) */}
          {/* On desktop (lg+): Benefits left, Pricing right */}
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-start">
            
            {/* Benefits Card - Shows second on mobile, first on desktop */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 sm:p-8 lg:p-10 order-2 lg:order-1"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-8">
                What You Get
              </h2>
              
              <div className="space-y-6">
                {benefits.map((benefit, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#2B8FC7]/10 to-[#01bad2]/10 flex items-center justify-center">
                      <benefit.icon className="w-5 h-5 text-[#01bad2]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">{benefit.title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{benefit.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Additional perks */}
              <div className="mt-8 pt-8 border-t border-slate-100">
                <p className="text-sm font-medium text-slate-900 mb-4">Also included:</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    "Viral Blueprint Generator",
                    "Smart Calendar",
                    "Content Remix Studio",
                    "AI Power Tools",
                    "Quality Scorer",
                    "Trend Radar"
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#01bad2] flex-shrink-0" />
                      <span className="text-sm text-slate-600">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Pricing Card - Shows first on mobile (primary CTA), second on desktop */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 text-white lg:sticky lg:top-24 order-1 lg:order-2"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-8">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#2B8FC7] to-[#01bad2] flex items-center justify-center shadow-lg shadow-[#01bad2]/30">
                  <Crown className="text-white" size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Founders Club</h3>
                  <p className="text-slate-400">Early Access Membership</p>
                </div>
              </div>

              {/* Pricing */}
              <div className="mb-8">
                <div className="flex items-end gap-3 mb-2">
                  <span className="text-5xl lg:text-6xl font-black">$199</span>
                  <span className="text-xl text-slate-400 mb-2">/year</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg text-slate-500 line-through">$357/year</span>
                  <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-bold">
                    Save $158
                  </span>
                </div>
              </div>

              {/* CTA Buttons - Large touch targets for mobile */}
              <div className="space-y-4 mb-8">
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full min-h-[56px] py-4 px-6 rounded-xl bg-gradient-to-r from-[#2B8FC7] to-[#01bad2] text-white font-bold text-base sm:text-lg shadow-lg shadow-[#01bad2]/30 hover:shadow-[#01bad2]/50 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCheckingOut ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      Become a Founding Member
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setIsWaitlistOpen(true)}
                  className="w-full min-h-[48px] py-3 px-6 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-800 active:scale-[0.98] transition-all"
                >
                  Join Waitlist Instead
                </button>
              </div>

              {/* Trust indicators */}
              <div className="space-y-3 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#01bad2]" />
                  <span>Secure checkout powered by Stripe</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#01bad2]" />
                  <span>Price locked forever at $199/year</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#01bad2]" />
                  <span>7-Day Price Guarantee</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/huttle-logo.png" alt="Huttle AI" className="h-6 w-auto" />
          </div>
          <p className="text-sm text-slate-500">
            © 2026 Huttle AI · Questions? <a href="mailto:support@huttleai.com" className="text-[#01bad2] hover:underline">support@huttleai.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

