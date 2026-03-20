import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, CalendarClock, CreditCard, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import {
  SUBSCRIPTION_PLANS,
  changeSubscriptionPlan,
  createPaymentMethodUpdateSession,
  getBillingInvoices,
  getBillingSummary,
} from '../services/stripeAPI';

function formatDate(dateValue) {
  if (!dateValue) return 'Not available';

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

function formatCardLabel(paymentMethod) {
  if (!paymentMethod?.brand || !paymentMethod?.last4) {
    return 'No card on file';
  }

  const brand = paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1);
  return `${brand} ending in ${paymentMethod.last4}`;
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
  /** True when the invoices API failed (vs genuinely having no invoices). */
  const [invoicesFetchFailed, setInvoicesFetchFailed] = useState(false);
  /** 'fatal' = both Stripe helpers failed; 'partial' = one failed — softer banner. */
  const [loadErrorSeverity, setLoadErrorSeverity] = useState('fatal');

  const normalizedTier = normalizeTier(userTier || subscription?.tier || subscription?.plan);
  const isFounderTier = normalizedTier === 'founder' || normalizedTier === 'builder';
  const currentSubscription = summary?.subscription || subscription;
  const paymentMethod = summary?.paymentMethod || null;
  const visibleInvoices = compact ? invoices.slice(0, 3) : invoices;

  const loadBillingData = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Run in parallel but apply partial success: subscription context still
      // supplies renewal dates if /api/billing-summary fails (e.g. local API
      // not running, Stripe 500, or missing env).
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
        setLoadError(
          summaryResult.error ||
            'Live payment details could not be loaded. Dates below use your account subscription data.'
        );
      } else if (invoicesFailed) {
        setLoadErrorSeverity('partial');
        setLoadError(
          invoicesResult.error ||
            'Invoice history could not be loaded. Card updates and plan changes still work.'
        );
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
    setActionLoading('payment-method');

    try {
      const result = await createPaymentMethodUpdateSession({
        returnUrl: window.location.href,
      });

      if (result.demo) {
        addToast('Billing management is temporarily simulated in demo mode.', 'info');
        return;
      }

      if (!result.success) {
        throw new Error(result.error || 'Could not open billing management.');
      }
    } catch (error) {
      console.error('Manage billing error:', error);
      addToast(error.message || 'Could not open billing management.', 'error');
    } finally {
      setActionLoading(null);
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
            <p className="mt-1 text-sm text-gray-600">Pulling your payment method, invoices, and billing status.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loadError && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            loadErrorSeverity === 'partial'
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {loadError}
        </div>
      )}

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-huttle-primary" />
                <h3 className="text-lg font-semibold text-gray-900">Manage Billing</h3>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Securely update your renewal card and keep your billing profile current.
              </p>
            </div>
            {showManageAction && (
              <button
                type="button"
                onClick={handleManageBilling}
                disabled={actionLoading === 'payment-method'}
                className="btn-primary whitespace-nowrap"
              >
                {actionLoading === 'payment-method' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Opening...
                  </>
                ) : (
                  'Manage Billing'
                )}
              </button>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Default Payment Method</p>
            <p className="mt-2 text-base font-semibold text-gray-900">{formatCardLabel(paymentMethod)}</p>
            <p className="mt-1 text-sm text-gray-600">
              {paymentMethod?.expMonth && paymentMethod?.expYear
                ? `Expires ${String(paymentMethod.expMonth).padStart(2, '0')}/${paymentMethod.expYear}`
                : 'Add a card to keep renewals uninterrupted.'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-huttle-primary" />
            <h3 className="text-lg font-semibold text-gray-900">Billing Status</h3>
          </div>

          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <span>Current billing date</span>
              <span className="font-semibold text-gray-900">{formatDate(currentSubscription?.currentPeriodEnd)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <span>Status</span>
              <span className="font-semibold capitalize text-gray-900">{currentSubscription?.status || 'inactive'}</span>
            </div>
            {currentSubscription?.upcomingPlanChange && (
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
                <p className="font-semibold text-cyan-900">
                  Scheduled change: {currentSubscription.upcomingPlanChange.plan === 'pro' ? 'Pro' : 'Essentials'}
                </p>
                <p className="mt-1 text-cyan-800">
                  Effective {formatDate(currentSubscription.upcomingPlanChange.effectiveAt)}.
                </p>
              </div>
            )}
            {currentSubscription?.cancelAtPeriodEnd && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="font-semibold text-amber-900">Cancellation scheduled</p>
                <p className="mt-1 text-amber-800">
                  Access remains active until {formatDate(currentSubscription.currentPeriodEnd)}.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {!compact && showPlanSwitcher && !isFounderTier && ['essentials', 'pro'].includes(normalizedTier || '') && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-huttle-primary" />
            <h3 className="text-lg font-semibold text-gray-900">Change Plan</h3>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Switch between Essentials and Pro without leaving your billing center. Upgrades take effect immediately. Downgrades are scheduled for your next renewal.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {monthlyPlanOptions.map((plan) => {
              const isCurrentPlan = plan.id === normalizedTier;
              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border p-5 ${
                    isCurrentPlan
                      ? 'border-huttle-primary bg-huttle-primary/5'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                      <p className="mt-1 text-sm text-gray-600">{plan.price}</p>
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
                      className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
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
            className="text-sm font-semibold text-huttle-primary hover:text-huttle-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {visibleInvoices.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">
            {invoicesFetchFailed
              ? 'We couldn’t load your invoice list from Stripe. Try Refresh, or open this page again in a moment.'
              : 'No invoices are available yet.'}
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {visibleInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900">{formatCurrency(invoice.amountPaid || invoice.amountDue, invoice.currency)}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {formatDate(invoice.createdAt)} • {invoice.status}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {invoice.hostedInvoiceUrl && (
                    <a
                      href={invoice.hostedInvoiceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                    >
                      View
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {invoice.invoicePdf && (
                    <a
                      href={invoice.invoicePdf}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                    >
                      PDF
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
