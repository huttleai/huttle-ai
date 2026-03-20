import { createContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../config/supabase';

export const AuthContext = createContext();
const AUTH_STATE_CACHE_KEY = 'huttle-auth-state-cache';

function getOnboardingCompletionKey(userId) {
  return `has_completed_onboarding:${userId}`;
}

function serializeUserForCache(user) {
  if (!user?.id) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    name: user.name ?? user.user_metadata?.name ?? null,
    user_metadata: user.user_metadata ?? null,
  };
}

function readCachedAuthState() {
  try {
    const rawState = localStorage.getItem(AUTH_STATE_CACHE_KEY);
    return rawState ? JSON.parse(rawState) : null;
  } catch {
    return null;
  }
}

function writeCachedAuthState({ user, userProfile, needsOnboarding }) {
  const serializedUser = serializeUserForCache(user);
  if (!serializedUser) return;

  try {
    localStorage.setItem(AUTH_STATE_CACHE_KEY, JSON.stringify({
      user: serializedUser,
      userProfile: userProfile ?? null,
      needsOnboarding: Boolean(needsOnboarding),
      profileChecked: true,
      cachedAt: Date.now(),
    }));
  } catch {
    // Ignore cache write failures and rely on live auth state instead.
  }
}

function clearCachedAuthState() {
  try {
    localStorage.removeItem(AUTH_STATE_CACHE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function readCachedOnboardingCompletion(userId) {
  if (!userId) return false;

  try {
    return localStorage.getItem(getOnboardingCompletionKey(userId)) === 'true';
  } catch {
    return false;
  }
}

function writeCachedOnboardingCompletion(userId, hasCompletedOnboarding) {
  if (!userId) return;

  try {
    if (hasCompletedOnboarding) {
      localStorage.setItem(getOnboardingCompletionKey(userId), 'true');
      return;
    }

    localStorage.removeItem(getOnboardingCompletionKey(userId));
  } catch {
    // Ignore storage failures and rely on Supabase as the source of truth.
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const [sessionConfirmed, setSessionConfirmed] = useState(false);

  // Refs to track current state without stale closures in auth listener
  const currentUserIdRef = useRef(null);
  const profileCheckedRef = useRef(false);
  // Track whether initializeSession has completed to prevent onAuthStateChange
  // from prematurely setting loading = false during the INITIAL_SESSION race
  const initialLoadCompleteRef = useRef(false);

  const applyCachedAuthFallback = useCallback(() => {
    const cachedState = readCachedAuthState();
    if (!cachedState?.user?.id) {
      return false;
    }

    setUser(cachedState.user);
    setUserProfile(cachedState.userProfile ?? null);
    setNeedsOnboarding(Boolean(cachedState.needsOnboarding));
    setProfileChecked(cachedState.profileChecked !== false);
    profileCheckedRef.current = cachedState.profileChecked !== false;
    currentUserIdRef.current = cachedState.user.id;
    return true;
  }, []);

  // Memoized checkUserProfile to prevent recreation on every render
  // Includes timeout protection to prevent infinite loading if Supabase query hangs
  const checkUserProfile = useCallback(async (userId, currentUser = null) => {
    const hasCachedOnboardingCompletion = readCachedOnboardingCompletion(userId);
    const cachedUser = currentUser ?? { id: userId };

    // Allow extra time for Supabase cold start; only a few columns are selected.
    const QUERY_TIMEOUT_MS = 15000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Profile query timed out after ${QUERY_TIMEOUT_MS / 1000} seconds. This may indicate the user_profile table doesn't exist or RLS policies are misconfigured.`));
      }, QUERY_TIMEOUT_MS);
    });

    try {
      // Only select the columns AuthContext actually needs — avoids pulling all 30+ columns
      const queryPromise = supabase
        .from('user_profile')
        .select('user_id, has_completed_onboarding, profile_type, first_name')
        .eq('user_id', userId)
        .maybeSingle();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        if (hasCachedOnboardingCompletion) {
          console.warn('⚠️ [Auth] Profile lookup failed, using cached onboarding completion state.');
          setUserProfile(null);
          setNeedsOnboarding(false);
          setProfileChecked(true);
          profileCheckedRef.current = true;
          currentUserIdRef.current = userId;
          writeCachedAuthState({ user: cachedUser, userProfile: null, needsOnboarding: false });
          return;
        }

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
        currentUserIdRef.current = userId;
        writeCachedAuthState({ user: cachedUser, userProfile: null, needsOnboarding: true });
        return;
      }

      const hasCompletedOnboarding = data?.has_completed_onboarding === true;
      if (hasCompletedOnboarding) {
        writeCachedOnboardingCompletion(userId, true);
      }

      if (hasCompletedOnboarding || (!data && hasCachedOnboardingCompletion)) {
        setUserProfile(data || null);
        setNeedsOnboarding(false);
        writeCachedAuthState({ user: cachedUser, userProfile: data || null, needsOnboarding: false });
      } else {
        // Missing profile rows or incomplete profiles should always see onboarding.
        setUserProfile(data || null);
        setNeedsOnboarding(true);
        writeCachedAuthState({ user: cachedUser, userProfile: data || null, needsOnboarding: true });
      }
      setProfileChecked(true);
      profileCheckedRef.current = true;
      currentUserIdRef.current = userId;
    } catch (error) {
      if (hasCachedOnboardingCompletion) {
        // Expected on slow networks — cached onboarding keeps UX unblocked; avoid noisy errors.
        if (import.meta.env.DEV) {
          console.info('[Auth] Profile check slow; using cached onboarding state.');
        }
        setUserProfile(null);
        setNeedsOnboarding(false);
        setProfileChecked(true);
        profileCheckedRef.current = true;
        currentUserIdRef.current = userId;
        writeCachedAuthState({ user: cachedUser, userProfile: null, needsOnboarding: false });
        return;
      }

      const isTimeout = error.message?.includes('timed out');
      if (!isTimeout) {
        console.error(`❌ [Auth] Error in checkUserProfile:`, error.message);
      }

      if (isTimeout) {
        // Timeout likely means Supabase cold start, not a missing profile.
        // Let the user through with a degraded experience instead of blocking.
        if (import.meta.env.DEV) {
          console.info('[Auth] Profile check timed out; continuing with defaults (retry on next navigation).');
        }
        setUserProfile(null);
        setNeedsOnboarding(false);
        setProfileChecked(true);
        profileCheckedRef.current = true;
        currentUserIdRef.current = userId;
        writeCachedAuthState({ user: cachedUser, userProfile: null, needsOnboarding: false });
        return;
      }

      console.error('❌ [Auth] This may indicate:');
      console.error('   1. The user_profile table does not exist in Supabase');
      console.error('   2. RLS policies are blocking the query');
      console.error('   3. Network connectivity issues');
      console.error('❌ [Auth] Please run the SQL scripts in docs/setup/ in your Supabase SQL Editor');

      setUserProfile(null);
      setNeedsOnboarding(true);
      setProfileChecked(true);
      profileCheckedRef.current = true;
      currentUserIdRef.current = userId;
      writeCachedAuthState({ user: cachedUser, userProfile: null, needsOnboarding: true });
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
            setSessionConfirmed(true);
            setLoading(false);
          }
          return;
        }

        // Set a timeout to prevent infinite loading during slow Supabase cold starts
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn('⚠️ [Auth] Auth check timed out after 25 seconds. Falling back to cached auth state.');
            const usedCachedState = applyCachedAuthFallback();
            setLoading(false);
            setSessionConfirmed(false);
            if (!usedCachedState) {
              setUser(null);
              setUserProfile(null);
              setNeedsOnboarding(false);
              setProfileChecked(true);
              profileCheckedRef.current = true;
              currentUserIdRef.current = null;
            }
          }
        }, 25000);

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        clearTimeout(timeoutId);

        const session = data?.session;

        if (!isMounted) return;

        if (session?.user) {
          setUser(session.user);
          setSessionConfirmed(true);
          // CRITICAL: Wait for profile check to complete before setting loading to false
          await checkUserProfile(session.user.id, session.user);
        } else {
          setUser(null);
          setUserProfile(null);
          setNeedsOnboarding(false);
          setProfileChecked(true);
          setSessionConfirmed(true);
          profileCheckedRef.current = true;
          currentUserIdRef.current = null;
          clearCachedAuthState();
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ [Auth] Error loading Supabase session:', error);
        if (isMounted) {
          const usedCachedState = applyCachedAuthFallback();
          setSessionConfirmed(false);
          if (!usedCachedState) {
            setUser(null);
            setUserProfile(null);
            setNeedsOnboarding(false);
            setProfileChecked(true);
            profileCheckedRef.current = true;
            currentUserIdRef.current = null;
          }
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

        // TOKEN_REFRESHED, USER_UPDATED, and MFA events are internal Supabase
        // housekeeping — they do NOT change which user is logged in. Setting
        // state here would pass a new `user` object reference to every
        // downstream context (BrandContext, SubscriptionContext, etc.),
        // triggering full re-fetch cascades every ~55 minutes or on tab focus.
        if (
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED' ||
          event === 'MFA_CHALLENGE_VERIFIED'
        ) {
          return;
        }

        // Only reset profile state for actual auth changes (SIGNED_IN, SIGNED_OUT, etc.)
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          if (session?.user) {
            setUser(session.user);
            setSessionConfirmed(true);
            // Use refs for current values to avoid stale closure issues on tab switch
            const isSameUser = session.user.id === currentUserIdRef.current;
            const alreadyChecked = profileCheckedRef.current;
            
            // Only re-check profile if this is a NEW user or we haven't checked yet
            if (!alreadyChecked || !isSameUser) {
              setProfileChecked(false);
              profileCheckedRef.current = false;
              await checkUserProfile(session.user.id, session.user);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserProfile(null);
          setNeedsOnboarding(false);
          setProfileChecked(true);
          setSessionConfirmed(true);
          profileCheckedRef.current = false;
          currentUserIdRef.current = null;
          clearCachedAuthState();
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

  const completeOnboarding = async () => {
    if (!user) return { success: false, error: 'Not authenticated' };

    // Signal to GuidedTour that onboarding just completed — tour should trigger.
    // Use a user-scoped key so the tour only appears once per account.
    const tourSignalKey = user?.id ? `show_guided_tour:${user.id}` : 'show_guided_tour';
    localStorage.setItem(tourSignalKey, 'pending');
    writeCachedOnboardingCompletion(user.id, true);
    
    // First refresh the profile from database to get the complete data
    await checkUserProfile(user.id);

    // The profile refresh will clear the onboarding gate once the Supabase flag is true.
    // Set it eagerly as well so the dashboard can render immediately after submit.
    setNeedsOnboarding(false);

    return { success: true };
  };

  const value = useMemo(() => ({
    user,
    userProfile,
    needsOnboarding,
    sessionConfirmed,
    profileChecked,
    login,
    signup,
    logout,
    updateUser,
    updatePassword,
    updateEmail,
    completeOnboarding,
    loading,
  }), [user, userProfile, needsOnboarding, sessionConfirmed, profileChecked, login, signup, logout, updateUser, updatePassword, updateEmail, completeOnboarding, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

