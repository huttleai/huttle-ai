import { useState, useEffect, useContext } from 'react';
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../config/supabase';

export default function GuidedTour({ steps, onComplete, storageKey = 'guidedTour' }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    // Only show tour to authenticated users who haven't seen the tour yet
    let timer = null;
    let isMounted = true;
    
    const showTour = (delayMs) => {
      if (isMounted) {
        timer = setTimeout(() => {
          if (isMounted) setIsActive(true);
        }, delayMs);
      }
    };
    
    const checkTourStatus = async () => {
      if (!user) return;
      
      // Check if tour was already completed (localStorage = fast check)
      const localCompleted = localStorage.getItem(storageKey);
      if (localCompleted) return;
      
      // Check if onboarding JUST completed — this is the primary trigger for first-time users.
      // The 'show_guided_tour' flag is set by completeOnboarding in AuthContext
      // right before the transition from OnboardingQuiz to Dashboard.
      const onboardingJustCompleted = localStorage.getItem('show_guided_tour');
      if (onboardingJustCompleted === 'pending') {
        // Clear the flag and show tour after a short delay for UI to settle
        localStorage.setItem('show_guided_tour', 'shown');
        showTour(1500);
        return;
      }
      
      // For returning users: check database, gracefully handle missing column
      try {
        const { data, error } = await supabase
          .from('user_profile')
          .select('has_seen_tour')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          // Column doesn't exist (42703) or table issues - fall back to localStorage only
          if (error.code === '42703' || error.code === '42P01' || error.code === 'PGRST204') {
            // Column/table doesn't exist — silently fall back to localStorage
          } else if (error.code !== 'PGRST116') {
            console.error('Error checking tour status:', error);
          }
          
          // Show tour if localStorage doesn't have it marked
          showTour(2000);
          return;
        }
        
        // Only show tour if user has NOT seen it yet
        const dbCompleted = data?.has_seen_tour;
        
        if (!dbCompleted) {
          showTour(2000);
        }
      } catch (error) {
        // Silently fall back to localStorage-only behavior
        if (!localCompleted) {
          showTour(2000);
        }
      }
    };
    
    checkTourStatus();
    
    // Cleanup function - clear timeout if component unmounts
    return () => {
      isMounted = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [storageKey, user]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const markTourComplete = async () => {
    // Mark tour as complete in localStorage (fallback)
    localStorage.setItem(storageKey, 'true');
    // Clean up the onboarding signal flag
    localStorage.removeItem('show_guided_tour');
    
    // Also mark in Supabase for persistence across devices
    if (user) {
      try {
        await supabase
          .from('user_profile')
          .update({ has_seen_tour: true })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error saving tour completion to database:', error);
      }
    }
  };

  const handleComplete = async () => {
    await markTourComplete();
    setIsActive(false);
    if (onComplete) onComplete();
  };

  const handleSkip = async () => {
    await markTourComplete();
    setIsActive(false);
  };

  if (!isActive || !steps[currentStep]) return null;

  const step = steps[currentStep];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-60 z-[90] animate-fade-in pointer-events-none" />

      {/* Tooltip */}
      <div
        className="fixed z-[100] bg-white rounded-xl shadow-2xl max-w-md animate-scale-in top-1/2 left-1/2"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-huttle-primary text-white text-xs rounded-full font-semibold">
                  {currentStep + 1} of {steps.length}
                </span>
                {step.icon && <step.icon className="w-5 h-5 text-huttle-primary" />}
              </div>
              <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
            </div>
            <button
              onClick={handleSkip}
              className="p-1 hover:bg-gray-100 rounded transition-all"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <p className="text-gray-600 mb-6">{step.content}</p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip tour
            </button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all flex items-center gap-2"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <Check className="w-4 h-4" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-4">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-huttle-primary w-6'
                    : index < currentStep
                    ? 'bg-huttle-primary bg-opacity-50 w-2'
                    : 'bg-gray-300 w-2'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

