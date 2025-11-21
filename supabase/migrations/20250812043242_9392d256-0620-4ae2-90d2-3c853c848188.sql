-- Continue with column renaming without dropping function

-- First rename the columns
ALTER TABLE public.incidencias RENAME COLUMN area_id TO departamento_id;
ALTER TABLE public.user_area_access RENAME COLUMN area_id TO departamento_id;
ALTER TABLE public.user_area_assignments RENAME COLUMN area_id TO departamento_id;
ALTER TABLE public.solicitudes RENAME COLUMN area_id TO departamento_id;
ALTER TABLE public.role_area_mapping RENAME COLUMN area_id TO departamento_id;

-- Update the function in place to use the correct column name
CREATE OR REPLACE FUNCTION public.user_has_departamento_access(_user_id uuid, _departamento_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_area_access
    WHERE user_id = _user_id AND departamento_id = _departamento_id
  ) OR public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'supervisor_monitoreo')
$function$;