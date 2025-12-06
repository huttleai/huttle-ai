import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Settings as SettingsIcon, Bell, Globe, Lock, User, CreditCard, Save, ExternalLink, Smartphone } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import Tooltip from '../components/Tooltip';
import { AuthContext } from '../context/AuthContext';
import { usePreferredPlatforms } from '../hooks/usePreferredPlatforms';

/**
 * Settings Page
 * 
 * NOTE: Social media connections are NOT required for Huttle AI.
 * Users publish content via deep linking (opening native apps directly).
 * The "Preferred Platforms" section is for tracking user preferences only.
 */
export default function Settings() {
  const { addToast } = useToast();
  const { user } = useContext(AuthContext);
  const { 
    preferredPlatforms, 
    allPlatforms, 
    togglePlatform, 
    isPlatformPreferred 
  } = usePreferredPlatforms();

  const [settings, setSettings] = useState({
    // General Settings
    language: 'en',
    timezone: 'America/New_York',
  });

  const handleSave = () => {
    // Save settings to localStorage (platforms are auto-saved via the hook)
    localStorage.setItem('userSettings', JSON.stringify(settings));
    addToast('Settings saved successfully!', 'success');
  };

  // Transform allPlatforms to the format expected by the UI
  const socialPlatforms = allPlatforms.map(p => ({
    name: p.displayName || p.name,
    icon: p.icon,
    color: p.id === 'instagram' 
      ? 'bg-gradient-to-br from-purple-600 to-pink-500' 
      : p.color,
    description: p.description
  }));

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-20 px-4 md:px-6 lg:px-8 pb-8">
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
            <SettingsIcon className="w-6 h-6 md:w-7 md:h-7 text-huttle-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">
              Settings
            </h1>
            <p className="text-sm md:text-base text-gray-500">
              Manage your account preferences and notifications
            </p>
          </div>
        </div>
      </div>

      {/* Quick Settings Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <Link 
          to="/profile"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-huttle-primary transition-all text-left"
        >
          <User className="w-6 h-6 text-huttle-primary mb-2" />
          <h4 className="font-semibold text-gray-900 text-sm mb-1">Profile</h4>
          <p className="text-xs text-gray-600">Update your information</p>
        </Link>
        <Link 
          to="/brand-voice"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-huttle-primary transition-all text-left"
        >
          <Smartphone className="w-6 h-6 text-huttle-primary mb-2" />
          <h4 className="font-semibold text-gray-900 text-sm mb-1">Brand Voice</h4>
          <p className="text-xs text-gray-600">Customize AI content</p>
        </Link>
        <Link 
          to="/security"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-huttle-primary transition-all text-left"
        >
          <Lock className="w-6 h-6 text-huttle-primary mb-2" />
          <h4 className="font-semibold text-gray-900 text-sm mb-1">Security</h4>
          <p className="text-xs text-gray-600">Password & authentication</p>
        </Link>
        <Link 
          to="/subscription"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-huttle-primary transition-all text-left"
        >
          <CreditCard className="w-6 h-6 text-huttle-primary mb-2" />
          <h4 className="font-semibold text-gray-900 text-sm mb-1">Billing</h4>
          <p className="text-xs text-gray-600">Plans & payment methods</p>
        </Link>
      </div>

      {/* Preferred Platforms */}
      <div className="card p-5 md:p-6 mb-6 md:mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-huttle-primary bg-opacity-10 flex items-center justify-center">
              <Globe className="w-6 h-6 text-huttle-primary" />
            </div>
            <div>
              <Tooltip content="Select your preferred platforms. When you publish, Huttle AI will open the native app on your phone or the website on desktop.">
                <h3 className="text-lg font-semibold text-gray-900">Preferred Platforms</h3>
              </Tooltip>
              <p className="text-sm text-gray-600">Select which platforms you use most</p>
            </div>
          </div>
          <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
            {preferredPlatforms.length} Selected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {socialPlatforms.map((platform) => {
            const isSelected = isPlatformPreferred(platform.name);
            return (
              <button
                key={platform.name}
                onClick={() => togglePlatform(platform.name)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-huttle-primary bg-huttle-primary/5'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-white border border-gray-100 shadow-sm`}>
                    <platform.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{platform.name}</h4>
                    <p className="text-xs text-gray-500">{platform.description}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-huttle-primary bg-huttle-primary' : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-3">
            <ExternalLink className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">How Publishing Works</h4>
              <p className="text-sm text-blue-700">
                When you click "Publish Now" on a post, Huttle AI opens the native app on your phone (or the website on desktop) with your content ready to paste. No account connection required!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div className="card p-5 md:p-6 mb-6 md:mb-8">
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

      {/* Notifications Settings */}
      <div className="card p-5 md:p-6 mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-huttle-primary bg-opacity-10 flex items-center justify-center">
            <Bell className="w-6 h-6 text-huttle-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            <p className="text-sm text-gray-600">Manage how you receive updates</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-semibold text-gray-900">Post Reminders</h4>
              <p className="text-sm text-gray-600">Get notified when it's time to publish</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-huttle-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-huttle-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-semibold text-gray-900">Trend Alerts</h4>
              <p className="text-sm text-gray-600">Get notified about trending topics in your niche</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-huttle-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-huttle-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-semibold text-gray-900">AI Usage Alerts</h4>
              <p className="text-sm text-gray-600">Get notified when approaching usage limits</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-huttle-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-huttle-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="sticky bottom-4 md:bottom-6 flex justify-center md:justify-end">
        <button
          onClick={handleSave}
          className="btn-primary px-6 md:px-8 py-2.5 md:py-3 shadow-lg"
        >
          <Save className="w-4 h-4 md:w-5 md:h-5" />
          Save All Settings
        </button>
      </div>
    </div>
  );
}
