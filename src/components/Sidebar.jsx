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
  BarChart3
} from 'lucide-react';
import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Mock subscription tier - would come from user context
  const subscriptionTier = 'Pro'; // Free, Essentials, Pro
  const aiGensUsed = 156;
  const aiGensLimit = {
    'Free': 20,
    'Essentials': 300,
    'Pro': 500
  }[subscriptionTier];
  const aiGensPercent = (aiGensUsed / aiGensLimit) * 100;

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
        { name: 'Content Library', icon: FolderOpen, path: '/library' },
        { name: 'Analytics', icon: BarChart3, path: '/analytics' }
      ]
    },
    { 
      section: 'AI TOOLS', 
      items: [
        { name: 'AI Plan Builder', icon: Wand2, path: '/plan-builder' },
        { name: 'AI Power Tools', icon: Zap, path: '/ai-tools' },
        { name: 'Trend Lab', icon: Beaker, path: '/trend-lab' },
        { name: 'Huttle Agent', icon: Bot, path: '/agent', badge: 'Beta' }
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 
          flex flex-col p-6 overflow-y-auto z-40 transition-transform duration-300
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
      {/* Logo */}
      <div className="mb-8 mt-2">
        <img 
          src="/huttle-logo.png" 
          alt="Huttle AI" 
          className="h-8 w-auto"
        />
      </div>

               {/* Navigation */}
               <nav className="flex-1 space-y-4 mb-4">
          {navItems.map((section) => (
            <div key={section.section}>
              <h2 className="text-xs font-semibold text-gray-500 mb-3 px-3">
                {section.section}
              </h2>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-huttle-primary text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.name}</span>
                    {item.badge && (
                      <span className="ml-auto text-xs bg-cyan-100 text-huttle-primary px-2 py-0.5 rounded-full font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
                   </div>
                 </div>
               ))}
             </nav>

             {/* AI Usage Meter */}
             <div className="mt-auto pt-6 border-t border-gray-200">
               <div className="mb-4 px-3">
                 <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2">
                     <Sparkles className="w-4 h-4 text-huttle-primary" />
                     <span className="text-xs font-semibold text-gray-700">AI Generations</span>
                   </div>
                   <span className="text-xs font-bold text-huttle-primary">{aiGensUsed}/{aiGensLimit}</span>
                 </div>
                 <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                   <div 
                     className={`h-2 rounded-full transition-all ${
                       aiGensPercent > 90 ? 'bg-red-500' : aiGensPercent > 70 ? 'bg-yellow-500' : 'bg-huttle-primary'
                     }`}
                     style={{ width: `${Math.min(aiGensPercent, 100)}%` }}
                   ></div>
                 </div>
                 <p className="text-xs text-gray-500 mt-1">{subscriptionTier} Plan</p>
               </div>

               {/* Logout Button */}
               <button
                 onClick={handleLogout}
                 className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
               >
                 <LogOut className="w-5 h-5" />
                 <span className="text-sm font-medium">Logout</span>
               </button>
             </div>
      </aside>
    </>
  );
}
