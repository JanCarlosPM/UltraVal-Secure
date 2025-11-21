-- Agregar nuevos campos a la tabla solicitudes
ALTER TABLE public.solicitudes 
ADD COLUMN IF NOT EXISTS progreso_ejecucion TEXT,
ADD COLUMN IF NOT EXISTS fecha_inicio_ejecucion TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS horas_transcurridas DECIMAL(10,2) DEFAULT 0;

-- Función para calcular horas transcurridas desde el inicio hasta el cierre
CREATE OR REPLACE FUNCTION public.calcular_horas_solicitud(p_solicitud_id uuid)
RETURNS DECIMAL(10,2)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN estado = 'cerrada' AND fecha_inicio_ejecucion IS NOT NULL AND fecha_cierre IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (fecha_cierre - fecha_inicio_ejecucion))::DECIMAL / 3600
      WHEN estado IN ('aceptada', 'en_ejecucion') AND fecha_inicio_ejecucion IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (NOW() - fecha_inicio_ejecucion))::DECIMAL / 3600
      ELSE 0
    END
  FROM public.solicitudes 
  WHERE id = p_solicitud_id;
$$;

-- Crear tabla para mapear usuarios con áreas (si no existe)
CREATE TABLE IF NOT EXISTS public.user_area_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, area_id)
);

-- Habilitar RLS en user_area_assignments
ALTER TABLE public.user_area_assignments ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios puedan ver sus propias asignaciones
CREATE POLICY "Usuarios pueden ver sus asignaciones de área" 
ON public.user_area_assignments 
FOR SELECT 
USING (auth.uid() = user_id);

-- Política para que admins puedan gestionar asignaciones
CREATE POLICY "Solo administradores pueden gestionar asignaciones de área" 
ON public.user_area_assignments 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));