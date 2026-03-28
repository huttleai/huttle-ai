import { AlertCircle, X, Calendar, Loader2, ChevronRight, MessageSquare, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

const STEPS = { CONFIRM: 0, FEEDBACK: 1, FINAL: 2 };

const CANCELLATION_REASONS = [
  { value: 'too_expensive', label: 'Too expensive for my budget' },
  { value: 'not_using_enough', label: "I'm not using it enough" },
  { value: 'missing_features', label: 'Missing features I need' },
  { value: 'found_alternative', label: 'Found a better alternative' },
  { value: 'technical_issues', label: 'Technical issues or bugs' },
  { value: 'temporary', label: 'Taking a temporary break' },
];

function formatDate(date) {
  if (!date) return 'the end of your billing period';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CancelSubscriptionModal({
  isOpen,
  onClose,
  onConfirm,
  onDowngrade,
  currentTier,
  isLoading = false,
  renewalDate = null,
}) {
  const [step, setStep] = useState(STEPS.CONFIRM);
  const [selectedReason, setSelectedReason] = useState('');
  const [customFeedback, setCustomFeedback] = useState('');

  if (!isOpen) return null;

  const accessEndDate = formatDate(renewalDate);

  const lostFeatures = [
    'AI-powered content generation',
    'Trend Lab and hashtag insights',
    'Content scheduling and analytics',
    'Priority support access',
  ];

  const handleClose = () => {
    if (isLoading) return;
    setStep(STEPS.CONFIRM);
    setSelectedReason('');
    setCustomFeedback('');
    onClose();
  };

  const handleFinalConfirm = () => {
    onConfirm({
      reason: selectedReason,
      customFeedback: customFeedback.trim() || null,
    });
  };

  const showDowngrade = currentTier === 'pro' && typeof onDowngrade === 'function';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl transform transition-all animate-slideUp max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl border p-2 ${
              step === STEPS.FEEDBACK
                ? 'border-cyan-200 bg-cyan-50'
                : step === STEPS.FINAL
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-red-200 bg-red-50'
            }`}>
              {step === STEPS.FEEDBACK ? (
                <MessageSquare className="h-5 w-5 text-huttle-primary" />
              ) : step === STEPS.FINAL ? (
                <Calendar className="h-5 w-5 text-amber-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {step === STEPS.CONFIRM && 'Cancel Subscription'}
                {step === STEPS.FEEDBACK && 'Quick Feedback'}
                {step === STEPS.FINAL && 'Confirm Cancellation'}
              </h2>
              <p className="text-xs text-gray-400">Step {step + 1} of 3</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Step 1: Are you sure? */}
          {step === STEPS.CONFIRM && (
            <>
              <div>
                <p className="text-base font-medium text-gray-900">Are you sure you want to cancel?</p>
                <p className="mt-1 text-sm text-gray-500">
                  Here&apos;s what you&apos;ll lose access to:
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2.5">
                {lostFeatures.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm">
                    <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
                <div className="flex gap-3">
                  <Calendar className="h-5 w-5 text-huttle-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">You keep access until</p>
                    <p className="text-sm text-gray-600">{accessEndDate}</p>
                  </div>
                </div>
              </div>

              {showDowngrade && (
                <button
                  onClick={() => onDowngrade('essentials')}
                  disabled={isLoading}
                  className="w-full rounded-xl border border-huttle-primary/30 bg-huttle-primary-light px-4 py-3 text-left transition-colors hover:bg-huttle-primary/10 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-huttle-primary">Downgrade to Essentials instead?</p>
                      <p className="text-xs text-gray-500 mt-0.5">$15/month — keep core features at a lower price</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-huttle-primary" />
                  </div>
                </button>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-1">
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={() => setStep(STEPS.FEEDBACK)}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  Continue to Cancel
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          {/* Step 2: Feedback */}
          {step === STEPS.FEEDBACK && (
            <>
              <div>
                <p className="text-base font-medium text-gray-900">Why are you canceling?</p>
                <p className="mt-1 text-sm text-gray-500">
                  Your feedback helps us improve Huttle for everyone.
                </p>
              </div>

              <div className="space-y-2">
                {CANCELLATION_REASONS.map((reason) => (
                  <label
                    key={reason.value}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                      selectedReason === reason.value
                        ? 'border-huttle-primary bg-huttle-primary-light text-gray-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel-reason"
                      value={reason.value}
                      checked={selectedReason === reason.value}
                      onChange={() => setSelectedReason(reason.value)}
                      className="sr-only"
                    />
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedReason === reason.value
                        ? 'border-huttle-primary bg-huttle-primary'
                        : 'border-gray-300'
                    }`}>
                      {selectedReason === reason.value && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm">{reason.label}</span>
                  </label>
                ))}
              </div>

              <textarea
                value={customFeedback}
                onChange={(e) => setCustomFeedback(e.target.value)}
                placeholder="Anything else you'd like to share? (optional)"
                rows={3}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20 focus:outline-none resize-none"
              />

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-1">
                <button
                  onClick={() => setStep(STEPS.CONFIRM)}
                  disabled={isLoading}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Go Back
                </button>
                <button
                  onClick={() => setStep(STEPS.FINAL)}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          {/* Step 3: Final confirmation */}
          {step === STEPS.FINAL && (
            <>
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-200 bg-amber-50">
                  <Calendar className="h-7 w-7 text-amber-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">Final Confirmation</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Your subscription will be canceled but you&apos;ll keep access until:
                  </p>
                  <p className="mt-2 text-lg font-bold text-amber-600">{accessEndDate}</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-huttle-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">
                    You can resubscribe anytime to restore full access. Your saved content will remain in the Content Vault.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-1">
                <button
                  onClick={() => setStep(STEPS.FEEDBACK)}
                  disabled={isLoading}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Go Back
                </button>
                <button
                  onClick={handleFinalConfirm}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Confirm Cancellation'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
