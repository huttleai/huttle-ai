/* eslint-disable no-unused-vars */

import React, { useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, LogIn } from 'lucide-react';

export const StickyNav = ({ onOpenFoundersModal }) => {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
      className="fixed top-4 left-0 right-0 z-50 flex justify-center w-full px-4"
    >
      <div className="bg-white/80 backdrop-blur-md border border-[#01BAD2]/15 rounded-full px-4 md:px-6 py-1.5 md:py-2 shadow-lg flex items-center justify-between w-full max-w-5xl gap-3 md:gap-6">
        <div className="flex items-center gap-2 flex-shrink-0">
          <img src="/huttle-logo.png" alt="Huttle AI" className="h-5 md:h-6 w-auto" />
        </div>
        <div className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-[13px] font-medium text-slate-600 hover:text-[#01BAD2] transition-colors"
          >
            Features
          </button>
          <button 
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-[13px] font-medium text-slate-600 hover:text-[#01BAD2] transition-colors"
          >
            Pricing
          </button>
        </div>
        <div className="flex items-center gap-3 md:gap-4 ml-auto">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600 hover:text-[#01BAD2] transition-colors"
          >
            <LogIn className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden md:inline">Login</span>
          </Link>
          <button 
            onClick={onOpenFoundersModal}
            className="bg-[#01BAD2] hover:bg-[#019db3] text-white rounded-full px-3.5 md:px-4 py-1.5 text-[11px] md:text-[13px] font-semibold transition-colors shadow-[0_0_24px_#01BAD220] flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap"
          >
            <span className="md:hidden">Claim Spot</span>
            <span className="hidden md:inline">Claim Founders Spot</span>
            <ArrowRight size={14} className="hidden md:block" />
          </button>
        </div>
      </div>
    </motion.nav>
  );
};

export const HeroSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { scrollY } = useScroll();

  const heroScale = useTransform(scrollY, [0, 500], [1, 0.9]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const mockupScale = useTransform(scrollY, [0, 500], [1, 1.15]);
  const mockupY = useTransform(scrollY, [0, 500], [0, -40]);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start pt-32 pb-24 px-6 md:px-8 lg:px-12 overflow-hidden bg-slate-50">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#01BAD2]/20 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 24 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ scale: heroScale, opacity: heroOpacity }}
        className="relative z-10 text-center max-w-4xl mx-auto flex flex-col items-center"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#01BAD2]/10 text-[#01BAD2] text-xs font-bold uppercase tracking-widest mb-8 border border-[#01BAD2]/20">
          ✨ The Ultimate AI Creative Director
        </div>
        
        <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[6.5rem] font-extrabold text-zinc-900 tracking-tight leading-[1.05] mb-6">
          The Guesswork{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#01BAD2] to-[#0284c7]">
            Ends Here.
          </span>
        </h1>
        
        <p className="text-sm sm:text-base md:text-lg text-slate-500 max-w-xl mb-10 leading-relaxed">
          Real-time trends, AI-written scripts, and viral predictions — on demand.
        </p>
      </motion.div>

      {/* Floating Phone Mockup */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        style={{ scale: mockupScale, y: mockupY }}
        className="relative z-10 w-[120%] max-w-sm md:w-full md:max-w-2xl lg:max-w-3xl mt-8 md:mt-12 px-4 flex flex-col items-center justify-center"
      >
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
          className="relative w-full max-w-md md:max-w-xl lg:max-w-2xl"
        >
          <img 
            src="/hero-iphone-mockup.png"
            alt="Huttle AI mobile app — trending content and create flow" 
            className="w-full h-auto drop-shadow-2xl"
          />
        </motion.div>
        
        {/* Shadow Glow beneath Mockup */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 max-w-[400px] h-12 bg-[#01BAD2]/30 blur-[40px] rounded-full -z-10" />
      </motion.div>

    </section>
  );
};
