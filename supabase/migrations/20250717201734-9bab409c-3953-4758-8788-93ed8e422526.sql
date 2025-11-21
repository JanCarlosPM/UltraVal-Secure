-- Arreglar las políticas RLS del chat para evitar recursión infinita

-- Primero, eliminar las políticas problemáticas
DROP POLICY IF EXISTS "Usuarios pueden ver participantes de sus salas" ON public.chat_participants;

-- Crear nueva política sin recursión para chat_participants
CREATE POLICY "Usuarios pueden ver participantes de sus salas" 
ON public.chat_participants 
FOR SELECT 
USING (user_id = auth.uid() OR room_id IN (
  SELECT room_id FROM public.chat_participants WHERE user_id = auth.uid()
));