import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  FolderOpen,
  Wand2,
  Beaker,
  Bot,
  User,
  Waves,
  CreditCard,
  Settings,
  HelpCircle,
  Menu,
  X,
  Newspaper,
  LogOut,
  Sparkles,
  Zap,
  Repeat,
  ChevronRight
} from 'lucide-react';
import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { SubscriptionContext } from '../context/SubscriptionContext';

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { logout } = useContext(AuthContext);
  const { userTier, getFeatureLimit } = useContext(SubscriptionContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);
  
  // AI usage data
  const subscriptionTier = userTier || 'free';
  const tierLabel = subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1);
  const [aiGensUsed, setAiGensUsed] = useState(0);
  const [aiGensLimit, setAiGensLimit] = useState(20);
  
  // Initialize AI usage limits (matching Dashboard pattern)
  useEffect(() => {
    const aiLimit = getFeatureLimit('aiGenerations');
    setAiGensLimit(aiLimit === -1 ? Infinity : aiLimit);
    
    const savedUsage = localStorage.getItem('aiGensUsed');
    if (savedUsage) {
      setAiGensUsed(parseInt(savedUsage, 10));
    }
  }, [userTier, getFeatureLimit]);
  
  const aiGensPercent = aiGensLimit > 0 && aiGensLimit !== Infinity ? (aiGensUsed / aiGensLimit) * 100 : 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { 
      section: 'MAIN', 
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/', color: 'from-blue-500 to-cyan-500' },
        { name: 'Smart Calendar', icon: Calendar, path: '/calendar', color: 'from-emerald-500 to-teal-500' },
        { name: 'Content Library', icon: FolderOpen, path: '/library', color: 'from-amber-500 to-orange-500' }
      ]
    },
    { 
      section: 'AI TOOLS', 
      items: [
        { name: 'AI Plan Builder', icon: Wand2, path: '/plan-builder', color: 'from-violet-500 to-purple-500' },
        { name: 'AI Power Tools', icon: Zap, path: '/ai-tools', color: 'from-yellow-500 to-orange-500' },
        { name: 'Trend Lab', icon: Beaker, path: '/trend-lab', color: 'from-pink-500 to-rose-500' },
        { name: 'Content Repurposer', icon: Repeat, path: '/repurposer', badge: 'Pro', color: 'from-cyan-500 to-blue-500' },
        { name: 'Huttle Agent', icon: Bot, path: '/agent', badge: 'Pro', color: 'from-indigo-500 to-violet-500' }
      ]
    },
    { 
      section: 'ACCOUNT', 
      items: [
        { name: 'Profile', icon: User, path: '/profile', color: 'from-slate-500 to-gray-600' },
        { name: 'Brand Voice', icon: Waves, path: '/brand-voice', color: 'from-blue-500 to-indigo-500' },
        { name: 'Subscription', icon: CreditCard, path: '/subscription', color: 'from-emerald-500 to-green-500' },
        { name: 'Social Updates', icon: Newspaper, path: '/social-updates', color: 'from-orange-500 to-red-500' },
        { name: 'Settings', icon: Settings, path: '/settings', color: 'from-gray-500 to-slate-600' },
        { name: 'Help', icon: HelpCircle, path: '/help', color: 'from-blue-400 to-cyan-500' }
      ]
    }
  ];

  // Check if path is active
  const isPathActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-3.5 left-4 z-50 p-2.5 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200/50 hover:bg-white hover:shadow-lg transition-all duration-200"
      >
        {isMobileOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-30 animate-fadeIn"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen w-64 
          bg-gradient-to-b from-white via-white to-gray-50/80
          border-r border-gray-100/80
          flex flex-col overflow-hidden z-40 
          transition-transform duration-300 ease-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.03),transparent_50%)] pointer-events-none" />
        
        <div className="relative flex flex-col h-full p-5 overflow-y-auto scrollbar-thin">
          {/* Logo */}
          <div 
            className="mb-8 mt-1 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <img 
              src="/huttle-logo.png" 
              alt="Huttle AI" 
              className="h-8 w-auto transition-all duration-200 group-hover:scale-105"
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-6">
            {navItems.map((section) => (
              <div key={section.section}>
                <h2 className="text-[10px] font-bold tracking-widest text-gray-400/80 mb-3 px-3 uppercase">
                  {section.section}
                </h2>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = isPathActive(item.path);
                    const isHovered = hoveredItem === item.path;
                    
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileOpen(false)}
                        onMouseEnter={() => setHoveredItem(item.path)}
                        onMouseLeave={() => setHoveredItem(null)}
                        className="group relative block"
                      >
                        {/* Left accent border for active */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-huttle-primary rounded-r-full" />
                        )}
                        
                        {/* Content */}
                        <div className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                          isActive 
                            ? 'bg-blue-50/80' 
                            : isHovered 
                              ? 'bg-gray-50' 
                              : 'bg-transparent'
                        }`}>
                          {/* Icon Container - Simple monochrome */}
                          <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                            isActive 
                              ? 'bg-huttle-primary/10' 
                              : isHovered
                                ? 'bg-gray-100'
                                : 'bg-transparent'
                          }`}>
                            <item.icon className={`w-[18px] h-[18px] transition-all duration-200 ${
                              isActive 
                                ? 'text-huttle-primary' 
                                : isHovered 
                                  ? 'text-gray-700' 
                                  : 'text-gray-500'
                            }`} />
                          </div>
                          
                          {/* Text */}
                          <span className={`text-sm flex-1 font-medium transition-all duration-200 ${
                            isActive 
                              ? 'text-gray-900' 
                              : isHovered 
                                ? 'text-gray-900' 
                                : 'text-gray-600'
                          }`}>
                            {item.name}
                          </span>
                          
                          {/* Badge */}
                          {item.badge && (
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-all duration-200 ${
                              isActive 
                                ? 'bg-huttle-primary text-white' 
                                : 'bg-gray-200 text-gray-700'
                            }`}>
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

          {/* AI Usage Meter - Compact Design */}
          <div className="mt-auto pt-4">
            <div className="relative overflow-hidden p-3 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200/50">
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-huttle-primary/10 flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-huttle-primary" />
                    </div>
                    <span className="text-xs font-semibold text-gray-900">AI Credits</span>
                  </div>
                  <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded-full">
                    {tierLabel}
                  </span>
                </div>
                
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-xl font-bold text-gray-900">{aiGensUsed}</span>
                  <span className="text-xs text-gray-500">/ {aiGensLimit === Infinity ? '∞' : aiGensLimit}</span>
                </div>
                
                {/* Progress bar */}
                <div className="h-1.5 bg-gray-200/80 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      aiGensPercent > 90 
                        ? 'bg-red-500' 
                        : aiGensPercent > 70 
                          ? 'bg-orange-500' 
                          : 'bg-huttle-primary'
                    }`}
                    style={{ width: `${Math.min(aiGensPercent, 100)}%` }}
                  />
                </div>
                
                {aiGensPercent > 80 && subscriptionTier !== 'pro' && (
                  <button 
                    onClick={() => navigate('/subscription')}
                    className="mt-2 w-full text-[10px] font-semibold text-white py-1.5 px-2 rounded-lg flex items-center justify-center gap-0.5 btn-upgrade-glow"
                  >
                    Upgrade for more
                    <ChevronRight className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 mt-3 px-3 py-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group"
            >
              <LogOut className="w-4 h-4 transition-transform duration-200 group-hover:rotate-[-12deg]" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
