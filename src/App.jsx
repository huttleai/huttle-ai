import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import DashboardManager from './dashboard/Dashboard';
import PaymentSuccess from './pages/PaymentSuccess';
import FoundersPage from './pages/FoundersPage';

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
        
        {/* Main Dashboard App */}
        <Route path="/dashboard/*" element={<DashboardManager />} />
        
        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
