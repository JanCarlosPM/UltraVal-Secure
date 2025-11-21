
-- Actualizar la tabla de mensajes para incluir estado
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read'));

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created 
ON public.chat_messages(room_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_status 
ON public.chat_messages(user_id, status);

CREATE INDEX IF NOT EXISTS idx_chat_participants_room_user 
ON public.chat_participants(room_id, user_id);

-- Función para marcar mensajes como leídos
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(
  _room_id UUID,
  _user_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Verificar que el usuario tiene acceso a la sala
  IF NOT user_can_access_chat_room(_user_id, _room_id) THEN
    RAISE EXCEPTION 'Usuario no tiene acceso a esta sala de chat';
  END IF;
  
  -- Marcar mensajes como leídos
  UPDATE public.chat_messages 
  SET status = 'read', updated_at = now()
  WHERE room_id = _room_id 
    AND user_id != _user_id 
    AND status != 'read';
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Actualizar last_read_at del participante
  UPDATE public.chat_participants 
  SET last_read_at = now()
  WHERE room_id = _room_id AND user_id = _user_id;
  
  RETURN updated_count;
END;
$$;

-- Función para crear chat grupal
CREATE OR REPLACE FUNCTION public.create_group_chat(
  _name TEXT,
  _description TEXT,
  _creator_id UUID,
  _participant_ids UUID[]
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  room_id UUID;
  participant_id UUID;
BEGIN
  -- Crear nueva sala grupal
  INSERT INTO public.chat_rooms (name, description, is_group, created_by)
  VALUES (_name, _description, true, _creator_id)
  RETURNING id INTO room_id;
  
  -- Agregar el creador como participante
  INSERT INTO public.chat_participants (room_id, user_id) 
  VALUES (room_id, _creator_id);
  
  -- Agregar otros participantes
  FOREACH participant_id IN ARRAY _participant_ids
  LOOP
    IF participant_id != _creator_id THEN
      INSERT INTO public.chat_participants (room_id, user_id) 
      VALUES (room_id, participant_id)
      ON CONFLICT (room_id, user_id) DO NOTHING;
    END IF;
  END LOOP;
  
  RETURN room_id;
END;
$$;

-- Función para agregar participante a chat grupal
CREATE OR REPLACE FUNCTION public.add_participant_to_group(
  _room_id UUID,
  _user_id UUID,
  _new_participant_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  room_info RECORD;
BEGIN
  -- Verificar que es un chat grupal y el usuario tiene acceso
  SELECT is_group, created_by INTO room_info
  FROM public.chat_rooms 
  WHERE id = _room_id;
  
  IF NOT FOUND OR NOT room_info.is_group THEN
    RETURN FALSE;
  END IF;
  
  -- Solo el creador o admin puede agregar participantes
  IF room_info.created_by != _user_id AND NOT has_role(_user_id, 'admin') THEN
    RETURN FALSE;
  END IF;
  
  -- Agregar participante
  INSERT INTO public.chat_participants (room_id, user_id) 
  VALUES (_room_id, _new_participant_id)
  ON CONFLICT (room_id, user_id) DO NOTHING;
  
  RETURN TRUE;
END;
$$;

-- Habilitar realtime para todas las tablas de chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;

-- Configurar REPLICA IDENTITY para capturar cambios completos
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_participants REPLICA IDENTITY FULL;
ALTER TABLE public.chat_rooms REPLICA IDENTITY FULL;
