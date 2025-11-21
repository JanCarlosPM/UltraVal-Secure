-- Actualizar las relaciones de foreign keys para que apunten a departamentos
UPDATE public.incidencias SET area_id = (
  SELECT d.id FROM public.departamentos d 
  WHERE d.id = public.incidencias.area_id
) WHERE area_id IS NOT NULL;

-- Actualizar las relaciones en user_area_access para que apunten a departamentos
ALTER TABLE public.user_area_access RENAME COLUMN area_id TO departamento_id;

-- Actualizar user_area_assignments para que apunte a departamentos
ALTER TABLE public.user_area_assignments RENAME COLUMN area_id TO departamento_id;

-- Actualizar clasificacion_area_mapping para que apunte a departamentos  
ALTER TABLE public.clasificacion_area_mapping RENAME COLUMN area_id TO departamento_id;

-- Actualizar solicitudes para que apunte a departamentos
ALTER TABLE public.solicitudes RENAME COLUMN area_id TO departamento_id;

-- Actualizar la función user_has_area_access para usar departamentos
CREATE OR REPLACE FUNCTION public.user_has_area_access(_user_id uuid, _departamento_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_area_access
    WHERE user_id = _user_id AND departamento_id = _departamento_id
  ) OR public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'supervisor_monitoreo')
$$;