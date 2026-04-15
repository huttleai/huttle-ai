import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-[680px] px-4 py-12 sm:px-6 sm:py-16">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-huttle-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-slate-900 sm:text-4xl">Refund Policy</h1>
        <p className="mb-10 text-sm italic text-slate-500">Last updated: April 2026</p>

        <div className="space-y-10">

          {/* ── Builders Club ── */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Builders Club (Annual Plan) — 14-Day Happiness Guarantee
            </h2>
            <div className="space-y-4 text-sm leading-relaxed text-slate-600">
              <p>
                Builders Club members are covered by our 14-day happiness guarantee. If you are not
                satisfied with Huttle AI for any reason within 14 days of your purchase date, contact
                us and we will issue a full refund — no questions asked.
              </p>

              <div>
                <p className="mb-3 font-semibold text-slate-900">To request a refund:</p>
                <ol className="ml-5 list-decimal space-y-2">
                  <li>Email <a href="mailto:support@huttleai.com" className="text-huttle-primary hover:underline">support@huttleai.com</a> within 14 days of your purchase</li>
                  <li>Include your order number or the email address used at checkout</li>
                  <li>We will process your refund within 24 hours of approval</li>
                  <li>Funds typically appear within 5–10 business days depending on your bank or card issuer</li>
                </ol>
              </div>

              <p>
                After 14 days from the purchase date, Builders Club annual plans are non-refundable.
                You retain full access to the platform for the remainder of your paid year.
              </p>
            </div>
          </section>

          {/* ── Essentials & Pro Annual ── */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Essentials &amp; Pro (Annual Plans)
            </h2>
            <div className="space-y-4 text-sm leading-relaxed text-slate-600">
              <p>
                Annual plan refund requests for Essentials and Pro submitted within 30 days of
                purchase will be reviewed on a case-by-case basis. To request a refund, email{' '}
                <a href="mailto:support@huttleai.com" className="text-huttle-primary hover:underline">
                  support@huttleai.com
                </a>{' '}
                with your account email and reason for the request.
              </p>
              <p>
                No refunds are available after 30 days from the purchase date. You retain access for
                the full year you paid for.
              </p>
            </div>
          </section>

          {/* ── Essentials & Pro Monthly ── */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Essentials &amp; Pro (Monthly Plans)
            </h2>
            <div className="space-y-4 text-sm leading-relaxed text-slate-600">
              <p>
                Monthly plans are not eligible for refunds for partial months or unused time. You can
                cancel at any time from your account settings and you will not be charged for the next
                billing cycle. You retain access until the end of your current paid period.
              </p>
            </div>
          </section>

          {/* ── 7-Day Free Trial ── */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              7-Day Free Trial (Essentials &amp; Pro)
            </h2>
            <div className="space-y-4 text-sm leading-relaxed text-slate-600">
              <p>
                New subscribers on Essentials and Pro plans may be eligible for a 7-day free trial. No
                charge is applied during the trial period. If you cancel before the trial ends, you will
                not be billed. If you do not cancel, your subscription will begin automatically at the
                end of the trial and you will be charged for the first billing period.
              </p>
              <p>
                Trial eligibility is determined by Huttle AI in its sole discretion and may be limited
                or discontinued at any time.
              </p>
            </div>
          </section>

          {/* ── Founders Club (Grandfathered) ── */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Founders Club (Grandfathered Members)
            </h2>
            <div className="space-y-4 text-sm leading-relaxed text-slate-600">
              <p>
                The Founders Club plan is no longer available for new purchase. Existing Founders Club
                members are grandfathered at their original rate. Refund eligibility for Founders Club
                was subject to a 14-day window from the original purchase date. That window has now
                passed for all Founders Club members. Ongoing renewals are non-refundable.
              </p>
            </div>
          </section>

          {/* ── Questions ── */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-slate-900">Questions?</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Email us at{' '}
              <a href="mailto:support@huttleai.com" className="text-huttle-primary hover:underline">
                support@huttleai.com
              </a>{' '}
              and we will get back to you within 24 hours.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
