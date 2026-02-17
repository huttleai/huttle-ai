import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Check, Sparkles, Calendar, TrendingUp, 
  Zap, Play, Search, Instagram,
  Activity, Users, BarChart3, Facebook, Youtube,
  Repeat, MessageSquare, Film, Music, Hash, Gauge, Crown, Clock, X,
  Star, Building2, Rocket, Shield, HeartHandshake, ChevronDown, AlertCircle, LogIn
} from "lucide-react";
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
// Custom Feature Icons
import { 
  ViralBlueprintIcon,
  SmartCalendarIcon, 
  AIPlanBuilderIcon, 
  ContentRemixIcon, 
  CaptionGeneratorIcon, 
  QualityScorerIcon 
} from "./components/icons/FeatureIcons";

// ============================================
// ANIMATION VARIANTS & CONFIGS (simplified)
// ============================================

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    }
  }
};

const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

const FOUNDING_SPOTS_LEFT = 41;

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
        bg-white/70 backdrop-blur-xl
        border border-white/40
        shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(255,255,255,0.2)]
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

const FoundersClubModal = ({ isOpen, onClose, onJoinWaitlist }) => {
  const stripeTestCheckoutUrl = 'https://buy.stripe.com/test_fZueVc3LEaw8dKc9Ri3wQ06';

  const handleProceedToCheckout = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    window.location.href = stripeTestCheckoutUrl;
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
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#2B8FC7] to-[#01bad2] flex items-center justify-center">
                <Crown className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Founders Club</h3>
                <p className="text-sm text-slate-500">Early Access Membership</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {[
                { title: "Lifetime Price Lock", desc: "$199/year forever, even when prices increase" },
                { title: "Highest AI Limits", desc: "Pro & Founders get the most generous generation limits" },
                { title: "All Pro Features", desc: "Viral Blueprint, Content Remix Studio, Trend Deep Dive, and more" },
                { title: "Priority Support", desc: "Direct access to the founding team" },
                { title: "7 Day Happiness Guarantee", desc: "Not satisfied? Get a full refund within 7 days, no questions asked" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check className="text-[#01bad2] mt-0.5 flex-shrink-0" size={18} />
                  <div>
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-6 p-4 rounded-2xl bg-slate-50">
              <div>
                <p className="text-sm text-slate-500">Founders Price</p>
                <p className="text-2xl font-bold text-slate-900">$199<span className="text-sm font-normal text-slate-500">/year</span></p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400 line-through">$357/year</p>
                <p className="text-sm font-bold text-green-600">Save 41%</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => {
                  onClose();
                  onJoinWaitlist();
                }}
                className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors text-center"
              >
                Join Waitlist
              </button>
              <button 
                onClick={(e) => handleProceedToCheckout(e)}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-[#2B8FC7] to-[#01bad2] text-white font-bold shadow-lg shadow-[#01bad2]/25 hover:shadow-[#01bad2]/40 transition-shadow flex items-center justify-center gap-2"
              >
                Checkout
                <ArrowRight size={16} />
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
    { name: "Smart Calendar", subtitle: "7 & 14-Day Planning" },
    { name: "AI Plan Builder", subtitle: "Content Strategy" },
    { name: "Hashtag Generator", subtitle: "Trending Tags" },
    { name: "Content Remix Studio", subtitle: "5 Platform Variations" },
    { name: "AI Power Tools", subtitle: "Advanced Features" },
    { name: "Trend Lab", subtitle: "Real-Time Insights" },
    { name: "Daily Social Updates", subtitle: "Fresh Content Ideas" },
    { name: "Trend Discovery", subtitle: "Viral Opportunities" },
    { name: "Content Library", subtitle: "Organized Assets" },
    { name: "Viral Blueprint", subtitle: "Complete Scripts" },
  ];

  return (
    <div className="py-4 md:py-16 bg-white border-y border-slate-100 overflow-hidden">
      <Marquee duration={40} pauseOnHover gap={16}>
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 md:gap-3 px-2 md:px-6">
            <div className="text-sm md:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#2B8FC7] to-[#01bad2] whitespace-nowrap">
              {item.name}
            </div>
            <div className="text-[8px] md:text-xs text-slate-500 font-medium whitespace-nowrap">
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
    <div className="relative min-h-[420px] md:min-h-[700px] lg:min-h-[800px] w-full overflow-hidden bg-gradient-to-b from-white to-slate-50 flex flex-col items-center justify-center py-10 md:py-32 px-4 md:px-8 lg:px-12">
      <div className="absolute inset-0 opacity-20 md:opacity-30">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <motion.div 
        className="text-center relative z-20 max-w-3xl mx-auto mb-6 md:mb-16 px-1"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-xl sm:text-2xl md:text-4xl lg:text-6xl font-bold text-slate-900 mb-2.5 md:mb-6 tracking-tighter leading-tight">
          Create for every platform,<br className="hidden sm:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2B8FC7] to-[#01bad2]">all in one place.</span>
        </h2>
        <p className="text-xs md:text-lg lg:text-xl text-slate-500 max-w-md md:max-w-xl mx-auto">
            TikTok. Instagram. YouTube. X. Facebook. One tool that creates content optimized for every algorithm.
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
// BENTO FEATURE GRID WITH MAGIC CARDS
// ============================================

const BentoGrid = () => {
  const features = [
    { 
      IconComponent: ViralBlueprintIcon, 
      title: "Viral Blueprint Generator", 
      description: "Tell it your topic and platform. It researches what's trending, writes a step-by-step script with hooks, visuals, and keywords — in 30 seconds." 
    },
    { 
      IconComponent: AIPlanBuilderIcon, 
      title: "AI Plan Builder", 
      description: "Get a full week of posts planned in 30 seconds. No more Sunday night scrambling." 
    },
    { 
      IconComponent: ContentRemixIcon, 
      title: "Content Remix Studio", 
      description: "Drop in one post. Get back 5 platform-optimized versions — TikTok, Instagram, X, YouTube, Facebook." 
    },
    { 
      IconComponent: SmartCalendarIcon, 
      title: "Smart Calendar", 
      description: "AI picks the best times to post based on when your audience is actually online." 
    },
    { 
      IconComponent: CaptionGeneratorIcon, 
      title: "AI Power Tools", 
      description: "Caption generator, hashtag research, hook builder, CTA suggester, and keyword tools — all in one place." 
    },
    { 
      IconComponent: QualityScorerIcon, 
      title: "Quality Scorer", 
      description: "Get a viral potential score before you hit post. See exactly what to fix to boost engagement." 
    },
  ];

  return (
    <section id="features" className="py-10 md:py-32 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <motion.div 
          className="mb-6 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <div 
            className="inline-flex items-center gap-1.5 px-2 md:px-3 py-0.5 md:py-1.5 rounded-full bg-purple-100 text-purple-700 text-[9px] md:text-xs font-bold mb-2.5 md:mb-4 border border-purple-200 badge-pulse"
          >
            <Zap size={10} className="w-2.5 h-2.5 md:w-3 md:h-3" />
            More than just another smart calendar
          </div>
          <h2 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold tracking-tighter mb-2 md:mb-4 text-slate-900">
            Your AI Creative Director.
          </h2>
          <p className="text-xs md:text-lg lg:text-xl text-slate-500">10+ AI tools that replace your content planner, trend researcher, and copywriter — for less than $17/month.</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-4">
          {features.map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: i < 3 ? i * 0.08 : (i - 3) * 0.08 + 0.15 }}
            >
              <MagicCard 
                className="p-2.5 sm:p-3 md:p-6 h-full border border-slate-200 bg-white hover:border-[#01bad2]/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                gradientColor="rgba(1, 186, 210, 0.12)"
              >
                <div className="mb-2 md:mb-4">
                  <feature.IconComponent size={32} />
                </div>
                <h3 className="text-xs sm:text-sm md:text-lg font-bold mb-1 text-slate-900 leading-tight">{feature.title}</h3>
                <p className="text-[10px] sm:text-xs md:text-sm leading-relaxed text-slate-500 line-clamp-3">{feature.description}</p>
              </MagicCard>
            </motion.div>
          ))}
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
    { emoji: "🤔", title: "What should I post?", text: "It's 9am. You've been staring at a blank caption for 20 minutes. You post something generic. It gets 12 likes. You wonder why you bother." },
    { emoji: "📉", title: "Why did that flop?", text: "You spent 3 hours on a Reel. Picked the music. Edited the cuts. Wrote the caption. 47 views. Meanwhile, some guy filming his lunch gets 200K." },
    { emoji: "😫", title: "I can't keep up", text: "TikTok wants raw. Instagram wants polished. X wants hot takes. YouTube wants long-form. You're one person trying to be four different creators." }
  ];

  return (
    <section className="bg-slate-900 py-10 md:py-32 px-4 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div 
          className="text-center mb-6 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-[10px] md:text-sm font-bold uppercase tracking-widest text-slate-400 mb-2 md:mb-4">Sound Familiar?</h2>
          <h3 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold tracking-tighter text-white">The content struggle is real.</h3>
        </motion.div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
          {painPoints.map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div 
                className="group bg-slate-800/60 backdrop-blur-sm p-4 md:p-10 rounded-xl md:rounded-3xl border border-slate-700/50 hover:border-[#01bad2]/50 transition-all duration-300 cursor-pointer h-full flex flex-col hover:-translate-y-2 hover:shadow-[0_25px_50px_-12px_rgba(1,186,210,0.2)]"
              >
                <div className="text-2xl md:text-5xl mb-2 md:mb-6">
                  {item.emoji}
                </div>
                <h4 className="text-sm md:text-xl font-bold mb-1.5 md:mb-3 text-white group-hover:text-[#01bad2] transition-colors">{item.title}</h4>
                <p className="text-slate-300 leading-relaxed text-xs md:text-base flex-1">{item.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================
// FEATURE SHOWCASE SECTION
// ============================================

const FeatureShowcaseSection = () => {
  return (
    <section className="py-12 md:py-32 px-4 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        <motion.div 
          className="text-center mb-8 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
            <span 
              className="inline-block px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-[#01bad2]/10 text-[#01bad2] text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3 md:mb-4 border border-[#01bad2]/20"
            >
              <Play size={10} className="inline mr-1 -mt-0.5 md:w-3 md:h-3" />
              See It In Action
            </span>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tighter mb-3 md:mb-4">
              Features That Make You Go Viral
            </h2>
            <p className="text-sm md:text-lg text-slate-500 max-w-2xl mx-auto px-2">
              Explore the AI-powered tools that will transform your content strategy
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
  const faqs = [
    {
      question: "What do Founding Members get?",
      answer: "Full Pro access at $199/yr locked forever. All AI tools, all features — Viral Blueprint Generator, AI Plan Builder, Content Remix Studio, Smart Calendar, Trend Lab, AI Power Tools, and more. Cancel anytime with no questions asked."
    },
    {
      question: "What happens when the Founding Member offer ends?",
      answer: "On March 1, the price becomes $249/yr (Builders Club) for 10 days. After March 10, regular Pro pricing is $357/yr. Your founding rate stays locked forever — it never increases, no matter what."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Absolutely. Cancel from your account settings whenever you want. No hoops to jump through, no hidden fees, no awkward phone calls. Your access continues until the end of your billing period."
    },
    {
      question: "Is there a money-back guarantee?",
      answer: "Yes. We have a 7-day happiness guarantee. If you're not satisfied within the first 7 days, we'll refund you in full. No questions asked. Email support@huttleai.com and we'll take care of it immediately."
    },
    {
      question: "What platforms does Huttle AI support?",
      answer: "TikTok, Instagram, YouTube, X (Twitter), and Facebook. All AI tools generate platform-optimized content — from scripts and captions to hashtags and posting times — tailored to each platform's algorithm."
    },
    {
      question: "Is my payment secure?",
      answer: "100%. All payments are processed through Stripe, the same infrastructure trusted by Amazon, Google, and Shopify. We never store your card information on our servers."
    },
  ];

  return (
    <section className="py-12 md:py-32 px-4 bg-white">
      <div className="container mx-auto max-w-4xl">
        <motion.div 
          className="text-center mb-8 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
            <span 
              className="inline-block px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-[#01bad2]/10 text-[#01bad2] text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3 md:mb-4 border border-[#01bad2]/20"
            >
              FAQ
            </span>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tighter mb-3 md:mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-sm md:text-lg text-slate-500 max-w-2xl mx-auto">
              Everything you need to know about Huttle AI
            </p>
        </motion.div>
        
        <FAQAccordion items={faqs} />
      </div>
    </section>
  );
};

// ============================================
// PRICING SECTION - 3-TIER PRICING LADDER
// ============================================

const PricingSection = ({ onOpenFoundersModal }) => {
  return (
    <section id="pricing" className="py-16 md:py-32 px-4 bg-[#0F172A] relative overflow-hidden">
      <div className="absolute -top-1/2 -left-1/4 w-full h-full bg-[#01bad2]/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-1/2 -right-1/4 w-full h-full bg-[#2B8FC7]/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div 
          className="text-center mb-10 md:mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-white/5 text-[#01bad2] text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3 md:mb-4 border border-white/10">
            Simple Pricing
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tighter mb-3 md:mb-4">
            Start creating. Pick your path.
          </h2>
          <p className="text-sm md:text-lg text-slate-400 max-w-2xl mx-auto">
            Every plan includes full access to all AI tools. The only question is when you join.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-center max-w-5xl mx-auto">

          {/* CARD 1: FOUNDING MEMBER (Primary) */}
          <motion.div 
            className="relative md:scale-105 md:z-10 order-1 md:order-2"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="pricing-card-glow relative rounded-2xl md:rounded-3xl bg-[#1E293B] p-6 md:p-8 border-2 border-[#06B6D4] overflow-hidden">
              <div className="absolute -inset-1 rounded-2xl md:rounded-3xl bg-gradient-to-r from-[#06B6D4] to-[#22D3EE] opacity-20 blur-lg -z-10" />
              
              <div 
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[10px] md:text-xs font-bold uppercase tracking-wide mb-4 border border-amber-500/30 badge-pulse"
              >
                🔥 BEST VALUE
              </div>

              <h3 className="text-lg md:text-xl font-bold text-white mb-1">Founding Member</h3>
              
              <div className="mb-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl md:text-5xl font-black text-white">
                    $<NumberTicker value={199} startValue={357} duration={0.8} triggerOnView={true} />
                  </span>
                  <span className="text-sm md:text-base text-slate-400">/year</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">$16.58/mo equivalent</p>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-slate-500 line-through">$357/yr</span>
                <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Save 44%</span>
              </div>

              <p className="text-sm text-slate-300 mb-4">Lock in the lowest price we'll ever offer.</p>
              
              <div className="flex items-center gap-2 mb-5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Users size={14} className="text-amber-400 flex-shrink-0" />
                <span className="text-xs font-bold text-amber-400">Only {FOUNDING_SPOTS_LEFT} of 100 spots remaining</span>
              </div>

              <ul className="space-y-2.5 mb-6">
                {[
                  'All Pro features forever',
                  'Rate locked — never increases',
                  'Viral Blueprint & AI Plan Builder',
                  'Content Remix Studio & Trend Lab',
                  'AI Power Tools (captions, hooks, CTAs)',
                  'Smart Calendar with optimal timing',
                  'Cancel anytime',
                ].map((feat, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs md:text-sm text-slate-300">
                    <Check size={14} className="text-[#06B6D4] mt-0.5 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <BorderBeamButton 
                onClick={onOpenFoundersModal}
                className="w-full h-12 md:h-14 rounded-xl text-white font-bold text-sm md:text-base"
                beamDuration={6}
              >
                Claim Your Founding Spot
                <ArrowRight size={16} className="ml-2" />
              </BorderBeamButton>
              <p className="text-center text-xs text-slate-500 mt-3">Offer closes February 28</p>
            </div>
          </motion.div>

          {/* CARD 2: BUILDERS CLUB */}
          <motion.div 
            className="order-2 md:order-1"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="relative rounded-2xl md:rounded-3xl bg-[#1E293B]/80 p-6 md:p-8 border border-slate-700/50 opacity-90">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-600/30 text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wide mb-4 border border-slate-600/30">
                COMING MARCH 1
              </div>

              <h3 className="text-lg md:text-xl font-bold text-white mb-1">Builders Club</h3>
              
              <div className="mb-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl md:text-4xl font-black text-white">$249</span>
                  <span className="text-sm text-slate-400">/year</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">$20.75/mo equivalent</p>
              </div>

              <p className="text-sm text-slate-400 mb-2">For the builders who move fast.</p>
              <p className="text-xs text-slate-500 mb-5">Available March 1–10 only</p>

              <ul className="space-y-2.5 mb-6">
                {[
                  'All Pro features forever',
                  'Rate locked — never increases',
                  'Everything in Founding Member',
                  'Time-limited, not spot-limited',
                ].map((feat, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs md:text-sm text-slate-400">
                    <Check size={14} className="text-slate-500 mt-0.5 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <button 
                disabled 
                className="w-full h-12 rounded-xl border border-slate-600 text-slate-500 font-medium text-sm cursor-not-allowed"
              >
                Available March 1
              </button>
              <p className="text-center text-xs text-slate-500 mt-3">Save $108/yr vs regular pricing</p>
            </div>
          </motion.div>

          {/* CARD 3: REGULAR PRO */}
          <motion.div 
            className="order-3"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="relative rounded-2xl md:rounded-3xl bg-[#1E293B]/60 p-6 md:p-8 border border-slate-700/30">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-600/20 text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wide mb-4 border border-slate-700/30">
                STARTING MARCH 11
              </div>

              <h3 className="text-lg md:text-xl font-bold text-white mb-1">Pro</h3>
              
              <div className="mb-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl md:text-4xl font-black text-white">$357</span>
                  <span className="text-sm text-slate-400">/year</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">$29.75/mo billed annually</p>
              </div>

              <p className="text-sm text-slate-400 mb-5">Or $35/month billed monthly</p>

              <ul className="space-y-2.5 mb-6">
                {[
                  'All features included',
                  'Highest AI generation limits',
                  'Full Trend Lab access',
                ].map((feat, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs md:text-sm text-slate-400">
                    <Check size={14} className="text-slate-500 mt-0.5 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <button 
                disabled 
                className="w-full h-12 rounded-xl border border-slate-700/50 text-slate-500 font-medium text-sm cursor-not-allowed"
              >
                Starting March 11
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// ============================================
// FINAL CTA SECTION
// ============================================

const FinalCTASection = ({ onOpenFoundersModal }) => {
  return (
    <section className="py-16 md:py-32 px-4 bg-[#0F172A] relative overflow-hidden">
      <div className="absolute -top-1/3 -left-1/4 w-[600px] h-[600px] bg-[#01bad2]/8 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-1/3 -right-1/4 w-[500px] h-[500px] bg-[#2B8FC7]/8 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto max-w-4xl text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold text-white tracking-tighter mb-3 md:mb-6 leading-tight">
            Stop Guessing.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2B8FC7] to-[#01bad2]">
              Start Creating.
            </span>
          </h2>
          <p className="text-sm md:text-lg lg:text-xl text-slate-400 max-w-xl md:max-w-2xl mx-auto mb-3 md:mb-4">
            Join the creators who already have their content strategy handled.
          </p>
          <p className="text-xs md:text-sm text-amber-400 font-medium mb-6 md:mb-10">
            Only 41 founding member spots remaining. After February 28, the price goes up.
          </p>
          
          <BorderBeamButton 
            onClick={onOpenFoundersModal}
            className="px-8 md:px-10 h-14 md:h-16 rounded-xl md:rounded-2xl text-white font-bold text-base md:text-lg cta-pulse-glow"
            beamDuration={6}
          >
            Lock In $199/Year Forever
            <ArrowRight size={18} className="ml-2" />
          </BorderBeamButton>
          
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-5 md:mt-6 text-xs md:text-sm text-slate-400">
            <span className="flex items-center gap-1.5"><Check size={14} className="text-green-400" /> 7-day money-back guarantee</span>
            <span className="flex items-center gap-1.5"><Check size={14} className="text-green-400" /> Cancel anytime</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ============================================
// POLICY MODAL COMPONENT
// ============================================

const PolicyModal = ({ isOpen, onClose, type }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const privacyContent = (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Privacy Policy</h2>
      <p className="text-sm text-slate-500 italic mb-6">Last updated: January 11, 2026</p>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">1. Introduction</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          Huttle AI ("we," "our," or "us") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website and use our services.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">2. Information We Collect</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">
          We collect information you provide directly to us, including:
        </p>
        <ul className="text-sm text-slate-600 leading-relaxed space-y-2 ml-4">
          <li><span className="font-bold text-sm">Account Information:</span> Name, email address, and password when you create an account</li>
          <li><span className="font-bold text-sm">Payment Information:</span> When you make a purchase, our payment processor (Stripe) collects your payment card details. We do not store your full card information on our servers</li>
          <li><span className="font-bold text-sm">Waitlist Information:</span> Email address when you join our waitlist</li>
          <li><span className="font-bold text-sm">Usage Data:</span> Information about how you interact with our services, including features used, content generated, and preferences set</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">3. How We Use Your Information</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">We use the information we collect to:</p>
        <ul className="text-sm text-slate-600 leading-relaxed space-y-1 ml-4 list-disc">
          <li>Provide, maintain, and improve our services</li>
          <li>Process transactions and send related information</li>
          <li>Send you technical notices, updates, and support messages</li>
          <li>Send marketing communications (you can opt out at any time)</li>
          <li>Respond to your comments, questions, and customer service requests</li>
          <li>Monitor and analyze trends, usage, and activities</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">4. Information Sharing</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">We do not sell, trade, or rent your personal information to third parties. We may share your information with:</p>
        <ul className="text-sm text-slate-600 leading-relaxed space-y-2 ml-4">
          <li><span className="font-bold text-sm">Service Providers:</span> Third-party vendors who assist us in operating our services (e.g., Stripe for payments, email service providers)</li>
          <li><span className="font-bold text-sm">Legal Requirements:</span> When required by law or to protect our rights</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">5. Data Security</h3>
        <p className="text-sm text-slate-600 leading-relaxed">We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.</p>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">6. Your Rights</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">You have the right to:</p>
        <ul className="text-sm text-slate-600 leading-relaxed space-y-1 ml-4 list-disc">
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Opt out of marketing communications</li>
          <li>Export your data</li>
        </ul>
        <p className="text-sm text-slate-600 leading-relaxed mt-3">To exercise these rights, contact us at support@huttleai.com.</p>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">7. Cookies</h3>
        <p className="text-sm text-slate-600 leading-relaxed">We use essential cookies to ensure our website functions properly. We may also use analytics cookies to understand how visitors interact with our site.</p>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">8. Changes to This Policy</h3>
        <p className="text-sm text-slate-600 leading-relaxed">We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.</p>
      </section>

      <section>
        <h3 className="text-base font-bold text-slate-900 mb-3">9. Contact Us</h3>
        <p className="text-sm text-slate-600 leading-relaxed">If you have any questions about this Privacy Policy, please contact us at support@huttleai.com.</p>
      </section>
    </>
  );

  const termsContent = (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Terms of Service</h2>
      <p className="text-sm text-slate-500 italic mb-6">Last updated: January 11, 2026</p>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">1. Acceptance of Terms</h3>
        <p className="text-sm text-slate-600 leading-relaxed">By accessing or using Huttle AI ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.</p>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">2. Description of Service</h3>
        <p className="text-sm text-slate-600 leading-relaxed">Huttle AI is an AI-powered content creation platform that helps users plan, create, and optimize social media content. Features include content generation, viral predictions, trend analysis, and scheduling tools.</p>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">3. Account Registration</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">To use certain features, you must create an account. You agree to:</p>
        <ul className="text-sm text-slate-600 leading-relaxed space-y-1 ml-4 list-disc">
          <li>Provide accurate and complete information</li>
          <li>Maintain the security of your account credentials</li>
          <li>Accept responsibility for all activities under your account</li>
          <li>Notify us immediately of any unauthorized use</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">4. Subscription and Payments</h3>
        <ul className="text-sm text-slate-600 leading-relaxed space-y-1 ml-4 list-disc">
          <li><span className="font-bold text-sm">Founding Member Pricing:</span> $199/year, locked in forever for founding members</li>
          <li><span className="font-bold text-sm">Regular Pricing:</span> As displayed on our pricing page after the founding member period ends</li>
          <li>Payments are processed securely through Stripe</li>
          <li>All fees are non-refundable except as described in our Refund Policy below</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">5. Refund Policy</h3>
        <p className="text-sm text-slate-600 leading-relaxed">All sales are final for Founding Member subscriptions. Any additional questions regarding current and future subscription trials and refunds, contact support@huttleai.com</p>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">6. Acceptable Use</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">You agree NOT to use the Service to:</p>
        <ul className="text-sm text-slate-600 leading-relaxed space-y-1 ml-4 list-disc">
          <li>Violate any laws or regulations</li>
          <li>Generate content that is illegal, harmful, threatening, abusive, defamatory, or otherwise objectionable</li>
          <li>Infringe on intellectual property rights of others</li>
          <li>Attempt to gain unauthorized access to our systems</li>
          <li>Use the Service to spam or send unsolicited messages</li>
          <li>Resell or redistribute the Service without permission</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">7. Intellectual Property</h3>
        <ul className="text-sm text-slate-600 leading-relaxed space-y-2 ml-4">
          <li><span className="font-bold text-sm">Our Content:</span> The Service, including its design, features, and content created by us, is owned by Huttle AI and protected by intellectual property laws</li>
          <li><span className="font-bold text-sm">Your Content:</span> You retain ownership of content you create using the Service. By using the Service, you grant us a license to process your content solely to provide the Service to you</li>
          <li><span className="font-bold text-sm">AI-Generated Content:</span> Content generated by our AI tools is yours to use. However, you are responsible for ensuring your use of generated content complies with applicable laws</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">8. Disclaimer of Warranties</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">The Service is provided "as is" and "as available" without warranties of any kind. We do not guarantee that:</p>
        <ul className="text-sm text-slate-600 leading-relaxed space-y-1 ml-4 list-disc">
          <li>The Service will be uninterrupted or error-free</li>
          <li>AI-generated content will be accurate, complete, or suitable for any purpose</li>
          <li>Viral predictions or trend analysis will guarantee specific results</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">9. Limitation of Liability</h3>
        <p className="text-sm text-slate-600 leading-relaxed">To the maximum extent permitted by law, Huttle AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues.</p>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">10. Changes to Terms</h3>
        <p className="text-sm text-slate-600 leading-relaxed">We may modify these Terms at any time. We will notify users of significant changes via email or through the Service. Continued use after changes constitutes acceptance of the new Terms.</p>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">11. Termination</h3>
        <p className="text-sm text-slate-600 leading-relaxed">We may suspend or terminate your account at any time for violation of these Terms. You may cancel your account at any time by contacting us.</p>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">12. Governing Law</h3>
        <p className="text-sm text-slate-600 leading-relaxed">These Terms shall be governed by the laws of the State of Delaware, United States, without regard to its conflict of law provisions.</p>
      </section>

      <section>
        <h3 className="text-base font-bold text-slate-900 mb-3">13. Contact Us</h3>
        <p className="text-sm text-slate-600 leading-relaxed">If you have any questions about these Terms, please contact us at support@huttleai.com</p>
      </section>
    </>
  );

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
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={onClose}
          />
          
          <motion.div 
            className="relative bg-white rounded-xl shadow-2xl w-[95%] md:w-full md:max-w-[700px] h-[90vh] md:max-h-[80vh] overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-slate-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close modal"
            >
              <X size={20} className="text-slate-500" />
            </button>

            <div className="flex-1 overflow-y-auto p-5 md:p-8">
              {type === 'privacy' ? privacyContent : termsContent}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================
// MAIN LANDING PAGE
// ============================================

export default function LandingPage() {
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [isFoundersModalOpen, setIsFoundersModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  return (
    <div className="min-h-screen w-full max-w-full bg-white text-slate-950 overflow-x-hidden selection:bg-[#01bad2]/30">
      <ScrollProgress />
      <WaitlistModal isOpen={isWaitlistModalOpen} onClose={() => setIsWaitlistModalOpen(false)} />
      <FoundersClubModal 
        isOpen={isFoundersModalOpen} 
        onClose={() => setIsFoundersModalOpen(false)} 
        onJoinWaitlist={() => setIsWaitlistModalOpen(true)}
      />
      <PolicyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} type="privacy" />
      <PolicyModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} type="terms" />
      
      {/* ANNOUNCEMENT BAR */}
      <div className="fixed top-0 left-0 right-0 z-[55] h-9 bg-[#0F172A] flex items-center justify-center overflow-hidden">
        <div className="announcement-shimmer absolute inset-0 pointer-events-none" />
        <p className="relative z-10 text-xs md:text-sm text-white font-medium tracking-wide">
          <span className="mr-1">🔥</span> Only <span className="font-bold text-amber-400">{FOUNDING_SPOTS_LEFT}</span> of 100 Founding Member spots remaining — <span className="font-bold text-cyan-400">Lock in $199/yr forever</span>
        </p>
      </div>

      {/* NAVBAR */}
      <nav className="fixed top-9 md:top-9 left-0 right-0 z-50 flex justify-center px-4 pt-2 md:pt-3">
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
            onClick={() => setIsFoundersModalOpen(true)} 
            className="rounded-full px-4 md:px-7 py-2 md:py-3 text-xs md:text-sm font-bold text-white"
            beamSize={100}
            beamDuration={4}
          >
            Become a Founding Member
            <ArrowRight size={14} className="ml-1" />
          </BorderBeamButton>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden md:inline">Login</span>
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-48 sm:pt-52 md:pt-56 lg:pt-52 pb-8 md:pb-12 lg:pb-16 px-4 sm:px-6 overflow-x-clip">
        <HeroBackground />
        
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-center">
            
            {/* LEFT COLUMN - Content */}
            <div className="text-center md:text-left order-1">
              
              {/* HEADLINE - Simple CSS fade-in instead of per-character framer-motion */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tighter">
                <BlurFade delay={0.2}>
                  <span className="block">Know What to Post</span>
                </BlurFade>
                <BlurFade delay={0.4}>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#2B8FC7] to-[#01bad2]">
                    Before You Create It.
                  </span>
                </BlurFade>
              </h1>

              {/* SUBHEAD */}
              <BlurFade delay={0.6}>
                <p className="mt-5 md:mt-6 text-base md:text-lg lg:text-xl text-slate-600 max-w-xl mx-auto md:mx-0 leading-relaxed">
                  Stop guessing. Huttle AI tells you exactly what to post, writes your script word-for-word, and predicts if it'll go viral — before you create anything.
                </p>
              </BlurFade>

              {/* PRIMARY CTA BUTTON */}
              <BlurFade delay={0.8}>
                <div className="mt-6 md:mt-8 flex flex-col items-center md:items-start">
                  <BorderBeamButton 
                    onClick={() => setIsFoundersModalOpen(true)} 
                    className="w-full md:w-auto h-14 md:h-16 text-white font-bold text-base md:text-lg rounded-xl md:rounded-2xl px-8 md:px-10 cta-pulse-glow"
                    beamDuration={6}
                  >
                    Become a Founding Member
                    <ArrowRight size={18} className="ml-2 md:w-5 md:h-5" />
                  </BorderBeamButton>
                  <span className="mt-2.5 text-sm md:text-lg font-semibold text-slate-700 w-full flex justify-center md:justify-start md:pl-2.5">
                    $199/year forever <span className="text-slate-500 font-normal ml-1">(normally $357/yr)</span> <span className="text-green-600 font-bold ml-1">— Save 44%</span>
                  </span>
                  
                  {/* Trust Signals */}
                  <BlurFade delay={1.0}>
                    <div className="flex flex-col md:flex-row flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 mt-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5"><Check size={14} className="text-green-500" /> Full Pro access</span>
                      <span className="flex items-center gap-1.5"><Check size={14} className="text-green-500" /> 44% off locked forever</span>
                      <span className="flex items-center gap-1.5"><Check size={14} className="text-green-500" /> Cancel anytime</span>
                    </div>
                  </BlurFade>
                </div>
              </BlurFade>
            </div>
            
            {/* RIGHT COLUMN - iPhone Mockup with Floating Cards */}
            <div className="relative flex justify-center order-2 mt-6 lg:mt-0">
              <div className="relative w-full max-w-[500px] sm:max-w-[550px] mx-auto md:max-w-none md:w-[520px] md:mx-0 lg:w-[560px] xl:w-[620px] min-h-[480px] sm:min-h-[520px] md:h-[560px] lg:h-[600px]">
                
                {/* Floating Cards - Desktop (md+) - CSS animations instead of framer-motion */}
                {/* Top Left Card - Trending */}
                <div 
                  className="absolute z-10 hidden md:block hero-card-in"
                  style={{ left: '-8%', top: '12%', animationDelay: '0.9s' }}
                >
                  <div className="hero-float-1" style={{ transform: 'rotate(-5deg)' }}>
                    <GlassCard className="w-[175px] lg:w-[190px] xl:w-[205px] p-3.5 lg:p-4">
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="h-8 w-8 lg:h-9 lg:w-9 rounded-lg lg:rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                          <TrendingUp size={16} />
                        </div>
                        <div>
                          <div className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-wider">Trending Now</div>
                          <div className="font-bold text-slate-900 text-xs lg:text-sm">#GlowUp</div>
                        </div>
                      </div>
                      <div className="space-y-1 text-[11px] lg:text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Posts today</span>
                          <span className="font-bold text-slate-900">12.4k</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Growth</span>
                          <span className="font-bold text-green-500">+340%</span>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </div>

                {/* Bottom Left Card - Scheduled */}
                <div 
                  className="absolute z-10 hidden md:block hero-card-in"
                  style={{ left: '0%', bottom: '15%', animationDelay: '1.1s' }}
                >
                  <div className="hero-float-2" style={{ transform: 'rotate(-6deg)' }}>
                    <GlassCard className="w-[165px] lg:w-[180px] xl:w-[195px] p-3.5 lg:p-4">
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="text-[8px] lg:text-[9px] font-bold uppercase text-slate-400 tracking-wider">Scheduled</span>
                        <div className="h-4 w-4 rounded-full bg-green-100 flex items-center justify-center">
                          <Check size={9} className="text-green-600" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 lg:h-9 lg:w-9 rounded-lg bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 text-white flex items-center justify-center shadow-lg">
                          <Instagram size={14} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-[11px] lg:text-xs">Instagram Reel</div>
                          <div className="text-[10px] lg:text-[11px] text-slate-500">Today, 6:00 PM</div>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </div>

                {/* Top Right Card - Viral Score */}
                <div 
                  className="absolute z-10 hidden md:block hero-card-in"
                  style={{ right: '-8%', top: '10%', animationDelay: '1.0s' }}
                >
                  <div className="hero-float-3" style={{ transform: 'rotate(5deg)' }}>
                    <GlassCard className="w-[150px] lg:w-[165px] xl:w-[180px] p-3.5 lg:p-4">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Gauge size={12} className="text-[#01bad2]" />
                        <span className="text-[8px] lg:text-[9px] font-bold uppercase text-slate-400 tracking-wider">Viral Score</span>
                      </div>
                      <div className="flex items-end gap-1">
                        <span className="text-2xl lg:text-3xl font-black text-slate-900">94</span>
                        <span className="text-xs lg:text-sm text-slate-400 mb-0.5">/100</span>
                      </div>
                      <p className="text-[9px] lg:text-[10px] text-green-600 font-medium mt-1">High viral potential!</p>
                    </GlassCard>
                  </div>
                </div>

                {/* Bottom Right Card - Audio Match */}
                <div 
                  className="absolute z-10 hidden md:block hero-card-in"
                  style={{ right: '0%', bottom: '18%', animationDelay: '1.2s' }}
                >
                  <div className="hero-float-4" style={{ transform: 'rotate(6deg)' }}>
                    <GlassCard className="w-[165px] lg:w-[180px] xl:w-[195px] p-3.5 lg:p-4">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Music size={12} className="text-[#01bad2]" />
                        <span className="text-[8px] lg:text-[9px] font-bold uppercase text-slate-400 tracking-wider">Audio Match</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 lg:h-9 lg:w-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                          <Play size={14} className="text-white ml-0.5" />
                        </div>
                        <div className="flex-1">
                          <div className="text-[11px] lg:text-xs font-bold text-slate-900">Trending Sound</div>
                          <div className="text-[10px] lg:text-[11px] text-slate-500">2.1M uses</div>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </div>

                {/* iPhone Mockup */}
                <div 
                  className="absolute z-30 inset-0 flex items-center justify-center pointer-events-none hero-phone-in"
                >
                  <div className="phone-float">
                    <img 
                      src="/viral-blueprint-mockup.png"
                      alt="Huttle AI Viral Blueprint feature"
                      className="w-[140vw] max-w-none sm:w-[120vw] sm:max-w-none md:w-[820px] md:max-w-none lg:w-[920px] xl:w-[1020px] h-auto drop-shadow-2xl"
                    />
                  </div>
                </div>

                {/* Mobile Cards - Simplified (no framer-motion) */}
                {/* Top Left - Trending */}
                <div className="absolute z-10 md:hidden left-2 top-[20%] origin-center hero-card-mobile" style={{ animationDelay: '0.7s' }}>
                  <div className="hero-float-1" style={{ transform: 'rotate(-10deg)' }}>
                    <GlassCard className="w-[95px] sm:w-[105px] p-2.5 shadow-xl">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white shadow">
                          <TrendingUp size={12} />
                        </div>
                        <div>
                          <div className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">Trending</div>
                          <div className="font-bold text-slate-900 text-[8px]">#GlowUp</div>
                        </div>
                      </div>
                      <div className="space-y-0.5 text-[7px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Posts</span>
                          <span className="font-bold text-slate-900">12.4k</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Growth</span>
                          <span className="font-bold text-green-500">+340%</span>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </div>

                {/* Bottom Left - Scheduled */}
                <div className="absolute z-10 md:hidden left-2 bottom-[25%] origin-center hero-card-mobile" style={{ animationDelay: '1.0s' }}>
                  <div className="hero-float-2" style={{ transform: 'rotate(-8deg)' }}>
                    <GlassCard className="w-[95px] sm:w-[105px] p-2.5 shadow-xl">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[7px] font-bold uppercase text-slate-400 tracking-wider">Scheduled</span>
                        <div className="h-3 w-3 rounded-full bg-green-100 flex items-center justify-center">
                          <Check size={7} className="text-green-600" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-6 w-6 rounded bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 text-white flex items-center justify-center shadow">
                          <Instagram size={10} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-[8px]">IG Reel</div>
                          <div className="text-[7px] text-slate-500">6:00 PM</div>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </div>

                {/* Top Right - Viral Score */}
                <div className="absolute z-10 md:hidden right-2 top-[20%] origin-center hero-card-mobile" style={{ animationDelay: '0.8s' }}>
                  <div className="hero-float-3" style={{ transform: 'rotate(10deg)' }}>
                    <GlassCard className="w-[95px] sm:w-[105px] p-2.5 shadow-xl">
                      <div className="flex items-center gap-1 mb-1.5">
                        <Gauge size={10} className="text-[#01bad2]" />
                        <span className="text-[7px] font-bold uppercase text-slate-400 tracking-wider">Viral</span>
                      </div>
                      <div className="flex items-end gap-0.5">
                        <span className="text-xl font-black text-slate-900">94</span>
                        <span className="text-[10px] text-slate-400 mb-0.5">/100</span>
                      </div>
                      <p className="text-[7px] text-green-600 font-medium mt-0.5">High potential!</p>
                    </GlassCard>
                  </div>
                </div>

                {/* Bottom Right - Audio Match */}
                <div className="absolute z-10 md:hidden right-2 bottom-[25%] origin-center hero-card-mobile" style={{ animationDelay: '1.1s' }}>
                  <div className="hero-float-4" style={{ transform: 'rotate(8deg)' }}>
                    <GlassCard className="w-[95px] sm:w-[105px] p-2.5 shadow-xl">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Music size={10} className="text-[#01bad2]" />
                        <span className="text-[7px] font-bold uppercase text-slate-400 tracking-wider">Audio</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-6 w-6 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow">
                          <Play size={10} className="text-white ml-0.5" />
                        </div>
                        <div className="flex-1">
                          <div className="text-[8px] font-bold text-slate-900">Trending Sound</div>
                          <div className="text-[7px] text-slate-500">2.1M uses</div>
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

      {/* BENTO FEATURE GRID */}
      <BentoGrid />

      {/* FEATURE SHOWCASE SECTION */}
      <FeatureShowcaseSection />

      {/* ORBITING PLATFORMS SECTION */}
      <OrbitingPlatformsSection />

      {/* PRICING SECTION */}
      <PricingSection onOpenFoundersModal={() => setIsFoundersModalOpen(true)} />

      {/* FAQ SECTION */}
      <FAQSectionComponent />

      {/* FINAL CTA SECTION */}
      <FinalCTASection 
        onOpenFoundersModal={() => setIsFoundersModalOpen(true)}
      />

      {/* FOOTER */}
      <footer className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <img src="/huttle-logo.png" alt="Huttle AI" className="h-8 md:h-10 w-auto" />
          </div>
          
          <div className="flex-1 text-center">
            <p className="text-sm text-slate-500">
              © 2026 Huttle AI · <button onClick={() => setIsPrivacyModalOpen(true)} className="hover:text-slate-700 transition-colors underline-offset-2 hover:underline">Privacy Policy</button> · <button onClick={() => setIsTermsModalOpen(true)} className="hover:text-slate-700 transition-colors underline-offset-2 hover:underline">Terms of Service</button>
            </p>
          </div>
          
          <div className="w-8 md:w-10"></div>
        </div>
      </footer>

      <style>{`
        /* Smooth scroll */
        html { scroll-behavior: smooth; }

        /* Announcement bar shimmer */
        .announcement-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(6,182,212,0.08) 40%, rgba(6,182,212,0.15) 50%, rgba(6,182,212,0.08) 60%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

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
