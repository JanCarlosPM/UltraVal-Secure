-- Continue with column renaming after policies are updated

-- Now rename the columns
ALTER TABLE public.incidencias RENAME COLUMN area_id TO departamento_id;
ALTER TABLE public.user_area_access RENAME COLUMN area_id TO departamento_id;
ALTER TABLE public.user_area_assignments RENAME COLUMN area_id TO departamento_id;
ALTER TABLE public.solicitudes RENAME COLUMN area_id TO departamento_id;
ALTER TABLE public.role_area_mapping RENAME COLUMN area_id TO departamento_id;

-- Update the temporary function to use the correct column name
DROP FUNCTION IF EXISTS public.user_has_departamento_access(uuid, uuid);
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

-- Update the policies to use the correct column name
DROP POLICY IF EXISTS "Usuarios con roles específicos pueden ver incidencias de su área" ON public.incidencias;
CREATE POLICY "Usuarios con roles específicos pueden ver incidencias de su área" 
ON public.incidencias FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR 
  has_role(auth.uid(), 'monitor'::app_role) OR 
  ((has_role(auth.uid(), 'finanzas'::app_role) OR 
    has_role(auth.uid(), 'rrhh'::app_role) OR 
    has_role(auth.uid(), 'supervisor_salas'::app_role)) AND 
   user_has_departamento_access(auth.uid(), departamento_id))
);

DROP POLICY IF EXISTS "Usuarios con permisos pueden actualizar solicitudes" ON public.solicitudes;
CREATE POLICY "Usuarios con permisos pueden actualizar solicitudes" 
ON public.solicitudes FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR 
  user_has_departamento_access(auth.uid(), departamento_id) OR 
  has_role(auth.uid(), 'rrhh'::app_role) OR 
  has_role(auth.uid(), 'supervisor_salas'::app_role) OR 
  has_role(auth.uid(), 'finanzas'::app_role)
);

DROP POLICY IF EXISTS "Usuarios pueden ver solicitudes según rol y área" ON public.solicitudes;
CREATE POLICY "Usuarios pueden ver solicitudes según rol y área" 
ON public.solicitudes FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR 
  (has_role(auth.uid(), 'rrhh'::app_role) AND user_has_departamento_access(auth.uid(), departamento_id)) OR 
  (has_role(auth.uid(), 'finanzas'::app_role) AND user_has_departamento_access(auth.uid(), departamento_id)) OR 
  (has_role(auth.uid(), 'supervisor_salas'::app_role) AND user_has_departamento_access(auth.uid(), departamento_id)) OR 
  user_has_departamento_access(auth.uid(), departamento_id)
);