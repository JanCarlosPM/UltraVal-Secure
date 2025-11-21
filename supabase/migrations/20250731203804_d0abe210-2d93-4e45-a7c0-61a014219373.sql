-- Corregir la función obtener_areas_sugeridas_multiple
-- El problema es que el ORDER BY tiene una expresión CASE que no está en el SELECT DISTINCT
CREATE OR REPLACE FUNCTION public.obtener_areas_sugeridas_multiple(clasificacion_ids uuid[])
RETURNS TABLE(area_id uuid, prioridad_sugerida character varying, area_nombre character varying)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    cam.area_id,
    cam.prioridad_sugerida,
    a.nombre as area_nombre
  FROM public.clasificacion_area_mapping cam
  JOIN public.areas a ON cam.area_id = a.id
  WHERE cam.clasificacion_id = ANY(clasificacion_ids)
    AND cam.activo = true
    AND a.activo = true
  ORDER BY 
    cam.area_id, -- Ordenar por campo que está en SELECT
    cam.prioridad_sugerida,
    a.nombre;
END;
$function$