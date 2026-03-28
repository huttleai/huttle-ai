import { useState, useCallback, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, Loader2, CheckCircle, Lock } from 'lucide-react';
import { createCardSetupIntent, updateDefaultPaymentMethod } from '../services/stripeAPI';
import { useToast } from '../context/ToastContext';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const GENERIC_CARD_CONFIRM_FAIL =
  "We couldn't verify this card. Please check your details and try again.";

const TOAST_GENERIC = 'Something went wrong. Please try again.';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      lineHeight: '24px',
      color: '#111827',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      '::placeholder': { color: '#9ca3af' },
      iconColor: '#6b7280',
    },
    invalid: {
      color: '#dc2626',
      iconColor: '#dc2626',
    },
  },
};

function CardForm({ onSuccess, onCancel, isSubmitting, setIsSubmitting }) {
  const stripe = useStripe();
  const elements = useElements();
  const { addToast } = useToast();
  const [fieldError, setFieldError] = useState('');

  const [cardComplete, setCardComplete] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!stripe || !elements || isSubmitting) return;

    setIsSubmitting(true);
    setFieldError('');

    try {
      const { clientSecret } = await createCardSetupIntent();
      if (!clientSecret) {
        setIsSubmitting(false);
        addToast(TOAST_GENERIC, 'error');
        return;
      }

      const cardEl = elements.getElement(CardElement);
      const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardEl },
      });

      if (error) {
        setFieldError(GENERIC_CARD_CONFIRM_FAIL);
        setIsSubmitting(false);
        return;
      }

      const pmId =
        typeof setupIntent?.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent?.payment_method?.id;

      if (setupIntent?.status !== 'succeeded' || !pmId) {
        setIsSubmitting(false);
        addToast(TOAST_GENERIC, 'error');
        return;
      }

      const result = await updateDefaultPaymentMethod(pmId);
      if (!result.success || !result.paymentMethod) {
        setIsSubmitting(false);
        addToast(TOAST_GENERIC, 'error');
        return;
      }

      onSuccess(result.paymentMethod);
    } catch (err) {
      console.error('Update card flow error:', err);
      setIsSubmitting(false);
      addToast(TOAST_GENERIC, 'error');
    }
  }, [stripe, elements, isSubmitting, setIsSubmitting, onSuccess, addToast]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="update-card-element" className="block text-sm font-medium text-gray-700 mb-2">
          Card details
        </label>
        <div
          id="update-card-element"
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 transition-colors focus-within:border-huttle-primary focus-within:ring-2 focus-within:ring-huttle-primary/20"
        >
          <CardElement
            options={CARD_ELEMENT_OPTIONS}
            onChange={(e) => {
              setCardComplete(e.complete);
              if (e.error) {
                setFieldError(e.error.message);
              } else {
                setFieldError('');
              }
            }}
          />
        </div>
        {fieldError && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {fieldError}
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || !cardComplete || isSubmitting}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Card'
          )}
        </button>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 pt-1">
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Secured by Stripe
      </p>
    </form>
  );
}

export default function UpdateCardModal({ isOpen, onClose, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    if (!successData || !isOpen) return undefined;
    const t = window.setTimeout(() => {
      setSuccessData(null);
      onClose();
    }, 2000);
    return () => window.clearTimeout(t);
  }, [successData, isOpen, onClose]);

  if (!isOpen) return null;

  const handleSuccess = (paymentMethod) => {
    setSuccessData(paymentMethod);
    setIsSubmitting(false);
    if (typeof onSuccess === 'function') {
      onSuccess(paymentMethod);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setSuccessData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl transform transition-all animate-slideUp">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            Update Payment Method
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {successData ? (
            <div className="text-center space-y-4 py-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 border border-green-200">
                <CheckCircle className="h-7 w-7 text-green-600" aria-hidden />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">Card updated</p>
                <p className="mt-1 text-sm text-gray-500">
                  {successData.last4 ? `•••• ${successData.last4}` : 'Your default card is updated.'}
                </p>
              </div>
              <p className="text-xs text-gray-400">This window will close automatically.</p>
            </div>
          ) : (
            <Elements stripe={stripePromise}>
              <CardForm
                onSuccess={handleSuccess}
                onCancel={handleClose}
                isSubmitting={isSubmitting}
                setIsSubmitting={setIsSubmitting}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}
