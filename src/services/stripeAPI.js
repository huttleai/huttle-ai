/**
 * Stripe API Service
 * 
 * Used for:
 * - Subscription management (Freemium, Essentials, Pro)
 * - Payment processing via Stripe Checkout
 * - Billing management via Stripe Customer Portal
 * - Usage tracking for AI generations
 */

import { supabase } from '../config/supabase';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

/** Shown when Vite proxies /api to :3001 but nothing is listening (502/503). */
const LOCAL_API_UNREACHABLE_MESSAGE =
  'Cannot reach the Huttle API (localhost:3001). Run `npm run dev` to start Vite and the local API together, or run `npm run dev:api` in a second terminal.';

const SAFE_SUBSCRIPTION_DEFAULT = {
  subscription: null,
  plan: 'free',
  tier: 'free',
  status: 'unknown',
  currentPeriodStart: null,
  currentPeriodEnd: null,
  trialEnd: null,
  cancelAtPeriodEnd: false,
  cancelledAt: null,
  upcomingPlanChange: null,
  billingCycle: null,
  degraded: true,
};

async function parseJsonResponse(response, fallbackMessage) {
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Vite proxy often returns HTML for 502 when the API process is down
      data = {};
    }
  }
  if (!response.ok) {
    if (import.meta.env.DEV && (response.status === 502 || response.status === 503)) {
      throw new Error(LOCAL_API_UNREACHABLE_MESSAGE);
    }
    throw new Error(data?.error || fallbackMessage);
  }
  return data;
}

function buildSubscriptionStatusResult(overrides = {}) {
  return {
    success: false,
    unauthorized: false,
    shouldRetry: false,
    statusCode: 0,
    ...SAFE_SUBSCRIPTION_DEFAULT,
    ...overrides,
  };
}

// Note: Most Stripe operations should happen on your backend for security
// This file provides client-side helpers for Stripe Checkout and Portal

/**
 * Check if running in demo mode (Stripe not configured)
 * Demo mode allows testing the UI without real Stripe integration
 */
export function isDemoMode() {
  const essentialsMonthly = import.meta.env.VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY;
  const proMonthly = import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY;
  // Demo mode if either price ID is missing or empty
  return !essentialsMonthly || !proMonthly;
}

/**
 * Simulate a successful checkout in demo mode
 * Stores the selected plan in localStorage for demo purposes
 */
export function simulateDemoCheckout(planId) {
  localStorage.setItem('demo_subscription_tier', planId);
  localStorage.setItem('demo_subscription_updated', Date.now().toString());
  return {
    success: true,
    demo: true,
    message: `Demo mode: Simulated upgrade to ${planId}`,
    planId
  };
}

/**
 * Get auth headers for API requests
 */
async function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch {
    console.warn('Could not get auth session for Stripe request');
  }
  
  return headers;
}

export const SUBSCRIPTION_PLANS = {
  ESSENTIALS: {
    id: 'essentials',
    name: 'Essentials',
    monthlyPrice: 15,
    annualPrice: 153,
    priceId: import.meta.env.VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY || '',
    annualPriceId: import.meta.env.VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL || '',
    features: {
      aiGenerations: 150,
      storageGB: 5,
      features: [
        'All core Huttle AI tools',
        '150 AI generations/month',
        '5GB storage',
        'AI Plan Builder',
        'Full Trend Lab access',
        'Email Support'
      ]
    }
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 39,
    annualPrice: 397.8,
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY || '',
    annualPriceId: import.meta.env.VITE_STRIPE_PRICE_PRO_ANNUAL || '',
    features: {
      aiGenerations: 600,
      storageGB: 50,
      features: [
        'Everything in Essentials',
        '600 AI generations/month',
        '50GB storage',
        'Content Repurposer',
        'Trend Forecaster',
        'Huttle Agent',
        'Priority Email Support'
      ]
    }
  },
  BUILDER: {
    id: 'builder',
    name: 'Builders Club',
    monthlyPrice: null,
    annualPrice: 249,
    priceId: null,
    annualPriceId: import.meta.env.VITE_STRIPE_PRICE_BUILDER_ANNUAL || import.meta.env.VITE_STRIPE_PRICE_BUILDERS_ANNUAL || '',
    features: {
      aiGenerations: 800,
      storageGB: 50,
      features: [
        'Everything in Pro',
        '800 AI generations/month',
        '50GB storage',
        'Locked-in Builders pricing',
        'All future Pro features included',
        'Priority support'
      ]
    }
  },
  FOUNDER: {
    id: 'founder',
    name: 'Founders Club',
    monthlyPrice: null, // Annual only
    annualPrice: 199,
    priceId: null,
    annualPriceId: import.meta.env.VITE_STRIPE_PRICE_FOUNDER_ANNUAL || '',
    features: {
      aiGenerations: 800,
      storageGB: 50,
      features: [
        'Everything in Pro',
        '800 AI generations/month',
        '50GB storage',
        'Locked-in Founders pricing forever',
        'All future features included',
        'Priority support',
        'Founders Club badge'
      ]
    }
  }
};

