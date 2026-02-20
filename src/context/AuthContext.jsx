import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  // Refs to track current state without stale closures in auth listener
  const currentUserIdRef = useRef(null);
  const profileCheckedRef = useRef(false);
  // Track whether initializeSession has completed to prevent onAuthStateChange
  // from prematurely setting loading = false during the INITIAL_SESSION race
  const initialLoadCompleteRef = useRef(false);

  // Memoized checkUserProfile to prevent recreation on every render
  // Includes timeout protection to prevent infinite loading if Supabase query hangs
  const checkUserProfile = useCallback(async (userId) => {
    // Create a timeout promise to prevent hanging queries
    const QUERY_TIMEOUT_MS = 10000; // 10 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Profile query timed out after ${QUERY_TIMEOUT_MS / 1000} seconds. This may indicate the user_profile table doesn't exist or RLS policies are misconfigured.`));
      }, QUERY_TIMEOUT_MS);
    });

    try {
      // Race between the actual query and the timeout
      const queryPromise = supabase
        .from('user_profile')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle() instead of single() for new users

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        console.error('❌ [Auth] Error checking user profile:', error);
        console.error('❌ [Auth] Error details:', {
          code: error.code,
          message: error.message,
          hint: error.hint,
          details: error.details
        });
        
        // Check for specific error codes that indicate table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.error('❌ [Auth] The user_profile table does not exist! Please run the SQL schema in Supabase.');
          console.error('❌ [Auth] Run: docs/setup/supabase-user-profile-schema.sql');
        }
        
        // On error, assume user needs onboarding to be safe
        setUserProfile(null);
        setNeedsOnboarding(true);
        setProfileChecked(true);
        profileCheckedRef.current = true;
        return;
      }

      if (data && data.quiz_completed_at) {
        // User has completed onboarding
        setUserProfile(data);
        setNeedsOnboarding(false);
      } else {
        // User exists but hasn't completed quiz, OR no profile exists
        // Either way, they need onboarding
        setUserProfile(data || null);
        setNeedsOnboarding(true);
      }
      setProfileChecked(true);
      profileCheckedRef.current = true;
      currentUserIdRef.current = userId;
    } catch (error) {
      console.error('❌ [Auth] Error in checkUserProfile:', error);
      console.error('❌ [Auth] This may indicate:');
      console.error('   1. The user_profile table does not exist in Supabase');
      console.error('   2. RLS policies are blocking the query');
      console.error('   3. Network connectivity issues');
      console.error('❌ [Auth] Please run the SQL scripts in docs/setup/ in your Supabase SQL Editor');
      
      // On error, force onboarding to be safe
      setUserProfile(null);
      setNeedsOnboarding(true);
      setProfileChecked(true);
      profileCheckedRef.current = true;
    }
  }, []);

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
            name: 'Sean'
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
          setLoading(false);
        }
        // Mark initial load as complete so onAuthStateChange can set loading for subsequent events
        initialLoadCompleteRef.current = true;
      }
    };

    initializeSession();

    // Listen for auth changes (handles Resend magic links, email confirmations, etc.)
    // Skip auth listener if in dev mode with VITE_SKIP_AUTH
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // If skip auth is enabled, ignore auth state changes to maintain mock user
      if (skipAuth) {
        return;
      }
      
      try {
        if (!isMounted) return;

        // TOKEN_REFRESHED events should NOT reset state or re-check profile
        // This prevents users from being kicked to onboarding when switching tabs
        if (event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setUser(session.user);
          }
          return;
        }

        // Only reset profile state for actual auth changes (SIGNED_IN, SIGNED_OUT, etc.)
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          if (session?.user) {
            setUser(session.user);
            // Use refs for current values to avoid stale closure issues on tab switch
            const isSameUser = session.user.id === currentUserIdRef.current;
            const alreadyChecked = profileCheckedRef.current;
            
            // Only re-check profile if this is a NEW user or we haven't checked yet
            if (!alreadyChecked || !isSameUser) {
              setProfileChecked(false);
              profileCheckedRef.current = false;
              await checkUserProfile(session.user.id);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserProfile(null);
          setNeedsOnboarding(false);
          setProfileChecked(true);
          profileCheckedRef.current = false;
          currentUserIdRef.current = null;
        }
      } catch (error) {
        console.error('❌ [Auth] Error handling auth state change:', error);
        setProfileChecked(true);
      } finally {
        // Only set loading = false for events AFTER the initial session setup.
        // INITIAL_SESSION races with initializeSession() — let initializeSession
        // handle the initial loading state to prevent premature redirect to login.
        if (isMounted && event !== 'INITIAL_SESSION') {
          setLoading(false);
        }
        // If initializeSession already completed but INITIAL_SESSION arrived late,
        // it's safe to set loading false
        if (isMounted && event === 'INITIAL_SESSION' && initialLoadCompleteRef.current) {
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
      // Preserve the full error so callers can inspect code/status/reasons
      return {
        success: false,
        error: error.message,
        code: error?.code,
        status: error?.status,
      };
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

    // Signal to GuidedTour that onboarding just completed — tour should trigger.
    // Use a user-scoped key so the tour only appears once per account.
    const tourSignalKey = user?.id ? `show_guided_tour:${user.id}` : 'show_guided_tour';
    localStorage.setItem(tourSignalKey, 'pending');
    
    // First refresh the profile from database to get the complete data
    await checkUserProfile(user.id);
    
    // The checkUserProfile will set needsOnboarding to false if quiz_completed_at is set
    // But we also set it explicitly here for immediate UI update
    setNeedsOnboarding(false);

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

