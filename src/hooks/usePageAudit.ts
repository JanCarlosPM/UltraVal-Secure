
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PageAuditDetails {
  activeTab?: string;
  userRole?: string;
  dashboardFeatures?: Record<string, boolean>;
  reportFilters?: Record<string, any>;
  [key: string]: any;
}

interface AuthAuditDetails {
  userId?: string;
  authEvent?: string;
  sessionId?: string;
  profileNotFound?: boolean;
  error?: string;
  [key: string]: any;
}

export const usePageAudit = () => {
  const auditCache = useRef<Set<string>>(new Set());
  const lastAuditTime = useRef<number>(0);
  const AUDIT_COOLDOWN = 5000; // 5 seconds

  const shouldSkipAudit = useCallback((key: string) => {
    const now = Date.now();
    if (now - lastAuditTime.current < AUDIT_COOLDOWN) {
      return true;
    }
    
    if (auditCache.current.has(key)) {
      return true;
    }
    
    auditCache.current.add(key);
    lastAuditTime.current = now;
    
    // Clean cache after 1 minute
    setTimeout(() => {
      auditCache.current.delete(key);
    }, 60000);
    
    return false;
  }, []);

  const logPageView = useCallback(async (page: string, details?: PageAuditDetails) => {
    try {
      const cacheKey = `page_view_${page}_${JSON.stringify(details)}`;
      if (shouldSkipAudit(cacheKey)) {
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.rpc('log_user_action', {
        p_action_type: 'page_view',
        p_resource_type: 'page',
        p_resource_id: null,
        p_details: {
          page,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          ...details
        }
      });
    } catch (error) {
      console.error('Error logging page view:', error);
    }
  }, [shouldSkipAudit]);

  return { logPageView };
};

export const useAuthAudit = () => {
  const auditCache = useRef<Set<string>>(new Set());
  const lastAuditTime = useRef<number>(0);
  const AUDIT_COOLDOWN = 2000; // 2 seconds for auth events

  const shouldSkipAudit = useCallback((key: string) => {
    const now = Date.now();
    if (now - lastAuditTime.current < AUDIT_COOLDOWN) {
      return true;
    }
    
    if (auditCache.current.has(key)) {
      return true;
    }
    
    auditCache.current.add(key);
    lastAuditTime.current = now;
    
    setTimeout(() => {
      auditCache.current.delete(key);
    }, 30000);
    
    return false;
  }, []);

  const logLogin = useCallback(async (email: string, role: string, details?: AuthAuditDetails) => {
    try {
      const cacheKey = `login_${email}_${details?.sessionId || 'no_session'}`;
      if (shouldSkipAudit(cacheKey)) {
        return;
      }

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
  }, [shouldSkipAudit]);

  const logLogout = useCallback(async (email: string) => {
    try {
      const cacheKey = `logout_${email}_${Date.now()}`;
      if (shouldSkipAudit(cacheKey)) {
        return;
      }

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
  }, [shouldSkipAudit]);

  const logAuthError = useCallback(async (errorMessage: string, email: string) => {
    try {
      const cacheKey = `auth_error_${email}_${errorMessage}`;
      if (shouldSkipAudit(cacheKey)) {
        return;
      }

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
  }, [shouldSkipAudit]);

  return { logLogin, logLogout, logAuthError };
};
