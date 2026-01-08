import { Lock, Zap, ArrowRight, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getFormattedResetDate } from '../utils/aiUsageHelpers';

export default function AIFeatureLock({ used, limit }) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  // Get next reset date based on subscription start date
  const resetDate = getFormattedResetDate(user?.subscriptionStartDate);
  
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-md bg-white/60 rounded-xl">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md mx-4 border border-red-200">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-xl bg-red-50 flex items-center justify-center border border-red-100">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <h3 className="text-2xl font-bold text-huttle-primary text-center mb-2">
          AI Limit Reached
        </h3>
        
        <p className="text-gray-600 text-center mb-4">
          You've used all <span className="font-bold text-red-600">{used}/{limit}</span> AI generations this billing cycle.
        </p>
        
        <div className="bg-gradient-to-r from-huttle-primary to-purple-600 rounded-xl p-4 mb-6 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5" />
            <span className="font-bold">Upgrade to Pro</span>
          </div>
          <ul className="text-sm space-y-1 opacity-90">
            <li>• Unlimited AI generations</li>
            <li>• Priority AI processing</li>
            <li>• Advanced AI features</li>
            <li>• 24/7 priority support</li>
          </ul>
        </div>
        
        <button
          onClick={() => navigate('/dashboard/subscription')}
          className="w-full px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 group btn-upgrade-glow"
        >
          <span>Upgrade Now</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
        
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500">
          <Calendar className="w-3 h-3" />
          <p>Your limit resets on <span className="font-semibold text-gray-700">{resetDate}</span></p>
        </div>
      </div>
    </div>
  );
}

