/* eslint-disable no-unused-vars */

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';

const FOUNDING_SPOTS_LEFT = 38;

export const FinalCTA = ({ onOpenFoundersModal }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 md:py-32 px-6 md:px-8 lg:px-12 relative overflow-hidden bg-[#0a0f14]">
      {/* Abstract decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] bg-[#01BAD2]/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[600px] h-[600px] bg-[#01BAD2]/10 blur-[100px] rounded-full" />
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="container mx-auto max-w-4xl text-center relative z-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            Stop Guessing.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#01BAD2] to-[#0284c7]">
              Start Creating.
            </span>
          </h2>
          
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Join the creators who already have their content strategy handled. We built the platform we wish we had.
          </p>
          
          <div className="inline-block p-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md mb-10">
            <p className="px-5 py-2.5 text-sm font-bold text-white tracking-wide">
              Only {FOUNDING_SPOTS_LEFT} Founding Member spots remaining. Price increases March 15.
            </p>
          </div>
          
          <button 
            onClick={onOpenFoundersModal}
            className="group flex items-center justify-center gap-2 bg-[#01BAD2] hover:bg-[#019db3] text-white rounded-xl px-10 py-5 text-lg font-bold shadow-[0_0_24px_#01BAD220] transition-all hover:scale-105 active:scale-95"
          >
            Claim Your $199/yr Founders Spot
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
          
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mt-10 text-sm font-medium text-slate-300">
            <span className="flex items-center gap-2">
              <div className="bg-[#01BAD2]/20 rounded-full p-1"><Check size={14} className="text-[#01BAD2]" /></div> 
              14-day money-back guarantee
            </span>
            <span className="flex items-center gap-2">
              <div className="bg-[#01BAD2]/20 rounded-full p-1"><Check size={14} className="text-[#01BAD2]" /></div> 
              Cancel anytime
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export const Footer = ({ onOpenPrivacy, onOpenTerms }) => {
  return (
    <footer className="py-12 bg-[#0a0f14] border-t border-white/10">
      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2 font-bold text-white">
          <img src="/huttle-logo.png" alt="Huttle AI" className="h-8 w-auto brightness-0 invert opacity-80" />
        </div>
        
        <div className="text-center md:text-left">
          <p className="text-sm text-slate-500 font-medium">
            © 2026 Huttle AI · 
            <button onClick={onOpenPrivacy} className="hover:text-zinc-300 transition-colors underline-offset-4 hover:underline mx-2">Privacy Policy</button> · 
            <button onClick={onOpenTerms} className="hover:text-zinc-300 transition-colors underline-offset-4 hover:underline ml-2">Terms of Service</button>
          </p>
        </div>
        
        <div className="w-8"></div>
      </div>
    </footer>
  );
};
