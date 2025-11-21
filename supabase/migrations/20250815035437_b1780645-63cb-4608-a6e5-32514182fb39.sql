-- Verificar y corregir la estructura de las tablas para usar area_id en lugar de departamento_id

-- Verificar si la columna area_id existe en profiles
DO $$
BEGIN
    -- Agregar area_id a profiles si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'area_id') THEN
        ALTER TABLE public.profiles ADD COLUMN area_id UUID REFERENCES public.areas(id);
    END IF;
    
    -- Eliminar departamento_id de profiles si existe
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'departamento_id') THEN
        ALTER TABLE public.profiles DROP COLUMN departamento_id;
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

-- Actualizar las funciones que usan departamento_id
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

-- Actualizar función para verificar acceso por área
CREATE OR REPLACE FUNCTION public.usuario_tiene_permiso(_user_id uuid, _modulo_codigo text, _accion_codigo text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.permisos_sistema ps ON ps.rol_id = p.rol_general_id
    JOIN public.modulos_sistema ms ON ms.id = ps.modulo_id
    JOIN public.acciones_sistema as_table ON as_table.id = ps.accion_id
    WHERE p.id = _user_id
      AND ms.codigo = _modulo_codigo
      AND as_table.codigo = _accion_codigo
      AND ps.activo = true
      AND (ps.area_id IS NULL OR ps.area_id = p.area_id)
  ) OR EXISTS (
    -- Los administradores tienen acceso completo
    SELECT 1
    FROM public.profiles p
    JOIN public.roles_generales rg ON rg.id = p.rol_general_id
    WHERE p.id = _user_id AND rg.nombre = 'administrador'
  );
$$;