import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { supabase } from '../config/supabase';
import { Lock, Loader, ShieldCheck, Sparkles, TrendingUp, Zap, Eye, EyeOff } from 'lucide-react';

export default function SecureAccount() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Detect whether this is a password-recovery flow (type=recovery in the URL hash).
  // Supabase exchanges the recovery token into an active session before React mounts,
  // so we parse the hash directly to know which flow we're in — without relying on
  // session state (which would otherwise redirect the user away before they set a password).
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [tokenError, setTokenError] = useState('');
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const type = params.get('type');

    if (type === 'recovery') {
      setIsRecoveryFlow(true);
      // Pre-populate recoveryEmail from the active session so the
      // "Request a new link" fallback knows which address to use.
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session?.user?.email) {
          setRecoveryEmail(data.session.user.email);
        }
      });
    }
    // For type=signup or type=magiclink (initial account setup), fall through to
    // the existing flow — no redirect override needed.
  }, []);

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

      if (supaError) {
        // Expired or already-consumed token — surface a clear error with a re-send option.
        const msg = supaError.message || '';
        if (
          msg.toLowerCase().includes('expired') ||
          msg.toLowerCase().includes('invalid') ||
          msg.toLowerCase().includes('token')
        ) {
          setTokenError(msg);
          throw supaError;
        }
        throw supaError;
      }

      addToast('Password saved! Taking you to your dashboard.', 'success');
      navigate('/dashboard');
    } catch (err) {
      console.error('Error setting password:', err);
      if (!tokenError) {
        addToast(err.message || 'Failed to set password. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewLink = async () => {
    if (!recoveryEmail) {
      addToast('Unable to determine your email address. Please go to the login page and use "Forgot password".', 'warning');
      return;
    }
    setLoading(true);
    try {
      // IMPORTANT: Supabase dashboard > Auth > URL Configuration > Redirect URLs
      // must include https://huttleai.com/secure-account in the allowed list.
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
        redirectTo: `${window.location.origin}/secure-account`,
      });
      if (error) throw error;
      addToast('A new password reset link has been sent to your inbox.', 'success');
      setTokenError('');
    } catch (err) {
      console.error('Error requesting new reset link:', err);
      addToast(err.message || 'Failed to send reset email. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Sparkles, text: 'AI-powered content generation' },
    { icon: Zap, text: 'Full suite of AI creation tools' },
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
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {isRecoveryFlow ? 'Reset Your Password' : 'Welcome to Huttle AI!'}
            </h2>
            <p className="text-gray-500 text-sm">
              {isRecoveryFlow
                ? 'Create a new password for your account.'
                : 'Secure your account to get started.'}
            </p>
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

            {/* Validation Error */}
            {error && (
              <p className="text-sm text-red-500 font-medium">{error}</p>
            )}

            {/* Token Expired / Invalid Error */}
            {tokenError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 font-medium mb-2">
                  This link has expired or has already been used.
                </p>
                <button
                  type="button"
                  onClick={handleRequestNewLink}
                  disabled={loading}
                  className="text-sm text-huttle-blue hover:underline font-medium disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Request a new link →'}
                </button>
              </div>
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
                  {isRecoveryFlow ? 'Reset Password' : 'Save & Continue'}
                </>
              )}
            </button>
          </form>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">
              <strong>Password requirements:</strong>
            </p>
            <ul className="text-xs text-gray-500 mt-1 ml-4 list-disc">
              <li>At least 8 characters</li>
              <li>One uppercase letter</li>
              <li>One lowercase letter</li>
              <li>One number</li>
              <li>Special characters recommended for extra security</li>
            </ul>
          </div>

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
