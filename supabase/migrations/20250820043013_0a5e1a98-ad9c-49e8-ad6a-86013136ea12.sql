-- Corregir políticas RLS de solicitudes - El problema es que verifican acceso al área ANTES de crear
-- Pero necesitan verificar si el usuario PUEDE crear en esa área específica

-- Eliminar políticas actuales
DROP POLICY IF EXISTS "usuarios_pueden_crear_solicitudes" ON public.solicitudes;
DROP POLICY IF EXISTS "usuarios_pueden_ver_solicitudes" ON public.solicitudes;
DROP POLICY IF EXISTS "usuarios_pueden_actualizar_solicitudes" ON public.solicitudes;

-- POLÍTICA CREAR: El usuario debe poder crear solicitudes para áreas donde tiene acceso
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
    AND (
      -- Admins y supervisores pueden crear en cualquier área
      p.role IN ('admin', 'supervisor_monitoreo')
      OR
      -- Monitores pueden crear solo si son el solicitante (ya verificado arriba)
      p.role = 'monitor'
      OR
      -- Otros roles solo si tienen acceso al área específica
      EXISTS (SELECT 1 FROM public.user_area_access uaa WHERE uaa.user_id = auth.uid() AND uaa.area_id = area_id)
    )
  )
);

-- POLÍTICA VER: Igual lógica pero para visualización
CREATE POLICY "usuarios_pueden_ver_solicitudes"
ON public.solicitudes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'supervisor_monitoreo', 'rrhh', 'supervisor_salas', 'finanzas', 'monitor', 'gestor_solicitudes')
    AND (
      -- Admins y supervisores ven todas
      p.role IN ('admin', 'supervisor_monitoreo')
      OR
      -- Monitores ven solo las suyas
      (p.role = 'monitor' AND solicitante_id = auth.uid())
      OR
      -- Otros roles solo si tienen acceso al área
      EXISTS (SELECT 1 FROM public.user_area_access uaa WHERE uaa.user_id = auth.uid() AND uaa.area_id = area_id)
    )
  )
);

-- POLÍTICA ACTUALIZAR: Solo quienes pueden gestionar
CREATE POLICY "usuarios_pueden_actualizar_solicitudes"
ON public.solicitudes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (
      -- Admins y supervisores pueden actualizar cualquiera
      p.role IN ('admin', 'supervisor_monitoreo') 
      OR 
      -- Roles específicos solo si tienen acceso al área
      (p.role IN ('rrhh', 'finanzas', 'supervisor_salas', 'gestor_solicitudes') 
       AND EXISTS (SELECT 1 FROM public.user_area_access uaa WHERE uaa.user_id = auth.uid() AND uaa.area_id = area_id))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (
      p.role IN ('admin', 'supervisor_monitoreo') 
      OR 
      (p.role IN ('rrhh', 'finanzas', 'supervisor_salas', 'gestor_solicitudes') 
       AND EXISTS (SELECT 1 FROM public.user_area_access uaa WHERE uaa.user_id = auth.uid() AND uaa.area_id = area_id))
    )
  )
);