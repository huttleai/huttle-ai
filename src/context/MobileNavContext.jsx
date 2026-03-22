import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const MobileNavContext = createContext(null);

export function MobileNavProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const value = useMemo(
    () => ({ isOpen, setIsOpen, open, close, toggle }),
    [isOpen, open, close, toggle],
  );

  return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>;
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) {
    throw new Error('useMobileNav must be used within MobileNavProvider');
  }
  return ctx;
}
