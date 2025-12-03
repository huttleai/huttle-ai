import { Sparkles } from 'lucide-react';

export default function LoadingSpinner({ size = 'md', text = '', variant = 'default' }) {
  const sizes = {
    sm: { spinner: 'w-4 h-4', text: 'text-xs', logo: 'w-2 h-2' },
    md: { spinner: 'w-8 h-8', text: 'text-sm', logo: 'w-3 h-3' },
    lg: { spinner: 'w-12 h-12', text: 'text-base', logo: 'w-4 h-4' },
    xl: { spinner: 'w-16 h-16', text: 'text-lg', logo: 'w-5 h-5' },
  };

  const sizeConfig = sizes[size] || sizes.md;

  if (variant === 'huttle') {
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="relative">
          {/* Outer spinning ring */}
          <div className={`${sizeConfig.spinner} rounded-full border-2 border-huttle-cyan/20 border-t-huttle-blue animate-spin`} />
          
          {/* Inner logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className={`${sizeConfig.logo} text-huttle-blue animate-pulse`} />
          </div>
        </div>
        {text && (
          <p className={`${sizeConfig.text} font-medium text-gray-600`}>{text}</p>
        )}
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-huttle-blue animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-huttle-blue animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-huttle-blue animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        {text && <p className={`${sizeConfig.text} text-gray-500`}>{text}</p>}
      </div>
    );
  }

  // Default spinner
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeConfig.spinner} rounded-full border-2 border-gray-100 border-t-huttle-blue animate-spin`} />
      {text && <p className={`${sizeConfig.text} text-gray-500`}>{text}</p>}
    </div>
  );
}
