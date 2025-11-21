
-- Eliminar todas las políticas que dependen de has_role
DROP POLICY IF EXISTS "Los administradores pueden ver todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Los administradores pueden actualizar todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Solo administradores pueden gestionar roles" ON public.user_roles;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar incidencias" ON public.incidencias;
DROP POLICY IF EXISTS "Solo administradores pueden ver incidencias" ON public.incidencias;
DROP POLICY IF EXISTS "Monitores y admins pueden crear incidencias" ON public.incidencias;
DROP POLICY IF EXISTS "Monitores y admins pueden crear imagenes de incidencias" ON public.imagenes_incidencias;
DROP POLICY IF EXISTS "Usuarios pueden ver imagenes de incidencias" ON public.imagenes_incidencias;
DROP POLICY IF EXISTS "Usuarios pueden subir imagenes" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios pueden ver imagenes" ON storage.objects;

-- Ahora sí podemos eliminar y recrear la función has_role
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

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

-- Recrear todas las políticas necesarias

-- Políticas para profiles
CREATE POLICY "Los administradores pueden ver todos los perfiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Los administradores pueden actualizar todos los perfiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para user_roles
CREATE POLICY "Solo administradores pueden gestionar roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Políticas para incidencias
CREATE POLICY "Monitores y admins pueden crear incidencias"
  ON public.incidencias FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'monitor') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Usuarios pueden ver incidencias"
  ON public.incidencias FOR SELECT
  USING (
    public.has_role(auth.uid(), 'monitor') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Solo administradores pueden actualizar incidencias"
  ON public.incidencias FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Políticas para imagenes_incidencias
CREATE POLICY "Monitores y admins pueden crear imagenes de incidencias"
  ON public.imagenes_incidencias FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'monitor') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Usuarios pueden ver imagenes de incidencias"
  ON public.imagenes_incidencias FOR SELECT
  USING (
    public.has_role(auth.uid(), 'monitor') OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Crear bucket de storage si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('incidencias-images', 'incidencias-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para el bucket de storage
CREATE POLICY "Usuarios pueden subir imagenes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'incidencias-images' AND
    (public.has_role(auth.uid(), 'monitor') OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Usuarios pueden ver imagenes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'incidencias-images' AND
    (public.has_role(auth.uid(), 'monitor') OR public.has_role(auth.uid(), 'admin'))
  );
