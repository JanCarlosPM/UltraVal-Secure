-- Crear tabla para mapear roles con áreas específicas
CREATE TABLE IF NOT EXISTS public.role_area_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role app_role NOT NULL,
  area_id UUID REFERENCES public.areas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role, area_id)
);

-- Habilitar RLS en la nueva tabla
ALTER TABLE public.role_area_mapping ENABLE ROW LEVEL SECURITY;

-- Política para que solo admins puedan gestionar mapeos
CREATE POLICY "Solo administradores pueden gestionar mapeos de roles y áreas"
ON public.role_area_mapping
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));