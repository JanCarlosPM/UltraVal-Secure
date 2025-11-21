-- Corrección definitiva de todas las políticas RLS de solicitudes
-- Eliminamos todas las políticas existentes y las recreamos sin usar has_role()

-- Eliminar todas las políticas actuales de solicitudes
DROP POLICY IF EXISTS "Usuarios pueden crear solicitudes" ON public.solicitudes;
DROP POLICY IF EXISTS "Usuarios pueden ver solicitudes según rol y área" ON public.solicitudes;
DROP POLICY IF EXISTS "Usuarios pueden actualizar solicitudes según permisos" ON public.solicitudes;

-- Política para INSERT - Permitir a todos los roles autorizados crear solicitudes
CREATE POLICY "usuarios_pueden_crear_solicitudes"
ON public.solicitudes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = solicitante_id AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'supervisor_monitoreo', 'rrhh', 'supervisor_salas', 'finanzas', 'monitor', 'gestor_solicitudes')
  )
);

-- Política para SELECT - Ver solicitudes según rol
CREATE POLICY "usuarios_pueden_ver_solicitudes"
ON public.solicitudes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (
      -- Admins y supervisores ven todas
      p.role IN ('admin', 'supervisor_monitoreo') 
      OR 
      -- Roles específicos solo si tienen acceso al área
      (p.role IN ('rrhh', 'finanzas', 'supervisor_salas', 'gestor_solicitudes') 
       AND EXISTS (SELECT 1 FROM public.user_area_access uaa WHERE uaa.user_id = auth.uid() AND uaa.area_id = solicitudes.area_id))
      OR
      -- Monitores ven solo sus propias solicitudes
      (p.role = 'monitor' AND solicitante_id = auth.uid())
    )
  )
);

-- Política para UPDATE - Actualizar solicitudes según permisos
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