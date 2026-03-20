import { useState } from 'react';
import { AlertTriangle, CalendarClock, Check, Loader2, Shield, Trophy, Zap } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import BillingManagementPanel from './BillingManagementPanel';
import { SUBSCRIPTION_PLANS, cancelSubscription } from '../services/stripeAPI';

function formatDate(dateValue) {
  if (!dateValue) return 'your renewal date';

  return new Date(dateValue).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function normalizeTier(tierValue) {
  const normalizedTier = String(tierValue || '').toLowerCase();

  if (['founder', 'founders', 'founders_club'].includes(normalizedTier)) {
    return 'founder';
  }

  if (['builder', 'builders', 'builders_club'].includes(normalizedTier)) {
    return 'builder';
  }

  return null;
}

export default function FoundersMembershipCard({ subscription, user, onCancelled = null }) {
  const { addToast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const tierKey = normalizeTier(subscription?.tier || subscription?.plan);
  const isFounder = tierKey === 'founder';
  const membershipName = isFounder ? 'Founders Club' : 'Builders Club';
  const membershipBadge = isFounder ? 'Founders Club 🏆' : 'Builders Club ⚡';
  const expiryDate = formatDate(subscription?.currentPeriodEnd);
  const startDate = formatDate(subscription?.currentPeriodStart);
  const planBenefits = isFounder
    ? SUBSCRIPTION_PLANS.FOUNDER.features.features
    : SUBSCRIPTION_PLANS.BUILDER.features.features;
  const pricingLabel = isFounder
    ? 'Annual plan - locked in for life'
    : `Annual plan - locked in until ${expiryDate}`;
  const isCancellationScheduled = Boolean(subscription?.cancelAtPeriodEnd);

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

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#0C1220] shadow-[0_24px_80px_rgba(1,186,210,0.12)]">
        <div className="border-b border-white/10 bg-gradient-to-r from-cyan-400/10 via-transparent to-cyan-400/5 px-6 py-5 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                {isFounder ? <Trophy className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                {membershipBadge}
              </span>
              <h2 className="mt-4 font-display text-2xl font-bold text-white md:text-3xl">
                {membershipName}
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                {pricingLabel}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              <p className="font-semibold text-white">
                {isCancellationScheduled ? 'Cancellation scheduled' : 'Membership active'}
              </p>
              <p className="mt-1 text-slate-300">
                {isCancellationScheduled
                  ? `Access remains active until ${expiryDate}.`
                  : `Your next renewal is ${expiryDate}.`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 md:grid-cols-[1.1fr_0.9fr] md:px-8">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Start Date
                </p>
                <p className="mt-2 text-base font-semibold text-white">
                  {startDate}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {isCancellationScheduled ? 'Access Until' : 'Renewal Date'}
                </p>
                <p className="mt-2 text-base font-semibold text-white">
                  {expiryDate}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-300" />
                <div>
                  <p className="text-sm font-semibold text-cyan-100">
                    Lifetime member pricing
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {isFounder
                      ? 'Your Founders Club rate stays locked for life, even as Huttle AI evolves.'
                      : `Your Builders Club rate stays locked through ${expiryDate} while your membership remains active.`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-300" />
              <h3 className="font-display text-lg font-bold text-white">Your Membership Benefits</h3>
            </div>

            <ul className="mt-4 space-y-3">
              {planBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm text-slate-200">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-300">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 px-6 py-5 md:px-8">
          {isCancellationScheduled ? (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Your membership is already set to cancel at period end. You&apos;ll keep access until {expiryDate}.
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              disabled={isCancelling}
              className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-transparent px-4 py-2.5 text-sm font-semibold text-red-200 transition-colors hover:border-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Cancel Membership
            </button>
          )}
        </div>

        <div className="border-t border-white/10 bg-slate-50 px-6 py-6 md:px-8">
          <BillingManagementPanel
            subscription={subscription}
            userTier={tierKey}
            onSubscriptionUpdated={onCancelled}
            showPlanSwitcher={false}
          />
        </div>
      </div>

      {isConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0C1220] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-red-200">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-white">
                  Cancel {membershipName}?
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Are you sure you want to cancel your {membershipName} membership? You&apos;ll keep access until {expiryDate}. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isCancelling}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Keep My Membership
              </button>
              <button
                type="button"
                onClick={handleCancelMembership}
                disabled={isCancelling}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
