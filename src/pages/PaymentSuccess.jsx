import { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { AuthContext } from '../context/AuthContext';
import { clearSubscriptionCache } from '../context/SubscriptionContext';

function AnimatedCheckmark() {
  return (
    <>
      <style>{`
        @keyframes ps-circle-draw {
          from { stroke-dashoffset: 166; opacity: 0; }
          10% { opacity: 1; }
          to { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes ps-check-draw {
          from { stroke-dashoffset: 50; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes ps-circle-bg {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        .ps-circle-bg {
          animation: ps-circle-bg 0.35s ease-out 0.1s both;
        }
        .ps-circle {
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          animation: ps-circle-draw 0.65s cubic-bezier(0.65, 0, 0.45, 1) 0.15s both;
        }
        .ps-check {
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: ps-check-draw 0.35s cubic-bezier(0.65, 0, 0.45, 1) 0.8s both;
        }
      `}</style>
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="ps-circle-bg absolute inset-0 rounded-full bg-green-50" />
        <svg className="w-20 h-20 relative" viewBox="0 0 56 56" fill="none">
          <circle
            className="ps-circle"
            cx="28"
            cy="28"
            r="26"
            stroke="#22c55e"
            strokeWidth="2.5"
          />
          <path
            className="ps-check"
            d="M17 28 L25 36 L39 20"
            stroke="#22c55e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </>
  );
}

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);

  useEffect(() => {
    clearSubscriptionCache();
  }, []);

  useEffect(() => {
    if (authContext?.user?.id) {
      localStorage.setItem(`payment_confirmed_${authContext.user.id}`, 'true');
    }
  }, [authContext?.user?.id]);

  // Prevent escape from dismissing (non-dismissible modal) + fire confetti
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') e.preventDefault();
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0ea5e9', '#06b6d4', '#10b981', '#ffffff'],
      });
    }, 300);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">

      {/* ── BRANDED BACKGROUND ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-cyan-50/40" />
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(43,143,199,0.12) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="absolute -top-1/3 -left-1/4 w-[600px] h-[600px] bg-[#01bad2]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-1/3 -right-1/4 w-[500px] h-[500px] bg-[#2B8FC7]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Logo centered on background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img src="/huttle-logo.png" alt="Huttle AI" className="h-16 sm:h-20 w-auto opacity-10" />
      </div>

      {/* ── NON-DISMISSIBLE MODAL OVERLAY ── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && e.stopPropagation()}
      >
        <div
          className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 sm:p-10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2B8FC7] to-[#01bad2]" />

          {/* Animated checkmark */}
          <AnimatedCheckmark />

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-4 leading-tight">
            You're In. Welcome to Huttle AI.
          </h1>

          {/* Body */}
          <div className="text-sm sm:text-base text-slate-600 leading-relaxed space-y-4 mb-8 text-center">
            <p>We are setting up your account now.</p>
            <p>
              You will receive a welcome email from us within the next few minutes. Please check your inbox and your spam folder — it may land there on first send.
            </p>
            <p>
              Click the link inside the email to create your password and access your dashboard.
            </p>
            <p>
              If you do not see the email within 10 minutes, contact us at{' '}
              <a href="mailto:hello@huttleai.com" className="text-[#01bad2] font-medium">
                hello@huttleai.com
              </a>{' '}
              and we will get you sorted immediately.
            </p>
          </div>

          {/* CTA button */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full h-14 rounded-xl bg-gradient-to-r from-[#2B8FC7] to-[#01bad2] text-white font-bold text-base shadow-lg shadow-[#01bad2]/20 hover:shadow-[#01bad2]/35 transition-shadow flex items-center justify-center gap-2"
          >
            Got It — Take Me to Huttle AI
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
