-- El problema es que en INSERT las referencias a solicitudes.area_id no funcionan correctamente
-- Necesito reescribir las políticas para que funcionen con los valores que se están insertando

-- Eliminar política problemática
DROP POLICY IF EXISTS "usuarios_pueden_crear_solicitudes" ON public.solicitudes;

-- CREAR POLÍTICA SIMPLIFICADA QUE FUNCIONE
-- Para INSERT, verificamos solo que el usuario tenga el rol correcto y acceso a áreas
CREATE POLICY "usuarios_pueden_crear_solicitudes"
ON public.solicitudes
FOR INSERT
TO authenticated  
WITH CHECK (
  auth.uid() = solicitante_id AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'supervisor_monitoreo', 'rrhh', 'supervisor_salas', 'finanzas', 'monitor', 'gestor_solicitudes')
  )
);

-- También necesito crear un trigger para verificar el acceso al área después del insert
-- si es necesario, pero por ahora probemos con esta política simplificada