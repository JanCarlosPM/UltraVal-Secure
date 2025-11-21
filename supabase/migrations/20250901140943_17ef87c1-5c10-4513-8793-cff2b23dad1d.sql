-- Crear tabla para conceptos de pago
CREATE TABLE public.conceptos_pago (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para solicitudes de pago
CREATE TABLE public.solicitudes_pago (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_solicitud VARCHAR GENERATED ALWAYS AS ('SP-' || LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::text, 6, '0')) STORED,
  sala_id UUID NOT NULL REFERENCES public.salas(id),
  concepto_pago_id UUID NOT NULL REFERENCES public.conceptos_pago(id),
  monto DECIMAL(12,2) NOT NULL,
  descripcion TEXT NOT NULL,
  estado VARCHAR NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'pagado')),
  solicitante_id UUID NOT NULL REFERENCES auth.users(id),
  aprobado_por UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  fecha_pago TIMESTAMP WITH TIME ZONE,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para documentos de solicitudes de pago
CREATE TABLE public.documentos_solicitudes_pago (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitud_pago_id UUID NOT NULL REFERENCES public.solicitudes_pago(id) ON DELETE CASCADE,
  url_documento TEXT NOT NULL,
  nombre_archivo VARCHAR NOT NULL,
  tipo_archivo VARCHAR,
  tamaño_bytes INTEGER,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar conceptos de pago por defecto
INSERT INTO public.conceptos_pago (nombre, descripcion) VALUES 
('Mantenimiento', 'Gastos de mantenimiento y reparaciones'),
('Suministros', 'Compra de suministros y materiales'),
('Servicios', 'Pago de servicios externos'),
('Combustible', 'Gastos de combustible y transporte'),
('Limpieza', 'Productos y servicios de limpieza'),
('Seguridad', 'Servicios de seguridad'),
('Otros', 'Otros gastos no categorizados');

-- Enable RLS
ALTER TABLE public.conceptos_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_solicitudes_pago ENABLE ROW LEVEL SECURITY;

-- RLS Policies para conceptos_pago
CREATE POLICY "Usuarios autenticados pueden ver conceptos de pago"
ON public.conceptos_pago FOR SELECT
TO authenticated
USING (activo = true);

CREATE POLICY "Solo administradores pueden modificar conceptos de pago"
ON public.conceptos_pago FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies para solicitudes_pago
CREATE POLICY "Usuarios pueden crear solicitudes de pago"
ON public.solicitudes_pago FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = solicitante_id AND
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::app_role, 'supervisor_monitoreo'::app_role, 'rrhh'::app_role, 'supervisor_salas'::app_role, 'finanzas'::app_role, 'monitor'::app_role, 'gestor_solicitudes'::app_role])
  )
);

CREATE POLICY "Usuarios pueden ver solicitudes de pago según su rol"
ON public.solicitudes_pago FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::app_role, 'supervisor_monitoreo'::app_role, 'rrhh'::app_role, 'supervisor_salas'::app_role, 'finanzas'::app_role, 'monitor'::app_role, 'gestor_solicitudes'::app_role])
  ) AND (
    -- Admins y finanzas pueden ver todas
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = ANY(ARRAY['admin'::app_role, 'finanzas'::app_role])
    )
    -- Otros solo pueden ver las propias
    OR solicitante_id = auth.uid()
  )
);

CREATE POLICY "Solo finanzas y admins pueden aprobar solicitudes de pago"
ON public.solicitudes_pago FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::app_role, 'finanzas'::app_role])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::app_role, 'finanzas'::app_role])
  )
);

-- RLS Policies para documentos_solicitudes_pago
CREATE POLICY "Usuarios pueden crear documentos de solicitudes de pago"
ON public.documentos_solicitudes_pago FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::app_role, 'supervisor_monitoreo'::app_role, 'rrhh'::app_role, 'supervisor_salas'::app_role, 'finanzas'::app_role, 'monitor'::app_role, 'gestor_solicitudes'::app_role])
  )
);

CREATE POLICY "Usuarios pueden ver documentos de solicitudes de pago"
ON public.documentos_solicitudes_pago FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::app_role, 'supervisor_monitoreo'::app_role, 'rrhh'::app_role, 'supervisor_salas'::app_role, 'finanzas'::app_role, 'monitor'::app_role, 'gestor_solicitudes'::app_role])
  )
);

-- Crear función para obtener estadísticas de solicitudes de pago
CREATE OR REPLACE FUNCTION public.obtener_estadisticas_solicitudes_pago()
RETURNS TABLE(
  total_solicitudes INTEGER,
  solicitudes_pendientes INTEGER,
  solicitudes_aprobadas INTEGER,
  solicitudes_rechazadas INTEGER,
  solicitudes_pagadas INTEGER,
  monto_total_pendiente DECIMAL,
  monto_total_aprobado DECIMAL,
  monto_total_pagado DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_solicitudes,
    COUNT(*) FILTER (WHERE estado = 'pendiente')::INTEGER as solicitudes_pendientes,
    COUNT(*) FILTER (WHERE estado = 'aprobado')::INTEGER as solicitudes_aprobadas,
    COUNT(*) FILTER (WHERE estado = 'rechazado')::INTEGER as solicitudes_rechazadas,
    COUNT(*) FILTER (WHERE estado = 'pagado')::INTEGER as solicitudes_pagadas,
    COALESCE(SUM(monto) FILTER (WHERE estado = 'pendiente'), 0) as monto_total_pendiente,
    COALESCE(SUM(monto) FILTER (WHERE estado = 'aprobado'), 0) as monto_total_aprobado,
    COALESCE(SUM(monto) FILTER (WHERE estado = 'pagado'), 0) as monto_total_pagado
  FROM public.solicitudes_pago;
END;
$$;

-- Crear triggers para updated_at
CREATE TRIGGER update_conceptos_pago_updated_at
    BEFORE UPDATE ON public.conceptos_pago
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_solicitudes_pago_updated_at
    BEFORE UPDATE ON public.solicitudes_pago
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();