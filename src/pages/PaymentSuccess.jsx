import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Sparkles, Crown, Mail, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PaymentSuccess() {
  const hasConfettiFired = useRef(false);

  useEffect(() => {
    // Only fire confetti once and respect reduced motion preferences
    if (hasConfettiFired.current) return;
    
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    hasConfettiFired.current = true;

    // Fire confetti with brand colors
    const brandColors = ['#01bad2', '#2B8FC7', '#00ACC1', '#4DD0E1', '#ffffff'];
    
    // Initial burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: brandColors,
      disableForReducedMotion: true,
    });

    // Secondary burst for extra celebration
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: brandColors,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: brandColors,
        disableForReducedMotion: true,
      });
    }, 250);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-huttle-50/30 to-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 pattern-dots opacity-30 pointer-events-none" />
      
      {/* Radial gradient accent */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-huttle-cyan/10 via-transparent to-transparent" />
      </div>

      {/* Main Card */}
      <div className="relative w-full max-w-lg">
        <div className="card-elevated p-8 sm:p-10 text-center">
          {/* Success Icon with animated ring */}
          <div className="relative mx-auto w-20 h-20 mb-6 stagger-item" style={{ animationDelay: '0ms' }}>
            {/* Animated ring pulse */}
            <div className="absolute inset-0 rounded-full bg-huttle-cyan/20 animate-ring-expand" />
            <div className="absolute inset-0 rounded-full bg-huttle-cyan/10 animate-ring-expand" style={{ animationDelay: '0.5s' }} />
            
            {/* Icon container */}
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-huttle-cyan to-huttle-blue flex items-center justify-center shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
          </div>

          {/* Founding Member Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/50 mb-4 stagger-item" style={{ animationDelay: '50ms' }}>
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-700">Founding Member</span>
          </div>

          {/* Header */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 stagger-item" style={{ animationDelay: '100ms' }}>
            You're in! Welcome to Huttle AI.
          </h1>

          {/* Sub-header */}
          <p className="text-lg text-huttle-cyan font-semibold mb-6 stagger-item" style={{ animationDelay: '150ms' }}>
            Your Founding Member status is confirmed.
          </p>

          {/* Body Content */}
          <div className="space-y-4 mb-8">
            {/* Receipt notification */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100 text-left stagger-item" style={{ animationDelay: '200ms' }}>
              <div className="w-8 h-8 rounded-lg bg-huttle-cyan/10 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-huttle-cyan" />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                A receipt for your payment has been sent to your email.
              </p>
            </div>

            {/* VIP access info */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-huttle-50/50 to-huttle-100/30 border border-huttle-200/30 text-left stagger-item" style={{ animationDelay: '250ms' }}>
              <div className="w-8 h-8 rounded-lg bg-huttle-cyan/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-huttle-cyan" />
              </div>
              <div className="text-sm text-gray-600 leading-relaxed">
                <p>
                  <span className="font-medium text-gray-900">Check your inbox (and spam folder).</span> You're officially on the inside. Look out for your login details and a few VIP sneak peeks we're sharing only with Founding Members before we go live.
                </p>
                <p className="text-xs text-gray-500 mt-2 italic">
                  Tip: If you don't see our email, check your spam or junk folder and mark us as safe.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <Link
            to="/"
            className="group w-full btn-primary py-4 text-base font-semibold stagger-item inline-flex"
            style={{ animationDelay: '300ms' }}
          >
            Return to Homepage
            <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
          </Link>

          {/* Footer note */}
          <p className="mt-6 text-xs text-gray-400 stagger-item" style={{ animationDelay: '350ms' }}>
            Questions? Reach out to{' '}
            <a href="mailto:support@huttleai.com" className="text-huttle-cyan hover:underline">
              support@huttleai.com
            </a>
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-huttle-cyan/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-huttle-blue/5 rounded-full blur-3xl pointer-events-none" />
      </div>
    </div>
  );
}

