
-- Primero, agregar los nuevos roles al enum existente
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor_monitoreo';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rrhh';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor_salas';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finanzas';

-- Actualizar la función has_role para manejar todos los roles correctamente
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role = _role
  )
$$;

-- Actualizar políticas para profiles - permitir que todos los usuarios autenticados vean perfiles
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Los administradores pueden ver todos los perfiles" ON public.profiles;

CREATE POLICY "Usuarios autenticados pueden ver perfiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Administradores pueden ver y editar todos los perfiles"
  ON public.profiles FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Actualizar políticas para incidencias - permitir acceso según roles
DROP POLICY IF EXISTS "Usuarios pueden ver incidencias" ON public.incidencias;
DROP POLICY IF EXISTS "Monitores y admins pueden crear incidencias" ON public.incidencias;
DROP POLICY IF EXISTS "Solo administradores pueden ver incidencias" ON public.incidencias;
DROP POLICY IF EXISTS "Supervisores y admins pueden ver todas las incidencias" ON public.incidencias;

-- Política para ver incidencias según rol
CREATE POLICY "Usuarios pueden ver incidencias según su rol"
  ON public.incidencias FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'supervisor_monitoreo') OR
    has_role(auth.uid(), 'monitor') OR
    has_role(auth.uid(), 'rrhh') OR
    has_role(auth.uid(), 'supervisor_salas') OR
    has_role(auth.uid(), 'finanzas')
  );

-- Política para crear incidencias
CREATE POLICY "Usuarios autorizados pueden crear incidencias"
  ON public.incidencias FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'supervisor_monitoreo') OR
    has_role(auth.uid(), 'monitor')
  );

-- Política para actualizar incidencias
CREATE POLICY "Supervisores y admins pueden actualizar incidencias"
  ON public.incidencias FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'supervisor_monitoreo')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'supervisor_monitoreo')
  );

-- Actualizar políticas para reportes consolidados
DROP POLICY IF EXISTS "Usuarios pueden ver reportes consolidados de sus áreas" ON public.reportes_consolidados;

CREATE POLICY "Usuarios pueden ver reportes consolidados según su rol"
  ON public.reportes_consolidados FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'supervisor_monitoreo') OR
    has_role(auth.uid(), 'rrhh') OR
    has_role(auth.uid(), 'supervisor_salas') OR
    has_role(auth.uid(), 'finanzas') OR
    has_role(auth.uid(), 'monitor')
  );

-- Asegurar que el trigger para crear perfiles funcione con todos los roles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'monitor', -- Rol por defecto
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'avatar-1')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
