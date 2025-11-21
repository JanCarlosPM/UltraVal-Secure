
-- Crear tabla para almacenar conteos quincenales por sala
CREATE TABLE public.conteos_quincenales_sala (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sala_id UUID NOT NULL REFERENCES public.salas(id),
  año INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  quincena INTEGER NOT NULL CHECK (quincena IN (1, 2)), -- 1 = primera quincena, 2 = segunda quincena
  minutos_ingresos_tardios INTEGER NOT NULL DEFAULT 0,
  minutos_cierres_prematuros INTEGER NOT NULL DEFAULT 0,
  total_incidencias_ingresos INTEGER NOT NULL DEFAULT 0,
  total_incidencias_cierres INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sala_id, año, mes, quincena)
);

-- Crear trigger para actualizar updated_at
CREATE TRIGGER trigger_conteos_quincenales_sala_updated_at
  BEFORE UPDATE ON public.conteos_quincenales_sala
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Crear función para obtener o crear conteo quincenal por sala
CREATE OR REPLACE FUNCTION public.obtener_conteo_quincenal_sala(
  p_sala_id UUID,
  p_fecha DATE DEFAULT CURRENT_DATE
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
  FROM public.conteos_quincenales_sala
  WHERE sala_id = p_sala_id
    AND año = año_actual
    AND mes = mes_actual
    AND quincena = quincena_actual;
  
  -- Si no existe, crear nuevo conteo
  IF conteo_id IS NULL THEN
    INSERT INTO public.conteos_quincenales_sala (
      sala_id, año, mes, quincena
    ) VALUES (
      p_sala_id, año_actual, mes_actual, quincena_actual
    ) RETURNING id INTO conteo_id;
  END IF;
  
  RETURN conteo_id;
END;
$function$;

-- Crear función para actualizar conteo quincenal por sala
CREATE OR REPLACE FUNCTION public.actualizar_conteo_quincenal_sala(
  p_sala_id UUID,
  p_tipo_incidencia TEXT, -- 'ingreso_tardio' o 'cierre_prematuro'
  p_minutos INTEGER,
  p_fecha DATE DEFAULT CURRENT_DATE
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  conteo_id UUID;
BEGIN
  -- Obtener o crear conteo quincenal
  conteo_id := public.obtener_conteo_quincenal_sala(p_sala_id, p_fecha);
  
  -- Actualizar conteo según el tipo
  IF p_tipo_incidencia = 'ingreso_tardio' THEN
    UPDATE public.conteos_quincenales_sala
    SET 
      minutos_ingresos_tardios = minutos_ingresos_tardios + p_minutos,
      total_incidencias_ingresos = total_incidencias_ingresos + 1,
      updated_at = now()
    WHERE id = conteo_id;
  ELSIF p_tipo_incidencia = 'cierre_prematuro' THEN
    UPDATE public.conteos_quincenales_sala
    SET 
      minutos_cierres_prematuros = minutos_cierres_prematuros + p_minutos,
      total_incidencias_cierres = total_incidencias_cierres + 1,
      updated_at = now()
    WHERE id = conteo_id;
  ELSE
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Crear función para obtener estadísticas quincenales por sala
CREATE OR REPLACE FUNCTION public.obtener_estadisticas_quincenales_sala(
  p_año INTEGER DEFAULT NULL,
  p_mes INTEGER DEFAULT NULL
) RETURNS TABLE(
  sala_id UUID,
  sala_nombre TEXT,
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

-- Crear políticas RLS para la tabla conteos_quincenales_sala
ALTER TABLE public.conteos_quincenales_sala ENABLE ROW LEVEL SECURITY;

-- Política para visualizar conteos (todos los usuarios autenticados)
CREATE POLICY "Usuarios autenticados pueden ver conteos quincenales"
  ON public.conteos_quincenales_sala
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política para insertar/actualizar conteos (solo roles específicos)
CREATE POLICY "Solo roles específicos pueden modificar conteos"
  ON public.conteos_quincenales_sala
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR
    has_role(auth.uid(), 'monitor'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR
    has_role(auth.uid(), 'monitor'::app_role)
  );
