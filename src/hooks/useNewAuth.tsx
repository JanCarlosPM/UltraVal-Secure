import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuthAudit } from './usePageAudit';

interface NewProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  rol_general_id: string | null;
  area_id: string | null;
  created_at: string;
  updated_at: string;
  // Datos expandidos del rol y departamento
  rol_general?: {
    id: string;
    nombre: string;
    descripcion: string;
    nivel_jerarquia: number;
  } | null;
  area?: {
    id: string;
    nombre: string;
    descripcion: string;
  } | null;
}

interface NewAuthContextType {
  user: User | null;
  session: Session | null;
  profile: NewProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  isEmpleado: boolean;
  isLector: boolean;
  tienePermiso: (moduloCodigo: string, accionCodigo: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithUsername: (username: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<NewProfile>) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  validatePassword: (password: string) => { isValid: boolean; errors: string[] };
}

const NewAuthContext = createContext<NewAuthContextType | undefined>(undefined);

export const useNewAuth = () => {
  const context = useContext(NewAuthContext);
  if (context === undefined) {
    throw new Error('useNewAuth must be used within a NewAuthProvider');
  }
  return context;
};

interface NewAuthProviderProps {
  children: ReactNode;
}

export const NewAuthProvider = ({ children }: NewAuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<NewProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { logLogin, logLogout, logAuthError } = useAuthAudit();

  const fetchProfile = async (userId: string): Promise<NewProfile | null> => {
    try {
      console.log('Fetching new profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          rol_general:roles_generales(id, nombre, descripcion, nivel_jerarquia),
          area:areas(id, nombre, descripcion)
        `)
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching new profile:', error);
        return null;
      }

      if (!data) {
        console.warn('No new profile found for user:', userId);
        return null;
      }

      console.log('New profile fetched successfully:', data);
      
      return data as any;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  const tienePermiso = async (moduloCodigo: string, accionCodigo: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .rpc('usuario_tiene_permiso', {
          _user_id: user.id,
          _modulo_codigo: moduloCodigo,
          _accion_codigo: accionCodigo
        });

      if (error) {
        console.error('Error checking permission:', error);
        return false;
      }

      return data || false;
    } catch (err: any) {
      console.error('Error checking permission:', err);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const handleAuthStateChange = (event: string, session: Session | null) => {
      if (!mounted) return;
      
      console.log('New Auth state change:', event, session?.user?.id);
      
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
                logLogin(profileData.email, profileData.rol_general?.nombre || 'unknown', {
                  userId: session.user.id,
                  authEvent: event,
                  sessionId: session.access_token.slice(-10)
                }).catch(console.error);
              }, 0);
            }
          }
        }).catch(error => {
          console.error('Error fetching new profile:', error);
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
        console.warn('New Auth fallback timeout triggered');
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

  const updateProfile = async (updates: Partial<NewProfile>) => {
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

  // Computed role properties based on new system
  const isAdmin = profile?.rol_general?.nombre === 'administrador';
  const isSupervisor = profile?.rol_general?.nombre === 'supervisor';
  const isEmpleado = profile?.rol_general?.nombre === 'empleado';
  const isLector = profile?.rol_general?.nombre === 'lector';

  const value = {
    user,
    session,
    profile,
    loading,
    isAdmin,
    isSupervisor,
    isEmpleado,
    isLector,
    tienePermiso,
    signIn,
    signInWithUsername,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
    validatePassword,
  };

  return <NewAuthContext.Provider value={value}>{children}</NewAuthContext.Provider>;
};