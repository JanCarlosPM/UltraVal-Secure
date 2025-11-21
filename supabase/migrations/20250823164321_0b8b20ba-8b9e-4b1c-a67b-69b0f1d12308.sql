-- Crear tabla para imágenes de solicitudes
CREATE TABLE public.imagenes_solicitudes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitud_id uuid NOT NULL,
  url_imagen text NOT NULL,
  nombre_archivo character varying NOT NULL,
  tipo_archivo character varying,
  tamaño_bytes integer,
  descripcion text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (solicitud_id) REFERENCES public.solicitudes(id) ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE public.imagenes_solicitudes ENABLE ROW LEVEL SECURITY;

-- Política para ver imágenes de solicitudes - usuarios autenticados con roles específicos
CREATE POLICY "usuarios_pueden_ver_imagenes_solicitudes" 
ON public.imagenes_solicitudes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::app_role, 'supervisor_monitoreo'::app_role, 'rrhh'::app_role, 'supervisor_salas'::app_role, 'finanzas'::app_role, 'monitor'::app_role, 'gestor_solicitudes'::app_role])
  )
);

-- Política para crear imágenes de solicitudes - usuarios autenticados con roles específicos
CREATE POLICY "usuarios_pueden_crear_imagenes_solicitudes" 
ON public.imagenes_solicitudes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::app_role, 'supervisor_monitoreo'::app_role, 'rrhh'::app_role, 'supervisor_salas'::app_role, 'finanzas'::app_role, 'monitor'::app_role, 'gestor_solicitudes'::app_role])
  )
);

-- Política para eliminar imágenes de solicitudes - solo administradores
CREATE POLICY "admin_puede_eliminar_imagenes_solicitudes" 
ON public.imagenes_solicitudes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'::app_role
  )
);