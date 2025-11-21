-- Corregir la función para tener el search_path correcto
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
SET search_path = public
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