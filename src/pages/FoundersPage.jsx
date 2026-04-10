import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, LogIn, ChevronDown, AlertCircle } from 'lucide-react';
import { createCheckoutSession, openStripeCheckoutTab } from '../services/stripeAPI';
import { ParticleNetwork } from '../components/magicui/ParticleNetwork';

const FOUNDERS_DEADLINE = '2026-04-13T23:59:00-05:00';
const FOUNDERS_SPOTS_LEFT = 22;

const FEATURES = [
  '800 AI generations/month',
  'AI Plan Builder',
  'Ignite Engine',
  'Niche Intel',
  'Trend Lab — Quick Scan and Deep Dive',
  'Content Remix Studio',
  'Full Post Builder',
  'All future features included',
  'Founders pricing locked in forever',
  'Priority support',
];

const FAQS = [
  {
    q: 'What happens after I pay?',
    a: 'Your account is activated immediately. You will receive a welcome email from hello@huttleai.com — check your inbox and your spam folder. Click the link inside to create your password and access your dashboard.',
  },
  {
    q: 'Is this really locked in forever?',
    a: 'Yes. Your $199/year rate is guaranteed for as long as your account stays active. We will never charge you more.',
  },
  {
    q: 'What if I am not satisfied?',
    a: 'Contact us at hello@huttleai.com within 14 days for a full refund. No questions asked.',
  },
];

function getDaysAway(isoDate) {
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function getRemainingTime(targetDate) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const s = Math.floor(diff / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

function HeroBackground() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    setIsMobile(mql.matches);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-cyan-50/40" />
      <div className="absolute inset-0">
        <ParticleNetwork
          particleCount={isMobile ? 35 : 60}
          particleColor="#01bad2"
          lineColor="#2B8FC7"
          maxLineDistance={isMobile ? 120 : 160}
          particleSize={isMobile ? { min: 2, max: 4 } : { min: 3, max: 6 }}
          speed={isMobile ? { min: 0.15, max: 0.35 } : { min: 0.2, max: 0.5 }}
          mouseRepelRadius={isMobile ? 80 : 130}
          mouseRepelStrength={isMobile ? 0.3 : 0.5}
          className={isMobile ? 'opacity-80' : 'opacity-100'}
        />
      </div>
      <div
        className="absolute w-[300px] h-[300px] md:w-[800px] md:h-[800px] rounded-full hero-orb-1"
        style={{
          background: 'radial-gradient(circle, rgba(1,186,210,0.15) 0%, rgba(1,186,210,0) 70%)',
          filter: 'blur(80px)',
          left: '-20%',
          top: '-30%',
        }}
      />
      <div
        className="absolute w-[200px] h-[200px] md:w-[600px] md:h-[600px] rounded-full hero-orb-2"
        style={{
          background: 'radial-gradient(circle, rgba(43,143,199,0.12) 0%, rgba(43,143,199,0) 70%)',
          filter: 'blur(80px)',
          right: '-15%',
          top: '10%',
        }}
      />
      <div
        className="absolute w-[250px] h-[250px] md:w-[500px] md:h-[500px] rounded-full hidden md:block hero-orb-3"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0) 70%)',
          filter: 'blur(80px)',
          left: '20%',
          bottom: '-10%',
        }}
      />
      <div
        className="absolute inset-0 opacity-15 md:opacity-25"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(43,143,199,0.12) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-32 md:h-48 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, white)' }}
      />
    </div>
  );
}

