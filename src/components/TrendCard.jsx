import { useState } from 'react';
import { TrendingUp, Sparkles } from 'lucide-react';

export default function TrendCard({ title, description, score, category, onQuickGen }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {score && (
          <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-700">
            {score}%
          </span>
        )}
      </div>
      
      {description && (
        <p className="text-sm text-gray-600 mb-3">{description}</p>
      )}
      
      {category && (
        <span className="text-xs text-gray-500">{category}</span>
      )}

      {/* Hover Preview */}
      {isHovered && (
        <div className="absolute inset-0 bg-gradient-to-br from-huttle-primary/10 to-huttle-primary/5 rounded-lg border-2 border-huttle-primary p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-huttle-primary" />
              <span className="text-xs font-semibold text-huttle-primary">TRENDING NOW</span>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              High engagement potential in your niche
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickGen?.();
              }}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-huttle-primary text-white rounded-lg text-xs font-medium hover:bg-huttle-primary-dark transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              Quick Gen
            </button>
            <button className="flex-1 px-3 py-2 bg-white border border-huttle-primary text-huttle-primary rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
              Remix
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

