export default function LoadingSpinner({ size = 'md', text = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`animate-spin rounded-full border-b-2 border-huttle-primary ${sizes[size]}`}></div>
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );
}

