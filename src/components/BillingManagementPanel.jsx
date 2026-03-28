import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, CalendarClock, CreditCard, ExternalLink, FileText, Loader2, Download } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import {
  SUBSCRIPTION_PLANS,
  changeSubscriptionPlan,
  createPaymentMethodUpdateSession,
  getBillingInvoices,
  getBillingSummary,
} from '../services/stripeAPI';
import UpdateCardModal from './UpdateCardModal';
import { CardNetworkMark } from './CardNetworkMark';

function formatDate(dateValue) {
  if (!dateValue) return '—';
  return new Date(dateValue).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount, currency = 'usd') {
  if (typeof amount !== 'number') return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function normalizeTier(tierValue) {
  const normalized = String(tierValue || '').toLowerCase();
  if (['founder', 'founders', 'founders_club'].includes(normalized)) return 'founder';
  if (['builder', 'builders', 'builders_club'].includes(normalized)) return 'builder';
  if (['essentials'].includes(normalized)) return 'essentials';
  if (['pro'].includes(normalized)) return 'pro';
  return null;
}

export default function BillingManagementPanel({
  subscription = null,
  userTier = null,
  compact = false,
  showPlanSwitcher = true,
  showManageAction = true,
  onSubscriptionUpdated = null,
}) {
  const { addToast } = useToast();
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [invoicesFetchFailed, setInvoicesFetchFailed] = useState(false);
  const [loadErrorSeverity, setLoadErrorSeverity] = useState('fatal');
  const [showUpdateCard, setShowUpdateCard] = useState(false);
  const [paymentMethodOverride, setPaymentMethodOverride] = useState(null);

  const normalizedTier = normalizeTier(userTier || subscription?.tier || subscription?.plan);
  const isFounderTier = normalizedTier === 'founder' || normalizedTier === 'builder';
  const currentSubscription = summary?.subscription || subscription;
  const paymentMethod = paymentMethodOverride || summary?.paymentMethod || null;
  const visibleInvoices = compact ? invoices.slice(0, 3) : invoices;

  const loadBillingData = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [summaryResult, invoicesResult] = await Promise.all([
        getBillingSummary(),
        getBillingInvoices(),
      ]);

      if (summaryResult.success) {
        setSummary(summaryResult.summary || null);
      } else {
        setSummary(null);
      }

      if (invoicesResult.success) {
        setInvoices(invoicesResult.invoices || []);
        setInvoicesFetchFailed(false);
      } else {
        setInvoices([]);
        setInvoicesFetchFailed(true);
      }

      const summaryFailed = !summaryResult.success;
      const invoicesFailed = !invoicesResult.success;

      if (summaryFailed && invoicesFailed) {
        setLoadErrorSeverity('fatal');
        setLoadError(
          [summaryResult.error, invoicesResult.error].filter(Boolean).join(' ') ||
            'Could not load billing details.'
        );
      } else if (summaryFailed) {
        setLoadErrorSeverity('partial');
        setLoadError(summaryResult.error || 'Live payment details could not be loaded.');
      } else if (invoicesFailed) {
        setLoadErrorSeverity('partial');
        setLoadError(invoicesResult.error || 'Invoice history could not be loaded.');
      } else {
        setLoadError('');
        setLoadErrorSeverity('fatal');
      }
    } catch (error) {
      console.error('Billing panel load error:', error);
      setLoadErrorSeverity('fatal');
      setLoadError(error.message || 'Could not load billing details.');
      setInvoicesFetchFailed(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadBillingData();
  }, [loadBillingData]);

  const handleManageBilling = async () => {
    try {
      await createPaymentMethodUpdateSession({
        returnUrl: window.location.href,
      });
    } catch (error) {
      console.error('Manage billing error:', error);
      addToast('Could not open billing management.', 'error');
    }
  };

  const handlePlanChange = async (targetPlanId) => {
    setActionLoading(`plan-${targetPlanId}`);

    try {
      const result = await changeSubscriptionPlan({
        targetPlanId,
        billingCycle: 'monthly',
      });

      if (!result.success) {
        throw new Error(result.error || 'Could not change your plan.');
      }

      addToast(
        result.mode === 'scheduled' && result.effectiveAt
          ? `${result.message} Effective ${formatDate(result.effectiveAt)}.`
          : result.message || 'Your billing plan has been updated.',
        'success'
      );

      await loadBillingData({ silent: true });
      if (typeof onSubscriptionUpdated === 'function') {
        await onSubscriptionUpdated();
      }
    } catch (error) {
      console.error('Plan change error:', error);
      addToast(error.message || 'Could not change your plan.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCardUpdated = (newPaymentMethod) => {
    if (newPaymentMethod) {
      setPaymentMethodOverride(newPaymentMethod);
    }
    void loadBillingData({ silent: true });
  };

  const monthlyPlanOptions = useMemo(() => [
    {
      id: SUBSCRIPTION_PLANS.ESSENTIALS.id,
      name: SUBSCRIPTION_PLANS.ESSENTIALS.name,
      price: `$${SUBSCRIPTION_PLANS.ESSENTIALS.monthlyPrice}/month`,
      features: SUBSCRIPTION_PLANS.ESSENTIALS.features.features.slice(0, 3),
    },
    {
      id: SUBSCRIPTION_PLANS.PRO.id,
      name: SUBSCRIPTION_PLANS.PRO.name,
      price: `$${SUBSCRIPTION_PLANS.PRO.monthlyPrice}/month`,
      features: SUBSCRIPTION_PLANS.PRO.features.features.slice(0, 3),
    },
  ], []);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-huttle-primary" />
          <div>
            <p className="font-semibold text-gray-900">Loading billing details</p>
            <p className="mt-1 text-sm text-gray-500">Pulling your payment method, invoices, and billing status.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {loadError && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          loadErrorSeverity === 'partial'
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {loadError}
        </div>
      )}

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {/* Payment method card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-huttle-primary" />
              <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowUpdateCard(true)}
              className="rounded-lg border border-huttle-primary/30 bg-huttle-primary-light px-3 py-1.5 text-xs font-semibold text-huttle-primary transition-colors hover:bg-huttle-primary/10"
            >
              Update Card
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            {paymentMethod?.brand && paymentMethod?.last4 ? (
              <div className="flex flex-wrap items-center gap-2 text-base text-gray-900">
                <CardNetworkMark brand={paymentMethod.brand} />
                <span className="font-medium">•••• {paymentMethod.last4}</span>
                {paymentMethod.expMonth && paymentMethod.expYear && (
                  <span className="text-sm text-gray-500">
                    Exp {String(paymentMethod.expMonth).padStart(2, '0')}/{String(paymentMethod.expYear).slice(-2)}
                  </span>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-500">No card on file</p>
                <p className="text-xs text-gray-400 mt-1">Add a card to keep renewals uninterrupted.</p>
              </div>
            )}
          </div>

          <div className="mt-3 text-right">
            <button
              onClick={handleManageBilling}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Stripe Billing Portal
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Billing status card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-huttle-primary" />
            <h3 className="text-lg font-semibold text-gray-900">Billing Status</h3>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <span className="text-gray-500">Start date</span>
              <span className="font-semibold text-gray-900">{formatDate(currentSubscription?.currentPeriodStart)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <span className="text-gray-500">Renewal date</span>
              <span className="font-semibold text-gray-900">{formatDate(currentSubscription?.currentPeriodEnd)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <span className="text-gray-500">Status</span>
              <span className={`inline-flex items-center gap-1.5 font-semibold capitalize ${
                currentSubscription?.status === 'active' || currentSubscription?.status === 'trialing'
                  ? 'text-green-600'
                  : currentSubscription?.status === 'past_due'
                    ? 'text-amber-600'
                    : 'text-gray-500'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  currentSubscription?.status === 'active' || currentSubscription?.status === 'trialing'
                    ? 'bg-green-500'
                    : currentSubscription?.status === 'past_due'
                      ? 'bg-amber-500'
                      : 'bg-gray-400'
                }`} />
                {currentSubscription?.status || 'inactive'}
              </span>
            </div>
            {currentSubscription?.upcomingPlanChange && (
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
                <p className="font-semibold text-cyan-900">
                  Scheduled: {currentSubscription.upcomingPlanChange.plan === 'pro' ? 'Pro' : 'Essentials'}
                </p>
                <p className="mt-1 text-gray-600">
                  Effective {formatDate(currentSubscription.upcomingPlanChange.effectiveAt)}.
                </p>
              </div>
            )}
            {currentSubscription?.cancelAtPeriodEnd && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="font-semibold text-amber-900">Cancellation scheduled</p>
                <p className="mt-1 text-gray-600">
                  Access remains until {formatDate(currentSubscription.currentPeriodEnd)}.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plan switcher */}
      {!compact && showPlanSwitcher && !isFounderTier && ['essentials', 'pro'].includes(normalizedTier || '') && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-huttle-primary" />
            <h3 className="text-lg font-semibold text-gray-900">Change Plan</h3>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Upgrades take effect immediately. Downgrades apply at your next renewal.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {monthlyPlanOptions.map((plan) => {
              const isCurrentPlan = plan.id === normalizedTier;
              return (
                <div
                  key={plan.id}
                  className={`rounded-xl border p-5 ${
                    isCurrentPlan
                      ? 'border-huttle-primary bg-huttle-primary-light'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                      <p className="mt-1 text-sm text-gray-500">{plan.price}</p>
                    </div>
                    {isCurrentPlan && (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-huttle-primary shadow-sm">
                        Current
                      </span>
                    )}
                  </div>

                  <ul className="mt-4 space-y-2 text-sm text-gray-600">
                    {plan.features.map((feature) => (
                      <li key={feature}>• {feature}</li>
                    ))}
                  </ul>

                  {!isCurrentPlan && (
                    <button
                      type="button"
                      onClick={() => handlePlanChange(plan.id)}
                      disabled={actionLoading === `plan-${plan.id}`}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100 disabled:opacity-50"
                    >
                      {actionLoading === `plan-${plan.id}` ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        `Switch to ${plan.name}`
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invoices */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-huttle-primary" />
            <h3 className="text-lg font-semibold text-gray-900">Invoices</h3>
          </div>
          <button
            type="button"
            onClick={() => loadBillingData({ silent: true })}
            disabled={isRefreshing}
            className="text-sm font-semibold text-huttle-primary hover:text-huttle-primary-dark disabled:opacity-50"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {visibleInvoices.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            {invoicesFetchFailed
              ? "Couldn't load invoices from Stripe. Try Refresh."
              : 'Your first invoice will appear here after your trial ends.'}
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {visibleInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(invoice.amountPaid || invoice.amountDue, invoice.currency)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">{formatDate(invoice.createdAt)}</p>
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

                <div className="flex gap-2">
                  {invoice.invoicePdf && (
                    <a
                      href={invoice.invoicePdf}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                    >
                      <Download className="h-3 w-3" />
                      PDF
                    </a>
                  )}
                  {invoice.hostedInvoiceUrl && (
                    <a
                      href={invoice.hostedInvoiceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <UpdateCardModal
        isOpen={showUpdateCard}
        onClose={() => setShowUpdateCard(false)}
        onSuccess={handleCardUpdated}
      />
    </div>
  );
}
