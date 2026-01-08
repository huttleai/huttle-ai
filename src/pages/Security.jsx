import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Shield, Lock, Mail, Eye, EyeOff, ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function Security() {
  const { user, updatePassword, updateEmail } = useContext(AuthContext);
  const { addToast } = useToast();
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Email form state
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    confirmEmail: '',
  });
  const [emailLoading, setEmailLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    const password = passwordForm.newPassword;
    
    // Validation - enforce strong password policy
    if (password.length < 8) {
      addToast('Password must be at least 8 characters long', 'error');
      return;
    }
    
    // Check for required character types
    if (!/[a-z]/.test(password)) {
      addToast('Password must include a lowercase letter', 'error');
      return;
    }
    
    if (!/[A-Z]/.test(password)) {
      addToast('Password must include an uppercase letter', 'error');
      return;
    }
    
    if (!/[0-9]/.test(password)) {
      addToast('Password must include a number', 'error');
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }

    setPasswordLoading(true);
    try {
      const result = await updatePassword(passwordForm.newPassword);
      
      if (result.success) {
        addToast('Password updated successfully!', 'success');
        setPasswordForm({ newPassword: '', confirmPassword: '' });
      } else {
        addToast(result.error || 'Failed to update password', 'error');
      }
    } catch (error) {
      addToast('An unexpected error occurred', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    
    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailForm.newEmail)) {
      addToast('Please enter a valid email address', 'error');
      return;
    }
    
    if (emailForm.newEmail !== emailForm.confirmEmail) {
      addToast('Email addresses do not match', 'error');
      return;
    }

    if (emailForm.newEmail === user?.email) {
      addToast('New email is the same as your current email', 'error');
      return;
    }

    setEmailLoading(true);
    try {
      const result = await updateEmail(emailForm.newEmail);
      
      if (result.success) {
        addToast(result.message || 'Confirmation email sent. Please check your inbox.', 'success');
        setEmailForm({ newEmail: '', confirmEmail: '' });
      } else {
        addToast(result.error || 'Failed to update email', 'error');
      }
    } catch (error) {
      addToast('An unexpected error occurred', 'error');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-24 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <Link 
          to="/dashboard/settings" 
          className="inline-flex items-center gap-2 text-gray-600 hover:text-huttle-primary mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-huttle-gradient flex items-center justify-center shadow-lg shadow-huttle-blue/20">
            <Shield className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">
              Security
            </h1>
            <p className="text-sm md:text-base text-gray-500">
              Manage your password and email settings
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Change Password Section */}
        <div className="card p-5 md:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-huttle-primary bg-opacity-10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-huttle-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
              <p className="text-sm text-gray-600">Update your account password</p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading || !passwordForm.newPassword || !passwordForm.confirmPassword}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Update Password
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">
              <strong>Password requirements:</strong>
            </p>
            <ul className="text-xs text-gray-500 mt-1 ml-4 list-disc">
              <li>At least 8 characters</li>
              <li>One uppercase letter</li>
              <li>One lowercase letter</li>
              <li>One number</li>
              <li>Special characters recommended for extra security</li>
            </ul>
          </div>
        </div>

        {/* Change Email Section */}
        <div className="card p-5 md:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-huttle-primary bg-opacity-10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-huttle-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Change Email</h2>
              <p className="text-sm text-gray-600">
                Current email: <span className="font-medium text-gray-900">{user?.email || 'Not set'}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleEmailChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Email Address
              </label>
              <input
                type="email"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm(prev => ({ ...prev, newEmail: e.target.value }))}
                placeholder="Enter new email address"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Email Address
              </label>
              <input
                type="email"
                value={emailForm.confirmEmail}
                onChange={(e) => setEmailForm(prev => ({ ...prev, confirmEmail: e.target.value }))}
                placeholder="Confirm new email address"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={emailLoading || !emailForm.newEmail || !emailForm.confirmEmail}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {emailLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Update Email
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-4 p-3 bg-huttle-50 border border-huttle-200 rounded-lg">
            <p className="text-xs text-gray-700">
              A confirmation link will be sent to your new email address. You'll need to click the link to complete the change.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}










