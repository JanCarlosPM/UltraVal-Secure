-- Crear tabla para mensajes del chatbot
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios puedan ver sus propios mensajes
CREATE POLICY "Users can view their own chat messages" 
ON public.chat_messages 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Política para que usuarios puedan crear sus propios mensajes
CREATE POLICY "Users can create their own chat messages" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Índice para mejorar rendimiento de consultas por usuario y fecha
CREATE INDEX idx_chat_messages_user_created 
ON public.chat_messages(user_id, created_at DESC);