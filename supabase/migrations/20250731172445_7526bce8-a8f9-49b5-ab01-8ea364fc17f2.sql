-- Eliminar la política problemática que permite ver todas las solicitudes
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver todas las solicitudes" ON public.solicitudes;

-- Crear nueva política que restringe el acceso por área
CREATE POLICY "Usuarios pueden ver solicitudes de sus áreas asignadas" 
ON public.solicitudes 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR 
  user_has_area_access(auth.uid(), area_id)
);