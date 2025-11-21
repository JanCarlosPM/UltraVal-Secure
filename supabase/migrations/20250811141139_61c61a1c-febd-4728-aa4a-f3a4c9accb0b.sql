-- Primero eliminar la función antigua
DROP FUNCTION IF EXISTS public.user_has_area_access(uuid, uuid);

-- Crear la nueva función con el nombre correcto
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

-- Actualizar la función de obtener áreas sugeridas múltiples para usar departamentos
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