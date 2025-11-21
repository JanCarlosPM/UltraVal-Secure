-- Actualizar la función calcular_horas_solicitud para que calcule desde fecha_creacion
CREATE OR REPLACE FUNCTION public.calcular_horas_solicitud(p_solicitud_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    CASE 
      WHEN estado = 'cerrada' AND fecha_creacion IS NOT NULL AND fecha_cierre IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (fecha_cierre - fecha_creacion))::DECIMAL / 3600
      WHEN estado IN ('pendiente', 'en_ejecucion') AND fecha_creacion IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (NOW() - fecha_creacion))::DECIMAL / 3600
      ELSE 0
    END
  FROM public.solicitudes 
  WHERE id = p_solicitud_id;
$function$