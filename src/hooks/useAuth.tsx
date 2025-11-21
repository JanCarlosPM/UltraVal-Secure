
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isMonitor: boolean;
  isSupervisorMonitoreo: boolean;
  isRRHH: boolean;
  isSupervisorSalas: boolean;
  isFinanzas: boolean;
  isMantenimiento: boolean;
  isTecnico: boolean;
  isLector: boolean;
  isGestorSolicitudes: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithUsername: (username: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  validatePassword: (password: string) => { isValid: boolean; errors: string[] };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Simple audit functions without React hooks to avoid initialization issues
  const logLogin = async (email: string, role: string, details?: any) => {
    try {
      await supabase.rpc('log_user_action', {
        p_action_type: 'login',
        p_resource_type: 'auth',
        p_resource_id: null,
        p_details: {
          email,
          role,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          ...details
        }
      });
    } catch (error) {
      console.error('Error logging login:', error);
    }
  };

  const logLogout = async (email: string) => {
    try {
      await supabase.rpc('log_user_action', {
        p_action_type: 'logout',
        p_resource_type: 'auth',
        p_resource_id: null,
        p_details: {
          email,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent
        }
      });
    } catch (error) {
      console.error('Error logging logout:', error);
    }
  };

  const logAuthError = async (errorMessage: string, email: string) => {
    try {
      await supabase.rpc('log_user_action', {
        p_action_type: 'auth_error',
        p_resource_type: 'auth',
        p_resource_id: null,
        p_details: {
          error: errorMessage,
          email,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent
        }
      });
    } catch (error) {
      console.error('Error logging auth error:', error);
    }
  };

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      console.log('Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (!data) {
        console.warn('No profile found for user:', userId);
        return null;
      }

      console.log('Profile fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const handleAuthStateChange = (event: string, session: Session | null) => {
      if (!mounted) return;
      
      console.log('Auth state change:', event, session?.user?.id);
      
      // Update auth state immediately
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user && event !== 'TOKEN_REFRESHED') {
        // Fetch profile asynchronously without blocking
        fetchProfile(session.user.id).then(profileData => {
          if (mounted) {
            setProfile(profileData);
            
            // Log login asynchronously without blocking UI
            if (event === 'SIGNED_IN' && profileData) {
              setTimeout(() => {
                logLogin(profileData.email, profileData.role, {
                  userId: session.user.id,
                  authEvent: event,
                  sessionId: session.access_token.slice(-10)
                }).catch(console.error);
              }, 0);
            }
          }
        }).catch(error => {
          console.error('Error fetching profile:', error);
          if (mounted) {
            setProfile(null);
          }
        });
      } else {
        if (mounted) {
          setProfile(null);
        }
        
        // Log logout asynchronously
        if (event === 'SIGNED_OUT' && user?.email) {
          setTimeout(() => {
            logLogout(user.email).catch(console.error);
          }, 0);
        }
      }
      
      // Always set loading to false immediately
      if (mounted) {
        setLoading(false);
      }
    };

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setLoading(false);
          }
          return;
        }
        
        if (session) {
          handleAuthStateChange('INITIAL_SESSION', session);
        } else {
          if (mounted) {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Listen for auth changes first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Then initialize
    initializeAuth();

    // Shorter fallback timeout for better UX
    const fallbackTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth fallback timeout triggered');
        setLoading(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('La contraseña debe tener al menos 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Debe contener al menos una letra mayúscula');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Debe contener al menos una letra minúscula');
    }
    if (!/\d/.test(password)) {
      errors.push('Debe contener al menos un número');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Debe contener al menos un carácter especial');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        await logAuthError(error.message, email);
      }
      
      return { error };
    } catch (error: any) {
      await logAuthError(error?.message || 'Unknown error', email);
      return { error };
    }
  };

  const signInWithUsername = async (username: string, password: string) => {
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .or(`full_name.ilike.%${username}%,email.ilike.%${username}%`)
        .limit(1);

      if (profileError || !profiles || profiles.length === 0) {
        await logAuthError('Usuario no encontrado', username);
        return { error: { message: 'Usuario no encontrado' } };
      }

      const email = profiles[0].email;
      return await signIn(email, password);
    } catch (error: any) {
      await logAuthError(error?.message || 'Unknown error', username);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return { error: { message: passwordValidation.errors.join('. ') } };
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName
          }
        }
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (!error && profile) {
        setProfile({ ...profile, ...updates });
      }

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const isAdmin = profile?.role === 'admin';
  const isMonitor = profile?.role === 'monitor';
  const isSupervisorMonitoreo = profile?.role === 'supervisor_monitoreo';
  const isRRHH = profile?.role === 'rrhh';
  const isSupervisorSalas = profile?.role === 'supervisor_salas';
  const isFinanzas = profile?.role === 'finanzas';
  const isMantenimiento = profile?.role === 'mantenimiento';
  const isTecnico = profile?.role === 'tecnico';
  const isLector = profile?.role === 'lector';
  const isGestorSolicitudes = profile?.role === 'gestor_solicitudes';

  const value = {
    user,
    session,
    profile,
    loading,
    isAdmin,
    isMonitor,
    isSupervisorMonitoreo,
    isRRHH,
    isSupervisorSalas,
    isFinanzas,
    isMantenimiento,
    isTecnico,
    isLector,
    isGestorSolicitudes,
    signIn,
    signInWithUsername,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
    validatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
