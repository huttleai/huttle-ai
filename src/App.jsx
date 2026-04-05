import React, { useContext, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import { AuthProvider, AuthContext } from './context/AuthContext';

const CHUNK_RELOAD_KEY = '_chunk_reload_at';
const CHUNK_RELOAD_WINDOW_MS = 30_000;

const lazyWithRetry = (factory) =>
  lazy(() =>
    factory().catch((err) => {
      const isChunkError =
        err?.name === 'ChunkLoadError' ||
        (err?.message && (
          err.message.includes('Failed to fetch dynamically imported module') ||
          err.message.includes('Importing a module script failed') ||
          err.message.includes('Unable to preload CSS')
        ));

      if (isChunkError) {
        const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
        const recentlyReloaded = Date.now() - lastReload < CHUNK_RELOAD_WINDOW_MS;
        if (!recentlyReloaded) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
          window.location.reload();
          return new Promise(() => {});
        }
      }

      throw err;
    })
  );

const LandingPage = lazyWithRetry(() => import('./LandingPage'));
const DashboardManager = lazyWithRetry(() => import('./dashboard/Dashboard'));
const PaymentSuccess = lazyWithRetry(() => import('./pages/PaymentSuccess'));
const FoundersPage = lazyWithRetry(() => import('./pages/FoundersPage'));
const TermsOfService = lazyWithRetry(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'));
const RefundPolicy = lazyWithRetry(() => import('./pages/RefundPolicy'));

/**
 * Smart login route: redirects authenticated users to /dashboard,
 * shows login form for guests by forwarding to /dashboard/login.
 */
function LoginRoute() {
  const authContext = useContext(AuthContext);
  const { user, loading } = authContext || {};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-huttle-primary"></div>
      </div>
    );
  }

  // Logged-in users go straight to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Guests are forwarded to the dashboard login page
  return <Navigate to="/dashboard/login" replace />;
}

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ScrollToTop />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-huttle-primary"></div></div>}>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Founders Club Landing Page */}
        <Route path="/founders" element={<FoundersPage />} />
        
        {/* Legal Pages (public, no auth) */}
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        
        {/* Payment Success Page */}
        <Route path="/payment-success" element={<PaymentSuccess />} />
        
        {/* Secure Account - Protected, handled inside DashboardManager with auth context */}
        <Route path="/secure-account" element={<DashboardManager secureAccountMode />} />
        
        {/* Login route - redirects logged-in users to /dashboard, guests to /dashboard/login */}
        <Route path="/login" element={
          <AuthProvider>
            <LoginRoute />
          </AuthProvider>
        } />
        
        {/* Onboarding Gate */}
        <Route path="/onboarding" element={<DashboardManager onboardingMode />} />

        {/* Main Dashboard App */}
        <Route path="/dashboard/*" element={<DashboardManager />} />
        
        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
