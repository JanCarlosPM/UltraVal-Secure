-- Crear tabla de billeteros
CREATE TABLE public.billeteros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR NOT NULL UNIQUE,
  tipo VARCHAR NOT NULL CHECK (tipo IN ('MJ', 'PK')),
  estado VARCHAR NOT NULL DEFAULT 'en_stock' CHECK (estado IN ('en_stock', 'reparacion', 'en_programacion', 'descarte')),
  sala_id UUID REFERENCES public.salas(id),
  numero_maquina VARCHAR,
  descripcion TEXT,
  observaciones TEXT,
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  usuario_registro UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de movimientos de billeteros
CREATE TABLE public.movimientos_billeteros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  billetero_id UUID NOT NULL REFERENCES public.billeteros(id),
  tipo_movimiento VARCHAR NOT NULL CHECK (tipo_movimiento IN ('asignacion', 'cambio_estado', 'transferencia', 'baja')),
  estado_anterior VARCHAR,
  estado_nuevo VARCHAR,
  sala_origen_id UUID REFERENCES public.salas(id),
  sala_destino_id UUID REFERENCES public.salas(id),
  numero_maquina_anterior VARCHAR,
  numero_maquina_nuevo VARCHAR,
  motivo TEXT NOT NULL,
  observaciones TEXT,
  fecha_movimiento DATE NOT NULL DEFAULT CURRENT_DATE,
  usuario_registro UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.billeteros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_billeteros ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para billeteros
CREATE POLICY "Usuarios autenticados pueden ver billeteros"
ON public.billeteros
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden crear billeteros"
ON public.billeteros
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'supervisor_monitoreo', 'rrhh', 'finanzas', 'gestor_solicitudes')
  )
);

CREATE POLICY "Usuarios pueden actualizar billeteros"
ON public.billeteros
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'supervisor_monitoreo', 'rrhh', 'finanzas', 'gestor_solicitudes')
  )
);

-- Políticas RLS para movimientos de billeteros
CREATE POLICY "Usuarios autenticados pueden ver movimientos de billeteros"
ON public.movimientos_billeteros
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden crear movimientos de billeteros"
ON public.movimientos_billeteros
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'supervisor_monitoreo', 'rrhh', 'finanzas', 'gestor_solicitudes')
  )
);

-- Función para validar código de billetero
CREATE OR REPLACE FUNCTION public.validar_codigo_billetero(p_codigo TEXT, p_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar formato del código
  IF p_codigo !~ '^TR[0-9A-Z]+$' THEN
    RAISE EXCEPTION 'El código debe iniciar con TR seguido de números o letras mayúsculas';
  END IF;
  
  -- Verificar si el código ya existe
  IF EXISTS (
    SELECT 1 FROM public.billeteros 
    WHERE codigo = p_codigo 
    AND (p_id IS NULL OR id != p_id)
  ) THEN
    RAISE EXCEPTION 'El código % ya existe. Por favor, use un código diferente.', p_codigo;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Función para generar código automático de billetero
CREATE OR REPLACE FUNCTION public.generar_codigo_billetero()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  nuevo_codigo TEXT;
  codigo_existe BOOLEAN;
  contador INTEGER := 1;
BEGIN
  LOOP
    -- Generar código con formato TR + B + número de 5 dígitos
    nuevo_codigo := 'TRB' || LPAD(contador::TEXT, 5, '0');
    
    -- Verificar si ya existe
    SELECT EXISTS(SELECT 1 FROM public.billeteros WHERE codigo = nuevo_codigo) INTO codigo_existe;
    
    -- Si no existe, devolver el código
    IF NOT codigo_existe THEN
      RETURN nuevo_codigo;
    END IF;
    
    contador := contador + 1;
  END LOOP;
END;
$$;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_billeteros_updated_at
BEFORE UPDATE ON public.billeteros
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejorar rendimiento
CREATE INDEX idx_billeteros_codigo ON public.billeteros(codigo);
CREATE INDEX idx_billeteros_tipo ON public.billeteros(tipo);
CREATE INDEX idx_billeteros_estado ON public.billeteros(estado);
CREATE INDEX idx_billeteros_sala_id ON public.billeteros(sala_id);
CREATE INDEX idx_movimientos_billeteros_billetero_id ON public.movimientos_billeteros(billetero_id);
CREATE INDEX idx_movimientos_billeteros_fecha ON public.movimientos_billeteros(fecha_movimiento);