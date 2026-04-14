import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LogIn } from 'lucide-react';

export default function FoundersPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col overflow-x-hidden">
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

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-24 md:py-32">
        <div className="max-w-xl w-full mx-auto text-center">
          {/* Eyebrow */}
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-5">
            Offer Ended
          </p>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 tracking-tighter leading-[1.05] mb-4">
            Founders Club is now closed.
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#2B8FC7] to-[#01bad2] mb-6">
            Huttle AI is still open — and better than ever.
          </p>

          {/* Body copy */}
          <p className="text-base sm:text-lg text-slate-500 leading-relaxed max-w-lg mx-auto mb-10">
            If you followed a Founders link, that pricing window has ended. But you can still get
            full access to Huttle AI through our current plans: Builders Club (our limited time
            offer) or Essentials and Pro monthly plans with a 7-day trial.
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col items-center gap-3">
            <Link
              to="/#pricing"
              className="inline-flex items-center justify-center gap-2.5 px-10 py-4 rounded-full bg-gradient-to-r from-[#2B8FC7] to-[#01bad2] text-white font-bold text-lg shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] transition-all duration-200 active:scale-[0.98]"
            >
              See Current Plans
              <ArrowRight size={20} />
            </Link>

            {/* Secondary muted line */}
            <p className="text-sm text-slate-400 font-medium">
              Builders Club closes April 22 · Monthly plans start at $15/month
            </p>
          </div>
        </div>
      </main>

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
