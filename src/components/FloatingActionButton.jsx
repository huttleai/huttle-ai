import { Plus, X } from 'lucide-react';
import { useState } from 'react';

export default function FloatingActionButton({ onCreatePost }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const quickActions = [
    { label: 'Create Post', action: onCreatePost, color: 'bg-huttle-primary' },
    { label: 'Upload Media', action: () => alert('Media upload coming soon!'), color: 'bg-blue-500' },
  ];

  return (
    <>
      {/* Quick Actions Menu */}
      {isExpanded && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-3 items-end">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                action.action();
                setIsExpanded(false);
              }}
              className={`${action.color} text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 font-medium text-sm whitespace-nowrap`}
              style={{
                animation: `slideIn 0.3s ease-out ${i * 0.1}s both`
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`fixed bottom-6 right-6 z-50 w-16 h-16 ${
          isExpanded ? 'bg-red-500' : 'bg-huttle-primary'
        } text-white rounded-full shadow-2xl hover:shadow-3xl transition-all transform hover:scale-110 flex items-center justify-center`}
      >
        {isExpanded ? (
          <X className="w-6 h-6 transition-transform rotate-90" />
        ) : (
          <Plus className="w-6 h-6" />
        )}
      </button>

      {/* Overlay */}
      {isExpanded && (
        <div
          onClick={() => setIsExpanded(false)}
          className="fixed inset-0 bg-black bg-opacity-20 z-40"
        />
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}

