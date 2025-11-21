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