import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Check, Sparkles, TrendingUp, 
  Zap, Play, Search, Instagram,
  Activity, Users, BarChart3, Facebook, Youtube,
  Repeat, MessageSquare, Film, Music, Hash, Gauge, Crown, Clock, X,
  Star, Building2, Rocket, Shield, HeartHandshake, ChevronDown, AlertCircle, LogIn,
  Shuffle, FolderOpen, BarChart2, CalendarDays, LockKeyhole, ShieldCheck, Undo2
} from "lucide-react";
import { createCheckoutSession, openStripeCheckoutTab } from './services/stripeAPI';
import { InteractiveHoverButton } from "./components/InteractiveHoverButton";
import { TypingAnimation } from "./components/TypingAnimation";
import { OrbitingCircles, SocialIcons } from "./components/OrbitingCircles";
import { DotPattern } from "./components/DotPattern";

// Magic UI Components
import { NumberTicker } from "./components/magicui/NumberTicker";
import { Marquee } from "./components/magicui/Marquee";
import { MagicCard } from "./components/magicui/MagicCard";
import { BorderBeamButton } from "./components/magicui/BorderBeam";
import { BlurFade } from "./components/magicui/BlurFade";
import { FAQAccordion } from "./components/magicui/FAQAccordion";
import { ParticleNetwork } from "./components/magicui/ParticleNetwork";
import { FeatureShowcase } from "./components/magicui/FeatureShowcase";

// ============================================
// ANIMATION VARIANTS & CONFIGS (simplified)
// ============================================

const FOUNDING_SPOTS_LEFT = 22;
const SITE_URL = "https://huttleai.com";
const LOGO_URL = `${SITE_URL}/logo-512.png`;

const FAQ_ITEMS = [
  {
    question: "What happened to Founders Club?",
    answer: "Founders Club was our launch offer and it's now closed. If you missed it, Builders Club is our current annual plan — it includes the same locked-in pricing philosophy and a 14-day happiness guarantee. Monthly plans are also now available starting at $15/month."
  },
  {
    question: "What is Builders Club?",
    answer: "Builders Club is Huttle AI's annual membership at $249/year ($20.75/month equivalent). Your rate is locked in forever — it never goes up. It includes all Pro features, 800 AI generations/month, priority support, and a 14-day happiness guarantee. Builders Club closes April 22, 2026."
  },
  {
    question: "Do I need a credit card to start the 7-day trial?",
    answer: "Yes. A credit card is required to start the Essentials or Pro trial. You will not be charged anything if you cancel before the 7-day trial ends."
  },
  {
    question: "When will I be charged?",
    answer: "If you continue after your 7-day trial, your plan automatically begins billing at your selected monthly rate. We show the billing date clearly at checkout before you start."
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes. Monthly plans can be canceled at any time. Cancel before day 7 and you won't be charged. Cancel after billing starts and your access continues through the end of that billing period."
  },
  {
    question: "What's the difference between Builders Club and the monthly plans?",
    answer: "Monthly plans (Essentials at $15/mo, Pro at $39/mo) are the low-commitment way to start — try Huttle AI for 7 days before your card is billed. Builders Club is the annual option for users who are ready to commit. It locks in a lower rate forever and includes a 14-day happiness guarantee instead of a trial."
  },
  {
    question: "Is there a money-back guarantee?",
    answer: "Builders Club includes a 14-day happiness guarantee — if Huttle AI isn't the right fit, we'll refund you in full, no questions asked. Monthly plans are protected by the 7-day trial: cancel before day 7 and you are never charged."
  },
  {
    question: "What platforms does Huttle AI support?",
    answer: "Huttle AI helps you plan and create content for Instagram, TikTok, X (Twitter), Facebook, and YouTube (LinkedIn coming soon). You choose your active platforms when you set up your personalized Brand Profile."
  },
  {
    question: "Is my payment secure?",
    answer: "Yes. All payments are processed securely through Stripe. We never store your full card details on our servers."
  },
];

const STRUCTURED_DATA = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Huttle AI",
    url: SITE_URL,
    logo: LOGO_URL,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "hello@huttleai.com",
      availableLanguage: "English",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Huttle AI",
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Huttle AI is an AI-powered content planning and creation platform that tells creators, solopreneurs, and small businesses what to post before they create it.",
    offers: {
      "@type": "Offer",
      price: "199.00",
      priceCurrency: "USD",
      availability: "https://schema.org/LimitedAvailability",
      url: `${SITE_URL}/#pricing`,
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  },
];

// ============================================
// HERO BACKGROUND WITH PARTICLE NETWORK
// ============================================

const HeroBackground = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    setIsMobile(mql.matches);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-cyan-50/40" />
      
      {/* Single ParticleNetwork - responsive config based on viewport */}
      <div className="absolute inset-0">
        <ParticleNetwork 
          particleCount={isMobile ? 35 : 60}
          particleColor="#01bad2"
          lineColor="#2B8FC7"
          maxLineDistance={isMobile ? 120 : 160}
          particleSize={isMobile ? { min: 2, max: 4 } : { min: 3, max: 6 }}
          speed={isMobile ? { min: 0.15, max: 0.35 } : { min: 0.2, max: 0.5 }}
          mouseRepelRadius={isMobile ? 80 : 130}
          mouseRepelStrength={isMobile ? 0.3 : 0.5}
          className={isMobile ? "opacity-80" : "opacity-100"}
        />
      </div>
      
      {/* Animated gradient orbs - CSS animations instead of framer-motion */}
      <div
        className="absolute w-[300px] h-[300px] md:w-[800px] md:h-[800px] rounded-full hero-orb-1"
        style={{
          background: 'radial-gradient(circle, rgba(1,186,210,0.15) 0%, rgba(1,186,210,0) 70%)',
          filter: 'blur(80px)',
          left: '-20%',
          top: '-30%',
        }}
      />
      
      <div
        className="absolute w-[200px] h-[200px] md:w-[600px] md:h-[600px] rounded-full hero-orb-2"
        style={{
          background: 'radial-gradient(circle, rgba(43,143,199,0.12) 0%, rgba(43,143,199,0) 70%)',
          filter: 'blur(80px)',
          right: '-15%',
          top: '10%',
        }}
      />
      
      <div
        className="absolute w-[250px] h-[250px] md:w-[500px] md:h-[500px] rounded-full hidden md:block hero-orb-3"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0) 70%)',
          filter: 'blur(80px)',
          left: '20%',
          bottom: '-10%',
        }}
      />

      {/* Subtle dot pattern overlay */}
      <div 
        className="absolute inset-0 opacity-15 md:opacity-25"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(43,143,199,0.12) 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Bottom fade to white */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-32 md:h-48 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, white)'
        }}
      />
    </div>
  );
};

// ============================================
// SCROLL PROGRESS INDICATOR
// ============================================

const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  
  return (
    <motion.div 
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2B8FC7] to-[#01bad2] origin-left z-[60]"
      style={{ scaleX: scrollYProgress }}
    />
  );
};


// ============================================
// UTILITY COMPONENTS (simplified)
// ============================================

