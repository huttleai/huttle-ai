import { useState, useContext, useEffect } from 'react';
import { Check, CreditCard, Zap, Crown, Star, Loader2, ExternalLink, Sparkles, Shield, AlertCircle, ShieldCheck, Award, Lock, Users, CalendarCheck } from 'lucide-react';
import Badge from '../components/Badge';
import { createCheckoutSession, createPortalSession, getSubscriptionStatus, isDemoMode } from '../services/stripeAPI';
import { useSubscription } from '../context/SubscriptionContext';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import CancelSubscriptionModal from '../components/CancelSubscriptionModal';
import { supabase } from '../config/supabase';

export default function Subscription() {
  const { userTier, TIERS, setDemoTier, isDemoMode: contextDemoMode } = useSubscription();
  const { user } = useContext(AuthContext);
  const { addToast } = useToast();
  const [loading, setLoading] = useState(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  // Check if in demo mode
  const demoMode = isDemoMode() || contextDemoMode;
  const showDemoControls = import.meta.env.DEV && demoMode;

  useEffect(() => {
    const fetchSubscriptionInfo = async () => {
      if (user) {
        const result = await getSubscriptionStatus();
        if (result.success) {
          setSubscriptionInfo(result);
        }
      }
    };
    fetchSubscriptionInfo();
  }, [user]);

  const plans = [
    {
      id: 'freemium',
      name: 'Freemium',
      monthlyPrice: 0,
      annualPrice: 0,
      icon: Star,
      description: 'Perfect for getting started',
      features: [
        '20 AI generations/month',
        'Smart Calendar',
        'Content Library (250MB)',
        'Trending Now & Hashtags',
        'All AI Power Tools',
        'Daily Alerts',
        'AI-Powered Insights',
        'AI Plan Builder (7 days)'
      ],
      gradient: 'from-gray-500 to-gray-600',
      tier: TIERS.FREE
    },
    {
      id: 'essentials',
      name: 'Essentials',
      monthlyPrice: 15,
      annualPrice: 150,
      icon: Zap,
      popular: true,
      description: 'Best for growing creators',
      features: [
        'Everything in Freemium, plus:',
        '200 AI generations/month',
        '5GB storage',
        'AI Plan Builder (7 & 14 days)',
        'Full Trend Lab access',
        'Email Support'
      ],
      gradient: 'from-huttle-primary to-cyan-400',
      tier: TIERS.ESSENTIALS
    },
    {
      id: 'pro',
      name: 'Pro',
      monthlyPrice: 35,
      annualPrice: 350,
      icon: Crown,
      description: 'For power users & teams',
      features: [
        'Everything in Essentials, plus:',
        '800 AI generations/month',
        '50GB storage',
        'Viral Blueprint',
        'Content Remix Studio',
        'Trend Lab',
        'Huttle Agent',
        'Priority Email Support'
      ],
      gradient: 'from-purple-500 to-pink-500',
      tier: TIERS.PRO
    }
  ];

  const handleUpgrade = async (planId) => {
    if (planId === 'freemium') return;
    
    setLoading(planId);
    console.log('🔵 [Subscription] Starting upgrade for plan:', planId);
    console.log('🔵 [Subscription] Current tier:', userTier);
    console.log('🔵 [Subscription] Target plan:', planId);
    console.log('🔵 [Subscription] Billing cycle:', billingCycle);
    console.log('🔵 [Subscription] User:', user?.email || 'Not logged in');
    
    try {
      const result = await createCheckoutSession(planId, billingCycle);
      console.log('🔵 [Subscription] Checkout result:', JSON.stringify(result));
      
      // Handle demo mode response
      if (result.demo) {
        // Update tier in demo mode
        if (setDemoTier) {
          const tierMap = { 'essentials': TIERS.ESSENTIALS, 'pro': TIERS.PRO, 'founder': TIERS.FOUNDER };
          setDemoTier(tierMap[planId] || TIERS.PRO);
        }
        addToast(`${planId.charAt(0).toUpperCase() + planId.slice(1)} plan selected.`, 'success');
        setLoading(null);
        return;
      }
      
      if (!result.success) {
        console.error('❌ [Subscription] Checkout failed:', result.error);
        addToast(result.error || 'Failed to start checkout. Please try again.', 'error');
        setLoading(null);
        return;
      }
      
      // If successful with URL, the redirect should happen in stripeAPI.js
      // Set a timeout to clear loading state if redirect doesn't happen
      if (result.success && result.url) {
        console.log('✅ [Subscription] Redirect should happen to:', result.url);
        // Give 5 seconds for redirect to happen, then clear loading
        setTimeout(() => {
          console.warn('⚠️ [Subscription] Redirect timeout - clearing loading state');
          setLoading(null);
        }, 5000);
      } else if (result.success && !result.url) {
        console.error('❌ [Subscription] No redirect URL in successful response');
        addToast('Checkout session created but no redirect URL. Please try again.', 'error');
        setLoading(null);
      }
    } catch (error) {
      console.error('❌ [Subscription] Upgrade error:', error);
      console.error('❌ [Subscription] Error stack:', error.stack);
      addToast('Something went wrong. Please try again.', 'error');
      setLoading(null);
    }
  };

  const handleManagePayment = async () => {
    setLoading('portal');
    try {
      const result = await createPortalSession();
      
      // Handle demo mode response
      if (result.demo) {
        addToast('Billing portal is temporarily unavailable. Please try again shortly.', 'info');
        return;
      }
      
      if (!result.success) {
        addToast(result.error || 'Failed to open billing portal. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Portal error:', error);
      addToast('Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleCancelSubscription = () => {
    setShowCancelModal(true);
  };

  const confirmCancelSubscription = async (feedbackData) => {
    setLoading('cancel');
    try {
      // Save feedback to Supabase
      if (feedbackData && feedbackData.reason) {
        const { error: feedbackError } = await supabase
          .from('cancellation_feedback')
          .insert({
            user_id: user.id,
            subscription_tier: userTier,
            cancellation_reason: feedbackData.reason,
            custom_feedback: feedbackData.customFeedback || null
          });

        if (feedbackError) {
          console.error('Failed to save feedback:', feedbackError);
          // Don't block cancellation if feedback save fails
        }
      }

      // Proceed to Stripe portal
      const result = await createPortalSession();
      if (!result.success) {
        addToast(result.error || 'Failed to open cancellation portal. Please try again.', 'error');
      } else {
        setShowCancelModal(false);
        addToast('Thank you for your feedback!', 'success');
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      addToast('Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleDowngrade = async (planId) => {
    setShowCancelModal(false);
    
    if (planId === 'freemium') {
      // For downgrade to free, open portal to cancel subscription
      setLoading('portal');
      try {
        const result = await createPortalSession();
        if (!result.success) {
          addToast(result.error || 'Failed to open billing portal. Please try again.', 'error');
        } else {
          addToast('You can cancel your subscription in the billing portal to downgrade to Freemium.', 'info');
        }
      } catch (error) {
        console.error('Portal error:', error);
        addToast('Something went wrong. Please try again.', 'error');
      } finally {
        setLoading(null);
      }
    } else {
      // For paid plan downgrades, use checkout
      setLoading(planId);
      try {
        console.log('🔵 [Subscription] Starting downgrade for plan:', planId);
        console.log('🔵 [Subscription] Current tier:', userTier);
        console.log('🔵 [Subscription] Billing cycle:', billingCycle);
        
        const result = await createCheckoutSession(planId, billingCycle);
        console.log('🔵 [Subscription] Downgrade result:', result);
        
        if (result.demo) {
          if (setDemoTier) {
            const tierMap = { 'essentials': TIERS.ESSENTIALS, 'pro': TIERS.PRO };
            setDemoTier(tierMap[planId] || TIERS.FREE);
          }
          addToast(`${planId.charAt(0).toUpperCase() + planId.slice(1)} plan selected.`, 'success');
          setLoading(null);
          return;
        }
        
        if (!result.success) {
          console.error('❌ [Subscription] Downgrade failed:', result.error);
          addToast(result.error || 'Failed to start downgrade. Please try again.', 'error');
          setLoading(null);
          return;
        }
        
        // If successful, the page should redirect to Stripe Checkout
        if (result.success && !result.url) {
          console.error('❌ [Subscription] No redirect URL in successful response');
          addToast('Checkout session created but no redirect URL. Please try again.', 'error');
          setLoading(null);
        }
        // If there's a URL, the redirect happens in stripeAPI.js
      } catch (error) {
        console.error('❌ [Subscription] Downgrade error:', error);
        addToast('Something went wrong. Please try again.', 'error');
        setLoading(null);
      }
    }
  };

  const getButtonText = (plan) => {
    if (loading === plan.id) {
      return (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Processing...
        </span>
      );
    }
    
    if (plan.tier === userTier) {
      return 'Current Plan';
    }
    
    if (plan.id === 'freemium') {
      return 'Free Forever';
    }
    
    const tierOrder = { [TIERS.FREE]: 0, [TIERS.ESSENTIALS]: 1, [TIERS.PRO]: 2 };
    if (tierOrder[plan.tier] > tierOrder[userTier]) {
      return 'Upgrade Now';
    }
    
    return 'Change Plan';
  };

  const getPrice = (plan) => {
    if (billingCycle === 'annual' && plan.annualPrice > 0) {
      const monthlyEquivalent = Math.round(plan.annualPrice / 12);
      return (
        <div className="flex flex-col items-center">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-display font-bold text-gray-900">${monthlyEquivalent}</span>
            <span className="text-gray-500 font-medium">/mo</span>
          </div>
          <span className="text-sm text-green-600 font-semibold mt-1">
            ${plan.annualPrice}/year (Save ${plan.monthlyPrice * 12 - plan.annualPrice})
          </span>
        </div>
      );
    }
    
    return (
      <div className="flex items-baseline justify-center gap-1">
        <span className="text-4xl font-display font-bold text-gray-900">${plan.monthlyPrice}</span>
        <span className="text-gray-500 font-medium">/month</span>
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-24 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Demo Mode Banner */}
        {showDemoControls && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold text-amber-800">Developer Mode Controls</p>
              <p className="text-sm text-amber-700">Tier selector is visible in development only.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-600 font-medium">Preview tier:</span>
              <select
                value={userTier}
                onChange={(e) => setDemoTier && setDemoTier(e.target.value)}
                className="text-sm px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-amber-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value={TIERS.FREE}>Free</option>
                <option value={TIERS.ESSENTIALS}>Essentials</option>
                <option value={TIERS.PRO}>Pro</option>
              </select>
            </div>
          </div>
        )}

        {/* Founders Club View */}
        {(userTier === TIERS.FOUNDER) ? (
          <div className="max-w-4xl mx-auto">
            {/* Founders Club Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                <Award className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                  Founders Club
                </h1>
                <p className="text-base text-amber-600 font-medium">
                  Welcome, Founding Member
                </p>
              </div>
            </div>

            {/* Welcome Card */}
            <div className="bg-gradient-to-br from-amber-50 via-white to-amber-50 rounded-2xl border border-amber-200 p-8 mb-8 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">You're one of the first 100 members</h2>
                  <p className="text-gray-600">
                    As a Founders Club member, you have lifetime access to exclusive benefits and pricing that will never be available again.
                    Thank you for believing in Huttle AI from the beginning.
                  </p>
                </div>
              </div>

              {/* Membership Benefits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl p-5 border border-amber-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">All Pro Features</h3>
                  </div>
                  <p className="text-sm text-gray-600">Full access to every Pro feature including 800 AI generations/month, 50GB storage, Viral Blueprint, Content Remix Studio, Trend Lab, and more.</p>
                </div>

                <div className="bg-white rounded-xl p-5 border border-amber-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">$199/year Locked Rate</h3>
                  </div>
                  <p className="text-sm text-gray-600">Your founding rate of $199/year is locked in forever. This price will never increase, even as we add new features and raise public pricing.</p>
                </div>

                <div className="bg-white rounded-xl p-5 border border-amber-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Priority Support</h3>
                  </div>
                  <p className="text-sm text-gray-600">Get priority email support with faster response times. Your feedback directly shapes the product roadmap.</p>
                </div>

                <div className="bg-white rounded-xl p-5 border border-amber-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-amber-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Early Access</h3>
                  </div>
                  <p className="text-sm text-gray-600">Be the first to try new features and upcoming AI capabilities before they launch publicly.</p>
                </div>
              </div>
            </div>

            {/* Membership Status */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-200/50">
                  <CalendarCheck className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Membership Status</h2>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Active
                    </span>
                    <span className="text-sm text-gray-500">Founders Club Annual</span>
                  </div>
                  {subscriptionInfo?.currentPeriodEnd && (
                    <p className="text-sm text-gray-600 mb-4">
                      Your membership renews on{' '}
                      <span className="font-semibold text-gray-900">
                        {new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={handleManagePayment}
                      disabled={loading === 'portal'}
                      className="btn-primary"
                    >
                      {loading === 'portal' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Opening...
                        </>
                      ) : (
                        <>
                          Manage Billing
                          <ExternalLink className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ for Founders */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Founders Club FAQ</h2>
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-2">Will my price ever change?</h3>
                  <p className="text-gray-600 text-sm">Never. Your rate is permanently locked as long as you maintain your membership. Even as we add premium features and increase public pricing, your rate stays the same.</p>
                </div>
                <div className="pb-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-2">What if I cancel and want to rejoin?</h3>
                  <p className="text-gray-600 text-sm">Your founding rate is tied to your active membership. If you cancel, you will not be able to rejoin at the exclusive Founders Club annual rate.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">How do I get priority support?</h3>
                  <p className="text-gray-600 text-sm">Email support@huttleai.com with "Founders Club" in the subject line and you'll be prioritized in our support queue.</p>
                </div>
              </div>
            </div>
          </div>
        ) : userTier !== TIERS.FREE ? (
        /* Subscribed User View (Essentials / Pro) — Billing Management Only */
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-huttle-primary to-cyan-400 flex items-center justify-center shadow-lg">
              <CreditCard className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Billing
              </h1>
              <p className="text-base text-gray-600">
                Manage your subscription and payment method
              </p>
            </div>
          </div>

          {/* Current Plan Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-huttle-primary to-cyan-400 flex items-center justify-center shadow-lg shadow-huttle-primary/20">
                {userTier === TIERS.PRO ? <Crown className="w-6 h-6 text-white" /> : <Zap className="w-6 h-6 text-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-gray-900">
                    {userTier === TIERS.PRO ? 'Pro' : 'Essentials'} Plan
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Active
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  {userTier === TIERS.PRO 
                    ? '800 AI generations/month, 50GB storage, all features included' 
                    : '200 AI generations/month, 5GB storage, Trend Lab & Plan Builder'}
                </p>

                {subscriptionInfo?.currentPeriodEnd && (
                  <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                    <CalendarCheck className="w-4 h-4 text-gray-400" />
                    <span>
                      Next billing date:{' '}
                      <span className="font-semibold text-gray-900">
                        {new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={handleManagePayment}
                    disabled={loading === 'portal' || loading === 'cancel'}
                    className="btn-primary"
                  >
                    {loading === 'portal' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Opening...
                      </>
                    ) : (
                      <>
                        Manage Billing
                        <ExternalLink className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  
                  <button 
                    onClick={handleCancelSubscription}
                    disabled={loading === 'portal' || loading === 'cancel'}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading === 'cancel' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Opening...
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        Cancel Subscription
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="card p-6 lg:p-8 max-w-3xl mx-auto">
            <h2 className="text-xl font-display font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div className="pb-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">What is your refund policy?</h3>
                <p className="text-gray-600 text-sm">We offer a 7-day happiness guarantee on all subscriptions. If you're not completely satisfied within the first 7 days, contact us at support@huttleai.com for a full refund — no questions asked. After 7 days, all sales are final.</p>
              </div>
              <div className="pb-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h3>
                <p className="text-gray-600 text-sm">Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
              </div>
              <div className="pb-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">How do I update my payment method?</h3>
                <p className="text-gray-600 text-sm">Click "Manage Billing" above to open the Stripe billing portal, where you can update your card, view invoices, and manage your subscription.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Do AI generations roll over?</h3>
                <p className="text-gray-600 text-sm">AI generations reset at the beginning of each billing cycle and do not roll over to the next month.</p>
              </div>
            </div>
          </div>
        </div>
        ) : (
        /* Free Tier View — Show Upgrade Plan Cards */
        <>
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
            <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-huttle-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Subscription Plans
            </h1>
            <p className="text-base text-gray-600">
              Unlock the full power of AI-driven content creation
            </p>
          </div>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-10">
          <div className="bg-white rounded-2xl p-1.5 shadow-soft border border-gray-200 inline-flex gap-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-gray-900 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                billingCycle === 'annual'
                  ? 'bg-gray-900 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Annual
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                billingCycle === 'annual' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-green-100 text-green-700'
              }`}>
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-12 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-xl border transition-all duration-300 ${
                plan.popular 
                  ? 'border-huttle-primary shadow-lg scale-105 z-10' 
                  : 'border-gray-200 shadow-sm hover:shadow-md'
              } p-6 lg:p-8 flex flex-col`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-huttle-blue via-huttle-primary to-huttle-600 text-white text-sm font-bold rounded-full shadow-md">
                    <Sparkles className="w-3.5 h-3.5" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 mx-auto mb-4">
                  <plan.icon className="w-7 h-7 text-huttle-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                {getPrice(plan)}
              </div>

              <div className="border-t border-gray-100 pt-6 mb-6 flex-grow">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 flex-shrink-0 ${
                        feature.startsWith('Everything') ? 'text-huttle-primary' : 'text-green-500'
                      }`} />
                      <span className={`text-sm ${
                        feature.startsWith('Everything') 
                          ? 'text-gray-900 font-semibold' 
                          : 'text-gray-600'
                      }`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={loading !== null || plan.tier === userTier}
                className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${
                  plan.tier === userTier
                    ? 'bg-gray-100 text-gray-500 cursor-default border border-gray-200'
                    : plan.popular
                      ? 'bg-[#01bad2] text-white shadow-md hover:bg-[#00ACC1] hover:shadow-lg disabled:opacity-50'
                      : plan.id === 'freemium'
                        ? 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300 cursor-default'
                        : 'bg-[#01bad2] text-white shadow-md hover:bg-[#00ACC1] hover:shadow-lg disabled:opacity-50'
                }`}
              >
                {getButtonText(plan)}
              </button>

              {/* 7-Day Happiness Guarantee */}
              {plan.id !== 'freemium' && (
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-400">7-day money-back guarantee</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-12">
          <div className="flex items-center gap-2 text-gray-500">
            <Shield className="w-5 h-5" />
            <span className="text-sm font-medium">Secure payments via Stripe</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Check className="w-5 h-5" />
            <span className="text-sm font-medium">Cancel anytime</span>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="card p-6 lg:p-8 max-w-3xl mx-auto">
          <h2 className="text-xl font-display font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="pb-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">What is your refund policy?</h3>
              <p className="text-gray-600 text-sm">We offer a 7-day happiness guarantee on all subscriptions. If you're not completely satisfied within the first 7 days, contact us at support@huttleai.com for a full refund — no questions asked. After 7 days, all sales are final.</p>
            </div>
            <div className="pb-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-600 text-sm">Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
            </div>
            <div className="pb-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">What happens to my content if I downgrade?</h3>
              <p className="text-gray-600 text-sm">Your content remains safe. However, if you exceed the storage limit of your new plan, you won't be able to upload new content until you're within limits.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Do AI generations roll over?</h3>
              <p className="text-gray-600 text-sm">AI generations reset at the beginning of each billing cycle and do not roll over to the next month.</p>
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Cancel Subscription Modal */}
      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={confirmCancelSubscription}
        onDowngrade={handleDowngrade}
        currentTier={userTier}
        isLoading={loading === 'cancel'}
        renewalDate={subscriptionInfo?.currentPeriodEnd}
      />
    </div>
  );
}
