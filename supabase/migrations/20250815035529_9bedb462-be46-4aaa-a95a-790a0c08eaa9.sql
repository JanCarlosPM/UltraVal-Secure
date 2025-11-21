-- Eliminar las políticas dependientes primero
DROP POLICY IF EXISTS "Usuarios con roles específicos pueden ver incidencias de su á" ON public.incidencias;
DROP POLICY IF EXISTS "Usuarios con permisos pueden actualizar solicitudes" ON public.solicitudes;
DROP POLICY IF EXISTS "Usuarios pueden ver solicitudes según rol y área" ON public.solicitudes;

-- Eliminar las funciones existentes
DROP FUNCTION IF EXISTS public.user_has_departamento_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_area_access(uuid, uuid) CASCADE;

-- Verificar y corregir la estructura de las tablas
DO $$
BEGIN
    -- Agregar area_id a profiles si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'area_id') THEN
        ALTER TABLE public.profiles ADD COLUMN area_id UUID REFERENCES public.areas(id);
    END IF;
    
    -- Verificar si departamento_id existe en solicitudes y cambiar a area_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'solicitudes' AND column_name = 'departamento_id') THEN
        ALTER TABLE public.solicitudes RENAME COLUMN departamento_id TO area_id;
    END IF;
    
    -- Verificar si departamento_id existe en incidencias
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidencias' AND column_name = 'departamento_id') THEN
        ALTER TABLE public.incidencias RENAME COLUMN departamento_id TO area_id;
    END IF;
    
    -- Verificar si departamento_id existe en user_area_access
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_area_access' AND column_name = 'departamento_id') THEN
        ALTER TABLE public.user_area_access RENAME COLUMN departamento_id TO area_id;
    END IF;
    
    -- Verificar si departamento_id existe en permisos_sistema
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'permisos_sistema' AND column_name = 'departamento_id') THEN
        ALTER TABLE public.permisos_sistema RENAME COLUMN departamento_id TO area_id;
    END IF;
END $$;

-- Crear nuevas funciones con la estructura correcta
CREATE OR REPLACE FUNCTION public.user_has_area_access(_user_id uuid, _area_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_area_access
    WHERE user_id = _user_id AND area_id = _area_id
  ) OR has_role(_user_id, 'admin'::app_role)
$$;

-- Recrear las políticas con la nueva función
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

CREATE POLICY "Usuarios con roles específicos pueden ver incidencias de su área" 
ON public.incidencias 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR 
  has_role(auth.uid(), 'monitor'::app_role) OR 
  ((has_role(auth.uid(), 'finanzas'::app_role) OR 
    has_role(auth.uid(), 'rrhh'::app_role) OR 
    has_role(auth.uid(), 'supervisor_salas'::app_role)) AND 
   user_has_area_access(auth.uid(), area_id))
);