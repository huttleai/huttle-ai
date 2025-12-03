import { NavLink, useNavigate } from 'react-router-dom';
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
  Repeat
} from 'lucide-react';
import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { SubscriptionContext } from '../context/SubscriptionContext';

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { logout } = useContext(AuthContext);
  const { userTier, getFeatureLimit } = useContext(SubscriptionContext);
  const navigate = useNavigate();
  
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
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Smart Calendar', icon: Calendar, path: '/calendar' },
        { name: 'Content Library', icon: FolderOpen, path: '/library' }
      ]
    },
    { 
      section: 'AI TOOLS', 
      items: [
        { name: 'AI Plan Builder', icon: Wand2, path: '/plan-builder' },
        { name: 'AI Power Tools', icon: Zap, path: '/ai-tools' },
        { name: 'Trend Lab', icon: Beaker, path: '/trend-lab' },
        { name: 'Content Repurposer', icon: Repeat, path: '/repurposer', badge: 'Pro' },
        { name: 'Huttle Agent', icon: Bot, path: '/agent', badge: 'Pro' }
      ]
    },
    { 
      section: 'ACCOUNT', 
      items: [
        { name: 'Profile', icon: User, path: '/profile' },
        { name: 'Brand Voice', icon: Waves, path: '/brand-voice' },
        { name: 'Subscription', icon: CreditCard, path: '/subscription' },
        { name: 'Social Updates', icon: Newspaper, path: '/social-updates' },
        { name: 'Settings', icon: Settings, path: '/settings' },
        { name: 'Help', icon: HelpCircle, path: '/help' }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-3.5 left-4 z-50 p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        {isMobileOpen ? <X className="w-5 h-5 text-gray-600" /> : <Menu className="w-5 h-5 text-gray-600" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30 fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen w-64 
          bg-white border-r border-gray-100
          flex flex-col overflow-y-auto z-40 
          transition-transform duration-200 ease-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full p-5">
          {/* Logo */}
          <div 
            className="mb-8 mt-1 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <img 
              src="/huttle-logo.png" 
              alt="Huttle AI" 
              className="h-8 w-auto transition-transform duration-150 group-hover:scale-105"
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-6">
            {navItems.map((section) => (
              <div key={section.section}>
                <h2 className="text-[10px] font-semibold tracking-wider text-gray-400 mb-2 px-3 uppercase">
                  {section.section}
                </h2>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileOpen(false)}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                          isActive
                            ? 'bg-huttle-cyan-light text-huttle-blue font-semibold'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className={`w-[18px] h-[18px] transition-transform duration-150 ${
                            isActive ? 'text-huttle-blue' : 'group-hover:scale-105'
                          }`} />
                          <span className="text-sm flex-1">{item.name}</span>
                          {item.badge && (
                            <span className="badge badge-pro text-[10px] px-1.5 py-0.5">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* AI Usage Meter - Clean design */}
          <div className="mt-auto pt-4 border-t border-gray-100">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-huttle-blue" />
                  <span className="text-sm font-medium text-gray-900">AI Generations</span>
                </div>
                <span className="text-xs text-gray-500">{tierLabel}</span>
              </div>
              
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-xl font-semibold text-gray-900">{aiGensUsed}</span>
                <span className="text-sm text-gray-500">/ {aiGensLimit}</span>
              </div>
              
              <div className="progress-bar">
                <div 
                  className={`progress-bar-fill ${
                    aiGensPercent > 90 
                      ? 'progress-bar-fill-danger' 
                      : aiGensPercent > 70 
                        ? 'progress-bar-fill-warning' 
                        : ''
                  }`}
                  style={{ width: `${Math.min(aiGensPercent, 100)}%` }}
                />
              </div>
              
              {aiGensPercent > 80 && subscriptionTier !== 'pro' && (
                <button 
                  onClick={() => navigate('/subscription')}
                  className="mt-3 w-full text-xs font-medium text-huttle-blue hover:text-huttle-blue-dark transition-colors"
                >
                  Upgrade for more →
                </button>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 mt-3 px-3 py-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150 group"
            >
              <LogOut className="w-4 h-4 transition-transform duration-150 group-hover:rotate-[-8deg]" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
