import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { requestPermission, onMessageListener } from '@/utils/firebase';
import { toast } from 'sonner';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check if notifications are supported
    setIsSupported('Notification' in window && 'serviceWorker' in navigator);
    setPermission(Notification.permission);
  }, []);

  const requestNotificationPermission = async () => {
    if (!isSupported) {
      toast.error('Las notificaciones no están soportadas en este dispositivo');
      return false;
    }

    try {
      const fcmToken = await requestPermission();
      
      if (fcmToken) {
        setToken(fcmToken);
        setPermission('granted');
        
        // Save token to database
        if (user) {
          await saveFCMToken(fcmToken);
        }
        
        toast.success('Notificaciones activadas correctamente');
        return true;
      } else {
        setPermission('denied');
        toast.error('Permisos de notificación denegados');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Error al solicitar permisos de notificación');
      return false;
    }
  };

  const saveFCMToken = async (fcmToken: string) => {
    if (!user) return;

    try {
      // Use direct database query until types are updated
      const { error: deleteError } = await supabase
        .from('fcm_tokens')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.warn('Error deleting existing tokens:', deleteError);
      }

      // Insert new token
      const { error } = await supabase
        .from('fcm_tokens')
        .insert({
          user_id: user.id,
          token: fcmToken,
          device_type: getDeviceType(),
        });

      if (error) {
        console.error('Error saving FCM token:', error);
        throw error;
      }

      console.log('FCM token saved successfully');
    } catch (error) {
      console.error('Error saving FCM token:', error);
      toast.error('Error al guardar el token de notificaciones');
    }
  };

  const getDeviceType = (): string => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad/.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  };

  useEffect(() => {
    if (permission === 'granted' && token && user) {
      // Listen for foreground messages
      onMessageListener()
        .then((payload: any) => {
          console.log('Received foreground message:', payload);
          
          // Show toast notification for foreground messages
          if (payload.notification) {
            toast.info(payload.notification.title, {
              description: payload.notification.body,
              action: {
                label: 'Ver',
                onClick: () => {
                  if (payload.data?.type === 'chat_message') {
                    // Navigate to chat
                    window.location.hash = '#/dashboard?tab=chat';
                  }
                },
              },
            });
          }
        })
        .catch((error) => {
          console.error('Error listening for messages:', error);
        });
    }
  }, [permission, token, user]);

  useEffect(() => {
    // Auto-request permission for existing users
    if (user && permission === 'default' && isSupported) {
      // Show a subtle prompt first
      toast.info('¿Quieres recibir notificaciones de nuevos mensajes?', {
        action: {
          label: 'Activar',
          onClick: requestNotificationPermission,
        },
        duration: 10000,
      });
    }
  }, [user, permission, isSupported]);

  return {
    isSupported,
    permission,
    token,
    requestNotificationPermission,
  };
};