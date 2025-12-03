import { Plus, X } from 'lucide-react';
import { useState } from 'react';

export default function FloatingActionButton({ onCreatePost }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Overlay */}
      {isExpanded && (
        <div
          onClick={() => setIsExpanded(false)}
          className="fixed inset-0 bg-black/10 z-40 fade-in"
        />
      )}

      {/* Quick Actions Menu */}
      {isExpanded && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2 items-end">
          <button
            onClick={() => {
              onCreatePost();
              setIsExpanded(false);
            }}
            className="bg-huttle-blue text-white px-5 py-2.5 rounded-lg shadow-medium hover:shadow-elevated transition-all font-medium text-sm slide-in-right"
          >
            Create Post
          </button>
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-elevated transition-all duration-150 flex items-center justify-center press-scale ${
          isExpanded 
            ? 'bg-gray-900 hover:bg-gray-800' 
            : 'bg-huttle-blue hover:bg-huttle-blue-dark'
        }`}
      >
        <span className={`transition-transform duration-150 ${isExpanded ? 'rotate-45' : ''}`}>
          {isExpanded ? (
            <X className="w-5 h-5 text-white" />
          ) : (
            <Plus className="w-5 h-5 text-white" />
          )}
        </span>
      </button>
    </>
  );
}
