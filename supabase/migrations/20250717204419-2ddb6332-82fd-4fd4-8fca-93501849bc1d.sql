-- Primero, eliminar las políticas RLS problemáticas para chat_participants
DROP POLICY IF EXISTS "Usuarios pueden ver participantes de sus salas" ON public.chat_participants;

-- Crear función de seguridad para verificar acceso a salas de chat
CREATE OR REPLACE FUNCTION public.user_can_access_chat_room(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants
    WHERE user_id = _user_id AND room_id = _room_id
  )
$$;

-- Crear nueva política RLS para chat_participants usando la función de seguridad
CREATE POLICY "Usuarios pueden ver participantes de sus salas" 
ON public.chat_participants 
FOR SELECT 
USING (public.user_can_access_chat_room(auth.uid(), room_id));

-- Revisar el problema de clasificaciones múltiples para incidencias
-- Verificar si existe la tabla incidencia_clasificaciones para manejar relación many-to-many
DO $$
BEGIN
  -- Si no existe, crear la relación many-to-many
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'incidencia_clasificaciones') THEN
    CREATE TABLE public.incidencia_clasificaciones (
      id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      incidencia_id uuid NOT NULL REFERENCES public.incidencias(id) ON DELETE CASCADE,
      clasificacion_id uuid NOT NULL REFERENCES public.clasificaciones(id) ON DELETE CASCADE,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      UNIQUE(incidencia_id, clasificacion_id)
    );

    -- Enable RLS
    ALTER TABLE public.incidencia_clasificaciones ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Monitores pueden crear clasificaciones de incidencias" 
    ON public.incidencia_clasificaciones 
    FOR INSERT 
    WITH CHECK (has_role(auth.uid(), 'monitor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

    CREATE POLICY "Todos pueden ver clasificaciones de incidencias" 
    ON public.incidencia_clasificaciones 
    FOR SELECT 
    USING (true);
  END IF;
END $$;