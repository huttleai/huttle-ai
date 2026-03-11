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
        <p className="mb-10 text-sm italic text-slate-500">Last updated: March 2026</p>

        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Founders Club &amp; Builders Club (Annual Plans)
            </h2>
            <div className="space-y-4 text-sm leading-relaxed text-slate-600">
              <p>
                We offer a 14-day money-back guarantee on all annual plan purchases. If you're not
                satisfied with Huttle AI for any reason within 14 days of your purchase, contact us
                and we'll issue a full refund - no questions asked.
              </p>

              <div>
                <p className="mb-3 font-semibold text-slate-900">To request a refund:</p>
                <ol className="ml-5 list-decimal space-y-2">
                  <li>Email hello@huttleai.com within 14 days of your purchase</li>
                  <li>Include your order number or the email address used at checkout</li>
                  <li>We'll process your refund within 24 hours</li>
                  <li>Funds typically appear within 5-10 business days depending on your bank</li>
                </ol>
              </div>

              <p>
                After 14 days, annual plan purchases are non-refundable but you retain access for
                the full year you paid for.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Essentials &amp; Pro (Monthly Plans)
            </h2>
            <div className="space-y-4 text-sm leading-relaxed text-slate-600">
              <p>
                Monthly plans are not eligible for refunds. You can cancel at any time from your
                account settings and you will not be charged for the next billing cycle. You retain
                access until the end of your current paid period.
              </p>
              <p>Your 7-day free trial gives you full access before any charge - no surprises.</p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-slate-900">Questions?</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Email us at hello@huttleai.com and we'll get back to you within 24 hours.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