const GlassCard = ({ children, className = "" }) => {
  return (
    <div
      className={`
        relative overflow-hidden rounded-3xl
        bg-white
        border border-slate-200/60
        shadow-[0_8px_30px_rgb(0,0,0,0.04)]
        hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]
        transition-all duration-300
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// ============================================
// WAITLIST MODAL
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
        console.error('Waitlist API error:', data);
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
// FOUNDERS CLUB MODAL
// ============================================

const FoundersClubModal = ({ isOpen, onClose }) => {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setCheckoutLoading(false);
      setCheckoutError(null);
    }
  }, [isOpen]);

  const handleProceedToCheckout = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const checkoutTab = openStripeCheckoutTab();
    setCheckoutError(null);
    setCheckoutLoading(true);
    try {
      const result = await createCheckoutSession('founder', 'annual', {
        targetWindow: checkoutTab,
      });
      if (result.demo) {
        checkoutTab?.close();
        setCheckoutError(
          'Checkout is not available yet (Stripe founder price not configured). Add VITE_STRIPE_PRICE_FOUNDER_ANNUAL to your environment.'
        );
        setCheckoutLoading(false);
        return;
      }
      if (!result.success) {
        checkoutTab?.close();
        setCheckoutError(result.error || 'Could not start checkout. Please try again.');
        setCheckoutLoading(false);
        return;
      }
      if (result.openedInNewTab) {
        setCheckoutLoading(false);
      }
    } catch (err) {
      checkoutTab?.close();
      setCheckoutError(err?.message || 'Could not start checkout. Please try again.');
      setCheckoutLoading(false);
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
            onClick={onClose}
          />
          
          <motion.div 
            className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2B8FC7] to-[#01bad2]" />
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#2B8FC7] to-[#01bad2] flex items-center justify-center shadow-md">
                <Crown className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Founders Club</h3>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {[
                { title: "Lifetime Price Lock", desc: "$199/year forever, even when prices increase" },
                { title: "Highest AI Limits", desc: "Founders get the most generous generation limits" },
                { title: "All Pro Features", desc: "Ignite Engine, Content Remix Studio, Trend Deep Dive, and more" },
                { title: "Priority Support", desc: "Direct access to our founding team" },
                { title: "14-Day Money-Back Guarantee", desc: "" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check className="text-[#01bad2] mt-0.5 flex-shrink-0" size={18} />
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                    {item.desc && <p className="text-xs text-slate-500 font-medium">{item.desc}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-6 p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Founders Price</p>
                <p className="text-3xl font-black text-slate-900">$199<span className="text-sm font-medium text-slate-500">/year</span></p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400 line-through font-medium mb-1">$397.80/year</p>
                <p className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200 inline-block">Save 50%</p>
              </div>
            </div>

            {checkoutError && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-xs text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <button 
                type="button"
                onClick={(e) => handleProceedToCheckout(e)}
                disabled={checkoutLoading}
                className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-[#2B8FC7] to-[#01bad2] text-white font-bold shadow-lg shadow-[#01bad2]/20 hover:shadow-[#01bad2]/30 transition-shadow flex items-center justify-center gap-2 text-base disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {checkoutLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Redirecting to checkout…
                  </>
                ) : (
                  <>
                    Join the Founders Club Today
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-xs text-slate-400 mt-4">
              Secure checkout powered by Stripe
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================
// SOCIAL PROOF MARQUEE SECTION
// ============================================

const SocialProofMarquee = () => {
  const items = [
    { name: "Optimized Posting", subtitle: "AI-Powered Timing" },
    { name: "Content Vault", subtitle: "Organized Assets" },
    { name: "AI Plan Builder", subtitle: "Content Strategy" },
    { name: "Hashtag Generator", subtitle: "Trending Tags" },
    { name: "Content Remix Studio", subtitle: "5 Platform Variations" },
    { name: "AI Power Tools", subtitle: "Advanced Features" },
    { name: "Trend Lab", subtitle: "Real-Time Insights" },
    { name: "Daily Social Updates", subtitle: "Fresh Content Ideas" },
    { name: "Trend Discovery", subtitle: "Viral Opportunities" },
    { name: "Content Vault", subtitle: "Organized Assets" },
    { name: "Ignite Engine", subtitle: "Complete Scripts" },
  ];

  return (
    <div className="py-4 md:py-16 bg-white border-y border-slate-200/60 overflow-hidden">
      <Marquee duration={40} pauseOnHover gap={16}>
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 md:gap-3 px-2 md:px-6">
            <div className="text-sm md:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#2B8FC7] to-[#01bad2] whitespace-nowrap">
              {item.name}
            </div>
            <div className="text-[8px] md:text-xs text-slate-500 font-medium whitespace-nowrap uppercase tracking-widest">
              {item.subtitle}
            </div>
          </div>
        ))}
      </Marquee>
    </div>
  );
};

// ============================================
// ORBITING CIRCLES PLATFORM SECTION
// ============================================

const OrbitingPlatformsSection = () => {
  return (
    <div className="relative min-h-[500px] md:min-h-[800px] w-full overflow-hidden bg-white flex flex-col items-center justify-center py-16 md:py-32 px-4 md:px-8 border-t border-slate-200/60">
      <div className="absolute inset-0 opacity-[0.03]">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,1) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <motion.div 
        className="text-center relative z-20 max-w-4xl mx-auto mb-10 md:mb-20 px-2"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-slate-900 mb-6 tracking-tighter leading-tight">
          Create for every platform.<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2B8FC7] to-[#01bad2]">
            All in one place.
          </span>
        </h2>
        <p className="text-base md:text-lg lg:text-xl text-slate-500 max-w-2xl mx-auto font-medium">
          TikTok. Instagram. YouTube. X. Facebook. We use one tool that creates content optimized for every algorithm.
        </p>
      </motion.div>

      <div className="relative flex h-[220px] md:h-[500px] w-full items-center justify-center">
        {/* Mobile orbits */}
        <div className="block md:hidden absolute inset-0">
          <div className="relative w-full h-full flex items-center justify-center">
            <OrbitingCircles iconSize={36} radius={90} duration={25} showOrbit={true}>
              <SocialIcons.facebook />
              <SocialIcons.instagram />
              <SocialIcons.tiktok />
              <SocialIcons.youtube />
              <SocialIcons.x />
            </OrbitingCircles>
            <OrbitingCircles iconSize={28} radius={50} reverse duration={20} showOrbit={true}>
              <SocialIcons.tiktok />
              <SocialIcons.instagram />
              <SocialIcons.youtube />
            </OrbitingCircles>
          </div>
        </div>
        
        {/* Desktop orbits */}
        <div className="hidden md:block absolute inset-0">
          <div className="relative w-full h-full flex items-center justify-center">
            <OrbitingCircles iconSize={56} radius={180} duration={25} showOrbit={true}>
              <SocialIcons.facebook />
              <SocialIcons.instagram />
              <SocialIcons.tiktok />
              <SocialIcons.youtube />
              <SocialIcons.x />
            </OrbitingCircles>
            <OrbitingCircles iconSize={48} radius={120} reverse duration={20} showOrbit={true}>
              <SocialIcons.tiktok />
              <SocialIcons.instagram />
              <SocialIcons.youtube />
            </OrbitingCircles>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// NICHE-SPECIFIC SECTION
// ============================================

const NICHE_DATA = {
  "Med Spa": {
    trends: [
      { topic: "Skin Barrier Health", status: "Peaking", color: "bg-red-500" },
      { topic: "Anti-Aging Treatments", status: "Rising", color: "bg-green-500" },
      { topic: "Hydration Protocols", status: "Rising", color: "bg-green-500" },
    ],
    hashtags: ["#medspa", "#skincare", "#glowup", "#aesthetics"],
    hook: "The one skincare treatment my clients ask about every single week",
  },
  "Fitness Coach": {
    trends: [
      { topic: "Protein Prioritization", status: "Peaking", color: "bg-red-500" },
      { topic: "Zone 2 Cardio", status: "Rising", color: "bg-green-500" },
      { topic: "Recovery Routines", status: "Rising", color: "bg-green-500" },
    ],
    hashtags: ["#fitnessmotivation", "#personaltrainer", "#gains", "#wellness"],
    hook: "Why 80% of my clients were doing cardio completely wrong",
  },
  "Solo Creator": {
    trends: [
      { topic: "Creator Economy 2026", status: "Peaking", color: "bg-red-500" },
      { topic: "Monetization Strategies", status: "Rising", color: "bg-green-500" },
      { topic: "Authentic BTS Content", status: "Rising", color: "bg-green-500" },
    ],
    hashtags: ["#fyp", "#contentcreator", "#creatorlife", "#viral"],
    hook: "POV: You finally figured out how to beat the algorithm",
  },
  "Real Estate": {
    trends: [
      { topic: "Market Rate Drops", status: "Peaking", color: "bg-red-500" },
      { topic: "First-Time Buyer Tips", status: "Rising", color: "bg-green-500" },
      { topic: "Investment Properties", status: "Rising", color: "bg-green-500" },
    ],
    hashtags: ["#realestate", "#housingmarket", "#investing", "#realtorlife"],
    hook: "The market shift nobody's talking about — and what it means for buyers",
  },
};

const NICHE_TABS = ["Med Spa", "Fitness Coach", "Solo Creator", "Real Estate"];

const NicheSpecificSection = () => {
  const [selectedNiche, setSelectedNiche] = useState("Solo Creator");
  const data = NICHE_DATA[selectedNiche];

  return (
    <section className="py-16 md:py-32 px-4 bg-white overflow-hidden border-t border-slate-200/60">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          className="text-center mb-10 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-[#01bad2]/5 text-[#01bad2] text-[10px] md:text-xs font-bold uppercase tracking-widest mb-4 border border-[#01bad2]/20">
            Niche-Specific
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tighter mb-4 leading-tight">
            Built for YOUR niche.<br className="hidden md:block" />
            <span className="text-slate-400 font-medium">Not everyone's.</span>
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-slate-500 max-w-2xl mx-auto font-medium">
            A med spa owner gets med spa content. A fitness coach gets fitness trends. No generic advice.
          </p>
        </motion.div>

        {/* Niche Tabs */}
        <motion.div
          className="flex flex-wrap justify-center gap-2 md:gap-3 mb-8 md:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {NICHE_TABS.map((niche) => (
            <button
              key={niche}
              onClick={() => setSelectedNiche(niche)}
              className={`px-4 md:px-6 py-2 md:py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                selectedNiche === niche
                  ? "bg-[#01bad2] text-white shadow-lg shadow-[#01bad2]/25"
                  : "bg-white text-slate-700 border border-slate-200 hover:border-[#01bad2]/40 hover:text-[#01bad2]"
              }`}
            >
              {niche}
            </button>
          ))}
        </motion.div>

        {/* Preview Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="bg-white rounded-2xl md:rounded-[2rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 md:p-8 relative overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">
                  {selectedNiche} · Live Data
                </span>
              </div>
              <div className="flex items-center px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100">
                <img src="/huttle-logo.png" alt="Huttle AI" className="h-3.5 md:h-4 w-auto" />
              </div>
            </div>

            {/* 3-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 md:divide-x md:divide-slate-100">
              {/* Column 1: Trending Now */}
              <div className="md:pr-6 lg:pr-8">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={16} className="text-[#01bad2]" />
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">Trending Now</span>
                </div>
                <div className="space-y-3">
                  {data.trends.map((trend) => (
                    <div key={trend.topic} className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">{trend.topic}</span>
                      <span className={`flex items-center gap-1.5 text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full ${
                        trend.status === "Peaking"
                          ? "bg-red-50 text-red-600 border border-red-100"
                          : "bg-green-50 text-green-600 border border-green-100"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${trend.color}`}></span>
                        {trend.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: Top Hashtags */}
              <div className="md:px-6 lg:px-8">
                <div className="flex items-center gap-2 mb-4">
                  <Hash size={16} className="text-[#01bad2]" />
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">Top Hashtags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 text-xs md:text-sm font-medium border border-slate-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Column 3: AI Hook */}
              <div className="md:pl-6 lg:pl-8">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={16} className="text-[#01bad2]" />
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">AI Hook</span>
                </div>
                <p className="text-sm md:text-base text-slate-600 italic leading-relaxed">
                  "{data.hook}"
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ============================================
// BENTO FEATURE GRID
// ============================================

const BentoGrid = () => {
  return (
    <section id="features" className="py-16 md:py-32 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <motion.div 
          className="mb-10 md:mb-20 text-center md:text-left"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <div 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 text-[10px] md:text-xs font-bold mb-4 border border-purple-100 badge-pulse"
          >
            <Zap size={12} className="w-3 h-3" />
            The Ultimate AI Creative Director
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter mb-4 text-slate-900 leading-[1.1]">
            Everything we need.<br className="hidden md:block"/>
            <span className="text-slate-400 font-medium">Nothing we don't.</span>
          </h2>
          <p className="text-sm md:text-lg lg:text-xl text-slate-500 max-w-2xl">We engineered a complete suite of AI tools that replace your content planner, trend researcher, and copywriter.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-6">
          
          {/* Main Feature: Ignite Engine - Large */} {/* HUTTLE AI: updated 3 */}
          <motion.div 
            className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 flex"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4 }}
          >
            <div className="group w-full h-full p-6 md:p-10 rounded-3xl bg-slate-50 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(1,186,210,0.08)] hover:border-[#01bad2]/30 transition-all duration-500 flex flex-col relative overflow-hidden bg-gradient-to-br from-white to-slate-50">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#01bad2]/5 rounded-full blur-3xl group-hover:bg-[#01bad2]/10 transition-colors duration-500" />
              <div className="mb-6 z-10">
                <Rocket size={28} className="text-[#01bad2] mb-6 group-hover:scale-110 transition-transform duration-500" />
                <h3 className="text-2xl md:text-3xl font-bold mb-3 text-slate-900 leading-tight">Ignite Engine</h3>
                <p className="text-base leading-relaxed text-slate-500">Tell us your topic and platform. We research what's trending, write a step-by-step script with hooks, visuals, and keywords — in 30 seconds.</p>
              </div>
            </div>
          </motion.div>

          {/* Secondary Feature: Content Remix - Wide */}
          <motion.div 
            className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 flex"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="group w-full h-full p-6 md:p-8 rounded-3xl bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(1,186,210,0.08)] hover:border-[#01bad2]/30 transition-all duration-500 flex flex-col sm:flex-row gap-6 relative overflow-hidden">
              <div className="z-10 flex-1">
                <Shuffle size={24} className="text-[#01bad2] mb-4 group-hover:scale-110 transition-transform duration-500" />
                <h3 className="text-xl md:text-2xl font-bold mb-2 text-slate-900 leading-tight">Content Remix Studio</h3>
                <p className="text-sm leading-relaxed text-slate-500">Drop in one post. Get back 5 platform-optimized versions instantly. TikTok, Instagram, X, YouTube, Facebook.</p>
              </div>
              <div className="z-10 w-full sm:w-1/3 flex items-center justify-center">
                 <div className="grid grid-cols-2 gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white"><Instagram size={18}/></div>
                    <div className="h-10 w-10 bg-slate-900 rounded-lg flex items-center justify-center text-white"><X size={18}/></div>
                    <div className="h-10 w-10 bg-red-600 rounded-lg flex items-center justify-center text-white"><Youtube size={18}/></div>
                    <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center text-white"><Facebook size={18}/></div>
                 </div>
              </div>
            </div>
          </motion.div>

          {/* Tertiary Feature: Content Vault - Small */}
          <motion.div 
            className="col-span-1 md:col-span-1 lg:col-span-1 row-span-1 flex"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="group w-full h-full p-6 rounded-3xl bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(1,186,210,0.08)] hover:border-[#01bad2]/30 transition-all duration-500 flex flex-col relative overflow-hidden">
              <FolderOpen size={20} className="text-[#01bad2] mb-4 group-hover:scale-110 transition-transform duration-500" />
              <h3 className="text-lg font-bold mb-2 text-slate-900 leading-tight">Content Vault</h3>
              <p className="text-xs leading-relaxed text-slate-500">Save, organize, and access all your AI-created content in one place.</p>
            </div>
          </motion.div>

          {/* Tertiary Feature: Quality Scorer - Small */}
          <motion.div 
            className="col-span-1 md:col-span-1 lg:col-span-1 row-span-1 flex"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div className="group w-full h-full p-6 rounded-3xl bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(1,186,210,0.08)] hover:border-[#01bad2]/30 transition-all duration-500 flex flex-col relative overflow-hidden">
              <BarChart2 size={20} className="text-[#01bad2] mb-4 group-hover:scale-110 transition-transform duration-500" />
              <h3 className="text-lg font-bold mb-2 text-slate-900 leading-tight">Viral Quality Score</h3>
              <p className="text-xs leading-relaxed text-slate-500">Get a viral potential score before you hit post. See what to fix.</p>
            </div>
          </motion.div>

          {/* Bottom Features: AI Plan Builder and Power Tools */}
          <motion.div 
            className="col-span-1 md:col-span-2 lg:col-span-2 flex"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <div className="group w-full p-6 rounded-3xl bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(1,186,210,0.08)] hover:border-[#01bad2]/30 transition-all duration-500 flex flex-col sm:flex-row items-center gap-6">
               <CalendarDays size={32} className="text-[#01bad2] flex-shrink-0 group-hover:scale-110 transition-transform duration-500" />
               <div>
                 <h3 className="text-xl font-bold mb-2 text-slate-900">AI Plan Builder</h3>
                 <p className="text-sm text-slate-500">Get a full week of posts planned in 30 seconds. No more Sunday night scrambling.</p>
               </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="col-span-1 md:col-span-2 lg:col-span-2 flex"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <div className="group w-full p-6 rounded-3xl bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(1,186,210,0.08)] hover:border-[#01bad2]/30 transition-all duration-500 flex flex-col sm:flex-row items-center gap-6">
               <MessageSquare size={32} className="text-[#01bad2] flex-shrink-0 group-hover:scale-110 transition-transform duration-500" />
               <div>
                 <h3 className="text-xl font-bold mb-2 text-slate-900">AI Power Tools</h3>
                 <p className="text-sm text-slate-500">Caption generator, hashtag research, hook builder, CTA suggester — all built in.</p>
               </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

// ============================================
// PAIN POINTS SECTION
// ============================================

const PainPointsSection = () => {
  const painPoints = [
    { emoji: "🤔", title: "Hours wasted staring at a blank screen", text: "You know you need to post. You just don't know what to say. Every day you put it off costs you followers, clients, and revenue." },
    { emoji: "📉", title: "Generic content that gets ignored", text: "Templates and generic AI tools don't know your niche. Your audience scrolls past content that could have been written by anyone." },
    { emoji: "😫", title: "Juggling ten different tools", text: "Trend research here, caption writing there, hashtag tools somewhere else. No wonder content feels like a second job." }
  ];

  return (
    <section className="bg-slate-50 py-16 md:py-32 px-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div 
          className="text-center mb-10 md:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-[#01bad2] mb-3 border border-[#01bad2]/20 px-3 py-1 rounded-full inline-block bg-[#01bad2]/5">The Struggle</h2>
          <h3 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-slate-900 mb-4">Content creation is exhausting.<br/><span className="text-slate-400 font-medium">It shouldn't be.</span></h3>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm md:text-lg">We built this because we were tired of the constant pressure to create — without knowing what would actually work.</p>
        </motion.div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8">
          {painPoints.map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div 
                className="group bg-white p-6 md:p-10 rounded-2xl md:rounded-[2rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(1,186,210,0.08)] hover:border-[#01bad2]/30 transition-all duration-500 cursor-pointer h-full flex flex-col hover:-translate-y-2"
              >
                <div className="text-3xl md:text-5xl mb-4 md:mb-8 bg-slate-50 w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform duration-500">
                  {item.emoji}
                </div>
                <h4 className="text-lg md:text-2xl font-bold mb-2 md:mb-4 text-slate-900 group-hover:text-[#01bad2] transition-colors">{item.title}</h4>
                <p className="text-slate-600 leading-relaxed text-sm md:text-base flex-1">{item.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================
// VIDEO DEMO SECTION
// ============================================

const VideoDemoSection = () => {
  return (
    <section className="py-16 md:py-32 px-4 bg-white border-t border-slate-200/60">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          className="text-center mb-10 md:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-[#01bad2]/5 text-[#01bad2] text-[10px] md:text-xs font-bold uppercase tracking-widest mb-4 border border-[#01bad2]/20">
            See It In Action
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tighter mb-4 leading-tight">
            From blank page to a full content plan — in under 60 seconds.
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-slate-500 max-w-2xl mx-auto font-medium">
            Watch Huttle AI's AI Plan Builder turn your niche, goals, and platforms into a ready-to-execute content calendar. No guessing. No staring at a blank screen. Just your plan, built.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <video
              src="/videos/plan-builder-demo.mp4"
              autoPlay
              muted
              loop
              playsInline
              controls
              className="w-full block"
            />
          </div>
          <p className="text-center text-sm text-slate-400 font-medium mt-4">
            Real product. Real output. No smoke and mirrors.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

// ============================================
// FEATURE SHOWCASE SECTION
// ============================================

const FeatureShowcaseSection = () => {
  return (
    <section className="py-16 md:py-32 px-4 bg-white overflow-hidden border-t border-slate-200/60">
      <div className="container mx-auto max-w-6xl">
        <motion.div 
          className="text-center mb-10 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
            <span 
              className="inline-block px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-[#01bad2]/5 text-[#01bad2] text-[10px] md:text-xs font-bold uppercase tracking-widest mb-4 border border-[#01bad2]/20"
            >
              <Play size={12} className="inline mr-1.5 -mt-0.5 md:w-3 md:h-3" />
              See It In Action
            </span>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tighter mb-4 leading-tight">
              Features that make us<br className="hidden md:block" /> go viral.
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-slate-500 max-w-2xl mx-auto px-2 font-medium">
              Explore the AI-powered tools that will transform our content strategy
            </p>
        </motion.div>
        
        <FeatureShowcase />
      </div>
    </section>
  );
};

// ============================================
// FAQ SECTION
// ============================================

const FAQSectionComponent = () => {
  return (
    <section className="py-16 md:py-32 px-4 bg-slate-50 border-t border-slate-200/60">
      <div className="container mx-auto max-w-4xl">
        <motion.div 
          className="text-center mb-10 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
            <span 
              className="inline-block px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-[#01bad2]/5 text-[#01bad2] text-[10px] md:text-xs font-bold uppercase tracking-widest mb-4 border border-[#01bad2]/20"
            >
              FAQ
            </span>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tighter mb-4 leading-tight">
              Everything you want to know before you join.
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-slate-500 max-w-2xl mx-auto font-medium">
              Clear answers on pricing, guarantees, and how Huttle AI works.
            </p>
        </motion.div>
        
        <FAQAccordion items={FAQ_ITEMS} />
      </div>
    </section>
  );
};

// ============================================
// PRICING SECTION - 3-TIER PRICING LADDER
// ============================================

const PricingSection = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  const essentialsMonthly = 15;
  const proMonthly = 39;
  const discount = 0.85;

  const essentialsPrice = isAnnual
    ? (essentialsMonthly * discount).toFixed(2)
    : essentialsMonthly;
  const proPrice = isAnnual
    ? (proMonthly * discount).toFixed(2)
    : proMonthly;

  const handleCheckout = async (planId) => {
    const billingCycle = planId === 'builder' ? 'annual' : isAnnual ? 'annual' : 'monthly';
    const checkoutTab = openStripeCheckoutTab();
    setCheckoutLoading(planId);
    try {
      await createCheckoutSession(planId, billingCycle, { targetWindow: checkoutTab });
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Dynamic countdown: closes April 22, 2026
  const buildersClubDaysLeft = useMemo(() => {
    const closeDate = new Date('2026-04-22T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((closeDate - today) / (1000 * 60 * 60 * 24));
  }, []);

  return (
    <section id="pricing" className="py-16 md:py-32 px-4 bg-slate-50 relative overflow-hidden">
      <div className="absolute -top-1/2 -left-1/4 w-full h-full bg-[#01bad2]/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-1/2 -right-1/4 w-full h-full bg-[#2B8FC7]/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div
          className="text-center mb-10 md:mb-12"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-[#01bad2]/10 text-[#01bad2] text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3 md:mb-4 border border-[#01bad2]/20">
            Simple Pricing
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tighter mb-3 md:mb-4">
            Start creating. Pick your path.
          </h2>
          <p className="text-sm md:text-lg text-slate-500 max-w-2xl mx-auto mb-8">
            Every plan includes full access to all AI tools. The only question is how you want to pay.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-white border border-slate-200 rounded-full px-2 py-1.5 shadow-sm">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                !isAnnual ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
                isAnnual ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Annually
              <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                Save 15%
              </span>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-center max-w-5xl mx-auto">

          {/* CARD 1: ESSENTIALS */}
          <motion.div
            className="order-2 md:order-1 h-full"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="relative rounded-2xl md:rounded-3xl bg-white p-6 md:p-8 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col">
              <div className="inline-flex items-center self-start gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wide mb-4 border border-slate-200">
                START HERE
              </div>

              <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1">Essentials</h3>

              <div className="mb-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl md:text-4xl font-black text-slate-900">${essentialsPrice}</span>
                  <span className="text-sm text-slate-500">/month</span>
                </div>
                {isAnnual && (
                  <p className="text-xs text-slate-400 mt-1">
                    Billed as ${Math.floor(essentialsMonthly * discount * 12)}/yr
                  </p>
                )}
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <Check size={12} className="text-green-600 flex-shrink-0" />
                  <span>7-day trial</span>
                </div>
              </div>

              <p className="text-sm text-slate-600 mt-3 mb-5 font-medium">Everything you need to hit the ground running.</p>

              <ul className="space-y-2.5 mb-6 flex-1">
                {[
                  '200 AI generations/month',
                  'All AI Power Tools',
                  'AI Plan Builder',
                  'Content Remix Studio',
                  'Ignite Engine',
                  '5GB Content Vault',
                ].map((feat, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs md:text-sm text-slate-600">
                    <Check size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout('essentials')}
                disabled={!!checkoutLoading}
                className="w-full h-12 rounded-xl border-2 border-slate-200 text-slate-700 bg-transparent hover:border-slate-400 hover:text-slate-900 font-semibold text-sm transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {checkoutLoading === 'essentials' ? 'Loading…' : 'Start 7-Day Trial'}
              </button>
              <p className="text-center text-[10px] text-slate-400 mt-2.5">Card required · Cancel anytime</p>
            </div>
          </motion.div>

          {/* CARD 2: PRO (HIGHLIGHTED - center) */}
          <motion.div
            className="relative md:scale-105 md:z-10 order-1 md:order-2 h-full"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="pricing-card-glow relative rounded-2xl md:rounded-3xl bg-white p-6 md:p-8 border-2 border-[#01bad2] shadow-2xl overflow-hidden h-full flex flex-col">
              <div className="absolute -inset-1 rounded-2xl md:rounded-3xl bg-gradient-to-br from-[#01bad2]/5 to-[#2B8FC7]/5 opacity-50 -z-10" />

              <div className="inline-flex items-center self-start gap-1.5 px-3 py-1 rounded-full bg-[#01bad2]/10 text-[#01bad2] text-[10px] md:text-xs font-bold uppercase tracking-wide mb-4 border border-[#01bad2]/20">
                <Zap size={11} className="fill-[#01bad2]" />
                MOST POPULAR
              </div>

              <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1">Pro</h3>

              <div className="mb-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl md:text-5xl font-black text-slate-900">${proPrice}</span>
                  <span className="text-sm md:text-base text-slate-500">/month</span>
                </div>
                {isAnnual && (
                  <p className="text-xs text-slate-400 mt-1">
                    Billed as ${Math.floor(proMonthly * discount * 12)}/yr
                  </p>
                )}
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <Check size={12} className="text-green-600 flex-shrink-0" />
                  <span>7-day trial</span>
                </div>
              </div>

              <p className="text-sm text-slate-600 mt-3 mb-5 font-medium">The complete toolkit for serious creators.</p>

              <ul className="space-y-2.5 mb-6 flex-1">
                {[
                  '600 AI generations/month',
                  'Everything in Essentials',
                  '14-Day AI Plan Builder',
                  'Full Trend Lab access',
                  'Niche Intel',
                  '25GB Content Vault',
                ].map((feat, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs md:text-sm text-slate-600 font-medium">
                    <Check size={14} className="text-[#01bad2] mt-0.5 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <BorderBeamButton
                onClick={() => handleCheckout('pro')}
                disabled={!!checkoutLoading}
                className="w-full h-12 md:h-14 rounded-xl text-white font-bold text-sm shadow-lg shadow-[#01bad2]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                beamDuration={6}
              >
                {checkoutLoading === 'pro' ? 'Loading…' : (
                  <>Start 7-Day Trial<ArrowRight size={16} className="ml-2" /></>
                )}
              </BorderBeamButton>
              <p className="text-center text-[10px] text-slate-400 mt-2.5">Card required · Cancel anytime</p>
            </div>
          </motion.div>

          {/* CARD 3: BUILDERS CLUB */}
          <motion.div
            className="order-3 h-full"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="relative rounded-2xl md:rounded-3xl bg-white p-6 md:p-8 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col">
              {buildersClubDaysLeft > 0 ? (
                <div className="inline-flex items-center self-start gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] md:text-xs font-bold uppercase tracking-wide mb-4 border border-red-200">
                  ⏳ CLOSES IN {buildersClubDaysLeft} {buildersClubDaysLeft === 1 ? 'DAY' : 'DAYS'}
                </div>
              ) : (
                <div className="h-7 mb-4" />
              )}

              <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1">Builders Club</h3>

              <div className="mb-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl md:text-4xl font-black text-slate-900">$249</span>
                  <span className="text-sm text-slate-500">/year</span>
                </div>
                <p className="text-xs font-semibold text-[#01bad2] mt-1">$20.75/mo equivalent</p>
                <p className="text-[10px] text-slate-400 mt-0.5">vs $39/mo on Pro — locked in forever</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <Check size={12} className="text-green-600 flex-shrink-0" />
                  <span>14-day happiness guarantee</span>
                </div>
              </div>

              <p className="text-sm text-slate-600 mt-3 mb-5 font-medium">Annual pass. Your rate never goes up.</p>

              <ul className="space-y-2.5 mb-6 flex-1">
                {[
                  '800 AI generations/month',
                  'All Pro features included',
                  'Locked-in annual rate',
                  'Early access to new features',
                  'Priority support',
                ].map((feat, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs md:text-sm text-slate-600">
                    <Check size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout('builder')}
                disabled={!!checkoutLoading}
                className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {checkoutLoading === 'builder' ? 'Loading…' : 'Join Builders Club'}
              </button>
              <p className="text-center text-[10px] text-slate-400 mt-3">$249/year — not a one-time payment</p>
            </div>
          </motion.div>

        </div>

        {/* Section footnote */}
        <p className="text-center text-[11px] text-slate-400 mt-10 max-w-xl mx-auto">
          All plans require a credit card. You will not be charged during your 7-day trial. Builders Club is billed annually at $249/year.
        </p>
      </div>
    </section>
  );
};

// ============================================
// FINAL CTA SECTION
// ============================================

const FinalCTASection = () => {
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleBuilderCheckout = async () => {
    const checkoutTab = openStripeCheckoutTab();
    setCheckoutLoading(true);
    try {
      await createCheckoutSession('builder', 'annual', { targetWindow: checkoutTab });
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <section className="py-16 md:py-32 px-4 bg-white relative overflow-hidden border-t border-slate-200/60">
      <div className="absolute -top-1/3 -left-1/4 w-[600px] h-[600px] bg-[#01bad2]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-1/3 -right-1/4 w-[500px] h-[500px] bg-[#2B8FC7]/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto max-w-4xl text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-slate-900 tracking-tighter mb-4 md:mb-6 leading-tight">
            Stop Guessing.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2B8FC7] to-[#01bad2]">
              Start Creating.
            </span>
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-slate-500 max-w-xl md:max-w-2xl mx-auto mb-4 md:mb-6">
            Join the creators who already have their content strategy handled. We built the platform we wish we had.
          </p>
          
          <div>
            <BorderBeamButton 
              onClick={handleBuilderCheckout}
              disabled={checkoutLoading}
              className="px-8 md:px-10 h-14 md:h-16 rounded-xl md:rounded-2xl text-white font-bold text-base md:text-lg shadow-lg shadow-[#01bad2]/20 hover:shadow-[#01bad2]/30 transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
              beamDuration={6}
            >
              {checkoutLoading ? 'Loading…' : (
                <>Join Builders Club<ArrowRight size={18} className="ml-2" /></>
              )}
            </BorderBeamButton>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-6 md:mt-8 text-xs md:text-sm text-slate-500 font-medium">
            <span className="flex items-center gap-1.5"><Check size={16} className="text-green-500" /> 14-day money-back guarantee</span>
            <span className="flex items-center gap-1.5"><Check size={16} className="text-green-500" /> Cancel anytime</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ============================================
// ANNOUNCEMENT BANNER (session-dismissable)
// ============================================

const ANNOUNCEMENT_BANNER_SESSION_KEY = 'huttleAnnouncementBannerDismissed';

const AnnouncementBanner = ({ onDismiss }) => {
  const handleSeeOffer = (e) => {
    e.preventDefault();
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[70] bg-[#01BAD2] text-white h-[52px] md:h-[44px]"
      style={{ fontFamily: 'Figtree, Inter, system-ui, sans-serif' }}
      role="region"
      aria-label="Announcement"
      data-testid="announcement-banner"
    >
      <div className="h-full w-full flex items-center gap-3 md:gap-5 px-3 md:px-6">
        <p className="flex-1 min-w-0 text-white text-[13px] md:text-[14px] leading-snug text-center md:text-left" style={{ fontWeight: 500 }}>
          Builders Club early access closes April 22. Limited membership, price locked for life.
        </p>
        <button
          type="button"
          onClick={handleSeeOffer}
          className="shrink-0 text-white text-[13px] md:text-[14px] whitespace-nowrap hover:underline underline-offset-2 transition-opacity"
          style={{ fontWeight: 500 }}
          data-testid="announcement-banner-cta"
        >
          See Offer <span aria-hidden="true">→</span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss announcement"
          className="shrink-0 p-1 rounded-full text-white hover:bg-white/15 transition-colors"
          data-testid="announcement-banner-close"
        >
          <X size={16} className="text-white" />
        </button>
      </div>
    </div>
  );
};

// ============================================
// MAIN LANDING PAGE
// ============================================

export default function LandingPage() {
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [isFoundersModalOpen, setIsFoundersModalOpen] = useState(false);
  const [navCheckoutLoading, setNavCheckoutLoading] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return sessionStorage.getItem(ANNOUNCEMENT_BANNER_SESSION_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const handleDismissBanner = () => {
    try {
      sessionStorage.setItem(ANNOUNCEMENT_BANNER_SESSION_KEY, '1');
    } catch {
      // Safari private mode etc. fall back to in-memory dismissal
    }
    setBannerVisible(false);
  };

  const handleNavBuilderCheckout = async () => {
    const checkoutTab = openStripeCheckoutTab();
    setNavCheckoutLoading(true);
    try {
      await createCheckoutSession('builder', 'annual', { targetWindow: checkoutTab });
    } finally {
      setNavCheckoutLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Huttle AI | The Ultimate AI Creative Director";
    // Setup generic meta description if missing
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = "Huttle AI is currently paid-only with Founders Club (open now) and Builders Club launch pricing from April 7, followed by Essentials and Pro public plans.";
  }, []);

  return (
    <div className="min-h-screen w-full max-w-full bg-white text-slate-900 overflow-x-hidden selection:bg-[#01bad2]/30">
      {STRUCTURED_DATA.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
      <ScrollProgress />
      <WaitlistModal isOpen={isWaitlistModalOpen} onClose={() => setIsWaitlistModalOpen(false)} />
      <FoundersClubModal 
        isOpen={isFoundersModalOpen} 
        onClose={() => setIsFoundersModalOpen(false)} 
      />

      {/* ANNOUNCEMENT BANNER */}
      {bannerVisible && <AnnouncementBanner onDismiss={handleDismissBanner} />}

      {/* NAVBAR */}
      <nav
        className={`fixed left-0 right-0 z-50 flex justify-center px-4 pt-2 md:pt-3 ${bannerVisible ? 'top-[52px] md:top-[44px]' : 'top-0'}`}
        data-testid="landing-nav"
      >
        <div 
          className="flex items-center gap-4 md:gap-8 rounded-full border border-slate-200/60 bg-white/80 backdrop-blur-xl px-4 md:px-8 py-3 md:py-3.5 shadow-lg shadow-slate-200/50 nav-fade-in"
        >
          <div className="flex items-center gap-2 font-bold tracking-tight">
            <img src="/huttle-logo.png" alt="Huttle AI" className="h-6 md:h-8 w-auto" />
          </div>
          <button 
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="hidden md:inline-flex text-sm md:text-base font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Features
          </button>
          <BorderBeamButton 
            onClick={handleNavBuilderCheckout}
            disabled={navCheckoutLoading}
            className="rounded-full px-4 md:px-7 py-2 md:py-3 text-xs md:text-sm font-bold text-white shadow-md shadow-[#01bad2]/20 disabled:opacity-60 disabled:cursor-not-allowed"
            beamSize={100}
            beamDuration={4}
          >
            {navCheckoutLoading ? 'Loading…' : (
              <>Join Builders Club<ArrowRight size={14} className="ml-1" /></>
            )}
          </BorderBeamButton>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            data-testid="landing-nav-login"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden md:inline">Login</span>
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section
        className={`relative ${bannerVisible ? 'pt-[244px] sm:pt-[260px] md:pt-[268px] lg:pt-[252px]' : 'pt-48 sm:pt-52 md:pt-56 lg:pt-52'} pb-8 md:pb-12 lg:pb-16 px-4 sm:px-6 overflow-x-clip overflow-y-visible`}
        data-testid="landing-hero"
      >
        <HeroBackground />
        
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-center">
            
            {/* LEFT COLUMN - Content */}
            <div className="text-center md:text-left order-1">
              
              <BlurFade delay={0.1}>
                 <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-600 text-xs md:text-sm font-bold mb-6 border border-slate-200">
                    <Rocket size={14} className="w-3.5 h-3.5 text-[#01bad2]" />
                    The Ultimate AI Creative Director
                 </div>
              </BlurFade>

              {/* HEADLINE */}
              <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-8xl xl:text-9xl 2xl:text-[7.5rem] font-bold text-slate-900 leading-[1.05] tracking-tighter">
                <BlurFade delay={0.2}>
                  <span className="block">The Guesswork</span>
                </BlurFade>
                <BlurFade delay={0.4}>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#2B8FC7] to-[#01bad2] pb-2">
                    Ends Here.
                  </span>
                </BlurFade>
              </h1>

              {/* SUBHEAD */}
              <BlurFade delay={0.6}>
                <p className="mt-5 md:mt-6 text-base md:text-lg lg:text-xl text-slate-500 max-w-md mx-auto md:mx-0 leading-relaxed font-medium">
                  Real-time trends, AI-written scripts, and viral predictions — on demand.
                </p>
              </BlurFade>

            </div>
            
            {/* RIGHT COLUMN - iPhone Mockup with Floating Cards */}
            <div className="relative flex justify-center order-2 mt-12 sm:mt-14 md:mt-10 lg:mt-0 w-full max-w-full">
              <div className="relative w-full max-w-[min(100%,420px)] sm:max-w-[min(100%,480px)] mx-auto md:max-w-none md:w-[520px] md:mx-0 lg:w-[560px] xl:w-[620px] min-h-[500px] sm:min-h-[540px] md:min-h-[600px] lg:min-h-[640px] md:h-[620px] lg:h-[660px] xl:h-[700px] overflow-x-clip overflow-y-visible md:overflow-visible px-1 sm:px-0">
                
                {/* Floating Cards - Desktop (md+) - CSS animations instead of framer-motion */}
                {/* Top Left Card - Trending (tablet ~75%, desktop xl+ ~88%) */}
                <div 
                  className="absolute z-10 hidden md:block hero-card-in left-[-3%] lg:left-[-6%] xl:left-[-7%] top-[11%] lg:top-[12%]"
                  style={{ animationDelay: '0.9s' }}
                >
                  <div className="hero-float-1" style={{ transform: 'rotate(-5deg)' }}>
                    <GlassCard className="w-[128px] lg:w-[142px] xl:w-[156px] 2xl:w-[168px] p-3 lg:p-3.5 xl:p-4">
                      <div className="flex items-center gap-1.5 mb-1.5 lg:mb-2">
                        <div className="h-7 w-7 lg:h-8 lg:w-8 xl:h-9 xl:w-9 rounded-lg lg:rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                          <TrendingUp size={15} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[8px] xl:text-[9px] font-bold text-slate-400 uppercase tracking-wider">Trending Now</div>
                          <div className="font-bold text-slate-900 text-xs lg:text-sm xl:text-base leading-tight">#GlowUp</div>
                        </div>
                      </div>
                      <div className="space-y-0.5 text-[10px] lg:text-[11px] xl:text-xs">
                        <div className="flex justify-between gap-1">
                          <span className="text-slate-500 truncate">Posts today</span>
                          <span className="font-bold text-slate-900 shrink-0">12.4k</span>
                        </div>
                        <div className="flex justify-between gap-1">
                          <span className="text-slate-500">Growth</span>
                          <span className="font-bold text-green-500">+340%</span>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </div>

                {/* Bottom Left Card - Created */}
                <div 
                  className="absolute z-10 hidden md:block hero-card-in left-[1%] lg:left-[0%] bottom-[14%] lg:bottom-[15%]"
                  style={{ animationDelay: '1.1s' }}
                >
                  <div className="hero-float-2" style={{ transform: 'rotate(-6deg)' }}>
                    <GlassCard className="w-[122px] lg:w-[138px] xl:w-[150px] 2xl:w-[162px] p-3 lg:p-3.5 xl:p-4">
                      <div className="flex justify-between items-center mb-1.5 lg:mb-2 gap-1">
                        <span className="text-[8px] xl:text-[9px] font-bold uppercase text-slate-400 tracking-wider">Created</span>
                        <div className="h-3.5 w-3.5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <Check size={8} className="text-green-600" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="h-7 w-7 lg:h-8 lg:w-8 xl:h-9 xl:w-9 rounded-lg bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 text-white flex items-center justify-center shadow-lg shrink-0">
                          <Instagram size={13} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-[11px] lg:text-xs xl:text-sm leading-tight">Instagram Reel</div>
                          <div className="text-[10px] lg:text-[11px] text-slate-500">Saved to Vault</div>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </div>

                {/* Top Right Card - Viral Score */}
                <div 
                  className="absolute z-10 hidden md:block hero-card-in right-[-3%] lg:right-[-6%] xl:right-[-7%] top-[9%] lg:top-[10%]"
                  style={{ animationDelay: '1.0s' }}
                >
                  <div className="hero-float-3" style={{ transform: 'rotate(5deg)' }}>
                    <GlassCard className="w-[112px] lg:w-[124px] xl:w-[138px] 2xl:w-[148px] p-3 lg:p-3.5 xl:p-4">
                      <div className="flex items-center gap-1 mb-1">
                        <Gauge size={11} className="text-[#01bad2]" />
                        <span className="text-[8px] xl:text-[9px] font-bold uppercase text-slate-400 tracking-wider">Viral Score</span>
                      </div>
                      <div className="flex items-end gap-1">
                        <span className="text-xl lg:text-2xl xl:text-3xl font-black text-slate-900 leading-none">94</span>
                        <span className="text-[11px] lg:text-xs text-slate-400 mb-0.5">/100</span>
                      </div>
                      <p className="text-[8px] lg:text-[9px] text-green-600 font-medium mt-0.5 leading-tight">High viral potential!</p>
                    </GlassCard>
                  </div>
                </div>

                {/* Bottom Right Card - Audio Match */}
                <div 
                  className="absolute z-10 hidden md:block hero-card-in right-[1%] lg:right-[0%] bottom-[16%] lg:bottom-[18%]"
                  style={{ animationDelay: '1.2s' }}
                >
                  <div className="hero-float-4" style={{ transform: 'rotate(6deg)' }}>
                    <GlassCard className="w-[122px] lg:w-[138px] xl:w-[150px] 2xl:w-[162px] p-3 lg:p-3.5 xl:p-4">
                      <div className="flex items-center gap-1 mb-1">
                        <Music size={11} className="text-[#01bad2]" />
                        <span className="text-[8px] xl:text-[9px] font-bold uppercase text-slate-400 tracking-wider">Audio Match</span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="h-7 w-7 lg:h-8 lg:w-8 xl:h-9 xl:w-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shrink-0">
                          <Play size={13} className="text-white ml-0.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] lg:text-xs xl:text-sm font-bold text-slate-900 leading-tight">Trending Sound</div>
                          <div className="text-[10px] lg:text-[11px] text-slate-500">2.1M uses</div>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </div>

                {/* iPhone Mockup — width-led scale: focal point vs floating badges */}
                <div 
                  className="absolute z-30 inset-0 flex items-end justify-center sm:items-center pointer-events-none hero-phone-in px-3 sm:px-4 pb-1 sm:pb-0 pt-8 sm:pt-4 md:pt-0"
                >
                  <div className="phone-float flex w-full max-w-full items-end justify-center sm:items-center">
                    <img 
                      src="/hero-iphone-mockup.png"
                      alt="Huttle AI mobile app — trending content and create flow"
                      className="h-auto w-[min(280px,max(240px,70vw))] max-w-[280px] sm:w-[min(300px,max(250px,68vw))] sm:max-w-[300px] md:w-[min(330px,42vw)] md:max-w-[340px] md:min-w-0 lg:w-[min(360px,38vw)] lg:max-w-[380px] xl:w-[min(400px,34vw)] xl:max-w-[400px] object-contain object-bottom sm:object-center drop-shadow-[0_28px_55px_-12px_rgba(15,23,42,0.38)]"
                    />
                  </div>
                </div>

                {/* Mobile Cards — compact badges (~60% scale), tucked near phone; z-10 below mockup (z-30) */}
                {/* Top Left - Trending */}
                <div className="absolute z-10 md:hidden left-[5%] min-[400px]:left-[6%] top-[28%] origin-center hero-card-mobile" style={{ animationDelay: '0.7s' }}>
                  <div className="hero-float-1" style={{ transform: 'rotate(-10deg)' }}>
                    <GlassCard className="w-[62px] min-[400px]:w-[66px] p-2 shadow-lg">
                      <div className="flex items-center gap-0.5 mb-0.5">
                        <div className="h-4 w-4 rounded bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white shadow-sm">
                          <TrendingUp size={10} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[6px] font-bold text-slate-400 uppercase tracking-wider leading-none">Trend</div>
                          <div className="font-bold text-slate-900 text-[7px] leading-tight">#GlowUp</div>
                        </div>
                      </div>
                      <div className="space-y-0 text-[6px] leading-tight">
                        <div className="flex justify-between gap-0.5">
                          <span className="text-slate-500">Posts</span>
                          <span className="font-bold text-slate-900">12.4k</span>
                        </div>
                        <div className="flex justify-between gap-0.5">
                          <span className="text-slate-500 truncate">Growth</span>
                          <span className="font-bold text-green-500 shrink-0">+340%</span>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </div>

                {/* Bottom Left - Created */}
                <div className="absolute z-10 md:hidden left-[5%] min-[400px]:left-[6%] bottom-[28%] origin-center hero-card-mobile" style={{ animationDelay: '1.0s' }}>
                  <div className="hero-float-2" style={{ transform: 'rotate(-8deg)' }}>
                    <GlassCard className="w-[62px] min-[400px]:w-[66px] p-2 shadow-lg">
                      <div className="flex justify-between items-center mb-0.5 gap-0.5">
                        <span className="text-[6px] font-bold uppercase text-slate-400 tracking-wider leading-none">Made</span>
                        <div className="h-3 w-3 rounded-full bg-green-100 flex items-center justify-center">
                          <Check size={7} className="text-green-600" />
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <div className="h-4 w-4 rounded bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 text-white flex items-center justify-center shadow-sm shrink-0">
                          <Instagram size={9} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-[7px] leading-tight">Reel</div>
                          <div className="text-[6px] text-slate-500 leading-none">Vault</div>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </div>

                {/* Top Right - Viral Score */}
                <div className="absolute z-10 md:hidden right-[5%] min-[400px]:right-[6%] top-[28%] origin-center hero-card-mobile" style={{ animationDelay: '0.8s' }}>
                  <div className="hero-float-3" style={{ transform: 'rotate(10deg)' }}>
                    <GlassCard className="w-[62px] min-[400px]:w-[66px] p-2 shadow-lg">
                      <div className="flex items-center gap-0.5 mb-0.5">
                        <Gauge size={9} className="text-[#01bad2]" />
                        <span className="text-[6px] font-bold uppercase text-slate-400 tracking-wider leading-none">Viral</span>
                      </div>
                      <div className="flex items-end gap-0.5">
                        <span className="text-lg font-black text-slate-900 leading-none">94</span>
                        <span className="text-[8px] text-slate-400 mb-0.5">/100</span>
                      </div>
                      <p className="text-[6px] text-green-600 font-medium mt-0.5 leading-tight">Hot!</p>
                    </GlassCard>
                  </div>
                </div>

                {/* Bottom Right - Audio Match */}
                <div className="absolute z-10 md:hidden right-[5%] min-[400px]:right-[6%] bottom-[28%] origin-center hero-card-mobile" style={{ animationDelay: '1.1s' }}>
                  <div className="hero-float-4" style={{ transform: 'rotate(8deg)' }}>
                    <GlassCard className="w-[62px] min-[400px]:w-[66px] p-2 shadow-lg">
                      <div className="flex items-center gap-0.5 mb-0.5">
                        <Music size={9} className="text-[#01bad2]" />
                        <span className="text-[6px] font-bold uppercase text-slate-400 tracking-wider leading-none">Audio</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <div className="h-4 w-4 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm shrink-0">
                          <Play size={9} className="text-white ml-px" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[7px] font-bold text-slate-900 leading-tight">Sound</div>
                          <div className="text-[6px] text-slate-500 leading-none">2.1M</div>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </div>

              </div>
            </div>
            
          </div>
        </div>

        {/* Scroll Indicator - CSS animation */}
        <div className="flex justify-center mt-8 md:mt-12 ml-2 scroll-indicator-fade">
          <button
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#01bad2] transition-colors scroll-bounce"
          >
            <span className="text-xs font-medium tracking-wide uppercase">Scroll</span>
            <ChevronDown size={20} />
          </button>
        </div>
      </section>


      {/* FEATURE MARQUEE */}
      <SocialProofMarquee />

      {/* PAIN POINTS SECTION */}
      <PainPointsSection />

      {/* VIDEO DEMO SECTION */}
      <VideoDemoSection />

      {/* NICHE-SPECIFIC SECTION */}
      <NicheSpecificSection />

      {/* BENTO FEATURE GRID */}
      <BentoGrid />

      {/* FEATURE SHOWCASE SECTION */}
      <FeatureShowcaseSection />

      {/* ORBITING PLATFORMS SECTION */}
      <OrbitingPlatformsSection />

      {/* PRICING SECTION */}
      <PricingSection />

      {/* FAQ SECTION */}
      <FAQSectionComponent />

      {/* FINAL CTA SECTION */}
      <FinalCTASection />

      {/* FOOTER */}
      <footer className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <img src="/huttle-logo.png" alt="Huttle AI" className="h-8 md:h-10 w-auto" />
          </div>
          
          <div className="flex-1 text-center space-y-3">
            <p className="text-sm text-slate-500">
              © 2026 Huttle AI · <Link to="/privacy" className="hover:text-slate-700 transition-colors underline-offset-2 hover:underline">Privacy Policy</Link> · <Link to="/terms" className="hover:text-slate-700 transition-colors underline-offset-2 hover:underline">Terms of Service</Link> · <Link to="/refund-policy" className="hover:text-slate-700 transition-colors underline-offset-2 hover:underline">Refund Policy</Link>
            </p>
            <p className="text-sm text-slate-500" data-testid="landing-footer-support">
              Questions?{' '}
              <a
                href="mailto:support@huttleai.com"
                className="text-slate-600 hover:text-slate-900 transition-colors underline-offset-2 hover:underline font-medium"
              >
                support@huttleai.com
              </a>
            </p>
          </div>
          
          <div className="w-8 md:w-10"></div>
        </div>
      </footer>

      <style>{`
        /* Smooth scroll */
        html { scroll-behavior: smooth; }

        /* Nav fade in */
        .nav-fade-in {
          animation: nav-fade 0.6s ease-out 0.1s both;
        }
        @keyframes nav-fade {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Phone floating animation - CSS only */
        .phone-float {
          animation: phone-float 6s ease-in-out infinite;
        }
        @keyframes phone-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        /* Phone entrance */
        .hero-phone-in {
          animation: hero-phone-in 1s ease-out 0.6s both;
        }
        @keyframes hero-phone-in {
          from { opacity: 0; transform: translateY(30px) translateX(40px); }
          to { opacity: 1; transform: translateY(0) translateX(0); }
        }

        /* Hero floating cards - 4 different float patterns (CSS, not framer-motion) */
        .hero-float-1 { animation: hero-float-1 4s ease-in-out infinite; }
        .hero-float-2 { animation: hero-float-2 5s ease-in-out 0.5s infinite; }
        .hero-float-3 { animation: hero-float-3 3.5s ease-in-out 0.3s infinite; }
        .hero-float-4 { animation: hero-float-4 4.5s ease-in-out 0.7s infinite; }

        @keyframes hero-float-1 {
          0%, 100% { transform: rotate(-5deg) translateY(0); }
          50% { transform: rotate(-3deg) translateY(-8px); }
        }
        @keyframes hero-float-2 {
          0%, 100% { transform: rotate(-6deg) translateY(0); }
          50% { transform: rotate(-4deg) translateY(6px); }
        }
        @keyframes hero-float-3 {
          0%, 100% { transform: rotate(5deg) translateY(0); }
          50% { transform: rotate(7deg) translateY(-6px); }
        }
        @keyframes hero-float-4 {
          0%, 100% { transform: rotate(6deg) translateY(0); }
          50% { transform: rotate(8deg) translateY(8px); }
        }

        /* Hero card entrance - desktop */
        .hero-card-in {
          animation: hero-card-in 1s ease-out both;
          animation-delay: inherit;
        }
        @keyframes hero-card-in {
          from { opacity: 0; transform: scale(0.7); }
          to { opacity: 1; transform: scale(1); }
        }

        /* Hero card entrance - mobile */
        .hero-card-mobile {
          animation: hero-card-mobile 0.8s ease-out both;
          animation-delay: inherit;
        }
        @keyframes hero-card-mobile {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        /* CTA pulse glow */
        .cta-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.3); }
          50% { box-shadow: 0 0 40px rgba(6, 182, 212, 0.6); }
        }

        /* Badge pulse */
        .badge-pulse {
          animation: badge-pulse 2s ease-in-out infinite;
        }
        @keyframes badge-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }

        /* Pricing card border glow */
        .pricing-card-glow {
          animation: border-glow 4s ease-in-out infinite;
        }
        @keyframes border-glow {
          0%, 100% { border-color: #06B6D4; box-shadow: 0 0 20px rgba(6, 182, 212, 0.2); }
          50% { border-color: #22D3EE; box-shadow: 0 0 35px rgba(6, 182, 212, 0.35); }
        }

        /* Scroll indicator */
        .scroll-indicator-fade {
          animation: scroll-fade 0.6s ease-out 1.5s both;
        }
        @keyframes scroll-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .scroll-bounce {
          animation: scroll-bounce 2s ease-in-out infinite;
        }
        @keyframes scroll-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }

        /* Hero orb animations - CSS instead of framer-motion */
        .hero-orb-1 {
          animation: hero-orb-1 25s ease-in-out infinite;
          will-change: transform;
        }
        .hero-orb-2 {
          animation: hero-orb-2 30s ease-in-out 3s infinite;
          will-change: transform;
        }
        .hero-orb-3 {
          animation: hero-orb-3 20s ease-in-out 5s infinite;
          will-change: transform;
        }
        @keyframes hero-orb-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, 30px) scale(1.1); }
        }
        @keyframes hero-orb-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 40px) scale(1.15); }
        }
        @keyframes hero-orb-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -30px) scale(1.1); }
        }

        /* Global button enhancements */
        button:not(:disabled) {
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        button:not(:disabled):active {
          transform: scale(0.98) !important;
        }
      `}</style>
    </div>
  );
}
