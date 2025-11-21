
-- Verificar administradores existentes y crear sus configuraciones de notificación
INSERT INTO public.notification_settings (user_id, email_notifications, high_priority_alerts, created_at, updated_at)
SELECT 
  p.id,
  true as email_notifications,
  true as high_priority_alerts,
  now() as created_at,
  now() as updated_at
FROM public.profiles p
WHERE p.role = 'admin'
AND p.email IS NOT NULL
AND LENGTH(TRIM(p.email)) > 0
ON CONFLICT (user_id) DO UPDATE SET
  email_notifications = true,
  high_priority_alerts = true,
  updated_at = now();

-- También crear configuraciones para supervisores de monitoreo si queremos que reciban notificaciones
INSERT INTO public.notification_settings (user_id, email_notifications, high_priority_alerts, created_at, updated_at)
SELECT 
  p.id,
  true as email_notifications,
  true as high_priority_alerts,
  now() as created_at,
  now() as updated_at
FROM public.profiles p
WHERE p.role = 'supervisor_monitoreo'
AND p.email IS NOT NULL
AND LENGTH(TRIM(p.email)) > 0
ON CONFLICT (user_id) DO UPDATE SET
  email_notifications = true,
  high_priority_alerts = true,
  updated_at = now();