/**
 * Initialize Stripe Checkout Session
 * This calls your backend endpoint that creates a Stripe Checkout session
 * 
 * @param {string} planId - The plan ID (essentials or pro)
 * @param {string} billingCycle - 'monthly' or 'annual'
 */
export async function createCheckoutSession(planId, billingCycle = 'monthly') {
  try {
    
    const plan = Object.values(SUBSCRIPTION_PLANS).find(p => p.id === planId);
    
    if (!plan) {
      throw new Error('Invalid plan selected');
    }

    // Price IDs: Essentials/Pro use VITE_STRIPE_PRICE_*_MONTHLY + _ANNUAL; Founders/Builders are annual-only
    // (priceId null, annualPriceId from VITE_STRIPE_PRICE_FOUNDER_ANNUAL / BUILDER_ANNUAL). Never send monthly for those.
    const monthlyPriceMissing =
      plan.monthlyPrice == null || !plan.priceId || String(plan.priceId).trim() === '';
    const effectiveBillingCycle = monthlyPriceMissing ? 'annual' : billingCycle;
    const priceId =
      effectiveBillingCycle === 'annual' ? plan.annualPriceId : plan.priceId;
    
    // Demo mode: Simulate successful checkout without Stripe
    if (!priceId || isDemoMode()) {
      return simulateDemoCheckout(planId);
    }

    // Call your backend API to create a checkout session
    const headers = await getAuthHeaders();
    
    let response;
    try {
      response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          priceId,
          planId: plan.id,
          billingCycle: effectiveBillingCycle,
        }),
      });
    } catch (fetchError) {
      console.error('Checkout fetch error:', fetchError.message);
      throw new Error(`Network error: ${fetchError.message}`);
    }
    
    if (!response.ok) {
      let errorData = {};
      try {
        const errorText = await response.text();
        errorData = JSON.parse(errorText);
      } catch {
        // Response wasn't JSON - use default error
      }
      throw new Error(errorData.error || `Failed to create checkout session (${response.status})`);
    }

    let data;
    try {
      const responseText = await response.text();
      data = JSON.parse(responseText);
    } catch {
      throw new Error('Invalid response from server');
    }
    
    if (data.url) {
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } else {
      throw new Error('No checkout URL received from server');
    }

    return {
      success: true,
      sessionId: data.sessionId,
      url: data.url
    };
  } catch (error) {
    console.error('Stripe Checkout Error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create Portal Session for managing subscription
 * Opens Stripe Customer Portal where users can:
 * - Update payment method
 * - View invoices
 * - Cancel subscription
 * - Change plan
 */
export async function createPortalSession({ userId = null, returnUrl = null } = {}) {
  try {
    // Demo mode: Show message instead of opening portal
    if (isDemoMode()) {
      return {
        success: true,
        demo: true,
        message: 'Demo mode: Billing portal simulated. In production, this opens Stripe Customer Portal.'
      };
    }

    const headers = await getAuthHeaders();
    const response = await fetch('/api/create-portal-session', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: userId,
        return_url: returnUrl || window.location.href,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create portal session');
    }

    const data = await response.json();
    
    if (data.url) {
      window.location.href = data.url;
    }

    return {
      success: true,
      url: data.url
    };
  } catch (error) {
    console.error('Stripe Portal Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function createPaymentMethodUpdateSession({ returnUrl = null } = {}) {
  try {
    if (isDemoMode()) {
      return {
        success: true,
        demo: true,
        message: 'Demo mode: billing management simulated.',
      };
    }

    const headers = await getAuthHeaders();
    const response = await fetch('/api/create-payment-method-update-session', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        return_url: returnUrl || window.location.href,
      }),
    });

    const data = await parseJsonResponse(response, 'Failed to open payment method update flow');
    if (data.url) {
      window.location.href = data.url;
    }

    return { success: true, url: data.url };
  } catch (error) {
    console.error('Payment Method Update Error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function getBillingSummary() {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/billing-summary', {
      method: 'GET',
      headers,
    });

    const data = await parseJsonResponse(response, 'Failed to load billing summary');
    return {
      success: true,
      summary: data.summary || null,
    };
  } catch (error) {
    console.error('Billing Summary Error:', error);
    return {
      success: false,
      error: error.message,
      summary: null,
    };
  }
}

export async function getBillingInvoices() {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/billing-invoices', {
      method: 'GET',
      headers,
    });

    const data = await parseJsonResponse(response, 'Failed to load invoices');
    return {
      success: true,
      invoices: Array.isArray(data.invoices) ? data.invoices : [],
    };
  } catch (error) {
    console.error('Billing Invoices Error:', error);
    return {
      success: false,
      error: error.message,
      invoices: [],
    };
  }
}

