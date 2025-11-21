-- Restaurar RLS en solicitudes
ALTER TABLE public.solicitudes ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para recrearlas correctamente
DROP POLICY IF EXISTS "Usuarios pueden crear solicitudes" ON public.solicitudes;
DROP POLICY IF EXISTS "Usuarios pueden ver solicitudes según permisos" ON public.solicitudes;
DROP POLICY IF EXISTS "Usuarios pueden ver solicitudes según rol y área" ON public.solicitudes;
DROP POLICY IF EXISTS "Usuarios pueden actualizar solicitudes según permisos" ON public.solicitudes;
DROP POLICY IF EXISTS "Usuarios con permisos pueden actualizar solicitudes" ON public.solicitudes;

-- Política para crear solicitudes - solo usuarios autenticados pueden crear
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

-- Política para ver solicitudes según rol y área
CREATE POLICY "Usuarios pueden ver solicitudes según rol y área"
ON public.solicitudes
FOR SELECT
USING (
  -- Admins y supervisores de monitoreo ven todas
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR
  
  -- Otros roles ven solo las de su área
  (
    (has_role(auth.uid(), 'rrhh'::app_role) OR 
     has_role(auth.uid(), 'finanzas'::app_role) OR 
     has_role(auth.uid(), 'supervisor_salas'::app_role)) AND
    user_has_area_access(auth.uid(), area_id)
  ) OR
  
  -- Monitores ven solo las que ellos crearon
  (has_role(auth.uid(), 'monitor'::app_role) AND solicitante_id = auth.uid())
);

-- Política para actualizar solicitudes
CREATE POLICY "Usuarios pueden actualizar solicitudes según permisos"
ON public.solicitudes
FOR UPDATE
USING (
  -- Admins y supervisores de monitoreo pueden actualizar todas
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR
  
  -- Otros roles solo pueden actualizar las de su área
  (
    (has_role(auth.uid(), 'rrhh'::app_role) OR 
     has_role(auth.uid(), 'finanzas'::app_role) OR 
     has_role(auth.uid(), 'supervisor_salas'::app_role)) AND
    user_has_area_access(auth.uid(), area_id)
  )
);

-- Verificar que las políticas se aplicaron correctamente
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'solicitudes';