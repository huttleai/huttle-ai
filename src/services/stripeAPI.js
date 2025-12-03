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

// Note: Most Stripe operations should happen on your backend for security
// This file provides client-side helpers for Stripe Checkout and Portal

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
  } catch (e) {
    console.warn('Could not get auth session:', e);
  }
  
  return headers;
}

export const SUBSCRIPTION_PLANS = {
  FREEMIUM: {
    id: 'freemium',
    name: 'Freemium',
    monthlyPrice: 0,
    annualPrice: 0,
    priceId: null, // No Stripe price ID for free tier
    annualPriceId: null,
    features: {
      aiGenerations: 20,
      storageGB: 0.25, // 250MB
      features: [
        'Smart Calendar',
        'Content Library (250MB)',
        'Trending Now',
        'Hashtags of the Day',
        'All AI Power Tools',
        'Daily Alerts',
        'AI-Powered Insights',
        'AI Plan Builder (7 days)'
      ]
    }
  },
  ESSENTIALS: {
    id: 'essentials',
    name: 'Essentials',
    monthlyPrice: 9,
    annualPrice: 90,
    priceId: import.meta.env.VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY || '',
    annualPriceId: import.meta.env.VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL || '',
    features: {
      aiGenerations: 200,
      storageGB: 5,
      features: [
        'Everything in Freemium',
        '200 AI generations/month',
        '5GB storage',
        'AI Plan Builder (7 & 14 days)',
        'Full Trend Lab access',
        'Email Support'
      ]
    }
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 19,
    annualPrice: 190,
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY || '',
    annualPriceId: import.meta.env.VITE_STRIPE_PRICE_PRO_ANNUAL || '',
    features: {
      aiGenerations: 800,
      storageGB: 25,
      features: [
        'Everything in Essentials',
        '800 AI generations/month',
        '25GB storage',
        'Content Repurposer',
        'Trend Forecaster',
        'Huttle Agent (Coming Soon)',
        'Priority Email Support'
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

    // Get the correct price ID based on billing cycle
    const priceId = billingCycle === 'annual' ? plan.annualPriceId : plan.priceId;
    
    if (!priceId) {
      throw new Error('Price not configured for this plan. Please contact support.');
    }

    // Call your backend API to create a checkout session
    const headers = await getAuthHeaders();
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        priceId,
        planId: plan.id,
        billingCycle,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const data = await response.json();
    
    if (data.url) {
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    }

    return {
      success: true,
      sessionId: data.sessionId,
      url: data.url
    };
  } catch (error) {
    console.error('Stripe Checkout Error:', error);
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
export async function createPortalSession() {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/create-portal-session', {
      method: 'POST',
      headers,
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

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus() {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/subscription-status', {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      // Return default free status if endpoint not available
      return {
        success: true,
        subscription: null,
        plan: 'freemium',
        status: 'active',
        currentPeriodEnd: null
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      subscription: data.subscription,
      plan: data.plan,
      status: data.status,
      currentPeriodEnd: data.currentPeriodEnd
    };
  } catch (error) {
    console.error('Subscription Status Error:', error);
    // Return default free status on error
    return {
      success: true,
      subscription: null,
      plan: 'freemium',
      status: 'active',
      currentPeriodEnd: null
    };
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
export function canGenerateContent(currentPlan = 'freemium') {
  const plan = SUBSCRIPTION_PLANS[currentPlan.toUpperCase()];
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
  return Object.values(SUBSCRIPTION_PLANS).find(p => p.id === planId) || SUBSCRIPTION_PLANS.FREEMIUM;
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured() {
  return !!STRIPE_PUBLISHABLE_KEY;
}
