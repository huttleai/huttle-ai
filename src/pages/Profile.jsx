import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSubscription } from '../context/SubscriptionContext';
import { User, Mail, MapPin, Save, Briefcase } from 'lucide-react';
import { useBrand } from '../context/BrandContext';
import { formatDisplayName } from '../utils/brandContextBuilder';

export default function Profile() {
  const { user, updateUser, updateEmail } = useContext(AuthContext);
  const { userTier } = useSubscription();
  const { brandProfile, updateBrandData, refreshBrandData } = useBrand();
  const { showToast } = useToast();
  
  // Full Name: prioritize first_name from brand profile, then auth metadata, then fallbacks
  const defaultFullName = useMemo(() => (
    brandProfile?.firstName
      || user?.user_metadata?.first_name
      || user?.user_metadata?.name
      || user?.user_metadata?.full_name
      || user?.name
      || user?.email?.split('@')[0]
      || ''
  ), [brandProfile?.firstName, user?.user_metadata?.first_name, user?.user_metadata?.name, user?.user_metadata?.full_name, user?.name, user?.email]);

  // Brand Name: separate field from full name
  const defaultBrandName = useMemo(() => (
    brandProfile?.brandName || ''
  ), [brandProfile?.brandName]);

  const defaultEmail = user?.email || '';

  const [formData, setFormData] = useState({
    fullName: defaultFullName,
    brandName: defaultBrandName,
    email: defaultEmail,
    location: ''
  });

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      fullName: defaultFullName,
      brandName: defaultBrandName,
      email: defaultEmail
    }));
  }, [defaultFullName, defaultBrandName, defaultEmail]);

  const handleSave = async () => {
    const trimmedFullName = formData.fullName.trim();
    const trimmedBrandName = formData.brandName.trim();
    const trimmedEmail = formData.email.trim();

    try {
      // Update full name in auth metadata
      if (trimmedFullName) {
        await updateUser({ name: trimmedFullName, full_name: trimmedFullName, first_name: trimmedFullName });
      }

      // Update brand name in brand profile (separate from personal name)
      if (trimmedBrandName !== defaultBrandName) {
        await updateBrandData({ brandName: trimmedBrandName });
      }

      if (trimmedEmail && trimmedEmail !== user?.email) {
        const result = await updateEmail(trimmedEmail);
        if (!result.success) {
          showToast(result.error || 'Failed to update email', 'error');
          return;
        }
        if (result.message) {
          showToast(result.message, 'info');
        }
      }

      // Force refresh brand data across the app
      refreshBrandData();
      showToast('Profile updated successfully!', 'success');
    } catch (error) {
      console.error('Failed to update profile:', error);
      showToast('Failed to update profile. Please try again.', 'error');
    }
  };

  const displayName = formatDisplayName(defaultFullName);
  const isFoundingMember = userTier === 'founders' || userTier === 'founder';

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-24 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8">
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
            <User className="w-6 h-6 md:w-7 md:h-7 text-huttle-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">
              Profile
            </h1>
            <p className="text-sm md:text-base text-gray-500">
              Manage your account settings and preferences
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl">
        <div className="card p-5 md:p-6 mb-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-huttle-primary to-huttle-primary-dark flex items-center justify-center text-white text-2xl font-bold">
              {displayName?.[0]?.toUpperCase() || <User className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900">{displayName || 'Your Name'}</h2>
                {isFoundingMember && (
                  <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    🏆 FOUNDING MEMBER
                  </span>
                )}
              </div>
              <p className="text-gray-600">{defaultEmail || 'No email set'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Full Name
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Your full name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Briefcase className="w-4 h-4 inline mr-2" />
                Brand / Business Name
              </label>
              <input
                type="text"
                value={formData.brandName}
                onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                placeholder="Your brand or business name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">This name is used for AI-generated content and your brand voice.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="City, Country"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button 
              onClick={handleSave}
              className="px-6 py-2.5 bg-huttle-primary hover:bg-huttle-primary-dark text-white rounded-lg font-medium transition-all shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
            <button 
              onClick={() => setFormData({
                fullName: defaultFullName,
                brandName: defaultBrandName,
                email: defaultEmail,
                location: ''
              })}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

