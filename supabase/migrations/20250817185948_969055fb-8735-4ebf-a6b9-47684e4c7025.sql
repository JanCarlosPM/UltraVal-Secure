-- Eliminar política actual que no funciona
DROP POLICY IF EXISTS "Usuarios autorizados pueden crear solicitudes" ON public.solicitudes;

-- Crear nueva política más simple que use directamente la tabla profiles
CREATE POLICY "Usuarios autenticados pueden crear solicitudes" 
ON public.solicitudes 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = solicitante_id AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor_monitoreo', 'rrhh', 'supervisor_salas', 'finanzas', 'monitor')
    )
  )
);