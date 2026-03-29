import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import React, { Suspense, useContext } from 'react';
import { AuthProvider, AuthContext } from '../context/AuthContext';
import { BrandProvider } from '../context/BrandContext';
import { ToastProvider } from '../context/ToastContext';
import { NotificationProvider } from '../context/NotificationContext';
import { ContentProvider } from '../context/ContentContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import { DashboardProvider } from '../context/DashboardContext'; // HUTTLE AI: cache fix
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import { MobileNavProvider } from '../context/MobileNavContext';
import ProtectedRoute from '../components/ProtectedRoute';
import ErrorBoundary from '../components/ErrorBoundary';
import LoadingSpinner from '../components/LoadingSpinner';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import Security from '../pages/Security';
import SecureAccount from '../pages/SecureAccount';
import OnboardingQuiz from '../components/OnboardingQuiz';
import useNotificationGenerator from '../hooks/useNotificationGenerator';

const lazyWithRetry = (factory) =>
  React.lazy(() =>
    factory().catch((err) => {
      const isChunkError =
        err?.name === 'ChunkLoadError' ||
        (err?.message && (
          err.message.includes('Failed to fetch dynamically imported module') ||
          err.message.includes('Importing a module script failed') ||
          err.message.includes('Unable to preload CSS')
        ));
      if (isChunkError && !sessionStorage.getItem('_chunk_reload')) {
        sessionStorage.setItem('_chunk_reload', '1');
        window.location.reload();
        return new Promise(() => {});
      }
      throw err;
    })
  );

const Dashboard = lazyWithRetry(() => import('../pages/Dashboard'));
const ContentLibrary = lazyWithRetry(() => import('../pages/ContentLibrary'));
const AIPlanBuilder = lazyWithRetry(() => import('../pages/AIPlanBuilder'));
const TrendLab = lazyWithRetry(() => import('../pages/TrendLab'));
const IgniteEngine = lazyWithRetry(() => import('../pages/IgniteEngine'));
const ContentRemix = lazyWithRetry(() => import('../pages/ContentRemix'));
const BrandVoice = lazyWithRetry(() => import('../pages/BrandVoice'));
const Subscription = lazyWithRetry(() => import('../pages/Subscription'));
const Settings = lazyWithRetry(() => import('../pages/Settings'));
const Help = lazyWithRetry(() => import('../pages/Help'));
const SocialUpdates = lazyWithRetry(() => import('../pages/SocialUpdates'));
const AITools = lazyWithRetry(() => import('../pages/AITools'));
const FullPostBuilder = lazyWithRetry(() => import('../pages/FullPostBuilder'));
const PostKitPage = lazyWithRetry(() => import('../pages/PostKit'));
const PostKitNew = lazyWithRetry(() => import('../pages/PostKit').then((m) => ({ default: m.PostKitNew })));
const SmartCalendar = lazyWithRetry(() => import('../pages/SmartCalendar'));
const NicheIntel = lazyWithRetry(() => import('../pages/NicheIntel'));
const IPhoneMockupDemo = lazyWithRetry(() => import('../components/IPhoneMockupDemo'));
const MockupShowcase = lazyWithRetry(() => import('../pages/MockupShowcase'));

function DashboardRouteFallback() {
  return <LoadingSpinner fullScreen variant="huttle" text="Loading…" />;
}

