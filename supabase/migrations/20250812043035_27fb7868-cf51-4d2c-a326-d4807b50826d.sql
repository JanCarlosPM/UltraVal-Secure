-- Fix foreign key relationships for departamentos migration

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.user_has_area_access(uuid, uuid);

-- Update incidencias table to use departamento_id instead of area_id
ALTER TABLE public.incidencias RENAME COLUMN area_id TO departamento_id;

-- Update user_area_access table to use departamento_id instead of area_id  
ALTER TABLE public.user_area_access RENAME COLUMN area_id TO departamento_id;

-- Update user_area_assignments table to use departamento_id instead of area_id
ALTER TABLE public.user_area_assignments RENAME COLUMN area_id TO departamento_id;

-- Update solicitudes table to use departamento_id instead of area_id
ALTER TABLE public.solicitudes RENAME COLUMN area_id TO departamento_id;

-- Update role_area_mapping table to use departamento_id instead of area_id
ALTER TABLE public.role_area_mapping RENAME COLUMN area_id TO departamento_id;

-- Create proper foreign key constraints
DO $$
BEGIN
    -- Add foreign key constraints if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_incidencias_departamento'
    ) THEN
        ALTER TABLE public.incidencias 
        ADD CONSTRAINT fk_incidencias_departamento 
        FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_user_area_access_departamento'
    ) THEN
        ALTER TABLE public.user_area_access 
        ADD CONSTRAINT fk_user_area_access_departamento 
        FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_user_area_assignments_departamento'
    ) THEN
        ALTER TABLE public.user_area_assignments 
        ADD CONSTRAINT fk_user_area_assignments_departamento 
        FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_solicitudes_departamento'
    ) THEN
        ALTER TABLE public.solicitudes 
        ADD CONSTRAINT fk_solicitudes_departamento 
        FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_role_area_mapping_departamento'
    ) THEN
        ALTER TABLE public.role_area_mapping 
        ADD CONSTRAINT fk_role_area_mapping_departamento 
        FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id);
    END IF;
END
$$;

-- Recreate the function with correct parameter name
CREATE OR REPLACE FUNCTION public.user_has_area_access(_user_id uuid, _departamento_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_area_access
    WHERE user_id = _user_id AND departamento_id = _departamento_id
  ) OR public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'supervisor_monitoreo')
$function$;