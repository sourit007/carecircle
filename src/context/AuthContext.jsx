import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [member, setMember] = useState(null);
  const [circle, setCircle] = useState(null);
  const [elderName, setElderName] = useState('the Elder');
  const [loading, setLoading] = useState(true);
  const [circleLoading, setCircleLoading] = useState(false);
  
  // Elder text size preference: 'large' (default for elders) or 'standard'
  const [elderTextSize, setElderTextSize] = useState(() => {
    try {
      return localStorage.getItem('circlecare_elder_text_size') || 'large';
    } catch {
      return 'large';
    }
  });

  const toggleElderTextSize = () => {
    setElderTextSize((prev) => {
      const next = prev === 'large' ? 'standard' : 'large';
      try {
        localStorage.setItem('circlecare_elder_text_size', next);
      } catch {}
      return next;
    });
  };

  // Fetch circle and membership info for the current user
  const fetchUserCircle = useCallback(async (userId) => {
    if (!userId) {
      setMember(null);
      setCircle(null);
      return null;
    }

    setCircleLoading(true);
    try {
      // 1. Fetch memberships for this user
      const { data: memberRows, error: memberErr } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', userId)
        .order('id', { ascending: true });

      if (memberErr) {
        console.error('Error fetching member records:', memberErr);
        throw memberErr;
      }

      if (!memberRows || memberRows.length === 0) {
        setMember(null);
        setCircle(null);
        return null;
      }

      // First membership as requested
      const activeMember = memberRows[0];
      setMember(activeMember);

      // 2. Fetch the corresponding circle details
      const { data: circleData, error: circleErr } = await supabase
        .from('circles')
        .select('*')
        .eq('id', activeMember.circle_id)
        .single();

      if (circleErr) {
        console.error('Error fetching circle details:', circleErr);
        throw circleErr;
      }

      setCircle(circleData);

      // Fetch the elder's display name for friendly notifications
      const { data: elderData } = await supabase
        .from('members')
        .select('display_name')
        .eq('circle_id', activeMember.circle_id)
        .eq('role', 'elder')
        .maybeSingle();

      if (elderData?.display_name) {
        setElderName(elderData.display_name);
      } else {
        setElderName('the Elder');
      }

      return { member: activeMember, circle: circleData };
    } catch (err) {
      console.error('Failed to load circle data:', err);
      return null;
    } finally {
      setCircleLoading(false);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchUserCircle(session.user.id);
          }
        }
      } catch (err) {
        console.error('Unexpected auth initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchUserCircle(newSession.user.id);
      } else {
        setMember(null);
        setCircle(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [fetchUserCircle]);

  // Synchronize Elder Mode styling on document body
  // Only elders who choose 'large' size get elderMode; caretaker and family are always standard size
  const isElder = member?.role === 'elder';
  const elderMode = isElder && elderTextSize === 'large';

  useEffect(() => {
    if (elderMode) {
      document.documentElement.classList.add('elder-mode');
    } else {
      document.documentElement.classList.remove('elder-mode');
    }
  }, [elderMode]);

  // Sign In with email & password
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data?.user) {
      await fetchUserCircle(data.user.id);
    }
    return data;
  };

  // Sign In with Google OAuth
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  };

  // Sign Up with email & password
  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  // Sign Out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setMember(null);
    setCircle(null);
    if (error) throw error;
  };

  // Create a new care circle via RPC
  const createCircle = async ({ name, displayName, role }) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const { data, error } = await supabase.rpc('create_circle', {
      p_name: name.trim(),
      p_display_name: displayName.trim(),
      p_role: role,
      p_timezone: timezone,
    });

    if (error) throw error;

    // Refresh circle state
    if (user?.id) {
      await fetchUserCircle(user.id);
    }
    return data;
  };

  // Join existing circle with passcode via RPC
  const joinCircle = async ({ passcode, displayName, role }) => {
    const { data, error } = await supabase.rpc('join_circle', {
      p_passcode: passcode.trim(),
      p_role: role,
      p_display_name: displayName.trim(),
    });

    if (error) throw error;

    // Refresh circle state
    if (user?.id) {
      await fetchUserCircle(user.id);
    }
    return data;
  };

  const refreshCircle = useCallback(async () => {
    if (user?.id) {
      return await fetchUserCircle(user.id);
    }
    return null;
  }, [user?.id, fetchUserCircle]);

  const value = {
    user,
    session,
    member,
    circle,
    elderName,
    isElder,
    elderMode,
    elderTextSize,
    toggleElderTextSize,
    loading,
    circleLoading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    createCircle,
    joinCircle,
    refreshCircle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

