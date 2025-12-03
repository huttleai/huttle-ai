import NotificationBell from './NotificationBell';

export default function TopHeader() {
  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-14 z-30">
      {/* Clean backdrop */}
      <div className="absolute inset-0 bg-white/90 backdrop-blur-md border-b border-gray-100" />
      
      <div className="relative h-full flex items-center justify-end px-6">
        {/* Mobile spacer for hamburger menu */}
        <div className="lg:hidden flex-1" />
        
        {/* Notification Bell only */}
        <NotificationBell />
      </div>
    </header>
  );
}
