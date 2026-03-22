import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Wand2,
  Beaker,
  UserCog,
  Settings,
  HelpCircle,
  Newspaper,
  LogOut,
  Zap,
  PenLine,
  Repeat,
  Flame,
  Search,
} from 'lucide-react';
import { useState, useContext, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import { useMobileNav } from '../context/MobileNavContext';
import { useDashboardSidebarMode } from '../hooks/useDashboardSidebarMode';
import useAIUsage from '../hooks/useAIUsage';

function toTestId(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const drawerTransition = { duration: 0.25, ease: [0, 0, 0.2, 1] };

export default function Sidebar() {
  const { isOpen: isDrawerOpen, close: closeMobileNav } = useMobileNav();
  const sidebarMode = useDashboardSidebarMode();
  const reduceMotion = useReducedMotion();
  const { logout } = useContext(AuthContext);
  const { overallUsed: aiUsed, overallLimit: aiLimit } = useAIUsage();
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const isDrawer = sidebarMode === 'drawer';
  const isRail = sidebarMode === 'rail';
  const isExpanded = sidebarMode === 'expanded';

  useEffect(() => {
    if (!isDrawer) closeMobileNav();
  }, [isDrawer, closeMobileNav]);

  useEffect(() => {
    if (isDrawer) closeMobileNav();
  }, [location.pathname, location.search, isDrawer, closeMobileNav]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('brandData');
      localStorage.removeItem('hasSeenWelcome');

      const result = await logout();
      if (result.success) {
        window.location.href = '/dashboard/login';
      } else {
        console.error('Logout failed:', result.error);
        window.location.href = '/dashboard/login';
      }
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/dashboard/login';
    }
  };

  const navItems = [
    {
      section: 'MAIN',
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', color: 'from-blue-500 to-cyan-500' },
        { name: 'Content Vault', icon: FolderOpen, path: '/dashboard/library', color: 'from-amber-500 to-orange-500' },
      ],
    },
    {
      section: 'AI TOOLS',
      items: [
        { name: 'Full Post Builder', icon: PenLine, path: '/dashboard/full-post-builder', color: 'from-teal-500 to-cyan-500' },
        { name: 'AI Plan Builder', icon: Wand2, path: '/dashboard/plan-builder', color: 'from-violet-500 to-purple-500' },
        { name: 'AI Power Tools', icon: Zap, path: '/dashboard/ai-tools?tool=caption', color: 'from-yellow-500 to-orange-500' },
        { name: 'Trend Lab', icon: Beaker, path: '/dashboard/trend-lab', color: 'from-pink-500 to-rose-500' },
        { name: 'Niche Intel', icon: Search, path: '/dashboard/niche-intel', badge: 'Pro', color: 'from-indigo-500 to-blue-500' },
        { name: 'Ignite Engine', icon: Flame, path: '/dashboard/ignite-engine', badge: 'Beta', color: 'from-orange-500 to-pink-500' },
        { name: 'Content Remix Studio', icon: Repeat, path: '/dashboard/content-remix', color: 'from-teal-500 to-cyan-500' },
      ],
    },
    {
      section: 'ACCOUNT',
      items: [
        { name: 'Brand Profile', icon: UserCog, path: '/dashboard/brand-voice', color: 'from-blue-500 to-indigo-500' },
        { name: 'Social Updates', icon: Newspaper, path: '/dashboard/social-updates', color: 'from-orange-500 to-red-500' },
        { name: 'Settings', icon: Settings, path: '/dashboard/settings', color: 'from-gray-500 to-slate-600' },
        { name: 'Help', icon: HelpCircle, path: '/dashboard/help', color: 'from-blue-400 to-cyan-500' },
      ],
    },
  ];

  const isPathActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    if (path.includes('?')) {
      const basePath = path.split('?')[0];
      return location.pathname.startsWith(basePath) && location.search.includes(path.split('?')[1]);
    }
    return location.pathname.startsWith(path);
  };

  const handleSidebarTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleSidebarTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (deltaX < -60 && deltaY < 50) closeMobileNav();
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const closeNav = () => {
    if (isDrawer) closeMobileNav();
  };

  const iconClass = (isActive, isHovered) =>
    `w-5 h-5 transition-all duration-200 ${
      isActive ? 'text-huttle-primary' : isHovered ? 'text-gray-700' : 'text-gray-500'
    }`;

  const asideShellClass = `
    fixed left-0 top-0 z-40 flex h-[100dvh] flex-col overflow-hidden border-r border-gray-100/80
    bg-gradient-to-b from-white via-white to-gray-50/80
    ${isRail ? 'w-12' : 'w-64'}
  `;

  const innerPadding = isRail ? 'p-2' : 'p-5';

  const sidebarInner = (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.03),transparent_50%)]" />

      <div
        className={`relative flex h-full flex-col overflow-y-auto overscroll-y-contain scrollbar-thin ${innerPadding}`}
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        <div className={`mb-6 mt-1 flex items-center ${isRail ? 'justify-center' : ''}`}>
          <div
            className="group cursor-pointer"
            onClick={() => {
              navigate('/dashboard');
              window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
              closeNav();
            }}
          >
            <img
              src="/huttle-logo.png"
              alt="Huttle AI"
              className={`object-contain transition-all duration-200 group-hover:scale-105 ${isRail ? 'h-7 w-7' : 'h-8 w-auto'}`}
              loading="lazy"
            />
          </div>
        </div>

        <nav className="flex-1 space-y-4 lg:space-y-6" aria-label="Main navigation">
          {navItems.map((section) => (
            <div key={section.section}>
              <h2
                className={
                  isRail
                    ? 'sr-only'
                    : 'mb-2 px-3 text-xs font-bold uppercase tracking-widest text-gray-400/80 lg:mb-3'
                }
              >
                {section.section}
              </h2>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = isPathActive(item.path);
                  const isHovered = hoveredItem === item.path;

                  return (
                    <NavLink
                      key={item.path + item.name}
                      to={item.path}
                      title={isRail ? item.name : undefined}
                      onClick={() => {
                        closeNav();
                        if (item.path === '/dashboard') {
                          window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                        }
                      }}
                      onMouseEnter={() => setHoveredItem(item.path)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className="group relative block"
                      data-testid={`sidebar-link-${toTestId(item.name)}`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-huttle-primary" />
                      )}

                      <div
                        className={`relative flex min-h-[44px] items-center rounded-xl px-2 py-2 transition-all duration-200 lg:min-h-[48px] lg:gap-3 lg:px-3 lg:py-3 ${
                          isRail ? 'justify-center' : 'gap-3'
                        } ${
                          isActive ? 'bg-huttle-50/80' : isHovered ? 'bg-gray-50' : 'bg-transparent'
                        }`}
                      >
                        <div
                          className={`relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200 lg:h-8 lg:w-8 ${
                            isActive ? 'bg-huttle-primary/10' : isHovered ? 'bg-gray-100' : 'bg-transparent'
                          }`}
                        >
                          <item.icon className={iconClass(isActive, isHovered)} aria-hidden />
                        </div>

                        <span
                          className={`flex-1 text-sm font-medium transition-all duration-200 ${
                            isRail ? 'sr-only' : 'block'
                          } ${isActive ? 'text-gray-900' : isHovered ? 'text-gray-900' : 'text-gray-600'}`}
                        >
                          {item.name}
                        </span>

                        {item.badge && !isRail && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                              isActive ? 'bg-huttle-primary text-white' : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto pt-4">
          {(() => {
            const displayLimit = aiLimit;

            const percentage = displayLimit > 0 ? Math.round((aiUsed / displayLimit) * 100) : 0;
            const isAmber = percentage >= 80 && percentage < 100;
            const isRed = percentage >= 100;

            const barColor = isRed ? 'bg-red-500' : isAmber ? 'bg-amber-500' : 'bg-huttle-primary';

            const bgColor = isRed
              ? 'border-red-200 bg-red-50'
              : isAmber
                ? 'border-amber-200 bg-amber-50'
                : 'border-gray-200 bg-gray-50';

            const textColor = isRed ? 'text-red-700' : isAmber ? 'text-amber-700' : 'text-gray-700';

            if (isRail) {
              return (
                <div
                  className="mb-3 flex flex-col items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-2"
                  data-testid="sidebar-ai-meter"
                  title={`AI usage ${aiUsed} of ${displayLimit}`}
                >
                  <Zap
                    className={`h-5 w-5 ${isRed ? 'text-red-500' : isAmber ? 'text-amber-500' : 'text-huttle-primary'}`}
                    aria-hidden
                  />
                  <span className="text-[10px] font-bold leading-none text-gray-700">
                    {aiUsed}/{displayLimit}
                  </span>
                </div>
              );
            }

            return (
              <div className={`mb-3 rounded-xl border p-3 ${bgColor}`} data-testid="sidebar-ai-meter">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Zap className={`h-3.5 w-3.5 ${isRed ? 'text-red-500' : isAmber ? 'text-amber-500' : 'text-huttle-primary'}`} />
                    <span className="text-xs font-bold text-gray-700">AI Meter</span>
                  </div>
                  <span className={`text-xs font-bold ${textColor}`}>
                    {aiUsed}/{displayLimit}
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>

                {isRed && (
                  <p className="mt-2 text-xs font-medium text-red-600">Monthly limit reached. Resets next billing cycle.</p>
                )}
                {isAmber && !isRed && (
                  <p className="mt-2 text-xs font-medium text-amber-600">Running low on AI generations this month.</p>
                )}
              </div>
            );
          })()}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            className={`group flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-gray-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600 ${
              isRail ? 'min-h-[44px]' : ''
            }`}
            data-testid="sidebar-sign-out"
          >
            <LogOut className="h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:rotate-[-12deg]" aria-hidden />
            <span className={`text-sm font-medium ${isRail ? 'sr-only' : ''}`}>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );

  if (isDrawer) {
    const instant = reduceMotion ? { duration: 0 } : drawerTransition;
    return (
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={instant}
              className="fixed inset-0 z-30 bg-black/50"
              role="presentation"
              onClick={closeMobileNav}
            />
            <motion.aside
              id="navigation-drawer"
              key="sidebar-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              initial={reduceMotion ? false : { x: '-100%' }}
              animate={{ x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { x: '-100%' }}
              transition={instant}
              className={`${asideShellClass} w-64 shadow-xl`}
              style={{ paddingTop: 'env(safe-area-inset-top)' }}
              onTouchStart={handleSidebarTouchStart}
              onTouchEnd={handleSidebarTouchEnd}
              data-testid="sidebar"
            >
              {sidebarInner}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <aside
      className={`${asideShellClass} shadow-sm`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
      onTouchStart={handleSidebarTouchStart}
      onTouchEnd={handleSidebarTouchEnd}
      data-testid="sidebar"
    >
      {sidebarInner}
    </aside>
  );
}
