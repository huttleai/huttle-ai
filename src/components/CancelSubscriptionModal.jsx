import { AlertCircle, X, Calendar, Loader2, ChevronLeft, ChevronRight, MessageSquare, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../config/supabase';

const CANCELLATION_REASONS = [
  { value: 'too_expensive', label: "It's too expensive" },
  { value: 'didnt_use', label: "Didn't use it enough" },
  { value: 'missing_features', label: 'Missing features I need' },
  { value: 'hard_to_use', label: 'Hard to use or confusing' },
  { value: 'technical_issues', label: 'Ran into technical issues' },
  { value: 'switching', label: 'Switching to another tool' },
  { value: 'business_changed', label: 'Business needs changed' },
  { value: 'taking_break', label: 'Just taking a break' },
  { value: 'other', label: 'Something else' },
];

const RECOMMEND_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: 'No' },
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
  currentTier,
  isLoading = false,
  renewalDate = null,
  userId = null,
  planName = null,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [reason, setReason] = useState('');
  const [reasonOther, setReasonOther] = useState('');
  const [whatWouldStay, setWhatWouldStay] = useState('');
  const [recommendLikelihood, setRecommendLikelihood] = useState('');
  const [additionalFeedback, setAdditionalFeedback] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isBusy = isSubmitting || isLoading;
  const accessEndDate = formatDate(renewalDate);
  const displayPlanName = planName || currentTier || 'Subscription';

  const resetState = () => {
    setCurrentStep(1);
    setReason('');
    setReasonOther('');
    setWhatWouldStay('');
    setRecommendLikelihood('');
    setAdditionalFeedback('');
    setErrors({});
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isBusy) return;
    resetState();
    onClose();
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!reason) newErrors.reason = 'Pick one so we know what to fix.';
    if (reason === 'other' && !reasonOther.trim()) newErrors.reasonOther = "Tell us what's up.";
    if (!recommendLikelihood) newErrors.recommendLikelihood = 'One more click.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdvanceToStep2 = () => {
    if (validateStep1()) setCurrentStep(2);
  };

  const handleFinalConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrors({});

    let cancellationResult;
    try {
      cancellationResult = await onConfirm();
    } catch (err) {
      console.error('Cancellation error:', err);
      setErrors({ submit: 'Something went wrong cancelling your subscription. Please try again.' });
      setIsSubmitting(false);
      return;
    }

    if (cancellationResult?.success !== true) {
      setErrors({
        submit: cancellationResult?.error || 'Something went wrong cancelling your subscription. Please try again.',
      });
      setIsSubmitting(false);
      return;
    }

    // Feedback is only submitted after a successful cancellation response.
    try {
      const { data: { session } = {} } = await supabase.auth.getSession();
      if (!session?.access_token) {
        resetState();
        onClose();
        return;
      }

      await fetch('/api/submit-cancellation-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          plan_name: planName || currentTier,
          reason,
          reason_other: reason === 'other' ? (reasonOther.trim() || null) : null,
          what_would_stay: whatWouldStay.trim() || null,
          recommend_likelihood: recommendLikelihood || null,
          additional_feedback: additionalFeedback.trim() || null,
        }),
      });
    } catch (err) {
      console.error('Feedback submission error (non-blocking):', err);
    }

    resetState();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl transform transition-all animate-slideUp max-h-[90dvh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl border p-2 ${
              currentStep === 1 ? 'border-cyan-200 bg-cyan-50' : 'border-amber-200 bg-amber-50'
            }`}>
              {currentStep === 1 ? (
                <MessageSquare className="h-5 w-5 text-huttle-primary" />
              ) : (
                <Calendar className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {currentStep === 1 ? 'Before you go...' : `Cancel Huttle ${displayPlanName}?`}
              </h2>
              <p className="text-xs text-gray-400">Step {currentStep} of 2</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isBusy}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* ── STEP 1: Feedback capture ── */}
          {currentStep === 1 && (
            <>
              <p className="text-sm text-gray-500">
                Your answers go straight to our team. We read every one. Takes 30 seconds.
              </p>

              {/* Q1: Cancellation reason */}
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-gray-900">What&apos;s making you cancel?</p>
                <div className="space-y-2">
                  {CANCELLATION_REASONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                        reason === opt.value
                          ? 'border-huttle-primary bg-huttle-primary-light text-gray-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="cancel-reason"
                        value={opt.value}
                        checked={reason === opt.value}
                        onChange={() => {
                          setReason(opt.value);
                          setErrors((prev) => ({ ...prev, reason: undefined, reasonOther: undefined }));
                        }}
                        className="sr-only"
                      />
                      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        reason === opt.value ? 'border-huttle-primary bg-huttle-primary' : 'border-gray-300'
                      }`}>
                        {reason === opt.value && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
                {errors.reason && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {errors.reason}
                  </p>
                )}

                {reason === 'other' && (
                  <div className="pt-1">
                    <input
                      type="text"
                      value={reasonOther}
                      onChange={(e) => {
                        setReasonOther(e.target.value);
                        setErrors((prev) => ({ ...prev, reasonOther: undefined }));
                      }}
                      placeholder="In a few words..."
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20 focus:outline-none"
                    />
                    <p className="mt-0.5 text-xs font-medium text-gray-500">What was the reason?</p>
                    {errors.reasonOther && (
                      <p className="mt-0.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        {errors.reasonOther}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Q2: What would have made you stay */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-900" htmlFor="what-would-stay">
                  What would have made you stay?{' '}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  id="what-would-stay"
                  value={whatWouldStay}
                  onChange={(e) => setWhatWouldStay(e.target.value)}
                  placeholder="A feature, a lower price, better onboarding. Anything goes."
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20 focus:outline-none resize-none"
                />
              </div>

              {/* Q3: Would you recommend Huttle */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900">
                  Would you recommend Huttle to someone else?
                </p>
                <div className="flex gap-2">
                  {RECOMMEND_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex-1 text-center cursor-pointer rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                        recommendLikelihood === opt.value
                          ? 'border-huttle-primary bg-huttle-primary-light text-huttle-primary'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="recommend-likelihood"
                        value={opt.value}
                        checked={recommendLikelihood === opt.value}
                        onChange={() => {
                          setRecommendLikelihood(opt.value);
                          setErrors((prev) => ({ ...prev, recommendLikelihood: undefined }));
                        }}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                {errors.recommendLikelihood && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {errors.recommendLikelihood}
                  </p>
                )}
              </div>

              {/* Q4: Anything else */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-900" htmlFor="additional-feedback">
                  Anything else you want to share?{' '}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  id="additional-feedback"
                  value={additionalFeedback}
                  onChange={(e) => setAdditionalFeedback(e.target.value)}
                  placeholder="We read everything."
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20 focus:outline-none resize-none"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-1">
                <button
                  onClick={handleClose}
                  disabled={isBusy}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Never mind, keep my plan
                </button>
                <button
                  onClick={handleAdvanceToStep2}
                  disabled={isBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  Continue to cancel
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: Final confirmation ── */}
          {currentStep === 2 && (
            <>
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-200 bg-amber-50">
                  <Calendar className="h-7 w-7 text-amber-600" />
                </div>
                <div>
                  <p className="mt-1 text-sm text-gray-500">
                    Your subscription will be cancelled and you&apos;ll keep access until:
                  </p>
                  <p className="mt-2 text-lg font-bold text-amber-600">{accessEndDate}</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-huttle-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">
                    You can resubscribe anytime to restore full access. Your saved content will remain in the Content Vault. No further charges will be made.
                  </p>
                </div>
              </div>

              {errors.submit && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  {errors.submit}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-1">
                <button
                  onClick={() => setCurrentStep(1)}
                  disabled={isBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={handleFinalConfirm}
                  disabled={isBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel subscription'
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
