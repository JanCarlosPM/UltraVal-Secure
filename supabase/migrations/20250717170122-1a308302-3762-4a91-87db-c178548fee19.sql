-- Actualizar enum de roles para incluir los nuevos roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rrhh';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor_salas';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finanzas';

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

-- Crear tabla para sistema de chat
CREATE TABLE public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_group BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en chat_rooms
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- Crear tabla para participantes de chat
CREATE TABLE public.chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Habilitar RLS en chat_participants
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- Crear tabla para mensajes de chat
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para chat_rooms
CREATE POLICY "Usuarios pueden ver sus salas de chat"
  ON public.chat_rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants 
      WHERE room_id = chat_rooms.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios pueden crear salas de chat"
  ON public.chat_rooms FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Políticas para chat_participants
CREATE POLICY "Usuarios pueden ver participantes de sus salas"
  ON public.chat_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp 
      WHERE cp.room_id = chat_participants.room_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios pueden unirse a salas"
  ON public.chat_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Políticas para chat_messages
CREATE POLICY "Usuarios pueden ver mensajes de sus salas"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants 
      WHERE room_id = chat_messages.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios pueden enviar mensajes a sus salas"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.chat_participants 
      WHERE room_id = chat_messages.room_id AND user_id = auth.uid()
    )
  );

-- Función para verificar acceso por área
CREATE OR REPLACE FUNCTION public.user_has_area_access(_user_id UUID, _area_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_area_access
    WHERE user_id = _user_id AND area_id = _area_id
  ) OR public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'supervisor_monitoreo')
$$;

-- Actualizar políticas de incidencias para considerar acceso por área
DROP POLICY IF EXISTS "Usuarios con roles específicos pueden ver incidencias de su área" ON public.incidencias;
CREATE POLICY "Usuarios con roles específicos pueden ver incidencias de su área"
  ON public.incidencias FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'supervisor_monitoreo') OR
    public.has_role(auth.uid(), 'monitor') OR
    (
      (public.has_role(auth.uid(), 'finanzas') OR 
       public.has_role(auth.uid(), 'rrhh') OR 
       public.has_role(auth.uid(), 'supervisor_salas'))
      AND public.user_has_area_access(auth.uid(), area_id)
    )
  );

-- Triggers para updated_at
CREATE TRIGGER handle_user_area_access_updated_at
  BEFORE UPDATE ON public.user_area_access
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_chat_rooms_updated_at
  BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Función para crear sala de chat entre dos usuarios
CREATE OR REPLACE FUNCTION public.create_private_chat(_user1_id UUID, _user2_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  room_id UUID;
  user1_profile TEXT;
  user2_profile TEXT;
BEGIN
  -- Verificar que ambos usuarios existen
  SELECT full_name INTO user1_profile FROM public.profiles WHERE id = _user1_id;
  SELECT full_name INTO user2_profile FROM public.profiles WHERE id = _user2_id;
  
  IF user1_profile IS NULL OR user2_profile IS NULL THEN
    RAISE EXCEPTION 'Uno o ambos usuarios no existen';
  END IF;
  
  -- Verificar si ya existe una sala entre estos usuarios
  SELECT cr.id INTO room_id
  FROM public.chat_rooms cr
  WHERE cr.is_group = false
  AND EXISTS (SELECT 1 FROM public.chat_participants cp1 WHERE cp1.room_id = cr.id AND cp1.user_id = _user1_id)
  AND EXISTS (SELECT 1 FROM public.chat_participants cp2 WHERE cp2.room_id = cr.id AND cp2.user_id = _user2_id)
  AND (SELECT COUNT(*) FROM public.chat_participants cp WHERE cp.room_id = cr.id) = 2;
  
  IF room_id IS NOT NULL THEN
    RETURN room_id;
  END IF;
  
  -- Crear nueva sala
  INSERT INTO public.chat_rooms (name, is_group, created_by)
  VALUES (user1_profile || ' - ' || user2_profile, false, _user1_id)
  RETURNING id INTO room_id;
  
  -- Agregar participantes
  INSERT INTO public.chat_participants (room_id, user_id) VALUES (room_id, _user1_id);
  INSERT INTO public.chat_participants (room_id, user_id) VALUES (room_id, _user2_id);
  
  RETURN room_id;
END;
$$;