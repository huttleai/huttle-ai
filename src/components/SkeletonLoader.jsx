/**
 * Skeleton Loader Component
 * Premium shimmering effect for loading states
 */
export default function SkeletonLoader({ variant = 'text', className = '' }) {
  const variants = {
    text: 'h-4 w-full rounded',
    title: 'h-6 w-3/4 rounded',
    badge: 'h-8 w-20 rounded-full',
    circle: 'h-56 w-56 rounded-full',
    card: 'h-64 w-full rounded-2xl',
  };

  return (
    <div 
      className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer ${variants[variant]} ${className}`}
      style={{
        animation: 'shimmer 2s infinite linear'
      }}
    />
  );
}



