/**
 * Public-page checkout helpers.
 *
 * Landing CTAs must not open a Stripe tab for logged-out visitors. Auth is
 * required by /api/create-checkout-session, so guests go through signup/login
 * first and resume Checkout afterward.
 */

import { closeCheckoutTab, createCheckoutSession, openStripeCheckoutTab } from '../services/stripeAPI';

const PENDING_CHECKOUT_STORAGE_KEY = 'huttle_pending_checkout';
const ALLOWED_CHECKOUT_PLANS = new Set(['essentials', 'pro']);
const ALLOWED_BILLING_CYCLES = new Set(['monthly', 'annual']);

/** Matches supabase.js auth.storageKey. Kept here to avoid importing the client on the landing page. */
const AUTH_STORAGE_KEY = 'huttle-auth-token';

export function normalizeCheckoutIntent(planId, billingCycle) {
  const plan = String(planId || '').trim().toLowerCase();
  const cycle = String(billingCycle || 'monthly').trim().toLowerCase();
  if (!ALLOWED_CHECKOUT_PLANS.has(plan)) return null;
  return {
    planId: plan,
    billingCycle: ALLOWED_BILLING_CYCLES.has(cycle) ? cycle : 'monthly',
  };
}

export function persistPendingCheckout(planId, billingCycle) {
  const intent = normalizeCheckoutIntent(planId, billingCycle);
  if (!intent || typeof window === 'undefined') return intent;
  try {
    window.sessionStorage.setItem(PENDING_CHECKOUT_STORAGE_KEY, JSON.stringify(intent));
  } catch {
    // sessionStorage can throw in private mode
  }
  return intent;
}

export function consumePendingCheckout() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
    window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeCheckoutIntent(parsed?.planId, parsed?.billingCycle);
  } catch {
    return null;
  }
}

export function consumePendingCheckoutFromPage() {
  let fromQuery = null;
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    fromQuery = normalizeCheckoutIntent(params.get('plan'), params.get('billing'));
  }
  const fromStorage = consumePendingCheckout();
  return fromQuery || fromStorage;
}

export function captureCheckoutIntentFromLocation() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return persistPendingCheckout(params.get('plan'), params.get('billing'));
}

export function getCheckoutSignupPath(planId, billingCycle) {
  const intent = normalizeCheckoutIntent(planId, billingCycle);
  if (!intent) return '/dashboard/signup';
  const params = new URLSearchParams({
    plan: intent.planId,
    billing: intent.billingCycle,
  });
  return `/dashboard/signup?${params.toString()}`;
}

export function getCheckoutLoginPath(planId, billingCycle) {
  const intent = normalizeCheckoutIntent(planId, billingCycle);
  if (!intent) return '/dashboard/login';
  const params = new URLSearchParams({
    plan: intent.planId,
    billing: intent.billingCycle,
  });
  return `/dashboard/login?${params.toString()}`;
}

export function getPendingPlanLabel(planId) {
  if (planId === 'essentials') return 'Essentials';
  if (planId === 'pro') return 'Pro';
  return null;
}

/**
 * Synchronous hint so click handlers can skip opening a checkout tab for
 * logged-out visitors (avoids a blank "Loading secure checkout" tab).
 */
export function hasLikelyAuthSession() {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.access_token || parsed?.currentSession?.access_token);
  } catch {
    return false;
  }
}

function goToSignup(intent, navigate) {
  persistPendingCheckout(intent.planId, intent.billingCycle);
  const path = getCheckoutSignupPath(intent.planId, intent.billingCycle);
  if (typeof navigate === 'function') {
    navigate(path);
  } else {
    window.location.assign(path);
  }
}

/**
 * Start Checkout from a public page. Logged-out visitors are sent to signup
 * with the selected plan. Failures never leave a hanging checkout tab.
 *
 * @param {string} planId
 * @param {string} [billingCycle]
 * @param {{ navigate?: (path: string) => void }} [options]
 */
export async function startPublicCheckout(planId, billingCycle = 'monthly', options = {}) {
  const { navigate } = options;
  const intent = normalizeCheckoutIntent(planId, billingCycle);
  if (!intent) {
    return { success: false, error: 'Invalid plan selected' };
  }

  if (!hasLikelyAuthSession()) {
    goToSignup(intent, navigate);
    return { success: false, redirectedToSignup: true };
  }

  const checkoutTab = openStripeCheckoutTab();
  const result = await createCheckoutSession(intent.planId, intent.billingCycle, {
    targetWindow: checkoutTab,
  });

  if (result.demo) {
    closeCheckoutTab(checkoutTab);
    return {
      success: false,
      demo: true,
      error: 'Checkout is not available yet. Stripe is not configured for this plan.',
    };
  }

  if (!result.success && result.needsAuth) {
    goToSignup(intent, navigate);
    return { ...result, redirectedToSignup: true };
  }

  return result;
}

/**
 * After signup or login, continue to Stripe Checkout if the visitor picked a plan.
 * Navigates the current tab (post-await window.open would be blocked).
 */
export async function resumePendingCheckoutAfterAuth() {
  const intent = consumePendingCheckoutFromPage();
  if (!intent) {
    return { resumed: false, success: false };
  }

  const result = await createCheckoutSession(intent.planId, intent.billingCycle);
  return { resumed: true, ...result };
}
