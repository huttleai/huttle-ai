import React, { useContext, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import MetaPixelRouteTracker from './components/MetaPixelRouteTracker';
import { AuthProvider, AuthContext } from './context/AuthContext';

const LandingPage = lazy(() => import('./LandingPage'));
const DashboardManager = lazy(() => import('./dashboard/Dashboard'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const RefundPolicy = lazy(() => import('./pages/RefundPolicy'));

/**
 * Smart login route: redirects authenticated users to /dashboard,
 * shows login form for guests by forwarding to /dashboard/login.
 */
function LoginRoute() {
  const authContext = useContext(AuthContext);
  const location = useLocation();
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
  return <Navigate to={`/dashboard/login${location.search}${location.hash}`} replace />;
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
      <MetaPixelRouteTracker />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-huttle-primary"></div></div>}>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Current plans. Retired Founders/Builders marketing URLs redirect here. */}
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/founders" element={<Navigate to="/pricing" replace />} />
        <Route path="/builders" element={<Navigate to="/pricing" replace />} />
        
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
