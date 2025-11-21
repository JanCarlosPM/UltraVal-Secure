-- Crear tabla para relación usuario-área (para roles específicos por área)
CREATE TABLE public.user_area_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, area_id)
);

-- Habilitar RLS en user_area_access
ALTER TABLE public.user_area_access ENABLE ROW LEVEL SECURITY;

-- Política para que solo admins puedan gestionar accesos por área
CREATE POLICY "Solo administradores pueden gestionar accesos por área"
  ON public.user_area_access FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Crear tabla para clasificaciones múltiples por incidencia
CREATE TABLE public.incidencia_clasificaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incidencia_id UUID NOT NULL REFERENCES public.incidencias(id) ON DELETE CASCADE,
  clasificacion_id UUID NOT NULL REFERENCES public.clasificaciones(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(incidencia_id, clasificacion_id)
);

-- Habilitar RLS en incidencia_clasificaciones
ALTER TABLE public.incidencia_clasificaciones ENABLE ROW LEVEL SECURITY;

-- Políticas para incidencia_clasificaciones
CREATE POLICY "Monitores pueden crear clasificaciones de incidencias"
  ON public.incidencia_clasificaciones FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'monitor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Todos pueden ver clasificaciones de incidencias"
  ON public.incidencia_clasificaciones FOR SELECT
  USING (true);

-- Triggers para updated_at
CREATE TRIGGER handle_user_area_access_updated_at
  BEFORE UPDATE ON public.user_area_access
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();