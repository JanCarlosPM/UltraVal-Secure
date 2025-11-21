-- Crear tabla para gestión de activos por sala
CREATE TABLE public.activos_salas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR NOT NULL UNIQUE CHECK (codigo ~ '^TR[0-9A-Z]+$'),
  nombre VARCHAR NOT NULL,
  descripcion TEXT,
  tipo_activo VARCHAR NOT NULL CHECK (tipo_activo IN ('camara', 'dvr', 'fuente_poder', 'ups', 'otro')),
  marca VARCHAR,
  modelo VARCHAR,
  numero_serie VARCHAR,
  sala_id UUID NOT NULL REFERENCES public.salas(id) ON DELETE RESTRICT,
  estado VARCHAR NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'dado_baja', 'en_mantenimiento')),
  fecha_asignacion DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_baja DATE,
  observaciones TEXT,
  valor_compra NUMERIC(12,2),
  fecha_compra DATE,
  garantia_meses INTEGER,
  proveedor VARCHAR,
  usuario_registro UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_activos_salas_codigo ON public.activos_salas(codigo);
CREATE INDEX idx_activos_salas_sala_id ON public.activos_salas(sala_id);
CREATE INDEX idx_activos_salas_tipo_activo ON public.activos_salas(tipo_activo);
CREATE INDEX idx_activos_salas_fecha_asignacion ON public.activos_salas(fecha_asignacion);
CREATE INDEX idx_activos_salas_estado ON public.activos_salas(estado);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_activos_salas_updated_at
  BEFORE UPDATE ON public.activos_salas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Función para generar código único automáticamente
CREATE OR REPLACE FUNCTION public.generar_codigo_activo()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  nuevo_codigo TEXT;
  codigo_existe BOOLEAN;
  contador INTEGER := 1;
BEGIN
  LOOP
    -- Generar código con formato TR + número de 6 dígitos
    nuevo_codigo := 'TR' || LPAD(contador::TEXT, 6, '0');
    
    -- Verificar si ya existe
    SELECT EXISTS(SELECT 1 FROM public.activos_salas WHERE codigo = nuevo_codigo) INTO codigo_existe;
    
    -- Si no existe, devolver el código
    IF NOT codigo_existe THEN
      RETURN nuevo_codigo;
    END IF;
    
    contador := contador + 1;
  END LOOP;
END;
$$;

-- Función para validar código único
CREATE OR REPLACE FUNCTION public.validar_codigo_activo(p_codigo TEXT, p_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar formato del código
  IF p_codigo !~ '^TR[0-9A-Z]+$' THEN
    RAISE EXCEPTION 'El código debe iniciar con TR seguido de números o letras mayúsculas';
  END IF;
  
  -- Verificar si el código ya existe (excluyendo el registro actual en caso de actualización)
  IF EXISTS (
    SELECT 1 FROM public.activos_salas 
    WHERE codigo = p_codigo 
    AND (p_id IS NULL OR id != p_id)
  ) THEN
    RAISE EXCEPTION 'El código % ya existe. Por favor, use un código diferente.', p_codigo;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- RLS Policies
ALTER TABLE public.activos_salas ENABLE ROW LEVEL SECURITY;

-- Política para ver activos
CREATE POLICY "Usuarios autenticados pueden ver activos"
ON public.activos_salas
FOR SELECT
TO authenticated
USING (
  auth.role() = 'authenticated'
);

-- Política para crear activos
CREATE POLICY "Usuarios pueden crear activos"
ON public.activos_salas
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = ANY(ARRAY['admin'::app_role, 'supervisor_monitoreo'::app_role, 'rrhh'::app_role, 'supervisor_salas'::app_role, 'finanzas'::app_role, 'gestor_solicitudes'::app_role])
  )
);

-- Política para actualizar activos
CREATE POLICY "Usuarios pueden actualizar activos"
ON public.activos_salas
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = ANY(ARRAY['admin'::app_role, 'supervisor_monitoreo'::app_role, 'rrhh'::app_role, 'supervisor_salas'::app_role, 'finanzas'::app_role, 'gestor_solicitudes'::app_role])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = ANY(ARRAY['admin'::app_role, 'supervisor_monitoreo'::app_role, 'rrhh'::app_role, 'supervisor_salas'::app_role, 'finanzas'::app_role, 'gestor_solicitudes'::app_role])
  )
);

-- Crear tabla para historial de movimientos de activos
CREATE TABLE public.movimientos_activos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activo_id UUID NOT NULL REFERENCES public.activos_salas(id) ON DELETE CASCADE,
  tipo_movimiento VARCHAR NOT NULL CHECK (tipo_movimiento IN ('asignacion', 'baja', 'traslado', 'mantenimiento')),
  sala_origen_id UUID REFERENCES public.salas(id),
  sala_destino_id UUID REFERENCES public.salas(id),
  fecha_movimiento DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo TEXT NOT NULL,
  observaciones TEXT,
  usuario_registro UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para movimientos
CREATE INDEX idx_movimientos_activos_activo_id ON public.movimientos_activos(activo_id);
CREATE INDEX idx_movimientos_activos_fecha ON public.movimientos_activos(fecha_movimiento);
CREATE INDEX idx_movimientos_activos_tipo ON public.movimientos_activos(tipo_movimiento);

-- RLS para movimientos
ALTER TABLE public.movimientos_activos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver movimientos"
ON public.movimientos_activos
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden crear movimientos"
ON public.movimientos_activos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = ANY(ARRAY['admin'::app_role, 'supervisor_monitoreo'::app_role, 'rrhh'::app_role, 'supervisor_salas'::app_role, 'finanzas'::app_role, 'gestor_solicitudes'::app_role])
  )
);