import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowRight, Home } from 'lucide-react';

function LegalCallout({ tone = 'cyan', title, children }) {
  const toneClasses = {
    cyan: 'border-cyan-200 bg-cyan-50/80 text-slate-700',
    yellow: 'border-amber-200 bg-amber-50/80 text-slate-700',
  };

  return (
    <div className={`rounded-2xl border p-5 sm:p-6 ${toneClasses[tone] ?? toneClasses.cyan}`}>
      {title ? (
        <p className="mb-2 text-sm font-semibold text-slate-900">{title}</p>
      ) : null}
      <div className="space-y-3 text-sm leading-7 sm:text-[15px]">{children}</div>
    </div>
  );
}

function LegalSection({ section, index }) {
  return (
    <section
      id={section.id}
      className="scroll-mt-28 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-sm font-bold text-huttle-primary shadow-sm">
          {index + 1}
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{section.title}</h2>
          {section.summary ? (
            <p className="mt-2 text-sm leading-7 text-slate-500 sm:text-[15px]">{section.summary}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-5 border-l-2 border-cyan-100 pl-5 text-sm leading-7 text-slate-700 sm:text-[15px]">
        {section.content}
      </div>
    </section>
  );
}

function TocLink({ href, children }) {
  return (
    <a
      href={href}
      className="block rounded-xl px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
    >
      {children}
    </a>
  );
}

export default function LegalPageLayout({
  title,
  lastUpdated,
  effectiveDate,
  intro,
  sections,
  children,
}) {
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
      <nav className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-2 md:pt-3">
        <div className="flex w-full max-w-6xl items-center justify-between gap-3 rounded-full border border-slate-200/70 bg-white/85 px-4 py-3 shadow-lg shadow-slate-200/40 backdrop-blur-xl md:px-8 md:py-3.5">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight text-slate-900">
            <img src="/huttle-logo.png" alt="Huttle AI" className="h-6 w-auto md:h-8" />
          </Link>

          <div className="flex items-center gap-2 md:gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Home</span>
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-huttle-gradient px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-200/80 hover:shadow-lg hover:shadow-cyan-200"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="px-4 pb-16 pt-28 sm:px-6 sm:pt-32 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8 lg:p-10">
            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-huttle-primary">
                Legal
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">{title}</h1>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                  Last updated: {lastUpdated}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                  Effective date: {effectiveDate}
                </span>
              </div>
              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">{intro}</p>
            </div>
          </div>

          <div className="mt-6 lg:hidden">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <button
                type="button"
                onClick={() => setIsMobileTocOpen((current) => !current)}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">Table of Contents</p>
                  <p className="mt-1 text-sm text-slate-500">Jump to a section</p>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-slate-400 transition-transform ${isMobileTocOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isMobileTocOpen ? (
                <div className="mt-4 space-y-1 border-t border-slate-100 pt-4">
                  {sections.map((section, index) => (
                    <TocLink key={section.id} href={`#${section.id}`}>
                      {index + 1}. {section.title}
                    </TocLink>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <div className="sticky top-28 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Table of Contents</p>
                <p className="mt-1 text-sm text-slate-500">Jump to any section.</p>
                <div className="mt-4 space-y-1">
                  {sections.map((section, index) => (
                    <TocLink key={section.id} href={`#${section.id}`}>
                      {index + 1}. {section.title}
                    </TocLink>
                  ))}
                </div>
              </div>
            </aside>

            <div className="space-y-6">
              {children}
              {sections.map((section, index) => (
                <LegalSection key={section.id} section={section} index={index} />
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white/90 px-4 py-10 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <img src="/huttle-logo.png" alt="Huttle AI" className="h-6 w-auto" />
          </div>
          <p className="text-sm text-slate-500">
            © 2026 Huttle AI ·{' '}
            <Link to="/terms" className="underline-offset-2 hover:text-slate-700 hover:underline">
              Terms of Service
            </Link>{' '}
            ·{' '}
            <Link to="/privacy" className="underline-offset-2 hover:text-slate-700 hover:underline">
              Privacy Policy
            </Link>
          </p>
          <p className="text-xs text-slate-400">
            Questions?{' '}
            <a href="mailto:support@huttleai.com" className="hover:text-slate-600 hover:underline">
              support@huttleai.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export { LegalCallout };
