import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LogIn, Mail, Lock, Loader, Sparkles, Calendar, TrendingUp, Zap } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter both email and password', 'error');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      addToast('Welcome back!', 'success');
      navigate('/');
    } else {
      addToast(result.error || 'Failed to log in', 'error');
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
              Your AI-powered
              <br />
              <span className="text-huttle-cyan">content engine</span>
            </h1>
            <p className="text-gray-400 max-w-md">
              Create scroll-stopping content, predict trends, and grow your audience with the power of AI.
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

          {/* Testimonial */}
          <div className="mt-16 pt-8 border-t border-white/10">
            <p className="text-gray-400 text-sm italic mb-4">
              "Huttle AI has completely transformed how I create content. I save hours every week!"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-huttle-cyan/20 flex items-center justify-center text-huttle-cyan font-semibold text-sm">
                SK
              </div>
              <div>
                <p className="text-white font-medium text-sm">Sarah Kim</p>
                <p className="text-gray-500 text-xs">Content Creator, 50K+ followers</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/huttle-logo.png" alt="Huttle AI" className="h-8 w-auto mx-auto" />
          </div>

          {/* Welcome Text */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome back</h2>
            <p className="text-gray-500 text-sm">Sign in to continue to your dashboard</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
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
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <button type="button" className="text-xs text-huttle-blue hover:underline font-medium">
                  Forgot password?
                </button>
              </div>
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
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" disabled={loading} className="w-full btn-primary py-3">
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
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
              <span className="px-3 bg-white text-gray-400">New to Huttle?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <Link to="/signup" className="block w-full btn-secondary py-2.5 text-center text-sm">
            Create an account
          </Link>

          {/* Footer */}
          <p className="text-center text-gray-400 text-xs mt-6">
            By signing in, you agree to our{' '}
            <a href="#" className="text-huttle-blue hover:underline">Terms</a>
            {' '}and{' '}
            <a href="#" className="text-huttle-blue hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
