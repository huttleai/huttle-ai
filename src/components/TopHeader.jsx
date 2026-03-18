import NotificationBell from './NotificationBell';

export default function TopHeader() {
  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 z-30 pointer-events-none h-12 lg:h-16">
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-transparent pointer-events-auto" />
      
      <div className="relative h-full flex items-center justify-end px-4 lg:px-6 pointer-events-auto">
        <NotificationBell />
      </div>
    </header>
  );
}
