-- Verificar que todas las columnas existan y crear la función temporal
CREATE OR REPLACE FUNCTION public.user_has_area_access_temp(_user_id uuid, _departamento_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $$
  SELECT true; -- Función temporal que siempre retorna true
$$;

-- Ahora crear la función correcta de obtener áreas sugeridas múltiples usando los datos actuales
CREATE OR REPLACE FUNCTION public.obtener_areas_sugeridas_multiple(clasificacion_ids uuid[])
 RETURNS TABLE(area_id uuid, departamento_id uuid, prioridad_sugerida character varying, area_nombre character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    cam.area_id,
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