/**
 * Stripe API Service
 * 
 * Used for:
 * - Subscription management (Freemium, Essentials, Pro)
 * - Payment processing
 * - Billing and invoicing
 * - Usage tracking for AI generations
 */

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

// Note: Most Stripe operations should happen on your backend for security
// This file provides client-side helpers for Stripe Checkout and Elements

export const SUBSCRIPTION_PLANS = {
  FREEMIUM: {
    id: 'freemium',
    name: 'Freemium',
    price: 0,
    priceId: null, // No Stripe price ID for free tier
    features: {
      aiGenerations: 5,
      platforms: 1,
      features: ['Basic Trend Radar', 'Basic Insights', 'Email Support']
    }
  },
  ESSENTIALS: {
    id: 'essentials',
    name: 'Essentials',
    price: 9,
    priceId: import.meta.env.VITE_STRIPE_PRICE_ESSENTIALS || '',
    features: {
      aiGenerations: 50,
      platforms: 5,
      features: [
        'Full Trend Lab',
        'Smart Calendar',
        'Content Library',
        'AI Plan Builder',
        'Priority Support'
      ]
    }
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 19,
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRO || '',
    features: {
      aiGenerations: Infinity,
      platforms: Infinity,
      features: [
        'Unlimited AI Generations',
        'Custom Trend Filters & Alerts',
        'Huttle Agent (Beta)',
        'Advanced Analytics',
        'Auto-Publishing',
        '1-on-1 Onboarding',
        '24/7 Priority Support'
      ]
    }
  }
};

/**
 * Initialize Stripe Checkout Session
 * This should call your backend endpoint that creates a Stripe Checkout session
 */
export async function createCheckoutSession(planId) {
  try {
    const plan = Object.values(SUBSCRIPTION_PLANS).find(p => p.id === planId);
    
    if (!plan || !plan.priceId) {
      throw new Error('Invalid plan selected');
    }

    // Call your backend API to create a checkout session
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId: plan.priceId,
        planId: plan.id,
      }),
    });

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
 */
export async function createPortalSession() {
  try {
    const response = await fetch('/api/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

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
    const response = await fetch('/api/subscription-status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

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
    return {
      success: false,
      error: error.message
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
  
  if (plan.features.aiGenerations === Infinity) {
    return { allowed: true, remaining: Infinity };
  }
  
  const remaining = plan.features.aiGenerations - currentUsage;
  
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit: plan.features.aiGenerations
  };
}

