-- CORREGIR EL ERROR CRÍTICO EN LAS POLÍTICAS RLS
-- El problema era que comparaba uaa.area_id = uaa.area_id en lugar de solicitudes.area_id

-- Eliminar políticas con el error
DROP POLICY IF EXISTS "usuarios_pueden_crear_solicitudes" ON public.solicitudes;
DROP POLICY IF EXISTS "usuarios_pueden_ver_solicitudes" ON public.solicitudes;
DROP POLICY IF EXISTS "usuarios_pueden_actualizar_solicitudes" ON public.solicitudes;

-- POLÍTICA CREAR CORREGIDA - Ahora compara correctamente con solicitudes.area_id
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
      -- Monitores pueden crear solo si son el solicitante
      p.role = 'monitor'
      OR
      -- Otros roles solo si tienen acceso al área específica DE LA SOLICITUD
      EXISTS (SELECT 1 FROM public.user_area_access uaa WHERE uaa.user_id = auth.uid() AND uaa.area_id = solicitudes.area_id)
    )
  )
);

-- POLÍTICA VER CORREGIDA
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
      -- Otros roles solo si tienen acceso al área DE LA SOLICITUD
      EXISTS (SELECT 1 FROM public.user_area_access uaa WHERE uaa.user_id = auth.uid() AND uaa.area_id = solicitudes.area_id)
    )
  )
);

-- POLÍTICA ACTUALIZAR CORREGIDA
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
      -- Roles específicos solo si tienen acceso al área DE LA SOLICITUD
      (p.role IN ('rrhh', 'finanzas', 'supervisor_salas', 'gestor_solicitudes') 
       AND EXISTS (SELECT 1 FROM public.user_area_access uaa WHERE uaa.user_id = auth.uid() AND uaa.area_id = solicitudes.area_id))
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
       AND EXISTS (SELECT 1 FROM public.user_area_access uaa WHERE uaa.user_id = auth.uid() AND uaa.area_id = solicitudes.area_id))
    )
  )
);