-- Primero eliminar la función existente y recrearla con la nueva estructura
DROP FUNCTION IF EXISTS public.user_has_area_access(uuid, uuid);
DROP FUNCTION IF EXISTS public.user_has_departamento_access(uuid, uuid);

-- Verificar y corregir la estructura de las tablas para usar area_id en lugar de departamento_id

-- Verificar si la columna area_id existe en profiles
DO $$
BEGIN
    -- Agregar area_id a profiles si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'area_id') THEN
        ALTER TABLE public.profiles ADD COLUMN area_id UUID REFERENCES public.areas(id);
    END IF;
END $$;

-- Corregir tabla solicitudes para usar area_id
DO $$
BEGIN
    -- Verificar si departamento_id existe en solicitudes y cambiar a area_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'solicitudes' AND column_name = 'departamento_id') THEN
        -- Renombrar departamento_id a area_id en solicitudes
        ALTER TABLE public.solicitudes RENAME COLUMN departamento_id TO area_id;
    END IF;
END $$;

-- Corregir tabla incidencias para usar area_id
DO $$
BEGIN
    -- Verificar si departamento_id existe en incidencias
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidencias' AND column_name = 'departamento_id') THEN
        -- Renombrar departamento_id a area_id en incidencias
        ALTER TABLE public.incidencias RENAME COLUMN departamento_id TO area_id;
    END IF;
END $$;

-- Corregir tabla user_area_access
DO $$
BEGIN
    -- Verificar si departamento_id existe en user_area_access
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_area_access' AND column_name = 'departamento_id') THEN
        -- Renombrar departamento_id a area_id en user_area_access
        ALTER TABLE public.user_area_access RENAME COLUMN departamento_id TO area_id;
    END IF;
END $$;

-- Corregir tabla permisos_sistema
DO $$
BEGIN
    -- Verificar si departamento_id existe en permisos_sistema
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'permisos_sistema' AND column_name = 'departamento_id') THEN
        -- Renombrar departamento_id a area_id en permisos_sistema
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
  ) OR public.usuario_tiene_permiso(_user_id, 'admin', 'admin')
$$;