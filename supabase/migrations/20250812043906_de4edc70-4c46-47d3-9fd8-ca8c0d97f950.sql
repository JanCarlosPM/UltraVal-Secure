-- Add proper foreign key constraints with explicit names

-- Drop existing constraints if they exist (ignore errors)
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.incidencias DROP CONSTRAINT IF EXISTS fk_incidencias_departamento;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.user_area_access DROP CONSTRAINT IF EXISTS fk_user_area_access_departamento;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;
END
$$;

-- Add foreign key constraints with proper names for Supabase to recognize
ALTER TABLE public.incidencias 
ADD CONSTRAINT incidencias_departamento_id_fkey 
FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id) ON DELETE RESTRICT;

ALTER TABLE public.user_area_access 
ADD CONSTRAINT user_area_access_departamento_id_fkey 
FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id) ON DELETE CASCADE;

ALTER TABLE public.user_area_assignments 
ADD CONSTRAINT user_area_assignments_departamento_id_fkey 
FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id) ON DELETE CASCADE;

ALTER TABLE public.solicitudes 
ADD CONSTRAINT solicitudes_departamento_id_fkey 
FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id) ON DELETE RESTRICT;

ALTER TABLE public.role_area_mapping 
ADD CONSTRAINT role_area_mapping_departamento_id_fkey 
FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id) ON DELETE CASCADE;