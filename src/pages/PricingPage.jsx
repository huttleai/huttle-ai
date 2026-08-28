import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LogIn } from 'lucide-react';
import { PricingSection } from '../components/landing/Pricing';
import { BorderBeamButton } from '../components/magicui/BorderBeam';
import { startPublicCheckout } from '../utils/publicCheckout';

export default function PricingPage() {
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  useEffect(() => {
    document.title = 'Pricing | Huttle AI';
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content =
      'Huttle AI pricing: Essentials and Pro, monthly or annual, with a 7-day free trial. A credit card is required to start. Billing begins automatically when the trial ends unless you cancel.';
  }, []);

  const handleNavProCheckout = async () => {
    setCheckoutError(null);
    setCheckoutLoading(true);
    try {
      const result = await startPublicCheckout('pro', 'monthly', { navigate });
      if (result.redirectedToSignup) return;
      if (!result.success) {
        setCheckoutError(result.error || 'Could not start checkout. Please try again.');
      }
    } catch (error) {
      setCheckoutError(error?.message || 'Could not start checkout. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white text-slate-900" data-testid="pricing-page">
      <nav className="fixed left-0 right-0 top-0 z-50 flex justify-center px-4 pt-2 md:pt-3">
        <div className="flex items-center gap-4 md:gap-8 rounded-full border border-slate-200/60 bg-white/80 backdrop-blur-xl px-4 md:px-8 py-3 md:py-3.5 shadow-lg shadow-slate-200/50">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
            <img src="/huttle-logo.png" alt="Huttle AI" className="h-6 md:h-8 w-auto" />
          </Link>
          <Link
            to="/#features"
            className="hidden md:inline-flex text-sm md:text-base font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Features
          </Link>
          <BorderBeamButton
            onClick={handleNavProCheckout}
            disabled={checkoutLoading}
            className="rounded-full px-4 md:px-7 py-2 md:py-3 text-xs md:text-sm font-bold text-white shadow-md shadow-[#01bad2]/20 disabled:opacity-60 disabled:cursor-not-allowed"
            beamSize={100}
            beamDuration={4}
          >
            {checkoutLoading ? 'Loading…' : (
              <>Start Free Trial<ArrowRight size={14} className="ml-1" /></>
            )}
          </BorderBeamButton>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden md:inline">Login</span>
          </Link>
        </div>
      </nav>

      {checkoutError && (
        <div
          role="alert"
          className="fixed left-1/2 top-20 z-[60] w-[min(92vw,28rem)] -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700 shadow-lg"
        >
          {checkoutError}
        </div>
      )}

      <main className="pt-20 md:pt-24">
        <PricingSection />
      </main>

      <footer className="py-12 md:py-16 bg-white border-t border-slate-100">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8">
          <Link to="/" className="flex items-center gap-2 font-bold text-slate-900">
            <img src="/huttle-logo.png" alt="Huttle AI" className="h-8 md:h-10 w-auto" />
          </Link>
          <div className="flex-1 text-center space-y-3">
            <p className="text-sm text-slate-500">
              © 2026 Huttle AI · <Link to="/" className="hover:text-slate-700 transition-colors underline-offset-2 hover:underline">Home</Link> · <Link to="/privacy" className="hover:text-slate-700 transition-colors underline-offset-2 hover:underline">Privacy Policy</Link> · <Link to="/terms" className="hover:text-slate-700 transition-colors underline-offset-2 hover:underline">Terms of Service</Link> · <Link to="/refund-policy" className="hover:text-slate-700 transition-colors underline-offset-2 hover:underline">Refund Policy</Link>
            </p>
            <p className="text-sm text-slate-500">
              Questions?{' '}
              <a
                href="mailto:support@huttleai.com"
                className="text-slate-600 hover:text-slate-900 transition-colors underline-offset-2 hover:underline font-medium"
              >
                support@huttleai.com
              </a>
            </p>
          </div>
          <div className="w-8 md:w-10"></div>
        </div>
      </footer>
    </div>
  );
}
