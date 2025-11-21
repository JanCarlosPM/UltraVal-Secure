
-- Primero, vamos a verificar qué administradores existen y crear configuraciones de notificación
-- También vamos a insertar configuraciones para TODOS los usuarios como medida temporal

-- Verificar si existen perfiles de administradores
DO $$
BEGIN
  RAISE NOTICE 'Verificando administradores existentes...';
END
$$;

-- 1. Agregar restricción única a notification_settings
ALTER TABLE public.notification_settings 
ADD CONSTRAINT notification_settings_user_id_unique UNIQUE (user_id);

-- 2. Crear configuraciones de notificación para TODOS los usuarios autenticados
INSERT INTO public.notification_settings (user_id, email_notifications, high_priority_alerts, created_at, updated_at)
SELECT 
  p.id,
  CASE WHEN p.role = 'admin' OR p.role = 'supervisor_monitoreo' THEN true ELSE false END as email_notifications,
  CASE WHEN p.role = 'admin' OR p.role = 'supervisor_monitoreo' THEN true ELSE false END as high_priority_alerts,
  now() as created_at,
  now() as updated_at
FROM public.profiles p
WHERE p.email IS NOT NULL
AND LENGTH(TRIM(p.email)) > 0
ON CONFLICT (user_id) DO UPDATE SET
  email_notifications = CASE WHEN EXCLUDED.user_id IN (
    SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor_monitoreo')
  ) THEN true ELSE notification_settings.email_notifications END,
  high_priority_alerts = CASE WHEN EXCLUDED.user_id IN (
    SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor_monitoreo')  
  ) THEN true ELSE notification_settings.high_priority_alerts END,
  updated_at = now();

-- Si no hay registros, crear uno para el usuario actual (asumiendo que eres admin)
INSERT INTO public.notification_settings (user_id, email_notifications, high_priority_alerts, created_at, updated_at)
SELECT 
  auth.uid(),
  true,
  true,
  now(),
  now()
WHERE auth.uid() IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.notification_settings WHERE user_id = auth.uid())
ON CONFLICT (user_id) DO UPDATE SET
  email_notifications = true,
  high_priority_alerts = true,
  updated_at = now();

-- 3. Crear función auxiliar para verificar administradores con notificaciones habilitadas
CREATE OR REPLACE FUNCTION public.get_notification_admins()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  role text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role::text
  FROM public.profiles p
  INNER JOIN public.notification_settings ns ON p.id = ns.user_id
  WHERE (p.role = 'admin' OR p.role = 'supervisor_monitoreo')
    AND ns.email_notifications = true
    AND ns.high_priority_alerts = true
    AND p.email IS NOT NULL
    AND LENGTH(TRIM(p.email)) > 0;
$$;

-- 4. Crear función para enviar notificación automática al crear incidencia
CREATE OR REPLACE FUNCTION public.handle_new_incident_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo enviar notificación para incidencias de prioridad alta o crítica
  IF NEW.prioridad IN ('alta', 'critica') THEN
    -- Llamar a la función de Supabase Edge Function
    PERFORM net.http_post(
      url := 'https://wbuddpspfxufhftkcaww.supabase.co/functions/v1/send-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'incidencia_id', NEW.id::text,
        'titulo', NEW.titulo,
        'descripcion', NEW.descripcion,
        'prioridad', NEW.prioridad,
        'area_nombre', (SELECT nombre FROM public.areas WHERE id = NEW.area_id),
        'clasificacion_nombre', (SELECT nombre FROM public.clasificaciones WHERE id = NEW.clasificacion_id),
        'reportado_por', NEW.reportado_por
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Crear trigger para enviar notificación automática al crear incidencia
DROP TRIGGER IF EXISTS trigger_new_incident_notification ON public.incidencias;
CREATE TRIGGER trigger_new_incident_notification
  AFTER INSERT ON public.incidencias
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_incident_notification();
