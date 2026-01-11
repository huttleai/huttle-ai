import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Check, Sparkles, Calendar, TrendingUp, 
  Zap, Play, Search, Instagram,
  Activity, Users, BarChart3, Facebook, Youtube,
  Repeat, MessageSquare, Film, Music, Hash, Gauge, Crown, Clock, X,
  Star, Building2, Rocket, Shield, HeartHandshake, ChevronDown, AlertCircle
} from "lucide-react";
import { InteractiveHoverButton } from "./components/InteractiveHoverButton";
import { TypingAnimation } from "./components/TypingAnimation";
import { OrbitingCircles, SocialIcons } from "./components/OrbitingCircles";
import { DotPattern } from "./components/DotPattern";

// Magic UI Components
import { NumberTicker } from "./components/magicui/NumberTicker";
import { WordRotate } from "./components/magicui/WordRotate";
import { Marquee } from "./components/magicui/Marquee";
import { MagicCard } from "./components/magicui/MagicCard";
import { BorderBeamButton } from "./components/magicui/BorderBeam";
import { BlurFade } from "./components/magicui/BlurFade";
import { FAQAccordion } from "./components/magicui/FAQAccordion";
import { ParticleNetwork } from "./components/magicui/ParticleNetwork";
import { FeatureShowcase } from "./components/magicui/FeatureShowcase";
import { CountdownTimer } from "./components/CountdownTimer";

// Custom Feature Icons
import { 
  SmartCalendarIcon, 
  AIPlanBuilderIcon, 
  ContentRemixIcon, 
  TrendRadarIcon, 
  CaptionGeneratorIcon, 
  QualityScorerIcon 
} from "./components/icons/FeatureIcons";

// ============================================
// ANIMATION VARIANTS & CONFIGS
// ============================================

const springConfig = { type: "spring", stiffness: 100, damping: 15 };
const smoothSpring = { type: "spring", stiffness: 300, damping: 30 };

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
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 100,
    }
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0.1,
    }
  }
};

const characterVariants = {
  hidden: { 
    opacity: 0, 
    y: 30,
    filter: "blur(12px)",
  },
  visible: { 
    opacity: 1, 
    y: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      damping: 12,
      stiffness: 150,
    }
  }
};

// ============================================
// HERO BACKGROUND WITH PARTICLE NETWORK
// ============================================

const HeroBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient background - Light theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-cyan-50/40" />
      
      {/* Particle Network - Desktop version (hidden on mobile) */}
      <div className="absolute inset-0 hidden md:block">
        <ParticleNetwork 
          particleCount={60}
          particleColor="#01bad2"
          lineColor="#2B8FC7"
          maxLineDistance={160}
          particleSize={{ min: 3, max: 6 }}
          speed={{ min: 0.2, max: 0.5 }}
          mouseRepelRadius={130}
          mouseRepelStrength={0.5}
          className="opacity-100"
        />
      </div>
      
      {/* Particle Network - Mobile version (hidden on desktop) */}
      <div className="absolute inset-0 md:hidden">
        <ParticleNetwork 
          particleCount={35}
          particleColor="#01bad2"
          lineColor="#2B8FC7"
          maxLineDistance={120}
          particleSize={{ min: 2, max: 4 }}
          speed={{ min: 0.15, max: 0.35 }}
          mouseRepelRadius={80}
          mouseRepelStrength={0.3}
          className="opacity-80"
        />
      </div>
      
      {/* Animated gradient orbs for depth - adjusted for light theme */}
      <motion.div
        className="absolute w-[300px] h-[300px] md:w-[800px] md:h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(1,186,210,0.15) 0%, rgba(1,186,210,0) 70%)',
          filter: 'blur(80px)',
          left: '-20%',
          top: '-30%',
        }}
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <motion.div
        className="absolute w-[200px] h-[200px] md:w-[600px] md:h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(43,143,199,0.12) 0%, rgba(43,143,199,0) 70%)',
          filter: 'blur(80px)',
          right: '-15%',
          top: '10%',
        }}
        animate={{
          x: [0, -40, 0],
          y: [0, 40, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
      
      <motion.div
        className="absolute w-[250px] h-[250px] md:w-[500px] md:h-[500px] rounded-full hidden md:block"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0) 70%)',
          filter: 'blur(80px)',
          left: '20%',
          bottom: '-10%',
        }}
        animate={{
          x: [0, 40, 0],
          y: [0, -30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 5 }}
      />

      {/* Subtle dot pattern overlay */}
      <div 
        className="absolute inset-0 opacity-15 md:opacity-25"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(43,143,199,0.12) 1px, transparent 0)`,
          backgroundSize: '32px 32px',
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
// UTILITY COMPONENTS
// ============================================

const SplitText = ({ children, className = "" }) => {
  const words = children.split(" ");
  
  return (
    <motion.span
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
      style={{ display: "inline-block" }}
    >
      {words.map((word, wordIndex) => (
        <span key={wordIndex} style={{ display: "inline-block", marginRight: "0.25em" }}>
          {word.split("").map((char, charIndex) => (
            <motion.span
              key={charIndex}
              variants={characterVariants}
              style={{ display: "inline-block", transformOrigin: "bottom" }}
            >
              {char}
            </motion.span>
          ))}
        </span>
      ))}
    </motion.span>
  );
};

const TypingCursor = ({ show = true }) => (
  <motion.span
    className="inline-block w-[3px] h-[0.9em] bg-[#01bad2] ml-1 align-middle"
    animate={{ opacity: show ? [1, 0] : 0 }}
    transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
  />
);

const MagneticButton = ({ children, className = "", onClick, disabled = false, type = "button" }) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const x = useSpring(position.x, smoothSpring);
  const y = useSpring(position.y, smoothSpring);

  const handleMouseMove = (e) => {
    if (!ref.current || disabled) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const deltaX = (e.clientX - centerX) * 0.2;
    const deltaY = (e.clientY - centerY) * 0.2;
    setPosition({ x: deltaX, y: deltaY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      style={{ x, y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
      className={className}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.button>
  );
};

const GlassCard = ({ children, className = "", hover = true }) => {
  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-3xl
        bg-white/70 backdrop-blur-xl
        border border-white/40
        shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(255,255,255,0.2)]
        ${hover ? 'hover:bg-white/80 hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)]' : ''}
        transition-all duration-300
        ${className}
      `}
      whileHover={hover ? { y: -4 } : {}}
    >
      {children}
    </motion.div>
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
        setTimeout(() => {
          onClose();
          setSubmitSuccess(false);
          setFormData({ firstName: '', lastName: '', email: '' });
          setError(null);
        }, 2000);
      } else {
        // Handle API errors
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
            onClick={onClose}
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
              onClick={onClose}
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
                <p className="text-slate-500">We'll notify you when Huttle AI launches.</p>
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
                
                <MagneticButton 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-[#2B8FC7] to-[#01bad2] text-white font-bold shadow-lg shadow-[#01bad2]/25 hover:shadow-[#01bad2]/40 transition-shadow disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Joining...' : 'Join the Waitlist'}
                  {!isSubmitting && <ArrowRight size={18} />}
                </MagneticButton>
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
  const handleProceedToCheckout = () => {
    window.location.href = '/api/create-checkout-session?plan=founder';
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
                <p className="text-sm text-slate-400 line-through">$420/year</p>
                <p className="text-sm font-bold text-green-600">Save $221</p>
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
              <MagneticButton 
                onClick={handleProceedToCheckout}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-[#2B8FC7] to-[#01bad2] text-white font-bold shadow-lg shadow-[#01bad2]/25 hover:shadow-[#01bad2]/40 transition-shadow flex items-center justify-center gap-2"
              >
                Checkout
                <ArrowRight size={16} />
              </MagneticButton>
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
// SCROLL FAN SECTION
// ============================================

const ScrollFanSection = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const yPhone = useTransform(scrollYProgress, [0, 1], [150, -150]);
  const phoneScale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.9, 1, 1, 0.9]);
  
  const xTopLeft = useTransform(scrollYProgress, [0.15, 0.45], [0, -320]); 
  const yTopLeft = useTransform(scrollYProgress, [0.15, 0.45], [0, -60]);
  const rotateTopLeft = useTransform(scrollYProgress, [0.15, 0.45], [0, -8]);
  const opacityTopLeft = useTransform(scrollYProgress, [0.15, 0.3], [0, 1]);
  
  const xBottomLeft = useTransform(scrollYProgress, [0.18, 0.48], [0, -300]); 
  const yBottomLeft = useTransform(scrollYProgress, [0.18, 0.48], [0, 100]);
  const rotateBottomLeft = useTransform(scrollYProgress, [0.18, 0.48], [0, -12]);
  const opacityBottomLeft = useTransform(scrollYProgress, [0.18, 0.33], [0, 1]);
  
  const xTopRight = useTransform(scrollYProgress, [0.15, 0.45], [0, 320]); 
  const yTopRight = useTransform(scrollYProgress, [0.15, 0.45], [0, -60]);
  const rotateTopRight = useTransform(scrollYProgress, [0.15, 0.45], [0, 8]);
  const opacityTopRight = useTransform(scrollYProgress, [0.15, 0.3], [0, 1]);

  const xBottomRight = useTransform(scrollYProgress, [0.18, 0.48], [0, 300]); 
  const yBottomRight = useTransform(scrollYProgress, [0.18, 0.48], [0, 100]);
  const rotateBottomRight = useTransform(scrollYProgress, [0.18, 0.48], [0, 12]);
  const opacityBottomRight = useTransform(scrollYProgress, [0.18, 0.33], [0, 1]);

  return (
    <div ref={containerRef} className="relative min-h-[700px] md:min-h-[1200px] lg:min-h-[1400px] w-full -mt-80 sm:-mt-72 md:-mt-80 lg:-mt-96 pt-0 pb-16 md:pb-40 overflow-hidden bg-transparent">
      <div className="sticky top-4 sm:top-8 md:top-12 mx-auto w-full max-w-6xl h-[620px] sm:h-[700px] md:h-[820px] lg:h-[920px] flex justify-center items-center px-4 md:px-4 mt-0 sm:mt-8 md:mt-20" style={{ perspective: '1200px' }}>
        
        {/* Desktop Cards (4 cards) - Hidden on mobile, visible on sm+ */}
        {/* Top Left Card - Trending */}
        <motion.div 
          style={{ x: xTopLeft, y: yTopLeft, rotateZ: rotateTopLeft, opacity: opacityTopLeft }}
          className="absolute z-10 hidden sm:block"
        >
          <GlassCard className="w-[160px] sm:w-[200px] md:w-[260px] p-3 sm:p-4 md:p-5" hover={false}>
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
              <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-11 md:w-11 rounded-xl md:rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                <TrendingUp size={14} className="md:hidden" />
                <TrendingUp size={20} className="hidden md:block" />
              </div>
              <div>
                <div className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trending Now</div>
                <div className="font-bold text-slate-900 text-xs sm:text-sm md:text-base">#GlowUp</div>
              </div>
            </div>
            <div className="space-y-1 md:space-y-2 text-xs md:text-sm">
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
        </motion.div>

        {/* Bottom Left Card - Scheduled */}
        <motion.div 
          style={{ x: xBottomLeft, y: yBottomLeft, rotateZ: rotateBottomLeft, opacity: opacityBottomLeft }}
          className="absolute z-10 hidden sm:block"
        >
          <GlassCard className="w-[150px] sm:w-[180px] md:w-[240px] p-3 sm:p-4 md:p-5" hover={false}>
            <div className="flex justify-between items-center mb-2 md:mb-4">
              <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase text-slate-400 tracking-wider">Scheduled</span>
              <div className="h-4 w-4 md:h-5 md:w-5 rounded-full bg-green-100 flex items-center justify-center">
                <Check size={8} className="text-green-600 md:hidden" />
                <Check size={10} className="text-green-600 hidden md:block" />
              </div>
            </div>
            <div className="space-y-2 md:space-y-3">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 text-white flex items-center justify-center shadow-lg">
                  <Instagram size={12} className="md:hidden" />
                  <Instagram size={16} className="hidden md:block" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs md:text-sm">Instagram Reel</div>
                  <div className="text-[10px] md:text-xs text-slate-500">Today, 6:00 PM</div>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Top Right Card - Viral Score */}
        <motion.div 
          style={{ x: xTopRight, y: yTopRight, rotateZ: rotateTopRight, opacity: opacityTopRight }}
          className="absolute z-10 hidden sm:block"
        >
          <GlassCard className="w-[130px] sm:w-[160px] md:w-[200px] p-3 sm:p-4 md:p-5" hover={false}>
            <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
              <Gauge size={12} className="text-[#01bad2] md:hidden" />
              <Gauge size={14} className="text-[#01bad2] hidden md:block" />
              <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase text-slate-400 tracking-wider">Viral Score</span>
            </div>
            <div className="flex items-end gap-1 md:gap-2">
              <span className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900">94</span>
              <span className="text-sm md:text-lg text-slate-400 mb-0.5 md:mb-1">/100</span>
            </div>
            <p className="text-[10px] md:text-xs text-green-600 font-medium mt-1 md:mt-2">High viral potential!</p>
          </GlassCard>
        </motion.div>

        {/* Bottom Right Card - Audio Match */}
        <motion.div 
          style={{ x: xBottomRight, y: yBottomRight, rotateZ: rotateBottomRight, opacity: opacityBottomRight }}
          className="absolute z-10 hidden sm:block"
        >
          <GlassCard className="w-[150px] sm:w-[180px] md:w-[230px] p-3 sm:p-4 md:p-5" hover={false}>
            <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
              <Music size={12} className="text-[#01bad2] md:hidden" />
              <Music size={14} className="text-[#01bad2] hidden md:block" />
              <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase text-slate-400 tracking-wider">Audio Match</span>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="h-9 w-9 md:h-12 md:w-12 rounded-lg md:rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Play size={12} className="text-white ml-0.5 md:hidden" />
                <Play size={16} className="text-white ml-0.5 hidden md:block" />
              </div>
              <div className="flex-1">
                <div className="text-xs md:text-sm font-bold text-slate-900">Trending Sound</div>
                <div className="text-[10px] md:text-xs text-slate-500">2.1M uses</div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Mobile Cards (2 cards) - Only visible on mobile, hidden on sm+ */}
        {/* Mobile Left Card - Viral Score */}
        <motion.div 
          initial={{ opacity: 0, x: -20, rotate: -5 }}
          whileInView={{ opacity: 1, x: 0, rotate: -6 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
          className="absolute z-30 sm:hidden left-[5%] top-[32%]"
        >
          <GlassCard className="w-[85px] p-2 shadow-xl border border-white/50" hover={false}>
            <div className="flex items-center gap-1 mb-1">
              <Gauge size={9} className="text-[#01bad2]" />
              <span className="text-[6px] font-bold uppercase text-slate-400 tracking-wider">Viral Score</span>
            </div>
            <div className="flex items-end gap-0.5">
              <span className="text-lg font-black text-slate-900">94</span>
              <span className="text-[10px] text-slate-400 mb-0.5">/100</span>
            </div>
            <p className="text-[7px] text-green-600 font-medium">High potential!</p>
          </GlassCard>
        </motion.div>

        {/* Mobile Right Card - Scheduled */}
        <motion.div 
          initial={{ opacity: 0, x: 20, rotate: 5 }}
          whileInView={{ opacity: 1, x: 0, rotate: 6 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
          className="absolute z-30 sm:hidden right-[5%] top-[55%]"
        >
          <GlassCard className="w-[90px] p-2 shadow-xl border border-white/50" hover={false}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[6px] font-bold uppercase text-slate-400 tracking-wider">Scheduled</span>
              <div className="h-3 w-3 rounded-full bg-green-100 flex items-center justify-center">
                <Check size={6} className="text-green-600" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 text-white flex items-center justify-center shadow">
                <Instagram size={9} />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-[8px]">IG Reel</div>
                <div className="text-[7px] text-slate-500">6:00 PM</div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Center Phone - Real Screenshot Mockup */}
        <motion.div 
          style={{ y: yPhone, scale: phoneScale }}
          className="relative z-20 flex items-center justify-center"
        >
          <div className="relative overflow-hidden w-[280px] h-[560px] sm:w-[320px] sm:h-[640px] md:w-[380px] md:h-[760px] lg:w-[420px] lg:h-[840px]">
            <img 
              src="/viral-blueprint-mockup.png"
              alt="Viral Blueprint Generator - AI-powered content creation"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] sm:w-[980px] md:w-[1150px] lg:w-[1280px] h-auto max-w-none drop-shadow-2xl"
            />
          </div>
        </motion.div>
      </div>

      {/* Title and description - below the mockup */}
      <BlurFade delay={0.1}>
        <div className="text-center mt-8 md:mt-16 mb-6 md:mb-10 px-4">
          <span className="inline-block px-2.5 md:px-4 py-1 md:py-1.5 rounded-full bg-[#01bad2]/10 text-[#01bad2] text-[9px] md:text-xs font-bold uppercase tracking-widest mb-2.5 md:mb-4 border border-[#01bad2]/20">
            The Feature No One Else Has
          </span>
          <h2 className="text-xl sm:text-2xl md:text-4xl lg:text-6xl font-bold text-slate-900 tracking-tighter mb-2.5 md:mb-4">
            Viral Blueprint Generator
          </h2>
          <p className="text-xs md:text-lg lg:text-xl text-slate-500 max-w-xl md:max-w-2xl mx-auto px-1">
            Tell us your topic. We research what's working right now and give you everything—script, visuals, keywords, timing.
          </p>
        </div>
      </BlurFade>

      <motion.div 
        className="mt-4 md:mt-8 flex flex-wrap justify-center gap-2 md:gap-4 px-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
      >
        {[
          { icon: Film, label: "Director's Cut" },
          { icon: Hash, label: "Keywords" },
          { icon: Gauge, label: "Viral Score" },
          { icon: Music, label: "Audio Match" },
        ].map((item, i) => (
          <motion.div 
            key={i} 
            className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 rounded-full bg-white border border-slate-200 shadow-sm text-xs md:text-sm cursor-pointer"
            whileHover={{ scale: 1.05, borderColor: '#01bad2' }}
            whileTap={{ scale: 0.95 }}
          >
            <item.icon size={12} className="text-[#01bad2] md:w-[14px] md:h-[14px]" />
            <span className="font-medium text-slate-700">{item.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

// ============================================
// ORBITING CIRCLES PLATFORM SECTION
// ============================================

const OrbitingPlatformsSection = () => {
  return (
    <div className="relative min-h-[420px] md:min-h-[700px] lg:min-h-[800px] w-full overflow-hidden bg-gradient-to-b from-white to-slate-50 flex flex-col items-center justify-center py-10 md:py-32 px-4 md:px-8 lg:px-12">
      {/* Subtle dot pattern background */}
      <div className="absolute inset-0 opacity-20 md:opacity-30">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Text content - centered with proper padding */}
      <div className="text-center relative z-20 max-w-3xl mx-auto mb-6 md:mb-16 px-1">
        <BlurFade delay={0.1}>
          <h2 className="text-xl sm:text-2xl md:text-4xl lg:text-6xl font-bold text-slate-900 mb-2.5 md:mb-6 tracking-tighter leading-tight">
            Create for every platform,<br className="hidden sm:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2B8FC7] to-[#01bad2]">all in one place.</span>
          </h2>
        </BlurFade>
        <BlurFade delay={0.2}>
          <p className="text-xs md:text-lg lg:text-xl text-slate-500 max-w-md md:max-w-xl mx-auto">
            <WordRotate 
              words={["TikTok,", "Instagram,", "YouTube,", "X,", "Facebook,"]} 
              className="text-[#01bad2] font-semibold inline"
              duration={2000}
            />{" "}and more. We optimize for every algorithm instantly.
          </p>
        </BlurFade>
      </div>

      {/* Orbiting Circles Container - Responsive sizes */}
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
      IconComponent: SmartCalendarIcon, 
      title: "Smart Calendar", 
      description: "Auto-optimizes your posting times for maximum reach based on your audience." 
    },
    { 
      IconComponent: AIPlanBuilderIcon, 
      title: "AI Plan Builder", 
      description: "Generate complete 7-day and 14-day content calendars in seconds." 
    },
    { 
      IconComponent: ContentRemixIcon, 
      title: "Content Remix Studio", 
      description: "Turn one post into 5 platform-optimized variations instantly." 
    },
    { 
      IconComponent: TrendRadarIcon, 
      title: "Trend Lab", 
      description: "Real-time discovery of current trends in your niche." 
    },
    { 
      IconComponent: CaptionGeneratorIcon, 
      title: "AI Power Tools", 
      description: "Caption generation, hashtag generator, keyword generator, and more." 
    },
    { 
      IconComponent: QualityScorerIcon, 
      title: "Quality Scorer", 
      description: "Know your viral potential before you hit post." 
    },
  ];

  return (
    <section id="features" className="py-10 md:py-32 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <BlurFade delay={0.1}>
          <div className="mb-6 md:mb-16">
            <motion.div 
              className="inline-flex items-center gap-1.5 px-2 md:px-3 py-0.5 md:py-1.5 rounded-full bg-purple-100 text-purple-700 text-[9px] md:text-xs font-bold mb-2.5 md:mb-4 border border-purple-200"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap size={10} className="w-2.5 h-2.5 md:w-3 md:h-3" />
              More than just another smart calendar
            </motion.div>
            <h2 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold tracking-tighter mb-2 md:mb-4 text-slate-900">
              Your AI Creative Director.
            </h2>
            <p className="text-xs md:text-lg lg:text-xl text-slate-500">Packed with superpowers no one else has.</p>
          </div>
        </BlurFade>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-4">
          {features.map((feature, i) => (
            <BlurFade key={i} delay={0.1 + i * 0.05}>
              <MagicCard 
                className="p-2.5 sm:p-3 md:p-6 h-full border border-slate-200 bg-white"
                gradientColor="rgba(1, 186, 210, 0.12)"
              >
                <div className="mb-2 md:mb-4">
                  <feature.IconComponent size={32} />
                </div>
                <h3 className="text-xs sm:text-sm md:text-lg font-bold mb-1 text-slate-900 leading-tight">{feature.title}</h3>
                <p className="text-[10px] sm:text-xs md:text-sm leading-relaxed text-slate-500 line-clamp-3">{feature.description}</p>
              </MagicCard>
            </BlurFade>
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
    { emoji: "🤔", title: "What should I post?", text: "You stare at your phone for 30 mins, then give up and post something random." },
    { emoji: "📉", title: "Why did that flop?", text: "You spent 3 hours creating content that got 47 views. It's demoralizing." },
    { emoji: "😫", title: "I can't keep up", text: "TikTok wants one thing, Instagram wants another. The algorithms are exhausting." }
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
        <BlurFade delay={0.1}>
          <div className="text-center mb-6 md:mb-16">
            <h2 className="text-[10px] md:text-sm font-bold uppercase tracking-widest text-slate-400 mb-2 md:mb-4">Sound Familiar?</h2>
            <h3 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold tracking-tighter text-white">The content struggle is real.</h3>
          </div>
        </BlurFade>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
          {painPoints.map((item, i) => (
            <BlurFade key={i} delay={0.2 + i * 0.1}>
              <motion.div 
                className="group bg-slate-800/60 backdrop-blur-sm p-4 md:p-10 rounded-xl md:rounded-3xl border border-slate-700/50 hover:border-[#01bad2]/50 transition-all duration-300 cursor-pointer h-full flex flex-col"
                whileHover={{ 
                  y: -8,
                  boxShadow: "0 25px 50px -12px rgba(1,186,210,0.2)",
                }}
              >
                <motion.div 
                  className="text-2xl md:text-5xl mb-2 md:mb-6"
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {item.emoji}
                </motion.div>
                <h4 className="text-sm md:text-xl font-bold mb-1.5 md:mb-3 text-white group-hover:text-[#01bad2] transition-colors">{item.title}</h4>
                <p className="text-slate-300 leading-relaxed text-xs md:text-base flex-1">{item.text}</p>
              </motion.div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================
// FEATURE SHOWCASE SECTION (Replaces Testimonials for Coming Soon)
// ============================================

const FeatureShowcaseSection = () => {
  return (
    <section className="py-12 md:py-32 px-4 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        <BlurFade delay={0.1}>
          <div className="text-center mb-8 md:mb-16">
            <motion.span 
              className="inline-block px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-[#01bad2]/10 text-[#01bad2] text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3 md:mb-4 border border-[#01bad2]/20"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Play size={10} className="inline mr-1 -mt-0.5 md:w-3 md:h-3" />
              See It In Action
            </motion.span>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tighter mb-3 md:mb-4">
              Features That Make You Go Viral
            </h2>
            <p className="text-sm md:text-lg text-slate-500 max-w-2xl mx-auto px-2">
              Explore the AI-powered tools that will transform your content strategy
            </p>
          </div>
        </BlurFade>
        
        <BlurFade delay={0.2}>
          <FeatureShowcase />
        </BlurFade>
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
      question: "How is Huttle AI different from other social media tools?",
      answer: "Huttle AI isn't just a scheduler—it's an AI-powered creative director. Our Viral Blueprint Generator analyzes what's working RIGHT NOW in your niche and gives you complete scripts, visuals, keywords, and optimal posting times. No other tool offers this level of strategic AI assistance."
    },
    {
      question: "Is Huttle AI for solo creators or businesses?",
      answer: "Both! Huttle AI is designed for solo creators, content creators, influencers, AND small businesses managing their social media. Whether you're building your personal brand or growing your business online, our AI adapts to your unique goals, voice, and audience."
    },
    {
      question: "What's included in the Founders Club membership?",
      answer: "Founders Club members get unlimited AI generations (Viral Blueprints, remixes, captions), all Pro features (Smart Calendar, Trend Radar, Quality Scorer), priority support, and most importantly—lifetime price lock at $199/year even when prices increase."
    },
    {
      question: "Can I use Huttle AI for multiple social media platforms?",
      answer: "Absolutely! Huttle AI optimizes content for TikTok, Instagram, YouTube, X (Twitter), and Facebook. Our Content Remix Studio can take one piece of content and automatically adapt it for each platform's unique algorithm and audience expectations."
    },
    {
      question: "How accurate is the Viral Score prediction?",
      answer: "Our Viral Score is powered by our proprietary algorithm that analyzes real-time trending content, engagement patterns, and platform algorithm behaviors. It's important to note that no tool can guarantee virality, as content success depends on many factors including timing, audience engagement, and platform dynamics. The Viral Score is designed to give you data-driven insights to improve your content strategy."
    },
    {
      question: "What is your refund policy?",
      answer: "All Founders Club memberships are non-refundable. This is a special early-access program with a lifetime price lock at $199/year (normally $420/year), and by joining you're committing to support the development and growth of Huttle AI. We're confident you'll love the platform, but please make sure you're ready to commit before purchasing."
    },
    {
      question: "Is there a free trial available?",
      answer: "We're currently in early access mode with limited Founders Club spots available. Join the waitlist to be notified when we launch, or secure your Founders pricing now to lock in $199/year forever."
    },
    {
      question: "How does the AI understand my brand voice?",
      answer: "During onboarding, you'll complete a quick brand voice quiz that helps our AI understand your style, tone, and target audience. The more you use Huttle AI, the better it learns your unique voice and preferences."
    },
  ];

  return (
    <section className="py-12 md:py-32 px-4 bg-white">
      <div className="container mx-auto max-w-4xl">
        <BlurFade delay={0.1}>
          <div className="text-center mb-8 md:mb-16">
            <motion.span 
              className="inline-block px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-[#01bad2]/10 text-[#01bad2] text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3 md:mb-4 border border-[#01bad2]/20"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              FAQ
            </motion.span>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tighter mb-3 md:mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-sm md:text-lg text-slate-500 max-w-2xl mx-auto">
              Everything you need to know about Huttle AI
            </p>
          </div>
        </BlurFade>
        
        <BlurFade delay={0.2}>
          <FAQAccordion items={faqs} />
        </BlurFade>
      </div>
    </section>
  );
};

// ============================================
// PRICING SECTION
// ============================================

const PricingSection = ({ onOpenFoundersModal }) => {
  return (
    <section id="pricing" className="py-8 md:py-24 px-3 md:px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Social proof text above pricing */}
        <p className="text-center text-sm text-slate-500 mb-6 mt-8">
          🔥 247 creators on the waitlist
        </p>
        <BlurFade delay={0.1}>
          <motion.div 
            className="relative rounded-2xl md:rounded-[4rem] bg-slate-900 p-5 md:p-16 lg:p-20 text-center overflow-hidden"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="absolute inset-0 opacity-20">
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
              />
            </div>
            <div className="absolute -top-1/2 -left-1/4 w-full h-full bg-[#01bad2]/20 blur-[100px] md:blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-1/2 -right-1/4 w-full h-full bg-[#2B8FC7]/20 blur-[100px] md:blur-[150px] rounded-full pointer-events-none" />
            
            <div className="relative z-10">
              <motion.div 
                className="inline-block px-2.5 md:px-4 py-0.5 md:py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-[8px] md:text-xs font-bold uppercase tracking-widest text-[#01bad2] mb-3 md:mb-8"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Founders Batch Closing Soon
              </motion.div>

              <h2 className="text-xl sm:text-2xl md:text-5xl lg:text-7xl font-bold text-white tracking-tighter mb-3 md:mb-8">
                Lock in Founders Pricing forever.
              </h2>

              <p className="text-xs md:text-[25px] text-slate-400 max-w-xl mx-auto mb-5 md:mb-10">
                100 Spots. First come, first served.
              </p>
              
              <div className="flex flex-row items-center justify-center gap-3 md:gap-8 mb-5 md:mb-12">
                <div className="text-center md:text-right">
                  <div className="text-slate-500 text-[10px] md:text-lg font-bold">Regular Pro</div>
                  <div className="text-slate-400 text-base md:text-2xl font-bold line-through">$420/yr</div>
                </div>
                <div className="h-10 w-px md:h-16 md:w-px bg-white/10" />
                <div className="text-center md:text-left">
                  <div className="text-[#01bad2] text-[8px] md:text-sm font-bold uppercase tracking-wider">Founding Member</div>
                  <div className="text-2xl md:text-6xl font-black text-white">
                    $<NumberTicker value={199} startValue={420} duration={1.5} /><span className="text-xs md:text-lg text-slate-500 font-medium">/yr</span>
                  </div>
                </div>
              </div>

              <BorderBeamButton 
                onClick={onOpenFoundersModal}
                className="w-full max-w-xs md:max-w-md h-11 md:h-16 rounded-xl md:rounded-2xl text-white font-bold text-sm md:text-lg px-4 md:px-8"
                beamDuration={6}
              >
                <Crown size={14} className="mr-1 md:mr-2 md:w-5 md:h-5" />
                Claim Founders Pricing
                <ArrowRight size={12} className="ml-1 md:ml-2 md:w-[18px] md:h-[18px]" />
              </BorderBeamButton>
              
              <div className="mt-5 md:mt-10 grid grid-cols-2 md:flex md:flex-wrap justify-center gap-1.5 md:gap-8 text-[8px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span className="flex items-center justify-center gap-1 md:gap-2">
                  <Check size={8} className="text-[#01bad2] md:w-3 md:h-3"/> Highest Limits
                </span>
                <span className="flex items-center justify-center gap-1 md:gap-2">
                  <Check size={8} className="text-[#01bad2] md:w-3 md:h-3"/> All Pro Features
                </span>
                <span className="flex items-center justify-center gap-1 md:gap-2">
                  <Check size={8} className="text-[#01bad2] md:w-3 md:h-3"/> Price Locked
                </span>
                <motion.span 
                  className="flex items-center justify-center gap-1 md:gap-2"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Users size={8} className="text-[#01bad2] md:w-3 md:h-3"/> <NumberTicker value={27} duration={1} /> Spots Left
                </motion.span>
              </div>
            </div>
          </motion.div>
        </BlurFade>
      </div>
    </section>
  );
};

// ============================================
// FINAL CTA SECTION
// ============================================

const FinalCTASection = ({ onOpenWaitlist, onOpenFoundersModal }) => {
  return (
    <section className="py-10 md:py-32 px-4 bg-gradient-to-b from-white to-slate-50">
      <div className="container mx-auto max-w-4xl text-center">
        <BlurFade delay={0.1}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl sm:text-2xl md:text-4xl lg:text-6xl font-bold text-slate-900 tracking-tighter mb-3 md:mb-6 leading-tight">
              Ready to stop guessing<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2B8FC7] to-[#01bad2]">
                and start growing?
              </span>
            </h2>
            <p className="text-xs md:text-lg lg:text-xl text-slate-500 max-w-xl md:max-w-2xl mx-auto mb-5 md:mb-10">
              Join thousands of creators who've transformed their content strategy with AI-powered insights.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto">
              <MagneticButton 
                onClick={onOpenWaitlist}
                className="w-full sm:w-auto px-5 md:px-8 h-11 md:h-14 rounded-xl md:rounded-2xl border-2 border-slate-900 text-slate-900 font-bold text-sm hover:bg-slate-900 hover:text-white transition-all"
              >
                Join Free Waitlist
              </MagneticButton>
              <BorderBeamButton 
                onClick={onOpenFoundersModal}
                className="w-full sm:w-auto px-5 md:px-8 h-11 md:h-14 rounded-xl md:rounded-2xl text-white font-bold text-sm"
                beamDuration={8}
              >
                <Crown size={14} className="mr-1.5 md:mr-2 md:w-[18px] md:h-[18px]" />
                Get Founders Access
                <ArrowRight size={12} className="ml-1.5 md:ml-2 md:w-4 md:h-4" />
              </BorderBeamButton>
            </div>
          </motion.div>
        </BlurFade>
      </div>
    </section>
  );
};

// ============================================
// MAIN LANDING PAGE
// ============================================

// ============================================
// POLICY MODAL COMPONENT
// ============================================

const PolicyModal = ({ isOpen, onClose, type }) => {
  // Prevent body scroll when modal is open
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

  // Handle escape key
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
        <p className="text-sm text-slate-600 leading-relaxed mb-3">
          We use the information we collect to:
        </p>
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
        <p className="text-sm text-slate-600 leading-relaxed mb-3">
          We do not sell, trade, or rent your personal information to third parties. We may share your information with:
        </p>
        <ul className="text-sm text-slate-600 leading-relaxed space-y-2 ml-4">
          <li><span className="font-bold text-sm">Service Providers:</span> Third-party vendors who assist us in operating our services (e.g., Stripe for payments, email service providers)</li>
          <li><span className="font-bold text-sm">Legal Requirements:</span> When required by law or to protect our rights</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">5. Data Security</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">6. Your Rights</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">
          You have the right to:
        </p>
        <ul className="text-sm text-slate-600 leading-relaxed space-y-1 ml-4 list-disc">
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Opt out of marketing communications</li>
          <li>Export your data</li>
        </ul>
        <p className="text-sm text-slate-600 leading-relaxed mt-3">
          To exercise these rights, contact us at support@huttleai.com.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">7. Cookies</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          We use essential cookies to ensure our website functions properly. We may also use analytics cookies to understand how visitors interact with our site.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">8. Changes to This Policy</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
        </p>
      </section>

      <section>
        <h3 className="text-base font-bold text-slate-900 mb-3">9. Contact Us</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          If you have any questions about this Privacy Policy, please contact us at support@huttleai.com.
        </p>
      </section>
    </>
  );

  const termsContent = (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Terms of Service</h2>
      <p className="text-sm text-slate-500 italic mb-6">Last updated: January 11, 2026</p>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">1. Acceptance of Terms</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          By accessing or using Huttle AI ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">2. Description of Service</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          Huttle AI is an AI-powered content creation platform that helps users plan, create, and optimize social media content. Features include content generation, viral predictions, trend analysis, and scheduling tools.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">3. Account Registration</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">
          To use certain features, you must create an account. You agree to:
        </p>
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
        <p className="text-sm text-slate-600 leading-relaxed">
          All sales are final for Founding Member subscriptions. Any additional questions regarding current and future subscription trials and refunds, contact support@huttleai.com
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">6. Acceptable Use</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">
          You agree NOT to use the Service to:
        </p>
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
        <p className="text-sm text-slate-600 leading-relaxed mb-3">
          The Service is provided "as is" and "as available" without warranties of any kind. We do not guarantee that:
        </p>
        <ul className="text-sm text-slate-600 leading-relaxed space-y-1 ml-4 list-disc">
          <li>The Service will be uninterrupted or error-free</li>
          <li>AI-generated content will be accurate, complete, or suitable for any purpose</li>
          <li>Viral predictions or trend analysis will guarantee specific results</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">9. Limitation of Liability</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          To the maximum extent permitted by law, Huttle AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">10. Changes to Terms</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          We may modify these Terms at any time. We will notify users of significant changes via email or through the Service. Continued use after changes constitutes acceptance of the new Terms.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">11. Termination</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          We may suspend or terminate your account at any time for violation of these Terms. You may cancel your account at any time by contacting us.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-base font-bold text-slate-900 mb-3">12. Governing Law</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          These Terms shall be governed by the laws of the State of Delaware, United States, without regard to its conflict of law provisions.
        </p>
      </section>

      <section>
        <h3 className="text-base font-bold text-slate-900 mb-3">13. Contact Us</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          If you have any questions about these Terms, please contact us at support@huttleai.com
        </p>
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
          {/* Overlay */}
          <motion.div 
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={onClose}
          />
          
          {/* Modal Container */}
          <motion.div 
            className="relative bg-white rounded-xl shadow-2xl w-[95%] md:w-full md:max-w-[700px] h-[90vh] md:max-h-[80vh] overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-slate-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close modal"
            >
              <X size={20} className="text-slate-500" />
            </button>

            {/* Scrollable Content */}
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

  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen w-full bg-white text-slate-950 overflow-x-hidden selection:bg-[#01bad2]/30">
      <ScrollProgress />
      <WaitlistModal isOpen={isWaitlistModalOpen} onClose={() => setIsWaitlistModalOpen(false)} />
      <FoundersClubModal 
        isOpen={isFoundersModalOpen} 
        onClose={() => setIsFoundersModalOpen(false)} 
        onJoinWaitlist={() => setIsWaitlistModalOpen(true)}
      />
      <PolicyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} type="privacy" />
      <PolicyModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} type="terms" />
      
      {/* NAVBAR - Light Theme */}
      <nav className="fixed top-4 md:top-6 left-0 right-0 z-50 flex justify-center px-4">
        <motion.div 
          className="flex items-center gap-4 md:gap-8 rounded-full border border-slate-200/60 bg-white/80 backdrop-blur-xl px-4 md:px-8 py-3 md:py-3.5 shadow-lg shadow-slate-200/50"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex items-center gap-2 font-bold tracking-tight">
            <img src="/huttle-logo.png" alt="Huttle AI" className="h-6 md:h-8 w-auto" />
          </div>
          <div className="hidden md:flex gap-6 text-sm font-medium text-slate-500">
            <span className="flex items-center gap-1.5 text-slate-700">
              <motion.span 
                className="h-2 w-2 rounded-full bg-green-500"
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              /> 
              <span className="text-sm font-bold">Launching Jan 23</span>
            </span>
          </div>
          <button 
            onClick={() => setIsWaitlistModalOpen(true)}
            className="text-sm md:text-base font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Join Waitlist
          </button>
          <BorderBeamButton 
            onClick={() => setIsFoundersModalOpen(true)} 
            className="rounded-full px-4 md:px-7 py-2 md:py-3 text-xs md:text-sm font-bold text-white"
            beamSize={100}
            beamDuration={4}
          >
            Get Early Access
          </BorderBeamButton>
        </motion.div>
      </nav>

      {/* HERO SECTION - Clean, Spacious Design */}
      <section className="relative pt-32 sm:pt-36 md:pt-44 lg:pt-48 pb-10 md:pb-16 px-4 text-center overflow-hidden min-h-screen flex flex-col justify-center">
        <HeroBackground />
        
        <div className="container mx-auto max-w-4xl relative z-10 flex flex-col items-center">
          
          {/* HEADLINE */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-slate-900 leading-[1.1] tracking-tighter">
            <BlurFade delay={0.2}>
              <span className="block">Know What to Post</span>
            </BlurFade>
            <BlurFade delay={0.4}>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#2B8FC7] to-[#01bad2]">
                Before You Create It.
              </span>
            </BlurFade>
          </h1>

          {/* SUBHEAD - 24-32px gap from headline */}
          <BlurFade delay={0.6}>
            <p className="mt-6 md:mt-8 text-base md:text-xl lg:text-2xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Stop guessing. Huttle AI tells you exactly what to post, gives you the script, and picks the perfect time for <WordRotate 
                words={["Instagram.", "TikTok.", "YouTube.", "X.", "Facebook."]} 
                className="text-[#01bad2] font-semibold inline"
                duration={2500}
              />
            </p>
          </BlurFade>

          {/* PRIMARY CTA BUTTON - 40-48px gap from subhead */}
          <BlurFade delay={0.8}>
            <div className="mt-10 md:mt-12 flex flex-col items-center">
              <BorderBeamButton 
                onClick={() => setIsFoundersModalOpen(true)} 
                className="h-14 md:h-16 text-white font-bold text-base md:text-lg rounded-xl md:rounded-2xl px-8 md:px-10"
                beamDuration={6}
              >
                Become a Founding Member
                <ArrowRight size={18} className="ml-2 md:w-5 md:h-5" />
              </BorderBeamButton>
              <span className="mt-3 text-sm text-slate-500">
                $199/yr forever <span className="text-slate-400">(normally $420)</span>
              </span>
            </div>
          </BlurFade>

          {/* COUNTDOWN TIMER - 48-64px gap from CTA */}
          <BlurFade delay={1.0}>
            <div className="mt-12 md:mt-16">
              <CountdownTimer />
            </div>
          </BlurFade>

          {/* SCROLL INDICATOR - 48-64px gap from timer */}
          <BlurFade delay={1.2}>
            <div className="mt-12 md:mt-16 mb-8 md:mb-12">
              <motion.div
                className="cursor-pointer"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <ChevronDown size={28} className="text-huttle-primary hover:text-huttle-primary-dark transition-colors" />
              </motion.div>
            </div>
          </BlurFade>

        </div>
      </section>

      {/* SCROLL FAN SECTION - Viral Blueprint */}
      <ScrollFanSection />

      {/* SOCIAL PROOF MARQUEE */}
      <SocialProofMarquee />

      {/* PAIN POINTS SECTION */}
      <PainPointsSection />

      {/* ORBITING PLATFORMS SECTION - PRESERVED */}
      <OrbitingPlatformsSection />

      {/* BENTO FEATURE GRID */}
      <BentoGrid />

      {/* FEATURE SHOWCASE SECTION */}
      <FeatureShowcaseSection />

      {/* PRICING SECTION */}
      <PricingSection onOpenFoundersModal={() => setIsFoundersModalOpen(true)} />

      {/* FAQ SECTION */}
      <FAQSectionComponent />

      {/* FINAL CTA SECTION */}
      <FinalCTASection 
        onOpenWaitlist={() => setIsWaitlistModalOpen(true)}
        onOpenFoundersModal={() => setIsFoundersModalOpen(true)}
      />

      {/* FOOTER */}
      <footer className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <img src="/huttle-logo.png" alt="Huttle AI" className="h-8 md:h-10 w-auto" />
          </div>
          
          {/* Center - Legal Links */}
          <div className="flex-1 text-center">
            <p className="text-sm text-slate-500">
              © 2026 Huttle AI · <button onClick={() => setIsPrivacyModalOpen(true)} className="hover:text-slate-700 transition-colors underline-offset-2 hover:underline">Privacy Policy</button> · <button onClick={() => setIsTermsModalOpen(true)} className="hover:text-slate-700 transition-colors underline-offset-2 hover:underline">Terms of Service</button>
            </p>
          </div>
          
          {/* Right - Placeholder for social icons if needed */}
          <div className="w-8 md:w-10"></div>
        </div>
      </footer>

      <style>{`
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(1,186,210,0.3), 0 10px 40px rgba(1,186,210,0.2); }
          50% { box-shadow: 0 0 30px rgba(1,186,210,0.5), 0 10px 60px rgba(1,186,210,0.3); }
        }
        .animate-glow-pulse {
          animation: glow-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
