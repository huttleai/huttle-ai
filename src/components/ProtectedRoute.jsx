import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const authContext = useContext(AuthContext);
  const location = useLocation();
  const { loading: subLoading, hasPaidAccess } = useSubscription();
  const isSubscriptionRoute = location.pathname === '/dashboard/subscription';

  // Safety check
  if (!authContext) {
    console.error('AuthContext not available in ProtectedRoute');
    return <Navigate to="/dashboard/login" replace />;
  }

  const { user, loading } = authContext;

  // RACE CONDITION FIX: Wait for loading to complete before making auth decisions
  // This prevents redirecting users who are in the middle of Magic Link authentication
  if (loading || (subLoading && !isSubscriptionRoute)) {
    return <LoadingSpinner />;
  }

  // Only redirect to login AFTER loading is complete and we confirm there's no user
  if (!user) {
    return <Navigate to="/dashboard/login" replace />;
  }

  if (!hasPaidAccess && location.pathname !== '/dashboard/subscription') {
    return <Navigate to="/dashboard/subscription" replace />;
  }

  return children;
}

