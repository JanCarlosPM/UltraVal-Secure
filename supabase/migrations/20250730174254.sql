-- Agregar foreign key entre solicitudes y profiles (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'solicitudes_solicitante_id_fkey' 
        AND table_name = 'solicitudes'
    ) THEN
        ALTER TABLE public.solicitudes 
        ADD CONSTRAINT solicitudes_solicitante_id_fkey 
        FOREIGN KEY (solicitante_id) REFERENCES public.profiles(id);
    END IF;
END $$;

-- Corregir políticas RLS para solicitudes
DROP POLICY IF EXISTS "Todos pueden ver solicitudes" ON public.solicitudes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver todas las solicitudes" ON public.solicitudes;

CREATE POLICY "Usuarios autenticados pueden ver todas las solicitudes" 
ON public.solicitudes 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Política para actualizar solicitudes
DROP POLICY IF EXISTS "Solo usuarios con acceso al área pueden actualizar solicitudes" ON public.solicitudes;
DROP POLICY IF EXISTS "Usuarios con permisos pueden actualizar solicitudes" ON public.solicitudes;

CREATE POLICY "Usuarios con permisos pueden actualizar solicitudes" 
ON public.solicitudes 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR 
  user_has_area_access(auth.uid(), area_id) OR
  has_role(auth.uid(), 'rrhh'::app_role) OR
  has_role(auth.uid(), 'supervisor_salas'::app_role) OR
  has_role(auth.uid(), 'finanzas'::app_role)
);