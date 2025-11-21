-- Corregir política de INSERT para permitir a usuarios con roles específicos crear solicitudes
DROP POLICY IF EXISTS "Todos pueden crear solicitudes" ON public.solicitudes;

-- Nueva política más específica que permite crear solicitudes solo a usuarios con roles apropiados
CREATE POLICY "Usuarios autorizados pueden crear solicitudes" 
ON public.solicitudes 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = solicitante_id AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR
    has_role(auth.uid(), 'rrhh'::app_role) OR
    has_role(auth.uid(), 'supervisor_salas'::app_role) OR
    has_role(auth.uid(), 'finanzas'::app_role) OR
    has_role(auth.uid(), 'monitor'::app_role)
  )
);