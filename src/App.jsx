import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import DashboardManager from './dashboard/Dashboard';
import PaymentSuccess from './pages/PaymentSuccess';
import FoundersPage from './pages/FoundersPage';
import { AuthProvider, AuthContext } from './context/AuthContext';

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
    <BrowserRouter>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Founders Club Landing Page */}
        <Route path="/founders" element={<FoundersPage />} />
        
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
        
        {/* Main Dashboard App */}
        <Route path="/dashboard/*" element={<DashboardManager />} />
        
        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
