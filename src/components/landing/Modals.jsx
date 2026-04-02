/* eslint-disable no-unused-vars */

import React, { useState, useEffect } from 'react';
import { createCheckoutSession, openStripeCheckoutTab } from '../../services/stripeAPI';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check, AlertCircle, Crown, ArrowRight } from 'lucide-react';

const FOUNDING_SPOTS_LEFT = 28;

export const WaitlistModal = ({ isOpen, onClose }) => {
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
            className="absolute inset-0 bg-[#0a0f14]/80 backdrop-blur-md"
            onClick={handleClose}
          />
          
          <motion.div 
            className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 overflow-hidden border border-zinc-200"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#01BAD2] to-[#0284c7]" />
            
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 transition-colors"
            >
              <X size={20} className="text-zinc-400" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-[#01BAD2]/10 flex items-center justify-center border border-[#01BAD2]/20">
                <Sparkles className="text-[#01BAD2]" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-900">Join the Waitlist</h3>
                <p className="text-sm font-medium text-slate-500">Be the first to know when we launch</p>
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
                <h4 className="text-lg font-bold text-zinc-900 mb-2">You're on the list!</h4>
                <p className="text-slate-500 font-medium mb-6">We'll notify you when Huttle AI launches.</p>
                <button
                  onClick={handleClose}
                  className="w-full h-12 rounded-xl bg-[#01BAD2] hover:bg-[#019db3] text-white font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_24px_#01BAD220]"
                >
                  Got it!
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-1.5">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-[#01BAD2] focus:ring-4 focus:ring-[#01BAD2]/10 outline-none transition-all font-medium text-zinc-900 placeholder:text-zinc-400"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Last Name <span className="text-zinc-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-[#01BAD2] focus:ring-4 focus:ring-[#01BAD2]/10 outline-none transition-all font-medium text-zinc-900 placeholder:text-zinc-400"
                    placeholder="Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-[#01BAD2] focus:ring-4 focus:ring-[#01BAD2]/10 outline-none transition-all font-medium text-zinc-900 placeholder:text-zinc-400"
                    placeholder="john@example.com"
                  />
                </div>
                
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                    <AlertCircle size={18} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 mt-2 rounded-xl bg-[#01BAD2] hover:bg-[#019db3] text-white font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_24px_#01BAD220] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Joining...' : 'Join the Waitlist'}
                  {!isSubmitting && <ArrowRight size={18} />}
                </button>
              </form>
            )}

            <p className="text-center text-xs text-zinc-400 font-medium mt-6">
              We respect your privacy. Unsubscribe anytime.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const FoundersClubModal = ({ isOpen, onClose }) => {
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
            className="absolute inset-0 bg-[#0a0f14]/80 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div 
            className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 overflow-hidden border border-[#01BAD2]/30"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#01BAD2] to-[#0284c7]" />
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 transition-colors"
            >
              <X size={20} className="text-zinc-400" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-[#01BAD2]/10 flex items-center justify-center border border-[#01BAD2]/20 shadow-sm">
                <Crown className="text-[#01BAD2]" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-900">Founders Club</h3>
                <p className="text-sm font-bold text-[#01BAD2]">Only {FOUNDING_SPOTS_LEFT} Founding Member spots remaining</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {[
                { title: "Lifetime Price Lock", desc: "$199/year forever, even when prices increase" },
                { title: "Highest AI Limits", desc: "Founders get the most generous generation limits" },
                { title: "All Pro Features", desc: "Ignite Engine, Content Remix Studio, Trend Deep Dive, and more" },
                { title: "Priority Support", desc: "Direct access to our founding team" },
                { title: "14-Day Money-Back Guarantee", desc: "Not satisfied? Email hello@huttleai.com within 14 days for a full refund" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 p-0.5 rounded-full bg-green-100 text-green-600 flex-shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <p className="font-bold text-zinc-900 text-sm leading-tight mb-0.5">{item.title}</p>
                    <p className="text-xs text-zinc-500 font-medium leading-snug">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-8 p-5 rounded-2xl bg-[#01BAD2]/5 border border-[#01BAD2]/20 shadow-inner">
              <div>
                <p className="text-[10px] font-bold text-[#01BAD2] uppercase tracking-widest mb-1">Founders Price</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-4xl font-black text-zinc-900">$199</p>
                  <p className="text-sm font-semibold text-zinc-500">/year</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-zinc-400 line-through font-semibold mb-1">$357/year</p>
                <p className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-md inline-block">Save 44%</p>
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
                onClick={handleProceedToCheckout}
                disabled={checkoutLoading}
                className="w-full h-14 rounded-xl bg-[#01BAD2] hover:bg-[#019db3] text-white font-bold text-base shadow-[0_0_24px_#01BAD220] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
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

            <p className="text-center text-xs font-semibold text-zinc-400 mt-5">
              Secure checkout powered by Stripe
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