function Countdown({ targetDate }) {
  const [time, setTime] = useState(() => getRemainingTime(targetDate));

  useEffect(() => {
    const id = setInterval(() => setTime(getRemainingTime(targetDate)), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (!time) {
    return <p className="text-red-500 font-bold text-lg text-center">This offer has ended</p>;
  }

  const units = [
    { label: 'DAYS', value: time.days },
    { label: 'HRS', value: time.hours },
    { label: 'MIN', value: time.minutes },
    { label: 'SEC', value: time.seconds },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-gray-100 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {units.map(({ label, value }, i) => (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center bg-gray-50 rounded-xl p-3 sm:p-4 min-w-[58px] sm:min-w-[72px] flex-1">
              <span className="text-4xl md:text-5xl font-bold text-gray-900 tabular-nums leading-none">
                {String(value).padStart(2, '0')}
              </span>
              <span className="text-xs text-gray-500 uppercase tracking-widest mt-1.5">{label}</span>
            </div>
            {i < 3 && (
              <span className="text-xl sm:text-2xl font-bold text-gray-200 mb-5 select-none">:</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function CTAButton({ isLoading, onClick, label = 'Claim My Founders Spot' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="inline-flex items-center justify-center gap-2.5 px-10 py-4 rounded-full bg-gradient-to-r from-[#2B8FC7] to-[#01bad2] text-white font-bold text-lg shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto active:scale-[0.98]"
    >
      {isLoading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          Redirecting to checkout…
        </>
      ) : (
        <>
          {label}
          <ArrowRight size={20} />
        </>
      )}
    </button>
  );
}

function FAQAccordion({ items }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
        >
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-slate-50/50 transition-colors duration-200"
          >
            <span className="font-semibold text-gray-900 text-lg">{item.q}</span>
            <ChevronDown
              size={20}
              className={`text-gray-400 flex-shrink-0 transition-transform duration-300 ease-in-out ${
                openIndex === i ? 'rotate-180' : ''
              }`}
            />
          </button>
          {openIndex === i && (
            <div className="px-6 pb-6 text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function FoundersPage() {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const handleCheckout = async () => {
    const checkoutTab = openStripeCheckoutTab();
    setCheckoutError(null);
    setIsCheckingOut(true);
    try {
      const result = await createCheckoutSession('founder', 'annual', {
        targetWindow: checkoutTab,
      });
      if (result.demo) {
        checkoutTab?.close();
        setCheckoutError(
          'Checkout is not available yet. Configure VITE_STRIPE_PRICE_FOUNDER_ANNUAL to enable.'
        );
        return;
      }
      if (!result.success) {
        checkoutTab?.close();
        setCheckoutError(result.error || 'Could not start checkout. Please try again.');
        return;
      }
      if (result.openedInNewTab) {
        setIsCheckingOut(false);
      }
    } catch (err) {
      checkoutTab?.close();
      setCheckoutError(err?.message || 'Could not start checkout. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const daysAway = getDaysAway(FOUNDERS_DEADLINE);
  const daysLabel =
    daysAway === 0
      ? 'April 13 is today.'
      : daysAway === 1
      ? 'April 13 is 1 day away.'
      : `April 13 is ${daysAway} days away.`;

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      <style>{`
        .hero-orb-1 { animation: hero-orb-1 25s ease-in-out infinite; will-change: transform; }
        .hero-orb-2 { animation: hero-orb-2 30s ease-in-out 3s infinite; will-change: transform; }
        .hero-orb-3 { animation: hero-orb-3 20s ease-in-out 5s infinite; will-change: transform; }
        @keyframes hero-orb-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, 30px) scale(1.1); }
        }
        @keyframes hero-orb-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 40px) scale(1.15); }
        }
        @keyframes hero-orb-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -30px) scale(1.1); }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center">
            <img src="/huttle-logo.png" alt="Huttle AI" className="h-7 sm:h-8 w-auto" />
          </Link>
          <div className="flex items-center">
            <Link
              to="/"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors mr-4 hidden md:inline"
            >
              See Full Site
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              <LogIn size={16} />
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* ── SECTION 1: HERO ── */}
      <section className="relative py-24 md:py-32 px-4 overflow-hidden">
        <HeroBackground />

        <div className="relative max-w-3xl mx-auto text-center">
          {/* Urgency badge */}
          <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-8">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
            Founders Club · Closes April 13
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 tracking-tighter leading-[1.05] mb-5 sm:mb-6">
            The Last Time
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2B8FC7] to-[#01bad2]">
              This Price Exists
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 sm:mb-12 font-medium leading-relaxed">
            Lock in Huttle AI at $199/year — forever. After April 13th, this price is gone.
          </p>

          <div className="mb-10 sm:mb-12 flex justify-center">
            <Countdown targetDate={FOUNDERS_DEADLINE} />
          </div>

          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-red-50 border border-red-200">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <span className="text-sm font-bold text-red-700">Only {FOUNDERS_SPOTS_LEFT} Spots Remaining</span>
            </div>
          </div>

          {checkoutError && (
            <div className="flex items-start gap-2 max-w-md mx-auto mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-left">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{checkoutError}</span>
            </div>
          )}

          <CTAButton isLoading={isCheckingOut} onClick={handleCheckout} />

          <p className="mt-3 text-sm text-slate-500 font-medium">14-day happiness guarantee</p>

          <p className="mt-2 text-xs sm:text-sm text-slate-500">
            Secure checkout via Stripe · hello@huttleai.com
          </p>
        </div>
      </section>

      {/* ── VIDEO DEMO ── */}
      <section className="py-20 sm:py-24 px-4 bg-white border-t border-slate-200/60 shadow-[0_-4px_16px_rgb(0,0,0,0.03)]">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs sm:text-sm font-bold uppercase tracking-widest text-[#01bad2] mb-6">
            See It In Action
          </p>
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <video
              src="/videos/plan-builder-demo.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="w-full block"
            />
          </div>
        </div>
      </section>

      {/* ── SECTION 2: WHAT YOU GET ── */}
      <section className="py-20 sm:py-24 px-4 bg-slate-50/80 border-y border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tighter text-center mb-12">
            Everything in Pro — Locked In Forever
          </h2>

          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-12">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="flex items-center bg-white rounded-2xl p-6 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border border-gray-100"
              >
                <div className="bg-teal-50 rounded-full p-1 w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
                  <Check size={16} className="text-[#01bad2]" />
                </div>
                <span className="text-gray-800 font-medium text-sm sm:text-base">{feature}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-3">
            {checkoutError && (
              <div className="flex items-start gap-2 w-full max-w-md p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-left">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{checkoutError}</span>
              </div>
            )}
            <CTAButton isLoading={isCheckingOut} onClick={handleCheckout} />
            <p className="text-sm text-slate-500 font-medium">14-day happiness guarantee</p>
            <p className="text-xs sm:text-sm text-slate-500">Secure checkout via Stripe · hello@huttleai.com</p>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: URGENCY BLOCK ── */}
      <section className="relative py-20 sm:py-24 px-4 bg-slate-900 overflow-hidden">
        <div
          className="absolute pointer-events-none"
          style={{
            width: '600px', height: '600px',
            background: 'radial-gradient(circle, rgba(1,186,210,0.07) 0%, transparent 70%)',
            filter: 'blur(100px)',
            right: '-10%', top: '-20%',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            width: '500px', height: '500px',
            background: 'radial-gradient(circle, rgba(43,143,199,0.06) 0%, transparent 70%)',
            filter: 'blur(100px)',
            left: '-10%', bottom: '-20%',
          }}
        />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="w-12 h-0.5 bg-gradient-to-r from-[#2B8FC7] to-[#01bad2] mx-auto mb-6 rounded-full" />

          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter mb-5">
            After April 13, This Price Is Gone Forever
          </h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            Founders Club is our founding member tier. Once it closes, the only path in is $249/year as a Builders member. There is no coupon, no workaround, no second chance at $199.
          </p>

          {checkoutError && (
            <div className="flex items-start gap-2 max-w-md mx-auto mb-4 p-3 rounded-xl bg-red-900/40 border border-red-700/40 text-red-300 text-sm text-left">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{checkoutError}</span>
            </div>
          )}
          <CTAButton isLoading={isCheckingOut} onClick={handleCheckout} />
          <p className="mt-3 text-sm text-slate-400 font-medium">14-day happiness guarantee</p>
          <p className="mt-2 text-xs sm:text-sm text-slate-500">Secure checkout via Stripe · hello@huttleai.com</p>
        </div>
      </section>

      {/* ── DARK → WHITE TRANSITION ── */}
      <div
        className="h-16 w-full"
        style={{ background: 'linear-gradient(to bottom, #0f172a, #ffffff)' }}
      />

      {/* ── SECTION 4: FAQ ── */}
      <section className="py-20 sm:py-24 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tighter text-center mb-12">
            Questions Answered
          </h2>
          <FAQAccordion items={FAQS} />
        </div>
      </section>

      {/* ── SECTION 5: FINAL CTA ── */}
      <section className="relative py-20 sm:py-24 px-4 overflow-hidden">
        <HeroBackground />

        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tighter mb-3">
            {daysLabel}
          </h2>
          <p className="text-slate-600 font-medium text-base sm:text-lg mb-8">
            Once it's gone, it's gone. No exceptions.
          </p>

          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-red-50 border border-red-200">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <span className="text-sm font-bold text-red-700">Only {FOUNDERS_SPOTS_LEFT} Spots Remaining</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 mb-6">
            {checkoutError && (
              <div className="flex items-start gap-2 w-full max-w-md p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-left">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{checkoutError}</span>
              </div>
            )}
            <CTAButton isLoading={isCheckingOut} onClick={handleCheckout} />
          </div>

          <p className="text-sm text-slate-500">
            Questions?{' '}
            <a
              href="mailto:hello@huttleai.com"
              className="text-slate-700 hover:text-[#01bad2] transition-colors font-medium underline-offset-2 hover:underline"
            >
              hello@huttleai.com
            </a>
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-100 py-8 px-4 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <Link to="/" className="flex items-center">
            <img src="/huttle-logo.png" alt="Huttle AI" className="h-7 w-auto" />
          </Link>
          <p>
            © 2026 Huttle AI ·{' '}
            <a
              href="mailto:hello@huttleai.com"
              className="text-slate-700 hover:text-[#01bad2] transition-colors font-medium"
            >
              hello@huttleai.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
