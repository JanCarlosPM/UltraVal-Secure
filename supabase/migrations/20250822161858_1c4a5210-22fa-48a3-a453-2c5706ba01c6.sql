-- Crear tabla para pagos del módulo 724
CREATE TABLE public.pagos_724 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombres VARCHAR NOT NULL,
  apellidos VARCHAR NOT NULL,
  monto_pagar DECIMAL(10,2) NOT NULL,
  foto_documento_url TEXT,
  usuario_registro UUID NOT NULL,
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_pago TIME NOT NULL DEFAULT CURRENT_TIME,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.pagos_724 ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pagos_724
CREATE POLICY "Usuarios autenticados pueden ver pagos_724"
ON public.pagos_724
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'supervisor_monitoreo', 'rrhh', 'supervisor_salas', 'finanzas', 'monitor', 'gestor_solicitudes')
  )
);

CREATE POLICY "Usuarios autenticados pueden crear pagos_724"
ON public.pagos_724
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = usuario_registro AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'supervisor_monitoreo', 'rrhh', 'supervisor_salas', 'finanzas', 'monitor', 'gestor_solicitudes')
  )
);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_pagos_724_updated_at
  BEFORE UPDATE ON public.pagos_724
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Crear vista para estadísticas de pagos por fecha
CREATE OR REPLACE VIEW public.estadisticas_pagos_724 AS
SELECT 
  fecha_pago,
  COUNT(*) as total_pagos,
  SUM(monto_pagar) as suma_total,
  AVG(monto_pagar) as promedio_pago,
  MIN(monto_pagar) as pago_minimo,
  MAX(monto_pagar) as pago_maximo
FROM public.pagos_724
GROUP BY fecha_pago
ORDER BY fecha_pago DESC;

-- Función para obtener estadísticas generales
CREATE OR REPLACE FUNCTION public.obtener_estadisticas_generales_724()
RETURNS TABLE(
  total_pagos_historico INTEGER,
  suma_total_historica DECIMAL,
  pagos_hoy INTEGER,
  suma_hoy DECIMAL,
  pagos_mes_actual INTEGER,
  suma_mes_actual DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM public.pagos_724) as total_pagos_historico,
    (SELECT COALESCE(SUM(monto_pagar), 0) FROM public.pagos_724) as suma_total_historica,
    (SELECT COUNT(*)::INTEGER FROM public.pagos_724 WHERE fecha_pago = CURRENT_DATE) as pagos_hoy,
    (SELECT COALESCE(SUM(monto_pagar), 0) FROM public.pagos_724 WHERE fecha_pago = CURRENT_DATE) as suma_hoy,
    (SELECT COUNT(*)::INTEGER FROM public.pagos_724 WHERE DATE_PART('year', fecha_pago) = DATE_PART('year', CURRENT_DATE) AND DATE_PART('month', fecha_pago) = DATE_PART('month', CURRENT_DATE)) as pagos_mes_actual,
    (SELECT COALESCE(SUM(monto_pagar), 0) FROM public.pagos_724 WHERE DATE_PART('year', fecha_pago) = DATE_PART('year', CURRENT_DATE) AND DATE_PART('month', fecha_pago) = DATE_PART('month', CURRENT_DATE)) as suma_mes_actual;
END;
$$;