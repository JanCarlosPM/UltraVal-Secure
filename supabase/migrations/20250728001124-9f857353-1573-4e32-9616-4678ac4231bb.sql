-- Habilitar RLS en tablas que faltan
ALTER TABLE public.salas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clasificacion_area ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clasificacion_area_mapping ENABLE ROW LEVEL SECURITY;

-- Crear políticas básicas para salas
CREATE POLICY "Usuarios autenticados pueden ver salas"
ON public.salas
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Solo administradores pueden modificar salas"
ON public.salas
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Crear políticas para clasificacion_area
CREATE POLICY "Usuarios autenticados pueden ver clasificacion_area"
ON public.clasificacion_area
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Solo administradores pueden modificar clasificacion_area"
ON public.clasificacion_area
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Crear políticas para clasificacion_area_mapping
CREATE POLICY "Usuarios autenticados pueden ver clasificacion_area_mapping"
ON public.clasificacion_area_mapping
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Solo administradores pueden modificar clasificacion_area_mapping"
ON public.clasificacion_area_mapping
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));