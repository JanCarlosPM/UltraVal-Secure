-- Corregir políticas RLS para solicitudes - simplificar verificación de roles

-- Eliminar políticas problemáticas
DROP POLICY IF EXISTS "Usuarios pueden crear solicitudes" ON public.solicitudes;

-- Crear política simplificada para INSERT que funcione correctamente
CREATE POLICY "Usuarios pueden crear solicitudes"
ON public.solicitudes
FOR INSERT
WITH CHECK (
  auth.uid() = solicitante_id AND
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR
    has_role(auth.uid(), 'rrhh'::app_role) OR
    has_role(auth.uid(), 'supervisor_salas'::app_role) OR
    has_role(auth.uid(), 'finanzas'::app_role) OR
    has_role(auth.uid(), 'monitor'::app_role)
  )
);