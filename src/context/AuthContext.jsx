import { createContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  // Memoized checkUserProfile to prevent recreation on every render
  const checkUserProfile = useCallback(async (userId) => {
    console.log('🔍 [Auth] Checking user profile for:', userId);
    
    try {
      const { data, error } = await supabase
        .from('user_profile')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle() instead of single() for new users

      if (error) {
        console.error('❌ [Auth] Error checking user profile:', error);
        // On error, assume user needs onboarding to be safe
        setUserProfile(null);
        setNeedsOnboarding(true);
        setProfileChecked(true);
        return;
      }

      console.log('📋 [Auth] Profile data:', data);
      console.log('📋 [Auth] quiz_completed_at:', data?.quiz_completed_at);

      if (data && data.quiz_completed_at) {
        // User has completed onboarding
        console.log('✅ [Auth] User has completed onboarding');
        setUserProfile(data);
        setNeedsOnboarding(false);
      } else {
        // User exists but hasn't completed quiz, OR no profile exists
        // Either way, they need onboarding
        console.log('⚠️ [Auth] User NEEDS onboarding - quiz_completed_at is null or profile missing');
        setUserProfile(data || null);
        setNeedsOnboarding(true);
      }
      setProfileChecked(true);
    } catch (error) {
      console.error('❌ [Auth] Error in checkUserProfile:', error);
      // On error, force onboarding to be safe
      setUserProfile(null);
      setNeedsOnboarding(true);
      setProfileChecked(true);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    // Development bypass: Only allow via explicit environment variable in development
    // SECURITY: Removed localStorage-based bypass to prevent client-side manipulation
    const skipAuth = import.meta.env.DEV === true && import.meta.env.VITE_SKIP_AUTH === 'true';

    const initializeSession = async () => {
      console.log('🚀 [Auth] Initializing session...');
      
      try {
        // If skip auth is enabled (DEV mode only with explicit env var), create a mock user
        if (skipAuth) {
          console.warn('⚠️ DEV MODE: Authentication bypassed via VITE_SKIP_AUTH');
          const mockUser = {
            id: 'dev-user-123',
            email: 'dev@huttle.ai',
            name: 'Dev User'
          };
          if (isMounted) {
            setUser(mockUser);
            setUserProfile(null);
            setNeedsOnboarding(false);
            setProfileChecked(true);
            setLoading(false);
          }
          return;
        }

        // Set a timeout to prevent infinite loading (8 seconds - increased for Resend auth)
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn('⚠️ [Auth] Auth check timed out after 8 seconds. Proceeding without session.');
            setLoading(false);
            setUser(null);
            setUserProfile(null);
            setNeedsOnboarding(false);
            setProfileChecked(true);
          }
        }, 8000);

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        clearTimeout(timeoutId);

        const session = data?.session;
        console.log('🔐 [Auth] Session found:', !!session, session?.user?.email);
        
        if (!isMounted) return;

        if (session?.user) {
          setUser(session.user);
          // CRITICAL: Wait for profile check to complete before setting loading to false
          await checkUserProfile(session.user.id);
        } else {
          setUser(null);
          setUserProfile(null);
          setNeedsOnboarding(false);
          setProfileChecked(true);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ [Auth] Error loading Supabase session:', error);
        if (isMounted) {
          setUser(null);
          setUserProfile(null);
          setNeedsOnboarding(false);
          setProfileChecked(true);
        }
      } finally {
        if (isMounted && !skipAuth) {
          console.log('✅ [Auth] Setting loading to false');
          setLoading(false);
        }
      }
    };

    initializeSession();

    // Listen for auth changes (handles Resend magic links, email confirmations, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 [Auth] Auth state changed:', event, session?.user?.email);
      
      try {
        if (!isMounted) return;

        // Reset profile checked state when auth changes
        setProfileChecked(false);
        
        if (session?.user) {
          setUser(session.user);
          // CRITICAL: Wait for profile check to complete
          await checkUserProfile(session.user.id);
        } else {
          setUser(null);
          setUserProfile(null);
          setNeedsOnboarding(false);
          setProfileChecked(true);
        }
      } catch (error) {
        console.error('❌ [Auth] Error handling auth state change:', error);
        setProfileChecked(true);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [checkUserProfile]);

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const signup = async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata, // Store additional user metadata
        },
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Clear all auth-related state
      setUser(null);
      setUserProfile(null);
      setNeedsOnboarding(false);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear state even on error to ensure user is logged out locally
      setUser(null);
      setUserProfile(null);
      setNeedsOnboarding(false);
      return { success: false, error: error.message };
    }
  };

  const updateUser = async (updates) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates,
      });
      if (error) throw error;
      setUser(data.user);
      return { success: true, data };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: error.message };
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Update password error:', error);
      return { success: false, error: error.message };
    }
  };

  const updateEmail = async (newEmail) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail,
      });
      if (error) throw error;
      // Note: Supabase sends a confirmation email to both old and new addresses
      return { success: true, data, message: 'Confirmation email sent. Please check your inbox.' };
    } catch (error) {
      console.error('Update email error:', error);
      return { success: false, error: error.message };
    }
  };

  const completeOnboarding = async (profileData) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    setUserProfile(profileData);
    setNeedsOnboarding(false);
    
    // Refresh profile from database
    await checkUserProfile(user.id);
    
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      needsOnboarding,
      profileChecked, // Expose this so components can wait for profile check
      login, 
      signup, 
      logout, 
      updateUser,
      updatePassword,
      updateEmail,
      completeOnboarding, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

