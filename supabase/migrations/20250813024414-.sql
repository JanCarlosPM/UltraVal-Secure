-- Drop dependent objects that reference departamento_id
DROP VIEW IF EXISTS public.vista_consolidados_detallados CASCADE;

-- Drop policies that reference departamento_id
DROP POLICY IF EXISTS "Usuarios con roles específicos pueden ver incidencias de su á" ON public.incidencias;
DROP POLICY IF EXISTS "Usuarios pueden ver incidencias según su rol" ON public.incidencias;

-- Now fix the tables by replacing departamento_id with area_id

-- Fix user_area_access table 
ALTER TABLE public.user_area_access 
  DROP COLUMN IF EXISTS departamento_id CASCADE,
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.areas(id);

-- Fix incidencias table 
ALTER TABLE public.incidencias 
  DROP COLUMN IF EXISTS departamento_id CASCADE,
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.areas(id);

-- Fix solicitudes table  
ALTER TABLE public.solicitudes
  DROP COLUMN IF EXISTS departamento_id CASCADE,
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.areas(id);

-- Fix permisos_sistema table
ALTER TABLE public.permisos_sistema
  DROP COLUMN IF EXISTS departamento_id CASCADE,
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.areas(id);

-- Fix user_area_assignments table
ALTER TABLE public.user_area_assignments
  DROP COLUMN IF EXISTS departamento_id CASCADE,
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.areas(id);

-- Fix profiles table
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS departamento_id CASCADE,
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.areas(id);

-- Add proper indexes
CREATE INDEX IF NOT EXISTS idx_user_area_access_area_id ON public.user_area_access(area_id);
CREATE INDEX IF NOT EXISTS idx_user_area_access_user_id ON public.user_area_access(user_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_area_id ON public.incidencias(area_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_area_id ON public.solicitudes(area_id);
CREATE INDEX IF NOT EXISTS idx_permisos_sistema_area_id ON public.permisos_sistema(area_id);
CREATE INDEX IF NOT EXISTS idx_profiles_area_id ON public.profiles(area_id);

-- Add unique constraint to user_area_access
ALTER TABLE public.user_area_access 
  DROP CONSTRAINT IF EXISTS unique_user_area_access,
  ADD CONSTRAINT unique_user_area_access UNIQUE (user_id, area_id);

-- Recreate the RLS policies for incidencias with area_id
CREATE POLICY "Usuarios con roles específicos pueden ver incidencias de su área" 
ON public.incidencias 
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR 
  has_role(auth.uid(), 'monitor'::app_role) OR 
  (
    (has_role(auth.uid(), 'finanzas'::app_role) OR 
     has_role(auth.uid(), 'rrhh'::app_role) OR 
     has_role(auth.uid(), 'supervisor_salas'::app_role)) AND 
    user_has_area_access(auth.uid(), area_id)
  )
);

CREATE POLICY "Usuarios pueden ver incidencias según su rol y área" 
ON public.incidencias 
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR 
  has_role(auth.uid(), 'monitor'::app_role) OR 
  has_role(auth.uid(), 'rrhh'::app_role) OR 
  has_role(auth.uid(), 'supervisor_salas'::app_role) OR 
  has_role(auth.uid(), 'finanzas'::app_role)
);

-- Update the user_has_departamento_access function to use areas
CREATE OR REPLACE FUNCTION public.user_has_area_access(_user_id uuid, _area_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_area_access
    WHERE user_id = _user_id AND area_id = _area_id
  ) OR public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'supervisor_monitoreo')
$function$;