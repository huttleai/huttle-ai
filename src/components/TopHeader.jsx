import { Link } from 'react-router-dom';
import { Menu, UserRound } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useMobileNav } from '../context/MobileNavContext';
import { useDashboardSidebarMode } from '../hooks/useDashboardSidebarMode';

export default function TopHeader() {
  const { isOpen, toggle, close } = useMobileNav();
  const mode = useDashboardSidebarMode();
  const isDrawer = mode === 'drawer';

  const leftOffset = isDrawer ? 'left-0' : mode === 'rail' ? 'left-12' : 'left-64';

  return (
    <header
      className={`fixed top-0 z-40 ${leftOffset} right-0 border-b border-gray-100/80 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/75`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto grid h-14 min-h-[3.5rem] max-w-[100vw] grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-4 lg:px-6">
        <div className="flex min-h-[44px] items-center justify-start">
          {isDrawer ? (
            <button
              type="button"
              onClick={toggle}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-800 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-huttle-primary"
              aria-expanded={isOpen}
              aria-controls="navigation-drawer"
              aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
              data-testid="sidebar-mobile-toggle"
            >
              <Menu className="h-6 w-6" aria-hidden />
            </button>
          ) : null}
        </div>

        <div className="flex min-w-0 justify-center">
          <Link
            to="/dashboard"
            onClick={() => close()}
            className="flex max-w-[min(100%,160px)] items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-huttle-primary sm:max-w-[200px]"
            aria-label="Huttle AI home"
          >
            <img src="/huttle-logo.png" alt="" className="h-7 w-auto object-contain sm:h-8" loading="lazy" />
          </Link>
        </div>

        <div className="flex min-h-[44px] items-center justify-end gap-0.5 sm:gap-1">
          <NotificationBell />
          <Link
            to="/dashboard/settings"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-huttle-primary"
            aria-label="Account and settings"
          >
            <UserRound className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
