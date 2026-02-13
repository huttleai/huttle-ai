import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const authContext = useContext(AuthContext);
  const { loading: subLoading } = useSubscription();

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

  // Founders Only: All authenticated users have full access — no tier checks needed.
  // Subscription gating will be re-introduced when monthly plans launch.

  return children;
}

