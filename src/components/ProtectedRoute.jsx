import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const authContext = useContext(AuthContext);
  const { userTier, TIERS, loading: subLoading } = useSubscription();
  const location = useLocation();

  // Safety check
  if (!authContext) {
    console.error('AuthContext not available in ProtectedRoute');
    return <Navigate to="/dashboard/login" replace />;
  }

  const { user, loading } = authContext;

  // RACE CONDITION FIX: Wait for loading to complete before making auth decisions
  // This prevents redirecting users who are in the middle of Magic Link authentication
  if (loading || subLoading) {
    return <LoadingSpinner />;
  }

  // Only redirect to login AFTER loading is complete and we confirm there's no user
  if (!user) {
    console.log('🚫 [ProtectedRoute] No user found after loading, redirecting to login');
    return <Navigate to="/dashboard/login" replace />;
  }

  // Allow access to subscription page even without active subscription
  const isSubscriptionPage = location.pathname === '/dashboard/subscription';
  const isProfilePage = location.pathname === '/dashboard/profile';
  const isSettingsPage = location.pathname === '/dashboard/settings';
  const isHelpPage = location.pathname === '/dashboard/help';
  
  // If user has no active subscription (tier is 'free' could mean they never paid),
  // check if they have genuinely completed payment. Founders Club members will have
  // 'founder' tier set by the Stripe webhook. If tier is still 'free' after signup,
  // it means payment hasn't been confirmed yet.
  // Allow exempted pages so they can manage their subscription.
  const exemptPages = isSubscriptionPage || isProfilePage || isSettingsPage || isHelpPage;
  
  // Dev/demo mode bypass
  const skipAuth = import.meta.env.DEV === true && import.meta.env.VITE_SKIP_AUTH === 'true';
  
  if (!skipAuth && !exemptPages && userTier === TIERS.FREE) {
    // Check if user was supposed to pay - only redirect if they just signed up
    // We check if they have NO subscription at all (not even free tier tracking)
    // This prevents blocking users who legitimately have a free tier
    // For now, since all signups require payment, redirect free users to subscription
    const hasCompletedPayment = localStorage.getItem(`payment_confirmed_${user.id}`);
    if (!hasCompletedPayment) {
      return <Navigate to="/dashboard/subscription" replace />;
    }
  }

  return children;
}

