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

  const { user, loading, needsOnboarding, profileChecked } = authContext;

  // RACE CONDITION FIX: Wait for loading, profile check, and subscription before making decisions.
  // This prevents redirecting users who are in the middle of Magic Link authentication.
  if (loading || (user && (!subscriptionReady || !profileChecked))) {
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
    console.log('[ProtectedRoute] onboarding not completed — redirecting to /onboarding for user:', user.id);
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

