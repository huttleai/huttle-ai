import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Zap } from 'lucide-react';
import { FEATURE_RUN_CAPS } from '../../config/creditConfig';
import { startPublicCheckout } from '../../utils/publicCheckout';
import { BorderBeamButton } from '../magicui/BorderBeam';

const CARD_REQUIRED_NOTE = 'Card required · Cancel anytime';
const TRIAL_FOOTNOTE =
  'A credit card is required to start the trial. You will not be charged during the 7-day trial. Billing begins automatically when the trial ends unless you cancel.';

export function PricingSection() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);

  const essentialsMonthly = 15;
  const proMonthly = 39;
  const essentialsAnnual = 153;
  const proAnnual = 398;
  const discount = 0.85;

  const essentialsPrice = isAnnual
    ? (essentialsMonthly * discount).toFixed(2)
    : essentialsMonthly;
  const proPrice = isAnnual
    ? (proMonthly * discount).toFixed(2)
    : proMonthly;

  const handleCheckout = async (planId) => {
    const billingCycle = isAnnual ? 'annual' : 'monthly';
    setCheckoutError(null);
    setCheckoutLoading(planId);
    try {
      const result = await startPublicCheckout(planId, billingCycle, { navigate });
      if (result.redirectedToSignup) return;
      if (!result.success) {
        setCheckoutError(result.error || 'Could not start checkout. Please try again.');
      }
    } catch (error) {
      setCheckoutError(error?.message || 'Could not start checkout. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

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
            Essentials gives you the full content creation toolkit. Pro adds our trend intelligence
            suite and 14-day planning.
          </p>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-center max-w-4xl mx-auto">
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
                    Billed as ${essentialsAnnual}/yr
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
                  '7-Day AI Plan Builder',
                  'Content Remix Studio',
                  `Ignite Engine (${FEATURE_RUN_CAPS.igniteEngine.essentials} briefs/month)`,
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
                data-testid="landing-pricing-essentials-cta"
                className="w-full h-12 rounded-xl border-2 border-slate-200 text-slate-700 bg-transparent hover:border-slate-400 hover:text-slate-900 font-semibold text-sm transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {checkoutLoading === 'essentials' ? 'Loading…' : 'Start 7-Day Trial'}
              </button>
              <p className="text-center text-[10px] text-slate-400 mt-2.5">{CARD_REQUIRED_NOTE}</p>
            </div>
          </motion.div>

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
                    Billed as ${proAnnual}/yr
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
                data-testid="landing-pricing-pro-cta"
                className="w-full h-12 md:h-14 rounded-xl text-white font-bold text-sm shadow-lg shadow-[#01bad2]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                beamDuration={6}
              >
                {checkoutLoading === 'pro' ? 'Loading…' : (
                  <>Start 7-Day Trial<ArrowRight size={16} className="ml-2" /></>
                )}
              </BorderBeamButton>
              <p className="text-center text-[10px] text-slate-400 mt-2.5">{CARD_REQUIRED_NOTE}</p>
            </div>
          </motion.div>
        </div>

        {checkoutError && (
          <p
            role="alert"
            data-testid="landing-pricing-checkout-error"
            className="text-center text-sm text-red-600 mt-6 max-w-xl mx-auto"
          >
            {checkoutError}
          </p>
        )}

        <p className="text-center text-[11px] text-slate-400 mt-10 max-w-xl mx-auto">
          {TRIAL_FOOTNOTE}
        </p>
      </div>
    </section>
  );
}
