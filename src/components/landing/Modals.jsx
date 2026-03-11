/* eslint-disable no-unused-vars */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check, AlertCircle, Crown, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const FOUNDING_SPOTS_LEFT = 41;

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
                <p className="text-sm font-bold text-[#01BAD2]">Only {FOUNDING_SPOTS_LEFT} of 100 spots remaining</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {[
                { title: "Lifetime Price Lock", desc: "$199/year forever, even when prices increase" },
                { title: "Highest AI Limits", desc: "Founders get the most generous generation limits" },
                { title: "All Pro Features", desc: "Viral Blueprint, Content Remix Studio, Trend Deep Dive, and more" },
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

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleProceedToCheckout}
                className="w-full h-14 rounded-xl bg-[#01BAD2] hover:bg-[#019db3] text-white font-bold text-base shadow-[0_0_24px_#01BAD220] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
              >
                Claim Your $199/yr Founders Spot
                <ArrowRight size={18} />
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

export const PolicyModal = ({ isOpen, onClose, type }) => {
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
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const privacyContent = (
    <div className="text-zinc-600">
      <h2 className="text-3xl font-extrabold text-zinc-900 mb-2">Privacy Policy</h2>
      <p className="text-sm text-zinc-400 font-medium mb-4">Last updated: February 2026</p>
      <Link to="/privacy" className="text-sm font-semibold text-[#01BAD2] hover:text-[#019db3] transition-colors mb-8 inline-block" onClick={onClose}>View full page &rarr;</Link>

      <div className="space-y-8">
        <section>
          <h3 className="text-lg font-bold text-zinc-900 mb-3">1. Introduction</h3>
          <p className="text-sm leading-relaxed font-medium">
            Huttle AI ("we," "our," or "us") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website and use our services.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-bold text-zinc-900 mb-3">2. Information We Collect</h3>
          <p className="text-sm leading-relaxed font-medium mb-3">We collect information you provide directly to us, including:</p>
          <ul className="text-sm leading-relaxed space-y-3 font-medium ml-4 list-disc">
            <li><span className="font-bold text-zinc-800">Account Information:</span> Name, email address, and password when you create an account</li>
            <li><span className="font-bold text-zinc-800">Payment Information:</span> When you make a purchase, our payment processor (Stripe) collects your payment card details. We do not store your full card information on our servers</li>
            <li><span className="font-bold text-zinc-800">Waitlist Information:</span> Email address when you join our waitlist</li>
            <li><span className="font-bold text-zinc-800">Usage Data:</span> Information about how you interact with our services, including features used, content generated, and preferences set</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-bold text-zinc-900 mb-3">3. How We Use Your Information</h3>
          <p className="text-sm leading-relaxed font-medium mb-3">We use the information we collect to:</p>
          <ul className="text-sm leading-relaxed space-y-2 font-medium ml-4 list-disc">
            <li>Provide, maintain, and improve our services</li>
            <li>Process transactions and send related information</li>
            <li>Send you technical notices, updates, and support messages</li>
            <li>Send marketing communications (you can opt out at any time)</li>
            <li>Respond to your comments, questions, and customer service requests</li>
            <li>Monitor and analyze trends, usage, and activities</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-bold text-zinc-900 mb-3">4. Information Sharing</h3>
          <p className="text-sm leading-relaxed font-medium mb-3">We do not sell, trade, or rent your personal information to third parties. We may share your information with:</p>
          <ul className="text-sm leading-relaxed space-y-2 font-medium ml-4 list-disc">
            <li><span className="font-bold text-zinc-800">Service Providers:</span> Third-party vendors who assist us in operating our services (e.g., Stripe for payments, email service providers)</li>
            <li><span className="font-bold text-zinc-800">Legal Requirements:</span> When required by law or to protect our rights</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-bold text-zinc-900 mb-3">5. Contact Us</h3>
          <p className="text-sm leading-relaxed font-medium">If you have any questions about this Privacy Policy, please contact us at support@huttleai.com.</p>
        </section>
      </div>
    </div>
  );

  const termsContent = (
    <div className="text-zinc-600">
      <h2 className="text-3xl font-extrabold text-zinc-900 mb-2">Terms of Service</h2>
      <p className="text-sm text-zinc-400 font-medium mb-4">Last updated: February 2026</p>
      <Link to="/terms" className="text-sm font-semibold text-[#01BAD2] hover:text-[#019db3] transition-colors mb-8 inline-block" onClick={onClose}>View full page &rarr;</Link>

      <div className="space-y-8">
        <section>
          <h3 className="text-lg font-bold text-zinc-900 mb-3">1. Acceptance of Terms</h3>
          <p className="text-sm leading-relaxed font-medium">By accessing or using Huttle AI ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.</p>
        </section>

        <section>
          <h3 className="text-lg font-bold text-zinc-900 mb-3">2. Description of Service</h3>
          <p className="text-sm leading-relaxed font-medium">Huttle AI is an AI-powered content creation platform that helps users plan, create, and optimize social media content. Features include content generation, viral predictions, trend analysis, and scheduling tools.</p>
        </section>

        <section>
          <h3 className="text-lg font-bold text-zinc-900 mb-3">3. Subscription and Payments</h3>
          <ul className="text-sm leading-relaxed space-y-2 font-medium ml-4 list-disc">
            <li><span className="font-bold text-zinc-800">Founding Member Pricing:</span> $199/year, locked in forever for founding members</li>
            <li><span className="font-bold text-zinc-800">Regular Pricing:</span> As displayed on our pricing page after the founding member period ends</li>
            <li>Payments are processed securely through Stripe</li>
            <li>All fees are non-refundable except as described in our Refund Policy below</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-bold text-zinc-900 mb-3">4. Refund Policy</h3>
          <p className="text-sm leading-relaxed font-medium">Founders Club and Builders Club include a 14-day money-back guarantee. Future Essentials and Pro pricing will be available after the launch window closes. For questions, contact hello@huttleai.com.</p>
        </section>

        <section>
          <h3 className="text-lg font-bold text-zinc-900 mb-3">5. Intellectual Property</h3>
          <ul className="text-sm leading-relaxed space-y-2 font-medium ml-4 list-disc">
            <li><span className="font-bold text-zinc-800">Our Content:</span> The Service, including its design, features, and content created by us, is owned by Huttle AI and protected by intellectual property laws</li>
            <li><span className="font-bold text-zinc-800">Your Content:</span> You retain ownership of content you create using the Service. By using the Service, you grant us a license to process your content solely to provide the Service to you</li>
            <li><span className="font-bold text-zinc-800">AI-Generated Content:</span> Content generated by our AI tools is yours to use. However, you are responsible for ensuring your use of generated content complies with applicable laws</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-bold text-zinc-900 mb-3">6. Contact Us</h3>
          <p className="text-sm leading-relaxed font-medium">If you have any questions about these Terms, please contact us at support@huttleai.com</p>
        </section>
      </div>
    </div>
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
            className="absolute inset-0 bg-[#0a0f14]/80 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div 
            className="relative bg-white rounded-3xl shadow-2xl w-[95%] md:w-full md:max-w-2xl h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col border border-zinc-200"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#01BAD2] to-[#0284c7] z-10" />
            
            <button 
              onClick={onClose}
              className="absolute top-5 right-5 z-10 p-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors shadow-sm"
              aria-label="Close modal"
            >
              <X size={20} strokeWidth={2.5} />
            </button>

            <div className="flex-1 overflow-y-auto p-6 md:p-10 pt-10">
              {type === 'privacy' ? privacyContent : termsContent}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
