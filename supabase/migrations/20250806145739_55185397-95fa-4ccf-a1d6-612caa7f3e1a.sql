-- 1. Agregar el rol 'tecnico' al enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'tecnico';

-- 2. Crear tabla para conteo quincenal de máquinas
CREATE TABLE IF NOT EXISTS public.conteos_quincenales_maquinas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sala_id UUID NOT NULL REFERENCES public.salas(id),
    año INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    quincena INTEGER NOT NULL,
    total_maquinas_apagadas INTEGER NOT NULL DEFAULT 0,
    total_incidencias_maquinas INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(sala_id, año, mes, quincena)
);

-- 3. Habilitar RLS en la nueva tabla
ALTER TABLE public.conteos_quincenales_maquinas ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas RLS para la tabla de conteos de máquinas
CREATE POLICY "Solo técnicos, admins y supervisores pueden modificar conteos de máquinas"
ON public.conteos_quincenales_maquinas
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR 
       has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR 
       has_role(auth.uid(), 'tecnico'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR 
            has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR 
            has_role(auth.uid(), 'tecnico'::app_role));

CREATE POLICY "Usuarios autenticados pueden ver conteos de máquinas"
ON public.conteos_quincenales_maquinas
FOR SELECT
USING (auth.role() = 'authenticated'::text);

-- 5. Función para obtener conteo quincenal de máquinas
CREATE OR REPLACE FUNCTION public.obtener_conteo_quincenal_maquinas(p_sala_id UUID, p_fecha DATE DEFAULT CURRENT_DATE)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conteo_id UUID;
  año_actual INTEGER;
  mes_actual INTEGER;
  quincena_actual INTEGER;
BEGIN
  -- Extraer año y mes de la fecha
  año_actual := EXTRACT(YEAR FROM p_fecha);
  mes_actual := EXTRACT(MONTH FROM p_fecha);
  
  -- Determinar quincena (1-15 = 1, 16-último día = 2)
  IF EXTRACT(DAY FROM p_fecha) <= 15 THEN
    quincena_actual := 1;
  ELSE
    quincena_actual := 2;
  END IF;
  
  -- Buscar conteo existente
  SELECT id INTO conteo_id
  FROM public.conteos_quincenales_maquinas
  WHERE sala_id = p_sala_id
    AND año = año_actual
    AND mes = mes_actual
    AND quincena = quincena_actual;
  
  -- Si no existe, crear nuevo conteo
  IF conteo_id IS NULL THEN
    INSERT INTO public.conteos_quincenales_maquinas (
      sala_id, año, mes, quincena
    ) VALUES (
      p_sala_id, año_actual, mes_actual, quincena_actual
    ) RETURNING id INTO conteo_id;
  END IF;
  
  RETURN conteo_id;
END;
$$;

-- 6. Función para actualizar conteo quincenal de máquinas
CREATE OR REPLACE FUNCTION public.actualizar_conteo_quincenal_maquinas(p_sala_id UUID, p_cantidad_maquinas INTEGER, p_fecha DATE DEFAULT CURRENT_DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conteo_id UUID;
BEGIN
  -- Obtener o crear conteo quincenal
  conteo_id := public.obtener_conteo_quincenal_maquinas(p_sala_id, p_fecha);
  
  -- Actualizar conteo
  UPDATE public.conteos_quincenales_maquinas
  SET 
    total_maquinas_apagadas = total_maquinas_apagadas + p_cantidad_maquinas,
    total_incidencias_maquinas = total_incidencias_maquinas + 1,
    updated_at = now()
  WHERE id = conteo_id;
  
  RETURN TRUE;
END;
$$;

-- 7. Función para obtener estadísticas quincenales de máquinas
CREATE OR REPLACE FUNCTION public.obtener_estadisticas_quincenales_maquinas(p_año INTEGER DEFAULT NULL, p_mes INTEGER DEFAULT NULL)
RETURNS TABLE(
  sala_id UUID,
  sala_nombre VARCHAR,
  año INTEGER,
  mes INTEGER,
  quincena INTEGER,
  total_maquinas_apagadas INTEGER,
  total_incidencias_maquinas INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cqm.sala_id,
    s.nombre as sala_nombre,
    cqm.año,
    cqm.mes,
    cqm.quincena,
    cqm.total_maquinas_apagadas,
    cqm.total_incidencias_maquinas
  FROM public.conteos_quincenales_maquinas cqm
  JOIN public.salas s ON cqm.sala_id = s.id
  WHERE (p_año IS NULL OR cqm.año = p_año)
    AND (p_mes IS NULL OR cqm.mes = p_mes)
  ORDER BY cqm.año DESC, cqm.mes DESC, cqm.quincena DESC, s.nombre;
END;
$$;

-- 8. Trigger para actualizar conteos automáticos de máquinas
CREATE OR REPLACE FUNCTION public.actualizar_conteos_automaticos_maquinas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clasificacion_nombre TEXT;
  cantidad_maquinas INTEGER;
BEGIN
  -- Solo procesar si la incidencia es aprobada y tiene número de máquinas
  IF NEW.estado = 'aprobado' AND NEW.tiempo_minutos IS NOT NULL AND NEW.tiempo_minutos > 0 AND NEW.sala_id IS NOT NULL THEN
    
    -- Obtener el nombre de la clasificación
    SELECT nombre INTO clasificacion_nombre
    FROM public.clasificaciones
    WHERE id = NEW.clasificacion_id;
    
    -- Verificar si es incidencia de máquinas apagadas
    IF clasificacion_nombre IS NOT NULL THEN
      clasificacion_nombre := LOWER(clasificacion_nombre);
      
      IF clasificacion_nombre LIKE '%maquina%' AND clasificacion_nombre LIKE '%apagada%' THEN
        cantidad_maquinas := NEW.tiempo_minutos; -- Usamos tiempo_minutos para almacenar cantidad de máquinas
        
        -- Actualizar los conteos quincenales de máquinas
        PERFORM public.actualizar_conteo_quincenal_maquinas(
          NEW.sala_id,
          cantidad_maquinas,
          NEW.fecha_incidencia::date
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 9. Crear trigger para conteos automáticos de máquinas
CREATE TRIGGER trigger_actualizar_conteos_maquinas
  AFTER INSERT OR UPDATE ON public.incidencias
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_conteos_automaticos_maquinas();

-- 10. Agregar trigger para updated_at en la nueva tabla
CREATE TRIGGER update_conteos_quincenales_maquinas_updated_at
  BEFORE UPDATE ON public.conteos_quincenales_maquinas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();