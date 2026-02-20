import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { supabase } from '../config/supabase';
import { Lock, Loader, ShieldCheck, Sparkles, Calendar, TrendingUp, Zap, Eye, EyeOff } from 'lucide-react';

export default function SecureAccount() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const validate = () => {
    setError('');

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      const { error: supaError } = await supabase.auth.updateUser({ password });

      if (supaError) throw supaError;

      addToast('Account secured! Welcome to Huttle AI.', 'success');
      navigate('/dashboard');
    } catch (err) {
      console.error('Error setting password:', err);
      addToast(err.message || 'Failed to set password. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Sparkles, text: 'AI-powered content generation' },
    { icon: Calendar, text: 'Smart scheduling & planning' },
    { icon: TrendingUp, text: 'Trend analysis & forecasting' },
    { icon: Zap, text: 'Boost engagement instantly' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gray-900">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-huttle-blue/10 via-transparent to-huttle-cyan/10" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 w-full">
          {/* Logo */}
          <div className="mb-12">
            <img 
              src="/huttle-logo.png" 
              alt="Huttle AI" 
              className="h-9 w-auto brightness-0 invert"
            />
          </div>

          {/* Headline */}
          <div className="mb-12">
            <h1 className="text-4xl font-semibold text-white mb-4 leading-tight">
              Your AI Creative Director
              <br />
              <span className="text-huttle-cyan">is Ready.</span>
            </h1>
            <p className="text-gray-400 max-w-md">
              Stop burning out. Start growing. Experience the AI workflow designed for serious creators.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 stagger-item"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                  <feature.icon className="w-4 h-4 text-huttle-cyan" />
                </div>
                <span className="text-gray-300 text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Secure Account Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/huttle-logo.png" alt="Huttle AI" className="h-8 w-auto mx-auto" />
          </div>

          {/* Shield Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-huttle-blue/10 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-huttle-blue" />
            </div>
          </div>

          {/* Welcome Text */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to Huttle AI!</h2>
            <p className="text-gray-500 text-sm">Secure your account to get started.</p>
          </div>

          {/* Password Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="input pl-10 pr-10"
                  placeholder="Create a secure password"
                  required
                  minLength={6}
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">At least 6 characters</p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  className={`input pl-10 pr-10 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
                  placeholder="Re-enter your password"
                  required
                  minLength={6}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-500 font-medium">{error}</p>
            )}

            {/* Submit Button */}
            <button type="submit" disabled={loading} className="w-full btn-primary py-3">
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Save & Continue
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-gray-400 text-xs mt-6">
            By continuing, you agree to our{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-huttle-blue hover:underline">Terms</a>
            {' '}and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-huttle-blue hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
