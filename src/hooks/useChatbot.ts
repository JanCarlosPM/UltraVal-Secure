import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  created_at: string;
}

export const useChatbot = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  // Load chat history when component mounts or user changes
  useEffect(() => {
    if (user) {
      loadChatHistory();
    } else {
      // Clear messages for unauthenticated users
      setMessages([]);
    }
  }, [user]);

  const loadChatHistory = async () => {
    if (!user) return;

    try {
      // Temporalmente deshabilitado hasta verificar estructura de tabla
      console.log('Chat history loading disabled temporarily');
      setMessages([]);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Prepare history for API call (excluding the current message)
      const history = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Call Ollama edge function
      const { data, error } = await supabase.functions.invoke('ollama-chat', {
        body: {
          message: content,
          history: history,
          model: 'llama2'
        }
      });

      if (error) {
        throw error;
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response || 'Lo siento, no pude procesar tu mensaje.',
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If user is not authenticated, the messages won't be saved to DB
      // but they'll still appear in the current session
      if (!user && data.saved === false) {
        console.log('Messages not saved - user not authenticated');
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Lo siento, hubo un error procesando tu mensaje. Verifica que Ollama esté funcionando correctamente.',
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return {
    messages,
    isLoading,
    isOpen,
    setIsOpen,
    sendMessage,
    clearChat,
  };
};