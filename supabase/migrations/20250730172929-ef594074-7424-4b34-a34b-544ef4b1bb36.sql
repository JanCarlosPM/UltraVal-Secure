-- Crear tabla de solicitudes
CREATE TABLE public.solicitudes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo VARCHAR NOT NULL,
  descripcion TEXT NOT NULL,
  area_id UUID NOT NULL REFERENCES public.areas(id),
  solicitante_id UUID NOT NULL,
  estado VARCHAR NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptada', 'en_ejecucion', 'cerrada')),
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_aceptacion TIMESTAMP WITH TIME ZONE,
  aceptada_por UUID,
  fecha_cierre TIMESTAMP WITH TIME ZONE,
  cerrada_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.solicitudes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Todos pueden crear solicitudes" 
ON public.solicitudes 
FOR INSERT 
WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "Todos pueden ver solicitudes" 
ON public.solicitudes 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Solo usuarios con acceso al área pueden actualizar solicitudes" 
ON public.solicitudes 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR 
  user_has_area_access(auth.uid(), area_id)
);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_solicitudes_updated_at
BEFORE UPDATE ON public.solicitudes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Función para calcular días pendientes
CREATE OR REPLACE FUNCTION public.calcular_dias_pendientes(p_solicitud_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE SECURITY DEFINER
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