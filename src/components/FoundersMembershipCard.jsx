import { useState } from 'react';
import { AlertTriangle, CalendarClock, Check, ExternalLink, Loader2, Shield, Sparkles, Zap } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { SUBSCRIPTION_PLANS, cancelSubscription, createPaymentMethodUpdateSession } from '../services/stripeAPI';
import { CardNetworkMark } from './CardNetworkMark';
import UpdateCardModal from './UpdateCardModal';

function formatDate(dateValue) {
  if (!dateValue) return 'Loading...';
  return new Date(dateValue).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function normalizeTier(tierValue) {
  const normalizedTier = String(tierValue || '').toLowerCase();
  if (['founder', 'founders', 'founders_club'].includes(normalizedTier)) return 'founder';
  if (['builder', 'builders', 'builders_club'].includes(normalizedTier)) return 'builder';
  return null;
}

export default function FoundersMembershipCard({
  subscription,
  user,
  onCancelled = null,
  billingData = null,
  invoices = [],
  onBillingRefresh = null,
}) {
  const { addToast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showUpdateCard, setShowUpdateCard] = useState(false);
  const [paymentMethodOverride, setPaymentMethodOverride] = useState(null);

  const tierKey = normalizeTier(subscription?.tier || subscription?.plan);
  const isFounder = tierKey === 'founder';
  const membershipName = isFounder ? 'Founders Club' : 'Builders Club';
  const membershipBadgeLabel = isFounder ? 'Founding Member' : 'Builders Club';
  const expiryDate = formatDate(subscription?.currentPeriodEnd);
  const startDate = formatDate(subscription?.currentPeriodStart);
  const planBenefits = isFounder
    ? SUBSCRIPTION_PLANS.FOUNDER.features.features
    : SUBSCRIPTION_PLANS.BUILDER.features.features;
  const pricingLabel = isFounder
    ? '$199/year — locked in for life'
    : '$249/year — locked while active';
  const isCancellationScheduled = Boolean(subscription?.cancelAtPeriodEnd);

  const paymentMethod = paymentMethodOverride || billingData?.paymentMethod || null;

  const handleCancelMembership = async () => {
    if (!user?.id) {
      addToast('Please sign in again to manage your membership.', 'error');
      return;
    }

    setIsCancelling(true);

    try {
      const result = await cancelSubscription();
      if (!result.success) {
        throw new Error(result.error || 'Could not cancel your membership.');
      }

      setIsConfirmOpen(false);
      addToast(
        `Your membership has been cancelled. You'll keep access until ${formatDate(result.accessUntil || subscription?.currentPeriodEnd)}.`,
        'success'
      );

      if (typeof onCancelled === 'function') {
        await onCancelled();
      }
    } catch (error) {
      console.error('Founders membership cancellation error:', error);
      addToast(error.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCardUpdated = (newPaymentMethod) => {
    if (newPaymentMethod) {
      setPaymentMethodOverride(newPaymentMethod);
    }
    if (typeof onBillingRefresh === 'function') {
      onBillingRefresh();
    }
  };

  const handleManageBilling = async () => {
    try {
      await createPaymentMethodUpdateSession({
        returnUrl: window.location.href,
      });
    } catch {
      addToast('Could not open billing portal.', 'error');
    }
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Top banner */}
        <div className="border-b border-gray-100 bg-gradient-to-r from-huttle-primary-light via-white to-white px-6 py-5 md:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-huttle-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
              {isFounder ? <Sparkles className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
              {membershipBadgeLabel}
            </span>
            <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              isCancellationScheduled
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isCancellationScheduled ? 'bg-amber-500' : 'bg-green-500'}`} />
              {isCancellationScheduled ? 'Cancellation Scheduled' : 'Active'}
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-500">{pricingLabel}</p>
        </div>

        {/* Main content grid */}
        <div className="grid gap-6 px-6 py-6 md:grid-cols-[1.1fr_0.9fr] md:px-8">
          <div className="space-y-4">
            {/* Date stats */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Start Date</p>
                <p className="mt-2 text-base font-semibold text-gray-900">{startDate}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  {isCancellationScheduled ? 'Access Until' : 'Renewal Date'}
                </p>
                <p className="mt-2 text-base font-semibold text-gray-900">{expiryDate}</p>
              </div>
            </div>

            {/* Payment method card */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Payment Method</p>
                  {paymentMethod?.brand && paymentMethod?.last4 ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-900">
                      <CardNetworkMark brand={paymentMethod.brand} />
                      <span className="font-medium">•••• {paymentMethod.last4}</span>
                      {paymentMethod.expMonth && paymentMethod.expYear && (
                        <span className="text-gray-500">
                          Exp {String(paymentMethod.expMonth).padStart(2, '0')}/{String(paymentMethod.expYear).slice(-2)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">No card on file</p>
                  )}
                </div>
                <button
                  onClick={() => setShowUpdateCard(true)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:border-huttle-primary"
                >
                  Update
                </button>
              </div>
            </div>

            {/* Pricing lock callout */}
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 h-5 w-5 flex-shrink-0 text-huttle-primary" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Lifetime member pricing</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {isFounder
                      ? 'Your Founders rate stays locked for life, even as Huttle AI evolves.'
                      : 'Your Builders rate stays locked while your membership remains active.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits column */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-huttle-primary" />
              <h3 className="text-lg font-bold text-gray-900">Your Benefits</h3>
            </div>

            <ul className="mt-4 space-y-3">
              {planBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-huttle-primary/10 text-huttle-primary">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Invoices section */}
        {invoices.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-5 md:px-8">
            <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400 mb-3">Recent Invoices</h3>
            <div className="space-y-2">
              {invoices.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {typeof invoice.amountPaid === 'number'
                          ? `$${(invoice.amountPaid / 100).toFixed(2)}`
                          : typeof invoice.amountDue === 'number'
                            ? `$${(invoice.amountDue / 100).toFixed(2)}`
                            : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(invoice.createdAt)}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      invoice.status === 'paid'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : invoice.status === 'open'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {invoice.status === 'paid' ? 'Paid' : invoice.status === 'open' ? 'Open' : 'Failed'}
                    </span>
                  </div>
                  {invoice.invoicePdf && (
                    <a
                      href={invoice.invoicePdf}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-gray-500 hover:text-huttle-primary transition-colors"
                    >
                      PDF
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="border-t border-gray-100 px-6 py-4 md:px-8 flex items-center justify-between">
          {isCancellationScheduled ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              Cancellation scheduled — access until {expiryDate}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              disabled={isCancelling}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:border-red-300 disabled:opacity-50"
            >
              {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Cancel Membership
            </button>
          )}
          <button
            onClick={handleManageBilling}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Stripe Billing Portal
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Cancel confirmation modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Cancel {membershipName}?</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Are you sure? You&apos;ll keep access until {expiryDate}. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isCancelling}
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Keep My Membership
              </button>
              <button
                type="button"
                onClick={handleCancelMembership}
                disabled={isCancelling}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <UpdateCardModal
        isOpen={showUpdateCard}
        onClose={() => setShowUpdateCard(false)}
        onSuccess={handleCardUpdated}
      />
    </>
  );
}
