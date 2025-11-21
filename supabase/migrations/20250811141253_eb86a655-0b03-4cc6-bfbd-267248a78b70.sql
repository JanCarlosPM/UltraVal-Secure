-- Primero, actualizar las políticas que dependen de user_has_area_access para que puedan ser DROP FUNCTION ... CASCADE

-- Actualizar política en incidencias
DROP POLICY IF EXISTS "Usuarios con roles específicos pueden ver incidencias de su á" ON public.incidencias;
DROP POLICY IF EXISTS "Usuarios con permisos pueden actualizar solicitudes" ON public.solicitudes;
DROP POLICY IF EXISTS "Usuarios pueden ver solicitudes según rol y área" ON public.solicitudes;

-- Ahora sí podemos eliminar la función antigua
DROP FUNCTION IF EXISTS public.user_has_area_access(uuid, uuid) CASCADE;

-- Crear la nueva función
CREATE OR REPLACE FUNCTION public.user_has_area_access(_user_id uuid, _departamento_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_area_access
    WHERE user_id = _user_id AND departamento_id = _departamento_id
  ) OR public.usuario_tiene_permiso(_user_id, 'admin', 'admin')
$$;

-- Recrear las políticas usando la nueva función y los nuevos nombres de columnas
CREATE POLICY "Usuarios con roles específicos pueden ver incidencias de departamento" ON public.incidencias
FOR SELECT USING (
  public.usuario_tiene_permiso(auth.uid(), 'incidencias', 'read') OR 
  public.user_has_area_access(auth.uid(), area_id)
);

CREATE POLICY "Usuarios con permisos pueden actualizar solicitudes" ON public.solicitudes
FOR UPDATE USING (
  public.usuario_tiene_permiso(auth.uid(), 'admin', 'admin') OR 
  public.user_has_area_access(auth.uid(), departamento_id)
);

CREATE POLICY "Usuarios pueden ver solicitudes según rol y departamento" ON public.solicitudes
FOR SELECT USING (
  public.usuario_tiene_permiso(auth.uid(), 'solicitudes', 'read') OR 
  public.user_has_area_access(auth.uid(), departamento_id)
);

-- Actualizar la función de obtener áreas sugeridas múltiples
CREATE OR REPLACE FUNCTION public.obtener_areas_sugeridas_multiple(clasificacion_ids uuid[])
 RETURNS TABLE(departamento_id uuid, prioridad_sugerida character varying, area_nombre character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    cam.departamento_id,
    cam.prioridad_sugerida,
    d.nombre as area_nombre
  FROM public.clasificacion_area_mapping cam
  JOIN public.departamentos d ON cam.departamento_id = d.id
  WHERE cam.clasificacion_id = ANY(clasificacion_ids)
    AND cam.activo = true
    AND d.activo = true
  ORDER BY 
    cam.departamento_id,
    cam.prioridad_sugerida,
    d.nombre;
END;
$$;