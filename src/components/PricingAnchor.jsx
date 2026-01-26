import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Clock, ArrowRight, Check, Sparkles, ShieldCheck } from 'lucide-react';

/**
 * PricingAnchor - A price anchoring comparison component
 * Displays two pricing cards side-by-side to create a psychological anchor effect
 * The left card (public launch) appears unappealing, while the right card (Founders Club) is the obvious choice
 */
const PricingAnchor = ({ onOpenFoundersModal }) => {
  return (
    <section className="py-10 md:py-24 px-4 bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto max-w-5xl">
        {/* Section Header */}
        <div className="text-center mb-8 md:mb-12">
          <motion.div 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] md:text-xs font-bold mb-3 md:mb-4 border border-amber-200"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles size={12} />
            Limited Time Offer
          </motion.div>
          <h2 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tighter mb-2 md:mb-4">
            Why wait when you can <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2B8FC7] to-[#01bad2]">save now?</span>
          </h2>
          <p className="text-xs md:text-lg text-slate-500 max-w-xl mx-auto">
            Compare your options. The choice is clear.
          </p>
        </div>

        {/* Pricing Cards Container */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch justify-center">
          
          {/* Card 1: Public Launch (The Anchor - Deliberately Unappealing) */}
          <div className="flex-1 max-w-md">
            <div className="relative h-full rounded-2xl md:rounded-3xl bg-slate-50 border border-slate-200 p-5 md:p-8 opacity-75">
              {/* Coming Soon Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200 text-slate-500 text-[10px] md:text-xs font-medium mb-4 md:mb-6">
                <Clock size={12} />
                Coming Soon
              </div>

              {/* Title */}
              <h3 className="text-lg md:text-xl font-bold text-slate-600 mb-1">
                Public Launch
              </h3>
              <p className="text-xs md:text-sm text-slate-500 mb-4 md:mb-6">
                Q1 2026
              </p>

              {/* Price */}
              <div className="mb-4 md:mb-6">
                <div className="inline-block px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] md:text-xs font-semibold uppercase tracking-wide mb-2">
                  Pro Plan
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl md:text-4xl font-black text-slate-500">$35</span>
                  <span className="text-sm md:text-base text-slate-500">/month</span>
                </div>
                <p className="text-xs md:text-sm text-slate-500 mt-1">or $336/year (20% discount)</p>
              </div>

              {/* Features List */}
              <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                {['All Pro features', 'Standard support', 'Regular updates'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs md:text-sm text-slate-500">
                    <Check size={14} className="text-slate-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Disabled Button */}
              <button 
                disabled
                className="w-full h-11 md:h-12 rounded-xl bg-slate-200 text-slate-500 font-medium text-sm cursor-not-allowed"
              >
                Wait for February
              </button>
            </div>
          </div>

          {/* Card 2: Founders Club (The Obvious Choice) */}
          <div className="flex-1 max-w-md">
            <motion.div 
              className="relative h-full rounded-2xl md:rounded-3xl bg-white p-5 md:p-8 ring-2 ring-[#01bad2] shadow-xl shadow-[#01bad2]/20"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {/* Glow Effect */}
              <div className="absolute -inset-px rounded-2xl md:rounded-3xl bg-gradient-to-r from-[#2B8FC7] to-[#01bad2] opacity-20 blur-sm -z-10" />
              
              {/* Price Locked Badge */}
              <motion.div 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[10px] md:text-xs font-bold uppercase tracking-wide mb-4 md:mb-6 border border-green-200"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Crown size={12} />
                Price Locked Forever
              </motion.div>

              {/* Title */}
              <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1">
                Founders Club
              </h3>
              <p className="text-xs md:text-sm text-slate-500 mb-4 md:mb-6">
                Early Access Membership
              </p>

              {/* Price */}
              <div className="mb-4 md:mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl md:text-4xl font-black text-slate-900">$199</span>
                  <span className="text-sm md:text-base text-slate-500">/year</span>
                </div>
                <p className="text-xs md:text-sm text-slate-500 mt-1">$16/mo billed annually</p>
              </div>

              {/* Savings Callout */}
              <div className="mb-4 md:mb-6 p-3 md:p-4 rounded-xl bg-green-50 border border-green-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs md:text-sm font-medium text-green-700">You save instantly</span>
                  <span className="text-lg md:text-xl font-black text-green-600">$221/year</span>
                </div>
              </div>

              {/* Features List */}
              <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                {[
                  'All Pro features included',
                  'Highest AI generation limits',
                  'Priority support access',
                  'Price locked forever'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs md:text-sm text-slate-700">
                    <div className="h-4 w-4 rounded-full bg-[#01bad2]/10 flex items-center justify-center flex-shrink-0">
                      <Check size={10} className="text-[#01bad2]" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <motion.button 
                onClick={onOpenFoundersModal}
                className="w-full h-11 md:h-12 rounded-xl bg-gradient-to-r from-[#2B8FC7] to-[#01bad2] text-white font-bold text-sm shadow-lg shadow-[#01bad2]/25 hover:shadow-[#01bad2]/40 transition-shadow flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Lock in $199/yr
                <ArrowRight size={16} />
              </motion.button>

              {/* 7-Day Happiness Guarantee */}
              <div className="flex items-center justify-center gap-1.5 mt-3 md:mt-4">
                <ShieldCheck size={14} className="text-slate-400" />
                <span className="text-xs text-slate-400">7-day money-back guarantee. Cancel anytime.</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingAnchor;

