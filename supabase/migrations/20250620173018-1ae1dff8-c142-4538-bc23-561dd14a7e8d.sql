
-- Crear tabla de áreas de la empresa
CREATE TABLE public.areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de clasificaciones de incidencias
CREATE TABLE public.clasificaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  color VARCHAR(7) DEFAULT '#6B7280', -- Color hex para mostrar en UI
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla principal de incidencias
CREATE TABLE public.incidencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT NOT NULL,
  observaciones TEXT,
  area_id UUID NOT NULL REFERENCES public.areas(id),
  clasificacion_id UUID NOT NULL REFERENCES public.clasificaciones(id),
  estado VARCHAR(50) NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'en_proceso', 'resuelta', 'cerrada')),
  prioridad VARCHAR(20) NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),
  reportado_por VARCHAR(100) NOT NULL,
  fecha_incidencia TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_resolucion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para imágenes de incidencias
CREATE TABLE public.imagenes_incidencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incidencia_id UUID NOT NULL REFERENCES public.incidencias(id) ON DELETE CASCADE,
  nombre_archivo VARCHAR(255) NOT NULL,
  url_imagen TEXT NOT NULL,
  descripcion TEXT,
  tamaño_bytes INTEGER,
  tipo_archivo VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear bucket de almacenamiento para imágenes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('incidencias-images', 'incidencias-images', true);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clasificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imagenes_incidencias ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para áreas (acceso público para lectura)
CREATE POLICY "Todos pueden ver áreas activas" 
  ON public.areas FOR SELECT 
  USING (activo = true);

CREATE POLICY "Solo administradores pueden modificar áreas" 
  ON public.areas FOR ALL 
  USING (false);

-- Políticas RLS para clasificaciones (acceso público para lectura)
CREATE POLICY "Todos pueden ver clasificaciones activas" 
  ON public.clasificaciones FOR SELECT 
  USING (activo = true);

CREATE POLICY "Solo administradores pueden modificar clasificaciones" 
  ON public.clasificaciones FOR ALL 
  USING (false);

-- Políticas RLS para incidencias (acceso público para el sistema de monitoreo)
CREATE POLICY "Todos pueden ver incidencias" 
  ON public.incidencias FOR SELECT 
  USING (true);

CREATE POLICY "Todos pueden crear incidencias" 
  ON public.incidencias FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Todos pueden actualizar incidencias" 
  ON public.incidencias FOR UPDATE 
  USING (true);

-- Políticas RLS para imágenes de incidencias
CREATE POLICY "Todos pueden ver imágenes de incidencias" 
  ON public.imagenes_incidencias FOR SELECT 
  USING (true);

CREATE POLICY "Todos pueden crear imágenes de incidencias" 
  ON public.imagenes_incidencias FOR INSERT 
  WITH CHECK (true);

-- Política para el bucket de almacenamiento
CREATE POLICY "Acceso público a imágenes de incidencias" 
  ON storage.objects FOR ALL 
  USING (bucket_id = 'incidencias-images');

-- Insertar datos iniciales para áreas
INSERT INTO public.areas (nombre, descripcion) VALUES
  ('Tecnología', 'Departamento de sistemas y tecnología'),
  ('Recursos Humanos', 'Gestión de personal y recursos humanos'),
  ('Operaciones', 'Operaciones y procesos de la empresa'),
  ('Finanzas', 'Departamento financiero y contable'),
  ('Comercial', 'Ventas y atención al cliente'),
  ('Mantenimiento', 'Mantenimiento de instalaciones y equipos');

-- Insertar datos iniciales para clasificaciones
INSERT INTO public.clasificaciones (nombre, descripcion, color) VALUES
  ('Falla de Sistema', 'Problemas con sistemas informáticos', '#EF4444'),
  ('Falla de Equipo', 'Problemas con equipos y maquinaria', '#F97316'),
  ('Incidente de Seguridad', 'Problemas relacionados con seguridad', '#DC2626'),
  ('Problema de Red', 'Problemas de conectividad y red', '#8B5CF6'),
  ('Error de Usuario', 'Errores causados por usuarios', '#06B6D4'),
  ('Mantenimiento', 'Actividades de mantenimiento', '#10B981'),
  ('Mejora', 'Solicitudes de mejora', '#3B82F6'),
  ('Otro', 'Otras incidencias no clasificadas', '#6B7280');

-- Crear función para actualizar timestamp de updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para actualizar updated_at automáticamente
CREATE TRIGGER handle_areas_updated_at
    BEFORE UPDATE ON public.areas
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_clasificaciones_updated_at
    BEFORE UPDATE ON public.clasificaciones
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_incidencias_updated_at
    BEFORE UPDATE ON public.incidencias
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_incidencias_area_id ON public.incidencias(area_id);
CREATE INDEX idx_incidencias_clasificacion_id ON public.incidencias(clasificacion_id);
CREATE INDEX idx_incidencias_fecha_incidencia ON public.incidencias(fecha_incidencia);
CREATE INDEX idx_incidencias_estado ON public.incidencias(estado);
CREATE INDEX idx_imagenes_incidencias_incidencia_id ON public.imagenes_incidencias(incidencia_id);
