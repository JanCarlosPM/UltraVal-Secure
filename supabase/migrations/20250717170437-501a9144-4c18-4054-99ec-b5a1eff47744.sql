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