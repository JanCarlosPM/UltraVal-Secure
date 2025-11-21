
import { supabase } from "@/integrations/supabase/client";

export const useAuditLog = () => {
  const getClientIP = async (): Promise<string> => {
    // Usar múltiples servicios para obtener la IP, con fallback más robusto
    const ipServices = [
      'https://httpbin.org/ip',
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://ip.seeip.org/jsonip'
    ];

    for (const service of ipServices) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // Reducir timeout
        
        const response = await fetch(service, { 
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          const ip = data.ip || data.IPv4 || data.query || data.origin;
          if (ip) {
            console.log(`IP obtenida desde ${service}: ${ip}`);
            return ip;
          }
        }
      } catch (error) {
        console.warn(`Fallo al obtener IP desde ${service}:`, error);
        continue;
      }
    }
    
    // Si no se puede obtener IP, usar un identificador único por sesión
    const sessionIP = sessionStorage.getItem('session_ip') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('session_ip', sessionIP);
    return sessionIP;
  };

  const getEnhancedUserAgent = (): string => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform || 'Unknown';
    const language = navigator.language || 'Unknown';
    const cookieEnabled = navigator.cookieEnabled;
    const screenResolution = `${screen.width}x${screen.height}`;
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = isMobile ? 'mobile' : 'desktop';
    
    return JSON.stringify({
      userAgent,
      platform,
      language,
      cookieEnabled,
      screenResolution,
      deviceType,
      timestamp: new Date().toISOString()
    });
  };

  const logAction = async (
    actionType: string,
    resourceType?: string,
    resourceId?: string,
    details?: any
  ) => {
    try {
      // Obtener información del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('No hay usuario autenticado para logging');
        return null;
      }

      console.log(`Iniciando logging de acción: ${actionType} para usuario: ${user.email}`);

      // Obtener información del navegador
      const userAgent = getEnhancedUserAgent();
      
      // Obtener IP de forma asíncrona pero no bloquear el logging
      let ipAddress = 'unknown';
      try {
        ipAddress = await getClientIP();
      } catch (error) {
        console.warn('Error obteniendo IP, usando fallback:', error);
      }

      // Enriquecer los detalles con información adicional
      const enrichedDetails = {
        ...details,
        userEmail: user.email,
        userId: user.id,
        sessionTimestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        referrer: document.referrer || 'direct',
        url: window.location.href,
        deviceInfo: {
          isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
          isTablet: /iPad/i.test(navigator.userAgent),
          screen: {
            width: screen.width,
            height: screen.height,
            colorDepth: screen.colorDepth
          }
        }
      };

      console.log('Enviando datos de auditoría:', {
        actionType,
        resourceType,
        resourceId,
        userEmail: user.email,
        ipAddress
      });

      const { data, error } = await supabase.rpc('log_user_action', {
        p_action_type: actionType,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_details: JSON.stringify(enrichedDetails),
        p_ip_address: ipAddress,
        p_user_agent: userAgent
      });

      if (error) {
        console.error('Error en logging principal:', error);
        // Fallback más simple
        try {
          const fallbackData = await supabase.rpc('log_user_action', {
            p_action_type: `fallback_${actionType}`,
            p_resource_type: resourceType || 'unknown',
            p_resource_id: resourceId || null,
            p_details: JSON.stringify({ 
              error: 'fallback_log', 
              timestamp: new Date().toISOString(),
              userEmail: user.email,
              originalError: error.message
            }),
            p_ip_address: ipAddress,
            p_user_agent: JSON.stringify({ basic: navigator.userAgent })
          });
          console.log('Fallback logging exitoso:', fallbackData);
        } catch (fallbackError) {
          console.error('Fallback logging también falló:', fallbackError);
        }
        return null;
      }

      console.log(`Acción registrada exitosamente: ${actionType} para ${user.email}`);
      return data;
    } catch (error) {
      console.error('Error crítico en audit log:', error);
      return null;
    }
  };

  return { logAction, getClientIP };
};
