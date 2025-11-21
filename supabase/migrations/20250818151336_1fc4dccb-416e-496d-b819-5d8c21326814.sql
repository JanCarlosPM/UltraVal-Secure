
-- Corregir definitivamente las políticas RLS para solicitudes
-- El problema es que has_role() puede no estar funcionando correctamente

-- Eliminar política problemática
DROP POLICY IF EXISTS "Usuarios pueden crear solicitudes" ON public.solicitudes;

-- Crear política que funcione directamente con la tabla profiles
CREATE POLICY "Usuarios pueden crear solicitudes"
ON public.solicitudes
FOR INSERT
WITH CHECK (
  auth.uid() = solicitante_id AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'supervisor_monitoreo', 'rrhh', 'supervisor_salas', 'finanzas', 'monitor')
  )
);
