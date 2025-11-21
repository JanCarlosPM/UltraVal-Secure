-- Crear función para detectar y actualizar conteos quincenales automáticamente
CREATE OR REPLACE FUNCTION public.actualizar_conteos_automaticos()
RETURNS TRIGGER AS $$
DECLARE
  tipo_incidencia TEXT;
  minutos_valor INTEGER;
  clasificacion_nombre TEXT;
BEGIN
  -- Solo procesar si la incidencia es aprobada y tiene tiempo_minutos
  IF NEW.estado = 'aprobado' AND NEW.tiempo_minutos IS NOT NULL AND NEW.tiempo_minutos > 0 AND NEW.sala_id IS NOT NULL THEN
    
    -- Obtener el nombre de la clasificación
    SELECT nombre INTO clasificacion_nombre
    FROM public.clasificaciones
    WHERE id = NEW.clasificacion_id;
    
    -- Determinar el tipo de incidencia basado en la clasificación
    IF clasificacion_nombre IS NOT NULL THEN
      clasificacion_nombre := LOWER(clasificacion_nombre);
      
      IF clasificacion_nombre LIKE '%ingreso%' OR clasificacion_nombre LIKE '%tardio%' OR clasificacion_nombre LIKE '%tarde%' THEN
        tipo_incidencia := 'ingreso_tardio';
        minutos_valor := NEW.tiempo_minutos;
      ELSIF clasificacion_nombre LIKE '%cierre%' OR clasificacion_nombre LIKE '%prematuro%' OR clasificacion_nombre LIKE '%temprano%' THEN
        tipo_incidencia := 'cierre_prematuro';
        minutos_valor := NEW.tiempo_minutos;
      ELSE
        -- No es una incidencia de tiempo, no hacer nada
        RETURN NEW;
      END IF;
      
      -- Actualizar los conteos quincenales
      PERFORM public.actualizar_conteo_quincenal_sala(
        NEW.sala_id,
        tipo_incidencia,
        minutos_valor,
        NEW.fecha_incidencia::date
      );
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para actualizar conteos automáticamente cuando se aprueba una incidencia
DROP TRIGGER IF EXISTS trigger_actualizar_conteos_quincenales ON public.incidencias;

CREATE TRIGGER trigger_actualizar_conteos_quincenales
  AFTER UPDATE ON public.incidencias
  FOR EACH ROW
  WHEN (NEW.estado = 'aprobado' AND OLD.estado != 'aprobado')
  EXECUTE FUNCTION public.actualizar_conteos_automaticos();

-- También crear trigger para INSERT por si se crea directamente aprobada
CREATE TRIGGER trigger_actualizar_conteos_quincenales_insert
  AFTER INSERT ON public.incidencias
  FOR EACH ROW
  WHEN (NEW.estado = 'aprobado')
  EXECUTE FUNCTION public.actualizar_conteos_automaticos();

-- Función para recalcular conteos existentes (para datos históricos)
CREATE OR REPLACE FUNCTION public.recalcular_conteos_quincenales(p_año INTEGER DEFAULT NULL, p_mes INTEGER DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  incidencia_record RECORD;
  total_procesadas INTEGER := 0;
  tipo_incidencia TEXT;
  clasificacion_nombre TEXT;
BEGIN
  -- Limpiar conteos existentes si se especifica año/mes
  IF p_año IS NOT NULL AND p_mes IS NOT NULL THEN
    DELETE FROM public.conteos_quincenales_sala 
    WHERE año = p_año AND mes = p_mes;
  ELSIF p_año IS NOT NULL THEN
    DELETE FROM public.conteos_quincenales_sala 
    WHERE año = p_año;
  END IF;
  
  -- Procesar todas las incidencias aprobadas con tiempo
  FOR incidencia_record IN
    SELECT i.id, i.sala_id, i.clasificacion_id, i.tiempo_minutos, i.fecha_incidencia,
           c.nombre as clasificacion_nombre
    FROM public.incidencias i
    JOIN public.clasificaciones c ON i.clasificacion_id = c.id
    WHERE i.estado = 'aprobado' 
      AND i.tiempo_minutos IS NOT NULL 
      AND i.tiempo_minutos > 0
      AND i.sala_id IS NOT NULL
      AND (p_año IS NULL OR EXTRACT(YEAR FROM i.fecha_incidencia) = p_año)
      AND (p_mes IS NULL OR EXTRACT(MONTH FROM i.fecha_incidencia) = p_mes)
  LOOP
    
    clasificacion_nombre := LOWER(incidencia_record.clasificacion_nombre);
    
    -- Determinar tipo de incidencia
    IF clasificacion_nombre LIKE '%ingreso%' OR clasificacion_nombre LIKE '%tardio%' OR clasificacion_nombre LIKE '%tarde%' THEN
      tipo_incidencia := 'ingreso_tardio';
    ELSIF clasificacion_nombre LIKE '%cierre%' OR clasificacion_nombre LIKE '%prematuro%' OR clasificacion_nombre LIKE '%temprano%' THEN
      tipo_incidencia := 'cierre_prematuro';
    ELSE
      CONTINUE; -- Saltar incidencias que no son de tiempo
    END IF;
    
    -- Actualizar conteo
    PERFORM public.actualizar_conteo_quincenal_sala(
      incidencia_record.sala_id,
      tipo_incidencia,
      incidencia_record.tiempo_minutos,
      incidencia_record.fecha_incidencia::date
    );
    
    total_procesadas := total_procesadas + 1;
  END LOOP;
  
  RETURN 'Procesadas ' || total_procesadas || ' incidencias para recalcular conteos quincenales.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;