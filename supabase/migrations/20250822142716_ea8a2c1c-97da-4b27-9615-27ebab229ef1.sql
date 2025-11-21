-- Revisar y corregir las políticas RLS para solicitudes
-- El problema es que tanto SELECT como INSERT están fallando para roles no-admin

-- Primero, verificar las políticas actuales y simplificarlas

-- Eliminar política de SELECT problemática que requiere user_area_access
DROP POLICY IF EXISTS "usuarios_pueden_ver_solicitudes" ON public.solicitudes;

-- Crear política de SELECT simplificada
CREATE POLICY "usuarios_pueden_ver_solicitudes"
ON public.solicitudes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'supervisor_monitoreo', 'rrhh', 'supervisor_salas', 'finanzas', 'monitor', 'gestor_solicitudes')
  ) AND (
    -- Admins y supervisor_monitoreo pueden ver todas
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'supervisor_monitoreo')
    )
    -- Monitores solo ven sus propias solicitudes
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.role = 'monitor'
      ) AND solicitudes.solicitante_id = auth.uid()
    )
    -- Otros roles pueden ver todas por ahora (simplificado)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('rrhh', 'supervisor_salas', 'finanzas', 'gestor_solicitudes')
    )
  )
);

-- También verificar que la política de UPDATE funcione
DROP POLICY IF EXISTS "usuarios_pueden_actualizar_solicitudes" ON public.solicitudes;

CREATE POLICY "usuarios_pueden_actualizar_solicitudes"
ON public.solicitudes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'supervisor_monitoreo', 'rrhh', 'supervisor_salas', 'finanzas', 'gestor_solicitudes')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'supervisor_monitoreo', 'rrhh', 'supervisor_salas', 'finanzas', 'gestor_solicitudes')
  )
);