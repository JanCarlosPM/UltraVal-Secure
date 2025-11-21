-- Agregar el rol 'tecnico' al enum app_role
ALTER TYPE app_role ADD VALUE 'tecnico';

-- Crear función para formatear tiempo tradicional
CREATE OR REPLACE FUNCTION public.formatear_tiempo_tradicional(minutos_totales NUMERIC)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  dias INTEGER;
  horas INTEGER;
  minutos INTEGER;
  resultado TEXT := '';
BEGIN
  -- Convertir a entero para evitar decimales en cálculos
  minutos_totales := FLOOR(minutos_totales);
  
  -- Calcular días (1440 minutos = 1 día)
  dias := FLOOR(minutos_totales / 1440);
  minutos_totales := minutos_totales % 1440;
  
  -- Calcular horas (60 minutos = 1 hora)
  horas := FLOOR(minutos_totales / 60);
  minutos := minutos_totales % 60;
  
  -- Construir resultado
  IF dias > 0 THEN
    resultado := dias || ' día' || CASE WHEN dias > 1 THEN 's' ELSE '' END;
  END IF;
  
  IF horas > 0 THEN
    IF resultado != '' THEN resultado := resultado || ', '; END IF;
    resultado := resultado || horas || ' hora' || CASE WHEN horas > 1 THEN 's' ELSE '' END;
  END IF;
  
  IF minutos > 0 OR resultado = '' THEN
    IF resultado != '' THEN resultado := resultado || ', '; END IF;
    resultado := resultado || minutos || ' minuto' || CASE WHEN minutos > 1 THEN 's' ELSE '' END;
  END IF;
  
  RETURN resultado;
END;
$$;

-- Mejorar la función para obtener múltiples áreas sugeridas basadas en clasificaciones
CREATE OR REPLACE FUNCTION public.obtener_areas_sugeridas_multiple(clasificacion_ids UUID[])
RETURNS TABLE(area_id UUID, prioridad_sugerida VARCHAR, area_nombre VARCHAR)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    CASE cam.prioridad_sugerida 
      WHEN 'critica' THEN 1
      WHEN 'alta' THEN 2
      WHEN 'media' THEN 3
      WHEN 'baja' THEN 4
      ELSE 5
    END;
END;
$$;