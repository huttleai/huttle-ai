import NotificationBell from './NotificationBell';

export default function TopHeader() {
  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 z-30 pointer-events-none">
      {/* Clean backdrop - transparent to let gradient show through, only adding functionality where needed */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-transparent pointer-events-auto" />
      
      <div className="relative h-full flex items-center justify-end px-6 pointer-events-auto">
        {/* Mobile spacer for hamburger menu */}
        <div className="lg:hidden flex-1" />
        
        {/* Notification Bell only */}
        <NotificationBell />
      </div>
    </header>
  );
}
