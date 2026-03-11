/* eslint-disable no-unused-vars */

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Check, Users } from 'lucide-react';

export const PricingSection = ({ onOpenFoundersModal }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <section id="pricing" className="py-24 px-6 md:px-8 lg:px-12 bg-slate-50 relative overflow-hidden">
      {/* Decorative Glows */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#01BAD2]/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div 
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1.5 rounded-full bg-[#01BAD2]/10 text-[#01BAD2] text-xs font-bold uppercase tracking-widest mb-4 border border-[#01BAD2]/20">
            Simple Pricing
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-zinc-900 tracking-tight mb-4">
            Start creating. Pick your path.
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Every plan includes full access to all AI tools. The only question is when you join.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "show" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center max-w-5xl mx-auto"
        >
          {/* CARD 1: FOUNDING MEMBER (Primary) */}
          <motion.div 
            variants={cardVariants}
            className="relative md:scale-105 md:z-10 order-1 md:order-2"
          >
            <div className="relative rounded-3xl bg-white p-8 border-2 border-[#01BAD2]/60 shadow-2xl overflow-hidden flex flex-col h-full">
              {/* background effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#01BAD2]/5 to-[#0284c7]/5 opacity-50 -z-10" />
              
              <div className="inline-flex items-center self-start gap-1.5 px-3 py-1 rounded-full bg-[#01BAD2]/10 text-[#01BAD2] text-xs font-bold uppercase tracking-wide mb-6 border border-[#01BAD2]/20">
                🔥 BEST VALUE
              </div>

              <h3 className="text-2xl font-bold text-zinc-900 mb-2">Founders Club</h3>
              
              <div className="mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-zinc-900">$199</span>
                  <span className="text-slate-500 font-medium">/year</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">$16.58/mo equivalent</p>
              </div>

              <div className="flex items-center gap-2 mb-6">
                <span className="text-sm text-slate-400 line-through font-medium">$357/yr</span>
                <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">Save 44%</span>
              </div>

              <p className="text-sm text-zinc-600 mb-6 font-medium">Lock in the lowest price we'll ever offer.</p>
              
              <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-[#01BAD2]/10 border border-[#01BAD2]/20">
                <Users size={16} className="text-[#01BAD2] flex-shrink-0" />
                <span className="text-xs font-bold text-[#01BAD2]">Only 41 of 100 spots remaining</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'All Pro features forever',
                  'Rate locked — never increases',
                  'Viral Blueprint & AI Plan Builder',
                  'Content Remix Studio & Trend Lab',
                  'AI Power Tools (captions, hooks, CTAs)',
                  'Content Vault for all your assets',
                  'Cancel anytime',
                ].map((feat, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm text-zinc-600 font-medium">
                    <Check size={16} className="text-[#01BAD2] mt-0.5 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <button 
                onClick={onOpenFoundersModal}
                className="w-full h-14 rounded-xl bg-[#01BAD2] hover:bg-[#019db3] text-white font-bold text-base shadow-[0_0_24px_#01BAD220] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
              >
                Claim Your $199/yr Founders Spot
                <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>

          {/* CARD 2: BUILDERS CLUB */}
          <motion.div 
            variants={cardVariants}
            className="order-2 md:order-1 h-full"
          >
            <div className="relative rounded-3xl bg-white p-8 border border-zinc-200 shadow-xl opacity-90 h-full flex flex-col">
              <div className="inline-flex items-center self-start gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wide mb-6 border border-zinc-200">
                COMING MARCH 15
              </div>

              <h3 className="text-xl font-bold text-zinc-900 mb-2">Builders Club</h3>
              
              <div className="mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-zinc-900">$249</span>
                  <span className="text-slate-500 font-medium">/year</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">$20.75/mo equivalent</p>
              </div>

              <p className="text-sm text-zinc-600 mb-2 font-medium">For the builders who move fast.</p>
              <p className="text-xs text-slate-500 mb-6 font-medium">Available March 15–30 only</p>

              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'All Pro features forever',
                  'Rate locked — never increases',
                  'Everything in Founding Member',
                  'Time-limited, not spot-limited',
                ].map((feat, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm text-zinc-600">
                    <Check size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <button 
                disabled 
                className="w-full h-12 rounded-xl border border-zinc-200 text-slate-400 bg-slate-50 font-semibold text-sm cursor-not-allowed"
              >
                Available March 15
              </button>
              <p className="text-center text-xs text-slate-500 mt-4">Save $108/yr vs regular pricing</p>
            </div>
          </motion.div>

          {/* CARD 3: REGULAR PRO */}
          <motion.div 
            variants={cardVariants}
            className="order-3 h-full"
          >
            <div className="relative rounded-3xl bg-white p-8 border border-zinc-200 shadow-xl h-full flex flex-col">
              <div className="inline-flex items-center self-start gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wide mb-6 border border-zinc-200">
                STARTING MARCH 31
              </div>

              <h3 className="text-xl font-bold text-zinc-900 mb-2">Pro</h3>
              
              <div className="mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-zinc-900">$357</span>
                  <span className="text-slate-500 font-medium">/year</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">$29.75/mo billed annually</p>
              </div>

              <p className="text-sm text-zinc-600 mb-8 font-medium">Or $39/month billed monthly</p>

              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'All features included',
                  'Highest AI generation limits',
                  'Full Trend Lab access',
                ].map((feat, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm text-zinc-600">
                    <Check size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <button 
                disabled 
                className="w-full h-12 rounded-xl border border-zinc-200 text-slate-400 bg-slate-50 font-semibold text-sm cursor-not-allowed"
              >
                Starting March 31
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
