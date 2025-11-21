
-- Crear tabla para las salas de monitoreo
CREATE TABLE public.salas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR NOT NULL,
  descripcion TEXT,
  ubicacion VARCHAR,
  numero_camaras INTEGER DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear trigger para actualizar updated_at en salas
CREATE TRIGGER handle_updated_at_salas
  BEFORE UPDATE ON public.salas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Agregar columna sala_id a la tabla incidencias
ALTER TABLE public.incidencias 
ADD COLUMN sala_id UUID REFERENCES public.salas(id);

-- Crear tabla para reportes consolidados diarios
CREATE TABLE public.reportes_consolidados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha_reporte DATE NOT NULL,
  total_incidencias INTEGER NOT NULL DEFAULT 0,
  incidencias_criticas INTEGER NOT NULL DEFAULT 0,
  incidencias_altas INTEGER NOT NULL DEFAULT 0,
  incidencias_medias INTEGER NOT NULL DEFAULT 0,
  incidencias_bajas INTEGER NOT NULL DEFAULT 0,
  areas_afectadas INTEGER NOT NULL DEFAULT 0,
  salas_afectadas INTEGER NOT NULL DEFAULT 0,
  archivo_pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fecha_reporte)
);

-- Crear trigger para actualizar updated_at en reportes_consolidados
CREATE TRIGGER handle_updated_at_reportes_consolidados
  BEFORE UPDATE ON public.reportes_consolidados
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insertar salas de ejemplo
INSERT INTO public.salas (nombre, descripcion, ubicacion, numero_camaras) VALUES
('Sala Principal', 'Área principal de juegos', 'Planta Baja - Zona Central', 8),
('Sala VIP', 'Área exclusiva para clientes VIP', 'Segundo Piso - Zona Norte', 4),
('Área de Máquinas', 'Zona de máquinas tragamonedas', 'Planta Baja - Zona Este', 12),
('Bar y Restaurante', 'Área de servicios gastronómicos', 'Planta Baja - Zona Oeste', 6),
('Recepción y Lobby', 'Área de ingreso y recepción', 'Planta Baja - Entrada', 3),
('Área de Mesas', 'Zona de juegos de mesa', 'Planta Baja - Zona Sur', 10),
('Oficinas Administrativas', 'Área administrativa', 'Segundo Piso - Zona Sur', 2),
('Estacionamiento', 'Área de estacionamiento', 'Exterior', 4);

-- Crear función para generar reporte consolidado diario
CREATE OR REPLACE FUNCTION public.generar_reporte_consolidado(fecha_objetivo DATE DEFAULT CURRENT_DATE)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  reporte_id UUID;
  total_inc INTEGER;
  criticas_inc INTEGER;
  altas_inc INTEGER;
  medias_inc INTEGER;
  bajas_inc INTEGER;
  areas_count INTEGER;
  salas_count INTEGER;
BEGIN
  -- Calcular estadísticas del día
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE prioridad = 'critica'),
    COUNT(*) FILTER (WHERE prioridad = 'alta'),
    COUNT(*) FILTER (WHERE prioridad = 'media'),
    COUNT(*) FILTER (WHERE prioridad = 'baja')
  INTO total_inc, criticas_inc, altas_inc, medias_inc, bajas_inc
  FROM public.incidencias 
  WHERE DATE(fecha_incidencia) = fecha_objetivo;

  -- Contar áreas afectadas
  SELECT COUNT(DISTINCT area_id)
  INTO areas_count
  FROM public.incidencias 
  WHERE DATE(fecha_incidencia) = fecha_objetivo;

  -- Contar salas afectadas
  SELECT COUNT(DISTINCT sala_id)
  INTO salas_count
  FROM public.incidencias 
  WHERE DATE(fecha_incidencia) = fecha_objetivo AND sala_id IS NOT NULL;

  -- Insertar o actualizar reporte consolidado
  INSERT INTO public.reportes_consolidados (
    fecha_reporte, total_incidencias, incidencias_criticas, 
    incidencias_altas, incidencias_medias, incidencias_bajas,
    areas_afectadas, salas_afectadas
  ) VALUES (
    fecha_objetivo, total_inc, criticas_inc, 
    altas_inc, medias_inc, bajas_inc,
    areas_count, salas_count
  )
  ON CONFLICT (fecha_reporte) 
  DO UPDATE SET
    total_incidencias = EXCLUDED.total_incidencias,
    incidencias_criticas = EXCLUDED.incidencias_criticas,
    incidencias_altas = EXCLUDED.incidencias_altas,
    incidencias_medias = EXCLUDED.incidencias_medias,
    incidencias_bajas = EXCLUDED.incidencias_bajas,
    areas_afectadas = EXCLUDED.areas_afectadas,
    salas_afectadas = EXCLUDED.salas_afectadas,
    updated_at = now()
  RETURNING id INTO reporte_id;

  RETURN reporte_id;
END;
$$;

-- Crear mapeo inteligente entre clasificaciones y áreas (tabla de configuración)
CREATE TABLE public.clasificacion_area_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clasificacion_id UUID NOT NULL REFERENCES public.clasificaciones(id),
  area_id UUID NOT NULL REFERENCES public.areas(id),
  prioridad_sugerida VARCHAR DEFAULT 'media',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clasificacion_id, area_id)
);

-- Insertar algunos mapeos de ejemplo (esto se puede configurar según las necesidades)
-- Primero necesitamos obtener los IDs de clasificaciones y áreas existentes
-- Estos INSERT se ejecutarán solo si existen los datos correspondientes
INSERT INTO public.clasificacion_area_mapping (clasificacion_id, area_id, prioridad_sugerida)
SELECT c.id, a.id, 'alta'
FROM public.clasificaciones c, public.areas a
WHERE c.nombre ILIKE '%técnico%' AND a.nombre ILIKE '%mantenimiento%'
ON CONFLICT (clasificacion_id, area_id) DO NOTHING;

INSERT INTO public.clasificacion_area_mapping (clasificacion_id, area_id, prioridad_sugerida)
SELECT c.id, a.id, 'critica'
FROM public.clasificaciones c, public.areas a
WHERE c.nombre ILIKE '%seguridad%' AND a.nombre ILIKE '%seguridad%'
ON CONFLICT (clasificacion_id, area_id) DO NOTHING;
