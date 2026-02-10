import { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { UserPlus, Mail, Lock, Loader, Check, X, Sparkles, Calendar, TrendingUp, Zap, AlertTriangle } from 'lucide-react';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [breachCheckStatus, setBreachCheckStatus] = useState('idle');
  const [lastCheckedPassword, setLastCheckedPassword] = useState('');
  const breachCheckTimeoutRef = useRef(null);
  const latestPasswordRef = useRef('');
  const { signup } = useContext(AuthContext);
  const { addToast } = useToast();
  const navigate = useNavigate();
  const checkingBreach = breachCheckStatus === 'checking';
  const isBreached = breachCheckStatus === 'breached';
  const isBreachCheckComplete =
    password.length >= 8 &&
    lastCheckedPassword === password &&
    ['safe', 'breached', 'error'].includes(breachCheckStatus);

  // Check password against Have I Been Pwned API (privacy-preserving k-anonymity)
  const checkPasswordBreach = async (passwordToCheck) => {
    if (!passwordToCheck || passwordToCheck.length < 8) {
      if (latestPasswordRef.current === passwordToCheck) {
        setBreachCheckStatus('idle');
        setLastCheckedPassword('');
      }
      return { status: 'idle' };
    }

    try {
      if (latestPasswordRef.current === passwordToCheck) {
        setBreachCheckStatus('checking');
      }

      // Use SHA-1 hash of password
      const encoder = new TextEncoder();
      const data = encoder.encode(passwordToCheck);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      
      // Send only first 5 characters (k-anonymity)
      const prefix = hashHex.substring(0, 5);
      const suffix = hashHex.substring(5);

      // Query HIBP API (no Add-Padding — padding adds decoy entries that can
      // cause the client check to disagree with Supabase's server-side check)
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      if (!response.ok) throw new Error(`Breach API returned ${response.status}`);
      const text = await response.text();

      // Check if our password hash suffix is in the results
      const found = text.split('\n').some(line => {
        const [hashSuffix] = line.trim().split(':');
        return hashSuffix?.toUpperCase() === suffix;
      });

      if (latestPasswordRef.current === passwordToCheck) {
        setBreachCheckStatus(found ? 'breached' : 'safe');
        setLastCheckedPassword(passwordToCheck);
      }

      return { status: found ? 'breached' : 'safe' };
    } catch (error) {
      console.error('Error checking password breach:', error);
      if (latestPasswordRef.current === passwordToCheck) {
        setBreachCheckStatus('error');
        setLastCheckedPassword(passwordToCheck);
      }
      return { status: 'error' };
    }
  };

  // Debounce breach checking to avoid too many API calls
  useEffect(() => {
    latestPasswordRef.current = password;

    if (breachCheckTimeoutRef.current) {
      clearTimeout(breachCheckTimeoutRef.current);
    }

    if (!password || password.length < 8) {
      setBreachCheckStatus('idle');
      setLastCheckedPassword('');
      return;
    }

    // Password changed; mark previous result stale until this value is checked.
    if (password !== lastCheckedPassword) {
      setLastCheckedPassword('');
      setBreachCheckStatus('idle');
    }

    breachCheckTimeoutRef.current = setTimeout(() => {
      if (password && password.length >= 8) {
        checkPasswordBreach(password);
      }
    }, 800); // Wait 800ms after user stops typing

    return () => {
      if (breachCheckTimeoutRef.current) clearTimeout(breachCheckTimeoutRef.current);
    };
  }, [password, lastCheckedPassword]);

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
    
    // Breach check should only show as complete when current password was actually checked.
    if (checkingBreach && password.length >= 8) {
      requirements.push({ met: false, text: 'Checking known data breaches...', isBreachCheck: true, isLoading: true });
    } else if (isBreachCheckComplete && isBreached) {
      requirements.push({ met: false, text: 'Found in known data breaches (warning)', isBreachCheck: true });
    } else if (isBreachCheckComplete && breachCheckStatus === 'safe') {
      requirements.push({ met: true, text: 'Not in known data breaches', isBreachCheck: true });
    } else if (isBreachCheckComplete && breachCheckStatus === 'error') {
      requirements.push({
        met: false,
        text: 'Could not verify against breach database (server still checks)',
        isBreachCheck: true,
      });
    } else if (password.length >= 8) {
      requirements.push({ met: false, text: 'Waiting to verify known data breaches', isBreachCheck: true, isPending: true });
    }
    
    // Round score and cap at 5
    score = Math.min(5, Math.round(score));
    
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
    const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'];
    
    return { score, label: labels[score], color: colors[score], requirements };
  }, [password, isBreached, checkingBreach, isBreachCheckComplete, breachCheckStatus]);

  // Check if password meets minimum requirements (breach check is informational only)
  const passwordMeetsRequirements = useMemo(() => {
    return password.length >= 8 && 
           /[a-z]/.test(password) && 
           /[A-Z]/.test(password) && 
           /[0-9]/.test(password);
  }, [password]);

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
      } else {
        addToast('Password must include: uppercase letter, lowercase letter, and a number', 'error');
      }
      return;
    }

    // Client-side breach check is INFORMATIONAL ONLY — never blocks submission.
    // Supabase performs its own server-side HIBP check and is the final authority.
    // We warn the user here but always let the request go through to Supabase.
    if (isBreachCheckComplete && isBreached) {
      addToast('Warning: This password was found in breach databases. Supabase may reject it — consider choosing a different one.', 'warning', 5000);
    }

    setLoading(true);
    const result = await signup(email, password);
    setLoading(false);

    if (result.success) {
      addToast('Account created! Welcome to Huttle.', 'success');
      navigate('/dashboard');
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
        // Mark the breach status so the UI updates immediately
        setBreachCheckStatus('breached');
        setLastCheckedPassword(password);
        addToast(
          'This password has been found in a public data breach and was rejected by the server. Please choose a completely different password — try a random passphrase like "PurpleTiger$Runs42".',
          'error',
          8000
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
              <p className="text-lg font-semibold text-white">Feb 11, 2026</p>
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="Create a strong password"
                  required
                  disabled={loading}
                  minLength={8}
                />
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
                          req.met ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                        } ${req.isBreachCheck && !req.met ? 'bg-yellow-100 text-yellow-600' : ''}`}>
                          {checkingBreach && req.isBreachCheck ? (
                            <Loader className="w-2 h-2 animate-spin" />
                          ) : req.met ? (
                            <Check className="w-2 h-2" />
                          ) : req.isBreachCheck ? (
                            <AlertTriangle className="w-2 h-2" />
                          ) : (
                            <X className="w-2 h-2" />
                          )}
                        </div>
                        <span className={`text-[10px] ${
                          req.met ? 'text-green-600' : req.isBreachCheck && !req.met ? 'text-yellow-600 font-medium' : 'text-gray-500'
                        }`}>
                          {req.text}
                          {checkingBreach && req.isBreachCheck && ' (checking...)'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Breach detection warning */}
                  {isBreachCheckComplete && isBreached && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-[10px] text-yellow-800 leading-relaxed font-medium">
                        ⚠️ Warning: This password has been found in data breaches. We recommend choosing a different one for better security.
                      </p>
                    </div>
                  )}
                  {/* Breach detection info */}
                  {isBreachCheckComplete && breachCheckStatus === 'safe' && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-lg">
                      <p className="text-[10px] text-green-700 leading-relaxed">
                        ✓ Password looks good! Not found in known data breaches.
                      </p>
                    </div>
                  )}
                  {isBreachCheckComplete && breachCheckStatus === 'error' && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-[10px] text-yellow-800 leading-relaxed font-medium">
                        Could not verify this password against the breach database. The server may still reject common passwords.
                      </p>
                    </div>
                  )}
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
                  type="password"
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
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading} 
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
