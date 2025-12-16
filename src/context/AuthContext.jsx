import { createContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    // Development bypass: Only allow via explicit environment variable in development
    // SECURITY: Removed localStorage-based bypass to prevent client-side manipulation
    const skipAuth = import.meta.env.DEV === true && import.meta.env.VITE_SKIP_AUTH === 'true';

    const initializeSession = async () => {
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
            setLoading(false);
          }
          return;
        }

        // Set a timeout to prevent infinite loading (5 seconds)
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn('⚠️ Auth check timed out after 5 seconds. Proceeding without session.');
            setLoading(false);
            setUser(null);
            setUserProfile(null);
            setNeedsOnboarding(false);
          }
        }, 5000);

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        clearTimeout(timeoutId);

        const session = data?.session;
        if (!isMounted) return;

        setUser(session?.user ?? null);

        if (session?.user) {
          await checkUserProfile(session.user.id);
        } else {
          setUserProfile(null);
          setNeedsOnboarding(false);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error loading Supabase session:', error);
        if (isMounted) {
          setUser(null);
          setUserProfile(null);
          setNeedsOnboarding(false);
        }
      } finally {
        if (isMounted && !skipAuth) {
          setLoading(false);
        }
      }
    };

    initializeSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (!isMounted) return;

        setUser(session?.user ?? null);
        
        if (session?.user) {
          await checkUserProfile(session.user.id);
        } else {
          setUserProfile(null);
          setNeedsOnboarding(false);
        }
      } catch (error) {
        console.error('Error handling auth state change:', error);
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
  }, []);

  const checkUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profile')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected for new users
        console.error('Error checking user profile:', error);
      }

      if (data) {
        setUserProfile(data);
        setNeedsOnboarding(!data.quiz_completed_at);
      } else {
        setUserProfile(null);
        setNeedsOnboarding(true);
      }
    } catch (error) {
      console.error('Error in checkUserProfile:', error);
      setNeedsOnboarding(true);
    }
  };

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
      setUser(null);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
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

