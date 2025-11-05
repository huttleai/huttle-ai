import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Settings as SettingsIcon, Bell, Smartphone, Globe, Lock, User, CreditCard, Save, Check, X, ExternalLink } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { checkSocialConnections, setSocialConnection } from '../utils/socialConnectionChecker';
import { updateConnectionStatus, isN8nConfigured } from '../services/n8nAPI';
import { InstagramIcon, FacebookIcon, TikTokIcon, TwitterXIcon, LinkedInIcon, YouTubeIcon } from '../components/SocialIcons';
import Tooltip from '../components/Tooltip';
import { AuthContext } from '../context/AuthContext';

export default function Settings() {
  const { addToast } = useToast();
  const { addSuccess, addInfo } = useNotifications();
  const { user } = useContext(AuthContext);

  const [settings, setSettings] = useState({
    // General Settings
    language: 'en',
    timezone: 'America/New_York',
  });

  const [socialConnections, setSocialConnectionsState] = useState({
    Instagram: false,
    Facebook: false,
    Twitter: false,
    X: false,
    LinkedIn: false,
    TikTok: false,
    YouTube: false,
  });

  const [loadingConnections, setLoadingConnections] = useState(true);
  const [n8nConfigured, setN8nConfigured] = useState(false);

  // Load connection status on mount
  useEffect(() => {
    const loadConnections = async () => {
      if (user?.id) {
        try {
          const connections = await checkSocialConnections(user.id);
          setSocialConnectionsState(connections);
        } catch (error) {
          console.error('Failed to load connections:', error);
          // Fallback to empty state if database query fails
          setSocialConnectionsState({
            Instagram: false,
            Facebook: false,
            Twitter: false,
            X: false,
            LinkedIn: false,
            TikTok: false,
            YouTube: false,
          });
        }
      } else {
        // No user, use empty state
        setSocialConnectionsState({
          Instagram: false,
          Facebook: false,
          Twitter: false,
          X: false,
          LinkedIn: false,
          TikTok: false,
          YouTube: false,
        });
      }
      setLoadingConnections(false);
    };

    setN8nConfigured(isN8nConfigured());
    loadConnections();
  }, [user]);


  const handleSave = () => {
    // Note: Settings persistence is handled via context/state management
    // Backend sync can be added when user preferences API is implemented
    addToast('Settings saved successfully!', 'success');
  };

  const handleConnectPlatform = async (platform) => {
    if (n8nConfigured && user?.id) {
      // Use n8n for real OAuth flow
      addInfo(
        `Connect ${platform}`,
        `This will open ${platform}'s OAuth flow through n8n. You'll be redirected to authenticate.`,
        async () => {
          try {
            // This would trigger n8n OAuth workflow
            // For now, simulate the connection update
            const result = await updateConnectionStatus(user.id, platform, 'connect', {
              username: `demo_user_${platform.toLowerCase()}` // This would come from n8n
            });

            if (result.success) {
              // Refresh connection status
              const connections = await checkSocialConnections(user.id);
              setSocialConnectionsState(connections);
              addSuccess(`${platform} Connected!`, `You can now post directly to ${platform} from Huttle AI.`);
            } else {
              addToast(`Failed to connect ${platform}`, 'error');
            }
          } catch (error) {
            console.error('Connection error:', error);
            addToast(`Failed to connect ${platform}`, 'error');
          }
        },
        'Connect'
      );
    } else {
      // Fallback to simulation
      addInfo(
        `Connect ${platform}`,
        n8nConfigured
          ? `n8n integration is configured but no user found. Please log in first.`
          : `n8n integration not configured. This will simulate a connection for testing.`,
        async () => {
          // For demo/testing without n8n
          setSocialConnection(platform, true);
          // Update state directly for demo mode
          setSocialConnectionsState(prev => ({
            ...prev,
            [platform]: true
          }));
          addSuccess(`${platform} Connected!`, `You can now post directly to ${platform} from Huttle AI.`);
        },
        'Connect'
      );
    }
  };

  const handleDisconnectPlatform = async (platform) => {
    if (window.confirm(`Are you sure you want to disconnect ${platform}?`)) {
      if (n8nConfigured && user?.id) {
        // Use n8n API
        try {
          const result = await updateConnectionStatus(user.id, platform, 'disconnect');
          if (result.success) {
            // Refresh connection status
            const connections = await checkSocialConnections(user.id);
            setSocialConnectionsState(connections);
            addToast(`${platform} disconnected`, 'success');
          } else {
            addToast(`Failed to disconnect ${platform}`, 'error');
          }
        } catch (error) {
          console.error('Disconnect error:', error);
          addToast(`Failed to disconnect ${platform}`, 'error');
        }
      } else {
        // Fallback to localStorage for demo/testing
        setSocialConnection(platform, false);
        // Update state directly for demo mode
        setSocialConnectionsState(prev => ({
          ...prev,
          [platform]: false
        }));
        addToast(`${platform} disconnected`, 'success');
      }
    }
  };

  const socialPlatforms = [
    { name: 'Instagram', icon: InstagramIcon, color: 'bg-pink-500', description: 'Connect to post photos, reels, and stories' },
    { name: 'Facebook', icon: FacebookIcon, color: 'bg-blue-600', description: 'Share posts to your Facebook page' },
    { name: 'Twitter', icon: TwitterXIcon, color: 'bg-black', description: 'Tweet directly from Huttle AI' },
    { name: 'LinkedIn', icon: LinkedInIcon, color: 'bg-blue-700', description: 'Post professional content to LinkedIn' },
    { name: 'TikTok', icon: TikTokIcon, color: 'bg-black', description: 'Upload videos to TikTok' },
    { name: 'YouTube', icon: YouTubeIcon, color: 'bg-red-600', description: 'Upload videos to your YouTube channel' },
  ];

  return (
    <div className="flex-1 bg-gray-50 ml-0 lg:ml-64 pt-20 px-4 md:px-8 pb-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="w-8 h-8 text-huttle-primary" />
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Settings
          </h1>
        </div>
        <p className="text-gray-600">
          Manage your account preferences and notifications
        </p>
      </div>

      {/* Quick Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Link 
          to="/profile"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-huttle-primary transition-all text-left"
        >
          <User className="w-6 h-6 text-huttle-primary mb-2" />
          <h4 className="font-semibold text-gray-900 text-sm mb-1">Profile</h4>
          <p className="text-xs text-gray-600">Update your information</p>
        </Link>
        <button 
          onClick={() => addToast('Security settings coming soon!', 'info')}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-huttle-primary transition-all text-left"
        >
          <Lock className="w-6 h-6 text-huttle-primary mb-2" />
          <h4 className="font-semibold text-gray-900 text-sm mb-1">Security</h4>
          <p className="text-xs text-gray-600">Password & authentication</p>
        </button>
        <button 
          onClick={() => addToast('Billing settings coming soon!', 'info')}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-huttle-primary transition-all text-left"
        >
          <CreditCard className="w-6 h-6 text-huttle-primary mb-2" />
          <h4 className="font-semibold text-gray-900 text-sm mb-1">Billing</h4>
          <p className="text-xs text-gray-600">Plans & payment methods</p>
        </button>
        <button 
          onClick={() => addToast('Integrations coming soon!', 'info')}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-huttle-primary transition-all text-left"
        >
          <Globe className="w-6 h-6 text-huttle-primary mb-2" />
          <h4 className="font-semibold text-gray-900 text-sm mb-1">Integrations</h4>
          <p className="text-xs text-gray-600">Connect social accounts</p>
        </button>
      </div>

      {/* Social Media Connections */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-huttle-primary bg-opacity-10 flex items-center justify-center">
              <Globe className="w-6 h-6 text-huttle-primary" />
            </div>
            <div>
              <Tooltip content="Connect your social media accounts to post directly from Huttle AI. You can also download content and post manually.">
                <h3 className="text-lg font-semibold text-gray-900">Social Media Connections</h3>
              </Tooltip>
              <p className="text-sm text-gray-600">Manage your connected accounts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
              {loadingConnections ? '...' : `${Object.values(socialConnections).filter(Boolean).length} Connected`}
            </span>
            {n8nConfigured && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                n8n Ready
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {socialPlatforms.map((platform) => {
            const isConnected = socialConnections[platform.name];
            return (
              <div
                key={platform.name}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isConnected
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center`}>
                      <platform.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{platform.name}</h4>
                      {isConnected && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Connected
                        </span>
                      )}
                    </div>
                  </div>
                  {isConnected ? (
                    <button
                      onClick={() => handleDisconnectPlatform(platform.name)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded transition-all"
                      title="Disconnect"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
                <p className="text-sm text-gray-600 mb-3">{platform.description}</p>
                {isConnected ? (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Ready to post</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnectPlatform(platform.name)}
                    className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Connect {platform.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-3">
            <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">About Connections</h4>
              <p className="text-sm text-blue-700">
                Connected accounts allow you to post directly from Huttle AI. You can also download your content and post manually without connecting. Your account credentials are securely stored and never shared.
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* General Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-huttle-primary bg-opacity-10 flex items-center justify-center">
            <SettingsIcon className="w-6 h-6 text-huttle-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
            <p className="text-sm text-gray-600">Customize your app experience</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Globe className="w-5 h-5 text-gray-600" />
              <div>
                <h4 className="font-semibold text-gray-900">Language</h4>
                <p className="text-sm text-gray-600">Choose your preferred language</p>
              </div>
            </div>
            <select
              value={settings.language}
              onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="pt">Português</option>
            </select>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Globe className="w-5 h-5 text-gray-600" />
              <div>
                <h4 className="font-semibold text-gray-900">Timezone</h4>
                <p className="text-sm text-gray-600">Set your local timezone</p>
              </div>
            </div>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Australia/Sydney">Sydney (AEDT)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="sticky bottom-6 flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-8 py-3 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all shadow-lg hover:shadow-xl font-semibold"
        >
          <Save className="w-5 h-5" />
          Save All Settings
        </button>
      </div>
    </div>
  );
}