function AppContent({ secureAccountMode = false, onboardingMode = false }) {
  const authContext = useContext(AuthContext);
  
  // Safety check - if context is undefined, show error
  if (!authContext) {
    console.error('AuthContext is not available. This should not happen.');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Configuration Error</h1>
          <p className="text-gray-600">AuthContext is not available. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  const { user, loading, needsOnboarding, profileChecked, completeOnboarding } = authContext;

  useNotificationGenerator();

  // Show loading state while checking auth OR while profile is being checked
  // CRITICAL: Wait for BOTH auth loading AND profile check to complete
  // RACE CONDITION FIX: Always wait for loading to finish before making decisions
  if (loading || (user && !profileChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-huttle-primary mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">
            {loading ? 'Loading...' : 'Checking your profile...'}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            This is taking a little longer than usual — please hang tight.
          </p>
        </div>
      </div>
    );
  }

  // SECURE ACCOUNT MODE: Protected password-setup page
  // User clicks invite email -> Supabase logs them in -> renders SecureAccount
  // This runs BEFORE onboarding gatekeeper since they need to set password first
  // RACE CONDITION FIX: This check now happens AFTER loading is complete,
  // so Magic Link sessions have time to establish before we check user state
  if (secureAccountMode) {
    if (!user) {
      return <Navigate to="/dashboard/login" replace />;
    }
    return <SecureAccount />;
  }

  if (onboardingMode) {
    if (!user) {
      return <Navigate to="/dashboard/login" replace />;
    }

    if (needsOnboarding) {
      return <OnboardingQuiz onComplete={completeOnboarding} />;
    }

    return <Navigate to="/dashboard" replace />;
  }

  // If user is logged in, show the main app layout
  if (user) {
    if (needsOnboarding) {
      return <Navigate to="/onboarding" replace />;
    }

    return (
      <MobileNavProvider>
        <div className="flex min-h-screen min-w-0 bg-gradient-to-br from-gray-50 via-white to-gray-50">
          <Sidebar />
          <TopHeader />
          <Suspense fallback={<DashboardRouteFallback />}>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><SmartCalendar /></ProtectedRoute>} />
            <Route path="/library" element={<ProtectedRoute><ContentLibrary /></ProtectedRoute>} />
            <Route path="/plan-builder" element={<ProtectedRoute><AIPlanBuilder /></ProtectedRoute>} />
            <Route path="/trend-lab" element={<ProtectedRoute><TrendLab /></ProtectedRoute>} />
            <Route path="/ignite-engine" element={<ProtectedRoute><IgniteEngine /></ProtectedRoute>} />
            <Route path="/content-remix" element={<ProtectedRoute><ContentRemix /></ProtectedRoute>} />
            <Route path="/ai-tools" element={<ProtectedRoute><AITools /></ProtectedRoute>} />
            <Route path="/full-post-builder" element={<ProtectedRoute><FullPostBuilder /></ProtectedRoute>} />
            <Route path="/post-kit/new" element={<ProtectedRoute><PostKitNew /></ProtectedRoute>} />
            <Route path="/post-kit/:kitId" element={<ProtectedRoute><PostKitPage /></ProtectedRoute>} />
            <Route path="/niche-intel" element={<ProtectedRoute><NicheIntel /></ProtectedRoute>} />
            <Route path="/profile" element={<Navigate to="/dashboard/brand-voice" replace />} />
            <Route path="/brand-voice" element={<ProtectedRoute><BrandVoice /></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
            <Route path="/social-updates" element={<ProtectedRoute><SocialUpdates /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/security" element={<ProtectedRoute><Security /></ProtectedRoute>} />
            <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
            <Route path="/mockup-demo" element={<ProtectedRoute><IPhoneMockupDemo /></ProtectedRoute>} />
            <Route path="/mockup-showcase" element={<ProtectedRoute><MockupShowcase /></ProtectedRoute>} />
            <Route path="login" element={<Navigate to="/dashboard" replace />} />
            <Route path="signup" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
        </div>
      </MobileNavProvider>
    );
  }

  // If user is not logged in, show auth pages
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route path="signup" element={<Signup />} />
      <Route path="*" element={<Navigate to="/dashboard/login" replace />} />
    </Routes>
  );
}

export default function DashboardManager({ secureAccountMode = false, onboardingMode = false }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrandProvider>
          <ToastProvider>
            <NotificationProvider>
              <SubscriptionProvider>
                <DashboardProvider> {/* HUTTLE AI: cache fix */}
                  <ContentProvider> {/* HUTTLE AI: cache fix */}
                      <AppContent secureAccountMode={secureAccountMode} onboardingMode={onboardingMode} /> {/* HUTTLE AI: cache fix */}
                  </ContentProvider> {/* HUTTLE AI: cache fix */}
                </DashboardProvider> {/* HUTTLE AI: cache fix */}
              </SubscriptionProvider>
            </NotificationProvider>
          </ToastProvider>
        </BrandProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
