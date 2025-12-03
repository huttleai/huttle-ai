import { createContext, useState, useContext } from 'react';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle, Sparkles } from 'lucide-react';

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const getToastConfig = (type) => {
    const configs = {
      success: {
        icon: CheckCircle,
        bgClass: 'bg-gradient-to-r from-green-500 to-emerald-500',
        iconBgClass: 'bg-white/20',
      },
      error: {
        icon: AlertCircle,
        bgClass: 'bg-gradient-to-r from-red-500 to-rose-500',
        iconBgClass: 'bg-white/20',
      },
      warning: {
        icon: AlertTriangle,
        bgClass: 'bg-gradient-to-r from-amber-500 to-orange-500',
        iconBgClass: 'bg-white/20',
      },
      info: {
        icon: Info,
        bgClass: 'bg-gradient-to-r from-blue-500 to-cyan-500',
        iconBgClass: 'bg-white/20',
      },
      ai: {
        icon: Sparkles,
        bgClass: 'bg-gradient-to-r from-purple-500 to-pink-500',
        iconBgClass: 'bg-white/20',
      },
    };
    return configs[type] || configs.info;
  };

  return (
    <ToastContext.Provider value={{ addToast, showToast: addToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[100] space-y-3 pointer-events-none">
        {toasts.map((toast, index) => {
          const config = getToastConfig(toast.type);
          const Icon = config.icon;
          
          return (
            <div
              key={toast.id}
              className={`
                pointer-events-auto flex items-center gap-3 px-4 py-3.5 rounded-2xl 
                shadow-2xl min-w-[320px] max-w-md text-white
                ${config.bgClass}
                animate-slideInRight
              `}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              {/* Icon */}
              <div className={`w-8 h-8 rounded-xl ${config.iconBgClass} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              
              {/* Message */}
              <span className="flex-1 font-medium text-sm leading-snug">{toast.message}</span>
              
              {/* Close button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="w-6 h-6 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
