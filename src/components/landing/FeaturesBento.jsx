/* eslint-disable no-unused-vars */

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export const BentoFeatures = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <section id="features" className="pt-32 pb-24 px-6 md:px-8 lg:px-12 bg-[#0a0f14] relative overflow-hidden mt-20">
      {/* Smooth Transition Overlay from Hero */}
      <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-slate-50 via-[#0a0f14]/80 to-[#0a0f14] -mt-24 z-10 pointer-events-none" />

      {/* Decorative Glows */}
      <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-[#01BAD2]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-[#01BAD2]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto max-w-6xl relative z-20">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center md:text-left mb-16"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#01BAD2]/10 text-[#01BAD2] text-xs font-bold uppercase tracking-widest mb-6 border border-[#01BAD2]/20">
            ⚡ The Ultimate AI Creative Director
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Everything we need.<br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#01BAD2] to-[#0284c7]">
              Nothing we don't.
            </span>
          </h2>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl">
            We engineered a complete suite of AI tools that replace your content planner, trend researcher, and copywriter.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "show" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          {/* Main Feature: Ignite Engine - Large */} {/* HUTTLE AI: updated 3 */}
          <motion.div 
            variants={cardVariants}
            whileHover={{ scale: 1.01, boxShadow: '0 0 0 1px rgba(1,186,210,0.3), 0 8px 32px rgba(1,186,210,0.1)' }}
            className="col-span-1 md:col-span-2 row-span-2 group flex flex-col p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#01BAD2]/10 rounded-full blur-3xl group-hover:bg-[#01BAD2]/20 transition-colors duration-500" />
            <div className="z-10 mb-8">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#01BAD2]/20 to-[#0284c7]/20 border border-white/10 flex items-center justify-center text-[#01BAD2] mb-6 group-hover:scale-110 group-hover:bg-[#01BAD2]/30 transition-all duration-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold mb-3 text-white leading-tight">Ignite Engine</h3>
              <p className="text-base leading-relaxed text-slate-400">
                Tell us your topic and platform. We research what's trending, write a step-by-step script with hooks, visuals, and keywords — in 30 seconds.
              </p>
            </div>
            <div className="mt-auto z-10 flex-1 flex items-end justify-center pt-8">
              <img 
                src="/ignite-engine-mockup.png" // HUTTLE AI: updated 3
                alt="Ignite Engine" 
                className="w-full max-w-[300px] rounded-t-2xl shadow-2xl translate-y-8 group-hover:translate-y-4 transition-transform duration-700 ease-out border border-white/10" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentNode.innerHTML = '<div class="w-full h-40 bg-[#0a0f14] rounded-t-2xl border-t border-x border-white/10 translate-y-8 group-hover:translate-y-4 transition-transform duration-700"></div>';
                }}
              />
            </div>
          </motion.div>

          {/* Secondary Feature: Content Remix - Wide */}
          <motion.div 
            variants={cardVariants}
            whileHover={{ scale: 1.02, boxShadow: '0 0 0 1px rgba(1,186,210,0.3), 0 8px 32px rgba(1,186,210,0.1)' }}
            className="col-span-1 md:col-span-2 row-span-1 group flex flex-col sm:flex-row gap-6 p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-300 relative overflow-hidden"
          >
            <div className="z-10 flex-1">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#01BAD2]/10 to-indigo-500/20 border border-white/10 flex items-center justify-center text-[#01BAD2] mb-4 group-hover:scale-110 group-hover:border-[#01BAD2]/30 transition-all duration-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 16V8C21 7.46957 20.7893 6.96086 20.4142 6.58579C20.0391 6.21071 19.5304 6 19 6H5C4.46957 6 3.96086 6.21071 3.58579 6.58579C3.21071 6.96086 3 7.46957 3 8V16C3 16.5304 3.21071 17.0391 3.58579 17.4142C3.96086 17.7893 4.46957 18 5 18H19C19.5304 18 20.0391 17.7893 20.4142 17.4142C20.7893 17.0391 21 16.5304 21 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 14H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 22L16 18H8L12 22Z" fill="currentColor"/>
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-2 text-white leading-tight">Content Remix Studio</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                Drop in one post. Get back 5 platform-optimized versions instantly. TikTok, Instagram, X, YouTube, Facebook.
              </p>
            </div>
          </motion.div>

          {/* Tertiary Feature: Content Vault - Small */}
          <motion.div 
            variants={cardVariants}
            whileHover={{ scale: 1.02, boxShadow: '0 0 0 1px rgba(1,186,210,0.3), 0 8px 32px rgba(1,186,210,0.1)' }}
            className="col-span-1 group flex flex-col p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-300 relative overflow-hidden"
          >
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#01BAD2]/10 to-teal-500/20 border border-white/10 flex items-center justify-center text-[#01BAD2] mb-4 group-hover:scale-110 group-hover:border-[#01BAD2]/30 transition-all duration-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H9L11 6H20C20.5304 6 21.0391 6.21071 21.4142 6.58579C21.7893 6.96086 22 7.46957 22 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 14H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2 text-white leading-tight">Content Vault</h3>
            <p className="text-xs leading-relaxed text-slate-400">
              Store, organize, and access all your content assets in one secure place.
            </p>
          </motion.div>

          {/* Tertiary Feature: Quality Scorer - Small */}
          <motion.div 
            variants={cardVariants}
            whileHover={{ scale: 1.02, boxShadow: '0 0 0 1px rgba(1,186,210,0.3), 0 8px 32px rgba(1,186,210,0.1)' }}
            className="col-span-1 group flex flex-col p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-300 relative overflow-hidden"
          >
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#01BAD2]/10 to-fuchsia-500/20 border border-white/10 flex items-center justify-center text-[#01BAD2] mb-4 group-hover:scale-110 group-hover:border-[#01BAD2]/30 transition-all duration-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="8" r="1" fill="currentColor"/>
                <path d="M16 12C16 14.2091 14.2091 16 12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2 text-white leading-tight">Viral Quality Score</h3>
            <p className="text-xs leading-relaxed text-slate-400">
              Get a viral potential score before you hit post. See what to fix.
            </p>
          </motion.div>

          {/* Bottom Features: AI Plan Builder */}
          <motion.div 
            variants={cardVariants}
            whileHover={{ scale: 1.02, boxShadow: '0 0 0 1px rgba(1,186,210,0.3), 0 8px 32px rgba(1,186,210,0.1)' }}
            className="col-span-1 md:col-span-2 group flex flex-col sm:flex-row items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-300"
          >
            <div className="h-16 w-16 flex-shrink-0 rounded-2xl bg-gradient-to-br from-[#01BAD2] to-[#0284c7] border border-white/20 flex items-center justify-center text-white shadow-[0_4px_24px_rgba(1,186,210,0.4)] group-hover:scale-110 transition-transform duration-500">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 17V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 3V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5.5 5.5L7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 5.5L17 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="2" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2 text-white">AI Plan Builder</h3>
              <p className="text-sm text-slate-400">Get a full week of posts planned in 30 seconds. No more Sunday night scrambling.</p>
            </div>
          </motion.div>

          {/* Bottom Features: AI Power Tools */}
          <motion.div 
            variants={cardVariants}
            whileHover={{ scale: 1.02, boxShadow: '0 0 0 1px rgba(1,186,210,0.3), 0 8px 32px rgba(1,186,210,0.1)' }}
            className="col-span-1 md:col-span-2 group flex flex-col sm:flex-row items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-300"
          >
            <div className="h-16 w-16 flex-shrink-0 rounded-2xl bg-gradient-to-br from-[#01BAD2]/10 to-blue-500/20 border border-white/10 flex items-center justify-center text-[#01BAD2] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] group-hover:scale-110 group-hover:border-[#01BAD2]/30 transition-all duration-500">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="16" cy="9" r="2" fill="currentColor"/>
                <circle cx="8" cy="12" r="1.5" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2 text-white">AI Power Tools</h3>
              <p className="text-sm text-slate-400">Caption generator, hashtag research, hook builder, CTA suggester — all built in.</p>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
};
