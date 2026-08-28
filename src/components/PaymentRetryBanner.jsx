import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { PAYMENT_RETRY_BANNER_MESSAGE } from '../config/subscriptionAccess';

export function PaymentRetryBanner() {
  const { isPaymentRetry } = useSubscription();
  if (!isPaymentRetry) return null;

  return (
    <div
      className="fixed top-14 z-30 left-0 md:left-12 lg:left-64 right-0 border-b border-amber-200 bg-amber-50 px-4 py-2.5"
      role="status"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{PAYMENT_RETRY_BANNER_MESSAGE}</span>
        </p>
        <Link
          to="/dashboard/subscription"
          className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-800"
        >
          Update card
        </Link>
      </div>
    </div>
  );
}
