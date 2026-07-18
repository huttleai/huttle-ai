import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const authContext = useContext(AuthContext);
  const { subscriptionReady } = useSubscription();

  // Safety check
  if (!authContext) {
    console.error('AuthContext not available in ProtectedRoute');
    return <Navigate to="/dashboard/login" replace />;
  }

  const { user, loading, needsOnboarding, profileChecked, sessionConfirmed } = authContext;

  // RACE CONDITION FIX: Wait for loading, session confirmation, profile check, and
  // subscription before making decisions. A cached user without a confirmed session
  // must not open the dashboard (AI/billing calls would 401), and a subscription
  // that has not resolved (including degraded retries with no last-known tier) must
  // not be treated as FREE. Degraded-but-usable loads set subscriptionReady=true
  // with the last-known tier, so paying users are never locked out here.
  if (loading || (user && (!sessionConfirmed || !subscriptionReady || !profileChecked))) {
    return <LoadingSpinner fullScreen text="Loading…" variant="huttle" />;
  }

  // Only redirect to login AFTER loading is complete and we confirm there's no user.
  if (!user) {
    return <Navigate to="/dashboard/login" replace />;
  }

  // Bug 3 Fix: Hard-block every /dashboard/* route until onboarding is complete.
  // This check runs on every route navigation (each ProtectedRoute instance mounts/unmounts
  // independently), so it cannot be bypassed by navigating directly to a dashboard URL.
  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

