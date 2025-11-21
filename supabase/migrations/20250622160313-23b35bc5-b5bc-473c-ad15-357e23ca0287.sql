
-- Actualizar las políticas RLS para permitir que los monitores creen incidencias
DROP POLICY IF EXISTS "Monitores pueden crear incidencias" ON public.incidencias;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear incidencias" ON public.incidencias;

-- Crear política que permite tanto a monitores como administradores crear incidencias
CREATE POLICY "Monitores y admins pueden crear incidencias"
  ON public.incidencias FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'monitor') OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Asegurar que las políticas para imagenes_incidencias también permitan a monitores
DROP POLICY IF EXISTS "Usuarios pueden crear imagenes de incidencias" ON public.imagenes_incidencias;

CREATE POLICY "Monitores y admins pueden crear imagenes de incidencias"
  ON public.imagenes_incidencias FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'monitor') OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Habilitar RLS en imagenes_incidencias si no está habilitado
ALTER TABLE public.imagenes_incidencias ENABLE ROW LEVEL SECURITY;

-- Crear tabla para configuración de notificaciones si no existe
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications boolean DEFAULT true,
  high_priority_alerts boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS en notification_settings
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan ver y actualizar sus propias configuraciones
CREATE POLICY "Users can manage their notification settings"
  ON public.notification_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
