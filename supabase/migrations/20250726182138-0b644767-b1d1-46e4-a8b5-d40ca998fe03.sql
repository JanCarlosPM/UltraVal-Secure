
-- Primero, verificamos y creamos configuraciones por defecto para los administradores
-- Si no existe configuración, la creamos con notificaciones habilitadas por defecto

-- Insertar configuraciones por defecto para todos los administradores que no tengan configuración
INSERT INTO public.notification_settings (user_id, email_notifications, high_priority_alerts)
SELECT 
  p.id,
  true as email_notifications,
  true as high_priority_alerts
FROM public.profiles p
WHERE p.role = 'admin'
AND NOT EXISTS (
  SELECT 1 FROM public.notification_settings ns 
  WHERE ns.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Actualizar configuraciones existentes para asegurar que los admins tengan notificaciones activas
UPDATE public.notification_settings 
SET 
  email_notifications = true,
  high_priority_alerts = true,
  updated_at = now()
WHERE user_id IN (
  SELECT id FROM public.profiles WHERE role = 'admin'
)
AND (email_notifications = false OR high_priority_alerts = false);

-- Crear una vista para facilitar consultas de administradores con notificaciones
CREATE OR REPLACE VIEW public.admin_notifications AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  COALESCE(ns.email_notifications, true) as email_notifications,
  COALESCE(ns.high_priority_alerts, true) as high_priority_alerts,
  CASE 
    WHEN p.email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' 
    THEN true 
    ELSE false 
  END as has_valid_email
FROM public.profiles p
LEFT JOIN public.notification_settings ns ON p.id = ns.user_id
WHERE p.role = 'admin';

-- Función para obtener administradores activos para notificaciones
CREATE OR REPLACE FUNCTION public.get_notification_admins()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text
) 
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    an.id,
    an.email,
    an.full_name
  FROM public.admin_notifications an
  WHERE an.email_notifications = true
    AND an.high_priority_alerts = true
    AND an.has_valid_email = true
    AND an.email IS NOT NULL
    AND LENGTH(TRIM(an.email)) > 0;
$$;
