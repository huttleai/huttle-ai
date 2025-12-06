import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { BrandProvider } from './context/BrandContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import { ContentProvider } from './context/ContentContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import SmartCalendar from './pages/SmartCalendar';
import ContentLibrary from './pages/ContentLibrary';
import AIPlanBuilder from './pages/AIPlanBuilder';
import TrendLab from './pages/TrendLab';
import HuttleAgent from './pages/HuttleAgent';
import Profile from './pages/Profile';
import BrandVoice from './pages/BrandVoice';
import Subscription from './pages/Subscription';
import Settings from './pages/Settings';
import Help from './pages/Help';
import SocialUpdates from './pages/SocialUpdates';
import AITools from './pages/AITools';
import ContentRepurposer from './pages/ContentRepurposer';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Security from './pages/Security';
import OnboardingQuiz from './components/OnboardingQuiz';

function AppContent() {
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

  const { user, loading, needsOnboarding, completeOnboarding } = authContext;

  // Show loading state while checking auth (with timeout fallback)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-huttle-primary mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading...</p>
          <p className="text-xs text-gray-400 mt-2">
            If this takes too long, check console for errors
          </p>
        </div>
      </div>
    );
  }

  // If user is logged in, show the main app layout
  if (user) {
    // Show onboarding quiz if user hasn't completed it
    if (needsOnboarding) {
      return <OnboardingQuiz onComplete={completeOnboarding} />;
    }

    return (
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <Sidebar />
        <TopHeader />
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><SmartCalendar /></ProtectedRoute>} />
          <Route path="/library" element={<ProtectedRoute><ContentLibrary /></ProtectedRoute>} />
          <Route path="/plan-builder" element={<ProtectedRoute><AIPlanBuilder /></ProtectedRoute>} />
          <Route path="/trend-lab" element={<ProtectedRoute><TrendLab /></ProtectedRoute>} />
          <Route path="/ai-tools" element={<ProtectedRoute><AITools /></ProtectedRoute>} />
          <Route path="/repurposer" element={<ProtectedRoute><ContentRepurposer /></ProtectedRoute>} />
          <Route path="/agent" element={<ProtectedRoute><HuttleAgent /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/brand-voice" element={<ProtectedRoute><BrandVoice /></ProtectedRoute>} />
          <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
          <Route path="/social-updates" element={<ProtectedRoute><SocialUpdates /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/security" element={<ProtectedRoute><Security /></ProtectedRoute>} />
          <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    );
  }

  // If user is not logged in, show auth pages
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrandProvider>
          <ToastProvider>
            <NotificationProvider>
              <SubscriptionProvider>
                <ContentProvider>
                  <BrowserRouter>
                    <AppContent />
                  </BrowserRouter>
                </ContentProvider>
              </SubscriptionProvider>
            </NotificationProvider>
          </ToastProvider>
        </BrandProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
