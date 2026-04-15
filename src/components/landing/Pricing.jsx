/* eslint-disable no-unused-vars */

import React, { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import { createCheckoutSession, openStripeCheckoutTab } from '../../services/stripeAPI';

export const PricingSection = ({ onOpenFoundersModal }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [isAnnual, setIsAnnual] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

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

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  const essentialsMonthly = 15;
  const proMonthly = 39;
  const discount = 0.85;

  const essentialsPrice = isAnnual
    ? (essentialsMonthly * discount).toFixed(2)
    : essentialsMonthly;
  const proPrice = isAnnual
    ? (proMonthly * discount).toFixed(2)
    : proMonthly;

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
          className="text-center mb-12"
        >
          <span className="inline-block px-3 py-1.5 rounded-full bg-[#01BAD2]/10 text-[#01BAD2] text-xs font-bold uppercase tracking-widest mb-4 border border-[#01BAD2]/20">
            Simple Pricing
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-zinc-900 tracking-tight mb-4">
            Start creating. Pick your path.
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-8">
            Every plan includes full access to all AI tools. The only question is when you join.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-white border border-zinc-200 rounded-full px-2 py-1.5 shadow-sm">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                !isAnnual
                  ? 'bg-zinc-900 text-white shadow'
                  : 'text-slate-500 hover:text-zinc-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
                isAnnual
                  ? 'bg-zinc-900 text-white shadow'
                  : 'text-slate-500 hover:text-zinc-900'
              }`}
            >
              Annually
              <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                Save 15%
              </span>
            </button>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "show" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center max-w-5xl mx-auto"
        >
          {/* COLUMN 1: ESSENTIALS */}
          <motion.div variants={cardVariants} className="h-full">
            <div className="relative rounded-3xl bg-white p-8 border border-zinc-200 shadow-xl h-full flex flex-col">
              <div className="h-7 mb-4" />

              <h3 className="text-xl font-bold text-zinc-900 mb-2">Essentials</h3>

              <div className="mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-zinc-900">${essentialsPrice}</span>
                  <span className="text-slate-500 font-medium">/month</span>
                </div>
                {isAnnual && (
                  <p className="text-xs text-slate-400 mt-1">
                    Billed as ${(essentialsMonthly * discount * 12).toFixed(0)}/yr
                  </p>
                )}
                {!isAnnual && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Check size={13} className="text-green-600 flex-shrink-0" />
                    <span>7-day free trial</span>
                  </div>
                )}
              </div>

              <p className="text-sm text-zinc-600 mb-6 font-medium mt-3">
                Everything you need to hit the ground running.
              </p>

              <ul className="space-y-3 mb-8 flex-1">
                {[
                  '200 AI generations/month',
                  'All AI Power Tools',
                  'Content Vault',
                ].map((feat, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm text-zinc-600">
                    <Check size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout('essentials')}
                disabled={!!checkoutLoading}
                className="w-full h-12 rounded-xl border-2 border-zinc-200 text-zinc-700 bg-transparent hover:border-zinc-400 hover:text-zinc-900 font-semibold text-sm transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {checkoutLoading === 'essentials' ? 'Loading…' : 'Start 7-Day Trial'}
              </button>
            </div>
          </motion.div>

          {/* COLUMN 2: PRO (HIGHLIGHTED) */}
          <motion.div variants={cardVariants} className="relative md:scale-105 md:z-10 h-full">
            <div className="relative rounded-3xl bg-white p-8 border-2 border-[#01BAD2]/60 shadow-2xl overflow-hidden flex flex-col h-full">
              {/* Subtle background tint */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#01BAD2]/5 to-[#0284c7]/5 opacity-50 -z-10" />

              <div className="inline-flex items-center self-start gap-1.5 px-3 py-1 rounded-full bg-[#01BAD2]/10 text-[#01BAD2] text-xs font-bold uppercase tracking-wide mb-6 border border-[#01BAD2]/20">
                <Zap size={11} className="fill-[#01BAD2]" />
                MOST POPULAR
              </div>

              <h3 className="text-2xl font-bold text-zinc-900 mb-2">Pro</h3>

              <div className="mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-zinc-900">${proPrice}</span>
                  <span className="text-slate-500 font-medium">/month</span>
                </div>
                {isAnnual && (
                  <p className="text-xs text-slate-400 mt-1">
                    Billed as ${(proMonthly * discount * 12).toFixed(0)}/yr
                  </p>
                )}
                {!isAnnual && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Check size={13} className="text-green-600 flex-shrink-0" />
                    <span>7-day free trial</span>
                  </div>
                )}
              </div>

              <p className="text-sm text-zinc-600 mb-6 font-medium mt-3">
                The complete toolkit for serious creators.
              </p>

              <ul className="space-y-3 mb-8 flex-1">
                {[
                  '600 AI generations/month',
                  'Full Trend Lab access',
                  'Niche Intel',
                  'Content Vault',
                ].map((feat, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm text-zinc-600 font-medium">
                    <Check size={16} className="text-[#01BAD2] mt-0.5 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout('pro')}
                disabled={!!checkoutLoading}
                className="w-full h-14 rounded-xl bg-[#01BAD2] hover:bg-[#019db3] text-white font-bold text-base shadow-[0_0_24px_#01BAD220] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {checkoutLoading === 'pro' ? 'Loading…' : 'Start 7-Day Trial'}
              </button>
            </div>
          </motion.div>

          {/* COLUMN 3: BUILDERS CLUB */}
          <motion.div variants={cardVariants} className="h-full">
            <div className="relative rounded-3xl bg-white p-8 border border-zinc-200 shadow-xl h-full flex flex-col">
              <div className="inline-flex items-center self-start gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wide mb-6 border border-red-200">
                ⏳ CLOSES IN 7 DAYS
              </div>

              <h3 className="text-xl font-bold text-zinc-900 mb-2">Builders Club</h3>

              <div className="mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-zinc-900">$249</span>
                  <span className="text-slate-500 font-medium">/year</span>
                </div>
                <p className="text-sm font-semibold text-[#01BAD2] mt-1">
                  $20.75/mo equivalent
                </p>
                <p className="text-xs text-slate-400 mt-0.5">vs $39/mo on Pro — lock it in forever</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <Check size={13} className="text-green-600 flex-shrink-0" />
                  <span>14-day happiness guarantee</span>
                </div>
              </div>

              <p className="text-sm text-zinc-600 mb-6 font-medium mt-3">
                Annual pass. Price never increases.
              </p>

              <ul className="space-y-3 mb-8 flex-1">
                {[
                  '800 AI generations/month',
                  'All Pro features included',
                  'Locked-in annual rate',
                  'Priority support',
                  'Content Vault',
                ].map((feat, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm text-zinc-600">
                    <Check size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout('builder')}
                disabled={!!checkoutLoading}
                className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {checkoutLoading === 'builder' ? 'Loading…' : 'Join Builders Club'}
              </button>
              <p className="text-center text-xs text-slate-400 mt-3">$249/year — not a one-time payment</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
