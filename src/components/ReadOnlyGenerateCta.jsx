import { Link } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionContext';
import { READ_ONLY_GENERATE_MESSAGE } from '../config/subscriptionAccess';

export function ReadOnlyGenerateCta({ className = '' }) {
  return (
    <div className={`w-full rounded-xl border border-gray-200 bg-white p-4 ${className}`}>
      <p className="text-sm text-gray-800">{READ_ONLY_GENERATE_MESSAGE}</p>
      <Link
        to="/dashboard/subscription"
        className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-huttle-primary px-4 py-2 text-sm font-semibold text-white hover:bg-huttle-primary-dark"
      >
        Reactivate
      </Link>
    </div>
  );
}

export function GenerationAction({ children }) {
  const { isReadOnly } = useSubscription();
  if (isReadOnly) return <ReadOnlyGenerateCta />;
  return children;
}
