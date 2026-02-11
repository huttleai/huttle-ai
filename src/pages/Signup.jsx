import { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createCheckoutSession } from '../services/stripeAPI';
import { UserPlus, Mail, Lock, Loader, Check, X, Sparkles, Calendar, TrendingUp, Zap, Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uniqueCheckStatus, setUniqueCheckStatus] = useState('idle'); // 'idle' | 'checking' | 'unique' | 'common'
  const [lastCheckedPassword, setLastCheckedPassword] = useState('');
  const latestPasswordRef = useRef('');
  const uniqueCheckTimeoutRef = useRef(null);
  const { signup } = useContext(AuthContext);
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Check if password is unique enough (matches Supabase's server-side check)
  const checkPasswordUniqueness = async (passwordToCheck) => {
    if (!passwordToCheck || passwordToCheck.length < 8) {
      if (latestPasswordRef.current === passwordToCheck) {
        setUniqueCheckStatus('idle');
        setLastCheckedPassword('');
      }
      return;
    }
    try {
      if (latestPasswordRef.current === passwordToCheck) setUniqueCheckStatus('checking');
      const encoder = new TextEncoder();
      const data = encoder.encode(passwordToCheck);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      const prefix = hashHex.substring(0, 5);
      const suffix = hashHex.substring(5);
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const text = await response.text();
      const found = text.split('\n').some((line) => {
        const [hashSuffix] = line.trim().split(':');
        return hashSuffix?.toUpperCase() === suffix;
      });
      if (latestPasswordRef.current === passwordToCheck) {
        setUniqueCheckStatus(found ? 'common' : 'unique');
        setLastCheckedPassword(passwordToCheck);
      }
    } catch (error) {
      console.error('Error checking password uniqueness:', error);
      if (latestPasswordRef.current === passwordToCheck) {
        setUniqueCheckStatus('error');
        setLastCheckedPassword(passwordToCheck);
      }
    }
  };

  useEffect(() => {
    latestPasswordRef.current = password;
    if (uniqueCheckTimeoutRef.current) clearTimeout(uniqueCheckTimeoutRef.current);
    if (!password || password.length < 8) {
      setUniqueCheckStatus('idle');
      setLastCheckedPassword('');
      return;
    }
    if (password !== lastCheckedPassword) {
      setLastCheckedPassword('');
      setUniqueCheckStatus('idle');
    }
    uniqueCheckTimeoutRef.current = setTimeout(() => {
      if (password && password.length >= 8) checkPasswordUniqueness(password);
    }, 800);
    return () => {
      if (uniqueCheckTimeoutRef.current) clearTimeout(uniqueCheckTimeoutRef.current);
    };
  }, [password, lastCheckedPassword]);

  const isUniqueCheckComplete =
    password.length >= 8 &&
    lastCheckedPassword === password &&
    ['unique', 'common', 'error'].includes(uniqueCheckStatus);
  const isPasswordUnique = uniqueCheckStatus === 'unique' || uniqueCheckStatus === 'error';

  // Password strength calculation with security requirements
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '', requirements: [] };
    
    const requirements = [];
    let score = 0;
    
    // Minimum length check (required: 8 characters)
    if (password.length >= 8) {
      score += 1;
      requirements.push({ met: true, text: 'At least 8 characters' });
    } else {
      requirements.push({ met: false, text: 'At least 8 characters' });
    }
    
    // Bonus for longer passwords
    if (password.length >= 12) score += 1;
    
    // Lowercase letter check
    if (/[a-z]/.test(password)) {
      score += 0.5;
      requirements.push({ met: true, text: 'Lowercase letter' });
    } else {
      requirements.push({ met: false, text: 'Lowercase letter' });
    }
    
    // Uppercase letter check
    if (/[A-Z]/.test(password)) {
      score += 0.5;
      requirements.push({ met: true, text: 'Uppercase letter' });
    } else {
      requirements.push({ met: false, text: 'Uppercase letter' });
    }
    
    // Number check
    if (/[0-9]/.test(password)) {
      score += 1;
      requirements.push({ met: true, text: 'Number' });
    } else {
      requirements.push({ met: false, text: 'Number' });
    }
    
    // Special character check (bonus, not required)
    if (/[^a-zA-Z0-9]/.test(password)) {
      score += 1;
      requirements.push({ met: true, text: 'Special character (bonus)' });
    }

    // Uniqueness check (aligns with Supabase server policy)
    if (uniqueCheckStatus === 'checking' && password.length >= 8) {
      requirements.push({ met: false, text: 'Checking uniqueness...', isUniqueCheck: true });
    } else if (uniqueCheckStatus === 'unique') {
      requirements.push({ met: true, text: 'Unique enough', isUniqueCheck: true });
    } else if (uniqueCheckStatus === 'common') {
      requirements.push({ met: false, text: 'Too common — choose a different password', isUniqueCheck: true });
    } else if (uniqueCheckStatus === 'error') {
      requirements.push({ met: true, text: 'Format OK (uniqueness could not be verified)', isUniqueCheck: true });
    } else if (password.length >= 8) {
      requirements.push({ met: false, text: 'Verifying uniqueness...', isUniqueCheck: true });
    }

    // Round score and cap at 5
    score = Math.min(5, Math.round(score));
    
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
    const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'];
    
    return { score, label: labels[score], color: colors[score], requirements };
  }, [password, uniqueCheckStatus, isUniqueCheckComplete, isPasswordUnique]);

  // Check if password meets all requirements (including uniqueness)
  const passwordMeetsRequirements = useMemo(() => {
    const formatOk =
      password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password);
    return formatOk && (isUniqueCheckComplete ? isPasswordUnique : false);
  }, [password, isUniqueCheckComplete, isPasswordUnique]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      addToast('Please fill in all fields', 'error');
      return;
    }

    if (password !== confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }

    // Enforce password requirements
    if (!passwordMeetsRequirements) {
      if (password.length < 8) {
        addToast('Password must be at least 8 characters', 'error');
      } else if (isUniqueCheckComplete && !isPasswordUnique) {
        addToast('This password is too common. Please choose a more unique password.', 'error');
      } else if (password.length >= 8) {
        addToast('Password must include: uppercase letter, lowercase letter, and a number', 'error');
      }
      return;
    }

    setLoading(true);
    const result = await signup(email, password);
    setLoading(false);

    if (result.success) {
      addToast('Account created! Redirecting to payment...', 'success');
      // Redirect to Stripe Checkout for Founders Club payment
      try {
        const checkoutResult = await createCheckoutSession('founder', 'annual');
        if (checkoutResult.success && checkoutResult.url) {
          window.location.href = checkoutResult.url;
          return;
        }
      } catch (stripeError) {
        console.error('Stripe checkout error:', stripeError);
      }
      // Fallback: send to subscription page if Stripe redirect fails
      navigate('/dashboard/subscription');
    } else {
      const errorMessage = result.error || 'Failed to create account';

      // Supabase returns code "weak_password" with reason "pwned" when the
      // password is found in the HaveIBeenPwned database on the server side.
      // It can also return messages containing "weak" or "easy to guess".
      const isWeakPassword =
        result.code === 'weak_password' ||
        errorMessage.toLowerCase().includes('weak') ||
        errorMessage.toLowerCase().includes('easy to guess') ||
        errorMessage.toLowerCase().includes('pwned');

      if (isWeakPassword) {
        addToast(
          'This password is not allowed. Please choose a stronger, more unique password and try again.',
          'error',
          6000
        );
      } else if (errorMessage.toLowerCase().includes('already registered') ||
                 errorMessage.toLowerCase().includes('already been registered')) {
        addToast('An account with this email already exists. Try signing in instead.', 'error', 6000);
      } else {
        addToast(errorMessage, 'error');
      }
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

          {/* Launch Status */}
          <div className="mt-16 pt-8 border-t border-white/10 grid grid-cols-3 gap-8">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
              <p className="text-lg font-semibold text-huttle-cyan">Early Access</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Launch Date</p>
              <p className="text-lg font-semibold text-white">Feb 13, 2026</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Version</p>
              <p className="text-lg font-semibold text-white">Pro Beta</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/huttle-logo.png" alt="Huttle AI" className="h-8 w-auto mx-auto" />
          </div>

          {/* Welcome Text */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Create your account</h2>
            <p className="text-gray-500 text-sm">Start your free trial today</p>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="Create a strong password"
                  required
                  disabled={loading}
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Password Requirements (Always visible) */}
              {!password && (
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs font-medium text-gray-700 mb-2">Password must include:</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[11px] text-gray-600">
                      <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                      <span>At least 8 characters</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-600">
                      <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                      <span>One uppercase letter (A-Z)</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-600">
                      <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                      <span>One lowercase letter (a-z)</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-600">
                      <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                      <span>One number (0-9)</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Password strength indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div 
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= passwordStrength.score ? passwordStrength.color : 'bg-gray-100'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-[10px] font-medium ${
                    passwordStrength.score <= 2 ? 'text-red-600' : 
                    passwordStrength.score <= 3 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {passwordStrength.label}
                  </p>
                  {/* Password requirements checklist */}
                  <div className="mt-2 space-y-1">
                    {passwordStrength.requirements.map((req, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
                          req.met ? 'bg-green-100 text-green-600' : req.isUniqueCheck ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {req.isUniqueCheck && uniqueCheckStatus === 'checking' ? (
                            <Loader className="w-2 h-2 animate-spin" />
                          ) : req.met ? (
                            <Check className="w-2 h-2" />
                          ) : (
                            <X className="w-2 h-2" />
                          )}
                        </div>
                        <span className={`text-[10px] ${
                          req.met ? 'text-green-600' : req.isUniqueCheck && !req.met ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="Confirm your password"
                  required
                  disabled={loading}
                  minLength={8}
                />
                {confirmPassword && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {password === confirmPassword ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 ${
                    confirmPassword ? 'right-10' : 'right-3.5'
                  }`}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading || !passwordMeetsRequirements} 
              className="w-full btn-primary py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-gray-400">Already have an account?</span>
            </div>
          </div>

          {/* Login Link */}
          <Link to="/dashboard/login" className="block w-full btn-secondary py-2.5 text-center text-sm">
            Sign in instead
          </Link>

          {/* Footer */}
          <p className="text-center text-gray-400 text-xs mt-6">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-huttle-blue hover:underline">Terms</a>
            {' '}and{' '}
            <a href="#" className="text-huttle-blue hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
