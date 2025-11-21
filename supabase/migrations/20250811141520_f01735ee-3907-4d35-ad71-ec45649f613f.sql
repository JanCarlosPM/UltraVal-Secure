-- Eliminar función existente y recrear con la nueva signatura
DROP FUNCTION IF EXISTS public.obtener_areas_sugeridas_multiple(uuid[]);

-- Recrear la función con compatibilidad hacia atrás
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