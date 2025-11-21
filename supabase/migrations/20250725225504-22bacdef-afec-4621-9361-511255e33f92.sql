
-- Corregir la función obtener_estadisticas_quincenales_sala para que coincidan los tipos
DROP FUNCTION IF EXISTS public.obtener_estadisticas_quincenales_sala(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.obtener_estadisticas_quincenales_sala(
  p_año INTEGER DEFAULT NULL,
  p_mes INTEGER DEFAULT NULL
) RETURNS TABLE(
  sala_id UUID,
  sala_nombre CHARACTER VARYING,  -- Cambiar de TEXT a CHARACTER VARYING
  año INTEGER,
  mes INTEGER,
  quincena INTEGER,
  minutos_ingresos_tardios INTEGER,
  minutos_cierres_prematuros INTEGER,
  total_incidencias_ingresos INTEGER,
  total_incidencias_cierres INTEGER,
  total_minutos INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    cqs.sala_id,
    s.nombre as sala_nombre,
    cqs.año,
    cqs.mes,
    cqs.quincena,
    cqs.minutos_ingresos_tardios,
    cqs.minutos_cierres_prematuros,
    cqs.total_incidencias_ingresos,
    cqs.total_incidencias_cierres,
    (cqs.minutos_ingresos_tardios + cqs.minutos_cierres_prematuros) as total_minutos
  FROM public.conteos_quincenales_sala cqs
  JOIN public.salas s ON cqs.sala_id = s.id
  WHERE (p_año IS NULL OR cqs.año = p_año)
    AND (p_mes IS NULL OR cqs.mes = p_mes)
  ORDER BY cqs.año DESC, cqs.mes DESC, cqs.quincena DESC, s.nombre;
END;
$function$;
