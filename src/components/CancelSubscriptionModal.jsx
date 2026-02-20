import { AlertCircle, X, Calendar, Loader2, Zap, Star, TrendingDown, MessageSquare } from 'lucide-react';
import { useState } from 'react';

export default function CancelSubscriptionModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  onDowngrade,
  currentTier,
  isLoading = false,
  renewalDate = null 
}) {
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [customFeedback, setCustomFeedback] = useState('');

  if (!isOpen) return null;

  const formatDate = (date) => {
    if (!date) return 'the end of your billing period';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Define downgrade options based on current tier
  const getDowngradeOptions = () => {
    if (currentTier === 'pro') {
      return [
        {
          id: 'essentials',
          name: 'Essentials',
          price: '$9/mo',
          icon: Zap,
          features: ['200 AI generations/month', '5GB storage', 'Email Support'],
          gradient: 'from-huttle-primary to-cyan-400'
        },
        {
          id: 'freemium',
          name: 'Freemium',
          price: 'Free',
          icon: Star,
          features: ['20 AI generations/month', '250MB storage', 'Basic features'],
          gradient: 'from-gray-500 to-gray-600'
        }
      ];
    } else if (currentTier === 'essentials') {
      return [
        {
          id: 'freemium',
          name: 'Freemium',
          price: 'Free',
          icon: Star,
          features: ['20 AI generations/month', '250MB storage', 'Basic features'],
          gradient: 'from-gray-500 to-gray-600'
        }
      ];
    }
    return [];
  };

  const downgradeOptions = getDowngradeOptions();

  // Cancellation reasons
  const cancellationReasons = [
    { value: '', label: 'Select a reason...' },
    { value: 'too_expensive', label: 'Too expensive' },
    { value: 'not_using_enough', label: 'Not using it enough' },
    { value: 'missing_features', label: 'Missing features I need' },
    { value: 'found_alternative', label: 'Found a better alternative' },
    { value: 'technical_issues', label: 'Technical issues/bugs' },
    { value: 'poor_results', label: 'AI results not good enough' },
    { value: 'temporary', label: 'Taking a temporary break' },
    { value: 'other', label: 'Other reason' }
  ];

  const handleCancelClick = () => {
    setShowFeedbackForm(true);
  };

  const handleSubmitFeedback = () => {
    onConfirm({ reason: cancellationReason, customFeedback });
  };

  const handleCloseModal = () => {
    setShowFeedbackForm(false);
    setCancellationReason('');
    setCustomFeedback('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-slideUp max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className={`${showFeedbackForm ? 'bg-huttle-50' : 'bg-red-50'} p-2 rounded-xl border ${showFeedbackForm ? 'border-huttle-100' : 'border-red-100'}`}>
              {showFeedbackForm ? (
                <MessageSquare className="w-6 h-6 text-huttle-primary" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600" />
              )}
            </div>
            <h2 className={`text-xl font-bold ${showFeedbackForm ? 'text-huttle-primary' : 'text-red-600'}`}>
              {showFeedbackForm ? 'Help Us Improve' : 'Cancel Subscription'}
            </h2>
          </div>
          <button
            onClick={handleCloseModal}
            disabled={isLoading}
            className="absolute right-4 top-4 p-3 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!showFeedbackForm ? (
            <>
          {/* Main Message */}
          <div className="space-y-3">
            <p className="text-gray-700 font-medium">
              Are you sure you want to cancel your subscription?
            </p>
            <p className="text-sm text-gray-600">
              We're sorry to see you go! Before you cancel, consider these alternatives:
            </p>
          </div>

          {/* Downgrade Options */}
          {downgradeOptions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <TrendingDown className="w-4 h-4 text-huttle-primary" />
                <span>Or downgrade to a lower plan:</span>
              </div>
              <div className="space-y-2">
                {downgradeOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => onDowngrade && onDowngrade(option.id)}
                    disabled={isLoading}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-huttle-primary hover:bg-huttle-50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${option.gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        <option.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-900">{option.name}</h4>
                          <span className="text-sm font-bold text-huttle-primary">{option.price}</span>
                        </div>
                        <ul className="space-y-0.5">
                          {option.features.map((feature, idx) => (
                            <li key={idx} className="text-xs text-gray-600">• {feature}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {downgradeOptions.length > 0 && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-gray-500">or proceed to cancel</span>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-huttle-50 border-l-4 border-huttle-primary rounded-r-lg p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 pt-0.5">
                <Calendar className="w-5 h-5 text-huttle-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  You'll keep your access
                </p>
                <p className="text-sm text-gray-700">
                  Your subscription will remain active until <span className="font-semibold">{formatDate(renewalDate)}</span>. 
                  After that, you'll be automatically moved to the free plan.
                </p>
              </div>
            </div>
          </div>

          {/* What happens list */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-800 mb-2">After your subscription ends:</p>
            <ul className="space-y-1.5 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">•</span>
                <span>AI generations will be limited to 20/month</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">•</span>
                <span>Storage will be reduced to 250MB</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">•</span>
                <span>Premium features will no longer be available</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button
              onClick={handleCloseModal}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Keep My Subscription
            </button>
            <button
              onClick={handleCancelClick}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Yes, Cancel Subscription</span>
            </button>
          </div>
            </>
          ) : (
            <>
              {/* Feedback Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-gray-700 font-medium">
                    We'd love to know why you're canceling
                  </p>
                  <p className="text-sm text-gray-600">
                    Your feedback helps us improve Huttle for everyone. This will only take a moment.
                  </p>
                </div>

                {/* Reason Dropdown */}
                <div className="space-y-2">
                  <label htmlFor="cancellation-reason" className="block text-sm font-semibold text-gray-700">
                    Primary reason for canceling <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="cancellation-reason"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20 transition-all outline-none"
                  >
                    {cancellationReasons.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Feedback */}
                <div className="space-y-2">
                  <label htmlFor="custom-feedback" className="block text-sm font-semibold text-gray-700">
                    Additional feedback (optional)
                  </label>
                  <textarea
                    id="custom-feedback"
                    value={customFeedback}
                    onChange={(e) => setCustomFeedback(e.target.value)}
                    placeholder="Tell us more about your experience or what we could improve..."
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20 transition-all outline-none resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    This helps us understand how to make Huttle better for you and others.
                  </p>
                </div>

                {/* Thank you message */}
                <div className="bg-huttle-50 border-l-4 border-huttle-primary rounded-r-lg p-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Thank you for your feedback!</span> You can always come back anytime.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => setShowFeedbackForm(false)}
                    disabled={isLoading}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleSubmitFeedback}
                    disabled={isLoading || !cancellationReason}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit & Cancel</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

