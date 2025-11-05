import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

export default function TopHeader() {
  const { user } = useContext(AuthContext);

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-4 md:px-8">
      <div className="flex-1"></div>
      <div className="flex items-center gap-4">
        <NotificationBell />
      </div>
    </header>
  );
}

