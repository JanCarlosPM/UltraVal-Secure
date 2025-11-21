-- Revertir todos los cambios para volver a usar "areas" en lugar de "departamentos"

-- 1. Renombrar tabla departamentos a areas
DO $$
BEGIN
    -- Solo si la tabla departamentos existe y areas no existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'departamentos') 
       AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'areas') THEN
        ALTER TABLE public.departamentos RENAME TO areas;
    END IF;
END $$;

-- 2. Renombrar columnas de departamento_id a area_id en todas las tablas
ALTER TABLE public.incidencias RENAME COLUMN departamento_id TO area_id;
ALTER TABLE public.user_area_access RENAME COLUMN departamento_id TO area_id;
ALTER TABLE public.user_area_assignments RENAME COLUMN departamento_id TO area_id;
ALTER TABLE public.solicitudes RENAME COLUMN departamento_id TO area_id;
ALTER TABLE public.role_area_mapping RENAME COLUMN departamento_id TO area_id;
ALTER TABLE public.clasificacion_area_mapping RENAME COLUMN departamento_id TO area_id;
ALTER TABLE public.profiles RENAME COLUMN departamento_id TO area_id;
ALTER TABLE public.permisos_sistema RENAME COLUMN departamento_id TO area_id;

-- 3. Actualizar las foreign keys con nombres correctos
ALTER TABLE public.incidencias DROP CONSTRAINT IF EXISTS incidencias_departamento_id_fkey;
ALTER TABLE public.incidencias 
ADD CONSTRAINT incidencias_area_id_fkey 
FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE RESTRICT;

ALTER TABLE public.user_area_access DROP CONSTRAINT IF EXISTS user_area_access_departamento_id_fkey;
ALTER TABLE public.user_area_access 
ADD CONSTRAINT user_area_access_area_id_fkey 
FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE CASCADE;

ALTER TABLE public.user_area_assignments DROP CONSTRAINT IF EXISTS user_area_assignments_departamento_id_fkey;
ALTER TABLE public.user_area_assignments 
ADD CONSTRAINT user_area_assignments_area_id_fkey 
FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE CASCADE;

ALTER TABLE public.solicitudes DROP CONSTRAINT IF EXISTS solicitudes_departamento_id_fkey;
ALTER TABLE public.solicitudes 
ADD CONSTRAINT solicitudes_area_id_fkey 
FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE RESTRICT;

ALTER TABLE public.role_area_mapping DROP CONSTRAINT IF EXISTS role_area_mapping_departamento_id_fkey;
ALTER TABLE public.role_area_mapping 
ADD CONSTRAINT role_area_mapping_area_id_fkey 
FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE CASCADE;

ALTER TABLE public.clasificacion_area_mapping DROP CONSTRAINT IF EXISTS clasificacion_area_mapping_departamento_id_fkey;
ALTER TABLE public.clasificacion_area_mapping 
ADD CONSTRAINT clasificacion_area_mapping_area_id_fkey 
FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE CASCADE;

-- 4. Actualizar función para usar areas
CREATE OR REPLACE FUNCTION public.user_has_area_access(_user_id uuid, _area_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_area_access
    WHERE user_id = _user_id AND area_id = _area_id
  ) OR public.has_role(_user_id, 'admin'::app_role)
$function$;