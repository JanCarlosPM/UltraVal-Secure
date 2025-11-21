-- Agregar los roles faltantes para áreas
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'finanzas';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'logistica';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'mantenimiento';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'supervision_salas';

-- Crear tabla para mapear roles con áreas específicas
CREATE TABLE IF NOT EXISTS public.role_area_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role app_role NOT NULL,
  area_id UUID REFERENCES public.areas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role, area_id)
);

-- Insertar mapeos de roles con áreas
INSERT INTO public.role_area_mapping (role, area_id) 
SELECT 'rrhh', id FROM public.areas WHERE nombre = 'Recursos Humanos'
ON CONFLICT (role, area_id) DO NOTHING;

INSERT INTO public.role_area_mapping (role, area_id) 
SELECT 'finanzas', id FROM public.areas WHERE nombre = 'Finanzas'
ON CONFLICT (role, area_id) DO NOTHING;

INSERT INTO public.role_area_mapping (role, area_id) 
SELECT 'logistica', id FROM public.areas WHERE nombre = 'Logística'
ON CONFLICT (role, area_id) DO NOTHING;

INSERT INTO public.role_area_mapping (role, area_id) 
SELECT 'mantenimiento', id FROM public.areas WHERE nombre = 'Mantenimiento'
ON CONFLICT (role, area_id) DO NOTHING;

INSERT INTO public.role_area_mapping (role, area_id) 
SELECT 'supervision_salas', id FROM public.areas WHERE nombre = 'Supervisión Salas'
ON CONFLICT (role, area_id) DO NOTHING;

-- Habilitar RLS en la nueva tabla
ALTER TABLE public.role_area_mapping ENABLE ROW LEVEL SECURITY;

-- Política para que solo admins puedan gestionar mapeos
CREATE POLICY "Solo administradores pueden gestionar mapeos de roles y áreas"
ON public.role_area_mapping
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Crear función para obtener áreas por rol de usuario
CREATE OR REPLACE FUNCTION public.get_user_role_areas(_user_id UUID)
RETURNS TABLE(area_id UUID)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT ram.area_id
  FROM public.profiles p
  JOIN public.role_area_mapping ram ON p.role = ram.role
  WHERE p.id = _user_id
$$;