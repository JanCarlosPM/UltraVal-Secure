
-- Crear tabla para auditoría de acciones de usuarios
CREATE TABLE public.user_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  user_email TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'create_incident', 'update_incident', 'login', 'logout', 'view_dashboard', etc.
  resource_type TEXT, -- 'incident', 'user', 'report', etc.
  resource_id UUID, -- ID del recurso afectado
  details JSONB, -- Detalles adicionales de la acción
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para optimizar consultas de auditoría
CREATE INDEX idx_user_actions_user_id ON public.user_actions(user_id);
CREATE INDEX idx_user_actions_created_at ON public.user_actions(created_at);
CREATE INDEX idx_user_actions_action_type ON public.user_actions(action_type);

-- Política RLS para auditoría - solo admins pueden ver todo
ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo administradores pueden ver auditoría"
  ON public.user_actions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sistema puede insertar acciones de auditoría"
  ON public.user_actions
  FOR INSERT
  WITH CHECK (true);

-- Función para registrar acciones de auditoría
CREATE OR REPLACE FUNCTION public.log_user_action(
  p_action_type TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  action_id UUID;
  user_email TEXT;
BEGIN
  -- Obtener email del usuario actual
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Insertar registro de auditoría
  INSERT INTO public.user_actions (
    user_id,
    user_email,
    action_type,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    COALESCE(user_email, 'unknown'),
    p_action_type,
    p_resource_type,
    p_resource_id,
    p_details,
    p_ip_address::INET,
    p_user_agent
  ) RETURNING id INTO action_id;

  RETURN action_id;
END;
$$;
