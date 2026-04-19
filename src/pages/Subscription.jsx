import { useState, useContext, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, BadgeCheck, Check, CreditCard, Crown, AlertCircle, Loader2, Shield, Sparkles, Users, Zap } from 'lucide-react';
import { cancelSubscription, createCheckoutSession, getBillingInvoices, getBillingSummary, isDemoMode, openStripeCheckoutTab } from '../services/stripeAPI';
import { useSubscription, clearSubscriptionCache } from '../context/SubscriptionContext';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BillingManagementPanel from '../components/BillingManagementPanel';
import CancelSubscriptionModal from '../components/CancelSubscriptionModal';
import FoundersMembershipCard from '../components/FoundersMembershipCard';
import { supabase } from '../config/supabase';
import { getTierConfig } from '../utils/tierConfig';

const LAUNCH_PLANS = [
  {
    id: 'founder',
    name: 'Founders Club',
    badge: 'Best value',
    annualPrice: 199,
    monthlyEquivalent: '16.58',
    description: 'The lowest price we will ever offer.',
    features: [
      'All Pro features',
      '800 AI generations/month',
      '25GB storage',
      'Priority support',
      'Founders rate locked forever',
      '14-day money-back guarantee',
    ],
    gradient: 'from-huttle-primary to-cyan-500',
    tier: 'founder',
  },
  {
    id: 'builder',
    name: 'Builders Club',
    badge: 'Launch pricing',
    annualPrice: 249,
    monthlyEquivalent: '20.75',
    description: 'Launch-only pricing with the same Pro feature access.',
    features: [
      'All Pro features',
      '800 AI generations/month',
      '25GB storage',
      'Priority support',
      'Builders rate locked while active',
      '14-day money-back guarantee',
    ],
    gradient: 'from-sky-500 to-cyan-500',
    tier: 'builder',
  },
];

