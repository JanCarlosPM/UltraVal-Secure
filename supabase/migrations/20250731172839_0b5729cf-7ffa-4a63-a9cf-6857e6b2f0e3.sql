-- Obtener el ID del usuario RRHH actual
DO $$
DECLARE
    user_rrhh_id UUID;
    area_rrhh_id UUID;
BEGIN
    -- Obtener ID del usuario RRHH
    SELECT id INTO user_rrhh_id 
    FROM profiles 
    WHERE email = 'carlos.mendoza4002@gmail.com' AND role = 'rrhh';
    
    -- Obtener ID del área de Recursos Humanos
    SELECT id INTO area_rrhh_id 
    FROM areas 
    WHERE nombre = 'Recursos Humanos' AND activo = true;
    
    -- Asignar acceso al área si ambos IDs existen
    IF user_rrhh_id IS NOT NULL AND area_rrhh_id IS NOT NULL THEN
        INSERT INTO user_area_access (user_id, area_id)
        VALUES (user_rrhh_id, area_rrhh_id)
        ON CONFLICT (user_id, area_id) DO NOTHING;
    END IF;
END $$;

-- Actualizar la política para incluir específicamente el rol rrhh
DROP POLICY IF EXISTS "Usuarios pueden ver solicitudes de sus áreas asignadas" ON public.solicitudes;

CREATE POLICY "Usuarios pueden ver solicitudes según rol y área" 
ON public.solicitudes 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR 
  (has_role(auth.uid(), 'rrhh'::app_role) AND user_has_area_access(auth.uid(), area_id)) OR
  (has_role(auth.uid(), 'finanzas'::app_role) AND user_has_area_access(auth.uid(), area_id)) OR
  (has_role(auth.uid(), 'supervisor_salas'::app_role) AND user_has_area_access(auth.uid(), area_id)) OR
  user_has_area_access(auth.uid(), area_id)
);