-- Corregir función calcular_dias_pendientes con search_path seguro
CREATE OR REPLACE FUNCTION public.calcular_dias_pendientes(p_solicitud_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN estado = 'pendiente' THEN 
        EXTRACT(DAY FROM (NOW() - fecha_creacion))::INTEGER
      ELSE 0
    END
  FROM public.solicitudes 
  WHERE id = p_solicitud_id;
$$;