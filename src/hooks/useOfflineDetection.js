import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';

/**
 * Hook to detect online/offline status and notify user
 * @returns {boolean} isOnline - Current online status
 */
export function useOfflineDetection() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { addToast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addToast('Back online! Syncing...', 'success');
    };

    const handleOffline = () => {
      setIsOnline(false);
      addToast('You are offline. Changes will sync when reconnected.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addToast]);

  return isOnline;
}

