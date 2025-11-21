-- Fix the user_area_access table and incidencias table schema

-- Fix user_area_access table to use area_id instead of departamento_id
ALTER TABLE public.user_area_access 
  DROP COLUMN IF EXISTS departamento_id,
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.areas(id);

-- Fix incidencias table to use area_id instead of departamento_id
ALTER TABLE public.incidencias 
  DROP COLUMN IF EXISTS departamento_id,
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.areas(id);

-- Fix solicitudes table to use area_id instead of departamento_id  
ALTER TABLE public.solicitudes
  DROP COLUMN IF EXISTS departamento_id,
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.areas(id);

-- Fix permisos_sistema table to use area_id instead of departamento_id
ALTER TABLE public.permisos_sistema
  DROP COLUMN IF EXISTS departamento_id,
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.areas(id);

-- Fix user_area_assignments table to use area_id
ALTER TABLE public.user_area_assignments
  DROP COLUMN IF EXISTS departamento_id,
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.areas(id);

-- Update profiles table to use area_id instead of departamento_id
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS departamento_id,
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.areas(id);

-- Drop the old areas table foreign key constraint that used to reference departamentos
-- and add proper indexes
CREATE INDEX IF NOT EXISTS idx_user_area_access_area_id ON public.user_area_access(area_id);
CREATE INDEX IF NOT EXISTS idx_user_area_access_user_id ON public.user_area_access(user_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_area_id ON public.incidencias(area_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_area_id ON public.solicitudes(area_id);
CREATE INDEX IF NOT EXISTS idx_permisos_sistema_area_id ON public.permisos_sistema(area_id);
CREATE INDEX IF NOT EXISTS idx_profiles_area_id ON public.profiles(area_id);

-- Add unique constraint to user_area_access to prevent duplicates
ALTER TABLE public.user_area_access 
  DROP CONSTRAINT IF EXISTS unique_user_area_access,
  ADD CONSTRAINT unique_user_area_access UNIQUE (user_id, area_id);