export async function cancelSubscription() {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/cancel-subscription', {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });

    const data = await parseJsonResponse(response, 'Failed to cancel subscription');
    return {
      success: true,
      accessUntil: data.access_until || null,
    };
  } catch (error) {
    console.error('Cancel Subscription Error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function changeSubscriptionPlan({ targetPlanId, billingCycle = 'monthly' }) {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/change-subscription-plan', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        target_plan_id: targetPlanId,
        billing_cycle: billingCycle,
      }),
    });

    const data = await parseJsonResponse(response, 'Failed to change subscription plan');
    return {
      success: true,
      mode: data.mode || 'immediate',
      message: data.message || null,
      effectiveAt: data.effective_at || null,
    };
  } catch (error) {
    console.error('Change Subscription Plan Error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus(options = {}) {
  const { signal } = options;

  try {
    const headers = await getAuthHeaders();
    if (!headers.Authorization) {
      return buildSubscriptionStatusResult({
        unauthorized: true,
        statusCode: 401,
        plan: null,
        tier: null,
        status: 'inactive',
        degraded: false,
      });
    }

    let response;
    try {
      response = await fetch('/api/subscription-status', {
        method: 'GET',
        headers,
        signal,
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        return buildSubscriptionStatusResult({
          shouldRetry: false,
          error: 'Subscription status request was aborted.',
        });
      }

      console.error('Subscription Status Error:', error);
      return buildSubscriptionStatusResult({
        shouldRetry: true,
        error: error.message || 'Failed to fetch subscription status.',
      });
    }

    if (!response.ok) {
      if (response.status === 401) {
        return buildSubscriptionStatusResult({
          unauthorized: true,
          statusCode: 401,
          plan: null,
          tier: null,
          status: 'inactive',
          degraded: false,
        });
      }

      const isApiDown =
        import.meta.env.DEV && (response.status === 502 || response.status === 503);

      return buildSubscriptionStatusResult({
        shouldRetry: response.status >= 500 || response.status === 408 || response.status === 429,
        statusCode: response.status,
        error: isApiDown
          ? LOCAL_API_UNREACHABLE_MESSAGE
          : `Subscription status request failed with ${response.status}.`,
      });
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      console.error('Subscription status parse error:', error);
      return buildSubscriptionStatusResult({
        shouldRetry: true,
        statusCode: response.status,
        error: 'Subscription status response was invalid JSON.',
      });
    }
    
    return {
      success: true,
      unauthorized: false,
      shouldRetry: false,
      statusCode: response.status,
      subscription: data.subscription,
      plan: data.plan ?? SAFE_SUBSCRIPTION_DEFAULT.plan,
      tier: data.tier ?? data.plan ?? SAFE_SUBSCRIPTION_DEFAULT.tier,
      status: data.status,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
      trialEnd: data.trialEnd,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      cancelledAt: data.cancelledAt,
      upcomingPlanChange: data.upcomingPlanChange,
      billingCycle: data.subscription?.billingCycle ?? data.billingCycle ?? null,
      degraded: false,
    };
  } catch (error) {
    console.error('Subscription Status Error:', error);
    return buildSubscriptionStatusResult({
      shouldRetry: error?.name !== 'AbortError',
      error: error.message || 'Subscription status request failed.',
    });
  }
}

/**
 * Track AI generation usage
 */
export function trackAIGeneration(userId, feature) {
  // This could be stored locally and synced with backend
  const usage = JSON.parse(localStorage.getItem('aiUsage') || '{}');
  const today = new Date().toISOString().split('T')[0];
  
  if (!usage[today]) {
    usage[today] = { total: 0, byFeature: {} };
  }
  
  usage[today].total += 1;
  usage[today].byFeature[feature] = (usage[today].byFeature[feature] || 0) + 1;
  
  localStorage.setItem('aiUsage', JSON.stringify(usage));
  
  return usage[today].total;
}

/**
 * Get current AI generation count
 */
export function getAIGenerationCount() {
  const usage = JSON.parse(localStorage.getItem('aiUsage') || '{}');
  const today = new Date().toISOString().split('T')[0];
  
  return usage[today]?.total || 0;
}

/**
 * Check if user can generate more content based on plan
 */
export function canGenerateContent(currentPlan = null) {
  const normalizedPlan = String(currentPlan || '').toUpperCase();
  const plan = SUBSCRIPTION_PLANS[normalizedPlan];
  const currentUsage = getAIGenerationCount();
  
  if (!plan) {
    return { allowed: false, remaining: 0, limit: 0 };
  }
  
  const limit = plan.features.aiGenerations;
  const remaining = limit - currentUsage;
  
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit
  };
}

/**
 * Get plan by ID
 */
export function getPlanById(planId) {
  return Object.values(SUBSCRIPTION_PLANS).find(p => p.id === planId) || null;
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured() {
  return !!STRIPE_PUBLISHABLE_KEY;
}