const FUTURE_PLANS = [
  {
    id: 'essentials',
    name: 'Essentials',
    monthlyPrice: 15,
    annualPrice: 153,
    description: 'Available after the launch window closes.',
    features: ['200 AI generations/month', 'All AI Power Tools', 'Content Vault'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 39,
    annualPrice: 397.8,
    description: 'Available after the launch window closes.',
    features: ['600 AI generations/month', '25GB storage', 'Full Pro feature set'],
  },
];

const PLAN_DETAILS = {
  founder: {
    title: 'Founders Club',
    subtitle: 'Launch member',
    annualLabel: '$199/year locked in forever',
    summary: 'Founders get full Pro access with the highest launch generation allowance and a permanent early-adopter rate.',
    iconGradient: 'from-huttle-primary to-cyan-500',
    accentClasses: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  },
  builder: {
    title: 'Builders Club',
    subtitle: 'Launch member',
    annualLabel: '$249/year while active',
    summary: 'Builders get full Pro access with the same launch feature set and an early pricing lock while the plan stays active.',
    iconGradient: 'from-sky-500 to-cyan-500',
    accentClasses: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  essentials: {
    title: 'Essentials',
    subtitle: 'Paid plan',
    annualLabel: '$15/month or $153/year',
    summary: '200 AI generations per month, 5GB storage, and access to the core Huttle AI workflow.',
    iconGradient: 'from-huttle-primary to-cyan-400',
    accentClasses: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  },
  pro: {
    title: 'Pro',
    subtitle: 'Paid plan',
    annualLabel: '$39/month or $397.80/year',
    summary: '600 AI generations per month, 25GB storage, and the full Pro feature suite.',
    iconGradient: 'from-purple-500 to-pink-500',
    accentClasses: 'border-purple-200 bg-purple-50 text-purple-700',
  },
};

function formatMoney(amount) {
  if (Number.isInteger(amount)) return `$${amount}`;
  return `$${amount.toFixed(2)}`;
}

function formatDate(dateValue) {
  if (!dateValue) return null;
  return new Date(dateValue).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Subscription() {
  const {
    userTier,
    TIERS,
    setDemoTier,
    isDemoMode: contextDemoMode,
    subscription,
    isTrialing,
    trialEndsAt,
    trialDaysRemaining,
    isPastDue,
    isAnnualFounder,
    isCancelScheduled,
    refreshSubscription,
    hasPaidAccess,
    getTierDisplayName,
    loading: subscriptionLoading,
    subscriptionReady,
    subscriptionError,
    isSubscriptionDegraded,
  } = useSubscription();
  const { user } = useContext(AuthContext);
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [billingData, setBillingData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  // Inline banner flag for an HTTP 409 from /api/create-checkout-session
  // (billing account conflict — stripe_customer_id belongs to another auth
  // user). A toast auto-dismisses; this must stay visible on the page.
  const [hasCheckoutConflict, setHasCheckoutConflict] = useState(false);
  const checkoutResetTimeoutRef = useRef(null);

  const demoMode = isDemoMode() || contextDemoMode;
  const showDemoControls = import.meta.env.DEV && demoMode;
  const currentPlanDetails = PLAN_DETAILS[userTier] || null;
  const tierConfig = getTierConfig(subscription?.tier ?? 'free');

  const loadBillingDetails = useCallback(async () => {
    try {
      const [summaryResult, invoicesResult] = await Promise.all([
        getBillingSummary(),
        getBillingInvoices(),
      ]);
      if (summaryResult.success) {
        setBillingData(summaryResult.summary || null);
      }
      if (invoicesResult.success) {
        setInvoices(invoicesResult.invoices || []);
      }
    } catch (err) {
      console.error('Failed to load billing details:', err);
    }
  }, []);

  // Trigger a subscription refresh only when we truly haven't resolved yet.
  // Depending on `subscriptionLoading` here creates an infinite loop for users
  // whose subscription legitimately resolves to null (free tier or degraded
  // state): loading flips true→false while subscription stays null, re-firing
  // this effect on every render. The provider already polls every 60s, so we
  // gate strictly on `subscriptionReady` to avoid re-entering once resolved.
  useEffect(() => {
    if (user?.id && !subscriptionReady && !subscriptionLoading) {
      void refreshSubscription();
    }
  }, [user?.id, refreshSubscription, subscriptionReady, subscriptionLoading]);

  useEffect(() => {
    if (user?.id && hasPaidAccess) {
      void loadBillingDetails();
    }
  }, [user?.id, hasPaidAccess, loadBillingDetails]);

  useEffect(() => () => {
    if (checkoutResetTimeoutRef.current) {
      window.clearTimeout(checkoutResetTimeoutRef.current);
      checkoutResetTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const billingState = searchParams.get('billing');
    if (!billingState) return;

    const nextParams = new URLSearchParams(searchParams);

    if (billingState === 'payment-method-updated') {
      addToast('Your payment method was updated successfully.', 'success');
      clearSubscriptionCache();
      void refreshSubscription();
      void loadBillingDetails();
      nextParams.delete('billing');
      setSearchParams(nextParams, { replace: true });
    }
  }, [addToast, refreshSubscription, loadBillingDetails, searchParams, setSearchParams]);

  const renewalDate = useMemo(
    () => formatDate(subscription?.currentPeriodEnd),
    [subscription?.currentPeriodEnd]
  );
  const startDate = useMemo(
    () => formatDate(subscription?.currentPeriodStart),
    [subscription?.currentPeriodStart]
  );
  const isResolvingSubscription = subscriptionLoading && !subscription && !isSubscriptionDegraded;

  const handleCheckout = async (planId, billingCycle = 'annual') => {
    const checkoutTab = openStripeCheckoutTab();
    setLoading(planId);
    setHasCheckoutConflict(false);

    try {
      const result = await createCheckoutSession(planId, billingCycle, { targetWindow: checkoutTab });

      if (result.demo) {
        if (setDemoTier) {
          const tierMap = {
            founder: TIERS.FOUNDER,
            builder: TIERS.BUILDER,
            essentials: TIERS.ESSENTIALS,
            pro: TIERS.PRO,
          };
          setDemoTier(tierMap[planId] || TIERS.PRO);
        }
        addToast(`${getTierDisplayName(planId)} selected.`, 'success');
        setLoading(null);
        return;
      }

      if (!result.success) {
        // HTTP 409 from /api/create-checkout-session: a stripe_customer_id in
        // our DB belongs to a different Supabase auth user. Do NOT redirect to
        // Stripe or retry — show a sticky inline banner so the user can reach
        // support. stripeAPI.createCheckoutSession surfaces the backend body
        // verbatim as `result.error`, so we match on its stable prefix.
        const errorMessage = result.error || '';
        if (/billing account conflict/i.test(errorMessage)) {
          setHasCheckoutConflict(true);
          if (checkoutTab && !checkoutTab.closed) {
            try { checkoutTab.close(); } catch { /* ignore */ }
          }
        } else {
          addToast(errorMessage || 'Failed to start checkout. Please try again.', 'error');
        }
        setLoading(null);
        return;
      }

      if (result.success && result.url) {
        checkoutResetTimeoutRef.current = window.setTimeout(() => {
          setLoading(null);
          checkoutResetTimeoutRef.current = null;
        }, 5000);
      } else {
        addToast('Checkout session created but no redirect URL was returned.', 'error');
        setLoading(null);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      addToast('Something went wrong. Please try again.', 'error');
      setLoading(null);
    }
  };

  const handleCancelSubscription = () => {
    setShowCancelModal(true);
  };

  const confirmCancelSubscription = async (feedbackData) => {
    setLoading('cancel');

    try {
      if (feedbackData?.reason) {
        const { error } = await supabase.from('cancellation_feedback').insert({
          user_id: user.id,
          subscription_tier: userTier,
          cancellation_reason: feedbackData.reason,
          custom_feedback: feedbackData.customFeedback || null,
        });

        if (error) {
          console.error('Failed to save feedback:', error);
        }
      }

      const result = await cancelSubscription();
      if (!result.success) {
        addToast(result.error || 'Failed to cancel your subscription. Please try again.', 'error');
      } else {
        setShowCancelModal(false);
        addToast(
          `Your subscription has been cancelled. You'll keep access until ${formatDate(result.accessUntil || subscription?.currentPeriodEnd)}.`,
          'success'
        );
        clearSubscriptionCache();
        await refreshSubscription();
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
    const billingCycle = planId === 'founder' || planId === 'builder' ? 'annual' : 'monthly';
    await handleCheckout(planId, billingCycle);
  };

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-12 lg:ml-64 pt-14 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8" data-testid="subscription-page">
      <div className="w-full max-w-5xl mx-auto pt-6 md:pt-0">
        {/* Billing conflict banner (HTTP 409 from /api/create-checkout-session).
            Sticks until the user retries or dismisses — matches the
            degraded-state red banner style used in the free-user view below. */}
        {hasCheckoutConflict && (
          <div
            role="alert"
            data-testid="checkout-conflict-banner"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">Billing account conflict</p>
              <p className="text-sm text-red-700">
                There&apos;s a billing account conflict on this account. Please contact support at{' '}
                <a href="mailto:support@huttleai.com" className="underline font-semibold">
                  support@huttleai.com
                </a>
                .
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHasCheckoutConflict(false)}
              className="text-sm font-semibold text-red-900 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Past due banner */}
        {isPastDue && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">Your payment needs attention</p>
              <p className="text-sm text-amber-800">
                Your subscription is past due. Update your payment details to keep uninterrupted access.
              </p>
            </div>
          </div>
        )}

        {/* Cancellation scheduled banner */}
        {isCancelScheduled && !isAnnualFounder && (
          <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <p className="flex-1 text-sm text-orange-800">
              <span className="font-semibold">Cancellation scheduled.</span> Your access continues until{' '}
              <span className="font-semibold">{renewalDate}</span>. Contact{' '}
              <a href="mailto:support@huttleai.com" className="underline">support@huttleai.com</a> to reactivate.
            </p>
          </div>
        )}

        {/* Dev demo controls */}
        {showDemoControls && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold text-amber-800">Developer Mode Controls</p>
              <p className="text-sm text-amber-700">Tier selector is visible in development only.</p>
            </div>
            <select
              value={userTier || ''}
              onChange={(e) => setDemoTier && setDemoTier(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-amber-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value={TIERS.FOUNDER}>Founders Club</option>
              <option value={TIERS.BUILDER}>Builders Club</option>
              <option value={TIERS.ESSENTIALS}>Essentials</option>
              <option value={TIERS.PRO}>Pro</option>
            </select>
          </div>
        )}

        {/* Loading state */}
        {isResolvingSubscription ? (
          <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
            <div className="flex items-start gap-3">
              <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-huttle-primary flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Checking your billing status</p>
                <p className="mt-1 text-sm text-gray-600">
                  Your subscription page is loading. If Stripe is slow, we&apos;ll keep this page available with safe defaults.
                </p>
              </div>
            </div>
          </div>
        ) : hasPaidAccess ? (
          /* ===== PAID USER VIEW ===== */
          <div className="w-full space-y-6 md:space-y-8">
            {/* Degraded banner */}
            {isSubscriptionDegraded && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">Billing status temporarily unavailable</p>
                  <p className="text-sm text-amber-800">
                    {subscriptionError || 'Could not fully refresh Stripe data. Showing latest available access state.'}
                  </p>
                </div>
                <button onClick={() => refreshSubscription()} className="text-sm font-semibold text-amber-900 hover:text-amber-700">
                  Retry
                </button>
              </div>
            )}

            {/* Page header — matches Full Post Builder / Settings icon shell */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
                {isAnnualFounder ? (
                  <BadgeCheck className="w-6 h-6 md:w-7 md:h-7 text-huttle-primary" aria-hidden />
                ) : (
                  <CreditCard className="w-6 h-6 md:w-7 md:h-7 text-huttle-primary" aria-hidden />
                )}
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                  {isAnnualFounder ? currentPlanDetails?.title : 'Billing'}
                </h1>
                <p className="text-base text-gray-600">
                  {isAnnualFounder ? 'Launch pricing member dashboard' : 'Manage your subscription and billing details'}
                </p>
              </div>
            </div>

            {/* Founder/Builder special card */}
            {isAnnualFounder ? (
              <FoundersMembershipCard
                subscription={subscription}
                user={user}
                onCancelled={refreshSubscription}
                billingData={billingData}
                invoices={invoices}
                onBillingRefresh={loadBillingDetails}
              />
            ) : (
              /* Non-founder tier card */
              <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentPlanDetails?.iconGradient || 'from-huttle-primary to-cyan-400'} flex items-center justify-center shadow-lg`}>
                    {userTier === TIERS.PRO ? <Crown className="w-6 h-6 text-white" /> : <Zap className="w-6 h-6 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold text-gray-900">{currentPlanDetails?.title || getTierDisplayName(userTier)}</h2>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${
                        tierConfig.badgeColor === 'amber'
                          ? 'bg-amber-100 text-amber-700'
                          : tierConfig.badgeColor === 'teal'
                            ? 'bg-[#01BAD2]/15 text-[#008fa3]'
                            : tierConfig.badgeColor === 'teal-light'
                              ? 'bg-[#01BAD2]/10 text-[#00a8bf]'
                              : 'bg-gray-100 text-gray-700'
                      }`}>
                        {tierConfig.badgeColor === 'amber' ? `⭐ ${tierConfig.badgeLabel}` : tierConfig.badgeLabel}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${
                        isTrialing
                          ? 'bg-cyan-100 text-cyan-700'
                          : isPastDue
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${isTrialing ? 'bg-cyan-500' : isPastDue ? 'bg-amber-500' : 'bg-green-500'}`} />
                        {isTrialing ? 'Trialing' : isPastDue ? 'Past Due' : 'Active'}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">{tierConfig.description}</p>

                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold mb-4 ${currentPlanDetails?.accentClasses || 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                      <Sparkles className="w-4 h-4" />
                      {tierConfig.priceLabel}
                    </div>

                    {/* Date stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {startDate && (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">Start Date</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">{startDate}</p>
                        </div>
                      )}
                      {renewalDate && (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
                            {isTrialing ? 'Trial Ends' : 'Renewal Date'}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">{renewalDate}</p>
                        </div>
                      )}
                    </div>

                    {isTrialing && trialEndsAt && (
                      <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
                        <p className="text-sm font-semibold text-cyan-900">
                          {trialDaysRemaining === 0
                            ? 'Your trial ends today.'
                            : `You have ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} left in your trial.`}
                        </p>
                        <p className="text-sm text-cyan-800 mt-1">
                          Trial end date: {formatDate(trialEndsAt)}.
                        </p>
                      </div>
                    )}

                    {tierConfig.canChangePlan && (
                      <div className="flex flex-wrap gap-3">
                        {/* Upgrade/downgrade plan buttons go here */}
                      </div>
                    )}

                    {!tierConfig.canChangePlan && (
                      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-4">
                        {tierConfig.badgeColor === 'amber'
                          ? '⭐ You\'re a Founding Member — your $199/year rate is locked in forever. Your plan cannot be changed.'
                          : '🔒 You\'re a Builder — your $249/year rate is locked in for as long as your plan stays active. Your plan cannot be changed.'}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3 mt-4">
                      <button
                        onClick={handleCancelSubscription}
                        disabled={loading === 'portal' || loading === 'cancel'}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        {loading === 'cancel' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
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
            )}

            {/* Billing management panel for non-founders */}
            {!isAnnualFounder && (
              <BillingManagementPanel
                subscription={subscription}
                userTier={userTier}
                showManageAction={false}
                onSubscriptionUpdated={refreshSubscription}
              />
            )}

            {/* FAQ Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-2">What is your refund policy?</h3>
                  <p className="text-sm text-gray-600">Essentials and Pro plans include a 7-day free trial — you will not be charged until the trial ends. Founders Club and Builders Club include a 14-day money-back guarantee. If you cancel after the applicable window, you keep access through the end of your paid term.</p>
                </div>
                <div className="pb-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h3>
                  <p className="text-sm text-gray-600">Yes. You can cancel at any time from this page. Cancellation stops future charges and you keep access until the end of your current billing period.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Do AI generations roll over?</h3>
                  <p className="text-sm text-gray-600">No. AI generations reset at the beginning of each billing cycle.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ===== FREE/UNPAID USER VIEW (Plan Selection) ===== */
          <div className="w-full space-y-10 md:space-y-12">
            {isSubscriptionDegraded && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900">We couldn&apos;t load your subscription status</p>
                  <p className="text-sm text-red-700">
                    {subscriptionError || 'Billing is temporarily unavailable, showing safe free-tier fallback.'}
                  </p>
                </div>
                <button onClick={() => refreshSubscription()} className="text-sm font-semibold text-red-900 hover:text-red-700">
                  Retry
                </button>
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
                <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-huttle-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Choose Your Launch Plan</h1>
                <p className="text-base text-gray-600">Huttle AI is currently paid-only. Both clubs include full Pro feature access.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {LAUNCH_PLANS.map((plan) => (
                <div key={plan.id} className="relative bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                      plan.id === 'founder'
                        ? 'bg-huttle-primary text-white'
                        : 'bg-sky-50 text-sky-700 border border-sky-200'
                    }`}>
                      {plan.badge}
                    </span>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg`}>
                      {plan.id === 'founder' ? <Award className="w-6 h-6 text-white" /> : <Users className="w-6 h-6 text-white" />}
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{plan.name}</h2>
                  <p className="text-sm text-gray-500 mb-5">{plan.description}</p>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-display font-bold text-gray-900">{formatMoney(plan.annualPrice)}</span>
                      <span className="text-gray-500 font-medium">/year</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6 flex-grow">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-huttle-primary flex-shrink-0" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleCheckout(plan.id, 'annual')}
                    disabled={loading !== null}
                    className="w-full py-3 rounded-xl font-semibold bg-[#01bad2] text-white shadow-md hover:bg-[#00ACC1] disabled:opacity-50 transition-all"
                  >
                    {loading === plan.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      `Choose ${plan.name}`
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Future plans */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <CreditCard className="w-6 h-6 text-huttle-primary" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Future Public Pricing</h2>
                  <p className="text-sm text-gray-600">After Founders and Builders close, these plans become available.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {FUTURE_PLANS.map((plan) => (
                  <div key={plan.id} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mb-3">{plan.description}</p>
                    <p className="text-sm font-semibold text-gray-900">{formatMoney(plan.monthlyPrice)}/month</p>
                    <p className="text-sm text-green-700 font-medium mb-4">{formatMoney(plan.annualPrice)}/year with 15% annual savings</p>
                    <ul className="space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                          <Check className="w-4 h-4 text-huttle-primary flex-shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-gray-500">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span className="text-sm font-medium">Secure payments via Stripe</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium">Cancel anytime</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={confirmCancelSubscription}
        onDowngrade={handleDowngrade}
        currentTier={userTier}
        isLoading={loading === 'cancel'}
        renewalDate={subscription?.currentPeriodEnd}
      />
    </div>
  );
}
